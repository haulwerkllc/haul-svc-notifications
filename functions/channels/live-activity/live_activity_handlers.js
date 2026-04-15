const http2 = require('http2');
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.REGION });

const DEVICE_ENDPOINT_TABLE = process.env.DEVICE_ENDPOINT_TABLE_NAME;
const NOTIFICATION_INBOX_TABLE = process.env.NOTIFICATION_INBOX_TABLE_NAME;
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_SECRET_NAME = process.env.APNS_SECRET_NAME || 'haul/apns/key';
const BUNDLE_ID = process.env.BUNDLE_ID;
const ENV = process.env.ENV || 'dev';

const APNS_HOST = ENV === 'main'
  ? 'api.push.apple.com'
  : 'api.sandbox.push.apple.com';

let cachedAuthKey = null;
let cachedJwt = null;
let cachedJwtExpiry = 0;

/**
 * Live Activity Channel Lambda
 *
 * Consumes messages from LiveActivityChannelQueue.
 * For each message:
 *   1. Looks up the LA push token in DeviceEndpoint (pk=USER#, sk=LA_TOKEN#)
 *   2. Builds a Live Activity content-state payload from the event
 *   3. Sends via direct APNs HTTP/2 with push-type: liveactivity
 *   4. Cleans up expired tokens on 410 Gone
 */
exports.handler = async (event) => {
  console.log('[LiveActivityChannel] Processing SQS batch', {
    record_count: event.Records.length
  });

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('[LiveActivityChannel] Processing message', {
        user_id: message.user_id,
        event_type: message.event_type,
        entity_id: message.entity_id
      });

      await sendLiveActivityUpdate(message);
    } catch (error) {
      console.error('[LiveActivityChannel] Error processing message', {
        messageId: record.messageId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
};

async function sendLiveActivityUpdate(message) {
  const { user_id, entity_id: bookingId, event_type } = message;

  // Tier 1: look up per-booking LA update token (Live Activity already running)
  const laResult = await docClient.send(new GetCommand({
    TableName: DEVICE_ENDPOINT_TABLE,
    Key: { pk: `USER#${user_id}`, sk: `LA_TOKEN#${bookingId}` }
  }));

  let token = laResult.Item?.token;
  let isPushToStart = false;

  const contentState = buildContentState(message);
  const isEndEvent = contentState.status === 'COMPLETED';

  // Tier 2: fall back to push-to-start token (iOS 17.2+ — start LA remotely).
  // PTS tokens can only be used to start an activity, not to update or end one.
  if (!token && !isEndEvent) {
    const ptsResult = await docClient.send(new GetCommand({
      TableName: DEVICE_ENDPOINT_TABLE,
      Key: { pk: `USER#${user_id}`, sk: 'PTS_TOKEN#ios' }
    }));
    token = ptsResult.Item?.token;
    isPushToStart = !!token;
  }

  if (!token) {
    console.log('[LiveActivityChannel] No LA or PTS token found, skipping', { user_id, bookingId });
    return;
  }

  let payload;
  if (isPushToStart) {
    payload = buildStartPayload(message, contentState);
  } else if (isEndEvent) {
    payload = buildEndPayload();
  } else {
    payload = { aps: { timestamp: Math.floor(Date.now() / 1000), event: 'update', 'content-state': contentState } };
  }

  const mode = isPushToStart ? 'start' : isEndEvent ? 'end' : 'update';
  console.log('[LiveActivityChannel] Sending APNs', {
    user_id, bookingId, event_type, mode,
    token_prefix: token.slice(0, 16),
    attributes_type: isPushToStart ? payload.aps['attributes-type'] : undefined,
  });

  const jwt = await getApnsJwt();
  const topic = `${BUNDLE_ID}.push-type.liveactivity`;

  try {
    const statusCode = await sendApnsRequest(token, payload, jwt, topic);

    if (statusCode === 410) {
      const sk = isPushToStart ? 'PTS_TOKEN#ios' : `LA_TOKEN#${bookingId}`;
      console.log('[LiveActivityChannel] Token expired (410), cleaning up', { user_id, bookingId, sk });
      await docClient.send(new DeleteCommand({
        TableName: DEVICE_ENDPOINT_TABLE,
        Key: { pk: `USER#${user_id}`, sk }
      }));
      return;
    }

    if (statusCode !== 200) {
      console.warn('[LiveActivityChannel] APNs returned non-200', { statusCode, user_id, bookingId });
    } else {
      console.log('[LiveActivityChannel] Sent successfully', { user_id, bookingId, event_type });
    }

    if (message.notification_id && NOTIFICATION_INBOX_TABLE) {
      await updateDeliveryStatus(message, statusCode === 200 ? 'sent' : 'failed');
    }
  } catch (error) {
    console.error('[LiveActivityChannel] APNs send error', { error: error.message, user_id, bookingId });
    if (message.notification_id && NOTIFICATION_INBOX_TABLE) {
      await updateDeliveryStatus(message, 'failed');
    }
    throw error;
  }
}

function buildStartPayload(message, contentState) {
  const { entity_id: bookingId, data = {}, context = {} } = message;

  return {
    aps: {
      timestamp: Math.floor(Date.now() / 1000),
      event: 'start',
      'content-state': contentState,
      'attributes-type': 'HaulLiveActivityAttributes',
      'attributes': {
        bookingId,
        providerName: context.company_name || data.company_name || '',
        vehicleType: context.job_type || data.job_type || '',
        driverName: context.driver_given_name || context.driver_name || data.driver_name || '',
        driverImageUrl: context.driver_profile_photo_url || data.driver_profile_photo_url || null,
      },
    }
  };
}

function buildEndPayload() {
  const now = Math.floor(Date.now() / 1000);
  return {
    aps: {
      timestamp: now,
      event: 'end',
      'dismissal-date': now + 300,
      'content-state': {
        status: 'COMPLETED',
        etaMinutes: null,
        stopType: 'DROPOFF',
        stops: [
          { type: 'PICKUP', status: 'COMPLETED' },
          { type: 'DROPOFF', status: 'COMPLETED' },
        ],
      },
    }
  };
}

function buildContentState(message) {
  const { event_type, data = {}, context = {} } = message;

  const STATUS_MAP = {
    'haul.booking.crew_en_route_pickup': 'EN_ROUTE_PICKUP',
    'haul.booking.in_progress_pickup': 'IN_PROGRESS_PICKUP',
    'haul.booking.crew_en_route_dropoff': 'EN_ROUTE_DROPOFF',
    'haul.booking.in_progress_dropoff': 'IN_PROGRESS_DROPOFF',
    'haul.booking.pending_confirmation': 'COMPLETED',
  };

  const status = STATUS_MAP[event_type] || 'EN_ROUTE_PICKUP';
  const etaMinutes = data.eta_minutes ?? context.eta_minutes ?? null;
  const isDropoff = status.includes('DROPOFF');
  const stopType = isDropoff ? 'DROPOFF' : 'PICKUP';

  const stops = [];
  if (context.stops) {
    stops.push(...context.stops);
  } else {
    const pickupDone = ['IN_PROGRESS_PICKUP', 'EN_ROUTE_DROPOFF', 'IN_PROGRESS_DROPOFF'].includes(status);
    stops.push(
      { type: 'PICKUP', status: pickupDone ? 'COMPLETED' : 'CURRENT' },
      { type: 'DROPOFF', status: isDropoff ? 'CURRENT' : 'UPCOMING' }
    );
  }

  return {
    status,
    etaMinutes,
    stopType,
    stops,
  };
}

async function getApnsAuthKey() {
  if (cachedAuthKey) return cachedAuthKey;

  const res = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: APNS_SECRET_NAME })
  );
  const raw = res.SecretString;
  try {
    const parsed = JSON.parse(raw);
    cachedAuthKey = typeof parsed === 'string' ? parsed : raw;
  } catch {
    cachedAuthKey = raw;
  }
  return cachedAuthKey;
}

