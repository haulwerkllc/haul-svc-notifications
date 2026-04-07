const NotificationResolver = require('./base');

/**
 * Resolver for haul.payment.authorization_failed events
 *
 * DELIVERY TARGET: CUSTOMER ONLY
 *
 * The customer_id is passed directly in event.context by the billing service
 * when it emits this event from the Stripe webhook consumer.
 *
 * Recipients:
 * - Customer: event.context.customer_id (recipient_type: customer)
 */
class PaymentAuthorizationFailedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.payment.authorization_failed';
  }

  async resolve(event) {
    console.log('[PaymentAuthorizationFailedResolver] Resolving recipients for payment.authorization_failed event', {
      event_id: event.event_id
    });

    const customerId = event.context?.customer_id;

    if (!customerId) {
      console.warn('[PaymentAuthorizationFailedResolver] No customer_id in event context');
      return [];
    }

    console.log('[PaymentAuthorizationFailedResolver] Resolved recipient', {
      customer_id: customerId
    });

    return [
      {
        user_id: customerId,
        metadata: { recipient_type: 'customer' }
      }
    ];
  }
}

module.exports = PaymentAuthorizationFailedResolver;
