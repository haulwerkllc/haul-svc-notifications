const NotificationResolver = require('./base');

/**
 * Resolver for haul.bid.created events
 * 
 * Recipients: The customer who posted the job
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_id of job owner
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * TODO: Implement job owner lookup
 * - Query DynamoDB Job table for the job associated with this bid
 * - Extract customer_user_id from job record
 */
class BidCreatedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.bid.created';
  }

  async resolve(event) {
    console.log('[BidCreatedResolver] Resolving recipients for bid.created event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    // TODO: Query DynamoDB for bid details, then job details
    // - Table: Bid-${env}
    // - Key: bid_id = entity.id
    // - Then query Job-${env} for job.customer_user_id
    // - Return: [{ user_id: job.customer_user_id }]
    
    return [];
  }
}

module.exports = BidCreatedResolver;
