/**
 * Send email-change notification to the old email address.
 * Triggered by EventBridge when haul.user / email.changed event is emitted.
 *
 * Event detail: { user_id, old_email, new_email }
 */

const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const { buildEmailChangedNotification } = require('../channels/email/templates');

const sesClient = new SESv2Client({ region: process.env.REGION });
const FROM_ADDRESS = process.env.SES_FROM_ADDRESS;

exports.handler = async (event) => {
  let detail = event.detail || {};
  if (typeof detail === 'string') {
    try {
      detail = JSON.parse(detail);
    } catch (e) {
      console.warn('[EmailChanged] Invalid detail JSON', { error: e.message });
      return;
    }
  }
  const { user_id: userId, old_email: oldEmail, new_email: newEmail } = detail;

  if (!oldEmail || !newEmail) {
    console.warn('[EmailChanged] Missing old_email or new_email in event detail', { userId });
    return;
  }

  try {
    const { subject, html, text } = buildEmailChangedNotification({
      oldEmail: String(oldEmail),
      newEmail: String(newEmail),
    });

    await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: `Haul <${FROM_ADDRESS}>`,
        Destination: {
          ToAddresses: [String(oldEmail)],
        },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: html, Charset: 'UTF-8' },
              Text: { Data: text, Charset: 'UTF-8' },
            },
          },
        },
      })
    );

    console.log('[EmailChanged] Notification sent to old email', { userId, oldEmail, newEmail });
  } catch (error) {
    console.error('[EmailChanged] Failed to send notification', {
      userId,
      oldEmail,
      newEmail,
      error: error.message,
    });
    throw error;
  }
};
