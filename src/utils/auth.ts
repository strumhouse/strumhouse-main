import { User } from '../types';

const JWT_SECRET = 'strum-house-secret-key';

export const generateToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  // Simple base64 encoding for demo purposes
  return btoa(JSON.stringify(payload));
};

export const decodeToken = (token: string): any => {
  try {
    const decoded = JSON.parse(atob(token));
    if (decoded.exp < Date.now()) {
      throw new Error('Token expired');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    decodeToken(token);
    return true;
  } catch {
    localStorage.removeItem('token');
    return false;
  }
};

export const getCurrentUser = (): User | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const decoded = decodeToken(token);
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: '',
      phone: '',
      createdAt: ''
    };
  } catch {
    return null;
  }
};

export const logout = (): void => {
  localStorage.removeItem('token');
  window.location.href = '/';
};