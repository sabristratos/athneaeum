import React from 'react';
import { View, Pressable as RNPressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserEdit01Icon, LockPasswordIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text, Card, Icon } from '@/components';
import { useTheme } from '@/themes';
import type { MainStackParamList } from '@/navigation/MainNavigator';

interface AccountRowProps {
  icon: typeof UserEdit01Icon;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}

function AccountRow({ icon, title, subtitle, onPress, isLast }: AccountRowProps) {
  const { theme } = useTheme();

  return (
    <RNPressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: theme.spacing.md,
          borderBottomWidth: isLast ? 0 : theme.borders.thin,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View style={{ marginRight: 12 }}>
          <Icon icon={icon} size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text variant="body">{title}</Text>
          <Text variant="caption" muted>
            {subtitle}
          </Text>
        </View>
        <Icon
          icon={ArrowRight01Icon}
          size={18}
          color={theme.colors.foregroundMuted}
        />
      </View>
    </RNPressable>
  );
}

export function AccountSection() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        Account
      </Text>

      <Card variant="elevated" padding="none">
        <AccountRow
          icon={UserEdit01Icon}
          title="Edit Profile"
          subtitle="Update your name and email"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <AccountRow
          icon={LockPasswordIcon}
          title="Change Password"
          subtitle="Update your account password"
          onPress={() => navigation.navigate('ChangePassword')}
          isLast
        />
      </Card>
    </View>
  );
}
