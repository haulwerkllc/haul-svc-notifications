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
const COMPANY_TABLE = process.env.COMPANY_TABLE_NAME;
const USER_TABLE = process.env.USER_TABLE_NAME;
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL;

const ELIGIBLE_ROLES = ['OWNER', 'ADMIN', 'DISPATCHER'];

/**
 * Resolver for haul.booking.assigned events
 * 
 * DELIVERY TARGETS: SERVICE PROVIDER USERS + DRIVER
 * 
 * Recipients:
 * - Service provider: OWNER/ADMIN/DISPATCHER users of booking.company_id
 * - Driver: The assigned driver (booking.driver_user_id)
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_ids with explicit recipient_type metadata
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * Resolution:
 * 1. Get Booking by id
 * 2. Get Job by booking.job_id
 * 3. Get company users (OWNER/ADMIN/DISPATCHER) and driver
 */
class BookingAssignedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.booking.assigned';
  }

  async resolve(event) {
    console.log('[BookingAssignedResolver] Resolving recipients for booking.assigned event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    const bookingId = event.entity.id;

    try {
      // Step 1: Get booking
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        console.warn('[BookingAssignedResolver] Booking not found', { booking_id: bookingId });
        return [];
      }

      // Step 2: Get job
      const job = await this.getJob(booking.job_id);
      if (!job) {
        console.warn('[BookingAssignedResolver] Job not found', { 
          booking_id: bookingId, 
          job_id: booking.job_id 
        });
        return [];
      }

      // Step 3: Get company details
      const company = await this.getCompany(booking.company_id);
      
      // Step 4: Get driver details
      const driver = booking.driver_user_id ? await this.getUser(booking.driver_user_id) : null;

      // Step 5: Enrich event context with all necessary data for email templates
      // Derive address from job.stops[] PICKUP stop
      const pickupStop = job.stops?.find(s => s.stop_type === 'PICKUP') || job.stops?.[0] || null;
      const pickupTimezone = pickupStop?.timezone || null;

      event.context = {
        ...event.context,
        booking_id: bookingId,
        booking_number: booking.booking_number,
        job_id: booking.job_id,
        job_type: booking.job_type || job.job_type,
        company_id: booking.company_id,
        company_name: company?.name || null,
        logo_key: company?.logo_key || null,
        logo_url: company?.logo_key ? `${MEDIA_BASE_URL}/${company.logo_key}` : null,
        amount_cents: booking.amount_cents,
        stops: job.stops,
        pickup_timezone: pickupTimezone,
        pickup_window_start: booking.pickup_window_start || null,
        pickup_window_end: booking.pickup_window_end || null,
        driver_user_id: booking.driver_user_id,
        driver_given_name: driver?.given_name || null,
        profile_photo_key: driver?.profile_photo_key || null,
        profile_photo_url: driver?.profile_photo_key ? `${MEDIA_BASE_URL}/${driver.profile_photo_key}` : null,
      };

      console.log('[BookingAssignedResolver] Enriched event context', {
        booking_id: bookingId,
        booking_number: booking.booking_number,
        company_name: company?.name,
        driver_given_name: driver?.given_name
      });

      // Step 6: Build recipients list
      const recipients = [];

      // Add service provider users (OWNER/ADMIN/DISPATCHER), excluding the driver
      // to prevent them receiving two emails if they hold a company role
      if (booking.company_id) {
        const providerUsers = await resolveUsersByCompanyRole({
          companyIds: booking.company_id,
          eligibleRoles: ELIGIBLE_ROLES,
          includeMetadata: false,
          logPrefix: 'BookingAssignedResolver'
        });
        for (const u of providerUsers) {
          if (u.user_id === booking.driver_user_id) continue;
          recipients.push({
            user_id: u.user_id,
            metadata: { recipient_type: 'provider', company_id: booking.company_id }
          });
        }
      } else {
        console.warn('[BookingAssignedResolver] Booking has no company_id', { booking_id: bookingId });
      }

      // Add driver
      if (booking.driver_user_id) {
        recipients.push({
          user_id: booking.driver_user_id,
          metadata: {
            recipient_type: 'driver'
          }
        });
      } else {
        console.warn('[BookingAssignedResolver] Booking has no driver_user_id', { 
          booking_id: bookingId 
        });
      }

      console.log('[BookingAssignedResolver] Resolved recipients', {
        booking_id: bookingId,
        recipient_count: recipients.length,
        has_driver: !!booking.driver_user_id
      });

      return recipients;
    } catch (error) {
      console.error('[BookingAssignedResolver] Error resolving recipients', {
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

  async getCompany(companyId) {
    if (!companyId) return null;
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: COMPANY_TABLE,
          Key: { id: companyId }
        })
      );
      return result.Item || null;
    } catch (error) {
      console.error('[BookingAssignedResolver] Error fetching company', {
        company_id: companyId,
        error: error.message
      });
      return null;
    }
  }

  async getUser(userId) {
    if (!userId) return null;
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: USER_TABLE,
          Key: { id: userId }
        })
      );
      return result.Item || null;
    } catch (error) {
      console.error('[BookingAssignedResolver] Error fetching user', {
        user_id: userId,
        error: error.message
      });
      return null;
    }
  }
}

module.exports = BookingAssignedResolver;
