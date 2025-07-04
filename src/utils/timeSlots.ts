// Dynamic Time Slot Generation Utility
import { addDays, format, isAfter, isBefore, startOfDay } from 'date-fns';

export interface TimeSlotConfig {
  serviceId: string;
  categoryId: string;
  startHour: number;
  endHour: number;
  slotDuration: number; // in hours
  advanceBookingHours: number;
  maxParticipants: number;
  availableDays: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export interface GeneratedTimeSlot {
  id: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  dayOfWeek: number;
  isBlocked: boolean;
  isBooked: boolean;
}

export interface BookingRule {
  categoryId: string;
  advanceBookingHours: number;
  blockCurrentTimePlus?: number; // hours to block from current time
  maxParticipants: number;
}

// Booking rules for different categories
export const BOOKING_RULES: { [key: string]: BookingRule } = {
  'jampad': {
    categoryId: 'jampad',
    advanceBookingHours: 2, // Book at least 2 hours in advance
    blockCurrentTimePlus: 2, // Block current time + 2 hours
    maxParticipants: 10
  },
  'recording-studio': {
    categoryId: 'recording-studio',
    advanceBookingHours: 24, // Book at least 24 hours in advance
    blockCurrentTimePlus: 24, // Block all slots within 24 hours
    maxParticipants: 6
  }
};

// Service configurations - these will be matched by name, not ID
export const SERVICE_CONFIGS: { [key: string]: TimeSlotConfig } = {
  'Jampad': {
    serviceId: 'Jampad',
    categoryId: 'jampad',
    startHour: 9, // 9 AM
    endHour: 22, // 10 PM
    slotDuration: 1, // 1 hour slots
    advanceBookingHours: 2,
    maxParticipants: 10,
    availableDays: [1, 2, 3, 4, 5, 6, 7] // Monday to Sunday
  },
  'Raw Recording': {
    serviceId: 'Raw Recording',
    categoryId: 'recording-studio',
    startHour: 11, // 11 AM
    endHour: 22, // 10 PM
    slotDuration: 1, // 1 hour slots
    advanceBookingHours: 24,
    maxParticipants: 6,
    availableDays: [1, 2, 3, 4, 5, 6] // Monday to Saturday
  },
  'Mixing & Mastering': {
    serviceId: 'Mixing & Mastering',
    categoryId: 'recording-studio',
    startHour: 11, // 11 AM
    endHour: 22, // 10 PM
    slotDuration: 1, // 1 hour slots
    advanceBookingHours: 24,
    maxParticipants: 1,
    availableDays: [1, 2, 3, 4, 5, 6] // Monday to Saturday
  }
};

// Fallback configurations for when service name doesn't match exactly
export const FALLBACK_CONFIGS: { [key: string]: TimeSlotConfig } = {
  'jampad': {
    serviceId: 'jampad',
    categoryId: 'jampad',
    startHour: 9,
    endHour: 22,
    slotDuration: 1,
    advanceBookingHours: 2,
    maxParticipants: 10,
    availableDays: [1, 2, 3, 4, 5, 6, 7]
  },
  'recording': {
    serviceId: 'recording',
    categoryId: 'recording-studio',
    startHour: 11,
    endHour: 22,
    slotDuration: 1,
    advanceBookingHours: 24,
    maxParticipants: 6,
    availableDays: [1, 2, 3, 4, 5, 6]
  },
  'mixing': {
    serviceId: 'mixing',
    categoryId: 'recording-studio',
    startHour: 11,
    endHour: 22,
    slotDuration: 1,
    advanceBookingHours: 24,
    maxParticipants: 1,
    availableDays: [1, 2, 3, 4, 5, 6]
  }
};

// Helper function to find service configuration
export const findServiceConfig = (serviceId: string): TimeSlotConfig | null => {
  // First try exact match
  if (SERVICE_CONFIGS[serviceId]) {
    return SERVICE_CONFIGS[serviceId];
  }
  
  // Try case-insensitive match
  const lowerServiceId = serviceId.toLowerCase();
  for (const [key, config] of Object.entries(SERVICE_CONFIGS)) {
    if (key.toLowerCase() === lowerServiceId) {
      return config;
    }
  }
  
  // Try partial match
  for (const [key, config] of Object.entries(SERVICE_CONFIGS)) {
    if (key.toLowerCase().includes(lowerServiceId) || lowerServiceId.includes(key.toLowerCase())) {
      return config;
    }
  }
  
  // Try fallback configs
  for (const [key, config] of Object.entries(FALLBACK_CONFIGS)) {
    if (lowerServiceId.includes(key)) {
      return config;
    }
  }
  
  // Default fallback for any service
  return {
    serviceId: serviceId,
    categoryId: 'default',
    startHour: 9,
    endHour: 22,
    slotDuration: 1,
    advanceBookingHours: 2,
    maxParticipants: 10,
    availableDays: [1, 2, 3, 4, 5, 6, 7]
  };
};

export const generateTimeSlots = (
  serviceId: string,
  startDate: Date,
  endDate: Date,
  existingBookings: any[] = [],
  blockedSlots: any[] = []
): GeneratedTimeSlot[] => {
  const config = findServiceConfig(serviceId);
  if (!config) {
    console.error(`No configuration found for service: ${serviceId}`);
    // Return empty array instead of throwing error
    return [];
  }

  const slots: GeneratedTimeSlot[] = [];
  const currentDate = new Date();
  const currentTime = new Date();

  // Generate slots for each day in the range
  let currentDay = startOfDay(startDate);
  
  while (isBefore(currentDay, endDate) || currentDay.getTime() === endDate.getTime()) {
    const dayOfWeek = currentDay.getDay() || 7; // Convert Sunday (0) to 7
    
    // Check if this day is available for the service
    if (config.availableDays.includes(dayOfWeek)) {
      const dateStr = format(currentDay, 'yyyy-MM-dd');
      
      // Generate time slots for this day
      for (let hour = config.startHour; hour < config.endHour; hour += config.slotDuration) {
        const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
        const endTime = `${(hour + config.slotDuration).toString().padStart(2, '0')}:00:00`;
        
        // Check if this slot is blocked by advance booking rules
        const slotDateTime = new Date(`${dateStr}T${startTime}`);
        const hoursUntilSlot = (slotDateTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
        
        const isBlockedByAdvanceRule = hoursUntilSlot < config.advanceBookingHours;
        
        // Check if slot is blocked by maintenance/events
        const isBlockedByEvent = blockedSlots.some(blocked => 
          blocked.date === dateStr &&
          blocked.start_time <= startTime &&
          blocked.end_time >= endTime
        );
        
        // Check if slot is already booked (only count confirmed bookings)
        const isBooked = existingBookings.some(bookingSlot => 
          bookingSlot.date === dateStr &&
          bookingSlot.start_time === startTime &&
          bookingSlot.end_time === endTime &&
          bookingSlot.bookings && 
          bookingSlot.bookings.status === 'confirmed'
        );
        
       
        const slot: GeneratedTimeSlot = {
          id: `${serviceId}-${dateStr}-${startTime}`,
          serviceId,
          date: dateStr,
          startTime,
          endTime,
          available: !isBlockedByAdvanceRule && !isBlockedByEvent && !isBooked,
          dayOfWeek,
          isBlocked: isBlockedByAdvanceRule || isBlockedByEvent,
          isBooked
        };
        
        slots.push(slot);
      }
    }
    
    currentDay = addDays(currentDay, 1);
  }
  
  return slots;
};

export const getAvailableDates = (serviceId: string, daysAhead: number = 30): Date[] => {
  const config = findServiceConfig(serviceId);
  if (!config) return [];
  
  const dates: Date[] = [];
  const today = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i);
    const dayOfWeek = date.getDay() || 7;
    
    if (config.availableDays.includes(dayOfWeek)) {
      dates.push(date);
    }
  }
  
