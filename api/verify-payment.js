import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing required payment verification parameters',
        verified: false 
      });
    }

    // Create the signature string
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Get the secret key from environment variables
    const secret = process.env.VITE_RAZORPAY_KEY_SECRET;
    
    if (!secret) {
      console.error('Razorpay secret key not found in environment variables');
      return res.status(500).json({ 
        error: 'Payment verification configuration error',
        verified: false 
      });
    }

    // Generate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex');

    // Compare signatures
    const isVerified = expectedSignature === razorpay_signature;

    if (isVerified) {
      console.log('Payment verification successful:', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
    } else {
      console.error('Payment verification failed - signature mismatch:', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        expectedSignature,
        receivedSignature: razorpay_signature
      });
    }

    res.status(200).json({ 
      verified: isVerified,
      message: isVerified ? 'Payment verified successfully' : 'Payment verification failed'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error during payment verification',
      verified: false 
    });
  }
} 