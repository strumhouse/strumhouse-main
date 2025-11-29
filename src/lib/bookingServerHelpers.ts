import { supabase } from './supabase';

export interface SlotConflict {
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface SlotCheckResult {
  free: boolean;
  conflicts: SlotConflict[];
}

/**
 * Check if slots are free for a booking
 * Uses string-based time comparison (no timezone conversion)
 * Assumes all times are in same timezone (IST/HH:MM:SS format)
 */
export async function isSlotFreeForBooking(
  bookingData: {
    id?: string;
    service_id: string;
    date: string;
    start_time: string;
    end_time: string;
    slots?: Array<{ date: string; start_time: string; end_time: string }>;
  }
): Promise<SlotCheckResult> {
  const conflicts: SlotConflict[] = [];
  const slotsToCheck = bookingData.slots || [{
    date: bookingData.date,
    start_time: bookingData.start_time,
    end_time: bookingData.end_time
  }];

  /**
   * String-based time overlap check (no Date conversion)
   * Proper overlap: startA < endB && startB < endA
   * Times are compared as strings in HH:MM:SS format
   */
  const timesOverlapString = (
    startA: string,
    endA: string,
    startB: string,
    endB: string
  ): boolean => {
    // Simple string comparison works for HH:MM:SS format
    // Proper overlap: startA < endB && startB < endA
    return startA < endB && startB < endA;
  };

  for (const slot of slotsToCheck) {
    // Fetch all confirmed booking slots for the date
    const { data: bookingSlots, error: bookingError } = await supabase
      .from('booking_slots')
      .select(`
        *,
        bookings!inner(id, status, payment_status, service_id)
      `)
      .eq('date', slot.date)
      .eq('bookings.service_id', bookingData.service_id)
      .eq('bookings.status', 'confirmed')
      .eq('bookings.payment_status', 'paid');

    if (bookingError) {
      console.error('Error checking booking conflicts:', bookingError);
      conflicts.push({
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        reason: 'Error checking booking conflicts'
      });
      continue;
    }

    if (bookingSlots) {
      for (const existingSlot of bookingSlots) {
        // Skip if same booking
        if (bookingData.id && existingSlot.booking_id === bookingData.id) {
          continue;
        }

        // Use string-based overlap check
        if (timesOverlapString(
          slot.start_time,
          slot.end_time,
          existingSlot.start_time,
          existingSlot.end_time
        )) {
          conflicts.push({
            date: slot.date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            reason: `Overlaps with confirmed booking slot ${existingSlot.start_time}-${existingSlot.end_time}`
          });
        }
      }
    }

    // Fetch all blocked slots for the date
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('date', slot.date);

    if (blockedError) {
      console.error('Error checking blocked slots:', blockedError);
      conflicts.push({
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        reason: 'Error checking blocked slots'
      });
      continue;
    }

    if (blockedSlots) {
      for (const blocked of blockedSlots) {
        // Use string-based overlap check
        if (timesOverlapString(
          slot.start_time,
          slot.end_time,
          blocked.start_time,
          blocked.end_time
        )) {
          conflicts.push({
            date: slot.date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            reason: `Overlaps with blocked slot ${blocked.start_time}-${blocked.end_time}${blocked.reason ? ` (${blocked.reason})` : ''}`
          });
        }
      }
    }
  }

  return {
    free: conflicts.length === 0,
    conflicts
  };
}

