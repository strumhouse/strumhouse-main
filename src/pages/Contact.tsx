import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

const Contact: React.FC = () => {
  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: ['+91 98765 43210', '+91 98765 43211'],
      color: 'text-green-500'
    },
    {
      icon: Mail,
      title: 'Email',
      details: ['info@strumhouse.com', 'bookings@strumhouse.com'],
      color: 'text-yellow-500'
    },
    {
      icon: MapPin,
      title: 'Address',
      details: ['123 Music Street, Bandra West', 'Mumbai, Maharashtra 400050'],
      color: 'text-blue-500'
    },
    {
      icon: Clock,
      title: 'Hours',
      details: ['Mon-Sat: 9:00 AM - 10:00 PM', 'Sunday: 10:00 AM - 8:00 PM'],
      color: 'text-purple-500'
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
              Contact Us
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Get in touch with us for bookings, inquiries, or just to say hello. 
              We'd love to hear from you!
            </p>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-green-500 mb-8 text-center">Get In Touch</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {contactInfo.map((info, index) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex items-start space-x-4 bg-gray-900 p-6 rounded-xl border border-gray-800"
                >
                  <div className={`p-3 rounded-lg bg-gray-800 ${info.color}`}>
                    <info.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{info.title}</h3>
                    {info.details.map((detail, detailIndex) => (
                      <p key={detailIndex} className="text-gray-400">{detail}</p>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-green-500 mb-4">Find Us</h2>
            <p className="text-gray-400">Visit our studio in the heart of Mumbai's music scene</p>
          </motion.div>

          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="aspect-video bg-gray-700 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-400">Interactive map will be embedded here</p>
                <p className="text-sm text-gray-500 mt-2">123 Music Street, Bandra West, Mumbai</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-green-500 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Quick answers to common questions</p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: "What is the hourly rate?",
                answer: "Our standard rates begin at ₹400 per hour. Discounts are available for regular bookings."
              },
              {
                question: "What equipment do you provide?",
                answer: (
                  <span>
                    We provide:<br/>
                    • Drum kit<br/>
                    • Guitar and bass amps<br/>
                    • PA system<br/>
                    • Microphones<br/>
                    • Keyboard<br/>
                    (Bring your instruments and cables unless stated otherwise.)
                  </span>
                )
              },
              {
                question: "Can we record our rehearsal?",
                answer: "Yes! Audio recording is available as an add-on service. Let us know in advance so we can set it up."
              },
              {
                question: "Is the studio soundproof?",
                answer: "Yes, our rehearsal room is acoustically treated and sound-isolated for a professional experience."
              },
              {
                question: "Do you offer any packages or memberships?",
                answer: "Yes, we offer discounted monthly packages and loyalty memberships for regular artists and bands."
              },
              {
                question: "Is the space air-conditioned and ventilated?",
                answer: "Yes, our studio is air-conditioned and well-ventilated for your comfort."
              },
              {
                question: "Do you allow solo practice or individual bookings?",
                answer: "Absolutely. Solo artists, drummers, singers, or instrumentalists can book the space as needed."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-900 p-6 rounded-lg border border-gray-800"
              >
                <h3 className="text-lg font-semibold text-yellow-500 mb-2">{faq.question}</h3>
                <p className="text-gray-300">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact; 