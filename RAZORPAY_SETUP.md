# Razorpay Payment Gateway Setup

This guide explains how to set up Razorpay payment gateway integration in the StrumHouse booking system.

## Prerequisites

1. Razorpay account (sign up at https://razorpay.com)
2. Test API keys for development
3. Live API keys for production

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_test_key_here
VITE_RAZORPAY_KEY_SECRET=your_test_secret_here

# For production, use live keys:
# VITE_RAZORPAY_KEY_ID=rzp_live_your_live_key_here
# VITE_RAZORPAY_KEY_SECRET=your_live_secret_here
```

## Getting Razorpay API Keys

### Test Mode (Development)
1. Log in to your Razorpay Dashboard
2. Go to Settings > API Keys
3. Generate a new key pair for test mode
4. Copy the Key ID and Key Secret

### Live Mode (Production)
1. Complete your Razorpay account verification
2. Go to Settings > API Keys
3. Generate a new key pair for live mode
4. Copy the Key ID and Key Secret

## Database Setup

The payment integration requires a `payments` table in your Supabase database. Here's the SQL schema:

```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50) DEFAULT 'razorpay',
  status VARCHAR(20) DEFAULT 'pending',
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

## Features Implemented

### 1. Payment Gateway Component
- Modern, responsive UI
- Secure payment processing
- Multiple payment methods support
- Real-time status updates
- Error handling and retry mechanisms

### 2. Payment Flow
1. User creates booking
2. System generates payment order
3. Razorpay modal opens
4. User completes payment
5. Payment verification
6. Booking confirmation
7. Success page with receipt

### 3. Payment Methods Supported
- Credit/Debit Cards
- UPI
- Net Banking
- Digital Wallets
- EMI (if enabled)

### 4. Security Features
- 256-bit SSL encryption
- PCI DSS compliance
- Payment signature verification
- Secure API communication

## Development vs Production

### Development Mode
- Uses test API keys
- Mock payment processing
- Simulated payment flows
- No real money transactions

### Production Mode
- Uses live API keys
- Real payment processing
- Actual money transactions
- Webhook integration (recommended)

## Testing

### Test Cards
Use these test card numbers for development:

- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **3D Secure**: 4000 0000 0000 0002

### Test UPI
- **Success**: success@razorpay
- **Failure**: failure@razorpay

## Troubleshooting

### Common Issues

1. **Payment Modal Not Opening**
   - Check if Razorpay script is loaded
   - Verify API key configuration
   - Check browser console for errors

2. **Payment Verification Failed**
   - Ensure webhook is properly configured
   - Check signature verification logic
   - Verify payment status in Razorpay dashboard

3. **Database Errors**
   - Check Supabase connection
   - Verify table schema
   - Check RLS policies

## Security Notes

1. Never expose API secrets in client-side code
2. Always verify payment signatures
3. Use HTTPS in production
4. Implement proper error handling
5. Log payment events for audit trails 