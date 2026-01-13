import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { SPRINGS } from '@/animations/constants';
import { LinearGradient } from 'expo-linear-gradient';
import { triggerHaptic } from '@/hooks/useHaptic';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MoreHorizontalIcon,
  Camera01Icon,
  Tick01Icon,
  Cancel01Icon,
  Time04Icon,
  Edit02Icon,
  PencilEdit02Icon,
  Add01Icon,
  Calendar03Icon,
  Book01Icon,
  Tag01Icon,
  Layers01Icon,
  Delete02Icon,
  Tick02Icon,
  Share01Icon,
  Money01Icon,
  BookOpen01Icon,
  RepeatIcon,
} from '@hugeicons/core-free-icons';
import {
  Text,
  Card,
  Badge,
  Button,
  IconButton,
  CoverImage,
  Chip,
  BottomSheet,
  ConfirmModal,
  QuickLogSheet,
  EditSessionModal,
  DNFModal,
  QuoteCaptureModal,
  QuoteCard,
  SessionCard,
  ReadThroughCard,
  RatingInput,
  Icon,
  Pressable,
  SegmentedControl,
  InlineProgressWidget,
  TagPicker,
  TagList,
  Input,
  SeriesAssignModal,
  ClassificationBadges,
} from '@/components';
import { AuthorDetailSheet } from '@/features/authors/components';
import { StatusSelector } from '@/features/library/components';
import type { BookFormat } from '@/types';
import { useTheme } from '@/themes';
import { useBookDetailController } from '@/features/library/hooks';
import { useCoverColor } from '@/hooks';
import { useIsTransitioning } from '@/stores/sharedElementStore';
import {
  usePreferences,
  usePreferencesActions,
  CURRENCY_OPTIONS,
  getCurrencySymbol,
  type Currency,
} from '@/stores/preferencesStore';
import { hexToRgb } from '@/utils/colorUtils';
import { formatLongDate, formatTimeAgo } from '@/utils/dateUtils';
import type { Quote, ReadingSession, ReadThrough, Book, Genre, Audience, Intensity, Mood } from '@/types';
import type { Tag } from '@/types/tag';

type TabKey = 'session' | 'info';

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: 'session', label: 'Session' },
  { key: 'info', label: 'Info' },
];

interface SessionTabProps {
  currentPage: number;
  totalPages: number;
  pagesReadToday: number;
  quotes: Quote[];
  sessions: ReadingSession[];
  onQuickSave: (newPage: number) => Promise<void>;
  onScanText: () => void;
  onAddQuote: () => void;
  onQuotePress: (quote: Quote) => void;
  onSessionPress: (session: ReadingSession) => void;
  lastSessionDate: Date | null;
  lastQuoteDate: Date | null;
}


