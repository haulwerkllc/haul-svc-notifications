/**
 * Slack Webhook Notifier
 * 
 * Reusable client for posting notifications to Slack via Incoming Webhooks.
 * Supports Slack Block Kit formatted messages.
 */

const https = require('https');

/**
 * Post a message to Slack via webhook
 * @param {Object} payload - Slack Block Kit payload (must include 'blocks' or 'text')
 * @returns {Promise<void>}
 * @throws {Error} If webhook URL is not configured or POST fails
 */
async function postToSlack(payload) {
  const webhookUrl = process.env.SLACK_NOTIFICATIONS_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('SLACK_NOTIFICATIONS_WEBHOOK_URL not configured');
  }

  const url = new URL(webhookUrl);
  const postData = JSON.stringify(payload);

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: responseData });
        } else {
          reject(new Error(`Slack webhook failed: HTTP ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Slack webhook request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {
  postToSlack
};
