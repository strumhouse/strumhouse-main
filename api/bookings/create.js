import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// String-based overlap check (no Date conversion)
function timesOverlapString(startA, endA, startB, endB) {
  // Simple string comparison works for HH:MM:SS format
  // Proper overlap: startA < endB && startB < endA
  return startA < endB && startB < endA;
}

async function isSlotFreeForBooking(bookingData) {
  const conflicts = [];
  const slotsToCheck = bookingData.slots || [{
    date: bookingData.date,
    start_time: bookingData.start_time,
    end_time: bookingData.end_time
  }];

  for (const slot of slotsToCheck) {
    // Fetch all confirmed bookings for the date
    const { data: bookingSlots } = await supabase
      .from('booking_slots')
      .select(`
        *,
        bookings!inner(status, payment_status, service_id)
      `)
      .eq('date', slot.date)
      .eq('bookings.service_id', bookingData.service_id)
      .eq('bookings.status', 'confirmed')
      .eq('bookings.payment_status', 'paid');

    if (bookingSlots) {
      for (const existingSlot of bookingSlots) {
        // Use string-based overlap
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          existingSlot.start_time, existingSlot.end_time
        )) {
          conflicts.push(`Slot ${slot.date} ${slot.start_time}-${slot.end_time} conflicts`);
        }
      }
    }

    // Fetch all blocked slots
    const { data: blockedSlots } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('date', slot.date);

    if (blockedSlots) {
      for (const blocked of blockedSlots) {
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          blocked.start_time, blocked.end_time
        )) {
          conflicts.push(`Slot ${slot.date} ${slot.start_time}-${slot.end_time} is blocked`);
        }
      }
    }
  }

  return { free: conflicts.length === 0, conflicts };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bookingData = req.body;

    // Validate required fields
    if (!bookingData.user_id || !bookingData.service_id || !bookingData.date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check slot availability before creating booking
    const { free, conflicts } = await isSlotFreeForBooking({
      service_id: bookingData.service_id,
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      slots: bookingData.slots
    });

    if (!free) {
      return res.status(409).json({
        error: 'Slot conflict',
        conflicts
      });
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    // Insert booking slots in batch
    const slotsToInsert = (bookingData.slots || [{
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time
    }]).map(slot => ({
      booking_id: booking.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time
    }));

    const { error: slotsError } = await supabase
      .from('booking_slots')
      .insert(slotsToInsert);

    if (slotsError) {
      console.error('Error inserting booking slots:', slotsError);
      // Rollback: delete booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);
      
      return res.status(500).json({ error: 'Failed to create booking slots' });
    }

    return res.status(201).json({
      booking_id: booking.id,
      booking
    });
  } catch (error) {
    console.error('Error in booking creation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

