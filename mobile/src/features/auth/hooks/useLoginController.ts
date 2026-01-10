import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleDevAutofill = () => {
    setEmail('test@example.com');
    setPassword('password');
  };

  const handleLogin = async () => {
    setLoading(true);
    setErrors({});

    try {
      await login({ email, password });
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
