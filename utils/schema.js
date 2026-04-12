/**
 * Canonical EventBridge Ingress Schema
 * 
 * This schema is the single source of truth for notification ingress.
 * All domain events must conform to this structure.
 */

const VALID_EVENT_TYPES = [
  'haul.job.posted',
  'haul.job.canceled',
  'haul.job.closed',
  'haul.bid.created',
  'haul.bid.updated',
  'haul.booking.created',
  'haul.booking.assigned',
  'haul.booking.crew_en_route_pickup',
  'haul.booking.in_progress_pickup',
  'haul.booking.crew_en_route_dropoff',
  'haul.booking.in_progress_dropoff',
  'haul.booking.pending_confirmation',
  'haul.booking.rescheduled',
  'haul.booking.completed',
  'haul.booking.canceled',
  'haul.transfer.completed',
  'haul.transfer.failed',
  'haul.payment.authorization_failed',
  'haul.payment.captured',
  'haul.payout.sent',
  'haul.message.created',
];

/**
 * Validate the canonical notification ingress schema
 * @param {Object} event - The EventBridge event detail
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateNotificationEvent(event) {
  const errors = [];

  // Required top-level fields
  if (!event.event_id) {
    errors.push('Missing required field: event_id');
  }

  if (!event.event_type) {
    errors.push('Missing required field: event_type');
  } else if (!isValidEventType(event.event_type)) {
    errors.push(`Invalid event_type: ${event.event_type}`);
  }

  if (!event.occurred_at) {
    errors.push('Missing required field: occurred_at');
  }

  // Validate actor
  if (!event.actor) {
    errors.push('Missing required field: actor');
  } else {
    if (!event.actor.type) {
      errors.push('Missing required field: actor.type');
    } else if (!['user', 'system'].includes(event.actor.type)) {
      errors.push('actor.type must be "user" or "system"');
    }

    if (!event.actor.id) {
      errors.push('Missing required field: actor.id');
    }
  }

  // Validate recipients
  if (!event.recipients) {
    errors.push('Missing required field: recipients');
  } else {
    if (!event.recipients.mode) {
      errors.push('Missing required field: recipients.mode');
    } else if (!['service_area', 'explicit'].includes(event.recipients.mode)) {
      errors.push('recipients.mode must be "service_area" or "explicit"');
    }

    // Mode-specific validation
    if (event.recipients.mode === 'service_area' && !event.recipients.service_area_ids) {
      errors.push('recipients.service_area_ids required when mode is "service_area"');
    }

    if (event.recipients.mode === 'explicit' && !event.recipients.user_ids) {
      errors.push('recipients.user_ids required when mode is "explicit"');
    }
  }

  // Validate entity
  if (!event.entity) {
    errors.push('Missing required field: entity');
  } else {
    if (!event.entity.type) {
      errors.push('Missing required field: entity.type');
    }

    if (!event.entity.id) {
      errors.push('Missing required field: entity.id');
    }
  }

  // Context is optional but must be an object if present
  if (event.context !== undefined && typeof event.context !== 'object') {
    errors.push('context must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if event type is valid
 * @param {string} eventType 
 * @returns {boolean}
 */
function isValidEventType(eventType) {
  // Exact match
  if (VALID_EVENT_TYPES.includes(eventType)) {
    return true;
  }

  // Wildcard namespace match (e.g., haul.company.*)
  const namespace = eventType.split('.').slice(0, 2).join('.');
  return VALID_EVENT_TYPES.some(valid => {
    if (valid.endsWith('.*')) {
      const validNamespace = valid.replace('.*', '');
      return eventType.startsWith(validNamespace);
    }
    return false;
  });
}

module.exports = {
  validateNotificationEvent,
  VALID_EVENT_TYPES
};
