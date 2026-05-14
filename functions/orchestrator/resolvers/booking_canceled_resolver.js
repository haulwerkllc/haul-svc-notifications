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
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL;

const ELIGIBLE_ROLES = ['OWNER', 'ADMIN', 'DISPATCHER'];

/**
 * Resolver for haul.booking.canceled events
 *
 * DELIVERY TARGETS: CUSTOMER + SERVICE PROVIDER USERS
 *
 * Recipients:
 * - Customer: job.owner_user_id (recipient_type: customer)
 * - Provider: OWNER/ADMIN/DISPATCHER from booking.company_id (recipient_type: provider)
 *
 * Resolution:
 * 1. Get Booking by id
 * 2. Get Job by booking.job_id
 * 3. Get Company for logo/name
 * 4. Return customer + company users with enriched context
 */
class BookingCanceledResolver extends NotificationResolver {
  getEventType() {
    return 'haul.booking.canceled';
  }

  async resolve(event) {
    console.log('[BookingCanceledResolver] Resolving recipients for booking.canceled event', {
      event_id: event.event_id,
      entity_id: event.entity?.id
    });

    const bookingId = event.entity?.id || event.context?.booking_id;

    if (!bookingId) {
      console.warn('[BookingCanceledResolver] No booking_id found in event');
      return [];
    }

    try {
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        console.warn('[BookingCanceledResolver] Booking not found', { booking_id: bookingId });
        return [];
      }

      const job = await this.getJob(booking.job_id);
      if (!job) {
        console.warn('[BookingCanceledResolver] Job not found', { booking_id: bookingId, job_id: booking.job_id });
        return [];
      }

      const company = await this.getCompany(booking.company_id);

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
        logo_url: company?.logo_key ? `${MEDIA_BASE_URL}/${company.logo_key}` : null,
        amount_cents: booking.amount_cents,
        stops: job.stops,
        pickup_timezone: pickupTimezone,
        canceled_by: event.context?.canceled_by || null,
      };

      const recipients = [];

      if (job.owner_user_id) {
        recipients.push({
          user_id: job.owner_user_id,
          metadata: { recipient_type: 'customer' }
        });
      } else {
        console.warn('[BookingCanceledResolver] Job has no owner_user_id', { booking_id: bookingId });
      }

      if (booking.company_id) {
        const providerUsers = await resolveUsersByCompanyRole({
          companyIds: booking.company_id,
          eligibleRoles: ELIGIBLE_ROLES,
          includeMetadata: false,
          logPrefix: 'BookingCanceledResolver'
        });

        providerUsers.forEach(u => {
          recipients.push({
            user_id: u.user_id,
            metadata: { recipient_type: 'provider', company_id: booking.company_id }
          });
        });
      }

      console.log('[BookingCanceledResolver] Resolved recipients', {
        booking_id: bookingId,
        recipient_count: recipients.length
      });

      return recipients;
    } catch (error) {
      console.error('[BookingCanceledResolver] Error resolving recipients', {
        booking_id: bookingId,
        error: error.message
      });
      return [];
    }
  }

  async getBooking(bookingId) {
    const result = await docClient.send(new GetCommand({ TableName: BOOKING_TABLE, Key: { id: bookingId } }));
    return result.Item || null;
  }

  async getJob(jobId) {
    const result = await docClient.send(new GetCommand({ TableName: JOB_TABLE, Key: { id: jobId } }));
    return result.Item || null;
  }

  async getCompany(companyId) {
    if (!companyId) return null;
    try {
      const result = await docClient.send(new GetCommand({ TableName: COMPANY_TABLE, Key: { id: companyId } }));
      return result.Item || null;
    } catch (error) {
      console.error('[BookingCanceledResolver] Error fetching company', { company_id: companyId, error: error.message });
      return null;
    }
  }
}

module.exports = BookingCanceledResolver;
