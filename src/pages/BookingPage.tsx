import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BookingSteps from '../components/booking/BookingSteps';
import { useAuth } from '../hooks/useAuth';

const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div>Loading...</div></div>;
  }

  const handleBookingComplete = (id: string) => {
    setBookingId(id);
    setBookingComplete(true);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNewBooking = () => {
    setBookingComplete(false);
    setBookingId('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please Login</h2>
          <p className="text-gray-400 mb-6">You need to be logged in to make a booking.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-secondary hover:bg-secondary/80 text-primary font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 rounded-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Booking Confirmed!</h2>
          <p className="text-gray-300 mb-6">
            Your booking has been successfully created. You'll receive a confirmation email shortly.
          </p>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400">Booking ID</p>
            <p className="text-white font-mono text-lg">{bookingId}</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleBackToDashboard}
              className="w-full bg-secondary hover:bg-secondary/80 text-primary font-bold py-3 px-6 rounded-lg transition-colors"
            >
              View My Bookings
            </button>
            <button
              onClick={handleNewBooking}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Make Another Booking
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Booking Steps */}
      <div className="pt-16 py-8">
        <BookingSteps onComplete={handleBookingComplete} />
      </div>
    </div>
  );
};

export default BookingPage; 