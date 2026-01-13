import React, { useState, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { Text, Input, Button, IconButton } from '@/components';
import { useTheme } from '@/themes';
import { useToast } from '@/stores/toastStore';
import { authApi } from '@/api/auth';

interface FormErrors {
  current_password?: string;
  password?: string;
  password_confirmation?: string;
  general?: string;
}

export function ChangePasswordScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!currentPassword) {
      newErrors.current_password = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.password = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.password_confirmation = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleChangePassword = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await authApi.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      toast.success('Password changed successfully');
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      if (message.toLowerCase().includes('current')) {
        setErrors({ current_password: message });
      } else {
        setErrors({ general: message });
        toast.danger(message);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, validateForm, toast, navigation]);

  const isFormValid = currentPassword && newPassword && confirmPassword;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderBottomWidth: theme.borders.thin,
            borderBottomColor: theme.colors.border,
          }}
        >
          <IconButton
            icon={ArrowLeft02Icon}
            variant="ghost"
            size="md"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
          <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            Change Password
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {errors.general && (
            <View
              style={{
                backgroundColor: theme.colors.dangerSubtle,
                padding: theme.spacing.md,
                borderRadius: theme.radii.md,
              }}
            >
              <Text variant="body" style={{ color: theme.colors.danger }}>
                {errors.general}
              </Text>
            </View>
          )}

          <Input
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            error={errors.current_password}
            placeholder="Enter your current password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            error={errors.password}
            placeholder="Enter new password"
            hint="Must be at least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.password_confirmation}
            placeholder="Confirm new password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={{ marginTop: theme.spacing.md }}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleChangePassword}
              loading={loading}
              disabled={!isFormValid || loading}
            >
              Change Password
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
