import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

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

async function rawBody(req) {
  return new Promise((resolve, reject) => {
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => resolve(Buffer.concat(data)));
    req.on('error', err => reject(err));
  });
}

async function logEvent(eventId, eventType, status, details = {}) {
  if (!eventId) {
    console.warn('[Webhook] Missing event ID, skipping deduplication');
    return { duplicate: false };
  }

  const logEntry = {
    event_id: eventId,
    event_type: eventType,
    status,
    details: JSON.stringify(details),
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('webhook_logs')
    .insert(logEntry);

  if (error && error.code === '23505') {
    console.log(`[Webhook] Duplicate event ${eventId} skipped`);
    return { duplicate: true };
  } else if (error) {
    console.error('[Webhook] Error logging event:', error);
    return { duplicate: false, error };
  }

  console.log(`[Webhook] Logged event ${eventId} (${eventType})`);
  return { duplicate: false };
}

async function updateBookingAndPayment(orderId, paymentId, statuses) {
  const timestamp = new Date().toISOString();
  
  // Update payment status first
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      status: statuses.payment,
      razorpay_payment_id: paymentId || undefined,
      updated_at: timestamp
    })
    .eq('razorpay_order_id', orderId)
    .select('id, booking_id')
    .single();

  if (paymentError) {
    console.error('[Webhook] Payment update error:', paymentError);
    throw new Error(`Payment update failed: ${paymentError.message}`);
  }

  if (!payment) {
    console.warn(`[Webhook] No payment found for order: ${orderId}`);
    return false;
  }

  // Update booking status if payment was successful
  if (statuses.confirmBooking) {
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: timestamp
      })
      .eq('id', payment.booking_id);

    if (bookingError) {
      console.error('[Webhook] Booking update error:', bookingError);
      throw new Error(`Booking update failed: ${bookingError.message}`);
    }
  }

  console.log(`[Webhook] Successfully updated payment ${payment.id} and booking ${payment.booking_id}`);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const raw = await rawBody(req);
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.parse(raw.toString());

    // Log the incoming webhook
    console.log('[Webhook] Received event:', {
      event: payload.event,
      id: payload.id,
      entity: payload.payload?.payment?.entity?.id
    });

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(raw)
      .digest('hex');

    if (signature !== expectedSignature) {
      await logEvent(payload.id, payload.event, 'signature_mismatch', {
        received: signature,
        expected: expectedSignature
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Acknowledge webhook immediately
    res.status(200).json({ status: 'received' });

    const { id: eventId, event: eventType, payload: eventPayload } = payload;
    const entity = eventPayload?.payment?.entity || eventPayload?.refund?.entity;

    // Check for duplicate event
    const { duplicate } = await logEvent(eventId, eventType, 'received');
    if (duplicate) return;

    // Process the event
    const statuses = EVENT_STATUS_MAP[eventType];
    if (!statuses) {
      console.log(`[Webhook] Unhandled event type: ${eventType}`);
      return;
    }

    if (!entity?.order_id) {
      console.error('[Webhook] Missing order_id in payload');
      return;
    }

    await updateBookingAndPayment(
      entity.order_id,
      entity.id,
      statuses
    );

    console.log(`[Webhook] Successfully processed ${eventType} for order ${entity.order_id}`);
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
