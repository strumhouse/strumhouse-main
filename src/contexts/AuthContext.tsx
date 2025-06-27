import { createContext } from 'react';
import type { AuthContextType } from '../types/AuthTypes';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);