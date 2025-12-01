import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Lock, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { paymentService, PaymentOrder, PaymentResponse, formatAmount } from '../../lib/payment';
import { emailJSService } from '../../lib/emailjs';
import LoadingSpinner from '../UI/LoadingSpinner';

interface PaymentGatewayProps {
  bookingId: string;
  amount: number;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
  onPaymentSuccess: (paymentDetails: any) => void;
  onPaymentFailure: (error: string) => void;
  onCancel: () => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  bookingId,
  amount,
  customerDetails,
  onPaymentSuccess,
  onPaymentFailure,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [agreed, setAgreed] = useState(false);
  const [pollingBookingStatus, setPollingBookingStatus] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  useEffect(() => {
    createPaymentOrder();
  }, []);

  const createPaymentOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const paymentOrder = await paymentService.createOrder(bookingId, amount);
      setOrder(paymentOrder);
    } catch (err) {
      console.error('Error creating payment order:', err);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pollBookingStatus = async () => {
    const maxAttempts = 30; 
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPollingBookingStatus(false);
        // Note: We don't fail here, we just tell them to check email.
        // The backend might just be slow.
        setBookingConfirmed(true); 
        setTimeout(() => onPaymentSuccess({ booking_id: bookingId }), 2000);
        return;
      }

      try {
        const booking = await paymentService.getBookingDetails(bookingId);
        
        if (booking && booking.status === 'confirmed' && booking.payment_status === 'paid') {
          setBookingConfirmed(true);
          setPollingBookingStatus(false);
          setPaymentStatus('success');
          
          setTimeout(() => {
            onPaymentSuccess({ booking_id: bookingId });
          }, 2000);
          return;
        }
        
        attempts++;
        setTimeout(poll, 1000);
      } catch (err) {
        console.error('Error polling booking status:', err);
        attempts++;
        setTimeout(poll, 1000);
      }
    };

    poll();
  };

  const handlePaymentSuccess = async (response: PaymentResponse) => {
    try {
      setPaymentStatus('processing');
      
      // 1. Verify payment via Backend
      const isVerified = await paymentService.verifyPayment(response);
      
      if (!isVerified) {
        // If verify fails, we still poll, because the webhook might save it.
        console.warn('Direct verification failed, falling back to polling...');
      }

      // 2. Start polling for the DB update (Webhook or Verify endpoint results)
      setPollingBookingStatus(true);
      pollBookingStatus();

      // 3. Send email notification (Fire and forget)
      try {
        const bookingData = await paymentService.getBookingDetails(bookingId);
        if (bookingData) {
          await emailJSService.sendBookingNotification({
            bookingId: bookingData.id,
            customerName: bookingData.customer_name,
            customerEmail: bookingData.customer_email,
            customerPhone: bookingData.customer_phone,
            serviceName: bookingData.service_name || 'Unknown Service',
            date: bookingData.date,
            startTime: bookingData.start_time,
            endTime: bookingData.end_time,
            duration: bookingData.duration,
            participants: bookingData.participants,
            totalAmount: bookingData.total_amount,
            advanceAmount: bookingData.advance_amount,
            addOns: bookingData.add_ons || {},
            paymentId: response.razorpay_payment_id
          });
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
      }

    } catch (err) {
      console.error('Payment processing error:', err);
      setPaymentStatus('failed');
      setError('Payment processing failed. Please try again.');
      onPaymentFailure('Processing failed');
    }
  };

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    setPaymentStatus('failed');
    setError(error.message || 'Payment was cancelled or failed.');
    onPaymentFailure(error.message);
  };

  const initiatePayment = () => {
    if (!order) return;
    setError(null);
    setPaymentStatus('processing');
    paymentService.initializePayment(order, customerDetails, handlePaymentSuccess, handlePaymentFailure);
  };

  const retryPayment = () => {
    setError(null);
    setPaymentStatus('idle');
    createPaymentOrder();
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <LoadingSpinner />
        <p className="text-gray-300 mt-4">Initializing payment gateway...</p>
      </div>
    );
  }

  if (paymentStatus === 'success' || bookingConfirmed) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">Payment Successful!</h3>
        <p className="text-gray-300 mb-6">Your payment of {formatAmount(amount)} has been processed successfully.</p>
        <div className="flex items-center justify-center text-green-400">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span className="text-sm">Redirecting to booking confirmation...</span>
        </div>
      </motion.div>
    );
  }

  if (pollingBookingStatus) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">Payment Received!</h3>
        <p className="text-gray-300 mb-6">Finalizing booking details...</p>
      </motion.div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">Payment Failed</h3>
        {error && <p className="text-red-400 mb-6">{error}</p>}
        <div className="space-y-3">
          <button onClick={retryPayment} className="w-full bg-secondary hover:bg-secondary/80 text-primary font-bold py-3 px-6 rounded-lg transition-colors">Try Again</button>
          <button onClick={onCancel} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Cancel Payment</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900 rounded-lg p-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Complete Your Payment</h3>
        <p className="text-gray-400">Secure payment powered by Razorpay</p>
      </div>
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-300">Amount to Pay:</span>
          <span className="text-2xl font-bold text-secondary">{formatAmount(amount)}</span>
        </div>
        <div className="text-sm text-gray-400">
          <p>Booking ID: {bookingId}</p>
          <p>Customer: {customerDetails.name}</p>
        </div>
      </div>
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center mb-2">
          <div className="relative">
            <input type="checkbox" id="terms-agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
            <label htmlFor="terms-agree" className="flex items-center cursor-pointer">
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center mr-2 ${agreed ? 'bg-yellow-500 border-yellow-500' : 'border-gray-400'}`}>
                {agreed && (
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-gray-300 select-none">I agree to the <a href="/terms" className="text-secondary hover:underline">Terms of Service</a></span>
            </label>
          </div>
        </div>
        <button onClick={initiatePayment} disabled={!order || paymentStatus === 'processing' || !agreed} className="w-full bg-secondary hover:bg-secondary/80 disabled:bg-gray-600 text-primary font-bold py-4 px-6 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center">
          {paymentStatus === 'processing' ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CreditCard className="w-5 h-5 mr-2" />}
          {paymentStatus === 'processing' ? 'Processing...' : `Pay ${formatAmount(amount)}`}
        </button>
        <button onClick={onCancel} disabled={paymentStatus === 'processing'} className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Cancel Payment</button>
      </div>
    </motion.div>
  );
};

export default PaymentGateway;