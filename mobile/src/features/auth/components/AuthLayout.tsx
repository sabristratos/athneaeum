import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components';
import { useTheme } from '@/themes';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
}

export function AuthLayout({ title, subtitle, children, onBack }: AuthLayoutProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      edges={['top', 'bottom']}
    >
      {onBack && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
          }}
        >
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.surface,
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon icon={ArrowLeft01Icon} size={24} color={theme.colors.foreground} />
          </Pressable>
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <Text variant="h1" center>
              {title}
            </Text>
            {subtitle && (
              <Text variant="body" muted center style={{ marginTop: theme.spacing.xs }}>
                {subtitle}
              </Text>
            )}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
