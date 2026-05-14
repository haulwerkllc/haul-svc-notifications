/**
 * SMS Inbound Handler
 * 
 * Processes inbound SMS messages from SNS topic for campaign management.
 * Handles opt-out (STOP), opt-in (START), and help requests (HELP).
 * 
 * Triggered by: SNS topic for inbound SMS routing
 */

const { PinpointSMSVoiceV2Client, SendTextMessageCommand } = require('@aws-sdk/client-pinpoint-sms-voice-v2');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const pinpointClient = new PinpointSMSVoiceV2Client({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const SMS_SUPPRESSION_TABLE = process.env.SMS_SUPRESSION_TABLE_NAME;
const SMS_ORIGINATION_IDENTITY_ARN = process.env.SMS_ORIGINATION_IDENTITY_ARN;

/**
 * Send a reply SMS to an inbound number.
 * Failures are logged but not thrown — the reply is best-effort.
 * @param {string} destinationNumber - E.164 phone number to reply to
 * @param {string} messageBody - SMS text to send
 */
async function sendReply(destinationNumber, messageBody) {
  try {
    await pinpointClient.send(new SendTextMessageCommand({
      DestinationPhoneNumber: destinationNumber,
      OriginationIdentity: SMS_ORIGINATION_IDENTITY_ARN,
      MessageBody: messageBody,
      MessageType: 'TRANSACTIONAL'
    }));
    console.log('[SmsInbound] Reply sent', { to: destinationNumber });
  } catch (error) {
    console.error('[SmsInbound] Failed to send reply SMS', {
      to: destinationNumber,
      error: error.message
    });
  }
}

/**
 * Add a phone number to the SmsSuppression table.
 * @param {string} phoneNumber - E.164 phone number
 */
async function addToSuppression(phoneNumber) {
  await docClient.send(new PutCommand({
    TableName: SMS_SUPPRESSION_TABLE,
    Item: {
      id: phoneNumber,
      suppressed_at: new Date().toISOString(),
      reason: 'STOP'
    }
  }));
}

/**
 * Remove a phone number from the SmsSuppression table.
 * @param {string} phoneNumber - E.164 phone number
 */
async function removeFromSuppression(phoneNumber) {
  await docClient.send(new DeleteCommand({
    TableName: SMS_SUPPRESSION_TABLE,
    Key: { id: phoneNumber }
  }));
}

/**
 * Keyword mappings for SMS commands
 */
const KEYWORDS = {
  STOP: ['STOP', 'END', 'FUCK YOU', 'FUCK OFF'],
  START: ['JOIN', 'START', 'GET MESSAGES', 'RESTART'],
  HELP: ['HELP', 'SUPPORT']
};

/**
 * Parse inbound SMS message and determine command type
 * @param {string} messageBody - Raw SMS message text
 * @returns {string|null} - Command type (STOP, START, HELP) or null if no match
 */
function parseMessageKeyword(messageBody) {
  if (!messageBody || typeof messageBody !== 'string') {
    return null;
  }

  // Normalize message: trim whitespace and convert to uppercase
  const normalizedMessage = messageBody.trim().toUpperCase();

  // Check for STOP keywords
  if (KEYWORDS.STOP.some(keyword => normalizedMessage === keyword)) {
    return 'STOP';
  }

  // Check for START keywords
  if (KEYWORDS.START.some(keyword => normalizedMessage === keyword)) {
    return 'START';
  }

  // Check for HELP keywords
  if (KEYWORDS.HELP.some(keyword => normalizedMessage === keyword)) {
    return 'HELP';
  }

  return null;
}

/**
 * Lambda handler for inbound SMS messages
 * @param {Object} event - SNS event containing inbound SMS data
 */
exports.handler = async (event) => {
  console.log('[SmsInbound] Processing inbound SMS messages', {
    record_count: event.Records?.length || 0
  });

  const results = [];

  for (const record of event.Records || []) {
    try {
      // SNS messages are wrapped in an SNS envelope
      const snsMessage = record.Sns;
      
      if (!snsMessage) {
        console.warn('[SmsInbound] Record missing SNS data', {
          recordId: record.EventSubscriptionArn
        });
        continue;
      }

      // Parse the SNS message body
      // Expected to contain: { originationNumber, destinationNumber, messageBody, ... }
      const messageData = typeof snsMessage.Message === 'string' 
        ? JSON.parse(snsMessage.Message) 
        : snsMessage.Message;

      const {
        originationNumber,
        destinationNumber,
        messageBody,
        inboundMessageId
      } = messageData;

      console.log('[SmsInbound] Processing message', {
        from: originationNumber,
        to: destinationNumber,
        messageId: inboundMessageId,
        messageBody
      });

      // Parse the message for keywords
      const keyword = parseMessageKeyword(messageBody);

      if (!keyword) {
        console.log('[SmsInbound] No recognized keyword found', {
          from: originationNumber,
          messageBody
        });
        results.push({
          phone: originationNumber,
          status: 'ignored',
          reason: 'No recognized keyword'
        });
        continue;
      }

      console.log('[SmsInbound] Keyword detected', {
        from: originationNumber,
        keyword,
        messageBody
      });

      switch (keyword) {
        case 'STOP':
          try {
            await addToSuppression(originationNumber);
            console.log('[SmsInbound] STOP: added to suppression', { from: originationNumber });
          } catch (error) {
            console.error('[SmsInbound] STOP: failed to write suppression record', {
              from: originationNumber,
              error: error.message
            });
          }
          await sendReply(
            originationNumber,
            'You have been unsubscribed from Haul SMS notifications. Reply START to re-subscribe.'
          );
          break;

        case 'START':
          try {
            await removeFromSuppression(originationNumber);
            console.log('[SmsInbound] START: removed from suppression', { from: originationNumber });
          } catch (error) {
            console.error('[SmsInbound] START: failed to remove suppression record', {
              from: originationNumber,
              error: error.message
            });
          }
          await sendReply(
            originationNumber,
            'You are now subscribed to Haul SMS notifications. Reply STOP to unsubscribe at any time. Reply HELP for support.'
          );
          break;

        case 'HELP':
          await sendReply(
            originationNumber,
            'Haul Support: support.haulwerk.com | support@haulwerk.com. Reply STOP to unsubscribe.'
          );
          break;

        default:
          console.warn('[SmsInbound] Unknown keyword type', { keyword });
      }

      results.push({
        phone: originationNumber,
        keyword,
        status: 'processed'
      });

    } catch (error) {
      console.error('[SmsInbound] Error processing record', {
        error: error.message,
        stack: error.stack,
        record: JSON.stringify(record)
      });
      
      results.push({
        status: 'error',
        error: error.message
      });
    }
  }

  console.log('[SmsInbound] Batch processing complete', {
    total: results.length,
    processed: results.filter(r => r.status === 'processed').length,
    ignored: results.filter(r => r.status === 'ignored').length,
    errors: results.filter(r => r.status === 'error').length
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Inbound SMS batch processed',
      results
    })
  };
};

// Export for testing
exports.parseMessageKeyword = parseMessageKeyword;
