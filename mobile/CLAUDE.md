# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```powershell
npm start               # Start Expo dev server
npm run android         # Run on Android device/emulator
npm run ios             # Run on iOS simulator
npm run web             # Run in browser
```

## Architecture Overview

### Stack
- **Framework**: Expo 54, React 19, TypeScript
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **Styling**: NativeWind 4 (Tailwind CSS for React Native)
- **Local Database**: WatermelonDB with SQLite adapter (offline-first)
- **State**: Zustand stores persisted to MMKV storage
- **Auth**: expo-secure-store for token storage

### Provider Hierarchy
```
GestureHandlerRootView
  └─ SafeAreaProvider
      └─ ThemeProvider (CSS vars via NativeWind)
          └─ QueryClientProvider
              └─ DatabaseProvider (WatermelonDB + auto-sync)
                  └─ AppContent
                      ├─ RootNavigator
                      └─ GoalCelebrationOverlay
```

### Path Aliases
Use `@/` to import from `src/`:
```tsx
import { Button } from '@/components';
import { useTheme } from '@/themes';
```

## Theming System

### Four Themes
- **Scholar** (dark): Burgundy primary, Playfair/Crimson fonts, sharp corners, star ratings
- **Dreamer** (light): Lavender primary, Nunito font, rounded corners, heart ratings
- **Wanderer** (dark): Desert gold primary, compass rating icons
- **Midnight** (dark): Indigo primary, Lora font, medium corners, moon ratings

### Theme Architecture
1. Theme definitions in `src/themes/themes/{name}.ts` implement the `Theme` interface
2. `ThemeProvider` converts theme colors to CSS variables via NativeWind's `vars()`
3. `tailwind.config.js` maps semantic tokens to CSS variables
4. Components use NativeWind classes with semantic tokens

### Styling Rules
Always use semantic color tokens - never raw Tailwind colors:
```tsx
// Correct
<View className="bg-surface text-foreground border-border">
<Pressable className="bg-primary hover:bg-primary-hover">

// Wrong
<View className="bg-gray-900 text-white border-gray-700">
```

### Adding a New Theme
1. Create `src/themes/themes/mytheme.ts` implementing `Theme` interface
2. Export from `src/themes/themes/index.ts`
3. Add to `ThemeName` union in `src/types/theme.ts`

## Offline-First Database

### WatermelonDB Models

All models in `src/database/models/`:

- **Book** - Book metadata
  - Columns: `serverId`, `externalId`, `externalProvider`, `seriesId`, `serverSeriesId`, `volumeNumber`, `volumeTitle`, `title`, `author`, `coverUrl`, `localCoverPath`, `pageCount`, `height_cm`, `width_cm`, `thickness_cm`, `isbn`, `description`, `genres_json`, `publishedDate`
  - Sync fields: `isPendingSync`, `isDeleted`

- **UserBook** - User's relationship to book
  - Columns: `serverId`, `bookId`, `serverBookId`, `status`, `rating`, `currentPage`, `format`, `price`, `isPinned`, `queuePosition`, `review`, `isDnf`, `dnfReason`, `startedAt`, `finishedAt`, `customCoverUrl`, `pendingCoverUpload`
  - Sync fields: `isPendingSync`, `isDeleted`

- **ReadingSession** - Individual reading sessions
  - Columns: `serverId`, `userBookId`, `serverUserBookId`, `readThroughId`, `serverReadThroughId`, `sessionDate`, `pagesRead`, `startPage`, `endPage`, `durationSeconds`, `notes`
  - Sync fields: `isPendingSync`, `isDeleted`

- **ReadThrough** - Re-reading tracking
  - Columns: `serverId`, `userBookId`, `serverUserBookId`, `readNumber`, `status`, `rating`, `review`, `isDnf`, `dnfReason`, `startedAt`, `finishedAt`
  - Sync fields: `isPendingSync`, `isDeleted`

- **Series** - Book series/collections
  - Columns: `serverId`, `title`, `author`, `externalId`, `externalProvider`, `totalVolumes`, `isComplete`, `description`
  - Sync fields: `isPendingSync`, `isDeleted`

- **Tag** - User tags (minimal offline storage)
  - Columns: `serverId`, `name`, `color`
  - Sync fields: `isPendingSync`, `isDeleted`
  - Note: Full tag data (`slug`, `is_system`) comes from API responses

- **UserBookTag** - Pivot table for book-tag relationships
  - Columns: `userBookId`, `tagId`, `serverUserBookId`, `serverTagId`

- **SyncMetadata** - Tracks sync timestamps
  - Columns: `key`, `lastPulledAt`, `lastPushedAt`

### Sync Pattern
All models use soft deletes (`is_deleted` flag) and pending sync flags (`is_pending_sync`). After mutations:
```tsx
import { scheduleSyncAfterMutation } from '@/database/sync';

