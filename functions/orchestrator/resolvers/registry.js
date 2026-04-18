/**
 * Resolver Registry
 * 
 * Maps event types to their corresponding resolver instances.
 * The orchestrator uses this registry to delegate recipient resolution.
 */

const JobPostedResolver = require('./job_posted_resolver');
const JobCanceledResolver = require('./job_canceled_resolver');
const JobClosedResolver = require('./job_closed_resolver');
const BidCreatedResolver = require('./bid_created_resolver');
const BidUpdatedResolver = require('./bid_updated_resolver');
const BookingCreatedResolver = require('./booking_created_resolver');
const BookingAssignedResolver = require('./booking_assigned_resolver');
const BookingCrewEnRoutePickupResolver = require('./booking_crew_en_route_pickup_resolver');
const BookingInProgressPickupResolver = require('./booking_in_progress_pickup_resolver');
const BookingCrewEnRouteDropoffResolver = require('./booking_crew_en_route_dropoff_resolver');
const BookingInProgressDropoffResolver = require('./booking_in_progress_dropoff_resolver');
const BookingPendingConfirmationResolver = require('./booking_pending_confirmation_resolver');
const BookingRescheduledResolver = require('./booking_rescheduled_resolver');
const BookingCompletedResolver = require('./booking_completed_resolver');
const BookingCanceledResolver = require('./booking_canceled_resolver');
const PaymentAuthorizationFailedResolver = require('./payment_authorization_failed_resolver');
const PaymentCapturedResolver = require('./payment_captured_resolver');
const PayoutSentResolver = require('./payout_sent_resolver');
const MessageCreatedResolver = require('./message_created_resolver');
const BookingEtaUpdateResolver = require('./booking_eta_update_resolver');

// Initialize resolver instances
const resolvers = [
  new JobPostedResolver(),
  new JobCanceledResolver(),
  new JobClosedResolver(),
  new BidCreatedResolver(),
  new BidUpdatedResolver(),
  new BookingCreatedResolver(),
  new BookingAssignedResolver(),
  new BookingCrewEnRoutePickupResolver(),
  new BookingInProgressPickupResolver(),
  new BookingCrewEnRouteDropoffResolver(),
  new BookingInProgressDropoffResolver(),
  new BookingPendingConfirmationResolver(),
  new BookingRescheduledResolver(),
  new BookingCompletedResolver(),
  new BookingCanceledResolver(),
  new PaymentAuthorizationFailedResolver(),
  new PaymentCapturedResolver(),
  new PayoutSentResolver(),
  new MessageCreatedResolver(),
  new BookingEtaUpdateResolver()
];

// Build registry keyed by event_type
const resolverRegistry = {};
resolvers.forEach(resolver => {
  resolverRegistry[resolver.getEventType()] = resolver;
});

/**
 * Get resolver for a given event type
 * @param {string} eventType 
 * @returns {NotificationResolver|null}
 */
function getResolver(eventType) {
  return resolverRegistry[eventType] || null;
}

module.exports = {
  getResolver,
  resolverRegistry
};
