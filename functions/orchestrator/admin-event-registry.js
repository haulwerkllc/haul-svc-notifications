/**
 * Admin Event Registry
 * 
 * Defines which event types should be routed to the admin channel
 * in addition to standard user notifications.
 * 
 * Events in this registry will:
 * - Follow the standard resolver → user notification flow
 * - ALSO send a copy to the admin channel with the same enriched data
 * - Not check NotificationPreferences for admin delivery
 * 
 * To add admin monitoring to an event:
 * 1. Add the event_type string to ADMIN_ELIGIBLE_EVENTS below
 * 2. No other changes required (resolvers, producers, schemas stay unchanged)
 * 
 * For admin-only events (no user notifications):
 * - Producer sets `recipients.admin_only: true` in event detail
 * - No need to add to this registry
 */

const ADMIN_ELIGIBLE_EVENTS = new Set([
  'haul.job.posted',
  'haul.bid.created',
  'haul.booking.created'
]);

/**
 * Check if an event type should be routed to the admin channel
 * @param {string} eventType - The event_type from the notification detail
 * @returns {boolean} True if event should be sent to admin channel
 */
function isAdminEligibleEvent(eventType) {
  return ADMIN_ELIGIBLE_EVENTS.has(eventType);
}

module.exports = {
  ADMIN_ELIGIBLE_EVENTS,
  isAdminEligibleEvent
};
