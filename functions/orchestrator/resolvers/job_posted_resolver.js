const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { Client } = require('@opensearch-project/opensearch');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { Sha256 } = require('@aws-crypto/sha256-js');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const JOB_TABLE = process.env.JOB_TABLE_NAME;
const COMPANY_ROLE_TABLE = process.env.COMPANY_ROLE_TABLE_NAME;
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;

// Roles eligible to receive job notifications
const ELIGIBLE_ROLES = ['OWNER', 'ADMIN', 'DISPATCHER'];

/**
 * Resolver for haul.job.posted events
 * 
 * Recipients: All providers in the service area(s) specified
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_ids of eligible recipients
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * Implementation:
 * 1. Query Job table for job details
 * 2. Extract service_location (lat/lon)
 * 3. Query OpenSearch for service areas containing the location
 * 4. Extract company_ids from matching service areas
 * 5. Query CompanyRole table for OWNER/ADMIN/DISPATCHER users
 * 6. Return user_ids only; orchestrator handles preferences and delivery
 */
class JobPostedResolver extends NotificationResolver {
  constructor() {
    super();
    this.openSearchClient = null;
  }

  getEventType() {
    return 'haul.job.posted';
  }

  async resolve(event) {
    console.log('[JobPostedResolver] Resolving recipients for job.posted event', {
      event_id: event.event_id,
      entity_id: event.entity.id,
      mode: event.recipients.mode
    });

    const jobId = event.entity.id;

    try {
      // Step 1: Lookup job record
      const job = await this.getJob(jobId);
      if (!job) {
        console.warn('[JobPostedResolver] Job not found', { job_id: jobId });
        return [];
      }

      // Step 2: Extract service location
      const serviceLocation = job.service_location;
      if (!serviceLocation || !serviceLocation.lat || !serviceLocation.lon) {
        console.warn('[JobPostedResolver] Job has no service_location', { job_id: jobId });
        return [];
      }

      console.log('[JobPostedResolver] Job service location', {
        job_id: jobId,
        lat: serviceLocation.lat,
        lon: serviceLocation.lon
      });

      // Step 3: Query OpenSearch for matching service areas
      const matchingServiceAreas = await this.findMatchingServiceAreas(
        serviceLocation.lat,
        serviceLocation.lon
      );

      if (matchingServiceAreas.length === 0) {
        console.info('[JobPostedResolver] No service areas match job location', {
          job_id: jobId,
          location: serviceLocation
        });
        return [];
      }

      console.log('[JobPostedResolver] Found matching service areas', {
        job_id: jobId,
        count: matchingServiceAreas.length
      });

      // Step 4: Collect unique company_ids
      const companyIds = [...new Set(matchingServiceAreas.map(sa => sa.company_id))];

      console.log('[JobPostedResolver] Unique companies in service area', {
        job_id: jobId,
        company_count: companyIds.length,
        company_ids: companyIds
      });

      // Step 5: Resolve users by company role
      const recipients = await this.resolveUsersByCompanyRole(companyIds);

      console.log('[JobPostedResolver] Resolved recipients', {
        job_id: jobId,
        recipient_count: recipients.length
      });

      return recipients;
    } catch (error) {
      console.error('[JobPostedResolver] Error resolving recipients', {
        job_id: jobId,
        error: error.message,
        stack: error.stack
      });
      // Return empty array on error - do not throw to allow orchestrator to continue
      return [];
    }
  }

  /**
   * Get job record from DynamoDB
   */
  async getJob(jobId) {
    const result = await docClient.send(new GetCommand({
      TableName: JOB_TABLE,
      Key: { id: jobId }
    }));

    return result.Item;
  }

