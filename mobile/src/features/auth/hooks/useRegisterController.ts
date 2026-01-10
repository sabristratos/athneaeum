import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setErrors({});

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
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
