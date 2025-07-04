import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users } from 'lucide-react';
import { generateTimeSlots, findServiceConfig } from '../../utils/timeSlots';
import { bookingService, blockedSlotService, bookingSlotService } from '../../lib/database';
import LoadingSpinner from '../UI/LoadingSpinner';

interface CalendarViewProps {
  serviceId: string;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (date: Date, time: string, duration: number) => void;
  selectedDate: Date | null;
  selectedTime: string;
  selectedDuration?: number;
}

interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  availableSlots: number;
  totalSlots: number;
  isBlocked: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  serviceId,
  onDateSelect,
  onTimeSelect,
  selectedDate,
  selectedTime,
  selectedDuration
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate calendar days for current month
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.getTime() === today.getTime();
      const isSelected = !!selectedDate && currentDate.getTime() === selectedDate.getTime();
      
      // Get available slots for this date
      const daySlots = timeSlots.filter(slot => 
        slot.date === currentDate.toISOString().split('T')[0]
      );
      const availableSlots = daySlots.filter(slot => slot.available).length;
      const totalSlots = daySlots.length;
      const isBlocked = daySlots.length > 0 && availableSlots === 0;

      days.push({
        date: currentDate,
        dayOfWeek: currentDate.getDay(),
        isCurrentMonth,
        isToday,
        isSelected,
        availableSlots,
        totalSlots,
        isBlocked
      });
    }

    return days;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get date range for current month view
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        // Fetch existing confirmed booking slots and blocked slots
        const [bookings, blocked] = await Promise.all([
          bookingSlotService.getConfirmedSlotsByDateRange(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ),
          blockedSlotService.getByDateRange(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          )
        ]);

        // Generate time slots for the month
        const generatedSlots = generateTimeSlots(
          serviceId,
          startDate,
          endDate,
          bookings,
          blocked
        );

        setTimeSlots(generatedSlots);
        setCalendarDays(generateCalendarDays(currentMonth));
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMonth, serviceId]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth || day.isBlocked) return;
    onDateSelect(day.date);
  };

  const getTimeSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return timeSlots.filter(slot => slot.date === dateStr);
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

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-secondary" />
          Calendar View
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={prevMonth}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Service Info */}
      {serviceConfig && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-secondary" />
              <span className="text-gray-300">
                {serviceConfig.startHour}:00 - {serviceConfig.endHour}:00
              </span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2 text-secondary" />
              <span className="text-gray-300">
                Max {serviceConfig.maxParticipants} people
              </span>
            </div>
            <div className="text-gray-300">
              <span className="font-medium">Advance Booking:</span> {serviceConfig.advanceBookingHours}h
            </div>
            <div className="text-gray-300">
              <span className="font-medium">Available:</span> {serviceConfig.availableDays.length === 7 ? '7 days' : 'Mon-Sat'}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-gray-400">
            {day}
          </div>
        ))}
        
        {calendarDays.map((day, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: day.isCurrentMonth && !day.isBlocked ? 1.05 : 1 }}
            whileTap={{ scale: day.isCurrentMonth && !day.isBlocked ? 0.95 : 1 }}
            onClick={() => handleDateClick(day)}
            disabled={!day.isCurrentMonth || day.isBlocked}
            className={`p-3 min-h-[80px] border border-gray-700 rounded-lg transition-all ${
              day.isSelected
                ? 'border-secondary bg-secondary/10'
                : day.isToday
                ? 'border-yellow-500 bg-yellow-500/10'
                : !day.isCurrentMonth
                ? 'border-gray-800 bg-gray-800 opacity-30 cursor-not-allowed'
                : day.isBlocked
                ? 'border-red-500 bg-red-500/10 cursor-not-allowed'
                : 'border-gray-700 bg-gray-800 hover:border-secondary/50'
            }`}
          >
            <div className="text-center">
              <div className={`text-sm font-semibold ${
                day.isToday ? 'text-yellow-400' : 
                day.isSelected ? 'text-secondary' : 
                day.isCurrentMonth ? 'text-white' : 'text-gray-500'
              }`}>
                {day.date.getDate()}
              </div>
              
              {day.isCurrentMonth && day.totalSlots > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-400">
                    {day.availableSlots}/{day.totalSlots} slots
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                    <div 
                      className={`h-1 rounded-full transition-all ${
                        day.availableSlots === 0 ? 'bg-red-500' :
                        day.availableSlots < day.totalSlots / 2 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(day.availableSlots / day.totalSlots) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Time Slots for Selected Date */}
      {selectedDate && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Available Times for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          {/* Always show as vertical scrollable card */}
          <div
            className="w-full bg-gray-800 rounded-lg mb-8 overflow-y-auto"
            style={{ height: '20rem' }}
          >
            {getTimeSlotsForDate(selectedDate).map((slot) => (
              <motion.button
                key={slot.id}
                whileHover={{ scale: slot.available ? 1.02 : 1 }}
                whileTap={{ scale: slot.available ? 0.98 : 1 }}
                onClick={() => slot.available && onTimeSelect(selectedDate, slot.startTime, selectedDuration || 1)}
                disabled={!slot.available}
                className={`w-full h-[72px] flex items-center justify-center px-4 mb-2 rounded-lg border-2 transition-all ${
                  selectedTime === slot.startTime
                    ? 'border-secondary bg-secondary/10'
                    : !slot.available
                    ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                    : 'border-gray-600 hover:border-secondary/50 bg-gray-800'
                }`}
              >
                <div className="text-center w-full">
                  <div className="text-lg font-semibold text-white">
                    {formatTime(slot.startTime)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTime(slot.endTime)}
                  </div>
                  {!slot.available && (
                    <div className="text-xs text-red-400 mt-1">
                      {slot.isBooked ? 'Booked' : 'Unavailable'}
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-300">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span className="text-gray-300">Limited</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-gray-300">Booked/Blocked</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-400 rounded mr-2"></div>
            <span className="text-gray-300">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;