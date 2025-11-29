import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get summary stats with single query
    const { data: bookings } = await supabase
      .from('bookings')
      .select('status, payment_status, total_amount');

    const stats = {
      totalBookings: bookings?.length || 0,
      pendingBookings: bookings?.filter(b => b.status === 'pending').length || 0,
      confirmedBookings: bookings?.filter(b => b.status === 'confirmed').length || 0,
      totalRevenue: bookings
        ?.filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0
    };

    // Get user count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get service count
    const { count: serviceCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });

    // Get blocked slots count
    const { count: blockedCount } = await supabase
      .from('blocked_slots')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      ...stats,
      totalUsers: userCount || 0,
      totalServices: serviceCount || 0,
      blockedSlots: blockedCount || 0
    });
  } catch (error) {
    console.error('Error fetching admin summary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

