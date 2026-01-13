// Layout Primitives
export { Box } from '@/components/layout/Box';
export { Row } from '@/components/layout/Row';
export { Column } from '@/components/layout/Column';
export { TabScreenLayout, useTabScreenPadding } from '@/components/layout/TabScreenLayout';

// Atoms
export {
  Text,
  type TextProps,
  type TextVariant,
  Pressable,
  type PressableProps,
  Badge,
  Icon,
  type IconProps,
  Divider,
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
  IconButton,
  type IconButtonProps,
  type IconButtonVariant,
  type IconButtonSize,
  Progress,
} from '@/components/atoms';

// Molecules
export {
  Rating,
  RatingInput,
  QuickActionButton,
  type QuickActionButtonProps,
  QuickActionPill,
  type QuickActionPillProps,
  Chip,
  type ChipProps,
  type ChipVariant,
  TagChip,
  type TagChipProps,
  DateSelector,
  DurationInput,
  PageRangeInput,
  Input,
  Checkbox,
  RadioGroup,
  CheckboxGroup,
  SegmentedControl,
  ProgressSlider,
  ProgressModeToggle,
  type ProgressMode,
  ChipGroup,
  MoodSelector,
  ClassificationBadges,
  type ClassificationBadgesProps,
} from '@/components/molecules';

// Organisms
export {
  BookHero,
  AnimatedBookHero,
  BookHeroContent,
  type BookHeroContentProps,
  BottomSheet,
  ConfirmModal,
  type ModalStatus,
  DNFModal,
  ReadingSessionModal,
  QuickLogSheet,
  EditSessionModal,
  QuoteCaptureModal,
  BarcodeScannerModal,
  EditionPickerModal,
  ManualBookEntryModal,
  type ManualBookData,
  ThemePreviewSheet,
  EditionSelectorSheet,
  ImportProgressModal,
  type ImportStatus,
  ImportOptionsModal,
  PasswordConfirmModal,
  SeriesSuggestModal,
  SeriesAssignModal,
  Card,
  ControlDeckCard,
  CoverImage,
  FilterDial,
  type FilterDialOption,
  ToastContainer,
  FloatingActionButton,
  BookListItem,
  BookCoverCard,
} from '@/components/organisms';

// Components that remain in root (not yet moved)
export { ThemeToggle } from '@/components/ThemeToggle';
export { AvatarPicker } from '@/components/AvatarPicker';
export { FloatingTabBar } from '@/components/FloatingTabBar';
export { FloatingNavBar, useFloatingNavBarHeight } from '@/components/FloatingNavBar';
export { FloatingBottomBar } from '@/components/FloatingBottomBar';
export { InlineProgressWidget } from '@/components/InlineProgressWidget';
export { SectionHeader } from '@/components/SectionHeader';
export { StatRow } from '@/components/StatRow';
export { CollapsibleSection } from '@/components/CollapsibleSection';
export { SessionCard } from '@/components/SessionCard';
export { ReadThroughCard } from '@/components/ReadThroughCard';
export { ReadingProgressCard } from '@/components/ReadingProgressCard';
export { SharedElementOverlay } from '@/components/SharedElementOverlay';
export { QuickActionsRow } from '@/components/QuickActionsRow';
export { ExLibrisSection } from '@/components/ExLibrisSection';
export { StickyHeader } from '@/components/StickyHeader';
export { TextureBackground } from '@/components/TextureBackground';
export { PaginationDots } from '@/components/PaginationDots';
export { QuoteCard } from '@/components/QuoteCard';
export { MarginaliaSection } from '@/components/MarginaliaSection';
export { TagList } from '@/components/TagList';
export { TagPicker } from '@/components/TagPicker';
export { TagEditor } from '@/components/TagEditor';
export { TagColorPicker } from '@/components/TagColorPicker';
export { TagFilterBar } from '@/components/TagFilterBar';
export { ShelfRail } from '@/components/ShelfRail';
export { ShelfRow } from '@/components/ShelfRow';
export { VignetteOverlay } from '@/components/VignetteOverlay';
export { AnimatedBookListItem } from '@/components/AnimatedBookListItem';
export { BookSpine, SpineGridView, SpineTexture, WearOverlay, getBookAge } from '@/components/SpineView';
export { DebugOverlay } from '@/components/DebugOverlay';
export { QueryErrorBoundary } from '@/components/QueryErrorBoundary';
export { SwipeableRow } from '@/components/SwipeableRow';
export { SwipeableViewContainer } from '@/components/SwipeableViewContainer';
export { ThemedRefreshControl, useThemedRefreshControl } from '@/components/ThemedRefreshControl';
export { PerformanceOverlay } from '@/components/PerformanceOverlay';
export { SyncStatusBadge } from '@/components/SyncStatusBadge';
