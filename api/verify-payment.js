import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verifies a Razorpay payment and updates the payment and booking status
 * Handles both direct verification and webhook scenarios
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log('[VerifyPayment] Verifying payment:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'Missing required payment verification parameters',
        verified: false
      });
    }

    const secret = process.env.VITE_RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[VerifyPayment] Razorpay secret key not configured');
      return res.status(500).json({
        error: 'Payment verification configuration error',
        verified: false
      });
    }

    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex');

    if (razorpay_signature !== expectedSignature) {
      console.error('[VerifyPayment] Signature mismatch', { expected: expectedSignature });
      return res.status(400).json({
        error: 'Invalid signature',
        verified: false
      });
    }

    let { data: payment } = await supabase
      .from('payments')
      .select('id, booking_id, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (!payment) {
      console.log('[VerifyPayment] Payment missing locally, fetching from Razorpay order');
      const authHeader = Buffer.from(
        `${process.env.VITE_RAZORPAY_KEY_ID}:${process.env.VITE_RAZORPAY_KEY_SECRET}`
      ).toString('base64');

      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${authHeader}` }
      });

      if (!orderResponse.ok) {
        console.error('[VerifyPayment] Unable to fetch Razorpay order');
        return res.status(404).json({
          error: 'Payment not found',
          verified: false
        });
      }

      const orderData = await orderResponse.json();
      const bookingIdFromNotes = orderData.notes?.booking_id;

      const { data: upsertedPayment, error: upsertError } = await supabase
        .from('payments')
        .upsert({
          booking_id: bookingIdFromNotes || null,
          amount: orderData.amount / 100,
          currency: orderData.currency,
          payment_method: 'razorpay',
          razorpay_order_id,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'razorpay_order_id' })
        .select('id, booking_id, status')
        .single();

      if (upsertError) {
        console.error('[VerifyPayment] Failed to upsert payment from Razorpay order:', upsertError);
        return res.status(500).json({ error: 'Failed to persist payment record', verified: false });
      }

      payment = upsertedPayment;
    }

    if (payment.status === 'captured') {
      return res.status(200).json({
        verified: true,
        payment_id: payment.id,
        booking_id: payment.booking_id,
        status: 'captured',
        already_processed: true
      });
    }

    const timestamp = new Date().toISOString();

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'captured',
        razorpay_payment_id,
        updated_at: timestamp
      })
      .eq('id', payment.id)
      .select('id, booking_id')
      .single();

    if (updateError) {
      console.error('[VerifyPayment] Error updating payment:', updateError);
      return res.status(500).json({
        error: 'Error updating payment status',
        verified: false
      });
    }

    if (updatedPayment.booking_id) {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          updated_at: timestamp
        })
        .eq('id', updatedPayment.booking_id);

      if (bookingError) {
        console.error('[VerifyPayment] Error updating booking:', bookingError);
        return res.status(500).json({
          error: 'Error updating booking status',
          verified: false
        });
      }
    }

    return res.status(200).json({
      verified: true,
      payment_id: updatedPayment.id,
      booking_id: updatedPayment.booking_id,
      status: 'captured',
      message: updatedPayment.booking_id
        ? 'Payment verified and booking confirmed'
        : 'Payment verified. Booking confirmation will follow shortly.'
    });
  } catch (error) {
    console.error('[VerifyPayment] Unhandled error:', error);
    return res.status(500).json({
      error: 'Internal server error during payment verification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      verified: false
    });
  }
}