await database.write(async () => {
  await userBook.updateStatus('reading');
});
scheduleSyncAfterMutation(); // Triggers background sync
```

### Database Hooks
- `useLibrary(status?)` - Observes user's library, optionally filtered by status
- `useUserBook(id)` - Observes single user_book with its book
- `useAddToLibrary()` - Returns `addBook` function
- `useSessions(userBookId)` - Observes reading sessions for a book

## Feature Structure

Features follow a modular pattern:
```
src/features/{feature}/
├── screens/           # Screen components
├── components/        # Feature-specific components
├── hooks/             # Controller hooks (useXxxController.ts)
└── index.ts           # Public exports
```

### Controller Pattern
Business logic is extracted into controller hooks:
```tsx
// src/features/auth/hooks/useLoginController.ts
export function useLoginController() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // ... all state and handlers
  return { email, setEmail, loading, handleLogin };
}

// Screen just renders UI
function LoginScreen() {
  const controller = useLoginController();
  return <AuthLayout>...</AuthLayout>;
}
```

## Component Guidelines

### Custom Components
Shared components in `src/components/` wrap React Native primitives with theming:
- `Text` - Themed text with `variant` prop (heading, body, caption, etc.)
- `Pressable` - Adds haptic feedback and animations (see limitations below)
- `Card` - Themed surface with border and shadows
- `Button` - Full button with variants (primary, secondary, ghost, danger)
- `IconButton` - Icon-only button with variants
- `SegmentedControl` - Full-width tab switcher with sliding indicator

### Button Component Usage
**Always use the `Button` component for interactive buttons** - never build custom buttons with Pressable + manual styling. The Button component handles:
- Theme-aware colors and radii (Scholar vs Dreamer vs Wanderer)
- 3D shadow effects for primary/danger variants on non-Scholar themes
- Press animations and haptic feedback
- Loading and disabled states

```tsx
import { Button, Icon, Text } from '@/components';
import { Add01Icon } from '@hugeicons/core-free-icons';

// Simple text button
<Button variant="primary" size="lg" onPress={handlePress}>
  Save Changes
</Button>

// Button with icon + text (pass as children)
<Button variant="primary" size="lg" onPress={handlePress}>
  <Icon icon={Add01Icon} size={20} color={theme.colors.onPrimary} />
  <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
    Add Item
  </Text>
</Button>

// Available variants: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'primary-outline'
// Available sizes: 'sm' | 'md' | 'lg'
```

### CRITICAL: Pressable Layout Issues

**IMPORTANT**: Both the custom `Pressable` from `@/components` AND React Native's native `Pressable` have layout issues when you apply flex styles directly to them. **Layout styles on Pressable often break** - children will stack vertically instead of respecting `flexDirection: 'row'`.

**The fix**: Never put layout styles on Pressable. Instead, use Pressable only for tap handling and put a View child inside for layout:

```tsx
// WRONG - layout styles on Pressable will break
<Pressable
  onPress={handlePress}
  style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
>
  <Icon icon={SomeIcon} />
  <Text>Label</Text>
  <Icon icon={ArrowIcon} />
