import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import CategorySelector from './CategorySelector';
import SubServiceSelector from './SubServiceSelector';
import AddOnSelector from './AddOnSelector';
import DateTimeSelector from './DateTimeSelector';
import CustomerDetails from './CustomerDetails';
import BookingSummary from './BookingSummary';
import { useNavigate } from 'react-router-dom';

interface BookingStepsProps {
  onComplete?: (bookingId: string) => void;
}

const BookingSteps: React.FC<BookingStepsProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    categoryId: '',
    serviceId: '',
    selectedDate: null as Date | null,
    selectedSlots: [] as { startTime: string; endTime: string }[],
    selectedAddOns: {} as { [key: string]: number },
    customerDetails: {
      name: '',
      email: '',
      phone: '',
      address: '',
      specialRequirements: '',
      attendees: 1
    }
  });

  // Handle pre-selected service from Services page
  useEffect(() => {
    if (location.state?.selectedService && location.state?.selectedCategory) {
      const { selectedService, selectedCategory } = location.state;
      setBookingData(prev => ({
        ...prev,
        categoryId: selectedCategory.id,
        serviceId: selectedService.id
      }));
      // Skip to step 3 (add-ons) since category and service are pre-selected
      setCurrentStep(3);
    }
  }, [location.state]);

  const steps = [
    { id: 1, title: 'Category', description: 'Choose service type' },
    { id: 2, title: 'Service', description: 'Select specific service' },
    { id: 3, title: 'Add-ons', description: 'Optional extras' },
    { id: 4, title: 'Date & Time', description: 'Pick your slot' },
    { id: 5, title: 'Details', description: 'Your information' },
    { id: 6, title: 'Summary', description: 'Review & confirm' }
  ];

  const handleStepComplete = (step: number, data: any) => {
    setBookingData(prev => ({ ...prev, ...data }));
    setCurrentStep(step + 1);
  };

  const handleStepBack = (step: number) => {
    setCurrentStep(step - 1);
  };

  const handleBookingComplete = (bookingId: string) => {
    if (onComplete) {
      onComplete(bookingId);
    } else {
      // Navigate to success page or dashboard
      navigate(`/booking-success/${bookingId}`);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CategorySelector
            selectedCategory={bookingData.categoryId}
            onSelect={(categoryId) => {
              setBookingData(prev => ({ ...prev, categoryId }));
            }}
            onNext={() => handleStepComplete(1, {})}
          />
        );
      case 2:
        return (
          <SubServiceSelector
            categoryId={bookingData.categoryId}
            selectedService={bookingData.serviceId}
            onSelect={(serviceId) => {
              setBookingData(prev => ({ ...prev, serviceId }));
            }}
            onBack={() => handleStepBack(2)}
            onNext={() => handleStepComplete(2, {})}
          />
        );
      case 3:
        return (
          <AddOnSelector
            categoryId={bookingData.categoryId}
            selectedAddOns={bookingData.selectedAddOns}
            onSelect={(addOnId, quantity) => {
              const newAddOns = { ...bookingData.selectedAddOns };
              if (quantity === 0) {
                delete newAddOns[addOnId];
              } else {
                newAddOns[addOnId] = quantity;
              }
              setBookingData(prev => ({ ...prev, selectedAddOns: newAddOns }));
            }}
            onBack={() => handleStepBack(3)}
            onNext={() => handleStepComplete(3, {})}
          />
        );
      case 4:
        return (
          <DateTimeSelector
            serviceId={bookingData.serviceId}
            selectedDate={bookingData.selectedDate}
            selectedSlots={bookingData.selectedSlots}
            onSelect={(date, slots) => {
              setBookingData(prev => ({
                ...prev,
                selectedDate: date,
                selectedSlots: slots
              }));
            }}
            onBack={() => handleStepBack(4)}
            onNext={() => handleStepComplete(4, {})}
          />
        );
      case 5:
        return (
          <CustomerDetails
            customerDetails={bookingData.customerDetails}
            onUpdate={(details) => setBookingData(prev => ({ ...prev, customerDetails: details }))}
            onBack={() => handleStepBack(5)}
            onNext={() => handleStepComplete(5, {})}
          />
        );
      case 6:
        return (
          <BookingSummary
            categoryId={bookingData.categoryId}
            serviceId={bookingData.serviceId}
            selectedDate={bookingData.selectedDate!}
            selectedSlots={bookingData.selectedSlots}
            selectedAddOns={bookingData.selectedAddOns}
            customerDetails={bookingData.customerDetails}
            onBack={() => handleStepBack(6)}
            onComplete={handleBookingComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6">
      {/* Progress Steps */}
      <div className="mb-6 sm:mb-8 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px] sm:min-w-0">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  currentStep > step.id
                    ? 'bg-secondary border-secondary text-primary'
                    : currentStep === step.id
                    ? 'bg-secondary border-secondary text-primary'
                    : 'bg-gray-800 border-gray-600 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                <div className="mt-1 sm:mt-2 text-center">
                  <div className={`text-xs font-medium ${
                    currentStep >= step.id ? 'text-white' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </div>
                  <div className={`text-xs ${
                    currentStep >= step.id ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 ${
                  currentStep > step.id ? 'bg-secondary' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BookingSteps;