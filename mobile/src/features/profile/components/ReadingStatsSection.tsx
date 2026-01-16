import React from 'react';
import { View, Pressable as RNPressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Analytics01Icon, ArrowRight01Icon, Book02Icon, File02Icon, Fire03Icon } from '@hugeicons/core-free-icons';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text, Card, Icon } from '@/components';
import { useTheme } from '@/themes';
import { useReadingStatsQuery } from '@/queries/useReadingStats';
import type { MainStackParamList } from '@/navigation/MainNavigator';

interface StatItemProps {
  icon: IconSvgElement;
  value: string | number;
  label: string;
  color?: string;
}

function StatItem({ icon, value, label, color }: StatItemProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.colors.foregroundMuted;

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Icon icon={icon} size={20} color={iconColor} />
      <Text
        variant="h3"
        style={{ marginTop: theme.spacing.xs }}
      >
        {value}
      </Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

export function ReadingStatsSection() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { data: stats, isLoading } = useReadingStatsQuery();

  const handlePress = () => {
    triggerHaptic('light');
    navigation.navigate('ReadingStats');
  };

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Text variant="h3" style={{ flex: 1 }}>
          Reading Stats
        </Text>
        <RNPressable onPress={handlePress}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="caption" style={{ color: theme.colors.primary }}>
              View All
            </Text>
            <Icon icon={ArrowRight01Icon} size={16} color={theme.colors.primary} />
          </View>
        </RNPressable>
      </View>

      <Card variant="elevated" padding="none">
        <RNPressable onPress={handlePress}>
          {isLoading ? (
            <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : !stats ? (
            <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
              <Icon icon={Analytics01Icon} size={32} color={theme.colors.foregroundMuted} />
              <Text variant="body" muted style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
                Start reading to see your stats
              </Text>
            </View>
          ) : (
            <View style={{ padding: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <StatItem
                  icon={Book02Icon}
                  value={stats.books_completed}
                  label="Books"
                  color={theme.colors.primary}
                />
                <StatItem
                  icon={File02Icon}
                  value={formatNumber(stats.total_pages_read)}
                  label="Pages"
                />
                <StatItem
                  icon={Fire03Icon}
                  value={stats.current_streak_days}
                  label="Day Streak"
                  color={stats.current_streak_days > 0 ? theme.colors.warning : undefined}
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: theme.spacing.md,
                  paddingTop: theme.spacing.md,
                  borderTopWidth: theme.borders.thin,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Text variant="caption" muted>
                  Tap to see detailed statistics
                </Text>
                <View style={{ marginLeft: 4 }}>
                  <Icon
                    icon={ArrowRight01Icon}
                    size={14}
                    color={theme.colors.foregroundMuted}
                  />
                </View>
              </View>
            </View>
          )}
        </RNPressable>
      </Card>
    </View>
  );
}
