/**
 * Admin Channel Handler
 * 
 * Receives notification events from the admin SQS queue and forwards them
 * to Slack for internal monitoring.
 * 
 * Characteristics:
 * - Does NOT check NotificationPreferences (internal notifications only)
 * - Receives post-resolver enriched data
 * - Delivers to Slack webhook
 * - Supports both admin-only events and dual-routing (user + admin)
 */

const { postToSlack } = require('../../../utils/slack-notifier');

/**
 * Lambda handler for processing admin channel messages
 * @param {Object} event - SQS event with messages from admin queue
 */
exports.handler = async (event) => {
  console.log('[AdminChannel] Processing batch', {
    record_count: event.Records.length
  });

  const results = [];

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('[AdminChannel] Processing message', {
        event_id: message.event_id,
        event_type: message.event_type,
        recipient_count: message.recipient_count
      });

      await processAdminNotification(message);

      results.push({
        messageId: record.messageId,
        status: 'success'
      });
    } catch (error) {
      console.error('[AdminChannel] Error processing message', {
        messageId: record.messageId,
        error: error.message,
        stack: error.stack
      });

      results.push({
        messageId: record.messageId,
        status: 'failed',
        error: error.message
      });

      // Re-throw to trigger SQS retry/DLQ
      throw error;
    }
  }

  console.log('[AdminChannel] Batch processing complete', {
    total: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ results })
  };
};

/**
 * Process a single admin notification message
 * Routes to Slack webhook based on event type
 */
async function processAdminNotification(message) {
  const { event_type } = message;

  // Only process specific event types
  const supportedEvents = ['haul.job.posted', 'haul.bid.created', 'haul.booking.created'];
  
  if (!supportedEvents.includes(event_type)) {
    console.log('[AdminChannel] Event type not configured for Slack notifications', { event_type });
    return;
  }

  // Build Slack Block Kit payload
  const slackPayload = buildSlackMessage(message);

  if (!slackPayload) {
    console.warn('[AdminChannel] Unable to build Slack message', { event_type });
    return;
  }

  // Send to Slack
  try {
    await postToSlack(slackPayload);
    console.log('[AdminChannel] Successfully posted to Slack', { event_type });
  } catch (error) {
    // Log but don't throw - Slack notifications are non-blocking
    console.error('[AdminChannel] Failed to post to Slack', {
      event_type,
      error: error.message
    });
  }
}

/**
 * Build Slack Block Kit message for supported events
 * @param {Object} message - Admin notification message from orchestrator
 * @returns {Object|null} Slack Block Kit payload or null if event not supported
 */
function buildSlackMessage(message) {
  const { event_type } = message;

  switch (event_type) {
    case 'haul.job.posted':
      return buildJobPostedSlackMessage(message);
    case 'haul.bid.created':
      return buildBidCreatedSlackMessage(message);
    case 'haul.booking.created':
      return buildBookingCreatedSlackMessage(message);
    default:
      return null;
  }
}

/**
 * Format environment name for display
 */
function formatEnvironment(env) {
  const envMap = {
    'dev': 'Development',
    'stage': 'Staging',
    'main': 'Live'
  };
  return envMap[env] || env || 'Unknown';
}

/**
 * Normalize property type to init caps
 */
