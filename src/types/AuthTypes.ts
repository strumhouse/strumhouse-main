export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: any; // Use Supabase User type if available
  session: any; // Use Supabase Session type if available
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, phone: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

export interface AuthProviderProps {
  children: React.ReactNode;
} 