import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID,
  key_secret: process.env.VITE_RAZORPAY_KEY_SECRET
});

// Payment status mapping
const RAZORPAY_STATUS_MAP = {
  'captured': 'completed',
  'authorized': 'pending',
  'failed': 'failed',
  'refunded': 'refunded',
  'partially_refunded': 'partially_refunded'
};

async function reconcilePayments() {
  console.log('[Reconcile] Starting payment reconciliation...');

  // Find bookings with order_id but payment_status != 'paid'
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      payments(razorpay_order_id, razorpay_payment_id)
    `)
    .neq('payment_status', 'paid')
    .not('payments.razorpay_order_id', 'is', null)
    .limit(100);

  if (error) {
    console.error('[Reconcile] Error fetching bookings:', error);
    return;
  }

  console.log(`[Reconcile] Found ${bookings?.length || 0} bookings to reconcile`);

  for (const booking of bookings || []) {
    const payment = booking.payments?.[0];
    if (!payment?.razorpay_order_id) continue;

    try {
      // Fetch payment status from Razorpay
      const paymentId = payment.razorpay_payment_id || payment.razorpay_order_id;
      const razorpayPayment = await razorpay.payments.fetch(paymentId);
      
      if (razorpayPayment.status === 'captured') {
        console.log(`[Reconcile] Payment captured for booking ${booking.id}, updating...`);
        
        // Check slot availability (simplified - reuse webhook logic)
        // For now, just update if payment is captured
        // In production, you might want to call isSlotFreeForBooking here
        
        // Update booking
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        // Update payment record
        const paymentStatus = RAZORPAY_STATUS_MAP[razorpayPayment.status] || 'completed';
        await supabase
          .from('payments')
          .update({
            status: paymentStatus,
            razorpay_payment_id: razorpayPayment.id,
            updated_at: new Date().toISOString()
          })
          .eq('booking_id', booking.id);

        console.log(`[Reconcile] Updated booking ${booking.id} to confirmed`);
      } else if (razorpayPayment.status === 'failed') {
        console.log(`[Reconcile] Payment failed for booking ${booking.id}`);
        await supabase
          .from('bookings')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);
      }
    } catch (err) {
      console.error(`[Reconcile] Error reconciling booking ${booking.id}:`, err);
    }
  }

  console.log('[Reconcile] Reconciliation complete');
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('reconcilePayments.js')) {
  reconcilePayments().then(() => process.exit(0)).catch(err => {
    console.error('[Reconcile] Fatal error:', err);
    process.exit(1);
  });
}

export default reconcilePayments;

