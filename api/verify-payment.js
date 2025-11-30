import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

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

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('[VerifyPayment] Missing required parameters');
      return res.status(400).json({ 
        error: 'Missing required payment verification parameters',
        verified: false 
      });
    }

    // Verify signature
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
      console.error('[VerifyPayment] Signature verification failed', {
        expected: expectedSignature,
        received: razorpay_signature
      });
      return res.status(400).json({ 
        error: 'Invalid signature',
        verified: false 
      });
    }

    console.log('[VerifyPayment] Signature verified, processing payment...');

    // 1. Check if payment is already processed
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, booking_id, status, razorpay_payment_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (paymentError) {
      console.error('[VerifyPayment] Error fetching payment:', paymentError);
      return res.status(500).json({ 
        error: 'Error verifying payment',
        verified: false 
      });
    }

    if (!payment) {
      console.error(`[VerifyPayment] No payment found for order: ${razorpay_order_id}`);
      return res.status(404).json({ 
        error: 'Payment not found',
        verified: false 
      });
    }

    // 2. If payment is already captured, return current status
    if (payment.status === 'captured') {
      console.log(`[VerifyPayment] Payment ${payment.id} already captured`);
      return res.status(200).json({
        verified: true,
        payment_id: payment.id,
        booking_id: payment.booking_id,
        status: 'captured',
        already_processed: true
      });
    }

    const timestamp = new Date().toISOString();
    
    // 3. Update payment status
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'captured',
        razorpay_payment_id: razorpay_payment_id,
        updated_at: timestamp
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      console.error('[VerifyPayment] Error updating payment:', updateError);
      return res.status(500).json({ 
        error: 'Error updating payment status',
        verified: false 
      });
    }

    // 4. Update booking status
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: timestamp
      })
      .eq('id', payment.booking_id);

    if (bookingError) {
      console.error('[VerifyPayment] Error updating booking:', bookingError);
      return res.status(500).json({ 
        error: 'Error updating booking status',
        verified: false 
      });
    }

    console.log(`[VerifyPayment] Successfully updated payment ${payment.id} and booking ${payment.booking_id}`);

    // 5. Return success response
    return res.status(200).json({
      verified: true,
      payment_id: updatedPayment.id,
      booking_id: payment.booking_id,
      status: 'captured',
      message: 'Payment verified and booking confirmed'
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