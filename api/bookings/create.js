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

  console.log('[Booking] Checking slot availability for:', {
    serviceId: bookingData.service_id,
    slotsToCheck
  });

  for (const slot of slotsToCheck) {
    console.log(`[Booking] Checking slot: ${slot.date} ${slot.start_time}-${slot.end_time}`);
    
    // Log the exact query being made
    console.log(`[Booking] Querying booking_slots for date: ${slot.date}`);
    
    // Fetch all confirmed bookings for the date
    const { data: bookingSlots, error: bookingError } = await supabase
      .from('booking_slots')
      .select(`
        *,
        bookings!inner(status, payment_status, service_id)
      `)
      .eq('date', slot.date)
      .eq('bookings.service_id', bookingData.service_id)
      .eq('bookings.status', 'confirmed')
      .eq('bookings.payment_status', 'paid');

    if (bookingError) {
      console.error('[Booking] Error fetching booking slots:', bookingError);
      conflicts.push('Error checking booking availability');
      continue;
    }

    if (bookingSlots && bookingSlots.length > 0) {
      console.log(`[Booking] Found ${bookingSlots.length} existing booking slots`);
      for (const existingSlot of bookingSlots) {
        console.log(`[Booking] Checking against existing slot: ${existingSlot.date} ${existingSlot.start_time}-${existingSlot.end_time}`);
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          existingSlot.start_time, existingSlot.end_time
        )) {
          const conflictMsg = `Time slot ${slot.start_time}-${slot.end_time} on ${slot.date} is already booked`;
          console.log(`[Booking] ${conflictMsg}`);
          conflicts.push(conflictMsg);
        }
      }
    }

    // Check blocked slots
    console.log(`[Booking] Querying blocked_slots for date: ${slot.date}`);
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('date', slot.date);

    if (blockedError) {
      console.error('[Booking] Error fetching blocked slots:', blockedError);
      conflicts.push('Error checking blocked slots');
      continue;
    }

    if (blockedSlots && blockedSlots.length > 0) {
      console.log(`[Booking] Found ${blockedSlots.length} blocked slots`);
      for (const blocked of blockedSlots) {
        console.log(`[Booking] Checking against blocked slot: ${blocked.date} ${blocked.start_time}-${blocked.end_time}`);
        if (timesOverlapString(
          slot.start_time, slot.end_time,
          blocked.start_time, blocked.end_time
        )) {
          const conflictMsg = `Time slot ${slot.start_time}-${slot.end_time} on ${slot.date} is blocked (${blocked.reason || 'No reason provided'})`;
          console.log(`[Booking] ${conflictMsg}`);
          conflicts.push(conflictMsg);
        }
      }
    } else {
      console.log('[Booking] No blocked slots found for this date');
    }
  }

  console.log(`[Booking] Slot check complete. Conflicts: ${conflicts.length > 0 ? conflicts.join(', ') : 'None'}`);
  return { free: conflicts.length === 0, conflicts };
}

export default async function handler(req, res) {
  console.log('[Booking] Received request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  if (req.method !== 'POST') {
    console.log('[Booking] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bookingData = req.body;
    console.log('[Booking] Processing booking request:', bookingData);

    // Validate required fields
    const requiredFields = ['user_id', 'service_id', 'date', 'start_time', 'end_time'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
      console.error('[Booking] Validation error:', errorMsg);
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields,
        receivedData: bookingData
      });
    }

    // Prepare booking data with explicit fields
    const bookingCheckData = {
      service_id: bookingData.service_id,
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      slots: bookingData.slots
    };

    console.log('[Booking] Checking slot availability with data:', bookingCheckData);
    
    // Check slot availability before creating booking
    const { free, conflicts } = await isSlotFreeForBooking(bookingCheckData);

    if (!free) {
      const conflictMsg = `Slot conflict detected: ${conflicts.join('; ')}`;
      console.warn('[Booking] ' + conflictMsg);
      return res.status(409).json({
        error: 'Slot conflict',
        message: conflictMsg,
        conflicts,
        requestedSlot: {
          date: bookingData.date,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time
        }
      });
    }

    // Create booking
    console.log('[Booking] Creating booking in database...');
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
      console.error('[Booking] Error creating booking:', bookingError);
      return res.status(500).json({ 
        error: 'Failed to create booking',
        details: bookingError.message,
        code: bookingError.code
      });
    }

    console.log(`[Booking] Created booking with ID: ${booking.id}`);

    // Prepare booking slots
    const slotsToInsert = (bookingData.slots || [{
      date: bookingData.date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time
    }]).map(slot => {
      const slotData = {
        booking_id: booking.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        created_at: new Date().toISOString()
      };
      console.log(`[Booking] Preparing slot:`, slotData);
      return slotData;
    });

    console.log(`[Booking] Inserting ${slotsToInsert.length} booking slots...`);
    const { error: slotsError } = await supabase
      .from('booking_slots')
      .insert(slotsToInsert);

    if (slotsError) {
      console.error('[Booking] Error inserting booking slots:', slotsError);
      console.log(`[Booking] Rolling back booking ${booking.id}...`);
      
      // Rollback: delete booking
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);
      
      if (deleteError) {
        console.error('[Booking] Failed to rollback booking:', deleteError);
        // We still need to return an error response even if rollback fails
      }
      
      return res.status(500).json({ 
        error: 'Failed to create booking slots',
        details: slotsError.message,
        code: slotsError.code
      });
    }

    console.log(`[Booking] Successfully created booking ${booking.id} with ${slotsToInsert.length} slots`);
    
    return res.status(201).json({
      success: true,
      booking_id: booking.id,
      booking,
      slots: slotsToInsert.length
    });
    
  } catch (error) {
    console.error('[Booking] Unhandled error in booking creation:', {
      error: error.message,
      stack: error.stack,
      request: {
        body: req.body,
        headers: req.headers
      }
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      code: error.code
    });
  }
}

