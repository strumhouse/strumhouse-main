import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { realtimeClient } from '../lib/realtimeClient';

interface BookingContextType {
  refetchSlots: () => void;
  slotsInvalidated: boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBookingContext = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookingContext must be used within BookingProvider');
  }
  return context;
};

interface BookingProviderProps {
  children: React.ReactNode;
  onSlotsChanged?: () => void;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({ 
  children, 
  onSlotsChanged 
}) => {
  const [slotsInvalidated, setSlotsInvalidated] = useState(false);
  const { authReady } = useAuth();

  const refetchSlots = useCallback(() => {
    setSlotsInvalidated(true);
    if (onSlotsChanged) {
      onSlotsChanged();
    }
    // Reset after a short delay
    setTimeout(() => setSlotsInvalidated(false), 100);
  }, [onSlotsChanged]);

  useEffect(() => {
    if (!authReady) return;

    // Subscribe to blocked_slots changes
    const blockedSlotsCleanup = realtimeClient.subscribe(
      'blocked-slots-changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'blocked_slots'
      },
      (payload) => {
        console.log('Blocked slot changed:', payload);
        refetchSlots();
      }
    );

    // Subscribe to booking_slots changes (for confirmed bookings)
    const bookingSlotsCleanup = realtimeClient.subscribe(
      'booking-slots-changes',
      {
        event: '*',
        schema: 'public',
        table: 'booking_slots'
      },
      (payload) => {
        console.log('Booking slot changed:', payload);
        refetchSlots();
      }
    );

    // Subscribe to bookings status changes
    const bookingsCleanup = realtimeClient.subscribe(
      'bookings-status-changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: 'status=eq.confirmed'
      },
      (payload) => {
        console.log('Booking confirmed:', payload);
        refetchSlots();
      }
    );

    return () => {
      blockedSlotsCleanup();
      bookingSlotsCleanup();
      bookingsCleanup();
    };
  }, [authReady, refetchSlots]);

  return (
    <BookingContext.Provider value={{ refetchSlots, slotsInvalidated }}>
      {children}
    </BookingContext.Provider>
  );
};

