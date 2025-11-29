// Dynamic Time Slot Generation Utility
// 
// CATEGORY-BASED CONFIGURATION SYSTEM:
// This system uses category IDs to determine booking rules and availability.
// To add a new service category:
// 1. Add the category configuration to the categoryConfigs object in findServiceConfig()
// 2. Pass the categoryId parameter when calling generateTimeSlots() or findServiceConfig()
// 3. All services in the same category will automatically use the same rules
//
// Example usage:
// generateTimeSlots(serviceId, startDate, endDate, bookings, blocked, 'jampad')
// findServiceConfig(serviceId, 'recording-studio')
//
import { addDays, format, isBefore, startOfDay, parseISO } from 'date-fns';

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
  'Jampad Session': {
    serviceId: 'Jampad Session',
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
    startHour: 9, // 9 AM
    endHour: 22, // 10 PM
    slotDuration: 1, // 1 hour slots
    advanceBookingHours: 24,
    maxParticipants: 6,
    availableDays: [1, 2, 3, 4, 5, 6, 7] // Monday to Sunday (7 days)
  },
  'Mixing & Mastering': {
    serviceId: 'Mixing & Mastering',
    categoryId: 'recording-studio',
    startHour: 9, // 9 AM
    endHour: 22, // 10 PM
    slotDuration: 1, // 1 hour slots
    advanceBookingHours: 24,
    maxParticipants: 1,
    availableDays: [1, 2, 3, 4, 5, 6, 7] // Monday to Sunday (7 days)
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
  'jampad session': {
    serviceId: 'jampad session',
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
    startHour: 9,
    endHour: 22,
    slotDuration: 1,
    advanceBookingHours: 24,
    maxParticipants: 6,
    availableDays: [1, 2, 3, 4, 5, 6, 7]
  },
  'mixing': {
    serviceId: 'mixing',
    categoryId: 'recording-studio',
    startHour: 9,
    endHour: 22,
    slotDuration: 1,
    advanceBookingHours: 24,
    maxParticipants: 1,
    availableDays: [1, 2, 3, 4, 5, 6, 7]
  }
};

// Helper function to find service configuration
export const findServiceConfig = (serviceId: string, categoryId?: string): TimeSlotConfig | null => {
  
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
  
  // Category-based configurations
  // This is the main configuration system - add new categories here
  const categoryConfigs: { [key: string]: TimeSlotConfig } = {
    'jampad': {
      serviceId: serviceId,
      categoryId: 'jampad',
      startHour: 9,
      endHour: 22,
      slotDuration: 1,
      advanceBookingHours: 2,
      maxParticipants: 10,
      availableDays: [1, 2, 3, 4, 5, 6, 7]
    },
    'recording-studio': {
      serviceId: serviceId,
      categoryId: 'recording-studio',
      startHour: 9,
      endHour: 22,
      slotDuration: 1,
      advanceBookingHours: 24,
      maxParticipants: 6,
      availableDays: [1, 2, 3, 4, 5, 6, 7]
    },
    '5bb7cae3-40c1-4e91-9c81-090f11266313': {
      serviceId: serviceId,
      categoryId: '5bb7cae3-40c1-4e91-9c81-090f11266313',
      startHour: 9,
      endHour: 22,
      slotDuration: 1,
      advanceBookingHours: 24,
      maxParticipants: 6,
      availableDays: [1, 2, 3, 4, 5, 6, 7]
    },
    'c5d1dc72-55aa-496d-aaff-99943861b2df': {
      serviceId: serviceId,
      categoryId: 'c5d1dc72-55aa-496d-aaff-99943861b2df',
      startHour: 9,
      endHour: 22,
      slotDuration: 1,
      advanceBookingHours: 2,
      maxParticipants: 10,
      availableDays: [1, 2, 3, 4, 5, 6, 7]
    }
    // Add new categories here:
    // 'new-category': {
    //   serviceId: serviceId,
    //   categoryId: 'new-category',
    //   startHour: 10,
    //   endHour: 20,
    //   slotDuration: 2,
    //   advanceBookingHours: 48,
    //   maxParticipants: 4,
    //   availableDays: [1, 2, 3, 4, 5] // Mon-Fri only
    // }
  };
  
  // Use provided categoryId or fallback to service ID mapping
  let resolvedCategoryId = categoryId || 'default';
  
  // If no categoryId provided, use simple mapping for existing services
  if (!categoryId) {
    if (serviceId === '1c2c713a-e8be-4af1-9f57-cde140e6d1b6') {
      resolvedCategoryId = 'c5d1dc72-55aa-496d-aaff-99943861b2df'; // Jampad category ID
    } else if (serviceId === '8e94a72f-887b-4f91-87f8-ac0dbf30155a') {
      resolvedCategoryId = '5bb7cae3-40c1-4e91-9c81-090f11266313'; // Strumhouse Recording Studio category ID
    }
  }
  
  if (categoryConfigs[resolvedCategoryId]) {
    return categoryConfigs[resolvedCategoryId];
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

/**
 * Check if two time ranges overlap (string-based, no timezone conversion)
 * Proper overlap: startA < endB && startB < endA
 * Assumes times are in HH:MM:SS format and same date
 */
export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  // Simple string comparison works for HH:MM:SS format
  // Proper overlap: startA < endB && startB < endA
  return startA < endB && startB < endA;
}

export const generateTimeSlots = (
  serviceId: string,
  startDate: Date,
  endDate: Date,
  existingBookings: any[] = [],
  blockedSlots: any[] = [],
  categoryId?: string
): GeneratedTimeSlot[] => {
  
  const config = findServiceConfig(serviceId, categoryId);
  if (!config) {
    console.error(`No configuration found for service: ${serviceId}`);
    // Return empty array instead of throwing error
    return [];
  }

  const slots: GeneratedTimeSlot[] = [];
  
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
        const bookingCutoffTime = new Date(currentTime.getTime() + config.advanceBookingHours * 60 * 60 * 1000);
        const isBlockedByAdvanceRule = isBefore(slotDateTime, bookingCutoffTime);
        
        // Check if slot is blocked by maintenance/events
        // Use proper overlap logic instead of containment
        const isBlockedByEvent = blockedSlots.some(blocked => {
          if (blocked.date !== dateStr) return false;
          // Use proper overlap logic: startA < endB && startB < endA
          return timesOverlap(
            startTime,
            endTime,
            blocked.start_time,
            blocked.end_time
          );
        });
        
        // Check if slot is already booked (only count confirmed bookings)
        const isBooked = existingBookings.some(bookingSlot => {
          return bookingSlot.date === dateStr &&
            bookingSlot.start_time === startTime &&
            bookingSlot.end_time === endTime &&
            bookingSlot.bookings && 
            bookingSlot.bookings.status === 'confirmed';
        });
        
       
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

export const getAvailableDates = (serviceId: string, daysAhead: number = 30, categoryId?: string): Date[] => {
  const config = findServiceConfig(serviceId, categoryId);
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



export const formatDate = (date: string | Date) => {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMMM d, yyyy');
};

// Helper function to get current date in local timezone
export const getCurrentDateIST = (): string => {
  const now = new Date();
  return format(now, 'yyyy-MM-dd');
};

// Helper function to convert date to local timezone
export const toISTDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

export const formatTime = (time: string) => {
  if (!time) return 'N/A';
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}; 