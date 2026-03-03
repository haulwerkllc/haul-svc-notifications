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
    'MOVING': 'small-medium moving'
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
  
  const bodyContent = `
    <h1>New job posted – submit your bid</h1>
    <p>A ${jobType} job is ready for bids in your service area.</p>
    
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
    'New job posted – submit your bid',
    '',
    `A ${jobType} job is ready for bids in your service area.`,
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
function buildBidCreatedEmail(data) {
  const companyName = data.company_name || 'A service provider';
  const bidAmount = data.bid_amount_formatted || 'Price not specified';
  const jobType = data.job_type_formatted || 'hauling';
  const location = data.location_formatted || 'Your job location';
  const pickupWindow = data.pickup_window_formatted || 'Flexible';
  const notes = data.notes;
  const companyLogoUrl = data.company_logo_url;
  const bidId = data.bid_id;
  const pickupStop = getPickupStop(data.stops);
  const timezone = pickupStop?.timezone || data.pickup_timezone;
  const biddingClosesAt = data.bidding_closes_at ? formatBiddingDeadline(data.bidding_closes_at, timezone) : 'the deadline';
  
  const subject = 'You received a new quote on your job';
  const preheader = `${companyName} submitted a ${bidAmount} quote`;
  
  // Company logo (if available)
  const companyLogoHtml = companyLogoUrl 
    ? `<img src="${escapeHtml(companyLogoUrl)}" alt="${escapeHtml(companyName)} logo" style="max-width:120px;height:auto;margin:0 auto 16px;display:block;" />`
    : '';
  
  const bodyContent = `
    <h1>New quote received</h1>
    <p>${escapeHtml(companyName)} has submitted a quote on your ${escapeHtml(jobType)} job.</p>
    
    ${companyLogoHtml}
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Quoted amount</span>
        <span class="detail-value" style="font-weight: 600;">${escapeHtml(bidAmount)}</span>
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
        <span class="detail-label">Service window</span>
        <span class="detail-value">${escapeHtml(pickupWindow)}</span>
      </div>
    </div>
    
    ${notes ? `<p style="margin: 16px 0; padding: 12px; background-color: #f9fafb; border-radius: 6px; font-size: 14px;"><strong>Provider notes:</strong> ${escapeHtml(notes)}</p>` : ''}
    
    <p>To book your service, review and select a quote by ${escapeHtml(biddingClosesAt)} in the Haul app.</p>
    
    <div class="cta">
      <a href="${BASE_URL}/bids/${bidId}" class="cta-button" style="color:#ffffff !important;text-decoration:none;">Review quote</a>
    </div>
  `;
  
  // Plain text version
  const textParts = [
    'New quote received',
    '',
    `${companyName} has submitted a quote on your ${jobType} job.`,
    '',
    `Quoted amount: ${bidAmount}`,
    `Company: ${companyName}`,
    `Location: ${location}`,
    `Service window: ${pickupWindow}`
  ];
  
  if (notes) {
    textParts.push('');
    textParts.push(`Provider notes: ${notes}`);
  }
  
  textParts.push('');
  textParts.push(`To book your service, review and select a quote by ${biddingClosesAt} in the Haul app.`);
  textParts.push('');
  textParts.push(`Review quote: ${BASE_URL}/bids/${bidId}`);
  textParts.push('');
  textParts.push('---');
  textParts.push('You received this because you posted a job on Haul.');
  textParts.push(`Update preferences: ${BASE_URL}/user/preferences`);
  textParts.push(`Contact support: ${SUPPORT_EMAIL}`);
  
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
 * Build bid updated email for consumers
 */
function buildBidUpdatedEmail(data) {
  const companyName = data.company_name || 'A service provider';
  const bidAmount = data.bid_amount_formatted || 'Price not specified';
  const jobType = data.job_type_formatted || 'hauling';
  const location = data.location_formatted || 'Your job location';
  const pickupWindow = data.pickup_window_formatted || 'Flexible';
  const notes = data.notes;
  const companyLogoUrl = data.company_logo_url;
  const bidId = data.bid_id;
  const pickupStop = getPickupStop(data.stops);
  const timezone = pickupStop?.timezone || data.pickup_timezone;
  const biddingClosesAt = data.bidding_closes_at ? formatBiddingDeadline(data.bidding_closes_at, timezone) : 'the deadline';
  
  const subject = 'A quote on your job was updated';
  const preheader = `${companyName} updated their quote to ${bidAmount}`;
  
  // Company logo (if available)
  const companyLogoHtml = companyLogoUrl 
    ? `<img src="${escapeHtml(companyLogoUrl)}" alt="${escapeHtml(companyName)} logo" style="max-width:120px;height:auto;margin:0 auto 16px;display:block;" />`
    : '';
  
  const bodyContent = `
    <h1>Quote updated</h1>
    <p>${escapeHtml(companyName)} has updated their quote on your ${escapeHtml(jobType)} job.</p>
    
    ${companyLogoHtml}
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Updated quote</span>
        <span class="detail-value" style="font-weight: 600;">${escapeHtml(bidAmount)}</span>
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
        <span class="detail-label">Service window</span>
        <span class="detail-value">${escapeHtml(pickupWindow)}</span>
      </div>
    </div>
    
    ${notes ? `<p style="margin: 16px 0; padding: 12px; background-color: #f9fafb; border-radius: 6px; font-size: 14px;"><strong>Provider notes:</strong> ${escapeHtml(notes)}</p>` : ''}
    
    <p>To book your service, review and select a quote by ${escapeHtml(biddingClosesAt)} in the Haul app.</p>
    
    <div class="cta">
      <a href="${BASE_URL}/bids/${bidId}" class="cta-button" style="color:#ffffff !important;text-decoration:none;">Review quote</a>
    </div>
  `;
  
  // Plain text version
  const textParts = [
    'Quote updated',
    '',
    `${companyName} has updated their quote on your ${jobType} job.`,
    '',
    `Updated quote: ${bidAmount}`,
    `Company: ${companyName}`,
    `Location: ${location}`,
    `Service window: ${pickupWindow}`
  ];
  
  if (notes) {
    textParts.push('');
    textParts.push(`Provider notes: ${notes}`);
  }
  
  textParts.push('');
  textParts.push(`To book your service, review and select a quote by ${biddingClosesAt} in the Haul app.`);
  textParts.push('');
  textParts.push(`Review quote: ${BASE_URL}/bids/${bidId}`);
  textParts.push('');
  textParts.push('---');
  textParts.push('You received this because you posted a job on Haul.');
  textParts.push(`Update preferences: ${BASE_URL}/user/preferences`);
  textParts.push(`Contact support: ${SUPPORT_EMAIL}`);
  
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
 * Build job canceled email for service providers
 */
function buildJobCanceledEmail(data) {
  const jobType = data.job_type_formatted || 'hauling';
  const location = data.location_formatted || 'Location not specified';
  const description = data.description;
  
  const subject = 'A job you bid on was canceled';
  const preheader = 'The customer has canceled this job';
  
  const bodyContent = `
    <h1>Job canceled</h1>
    <p>The ${escapeHtml(jobType)} job you submitted a bid on has been canceled by the customer.</p>
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
    </div>
    
    ${description ? `<p style="margin: 16px 0; color: #6b7280; font-size: 14px;">${escapeHtml(description.substring(0, 100))}${description.length > 100 ? '...' : ''}</p>` : ''}
    
    <p>No further action is required. Your bid has been automatically withdrawn.</p>
  `;
  
  // Plain text version
  const textParts = [
    'Job canceled',
    '',
    `The ${jobType} job you submitted a bid on has been canceled by the customer.`,
    '',
    `Location: ${location}`
  ];
  
  if (description) {
    textParts.push('');
    textParts.push(description.substring(0, 100) + (description.length > 100 ? '...' : ''));
  }
  
  textParts.push('');
  textParts.push('No further action is required. Your bid has been automatically withdrawn.');
  textParts.push('');
  textParts.push('---');
  textParts.push('You received this because you submitted a bid on this job.');
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
    ? 'small-medium moving' 
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
 * Build booking in progress email for CUSTOMER
 * Notifies customer that their service has started and the crew is en route
 */
function buildBookingInProgressEmail(data) {
  console.log('[buildBookingInProgressEmail] Received data:', JSON.stringify(data, null, 2));
  
  const bookingNumber = data.booking_number || 'N/A';
  const progressPickupStop = getPickupStop(data.stops);
  const location = formatAddress(progressPickupStop);
  const companyName = data.company_name || 'your service provider';
  const driverName = data.driver_given_name || 'Your crew';
  const logoUrl = data.logo_url;
  const timezone = progressPickupStop?.timezone || data.pickup_timezone;
  
  // Format pickup window
  const pickupWindow = formatTimingPreference(
    'SCHEDULED',
    data.pickup_window_start,
    data.pickup_window_end,
    timezone
  );
  
  const subject = `Your service has started – Booking ${bookingNumber}`;
  const preheader = `${driverName} from ${companyName} is on the way.`;

  const bodyContent = `
    <h1>Your service is underway</h1>
    <p>${escapeHtml(driverName)} from ${escapeHtml(companyName)} has started your job and is en route to your location.</p>
    
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="max-width: 120px; height: auto; margin: 16px 0 24px 0; display: block;">` : ''}
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Crew leader</span>
        <span class="detail-value">${escapeHtml(driverName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Company</span>
        <span class="detail-value">${escapeHtml(companyName)}</span>
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
    
    <p>Please ensure access to the service location is available for the crew upon arrival.</p>
    
    <div class="cta">
      <a href="${BASE_URL}/bookings" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View booking</a>
    </div>
  `;

  const textParts = [
    'Your service is underway',
    '',
    `${driverName} from ${companyName} has started your job and is en route to your location.`,
    '',
    `Crew leader: ${driverName}`,
    `Company: ${companyName}`,
    `Booking No.: ${bookingNumber}`,
    `Location: ${location}`,
    `Pickup window: ${pickupWindow}`,
    '',
    'Please ensure access to the service location is available for the crew upon arrival.',
    '',
    `View booking: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this because your service has started.',
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
 * Build booking in progress dropoff email for CUSTOMER
 * Notifies customer that dropoff phase has started (MOVE jobs only)
 */
function buildBookingInProgressDropoffEmail(data) {
  console.log('[buildBookingInProgressDropoffEmail] Received data:', JSON.stringify(data, null, 2));
  
  const bookingNumber = data.booking_number || 'N/A';
  const dropoffStop = getDropoffStop(data.stops) || getPickupStop(data.stops);
  const location = formatAddress(dropoffStop);
  const companyName = data.company_name || 'your service provider';
  const driverName = data.driver_given_name || 'Your crew';
  const logoUrl = data.logo_url;
  const dropoffPickupStop = getPickupStop(data.stops);
  const timezone = dropoffPickupStop?.timezone || data.pickup_timezone;
  
  // Format pickup window
  const pickupWindow = formatTimingPreference(
    'SCHEDULED',
    data.pickup_window_start,
    data.pickup_window_end,
    timezone
  );
  
  const subject = `Dropoff in progress – Booking ${bookingNumber}`;
  const preheader = `${driverName} from ${companyName} is heading to dropoff location.`;

  const bodyContent = `
    <h1>Dropoff in progress</h1>
    <p>${escapeHtml(driverName)} from ${escapeHtml(companyName)} has loaded the items and is now en route to the dropoff location.</p>
    
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="max-width: 120px; height: auto; margin: 16px 0 24px 0; display: block;">` : ''}
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Crew leader</span>
        <span class="detail-value">${escapeHtml(driverName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Company</span>
        <span class="detail-value">${escapeHtml(companyName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Booking No.</span>
        <span class="detail-value">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Dropoff location</span>
        <span class="detail-value">${escapeHtml(location)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service window</span>
        <span class="detail-value">${escapeHtml(pickupWindow)}</span>
      </div>
    </div>
    
    <p>Please ensure access to the dropoff location is available for the crew upon arrival.</p>
    
    <div class="cta">
      <a href="${BASE_URL}/bookings" class="cta-button" style="color:#ffffff !important;text-decoration:none;">View booking</a>
    </div>
  `;

  const textParts = [
    'Dropoff in progress',
    '',
    `${driverName} from ${companyName} has loaded the items and is now en route to the dropoff location.`,
    '',
    `Crew leader: ${driverName}`,
    `Company: ${companyName}`,
    `Booking No.: ${bookingNumber}`,
    `Dropoff location: ${location}`,
    `Service window: ${pickupWindow}`,
    '',
    'Please ensure access to the dropoff location is available for the crew upon arrival.',
    '',
    `View booking: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this because your dropoff is in progress.',
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
 * Build booking rescheduled email for CUSTOMER
 * Notifies customer that the service provider has updated the pickup window
 */
function buildBookingRescheduledEmail(data) {
  console.log('[buildBookingRescheduledEmail] Received data:', JSON.stringify(data, null, 2));
  
  const bookingNumber = data.booking_number || 'N/A';
  const rescheduledPickupStop = getPickupStop(data.stops);
  const location = formatAddress(rescheduledPickupStop);
  const companyName = data.company_name || 'your service provider';
  const logoUrl = data.logo_url;
  const timezone = rescheduledPickupStop?.timezone || data.pickup_timezone;
  
  // Format new pickup window
  const newPickupWindow = formatTimingPreference(
    'SCHEDULED',
    data.pickup_window_start,
    data.pickup_window_end,
    timezone
  );

  // Format previous pickup window if available
  let previousPickupWindow = null;
  if (data.previous_pickup_window_start && data.previous_pickup_window_end) {
    previousPickupWindow = formatTimingPreference(
      'SCHEDULED',
      data.previous_pickup_window_start,
      data.previous_pickup_window_end,
      timezone
    );
  }

  const subject = 'Your booking has been rescheduled';
  const preheader = 'Your service provider has updated the pickup time.';

  const bodyContent = `
    <h1>Your booking has been rescheduled</h1>
    <p>${escapeHtml(companyName)} has updated the pickup time for your booking.</p>
    
    ${logoUrl ? `<img src=\"${escapeHtml(logoUrl)}\" alt=\"${escapeHtml(companyName)}\" style=\"max-width: 120px; height: auto; margin: 16px 0 24px 0; display: block;\">` : ''}
    
    <div style=\"margin: 24px 0;\">
      <div class=\"detail-row\">
        <span class=\"detail-label\">Booking No.</span>
        <span class=\"detail-value\">${escapeHtml(bookingNumber)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Company</span>
        <span class=\"detail-value\">${escapeHtml(companyName)}</span>
      </div>
      <div class=\"detail-row\">
        <span class=\"detail-label\">Location</span>
        <span class=\"detail-value\">${escapeHtml(location)}</span>
      </div>
      ${previousPickupWindow ? `
      <div class=\"detail-row\" style=\"text-decoration: line-through; opacity: 0.6;\">
        <span class=\"detail-label\">Previous pickup</span>
        <span class=\"detail-value\">${escapeHtml(previousPickupWindow)}</span>
      </div>` : ''}
      <div class=\"detail-row\" style=\"font-weight: 500;\">
        <span class=\"detail-label\">New pickup window</span>
        <span class=\"detail-value\">${escapeHtml(newPickupWindow)}</span>
      </div>
    </div>
    
    <p>If you have any questions about the new schedule, please contact ${escapeHtml(companyName)} directly.</p>
    
    <div class=\"cta\">
      <a href=\"${BASE_URL}/bookings\" class=\"cta-button\" style=\"color:#ffffff !important;text-decoration:none;\">View booking</a>
    </div>
  `;

  const textParts = [
    'Your booking has been rescheduled',
    '',
    `${companyName} has updated the pickup time for your booking.`,
    '',
    `Booking No.: ${bookingNumber}`,
    `Company: ${companyName}`,
    `Location: ${location}`,
  ];

  if (previousPickupWindow) {
    textParts.push(`Previous pickup: ${previousPickupWindow}`);
  }
  
  textParts.push(
    `New pickup window: ${newPickupWindow}`,
    '',
    `If you have any questions about the new schedule, please contact ${companyName} directly.`,
    '',
    `View booking: ${BASE_URL}/bookings`,
    '',
    '---',
    'You received this because your booking was rescheduled.',
    `Manage your notification preferences: ${BASE_URL}/user/preferences`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    '',
    `© ${new Date().getFullYear()} Haulwerk, LLC`
  );

  return {
    subject,
    html: buildConsumerTemplate({ subject, preheader, bodyContent }),
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

module.exports = {
  buildServiceProviderTemplate,
  buildConsumerTemplate,
  buildJobPostedEmail,
  buildJobCanceledEmail,
  buildJobClosedEmail,
  buildInstantBookExpiredEmail,
  buildBidCreatedEmail,
  buildBidUpdatedEmail,
  buildBookingCreatedEmail,
  buildBookingAssignedCustomerEmail,
  buildBookingAssignedDriverEmail,
  buildBookingInProgressEmail,
  buildBookingInProgressDropoffEmail,
  buildBookingRescheduledEmail,
  normalizeJobType,
  formatTimingPreference,
  formatAddress,
  getPickupStop,
  getDropoffStop,
  escapeHtml
};
