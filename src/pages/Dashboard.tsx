import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, CreditCard, User, LogOut, Settings, Plus, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { bookingService } from '../lib/database';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, userProfile, loading: authLoading } = useAuth();
  
  // Persist active tab state
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>(() => {
    return (localStorage.getItem('dashboard_active_tab') as 'bookings' | 'profile') || 'bookings';
  });

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('dashboard_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      fetchUserBookings();
    }
  }, [user]);

  const fetchUserBookings = async () => {
    try {
      if (!user) return;
      const data = await bookingService.getByUser(user.id);
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleNewBooking = () => {
    navigate('/booking');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {userProfile?.name || user.email}</h1>
            <p className="text-gray-400 mt-1">Manage your bookings and account settings</p>
          </div>
          <div className="flex gap-3">
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Panel
              </button>
            )}
            <button
              onClick={handleNewBooking}
              className="flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'bookings'
                      ? 'bg-yellow-500 text-gray-900 font-bold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>My Bookings</span>
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-yellow-500 text-gray-900 font-bold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Profile Settings</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'bookings' ? (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6">Upcoming Sessions</h2>
                  {bookings.length === 0 ? (
                    <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-gray-600" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">No bookings yet</h3>
                      <p className="text-gray-400 mb-6">Book your first jam session or recording slot today!</p>
                      <button
                        onClick={handleNewBooking}
                        className="inline-flex items-center px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition-colors"
                      >
                        Book Now
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {bookings.map((booking) => (
                        <div key={booking.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-yellow-500/50 transition-colors">
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-white">{booking.serviceName}</h3>
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                  booking.bookingStatus === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                  booking.bookingStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {booking.bookingStatus.toUpperCase()}
                                </span>
                              </div>
                              <div className="space-y-1 text-gray-400">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{booking.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{booking.startTime} - {booking.endTime}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                <p className="text-sm text-gray-400">Total Amount</p>
                                <p className="text-2xl font-bold text-yellow-500">₹{booking.total_amount}</p>
                              </div>
                              {booking.advance_amount < booking.total_amount && (
                                <div className="text-right">
                                  <p className="text-xs text-red-400">
                                    Remaining: ₹{booking.total_amount - booking.advance_amount}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Booking Details Footer */}
                          <div className="mt-6 pt-4 border-t border-gray-800 flex flex-wrap gap-4 text-sm text-gray-500">
                            <div>Booking ID: <span className="font-mono text-gray-400">{booking.id.substring(0, 8)}...</span></div>
                            <div>Attendees: <span className="text-gray-400">{booking.attendees}</span></div>
                            {booking.addOns && Object.keys(booking.addOns).length > 0 && (
                              <div>Add-ons: <span className="text-gray-400">{Object.keys(booking.addOns).length} items</span></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
                  <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={userProfile?.name || ''}
                        disabled
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={userProfile?.phone || ''}
                        disabled
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-500">
                        To update your profile information, please contact support or an administrator.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;