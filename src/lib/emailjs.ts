import emailjs from '@emailjs/browser';

export interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  participants: number;
  totalAmount: number;
  advanceAmount: number;
  addOns: { [key: string]: number };
  paymentId?: string;
}

export const emailJSService = {
  async sendBookingNotification(bookingData: BookingEmailData): Promise<void> {
    try {
      const templateParams = {
        booking_id: bookingData.bookingId,
        customer_name: bookingData.customerName,
        customer_email: bookingData.customerEmail,
        customer_phone: bookingData.customerPhone,
        service_name: bookingData.serviceName,
        date: bookingData.date,
        time: `${bookingData.startTime} - ${bookingData.endTime}`,
        duration: bookingData.duration,
        participants: bookingData.participants,
        total_amount: bookingData.totalAmount,
        advance_amount: bookingData.advanceAmount,
        remaining_amount: bookingData.totalAmount - bookingData.advanceAmount,
        add_ons: Object.entries(bookingData.addOns).map(([name, qty]) => `${name}: ${qty}`).join(', ') || 'None',
        payment_id: bookingData.paymentId || 'N/A'
      };

      await emailjs.send(
        'service_9w2k2kk', // Replace with your EmailJS service ID
        'template_bg0m3tw', // Replace with your EmailJS template ID
        templateParams,
        'j8NhvtgzIf0RXrB5U' // Replace with your EmailJS public key
      );

      console.log('Booking notification email sent successfully');
    } catch (error) {
      console.error('Error sending booking notification email:', error);
      // Don't throw error to avoid breaking the booking flow
    }
  }
}; 
