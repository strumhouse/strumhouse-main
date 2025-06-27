// Re-export types from booking.ts for consistency
export * from './booking';

// Additional types that are not in booking.ts
export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  title: string;
  description?: string;
  category: 'gallery' | 'hero' | 'services';
  createdAt: string;
}

export interface BookingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface Media {
  id: string;
  url: string;
  title: string;
  description?: string;
  category: 'gallery' | 'hero';
  created_at: string;
  updated_at: string;
} 