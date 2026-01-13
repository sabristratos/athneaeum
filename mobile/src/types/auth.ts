import type { ThemeName } from '@/types/theme';
import type { UserPreferences } from '@/stores/preferencesStore';

export type SearchSource = 'google' | 'opds' | 'both';

export interface User {
  id: number;
  name: string;
  email: string;
  theme: ThemeName;
  preferences: UserPreferences | null;
  avatar_url: string | null;
  has_opds_configured: boolean;
  preferred_search_source: SearchSource;
  created_at: string;
  updated_at: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}
