const { PinpointClient, SendMessagesCommand } = require('@aws-sdk/client-pinpoint');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const pinpointClient = new PinpointClient({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const DEVICE_ENDPOINT_TABLE = process.env.DEVICE_ENDPOINT_TABLE_NAME;
const NOTIFICATION_INBOX_TABLE = process.env.NOTIFICATION_INBOX_TABLE_NAME;
const PINPOINT_APP_ID = process.env.PINPOINT_APP_ID;
const PINPOINT_DRIVER_APP_ID = process.env.PINPOINT_DRIVER_APP_ID;

/**
 * Push Channel Lambda
 *
 * Consumes messages from PushChannelQueue SQS queue.
 * For each message:
 *   1. Queries DeviceEndpoint for the user's active driver devices
 *   2. Sends via Pinpoint to each device (APNS / GCM)
 *   3. Invalidates tokens on permanent delivery failure
 *   4. Updates delivery_status.push in NotificationInbox
 */
exports.handler = async (event) => {
  console.log('[PushChannel] Processing SQS batch', {
    record_count: event.Records.length
  });

  const results = [];

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('[PushChannel] Processing message', {
        user_id: message.user_id,
        event_type: message.event_type,
        event_id: message.event_id
      });

      await sendPushNotification(message);
      results.push({ success: true, messageId: record.messageId });
    } catch (error) {
      console.error('[PushChannel] Error processing message', {
        messageId: record.messageId,
        error: error.message,
        stack: error.stack
      });
      results.push({ success: false, messageId: record.messageId, error: error.message });
      // Allow message to go to DLQ by re-throwing
      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ results })
  };
};

async function sendPushNotification(message) {
  const {
    user_id,
    notification_id,
    notification_timestamp,
    event_type,
    entity_type,
    entity_id,
    subject,
    body
  } = message;

  const bookingNumber = message.context?.booking_number || '';
  const senderProfilePhotoUrl = event_type === 'haul.message.created'
    ? (message.data?.sender_profile_photo_url || null)
    : null;
  const jobId = entity_type === 'bid' ? (message.data?.job_id || null) : null;
  const BOOKING_ICON_EVENTS = new Set([
    'haul.booking.created',
    'haul.booking.assigned',
    'haul.booking.crew_en_route_pickup',
    'haul.booking.in_progress_pickup',
    'haul.booking.crew_en_route_dropoff',
    'haul.booking.in_progress_dropoff',
    'haul.booking.pending_confirmation',
  ]);
  const companyIconUrl = (
    message.metadata?.recipient_type === 'customer' &&
    BOOKING_ICON_EVENTS.has(event_type)
  ) ? (message.data?.icon_url || null) : null;

  if (event_type === 'haul.message.created') {
    console.log('[PushChannel] haul.message.created meta', {
      has_sender_profile_photo_url: Boolean(senderProfilePhotoUrl),
    });
  }

  if (BOOKING_ICON_EVENTS.has(event_type)) {
    console.log('[PushChannel] booking event icon meta', {
      event_type,
      recipient_type: message.metadata?.recipient_type,
      has_icon_url_in_data: Boolean(message.data?.icon_url),
      icon_url: message.data?.icon_url || null,
      company_icon_url: companyIconUrl,
    });
  }

  if (!PINPOINT_APP_ID || !PINPOINT_DRIVER_APP_ID) {
    console.error('[PushChannel] PINPOINT_APP_ID or PINPOINT_DRIVER_APP_ID not configured');
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', 'Pinpoint not configured');
    return;
  }

  // Provider (OWNER/ADMIN/DISPATCHER) users receive email only for booking.assigned — skip push.
  if (event_type === 'haul.booking.assigned' && message.metadata?.recipient_type === 'provider') {
    console.log('[PushChannel] Skipping push for provider recipient on booking.assigned', { user_id });
    return;
  }

  // Customer gets haul.booking.pending_confirmation as their completion push; skip push on completed.
  if (event_type === 'haul.booking.completed' && message.metadata?.recipient_type === 'customer') {
    console.log('[PushChannel] Skipping push for customer on booking.completed', { user_id });
    return;
  }

  // Driver assignment notification requires different copy from the customer copy
  // that the orchestrator pre-renders for this event.
  const pushSubject = (event_type === 'haul.booking.assigned' && message.metadata?.recipient_type === 'driver')
    ? `You've been assigned to booking ${bookingNumber}`
    : subject;
  const pushBody = (event_type === 'haul.booking.assigned' && message.metadata?.recipient_type === 'driver')
    ? `You've been assigned to booking ${bookingNumber}.`
    : body;

  // Message notifications and customer-facing events target haul-app (resolveUserDevices).
  // Service-provider events target driver-app (resolveDriverDevices).
  // recipient_type is set by the resolver; absence falls back to driver devices (e.g. job.posted).
  const isCustomer = event_type === 'haul.message.created'
    || message.metadata?.recipient_type === 'customer';
  const deviceResolver = isCustomer ? resolveUserDevices : resolveDriverDevices;

  const devices = await deviceResolver(user_id);

  if (devices.length === 0) {
    console.warn('[PushChannel] No eligible devices for user', { user_id, event_type });
    await updateDeliveryStatus(user_id, notification_id, notification_timestamp, 'failed', 'No eligible devices');
    return;
  }

  let anySuccess = false;
  for (const device of devices) {
    const sent = await sendToDevice(device, { subject: pushSubject, body: pushBody, event_type, entity_type, entity_id, booking_number: bookingNumber, sender_profile_photo_url: senderProfilePhotoUrl, job_id: jobId, company_icon_url: companyIconUrl });
    if (sent) anySuccess = true;
  }

  const finalStatus = anySuccess ? 'delivered' : 'failed';
  const errorMsg = anySuccess ? null : 'All device sends failed';
  await updateDeliveryStatus(user_id, notification_id, notification_timestamp, finalStatus, errorMsg);
}

