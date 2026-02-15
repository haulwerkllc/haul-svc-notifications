/**
 * SMS Inbound Handler
 * 
 * Processes inbound SMS messages from SNS topic for campaign management.
 * Handles opt-out (STOP), opt-in (START), and help requests (HELP).
 * 
 * Triggered by: SNS topic for inbound SMS routing
 */

/**
 * Keyword mappings for SMS commands
 */
const KEYWORDS = {
  STOP: ['STOP', 'END'],
  START: ['JOIN', 'START'],
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

      // TODO: Implement handler logic for each keyword type
      switch (keyword) {
        case 'STOP':
          console.log('[SmsInbound] STOP request - handler not yet implemented', {
            from: originationNumber
          });
          // TODO: Add phone number to SmsSuppression table
          // TODO: Send confirmation SMS
          break;

        case 'START':
          console.log('[SmsInbound] START request - handler not yet implemented', {
            from: originationNumber
          });
          // TODO: Remove phone number from SmsSuppression table
          // TODO: Send confirmation SMS
          break;

        case 'HELP':
          console.log('[SmsInbound] HELP request - handler not yet implemented', {
            from: originationNumber
          });
          // TODO: Send help information SMS
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
