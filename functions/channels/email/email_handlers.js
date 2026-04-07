const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { 
  buildJobPostedEmail, 
  buildJobClosedEmail,
  buildBookingCreatedEmail,
  buildBookingCreatedCustomerEmail,
  buildBookingAssignedCustomerEmail,
  buildBookingAssignedDriverEmail,
  buildBookingAssignedProviderEmail,
  buildBookingCompletedProviderEmail,
  buildBookingCompletedCustomerEmail,
  buildBookingCanceledProviderEmail,
  buildBookingCanceledCustomerEmail,
  buildPaymentAuthorizationFailedEmail,
  buildPaymentCapturedEmail,
  buildPayoutSentEmail
} = require('./templates');

const sesClient = new SESv2Client({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const FROM_ADDRESS = process.env.SES_FROM_ADDRESS;
const NOTIFICATION_INBOX_TABLE = process.env.NOTIFICATION_INBOX_TABLE_NAME;
const USER_TABLE = process.env.USER_TABLE_NAME;

/**
 * Email Channel Lambda
 * 
 * Responsibilities:
 * - Consume messages from EmailChannel SQS queue
 * - Render email template based on event type
 * - Send email via Amazon SES v2
 * - Update delivery status in NotificationInbox
 */
exports.handler = async (event) => {
  console.log('[EmailChannel] Processing SQS batch', {
    record_count: event.Records.length
  });

  const results = [];

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('[EmailChannel] Processing message', {
        user_id: message.user_id,
        event_type: message.event_type,
        event_id: message.event_id
      });

      await sendEmailNotification(message);
      results.push({ success: true, messageId: record.messageId });
    } catch (error) {
      console.error('[EmailChannel] Error processing message', {
        messageId: record.messageId,
        error: error.message,
        stack: error.stack
      });
      results.push({ success: false, messageId: record.messageId, error: error.message });
      // Allow message to go to DLQ by throwing error
      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ results })
  };
};

/**
 * Send email notification via SES v2
 */
async function sendEmailNotification(message) {
  const { user_id, event_type, notification_id, notification_timestamp, data, metadata } = message;

  console.log('[EmailChannel] Rendering template for event', {
    event_type,
    data_keys: Object.keys(data || {}),
    metadata_keys: Object.keys(metadata || {}),
    job_type: data?.job_type,
    recipient_type: metadata?.recipient_type
  });

  // Merge metadata into data for template rendering
  const templateData = { ...data, ...metadata };

  // Render event-specific email template
  const emailContent = renderEmailTemplate(event_type, templateData);
  
  if (!emailContent) {
    console.error('[EmailChannel] No template for event type', { event_type });
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', 'No template available');
    return;
  }

  // Resolve user contact information
  const recipientEmail = await resolveUserEmail(user_id);

  if (!recipientEmail) {
    console.warn('[EmailChannel] No email address for user (terminal failure)', { user_id });
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', 'No email address');
    // This is a terminal failure - do not throw error to avoid infinite retries
    return;
  }

  // Send via SES v2
  try {
    const params = {
      FromEmailAddress: `Haul Notifications <${FROM_ADDRESS}>`,
      Destination: {
        ToAddresses: [recipientEmail]
      },
      Content: {
        Simple: {
          Subject: {
            Data: emailContent.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: emailContent.html,
              Charset: 'UTF-8'
            },
            Text: {
              Data: emailContent.text,
              Charset: 'UTF-8'
            }
          }
        }
      }
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log('[EmailChannel] Email sent successfully', {
      user_id,
      email: recipientEmail,
      event_type,
      message_id: response.MessageId
    });

    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'sent', null);
  } catch (error) {
    console.error('[EmailChannel] Error sending email', {
      user_id,
      email: recipientEmail,
      error: error.message
    });

    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', error.message);
    throw error;
  }
}

/**
 * Render email template based on event type
 */
