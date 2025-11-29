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

  // Poll booking status until confirmed or timeout
  const pollBookingStatus = async () => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPollingBookingStatus(false);
        setError('Payment received but booking confirmation is taking longer than expected. Please check your dashboard.');
        return;
      }

      try {
        const booking = await paymentService.getBookingDetails(bookingId);
        
        // Fix: Properly check status and stop polling
        if (booking && booking.status === 'confirmed' && booking.payment_status === 'paid') {
          setBookingConfirmed(true);
          setPollingBookingStatus(false); // Stop polling
          setPaymentStatus('success');
          
          // Call success callback
          setTimeout(() => {
            onPaymentSuccess({ booking_id: bookingId });
          }, 2000);
          return; // Exit polling
        }
        
        // If still pending, continue polling
        if (booking && (booking.status !== 'confirmed' || booking.payment_status !== 'paid')) {
          attempts++;
          setTimeout(poll, 1000); // Poll every second
          return;
        }
      } catch (err) {
        console.error('Error polling booking status:', err);
        attempts++;
        // Continue polling on error (might be transient)
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setPollingBookingStatus(false);
          setError('Unable to confirm booking status. Please check your dashboard.');
        }
        return;
      }
    };

    poll();
  };

  const handlePaymentSuccess = async (response: PaymentResponse) => {
    try {
      setPaymentStatus('processing');
      
      // Verify payment (lightweight check)
      const isVerified = await paymentService.verifyPayment(response);
      
      if (!isVerified) {
        throw new Error('Payment verification failed');
      }

      // Save payment details (non-blocking)
      try {
        await paymentService.savePaymentDetails(bookingId, response, amount);
      } catch (saveError) {
        console.error('Error saving payment details:', saveError);
        // Continue - webhook will handle this
      }

      // Start polling for booking confirmation (webhook will finalize)
      setPollingBookingStatus(true);
      pollBookingStatus();

      // Send email notification (non-blocking)
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
      
      try {
        await paymentService.updateBookingPaymentStatus(bookingId, 'failed');
      } catch (updateError) {
        console.error('Error updating booking status:', updateError);
      }
    }
  };

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    setPaymentStatus('failed');
    setError(error.message || 'Payment was cancelled or failed. Please try again.');
  };

  const initiatePayment = () => {
    if (!order) return;

    setError(null);
    setPaymentStatus('processing');

    paymentService.initializePayment(
      order,
      customerDetails,
      handlePaymentSuccess,
      handlePaymentFailure
    );
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-lg p-8 text-center"
      >
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-4">Payment Successful!</h3>
        <p className="text-gray-300 mb-6">
          Your payment of {formatAmount(amount)} has been processed successfully.
        </p>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400">Transaction ID</p>
          <p className="text-white font-mono text-sm">{order?.id}</p>
        </div>
        
        <div className="flex items-center justify-center text-green-400">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span className="text-sm">Redirecting to booking confirmation...</span>
        </div>
      </motion.div>
    );
  }

  if (pollingBookingStatus) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-lg p-8 text-center"
      >
        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-4">Payment Received!</h3>
        <p className="text-gray-300 mb-6">
          Waiting for booking confirmation...
        </p>
      </motion.div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-lg p-8 text-center"
      >
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-4">Payment Failed</h3>
        {error && (
          <p className="text-red-400 mb-6">{error}</p>
        )}
        
        <div className="space-y-3">
          <button
            onClick={retryPayment}
            className="w-full bg-secondary hover:bg-secondary/80 text-primary font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Cancel Payment
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-lg p-6"
    >
      {/* Development Mode Banner */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
            <div className="text-sm">
              <h4 className="font-semibold text-blue-400 mb-1">Development Mode</h4>
              <p className="text-blue-300">Payments are being simulated. No real transactions will occur.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Complete Your Payment</h3>
        <p className="text-gray-400">Secure payment powered by Razorpay</p>
      </div>

      {/* Payment Details */}
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

      {/* Security Features */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h4 className="text-white font-semibold mb-3 flex items-center">
          <Shield className="w-4 h-4 mr-2 text-green-400" />
          Secure Payment
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center">
            <Lock className="w-3 h-3 mr-2 text-green-400" />
            <span>256-bit SSL encryption</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-green-400" />
            <span>PCI DSS compliant</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-green-400" />
            <span>Multiple payment options</span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h4 className="text-white font-semibold mb-3">Accepted Payment Methods</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center text-gray-300">
            <span className="w-3 h-3 bg-blue-500 rounded mr-2"></span>
            Credit/Debit Cards
          </div>
          <div className="flex items-center text-gray-300">
            <span className="w-3 h-3 bg-green-500 rounded mr-2"></span>
            UPI
          </div>
          <div className="flex items-center text-gray-300">
            <span className="w-3 h-3 bg-purple-500 rounded mr-2"></span>
            Net Banking
          </div>
          <div className="flex items-center text-gray-300">
            <span className="w-3 h-3 bg-orange-500 rounded mr-2"></span>
            Wallets
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Terms Checkbox */}
        <div className="flex items-center mb-2">
          <div className="relative">
            <input
              type="checkbox"
              id="terms-agree"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="sr-only"
            />
            <label 
              htmlFor="terms-agree" 
              className="flex items-center cursor-pointer"
            >
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center mr-2 ${
                agreed 
                  ? 'bg-yellow-500 border-yellow-500' 
                  : 'border-gray-400'
              }`}>
                {agreed && (
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-gray-300 select-none">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Privacy Policy</a>
              </span>
            </label>
          </div>
        </div>
        <button
          onClick={initiatePayment}
          disabled={!order || paymentStatus === 'processing' || !agreed}
          className="w-full bg-secondary hover:bg-secondary/80 disabled:bg-gray-600 text-primary font-bold py-4 px-6 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
        >
          {paymentStatus === 'processing' ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {process.env.NODE_ENV === 'development' ? 'Simulating Payment...' : 'Processing Payment...'}
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pay {formatAmount(amount)}
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={paymentStatus === 'processing'}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          Cancel Payment
        </button>
      </div>

      {/* Terms */}
      {/* The checkbox above replaces this paragraph, so this can be removed or left as extra info if desired. */}
    </motion.div>
  );
};

export default PaymentGateway; 