const SessionTab = memo(function SessionTab({
  currentPage,
  totalPages,
  pagesReadToday,
  quotes,
  sessions,
  onQuickSave,
  onScanText,
  onAddQuote,
  onQuotePress,
  onSessionPress,
  lastSessionDate,
  lastQuoteDate,
}: SessionTabProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const lastSessionText = lastSessionDate
    ? `Last session ${formatTimeAgo(lastSessionDate)}`
    : isScholar
      ? 'No sessions yet'
      : 'Start your first session';

  const lastQuoteText = lastQuoteDate
    ? `Added ${formatTimeAgo(lastQuoteDate)}`
    : isScholar
      ? 'No marginalia yet'
      : 'Save your first quote';

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Inline Progress Widget */}
      {totalPages > 0 && (
        <InlineProgressWidget
          currentPage={currentPage}
          totalPages={totalPages}
          onSave={onQuickSave}
          pagesReadToday={pagesReadToday}
        />
      )}

      {/* Quick Actions - Full Width Cards */}
      <View style={{ gap: theme.spacing.sm }}>
        <Pressable
          onPress={onScanText}
          haptic="light"
          activeScale={0.98}
          accessibilityRole="button"
          accessibilityLabel="Scan text for quote capture"
          accessibilityHint="Opens camera to scan text from book pages"
        >
          <Card variant="outlined" padding="md">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                  backgroundColor: theme.colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  icon={Camera01Icon}
                  size={24}
                  color={theme.colors.foregroundMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  variant="body"
                  style={{
                    color: theme.colors.foreground,
                    fontWeight: '600',
                    marginBottom: 2,
                  }}
                >
                  {isScholar ? 'Scan Text' : 'Capture Quote'}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {isScholar ? 'Use camera to capture text' : 'Snap a photo of text'}
                </Text>
              </View>
              <Icon
                icon={ArrowRight01Icon}
                size={20}
                color={theme.colors.foregroundMuted}
                strokeWidth={1.5}
              />
            </View>
          </Card>
        </Pressable>

        <Pressable
          onPress={onAddQuote}
          haptic="light"
          activeScale={0.98}
          accessibilityRole="button"
          accessibilityLabel="Add marginalia or quote"
          accessibilityHint="Opens editor to write a quote or note"
        >
          <Card
            variant="outlined"
            padding="md"
            style={{
              borderColor: theme.colors.primary,
              borderWidth: 1.5,
              backgroundColor: theme.colors.tintPrimary,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                  backgroundColor: theme.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...theme.shadows.sm,
                }}
              >
                <Icon icon={Edit02Icon} size={24} color={theme.colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  variant="body"
                  style={{
                    color: theme.colors.foreground,
                    fontWeight: '600',
                    marginBottom: 2,
                  }}
                >
                  {isScholar ? 'Add Marginalia' : 'Add Quote'}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {lastQuoteText}
                </Text>
              </View>
              <Icon
                icon={ArrowRight01Icon}
                size={20}
                color={theme.colors.foregroundMuted}
                strokeWidth={1.5}
              />
            </View>
          </Card>
        </Pressable>
      </View>

      {/* Sessions Section - show even if empty with placeholder */}
      <View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
          }}
        >
          <Text
            variant="label"
            style={{
              color: theme.colors.foreground,
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: 1,
            }}
          >
            {isScholar ? 'Reading History' : 'Recent Sessions'}
          </Text>
          {sessions.length > 0 && (
            <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
              {lastSessionText}
            </Text>
          )}
        </View>
        {sessions.length > 0 ? (
          <View style={{ gap: theme.spacing.sm }}>
            {sessions.slice(0, 5).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={onSessionPress}
              />
            ))}
          </View>
        ) : (
          <Card variant="outlined" padding="lg">
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
              <View style={{ marginBottom: theme.spacing.sm, opacity: 0.5 }}>
                <Icon
                  icon={Time04Icon}
                  size={32}
                  color={theme.colors.foregroundMuted}
                />
              </View>
              <Text
                variant="body"
                style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
              >
                {isScholar
                  ? 'No reading sessions recorded yet'
                  : 'Start reading to track your sessions'}
              </Text>
              <Text
                variant="caption"
                style={{
                  color: theme.colors.foregroundMuted,
                  textAlign: 'center',
                  marginTop: theme.spacing.xs,
                  opacity: 0.7,
                }}
              >
                {isScholar
                  ? 'Use the button above to log your progress'
                  : 'Tap "Log Progress" above to begin'}
              </Text>
            </View>
          </Card>
        )}
      </View>

      {/* Quotes Section */}
      {quotes.length > 0 && (
        <View>
          <Text
            variant="label"
            style={{
              color: theme.colors.foreground,
              marginBottom: theme.spacing.md,
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: 1,
            }}
          >
            {isScholar ? 'Marginalia' : 'Saved Quotes'}
          </Text>
          <View style={{ gap: theme.spacing.sm }}>
            {quotes.slice(0, 3).map((quote) => (
              <QuoteCard key={quote.id} quote={quote} onPress={onQuotePress} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

interface MetaRowProps {
  icon: React.ComponentProps<typeof Icon>['icon'];
  label: string;
  value: string | null | undefined;
}

const MetaRow = memo(function MetaRow({ icon, label, value }: MetaRowProps) {
  const { theme } = useTheme();

  if (!value) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: theme.borders.thin,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ marginRight: theme.spacing.sm }}>
        <Icon icon={icon} size={16} color={theme.colors.foregroundMuted} />
      </View>
      <Text
        variant="caption"
        style={{
          color: theme.colors.foregroundMuted,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Text
        variant="body"
        style={{
          color: theme.colors.foreground,
          flex: 2,
          textAlign: 'right',
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
});

interface NextInSeriesInfo {
  book: Book;
  volumeNumber: number;
  seriesTitle: string;
}

interface InfoTabProps {
  genres: Genre[] | null;
  description: string | null;
  publishedDate: string | null;
  isbn: string | null;
  pageCount: number | null;
  author: string;
  bookTags: Tag[];
  format: string | null;
  price: number | null;
  currencySymbol: string;
  review: string | null;
  readThroughs: ReadThrough[];
  readCount: number;
  canStartReread: boolean;
  seriesTitle: string | null;
  volumeNumber: number | null;
  totalVolumes: number | null;
  nextInSeries: NextInSeriesInfo | null;
  audience: Audience | null;
  audienceLabel: string | null;
  intensity: Intensity | null;
  intensityLabel: string | null;
  moods: Mood[] | null;
  isClassified: boolean;
  isAnalyzing: boolean;
  classificationConfidence: number | null;
  onAddTag: () => void;
  onEditBookDetails: () => void;
  onEditReview: () => void;
  onStartReread: () => void;
  onReadThroughRatingChange: (readThroughId: number, rating: number) => void;
  onNextInSeriesPress: () => void;
  onEditSeries: () => void;
  onAuthorPress: () => void;
  onGenrePress: (genre: Genre) => void;
  onAnalyzeContent: () => void;
}

const InfoTab = memo(function InfoTab({
  genres,
  description,
  publishedDate,
  isbn,
  pageCount,
  author,
  bookTags,
  format,
  price,
  currencySymbol,
  review,
  readThroughs,
  readCount,
  canStartReread,
  seriesTitle,
  volumeNumber,
  totalVolumes,
  nextInSeries,
  audience,
  audienceLabel,
  intensity,
  intensityLabel,
  moods,
  isClassified,
  isAnalyzing,
  classificationConfidence,
  onAddTag,
  onEditBookDetails,
  onEditReview,
  onStartReread,
  onReadThroughRatingChange,
  onNextInSeriesPress,
  onEditSeries,
  onAuthorPress,
  onGenrePress,
  onAnalyzeContent,
}: InfoTabProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);

  const allGenres = genres ?? [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return formatLongDate(dateString);
    } catch {
      return dateString;
    }
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Tags Section */}
      <View key="tags-section">
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          <Text variant="label" style={{ color: theme.colors.foreground }}>
            {isScholar ? 'Classifications' : 'Tags'}
          </Text>
          <IconButton
            icon={Add01Icon}
            size="sm"
            variant="ghost"
            color={theme.colors.primary}
            onPress={onAddTag}
            accessibilityLabel="Add tag"
          />
        </View>
        {bookTags.length > 0 ? (
          <TagList tags={bookTags} onTagPress={() => onAddTag()} />
        ) : (
          <Pressable onPress={onAddTag} haptic="light">
            <Card variant="outlined" padding="md">
              <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xs }}>
                <Text
                  variant="body"
                  style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
                >
                  {isScholar ? 'No classifications yet' : 'No tags yet'}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primary, marginTop: theme.spacing.xxs }}
                >
                  Tap to add
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      </View>

      {/* Series Section */}
      <View key="series-section">
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          <Text variant="label" style={{ color: theme.colors.foreground }}>
            {isScholar ? 'Series Collection' : 'Series'}
          </Text>
          {seriesTitle && (
            <IconButton
              icon={PencilEdit02Icon}
              size="sm"
              variant="ghost"
              color={theme.colors.primary}
              onPress={onEditSeries}
              accessibilityLabel="Edit series"
            />
          )}
        </View>
        {seriesTitle ? (
          <Pressable onPress={onEditSeries} haptic="light">
            <Card variant="outlined" padding="md">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radii.sm,
                    backgroundColor: theme.colors.primarySubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon icon={Layers01Icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ color: theme.colors.foreground, fontWeight: '600' }}>
                    {seriesTitle}
                  </Text>
                  {volumeNumber && (
                    <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
                      {isScholar ? 'Volume' : 'Book'} {volumeNumber}
                      {totalVolumes ? ` of ${totalVolumes}` : ''}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </Pressable>
        ) : (
          <Pressable onPress={onEditSeries} haptic="light">
            <Card variant="outlined" padding="md">
              <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xs }}>
                <Text
                  variant="body"
                  style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
                >
                  {isScholar ? 'Not part of a series' : 'No series assigned'}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primary, marginTop: theme.spacing.xxs }}
                >
                  Tap to add
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      </View>

      {/* Next in Series Section */}
      {nextInSeries && (
        <Pressable key="next-in-series-section" onPress={onNextInSeriesPress} haptic="light" activeScale={0.98}>
          <Card
            variant="outlined"
            padding="md"
            style={{
              borderColor: theme.colors.primary,
              borderWidth: 1.5,
              backgroundColor: theme.colors.tintPrimary,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <CoverImage
                uri={nextInSeries.book.cover_url}
                size="sm"
                fallbackText={nextInSeries.book.title}
              />
              <View style={{ flex: 1 }}>
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.primary,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: theme.spacing.xxs,
                  }}
                >
                  {isScholar ? 'Continue the Collection' : 'Up Next'}
                </Text>
                <Text
                  variant="body"
                  style={{ color: theme.colors.foreground, fontWeight: '600' }}
                  numberOfLines={2}
                >
                  {nextInSeries.book.title}
                </Text>
                <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
                  {nextInSeries.seriesTitle} #{nextInSeries.volumeNumber}
                </Text>
              </View>
              <Icon
                icon={ArrowRight01Icon}
                size={20}
                color={theme.colors.primary}
                strokeWidth={2}
              />
            </View>
          </Card>
        </Pressable>
      )}

      {/* Genres Section */}
      {allGenres.length > 0 && (
        <View key="genres-section">
          <Text
            variant="label"
            style={{ color: theme.colors.foreground, marginBottom: theme.spacing.sm }}
          >
            {isScholar ? 'Subject Matter' : 'Genres'}
          </Text>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}
          >
            {allGenres.map((genre) => (
              <Pressable
                key={`genre-${genre.id}`}
                onPress={() => onGenrePress(genre)}
                haptic="light"
              >
                <Chip
                  label={genre.name}
                  variant="muted"
                  size="sm"
                  icon={
                    <Icon
                      icon={Layers01Icon}
                      size={12}
                      color={theme.colors.foregroundMuted}
                    />
                  }
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Content Classification Section */}
      {(isClassified || isAnalyzing || description) && (
        <View key="classification-section">
          <Text
            variant="label"
            style={{
              color: theme.colors.foreground,
              marginBottom: theme.spacing.sm,
            }}
          >
            {isScholar ? 'Content Classification' : 'Content'}
          </Text>
          <ClassificationBadges
            audience={audience}
            audienceLabel={audienceLabel}
            intensity={intensity}
            intensityLabel={intensityLabel}
            moods={moods}
            isClassified={isClassified}
            isAnalyzing={isAnalyzing}
            confidence={classificationConfidence}
            onAnalyzePress={description ? onAnalyzeContent : undefined}
          />
        </View>
      )}

      {/* Synopsis Section */}
      {description && (
        <View key="synopsis-section">
          <Text
            variant="label"
            style={{
              color: theme.colors.foreground,
              marginBottom: theme.spacing.sm,
            }}
          >
            {isScholar ? 'Synopsis' : 'About'}
          </Text>
          <Text
            variant="body"
            numberOfLines={isDescExpanded ? undefined : 4}
            style={{
              color: theme.colors.foregroundMuted,
              lineHeight: 22,
            }}
          >
            {description}
          </Text>
          {description.length > 200 && (
            <Pressable
              onPress={() => setIsDescExpanded(!isDescExpanded)}
              haptic="light"
              style={{ marginTop: theme.spacing.xs }}
            >
              <Text variant="caption" style={{ color: theme.colors.primary }}>
                {isDescExpanded
                  ? 'Show Less'
                  : isScholar
                    ? 'Read Full Synopsis'
                    : 'Read More'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* My Copy Section */}
      <View key="my-copy-section">
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          <Text variant="label" style={{ color: theme.colors.foreground }}>
            {isScholar ? 'My Edition' : 'My Copy'}
          </Text>
          <IconButton
            icon={PencilEdit02Icon}
            size="sm"
            variant="ghost"
            color={theme.colors.primary}
            onPress={onEditBookDetails}
            accessibilityLabel="Edit book details"
          />
        </View>
        <Card variant="outlined" padding="none">
          <MetaRow
            icon={BookOpen01Icon}
            label="Format"
            value={format ? format.charAt(0).toUpperCase() + format.slice(1) : 'Not set'}
          />
          <MetaRow
            icon={Money01Icon}
            label="Price"
            value={price !== null ? `${currencySymbol}${price.toFixed(2)}` : 'Not set'}
          />
        </Card>
      </View>

      {/* My Review Section */}
      <View key="my-review-section">
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          <Text variant="label" style={{ color: theme.colors.foreground }}>
            {isScholar ? 'My Reflections' : 'My Review'}
          </Text>
          <IconButton
            icon={PencilEdit02Icon}
            size="sm"
            variant="ghost"
            color={theme.colors.primary}
            onPress={onEditReview}
            accessibilityLabel="Edit review"
          />
        </View>
        {review ? (
          <View>
            <Text
              variant="body"
              numberOfLines={isReviewExpanded ? undefined : 4}
              style={{
                color: theme.colors.foregroundMuted,
                lineHeight: 22,
              }}
            >
              {review}
            </Text>
            {review.length > 200 && (
              <Pressable
                onPress={() => setIsReviewExpanded(!isReviewExpanded)}
                haptic="light"
                style={{ marginTop: theme.spacing.xs }}
              >
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  {isReviewExpanded ? 'Show Less' : 'Read More'}
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable onPress={onEditReview} haptic="light">
            <Card variant="outlined" padding="md">
              <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xs }}>
                <Text
                  variant="body"
                  style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
                >
                  {isScholar ? 'No reflections recorded' : 'No review yet'}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primary, marginTop: theme.spacing.xxs }}
                >
                  Tap to add
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      </View>

      {/* Reading History Section */}
      {(readThroughs.length > 0 || canStartReread) && (
        <View key="reading-history-section">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <Text variant="label" style={{ color: theme.colors.foreground }}>
              {isScholar ? 'Reading History' : `Read ${readCount > 0 ? readCount : 0} time${readCount !== 1 ? 's' : ''}`}
            </Text>
            {canStartReread && (
              <Pressable
                onPress={onStartReread}
                haptic="light"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <Icon icon={RepeatIcon} size={16} color={theme.colors.primary} />
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  {isScholar ? 'Begin Re-read' : 'Start Re-read'}
                </Text>
              </Pressable>
            )}
          </View>
          {readThroughs.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              {readThroughs.map((readThrough, index) => (
                <ReadThroughCard
                  key={readThrough.id}
                  readThrough={readThrough}
                  isCurrentRead={index === readThroughs.length - 1 && readThrough.status === 'reading'}
                  onRatingChange={
                    readThrough.status === 'read'
                      ? (rating) => onReadThroughRatingChange(readThrough.id, rating)
                      : undefined
                  }
                />
              ))}
            </View>
          ) : (
            <Card variant="outlined" padding="md">
              <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xs }}>
                <Text
                  variant="body"
                  style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
                >
                  {isScholar ? 'No recorded readings' : 'No reading history yet'}
                </Text>
              </View>
            </Card>
          )}
        </View>
      )}

      {/* Metadata Section */}
      <View key="metadata-section">
        <Text
          variant="label"
          style={{
            color: theme.colors.foreground,
            marginBottom: theme.spacing.sm,
          }}
        >
          {isScholar ? 'Bibliographic Details' : 'Details'}
        </Text>
        <Card variant="outlined" padding="none">
          <Pressable onPress={onAuthorPress} haptic="light">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                borderBottomWidth: theme.borders.thin,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{ marginRight: theme.spacing.sm }}>
                <Icon icon={PencilEdit02Icon} size={16} color={theme.colors.foregroundMuted} />
              </View>
              <Text
                variant="caption"
                style={{
                  color: theme.colors.foregroundMuted,
                  flex: 1,
                }}
              >
                Author
              </Text>
              <Text
                variant="body"
                style={{
                  color: theme.colors.primary,
                  flex: 2,
                  textAlign: 'right',
                }}
                numberOfLines={1}
              >
                {author}
              </Text>
              <View style={{ marginLeft: theme.spacing.xs }}>
                <Icon icon={ArrowRight01Icon} size={14} color={theme.colors.foregroundMuted} />
              </View>
            </View>
          </Pressable>
          <MetaRow
            icon={Calendar03Icon}
            label="Published"
            value={formatDate(publishedDate)}
          />
          <MetaRow icon={Book01Icon} label="Pages" value={pageCount?.toString()} />
          <MetaRow icon={Tag01Icon} label="ISBN" value={isbn} />
        </Card>
      </View>
    </View>
  );
});

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onShare: () => void;
  onRemove: () => void;
  currentStatus: string;
  statusOptions: { key: string; label: string }[];
}

const MenuSheet = memo(function MenuSheet({
  visible,
  onClose,
  onStatusChange,
  onShare,
  onRemove,
  currentStatus,
  statusOptions,
}: MenuSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Actions">
      <View style={{ gap: theme.spacing.md }}>
        {/* Status Section */}
        <View>
          <Text
            variant="label"
            style={{
              color: theme.colors.foregroundMuted,
              marginBottom: theme.spacing.sm,
            }}
          >
            Reading Status
          </Text>
          <View style={{ gap: theme.spacing.xxs }}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => {
                  onStatusChange(option.key);
                  onClose();
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: theme.spacing.md,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.xl,
                  backgroundColor:
                    currentStatus === option.key ? theme.colors.surfaceAlt : 'transparent',
                }}
              >
                <Text
                  variant="body"
                  style={{
                    color:
                      currentStatus === option.key
                        ? theme.colors.primary
                        : theme.colors.foreground,
                  }}
                >
                  {option.label}
                </Text>
                {currentStatus === option.key && (
                  <Icon icon={Tick02Icon} size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: theme.colors.border }} />

        {/* Other Actions */}
        <View style={{ gap: theme.spacing.xxs }}>
          <TouchableOpacity
            onPress={() => {
              onClose();
              onShare();
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
            }}
          >
            <Icon icon={Share01Icon} size={20} color={theme.colors.foreground} />
            <Text variant="body" style={{ color: theme.colors.foreground }}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              onClose();
              onRemove();
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
            }}
          >
            <Icon icon={Delete02Icon} size={20} color={theme.colors.danger} />
            <Text variant="body" style={{ color: theme.colors.danger }}>
              Remove from Library
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
});

