import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/stores/toastStore';
import { ApiRequestError } from '@/api/client';

interface LoginControllerState {
  email: string;
  password: string;
  errors: Record<string, string>;
  loading: boolean;
}

interface LoginControllerActions {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  handleLogin: () => Promise<void>;
  handleDevAutofill: () => void;
}

type LoginControllerReturn = LoginControllerState & LoginControllerActions;

export function useLoginController(): LoginControllerReturn {
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleDevAutofill = () => {
    setEmail('test@example.com');
    setPassword('password');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await login({ email, password });
      toast.success('Welcome back!');
    } catch (error) {
      if (error instanceof ApiRequestError && error.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(error.errors).forEach(([key, messages]) => {
          fieldErrors[key] = messages[0];
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        setErrors({ general: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    loading,
    handleLogin,
    handleDevAutofill,
  };
}
