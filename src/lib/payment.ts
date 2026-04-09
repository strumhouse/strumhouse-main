import { supabase } from './supabase';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Pre-load Razorpay eagerly at module init time.
// iOS Safari's WKWebView blocks <script> tags injected inside async callbacks
// (a security restriction). Loading it here — before any user interaction —
// ensures it is available when the Pay button is tapped.
let _razorpayLoaded: Promise<void> | null = null;
function preloadRazorpay(): Promise<void> {
  if (_razorpayLoaded) return _razorpayLoaded;
  if (typeof window !== 'undefined' && (window as any).Razorpay) {
    return (_razorpayLoaded = Promise.resolve());
  }
  _razorpayLoaded = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.head.appendChild(script);
  });
  return _razorpayLoaded;
}
// Fire immediately — runs in background while user fills the booking form
if (typeof window !== 'undefined') preloadRazorpay().catch(() => {});

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

export const paymentService = {
  // Create Order (Calls Server)
  async createOrder(bookingId: string, amount: number, currency: string = 'INR'): Promise<PaymentOrder> {
    const response = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, amount, currency })
    });

    if (!response.ok) throw new Error('Failed to create payment order');
    return await response.json();
  },

  // Initialize UI
  async initializePayment(order: PaymentOrder, userDetails: any, onSuccess: (response: PaymentResponse) => void, onFailure: (error: any) => void) {
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
      theme: { color: '#F59E0B' },
      modal: {
        ondismiss: () => onFailure(new Error('Payment cancelled by user'))
      }
    };

    try {
      // Wait for the pre-loaded script (already in flight since app start)
      await preloadRazorpay();
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      onFailure(new Error('Failed to load payment gateway'));
    }
  },

  // Verify Payment (Calls Server)
  async verifyPayment(paymentResponse: PaymentResponse): Promise<boolean> {
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentResponse)
      });
      if (!response.ok) return false;
      const result = await response.json();
      return result.verified === true;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  },

  // Get Booking Details
  async getBookingDetails(bookingId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, services(name), categories(name)`)
      .eq('id', bookingId)
      .single();

    if (error) return null;
    return {
      ...data,
      service_name: data.services?.name || 'Unknown Service',
      category_name: data.categories?.name || 'Unknown Category'
    };
  }
};

export const formatAmount = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};