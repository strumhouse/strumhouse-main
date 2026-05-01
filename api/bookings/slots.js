import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    // We join booking_slots with bookings to check the status.
    // Because we use the service role key, we can read the bookings table even though
    // anonymous users normally cannot.
    const { data, error } = await supabase
      .from('booking_slots')
      .select('*, bookings!inner(status)')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('bookings.status', 'confirmed');

    if (error) {
      console.error('Error fetching confirmed slots:', error);
      return res.status(500).json({ error: 'Failed to fetch slots' });
    }

    // Since we used an inner join with the eq filter, it only returns confirmed slots.
    // We can also ensure the response format matches what the frontend expects.
    // We ensure the "bookings" object is included so the frontend's check `slot.bookings.status === 'confirmed'` will pass.
    const confirmedSlots = (data || []).map(slot => ({
      id: slot.id,
      booking_id: slot.booking_id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      // Provide the nested bookings object that the frontend expects
      bookings: {
        status: 'confirmed'
      }
    }));

    return res.status(200).json({ slots: confirmedSlots });
  } catch (error) {
    console.error('Error in slots endpoint:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
