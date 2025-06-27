import { supabase } from './supabase';
import type { Database } from './supabase';


type Tables = Database['public']['Tables'];
type User = Tables['users']['Row'];
type Category = Tables['categories']['Row'];
type Service = Tables['services']['Row'];
type AddOn = Tables['add_ons']['Row'];
type Booking = Tables['bookings']['Row'];
type TimeSlot = Tables['time_slots']['Row'];
type BlockedSlot = Tables['blocked_slots']['Row'];
type Gallery = Tables['gallery']['Row'];
type Setting = Tables['settings']['Row'];

// Setup RLS Policies
export const setupRLSPolicies = async () => {
  try {
    // Categories - Allow read for all, write for authenticated users
    const { error: categoriesError } = await supabase.rpc('setup_categories_policies');
    if (categoriesError) throw categoriesError;

    // Services - Allow read for all, write for authenticated users
    const { error: servicesError } = await supabase.rpc('setup_services_policies');
    if (servicesError) throw servicesError;

    // Add-ons - Allow read for all, write for authenticated users
    const { error: addOnsError } = await supabase.rpc('setup_addons_policies');
    if (addOnsError) throw addOnsError;

    return true;
  } catch (error) {
    console.error('Error setting up RLS policies:', error);
    return false;
  }
};

// User Management
export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user by ID:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  },

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Category Management
export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Service Management
export const serviceService = {
  async getByCategory(categoryId: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(serviceData: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .insert(serviceData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Service>): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Add-on Management
export const addOnService = {
  async getAll(): Promise<AddOn[]> {
    const { data, error } = await supabase
      .from('add_ons')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getByCategory(categoryId: string): Promise<AddOn[]> {
    const { data, error } = await supabase
      .from('add_ons')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async create(addOnData: Omit<AddOn, 'id' | 'created_at' | 'updated_at'>): Promise<AddOn | null> {
    const { data, error } = await supabase
      .from('add_ons')
      .insert(addOnData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<AddOn>): Promise<AddOn | null> {
    const { data, error } = await supabase
      .from('add_ons')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Booking Management
export const bookingService = {
  async getByUser(userId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        serviceName: b.service_name || 'N/A',
        startTime: b.start_time || '',
        endTime: b.end_time || '',
        bookingStatus: b.status || 'pending',
        paymentStatus: b.payment_status || 'pending',
        attendees: b.participants || 1,
        addOns: b.add_ons || {},
      }));
    } catch (error) {
      console.error('Error getting user bookings:', error);
      return [];
    }
  },

  async getAll(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        serviceName: b.service_name || 'N/A',
        startTime: b.start_time || '',
        endTime: b.end_time || '',
        bookingStatus: b.status || 'pending',
        paymentStatus: b.payment_status || 'pending',
        attendees: b.participants || 1,
        addOns: b.add_ons || {},
      }));
    } catch (error) {
      console.error('Error getting all bookings:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async cancel(id: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  // Check availability for a specific date and time
  async checkAvailability(date: string, startTime: string, endTime: string, serviceId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('service_id', serviceId)
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);
    
    if (error) throw error;
    return !data || data.length === 0;
  },

  async createSlot({ booking_id, date, start_time, end_time }: { booking_id: string, date: string, start_time: string, end_time: string }) {
    const { data, error } = await supabase
      .from('booking_slots')
      .insert([{ booking_id, date, start_time, end_time }]);
    if (error) throw error;
    return data;
  },

  async getConfirmedByDateAndService(date: string, serviceId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('service_id', serviceId)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid');
    return { data, error };
  },

  async getSlotsByDate(date: string) {
    const { data, error } = await supabase
      .from('booking_slots')
      .select('*')
      .eq('date', date);
    return { data, error };
  },

  async getConfirmedByDate(date: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid');
    return { data, error };
  }
};

// Time Slot Management
export const timeSlotService = {
  async getByService(serviceId: string): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .order('day_of_week');
    
    if (error) throw error;
    return data || [];
  },

  async create(timeSlotData: Omit<TimeSlot, 'id' | 'created_at' | 'updated_at'>): Promise<TimeSlot | null> {
    const { data, error } = await supabase
      .from('time_slots')
      .insert(timeSlotData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Blocked Slot Management
export const blockedSlotService = {
  async getByDateRange(startDate: string, endDate: string): Promise<BlockedSlot[]> {
    const { data, error } = await supabase
      .from('blocked_slots')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) throw error;
    return data || [];
  },

  async create(blockedSlotData: Omit<BlockedSlot, 'id' | 'created_at' | 'updated_at'>): Promise<BlockedSlot | null> {
    const { data, error } = await supabase
      .from('blocked_slots')
      .insert(blockedSlotData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Gallery Management
export const galleryService = {
  async getByCategory(category: 'gallery' | 'hero' | 'services'): Promise<Gallery[]> {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    return data || [];
  },

  async create(galleryData: Omit<Gallery, 'id' | 'created_at' | 'updated_at'>): Promise<Gallery | null> {
    const { data, error } = await supabase
      .from('gallery')
      .insert(galleryData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Gallery>): Promise<Gallery | null> {
    const { data, error } = await supabase
      .from('gallery')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Settings Management
export const settingService = {
  async get(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) throw error;
    return data?.value || null;
  },

  async set(key: string, value: string, description?: string): Promise<void> {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, description })
      .select();
    
    if (error) throw error;
  }
};

export const bookingSlotService = {
  async getByDateAndService(date: string, serviceId: string) {
    // Join booking_slots with bookings to get service_id and status, only confirmed bookings block slots
    const { data, error } = await supabase
      .from('booking_slots')
      .select('*, bookings(status, service_id)')
      .eq('date', date)
      .filter('bookings.status', 'eq', 'confirmed')
      .filter('bookings.service_id', 'eq', serviceId);
    if (error) throw error;
    return data || [];
  },

  async getConfirmedSlotsByDateRange(startDate: string, endDate: string) {
    // Join booking_slots with bookings to get only slots for bookings with status 'confirmed'
    const { data, error } = await supabase
      .from('booking_slots')
      .select('*, bookings(status)')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    // Only return slots where bookings.status === 'confirmed'
    return (data || []).filter(slot => slot.bookings && slot.bookings.status === 'confirmed');
  }
}; 