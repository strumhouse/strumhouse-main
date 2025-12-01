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

// Robust update function that creates the row if missing (Self-Healing)
async function updateBookingAndPayment(orderId, paymentId, statuses, bookingIdFromNotes, amountInPaise) {
  const timestamp = new Date().toISOString();
  
  // 1. Prepare data for UPSERT (Insert if new, Update if exists)
  const paymentData = {
    razorpay_order_id: orderId,
    status: statuses.payment,
    razorpay_payment_id: paymentId || undefined,
    updated_at: timestamp,
    // Fields below are only used if we are inserting a NEW row (recovery mode)
    ...(bookingIdFromNotes && { booking_id: bookingIdFromNotes }),
    ...(amountInPaise && { amount: amountInPaise / 100 }) 
  };

  // 2. Execute Upsert
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .upsert(paymentData, { 
      onConflict: 'razorpay_order_id' 
    })
    .select('id, booking_id')
    .single();

  if (paymentError) {
    console.error('[Webhook] Payment upsert error:', paymentError);
    throw new Error(`Payment upsert failed: ${paymentError.message}`);
  }

  // 3. Update Booking Status (if we have a valid booking_id)
  const targetBookingId = payment?.booking_id || bookingIdFromNotes;

  if (targetBookingId && statuses.confirmBooking) {
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: timestamp
      })
      .eq('id', targetBookingId);

    if (bookingError) {
      console.error('[Webhook] Booking update error:', bookingError);
      throw new Error(`Booking update failed: ${bookingError.message}`);
    }
  }

  console.log(`[Webhook] Successfully synced payment ${payment.id} and booking ${targetBookingId}`);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('Webhook secret not configured');

    const raw = await rawBody(req);
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.parse(raw.toString());

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(raw)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Acknowledge immediately
    res.status(200).json({ status: 'received' });

    const { event: eventType, payload: eventPayload } = payload;
    const entity = eventPayload?.payment?.entity || eventPayload?.refund?.entity;

    const statuses = EVENT_STATUS_MAP[eventType];
    if (!statuses || !entity?.order_id) return; // Ignore unhandled events

    // Extract booking_id from notes (The Safety Net)
    const bookingId = entity.notes?.booking_id;

    await updateBookingAndPayment(
      entity.order_id,
      entity.id,
      statuses,
      bookingId,
      entity.amount
    );

  } catch (error) {
    console.error('[Webhook] Error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal Error' });
  }
}