import React, { memo, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';
import { EnhancedBookCard } from './EnhancedBookCard';
import type { DiscoverySection as DiscoverySectionType, CatalogBook } from '@/types/discovery';

const TypedFlashList = FlashList as any;

interface DiscoverySectionProps {
  section: DiscoverySectionType;
  onBookPress: (book: CatalogBook) => void;
  onBookLongPress?: (book: CatalogBook) => void;
  index?: number;
  onSeeAllPress?: () => void;
}

function DiscoverySectionComponent({
  section,
  onBookPress,
  onBookLongPress,
  index = 0,
  onSeeAllPress,
}: DiscoverySectionProps) {
  const { theme } = useTheme();

  const entranceProgress = useSharedValue(0);

  useEffect(() => {
    const delay = index * 50;
    entranceProgress.value = withDelay(delay, withSpring(1, SPRINGS.soft));
  }, [index]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entranceProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(entranceProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP) },
    ],
  }));

  const renderItem = useCallback(
    ({ item }: { item: CatalogBook }) => (
      <EnhancedBookCard
        book={item}
        onPress={() => onBookPress(item)}
        onLongPress={onBookLongPress ? () => onBookLongPress(item) : undefined}
      />
    ),
    [onBookPress, onBookLongPress]
  );

  const keyExtractor = useCallback((item: CatalogBook) => String(item.id), []);

  const ItemSeparator = useCallback(() => <View style={{ width: 12 }} />, []);

  if (section.data.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.section, containerAnimatedStyle]}>
      <View style={styles.header}>
        <Text
          variant="h3"
          style={{ color: theme.colors.foreground, flex: 1 }}
        >
          {section.title}
        </Text>
        {onSeeAllPress && (
          <Pressable onPress={onSeeAllPress}>
            <View style={styles.seeAllButton}>
              <Text variant="caption" style={{ color: theme.colors.primary }}>
                See all
              </Text>
              <Icon icon={ArrowRight01Icon} size={14} color={theme.colors.primary} />
            </View>
          </Pressable>
        )}
      </View>
      <View style={styles.listContainer}>
        <TypedFlashList
          data={section.data}
          horizontal
          showsHorizontalScrollIndicator={false}
          estimatedItemSize={152}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={ItemSeparator}
        />
      </View>
    </Animated.View>
  );
}

export const DiscoverySection = memo(DiscoverySectionComponent);

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listContainer: {
    height: 280,
  },
});
