const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const JOB_TABLE = process.env.JOB_TABLE_NAME;

/**
 * Resolver for haul.job.closed events
 * 
 * Recipients: The consumer who posted the job
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_id of job owner
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
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

    const jobId = event.entity.id;

    try {
      // Lookup job record
      const job = await this.getJob(jobId);
      
      if (!job) {
        console.warn('[JobClosedResolver] Job not found', { job_id: jobId });
        return [];
      }

      // Extract owner_user_id
      const ownerUserId = job.owner_user_id;
      
      if (!ownerUserId) {
        console.warn('[JobClosedResolver] Job has no owner_user_id', { job_id: jobId });
        return [];
      }

      console.log('[JobClosedResolver] Resolved recipient', {
        job_id: jobId,
        owner_user_id: ownerUserId
      });

      return [{ user_id: ownerUserId }];
    } catch (error) {
      console.error('[JobClosedResolver] Error resolving recipients', {
        job_id: jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    const result = await docClient.send(new GetCommand({
      TableName: JOB_TABLE,
      Key: { id: jobId }
    }));

    return result.Item || null;
  }
}

module.exports = JobClosedResolver;
