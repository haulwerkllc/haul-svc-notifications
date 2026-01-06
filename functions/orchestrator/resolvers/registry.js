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

// Initialize resolver instances
const resolvers = [
  new JobPostedResolver(),
  new JobCanceledResolver(),
  new JobClosedResolver(),
  new BidCreatedResolver(),
  new BidUpdatedResolver(),
  new BookingCreatedResolver()
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
