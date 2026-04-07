/**
 * Email template builders for Haul notifications
 * 
 * Design principles (per brand-guidelines.md):
 * - Calm, competent, quietly confident
 * - Short sentences, active voice
 * - No exclamation points or emojis in core flows
 * - Color is functional, not expressive
 * - Practical and respectful of users' time
 */

const BASE_URL = process.env.BASE_URL;
const DISPATCHER_BASE_URL = process.env.DISPATCHER_BASE_URL;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

/**
 * Build HTML email template for service providers
 * Uses Black Haul Logo for light theme
 */
function buildServiceProviderTemplate({ subject, preheader, bodyContent, footerNote }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(subject)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      color: #171717;
      line-height: 1.5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .content {
      padding-left: 24px;
      padding-right: 24px;
      padding-top: 20px;
    }
    .preheader {
      display: none;
      max-height: 0;
      overflow: hidden;
      font-size: 1px;
      line-height: 1px;
      color: #ffffff;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 500;
      color: #171717;
      line-height: 1.3;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 15px;
      color: #171717;
    }
    .detail-row {
      margin: 8px 0;
      font-size: 14px;
    }
    .detail-label {
      display: inline-block;
      min-width: 120px;
      color: #6b7280;
      font-weight: 400;
    }
    .detail-value {
      color: #171717;
      font-weight: 400;
    }
    .cta {
      margin: 24px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #171717;
      color: #f9fafb !important;
      text-decoration: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 500;
    }
    a.cta-button {
      color: #f9fafb !important;
    }
    .footer {
      padding: 24px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #6b7280;
      line-height: 1.6;
      text-align: center;
    }
    .footer-logo {
      width: 100px;
      height: 34px;
      margin: 0 auto 20px;
      display: block;
    }
    .footer p {
      font-size: 11px;
      color: gray
    }
    .footer a {
      color: #171717;
      text-decoration: none;
    }
    .footer-divider {
      margin: 12px 0;
      height: 1px;
      background-color: #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="preheader">${escapeHtml(preheader)}</div>
  <div class="email-container">
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <img src="https://cdn.haulwerk.com/images/haul_wordmark_icon_black.svg" alt="Haul" class="footer-logo">
      <p style="margin: 0 0 8px 0;">${footerNote || 'You received this because you have a service area that matches this job location.'} 
        Please visit the Haul Dispatcher Portal to update your <a href="${DISPATCHER_BASE_URL}/dashboard/profile/notifications">notification preferences</a>. 
        If you believe you received this email in error, contact us at <a href="mailto:${SUPPORT_EMAIL}">support@haulwerk.com</a>.
      </p>
      <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} Haulwerk, LLC</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Build HTML email template for consumers
 * Uses Charcoal Blue Haul Logo for light theme
 */
function buildConsumerTemplate({ subject, preheader, bodyContent, footerNote }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(subject)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      color: #3a4a63;
      line-height: 1.5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .content {
      padding-left: 24px;
      padding-right: 24px;
      padding-top: 20px;
    }
    .preheader {
      display: none;
      max-height: 0;
      overflow: hidden;
      font-size: 1px;
      line-height: 1px;
      color: #ffffff;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 500;
      color: #3a4a63;
      line-height: 1.3;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 15px;
      color: #3a4a63;
    }
    .detail-row {
      margin: 8px 0;
      font-size: 14px;
    }
    .detail-label {
      display: inline-block;
      min-width: 120px;
      color: #6b7280;
      font-weight: 400;
    }
    .detail-value {
      color: #3a4a63;
      font-weight: 400;
    }
    .cta {
      margin: 24px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3a4a63;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 500;
    }
    .footer {
      padding: 24px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #6b7280;
      line-height: 1.6;
      text-align: center;
    }
    .footer-logo {
      width: 100px;
      height: 34px;
      margin: 0 auto 20px;
      display: block;
    }
    .footer p {
      font-size: 11px;
      color: gray
    }
    .footer a {
      color: #3a4a63;
      text-decoration: none;
    }
    .footer-divider {
      margin: 12px 0;
      height: 1px;
      background-color: #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="preheader">${escapeHtml(preheader)}</div>
  <div class="email-container">
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <img src="https://cdn.haulwerk.com/images/haul_wordmark_icon_blue_char.svg" alt="Haul" class="footer-logo">
      ${footerNote ? `<p style="margin: 0 0 12px 0;">${footerNote}</p>` : ''}
      <p style="margin: 0 0 8px 0;">You received this because you have subscribed to transactional notifications from Haul.
        Please visit the Haul app or website to update your <a href="${BASE_URL}/user/preferences">notification preferences</a>· 
        If you believe you received this email in error, contact us at <a href="mailto:${SUPPORT_EMAIL}">support@haulwerk.com</a>.
      </p>
      <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} Haulwerk, LLC</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Normalize job type for display
 */
function normalizeJobType(jobType) {
  const map = {
    'JUNK_REMOVAL': 'junk removal',
    'MOVING': 'moving'
  };
  return map[jobType] || jobType?.toLowerCase().replace(/_/g, ' ') || 'hauling';
}

/**
 * Format timing preference for display
 */
function formatTimingPreference(timingPreference, preferredPickupWindowStart, preferredPickupWindowEnd, timezone) {
  if (timingPreference === 'FLEXIBLE') {
    return 'Flexible';
  }
  
  if (timingPreference === 'SCHEDULED' && preferredPickupWindowStart && preferredPickupWindowEnd) {
    const startDate = new Date(preferredPickupWindowStart);
    const endDate = new Date(preferredPickupWindowEnd);
    
    const dateOptions = { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    
    const timeOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    
    if (timezone) {
      dateOptions.timeZone = timezone;
      timeOptions.timeZone = timezone;
    }
    
    const startDateStr = startDate.toLocaleDateString('en-US', dateOptions);
    const endDateStr = endDate.toLocaleDateString('en-US', dateOptions);
    const startTimeStr = startDate.toLocaleTimeString('en-US', timeOptions);
    const endTimeStr = endDate.toLocaleTimeString('en-US', timeOptions);
    
    // If same day, show date once
    if (startDateStr === endDateStr) {
      return `${startDateStr}, ${startTimeStr} - ${endTimeStr}`;
    }
    
    return `${startDateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr}`;
  }
  
  return timingPreference?.charAt(0).toUpperCase() + timingPreference?.slice(1).toLowerCase() || 'Not specified';
}

/**
 * Format bidding deadline for display
 */
function formatBiddingDeadline(biddingClosesAt, timezone) {
  if (!biddingClosesAt) return 'the deadline';
  
  const date = new Date(biddingClosesAt);
  
  // Format options with optional timezone
  const options = { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  if (timezone) {
    options.timeZone = timezone;
    options.timeZoneName = 'short';
  }
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get the PICKUP stop from a stops array.
 * Returns the first stop with stop_type === 'PICKUP', or the first stop.
 */
function getPickupStop(stops) {
  if (!stops || !Array.isArray(stops) || stops.length === 0) return null;
  return stops.find(s => s.stop_type === 'PICKUP') || stops[0];
}

/**
 * Get the DROPOFF stop from a stops array.
 */
function getDropoffStop(stops) {
  if (!stops || !Array.isArray(stops)) return null;
  return stops.find(s => s.stop_type === 'DROPOFF') || null;
}

/**
 * Format a stop object into a display string.
 * If !display_name, renders line_1 as display_name.
 * Includes display_name (e.g., business name) if present and differs from line_1.
 */
function formatAddress(stop) {
  if (typeof stop === 'string') return stop;
  if (!stop) return 'Location not specified';
  
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
 * Build job posted email for service providers
 */
function buildJobPostedEmail(jobData) {
  const jobType = normalizeJobType(jobData.job_type);
  const timing = formatTimingPreference(
    jobData.timing_preference,
    jobData.preferred_pickup_window_start,
    jobData.preferred_pickup_window_end
  );
  const pickupStop = getPickupStop(jobData.stops);
  const location = formatAddress(pickupStop);
  const timezone = pickupStop?.timezone || jobData.pickup_timezone;
  const biddingClosesAt = jobData.bidding_closes_at ? formatBiddingDeadline(jobData.bidding_closes_at, timezone) : null;
  
  const subject = `New ${jobType} job available`;
  const preheader = `A new ${jobType} job is available in your service area.`;
  
  const bodyContent = `
    <h1>New job posted – review, bid, or book now!</h1>
    <p>A ${jobType} job is ready for booking in your service area.</p>
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timing</span>
        <span class="detail-value">${escapeHtml(timing)}</span>
      </div>
    </div>
    
    ${jobData.description ? `<p>${escapeHtml(jobData.description.substring(0, 200))}${jobData.description.length > 200 ? '...' : ''}</p>` : ''}
    
    ${biddingClosesAt ? `<p>This job is open for quotes until ${escapeHtml(biddingClosesAt)}.</p>` : ''}
    
    <div class="cta">
      <a href="${DISPATCHER_BASE_URL}/dashboard/jobs" class="cta-button">Place your bid</a>
    </div>
  `;
  
  // Plain text version
  const textParts = [
    'New job posted – review, bid, or book now!',
    '',
    `A ${jobType} job is ready for booking in your service area.`,
    '',
    `Location: ${location}`,
    `Timing: ${timing}`
  ];
  
  if (jobData.description) {
    textParts.push('');
    textParts.push(jobData.description.substring(0, 200) + (jobData.description.length > 200 ? '...' : ''));
  }

  if (biddingClosesAt) {
    textParts.push('');
    textParts.push(`This job is open for bids until ${biddingClosesAt}.`);
  }

  textParts.push('');
  textParts.push(`Place your bid: ${DISPATCHER_BASE_URL}/dashboard/jobs`);
  textParts.push('');
  textParts.push('---');
  textParts.push('You received this because you have a service area that matches this job location.');
  textParts.push(`Update preferences: ${DISPATCHER_BASE_URL}/dashboard/profile/notifications`);
  textParts.push(`Contact support: ${SUPPORT_EMAIL}`);
  
  return {
    subject,
    html: buildServiceProviderTemplate({
      subject,
      preheader,
      bodyContent
    }),
    text: textParts.join('\n')
  };
}

/**
 * Build bid created email for consumers
 */
/**
 * Build job closed email for consumers
 * 
 * Scenario A: Quotes received - prompt to select
 * Scenario B: No quotes - apologetic, suggest reposting
 */
function buildJobClosedEmail(data) {
  const jobType = data.job_type_formatted || 'hauling';
  const location = data.location_formatted || 'Your job location';
  const bidCount = data.bid_count || 0;
  const jobId = data.job_id;
  const scenario = data.scenario || (bidCount > 0 ? 'A' : 'B');

  if (scenario === 'INSTANT_BOOK_EXPIRED') {
    return buildInstantBookExpiredEmail({ jobType, location, jobId });
  }
  if (scenario === 'A') {
    return buildJobClosedWithQuotesEmail({ jobType, location, bidCount, jobId });
  } else {
    return buildJobClosedNoQuotesEmail({ jobType, location, jobId });
  }
}

/**
 * Scenario A: Job closed with quotes received
 */
function buildJobClosedWithQuotesEmail({ jobType, location, bidCount, jobId }) {
  const quoteText = bidCount === 1 ? '1 quote' : `${bidCount} quotes`;
  
  const subject = `You have ${quoteText} to review`;
  const preheader = 'Select a quote to book your service';
  
  const bodyContent = `
    <h1>Review your quotes</h1>
    <p>The quoting period for your ${escapeHtml(jobType)} job has ended.</p>
    
    <p style="margin: 24px 0; font-size: 16px; font-weight: 500;">You received ${escapeHtml(quoteText)}.</p>
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
    </div>
    
    <p>Review your quotes and select one to book your service.</p>
    
    <div class="cta">
      <a href="${BASE_URL}/jobs/${jobId}" class="cta-button" style="color:#ffffff !important;text-decoration:none;">Review quotes</a>
    </div>
  `;
  
  // Plain text version
  const textParts = [
    'Review your quotes',
    '',
    `The quoting period for your ${jobType} job has ended.`,
    '',
    `You received ${quoteText}.`,
    '',
    `Location: ${location}`,
    '',
    'Review your quotes and select one to book your service.',
    '',
    `Review quotes: ${BASE_URL}/jobs/${jobId}`,
    '',
    '---',
    'You received this because you posted a job on Haul.',
    `Update preferences: ${BASE_URL}/user/preferences`,
    `Contact support: ${SUPPORT_EMAIL}`
  ];
  
  return {
    subject,
    html: buildConsumerTemplate({
      subject,
      preheader,
      bodyContent
    }),
    text: textParts.join('\n')
  };
}

/**
 * Scenario B: Job closed with no quotes received
 */
function buildJobClosedNoQuotesEmail({ jobType, location, jobId }) {
  const subject = 'Your job did not receive any quotes';
  const preheader = 'Consider reposting your job';
  
  const bodyContent = `
    <h1>No quotes received</h1>
    <p>Unfortunately, no service providers submitted quotes for your ${escapeHtml(jobType)} job.</p>
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
    </div>
    
    <p>This can happen when providers in your area are at capacity or during high-demand periods.</p>
    
    <p>You can repost your job to try again, or adjust the timing to improve your chances of receiving quotes.</p>
    
    <div class="cta">
      <a href="${BASE_URL}/jobs/${jobId}" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View job</a>
    </div>
  `;
  
  // Plain text version
  const textParts = [
    'No quotes received',
    '',
    `Unfortunately, no service providers submitted quotes for your ${jobType} job.`,
    '',
    `Location: ${location}`,
    '',
    'This can happen when providers in your area are at capacity or during high-demand periods.',
    '',
    'You can repost your job to try again, or adjust the timing to improve your chances of receiving quotes.',
    '',
    `View job: ${BASE_URL}/jobs/${jobId}`,
    '',
    '---',
    'You received this because you posted a job on Haul.',
    `Update preferences: ${BASE_URL}/user/preferences`,
    `Contact support: ${SUPPORT_EMAIL}`
  ];
  
  return {
    subject,
    html: buildConsumerTemplate({
      subject,
      preheader,
      bodyContent
    }),
    text: textParts.join('\n')
  };
}

/**
 * Scenario C: Instant book — acceptance window elapsed, no provider accepted the price
 */
function buildInstantBookExpiredEmail({ jobType, location, jobId }) {
  const subject = 'Your instant book price was not accepted';
  const preheader = 'No providers accepted your instant book price';

  const bodyContent = `
    <h1>Your instant book price was not accepted</h1>
    <p>Your instant book price for your ${escapeHtml(jobType)} job was not accepted by any service providers within the 48-hour window.</p>

    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
    </div>

    <p>This can happen when providers in your area are unavailable or the instant book price is below their current rates.</p>

    <p>You can repost the job to receive competitive bids from local providers, or try again with a different instant book price.</p>

    <div class="cta">
      <a href="${BASE_URL}/jobs/${jobId}" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View job</a>
    </div>
  `;

  const textParts = [
    'Your instant book price was not accepted',
    '',
    `Your instant book price for your ${jobType} job was not accepted by any service providers within the 48-hour window.`,
    '',
    `Location: ${location}`,
    '',
    'This can happen when providers in your area are unavailable or the instant book price is below their current rates.',
    '',
    'You can repost the job to receive competitive bids from local providers, or try again with a different instant book price.',
    '',
    `View job: ${BASE_URL}/jobs/${jobId}`,
    '',
    '---',
    'You received this because you posted a job on Haul.',
    `Update preferences: ${BASE_URL}/user/preferences`,
    `Contact support: ${SUPPORT_EMAIL}`
  ];

  return {
    subject,
    html: buildConsumerTemplate({
      subject,
      preheader,
      bodyContent
    }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking created email for service providers
 * Notifies OWNER/ADMIN/DISPATCHER that their bid was accepted
 */
function buildBookingCreatedEmail(data) {
  console.log('[buildBookingCreatedEmail] Received data:', JSON.stringify(data, null, 2));
  
  const bookingNumber = data.booking_number || 'N/A';
  const amountCents = data.amount_cents || 0;
  const amountDollars = (amountCents / 100).toFixed(2);
  const pickupStop = getPickupStop(data.stops);
  const location = formatAddress(pickupStop);
  const companyName = data.company_name || 'your company';
  const logoUrl = data.logo_url;
  
  // Normalize job type for display
  const jobType = data.job_type || 'JUNK_REMOVAL'; // Default fallback
  console.log('[buildBookingCreatedEmail] job_type from data:', data.job_type, '| normalized jobType:', jobType);
  
  const jobTypeDisplay = jobType === 'JUNK_REMOVAL' 
    ? 'junk removal' 
    : jobType === 'MOVING' 
    ? 'moving' 
    : jobType.toLowerCase().replace(/_/g, ' ');
  
  console.log('[buildBookingCreatedEmail] jobTypeDisplay:', jobTypeDisplay);

  const subject = `Job won – Booking ${bookingNumber} created`;
  const preheader = `Your bid has been accepted. Prepare for service.`;

  const logoHtml = logoUrl 
    ? `<img src=\"${escapeHtml(logoUrl)}\" alt=\"${escapeHtml(companyName)}\" style=\"max-width: 120px; height: auto; margin: 0 0 24px 0; display: block;\">`
    : '';

  const bodyContent = `
    <h1>You've won a job</h1>
    <p>A customer has accepted your bid and created a booking.</p>
    ${logoHtml}
    <div style=\"margin: 24px 0;\">
      <div class=\"detail-row\">
        <span class=\"detail-label\">Booking No.</span>
        <span class=\"detail-value\">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Amount</span>
        <span class=\"detail-value\">$${escapeHtml(amountDollars)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Location</span>
        <span class=\"detail-value\">${escapeHtml(location)}</span>
      </div>
    </div>
    
    <p>So, what's next? Prepare for ${escapeHtml(jobTypeDisplay)} service and assign a crew to get this booking started.</p>
    
    <div class=\"cta\">
      <a href=\"${DISPATCHER_BASE_URL}/dashboard/jobs/booked/${escapeHtml(bookingNumber)}\" class=\"cta-button\">View booking</a>
    </div>
  `;

  const textParts = [
    "You've won a job",
    '',
    `Congrats! A customer has accepted your bid for ${jobTypeDisplay} services.`,
    '',
    `Booking No.: ${bookingNumber}`,
    `Amount: $${amountDollars}`,
    `Location: ${location}`,
    '',
    `So, what's next? Prepare for ${jobTypeDisplay} service and assign a crew to get this booking started.`,
    '',
    `View booking: ${DISPATCHER_BASE_URL}/dashboard/jobs/booked/${bookingNumber}`,
    '',
    '---',
    'You received this because you have subscribed to transactional notifications from Haul.',
    `Manage your notification preferences: ${DISPATCHER_BASE_URL}/dashboard/profile/notifications`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  // Custom footer note for this template
  const footerNote = 'You received this because you have subscribed to transactional notifications from Haul.';

  return {
    subject,
    html: buildServiceProviderTemplate({ subject, preheader, bodyContent, footerNote }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking assigned email for CUSTOMER
 * Notifies customer that a crew has been assigned to their booking
 */
function buildBookingAssignedCustomerEmail(data) {
  console.log('[buildBookingAssignedCustomerEmail] Received data:', JSON.stringify(data, null, 2));
  
  const bookingNumber = data.booking_number || 'N/A';
  const pickupStop = getPickupStop(data.stops);
  const location = formatAddress(pickupStop);
  const companyName = data.company_name || 'the service provider';
  const driverName = data.driver_given_name || 'your crew leader';
  const logoUrl = data.logo_url;
  const timezone = pickupStop?.timezone || data.pickup_timezone;
  
  // Format pickup window
  const pickupWindow = formatTimingPreference(
    'SCHEDULED',
    data.pickup_window_start,
    data.pickup_window_end,
    timezone
  );

  const subject = `Crew assigned to booking ${bookingNumber}`;
  const preheader = `${driverName} from ${companyName} will handle your service.`;

  const bodyContent = `
    <h1>Crew assigned to your booking</h1>
    <p>Your service is moving forward.</p>
    
    ${logoUrl ? `<img src=\"${escapeHtml(logoUrl)}\" alt=\"${escapeHtml(companyName)}\" style=\"max-width: 120px; height: auto; margin: 16px 0 24px 0; display: block;\">` : ''}
    
    <div style=\"margin: 24px 0;\">
      <div class=\"detail-row\">
        <span class=\"detail-label\">Crew leader</span>
        <span class=\"detail-value\">${escapeHtml(driverName)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Company</span>
        <span class=\"detail-value\">${escapeHtml(companyName)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Booking No.</span>
        <span class=\"detail-value\">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Location</span>
        <span class=\"detail-value\">${escapeHtml(location)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Pickup window</span>
        <span class=\"detail-value\">${escapeHtml(pickupWindow)}</span>
      </div>
    </div>
    
    <p>Your crew has been assigned and will contact you to coordinate service.</p>
    
    <div class=\"cta\">
      <a href=\"${BASE_URL}/bookings\" class=\"cta-button\" style=\"color:#ffffff !important;text-decoration:none;\">View booking</a>
    </div>
  `;

  const textParts = [
    'Crew assigned to your booking',
    '',
    'Your service is moving forward.',
    '',
    `Crew leader: ${driverName}`,
    `Company: ${companyName}`,
    `Booking No.: ${bookingNumber}`,
    `Location: ${location}`,
    `Pickup window: ${pickupWindow}`,
    '',
    'Your crew has been assigned and will contact you to coordinate service.',
    '',
    `View booking: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this because a crew was assigned to your booking.',
    `Manage your notification preferences: ${BASE_URL}/user/preferences`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildConsumerTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking assigned email for DRIVER
 * Notifies driver they have been assigned to handle a booking
 */
function buildBookingAssignedDriverEmail(data) {
  console.log('[buildBookingAssignedDriverEmail] Received data:', JSON.stringify(data, null, 2));
  
  const bookingNumber = data.booking_number || 'N/A';
  const driverPickupStop = getPickupStop(data.stops);
  const location = formatAddress(driverPickupStop);
  const companyName = data.company_name || 'your company';
  const logoUrl = data.logo_url;
  const timezone = driverPickupStop?.timezone || data.pickup_timezone;
  
  // Format pickup window
  const pickupWindow = formatTimingPreference(
    'SCHEDULED',
    data.pickup_window_start,
    data.pickup_window_end,
    timezone
  );

  const subject = `You've been assigned to booking ${bookingNumber}`;
  const preheader = `Job details and location ready for review.`;

  const logoHtml = logoUrl 
    ? `<img src=\"${escapeHtml(logoUrl)}\" alt=\"${escapeHtml(companyName)}\" style=\"max-width: 120px; height: auto; margin: 0 0 24px 0; display: block;\">`
    : '';

  const bodyContent = `
    <h1>Assignment confirmed</h1>
    <p>You've been assigned to handle this booking.</p>
    ${logoHtml}
    <div style=\"margin: 24px 0;\">
      <div class=\"detail-row\">
        <span class=\"detail-label\">Booking No.</span>
        <span class=\"detail-value\">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Location</span>
        <span class=\"detail-value\">${escapeHtml(location)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Pickup window</span>
        <span class=\"detail-value\">${escapeHtml(pickupWindow)}</span>
      </div>
    </div>
    
    <p>Review the job details and coordinate with the customer to complete the service.</p>
    
    <div class=\"cta\">
      <a href=\"${DISPATCHER_BASE_URL}/dashboard/bookings\" class=\"cta-button\">View job details</a>
    </div>
  `;

  const textParts = [
    'Assignment confirmed',
    '',
    "You've been assigned to handle this booking.",
    '',
    `Booking No.: ${bookingNumber}`,
    `Location: ${location}`,
    `Pickup window: ${pickupWindow}`,
    '',
    'Review the job details and coordinate with the customer to complete the service.',
    '',
    `View job details: ${DISPATCHER_BASE_URL}/dashboard/bookings`,
    '',
    '---',
    'You received this because you were assigned to a booking.',
    `Manage your notification preferences: ${DISPATCHER_BASE_URL}/dashboard/profile/notifications`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildServiceProviderTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking created email for CUSTOMER (instant book accepted by company)
 * Notifies customer that a company has accepted their instant book price
 */
function buildBookingCreatedCustomerEmail(data) {
  console.log('[buildBookingCreatedCustomerEmail] Received data:', JSON.stringify(data, null, 2));

  const bookingNumber = data.booking_number || 'N/A';
  const amountCents = data.amount_cents || 0;
  const amountDollars = (amountCents / 100).toFixed(2);
  const pickupStop = getPickupStop(data.stops);
  const location = formatAddress(pickupStop);
  const companyName = data.company_name || 'a service provider';
  const logoUrl = data.logo_url;

  const subject = `Booking confirmed – ${escapeHtml(companyName)} is on it`;
  const preheader = `Your instant booking has been accepted.`;

  const bodyContent = `
    <h1>Your booking is confirmed</h1>
    <p>${escapeHtml(companyName)} has accepted your instant book price and your job is booked.</p>
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="max-width: 120px; height: auto; margin: 16px 0 24px 0; display: block;">` : ''}
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Provider</span>
        <span class="detail-value">${escapeHtml(companyName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">$${escapeHtml(amountDollars)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
    </div>
    <p>You'll receive updates as your crew is assigned and your service day approaches.</p>
    <div class="cta">
      <a href="${BASE_URL}/bookings" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View booking</a>
    </div>
  `;

  const textParts = [
    'Your booking is confirmed',
    '',
    `${companyName} has accepted your instant book price and your job is booked.`,
    '',
    `Booking No.: ${bookingNumber}`,
    `Provider: ${companyName}`,
    `Amount: $${amountDollars}`,
    `Location: ${location}`,
    '',
    "You'll receive updates as your crew is assigned and your service day approaches.",
    '',
    `View booking: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this because you created an instant booking.',
    `Manage your notification preferences: ${BASE_URL}/user/preferences`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildConsumerTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking assigned email for SERVICE PROVIDER (OWNER/ADMIN/DISPATCHER)
 * Notifies provider users that a driver has been assigned to their booking
 */
function buildBookingAssignedProviderEmail(data) {
  console.log('[buildBookingAssignedProviderEmail] Received data:', JSON.stringify(data, null, 2));

  const bookingNumber = data.booking_number || 'N/A';
  const driverPickupStop = getPickupStop(data.stops);
  const location = formatAddress(driverPickupStop);
  const companyName = data.company_name || 'your company';
  const driverName = data.driver_given_name || 'A crew member';
  const logoUrl = data.logo_url;
  const timezone = driverPickupStop?.timezone || data.pickup_timezone;

  const pickupWindow = formatTimingPreference(
    'SCHEDULED',
    data.pickup_window_start,
    data.pickup_window_end,
    timezone
  );

  const subject = `Driver assigned to booking ${bookingNumber}`;
  const preheader = `${driverName} has been assigned and is ready to go.`;

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="max-width: 120px; height: auto; margin: 0 0 24px 0; display: block;">`
    : '';

  const bodyContent = `
    <h1>Driver assigned</h1>
    <p>${escapeHtml(driverName)} has been assigned to this booking.</p>
    ${logoHtml}
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Driver</span>
        <span class="detail-value">${escapeHtml(driverName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Pickup window</span>
        <span class="detail-value">${escapeHtml(pickupWindow)}</span>
      </div>
    </div>
    <div class="cta">
      <a href="${DISPATCHER_BASE_URL}/dashboard/jobs/booked/${escapeHtml(bookingNumber)}" class="cta-button">View booking</a>
    </div>
  `;

  const textParts = [
    'Driver assigned',
    '',
    `${driverName} has been assigned to booking ${bookingNumber}.`,
    '',
    `Driver: ${driverName}`,
    `Booking No.: ${bookingNumber}`,
    `Location: ${location}`,
    `Pickup window: ${pickupWindow}`,
    '',
    `View booking: ${DISPATCHER_BASE_URL}/dashboard/jobs/booked/${bookingNumber}`,
    '',
    '---',
    'You received this because a driver was assigned to a booking in your company.',
    `Manage your notification preferences: ${DISPATCHER_BASE_URL}/dashboard/profile/notifications`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildServiceProviderTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking completed email for SERVICE PROVIDER (OWNER/ADMIN/DISPATCHER)
 */
function buildBookingCompletedProviderEmail(data) {
  const bookingNumber = data.booking_number || 'N/A';
  const amountCents = data.amount_cents || 0;
  const amountDollars = (amountCents / 100).toFixed(2);
  const pickupStop = getPickupStop(data.stops);
  const location = formatAddress(pickupStop);
  const timezone = pickupStop?.timezone || data.pickup_timezone;
  const completedAt = data.completed_at
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || 'UTC' }).format(new Date(data.completed_at))
    : 'N/A';

  const subject = `Booking ${bookingNumber} complete`;
  const preheader = `Booking ${bookingNumber} has been marked complete.`;

  const bodyContent = `
    <h1>Booking complete</h1>
    <p>Booking <strong>${escapeHtml(bookingNumber)}</strong> has been completed.</p>

    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">$${escapeHtml(amountDollars)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Completed</span>
        <span class="detail-value">${escapeHtml(completedAt)}</span>
      </div>
    </div>

    <p>Payment is being processed and will be released to your account after the standard hold period.</p>

    <div class="cta">
      <a href="${DISPATCHER_BASE_URL}/bookings/${data.booking_id}" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View booking</a>
    </div>
  `;

  const textParts = [
    `Booking ${bookingNumber} complete`,
    '',
    `Booking ${bookingNumber} has been completed.`,
    '',
    `Booking No.: ${bookingNumber}`,
    `Location: ${location}`,
    `Amount: $${amountDollars}`,
    `Completed: ${completedAt}`,
    '',
    'Payment is being processed and will be released to your account after the standard hold period.',
    '',
    `View booking: ${DISPATCHER_BASE_URL}/bookings/${data.booking_id}`,
    '',
    '---',
    'You received this because a booking your company managed was completed.',
    `Manage preferences: ${DISPATCHER_BASE_URL}/dashboard/profile/notifications`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildServiceProviderTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking completed email for CUSTOMER
 */
function buildBookingCompletedCustomerEmail(data) {
  const bookingNumber = data.booking_number || 'N/A';
  const companyName = data.company_name || 'your service provider';
  const amountCents = data.amount_cents || 0;
  const amountDollars = (amountCents / 100).toFixed(2);
  const pickupStop = getPickupStop(data.stops);
  const location = formatAddress(pickupStop);
  const timezone = pickupStop?.timezone || data.pickup_timezone;
  const completedAt = data.completed_at
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || 'UTC' }).format(new Date(data.completed_at))
    : 'N/A';

  const subject = `Your service is complete – Booking ${bookingNumber}`;
  const preheader = `${companyName} has completed your service.`;

  const bodyContent = `
    <h1>Service complete</h1>
    <p>${escapeHtml(companyName)} has completed your service.</p>

    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Company</span>
        <span class="detail-value">${escapeHtml(companyName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Completed</span>
        <span class="detail-value">${escapeHtml(completedAt)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount charged</span>
        <span class="detail-value">$${escapeHtml(amountDollars)}</span>
      </div>
    </div>

    <p>We hope everything went smoothly. Your receipt will follow once payment is processed.</p>

    <div class="cta">
      <a href="${BASE_URL}/bookings" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View booking</a>
    </div>
  `;

  const textParts = [
    `Your service is complete – Booking ${bookingNumber}`,
    '',
    `${companyName} has completed your service.`,
    '',
    `Booking No.: ${bookingNumber}`,
    `Company: ${companyName}`,
    `Location: ${location}`,
    `Completed: ${completedAt}`,
    `Amount charged: $${amountDollars}`,
    '',
    'We hope everything went smoothly. Your receipt will follow once payment is processed.',
    '',
    `View booking: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this because your booking was completed.',
    `Manage preferences: ${BASE_URL}/user/preferences`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildConsumerTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking canceled email for SERVICE PROVIDER (OWNER/ADMIN/DISPATCHER)
 */
function buildBookingCanceledProviderEmail(data) {
  const bookingNumber = data.booking_number || 'N/A';
  const pickupStop = getPickupStop(data.stops);
  const location = formatAddress(pickupStop);

  const subject = `Booking ${bookingNumber} canceled`;
  const preheader = `Booking ${bookingNumber} has been canceled.`;

  const bodyContent = `
    <h1>Booking canceled</h1>
    <p>Booking <strong>${escapeHtml(bookingNumber)}</strong> has been canceled.</p>

    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
    </div>

    <p>No further action is required for this booking.</p>

    <div class="cta">
      <a href="${DISPATCHER_BASE_URL}/bookings/${data.booking_id}" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View booking</a>
    </div>
  `;

  const textParts = [
    `Booking ${bookingNumber} canceled`,
    '',
    `Booking ${bookingNumber} has been canceled.`,
    '',
    `Booking No.: ${bookingNumber}`,
    `Location: ${location}`,
    '',
    'No further action is required for this booking.',
    '',
    `View booking: ${DISPATCHER_BASE_URL}/bookings/${data.booking_id}`,
    '',
    '---',
    'You received this because a booking your company managed was canceled.',
    `Manage preferences: ${DISPATCHER_BASE_URL}/dashboard/profile/notifications`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildServiceProviderTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build booking canceled email for CUSTOMER
 */
function buildBookingCanceledCustomerEmail(data) {
  const bookingNumber = data.booking_number || 'N/A';
  const companyName = data.company_name || 'your service provider';
  const pickupStop = getPickupStop(data.stops);
  const location = formatAddress(pickupStop);

  const subject = `Booking ${bookingNumber} canceled`;
  const preheader = `Your booking with ${companyName} has been canceled.`;

  const bodyContent = `
    <h1>Your booking was canceled</h1>
    <p>Your booking with <strong>${escapeHtml(companyName)}</strong> has been canceled.</p>

    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Company</span>
        <span class="detail-value">${escapeHtml(companyName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
    </div>

    <p>If a charge was made, any applicable refund will be processed within 5-10 business days. Contact us if you have questions.</p>

    <div class="cta">
      <a href="${BASE_URL}/bookings" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View bookings</a>
    </div>
  `;

  const textParts = [
    `Booking ${bookingNumber} canceled`,
    '',
    `Your booking with ${companyName} has been canceled.`,
    '',
    `Booking No.: ${bookingNumber}`,
    `Company: ${companyName}`,
    `Location: ${location}`,
    '',
    'If a charge was made, any applicable refund will be processed within 5-10 business days. Contact us if you have questions.',
    '',
    `View bookings: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this because your booking was canceled.',
    `Manage preferences: ${BASE_URL}/user/preferences`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildConsumerTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build payment authorization failed email for CUSTOMER
 */
function buildPaymentAuthorizationFailedEmail(data) {
  const bookingNumber = data.booking_number || 'N/A';

  const subject = 'Payment authorization failed';
  const preheader = 'We could not authorize payment for your booking.';

  const bodyContent = `
    <h1>Payment authorization failed</h1>
    <p>We were unable to authorize the payment method on file for your booking.</p>

    ${bookingNumber !== 'N/A' ? `
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
    </div>` : ''}

    <p>This may be due to insufficient funds, an expired card, or a block placed by your bank. Please update your payment method or contact your bank for details.</p>

    <div class="cta">
      <a href="${BASE_URL}/settings/payment" class="cta-button" style="color:#ffffff !important;text-decoration:none;">Update payment method</a>
    </div>
  `;

  const textParts = [
    'Payment authorization failed',
    '',
    'We were unable to authorize the payment method on file for your booking.',
    '',
    ...(bookingNumber !== 'N/A' ? [`Booking No.: ${bookingNumber}`, ''] : []),
    'This may be due to insufficient funds, an expired card, or a block placed by your bank.',
    'Please update your payment method or contact your bank for details.',
    '',
    `Update payment method: ${BASE_URL}/settings/payment`,
    '',
    '---',
    'You received this because a payment for your booking could not be authorized.',
    `Manage preferences: ${BASE_URL}/user/preferences`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildConsumerTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Build payment captured (receipt) email for CUSTOMER
 *
 * Renders a full itemized receipt matching the in-app PDF receipt.
 * Requires data enriched by PaymentCapturedResolver:
 *   invoice_aggregate: { booking_amount_cents, trust_fee_amount_cents, tax_amount_cents,
 *                        tip_amount_cents, trust_fee_pct, trust_fee_cap_cents, total_cents }
 *   payment_method:    { brand, last4, captured_at, captured_amount_cents }
 *   stops, company_name, driver_given_name, job_type, invoice_number,
 *   completed_at, created_at, platform_legal_name, platform_address, support_email
 */
function buildPaymentCapturedEmail(data) {
  const bookingNumber = data.booking_number || 'N/A';
  const invoiceNumber = data.invoice_number || bookingNumber;
  const companyName = data.company_name || 'your service provider';
  const driverGivenName = data.driver_given_name || null;
  const jobType = data.job_type ? normalizeJobType(data.job_type) : 'Service';
  const pickupStop = getPickupStop(data.stops);
  const dropoffStop = data.stops ? data.stops.find(s => s.stop_type === 'DROPOFF') : null;
  const pickupAddress = formatAddress(pickupStop);
  const dropoffAddress = dropoffStop ? formatAddress(dropoffStop) : null;
  const timezone = pickupStop?.timezone || data.pickup_timezone;

  const agg = data.invoice_aggregate;
  const pm = data.payment_method;

  const totalCents = agg ? agg.total_cents : (data.amount_cents || 0);
  const totalFormatted = formatCentsToDisplay(totalCents);

  const completedAt = data.completed_at
    ? formatReceiptDate(data.completed_at, timezone)
    : null;
  const createdAt = data.created_at
    ? formatReceiptDate(data.created_at, timezone)
    : null;

  const provider = [companyName, driverGivenName].filter(Boolean).join(' — ');

  const platformLegalName = data.platform_legal_name || 'Haulwerk, LLC';
  const platformAddress = data.platform_address || '';
  const supportEmail = data.support_email || SUPPORT_EMAIL;

  const subject = `Receipt for booking ${bookingNumber}`;
  const preheader = `${totalFormatted} charged for your ${jobType} service.`;

  // --- Line items table ---
  let lineItemsRows = '';
  if (agg) {
    // Trust fee label
    let trustFeeLabel = 'Service &amp; Trust Fee';
    if (agg.trust_fee_pct != null) {
      trustFeeLabel += ` (${Math.round(agg.trust_fee_pct * 100)}%)`;
    }

    lineItemsRows += `
      <tr>
        <td style="padding: 6px 0; vertical-align: top;">${escapeHtml(jobType)}</td>
        <td style="padding: 6px 0; text-align: right; white-space: nowrap; font-weight: 600;">${formatCentsToDisplay(agg.booking_amount_cents)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; vertical-align: top; color: #6b7280; font-size: 13px;">${trustFeeLabel}</td>
        <td style="padding: 6px 0; text-align: right; white-space: nowrap; color: #6b7280; font-size: 13px;">${formatCentsToDisplay(agg.trust_fee_amount_cents)}</td>
      </tr>`;

    if (agg.trust_fee_cap_cents != null) {
      lineItemsRows += `
      <tr>
        <td colspan="2" style="padding: 2px 0 6px 0; font-size: 12px; color: #9ca3af;">Capped at $${Math.round(agg.trust_fee_cap_cents / 100)}</td>
      </tr>`;
    }
    if (agg.tax_amount_cents > 0) {
      lineItemsRows += `
      <tr>
        <td style="padding: 6px 0; vertical-align: top; color: #6b7280; font-size: 13px;">Taxes</td>
        <td style="padding: 6px 0; text-align: right; white-space: nowrap; color: #6b7280; font-size: 13px;">${formatCentsToDisplay(agg.tax_amount_cents)}</td>
      </tr>`;
    }
    if (agg.tip_amount_cents > 0) {
      lineItemsRows += `
      <tr>
        <td style="padding: 6px 0; vertical-align: top; color: #6b7280; font-size: 13px;">Tip</td>
        <td style="padding: 6px 0; text-align: right; white-space: nowrap; color: #6b7280; font-size: 13px;">${formatCentsToDisplay(agg.tip_amount_cents)}</td>
      </tr>`;
    }

    // Total row
    lineItemsRows += `
      <tr>
        <td colspan="2" style="padding: 12px 0 0 0; border-top: 1px solid #e5e7eb;"></td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: 700; font-size: 16px;">Total</td>
        <td style="padding: 4px 0; text-align: right; font-weight: 700; font-size: 16px;">${totalFormatted}</td>
      </tr>`;
  } else {
    // Fallback: just show total if no line item breakdown
    lineItemsRows = `
      <tr>
        <td style="padding: 6px 0; font-weight: 700;">Total charged</td>
        <td style="padding: 6px 0; text-align: right; font-weight: 700;">${totalFormatted}</td>
      </tr>`;
  }

  // --- Payment method row ---
  let paymentMethodHtml = '';
  if (pm && pm.last4) {
    const brand = pm.brand.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const capturedDate = pm.captured_at ? formatReceiptDate(pm.captured_at, timezone) : '';
    paymentMethodHtml = `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 8px 0;">Payment</p>
        <table width="100%" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-size: 14px;">${escapeHtml(brand)} ••••${escapeHtml(pm.last4)}</td>
            <td style="padding: 4px 0; text-align: right; font-size: 13px; color: #6b7280;">${capturedDate ? escapeHtml(capturedDate) : ''}</td>
          </tr>
        </table>
      </div>`;
  }

  // --- Service details ---
  const serviceDetailRows = [];
  if (completedAt) serviceDetailRows.push(`<tr><td style="color:#6b7280;width:120px;padding:3px 0;font-size:13px;">Service date</td><td style="padding:3px 0;font-size:13px;">${escapeHtml(completedAt)}</td></tr>`);
  serviceDetailRows.push(`<tr><td style="color:#6b7280;width:120px;padding:3px 0;font-size:13px;">Service type</td><td style="padding:3px 0;font-size:13px;">${escapeHtml(jobType)}</td></tr>`);
  if (provider) serviceDetailRows.push(`<tr><td style="color:#6b7280;width:120px;padding:3px 0;font-size:13px;">Provider</td><td style="padding:3px 0;font-size:13px;">${escapeHtml(provider)}</td></tr>`);
  if (pickupAddress) serviceDetailRows.push(`<tr><td style="color:#6b7280;width:120px;padding:3px 0;font-size:13px;">Pickup</td><td style="padding:3px 0;font-size:13px;">${escapeHtml(pickupAddress)}</td></tr>`);
  if (dropoffAddress) serviceDetailRows.push(`<tr><td style="color:#6b7280;width:120px;padding:3px 0;font-size:13px;">Dropoff</td><td style="padding:3px 0;font-size:13px;">${escapeHtml(dropoffAddress)}</td></tr>`);

  const serviceDetailsHtml = serviceDetailRows.length > 0 ? `
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 8px 0;">Service Details</p>
      <table width="100%" style="border-collapse: collapse;">${serviceDetailRows.join('')}</table>
    </div>` : '';

  // --- Platform footer ---
  const platformFooterHtml = `
    <div style="margin-top: 4px; font-size: 11px; color: #9ca3af; line-height: 1.6;">
      ${escapeHtml(platformLegalName)}${platformAddress ? ` · ${escapeHtml(platformAddress)}` : ''}${supportEmail ? ` · <a href="mailto:${escapeHtml(supportEmail)}" style="color:#9ca3af;">${escapeHtml(supportEmail)}</a>` : ''}
    </div>`;

  // --- Full body ---
  const bodyContent = `
    <div style="margin-bottom: 8px;">
      <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 4px 0;">Receipt</p>
      ${bookingNumber !== 'N/A' ? `<p style="font-size: 13px; color: #6b7280; margin: 0;">Booking No. ${escapeHtml(bookingNumber)}</p>` : ''}
    </div>

    <table width="100%" style="border-collapse: collapse; margin: 20px 0;">
      ${lineItemsRows}
    </table>

    ${paymentMethodHtml}

    ${serviceDetailsHtml}

    <div style="margin: 24px 0;">
      <a href="${BASE_URL}/bookings" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View booking</a>
    </div>
    ${platformFooterHtml}
  `;

  // --- Plain text ---
  const textParts = [
    `Receipt — Booking No. ${bookingNumber}`,
    '',
  ];

  if (agg) {
    textParts.push(`${jobType}: ${formatCentsToDisplay(agg.booking_amount_cents)}`);
    let trustFeeLabel = 'Service & Trust Fee';
    if (agg.trust_fee_pct != null) trustFeeLabel += ` (${Math.round(agg.trust_fee_pct * 100)}%)`;
    textParts.push(`${trustFeeLabel}: ${formatCentsToDisplay(agg.trust_fee_amount_cents)}`);
    if (agg.trust_fee_cap_cents != null) textParts.push(`  Capped at $${Math.round(agg.trust_fee_cap_cents / 100)}`);
    if (agg.tax_amount_cents > 0) textParts.push(`Taxes: ${formatCentsToDisplay(agg.tax_amount_cents)}`);
    if (agg.tip_amount_cents > 0) textParts.push(`Tip: ${formatCentsToDisplay(agg.tip_amount_cents)}`);
    textParts.push(`Total: ${totalFormatted}`);
  } else {
    textParts.push(`Total charged: ${totalFormatted}`);
  }

  textParts.push('');

  if (pm && pm.last4) {
    const brand = pm.brand.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    textParts.push(`Paid with: ${brand} ••••${pm.last4}`);
    textParts.push('');
  }

  if (completedAt) textParts.push(`Service date: ${completedAt}`);
  textParts.push(`Service type: ${jobType}`);
  if (provider) textParts.push(`Provider: ${provider}`);
  if (pickupAddress) textParts.push(`Pickup: ${pickupAddress}`);
  if (dropoffAddress) textParts.push(`Dropoff: ${dropoffAddress}`);

  textParts.push(
    '',
    `View booking: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this as a receipt for your completed service.',
    `Manage preferences: ${BASE_URL}/user/preferences`,
    `Need help? Contact us at ${supportEmail}`,
    '',
    ...(createdAt ? [`Booked on ${createdAt}`] : []),
    `© ${new Date().getFullYear()} ${platformLegalName}`
  );

  return {
    subject,
    html: buildConsumerTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Format cents as a dollar display string (e.g. 15099 → "$150.99")
 */
function formatCentsToDisplay(cents) {
  if (cents == null) return '$0.00';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format an ISO date string to a human-readable receipt date
 */
function formatReceiptDate(isoString, timezone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || 'UTC',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Build payout sent email for SERVICE PROVIDER (OWNER/ADMIN)
 */
function buildPayoutSentEmail(data) {
  const amountCents = data.amount_cents || 0;
  const amountDollars = (amountCents / 100).toFixed(2);
  const bookingNumber = data.booking_number || null;

  const subject = 'Payout sent to your bank account';
  const preheader = amountCents > 0
    ? `$${amountDollars} is on its way to your bank.`
    : 'A payout has been initiated to your bank account.';

  const bodyContent = `
    <h1>Payout sent</h1>
    <p>A payout has been initiated and is on its way to your bank account.</p>

    <div style="margin: 24px 0;">
      ${amountCents > 0 ? `
      <div class="detail-row" style="font-weight: 600;">
        <span class="detail-label">Payout amount</span>
        <span class="detail-value">$${escapeHtml(amountDollars)}</span>
      </div>` : ''}
      ${bookingNumber ? `
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">Arrival</span>
        <span class="detail-value">Typically 1-3 business days</span>
      </div>
    </div>

    <p>Funds typically arrive within 1-3 business days depending on your bank.</p>

    <div class="cta">
      <a href="${DISPATCHER_BASE_URL}/dashboard/earnings" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View earnings</a>
    </div>
  `;

  const textParts = [
    'Payout sent to your bank account',
    '',
    'A payout has been initiated and is on its way to your bank account.',
    '',
    ...(amountCents > 0 ? [`Payout amount: $${amountDollars}`, ''] : []),
    ...(bookingNumber ? [`Booking No.: ${bookingNumber}`, ''] : []),
    'Arrival: Typically 1-3 business days',
    '',
    'Funds typically arrive within 1-3 business days depending on your bank.',
    '',
    `View earnings: ${DISPATCHER_BASE_URL}/dashboard/earnings`,
    '',
    '---',
    'You received this because a payout was sent to your connected bank account.',
    `Manage preferences: ${DISPATCHER_BASE_URL}/dashboard/profile/notifications`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  ];

  return {
    subject,
    html: buildServiceProviderTemplate({ subject, preheader, bodyContent }),
    text: textParts.join('\n')
  };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Build email for "email changed" notification sent to the old address.
 * Informs user their Haul account email was changed; contact support if not requested.
 */
function buildEmailChangedNotification({ oldEmail, newEmail }) {
  const supportEmail = SUPPORT_EMAIL || 'support@haulwerk.com';
  const subject = 'Your Haul account email was changed';
  const preheader = 'Your account email was updated. Contact support if you did not request this change.';

  const bodyContent = `
    <h1>Your Haul account email was changed</h1>
    <p>The email address for your Haul account was updated to ${escapeHtml(newEmail)}.</p>
    <p>If you did not request this change, contact us at <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a> right away.</p>
  `;

  const textParts = [
    'Your Haul account email was changed',
    '',
    `The email address for your Haul account was updated to ${newEmail}.`,
    '',
    `If you did not request this change, contact us at ${supportEmail} right away.`,
  ];

  return {
    subject,
    html: buildConsumerTemplate({
      subject,
      preheader,
      bodyContent,
    }),
    text: textParts.join('\n'),
  };
}

module.exports = {
  buildServiceProviderTemplate,
  buildConsumerTemplate,
  buildJobPostedEmail,
  buildJobClosedEmail,
  buildInstantBookExpiredEmail,
  buildBookingCreatedEmail,
  buildBookingCreatedCustomerEmail,
  buildBookingAssignedCustomerEmail,
  buildBookingAssignedDriverEmail,
  buildBookingAssignedProviderEmail,
  buildBookingCompletedProviderEmail,
  buildBookingCompletedCustomerEmail,
  buildBookingCanceledProviderEmail,
  buildBookingCanceledCustomerEmail,
  buildPaymentAuthorizationFailedEmail,
  buildPaymentCapturedEmail,
  buildPayoutSentEmail,
  normalizeJobType,
  formatTimingPreference,
  formatAddress,
  formatCentsToDisplay,
  formatReceiptDate,
  getPickupStop,
  getDropoffStop,
  escapeHtml,
  buildEmailChangedNotification,
};