function renderEmailTemplate(eventType, data) {
  switch (eventType) {
    case 'haul.job.posted':
      return buildJobPostedEmail(data);
    
    case 'haul.job.closed':
      return buildJobClosedEmail(data);
    
    case 'haul.booking.created':
      if (data.recipient_type === 'customer') {
        return buildBookingCreatedCustomerEmail(data);
      }
      return buildBookingCreatedEmail(data);
    
    case 'haul.booking.assigned':
      if (data.recipient_type === 'provider') {
        return buildBookingAssignedProviderEmail(data);
      } else if (data.recipient_type === 'driver') {
        return buildBookingAssignedDriverEmail(data);
      } else {
        console.error('[renderEmailTemplate] Unknown recipient_type for booking.assigned:', data.recipient_type, 'Available data keys:', Object.keys(data));
        return null;
      }

    case 'haul.booking.completed':
      if (data.recipient_type === 'provider') {
        return buildBookingCompletedProviderEmail(data);
      }
      return buildBookingCompletedCustomerEmail(data);

    case 'haul.booking.canceled':
      if (data.recipient_type === 'provider') {
        return buildBookingCanceledProviderEmail(data);
      }
      return buildBookingCanceledCustomerEmail(data);

    case 'haul.payment.authorization_failed':
      return buildPaymentAuthorizationFailedEmail(data);

    case 'haul.payment.captured':
      return buildPaymentCapturedEmail(data);

    case 'haul.payout.sent':
      return buildPayoutSentEmail(data);
    
    default:
      console.warn('[EmailChannel] No template for event type, using fallback', { event_type: eventType });
      return null;
  }
}

/**
 * Format plain text body as simple HTML (fallback only)
 */
function formatBodyAsHtml(body) {
  if (!body) return '<p>Haul Notification</p>';
  
  // Convert line breaks to HTML paragraphs
  const paragraphs = body.split('\n\n').map(p => {
    const lines = p.split('\n').join('<br>');
    return `<p>${lines}</p>`;
  }).join('\n');
  
  return paragraphs;
}

/**
 * Resolve user email address for notification delivery
 * 
 * Queries the User table for the email attribute.
 * The User table is the source of truth - it's kept in sync with Cognito
 * during user registration and profile updates.
 * 
 * @param {string} userId 
 * @returns {Promise<string|null>} Email address or null
 */
async function resolveUserEmail(userId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USER_TABLE,
      Key: { id: userId },
      ProjectionExpression: 'email'
    }));

    if (!result.Item || !result.Item.email) {
      console.warn('[EmailChannel] No email found in User table', { user_id: userId });
      return null;
    }

    console.log('[EmailChannel] Resolved email for user', { 
      user_id: userId,
      email: result.Item.email 
    });

    return result.Item.email;
  } catch (error) {
    console.error('[EmailChannel] Error resolving user email', {
      user_id: userId,
      error: error.message
    });
    return null;
  }
}

/**
 * Update delivery status in NotificationInbox
 * Uses the service-generated notification_id (NOT event_id)
 */
async function updateDeliveryStatus(userId, notificationId, timestamp, status, errorMessage) {
  if (!notificationId || !timestamp) {
    console.error('[EmailChannel] Cannot update delivery status: notification_id or timestamp missing', {
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
      UpdateExpression: 'SET delivery_status.email = :status, updated_at = :timestamp' + 
        (errorMessage ? ', error_message = :error' : ''),
      ExpressionAttributeValues: {
        ':status': status,
        ':timestamp': new Date().toISOString(),
        ...(errorMessage && { ':error': errorMessage })
      }
    }));

    console.log('[EmailChannel] Updated delivery status', {
      user_id: userId,
      notification_id: notificationId,
      status,
      error: errorMessage
    });
  } catch (error) {
    console.error('[EmailChannel] Error updating delivery status', {
      user_id: userId,
      notification_id: notificationId,
      error: error.message
    });
    // Don't throw - this is a non-critical failure
  }
}
