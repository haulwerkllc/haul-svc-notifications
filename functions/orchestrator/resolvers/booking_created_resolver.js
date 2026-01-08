const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { resolveUsersByCompanyRole } = require('../../../utils/company-role-lookup');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const BOOKING_TABLE = process.env.BOOKING_TABLE_NAME;
const JOB_TABLE = process.env.JOB_TABLE_NAME;

// Roles eligible to receive booking creation notifications
const ELIGIBLE_ROLES = ['OWNER', 'ADMIN', 'DISPATCHER'];

/**
 * Resolver for haul.booking.created events
 * 
 * DELIVERY TARGET: SERVICE PROVIDER USERS ONLY
 * 
 * Recipients: Service provider users (OWNER/ADMIN/DISPATCHER) from the winning company
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_ids of service provider users with recipient_type metadata
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * Resolution:
 * 1. Get Booking by id
 * 2. Extract booking.company_id (the winning company)
 * 3. Query CompanyRole table for OWNER/ADMIN/DISPATCHER users
 * 4. Return recipients with service_provider metadata
 */
class BookingCreatedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.booking.created';
  }

  async resolve(event) {
    console.log('[BookingCreatedResolver] Resolving recipients for booking.created event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    const bookingId = event.entity.id;

    try {
      // Step 1: Get booking
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        console.warn('[BookingCreatedResolver] Booking not found', { booking_id: bookingId });
        return [];
      }

      // Step 2: Extract company_id
      if (!booking.company_id) {
        console.warn('[BookingCreatedResolver] Booking has no company_id', { 
          booking_id: bookingId
        });
        return [];
      }

      console.log('[BookingCreatedResolver] Resolving service provider users', {
        booking_id: bookingId,
        company_id: booking.company_id
      });

      // Step 3: Get service provider users using shared helper
      const recipients = await resolveUsersByCompanyRole({
        companyIds: booking.company_id,
        eligibleRoles: ELIGIBLE_ROLES,
        includeMetadata: false,
        logPrefix: 'BookingCreatedResolver'
      });

      // Step 4: Add recipient_type metadata
      const recipientsWithMetadata = recipients.map(recipient => ({
        user_id: recipient.user_id,
        metadata: {
          recipient_type: 'service_provider',
          company_id: booking.company_id
        }
      }));

      console.log('[BookingCreatedResolver] Resolved recipients', {
        booking_id: bookingId,
        company_id: booking.company_id,
        recipient_count: recipientsWithMetadata.length
      });

      return recipientsWithMetadata;
    } catch (error) {
      console.error('[BookingCreatedResolver] Error resolving recipients', {
        booking_id: bookingId,
        error: error.message
      });
      return [];
    }
  }

  async getBooking(bookingId) {
    const result = await docClient.send(
      new GetCommand({
        TableName: BOOKING_TABLE,
        Key: { id: bookingId }
      })
    );
    return result.Item || null;
  }

  async getJob(jobId) {
    const result = await docClient.send(
      new GetCommand({
        TableName: JOB_TABLE,
        Key: { id: jobId }
      })
    );
    return result.Item || null;
  }
}

module.exports = BookingCreatedResolver;
