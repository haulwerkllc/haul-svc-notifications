const NotificationResolver = require('./base');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const ssmClient = new SSMClient({ region: process.env.REGION });

const BOOKING_TABLE = process.env.BOOKING_TABLE_NAME;
const JOB_TABLE = process.env.JOB_TABLE_NAME;
const COMPANY_TABLE = process.env.COMPANY_TABLE_NAME;
const USER_TABLE = process.env.USER_TABLE_NAME;
const INVOICE_TABLE = process.env.INVOICE_TABLE_NAME;
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL;

// Module-level cache for platform info (5-minute TTL, same pattern as billing service)
let cachedPlatformInfo = null;
let platformInfoCacheExpiry = 0;
const PLATFORM_CACHE_TTL_MS = 5 * 60 * 1000;

async function getPlatformInfo() {
  const now = Date.now();
  if (cachedPlatformInfo && now < platformInfoCacheExpiry) return cachedPlatformInfo;

  try {
    const result = await ssmClient.send(
      new GetParameterCommand({ Name: '/haul/platform/company_info' })
    );
    cachedPlatformInfo = JSON.parse(result.Parameter.Value);
    platformInfoCacheExpiry = now + PLATFORM_CACHE_TTL_MS;
    return cachedPlatformInfo;
  } catch (err) {
    console.error('[PaymentCapturedResolver] Failed to fetch platform info from SSM:', err.message);
    return null;
  }
}

function formatPlatformAddress(address) {
  if (!address) return null;
  const parts = [];
  if (address.line_1) parts.push(address.line_1);
  if (address.line_2) parts.push(address.line_2);
  const cityState = [address.city, address.state].filter(Boolean).join(', ');
  const cityStateZip = [cityState, address.postal_code].filter(Boolean).join(' ');
  if (cityStateZip) parts.push(cityStateZip);
  return parts.join('\n') || null;
}

/**
 * Resolver for haul.payment.captured events
 *
 * DELIVERY TARGET: CUSTOMER ONLY (receipt email)
 *
 * Fetches booking → job → company → invoice → driver to enrich
 * event.context with everything needed to render a full itemized receipt email.
 *
 * Data sourced:
 *   booking: booking_number, job_id, company_id, invoice_id, driver_user_id,
 *            amount_cents, completed_at, created_at, job_type
 *   job:     stops (PICKUP / DROPOFF addresses), owner_user_id
 *   company: name, logo_key
 *   invoice: invoice_number, line_items, trust_fee_pct, trust_fee_cap_cents,
 *            captured_at, captured_amount_cents, payment_method (brand, last4)
 *   driver:  given_name
 *
 * Recipients:
 * - Customer: job.owner_user_id (recipient_type: customer)
 */
class PaymentCapturedResolver extends NotificationResolver {
  getEventType() {
    return 'haul.payment.captured';
  }

