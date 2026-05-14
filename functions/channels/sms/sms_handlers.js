/**
 * SMS Channel Lambda
 *
 * Consumes messages from SmsChannelQueue SQS queue.
 * For each message:
 *   1. Applies event-specific recipient skip rules
 *   2. Resolves the user's phone number from the User table
 *   3. Checks SmsSuppression table (STOP opt-outs)
 *   4. Sends via AWS End User Messaging (PinpointSMSVoiceV2)
 *   5. Updates delivery_status.sms in NotificationInbox
 */

const { PinpointSMSVoiceV2Client, SendTextMessageCommand } = require('@aws-sdk/client-pinpoint-sms-voice-v2');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const pinpointClient = new PinpointSMSVoiceV2Client({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USER_TABLE = process.env.USER_TABLE_NAME;
const SMS_SUPPRESSION_TABLE = process.env.SMS_SUPRESSION_TABLE_NAME; // typo preserved from serverless.yml
const NOTIFICATION_INBOX_TABLE = process.env.NOTIFICATION_INBOX_TABLE_NAME;
const SMS_ORIGINATION_IDENTITY_ARN = process.env.SMS_ORIGINATION_IDENTITY_ARN;

exports.handler = async (event) => {
  console.log('[SmsChannel] Processing SQS batch', {
    record_count: event.Records.length
  });

  const results = [];

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('[SmsChannel] Processing message', {
        user_id: message.user_id,
        event_type: message.event_type,
        event_id: message.event_id
      });

      await sendSmsNotification(message);
      results.push({ success: true, messageId: record.messageId });
    } catch (error) {
      console.error('[SmsChannel] Error processing message', {
        messageId: record.messageId,
        error: error.message,
        stack: error.stack
      });
      results.push({ success: false, messageId: record.messageId, error: error.message });
      // Re-throw to allow the message to go to the DLQ
      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ results })
  };
};

async function sendSmsNotification(message) {
  const {
    user_id,
    notification_id,
    notification_timestamp,
    event_type,
    subject,
    body,
    metadata
  } = message;

  const bookingNumber = message.context?.booking_number || '';

  // haul.booking.assigned: provider (OWNER/ADMIN/DISPATCHER) recipients skip.
  // Driver always gets SMS. Customer gets SMS as a push fallback (gated by
  // determineEnabledChannels in the orchestrator — SMS is only enqueued for
  // the customer when push is disabled).
  if (event_type === 'haul.booking.assigned' && metadata?.recipient_type === 'provider') {
    console.log('[SmsChannel] Skipping SMS for provider recipient on booking.assigned', {
      user_id,
      recipient_type: metadata?.recipient_type
    });
    return;
  }

  if (!SMS_ORIGINATION_IDENTITY_ARN) {
    console.error('[SmsChannel] SMS_ORIGINATION_IDENTITY_ARN not configured');
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', 'SMS not configured');
    return;
  }

  const phoneNumber = await resolveUserPhoneNumber(user_id);
  if (!phoneNumber) {
    console.warn('[SmsChannel] No phone number for user', { user_id, event_type });
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', 'No phone number');
    return;
  }

  const suppressed = await checkSuppression(phoneNumber);
  if (suppressed) {
    console.log('[SmsChannel] Number opted out, skipping', { user_id, event_type });
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'suppressed', 'Number opted out');
    return;
  }

  // Driver on booking.assigned uses its own copy; all other events use the
  // orchestrator-rendered body (first non-empty line, falling back to subject).
  const rawBody = (event_type === 'haul.booking.assigned' && metadata?.recipient_type === 'driver')
    ? `You've been assigned to booking ${bookingNumber}.`
    : (body ? body.split('\n').map(l => l.trim()).find(l => l.length > 0) : null) || subject;

  // STOP/HELP footer on booking.assigned customer only — marks the start of
  // several status SMS messages, so it's the right place to surface opt-out.
  // Driver omits the footer (operational message, different audience).
  const isBookingAssignedCustomer = event_type === 'haul.booking.assigned'
    && metadata?.recipient_type === 'customer';
  const smsBody = isBookingAssignedCustomer
    ? `Haul: ${rawBody} Reply STOP to stop. HELP for support.`
    : `Haul: ${rawBody}`;

  try {
    await pinpointClient.send(new SendTextMessageCommand({
      DestinationPhoneNumber: phoneNumber,
      OriginationIdentity: SMS_ORIGINATION_IDENTITY_ARN,
      MessageBody: smsBody,
      MessageType: 'TRANSACTIONAL'
    }));

    console.log('[SmsChannel] SMS sent successfully', { user_id, event_type });
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'delivered', null);
  } catch (error) {
    console.error('[SmsChannel] Error sending SMS', {
      user_id,
      event_type,
      error: error.message
    });
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', error.message);
  }
}

async function resolveUserPhoneNumber(userId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USER_TABLE,
      Key: { id: userId },
      ProjectionExpression: 'phone_number'
    }));
    return result.Item?.phone_number || null;
  } catch (error) {
    console.error('[SmsChannel] Error fetching user phone number', {
      user_id: userId,
      error: error.message
    });
    return null;
  }
}

async function checkSuppression(phoneNumber) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: SMS_SUPPRESSION_TABLE,
      Key: { id: phoneNumber }
    }));
    return Boolean(result.Item);
  } catch (error) {
    console.error('[SmsChannel] Error checking suppression table', {
      phone: phoneNumber,
      error: error.message
    });
    // Fail open: if we cannot check suppression, allow the send
    return false;
  }
}

async function updateDeliveryStatus(userId, notificationId, timestamp, status, errorMessage) {
  if (!notificationId || !timestamp) {
    console.error('[SmsChannel] Cannot update delivery status: notification_id or timestamp missing', {
      user_id: userId,
      notification_id: notificationId
    });
    return;
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: NOTIFICATION_INBOX_TABLE,
      Key: {
        pk: `USER#${userId}`,
        sk: `NOTIF#${timestamp}#${notificationId}`
      },
      UpdateExpression: 'SET delivery_status.#sms = :status, updated_at = :timestamp' +
        (errorMessage ? ', error_message = :error' : ''),
      ExpressionAttributeNames: { '#sms': 'sms' },
      ExpressionAttributeValues: {
        ':status': status,
        ':timestamp': new Date().toISOString(),
        ...(errorMessage && { ':error': errorMessage })
      }
    }));

    console.log('[SmsChannel] Updated delivery status', {
      user_id: userId,
      notification_id: notificationId,
      status
    });
  } catch (error) {
    console.error('[SmsChannel] Error updating delivery status', {
      user_id: userId,
      notification_id: notificationId,
      error: error.message
    });
  }
}
