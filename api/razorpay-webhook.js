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

// Parse raw body for signature verification
async function parseRawBody(req, res) {
  return new Promise((resolve, reject) => {
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => resolve(Buffer.concat(data)));
    req.on('error', err => reject(err));
  });
}

// Log webhook event to prevent duplicates
async function logWebhookEvent(eventId) {
  const { error } = await supabase
    .from('webhook_logs')
    .insert({ event_id: eventId });

  if (error && (error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate')))) {
    return { duplicate: true };
  } else if (error) {
    throw error;
  }

  return { duplicate: false };
}

// Update payments and bookings
async function updatePaymentAndBooking(paymentRecord, updates) {
  if (!paymentRecord) return;

  const timestamp = new Date().toISOString();

  const paymentUpdate = {
    status: updates.paymentStatus,
    updated_at: timestamp,
  };

  if (updates.razorpayPaymentId) paymentUpdate.razorpay_payment_id = updates.razorpayPaymentId;

  const { error: paymentError } = await supabase
    .from('payments')
    .update(paymentUpdate)
    .eq('id', paymentRecord.id);

  if (paymentError) console.error('[Webhook] Payment update error:', paymentError);

  const bookingUpdate = {
    payment_status: updates.bookingStatus,
    updated_at: timestamp,
  };

  if (updates.confirmBooking) bookingUpdate.status = 'confirmed';

  const { error: bookingError } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', paymentRecord.booking_id);

  if (bookingError) console.error('[Webhook] Booking update error:', bookingError);
}

// Handle payment event
async function handlePaymentEvent(paymentEntity, targetStatuses) {
  if (!paymentEntity) {
    console.error('[Webhook] Missing payment entity in payload');
    return;
  }

  console.log(`[Webhook] Processing payment event for order: ${paymentEntity.order_id}, status: ${targetStatuses.payment}`);

  // Find the payment record by Razorpay order ID
  const { data: paymentRecord, error: paymentError } = await supabase
    .from('payments')
    .select('id, booking_id, status')
    .eq('razorpay_order_id', paymentEntity.order_id)
    .maybeSingle();

  if (paymentError) {
    console.error('[Webhook] Error fetching payment record:', paymentError);
    return;
  }

  if (!paymentRecord) {
    console.warn('[Webhook] No payment record found for order:', paymentEntity.order_id);
    return;
  }

  // Skip if payment is already in the target state
  if (paymentRecord.status === targetStatuses.payment) {
    console.log(`[Webhook] Payment ${paymentRecord.id} already in state: ${targetStatuses.payment}`);
    return;
  }

  // Update payment status
  const { error: updatePaymentError } = await supabase
    .from('payments')
    .update({
      status: targetStatuses.payment,
      razorpay_payment_id: paymentEntity.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentRecord.id);

  if (updatePaymentError) {
    console.error('[Webhook] Error updating payment status:', updatePaymentError);
    return;
  }

  // Update booking status based on payment status
  const bookingUpdate = {
    payment_status: targetStatuses.payment === 'captured' ? 'paid' : targetStatuses.payment,
    updated_at: new Date().toISOString()
  };

  // Only update booking status to confirmed for successful payments
  if (targetStatuses.payment === 'captured') {
    bookingUpdate.status = 'confirmed';
  }

  const { error: updateBookingError } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', paymentRecord.booking_id);

  if (updateBookingError) {
    console.error('[Webhook] Error updating booking status:', updateBookingError);
  } else {
    console.log(`[Webhook] Updated booking ${paymentRecord.booking_id} with:`, bookingUpdate);
  }
}

// Handle refund event
async function handleRefundEvent(refundEntity) {
  if (!refundEntity) return;

  let paymentRecord = null;

  if (refundEntity.order_id) {
    const { data } = await supabase
      .from('payments')
      .select('id, booking_id')
      .eq('razorpay_order_id', refundEntity.order_id)
      .maybeSingle();
    paymentRecord = data;
  }

  if (!paymentRecord && refundEntity.payment_id) {
    const { data } = await supabase
      .from('payments')
      .select('id, booking_id')
      .eq('razorpay_payment_id', refundEntity.payment_id)
      .maybeSingle();
    paymentRecord = data;
  }

  if (!paymentRecord) {
    console.warn('[Webhook] Refund received but no payment record found');
    return;
  }

  await updatePaymentAndBooking(paymentRecord, {
    paymentStatus: EVENT_STATUS_MAP['refund.processed'].payment,
    bookingStatus: EVENT_STATUS_MAP['refund.processed'].booking,
  });
}

// Process any Razorpay event
async function processWebhookEvent(eventPayload) {
  const eventId = eventPayload?.id;
  const eventType = eventPayload?.event;

  if (!eventId || !eventType) return;

  try {
    const { duplicate } = await logWebhookEvent(eventId);
    if (duplicate) return console.log(`[Webhook] Duplicate event ${eventId} skipped.`);
  } catch (err) {
    console.error('[Webhook] Logging error:', err);
    return;
  }

  try {
    if (eventType === 'refund.processed') {
      await handleRefundEvent(eventPayload?.payload?.refund?.entity);
    } else if (eventType === 'payment.captured' || eventType === 'payment.failed') {
      await handlePaymentEvent(eventPayload?.payload?.payment?.entity, EVENT_STATUS_MAP[eventType]);
    } else {
      console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error(`[Webhook] Error processing event ${eventId}:`, err);
  }
}

// Main API handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

  try {
    const rawBody = await parseRawBody(req, res);
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing signature header' });

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) return res.status(400).json({ error: 'Invalid signature' });

    const eventPayload = JSON.parse(rawBody.toString('utf8'));

    // Acknowledge immediately to Razorpay
    res.status(200).json({ status: 'ok' });

    // Async processing
    processWebhookEvent(eventPayload).catch(err => {
      console.error('[Webhook] Unexpected async error:', err);
    });
  } catch (err) {
    console.error('[Webhook] Failed to process request:', err);
    if (!res.headersSent) return res.status(500).json({ error: 'Internal server error' });
  }
}
