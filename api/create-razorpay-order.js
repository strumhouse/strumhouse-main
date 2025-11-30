import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID,
  key_secret: process.env.VITE_RAZORPAY_KEY_SECRET
});

// Main handler function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, amount, currency } = req.body;

    // Validate required fields
    if (!bookingId || !amount) {
      console.error('[CreateOrder] Missing required fields:', { bookingId, amount });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('[CreateOrder] Creating Razorpay order for booking:', bookingId);

    // Create Razorpay order
    if (!process.env.VITE_RAZORPAY_KEY_ID || !process.env.VITE_RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency || 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        booking_id: bookingId
      },
      payment_capture: 1 // Auto-capture payment
    });

    if (!order || !order.id) {
      throw new Error('Failed to create Razorpay order');
    }

    console.log('[CreateOrder] Razorpay order created:', order.id);

    // Store the order ID in the payments table
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        razorpay_order_id: order.id,
        status: 'created',
        amount: amount,
        currency: currency || 'INR',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);

    if (paymentError) {
      console.error('[CreateOrder] Error updating payment record:', paymentError);
      // Don't fail the request if we can't update the payment record
      // The webhook will handle updating the status when the payment is captured
    }

    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: 'created'
    });

  } catch (error) {
    console.error('[CreateOrder] Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}