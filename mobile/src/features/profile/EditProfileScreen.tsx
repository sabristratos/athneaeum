import React, { useState, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { Text, Input, Button, Icon, IconButton } from '@/components';
import { useTheme } from '@/themes';
import { useUser, useAuthActions } from '@/stores/authStore';
import { useToast } from '@/stores/toastStore';
import { authApi } from '@/api/auth';

interface FormErrors {
  name?: string;
  email?: string;
  general?: string;
}

export function EditProfileScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const user = useUser();
  const { setUser } = useAuthActions();
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const hasChanges = name !== user?.name || email !== user?.email;

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const updatedUser = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });
      setUser(updatedUser);
      toast.success('Profile updated');
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      if (message.toLowerCase().includes('email')) {
        setErrors({ email: message });
      } else {
        setErrors({ general: message });
        toast.danger(message);
      }
    } finally {
      setLoading(false);
    }
  }, [name, email, hasChanges, validateForm, setUser, toast, navigation]);

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
            Edit Profile
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
            label="Name"
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder="Your name"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={255}
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={255}
          />

          <View style={{ marginTop: theme.spacing.md }}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleSave}
              loading={loading}
              disabled={!hasChanges && !loading}
            >
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
