const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { validateNotificationEvent } = require('../../utils/schema');
const { getResolver } = require('./resolvers/registry');
const { isAdminEligibleEvent } = require('./admin-event-registry');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const sqsClient = new SQSClient({ region: process.env.REGION });

const NOTIFICATION_PREFERENCE_TABLE = process.env.NOTIFICATION_PREFERENCE_TABLE_NAME;
const NOTIFICATION_INBOX_TABLE = process.env.NOTIFICATION_INBOX_TABLE_NAME;
const JOB_TABLE = process.env.JOB_TABLE_NAME;
const BID_TABLE = process.env.BID_TABLE_NAME;
const COMPANY_TABLE = process.env.COMPANY_TABLE_NAME;
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL;
const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;
const PUSH_QUEUE_URL = process.env.PUSH_QUEUE_URL;
const SMS_QUEUE_URL = process.env.SMS_QUEUE_URL;
const ADMIN_QUEUE_URL = process.env.ADMIN_QUEUE_URL;

/**
 * Notifications Orchestrator Lambda
 * 
 * Responsibilities:
 * - Consume EventBridge events
 * - Validate the ingress payload
 * - Resolve recipients (explicit users or service-area providers)
 * - Load user notification preferences
 * - Determine eligible channels
 * - Always write a notification record to NotificationInbox
 * - Enqueue email messages to the EmailChannel SQS queue when email is enabled
 */
