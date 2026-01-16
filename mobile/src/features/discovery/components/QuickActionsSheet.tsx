import React, { memo, useCallback, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { Pressable as RNPressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Add01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  Share01Icon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Text, Icon, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { SPRINGS, TIMING } from '@/animations/constants';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { CatalogBook } from '@/types/discovery';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 320;

interface QuickAction {
  id: string;
  label: string;
  icon: IconSvgElement;
  color?: 'primary' | 'danger' | 'default';
}

const ACTIONS: QuickAction[] = [
  { id: 'add', label: 'Add to Library', icon: Add01Icon, color: 'primary' },
  { id: 'save', label: 'Save for Later', icon: Bookmark02Icon },
  { id: 'dismiss', label: 'Not Interested', icon: Delete01Icon },
  { id: 'share', label: 'Share', icon: Share01Icon },
];

interface ActionButtonProps {
  action: QuickAction;
  onPress: () => void;
}

function ActionButton({ action, onPress }: ActionButtonProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const handlePress = useCallback(() => {
    triggerHaptic('light');
    onPress();
  }, [onPress]);

  const iconColor =
    action.color === 'primary'
      ? theme.colors.primary
      : action.color === 'danger'
      ? theme.colors.danger
      : theme.colors.foreground;

  const backgroundColor =
    action.color === 'primary'
      ? theme.colors.tintPrimary
      : theme.colors.surface;

  return (
    <Pressable onPress={handlePress}>
      <View
        style={[
          styles.actionButton,
          {
            backgroundColor,
            borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.actionIconContainer,
            {
              backgroundColor: action.color === 'primary'
                ? theme.colors.primary
                : theme.colors.surfaceAlt,
              borderRadius: isScholar ? theme.radii.xs : theme.radii.full,
            },
          ]}
        >
          <Icon
            icon={action.icon}
            size={20}
            color={action.color === 'primary' ? theme.colors.onPrimary : iconColor}
          />
        </View>
        <Text
          variant="body"
          style={{
            color: action.color === 'primary' ? theme.colors.primary : theme.colors.foreground,
            fontWeight: action.color === 'primary' ? '600' : '400',
          }}
        >
          {action.label}
        </Text>
      </View>
    </Pressable>
  );
}

interface QuickActionsSheetProps {
  book: CatalogBook | null;
  visible: boolean;
  onClose: () => void;
  onAddToLibrary: (book: CatalogBook) => void;
  onSaveForLater: (book: CatalogBook) => void;
  onDismiss: (book: CatalogBook) => void;
  onShare: (book: CatalogBook) => void;
}

function QuickActionsSheetComponent({
  book,
  visible,
  onClose,
  onAddToLibrary,
  onSaveForLater,
  onDismiss,
  onShare,
}: QuickActionsSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, TIMING.normal);
      translateY.value = withSpring(0, SPRINGS.modal);
    } else {
      backdropOpacity.value = withTiming(0, TIMING.fast);
      translateY.value = withSpring(SHEET_HEIGHT, SPRINGS.soft);
    }
  }, [visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleAction = useCallback(
    (actionId: string) => {
      if (!book) return;

      switch (actionId) {
        case 'add':
          onAddToLibrary(book);
          break;
        case 'save':
          onSaveForLater(book);
          break;
        case 'dismiss':
          onDismiss(book);
          break;
        case 'share':
          onShare(book);
          break;
      }
      onClose();
    },
    [book, onAddToLibrary, onSaveForLater, onDismiss, onShare, onClose]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > SHEET_HEIGHT / 3 || e.velocityY > 500) {
        translateY.value = withSpring(SHEET_HEIGHT, SPRINGS.soft);
        backdropOpacity.value = withTiming(0, TIMING.fast);
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRINGS.modal);
      }
    });

  const handleBackdropPress = useCallback(() => {
    triggerHaptic('light');
    onClose();
  }, [onClose]);

  if (!book) return null;

  const borderRadius = isScholar ? theme.radii.md : theme.radii.xl;

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <RNPressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
            },
            sheetAnimatedStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

          <View style={styles.bookPreview}>
            {book.cover_url && (
              <Image
                source={{ uri: book.cover_url }}
                style={[
                  styles.previewCover,
                  { borderRadius: isScholar ? theme.radii.xs : theme.radii.sm },
                ]}
                resizeMode="cover"
              />
            )}
            <View style={styles.previewInfo}>
              <Text variant="body" numberOfLines={2} style={{ fontWeight: '600' }}>
                {book.title}
              </Text>
              {book.author && (
                <Text variant="caption" muted numberOfLines={1}>
                  {book.author}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            {ACTIONS.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                onPress={() => handleAction(action.id)}
              />
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const QuickActionsSheet = memo(QuickActionsSheetComponent);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  bookPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  previewCover: {
    width: 48,
    height: 72,
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
    gap: 4,
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
