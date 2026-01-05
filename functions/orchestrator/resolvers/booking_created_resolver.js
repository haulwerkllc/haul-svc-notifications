const NotificationResolver = require('./base');

/**
 * Resolver for haul.booking.created events
 * 
 * Recipients: The provider whose bid was accepted
 * 
 * BOUNDARY: This resolver performs LOOKUP ONLY
 * - Returns user_id of provider
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 * 
 * TODO: Implement provider lookup
 * - Query DynamoDB Booking table for booking details
 * - Extract provider_user_id or provider_company_id
 * - Resolve to individual user(s) if company-level
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

    // TODO: Query DynamoDB for booking details
    // - Table: Booking-${env}
    // - Key: booking_id = entity.id
    // - Return: [{ user_id: booking.provider_user_id }]
    // - Or resolve company roles if provider_company_id is set
    
    return [];
  }
}

module.exports = BookingCreatedResolver;