exports.handler = async (event) => {
  console.log('[Orchestrator] Received EventBridge event', JSON.stringify(event, null, 2));

  try {
    // Extract the detail payload
    const notificationEvent = event.detail;

    // Validate the canonical ingress schema
    const validation = validateNotificationEvent(notificationEvent);
    if (!validation.valid) {
      console.error('[Orchestrator] Schema validation failed', {
        errors: validation.errors,
        event_id: notificationEvent.event_id
      });
      throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('[Orchestrator] Event validated successfully', {
      event_id: notificationEvent.event_id,
      event_type: notificationEvent.event_type
    });

    // Resolve recipients using event-type-specific resolver
    const resolver = getResolver(notificationEvent.event_type);
    if (!resolver) {
      console.warn('[Orchestrator] No resolver found for event type', {
        event_type: notificationEvent.event_type,
        event_id: notificationEvent.event_id
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No resolver for event type', skipped: true })
      };
    }

    const recipients = await resolver.resolve(notificationEvent);
    console.log('[Orchestrator] Recipients resolved', {
      event_id: notificationEvent.event_id,
      count: recipients.length
    });

    // Check admin routing mode
    const isAdminOnly = notificationEvent.recipients?.admin_only === true;
    const isAdminEligible = isAdminEligibleEvent(notificationEvent.event_type);

    // Admin-only mode: skip user routing, send only to admin
    if (isAdminOnly) {
      console.log('[Orchestrator] Admin-only event, skipping user routing', {
        event_id: notificationEvent.event_id,
        event_type: notificationEvent.event_type
      });
      // Build enriched notification content for admin
      const notificationContent = await constructNotificationContent(notificationEvent);
      await enqueueToAdminChannel(notificationEvent, recipients, notificationContent);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Admin-only notification sent',
          event_id: notificationEvent.event_id
        })
      };
    }

    if (recipients.length === 0) {
      console.info('[Orchestrator] No recipients to notify (resolver returned empty list)');
      // Still send to admin if eligible, even with no user recipients
      if (isAdminEligible) {
        const notificationContent = await constructNotificationContent(notificationEvent);
        await enqueueToAdminChannel(notificationEvent, recipients, notificationContent);
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No recipients', skipped: true })
      };
    }

    // Process each recipient (standard user routing)
    for (const recipient of recipients) {
      await processRecipient(recipient, notificationEvent);
    }

    // Dual routing: also send to admin if event is eligible
    if (isAdminEligible) {
      console.log('[Orchestrator] Event is admin-eligible, routing to admin channel', {
        event_id: notificationEvent.event_id,
        event_type: notificationEvent.event_type
      });
      const notificationContent = await constructNotificationContent(notificationEvent);
      await enqueueToAdminChannel(notificationEvent, recipients, notificationContent);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notifications orchestrated successfully',
        event_id: notificationEvent.event_id,
        recipients_count: recipients.length
      })
    };
  } catch (error) {
    console.error('[Orchestrator] Error processing event', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Process a single recipient
 * - Load entity data and construct notification content
 * - Load notification preferences
 * - Write to NotificationInbox
 * - Enqueue to enabled channels
 */
async function processRecipient(recipient, event) {
  const userId = recipient.user_id;

  console.log('[Orchestrator] Processing recipient', {
    user_id: userId,
    event_type: event.event_type,
    event_id: event.event_id
  });

  // Construct notification content based on event type and entity data
  const notificationContent = await constructNotificationContent(event);

  // Load user notification preferences
  const preferences = await loadNotificationPreferences(userId);

  // Determine which channels are enabled for this event type
  const enabledChannels = determineEnabledChannels(event.event_type, preferences);

  console.log('[Orchestrator] Enabled channels for recipient', {
    user_id: userId,
    enabled_channels: enabledChannels
  });

  // Always write to NotificationInbox (regardless of channel preferences)
  // Returns the generated notification_id and timestamp
  const { notificationId, timestamp } = await writeToInbox(userId, event, enabledChannels, notificationContent);

  // Enqueue to each enabled channel
  for (const channel of enabledChannels) {
    await enqueueToChannel(channel, userId, event, notificationId, timestamp, recipient.metadata, notificationContent);
  }
}

/**
 * Load job data from DynamoDB
 */
async function loadJobData(jobId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: JOB_TABLE,
      Key: { id: jobId }
    }));

    if (!result.Item) {
      console.warn('[Orchestrator] Job not found', { job_id: jobId });
      return null;
    }

    return result.Item;
  } catch (error) {
    console.error('[Orchestrator] Error loading job data', {
      job_id: jobId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Construct notification content based on event type
 * Loads entity data and builds subject/body for user-facing notification
 */
async function constructNotificationContent(event) {
  const { event_type, entity } = event;

  switch (event_type) {
    case 'haul.job.posted':
      return await constructJobPostedNotification(entity.id);
    
    case 'haul.job.canceled':
      return await constructJobCanceledNotification(entity.id);
    
    case 'haul.job.closed':
      return await constructJobClosedNotification(entity.id);
    
    case 'haul.bid.created':
      return await constructBidCreatedNotification(entity.id);
    
    case 'haul.bid.updated':
      return await constructBidUpdatedNotification(entity.id);
    
    case 'haul.booking.created':
      return constructBookingCreatedNotification(event);
    
    case 'haul.booking.assigned':
      return constructBookingAssignedNotification(event);
    
    case 'haul.booking.in_progress_pickup':
      return constructBookingInProgressPickupNotification(event);
    
    case 'haul.booking.in_progress_dropoff':
      return constructBookingInProgressDropoffNotification(event);
    
    case 'haul.booking.rescheduled':
      return constructBookingRescheduledNotification(event);
    
    default:
      console.warn('[Orchestrator] No content constructor for event type', { event_type });
      return {
        subject: 'New notification',
        body: `You have a new ${event_type} notification.`,
        entity: {
          id: entity.id,
          type: entity.type
        }
      };
  }
}

/**
 * Construct notification content for haul.job.posted events
 */
async function constructJobPostedNotification(jobId) {
  const job = await loadJobData(jobId);

  if (!job) {
    // Fallback if job not found
    return {
      subject: 'New job available in your service area',
      body: 'A new job has been posted in your service area.',
      entity: {
        id: jobId,
        type: 'job'
      }
    };
  }

  // Extract job attributes
  const jobType = job.job_type || 'hauling';
  const timingPreference = job.timing_preference || 'Not specified';
  
  // Build human-readable address from PICKUP stop
  const pickupStop = getPickupStop(job);
  const pickupAddress = pickupStop
    ? formatStopAddress(pickupStop)
    : 'Location not specified';
  const pickupTimezone = pickupStop?.timezone || null;

  // Build subject line
  const subject = 'New job available in your service area';

  // Build notification body with available details
  const bodyParts = [
    `A new ${jobType} job has been posted near you.`,
    '',
    `Location: ${pickupAddress}`,
    `Timing: ${timingPreference}`
  ];

  // Add additional context if available
  if (job.description) {
    bodyParts.push('');
    bodyParts.push('Details:');
    bodyParts.push(job.description.substring(0, 200) + (job.description.length > 200 ? '...' : ''));
  }

  return {
    subject,
    body: bodyParts.join('\n'),
    entity: {
      id: jobId,
      type: 'job'
    },
    // Include raw data for deep linking or custom rendering
    data: {
      job_type: job.job_type,
      stops: job.stops,
      timing_preference: job.timing_preference,
      preferred_pickup_window_start: job.preferred_pickup_window_start,
      preferred_pickup_window_end: job.preferred_pickup_window_end,
      bidding_closes_at: job.bidding_closes_at,
      pickup_timezone: pickupTimezone
    }
  };
}

/**
 * Get the PICKUP stop from a job.
 * Returns the first stop with stop_type === 'PICKUP', or the first stop.
 *
 * @param {object} job - Job object with stops[]
 * @returns {object|null} PICKUP stop or null
 */
function getPickupStop(job) {
  if (!job?.stops || !Array.isArray(job.stops) || job.stops.length === 0) return null;
  return job.stops.find(s => s.stop_type === 'PICKUP') || job.stops[0];
}

/**
 * Get the DROPOFF stop from a job.
 *
 * @param {object} job - Job object with stops[]
 * @returns {object|null} DROPOFF stop or null
 */
function getDropoffStop(job) {
  if (!job?.stops || !Array.isArray(job.stops)) return null;
  return job.stops.find(s => s.stop_type === 'DROPOFF') || null;
}

/**
 * Get pickup timezone from a job's PICKUP stop.
 *
 * @param {object} job - Job object with stops[]
 * @returns {string|null} Timezone string or null
 */
function getPickupTimezone(job) {
  const pickup = getPickupStop(job);
  return pickup?.timezone || null;
}

/**
 * Format a stop object into a human-readable address string.
 * If !display_name, renders line_1 as display_name.
 * Includes display_name (e.g., business name) if present and differs from line_1.
 *
 * @param {object} stop - Stop object with address fields
 * @returns {string} Formatted address string
 */
function formatStopAddress(stop) {
  if (!stop) return 'Location not specified';
  if (typeof stop === 'string') return stop;

  const parts = [];

  // Determine display_name: use stop.display_name, or fallback to line_1
  const displayName = stop.display_name || stop.line_1;

  // Show display_name if it exists and differs from line_1
  if (displayName && displayName !== stop.line_1) {
    parts.push(displayName);
  }

  if (stop.line_1) {
    parts.push(stop.line_1);
    if (stop.line_2) parts.push(stop.line_2);
  }

  if (stop.city) parts.push(stop.city);
  if (stop.state) parts.push(stop.state);
  if (stop.postal_code) parts.push(stop.postal_code);

  return parts.length > 0 ? parts.join(', ') : 'Location not specified';
}

/**
 * Load bid data from DynamoDB
 */
async function loadBidData(bidId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: BID_TABLE,
      Key: { id: bidId }
    }));

    if (!result.Item) {
      console.warn('[Orchestrator] Bid not found', { bid_id: bidId });
      return null;
    }

    return result.Item;
  } catch (error) {
    console.error('[Orchestrator] Error loading bid data', {
      bid_id: bidId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Load company data from DynamoDB
 */
async function loadCompanyData(companyId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: COMPANY_TABLE,
      Key: { id: companyId }
    }));

    if (!result.Item) {
      console.warn('[Orchestrator] Company not found', { company_id: companyId });
      return null;
    }

    return result.Item;
  } catch (error) {
    console.error('[Orchestrator] Error loading company data', {
      company_id: companyId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Format cents to USD dollars
 */
function formatCentsToUSD(cents) {
  if (cents === null || cents === undefined) return 'Price not specified';
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(dollars);
}

/**
 * Format job type for consumer-friendly display
 */
function formatJobTypeForConsumer(jobType) {
  const map = {
    'JUNK_REMOVAL': 'junk hauling',
    'MOVING': 'small move'
  };
  return map[jobType] || jobType?.toLowerCase().replace(/_/g, ' ') || 'hauling';
}

/**
 * Format pickup window for display
 * @param {string} start - ISO timestamp for window start
 * @param {string} end - ISO timestamp for window end
 * @param {string} [timezone] - IANA timezone identifier (e.g., 'America/Los_Angeles')
 */
function formatPickupWindow(start, end, timezone) {
  if (!start || !end) return 'Flexible';
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const dateOptions = { 
    weekday: 'short',
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
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', dateOptions);
  };
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', timeOptions);
  };
  
  // Get timezone abbreviation for display
  const tzAbbrev = timezone 
    ? new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
        .formatToParts(startDate)
        .find(p => p.type === 'timeZoneName')?.value || ''
    : '';
  const tzSuffix = tzAbbrev ? ` ${tzAbbrev}` : '';
  
  // If same day, show date once
  if (startDate.toDateString() === endDate.toDateString()) {
    return `${formatDate(startDate)}, ${formatTime(startDate)} - ${formatTime(endDate)}${tzSuffix}`;
  }
  
  return `${formatDate(startDate)} ${formatTime(startDate)} - ${formatDate(endDate)} ${formatTime(endDate)}${tzSuffix}`;
}

/**
 * Construct notification content for haul.bid.created events
 * Consumer-facing notification for new bid received
 */
async function constructBidCreatedNotification(bidId) {
  // Load bid data
  const bid = await loadBidData(bidId);
  
  if (!bid) {
    return {
      subject: 'You received a new bid',
      body: 'A new bid has been submitted on your job.',
      entity: { id: bidId, type: 'bid' }
    };
  }

  // Load job data
  const job = await loadJobData(bid.job_id);
  
  // Load company data
  const company = bid.company_id ? await loadCompanyData(bid.company_id) : null;

  // Get job timezone from PICKUP stop
  const jobTimezone = getPickupTimezone(job);
  const pickupStop = getPickupStop(job);

  // Format bid details
  const bidAmount = formatCentsToUSD(bid.amount_cents);
  const companyName = company?.name || 'A service provider';
  const jobType = formatJobTypeForConsumer(bid.job_type);
  const pickupWindow = formatPickupWindow(
    bid.proposed_pickup_window_start,
    bid.proposed_pickup_window_end,
    jobTimezone
  );
  
  // Build address from PICKUP stop
  const locationText = pickupStop
    ? formatStopAddress(pickupStop)
    : 'Your job location';

  // Build subject line
  const subject = 'You received a new bid on your job';

  // Build body
  const bodyParts = [
    `${companyName} has submitted a bid on your ${jobType} job.`,
    '',
    `Bid amount: ${bidAmount}`,
    `Location: ${locationText}`,
    `Proposed service window: ${pickupWindow}`
  ];

  if (bid.notes) {
    bodyParts.push('');
    bodyParts.push('Provider notes:');
    bodyParts.push(bid.notes);
  }

  bodyParts.push('');
  bodyParts.push('Review this bid in the Haul app to accept and book.');

  // Build company logo URL if available
  const companyLogoUrl = company?.logo_key 
    ? `${MEDIA_BASE_URL}/${company.logo_key}` 
    : null;
  const companyIconUrl = company?.icon_key 
    ? `${MEDIA_BASE_URL}/${company.icon_key}` 
    : null;

  return {
    subject,
    body: bodyParts.join('\n'),
    entity: {
      id: bidId,
      type: 'bid'
    },
    data: {
      bid_id: bidId,
      bid_amount_cents: bid.amount_cents,
      bid_amount_formatted: bidAmount,
      job_id: bid.job_id,
      job_type: bid.job_type,
      job_type_formatted: jobType,
      company_id: bid.company_id,
      company_name: companyName,
      company_logo_url: companyLogoUrl,
      company_icon_url: companyIconUrl,
      stops: job?.stops,
      location_formatted: locationText,
      proposed_pickup_window_start: bid.proposed_pickup_window_start,
      proposed_pickup_window_end: bid.proposed_pickup_window_end,
      pickup_window_formatted: pickupWindow,
      bidding_closes_at: job?.bidding_closes_at,
      pickup_timezone: jobTimezone,
      notes: bid.notes
    }
  };
}

/**
 * Construct notification content for haul.bid.updated events
 * Consumer-facing notification for bid update
 */
async function constructBidUpdatedNotification(bidId) {
  // Load bid data
  const bid = await loadBidData(bidId);
  
  if (!bid) {
    return {
      subject: 'A bid on your job was updated',
      body: 'A bid on your job has been updated.',
      entity: { id: bidId, type: 'bid' }
    };
  }

  // Load job data
  const job = await loadJobData(bid.job_id);
  
  // Load company data
  const company = bid.company_id ? await loadCompanyData(bid.company_id) : null;

  // Get job timezone from PICKUP stop
  const jobTimezone = getPickupTimezone(job);
  const pickupStop = getPickupStop(job);

  // Format bid details
  const bidAmount = formatCentsToUSD(bid.amount_cents);
  const companyName = company?.name || 'A service provider';
  const jobType = formatJobTypeForConsumer(bid.job_type);
  const pickupWindow = formatPickupWindow(
    bid.proposed_pickup_window_start,
    bid.proposed_pickup_window_end,
    jobTimezone
  );
  
  // Build address from PICKUP stop
  const locationText = pickupStop
    ? formatStopAddress(pickupStop)
    : 'Your job location';

  // Build subject line
  const subject = 'A bid on your job was updated';

  // Build body
  const bodyParts = [
    `${companyName} has updated their bid on your ${jobType} job.`,
    '',
    `Updated bid amount: ${bidAmount}`,
    `Location: ${locationText}`,
    `Proposed service window: ${pickupWindow}`
  ];

  if (bid.notes) {
    bodyParts.push('');
    bodyParts.push('Provider notes:');
    bodyParts.push(bid.notes);
  }

  bodyParts.push('');
  bodyParts.push('Review the updated bid in the Haul app.');

  // Build company logo URL if available
  const companyLogoUrl = company?.logo_key 
    ? `${MEDIA_BASE_URL}/${company.logo_key}` 
    : null;
  const companyIconUrl = company?.icon_key 
    ? `${MEDIA_BASE_URL}/${company.icon_key}` 
    : null;

  return {
    subject,
    body: bodyParts.join('\n'),
    entity: {
      id: bidId,
      type: 'bid'
    },
    data: {
      bid_id: bidId,
      bid_amount_cents: bid.amount_cents,
      bid_amount_formatted: bidAmount,
      job_id: bid.job_id,
      job_type: bid.job_type,
      job_type_formatted: jobType,
      company_id: bid.company_id,
      company_name: companyName,
      company_logo_url: companyLogoUrl,
      company_icon_url: companyIconUrl,
      stops: job?.stops,
      location_formatted: locationText,
      proposed_pickup_window_start: bid.proposed_pickup_window_start,
      proposed_pickup_window_end: bid.proposed_pickup_window_end,
      pickup_window_formatted: pickupWindow,
      bidding_closes_at: job?.bidding_closes_at,
      pickup_timezone: jobTimezone,
      notes: bid.notes
    }
  };
}

/**
 * Construct notification content for haul.job.canceled events
 * Recipients: Service providers with open bids
 */
async function constructJobCanceledNotification(jobId) {
  const job = await loadJobData(jobId);

  if (!job) {
    return {
      subject: 'A job you bid on was canceled',
      body: 'A job you submitted a bid on has been canceled by the customer.',
      entity: { id: jobId, type: 'job' }
    };
  }

  // Format job details
  const jobType = formatJobTypeForServiceProvider(job.job_type);
  const pickupStop = getPickupStop(job);
  const pickupAddress = pickupStop
    ? formatStopAddress(pickupStop)
    : 'Location not specified';

  const subject = 'A job you bid on was canceled';

  const bodyParts = [
    `The ${jobType} job you submitted a bid on has been canceled by the customer.`,
    '',
    `Location: ${pickupAddress}`
  ];

  if (job.description) {
    bodyParts.push('');
    bodyParts.push(`Job details: ${job.description.substring(0, 100)}${job.description.length > 100 ? '...' : ''}`);
  }

  bodyParts.push('');
  bodyParts.push('No further action is required. Your bid has been automatically withdrawn.');

  return {
    subject,
    body: bodyParts.join('\n'),
    entity: {
      id: jobId,
      type: 'job'
    },
    data: {
      job_id: jobId,
      job_type: job.job_type,
      job_type_formatted: jobType,
      stops: job.stops,
      location_formatted: pickupAddress,
      description: job.description
    }
  };
}

/**
 * Format job type for service provider display
 */
function formatJobTypeForServiceProvider(jobType) {
  const map = {
    'JUNK_REMOVAL': 'junk removal',
    'MOVING': 'small move'
  };
  return map[jobType] || jobType?.toLowerCase().replace(/_/g, ' ') || 'hauling';
}

/**
 * Construct notification content for haul.job.closed events
 * Recipients: Consumer who posted the job
 * 
 * Scenarios:
 * A: Bidding closed, one or more OPEN bids exist
 * B: Bidding closed, no bids exist
 */
async function constructJobClosedNotification(jobId) {
  const job = await loadJobData(jobId);

  if (!job) {
    return {
      subject: 'Bidding has closed on your job',
      body: 'The bidding period for your job has ended.',
      entity: { id: jobId, type: 'job' }
    };
  }

  const jobType = formatJobTypeForConsumer(job.job_type);
  const pickupStop = getPickupStop(job);
  const pickupAddress = pickupStop
    ? formatStopAddress(pickupStop)
    : 'Your job location';

  // Instant book: acceptance window elapsed with no provider accepting the price
  if (job.instant_book === true) {
    return {
      subject: 'Your instant book price was not accepted',
      body: [
        `Your instant book price for your ${jobType} job was not accepted by any service providers within the 48-hour window.`,
        '',
        `Location: ${pickupAddress}`,
        '',
        'You can repost the job to receive competitive bids, or try a different instant book price.'
      ].join('\n'),
      entity: { id: jobId, type: 'job' },
      data: {
        job_id: jobId,
        job_type: job.job_type,
        job_type_formatted: jobType,
        stops: job.stops,
        location_formatted: pickupAddress,
        scenario: 'INSTANT_BOOK_EXPIRED'
      }
    };
  }

  // Standard bids flow — Query open bids for this job
  const openBids = await queryOpenBidsForJob(jobId);
  const bidCount = openBids.length;

  console.log('[Orchestrator] Job closed scenario', {
    job_id: jobId,
    bid_count: bidCount,
    scenario: bidCount > 0 ? 'A' : 'B',
  });

  if (bidCount > 0) {
    const quoteText = bidCount === 1 ? '1 quote' : `${bidCount} quotes`;
    return {
      subject: `You have ${quoteText} to review`,
      body: [
        `The bidding period for your ${jobType} job has ended.`,
        '',
        `You received ${quoteText}. Review and select a quote to book your service.`,
        '',
        `Location: ${pickupAddress}`
      ].join('\n'),
      entity: { id: jobId, type: 'job' },
      data: {
        job_id: jobId,
        job_type: job.job_type,
        job_type_formatted: jobType,
        stops: job.stops,
        location_formatted: pickupAddress,
        bid_count: bidCount,
        scenario: 'A'
      }
    };
  } else {
    return {
      subject: 'Your job did not receive any quotes',
      body: [
        `Unfortunately, no service providers submitted quotes for your ${jobType} job.`,
        '',
        `Location: ${pickupAddress}`,
        '',
        'This can happen when providers in your area are at capacity. You can repost your job to try again.'
      ].join('\n'),
      entity: { id: jobId, type: 'job' },
      data: {
        job_id: jobId,
        job_type: job.job_type,
        job_type_formatted: jobType,
        stops: job.stops,
        location_formatted: pickupAddress,
        bid_count: 0,
        scenario: 'B'
      }
    };
  }
}

/**
 * Query open bids for a job using GSI jobId-status-index
 */
async function queryOpenBidsForJob(jobId) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: BID_TABLE,
      IndexName: 'jobId-status-index',
      KeyConditionExpression: 'job_id = :jobId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':jobId': jobId,
        ':status': 'OPEN'
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('[Orchestrator] Error querying open bids', {
      job_id: jobId,
      error: error.message
    });
    return [];
  }
}

