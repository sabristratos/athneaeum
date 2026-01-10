import React from 'react';
import { View, ScrollView } from 'react-native';
import { Chip } from '@/components/Chip';
import { useTheme } from '@/themes';

type ChipVariant = 'default' | 'primary' | 'success' | 'danger' | 'muted';

interface ChipItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: ChipVariant;
}

interface ChipGroupProps {
  items: ChipItem[];
  selected: string | string[];
  onSelect: (key: string) => void;
  multiSelect?: boolean;
  scrollable?: boolean;
  size?: 'sm' | 'md';
}

export function ChipGroup({
  items,
  selected,
  onSelect,
  multiSelect = false,
  scrollable = false,
  size = 'md',
}: ChipGroupProps) {
  const { theme } = useTheme();

  const isSelected = (key: string) => {
    if (Array.isArray(selected)) {
      return selected.includes(key);
    }
    return selected === key;
  };

  const chips = items.map((item) => (
    <Chip
      key={item.key}
      label={item.label}
      icon={item.icon}
      selected={isSelected(item.key)}
      onPress={() => onSelect(item.key)}
      variant={item.variant}
      size={size}
    />
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.sm,
          paddingRight: theme.spacing.md,
        }}
      >
        {chips}
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
      }}
    >
      {chips}
    </View>
  );
}
