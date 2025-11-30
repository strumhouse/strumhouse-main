import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const rawJsonParser = express.raw({ type: 'application/json' });

export const config = {
  api: {
    bodyParser: false
  }
};

const EVENT_STATUS_MAP = {
  'payment.captured': { payment: 'captured', booking: 'paid' },
  'payment.failed': { payment: 'failed', booking: 'failed' },
  'refund.processed': { payment: 'refunded', booking: 'refunded' }
};

async function parseRawBody(req, res) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  await new Promise((resolve, reject) => {
    rawJsonParser(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(null);
    });
  });

  return Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
}

async function logWebhookEvent(eventId) {
  const { error } = await supabase
    .from('webhook_logs')
    .insert({ event_id: eventId });

  if (error) {
    if (error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate'))) {
      return { duplicate: true };
    }
    throw error;
  }

  return { duplicate: false };
}

async function getPaymentRecordByOrderId(orderId) {
  if (!orderId) {
    console.error('[Webhook] Missing Razorpay order_id in payload');
    return null;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('id, booking_id, razorpay_order_id, razorpay_payment_id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (error) {
    console.error(`[Webhook] Error fetching payment for order ${orderId}:`, error);
    return null;
  }

  if (!data) {
    console.warn(`[Webhook] No payment record found for order ${orderId}`);
  }

  return data;
}

async function getPaymentRecordByPaymentId(paymentId) {
  if (!paymentId) {
    return null;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('id, booking_id, razorpay_order_id, razorpay_payment_id')
    .eq('razorpay_payment_id', paymentId)
    .maybeSingle();

  if (error) {
    console.error(`[Webhook] Error fetching payment for payment_id ${paymentId}:`, error);
    return null;
  }

  return data;
}

async function updatePaymentAndBooking(paymentRecord, updates) {
  if (!paymentRecord) {
    return;
  }

  const timestamp = new Date().toISOString();

  const paymentUpdate = {
    status: updates.paymentStatus,
    updated_at: timestamp
  };

  if (updates.razorpayPaymentId) {
    paymentUpdate.razorpay_payment_id = updates.razorpayPaymentId;
  }

  const { error: paymentUpdateError } = await supabase
    .from('payments')
    .update(paymentUpdate)
    .eq('id', paymentRecord.id);

  if (paymentUpdateError) {
    console.error('[Webhook] Failed to update payment record:', paymentUpdateError);
    return;
  }

  const { error: bookingUpdateError } = await supabase
    .from('bookings')
    .update({ payment_status: updates.bookingStatus, updated_at: timestamp })
    .eq('id', paymentRecord.booking_id);

  if (bookingUpdateError) {
    console.error('[Webhook] Failed to update booking payment status:', bookingUpdateError);
  }
}

async function handlePaymentEvent(paymentEntity, targetStatuses) {
  if (!paymentEntity) {
    console.error('[Webhook] Missing payment entity in payload');
    return;
  }

  const paymentRecord = await getPaymentRecordByOrderId(paymentEntity.order_id);

  if (!paymentRecord) {
    return;
  }

  await updatePaymentAndBooking(paymentRecord, {
    paymentStatus: targetStatuses.payment,
    bookingStatus: targetStatuses.booking,
    razorpayPaymentId: paymentEntity.id
  });
}

async function handleRefundEvent(refundEntity) {
  if (!refundEntity) {
    console.error('[Webhook] Missing refund entity in payload');
    return;
  }

  let paymentRecord = null;

  if (refundEntity.order_id) {
    paymentRecord = await getPaymentRecordByOrderId(refundEntity.order_id);
  }

  if (!paymentRecord) {
    paymentRecord = await getPaymentRecordByPaymentId(refundEntity.payment_id);
  }

  if (!paymentRecord) {
    console.warn('[Webhook] Refund event received but no payment record found');
    return;
  }

  await updatePaymentAndBooking(paymentRecord, {
    paymentStatus: EVENT_STATUS_MAP['refund.processed'].payment,
    bookingStatus: EVENT_STATUS_MAP['refund.processed'].booking
  });
}

async function processWebhookEvent(eventPayload) {
  const eventId = eventPayload?.id;
  const eventType = eventPayload?.event;

  if (!eventId || !eventType) {
    console.error('[Webhook] Invalid event payload: missing id or event type');
    return;
  }

  try {
    const { duplicate } = await logWebhookEvent(eventId);

    if (duplicate) {
      console.log(`[Webhook] Duplicate event ${eventId} received. Skipping processing.`);
      return;
    }
  } catch (error) {
    console.error('[Webhook] Failed to log webhook event:', error);
    return;
  }

  try {
    if (eventType === 'refund.processed') {
      await handleRefundEvent(eventPayload?.payload?.refund?.entity);
      return;
    }

    if (eventType === 'payment.captured' || eventType === 'payment.failed') {
      await handlePaymentEvent(eventPayload?.payload?.payment?.entity, EVENT_STATUS_MAP[eventType]);
      return;
    }

    console.log(`[Webhook] Unhandled event type received: ${eventType}`);
  } catch (error) {
    console.error(`[Webhook] Error processing event ${eventId}:`, error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing RAZORPAY_WEBHOOK_SECRET environment variable');
    return res.status(500).json({ error: 'Webhook is not configured' });
  }

  try {
    const rawBody = await parseRawBody(req, res);
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      console.error('Missing Razorpay signature header');
      return res.status(400).json({ error: 'Missing signature header' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature received');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const eventPayload = JSON.parse(rawBody.toString('utf8'));

    res.status(200).json({ status: 'ok' });

    processWebhookEvent(eventPayload)
      .catch((error) => {
        console.error('[Webhook] Unexpected error after acknowledgement:', error);
      });
  } catch (error) {
    console.error('[Webhook] Failed to process incoming request:', error);

    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

