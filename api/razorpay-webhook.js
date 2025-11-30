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

async function parseRawBody(req, res) {
  return new Promise((resolve, reject) => {
    console.log("[Webhook] Parsing raw body...");
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => resolve(Buffer.concat(data)));
    req.on('error', err => reject(err));
  });
}

async function logWebhookEvent(eventId) {
  console.log(`[Webhook] Logging event ID: ${eventId}`);
  const { error } = await supabase
    .from('webhook_logs')
    .insert({ event_id: eventId });

  if (error) {
    console.error("[Webhook] Event Logging Error:", error);
    if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate')) {
      console.warn("[Webhook] Duplicate event detected:", eventId);
      return { duplicate: true };
    }
    throw error;
  }

  return { duplicate: false };
}

async function updatePaymentAndBooking(paymentRecord, updates) {
  console.log("[Webhook] Updating payment + booking linked to:", paymentRecord);

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

  if (paymentError) console.error("[Webhook] Payment update error:", paymentError);
  else console.log("[Webhook] Payment updated successfully:", paymentUpdate);

  const bookingUpdate = {
    payment_status: updates.bookingStatus,
    updated_at: timestamp,
  };

  if (updates.confirmBooking) bookingUpdate.status = 'confirmed';

  const { error: bookingError } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', paymentRecord.booking_id);

  if (bookingError) console.error("[Webhook] Booking update error:", bookingError);
  else console.log("[Webhook] Booking updated successfully:", bookingUpdate);
}

async function handlePaymentEvent(paymentEntity, targetStatus) {
  console.log("[Webhook] Payment entity received:", paymentEntity);

  if (!paymentEntity) {
    console.error('[Webhook] Missing payment entity in payload');
    return;
  }

  const orderId = paymentEntity.order_id;
  console.log(`[Webhook] Searching payment record for order: ${orderId}`);

  const { data: paymentRecord, error } = await supabase
    .from('payments')
    .select('id, booking_id, status')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (error) {
    console.error("[Webhook] DB fetch error:", error);
    return;
  }

  if (!paymentRecord) {
    console.warn("[Webhook] No payment record found — NEW order?");
    return;
  }

  console.log("[Webhook] Found payment record:", paymentRecord);

  if (paymentRecord.status === targetStatus.payment) {
    console.log("[Webhook] Payment already in required state. Skip.");
    return;
  }

  await updatePaymentAndBooking(paymentRecord, {
    paymentStatus: targetStatus.payment,
    bookingStatus: targetStatus.booking,
    confirmBooking: !!targetStatus.confirmBooking,
    razorpayPaymentId: paymentEntity.id
  });
}

async function handleRefundEvent(refundEntity) {
  console.log("[Webhook] Refund entity received:", refundEntity);
  if (!refundEntity) return;

  let paymentRecord;

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
    console.warn('[Webhook] Refund event received but no record found.');
    return;
  }

  await updatePaymentAndBooking(paymentRecord, EVENT_STATUS_MAP['refund.processed']);
}

async function processWebhookEvent(eventPayload) {
  console.log("[Webhook] Full Payload:", JSON.stringify(eventPayload, null, 2));

  const eventId = eventPayload?.id;
  const eventType = eventPayload?.event;

  console.log(`[Webhook] Event: ${eventType}, ID: ${eventId}`);

  const { duplicate } = await logWebhookEvent(eventId);
  if (duplicate) return;

  if (eventType === 'payment.captured' || eventType === 'payment.failed') {
    await handlePaymentEvent(eventPayload?.payload?.payment?.entity, EVENT_STATUS_MAP[eventType]);
  } else if (eventType === 'refund.processed') {
    await handleRefundEvent(eventPayload?.payload?.refund?.entity);
  } else {
    console.log("[Webhook] Unhandled Event:", eventType);
  }
}

export default async function handler(req, res) {
  console.log(`[Webhook] Incoming request → ${req.method}`);

  if (req.method !== 'POST') {
    console.warn("[Webhook] Rejecting non-POST request");
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  console.log("[Webhook] Secret loaded:", !!webhookSecret);

  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret missing' });

  try {
    const rawBody = await parseRawBody(req, res);
    const signature = req.headers['x-razorpay-signature'];

    console.log("[Webhook] Signature received:", signature);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    console.log("[Webhook] Expected Signature:", expectedSignature);

    if (signature !== expectedSignature) {
      console.error("[Webhook] Signature mismatch!");
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const eventPayload = JSON.parse(rawBody.toString('utf8'));

    res.status(200).json({ status: 'ok' });
    console.log("[Webhook] Accepted → Now processing async");

    processWebhookEvent(eventPayload).catch(err => {
      console.error("[Webhook] Async Processing Error:", err);
    });

  } catch (err) {
    console.error("[Webhook] Failure:", err);
    if (!res.headersSent) return res.status(500).json({ error: 'Internal error' });
  }
}
