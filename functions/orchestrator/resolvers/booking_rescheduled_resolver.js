const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const BOOKING_TABLE = process.env.BOOKING_TABLE_NAME;
const JOB_TABLE = process.env.JOB_TABLE_NAME;
const COMPANY_TABLE = process.env.COMPANY_TABLE_NAME;
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL;

/**
 * Resolver for haul.booking.rescheduled events
 * 
 * DELIVERY TARGETS: CUSTOMER ONLY
 * 
 * Recipients:
 * - Customer: The job owner (job.owner_user_id)
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_ids with explicit recipient_type metadata
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * Resolution:
 * 1. Get Booking by id
 * 2. Get Job by booking.job_id
 * 3. Return customer (job.owner_user_id) only
 */
class BookingRescheduledResolver extends NotificationResolver {
  getEventType() {
    return 'haul.booking.rescheduled';
  }

  async resolve(event) {
    console.log('[BookingRescheduledResolver] Resolving recipients for booking.rescheduled event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    const bookingId = event.entity.id;

    try {
      // Step 1: Get booking
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        console.warn('[BookingRescheduledResolver] Booking not found', { booking_id: bookingId });
        return [];
      }

      // Step 2: Get job
      const job = await this.getJob(booking.job_id);
      if (!job) {
        console.warn('[BookingRescheduledResolver] Job not found', { 
          booking_id: bookingId, 
          job_id: booking.job_id 
        });
        return [];
      }

      // Step 3: Get company details
      const company = await this.getCompany(booking.company_id);

      // Step 4: Enrich event context with all necessary data for email templates
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
        stops: job.stops,
        pickup_timezone: pickupTimezone,
        pickup_window_start: event.context?.pickup_window_start || booking.pickup_window_start || null,
        pickup_window_end: event.context?.pickup_window_end || booking.pickup_window_end || null,
        previous_pickup_window_start: event.context?.previous_pickup_window_start || null,
        previous_pickup_window_end: event.context?.previous_pickup_window_end || null,
      };

      console.log('[BookingRescheduledResolver] Enriched event context', {
        booking_id: bookingId,
        booking_number: booking.booking_number,
        company_name: company?.name,
        new_pickup_start: event.context.pickup_window_start,
        previous_pickup_start: event.context.previous_pickup_window_start
      });

      // Step 5: Build recipients list (customer only)
      const recipients = [];

      if (job.owner_user_id) {
        recipients.push({
          user_id: job.owner_user_id,
          metadata: {
            recipient_type: 'customer'
          }
        });
      } else {
        console.warn('[BookingRescheduledResolver] Job has no owner_user_id', { 
          booking_id: bookingId,
          job_id: booking.job_id 
        });
      }

      console.log('[BookingRescheduledResolver] Resolved recipients', {
        booking_id: bookingId,
        recipient_count: recipients.length,
        has_customer: !!job.owner_user_id
      });

      return recipients;
    } catch (error) {
      console.error('[BookingRescheduledResolver] Error resolving recipients', {
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
      console.error('[BookingRescheduledResolver] Error fetching company', {
        company_id: companyId,
        error: error.message
      });
      return null;
    }
  }
}

module.exports = BookingRescheduledResolver;
