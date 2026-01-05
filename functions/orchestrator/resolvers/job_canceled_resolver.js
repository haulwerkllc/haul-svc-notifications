const NotificationResolver = require('./base');

/**
 * Resolver for haul.job.canceled events
 * 
 * Recipients: All providers who have active bids on the canceled job
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_ids of bidders
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * TODO: Implement bidder lookup
 * - Query DynamoDB Bid table for bids on the job
 * - Filter by bid_status (exclude withdrawn/rejected)
 * - Extract unique provider_user_ids
 */
class JobCanceledResolver extends NotificationResolver {
  getEventType() {
    return 'haul.job.canceled';
  }

  async resolve(event) {
    console.log('[JobCanceledResolver] Resolving recipients for job.canceled event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    // TODO: Query DynamoDB for active bids on this job
    // - Table: Bid-${env}
    // - GSI: job_id-index
    // - Filter: job_id = entity.id AND status IN ['pending', 'active']
    // - Return: unique provider_user_ids
    
    return [];
  }
}

module.exports = JobCanceledResolver;
