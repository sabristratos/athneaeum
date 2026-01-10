import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, Button, Input, Card } from '@/components';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/themes';
import { ApiRequestError } from '@/api/client';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

interface ForgotPasswordScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
}

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { theme } = useTheme();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      await forgotPassword({ email });
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
      <AuthLayout title="Check Your Email" subtitle="Password reset instructions sent">
        <Card padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="body" center>
              We've sent password reset instructions to your email address. Please check your inbox.
            </Text>

            <Button
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate('Login')}
            >
              Back to Sign In
            </Button>
          </View>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="We'll send you reset instructions">
      <Card padding="lg">
        <View style={{ gap: theme.spacing.md }}>
          {errors.general && (
            <Text variant="caption" color="danger">
              {errors.general}
            </Text>
          )}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <Button
            variant="primary"
            fullWidth
            onPress={handleSubmit}
            loading={loading}
          >
            Send Reset Link
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
