import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const Gallery: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.storage.from('gallery-images').list('', { limit: 100 });
        if (error) throw error;
        const urls = (data || []).map(item => {
          const { data: urlData } = supabase.storage.from('gallery-images').getPublicUrl(item.name);
          return urlData.publicUrl;
        });
        setImages(urls);
      } catch (err) {
        setError('Failed to load gallery');
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
        <div className="text-center text-gray-300">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-secondary">
              Gallery
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Take a look inside Strum House and see our professional facilities, equipment, and the creative atmosphere we provide
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((url, index) => (
              <div
                key={url}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-gray-900"
                onClick={() => setSelectedImage(url)}
              >
                <div className="aspect-square">
                  <img
                    src={url}
                    alt="Gallery"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
            ))}
          </div>
          {images.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No images available at the moment.</p>
            </div>
          )}
        </div>
      </section>
      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-60 text-white hover:text-green-500 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl max-h-[80vh] w-full"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Gallery"
                className="w-full h-full object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;