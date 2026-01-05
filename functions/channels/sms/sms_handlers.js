/**
 * SMS Channel Lambda (STUB - Phase 3)
 * 
 * This is a non-operational stub that logs and exits successfully.
 * SMS notifications will be enabled in Phase 3 (after 10DLC registration).
 * 
 * When enabled, this handler will:
 * - Consume messages from SmsChannel SQS queue
 * - Render SMS message template
 * - Send SMS via Amazon Pinpoint
 * - Update delivery status in NotificationInbox
 */
exports.handler = async (event) => {
  console.log('[SmsChannel] STUB - SMS notifications not yet enabled', {
    record_count: event.Records.length,
    phase: 'Phase 3 - Not Implemented (requires 10DLC)'
  });

  // Log each message but don't process
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('[SmsChannel] STUB - Would send SMS notification', {
        user_id: message.user_id,
        event_type: message.event_type,
        event_id: message.event_id
      });
    } catch (error) {
      console.error('[SmsChannel] STUB - Error parsing message', {
        messageId: record.messageId,
        error: error.message
      });
    }
  }

  // Exit successfully to ACK messages
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'SMS channel stub - messages acknowledged but not sent',
      processed: event.Records.length
    })
  };
};
