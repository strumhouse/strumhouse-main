import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const EVENT_STATUS_MAP = {
  'payment.captured': { payment: 'captured', booking: 'paid', confirmBooking: true },
  'payment.failed': { payment: 'failed', booking: 'failed' },
  'refund.processed': { payment: 'refunded', booking: 'refunded' },
};

async function rawBody(req) {
  return new Promise(resolve => {
    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function logEvent(id) {
  if (!id) {
    console.warn("[Webhook] Event ID missing; skipping dedupe protection");
    return { duplicate: false };
  }

  const { error } = await supabase
    .from('webhook_logs')
    .insert({ event_id: id });

  if (error && error.code === "23505") {
    return { duplicate: true };
  }
  return { duplicate: false };
}

async function updateRecords(paymentRecord, updateSet) {
  if (!paymentRecord) return;

  const timestamp = new Date().toISOString();

  await supabase
    .from('payments')
    .update({
      status: updateSet.payment,
      razorpay_payment_id: updateSet.razorpayPaymentId,
      updated_at: timestamp
    })
    .eq('id', paymentRecord.id);

  await supabase
    .from('bookings')
    .update({
      payment_status: updateSet.booking,
      status: updateSet.confirmBooking ? 'confirmed' : undefined,
      updated_at: timestamp
    })
    .eq('id', paymentRecord.booking_id);

  console.log("[Webhook] DB updated successfully");
}

async function processPayment(entity, type) {
  if (!entity || !entity.order_id) return;

  const { data: record } = await supabase
    .from('payments')
    .select('id, booking_id, status')
    .eq('razorpay_order_id', entity.order_id)
    .maybeSingle();

  if (!record) return;

  if (record.status === type.payment) return; 

  await updateRecords(record, {
    payment: type.payment,
    booking: type.booking,
    confirmBooking: type.confirmBooking,
    razorpayPaymentId: entity.id
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const raw = await rawBody(req);
  const signature = req.headers['x-razorpay-signature'];

  const expected = crypto
    .createHmac('sha256', secret)
    .update(raw)
    .digest('hex');

  if (signature !== expected) {
    console.error("[Webhook] Signature mismatch!");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const payload = JSON.parse(raw.toString());
  const eventId = payload.id;
  const eventType = payload.event;

  console.log(`Webhook: ${eventType} | ID: ${eventId}`);

  // Respond immediately once verified 🚀 (Razorpay requires fast response)
  res.status(200).json({ status: "received" });

  const { duplicate } = await logEvent(eventId);
  if (duplicate) return console.log("[Webhook] Duplicate ignored");

  const entity = payload?.payload?.payment?.entity;
  const typeMap = EVENT_STATUS_MAP[eventType];

  if (typeMap) {
    await processPayment(entity, typeMap);
  } else {
    console.log("[Webhook] Ignored Event:", eventType);
  }
}
