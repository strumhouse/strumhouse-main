import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

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

    // Ensure receipt is <= 40 chars
    const receipt = `b_${bookingId}_${Date.now()}`.slice(0, 40);

    const orderData = {
      amount: Math.round(amount * 100), // Convert to paise and ensure integer
      currency: currency || 'INR',
      receipt,
      notes: { 
        booking_id: bookingId,
        created_at: new Date().toISOString()
      },
      payment_capture: 1 // Auto-capture payment
    };

    console.log('[CreateOrder] Creating Razorpay order for booking:', bookingId);

    // Create Razorpay order
    const auth = Buffer.from(
      `${process.env.VITE_RAZORPAY_KEY_ID}:${process.env.VITE_RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CreateOrder] Razorpay error:', data);
      return res.status(400).json({ 
        error: data.error?.description || 'Failed to create order',
        details: data
      });
    }

    console.log('[CreateOrder] Razorpay order created:', data.id);

    // Store the Razorpay order ID in the payments table
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        razorpay_order_id: data.id,
        status: 'created',
        amount: amount,
        currency: currency || 'INR',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);

    if (updateError) {
      console.error('[CreateOrder] Error updating payment record:', updateError);
      // Still return success since Razorpay order was created
      // The webhook will handle the status update later
    }

    res.status(200).json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: 'created',
      created_at: data.created_at
    });

  } catch (error) {
    console.error('[CreateOrder] Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