  /**
   * Find service areas that contain the given location
   * Uses OpenSearch with radius-based geo-distance calculation
   */
  async findMatchingServiceAreas(lat, lon) {
    if (!OPENSEARCH_ENDPOINT) {
      console.warn('[JobPostedResolver] OpenSearch endpoint not configured');
      return [];
    }

    // Initialize OpenSearch client if needed
    if (!this.openSearchClient) {
      this.openSearchClient = await this.createOpenSearchClient();
    }

    // Query OpenSearch for service areas within radius
    const response = await this.openSearchClient.search({
      index: 'service_areas',
      body: {
        query: {
          bool: {
            must: [
              {
                geo_distance: {
                  distance: '100km', // Maximum search radius
                  'center': {
                    lat: lat,
                    lon: lon
                  }
                }
              }
            ]
          }
        },
        size: 100 // Limit results
      }
    });

    const hits = response.body.hits.hits || [];
    
    // Filter by actual radius_km from each service area
    const matchingAreas = hits
      .map(hit => hit._source)
      .filter(serviceArea => {
        if (!serviceArea.center || !serviceArea.radius_km) {
          return false;
        }

        const distance = this.calculateDistance(
          lat,
          lon,
          serviceArea.center.lat,
          serviceArea.center.lon
        );

        return distance <= serviceArea.radius_km;
      });

    return matchingAreas;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Resolve users by querying CompanyRole table
   * Returns users with OWNER, ADMIN, or DISPATCHER roles
   */
  async resolveUsersByCompanyRole(companyIds) {
    const recipients = [];
    const seenUserIds = new Set();

    for (const companyId of companyIds) {
      try {
        console.log('[JobPostedResolver] Querying CompanyRole table', {
          table: COMPANY_ROLE_TABLE,
          index: 'companyId-index',
          company_id: companyId
        });

        const result = await docClient.send(new QueryCommand({
          TableName: COMPANY_ROLE_TABLE,
          IndexName: 'companyId-index',
          KeyConditionExpression: 'company_id = :company_id',
          ExpressionAttributeValues: {
            ':company_id': companyId
          }
        }));

        const items = result.Items || [];

        console.log('[JobPostedResolver] CompanyRole query result', {
          company_id: companyId,
          total_items_found: items.length,
          items: items.map(item => ({ user_id: item.user_id, roles: item.roles, status: item.status }))
        });

        // Filter for eligible users (status active and has at least one eligible role)
        const eligibleUsers = items.filter(item => {
          if (item.status !== 'ACTIVE') return false;
          
          // Debug logging to inspect roles structure
          console.log('[JobPostedResolver] Inspecting roles for user', {
            user_id: item.user_id,
            roles_raw: item.roles,
            roles_type: typeof item.roles,
            is_array: Array.isArray(item.roles),
            is_set: item.roles instanceof Set,
            constructor_name: item.roles?.constructor?.name
          });
          
          // Check if item.roles array contains any eligible role
          const userRoles = item.roles instanceof Set ? Array.from(item.roles) : (Array.isArray(item.roles) ? item.roles : (item.roles ? [item.roles] : []));
          
          console.log('[JobPostedResolver] Converted roles', {
            user_id: item.user_id,
            userRoles,
            userRoles_length: userRoles.length
          });
          
          return userRoles.some(role => ELIGIBLE_ROLES.includes(role));
        });

        console.log('[JobPostedResolver] Eligible users for company', {
          company_id: companyId,
          eligible_count: eligibleUsers.length,
          eligible_users: eligibleUsers.map(item => ({ user_id: item.user_id, roles: item.roles }))
        });

        // Add to recipients list (deduped)
        for (const item of eligibleUsers) {
          if (!seenUserIds.has(item.user_id)) {
            seenUserIds.add(item.user_id);
            
            // Find the highest priority role for metadata
            const userRoles = item.roles instanceof Set ? Array.from(item.roles) : (Array.isArray(item.roles) ? item.roles : [item.roles]);
            const eligibleRole = userRoles.find(r => ELIGIBLE_ROLES.includes(r)) || userRoles[0];
            
            recipients.push({
              user_id: item.user_id,
              metadata: {
                company_id: companyId,
                roles: userRoles,
                primary_role: eligibleRole
              }
            });
          }
        }
      } catch (error) {
        console.error('[JobPostedResolver] Error querying company roles', {
          company_id: companyId,
          error: error.message
        });
        // Continue with other companies
      }
    }

    return recipients;
  }

  /**
   * Create OpenSearch client with AWS SigV4 authentication
   */
  async createOpenSearchClient() {
    const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
    
    return new Client({
      ...AwsSigv4Signer({
        region: process.env.REGION,
        service: 'es',
        getCredentials: () => {
          const credentialsProvider = defaultProvider();
          return credentialsProvider();
        }
      }),
      node: OPENSEARCH_ENDPOINT
    });
  }
}

module.exports = JobPostedResolver;
