const NotificationResolver = require('./base');
const {
  buildResolverCoarseServiceAreasQuery,
  normalizeServiceAreaType,
  isValidGeoShapeGeometry,
} = require('../../../utils/service-area-geo-query');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { Client } = require('@opensearch-project/opensearch');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { resolveUsersByCompanyRole } = require('../../../utils/company-role-lookup');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const JOB_TABLE = process.env.JOB_TABLE_NAME;
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT?.startsWith('https://') 
  ? process.env.OPENSEARCH_ENDPOINT 
  : `https://${process.env.OPENSEARCH_ENDPOINT}`;

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
 * 2. Extract PICKUP stop lat/lon from stops[]
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

      // Step 2: Extract location from PICKUP stop
      const pickupStop = job.stops?.find(s => s.stop_type === 'PICKUP') || job.stops?.[0];
      const pickupLat = pickupStop?.location?.lat;
      const pickupLon = pickupStop?.location?.lon;
      if (!pickupStop || typeof pickupLat !== 'number' || typeof pickupLon !== 'number') {
        console.warn('[JobPostedResolver] Job has no PICKUP stop with lat/lon', { job_id: jobId });
        return [];
      }

      console.log('[JobPostedResolver] Job pickup location', {
        job_id: jobId,
        lat: pickupLat,
        lon: pickupLon
      });

      // Step 3: Query OpenSearch for matching service areas
      const matchingServiceAreas = await this.findMatchingServiceAreas(
        pickupLat,
        pickupLon
      );

      if (matchingServiceAreas.length === 0) {
        console.info('[JobPostedResolver] No service areas match job location', {
          job_id: jobId,
          location: { lat: pickupLat, lon: pickupLon }
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

      // Step 5: Resolve users by company role using shared helper
      const recipients = await resolveUsersByCompanyRole({
        companyIds,
        eligibleRoles: ELIGIBLE_ROLES,
        includeMetadata: true,
        logPrefix: 'JobPostedResolver'
      });

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
   * Uses OpenSearch: radius areas (coarse geo_distance + Haversine); polygon/municipality (geo_shape).
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

    const response = await this.openSearchClient.search({
      index: 'service_areas',
      body: {
        query: buildResolverCoarseServiceAreasQuery(lat, lon),
        size: 100,
      },
    });

    const hits = response.body.hits.hits || [];

    const matchingAreas = hits
      .map((hit) => hit._source)
      .filter((serviceArea) => {
        const t = normalizeServiceAreaType(serviceArea.type);
        if (t === 'polygon' || t === 'municipality') {
          if (!isValidGeoShapeGeometry(serviceArea.geometry)) {
            console.warn('[JobPostedResolver] Skipping hit: invalid geometry', {
              id: serviceArea.id,
              company_id: serviceArea.company_id,
            });
            return false;
          }
          return true;
        }

        if (!serviceArea.center || typeof serviceArea.center.lat !== 'number' || typeof serviceArea.center.lon !== 'number') {
          return false;
        }
        if (typeof serviceArea.radius_km !== 'number' || serviceArea.radius_km <= 0 || !Number.isFinite(serviceArea.radius_km)) {
          return false;
        }

        const distance = this.calculateDistance(
          lat,
          lon,
          serviceArea.center.lat,
          serviceArea.center.lon,
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
