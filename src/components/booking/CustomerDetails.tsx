import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Mail, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface CustomerDetailsProps {
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    specialRequirements: string;
    attendees: number;
  };
  onUpdate: (details: CustomerDetailsProps['customerDetails']) => void;
  onBack: () => void;
  onNext: () => void;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ 
  customerDetails, 
  onUpdate, 
  onBack, 
  onNext 
}) => {
  const { user, userProfile } = useAuth();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [attendees, setAttendees] = useState(customerDetails.attendees || 1);

  useEffect(() => {
    // Pre-fill form with user data if available
    if (userProfile && !customerDetails.name) {
      onUpdate({
        name: userProfile.name || '',
        email: user?.email || '',
        phone: userProfile.phone || '',
        address: '',
        specialRequirements: '',
        attendees: 1
      });
    }
  }, [userProfile, user, customerDetails.name, onUpdate]);

  const handleInputChange = (field: string, value: string) => {
    onUpdate({
      ...customerDetails,
      [field]: value
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as XXX-XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  const handleAttendeesChange = (value: number) => {
    if (value < 1) value = 1;
    if (value > 10) value = 10;
    setAttendees(value);
    onUpdate({ ...customerDetails, attendees: value });
    if (errors.attendees) {
      setErrors(prev => ({ ...prev, attendees: '' }));
    }
  };

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
        <h2 className="text-2xl font-bold text-white">Customer Details</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-secondary" />
            Personal Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={customerDetails.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary ${
                errors.name ? 'border-red-500' : 'border-gray-600 focus:border-secondary'
              }`}
              placeholder="Enter your full name"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={customerDetails.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary ${
                  errors.email ? 'border-red-500' : 'border-gray-600 focus:border-secondary'
                }`}
                placeholder="Enter your email address"
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={customerDetails.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary ${
                  errors.phone ? 'border-red-500' : 'border-gray-600 focus:border-secondary'
                }`}
                placeholder="Enter your phone number"
                maxLength={12}
              />
            </div>
            {errors.phone && (
              <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Attendees (max 10) *
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={attendees}
              onChange={e => handleAttendeesChange(Number(e.target.value))}
              className={`w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary ${
                errors.attendees ? 'border-red-500' : 'border-gray-600 focus:border-secondary'
              }`}
              placeholder="Enter number of attendees"
            />
            {errors.attendees && (
              <p className="text-red-400 text-sm mt-1">{errors.attendees}</p>
            )}
          </div>
        </div>

        {/* Address & Requirements */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-secondary" />
            Additional Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address *
            </label>
            <textarea
              value={customerDetails.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className={`w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary resize-none ${
                errors.address ? 'border-red-500' : 'border-gray-600 focus:border-secondary'
              }`}
              placeholder="Enter your complete address"
            />
            {errors.address && (
              <p className="text-red-400 text-sm mt-1">{errors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Special Requirements (Optional)
            </label>
            <textarea
              value={customerDetails.specialRequirements}
              onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
              placeholder="Any special requirements, equipment needs, or additional notes for your session..."
            />
          </div>
        </div>
      </div>

      {/* Information Notice */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-2">Important Information</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• We'll use these details to contact you about your booking</li>
          <li>• Your information is secure and will only be used for booking purposes</li>
          <li>• You can update these details anytime from your dashboard</li>
          <li>• Special requirements help us prepare better for your session</li>
        </ul>
      </div>

      {/* Form Validation Status */}
      <div className="mt-4">
        {Object.keys(errors).length > 0 ? (
          <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">
              Please fix the errors above before proceeding
            </p>
          </div>
        ) : (
          <div className="p-3 bg-green-900/20 border border-green-500 rounded-lg">
            <p className="text-green-400 text-sm">
              ✓ All required fields are completed
            </p>
          </div>
        )}
      </div>

      {/* Navigation Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={Object.keys(errors).length > 0}
          className={`px-6 py-3 font-bold rounded-lg transition-colors ${
            Object.keys(errors).length > 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-secondary hover:bg-secondary/80 text-primary'
          }`}
        >
          Continue to Summary
        </button>
      </div>
    </div>
  );
};

export default CustomerDetails;