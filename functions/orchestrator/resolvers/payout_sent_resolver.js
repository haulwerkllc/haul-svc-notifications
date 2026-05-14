const NotificationResolver = require('./base');
const { resolveUsersByCompanyRole } = require('../../../utils/company-role-lookup');

const ELIGIBLE_ROLES = ['OWNER', 'ADMIN'];

/**
 * Resolver for haul.payout.sent events
 *
 * DELIVERY TARGET: SERVICE PROVIDER USERS (OWNER/ADMIN)
 *
 * The company_id is passed directly in event.context by the billing service
 * when it emits this event from the Stripe payout.paid webhook.
 *
 * Recipients:
 * - Company OWNER and ADMIN users (recipient_type: provider)
 */
class PayoutSentResolver extends NotificationResolver {
  getEventType() {
    return 'haul.payout.sent';
  }

  async resolve(event) {
    console.log('[PayoutSentResolver] Resolving recipients for payout.sent event', {
      event_id: event.event_id
    });

    const companyId = event.context?.company_id;

    if (!companyId) {
      console.warn('[PayoutSentResolver] No company_id in event context');
      return [];
    }

    try {
      const providerUsers = await resolveUsersByCompanyRole({
        companyIds: companyId,
        eligibleRoles: ELIGIBLE_ROLES,
        includeMetadata: false,
        logPrefix: 'PayoutSentResolver'
      });

      const recipients = providerUsers.map(u => ({
        user_id: u.user_id,
        metadata: { recipient_type: 'provider', company_id: companyId }
      }));

      console.log('[PayoutSentResolver] Resolved recipients', {
        company_id: companyId,
        recipient_count: recipients.length
      });

      return recipients;
    } catch (error) {
      console.error('[PayoutSentResolver] Error resolving recipients', {
        company_id: companyId,
        error: error.message
      });
      return [];
    }
  }
}

module.exports = PayoutSentResolver;
