import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  Settings, 
  BarChart3, 
  Package, 
  Image, 
  Shield, 
  LogOut,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  bookingService, 
  serviceService, 
  categoryService, 
  userService,
  addOnService,
  blockedSlotService
} from '../lib/database';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

type AdminTab = 'overview' | 'bookings' | 'services' | 'addons' | 'categories' | 'users' | 'gallery' | 'blocked-slots' | 'settings';


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading, userProfile, authReady } = useAuth();
  
  // Initialize activeTab from localStorage or default to 'overview'
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    return (localStorage.getItem('admin_dashboard_tab') as AdminTab) || 'overview';
  });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalServices: 0,
    blockedSlots: 0
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [blockSlotForm, setBlockSlotForm] = useState({
    date: '',
    start_time: '09:00', // Default start time
    end_time: '10:00',   // Default end time
    reason: ''
  });
  const [blockSlotLoading, setBlockSlotLoading] = useState(false);
  const [blockSlotError, setBlockSlotError] = useState<string | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price_per_hour: 0,
    duration: 1,
    max_participants: 1,
    features: '',
    image_url: '',
    category_id: '',
    is_active: true,
    advance_booking_hours: 24,
  });
  const [, setServiceImageFile] = useState<File | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true,
  });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [bookingForm, setBookingForm] = useState<{ status: 'pending' | 'confirmed' | 'cancelled'; notes: string }>({ status: 'confirmed', notes: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [] = useState<File | null>(null);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [addOnLoading, setAddOnLoading] = useState(false);
  const [addOnError, setAddOnError] = useState<string | null>(null);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<any | null>(null);
  const [addOnForm, setAddOnForm] = useState({
    name: '',
    description: '',
    price_per_hour: 0,
    max_quantity: 1,
    category_id: '',
    is_active: true,
  });
  const [bookingDateFilter, setBookingDateFilter] = useState<string>('');

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('admin_dashboard_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      return;
    }

    if (user.role !== 'admin') {
      navigate('/dashboard');
      toast.error('Access denied. Admin privileges required.');
      return;
    }

    fetchDashboardData();
  }, [authReady, user, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch summary from API (cached server-side)
      const summaryResponse = await fetch('/api/admin/summary');

      let stats = {
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        totalRevenue: 0,
        totalUsers: 0,
        totalServices: 0,
        blockedSlots: 0
      };

      if (summaryResponse.ok) {
        const text = await summaryResponse.text();
        // console.log('RAW /api/admin/summary response:', text); // Removed detailed logging for cleaner console
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            stats = {
              totalBookings: parsed.totalBookings ?? 0,
              pendingBookings: parsed.pendingBookings ?? 0,
              confirmedBookings: parsed.confirmedBookings ?? 0,
              totalRevenue: parsed.totalRevenue ?? 0,
              totalUsers: parsed.totalUsers ?? 0,
              totalServices: parsed.totalServices ?? 0,
              blockedSlots: parsed.blockedSlots ?? 0,
            };
          }
        } catch (parseErr) {
          console.error('AdminDashboard: summary JSON parse failed, raw response:', text);
        }
      }

      setStats(stats);

      // Lazy load detailed data only when needed
      const [allBookings, allServices, allCategories, allUsers] = await Promise.all([
        bookingService.getAll(),
        serviceService.getAll(),
        categoryService.getAll(),
        userService.getAll()
      ]);

      setBookings(allBookings);
      setServices(allServices);
      setCategories(allCategories);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'addons', label: 'Add-ons', icon: Plus },
    { id: 'categories', label: 'Categories', icon: Settings },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'blocked-slots', label: 'Blocked Slots', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const fetchGalleryImages = async () => {
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const { data, error } = await supabase.storage.from('gallery-images').list('', { limit: 100 });
      if (error) throw error;
      const urls = await Promise.all(
        (data || []).map(async (item: any) => {
          const { data: urlData } = supabase.storage.from('gallery-images').getPublicUrl(item.name);
          return urlData.publicUrl;
        })
      );
      setGalleryImages(urls);
    } catch (err) {
      setGalleryError('Failed to load gallery images');
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gallery') fetchGalleryImages();
  }, [activeTab]);

  const handleGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGalleryImageFile(e.target.files[0]);
    }
  };

  const handleUploadGalleryImage = async () => {
    if (!galleryImageFile) return;
    setGalleryLoading(true);
    try {
      const fileExt = galleryImageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const { error } = await supabase.storage.from('gallery-images').upload(fileName, galleryImageFile, { upsert: true });
      if (error) throw error;
      setGalleryImageFile(null);
      fetchGalleryImages();
    } catch (err) {
      setGalleryError('Failed to upload image');
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleDeleteGalleryImage = async (publicUrl: string) => {
    setGalleryLoading(true);
    try {
      // Extract file name from public URL
      const parts = publicUrl.split('/');
      const fileName = parts[parts.length - 1];
      const { error } = await supabase.storage.from('gallery-images').remove([fileName]);
      if (error) throw error;
      fetchGalleryImages();
    } catch (err) {
      setGalleryError('Failed to delete image');
    } finally {
      setGalleryLoading(false);
    }
  };

  const fetchServices = async () => {
    setServiceLoading(true);
    setServiceError(null);
    try {
      const data = await serviceService.getAll();
      setServices(data);
    } catch (err) {
      setServiceError('Failed to load services');
    } finally {
      setServiceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'services') fetchServices();
  }, [activeTab]);

  const openAddService = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      price_per_hour: 0,
      duration: 1,
      max_participants: 1,
      features: '',
      image_url: '',
      category_id: categories[0]?.id || '',
      is_active: true,
      advance_booking_hours: 24,
    });
    setServiceImageFile(null);
    setShowServiceModal(true);
  };

  const openEditService = (item: any) => {
    setEditingService(item);
    setServiceForm({
      name: item.name,
      description: item.description || '',
      price_per_hour: item.price_per_hour,
      duration: item.duration,
      max_participants: item.max_participants,
      features: (item.features || []).join(', '),
      image_url: item.image_url,
      category_id: item.category_id,
      is_active: item.is_active,
      advance_booking_hours: item.advance_booking_hours,
    });
    setServiceImageFile(null);
    setShowServiceModal(true);
  };

  const handleServiceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setServiceForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setServiceForm((prev) => ({ ...prev, [name]: value }));
    }
  };


  const handleSaveService = async () => {
    setServiceLoading(true);
    try {
      const { image_url, ...serviceData } = serviceForm;
      const features = serviceForm.features.split(',').map((f: string) => f.trim()).filter(Boolean);
      if (editingService) {
        await serviceService.update(editingService.id, { ...serviceData, features });
        toast.success('Service updated');
      } else {
        await serviceService.create({ ...serviceData, features });
        toast.success('Service added');
      }
      setShowServiceModal(false);
      fetchServices();
    } catch (err) {
      toast.error('Failed to save service');
    } finally {
      setServiceLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    setServiceLoading(true);
    try {
      await serviceService.delete(id);
      toast.success('Service deleted');
      fetchServices();
    } catch (err) {
      toast.error('Failed to delete service');
    } finally {
      setServiceLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoryLoading(true);
    setCategoryError(null);
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err) {
      setCategoryError('Failed to load categories');
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'categories') fetchCategories();
  }, [activeTab]);

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', image_url: '', is_active: true });
    setShowCategoryModal(true);
  };

  const openEditCategory = (item: any) => {
    setEditingCategory(item);
    setCategoryForm({
      name: item.name,
      description: item.description || '',
      image_url: item.image_url,
      is_active: item.is_active,
    });
    setShowCategoryModal(true);
  };

  const handleCategoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setCategoryForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setCategoryForm((prev) => ({ ...prev, [name]: value }));
    }
  };


  const handleSaveCategory = async () => {
    setCategoryLoading(true);
    try {
      const { image_url, ...categoryData } = categoryForm;
      if (editingCategory) {
        await categoryService.update(editingCategory.id, categoryData);
        toast.success('Category updated');
      } else {
        await categoryService.create(categoryData);
        toast.success('Category added');
      }
      setShowCategoryModal(false);
      fetchCategories();
    } catch (err) {
      toast.error('Failed to save category');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    setCategoryLoading(true);
    try {
      await categoryService.delete(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete category');
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchBookings = async () => {
    setBookingLoading(true);
    setBookingError(null);
    try {
      const data = await bookingService.getAll();
      setBookings(data);
    } catch (err) {
      setBookingError('Failed to load bookings');
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab]);

  const openEditBooking = (item: any) => {
    setEditingBooking(item);
    setBookingForm({
      status: item.status,
      notes: item.notes || '',
    });
    setShowBookingModal(true);
  };

  const handleBookingFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({ ...prev, [name]: name === 'status' ? value as 'pending' | 'confirmed' | 'cancelled' : value }));
  };

  const handleSaveBooking = async () => {
    setBookingLoading(true);
    try {
      await bookingService.update(editingBooking.id, { status: bookingForm.status, notes: bookingForm.notes });
      toast.success('Booking updated');
      setShowBookingModal(false);
      fetchBookings();
      
      // If booking status changed to cancelled or pending, refresh the page to update time slot availability
      if (bookingForm.status !== editingBooking.status && 
          (bookingForm.status === 'cancelled' || bookingForm.status === 'pending' || editingBooking.status === 'cancelled' || editingBooking.status === 'pending')) {
        // Show a message that time slots have been updated
        toast.success('Time slot availability has been updated');
      }
    } catch (err) {
      toast.error('Failed to update booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      setUserError('Failed to load users');
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', phone: '', role: 'user' });
    setShowUserModal(true);
  };

  const openEditUser = (item: any) => {
    setEditingUser(item);
    setUserForm({
      name: item.name,
      email: item.email,
      phone: item.phone || '',
      role: item.role,
    });
    setShowUserModal(true);
  };

  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserForm((prev) => ({ ...prev, [name]: name === 'role' ? value as 'user' | 'admin' : value }));
  };

  const handleSaveUser = async () => {
    setUserLoading(true);
    try {
      const userPayload = { ...userForm, role: userForm.role as 'user' | 'admin' };
      if (editingUser) {
        await userService.updateUser(editingUser.id, userPayload);
        toast.success('User updated');
      } else {
        await userService.createUser(userPayload);
        toast.success('User added');
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to save user');
    } finally {
      setUserLoading(false);
    }
  };

  const fetchAddOns = async () => {
    setAddOnLoading(true);
    setAddOnError(null);
    try {
      const data = await addOnService.getAll();
      setAddOns(data);
    } catch (err) {
      setAddOnError('Failed to load add-ons');
    } finally {
      setAddOnLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'addons') fetchAddOns();
  }, [activeTab]);

  const openAddAddOn = () => {
    setEditingAddOn(null);
    setAddOnForm({ name: '', description: '', price_per_hour: 0, max_quantity: 1, category_id: categories[0]?.id || '', is_active: true });
    setShowAddOnModal(true);
  };

  const openEditAddOn = (item: any) => {
    setEditingAddOn(item);
    setAddOnForm({
      name: item.name,
      description: item.description,
      price_per_hour: item.price_per_hour,
      max_quantity: item.max_quantity,
      category_id: item.category_id,
      is_active: item.is_active,
    });
    setShowAddOnModal(true);
  };

  const handleAddOnFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setAddOnForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      setAddOnForm((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setAddOnForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveAddOn = async () => {
    setAddOnLoading(true);
    try {
      if (editingAddOn) {
        await addOnService.update(editingAddOn.id, { ...addOnForm });
        toast.success('Add-on updated');
      } else {
        await addOnService.create({ ...addOnForm });
        toast.success('Add-on added');
      }
      setShowAddOnModal(false);
      fetchAddOns();
    } catch (err) {
      toast.error('Failed to save add-on');
    } finally {
      setAddOnLoading(false);
    }
  };

  const handleDeleteAddOn = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this add-on?')) return;
    setAddOnLoading(true);
    try {
      await addOnService.update(id, { is_active: false });
      toast.success('Add-on deleted');
      fetchAddOns();
    } catch (err) {
      toast.error('Failed to delete add-on');
    } finally {
      setAddOnLoading(false);
    }
  };

  // Fetch blocked slots when tab is active
  useEffect(() => {
    if (activeTab === 'blocked-slots') {
      fetchBlockedSlots();
    }
  }, [activeTab]);

  const fetchBlockedSlots = async () => {
    try {
      setBlockSlotLoading(true);
      const today = new Date();
      const end = new Date();
      end.setDate(today.getDate() + 30);
      const slots = await blockedSlotService.getByDateRange(
        format(today, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setBlockedSlots(slots);
    } catch (err) {
      setBlockSlotError('Failed to load blocked slots');
    } finally {
      setBlockSlotLoading(false);
    }
  };

  const handleBlockSlotFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setBlockSlotForm({ ...blockSlotForm, [e.target.name]: e.target.value });
  };

  const handleBlockSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockSlotForm.date || !blockSlotForm.start_time || !blockSlotForm.end_time) {
      setBlockSlotError('Date, start time, and end time are required');
      return;
    }
    setBlockSlotError(null);
    setBlockSlotLoading(true);
    try {
      // Ensure times are in correct format HH:MM:SS for database if needed, but UI uses HH:MM
      // Assuming database expects HH:MM:SS, let's append :00 if not present.
      // But the select inputs return "09:00", so just append ":00".
      // If the values already have seconds, we need to handle that.
      // Given the select input, it will be HH:MM.
      
      const startTimeFormatted = blockSlotForm.start_time.length === 5 ? blockSlotForm.start_time + ':00' : blockSlotForm.start_time;
      const endTimeFormatted = blockSlotForm.end_time.length === 5 ? blockSlotForm.end_time + ':00' : blockSlotForm.end_time;

      await blockedSlotService.create({
        date: blockSlotForm.date,
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        reason: blockSlotForm.reason,
        created_by: user ? user.id : ''
      });
      toast.success('Slot blocked successfully');
      setBlockSlotForm({ date: '', start_time: '09:00', end_time: '10:00', reason: '' });
      fetchBlockedSlots();
    } catch (err) {
      setBlockSlotError('Failed to block slot');
    } finally {
      setBlockSlotLoading(false);
    }
  };

  const handleUnblockSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to unblock this time slot?')) return;
    
    setBlockSlotLoading(true);
    try {
      await blockedSlotService.delete(slotId);
      toast.success('Slot unblocked successfully');
      fetchBlockedSlots();
    } catch (err) {
      toast.error('Failed to unblock slot');
    } finally {
      setBlockSlotLoading(false);
    }
  };

  // Helper to generate time options for select dropdown
  const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      options.push(`${hour}:00`);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">You need admin privileges to access this page.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-yellow-500 text-gray-900'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Total Bookings</p>
                      <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="bg-yellow-500/20 p-3 rounded-lg">
                      <Calendar className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Pending Bookings</p>
                      <p className="text-2xl font-bold text-white">{stats.pendingBookings}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="bg-green-500/20 p-3 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Total Revenue</p>
                      <p className="text-2xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="bg-purple-500/20 p-3 rounded-lg">
                      <Users className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="bg-red-500/20 p-3 rounded-lg">
                      <Shield className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Blocked Slots</p>
                      <p className="text-2xl font-bold text-white">{stats.blockedSlots}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Recent Bookings</h3>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-yellow-500 hover:text-yellow-400 text-sm"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{booking.customer_name}</p>
                        <p className="text-gray-400 text-sm">{booking.date} at {booking.start_time}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                          booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {booking.status}
                        </span>
                        <span className="text-white font-medium">₹{booking.total_amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">All Bookings</h2>
                <input
                  type="date"
                  className="bg-gray-700 text-white rounded px-3 py-2 ml-4"
                  value={bookingDateFilter || ''}
                  onChange={e => setBookingDateFilter(e.target.value)}
                  placeholder="Filter by date"
                  style={{ minWidth: 180 }}
                />
              </div>
              {bookingLoading ? (
                <LoadingSpinner size="md" text="Loading bookings..." />
              ) : bookingError ? (
                <div className="text-red-400">{bookingError}</div>
              ) : (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Booking ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date & Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Remaining</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {(bookingDateFilter
                          ? bookings.filter(b => b.date === bookingDateFilter)
                          : bookings
                        ).map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">{booking.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-white">{booking.customer_name}</div>
                                <div className="text-sm text-gray-400">{booking.customer_email}</div>
                                <div className="text-sm text-gray-400">{booking.customer_phone || 'N/A'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">{booking.date}</div>
                              <div className="text-sm text-gray-400">{booking.start_time} - {booking.end_time}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">₹{booking.total_amount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">₹{booking.total_amount - (booking.advance_amount || 0)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-yellow-500 hover:text-yellow-400 mr-3" onClick={() => openEditBooking(booking)}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <Modal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} title={editingBooking ? 'Edit Booking' : 'Edit Booking'}>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveBooking(); }}>
                  <div>
                    <label className="block text-gray-300 mb-1">Status</label>
                    <select name="status" value={bookingForm.status} onChange={handleBookingFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2">
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Notes</label>
                    <textarea name="notes" value={bookingForm.notes} onChange={handleBookingFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" />
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button type="button" onClick={() => setShowBookingModal(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded" disabled={bookingLoading}>{bookingLoading ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              </Modal>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Services Management</h2>
                <button className="flex items-center bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg" onClick={openAddService}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </button>
              </div>
              {serviceLoading ? (
                <LoadingSpinner size="md" text="Loading services..." />
              ) : serviceError ? (
                <div className="text-red-400">{serviceError}</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <div key={service.id} className="bg-gray-800 rounded-lg p-6">
                      <div className="aspect-video bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                        {service.image_url ? (
                          <img src={service.image_url} alt={service.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package className="w-12 h-12 text-gray-500" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{service.name}</h3>
                      <p className="text-gray-400 text-sm mb-4">{service.description}</p>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-yellow-500 font-bold">₹{service.price_per_hour}/hr</span>
                        <span className="text-gray-400 text-sm">{service.duration}h</span>
                      </div>
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm" onClick={() => openEditService(service)}>
                          Edit
                        </button>
                        <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm" onClick={() => handleDeleteService(service.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} title={editingService ? 'Edit Service' : 'Add Service'}>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveService(); }}>
                  <div>
                    <label className="block text-gray-300 mb-1">Name</label>
                    <input type="text" name="name" value={serviceForm.name} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Description</label>
                    <textarea name="description" value={serviceForm.description} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Category</label>
                    <select name="category_id" value={serviceForm.category_id} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2">
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-1">Price per Hour</label>
                      <input type="number" name="price_per_hour" value={serviceForm.price_per_hour} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Duration (hours)</label>
                      <input type="number" name="duration" value={serviceForm.duration} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-1">Max Participants</label>
                      <input type="number" name="max_participants" value={serviceForm.max_participants} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Advance Booking Hours</label>
                      <input type="number" name="advance_booking_hours" value={serviceForm.advance_booking_hours} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Features (comma separated)</label>
                    <input type="text" name="features" value={serviceForm.features} onChange={handleServiceFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" />
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="is_active" checked={serviceForm.is_active} onChange={handleServiceFormChange} className="mr-2" />
                    <span className="text-gray-300">Active</span>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button type="button" onClick={() => setShowServiceModal(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded" disabled={serviceLoading}>{serviceLoading ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              </Modal>
            </div>
          )}

          {activeTab === 'addons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Add-ons Management</h2>
                <button className="flex items-center bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg" onClick={openAddAddOn}>
                  <Plus className="w-4 h-4 mr-2" /> Add Add-on
                </button>
              </div>
              {addOnLoading ? (
                <LoadingSpinner size="md" text="Loading add-ons..." />
              ) : addOnError ? (
                <div className="text-red-400">{addOnError}</div>
              ) : (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price/hr</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Max Qty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Active</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {addOns.map((addOn) => (
                          <tr key={addOn.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-white">{addOn.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-300">{addOn.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-yellow-500">₹{addOn.price_per_hour}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-300">{addOn.max_quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-300">{categories.find(c => c.id === addOn.category_id)?.name || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs ${addOn.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{addOn.is_active ? 'Yes' : 'No'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-yellow-500 hover:text-yellow-400 mr-3" onClick={() => openEditAddOn(addOn)}>
                                Edit
                              </button>
                              <button className="text-red-500 hover:text-red-400" onClick={() => handleDeleteAddOn(addOn.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <Modal isOpen={showAddOnModal} onClose={() => setShowAddOnModal(false)} title={editingAddOn ? 'Edit Add-on' : 'Add Add-on'}>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveAddOn(); }}>
                  <div>
                    <label className="block text-gray-300 mb-1">Name</label>
                    <input type="text" name="name" value={addOnForm.name} onChange={handleAddOnFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Description</label>
                    <textarea name="description" value={addOnForm.description} onChange={handleAddOnFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Price per hour</label>
                    <input type="number" name="price_per_hour" value={addOnForm.price_per_hour} onChange={handleAddOnFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Max Quantity</label>
                    <input type="number" name="max_quantity" value={addOnForm.max_quantity} onChange={handleAddOnFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Category</label>
                    <select name="category_id" value={addOnForm.category_id} onChange={handleAddOnFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="is_active" checked={addOnForm.is_active} onChange={handleAddOnFormChange} className="mr-2" />
                    <span className="text-gray-300">Active</span>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button type="button" onClick={() => setShowAddOnModal(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded" disabled={addOnLoading}>{addOnLoading ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              </Modal>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Categories Management</h2>
                <button className="flex items-center bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg" onClick={openAddCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </button>
              </div>
              {categoryLoading ? (
                <LoadingSpinner size="md" text="Loading categories..." />
              ) : categoryError ? (
                <div className="text-red-400">{categoryError}</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-gray-800 rounded-lg p-6">
                      <div className="aspect-video bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                        {category.image_url ? (
                          <img src={category.image_url} alt={category.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package className="w-12 h-12 text-gray-500" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{category.name}</h3>
                      <p className="text-gray-400 text-sm mb-4">{category.description}</p>
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm" onClick={() => openEditCategory(category)}>
                          Edit
                        </button>
                        <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm" onClick={() => handleDeleteCategory(category.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveCategory(); }}>
                  <div>
                    <label className="block text-gray-300 mb-1">Name</label>
                    <input type="text" name="name" value={categoryForm.name} onChange={handleCategoryFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Description</label>
                    <textarea name="description" value={categoryForm.description} onChange={handleCategoryFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" />
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="is_active" checked={categoryForm.is_active} onChange={handleCategoryFormChange} className="mr-2" />
                    <span className="text-gray-300">Active</span>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button type="button" onClick={() => setShowCategoryModal(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded" disabled={categoryLoading}>{categoryLoading ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              </Modal>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <button className="flex items-center bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg" onClick={openAddUser}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </button>
              </div>
              {userLoading ? (
                <LoadingSpinner size="md" text="Loading users..." />
              ) : userError ? (
                <div className="text-red-400">{userError}</div>
              ) : (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Joined</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{user.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-yellow-500 hover:text-yellow-400 mr-3" onClick={() => openEditUser(user)}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? 'Edit User' : 'Add User'}>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveUser(); }}>
                  <div>
                    <label className="block text-gray-300 mb-1">Name</label>
                    <input type="text" name="name" value={userForm.name} onChange={handleUserFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Email</label>
                    <input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Phone</label>
                    <input type="text" name="phone" value={userForm.phone} onChange={handleUserFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Role</label>
                    <select name="role" value={userForm.role} onChange={handleUserFormChange} className="w-full bg-gray-800 text-white rounded px-3 py-2">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button type="button" onClick={() => setShowUserModal(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded" disabled={userLoading}>{userLoading ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              </Modal>
            </div>
          )}

          {activeTab === 'gallery' && user?.role === 'admin' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Gallery Management</h2>
                <label className="flex items-center bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleGalleryImageChange} className="hidden" />
                  <span>Upload Image</span>
                </label>
                {galleryImageFile && (
                  <button onClick={handleUploadGalleryImage} className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg">Save</button>
                )}
              </div>
              {galleryLoading ? (
                <LoadingSpinner size="md" text="Loading gallery..." />
              ) : galleryError ? (
                <div className="text-red-400">{galleryError}</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {galleryImages.map((url) => (
                    <div key={url} className="bg-gray-900 rounded-lg p-4 relative">
                      <img src={url} alt="Gallery" className="w-full h-48 object-cover rounded mb-2" />
                      <button onClick={() => handleDeleteGalleryImage(url)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'blocked-slots' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Blocked Time Slots Management</h2>
              </div>
              
              {/* Block New Slot Form - Encased in a distinct boundary */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">Block New Time Slot</h3>
                <form onSubmit={handleBlockSlotSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                    <input 
                      type="date" 
                      name="date" 
                      value={blockSlotForm.date} 
                      onChange={handleBlockSlotFormChange} 
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                    <div className="relative">
                      <select 
                        name="start_time" 
                        value={blockSlotForm.start_time} 
                        onChange={handleBlockSlotFormChange as any} 
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 appearance-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                    <div className="relative">
                      <select 
                        name="end_time" 
                        value={blockSlotForm.end_time} 
                        onChange={handleBlockSlotFormChange as any} 
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 appearance-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Reason (optional)</label>
                    <input 
                      type="text" 
                      name="reason" 
                      value={blockSlotForm.reason} 
                      onChange={handleBlockSlotFormChange} 
                      placeholder="e.g. Maintenance"
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all" 
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-4">
                    <button 
                      type="submit" 
                      className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-yellow-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0" 
                      disabled={blockSlotLoading}
                    >
                      {blockSlotLoading ? (
                        <span className="flex items-center">
                          <LoadingSpinner size="sm" className="mr-2" />
                          Blocking...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Shield className="w-5 h-5 mr-2" />
                          Block Slot
                        </span>
                      )}
                    </button>
                  </div>
                  {blockSlotError && <div className="md:col-span-2 lg:col-span-4 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mt-2">{blockSlotError}</div>}
                </form>
              </div>

              {/* Blocked Slots Table */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Currently Blocked Slots (Next 30 Days)</h3>
                {blockSlotLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-gray-300">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Start Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">End Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reason</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {blockedSlots.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                              No blocked slots found
                            </td>
                          </tr>
                        ) : (
                          blockedSlots.map(slot => (
                            <tr key={slot.id} className="hover:bg-gray-700">
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-white">{slot.date}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-white">{slot.start_time}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-white">{slot.end_time}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">{slot.reason || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleUnblockSlot(slot.id)}
                                  disabled={blockSlotLoading}
                                  className="bg-red-500 hover:bg-red-400 text-white text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
                                >
                                  {blockSlotLoading ? 'Unblocking...' : 'Unblock'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Studio Settings</h2>
              <p className="text-gray-400">Settings interface coming soon...</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;