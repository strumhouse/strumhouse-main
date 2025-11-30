import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// String-based overlap check
function timesOverlapString(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

async function isSlotFreeForBooking(bookingData) {
  const conflicts = [];
  const slotsToCheck = bookingData.slots || [{
    date: bookingData.date,
    start_time: bookingData.start_time,
    end_time: bookingData.end_time
  }];

  console.log('[Booking] Checking slot availability:', slotsToCheck);

  for (const slot of slotsToCheck) {
    // Fetch confirmed booking slots
    const { data: bookingSlots, error: bookingError } = await supabase
      .from('booking_slots')
      .select(`*, bookings!inner(status, payment_status, service_id)`)
      .eq('date', slot.date)
      .eq('bookings.service_id', bookingData.service_id)
      .eq('bookings.status', 'confirmed')
      .eq('bookings.payment_status', 'paid');

    if (bookingError) {
      console.error('[Booking] Error fetching booking slots:', bookingError);
      conflicts.push('Error checking booking availability');
      continue;
    }

    if (bookingSlots?.length) {
      for (const existingSlot of bookingSlots) {
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          existingSlot.start_time, existingSlot.end_time
        )) {
          conflicts.push(`Time slot ${slot.start_time}-${slot.end_time} on ${slot.date} is already booked`);
        }
      }
    }

    // Check blocked slots
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('date', slot.date);

    if (blockedError) {
      console.error('[Booking] Error fetching blocked slots:', blockedError);
      conflicts.push('Error checking blocked slots');
      continue;
    }

    if (blockedSlots?.length) {
      for (const blocked of blockedSlots) {
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          blocked.start_time, blocked.end_time
        )) {
          conflicts.push(`Time slot ${slot.start_time}-${slot.end_time} on ${slot.date} is blocked (${blocked.reason || 'No reason provided'})`);
        }
      }
    }
  }

  return { free: conflicts.length === 0, conflicts };
}

export default async function handler(req, res) {
  console.log('[Booking] Request received:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bookingData = req.body;

    // Validate required fields (merged)
    const requiredFields = [
      'user_id',
      'service_id',
      'customer_name',
      'customer_email',
      'date',
      'start_time',
      'end_time',
      'total_amount',
      'advance_amount'
    ];

    const missingFields = requiredFields.filter(field => !bookingData[field] && bookingData[field] !== 0);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields,
        receivedData: Object.keys(bookingData)
      });
    }

    // Check slot availability
    const { free, conflicts } = await isSlotFreeForBooking(bookingData);
    if (!free) {
      return res.status(409).json({
        error: 'Slot conflict',
        message: conflicts.join('; '),
        conflicts,
        requestedSlot: {
          date: bookingData.date,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time
        }
      });
    }

    // Verify foreign keys exist
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', bookingData.user_id)
      .maybeSingle();
    if (!userExists) return res.status(400).json({ error: 'Invalid user_id', message: 'User does not exist' });

    const { data: serviceExists } = await supabase
      .from('services')
      .select('id')
      .eq('id', bookingData.service_id)
      .maybeSingle();
    if (!serviceExists) return res.status(400).json({ error: 'Invalid service_id', message: 'Service does not exist' });

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

    if (bookingError) throw bookingError;

    // Insert booking slots
    const slotsToInsert = (bookingData.slots || [{
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time
    }]).map(slot => ({
      booking_id: booking.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      created_at: new Date().toISOString()
    }));

    const { error: slotsError } = await supabase.from('booking_slots').insert(slotsToInsert);
    if (slotsError) {
      // Rollback booking if slots fail
      await supabase.from('bookings').delete().eq('id', booking.id);
      return res.status(500).json({ error: 'Failed to create booking slots', details: slotsError.message });
    }

    return res.status(201).json({ success: true, booking_id: booking.id, slots: slotsToInsert.length });

  } catch (error) {
    console.error('[Booking] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message, code: error.code });
  }
}
