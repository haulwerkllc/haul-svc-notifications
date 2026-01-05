const NotificationResolver = require('./base');

/**
 * Resolver for haul.job.closed events
 * 
 * Recipients: The customer who posted the job
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_id of job owner
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * TODO: Implement job owner lookup
 * - Query DynamoDB Job table for the job
 * - Extract customer_user_id from job record
 */
class JobClosedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.job.closed';
  }

  async resolve(event) {
    console.log('[JobClosedResolver] Resolving recipients for job.closed event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    // TODO: Query DynamoDB for job details
    // - Table: Job-${env}
    // - Key: job_id = entity.id
    // - Return: [{ user_id: job.customer_user_id }]
    
    return [];
  }
}

module.exports = JobClosedResolver;
