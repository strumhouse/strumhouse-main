import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Lock, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { paymentService, PaymentOrder, PaymentResponse, formatAmount } from '../../lib/payment';
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

  const handlePaymentSuccess = async (response: PaymentResponse) => {
    try {
      setPaymentStatus('processing');
      
      // Verify payment
      const isVerified = await paymentService.verifyPayment(response);
      
      if (!isVerified) {
        throw new Error('Payment verification failed');
      }

      // Save payment details
      const paymentDetails = await paymentService.savePaymentDetails(
        bookingId,
        response,
        amount
      );

      // Update booking payment status
      await paymentService.updateBookingPaymentStatus(bookingId, 'paid');

      setPaymentStatus('success');
      
      // Call success callback after a short delay
      setTimeout(() => {
        onPaymentSuccess(paymentDetails);
      }, 2000);

    } catch (err) {
      console.error('Payment processing error:', err);
      setPaymentStatus('failed');
      setError('Payment processing failed. Please try again.');
      
      // Update booking payment status to failed
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

  if (paymentStatus === 'success') {
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
          <input
            type="checkbox"
            id="terms-agree"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mr-2 accent-yellow-500"
          />
          <label htmlFor="terms-agree" className="text-xs text-gray-300 select-none">
            I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Privacy Policy</a>
          </label>
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
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          By proceeding, you agree to our{' '}
          <a href="#" className="text-secondary hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-secondary hover:underline">Privacy Policy</a>
        </p>
      </div>
    </motion.div>
  );
};

export default PaymentGateway; 