/**
 * Construct notification content for haul.booking.created events
 * Recipients: Service provider OWNER/ADMIN/DISPATCHER users
 * 
 * This event already contains all necessary data in event.context from the jobs service.
 * We pass it through as the data field for email templates.
 */
function constructBookingCreatedNotification(event) {
  const bookingNumber = event.context?.booking_number || 'N/A';
  
  console.log('[constructBookingCreatedNotification] event.context:', JSON.stringify(event.context, null, 2));
  console.log('[constructBookingCreatedNotification] job_type in context:', event.context?.job_type);
  
  return {
    subject: `Job won – Booking ${bookingNumber} created`,
    body: `Your bid has been accepted and booking ${bookingNumber} has been created.`,
    entity: {
      id: event.entity.id,
      type: 'booking'
    },
    data: event.context || {}
  };
}

/**
 * Construct notification content for haul.booking.assigned events
 * Recipients: Customer AND driver
 * 
 * This event already contains all necessary data in event.context.
 */
function constructBookingAssignedNotification(event) {
  const bookingNumber = event.context?.booking_number || 'N/A';
  
  console.log('[constructBookingAssignedNotification] event.context:', JSON.stringify(event.context, null, 2));
  console.log('[constructBookingAssignedNotification] booking_number:', event.context?.booking_number);
  console.log('[constructBookingAssignedNotification] driver_given_name:', event.context?.driver_given_name);
  
  return {
    subject: `Crew assigned to booking ${bookingNumber}`,
    body: `A crew has been assigned to your booking.`,
    entity: {
      id: event.entity.id,
      type: 'booking'
    },
    data: event.context || {}
  };
}

