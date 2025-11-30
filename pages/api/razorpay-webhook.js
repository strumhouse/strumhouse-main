import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing, we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const EVENT_STATUS_MAP = {
  'payment.captured': { payment: 'captured', booking: 'paid', confirmBooking: true },
  'payment.failed': { payment: 'failed', booking: 'failed' },
  'refund.processed': { payment: 'refunded', booking: 'refunded' },
};

/**
 * Logs a webhook event to the database for idempotency
 */
async function logEvent(eventId, eventType, status, details = {}) {
  if (!eventId) {
    console.log('[Webhook] Missing event ID, skipping deduplication');
    return { id: null };
  }

  try {
    const { data, error } = await supabase
      .from('webhook_logs')
      .insert({
        event_id: eventId,
        event_type: eventType,
        status: status,
        details: details,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        console.log(`[Webhook] Event already processed: ${eventId}`);
        return { alreadyProcessed: true };
      }
      throw error;
    }

    return { id: data.id };
  } catch (error) {
    console.error('[Webhook] Error logging event:', error);
    throw error;
  }
}

/**
 * Updates booking and payment statuses in a single transaction
 */
async function updateBookingAndPayment(orderId, paymentId, statuses) {
  const { payment, booking, confirmBooking } = statuses;
  const timestamp = new Date().toISOString();

  // Start a transaction
  const { data, error } = await supabase.rpc('update_booking_payment_status', {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_payment_status: payment,
    p_booking_status: booking,
    p_confirm_booking: confirmBooking || false,
    p_updated_at: timestamp
  });

  if (error) {
    console.error('[Webhook] Database error:', error);
    throw error;
  }

  return data;
}

/**
 * Webhook handler for Razorpay events
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get raw body for signature verification
  const rawBody = await getRawBody(req);
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('[Webhook] Missing signature or webhook secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('[Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const event = JSON.parse(rawBody);
    const { event: eventType, payload } = event;
    const { payment, order_id } = payload.payment?.entity || {};
    const orderId = order_id || payload.subscription?.entity?.notes?.order_id;
    const paymentId = payment?.id || payload.payment?.entity?.id;

    console.log(`[Webhook] Received event: ${eventType}`, { orderId, paymentId });

    // Log the event for idempotency
    const { alreadyProcessed } = await logEvent(
      payload.webhook_id || paymentId,
      eventType,
      'received',
      { order_id: orderId, payment_id: paymentId }
    );

    if (alreadyProcessed) {
      console.log(`[Webhook] Event already processed, skipping`);
      return res.status(200).json({ status: 'success', message: 'Event already processed' });
    }

    // Handle the event based on its type
    const statuses = EVENT_STATUS_MAP[eventType];
    if (!statuses) {
      console.log(`[Webhook] Unhandled event type: ${eventType}`);
      return res.status(200).json({ status: 'success', message: 'Event type not handled' });
    }

    // Update booking and payment statuses
    if (orderId || paymentId) {
      await updateBookingAndPayment(orderId, paymentId, statuses);
      console.log(`[Webhook] Successfully processed ${eventType} for order ${orderId}`);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
}

/**
 * Helper function to get raw request body
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => resolve(Buffer.concat(data).toString('utf8')));
    req.on('error', reject);
  });
}
