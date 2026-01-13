import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, Button, Input, Card } from '@/components';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useRegisterController } from '@/features/auth/hooks/useRegisterController';
import { useTheme } from '@/themes';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

interface RegisterScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
}

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { theme } = useTheme();
  const {
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
  } = useRegisterController();

  return (
    <AuthLayout
      title="Join the Athenaeum"
      subtitle="Create your reading sanctuary"
      onBack={() => navigation.goBack()}
    >
      <Card padding="lg">
        <View style={{ gap: theme.spacing.md }}>
          {errors.general && (
            <Text variant="caption" color="danger">
              {errors.general}
            </Text>
          )}

          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
          />

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
            placeholder="Create a password"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            placeholder="Confirm your password"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password_confirmation}
          />

          <Button
            variant="primary"
            fullWidth
            onPress={handleRegister}
            loading={loading}
          >
            Create Account
          </Button>

          <View style={[styles.footer, { marginTop: theme.spacing.md }]}>
            <Button
              variant="ghost"
              onPress={() => navigation.navigate('Login')}
            >
              Already have an account? Sign in
            </Button>
          </View>
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
