export interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_per_hour: number;
  duration: number;
  max_participants: number;
  features: string[];
  is_active: boolean;
  advance_booking_hours: number;
  created_at: string;
  updated_at: string;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  max_quantity: number;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  category_id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  participants: number;
  add_ons: { [key: string]: number };
  total_amount: number;
  advance_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  google_calendar_event_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Gallery {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  category: 'gallery' | 'hero' | 'services';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Form data interfaces for the booking flow
export interface BookingFormData {
  categoryId: string;
  serviceId: string;
  selectedDate: Date | null;
  selectedTime: string;
  selectedAddOns: { [key: string]: number };
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    specialRequirements: string;
  };
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  specialRequirements: string;
}

export interface AdminSettings {
  blockedDates: string[];
  holidayDates: string[];
  customPricing: {
    [serviceId: string]: number;
  };
}

export interface Media {
  id: string;
  url: string;
  title: string;
  description?: string;
  category: 'gallery' | 'hero';
  created_at: string;
  updated_at: string;
}