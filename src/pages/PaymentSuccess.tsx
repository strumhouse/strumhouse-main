import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Clock, MapPin, Download, Share2, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService } from '../lib/database';
import { paymentService } from '../lib/payment';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const MAX_RETRIES = 5;

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const bookingData = await bookingService.getById(bookingId!);
      if (bookingData) {
        setBooking(bookingData);
      } else if (attempts < MAX_RETRIES) {
        setTimeout(() => {
          setAttempts(a => a + 1);
        }, 1000); // retry after 1s
      } else {
        setError('Booking Not Found');
      }

      const paymentData = await paymentService.getPaymentByBookingId(bookingId!);
      setPayment(paymentData);
    } catch (err) {
      if (attempts < MAX_RETRIES) {
        setTimeout(() => {
          setAttempts(a => a + 1);
        }, 1000);
      } else {
        setError('Booking Not Found');
      }
    }
  }, [bookingId, attempts]);

  useEffect(() => {
    if (bookingId && !booking && !error) {
      fetchData();
    }
  }, [bookingId, booking, error, fetchData, attempts]);

  const handleDownloadReceipt = () => {
    // Generate and download receipt
    const receiptData = {
      bookingId: booking?.id,
      customerName: booking?.customer_name,
      service: booking?.service_name,
      date: booking?.date,
      time: `${booking?.start_time} - ${booking?.end_time}`,
      amount: booking?.total_amount,
      paymentId: payment?.razorpay_payment_id,
      paymentDate: payment?.created_at
    };

    const receiptText = `
      STRUMHOUSE STUDIO
      =================
      
      Booking Receipt
      ===============
      
      Booking ID: ${receiptData.bookingId}
      Customer: ${receiptData.customerName}
      Service: ${receiptData.service}
      Date: ${receiptData.date}
      Time: ${receiptData.time}
      Total Amount: ₹${receiptData.amount}
      
      Payment Details
      ===============
      Payment ID: ${receiptData.paymentId}
      Payment Date: ${new Date(receiptData.paymentDate).toLocaleDateString()}
      Status: Paid
      
      Thank you for choosing StrumHouse Studio!
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${bookingId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My StrumHouse Booking',
          text: `I just booked a session at StrumHouse Studio! Booking ID: ${bookingId}`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`My StrumHouse Booking - ID: ${bookingId}`);
      alert('Booking details copied to clipboard!');
    }
  };

  if (authLoading || (!booking && !error)) {
    return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
        <div className="text-center text-gray-300">
          <h2 className="text-2xl font-bold mb-2">{error}</h2>
          <p className="mb-4">The booking you're looking for doesn't exist.</p>
          <a
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-white">Payment Successful</h1>
          </div>
        </div>
      </div>

      {/* Success Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-lg p-8"
        >
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Payment Successful!</h2>
            <p className="text-gray-300 text-lg">
              Your booking has been confirmed and payment has been processed.
            </p>
          </div>

          {/* Booking Details */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Booking Details</h3>
              <div className="space-y-4">
                <div className="flex items-center text-gray-300">
                  <Calendar className="w-5 h-5 mr-3 text-secondary" />
                  <span className="font-medium">Date:</span>
                  <span className="ml-2">{new Date(booking.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Clock className="w-5 h-5 mr-3 text-secondary" />
                  <span className="font-medium">Time:</span>
                  <span className="ml-2">{booking.start_time} - {booking.end_time}</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <MapPin className="w-5 h-5 mr-3 text-secondary" />
                  <span className="font-medium">Duration:</span>
                  <span className="ml-2">{booking.duration} hour{booking.duration > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Payment Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Amount:</span>
                  <span className="text-white font-semibold">₹{booking.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Advance Paid:</span>
                  <span className="text-green-400 font-semibold">₹{booking.advance_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Remaining:</span>
                  <span className="text-yellow-400 font-semibold">₹{booking.total_amount - booking.advance_amount}</span>
                </div>
                {payment && (
                  <div className="pt-4 border-t border-gray-600">
                    <div className="text-sm text-gray-400">
                      Payment ID: {payment.razorpay_payment_id}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Customer Information</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Name:</span>
                <span className="text-white ml-2">{booking.customer_name}</span>
              </div>
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="text-white ml-2">{booking.customer_email}</span>
              </div>
              <div>
                <span className="text-gray-400">Phone:</span>
                <span className="text-white ml-2">{booking.customer_phone}</span>
              </div>
              <div>
                <span className="text-gray-400">Booking ID:</span>
                <span className="text-white ml-2 font-mono">{booking.id}</span>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 mb-8">
            <h4 className="text-lg font-semibold text-yellow-400 mb-4">Important Information</h4>
            <ul className="text-yellow-300 space-y-2">
              <li>• Please arrive 10 minutes before your scheduled time</li>
              <li>• Bring your own instruments if required</li>
              <li>• Remaining amount (₹{booking.total_amount - booking.advance_amount}) to be paid at the studio</li>
              <li>• Free cancellation up to 24 hours before your session</li>
              <li>• Please download and bring the receipt</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownloadReceipt}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-primary font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Receipt
            </button>
            <button
              onClick={handleShare}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share Booking
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              View All Bookings
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess; 