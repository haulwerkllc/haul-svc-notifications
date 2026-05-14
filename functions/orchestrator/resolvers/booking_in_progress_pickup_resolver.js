const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const BOOKING_TABLE = process.env.BOOKING_TABLE_NAME;
const JOB_TABLE = process.env.JOB_TABLE_NAME;

/**
 * Resolver for haul.booking.in_progress_pickup events
 * 
 * DELIVERY TARGET: CUSTOMER ONLY
 * 
 * Recipients: The customer (job owner) - notify them that their job is in progress
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_id of customer with recipient_type metadata
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * Resolution:
 * 1. Get Booking by id
 * 2. Get Job by booking.job_id
 * 3. Return job.owner_user_id as customer
 */
class BookingInProgressPickupResolver extends NotificationResolver {
  getEventType() {
    return 'haul.booking.in_progress_pickup';
  }

  async resolve(event) {
    console.log('[BookingInProgressPickupResolver] Resolving recipients for booking.in_progress_pickup event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    const bookingId = event.entity.id;

    try {
      // Step 1: Get booking
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        console.warn('[BookingInProgressPickupResolver] Booking not found', { booking_id: bookingId });
        return [];
      }

      // Step 2: Get job
      const job = await this.getJob(booking.job_id);
      if (!job) {
        console.warn('[BookingInProgressPickupResolver] Job not found', { 
          booking_id: bookingId, 
          job_id: booking.job_id 
        });
        return [];
      }

      // Step 3: Return customer (job owner)
      if (!job.owner_user_id) {
        console.warn('[BookingInProgressPickupResolver] Job has no owner_user_id', { 
          booking_id: bookingId,
          job_id: booking.job_id 
        });
        return [];
      }

      const recipients = [
        {
          user_id: job.owner_user_id,
          metadata: {
            recipient_type: 'customer'
          }
        }
      ];

      console.log('[BookingInProgressPickupResolver] Resolved recipients', {
        booking_id: bookingId,
        recipient_count: recipients.length
      });

      return recipients;
    } catch (error) {
      console.error('[BookingInProgressPickupResolver] Error resolving recipients', {
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

module.exports = BookingInProgressPickupResolver;