const FORMAT_OPTIONS: { key: BookFormat; label: string }[] = [
  { key: 'physical', label: 'Physical' },
  { key: 'ebook', label: 'E-book' },
  { key: 'audiobook', label: 'Audiobook' },
];

interface EditBookDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (format: BookFormat | null, price: number | null) => void;
  currentFormat: BookFormat | null;
  currentPrice: number | null;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
}

const EditBookDetailsSheet = memo(function EditBookDetailsSheet({
  visible,
  onClose,
  onSave,
  currentFormat,
  currentPrice,
  currency,
  onCurrencyChange,
}: EditBookDetailsSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const [format, setFormat] = useState<BookFormat | null>(currentFormat);
  const [priceText, setPriceText] = useState(currentPrice?.toString() ?? '');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (visible) {
      setFormat(currentFormat);
      setPriceText(currentPrice?.toString() ?? '');
    }
  }, [visible, currentFormat, currentPrice]);

  const handleSave = () => {
    const price = priceText ? parseFloat(priceText) : null;
    onSave(format, isNaN(price as number) ? null : price);
    onClose();
  };

  if (showCurrencyPicker) {
    return (
      <BottomSheet
        visible={visible}
        onClose={() => setShowCurrencyPicker(false)}
        title="Select Currency"
      >
        <View style={{ gap: theme.spacing.xxs }}>
          {CURRENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.code}
              onPress={() => {
                onCurrencyChange(option.code);
                setShowCurrencyPicker(false);
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: theme.spacing.md,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.xl,
                backgroundColor:
                  currency === option.code ? theme.colors.surfaceAlt : 'transparent',
              }}
            >
              <Text
                variant="body"
                style={{
                  color:
                    currency === option.code
                      ? theme.colors.primary
                      : theme.colors.foreground,
                }}
              >
                {option.label}
              </Text>
              {currency === option.code && (
                <Icon icon={Tick02Icon} size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isScholar ? 'Edition Details' : 'My Copy'}
    >
      <View style={{ gap: theme.spacing.lg }}>
        {/* Format Selection */}
        <View>
          <Text
            variant="label"
            style={{
              color: theme.colors.foregroundMuted,
              marginBottom: theme.spacing.sm,
            }}
          >
            Format
          </Text>
          <View style={{ gap: theme.spacing.xxs }}>
            {FORMAT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => setFormat(option.key)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: theme.spacing.md,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.xl,
                  backgroundColor:
                    format === option.key ? theme.colors.surfaceAlt : 'transparent',
                }}
              >
                <Text
                  variant="body"
                  style={{
                    color:
                      format === option.key
                        ? theme.colors.primary
                        : theme.colors.foreground,
                  }}
                >
                  {option.label}
                </Text>
                {format === option.key && (
                  <Icon icon={Tick02Icon} size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Input */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              Price Paid
            </Text>
            <TouchableOpacity onPress={() => setShowCurrencyPicker(true)}>
              <Text variant="caption" style={{ color: theme.colors.primary }}>
                {currency} ({currencySymbol})
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="body" style={{ color: theme.colors.foregroundMuted }}>
              {currencySymbol}
            </Text>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="0.00"
                value={priceText}
                onChangeText={setPriceText}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Text
            variant="caption"
            style={{
              color: theme.colors.foregroundMuted,
              marginTop: theme.spacing.xs,
            }}
          >
            {isScholar
              ? 'Track acquisition cost for your collection'
              : 'Used for Page Economy stats'}
          </Text>
        </View>

        {/* Save Button */}
        <Button variant="primary" onPress={handleSave}>
          Save
        </Button>
      </View>
    </BottomSheet>
  );
});

interface ReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (review: string | null) => void;
  currentReview: string | null;
}