async function getApnsJwt() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwtExpiry > now) {
    return cachedJwt;
  }

  const authKey = await getApnsAuthKey();

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })).toString('base64url');
  const signingInput = `${header}.${claims}`;

  const key = authKey.replace(/\\n/g, '\n');
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key,
    dsaEncoding: 'ieee-p1363'
  });

  cachedJwt = `${signingInput}.${signature.toString('base64url')}`;
  cachedJwtExpiry = now + 3000;
  return cachedJwt;
}

function sendApnsRequest(deviceToken, payload, jwt, topic) {
  return new Promise((resolve, reject) => {
    const session = http2.connect(`https://${APNS_HOST}`);

    session.on('error', (err) => {
      session.close();
      reject(err);
    });

    const body = JSON.stringify(payload);
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${jwt}`,
      'apns-push-type': 'liveactivity',
      'apns-topic': topic,
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });

    let statusCode;
    let responseBody = '';

    req.on('response', (headers) => {
      statusCode = headers[':status'];
    });

    req.on('data', (chunk) => {
      responseBody += chunk;
    });

    req.on('end', () => {
      session.close();
      if (statusCode !== 200 && responseBody) {
        try {
          const parsed = JSON.parse(responseBody);
          console.warn('[LiveActivityChannel] APNs error detail', { statusCode, reason: parsed.reason, apnsId: parsed['apns-id'] });
        } catch {
          console.warn('[LiveActivityChannel] APNs error body', { statusCode, responseBody });
        }
      }
      resolve(statusCode);
    });

    req.on('error', (err) => {
      session.close();
      reject(err);
    });

    req.end(body);
  });
}

async function updateDeliveryStatus(message, status) {
  try {
    await docClient.send(new UpdateCommand({
      TableName: NOTIFICATION_INBOX_TABLE,
      Key: {
        pk: `USER#${message.user_id}`,
        sk: `NOTIF#${message.notification_timestamp}#${message.notification_id}`
      },
      UpdateExpression: 'SET delivery_status.#channel = :status, updated_at = :now',
      ExpressionAttributeNames: { '#channel': 'live_activity' },
      ExpressionAttributeValues: {
        ':status': status,
        ':now': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error('[LiveActivityChannel] Failed to update delivery status', {
      notification_id: message.notification_id,
      error: error.message
    });
  }
}
