export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { bookingId, amount, currency } = req.body;

  // Ensure receipt is <= 40 chars
  const receipt = `b_${bookingId}_${Date.now()}`.slice(0, 40);

  const orderData = {
    amount: amount * 100,
    currency: currency || 'INR',
    receipt,
    notes: { booking_id: bookingId }
  };

  const auth = Buffer.from(
    process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET
  ).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify(orderData)
  });

  const data = await response.json();

  // Log the error for debugging
  if (!response.ok) {
    console.error('Razorpay order creation error:', data);
  }

  res.status(response.ok ? 200 : 400).json(data);
}