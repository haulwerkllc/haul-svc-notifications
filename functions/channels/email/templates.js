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
      ${footerNote ? `<p style="margin: 0 0 12px 0;">${footerNote}</p>` : ''}
      <p style="margin: 0 0 8px 0;">You received this because you have a service area that matches this job location. 
        Please visit the Haul Dispatcher Portal to update your <a href="${DISPATCHER_BASE_URL}/dashboard/profile/notifications">notification preferences</a>· 
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
      <p style="margin: 0 0 8px 0;">You received this because you have an account action that requires your attention at Haul. 
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
    'MOVE_SMALL': 'small-medium moving'
  };
  return map[jobType] || jobType?.toLowerCase().replace(/_/g, ' ') || 'hauling';
}

/**
 * Normalize property type to init caps
 */
function normalizePropertyType(propertyType) {
  if (!propertyType) return 'Property';
  return propertyType
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format timing preference for display
 */
function formatTimingPreference(timingPreference, preferredPickupWindowStart, preferredPickupWindowEnd) {
  if (timingPreference === 'FLEXIBLE') {
    return 'Flexible';
  }
  
  if (timingPreference === 'SCHEDULED' && preferredPickupWindowStart && preferredPickupWindowEnd) {
    const startDate = new Date(preferredPickupWindowStart);
    const endDate = new Date(preferredPickupWindowEnd);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    };
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };
    
    // If same day, show date once
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${formatDate(startDate)}, ${formatTime(startDate)} - ${formatTime(endDate)}`;
    }
    
    return `${formatDate(startDate)} ${formatTime(startDate)} - ${formatDate(endDate)} ${formatTime(endDate)}`;
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
 * Format address for display
 */
function formatAddress(address) {
  if (typeof address === 'string') return address;
  if (!address) return 'Location not specified';
  
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zip) parts.push(address.zip);
  
  return parts.length > 0 ? parts.join(', ') : 'Location not specified';
}

/**
 * Build job posted email for service providers
 */
function buildJobPostedEmail(jobData) {
  const jobType = normalizeJobType(jobData.job_type);
  const propertyType = normalizePropertyType(jobData.property_type);
  const timing = formatTimingPreference(
    jobData.timing_preference,
    jobData.preferred_pickup_window_start,
    jobData.preferred_pickup_window_end
  );
  const location = formatAddress(jobData.service_address);
  const timezone = jobData.service_location_timezone;
  const biddingClosesAt = jobData.bidding_closes_at ? formatBiddingDeadline(jobData.bidding_closes_at, timezone) : null;
  
  const subject = `New ${jobType} job available`;
  const preheader = `${propertyType} in your service area`;
  
  const bodyContent = `
    <h1>New job posted – submit your bid</h1>
    <p>A ${jobType} job is ready for bids in your service area.</p>
    
    <div style="margin: 24px 0;">
      <div class="detail-row">
        <span class="detail-label">Type</span>
        <span class="detail-value">${escapeHtml(propertyType)}</span>
      </div>
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
    
    ${biddingClosesAt ? `<p>This job is open for bids until ${escapeHtml(biddingClosesAt)}.</p>` : ''}
    
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
    `Type: ${propertyType}`,
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
  const timezone = data.service_location_timezone;
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
  const timezone = data.service_location_timezone;
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
  buildBidCreatedEmail,
  buildBidUpdatedEmail,
  normalizeJobType,
  normalizePropertyType,
  formatTimingPreference,
  formatAddress,
  escapeHtml
};
