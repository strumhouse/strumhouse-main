import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, AlertCircle, Grid, List } from 'lucide-react';
import { blockedSlotService, bookingSlotService } from '../../lib/database';
import { generateTimeSlots, getAvailableDates, findServiceConfig } from '../../utils/timeSlots';
import LoadingSpinner from '../UI/LoadingSpinner';

interface DateTimeSelectorProps {
  serviceId: string;
  selectedDate: Date | null;
  selectedSlots: { startTime: string; endTime: string }[];
  onSelect: (date: Date, slots: { startTime: string; endTime: string }[]) => void;
  onBack: () => void;
  onNext: () => void;
}

interface GeneratedTimeSlot {
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


const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({ 
  serviceId, 
  selectedDate, 
  selectedSlots,
  onSelect, 
  onBack, 
  onNext 
}) => {
  const [timeSlots, setTimeSlots] = useState<GeneratedTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [localSelectedSlots, setLocalSelectedSlots] = useState<{ startTime: string; endTime: string }[]>(selectedSlots || []);

  useEffect(() => {
    setLocalSelectedSlots(selectedSlots || []);
  }, [selectedSlots]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        // Fetch all confirmed booked slots for the range
        const allBookedSlots = await bookingSlotService.getConfirmedSlotsByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Fetch blocked slots for the range
        const blocked = await blockedSlotService.getByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        const generatedSlots = generateTimeSlots(
          serviceId,
          startDate,
          endDate,
          allBookedSlots,
          blocked
        );
        setTimeSlots(generatedSlots);
      } catch (err) {
        console.error('Error fetching time slots:', err);
        setError('Failed to load available times');
      } finally {
        setLoading(false);
      }
    };
    if (serviceId) {
      fetchData();
    }
  }, [serviceId]);

  const getAvailableDatesForService = () => {
    return getAvailableDates(serviceId, 30);
  };

  const getAvailableTimeSlots = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return timeSlots.filter(slot => slot.date === dateStr);
  };

  const handleDateSelect = (date: Date) => {
    const dayOfWeek = date.getDay() || 7;
    setSelectedDayOfWeek(dayOfWeek);
    setLocalSelectedSlots([]);
    onSelect(date, []);
  };

  const handleSlotToggle = (slot: GeneratedTimeSlot) => {
    if (!slot.available) return;
    const exists = localSelectedSlots.some(
      s => s.startTime === slot.startTime && s.endTime === slot.endTime
    );
    let updated;
    if (exists) {
      updated = localSelectedSlots.filter(
        s => !(s.startTime === slot.startTime && s.endTime === slot.endTime)
      );
    } else {
      updated = [...localSelectedSlots, { startTime: slot.startTime, endTime: slot.endTime }];
    }
    setLocalSelectedSlots(updated);
    if (selectedDate) onSelect(selectedDate, updated);
  };


  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getServiceConfig = () => {
    return findServiceConfig(serviceId);
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400"
        >
          Retry
        </button>
      </div>
    );
  }

  const serviceConfig = getServiceConfig();
  const availableDates = getAvailableDatesForService();

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-400 hover:text-white transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-white">Select Date & Time</h2>
      </div>
      {/* Booking Rules Info */}
      {serviceConfig && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-secondary" />
            Booking Rules
          </h3>
          <div className="text-sm text-gray-300 space-y-1">
            <div>• Book at least {serviceConfig.advanceBookingHours} hours in advance</div>
            <div>• Available from {serviceConfig.startHour}:00 to {serviceConfig.endHour}:00</div>
            <div>• Max {serviceConfig.maxParticipants} participants</div>
            <div>• Available {serviceConfig.availableDays.length === 7 ? '7 days a week' : 'Monday to Saturday'}</div>
          </div>
        </div>
      )}
      {/* View Mode Toggle */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center px-4 py-2 rounded-l-lg transition-colors ${
            viewMode === 'list' 
              ? 'bg-secondary text-primary font-semibold' 
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <List className="w-4 h-4 mr-2" />
          List View
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center px-4 py-2 rounded-r-lg transition-colors ${
            viewMode === 'calendar' 
              ? 'bg-secondary text-primary font-semibold' 
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4 mr-2" />
          Calendar View
        </button>
      </div>
      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Date Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-secondary" />
              Choose Date
            </h3>
            <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {availableDates.map((date) => {
                const isSelected = selectedDate && 
                  date.toDateString() === selectedDate.toDateString();
                const availableSlots = getAvailableTimeSlots(date);
                const hasAvailableSlots = availableSlots.some(slot => slot.available);
                return (
                  <motion.button
                    key={date.toISOString()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDateSelect(date)}
                    disabled={!hasAvailableSlots}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary/10'
                        : hasAvailableSlots
                        ? 'border-gray-600 hover:border-secondary/50 bg-gray-800'
                        : 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm text-gray-400">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold text-white">
                        {date.getDate()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      {hasAvailableSlots && (
                        <div className="text-xs text-secondary mt-1">
                          {availableSlots.filter(slot => slot.available).length} slots
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
          {/* Time Slot Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-secondary" />
              Choose Time Slots
            </h3>
            {selectedDate && selectedDayOfWeek ? (
              <div className="space-y-3">
                {getAvailableTimeSlots(selectedDate).map((slot) => {
                  const checked = localSelectedSlots.some(
                    s => s.startTime === slot.startTime && s.endTime === slot.endTime
                  );
                  return (
                    <label
                      key={slot.id}
                      className={`flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        checked
                          ? 'border-secondary bg-secondary/10'
                          : !slot.available
                          ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                          : 'border-gray-600 hover:border-secondary/50 bg-gray-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-3 accent-secondary"
                        checked={checked}
                        disabled={!slot.available}
                        onChange={() => handleSlotToggle(slot)}
                      />
                      <span className="text-lg font-semibold text-white">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                      {!slot.available && (
                        <span className="ml-2 text-sm text-red-400 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {slot.isBooked ? 'Booked' : 'Unavailable'}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Select a date to see available slots</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Selected Slots Summary */}
      {selectedDate && localSelectedSlots.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 border border-secondary rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-2">Selected Slots</h4>
          <ul className="text-gray-300">
            {localSelectedSlots
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((slot, idx) => (
                <li key={idx}>
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedDate || localSelectedSlots.length === 0}
          className={`px-6 py-3 font-bold rounded-lg transition-colors ${
            !selectedDate || localSelectedSlots.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-secondary hover:bg-secondary/80 text-primary'
          }`}
        >
          Continue to Customer Details
        </button>
      </div>
    </div>
  );
};

export default DateTimeSelector;