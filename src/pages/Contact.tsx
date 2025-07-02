import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Facebook, Instagram, ExternalLink } from 'lucide-react';

const Contact: React.FC = () => {
  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: ['+91 8882382545'],
      color: 'text-green-500'
    },
    {
      icon: Mail,
      title: 'Email',
      details: ['contact.strumhouse@gmail.com'],
      color: 'text-yellow-500'
    },
    {
      icon: MapPin,
      title: 'Address',
      details: ['G-19 A, basement, Main Rd, Block G, Kalkaji', 'Delhi, New Delhi, Delhi 110019'],
      color: 'text-blue-500'
    },
    {
      icon: Clock,
      title: 'Hours',
      details: ['Monday to Sunday: 9:00 AM - 10:00 PM'],
      color: 'text-purple-500'
    }
  ];

  const socialLinks = [
    {
      icon: Facebook,
      title: 'Facebook',
      url: 'https://www.facebook.com/Strumhousejampad',
      color: 'text-blue-500'
    },
    {
      icon: Instagram,
      title: 'Instagram',
      url: 'https://www.instagram.com/strumhouse_jampad/',
      color: 'text-pink-500'
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

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-12"
            >
              <h3 className="text-2xl font-bold text-green-500 mb-6 text-center">Follow Us</h3>
              <div className="flex justify-center space-x-6">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={social.title}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    className="flex items-center space-x-2 bg-gray-900 px-6 py-3 rounded-lg border border-gray-800 hover:bg-gray-800 transition-colors"
                  >
                    <social.icon className={`h-5 w-5 ${social.color}`} />
                    <span className="text-white">{social.title}</span>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
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
            <p className="text-gray-400">Visit our studio in Kalkaji, Delhi</p>
          </motion.div>

          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3504.96298829633!2d77.25498177549746!3d28.540832175714964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce38fafc9c5df%3A0x9c53778befd6d4f4!2sStrumHouse%20-%20Jam%20Pad%2C%20Recording%20Studio%2C%20Music%20Classes%20(Formerly%20Micky's%20Jampad)!5e0!3m2!1sen!2sin!4v1751494133942!5m2!1sen!2sin"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="StrumHouse Location"
              className="w-full"
            ></iframe>
          </div>
          
          <div className="mt-6 text-center">
            <a
              href="https://maps.app.goo.gl/waas2Hf4QjUtqTx39"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <MapPin className="h-5 w-5" />
              <span>Open in Google Maps</span>
              <ExternalLink className="h-4 w-4" />
            </a>
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
