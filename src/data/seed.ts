import { supabase } from '../lib/supabase';

const categories = [
  {
    id: 'c5d1dc72-55aa-496d-aaff-99943861b2df',
    name: 'Jampad',
    description: 'Perfect for band rehearsals, jamming sessions, and practice. Our jampad facilities are equipped with professional instruments and sound systems.',
    is_active: true
  },
  {
    id: '5bb7cae3-40c1-4e91-9c81-090f11266313',
    name: 'Recording Studio',
    description: 'Professional recording studio with state-of-the-art equipment for music production, voice recording, and audio engineering.',
    is_active: true
  }
];

const services = [
  {
    id: '1c2c713a-e8be-4af1-9f57-cde140e6d1b6',
    category_id: 'c5d1dc72-55aa-496d-aaff-99943861b2df', // Jampad
    name: 'Jampad Session',
    description: 'Standard jampad session with professional equipment setup',
    price_per_hour: 400,
    duration: 1,
    max_participants: 10,
    features: [
      'Professional sound system',
      'Basic instruments available',
      'Air conditioning',
      'Parking available'
    ],
    image_url: '/images/jampad-basic.jpg',
    is_active: true,
    advance_booking_hours: 2
  },
  {
    id: '8a84805c-6b13-4214-a3b1-5d43b561ff29',
    category_id: '5bb7cae3-40c1-4e91-9c81-090f11266313', // Recording Studio
    name: 'Raw Recording',
    description: 'Basic recording session with professional equipment',
    price_per_hour: 1000,
    duration: 2,
    max_participants: 6,
    features: [
      'Professional microphones',
      'Basic mixing console',
      'Sound engineer',
      'Air conditioning',
      'Parking available'
    ],
    image_url: '/images/raw-recording.jpg',
    is_active: true,
    advance_booking_hours: 24
  },
  {
    id: 'f43c5ca0-ee36-40f5-8a40-5c4ab5e58408',
    category_id: '5bb7cae3-40c1-4e91-9c81-090f11266313', // Recording Studio
    name: 'Mixing & Mastering',
    description: 'Professional mixing and mastering services',
    price_per_hour: 1500,
    duration: 1,
    max_participants: 1,
    features: [
      'Professional mixing console',
      'High-end monitoring',
      'Experienced engineer',
      'Multiple revisions',
      'All formats delivery'
    ],
    image_url: '/images/mixing.jpg',
    is_active: true,
    advance_booking_hours: 24
  }
];

const addOns = [
  {
    id: 'a1b2c3d4-e5f6-4a5b-9c8d-1e2f3a4b5c6d',
    category_id: 'c5d1dc72-55aa-496d-aaff-99943861b2df', // Jampad
    name: 'Live Recording',
    description: 'Record your jamming session',
    price_per_hour: 1000,
    is_active: true
  },
  {
    id: 'b2c3d4e5-f6a7-5b6c-0d1e-2f3a4b5c6d7e',
    category_id: 'c5d1dc72-55aa-496d-aaff-99943861b2df', // Jampad
    name: 'In-Ears',
    description: 'Professional in-ear monitoring',
    price_per_hour: 300,
    is_active: true
  }
];

// Function to disable RLS
const disableRLS = async () => {
  try {
    const { error: categoriesError } = await supabase.rpc('disable_rls', { table_name: 'categories' });
    if (categoriesError) throw categoriesError;

    const { error: servicesError } = await supabase.rpc('disable_rls', { table_name: 'services' });
    if (servicesError) throw servicesError;

    const { error: addOnsError } = await supabase.rpc('disable_rls', { table_name: 'add_ons' });
    if (addOnsError) throw addOnsError;

    return true;
  } catch (error) {
    console.error('Error disabling RLS:', error);
    return false;
  }
};

// Function to enable RLS
const enableRLS = async () => {
  try {
    const { error: categoriesError } = await supabase.rpc('enable_rls', { table_name: 'categories' });
    if (categoriesError) throw categoriesError;

    const { error: servicesError } = await supabase.rpc('enable_rls', { table_name: 'services' });
    if (servicesError) throw servicesError;

    const { error: addOnsError } = await supabase.rpc('enable_rls', { table_name: 'add_ons' });
    if (addOnsError) throw addOnsError;

    return true;
  } catch (error) {
    console.error('Error enabling RLS:', error);
    return false;
  }
};

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // First disable RLS
    console.log('Disabling RLS...');
    const rlsDisabled = await disableRLS();
    if (!rlsDisabled) {
      throw new Error('Failed to disable RLS');
    }

    // Insert categories
    console.log('Inserting categories...');
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .upsert(categories, { onConflict: 'id' })
      .select();

    if (categoriesError) {
      throw new Error(`Error inserting categories: ${categoriesError.message}`);
    }
    console.log('Categories inserted:', categoriesData);

    // Insert services
    console.log('Inserting services...');
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .upsert(services, { onConflict: 'id' })
      .select();

    if (servicesError) {
      throw new Error(`Error inserting services: ${servicesError.message}`);
    }
    console.log('Services inserted:', servicesData);

    // Insert add-ons
    console.log('Inserting add-ons...');
    const { data: addOnsData, error: addOnsError } = await supabase
      .from('add_ons')
      .upsert(addOns, { onConflict: 'id' })
      .select();

    if (addOnsError) {
      throw new Error(`Error inserting add-ons: ${addOnsError.message}`);
    }
    console.log('Add-ons inserted:', addOnsData);

    // Re-enable RLS
    console.log('Re-enabling RLS...');
    const rlsEnabled = await enableRLS();
    if (!rlsEnabled) {
      throw new Error('Failed to re-enable RLS');
    }

    console.log('Database seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
};

export const checkData = async () => {
  try {
    console.log('Checking database data...');

    // Check categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (categoriesError) throw categoriesError;
    console.log('Categories found:', categoriesData?.length || 0);

    // Check services
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true);

    if (servicesError) throw servicesError;
    console.log('Services found:', servicesData?.length || 0);

    // Check add-ons
    const { data: addOnsData, error: addOnsError } = await supabase
      .from('add_ons')
      .select('*')
      .eq('is_active', true);

    if (addOnsError) throw addOnsError;
    console.log('Add-ons found:', addOnsData?.length || 0);

    return {
      categories: categoriesData || [],
      services: servicesData || [],
      addOns: addOnsData || []
    };
  } catch (error) {
    console.error('Error checking database:', error);
    return null;
  }
}; 