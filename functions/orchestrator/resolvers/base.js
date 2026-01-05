/**
 * Notification Event Resolver Interface
 * 
 * RESOLVER RESPONSIBILITIES (MUST DO):
 * - Accept the validated canonical ingress schema
 * - Return a list of resolved recipient user_ids (and optionally metadata)
 * 
 * RESOLVER BOUNDARIES (MUST NOT DO):
 * - Evaluate notification preferences
 * - Determine delivery channels
 * - Perform delivery logic
 * - Render templates
 * - Write to DynamoDB (NotificationInbox, NotificationPreference, etc.)
 * - Send messages to SQS queues
 * - Call Pinpoint or any external messaging system
 * 
 * Resolvers are LOOKUP ONLY. All orchestration logic belongs in the Orchestrator.
 */

/**
 * Base resolver class defining the contract
 */
class NotificationResolver {
  /**
   * Resolve recipients for a notification event
   * @param {Object} event - Validated notification event
   * @returns {Promise<Array<{user_id: string, metadata?: Object}>>}
   */
  async resolve(event) {
    throw new Error('resolve() must be implemented by subclass');
  }

  /**
   * Get the event type this resolver handles
   * @returns {string}
   */
  getEventType() {
    throw new Error('getEventType() must be implemented by subclass');
  }
}

module.exports = NotificationResolver;
