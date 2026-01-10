import { apiClient } from '@/api/client';
import type {
  User,
  AuthResponse,
  LoginData,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  MessageResponse,
} from '@/types';
import type { ThemeName } from '@/types/theme';

export const authApi = {
  register: (data: RegisterData): Promise<AuthResponse> =>
    apiClient('/auth/register', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  login: (data: LoginData): Promise<AuthResponse> =>
    apiClient('/auth/login', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  logout: (): Promise<MessageResponse> =>
    apiClient('/auth/logout', {
      method: 'POST',
    }),

  forgotPassword: (data: ForgotPasswordData): Promise<MessageResponse> =>
    apiClient('/auth/forgot-password', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  resetPassword: (data: ResetPasswordData): Promise<MessageResponse> =>
    apiClient('/auth/reset-password', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  getUser: (): Promise<User> => apiClient('/user'),

  updateTheme: (theme: ThemeName): Promise<User> =>
    apiClient('/user/theme', {
      method: 'PATCH',
      body: { theme },
    }),
};