  return dates;
};

export const formatTimeSlot = (slot: GeneratedTimeSlot) => {
  return {
    ...slot,
    formattedDate: format(new Date(slot.date), 'EEEE, MMMM do'),
    formattedTime: `${slot.startTime} - ${slot.endTime}`,
    status: slot.isBooked ? 'Booked' : slot.isBlocked ? 'Unavailable' : 'Available'
  };
};

export const calculateSlotPrice = (serviceId: string, duration: number, addOns: { [key: string]: number } = {}) => {
  const config = findServiceConfig(serviceId);
  if (!config) return 0;
  
  // This would need to be fetched from the database
  // For now, using hardcoded prices
  const basePricePerHour = {
    'Jampad': 400,
    'Raw Recording': 1000,
    'Mixing & Mastering': 0 // Contact for quotation
  }[serviceId] || 0;
  
  const addOnPrices = {
    'live-recording': 1000,
    'in-ears': 300
  };
  
  const basePrice = basePricePerHour * duration;
  const addOnsTotal = Object.entries(addOns).reduce((total, [addOnId, quantity]) => {
    return total + ((addOnPrices[addOnId as keyof typeof addOnPrices] || 0) * quantity);
  }, 0);
  
  return basePrice + addOnsTotal;
};

export const formatDate = (date: string | Date) => {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMMM d, yyyy');
};

export const formatTime = (time: string) => {
  if (!time) return 'N/A';
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}; 