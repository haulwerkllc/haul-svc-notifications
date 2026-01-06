const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const BID_TABLE = process.env.BID_TABLE_NAME;
const JOB_TABLE = process.env.JOB_TABLE_NAME;

/**
 * Resolver for haul.bid.updated events
 * 
 * Recipients: The consumer who posted the job
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_id of job owner
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * Implementation:
 * 1. Query Bid table by entity.id to get bid details
 * 2. Extract job_id from bid
 * 3. Query Job table by job_id
 * 4. Extract owner_user_id from job
 * 5. Return array with single user_id
 */
class BidUpdatedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.bid.updated';
  }

  async resolve(event) {
    console.log('[BidUpdatedResolver] Resolving recipients for bid.updated event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    const bidId = event.entity.id;

    try {
      // Step 1: Lookup bid record
      const bid = await this.getBid(bidId);
      if (!bid) {
        console.warn('[BidUpdatedResolver] Bid not found', { bid_id: bidId });
        return [];
      }

      // Step 2: Extract job_id
      const jobId = bid.job_id;
      if (!jobId) {
        console.warn('[BidUpdatedResolver] Bid has no job_id', { bid_id: bidId });
        return [];
      }

      console.log('[BidUpdatedResolver] Found bid with job_id', {
        bid_id: bidId,
        job_id: jobId
      });

      // Step 3: Lookup job record
      const job = await this.getJob(jobId);
      if (!job) {
        console.warn('[BidUpdatedResolver] Job not found', { job_id: jobId });
        return [];
      }

      // Step 4: Extract owner_user_id
      const ownerUserId = job.owner_user_id;
      if (!ownerUserId) {
        console.warn('[BidUpdatedResolver] Job has no owner_user_id', { job_id: jobId });
        return [];
      }

      console.log('[BidUpdatedResolver] Resolved recipient', {
        bid_id: bidId,
        job_id: jobId,
        owner_user_id: ownerUserId
      });

      // Step 5: Return recipient
      return [{ user_id: ownerUserId }];
    } catch (error) {
      console.error('[BidUpdatedResolver] Error resolving recipients', {
        bid_id: bidId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get bid by ID
   */
  async getBid(bidId) {
    const result = await docClient.send(new GetCommand({
      TableName: BID_TABLE,
      Key: { id: bidId }
    }));
    return result.Item || null;
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

module.exports = BidUpdatedResolver;
