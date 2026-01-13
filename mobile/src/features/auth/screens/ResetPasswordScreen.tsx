import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Text, Button, Input, Card } from '@/components';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/stores/toastStore';
import { useTheme } from '@/themes';
import { ApiRequestError } from '@/api/client';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string; email: string };
};

interface ResetPasswordScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
}

export function ResetPasswordScreen({ navigation, route }: ResetPasswordScreenProps) {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  const toast = useToast();

  const { token, email } = route.params;

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      await resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success('Password updated');
      setSuccess(true);
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

  if (success) {
    return (
      <AuthLayout title="Password Reset" subtitle="Your password has been updated">
        <Card padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="body" center>
              Your password has been successfully reset. You can now sign in with your new password.
            </Text>

            <Button
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate('Login')}
            >
              Sign In
            </Button>
          </View>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Choose a new password for your account"
      onBack={() => navigation.navigate('Login')}
    >
      <Card padding="lg">
        <View style={{ gap: theme.spacing.md }}>
          {errors.general && (
            <Text variant="caption" color="danger">
              {errors.general}
            </Text>
          )}

          <Input
            label="New Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            placeholder="Confirm new password"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password_confirmation}
          />

          <Button
            variant="primary"
            fullWidth
            onPress={handleSubmit}
            loading={loading}
          >
            Reset Password
          </Button>

          <View style={{ alignItems: 'center', marginTop: theme.spacing.md }}>
            <Button
              variant="ghost"
              onPress={() => navigation.navigate('Login')}
            >
              Back to Sign In
            </Button>
          </View>
        </View>
      </Card>
    </AuthLayout>
  );
}
