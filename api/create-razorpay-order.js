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
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency || 'INR',
      receipt,
      notes: { 
        booking_id: bookingId // CRITICAL: Used for recovery in webhook/verify
      }
    };

    console.log('[CreateOrder] Creating Razorpay order for booking:', bookingId);

    // 1. Create Razorpay order
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

    // 2. Create Payment Record IMMEDIATELY (Server as Source of Truth)
    const { error: dbError } = await supabase
      .from('payments')
      .upsert({
        razorpay_order_id: data.id,
        booking_id: bookingId,
        amount: amount, // Store in main currency units
        currency: currency || 'INR',
        status: 'created', // Initial state
        created_at: new Date().toISOString()
      }, { onConflict: 'razorpay_order_id' });

    if (dbError) {
      console.error('[CreateOrder] DB Insert Error:', dbError);
      // We throw to fail the request so the client tries again, 
      // ensuring we don't have an order without a DB row.
      return res.status(500).json({ error: 'Failed to initialize payment record' });
    }

    console.log('[CreateOrder] Success. DB Row created for Order:', data.id);

    res.status(200).json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
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