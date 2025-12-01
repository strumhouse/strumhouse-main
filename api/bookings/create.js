import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Helper to check overlapping time slots (HH:MM:SS format)
function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// Check if booking slot is available
async function isSlotFree(service_id, slots) {
  const conflicts = [];
  
  // CHANGED: 2-minute reservation window
  // Pending bookings older than 2 mins are considered "Abandoned" and ignored.
  const reservationWindow = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  for (const slot of slots) {
    // Check existing bookings (Confirmed OR Recently Pending)
    const { data: bookedSlots, error: bookingError } = await supabase
      .from('booking_slots')
      .select(`
        *,
        bookings!inner(service_id, status, payment_status, created_at)
      `)
      .eq('date', slot.date)
      .eq('bookings.service_id', service_id);

    if (bookingError) throw new Error(bookingError.message);

    for (const booked of bookedSlots || []) {
      const booking = booked.bookings;
      
      const isConfirmed = booking.status === 'confirmed' && booking.payment_status === 'paid';
      
      // CRITICAL CHECK: Is this a "Fresh" pending booking? (Created < 2 mins ago)
      const isPendingAndRecent = booking.status === 'pending' && booking.created_at > reservationWindow;

      // If it is Confirmed OR Fresh Pending, consider the slot BLOCKED.
      if (isConfirmed || isPendingAndRecent) {
        if (timesOverlap(slot.start_time, slot.end_time, booked.start_time, booked.end_time)) {
          const reason = isConfirmed ? 'already booked' : 'currently being booked by someone else';
          conflicts.push(`Slot ${slot.start_time}-${slot.end_time} on ${slot.date} is ${reason}`);
        }
      }
    }

    // Check blocked slots (Admin Blocks)
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('date', slot.date);

    if (blockedError) throw new Error(blockedError.message);

    for (const blocked of blockedSlots || []) {
      if (timesOverlap(slot.start_time, slot.end_time, blocked.start_time, blocked.end_time)) {
        conflicts.push(`Slot ${slot.start_time}-${slot.end_time} on ${slot.date} is blocked by admin`);
      }
    }
  }

  return { free: conflicts.length === 0, conflicts };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bookingData = req.body;

  // Required fields
  const requiredFields = [
    'user_id', 'service_id', 'customer_name', 'customer_email',
    'date', 'start_time', 'end_time', 'total_amount', 'advance_amount'
  ];
  const missingFields = requiredFields.filter(f => !bookingData[f]);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', missingFields });
  }

  try {
    // Validate foreign keys
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', bookingData.user_id)
      .maybeSingle();
    if (!userExists) return res.status(400).json({ error: 'Invalid user_id' });

    const { data: serviceExists } = await supabase
      .from('services')
      .select('id')
      .eq('id', bookingData.service_id)
      .maybeSingle();
    if (!serviceExists) return res.status(400).json({ error: 'Invalid service_id' });

    // Prepare slots
    const slots = bookingData.slots || [{
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time
    }];

    // Check availability (Includes 2-minute pending check)
    const { free, conflicts } = await isSlotFree(bookingData.service_id, slots);
    if (!free) {
      return res.status(409).json({ error: 'Slot conflict', conflicts });
    }

    // Insert booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: bookingData.user_id,
        service_id: bookingData.service_id,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone,
        category_id: bookingData.category_id,
        date: bookingData.date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        duration: bookingData.duration,
        participants: bookingData.participants,
        add_ons: bookingData.add_ons,
        total_amount: bookingData.total_amount,
        advance_amount: bookingData.advance_amount,
        notes: bookingData.notes,
        google_calendar_event_id: bookingData.google_calendar_event_id,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (bookingError) throw bookingError;

    // Insert booking slots
    const slotsToInsert = slots.map(slot => ({
      booking_id: booking.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time
    }));

    const { error: slotsError } = await supabase
      .from('booking_slots')
      .insert(slotsToInsert);

    if (slotsError) {
      // Rollback booking
      await supabase.from('bookings').delete().eq('id', booking.id);
      throw slotsError;
    }

    return res.status(201).json({ success: true, booking_id: booking.id, slots: slotsToInsert.length });
  } catch (error) {
    console.error('Booking creation error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}