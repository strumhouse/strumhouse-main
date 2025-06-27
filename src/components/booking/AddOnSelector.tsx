import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { addOnService } from '../../lib/database';
import LoadingSpinner from '../UI/LoadingSpinner';


interface AddOnSelectorProps {
  categoryId: string;
  selectedAddOns: { [key: string]: number };
  onSelect: (addOnId: string, quantity: number) => void;
  onBack: () => void;
  onNext: () => void;
}

interface AddOn {
  id: string;
  name: string;
  description: string;
  price_per_hour: number;
  max_quantity: number;
  category_id: string;
  is_active: boolean;
}

const AddOnSelector: React.FC<AddOnSelectorProps> = ({ 
  categoryId, 
  selectedAddOns, 
  onSelect, 
  onBack, 
  onNext 
}) => {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAddOns = async () => {
      try {
        setLoading(true);
        const data = await addOnService.getByCategory(categoryId);
        // Map data to ensure all fields match AddOn type (no nulls for string/bool)
        setAddOns(
          data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description ?? '',
            price_per_hour: item.price_per_hour,
            max_quantity: item.max_quantity ?? 1,
            category_id: item.category_id ?? '',
            is_active: item.is_active ?? true,
          }))
        );
      } catch (err) {
        console.error('Error fetching add-ons:', err);
        setError('Failed to load add-ons');
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchAddOns();
    }
  }, [categoryId]);

  const handleQuantityChange = (addOnId: string, change: number) => {
    const currentQuantity = selectedAddOns[addOnId] || 0;
    const newQuantity = Math.max(0, Math.min(currentQuantity + change, 10)); // Max 10 items
    onSelect(addOnId, newQuantity);
  };

  const getTotalAddOnPrice = () => {
    return addOns.reduce((total, addOn) => {
      const quantity = selectedAddOns[addOn.id] || 0;
      // Charge per hour but not by quantity - if selected, charge the add-on price
      return total + (quantity > 0 ? addOn.price_per_hour : 0);
    }, 0);
  };

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
        <h2 className="text-2xl font-bold text-white">Add Extras (Optional)</h2>
      </div>

      {/* Scrollable add-ons area */}
      <div className="bg-gray-800 rounded-lg p-4 mb-8 h-96 overflow-y-auto">
        <div className="grid gap-4">
          {addOns.map((addOn) => {
            const quantity = selectedAddOns[addOn.id] || 0;
            const isSelected = quantity > 0;

            return (
              <motion.div
                key={addOn.id}
                whileHover={{ scale: 1.01 }}
                className={`rounded-lg border-2 transition-all duration-300 ${
                  isSelected
                    ? 'border-secondary bg-secondary/10'
                    : 'border-gray-700 hover:border-secondary/50 bg-gray-800'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{addOn.name}</h3>
                      <p className="text-gray-300 text-sm">{addOn.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-yellow-500 font-bold">₹{addOn.price_per_hour}</div>
                      <div className="text-xs text-gray-400">per hour</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(addOn.id, -1)}
                        disabled={quantity === 0}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          quantity === 0
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-600 text-white hover:bg-gray-500'
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="text-white font-bold min-w-[2rem] text-center">
                        {quantity}
                      </span>

                      <button
                        onClick={() => handleQuantityChange(addOn.id, 1)}
                        disabled={quantity >= addOn.max_quantity}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          quantity >= addOn.max_quantity
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-secondary text-primary hover:bg-secondary/80'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-400">Total</div>
                      <div className="text-lg font-bold text-secondary">
                        ₹{quantity > 0 ? addOn.price_per_hour : 0}
                      </div>
                    </div>
                  </div>

                  {quantity >= addOn.max_quantity && (
                    <p className="text-xs text-yellow-400 mt-2">
                      Maximum quantity reached ({addOn.max_quantity})
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {addOns.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No add-ons available for this category.</p>
        </div>
      )}

      {addOns.length > 0 && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">Total Add-ons:</span>
            <span className="text-xl font-bold text-secondary">₹{getTotalAddOnPrice()}</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Add-ons are optional and can be added to enhance your experience
          </p>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400 mb-4">
          You can skip this step if you don't need any extras
        </p>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-primary font-bold rounded-lg transition-colors"
          >
            Continue to Date & Time
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOnSelector;