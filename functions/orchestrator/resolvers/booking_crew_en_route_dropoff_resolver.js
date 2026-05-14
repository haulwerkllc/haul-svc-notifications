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
 * Resolver for haul.booking.crew_en_route_dropoff events
 * 
 * DELIVERY TARGET: CUSTOMER ONLY
 * 
 * Recipients: The customer (job owner) - notify them the crew has departed for dropoff
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
class BookingCrewEnRouteDropoffResolver extends NotificationResolver {
  getEventType() {
    return 'haul.booking.crew_en_route_dropoff';
  }

  async resolve(event) {
    console.log('[BookingCrewEnRouteDropoffResolver] Resolving recipients for booking.crew_en_route_dropoff event', {
      event_id: event.event_id,
      entity_id: event.entity.id
    });

    const bookingId = event.entity.id;

    try {
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        console.warn('[BookingCrewEnRouteDropoffResolver] Booking not found', { booking_id: bookingId });
        return [];
      }

      const job = await this.getJob(booking.job_id);
      if (!job) {
        console.warn('[BookingCrewEnRouteDropoffResolver] Job not found', {
          booking_id: bookingId,
          job_id: booking.job_id
        });
        return [];
      }

      if (!job.owner_user_id) {
        console.warn('[BookingCrewEnRouteDropoffResolver] Job has no owner_user_id', {
          booking_id: bookingId,
          job_id: booking.job_id
        });
        return [];
      }

      const recipients = [
        {
          user_id: job.owner_user_id,
          metadata: { recipient_type: 'customer' }
        }
      ];

      console.log('[BookingCrewEnRouteDropoffResolver] Resolved recipients', {
        booking_id: bookingId,
        recipient_count: recipients.length
      });

      return recipients;
    } catch (error) {
      console.error('[BookingCrewEnRouteDropoffResolver] Error resolving recipients', {
        booking_id: bookingId,
        error: error.message
      });
      return [];
    }
  }

  async getBooking(bookingId) {
    const result = await docClient.send(
      new GetCommand({ TableName: BOOKING_TABLE, Key: { id: bookingId } })
    );
    return result.Item || null;
  }

  async getJob(jobId) {
    const result = await docClient.send(
      new GetCommand({ TableName: JOB_TABLE, Key: { id: jobId } })
    );
    return result.Item || null;
  }
}

module.exports = BookingCrewEnRouteDropoffResolver;
