import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { categoryService, serviceService } from '../lib/database';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { seedDatabase, checkData } from '../data/seed';

const TestPage: React.FC = () => {
  const { loading: authLoading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Test basic Supabase connection
      const { data, error } = await supabase.from('categories').select('*').limit(1);
      
      if (error) {
        setConnectionStatus('failed');
        toast.error(`Database connection failed: ${error.message}`);
        return;
      }

      setConnectionStatus('connected');
      toast.success('Database connected successfully!');

      // Check existing data
      const dbData = await checkData();
      if (dbData) {
        setCategories(dbData.categories);
        setServices(dbData.services);
      }

    } catch (err) {
      setConnectionStatus('failed');
      setError('Failed to load test data');
    }
  }, []);

  const handleSeedDatabase = async () => {
    try {
      setSeeding(true);
      const success = await seedDatabase();
      if (success) {
        toast.success('Database seeded successfully!');
        // Refresh data
        await fetchData();
      } else {
        toast.error('Failed to seed database');
      }
    } catch (error) {
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><div>Loading...</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
        <div className="text-center text-gray-300">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Database Connection Test</h1>
        
        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Connection Status</h2>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-white font-medium">
              {connectionStatus === 'connected' ? '✅ Connected to Supabase' :
               connectionStatus === 'failed' ? '❌ Connection Failed' : '⏳ Testing Connection...'}
            </span>
          </div>
          
          {connectionStatus === 'connected' && (
            <div>
              <p className="text-green-400 mt-2">Your database is properly connected!</p>
              {/* Seed Database Button */}
              <div className="mt-4">
                <button
                  onClick={handleSeedDatabase}
                  disabled={seeding}
                  className={`bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors ${
                    seeding ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {seeding ? 'Seeding Database...' : 'Seed Database with Test Data'}
                </button>
                <p className="text-sm text-gray-400 mt-2">
                  Click this button to populate the database with initial categories, services, and add-ons.
                </p>
              </div>
            </div>
          )}
          
          {connectionStatus === 'failed' && (
            <div className="mt-4">
              <p className="text-red-400 mb-2">Connection failed. Please check:</p>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Supabase URL and API key in .env file</li>
                <li>• Database schema has been created</li>
                <li>• Network connection</li>
              </ul>
            </div>
          )}
        </div>

        {/* Test Data */}
        {connectionStatus === 'connected' && (
          <div className="space-y-6">
            {/* Categories */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Categories ({categories.length})</h3>
              <div className="grid gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="bg-gray-700 rounded p-4">
                    <h4 className="text-white font-medium">{category.name}</h4>
                    <p className="text-gray-400 text-sm">{category.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Services ({services.length})</h3>
              <div className="grid gap-4">
                {services.map((service) => (
                  <div key={service.id} className="bg-gray-700 rounded p-4">
                    <h4 className="text-white font-medium">{service.name}</h4>
                    <p className="text-gray-400 text-sm">{service.description}</p>
                    <p className="text-yellow-500 font-medium">₹{service.price_per_hour}/hour</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {connectionStatus === 'failed' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Setup Instructions</h3>
            <div className="text-gray-300 space-y-2">
              <p>1. Go to your Supabase project dashboard</p>
              <p>2. Navigate to SQL Editor</p>
              <p>3. Copy and paste the contents of <code className="bg-gray-700 px-2 py-1 rounded">supabase-schema.sql</code></p>
              <p>4. Run the SQL to create tables and sample data</p>
              <p>5. Refresh this page to test the connection</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPage; 