/**
 * Construct notification content for haul.booking.in_progress_pickup events
 * Recipients: Customer
 * 
 * This event already contains all necessary data in event.context.
 */
function constructBookingInProgressPickupNotification(event) {
  const bookingNumber = event.context?.booking_number || 'N/A';
  
  return {
    subject: `Your service has started – Booking ${bookingNumber}`,
    body: `Your service provider has started pickup for your booking.`,
    entity: {
      id: event.entity.id,
      type: 'booking'
    },
    data: event.context || {}
  };
}

/**
 * Construct notification content for haul.booking.in_progress_dropoff events
 * Recipients: Customer
 * 
 * This event already contains all necessary data in event.context.
 */
function constructBookingInProgressDropoffNotification(event) {
  const bookingNumber = event.context?.booking_number || 'N/A';
  
  return {
    subject: `Dropoff in progress – Booking ${bookingNumber}`,
    body: `Your service provider is en route to the dropoff location.`,
    entity: {
      id: event.entity.id,
      type: 'booking'
    },
    data: event.context || {}
  };
}

/**
 * Construct notification content for haul.booking.rescheduled events
 * Recipients: Customer only
 * 
 * This event already contains all necessary data in event.context.
 */
function constructBookingRescheduledNotification(event) {
  const bookingNumber = event.context?.booking_number || 'N/A';
  
  return {
    subject: `Booking ${bookingNumber} has been rescheduled`,
    body: `Your service provider has updated the pickup time for your booking.`,
    entity: {
      id: event.entity.id,
      type: 'booking'
    },
    data: event.context || {}
  };
}