</Pressable>

// CORRECT - Pressable for tap, View child for layout
<Pressable onPress={handlePress}>
  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
    <Icon icon={SomeIcon} />
    <View style={{ flex: 1 }}>
      <Text>Label</Text>
    </View>
    <Icon icon={ArrowIcon} />
  </View>
</Pressable>
```

For tappable rows (like settings items, list items), always follow this pattern:
1. `Pressable` or `RNPressable` as the outer wrapper (no layout styles)
2. `View` as immediate child with all layout styles (`flexDirection: 'row'`, padding, etc.)
3. Content inside the View

Use `RNPressable` from `react-native` when you need:
- `position: 'absolute'` positioning
- Press state styling via the style function: `style={({ pressed }) => (...)}`

### Icons
Use Hugeicons with the Icon component:
```tsx
import { Icon } from '@/components';
import { Book01Icon } from '@hugeicons/core-free-icons';

<Icon icon={Book01Icon} size={24} color={theme.colors.foreground} />
```

### Accessing Theme Values in Styles
For inline styles or StyleSheet, use the theme hooks:
```tsx
const { theme } = useTheme();
const colors = useThemeColors();
const radii = useThemeRadii();

<View style={{ backgroundColor: colors.surface, borderRadius: radii.md }}>
```

## API Client

Located in `src/api/client.ts`. Uses expo-secure-store for auth tokens:
```tsx
import { apiClient } from '@/api/client';

const data = await apiClient<BookResponse>('/books', {
  method: 'POST',
  body: { title: 'My Book' },
  requiresAuth: true, // default
});
```

Throws `AuthenticationError` on 401, `ApiRequestError` on other failures.

## Animation Guidelines

### Keep Animations Subtle
Animations should feel natural and polished, not bouncy or exaggerated. Use springs from `@/animations/constants.ts`:

```tsx
import { SPRINGS } from '@/animations';

// For UI transitions (modals, sheets, layout changes)
scale.value = withSpring(1, SPRINGS.soft);      // damping: 28
opacity.value = withSpring(1, SPRINGS.gentle);  // damping: 25

// For interactive feedback (button presses, taps)
scale.value = withSpring(0.98, SPRINGS.snappy); // damping: 20
```

**Key principles:**
- Higher damping = less bounce (prefer damping 20-30 for most UI)
- Avoid low damping values (< 15) - they create exaggerated "rubbery" animations
- Use `SPRINGS.modal` for modal/sheet entering animations
- For Reanimated's layout animations: `.springify().damping(22).stiffness(140)` or higher damping

**Avoid this pattern:**
```tsx
// Too bouncy - will overshoot and oscillate
SlideInDown.springify().damping(10).stiffness(150)
Layout.springify().damping(12).stiffness(100)
```

### Design Taste
- **No icon backgrounds** - Don't wrap icons in colored circles/squares (looks generic/AI-generated)
- **Adequate spacing** - Grid items need 16px+ gaps, not 8-12px
- **Subtle shadows** - Prefer elevation through subtle borders over heavy drop shadows

## Code Style

### Comments
- **Never add inline comments** (`//` or `/* */`)
- **Only use JSDoc blocks** (`/** */`) for functions and components that need documentation
- Code should be self-documenting through clear naming

---

## Feature-Specific Patterns

### Re-Reading Support

Users can track multiple readings of the same book with separate ratings/reviews.

**Key Components**:
- `ReadThroughCard` - Display a single read-through with rating
- Book detail screen shows "Reading History" section

**Controller Pattern**:
```tsx
// In useBookDetailController.ts
const { readThroughs, readCount, canStartReread, handleStartReread } = controller;

// Start a re-read (creates new ReadThrough, resets progress)
handleStartReread(); // Opens confirmation modal first
```

**API Response**: `UserBook` includes `read_throughs: ReadThrough[]` and `read_count: number`

### Series Support

Group books into series/collections with volume tracking.

