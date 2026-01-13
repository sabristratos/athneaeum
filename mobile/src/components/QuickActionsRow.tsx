import React from 'react';
import { View } from 'react-native';
import { PencilEdit01Icon, Share01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { QuickActionButton } from '@/components/molecules';
import { useTheme } from '@/themes';

interface QuickActionsRowProps {
  onLogPress: () => void;
  onSharePress: () => void;
  onDnfPress: () => void;
  showDnf?: boolean;
}

export function QuickActionsRow({
  onLogPress,
  onSharePress,
  onDnfPress,
  showDnf = true,
}: QuickActionsRowProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: theme.spacing.xl,
        marginTop: theme.spacing.lg,
      }}
    >
      <QuickActionButton
        icon={PencilEdit01Icon}
        label="Log"
        onPress={onLogPress}
      />
      <QuickActionButton
        icon={Share01Icon}
        label="Share"
        onPress={onSharePress}
      />
      {showDnf && (
        <QuickActionButton
          icon={Cancel01Icon}
          label="DNF"
          onPress={onDnfPress}
          variant="danger"
        />
      )}
    </View>
  );
}
