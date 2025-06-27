import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { categoryService } from '../../lib/database';
import LoadingSpinner from '../UI/LoadingSpinner';

interface CategorySelectorProps {
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
  onNext: () => void;
}

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategory, onSelect, onNext }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await categoryService.getAll();
        // Map and filter out invalid categories, and ensure description is a string
        const mappedCategories: Category[] = data
          .filter((cat: any) => cat.id && cat.name && typeof cat.name === 'string')
          .map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description ?? '',
            is_active: cat.is_active ?? false,
          }));
        setCategories(mappedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Category</h2>
        <p className="text-gray-300">Select the type of service you need</p>
      </div>

      {/* Scrollable categories area */}
      <div className="bg-gray-800 rounded-lg p-4 mb-8 h-96 overflow-y-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative cursor-pointer rounded-lg border-2 transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'border-secondary bg-secondary/10'
                  : 'border-gray-700 hover:border-secondary/50 bg-gray-800'
              }`}
              onClick={() => onSelect(category.id)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{category.name}</h3>
                  {selectedCategory === category.id && (
                    <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-300 mb-4">{category.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="w-2 h-2 bg-secondary rounded-full mr-2"></span>
                    Professional equipment included
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="w-2 h-2 bg-secondary rounded-full mr-2"></span>
                    Flexible booking times
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="w-2 h-2 bg-secondary rounded-full mr-2"></span>
                    Expert support available
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400 mb-6">
          Need help choosing? Contact us at{' '}
          <a href="tel:+919876543210" className="text-secondary hover:underline">
            +91 98765 43210
          </a>
        </p>
        
        <button
          onClick={onNext}
          disabled={!selectedCategory}
          className={`px-8 py-3 font-bold rounded-lg transition-colors ${
            !selectedCategory
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-secondary hover:bg-secondary/80 text-primary'
          }`}
        >
          Continue to Services
        </button>
      </div>
    </div>
  );
};

export default CategorySelector; 