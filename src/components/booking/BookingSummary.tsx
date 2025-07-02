import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Calendar, Clock, Package, CreditCard } from 'lucide-react';
import { bookingService, serviceService, addOnService } from '../../lib/database';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../UI/LoadingSpinner';
import PaymentGateway from './PaymentGateway';

interface BookingSummaryProps {
  categoryId: string;
  serviceId: string;
  selectedDate: Date;
  selectedSlots: { startTime: string; endTime: string }[];
  selectedAddOns: { [key: string]: number };
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    specialRequirements: string;
    attendees: number;
  };
  onBack: () => void;
  onComplete: (bookingId: string) => void;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  duration: number;
  max_participants: number;
  features: string[];
}

interface AddOn {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  categoryId,
  serviceId,
  selectedDate,
  selectedSlots,
  selectedAddOns,
  customerDetails,
  onBack}) => {
  const { user } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [serviceData, addOnsData] = await Promise.all([
          serviceService.getById(serviceId),
          addOnService.getByCategory(categoryId)
        ]);
        // Fix: Ensure all required fields are non-null and correct type for Service and AddOn
        setService(
          serviceData
            ? {
                ...serviceData,
                description: serviceData.description ?? '',
                features: Array.isArray(serviceData.features) ? serviceData.features : [],
                duration: typeof serviceData.duration === 'number' ? serviceData.duration : 1,
                max_participants: typeof serviceData.max_participants === 'number' ? serviceData.max_participants : 1,
                price_per_hour: typeof serviceData.price_per_hour === 'number' ? serviceData.price_per_hour : 0,
                name: serviceData.name ?? '',
                id: serviceData.id ?? '',
              }
            : null
        );
        setAddOns(
          Array.isArray(addOnsData)
            ? addOnsData.map((addOn) => ({
                ...addOn,
                description: addOn.description ?? '',
              }))
            : []
        );
      } catch (err) {
        console.error('Error fetching booking data:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serviceId, categoryId]);

  const calculateServiceCost = () => {
    if (!service) return 0;
    return service.price_per_hour * selectedSlots.length;
  };

  const calculateAddOnsCost = () => {
    return addOns.reduce((total, addOn) => {
      const quantity = selectedAddOns[addOn.id] || 0;
      // Charge per hour (time slots) but not multiplied by quantity
      // If quantity > 0, charge the add-on price for each hour
      return total + (quantity > 0 ? addOn.price_per_hour * selectedSlots.length : 0);
    }, 0);
  };

  const calculateTotalCost = () => {
    return calculateServiceCost() + calculateAddOnsCost();
  };

  const calculateAdvanceAmount = () => {
    return Math.round(calculateTotalCost() * 0.50); // 50% advance
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };


  const handleSubmitBooking = async () => {
    if (!user || !service) return;

    try {
      setSubmitting(true);
      setError(null);

      // Sort slots to get the earliest and latest for summary fields
      const sortedSlots = selectedSlots.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
      const start_time = sortedSlots[0].startTime;
      const end_time = sortedSlots[sortedSlots.length - 1].endTime;
      const duration = selectedSlots.length;

      // Note: start_time/end_time/duration in bookings is just a summary for display.
      // Actual slot-level logic is enforced via booking_slots table.
      const bookingData = {
        user_id: user.id,
        customer_name: customerDetails.name,
        customer_email: customerDetails.email,
        customer_phone: customerDetails.phone,
        category_id: categoryId,
        service_id: serviceId,
        date: selectedDate.toISOString().split('T')[0],
        start_time,
        end_time,
        duration,
        participants: customerDetails.attendees || 1,
        // Supabase type expects string[], but DB is jsonb. Use 'as any' to bypass type check.
        add_ons: selectedAddOns as any,
        total_amount: calculateTotalCost(),
        advance_amount: calculateAdvanceAmount(),
        status: 'confirmed' as 'confirmed',
        payment_status: 'pending' as 'pending',
        notes: customerDetails.specialRequirements || null,
        google_calendar_event_id: null
      };

      const booking = await bookingService.create(bookingData);
      if (booking) {
        // Insert each slot into booking_slots table
        for (const slot of selectedSlots) {
          await bookingService.createSlot({
            booking_id: booking.id,
            date: selectedDate.toISOString().split('T')[0],
            start_time: slot.startTime,
            end_time: slot.endTime
          });
        }
        setBookingId(booking.id);
        setShowPayment(true);
      } else {
        throw new Error('Failed to create booking');
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Payment successful, navigate to success page
    if (bookingId) {
      window.location.href = `/payment-success/${bookingId}`;
    }
  };

  const handlePaymentFailure = (error: string) => {
    setError(`Payment failed: ${error}`);
    setShowPayment(false);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setBookingId(null);
  };

  // Show payment gateway if booking is created and payment is requested
  if (showPayment && bookingId) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={handlePaymentCancel}
            className="flex items-center text-gray-400 hover:text-white transition-colors mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Summary
          </button>
          <h2 className="text-2xl font-bold text-white">Payment</h2>
        </div>
        
        <PaymentGateway
          bookingId={bookingId}
          amount={calculateAdvanceAmount()}
          customerDetails={{
            name: customerDetails.name,
            email: customerDetails.email,
            phone: customerDetails.phone
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          onCancel={handlePaymentCancel}
        />
      </div>
    );
  }

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

  if (!service) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center">
        <p className="text-red-400">Service not found</p>
      </div>
    );
  }

  const serviceCost = calculateServiceCost();
  const addOnsCost = calculateAddOnsCost();
  const totalCost = calculateTotalCost();
  const advanceAmount = calculateAdvanceAmount();

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
        <h2 className="text-2xl font-bold text-white">Booking Summary</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Booking Details */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-secondary" />
              Booking Details
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center text-gray-300">
                <Calendar className="w-4 h-4 mr-3 text-secondary" />
                <span className="font-medium">Date:</span>
                <span className="ml-2">{formatDate(selectedDate)}</span>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-secondary" />
                  Selected Slots
                </h3>
                <ul className="text-gray-300">
                  {selectedSlots
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((slot, idx) => (
                      <li key={idx}>
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-secondary" />
              Service Details
            </h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-white">{service.name}</h4>
                <p className="text-gray-300 text-sm">{service.description}</p>
              </div>
              
              <div className="text-sm text-gray-400">
                <div className="font-medium mb-2">What's included:</div>
                <ul className="space-y-1">
                  {service.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-secondary rounded-full mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {Object.keys(selectedAddOns).length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Selected Add-ons</h3>
              <div className="space-y-2">
                {addOns
                  .filter(addOn => selectedAddOns[addOn.id] > 0)
                  .map(addOn => (
                    <div key={addOn.id} className="flex justify-between items-center">
                      <div>
                        <span className="text-white">{addOn.name}</span>
                        <span className="text-gray-400 text-sm ml-2">
                          (selected)
                        </span>
                      </div>
                      <span className="text-secondary font-semibold">
                        ₹{addOn.price_per_hour * selectedSlots.length}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer Details & Pricing */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Customer Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Name:</span>
                <span className="text-white ml-2">{customerDetails.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="text-white ml-2">{customerDetails.email}</span>
              </div>
              <div>
                <span className="text-gray-400">Phone:</span>
                <span className="text-white ml-2">{customerDetails.phone}</span>
              </div>
              <div>
                <span className="text-gray-400">Attendees:</span>
                <span className="text-white ml-2">{customerDetails.attendees}</span>
              </div>
              {customerDetails.specialRequirements && (
                <div>
                  <span className="text-gray-400">Special Requirements:</span>
                  <p className="text-white mt-1">{customerDetails.specialRequirements}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pricing Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Service Cost:</span>
                <span className="text-white">₹{serviceCost}</span>
              </div>
              {addOnsCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Add-ons:</span>
                  <span className="text-white">₹{addOnsCost}</span>
                </div>
              )}
              <div className="border-t border-gray-600 pt-3 flex justify-between">
                <span className="text-white font-semibold">Total Amount:</span>
                <span className="text-secondary font-bold text-lg">₹{totalCost}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Advance Payment (50%):</span>
                <span className="text-yellow-500 font-semibold">₹{advanceAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Remaining Amount:</span>
                <span className="text-gray-300">₹{totalCost - advanceAmount}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold text-yellow-400 mb-2">Important Information</h4>
                <ul className="text-yellow-300 space-y-1">
                  <li>• 50% advance payment required to confirm booking</li>
                  <li>• Remaining amount to be paid at the studio</li>
                  <li>• Free cancellation up to 24 hours before</li>
                  <li>• Please download and bring the receipt</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        <button
          onClick={handleSubmitBooking}
          disabled={submitting}
          className="w-full bg-secondary hover:bg-secondary/80 disabled:bg-gray-600 text-primary font-bold py-4 px-6 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
        >
          {submitting ? (
            <>
              <LoadingSpinner />
              <span className="ml-2">Creating Booking...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Proceed to Payment (₹{advanceAmount} advance)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BookingSummary;