function normalizePropertyType(propertyType) {
  if (!propertyType) return 'Not specified';
  return propertyType
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize job type
 */
function normalizeJobType(dataType) {
  if (!dataType) return 'Not specified';
  const typeMap = {
    'JUNK_REMOVAL': 'Junk Removal',
    'MOVE_SMALL': 'Small Move',
    'MOVE_STORAGE': 'Storage Move',
  };
  return typeMap[dataType] || dataType;
}

/**
 * Build Slack message for haul.job.posted
 */
function buildJobPostedSlackMessage(message) {
  const { notification_content, entity } = message;
  const env = formatEnvironment(process.env.ENV);

  // Extract enriched job data from notification_content.data
  const data = notification_content.data || {};
  
  const propertyType = normalizePropertyType(data.property_type);
  const jobType = normalizeJobType(data.job_type);
  const address = formatAddress(data.service_address);
  const unit = data.unit ? `Unit ${data.unit}` : '';
  const addressWithUnit = unit ? `${address}, ${unit}` : address;

  // Format timing
  const timing = formatTimingPreference(
    data.timing_preference,
    data.preferred_pickup_window_start,
    data.preferred_pickup_window_end,
    data.service_location_timezone
  );

  // Format bidding closes at
  const biddingClosesAt = data.bidding_closes_at
    ? formatDateTime(data.bidding_closes_at, data.service_location_timezone)
    : 'Not specified';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔔 New ${jobType} Job Posted (${env})`,
          emoji: true
        }
      },
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Job ID: ', style: { bold: true } },
              { type: 'text', text: entity.id }]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Address: ', style: { bold: true } },
              { type: 'text', text: addressWithUnit }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Property Type: ', style: { bold: true } },
              { type: 'text', text: propertyType }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Timing: ', style: { bold: true } },
              { type: 'text', text: timing }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Bidding Closes: ', style: { bold: true } },
              { type: 'text', text: biddingClosesAt }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Build Slack message for haul.bid.created
 */
function buildBidCreatedSlackMessage(message) {
  const { notification_content, entity } = message;
  const env = formatEnvironment(process.env.ENV);

  // Extract enriched bid data from notification_content.data
  const data = notification_content.data || {};
  
  // Try formatted first, fall back to formatting raw value
  const quotedAmount = data.bid_amount_formatted 
    || (data.bid_amount_usd_cents || data.amount_usd_cents ? formatCurrency(data.bid_amount_usd_cents || data.amount_usd_cents) : 'Not specified');
  const companyName = data.company_name || 'Unknown company';
  const jobType = normalizeJobType(data.job_type);
  const address = data.location_formatted || formatAddress(data.service_address);
  const unit = data.unit ? `Unit ${data.unit}` : '';
  const addressWithUnit = unit ? `${address}, ${unit}` : address;

  // Use pre-formatted service window from orchestrator if available
  const serviceWindow = data.pickup_window_formatted || formatTimeWindow(
    data.proposed_pickup_window_start,
    data.proposed_pickup_window_end,
    data.service_location_timezone
  );

  // Format bidding closes at
  const biddingClosesAt = data.bidding_closes_at
    ? formatDateTime(data.bidding_closes_at, data.service_location_timezone)
    : 'Not specified';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `💰 New ${jobType} Bid Created (${env})`,
          emoji: true
        }
      },
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Bid ID: ', style: { bold: true } },
              { type: 'text', text: entity.id }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Quoted Amount: ', style: { bold: true } },
              { type: 'text', text: quotedAmount }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Company: ', style: { bold: true } },
              { type: 'text', text: companyName }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Address: ', style: { bold: true } },
              { type: 'text', text: addressWithUnit }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Service Window: ', style: { bold: true } },
              { type: 'text', text: serviceWindow }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Bidding Closes: ', style: { bold: true } },
              { type: 'text', text: biddingClosesAt }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Build Slack message for haul.booking.created
 */
function buildBookingCreatedSlackMessage(message) {
  const { notification_content, entity } = message;
  const env = formatEnvironment(process.env.ENV);

  // Extract enriched booking data from notification_content.data
  const data = notification_content.data || {};
  
  // Try formatted first, fall back to formatting raw value
  const bookedAmount = data.booking_amount_formatted 
    || (data.amount_usd_cents ? formatCurrency(data.amount_usd_cents) : 'Not specified');
  const companyName = data.company_name || 'Unknown company';
  const jobType = normalizeJobType(data.job_type);
  const address = data.location_formatted || formatAddress(data.service_address);
  const unit = data.unit ? `Unit ${data.unit}` : '';
  const addressWithUnit = unit ? `${address}, ${unit}` : address;

  // Use pre-formatted service window from orchestrator if available
  const serviceWindow = data.pickup_window_formatted || formatTimeWindow(
    data.pickup_window_start,
    data.pickup_window_end,
    data.service_location_timezone
  );

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `✅ ${jobType} Booking Created (${env})`,
          emoji: true
        }
      },
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Booking ID: ', style: { bold: true } },
              { type: 'text', text: entity.id }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Booked Amount: ', style: { bold: true } },
              { type: 'text', text: bookedAmount }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Company: ', style: { bold: true } },
              { type: 'text', text: companyName }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Address: ', style: { bold: true } },
              { type: 'text', text: addressWithUnit }
            ]
          },
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Service Window: ', style: { bold: true } },
              { type: 'text', text: serviceWindow }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Format address object to readable string
 */
function formatAddress(address) {
  if (!address) return 'Not specified';
  if (typeof address === 'string') return address;

  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zip) parts.push(address.zip);

  return parts.length > 0 ? parts.join(', ') : 'Not specified';
}

/**
 * Format cents to USD currency
 */
function formatCurrency(cents) {
  if (cents === null || cents === undefined) return 'Not specified';
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(dollars);
}

/**
 * Format timing preference for job posting
 */
function formatTimingPreference(preference, windowStart, windowEnd, timezone) {
  if (preference === 'FLEXIBLE' || !windowStart || !windowEnd) {
    return 'Flexible';
  }

  return formatTimeWindow(windowStart, windowEnd, timezone);
}

/**
 * Format time window (start - end)
 */
function formatTimeWindow(start, end, timezone) {
  if (!start || !end) return 'Not specified';

  const startDate = new Date(start);
  const endDate = new Date(end);

  const dateOptions = {
    month: 'short',
    day: 'numeric',
    ...(timezone && { timeZone: timezone })
  };

  const timeOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone && { timeZone: timezone })
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', dateOptions);
  const formatTime = (date) => date.toLocaleTimeString('en-US', timeOptions);

  // Same day
  if (startDate.toDateString() === endDate.toDateString()) {
    return `${formatDate(startDate)}, ${formatTime(startDate)} - ${formatTime(endDate)}`;
  }

  // Different days
  return `${formatDate(startDate)} ${formatTime(startDate)} - ${formatDate(endDate)} ${formatTime(endDate)}`;
}

/**
 * Format single datetime
 */
function formatDateTime(isoString, timezone) {
  if (!isoString) return 'Not specified';

  const date = new Date(isoString);
  const options = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone && { timeZone: timezone })
  };

  return date.toLocaleString('en-US', options);
}