async function resolveDriverDevices(userId) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: DEVICE_ENDPOINT_TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      FilterExpression: '#app = :app AND push_enabled = :enabled AND token_valid = :valid',
      ExpressionAttributeNames: { '#app': 'app' },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'DEVICE#',
        ':app': 'driver',
        ':enabled': true,
        ':valid': true
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('[PushChannel] Error querying devices', { user_id: userId, error: error.message });
    return [];
  }
}

async function resolveUserDevices(userId) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: DEVICE_ENDPOINT_TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      FilterExpression: 'push_enabled = :enabled AND token_valid = :valid',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'DEVICE#',
        ':enabled': true,
        ':valid': true
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('[PushChannel] Error querying devices', { user_id: userId, error: error.message });
    return [];
  }
}

async function sendToDevice(device, { subject, body, event_type, entity_type, entity_id, booking_number, sender_profile_photo_url, job_id, company_icon_url }) {
  const { device_id, token, platform, user_id, env: deviceEnv, app: deviceApp } = device;
  const channelType = platform !== 'ios'
    ? 'GCM'
    : (deviceEnv === 'dev' ? 'APNS_SANDBOX' : 'APNS');
  const pinpointAppId = deviceApp === 'driver' ? PINPOINT_DRIVER_APP_ID : PINPOINT_APP_ID;

  // Use the first non-empty line of the body for the push notification
  const pushBody = body
    ? body.split('\n').map(l => l.trim()).find(l => l.length > 0) || subject
    : subject;

  // Pinpoint Data values must be strings
  const data = {
    event_type: String(event_type || ''),
    entity_type: String(entity_type || ''),
    entity_id: String(entity_id || ''),
    booking_number: String(booking_number || ''),
    ...(job_id ? { job_id: String(job_id) } : {}),
  };

  try {
    const response = await pinpointClient.send(new SendMessagesCommand({
      ApplicationId: pinpointAppId,
      MessageRequest: {
        Addresses: {
          [token]: { ChannelType: channelType }
        },
        MessageConfiguration: {
          // RawContent is required for APNs so custom data reaches the app.
          // expo-notifications reads userInfo["body"] for remote notifications
          // (see EXNotificationSerializer.m serializedNotificationData), so all
          // custom fields must be nested under the "body" key.
          APNSMessage: {
            RawContent: JSON.stringify({
              aps: {
                alert: { title: subject, body: pushBody },
                sound: 'default',
                // mutable-content instructs iOS to invoke the Notification
                // Service Extension before displaying the notification.
                ...((event_type === 'haul.message.created' || company_icon_url) && { 'mutable-content': 1 }),
              },
              body: {
                event_type: data.event_type,
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                booking_number: data.booking_number,
                ...(data.job_id && { job_id: data.job_id }),
                ...(sender_profile_photo_url && { sender_profile_photo_url }),
                ...(company_icon_url && { company_icon_url }),
              },
            }),
          },
          // RawContent gives full control over the FCM payload sent to the device.
          // Using Title/Body fields causes Pinpoint to place them in data as
          // pinpoint.notification.* instead of a real FCM notification object,
          // which Android cannot display when the app is in the background/killed.
          GCMMessage: {
            RawContent: JSON.stringify({
              notification: {
                title: subject,
                body: pushBody,
                sound: 'default',
              },
              priority: 'high',
              android: {
                priority: 'high',
                notification: {
                  channel_id: 'default',
                  sound: 'default',
                  default_vibrate_timings: true,
                  notification_priority: 'PRIORITY_MAX',
                  visibility: 'PUBLIC'
                },
              },
              data: {
                ...data,
                ...(sender_profile_photo_url && { sender_profile_photo_url }),
              },
            }),
          }
        }
      }
    }));

    const result = response.MessageResponse?.Result?.[token];
    const statusCode = result?.StatusCode;
    const deliveryStatus = result?.DeliveryStatus;

    if (statusCode >= 400 || deliveryStatus === 'PERMANENT_FAILURE') {
      console.warn('[PushChannel] Permanent delivery failure, invalidating token', {
        user_id,
        device_id,
        statusCode,
        deliveryStatus,
        statusMessage: result?.StatusMessage
      });
      await invalidateDeviceToken(user_id, device_id);
      return false;
    }

    console.log('[PushChannel] Push sent successfully', {
      user_id,
      device_id,
      platform,
      statusCode
    });
    return true;
  } catch (error) {
    console.error('[PushChannel] Error sending push to device', {
      user_id,
      device_id,
      error: error.message
    });
    return false;
  }
}

