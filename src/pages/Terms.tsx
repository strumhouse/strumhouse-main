import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CreditCard, Users, Shield, AlertTriangle } from 'lucide-react';

const Terms: React.FC = () => {
  const sections = [
    {
      icon: CreditCard,
      title: "Booking and Payments",
      color: "text-green-500",
      items: [
        "All sessions must be booked in advance via our website/phone/WhatsApp/Instagram.",
        "50% payment is required to confirm your booking.",
        "Accepted payment methods: UPI, bank transfer, card, cash, etc."
      ]
    },
    {
      icon: Clock,
      title: "Cancellation and Rescheduling Policy",
      color: "text-yellow-500",
      items: [
        "Cancellation before 24 hours: 100% refund or credit towards a future booking.",
        "Cancellation within 24 hours: 100% penalty. No refund or rescheduling will be provided.",
        "Rescheduling is allowed up to 12 hours before your session, subject to availability.",
        "Rescheduling requests made within 12 hours of the session will not be accepted."
      ]
    },
    {
      icon: Users,
      title: "Session Guidelines",
      color: "text-blue-500",
      items: [
        "Please arrive at least 10 minutes early to maximize your session time.",
        "Sessions will start and end at the scheduled time, regardless of late arrival.",
        "Only booked participants are allowed inside unless prior permission is granted."
      ]
    },
    {
      icon: Shield,
      title: "Studio Usage and Conduct",
      color: "text-purple-500",
      items: [
        "No smoking, vaping, or consumption of tobacco inside the studio premises.",
        "Strictly no drugs, alcohol, or any illegal substances allowed on-site. Violation will result in immediate cancellation of your session without refund and possible blacklisting.",
        "Guests are expected to treat studio equipment and the space with care. Any damage caused will be charged at the actual repair or replacement cost.",
        "Food and beverages are not allowed inside the studio. Water bottles are permitted."
      ]
    },
    {
      icon: AlertTriangle,
      title: "Safety and Liability",
      color: "text-red-500",
      items: [
        "Strumhouse is not responsible for any loss, damage, or theft of personal belongings."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-500 to-yellow-500 bg-clip-text text-transparent">
              Terms and Conditions
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              By booking a session at Strumhouse, you agree to the following terms and conditions. 
              These guidelines are designed to ensure a safe, respectful, and professional environment for all musicians and staff.
            </p>
            <div className="mt-6 text-sm text-gray-500">
              <p>Effective Date: 1st January 2023</p>
            </div>
          </motion.div>

          {/* Terms Sections */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="bg-gray-900 p-8 rounded-xl border border-gray-800"
              >
                <div className="flex items-center mb-6">
                  <div className={`p-3 rounded-lg bg-gray-800 ${section.color} mr-4`}>
                    <section.icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <span className="text-yellow-500 mr-3 mt-1">•</span>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="max-w-4xl mx-auto mt-16"
          >
            <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 text-center">
              <FileText className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-4">Questions About Our Terms?</h3>
              <p className="text-gray-400 mb-6">
                If you have any questions about these terms and conditions, please don't hesitate to contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Contact Us
                </a>
                <a
                  href="/booking"
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Book a Session
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Terms; 