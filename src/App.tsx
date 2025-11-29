import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './providers/AuthProvider';
import { useAuth } from './hooks/useAuth';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ErrorBoundary from './components/UI/ErrorBoundary';
import ScrollToTop from './components/UI/ScrollToTop';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PaymentSuccess from './pages/PaymentSuccess';

// --- 1. New Imports Added Here ---
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import { BookingProvider } from './contexts/BookingProvider';
// ---------------------------------

// Conditionally import TestPage only in development
let TestPage: React.ComponentType | null = null;
if (process.env.NODE_ENV === 'development') {
  TestPage = React.lazy(() => import('./pages/TestPage'));
}

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'user' | 'admin' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">You need {requiredRole} privileges to access this page.</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950">
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
          
          {/* --- 2. New Routes Added Here --- */}
          {/* These are public routes, so no ProtectedRoute wrapper needed */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          {/* -------------------------------- */}

          <Route path="/booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            </AdminRoute>
          } />
          <Route path="/payment-success/:bookingId" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          {process.env.NODE_ENV === 'development' && TestPage && (
            <Route path="/test" element={
              <React.Suspense fallback={<LoadingSpinner size="lg" text="Loading test page..." />}>
                <TestPage />
              </React.Suspense>
            } />
          )}
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </main>
      <Footer />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151'
          },
          success: {
            iconTheme: {
              primary: '#f59e0b',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff'
            }
          }
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BookingProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <AppRoutes />
          </Router>
        </BookingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
