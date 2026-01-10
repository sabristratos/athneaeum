import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { authApi } from '@/api/auth';
import type { LoginData, RegisterData, ForgotPasswordData, ResetPasswordData } from '@/types';
import type { ThemeName } from '@/types/theme';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth, setUser } = useAuthStore();
  const { setTheme } = useThemeStore();

  const login = async (data: LoginData) => {
    const response = await authApi.login(data);
    await setAuth(response.user, response.token);

    if (response.user.theme) {
      setTheme(response.user.theme);
    }

    return response;
  };

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data);
    await setAuth(response.user, response.token);
    return response;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      await clearAuth();
    }
  };

  const forgotPassword = async (data: ForgotPasswordData) => {
    return await authApi.forgotPassword(data);
  };

  const resetPassword = async (data: ResetPasswordData) => {
    return await authApi.resetPassword(data);
  };

  const updateTheme = async (theme: ThemeName) => {
    const updatedUser = await authApi.updateTheme(theme);
    setUser(updatedUser);
    setTheme(theme);
  };

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateTheme,
  };
}
