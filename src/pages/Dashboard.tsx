import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Phone, Mail, User, LogOut, Plus, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { bookingService, userService, serviceService, categoryService } from '../lib/database';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { formatDate, formatTime } from '../utils/timeSlots';

const Dashboard: React.FC = React.memo(() => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><div>Loading...</div></div>;
  }

  const fetchData = useCallback(async (userId: string | undefined) => {
    if (!userId) return;
    try {
      setError(null);
      setLoading(true);
      
      // Set a fallback profile immediately
      const fallbackProfile = { 
        name: user?.user_metadata?.name || 'User', 
        email: user?.email || 'Unknown',
        role: 'user'
      };
      setUserProfile(fallbackProfile);
      
      try {
        const profile = await userService.getCurrentUser();
        if (profile) {
          setUserProfile(profile);
        } else {
          // Profile not found - this is not necessarily an error in production
          setUserProfile(null);
        }
      } catch (profileError) {
        console.error('Dashboard: Error fetching user profile:', profileError);
      }
      
      try {
        const userBookings = await bookingService.getByUser(userId);
        setBookings(userBookings);
      } catch (bookingsError) {
        console.error('Dashboard: Error fetching bookings:', bookingsError);
        setBookings([]);
      }

      // Fetch services and categories for booking details
      try {
        const [servicesData, categoriesData] = await Promise.all([
          serviceService.getAll(),
          categoryService.getAll()
        ]);
        setServices(servicesData);
        setCategories(categoriesData);
      } catch (dataError) {
        console.error('Dashboard: Error fetching services/categories:', dataError);
      }
    } catch (error) {
      console.error('Dashboard: Unexpected error in fetchData:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user?.user_metadata?.name, user?.email]);

  useEffect(() => {
    if (!authLoading && user && user.id) {
      fetchData(user.id);
    }
  }, [authLoading, user, fetchData]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Dashboard logout error:', error);
      toast.error('Logout failed. Please try again.');
    }
  }, [logout, navigate]);

  const handleRetryLoading = useCallback(() => {
    setError(null);
    setTimeout(() => {
      fetchData(user?.id);
    }, 100);
  }, [user?.id, fetchData]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'cancelled':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  }, []);

  const getPaymentStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  }, []);

  const getServiceName = useCallback((serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  }, [services]);

  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  }, [categories]);

  const confirmedBookingsCount = useMemo(() => 
    bookings.filter(b => b.status === 'confirmed').length, 
    [bookings]
  );

  const handleNewBooking = useCallback(() => {
    navigate('/booking');
  }, [navigate]);


  const handleBookNow = useCallback(() => {
    navigate('/booking');
  }, [navigate]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
          <button
            onClick={handleRetryLoading}
            className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
        <div className="text-center text-gray-300">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">We encountered an unexpected error. Please try refreshing the page.</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={handleRetryLoading}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show no user state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
        <div className="text-center text-gray-300">
          <h2 className="text-2xl font-bold mb-2">Please log in</h2>
          <p>You need to be logged in to view your dashboard.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-300">
                Welcome back, {userProfile?.name || user?.user_metadata?.name || 'User'}!
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total Bookings</p>
                  <p className="text-2xl font-bold text-yellow-500">{bookings.length}</p>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-500">
                    {confirmedBookingsCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'bookings'
                ? 'bg-yellow-500 text-gray-900'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            My Bookings
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-yellow-500 text-gray-900'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Profile
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Quick Actions */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">My Bookings</h2>
                <button
                  onClick={handleNewBooking}
                  className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Booking
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Bookings Yet</h3>
                  <p className="text-gray-400 mb-6">
                    You haven't made any bookings yet. Start by booking a session!
                  </p>
                  <button
                    onClick={handleBookNow}
                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    <Music className="h-5 w-5 mr-2" />
                    Book Now
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="bg-gray-800 rounded-lg p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">
                            {getServiceName(booking.service_id)}
                          </h3>
                          <div className="flex items-center text-gray-300 mb-2">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(booking.date)}
                          </div>
                          <div className="flex items-center text-gray-300">
                            <Clock className="w-4 h-4 mr-2" />
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end mt-4 md:mt-0">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'N/A'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium mt-2 ${getPaymentStatusColor(booking.payment_status)}`}>
                            {booking.payment_status?.charAt(0).toUpperCase() + booking.payment_status?.slice(1) || 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center text-gray-300">
                          <MapPin className="w-4 h-4 mr-2 text-yellow-500" />
                          <span className="text-sm">{getCategoryName(booking.category_id)}</span>
                        </div>
                        <div className="flex items-center text-gray-300">
                          <Music className="w-4 h-4 mr-2 text-yellow-500" />
                          <span className="text-sm">{booking.participants || 1} participant(s)</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400">
                          Total: <span className="text-white font-semibold">₹{booking.total_amount || 0}</span>
                          {booking.advance_amount && (
                            <span className="ml-2 text-yellow-500">
                              (Advance: ₹{booking.advance_amount})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-300">
                      <User className="w-5 h-5 mr-3 text-yellow-500" />
                      <div>
                        <div className="text-sm text-gray-400">Name</div>
                        <div className="text-white font-medium">{userProfile?.name || user?.user_metadata?.name || 'Not set'}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Mail className="w-5 h-5 mr-3 text-yellow-500" />
                      <div>
                        <div className="text-sm text-gray-400">Email</div>
                        <div className="text-white font-medium">{userProfile?.email || user?.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Phone className="w-5 h-5 mr-3 text-yellow-500" />
                      <div>
                        <div className="text-sm text-gray-400">Phone</div>
                        <div className="text-white font-medium">{userProfile?.phone || 'Not set'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-300">
                      <div className="w-5 h-5 mr-3 text-yellow-500">👤</div>
                      <div>
                        <div className="text-sm text-gray-400">Role</div>
                        <div className="text-white font-medium capitalize">{userProfile?.role || 'user'}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Calendar className="w-5 h-5 mr-3 text-yellow-500" />
                      <div>
                        <div className="text-sm text-gray-400">Member Since</div>
                        <div className="text-white font-medium">
                          {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;