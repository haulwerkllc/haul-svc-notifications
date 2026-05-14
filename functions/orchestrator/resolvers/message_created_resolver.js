const NotificationResolver = require('./base');

/**
 * Resolver for haul.message.created events
 *
 * Recipients: all thread participants except the sender, pre-resolved by the
 * emitter in haul-svc-messaging. The event uses explicit recipient mode so
 * this resolver simply maps the user_ids array to the expected return shape.
 *
 * BOUNDARY: This resolver performs NO lookups.
 * - Recipients are already known from the event payload
 * - MUST NOT evaluate preferences, determine channels, or perform delivery
 */
class MessageCreatedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.message.created';
  }

  async resolve(event) {
    const userIds = event.recipients?.user_ids || [];

    if (userIds.length === 0) {
      console.warn('[MessageCreatedResolver] No recipient user_ids in event', {
        event_id: event.event_id,
      });
      return [];
    }

    return userIds.map((userId) => ({ user_id: userId }));
  }
}

module.exports = MessageCreatedResolver;
