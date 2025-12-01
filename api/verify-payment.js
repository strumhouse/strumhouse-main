import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1. Verify Signature
    const secret = process.env.VITE_RAZORPAY_KEY_SECRET;
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(signatureString).digest('hex');

    if (razorpay_signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature', verified: false });
    }

    // 2. Fetch or Create Payment Record
    // We try to find it first. If missing, we fetch from Razorpay to get the booking_id
    let { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (!payment) {
      console.log(`[Verify] Payment missing for order ${razorpay_order_id}. Recovering from Razorpay...`);
      
      const auth = Buffer.from(`${process.env.VITE_RAZORPAY_KEY_ID}:${process.env.VITE_RAZORPAY_KEY_SECRET}`).toString('base64');
      const rzpResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      if (!rzpResponse.ok) throw new Error('Failed to fetch order from Razorpay');
      
      const orderData = await rzpResponse.json();
      const bookingId = orderData.notes?.booking_id;

      if (!bookingId) throw new Error('Booking ID not found in Razorpay order notes');

      // Create the missing row on the fly
      const { data: newPayment, error: createError } = await supabase
        .from('payments')
        .upsert({
          razorpay_order_id: razorpay_order_id,
          booking_id: bookingId,
          amount: orderData.amount / 100,
          status: 'captured',
          razorpay_payment_id: razorpay_payment_id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'razorpay_order_id' })
        .select()
        .single();
      
      if (createError) throw createError;
      payment = newPayment;
    } else {
      // Update existing row
      const { data: updated, error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'captured',
          razorpay_payment_id: razorpay_payment_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      payment = updated;
    }

    // 3. Update Booking Status
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', payment.booking_id);

    if (bookingError) throw bookingError;

    return res.status(200).json({
      verified: true,
      status: 'captured',
      booking_id: payment.booking_id
    });

  } catch (error) {
    console.error('[VerifyPayment] Error:', error);
    return res.status(500).json({ error: error.message, verified: false });
  }
}