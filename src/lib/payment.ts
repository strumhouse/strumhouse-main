import { supabase } from './supabase';

// Razorpay configuration
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_TEST_KEY';
const RAZORPAY_KEY_SECRET = import.meta.env.VITE_RAZORPAY_KEY_SECRET || 'YOUR_TEST_SECRET';

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentDetails {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  created_at: string;
  updated_at: string;
}

// Payment service
export const paymentService = {
  // Create a new payment order (REAL Razorpay API)
  async createOrder(bookingId: string, amount: number, currency: string = 'INR'): Promise<PaymentOrder> {
    try {
      const orderData = {
        bookingId,
        amount,
        currency
      };

      // Call Vercel serverless function
      const response = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      const order = await response.json();
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at
      };
    } catch (error) {
      console.error('Error creating payment order:', error);
      throw error;
    }
  },

  // Initialize Razorpay payment
  async initializePayment(order: PaymentOrder, userDetails: any, onSuccess: (response: PaymentResponse) => void, onFailure: (error: any) => void) {
    try {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'StrumHouse Studio',
        description: `Booking Payment - ${order.receipt}`,
        order_id: order.id,
        handler: onSuccess,
        prefill: {
          name: userDetails.name || '',
          email: userDetails.email || '',
          contact: userDetails.phone || ''
        },
        theme: {
          color: '#F59E0B'
        },
        modal: {
          ondismiss: () => {
            onFailure(new Error('Payment cancelled by user'));
          }
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: "Pay using UPI",
                instruments: [
                  {
                    method: "upi"
                  }
                ]
              },
              cards: {
                name: "Pay using Cards",
                instruments: [
                  {
                    method: "card"
                  }
                ]
              }
            },
            sequence: ["block.banks", "block.cards"],
            preferences: {
              show_default_blocks: false
            }
          }
        }
      };

      // Check if Razorpay is already loaded
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Load Razorpay script dynamically
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          // @ts-ignore
          const rzp = new window.Razorpay(options);
          rzp.open();
        };
        script.onerror = () => {
          onFailure(new Error('Failed to load payment gateway'));
        };
        document.body.appendChild(script);
      }

    } catch (error) {
      console.error('Error initializing payment:', error);
      onFailure(error);
    }
  },

  // Verify payment signature (FRONTEND ONLY, NOT SECURE)
  async verifyPayment(paymentResponse: PaymentResponse): Promise<boolean> {
    try {
      // WARNING: This is NOT secure. Move to backend for production.
      // Signature = HMAC_SHA256(order_id|payment_id, RAZORPAY_KEY_SECRET)
      const generatedSignature = await paymentService.generateSignature(
        paymentResponse.razorpay_order_id + '|' + paymentResponse.razorpay_payment_id,
        RAZORPAY_KEY_SECRET
      );
      return generatedSignature === paymentResponse.razorpay_signature;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  },

  // Generate HMAC SHA256 signature (for frontend demo only)
  async generateSignature(data: string, key: string): Promise<string> {
    // Use SubtleCrypto API (browser)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(data)
    );
    // Convert ArrayBuffer to hex string
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Save payment details to database
  async savePaymentDetails(bookingId: string, paymentResponse: PaymentResponse, amount: number): Promise<PaymentDetails> {
    try {
      const paymentData = {
        booking_id: bookingId,
        amount: amount,
        currency: 'INR',
        payment_method: 'razorpay',
        status: 'completed',
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving payment details:', error);
      throw error;
    }
  },

  // Update booking payment status
  async updateBookingPaymentStatus(bookingId: string, status: 'pending' | 'paid' | 'failed'): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          payment_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating booking payment status:', error);
      // Don't throw error for development
    }
  },

  // Update booking status
  async updateBookingStatus(bookingId: string, status: 'pending' | 'confirmed' | 'cancelled'): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating booking status:', error);
      // Don't throw error for development
    }
  },

  // Get payment details by booking ID
  async getPaymentByBookingId(bookingId: string): Promise<PaymentDetails | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting payment details:', error);
      return null;
    }
  }
};

// Utility function to format amount for display
export const formatAmount = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Utility function to format amount for Razorpay (in paise)
export const formatAmountForRazorpay = (amount: number): number => {
  return Math.round(amount * 100);
}; 