const ReviewSheet = memo(function ReviewSheet({
  visible,
  onClose,
  onSave,
  currentReview,
}: ReviewSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const [reviewText, setReviewText] = useState(currentReview ?? '');

  useEffect(() => {
    if (visible) {
      setReviewText(currentReview ?? '');
    }
  }, [visible, currentReview]);

  const handleSave = () => {
    onSave(reviewText.trim() || null);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isScholar ? 'My Reflections' : 'My Review'}
    >
      <View style={{ gap: theme.spacing.lg }}>
        <View>
          <Text
            variant="label"
            style={{
              color: theme.colors.foregroundMuted,
              marginBottom: theme.spacing.sm,
            }}
          >
            {isScholar ? 'Your thoughts on this work' : 'What did you think?'}
          </Text>
          <Input
            placeholder={
              isScholar
                ? 'Record your reflections, notes, and observations...'
                : 'Write your review...'
            }
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={8}
          />
        </View>

        <Button variant="primary" onPress={handleSave}>
          Save
        </Button>
      </View>
    </BottomSheet>
  );
});

const SWIPE_THRESHOLD = 50;

export const BookDetailScreen = memo(function BookDetailScreen() {
  const { theme, themeName } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isScholar = themeName === 'scholar';
  const isDreamer = themeName === 'dreamer';
  const isTransitioning = useIsTransitioning();
  const preferences = usePreferences();
  const { setPreference } = usePreferencesActions();
  const currencySymbol = getCurrencySymbol(preferences.currency);

  const [activeTab, setActiveTab] = useState<TabKey>('session');
  const translateX = useSharedValue(0);

  const switchToTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    triggerHaptic('light');
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const clampedX = Math.max(-screenWidth * 0.3, Math.min(screenWidth * 0.3, event.translationX));
      translateX.value = clampedX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && activeTab === 'session') {
        runOnJS(switchToTab)('info');
      } else if (event.translationX > SWIPE_THRESHOLD && activeTab === 'info') {
        runOnJS(switchToTab)('session');
      }
      translateX.value = withSpring(0, SPRINGS.snap);
    });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.3 }],
    opacity: 1 - Math.abs(translateX.value) / (screenWidth * 0.5),
  }));

  const controller = useBookDetailController();
  const {
    userBook,
    book,
    quotes,
    sessions,
    modal,
    showMenu,
    showSessionModal,
    showEditSessionModal,
    editingSession,
    showDnfModal,
    showQuoteModal,
    editingQuote,
    fabConfig,
    statusOptions,
    closeModal,
    handleStatusChange,
    handleRatingChange,
    handleLogSession,
    handleQuickProgress,
    handleShare,
    handleDnf,
    handleMenuRemove,
    handleSaveQuote,
    handleQuotePress,
    handleAddQuote,
    handleSessionPress,
    handleUpdateSession,
    handleDeleteSession,
    goBack,
    handleOpenMenu,
    handleCloseMenu,
    handleOpenSessionModal,
    handleCloseSessionModal,
    handleOpenDnfModal,
    handleCloseDnfModal,
    handleCloseQuoteModal,
    handleDeleteQuote,
    handleCloseEditSessionModal,
    handleFabPress,
    handleStatusSelect,
    showTagPicker,
    showBookDetailsSheet,
    tags,
    recentlyUsedTags,
    handleOpenTagPicker,
    handleCloseTagPicker,
    handleSaveTags,
    handleCreateTag,
    handleOpenBookDetailsSheet,
    handleCloseBookDetailsSheet,
    handleSaveBookDetails,
    showReviewSheet,
    handleOpenReviewSheet,
    handleCloseReviewSheet,
    handleSaveReview,
    readThroughs,
    readCount,
    canStartReread,
    handleStartReread,
    handleReadThroughRatingChange,
    nextInSeries,
    handleNextInSeriesPress,
    showSeriesAssignModal,
    handleOpenSeriesAssignModal,
    handleCloseSeriesAssignModal,
    handleSeriesAssignSuccess,
    showAuthorSheet,
    handleOpenAuthorSheet,
    handleCloseAuthorSheet,
    handleAuthorFavorite,
    handleAuthorExclude,
    handleGenrePress,
    isAnalyzing,
    handleAnalyzeContent,
  } = controller;

  const { color: coverColor } = useCoverColor(book.id, book.cover_url);

  const gradientColors = useMemo(() => {
    if (!coverColor) return null;
    const rgb = hexToRgb(coverColor);
    if (!rgb) return null;
    const [r, g, b] = rgb;
    const opacity = theme.isDark ? 0.35 : 0.25;
    return [`rgba(${r}, ${g}, ${b}, ${opacity})`, 'transparent'] as const;
  }, [coverColor, theme.isDark]);

  const progress = userBook.progress_percentage ?? 0;
  const currentPage = userBook.current_page;
  const totalPages = book.page_count ?? 0;

  const pagesReadToday = sessions
    .filter((s) => {
      const sessionDate = new Date(s.date).toDateString();
      const today = new Date().toDateString();
      return sessionDate === today;
    })
    .reduce((sum, s) => sum + s.pages_read, 0);

  const getStatusBadgeVariant = useCallback(() => {
    switch (userBook.status) {
      case 'reading':
        return 'primary';
      case 'read':
        return 'success';
      case 'dnf':
        return 'danger';
      default:
        return 'muted';
    }
  }, [userBook.status]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      {/* Cover color gradient overlay */}
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          style={styles.gradientOverlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
        />
      )}

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
        ]}
      >
        <IconButton
          icon={ArrowLeft01Icon}
          onPress={goBack}
          variant="ghost"
          accessibilityLabel="Go back"
        />

        <IconButton
          icon={MoreHorizontalIcon}
          onPress={handleOpenMenu}
          variant="ghost"
          accessibilityLabel="More options"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Identity Section */}
        <View
          style={[
            styles.identitySection,
            { marginBottom: theme.spacing.lg, gap: theme.spacing.md },
          ]}
        >
          <View style={{ position: 'relative', opacity: isTransitioning ? 0 : 1 }}>
            <CoverImage uri={book.cover_url} size="lg" fallbackText={book.title} />
            {totalPages > 0 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: -8,
                  right: -8,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radii.full,
                  padding: 3,
                  borderWidth: theme.borders.thin,
                  borderColor: theme.colors.border,
                  ...theme.shadows.sm,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radii.full,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text
                    variant="caption"
                    bold
                    style={{ color: theme.colors.foreground, fontSize: 10 }}
                  >
                    {Math.round(progress)}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={{ flex: 1, paddingBottom: theme.spacing.xs }}>
            <Text
              variant="h3"
              numberOfLines={2}
              style={{
                color: theme.colors.foreground,
                marginBottom: theme.spacing.xxs,
              }}
            >
              {book.title}
            </Text>
            <Text
              variant="body"
              numberOfLines={1}
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {book.author}
            </Text>

            {/* Genres */}
            {book.genres && book.genres.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
                {book.genres.slice(0, 2).map((genre, index) => (
                  <Pressable key={genre.id ?? `genre-${index}`} onPress={() => handleGenrePress(genre)} haptic="light">
                    <Chip label={genre.name ?? genre} size="sm" variant="muted" />
                  </Pressable>
                ))}
                {book.genres.length > 2 && (
                  <Chip key="more-genres" label={`+${book.genres.length - 2}`} size="sm" variant="muted" />
                )}
              </View>
            )}

            {/* User Tags */}
            {userBook.tags && userBook.tags.length > 0 && (
              <View style={{ marginBottom: theme.spacing.sm }}>
                <TagList
                  tags={userBook.tags}
                  size="sm"
                  maxDisplay={2}
                  onTagPress={() => handleOpenTagPicker()}
                  onMorePress={handleOpenTagPicker}
                />
              </View>
            )}

            {userBook.status === 'read' && (
              <View style={{ marginTop: theme.spacing.sm }}>
                <RatingInput
                  value={userBook.rating ?? 0}
                  onChange={handleRatingChange}
                  step={0.5}
                />
              </View>
            )}
          </View>
        </View>

        {/* Status Selector - Full Width */}
        <View style={{ marginBottom: theme.spacing.md }}>
          <StatusSelector
            options={statusOptions}
            selected={userBook.status}
            onSelect={handleStatusChange}
          />
        </View>

        {/* Tab Switcher - Full Width */}
        <View style={{ marginBottom: theme.spacing.lg }}>
          <SegmentedControl
            options={TAB_OPTIONS}
            selected={activeTab}
            onSelect={setActiveTab}
          />
        </View>

        {/* Tab Content - Swipeable */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={animatedContentStyle}>
            {activeTab === 'session' ? (
              <SessionTab
                currentPage={currentPage}
                totalPages={totalPages}
                pagesReadToday={pagesReadToday}
                quotes={quotes}
                sessions={sessions}
                onQuickSave={handleQuickProgress}
                onScanText={() => {}}
                onAddQuote={handleAddQuote}
                onQuotePress={handleQuotePress}
                onSessionPress={handleSessionPress}
                lastSessionDate={sessions.length > 0 ? new Date(sessions[0].date) : null}
                lastQuoteDate={quotes.length > 0 ? new Date(quotes[0].createdAt) : null}
              />
            ) : (
              <InfoTab
                genres={book.genres}
                description={book.description}
                publishedDate={book.published_date}
                isbn={book.isbn}
                pageCount={book.page_count}
                author={book.author}
                bookTags={userBook.tags ?? []}
                format={userBook.format ?? null}
                price={userBook.price ?? null}
                currencySymbol={currencySymbol}
                review={userBook.review}
                readThroughs={readThroughs}
                readCount={readCount}
                canStartReread={canStartReread}
                seriesTitle={book.series?.title ?? null}
                volumeNumber={book.volume_number ?? null}
                totalVolumes={book.series?.total_volumes ?? null}
                nextInSeries={nextInSeries}
                audience={book.audience ?? null}
                audienceLabel={book.audience_label ?? null}
                intensity={book.intensity ?? null}
                intensityLabel={book.intensity_label ?? null}
                moods={book.moods ?? null}
                isClassified={book.is_classified ?? false}
                isAnalyzing={isAnalyzing}
                classificationConfidence={book.classification_confidence ?? null}
                onAddTag={handleOpenTagPicker}
                onEditBookDetails={handleOpenBookDetailsSheet}
                onEditReview={handleOpenReviewSheet}
                onStartReread={handleStartReread}
                onReadThroughRatingChange={handleReadThroughRatingChange}
                onNextInSeriesPress={handleNextInSeriesPress}
                onEditSeries={handleOpenSeriesAssignModal}
                onAuthorPress={handleOpenAuthorSheet}
                onGenrePress={handleGenrePress}
                onAnalyzeContent={handleAnalyzeContent}
              />
            )}
          </Animated.View>
        </GestureDetector>
      </ScrollView>

      {/* Floating Action Button - Log Session */}
      {activeTab === 'session' && (
        <View
          style={[
            styles.fabContainer,
            {
              bottom: insets.bottom + theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
            },
          ]}
        >
          <Button variant="primary" size="lg" onPress={handleFabPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon key="icon" icon={Add01Icon} size={20} color={theme.colors.onPrimary} />
              <Text key="label" style={{ color: theme.colors.onPrimary, fontWeight: '600', fontSize: 16 }}>
                {fabConfig.label}
              </Text>
            </View>
          </Button>
        </View>
      )}

      {/* Menu Bottom Sheet */}
      {showMenu && (
        <MenuSheet
          visible={showMenu}
          onClose={handleCloseMenu}
          onStatusChange={handleStatusSelect}
          onShare={handleShare}
          onRemove={handleMenuRemove}
          currentStatus={userBook.status}
          statusOptions={statusOptions}
        />
      )}

      {/* Quick Log Sheet */}
      {showSessionModal && (
        <QuickLogSheet
          visible={showSessionModal}
          onClose={handleCloseSessionModal}
          onSave={handleLogSession}
          currentPage={currentPage}
          totalPages={totalPages}
          bookTitle={book.title}
        />
      )}

      {/* Edit Session Modal */}
      {showEditSessionModal && editingSession && (
        <EditSessionModal
          visible={showEditSessionModal}
          onClose={handleCloseEditSessionModal}
          session={editingSession}
          onSave={handleUpdateSession}
          onDelete={handleDeleteSession}
        />
      )}

      {/* DNF Modal */}
      {showDnfModal && (
        <DNFModal
          visible={showDnfModal}
          onClose={handleCloseDnfModal}
          onConfirm={handleDnf}
        />
      )}

      {/* Quote Capture Modal */}
      {showQuoteModal && (
        <QuoteCaptureModal
          visible={showQuoteModal}
          onClose={handleCloseQuoteModal}
          onSave={handleSaveQuote}
          onDelete={handleDeleteQuote}
          editingQuote={editingQuote}
          totalPages={book.page_count ?? undefined}
        />
      )}

      {/* Confirm Modal */}
      {modal.visible && (
        <ConfirmModal
          visible={modal.visible}
          onClose={closeModal}
          onConfirm={modal.onConfirm ?? closeModal}
          title={modal.title}
          message={modal.message}
          status={modal.status}
          confirmLabel={modal.confirmLabel}
          cancelLabel={modal.cancelLabel}
          confirmDestructive={modal.confirmDestructive}
        />
      )}

      {/* Tag Picker */}
      {showTagPicker && (
        <TagPicker
          visible={showTagPicker}
          onClose={handleCloseTagPicker}
          onSave={handleSaveTags}
          onCreateTag={handleCreateTag}
          selectedTagIds={(userBook.tags ?? []).map((t) => t.id)}
          tags={tags}
          recentlyUsedTags={recentlyUsedTags}
        />
      )}

      {/* Edit Book Details Sheet */}
      {showBookDetailsSheet && (
        <EditBookDetailsSheet
          visible={showBookDetailsSheet}
          onClose={handleCloseBookDetailsSheet}
          onSave={handleSaveBookDetails}
          currentFormat={(userBook.format as BookFormat) ?? null}
          currentPrice={userBook.price ?? null}
          currency={preferences.currency}
          onCurrencyChange={(c) => setPreference('currency', c)}
        />
      )}

      {showReviewSheet && (
        <ReviewSheet
          visible={showReviewSheet}
          onClose={handleCloseReviewSheet}
          onSave={handleSaveReview}
          currentReview={userBook.review}
        />
      )}

      {showSeriesAssignModal && (
        <SeriesAssignModal
          visible={showSeriesAssignModal}
          onClose={handleCloseSeriesAssignModal}
          onSuccess={handleSeriesAssignSuccess}
          book={book}
          currentSeries={book.series ?? null}
          currentVolumeNumber={book.volume_number ?? null}
        />
      )}

      {showAuthorSheet.visible && (
        <AuthorDetailSheet
          visible={showAuthorSheet.visible}
          onClose={handleCloseAuthorSheet}
          authorKey={showAuthorSheet.authorKey}
          authorName={showAuthorSheet.authorName}
          isFavorite={showAuthorSheet.isFavorite}
          isExcluded={showAuthorSheet.isExcluded}
          onFavorite={handleAuthorFavorite}
          onExclude={handleAuthorExclude}
        />
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  identitySection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
});