/**
 * Load notification preferences for a user
 * Returns default preferences if none exist
 */
async function loadNotificationPreferences(userId) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: NOTIFICATION_PREFERENCE_TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`
      }
    }));

    if (result.Items && result.Items.length > 0) {
      console.log('[Orchestrator] Loaded preferences for user', {
        user_id: userId,
        preferences: result.Items[0]
      });
      return result.Items[0];
    }

    console.log('[Orchestrator] No preferences found, using defaults', { user_id: userId });

    // Return default preferences
    return {
      user_id: userId,
      channels: {
        email: true,
        push: false,
        sms: false
      }
    };
  } catch (error) {
    console.error('[Orchestrator] Error loading preferences', {
      user_id: userId,
      error: error.message
    });

    // Return default preferences on error
    return {
      user_id: userId,
      channels: {
        email: true,
        push: false,
        sms: false
      }
    };
  }
}

/**
 * Determine which channels are enabled for a given event type and user preferences
 */
function determineEnabledChannels(eventType, preferences) {
  const channels = [];

  // Email: enabled by default unless explicitly disabled
  if (preferences.channels?.email !== false) {
    channels.push('email');
  }

  // Push: must be explicitly enabled (Phase 2)
  if (preferences.channels?.push === true) {
    channels.push('push');
  }

  // SMS: must be explicitly enabled (Phase 3)
  if (preferences.channels?.sms === true) {
    channels.push('sms');
  }

  return channels;
}

/**
 * Write notification record to NotificationInbox
 * notification_id is generated by this service and is the primary identifier
 * event_id is a foreign reference to the originating domain event
 */
async function writeToInbox(userId, event, channels, notificationContent) {
  const timestamp = new Date().toISOString();
  const notificationId = `${Date.now()}#${Math.random().toString(36).substring(7)}`;

  const item = {
    pk: `USER#${userId}`,
    sk: `NOTIF#${timestamp}#${notificationId}`,
    user_id: userId,
    notification_id: notificationId,
    event_id: event.event_id,
    event_type: event.event_type,
    entity_type: event.entity.type,
    entity_id: event.entity.id,
    occurred_at: event.occurred_at,
    created_at: timestamp,
    subject: notificationContent.subject,
    body: notificationContent.body,
    data: notificationContent.data || {},
    channels: channels,
    delivery_status: {
      email: channels.includes('email') ? 'pending' : 'not_applicable',
      push: channels.includes('push') ? 'pending' : 'not_applicable',
      sms: channels.includes('sms') ? 'pending' : 'not_applicable'
    },
    read: false,
    context: event.context || {},
    gsi1pk: `USER#${userId}`,
    gsi1sk: `UNREAD#${timestamp}`
  };

  try {
    await docClient.send(new PutCommand({
      TableName: NOTIFICATION_INBOX_TABLE,
      Item: item
    }));

    console.log('[Orchestrator] Wrote to inbox', {
      user_id: userId,
      notification_id: notificationId,
      event_type: event.event_type
    });

    return { notificationId, timestamp };
  } catch (error) {
    console.error('[Orchestrator] Error writing to inbox', {
      user_id: userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Enqueue message to a specific channel queue
 * notification_id is included so channels can update delivery status correctly
 * Includes constructed notification content (subject, body) for delivery
 */
async function enqueueToChannel(channel, userId, event, notificationId, timestamp, metadata, notificationContent) {
  const queueUrls = {
    email: EMAIL_QUEUE_URL,
    push: PUSH_QUEUE_URL,
    sms: SMS_QUEUE_URL
  };

  const queueUrl = queueUrls[channel];
  if (!queueUrl) {
    console.warn('[Orchestrator] No queue URL for channel', { channel });
    return;
  }

  const message = {
    user_id: userId,
    notification_id: notificationId,
    notification_timestamp: timestamp,
    event_id: event.event_id,
    event_type: event.event_type,
    entity_type: event.entity.type,
    entity_id: event.entity.id,
    occurred_at: event.occurred_at,
    subject: notificationContent.subject,
    body: notificationContent.body,
    data: notificationContent.data || {},
    context: event.context || {},
    metadata: metadata || {}
  };

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message)
    }));

    console.log('[Orchestrator] Enqueued to channel', {
      channel,
      user_id: userId,
      notification_id: notificationId,
      event_type: event.event_type
    });
  } catch (error) {
    console.error('[Orchestrator] Error enqueuing to channel', {
      channel,
      user_id: userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Enqueue event to admin channel
 * Admin channel receives the full event, resolved recipient data, and enriched notification content
 * Does NOT check notification preferences
 */
async function enqueueToAdminChannel(event, resolvedRecipients, notificationContent) {
  if (!ADMIN_QUEUE_URL) {
    console.warn('[Orchestrator] ADMIN_QUEUE_URL not configured, skipping admin channel');
    return;
  }

  const message = {
    event_id: event.event_id,
    event_type: event.event_type,
    occurred_at: event.occurred_at,
    actor: event.actor,
    entity: event.entity,
    context: event.context || {},
    recipients: event.recipients,
    // Include resolved recipient data (enriched by resolver)
    resolved_recipients: resolvedRecipients.map(r => ({
      user_id: r.user_id,
      metadata: r.metadata || {}
    })),
    recipient_count: resolvedRecipients.length,
    // Include enriched notification content (same data sent to email/push/sms)
    notification_content: {
      subject: notificationContent.subject,
      body: notificationContent.body,
      data: notificationContent.data || {},
      entity: notificationContent.entity || {}
    }
  };

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: ADMIN_QUEUE_URL,
      MessageBody: JSON.stringify(message)
    }));

    console.log('[Orchestrator] Enqueued to admin channel', {
      event_id: event.event_id,
      event_type: event.event_type,
      recipient_count: resolvedRecipients.length
    });
  } catch (error) {
    console.error('[Orchestrator] Error enqueuing to admin channel', {
      event_id: event.event_id,
      error: error.message
    });
    throw error;
  }
}

