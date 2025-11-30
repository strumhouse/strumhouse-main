// api/test-payment-flow.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This is just a test endpoint to verify the API is working
    res.status(200).json({
      status: 'success',
      message: 'Payment API is working',
      endpoints: {
        createOrder: 'POST /api/create-razorpay-order',
        verifyPayment: 'POST /api/verify-payment',
        webhook: 'POST /api/razorpay-webhook'
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}