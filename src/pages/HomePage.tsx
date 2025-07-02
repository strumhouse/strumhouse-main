import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Star, Calendar, Music, Users, Award, Clock } from 'lucide-react';
import recordingImg from '../assets/recording.jpeg';
import jampadImg from '../assets/jampad.jpeg';

const HomePage: React.FC = () => {
  const stats = [
    { icon: Users, label: 'Happy Musicians', value: '500+' },
    { icon: Calendar, label: 'Sessions Completed', value: '2000+' },
    { icon: Star, label: 'Rating', value: '4.9/5' },
    { icon: Award, label: 'Years Experience', value: '5+' }
  ];

  const features = [
    {
      title: 'Professional Equipment',
      description: 'High-end instruments, amplifiers, and recording gear for the best sound quality.',
      icon: Music
    },
    {
      title: 'Flexible Booking',
      description: 'Easy online booking system with real-time availability and instant confirmation.',
      icon: Calendar
    },
    {
      title: 'Expert Support',
      description: 'Our team of music professionals is here to help you make the most of your session.',
      icon: Award
    },
    {
      title: 'Prime Location',
      description: 'Conveniently located in Kalkaji, Delhi with easy access and parking.',
      icon: Users
    }
  ];

  const services = [
    {
      id: 'jampad',
      name: 'Jampad Sessions',
      description: 'Enjoy a fun jamming session at the best jampad in Delhi',
      price: 400,
      duration: 'per hour',
      image: jampadImg,
      features: ['Professional Sound System', 'Drum Kit', 'Guitar Amps', 'Max 10 people']
    },
    {
      id: 'recording',
      name: 'Recording Studio',
      description: 'Professional recording services with high-quality equipment',
      price: 1000,
      duration: 'per hour',
      image: recordingImg,
      features: ['Raw Recording', 'Mixing & Mastering', 'Professional Mics', 'Max 6 people']
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/1540319/pexels-photo-1540319.jpeg"
            alt="Strumhouse Studio"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-500 to-yellow-300 bg-clip-text text-transparent"
          >
            Strumhouse
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Delhi's Premier Music Studio in Kalkaji. Where Music Comes Alive.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              to="/booking"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-4 px-8 rounded-lg transition-colors flex items-center min-w-[200px] justify-center"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Book Now
            </Link>
            <Link
              to="/gallery"
              className="border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-semibold py-4 px-8 rounded-lg transition-colors flex items-center min-w-[200px] justify-center"
            >
              <Play className="mr-2 h-5 w-5" />
              View Gallery
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-yellow-500 rounded-full flex justify-center"
          >
            <div className="w-1 h-3 bg-yellow-500 rounded-full mt-2" />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="bg-yellow-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="text-3xl font-bold text-yellow-500 mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Professional music services designed to bring out the best in your sound
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-colors group"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-3 text-yellow-500">{service.name}</h3>
                  <p className="text-gray-400 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-yellow-500">₹{service.price}</span>
                    <span className="text-gray-400">{service.duration}</span>
                  </div>
                  <div className="space-y-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-gray-300">
                        <Star className="h-4 w-4 text-yellow-500 mr-2" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/booking"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Now
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Choose Us</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience music in a professional environment with top-notch facilities
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-900 p-6 rounded-xl hover:bg-gray-800 transition-colors"
              >
                <div className="bg-yellow-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-yellow-500">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Make Music?</h2>
            <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
              Book your session now and experience the best music studio in Delhi
            </p>
            <Link
              to="/booking"
              className="inline-flex items-center bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Book Your Session
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;