**Hooks** (`src/queries/useSeries.ts`):
```tsx
// List all series
const { data: series } = useSeriesQuery(searchQuery);

// Get series details with books
const { data: seriesDetail } = useSeriesDetailQuery(seriesId);

// CRUD mutations
const createMutation = useCreateSeriesMutation();
const updateMutation = useUpdateSeriesMutation();
const deleteMutation = useDeleteSeriesMutation();

// Assign book to series
const assignMutation = useAssignBookToSeriesMutation();
await assignMutation.mutateAsync({
  seriesId: 123,
  bookId: 456,
  volumeNumber: 1,
  volumeTitle: 'The Fellowship of the Ring',
});

// Remove book from series
const removeMutation = useRemoveBookFromSeriesMutation();

// Smart series matching (for auto-suggest)
const { matches, bestMatch } = useFindMatchingSeries('Lord of the Rings');
// Returns confidence levels: 'exact' | 'high' | 'medium'
```

**Key Screens**:
- `SeriesDetailScreen` - View all books in a series
- `SeriesGroupView` - Library view grouped by series
- `SeriesAssignModal` - Assign/edit book's series membership
- `SeriesSuggestModal` - Auto-suggest series when adding books

**Book Detail Integration**:
- "Series" section in Info tab shows current assignment or "Tap to add"
- "Next in Series" card appears when next volume exists

### Tags System

User-created tags with colors for categorizing books.

**Store** (`stores/tagStore.ts`):
```tsx
// Access tags
const tags = useTags();
const { setTags, addTag, updateTag, deleteTag } = useTagActions();

// Tag filtering (for library) - 'any' = OR, 'all' = AND
const { activeTagIds, tagFilterMode } = useTagFilters();
const { setTagFilter, clearTagFilters, toggleTagFilterMode } = useTagFilterActions();

// Recently used (max 5)
const recentlyUsedTags = useRecentlyUsedTags();

// System vs user tags
const systemTags = useSystemTags();
const userTags = useUserTags();

// Undo delete (5-second window)
const deletedTag = useDeletedTag();
```

**Components**:
- `TagPicker` - Select tags for a book (used in BookDetailScreen)
- `TagList` - Display tags with optional tap action
- `TagFilterBar` - Filter library by tags ('any'/'all' mode toggle)
- `TagEditor` - Edit single tag (name, color)
- `TagColorPicker` - Color selection grid

**Colors** (10 options):
```tsx
type TagColor = 'primary' | 'gold' | 'green' | 'purple' | 'copper' |
                'blue' | 'orange' | 'teal' | 'rose' | 'slate';
```

### Reading Goals

Flexible reading targets with progress tracking.

**API** (`api/goals.ts`):
```tsx
import { goalsApi, GOAL_TYPES, GOAL_PERIODS } from '@/api/goals';

// Create goal
await goalsApi.create({
  type: 'books',      // 'books' | 'pages' | 'minutes' | 'streak'
  period: 'yearly',   // 'daily' | 'weekly' | 'monthly' | 'yearly'
  target: 50,
});

// Goal types with metadata
GOAL_TYPE_CONFIG = {
  books: { label: 'Books Read', unit: 'books' },
  pages: { label: 'Pages Read', unit: 'pages' },
  minutes: { label: 'Reading Time', unit: 'minutes' },
  streak: { label: 'Reading Streak', unit: 'days' },
};
```

**Key Screens**:
- `ReadingGoalsScreen` - Full goal management (create, edit, delete)
- `ReadingGoalsSection` - Summary view on profile
- `GoalCelebrationOverlay` - Animated celebration when goals are achieved

**Goal Properties**:
- `progressPercentage` - 0-100
- `isCompleted` - boolean
- `isOnTrack` - compares actual vs expected progress
- `remaining` - amount needed to reach target

### Statistics

Pre-aggregated reading statistics with various visualizations.

