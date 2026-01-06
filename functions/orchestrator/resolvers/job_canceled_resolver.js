const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const BID_TABLE = process.env.BID_TABLE_NAME;
const COMPANY_ROLE_TABLE = process.env.COMPANY_ROLE_TABLE_NAME;

// Roles that should receive job cancellation notifications
const NOTIFIABLE_ROLES = ['OWNER', 'ADMIN', 'DISPATCHER'];

/**
 * Resolver for haul.job.canceled events
 * 
 * Recipients: Service providers who have JOB_CANCELED bids on the canceled job
 * Specifically: OWNER, ADMIN, DISPATCHER users from companies with active bids
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_ids only
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
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

    const jobId = event.entity.id;

    try {
      // Prefer company_ids from event context (avoids GSI eventual consistency issues)
      // Fall back to querying bids if not provided
      let companyIds = event.context?.company_ids;

      if (!companyIds || companyIds.length === 0) {
        console.log('[JobCanceledResolver] No company_ids in context, querying bids', { job_id: jobId });
        
        // Step 1: Query bids for this job with status = 'JOB_CANCELED'
        const bids = await this.getCanceledBidsForJob(jobId);
        
        if (bids.length === 0) {
          console.info('[JobCanceledResolver] No canceled bids found for job', { job_id: jobId });
          return [];
        }

        console.log('[JobCanceledResolver] Found canceled bids', {
          job_id: jobId,
          bid_count: bids.length
        });

        // Extract unique company_ids from bids
        companyIds = [...new Set(bids.map(bid => bid.company_id).filter(Boolean))];
      } else {
        console.log('[JobCanceledResolver] Using company_ids from event context', {
          job_id: jobId,
          company_count: companyIds.length
        });
      }
      
      if (companyIds.length === 0) {
        console.warn('[JobCanceledResolver] No company_ids found', { job_id: jobId });
        return [];
      }

      console.log('[JobCanceledResolver] Companies to notify', {
        job_id: jobId,
        company_count: companyIds.length,
        company_ids: companyIds
      });

      // Get notifiable users from each company
      const userIds = new Set();
      
      for (const companyId of companyIds) {
        const users = await this.getNotifiableUsersForCompany(companyId);
        users.forEach(userId => userIds.add(userId));
      }

      const recipients = Array.from(userIds).map(user_id => ({ user_id }));

      console.log('[JobCanceledResolver] Resolved recipients', {
        job_id: jobId,
        recipient_count: recipients.length
      });

      return recipients;
    } catch (error) {
      console.error('[JobCanceledResolver] Error resolving recipients', {
        job_id: jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Query canceled bids for a job using GSI jobId-status-index
   */
  async getCanceledBidsForJob(jobId) {
    const result = await docClient.send(new QueryCommand({
      TableName: BID_TABLE,
      IndexName: 'jobId-status-index',
      KeyConditionExpression: 'job_id = :jobId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':jobId': jobId,
        ':status': 'JOB_CANCELED'
      }
    }));

    return result.Items || [];
  }

  /**
   * Get users with OWNER, ADMIN, or DISPATCHER roles for a company
   */
  async getNotifiableUsersForCompany(companyId) {
    const result = await docClient.send(new QueryCommand({
      TableName: COMPANY_ROLE_TABLE,
      IndexName: 'companyId-index',
      KeyConditionExpression: 'company_id = :companyId',
      ExpressionAttributeValues: {
        ':companyId': companyId
      }
    }));

    const roles = result.Items || [];
    
    // Filter to notifiable roles and extract user_ids
    return roles
      .filter(role => NOTIFIABLE_ROLES.includes(role.role) && role.status === 'ACTIVE')
      .map(role => role.user_id)
      .filter(Boolean);
  }
}

module.exports = JobCanceledResolver;
