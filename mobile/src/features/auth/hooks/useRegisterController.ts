import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/stores/toastStore';
import { ApiRequestError } from '@/api/client';

interface RegisterControllerState {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  errors: Record<string, string>;
  loading: boolean;
}

interface RegisterControllerActions {
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setPasswordConfirmation: (passwordConfirmation: string) => void;
  handleRegister: () => Promise<void>;
}

type RegisterControllerReturn = RegisterControllerState & RegisterControllerActions;

export function useRegisterController(): RegisterControllerReturn {
  const { register } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!passwordConfirmation) {
      newErrors.password_confirmation = 'Please confirm your password';
    } else if (password !== passwordConfirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success('Account created!');
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
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    passwordConfirmation,
    setPasswordConfirmation,
    errors,
    loading,
    handleRegister,
  };
}