**Hooks** (`queries/useReadingStats.ts`):
```tsx
// Main stats overview
const { data: stats } = useReadingStatsQuery();

// Activity heatmap (365-day visualization)
const { data: heatmap } = useHeatmapQuery({ year: 2024 });

// Format reading speeds
const { data: formatVelocity } = useFormatVelocityQuery();

// Additional stats endpoints
const { data: moodRing } = useMoodRingQuery();        // Tag/genre breakdown
const { data: dnfAnalytics } = useDNFAnalyticsQuery(); // DNF patterns
const { data: pageEconomy } = usePageEconomyQuery();   // Pages per format/genre
```

**Stats Screens** (`features/stats/`, `features/reading/`):
- `ReaderDNAScreen.tsx` - Main stats hub (used in tab navigation)
- `ReadingStatsScreen.tsx` - Detailed reading statistics view
- Reading streaks with calendar
- Pages/books per period
- Genre distribution
- Reading time by hour/day
- Format comparisons
- DNF analytics and abandonment patterns

### Profile & Settings

User profile management and app preferences.

**Screens** (`features/profile/`, `features/settings/`):
- `ProfileScreen` - Main hub with identity, goals, settings
- `EditProfileScreen` - Name, bio, avatar
- `ChangePasswordScreen` - Password change with confirmation
- `TagManagementScreen` - CRUD for user tags
- `ReadingGoalsScreen` - Goal management
- `OPDSSettingsScreen` - OPDS server configuration
- `EditionGalleryScreen` - Browse book editions

**Preferences Store** (`stores/preferencesStore.ts`):
```tsx
const preferences = usePreferences();
const { setPreference } = usePreferencesActions();

// Available preferences
type Preferences = {
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
  preferredProgressMode: 'absolute' | 'increment' | 'percentage';
  // ... etc
};
```

### OPDS Integration

Connect to OPDS servers for book discovery.

**Screen**: `OPDSSettingsScreen.tsx` in `features/settings/`

**API** (`api/rss.ts` or via user endpoints):
- Configure OPDS server URL, username, password
- Test connection before saving
- Switch between Google Books and OPDS as search source

### Additional Zustand Stores

All stores in `src/stores/` are persisted to MMKV:

| Store | Purpose |
|-------|---------|
| `authStore` | Authentication state and tokens |
| `themeStore` | Current theme selection |
| `tagStore` | Tags, filtering, recently used |
| `preferencesStore` | User preferences (currency, progress mode) |
| `quoteStore` | Saved quotes from books |
| `spineColorStore` | Cached spine colors for books |
| `sharedElementStore` | Shared element transition state |
| `recentSearchesStore` | Recent search history |
| `shareIntentStore` | Handle shared files from other apps |
| `toastStore` | Toast notification queue |
| `celebrationStore` | Goal celebration animations |
| `navBarStore` | Navigation bar visibility state |
| `tierListStore` | Tier list feature state |

### Import Functionality

Import books from external sources like Goodreads.

**Flow**:
1. User selects file (CSV export)
2. `ImportOptionsModal` shows with toggles for tags/reviews
3. `ImportProgressModal` shows progress
4. Results displayed with imported/skipped counts

**Mobile Components**:
- `ShareImportHandler` - Handles shared files from other apps
- Import progress modal with animated progress

---

## New Component Reference

### Modals

| Component | Purpose |
|-----------|---------|
| `SeriesAssignModal` | Assign/edit book series membership |
| `SeriesSuggestModal` | Auto-suggest series when adding books |
| `TagPicker` | Select tags for a book |
| `ImportOptionsModal` | Configure import settings |
| `ImportProgressModal` | Show import progress |
| `PasswordConfirmModal` | Confirm password for sensitive actions |
| `DeleteAccountModal` | Account deletion confirmation |

### Display Components

| Component | Purpose |
|-----------|---------|
| `ReadThroughCard` | Display single read-through with rating |
| `TagList` | Horizontal list of tag chips |
| `TagFilterBar` | Tag filtering controls |
| `SeriesGroupView` | Library grouped by series |
| `GoalCard` | Goal progress display |
| `SyncStatusBadge` | Show sync state |
