/**
 * Email template preview generator
 * 
 * Usage:
 *   node functions/channels/email/preview-templates.js
 * 
 * Outputs HTML files to /tmp for manual review
 */

const fs = require('fs');
const path = require('path');
const { buildJobPostedEmail } = require('./templates');

// Set required env vars for template rendering
process.env.SUPPORT_EMAIL = 'support@haulwerk.com';

// Sample job data for preview
const sampleJobData = {
  job_type: 'JUNK_REMOVAL',
  timing_preference: 'SCHEDULED',
  preferred_pickup_window_start: '2026-01-10T14:00:00Z',
  preferred_pickup_window_end: '2026-01-10T16:00:00Z',
  stops: [
    {
      stop_type: 'PICKUP',
      order: 0,
      display_name: 'Office Depot',
      line_1: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postal_code: '90012',
      country: 'USA',
      lat: 34.0522,
      lon: -118.2437,
      timezone: 'America/Los_Angeles'
    }
  ],
  description: 'Need to remove old furniture from garage. Includes 2 couches, 1 coffee table, and misc boxes. Must be able to navigate narrow driveway.'
};

const sampleJobDataFlexible = {
  job_type: 'MOVING',
  timing_preference: 'FLEXIBLE',
  stops: [
    {
      stop_type: 'PICKUP',
      order: 0,
      line_1: '456 Oak Ave',
      city: 'Santa Monica',
      state: 'CA',
      postal_code: '90401',
      country: 'US',
      lat: 34.0195,
      lon: -118.4912,
      timezone: 'America/Los_Angeles'
    },
    {
      stop_type: 'DROPOFF',
      order: 1,
      line_1: '789 Elm St',
      city: 'Santa Monica',
      state: 'CA',
      postal_code: '90401',
      country: 'US',
      lat: 34.0201,
      lon: -118.4950,
      timezone: 'America/Los_Angeles'
    }
  ],
  description: 'Small 1-bedroom apartment move within same building, 2nd floor to 3rd floor. Mostly boxes and small furniture.'
};

// Generate previews
console.log('Generating email template previews...\n');

const preview1 = buildJobPostedEmail(sampleJobData);
const preview2 = buildJobPostedEmail(sampleJobDataFlexible);

// Write to /tmp
const outputDir = '/tmp/haul-email-previews';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'job-posted-scheduled.html'),
  preview1.html
);

fs.writeFileSync(
  path.join(outputDir, 'job-posted-flexible.html'),
  preview2.html
);

console.log('✓ Generated previews:');
console.log(`  ${outputDir}/job-posted-scheduled.html`);
console.log(`  ${outputDir}/job-posted-flexible.html`);
console.log('\nSubject lines:');
console.log(`  1: "${preview1.subject}"`);
console.log(`  2: "${preview2.subject}"`);
console.log('\nOpen these files in a browser to review.');