async function invalidateDeviceToken(userId, deviceId) {
  try {
    await docClient.send(new UpdateCommand({
      TableName: DEVICE_ENDPOINT_TABLE,
      Key: {
        pk: `USER#${userId}`,
        sk: `DEVICE#${deviceId}`
      },
      UpdateExpression: 'SET token_valid = :false, updated_at = :now',
      ExpressionAttributeValues: {
        ':false': false,
        ':now': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error('[PushChannel] Error invalidating device token', {
      user_id: userId,
      device_id: deviceId,
      error: error.message
    });
  }
}

async function updateDeliveryStatus(userId, notificationId, timestamp, status, errorMessage) {
  if (!notificationId || !timestamp) {
    console.error('[PushChannel] Cannot update delivery status: notification_id or timestamp missing', {
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
      UpdateExpression: 'SET delivery_status.#push = :status, updated_at = :timestamp' +
        (errorMessage ? ', error_message = :error' : ''),
      ExpressionAttributeNames: { '#push': 'push' },
      ExpressionAttributeValues: {
        ':status': status,
        ':timestamp': new Date().toISOString(),
        ...(errorMessage && { ':error': errorMessage })
      }
    }));

    console.log('[PushChannel] Updated delivery status', {
      user_id: userId,
      notification_id: notificationId,
      status
    });
  } catch (error) {
    console.error('[PushChannel] Error updating delivery status', {
      user_id: userId,
      notification_id: notificationId,
      error: error.message
    });
  }
}
