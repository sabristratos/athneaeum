import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, Pressable as RNPressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { triggerHaptic } from '@/hooks/useHaptic';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text, Pressable, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS, TIMING } from '@/animations';
import { fetchAllFeeds, type RSSItem } from '@/api/rss';
import { ArrowDown01Icon, News01Icon } from '@hugeicons/core-free-icons';

export interface LiteraryFeedsProps {
  initiallyExpanded?: boolean;
}

export function LiteraryFeeds({ initiallyExpanded = false }: LiteraryFeedsProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [items, setItems] = useState<RSSItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const contentHeight = useSharedValue(0);
  const rotation = useSharedValue(initiallyExpanded ? 180 : 0);

  const loadFeeds = useCallback(async () => {
    setIsLoading(true);
    try {
      const feedItems = await fetchAllFeeds();
      setItems(feedItems);
      setLastUpdated(new Date());
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isExpanded && items.length === 0) {
      loadFeeds();
    }
  }, [isExpanded, items.length, loadFeeds]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
    rotation.value = withSpring(isExpanded ? 0 : 180, SPRINGS.snappy);
  }, [isExpanded, rotation]);

  const handleItemPress = useCallback(async (item: RSSItem) => {
    if (item.link) {
      try {
        await WebBrowser.openBrowserAsync(item.link, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
      } catch {
        Linking.openURL(item.link);
      }
    }
  }, []);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: withSpring(isExpanded ? 400 : 0, SPRINGS.gentle),
    opacity: withTiming(isExpanded ? 1 : 0, TIMING.normal),
  }));

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getSourceLabel = (source: 'lithub' | 'millions'): string => {
    return source === 'lithub' ? 'Literary Hub' : 'The Millions';
  };

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.lg;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <RNPressable
        onPress={() => {
          triggerHaptic('light');
          toggleExpanded();
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon
              icon={News01Icon}
              size={18}
              color={theme.colors.foregroundMuted}
            />
            <Text
              variant="label"
              style={{ color: theme.colors.foreground, marginLeft: 8 }}
            >
              Literary Feeds
            </Text>
          </View>

          <View style={styles.headerRight}>
            {lastUpdated && (
              <Text
                variant="caption"
                style={{ color: theme.colors.foregroundFaint, marginRight: 8 }}
              >
                {formatTimeAgo(lastUpdated)}
              </Text>
            )}
            <Animated.View style={arrowStyle}>
              <Icon
                icon={ArrowDown01Icon}
                size={16}
                color={theme.colors.foregroundMuted}
              />
            </Animated.View>
          </View>
        </View>
      </RNPressable>

      <Animated.View style={[styles.content, contentStyle]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
              Loading feeds...
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
              No articles available
            </Text>
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {items.map((item, index) => (
              <Pressable
                key={`${item.source}-${index}`}
                onPress={() => handleItemPress(item)}
                haptic="light"
                style={[
                  styles.item,
                  {
                    borderBottomWidth: index < items.length - 1 ? theme.borders.thin : 0,
                    borderBottomColor: theme.colors.borderMuted,
                  },
                ]}
              >
                <Text
                  variant="body"
                  numberOfLines={2}
                  style={{
                    color: theme.colors.foreground,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.foregroundFaint,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {getSourceLabel(item.source)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable
          onPress={loadFeeds}
          haptic="light"
          style={styles.refreshButton}
          disabled={isLoading}
        >
          <Text
            variant="caption"
            style={{
              color: theme.colors.primary,
              fontWeight: '500',
            }}
          >
            Refresh
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  itemsContainer: {
    paddingHorizontal: 12,
  },
  item: {
    paddingVertical: 12,
  },
  refreshButton: {
    alignItems: 'center',
    padding: 12,
  },
});

