import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Users, Check } from 'lucide-react';
import { serviceService } from '../../lib/database';
import LoadingSpinner from '../UI/LoadingSpinner';

interface SubServiceSelectorProps {
  categoryId: string;
  selectedService: string;
  onSelect: (serviceId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_per_hour: number;
  duration: number;
  max_participants: number;
  features: string[];
  image_url: string;
  is_active: boolean;
  advance_booking_hours: number;
}

const SubServiceSelector: React.FC<SubServiceSelectorProps> = ({ 
  categoryId, 
  selectedService, 
  onSelect, 
  onBack, 
  onNext 
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const data = await serviceService.getByCategory(categoryId);
        setServices(data);
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchServices();
    }
  }, [categoryId]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-400 hover:text-white transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-white">Select Your Service</h2>
      </div>

      {/* Scrollable services area */}
      <div className="bg-gray-800 rounded-lg p-4 mb-8 h-96 overflow-y-auto">
        <div className="grid gap-6">
          {services.map((service) => (
            <motion.div
              key={service.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`relative cursor-pointer rounded-lg border-2 transition-all duration-300 ${
                selectedService === service.id
                  ? 'border-secondary bg-secondary/10'
                  : 'border-gray-700 hover:border-secondary/50 bg-gray-800'
              }`}
              onClick={() => onSelect(service.id)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                    <p className="text-gray-300">{service.description}</p>
                  </div>
                  {selectedService === service.id && (
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center text-gray-300">
                    <Clock className="w-4 h-4 mr-2" />
                    {service.duration} hours
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Users className="w-4 h-4 mr-2" />
                    Up to {service.max_participants} people
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-500 font-bold text-lg">₹{service.price_per_hour}</div>
                    <div className="text-sm text-gray-400">per hour</div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">What's included:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {service.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-400">
                        <span className="w-2 h-2 bg-secondary rounded-full mr-2"></span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total for {service.duration} hours:</span>
                    <span className="text-xl font-bold text-secondary">
                      ₹{service.price_per_hour * service.duration}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {services.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No services available for this category.</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedService}
          className={`px-6 py-3 font-bold rounded-lg transition-colors ${
            !selectedService
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-secondary hover:bg-secondary/80 text-primary'
          }`}
        >
          Continue to Add-ons
        </button>
      </div>
    </div>
  );
};

export default SubServiceSelector; 