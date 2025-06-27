import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Star, Calendar, Music, Users, Award } from 'lucide-react';
import { galleryService, serviceService } from '../lib/database';
import { MediaItem, Service } from '../types';
import Button from '../components/UI/Button';

const Home: React.FC = () => {
  const [heroMedia, setHeroMedia] = useState<MediaItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [galleryData, servicesData] = await Promise.all([
          galleryService.getByCategory('gallery'),
          serviceService.getAll()
        ]);
        
        // Transform gallery data to MediaItem format
        const mediaData = galleryData.map(item => ({
          id: item.id,
          type: 'image' as const,
          url: item.image_url,
          title: item.title,
          description: item.description || undefined,
          category: item.category,
          createdAt: item.created_at
        }));
        
        setHeroMedia(mediaData.slice(0, 3));
        setServices(servicesData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (heroMedia.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % heroMedia.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroMedia.length]);

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
      title: 'Experienced Staff',
      description: 'Our team of music professionals is here to help you make the most of your session.',
      icon: Award
    },
    {
      title: 'Flexible Booking',
      description: 'Easy online booking system with flexible time slots to fit your schedule.',
      icon: Calendar
    },
    {
      title: 'Community Focus',
      description: 'Join a community of passionate musicians and collaborate with like-minded artists.',
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Images */}
        <div className="absolute inset-0">
          {heroMedia.map((media, index) => (
            <motion.div
              key={media.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
              transition={{ duration: 1 }}
            >
              <img
                src={media.url}
                alt={media.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/70" />
            </motion.div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-green-500 to-yellow-500 bg-clip-text text-transparent"
          >
            Strum House
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Delhi's Premier Jam Studio in Kalkaji. Where Music Comes Alive.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/booking">
              <Button size="lg" className="min-w-[200px]">
                <Calendar className="mr-2 h-5 w-5" />
                Book Now
              </Button>
            </Link>
            <Link to="/gallery">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                <Play className="mr-2 h-5 w-5" />
                View Gallery
              </Button>
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
            className="w-6 h-10 border-2 border-green-500 rounded-full flex justify-center"
          >
            <div className="w-1 h-3 bg-green-500 rounded-full mt-2" />
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
                <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-yellow-500 mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
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

          <div className="grid md:grid-cols-3 gap-8">
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
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-3 text-green-500">{service.name}</h3>
                  <p className="text-gray-400 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-yellow-500">₹{service.price_per_hour}</span>
                    <span className="text-gray-400">{service.duration}h session</span>
                  </div>
                  <Link to="/booking">
                    <Button className="w-full">Book Now</Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Choose Strum House?</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience the difference with our premium facilities and dedicated service
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
                className="text-center group"
              >
                <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500/30 transition-colors">
                  <feature.icon className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-yellow-500">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Rock?</h2>
            <p className="text-xl text-gray-400 mb-8">
              Book your session today and experience Delhi's best jam studio
            </p>
            <Link to="/booking">
              <Button size="lg" className="min-w-[250px]">
                <Calendar className="mr-2 h-6 w-6" />
                Book Your Session
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;