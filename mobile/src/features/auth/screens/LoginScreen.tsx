import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, Button, Input, Card } from '@/components';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useLoginController } from '@/features/auth/hooks/useLoginController';
import { useTheme } from '@/themes';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

interface LoginScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { theme } = useTheme();
  const {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    loading,
    handleLogin,
    handleDevAutofill,
  } = useLoginController();

  return (
    <AuthLayout title="The Digital Athenaeum" subtitle="Welcome back, reader">
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

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
            error={errors.password}
          />

          <Button
            variant="primary"
            fullWidth
            onPress={handleLogin}
            loading={loading}
          >
            Sign In
          </Button>

          <Button
            variant="ghost"
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            Forgot password?
          </Button>

          <View style={[styles.footer, { marginTop: theme.spacing.md }]}>
            <Button
              variant="ghost"
              onPress={() => navigation.navigate('Register')}
            >
              Don't have an account? Sign up
            </Button>
          </View>

          {__DEV__ && (
            <Button
              variant="secondary"
              size="sm"
              onPress={handleDevAutofill}
            >
              Dev: Autofill Test User
            </Button>
          )}
        </View>
      </Card>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
  },
});
