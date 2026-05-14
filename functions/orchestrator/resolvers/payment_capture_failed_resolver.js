const NotificationResolver = require('./base');

/**
 * Resolver for haul.payment.capture_failed events
 *
 * DELIVERY TARGET: CUSTOMER ONLY
 *
 * The customer_user_id is passed directly in event.context by the billing
 * service when an invoice hits CAPTURE_FAILED_FINAL.
 *
 * Recipients:
 * - Customer: event.context.customer_user_id (recipient_type: customer)
 */
class PaymentCaptureFailedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.payment.capture_failed';
  }

  async resolve(event) {
    console.log('[PaymentCaptureFailedResolver] Resolving recipients for payment.capture_failed event', {
      event_id: event.event_id,
    });

    const customerUserId = event.context?.customer_user_id;

    if (!customerUserId) {
      console.warn('[PaymentCaptureFailedResolver] No customer_user_id in event context');
      return [];
    }

    return [
      {
        user_id: customerUserId,
        metadata: { recipient_type: 'customer' },
      },
    ];
  }
}

module.exports = PaymentCaptureFailedResolver;