  async resolve(event) {
    console.log('[PaymentCapturedResolver] Resolving recipients for payment.captured event', {
      event_id: event.event_id
    });

    const bookingId = event.entity?.id || event.context?.booking_id;

    if (!bookingId) {
      console.warn('[PaymentCapturedResolver] No booking_id found in event');
      return [];
    }

    try {
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        console.warn('[PaymentCapturedResolver] Booking not found', { booking_id: bookingId });
        return [];
      }

      const [job, company, invoice, driver, platformInfo] = await Promise.all([
        this.getJob(booking.job_id),
        this.getCompany(booking.company_id),
        booking.invoice_id ? this.getInvoice(booking.invoice_id) : null,
        booking.driver_user_id ? this.getUser(booking.driver_user_id) : null,
        getPlatformInfo(),
      ]);

      if (!job) {
        console.warn('[PaymentCapturedResolver] Job not found', { booking_id: bookingId, job_id: booking.job_id });
        return [];
      }

      if (!job.owner_user_id) {
        console.warn('[PaymentCapturedResolver] Job has no owner_user_id', { booking_id: bookingId });
        return [];
      }

      const pickupStop = job.stops?.find(s => s.stop_type === 'PICKUP') || job.stops?.[0] || null;

      // Aggregate invoice line items (mirrors aggregateInvoiceLineItems in haul-app)
      let invoiceAggregate = null;
      if (invoice?.line_items) {
        let bookingAmountCents = 0;
        let trustFeeAmountCents = 0;
        let taxAmountCents = 0;
        let tipAmountCents = 0;

        for (const item of invoice.line_items) {
          if (item.reference === 'job') {
            bookingAmountCents += item.amount_cents || 0;
            taxAmountCents += item.amount_tax_cents || 0;
          } else if (item.reference === 'trust_fee') {
            trustFeeAmountCents += item.amount_cents || 0;
            taxAmountCents += item.amount_tax_cents || 0;
          } else if (item.reference === 'tip') {
            tipAmountCents += item.amount_cents || 0;
          }
        }

        invoiceAggregate = {
          booking_amount_cents: bookingAmountCents,
          trust_fee_amount_cents: trustFeeAmountCents,
          tax_amount_cents: taxAmountCents,
          tip_amount_cents: tipAmountCents,
          trust_fee_pct: invoice.trust_fee_pct ?? null,
          trust_fee_cap_cents: invoice.trust_fee_cap_cents ?? null,
          total_cents: bookingAmountCents + trustFeeAmountCents + taxAmountCents + tipAmountCents,
        };
      }

      // Payment method details (card brand + last4)
      let paymentMethod = null;
      if (invoice?.payment_method_type === 'card' && invoice?.payment_method) {
        paymentMethod = {
          brand: invoice.payment_method.brand || invoice.payment_method.display_brand || 'card',
          last4: invoice.payment_method.last4 || null,
          captured_at: invoice.captured_at || null,
          captured_amount_cents: invoice.captured_amount_cents || null,
        };
      }

      event.context = {
        ...event.context,
        booking_id: bookingId,
        booking_number: booking.booking_number,
        job_id: booking.job_id,
        job_type: booking.job_type || job.job_type,
        company_id: booking.company_id,
        company_name: company?.name || null,
        logo_url: company?.logo_key ? `${MEDIA_BASE_URL}/${company.logo_key}` : null,
        amount_cents: booking.amount_cents,
        stops: job.stops,
        pickup_timezone: pickupStop?.timezone || null,
        completed_at: booking.completed_at || null,
        created_at: booking.created_at || null,
        driver_given_name: driver?.given_name || null,
        invoice_number: invoice?.invoice_number || null,
        invoice_aggregate: invoiceAggregate,
        payment_method: paymentMethod,
               platform_legal_name: platformInfo?.legal_name || null,
               platform_address: formatPlatformAddress(platformInfo?.address),
               support_email: platformInfo?.support_email || process.env.SUPPORT_EMAIL || null,
      };

      console.log('[PaymentCapturedResolver] Resolved recipient with full invoice data', {
        booking_id: bookingId,
        customer_id: job.owner_user_id,
        has_invoice: !!invoice,
        has_line_items: !!(invoice?.line_items?.length),
        has_payment_method: !!paymentMethod,
      });

      return [{ user_id: job.owner_user_id, metadata: { recipient_type: 'customer' } }];
    } catch (error) {
      console.error('[PaymentCapturedResolver] Error resolving recipients', {
        booking_id: bookingId,
        error: error.message
      });
      return [];
    }
  }

  async getBooking(bookingId) {
    const result = await docClient.send(new GetCommand({ TableName: BOOKING_TABLE, Key: { id: bookingId } }));
    return result.Item || null;
  }

  async getJob(jobId) {
    if (!jobId) return null;
    const result = await docClient.send(new GetCommand({ TableName: JOB_TABLE, Key: { id: jobId } }));
    return result.Item || null;
  }

  async getCompany(companyId) {
    if (!companyId) return null;
    try {
      const result = await docClient.send(new GetCommand({ TableName: COMPANY_TABLE, Key: { id: companyId } }));
      return result.Item || null;
    } catch (error) {
      console.error('[PaymentCapturedResolver] Error fetching company', { company_id: companyId, error: error.message });
      return null;
    }
  }

  async getInvoice(invoiceId) {
    if (!invoiceId) return null;
    try {
      const result = await docClient.send(new GetCommand({ TableName: INVOICE_TABLE, Key: { id: invoiceId } }));
      return result.Item || null;
    } catch (error) {
      console.error('[PaymentCapturedResolver] Error fetching invoice', { invoice_id: invoiceId, error: error.message });
      return null;
    }
  }

  async getUser(userId) {
    if (!userId) return null;
    try {
      const result = await docClient.send(new GetCommand({ TableName: USER_TABLE, Key: { id: userId } }));
      return result.Item || null;
    } catch (error) {
      console.error('[PaymentCapturedResolver] Error fetching user', { user_id: userId, error: error.message });
      return null;
    }
  }
}

module.exports = PaymentCapturedResolver;
