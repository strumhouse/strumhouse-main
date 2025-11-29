import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side operations
);

// Payment status mapping
const RAZORPAY_STATUS_MAP = {
  'captured': 'completed',
  'authorized': 'pending',
  'failed': 'failed',
  'refunded': 'refunded',
  'partially_refunded': 'partially_refunded'
};

// Helper function for proper time overlap check (string-based, no timezone conversion)
function timesOverlapString(startA, endA, startB, endB) {
  // Simple string comparison works for HH:MM:SS format
  // Proper overlap: startA < endB && startB < endA
  return startA < endB && startB < endA;
}

// Helper to check slot conflicts
async function isSlotFreeForBooking(booking) {
  const conflicts = [];
  
  // Get all slots for this booking
  const { data: bookingSlotsData, error: slotsError } = await supabase
    .from('booking_slots')
    .select('*')
    .eq('booking_id', booking.id);
  
  if (slotsError) {
    console.error('Error fetching booking slots:', slotsError);
    return { free: false, conflicts: ['Error checking slots'] };
  }
  
  // Fix: Use let instead of const, initialize properly
  let bookingSlots = bookingSlotsData || [];
  
  if (bookingSlots.length === 0) {
    // If no slots yet, check based on booking date/time
    bookingSlots = [{
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time
    }];
  }
  
  for (const slot of bookingSlots) {
    // Fetch ALL confirmed booking slots for the date (not filtered by string)
    const { data: allBookingSlots, error: bookingError } = await supabase
      .from('booking_slots')
      .select(`
        *,
        bookings!inner(id, status, payment_status, service_id)
      `)
      .eq('date', slot.date)
      .eq('bookings.service_id', booking.service_id)
      .eq('bookings.status', 'confirmed')
      .eq('bookings.payment_status', 'paid');
    
    if (bookingError) {
      console.error('Error checking booking conflicts:', bookingError);
      conflicts.push(`Error checking conflicts for ${slot.date} ${slot.start_time}`);
      continue;
    }
    
    // Manual overlap check using string comparison
    if (allBookingSlots) {
      for (const existingSlot of allBookingSlots) {
        // Skip if same booking
        if (booking.id && existingSlot.booking_id === booking.id) {
          continue;
        }

        // Use proper overlap logic (string-based)
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          existingSlot.start_time, existingSlot.end_time
        )) {
          conflicts.push(`Slot ${slot.date} ${slot.start_time}-${slot.end_time} conflicts with existing booking`);
        }
      }
    }
    
    // Fetch ALL blocked slots for the date
    const { data: allBlockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('date', slot.date);
    
    if (blockedError) {
      console.error('Error checking blocked slots:', blockedError);
      conflicts.push(`Error checking blocked slots for ${slot.date}`);
      continue;
    }
    
    // Manual overlap check for blocked slots
    if (allBlockedSlots) {
      for (const blocked of allBlockedSlots) {
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          blocked.start_time, blocked.end_time
        )) {
          conflicts.push(`Slot ${slot.date} ${slot.start_time}-${slot.end_time} is blocked${blocked.reason ? ` (${blocked.reason})` : ''}`);
        }
      }
    }
  }
  
  return {
    free: conflicts.length === 0,
    conflicts
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
      console.error('Missing Razorpay signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`[Webhook] Received event: ${event}`, {
      payment_id: payload?.payment?.entity?.id,
      order_id: payload?.payment?.entity?.order_id
    });

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Find booking by order_id (stored in payments table or booking metadata)
      // First try to find via payments table
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .select('booking_id')
        .eq('razorpay_order_id', orderId)
        .single();

      let bookingId = null;
      
      if (paymentRecord) {
        bookingId = paymentRecord.booking_id;
      } else {
        // Try to find booking by checking order notes or receipt
        // Receipt format: b_{bookingId}_{timestamp}
        const receipt = payment.receipt;
        if (receipt && receipt.startsWith('b_')) {
          const parts = receipt.split('_');
          if (parts.length >= 2) {
            bookingId = parts[1];
          }
        }
      }

      if (!bookingId) {
        console.error(`[Webhook] Booking not found for order_id: ${orderId}`);
        // Return 200 to acknowledge webhook, but log for manual review
        return res.status(200).json({ 
          received: true, 
          message: 'Booking not found, logged for review' 
        });
      }

      // Get booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error(`[Webhook] Error fetching booking ${bookingId}:`, bookingError);
        return res.status(200).json({ 
          received: true, 
          message: 'Booking not found' 
        });
      }

      // Idempotency check
      if (booking.payment_status === 'paid') {
        console.log(`[Webhook] Booking ${bookingId} already paid, skipping`);
        return res.status(200).json({ 
          received: true, 
          message: 'Already processed' 
        });
      }

      // Check if feature flag is enabled
      const enableBackendConfirmation = process.env.ENABLE_BACKEND_CONFIRMATION === 'true';
      
      if (enableBackendConfirmation) {
        // Check slot availability
        const { free, conflicts } = await isSlotFreeForBooking(booking);
        
        if (!free) {
          console.error(`[Webhook] Slot conflict for booking ${bookingId}:`, conflicts);
          
          // Update booking with conflict status
          await supabase
            .from('bookings')
            .update({
              payment_status: 'captured_conflict',
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          // TODO: Send alert to admin (email/log)
          console.error(`[ALERT] Payment captured but slot conflict: Booking ${bookingId}`, conflicts);
          
          return res.status(200).json({ 
            received: true, 
            message: 'Payment captured but slot conflict detected',
            conflicts 
          });
        }
      }

      // Update booking to confirmed
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error(`[Webhook] Error updating booking ${bookingId}:`, updateError);
        return res.status(500).json({ error: 'Failed to update booking' });
      }

      // Ensure payment record exists with correct status mapping
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('booking_id', bookingId)
        .single();

      const paymentStatus = RAZORPAY_STATUS_MAP[payment.status] || 'completed';

      if (!existingPayment) {
        await supabase
          .from('payments')
          .insert({
            booking_id: bookingId,
            amount: booking.advance_amount || booking.total_amount,
            currency: 'INR',
            payment_method: 'razorpay',
            status: paymentStatus,
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } else {
        // Update existing payment record
        await supabase
          .from('payments')
          .update({
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            status: paymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPayment.id);
      }

      console.log(`[Webhook] Successfully confirmed booking ${bookingId}`);
      return res.status(200).json({ 
        received: true, 
        booking_id: bookingId,
        status: 'confirmed' 
      });
    }

    // Handle payment.failed event
    if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentStatus = RAZORPAY_STATUS_MAP[payment.status] || 'failed';
      
      // Find and update booking
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('booking_id')
        .eq('razorpay_order_id', orderId)
        .single();

      if (paymentRecord) {
        // Update payment status
        await supabase
          .from('payments')
          .update({
            status: paymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('booking_id', paymentRecord.booking_id);

        // Update booking status
        await supabase
          .from('bookings')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentRecord.booking_id);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

