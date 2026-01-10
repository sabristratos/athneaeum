import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  type ListRenderItem,
  type ViewToken,
} from 'react-native';
import { Book02Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { QuoteCard } from '@/components/QuoteCard';
import { PaginationDots } from '@/components/PaginationDots';
import { useTheme } from '@/themes';
import type { Quote } from '@/types/quote';

interface MarginaliaSectionProps {
  quotes: Quote[];
  onAddQuote: () => void;
  onQuotePress: (quote: Quote) => void;
}

const CARD_WIDTH_PERCENT = 0.75;
const CARD_GAP = 24;

type CarouselItem = { type: 'quote'; data: Quote } | { type: 'add' };

export function MarginaliaSection({
  quotes,
  onAddQuote,
  onQuotePress,
}: MarginaliaSectionProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { width: screenWidth } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = screenWidth * CARD_WIDTH_PERCENT;
  const snapInterval = cardWidth + CARD_GAP;

  const carouselData = useMemo<CarouselItem[]>(() => {
    const items: CarouselItem[] = quotes.map((quote) => ({ type: 'quote', data: quote }));
    items.push({ type: 'add' });
    return items;
  }, [quotes]);

  const totalItems = carouselData.length;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
    }),
    []
  );

  const renderItem: ListRenderItem<CarouselItem> = useCallback(
    ({ item }) => {
      if (item.type === 'add') {
        return (
          <TouchableOpacity
            onPress={onAddQuote}
            activeOpacity={0.7}
            style={{ width: cardWidth }}
          >
            <View
              style={{
                flex: 1,
                minHeight: 120,
                borderRadius: isScholar ? theme.radii.lg : theme.radii.xl,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <View
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: isScholar ? theme.radii.md : theme.radii.full,
                  backgroundColor: theme.colors.tintPrimary,
                }}
              >
                <Icon icon={Add01Icon} size={20} color={theme.colors.primary} />
              </View>
              <Text
                variant="caption"
                style={{
                  fontWeight: '600',
                  color: theme.colors.primary,
                }}
              >
                Add Quote
              </Text>
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <View style={{ width: cardWidth }}>
          <QuoteCard
            quote={item.data}
            onPress={onQuotePress}
          />
        </View>
      );
    },
    [cardWidth, isScholar, theme, onAddQuote, onQuotePress]
  );

  const keyExtractor = useCallback(
    (item: CarouselItem, index: number) =>
      item.type === 'add' ? 'add-quote' : item.data.id.toString(),
    []
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: snapInterval,
      offset: snapInterval * index,
      index,
    }),
    [snapInterval]
  );

  const ItemSeparator = useCallback(() => <View style={{ width: CARD_GAP }} />, []);

  if (quotes.length === 0) {
    return (
      <View style={{ gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg }}>
        <Text
          variant="caption"
          style={{
            textTransform: 'uppercase',
            letterSpacing: theme.letterSpacing.wide,
            fontWeight: '700',
            color: theme.colors.foregroundMuted,
          }}
        >
          Marginalia
        </Text>

        <TouchableOpacity onPress={onAddQuote} activeOpacity={0.7}>
          <View
            style={{
              padding: theme.spacing.xl,
              borderRadius: isScholar ? theme.radii.lg : theme.radii.xl,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.canvas,
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              opacity: 0.8,
            }}
          >
            <View
              style={{
                padding: theme.spacing.md,
                borderRadius: isScholar ? theme.radii.md : theme.radii.full,
                backgroundColor: theme.colors.surface,
                borderWidth: theme.borders.thin,
                borderColor: theme.colors.border,
              }}
            >
              <Icon
                icon={Book02Icon}
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text
                variant="body"
                style={{
                  fontWeight: '700',
                  color: theme.colors.foreground,
                }}
              >
                No Quotes Yet
              </Text>
              <Text
                variant="caption"
                style={{
                  color: theme.colors.foregroundMuted,
                  marginTop: theme.spacing.xs,
                }}
              >
                Scan a page to capture text
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Text
          variant="caption"
          style={{
            textTransform: 'uppercase',
            letterSpacing: theme.letterSpacing.wide,
            fontWeight: '700',
            color: theme.colors.foregroundMuted,
          }}
        >
          Marginalia
        </Text>
        <Text
          variant="caption"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
        </Text>
      </View>

      <FlatList
        horizontal
        data={carouselData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingLeft: (screenWidth - cardWidth) / 2,
          paddingRight: (screenWidth - cardWidth) / 2,
        }}
        ItemSeparatorComponent={ItemSeparator}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
      />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PaginationDots count={totalItems} activeIndex={activeIndex} />
      </View>
    </View>
  );
}
