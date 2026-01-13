# Digital Athenaeum - Complete Documentation

> A beautifully crafted book tracking mobile app with multiple aesthetic themes, offline-first architecture, and deep reading analytics.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend (Laravel API)](#backend-laravel-api)
4. [Mobile App (Expo React Native)](#mobile-app-expo-react-native)
5. [Theme System](#theme-system)
6. [Component Library](#component-library)
7. [Data & Sync](#data--sync)
8. [Design Patterns](#design-patterns)
9. [API Reference](#api-reference)

---

## Overview

The Digital Athenaeum is a comprehensive book tracking application designed for readers who want to catalog their library, track reading progress, analyze reading habits, and set goals. The app features four distinct visual themes that transform the entire user experience.

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Theme UI** | Four complete visual themes: Scholar (Dark Academia), Dreamer (Cottagecore), Wanderer (Desert Explorer), Midnight (Celestial) |
| **Offline-First** | Full functionality without internet via WatermelonDB with background sync |
| **Book Discovery** | Search via Google Books API with barcode scanning and manual entry |
| **Reading Sessions** | Log pages read, duration, and notes for each reading session |
| **Reading Goals** | Set daily, weekly, monthly, or yearly goals for books, pages, or minutes |
| **Advanced Analytics** | Activity heatmaps, streak tracking, format velocity, genre analysis, DNF patterns |
| **Tag Organization** | Custom color-coded tags with AND/OR filtering |
| **TBR Queue** | Drag-and-drop "To Be Read" queue management |
| **Multiple View Modes** | List, grid, spine (bookshelf), and stack views for your library |
| **Import/Export** | Import from Goodreads, export your complete library data |

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend Framework** | Laravel 12 |
| **Backend Database** | SQLite (dev) / PostgreSQL (production) |
| **Authentication** | Laravel Sanctum (token-based) |
| **Mobile Framework** | Expo 54, React 19, TypeScript |
| **Mobile Navigation** | React Navigation (native-stack + bottom-tabs) |
| **Mobile Styling** | NativeWind 4 (Tailwind CSS for React Native) |
| **Local Database** | WatermelonDB with SQLite |
| **Server State** | TanStack Query |
| **Client State** | Zustand with MMKV persistence |
| **Secure Storage** | expo-secure-store for auth tokens |

---

## Architecture

### Monorepo Structure

```
athenaeum/
├── backend/                 # Laravel 12 API
│   ├── app/
│   │   ├── Console/         # Artisan commands
│   │   ├── Contracts/       # Service interfaces
│   │   ├── DTOs/            # Data transfer objects
│   │   ├── Enums/           # PHP enums (status, format, theme, etc.)
│   │   ├── Http/
│   │   │   ├── Controllers/Api/  # API controllers
│   │   │   ├── Requests/    # Form request validation
│   │   │   └── Resources/   # JSON resource transformers
│   │   ├── Models/          # Eloquent models
│   │   ├── Observers/       # Model observers
│   │   ├── Providers/       # Service providers
│   │   └── Services/        # Business logic services
│   ├── database/
│   │   ├── migrations/      # Database schema
│   │   └── seeders/         # Test data seeders
│   └── routes/api.php       # API route definitions
│
└── mobile/                  # Expo React Native app
    ├── src/
    │   ├── animations/      # Animation configs and hooks
    │   ├── api/             # API client and endpoints
    │   ├── components/      # UI component library
    │   │   ├── atoms/       # Primitive components
    │   │   ├── molecules/   # Composite components
    │   │   ├── organisms/   # Complex features
    │   │   └── layout/      # Layout primitives
    │   ├── database/        # WatermelonDB setup and sync
    │   │   ├── models/      # Database models
    │   │   ├── hooks/       # Database query hooks
    │   │   └── sync/        # Sync adapter and logic
    │   ├── features/        # Feature modules (screens + logic)
    │   │   ├── auth/        # Login, register, password reset
    │   │   ├── home/        # Dashboard/home screen
    │   │   ├── library/     # Book collection management
    │   │   ├── profile/     # User profile and settings
    │   │   ├── search/      # Book discovery
    │   │   ├── settings/    # App settings
    │   │   └── stats/       # Reading analytics
    │   ├── hooks/           # Shared React hooks
    │   ├── lib/             # Utilities (query client, storage)
    │   ├── navigation/      # Navigation configuration
    │   ├── queries/         # TanStack Query definitions
    │   ├── stores/          # Zustand state stores
    │   ├── themes/          # Theme definitions and context
    │   ├── types/           # TypeScript type definitions
    │   └── utils/           # Utility functions
    └── App.tsx              # Root component
```

### Provider Hierarchy (Mobile)

```
GestureHandlerRootView
  └─ SafeAreaProvider
      └─ ThemeProvider (CSS variables via NativeWind)
          └─ QueryClientProvider (TanStack Query)
              └─ DatabaseProvider (WatermelonDB + auto-sync)
                  └─ RootNavigator
                  └─ ToastContainer
                  └─ ShareImportHandler
                  └─ PerformanceOverlay
```

---

## Backend (Laravel API)

### Authentication

The API uses Laravel Sanctum for token-based authentication:

- **Token Creation**: `createToken('mobile')` generates plaintext tokens
- **Protected Routes**: All endpoints except auth routes require `auth:sanctum` middleware
- **Token Revocation**: Logout deletes the current access token

### Database Models

#### Core Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User account | name, email, theme, preferences (JSON), avatar_path |
| **Book** | Book metadata | external_id, title, author, cover_url, page_count, dimensions, isbn, genres (JSON) |
| **UserBook** | User-book pivot | status, rating, current_page, format, price, is_pinned, queue_position, started_at, finished_at |
| **ReadingSession** | Reading activity | user_book_id, date, pages_read, start_page, end_page, duration_seconds, notes |
| **Tag** | Organization labels | name, slug, color, is_system, sort_order |
| **ReadingGoal** | Reading targets | type, period, target, current_value, year, month, is_active |
| **UserStatistics** | Pre-aggregated stats | lifetime totals, current period stats, streaks, velocity metrics, patterns (JSON) |
| **UserStatisticsMonthly** | Monthly archives | books_read, pages_read, reading_seconds, genres (JSON), top_books (JSON) |

#### Model Relationships

```
User
  ├── hasMany UserBooks → belongsTo Book
  │                    └── hasMany ReadingSessions
  ├── hasMany Tags
  ├── hasMany ReadingGoals
  ├── hasOne UserStatistics
  └── hasMany UserStatisticsMonthly
```

### Enums

| Enum | Values | Purpose |
|------|--------|---------|
| **BookStatusEnum** | want_to_read, reading, read, dnf | Reading status tracking |
| **BookFormatEnum** | physical, ebook, audiobook | Book format type |
| **GoalTypeEnum** | books, pages, minutes, streak | Goal measurement unit |
| **GoalPeriodEnum** | daily, weekly, monthly, yearly | Goal time period |
| **TagColorEnum** | primary, gold, green, purple, copper, blue, orange, teal, rose, slate | Tag color options |
| **ThemeEnum** | scholar, dreamer, wanderer, midnight | App theme selection |

### Services

#### GoogleBooksService

Primary book search provider with intelligent features:

- **Dual-query strategy**: Combines title search (`intitle:`) with relevance search
- **15-minute caching**: Identical searches return cached results
- **Result merging**: Deduplicates by Google Books ID
- **Scoring algorithm**: Considers rating (40%), title match (30%), relevance (15%), completeness (15%)
- **Edition grouping**: Collapses paperback/hardcover duplicates

#### ReaderDNAService

Comprehensive reading analytics:

| Method | Returns |
|--------|---------|
| `getHeatmapData()` | 365-day activity grid with intensity levels (0-4), streaks |
| `getFormatVelocity()` | Pages-per-hour by format (physical, ebook, audiobook) |
| `getMoodRing()` | Tag distribution, genre breakdown, seasonal patterns |
| `getDnfAnalytics()` | DNF rate, patterns (long books, genres), abandonment points |
| `getPageEconomy()` | Cost-per-hour analysis, best value books |
| `getCalendarData()` | Daily breakdown with monthly summaries |

#### ReadingGoalService

Goal tracking with automatic progress calculation:

- `incrementBookGoals()` - Called when book marked as read
- `addPagesToGoals()` - Called after reading session
- `addMinutesToGoals()` - Called after session with duration
- `updateStreakGoals()` - Updates streak tracking
- `recalculateAllGoals()` - Bulk recalculation from actual data

### Global Configuration

Set in `AppServiceProvider`:

```php
JsonResource::withoutWrapping()  // No 'data' wrapper in responses
Model::unguard()                 // No $fillable needed on models
Model::preventLazyLoading()      // N+1 query protection (dev)
```

---

## Mobile App (Expo React Native)

### Navigation Structure

#### Root Navigation
Switches between `AuthNavigator` (logged out) and `MainNavigator` (logged in) based on authentication state.

#### Auth Navigator (Stack)
- Login → Register → ForgotPassword → ResetPassword

#### Main Navigator (Bottom Tabs + Stack Modals)

**Bottom Tabs:**
| Tab | Screen | Purpose |
|-----|--------|---------|
| Home | HomeScreen | Dashboard with current book, goals, queue |
| Search | SearchScreen | Book discovery with filters |
| Library | LibraryScreen | Book collection with multiple views |
| Stats | ReaderDNAScreen | Reading analytics |
| Profile | ProfileScreen | User settings and data |

**Modal Stack Overlays:**
- BookDetail, TagManagement, EditionGallery, EditProfile, ChangePassword, ReadingGoals, TierList

### Feature Modules

#### Library Feature
The core book collection management:

- **View Modes**: List, Grid, Spines (bookshelf), Stack (TBR queue)
- **Tab Filtering**: All, Reading, TBR, Read, DNF
- **Tag Filtering**: AND/OR filtering with multiple tags
- **Search Lens**: In-library fuzzy search with match scoring
- **Swipe Navigation**: Swipe gestures to switch view modes

#### Search Feature
Book discovery with multiple input methods:

- **Text Search**: Title, author, ISBN queries
- **Barcode Scanner**: Camera-based ISBN scanning
- **Manual Entry**: Add books not in database
- **Filters**: Genre, language, rating, year range
- **Edition Picker**: Select specific book edition
- **Recent Searches**: Persisted search history

#### Home Feature
Smart dashboard with context-aware content:

- **Hero Flip Card**: Current reading book with progress
- **Pulse Strip**: Reading streak indicator
- **Goal Progress Widget**: Active goal visualization
- **On-Deck Queue**: TBR queue management
- **Atmospheric Background**: Blurred cover-based background

#### Stats Feature (Reader DNA)
Two-tab analytics experience:

**Reader DNA Tab:**
- The Pulse: 52-week activity heatmap
- Streak Display: Current and longest streaks
- Reading Rhythm Badge: Behavioral pattern (daily reader, weekend warrior, etc.)
- Volume Metrics: Pages, books, active days
- Format Velocity: Fiction vs non-fiction ratio
- Mood Ring: Interactive genre distribution
- The Graveyard: DNF analytics
- Page Economy: Reading speed analysis

**Calendar Tab:**
- Monthly/yearly activity view
- Day log modal with session details
- Monthly wrap cards with highlights

### State Management

#### Client State (Zustand + MMKV)

| Store | Purpose | Key State |
|-------|---------|-----------|
| `authStore` | Authentication | user, isAuthenticated, isHydrated |
| `themeStore` | Theme selection | themeName, isHydrated |
| `tagStore` | Tag management | tags, selectedFilters, filterMode (any/all) |
| `preferencesStore` | User preferences | Notification settings, display options |
| `sharedElementStore` | Shared transitions | Source/target element coordinates |
| `toastStore` | Notifications | Toast queue with actions |
| `celebrationStore` | Goal celebrations | Celebration triggers |

#### Server State (TanStack Query)

Query key structure:
```typescript
queryKeys = {
  books: {
    search: (query, filters) => ['books', 'search', query, filters],
    editions: (title, author) => ['books', 'editions', title, author],
  },
  library: {
    all: ['library'],
    externalIds: () => ['library', 'external-ids'],
  },
  stats: {
    all: ['stats'],
    heatmap: () => ['stats', 'heatmap'],
    formatVelocity: () => ['stats', 'format-velocity'],
    // ... more stat queries
  },
  goals: {
    all: ['goals'],
    detail: (id) => ['goals', id],
  },
}
```

### Controller Pattern

Business logic is extracted into `useXxxController()` hooks, keeping screens focused on rendering:

```typescript
// hooks/useLibraryController.ts
export function useLibraryController() {
  const [activeTab, setActiveTab] = useState<BookStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { selectedFilters, filterMode } = useTagFilters();

  // Filter, sort, and transform library data
  const filteredBooks = useMemo(() => { /* ... */ }, [books, activeTab, filters]);

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    filteredBooks,
    // ... more state and actions
  };
}

// screens/LibraryScreen.tsx
export function LibraryScreen() {
  const controller = useLibraryController();
  return <LibraryView {...controller} />;
}
```

---

## Theme System

### Four Available Themes

| Theme | Style | Primary Color | Corners | Rating Icon | Fonts |
|-------|-------|---------------|---------|-------------|-------|
| **Scholar** | Dark Academia | Burgundy (#8b2e2e) | Sharp (1-6px) | Star | Playfair Display, Crimson Text |
| **Dreamer** | Cottagecore | Sage (#7d9a82) | Rounded (8-24px) | Heart | Nunito |
| **Wanderer** | Desert Explorer | Copper (#a86830) | Medium (2-12px) | Compass | Lora |
| **Midnight** | Celestial | Indigo (#6366f1) | Medium (2-12px) | Moon | Lora |

### Theme Structure

Each theme defines:

```typescript
interface Theme {
  name: ThemeName;
  colors: ThemeColors;      // 40+ semantic color tokens
  fonts: ThemeFonts;        // Heading and body font families
  radii: ThemeRadii;        // xs, sm, md, lg, xl, full
  shadows: ThemeShadows;    // Theme-specific shadow styles
  spacing: ThemeSpacing;    // xxs through 2xl
  borders: ThemeBorders;    // Border widths
  icons: {
    rating: 'star' | 'heart' | 'compass' | 'moon';
    progress: 'ink' | 'liquid' | 'trail';
  };
  tagColors: ThemeTagColors; // 10 tag color variants
  isDark: boolean;
}
```

### Semantic Color Tokens

**Always use semantic tokens - never raw colors:**

```tsx
// Correct
<View className="bg-surface text-foreground border-border">

// Wrong - never use raw Tailwind colors
<View className="bg-gray-900 text-white">
```

**Available Token Categories:**

| Category | Tokens |
|----------|--------|
| **Surface** | canvas, surface, surfaceAlt, surfaceHover, muted, elevated, overlay |
| **Foreground** | foreground, foregroundMuted, foregroundSubtle, foregroundFaint |
| **Primary** | primary, primaryHover, primaryDark, primaryGlow |
| **Status** | success, danger, warning (each with subtle variant) |
| **Border** | border, borderHover, borderMuted |
| **Tints** | tintPrimary, tintAccent, tintGreen, tintYellow, tintPeach, tintBeige |

### Technical Implementation

1. **ThemeProvider** reads theme from Zustand store
2. `getThemeCSSVars()` converts theme to CSS variables
3. NativeWind's `vars()` injects variables into React Native
4. Tailwind config maps semantic classes to CSS variables
5. Components use semantic classes that resolve at runtime

```typescript
// Theme colors become CSS variables
--color-surface: #1c1a17
--color-primary: #8b2e2e
--color-foreground: #dcd0c0

// Tailwind classes resolve to variables
className="bg-surface" → backgroundColor: var(--color-surface)
```

### Theme-Specific Animations

Each theme has customized animation behavior:

| Theme | Press Feel | Emphasis | Tilt Effects |
|-------|------------|----------|--------------|
| **Scholar** | Dramatic (damping: 18) | Responsive | Full tilt + skew |
| **Dreamer** | Soft (damping: 28) | Bouncy | Minimal tilt, no skew |
| **Wanderer** | Responsive (damping: 20) | Bouncy | Full tilt + skew |
| **Midnight** | Dramatic (damping: 18) | Responsive | Tilt, no skew |

---

## Component Library

### Component Hierarchy

```
atoms/           → Primitive UI elements
molecules/       → Simple compositions
organisms/       → Complex features
layout/          → Layout primitives
```

### Atomic Components (atoms/)

| Component | Purpose |
|-----------|---------|
| **Text** | Themed typography with variants (h1, h2, h3, body, caption, label) |
| **Pressable** | Haptic-enabled touch wrapper with animations |
| **Button** | Full-featured button (primary, secondary, ghost, danger, outline) |
| **IconButton** | Icon-only button variant |
| **Icon** | Hugeicons wrapper with size/color |
| **Badge** | Status indicator with variants |
| **Divider** | Visual separator line |
| **Progress** | Progress bar with theme-specific styles |

### Molecular Components (molecules/)

| Component | Purpose |
|-----------|---------|
| **Input** | Text input with validation and animations |
| **Rating** | Star/heart/compass display |
| **RatingInput** | Interactive rating selection |
| **Chip** / **ChipGroup** | Interactive tags and filters |
| **Checkbox** / **CheckboxGroup** | Selection controls |
| **RadioGroup** | Mutually exclusive options |
| **SegmentedControl** | Tab switcher with animated indicator |
| **DateSelector** | Date picker |
| **DurationInput** | Time duration input |
| **PageRangeInput** | Page range selector |
| **ProgressSlider** | Interactive progress slider |

### Organism Components (organisms/)

| Component | Purpose |
|-----------|---------|
| **BookHero** | Book cover + title + rating display |
| **BookListItem** | List row with cover, metadata, progress |
| **BookCoverCard** | Grid card with cover and optional physics |
| **CoverImage** | Book cover with shimmer loading |
| **Card** | Container with elevation variants |
| **BaseModal** | Foundation for all modals |
| **BottomSheet** | Slide-up modal |
| **ConfirmModal** | Binary choice dialog |
| **DNFModal** | "Did Not Finish" dialog |
| **ReadingSessionModal** | Session logging form |
| **QuoteCaptureModal** | Quote entry with mood |
| **EditionPickerModal** | Edition selection browser |
| **BarcodeScannerModal** | ISBN barcode scanning |
| **FilterDial** | Horizontal tab filter |
| **FloatingActionButton** | Prominent action button |
| **SpineView** | 3D book spine shelf view |

### Layout Primitives (layout/)

| Component | Purpose |
|-----------|---------|
| **Box** | Flexible container with theme spacing |
| **Row** | Horizontal flex layout |
| **Column** | Vertical flex layout |
| **TabScreenLayout** | Safe area wrapper for tab screens |

### Component Guidelines

**Button Usage:**
```tsx
// Primary actions
<Button variant="primary" onPress={handleSave}>Save Book</Button>

// Secondary actions
<Button variant="secondary" onPress={handleCancel}>Cancel</Button>

// Destructive actions
<Button variant="danger" onPress={handleDelete}>Delete</Button>
```

**Pressable Warning:**
```tsx
// Don't apply layout styles directly to Pressable
<Pressable style={{ padding: 16 }}> {/* Wrong */}

// Wrap content in a View
<Pressable>
  <View style={{ padding: 16 }}> {/* Correct */}
    <Text>Content</Text>
  </View>
</Pressable>
```

**Shared Element Transitions:**
```tsx
// BookListItem and BookCoverCard support shared element transitions
// Managed via sharedElementStore for hero cover animations
<BookListItem
  item={userBook}
  onPress={() => {
    sharedElementStore.setSource({ /* coordinates */ });
    navigation.navigate('BookDetail', { id: userBook.id });
  }}
/>
```

---

## Data & Sync

### WatermelonDB Models

#### Book Model
```typescript
class Book extends Model {
  @field('server_id') serverId: number | null;
  @field('external_id') externalId: string | null;
  @field('external_provider') externalProvider: string | null;
  @field('title') title: string;
  @field('author') author: string;
  @field('cover_url') coverUrl: string | null;
  @field('local_cover_path') localCoverPath: string | null;
  @field('page_count') pageCount: number | null;
  @field('is_pending_sync') isPendingSync: boolean;
  @field('is_deleted') isDeleted: boolean;

  @action async markForSync() { /* ... */ }
  @action async markSynced(serverId: number) { /* ... */ }
  @action async softDelete() { /* ... */ }
}
```

#### UserBook Model
```typescript
class UserBook extends Model {
  @field('server_id') serverId: number | null;
  @field('book_id') bookId: string;
  @field('status') status: BookStatus;
  @field('rating') rating: number | null;
  @field('current_page') currentPage: number;
  @field('is_dnf') isDnf: boolean;
  @field('started_at') startedAt: Date | null;
  @field('finished_at') finishedAt: Date | null;
  @field('is_pending_sync') isPendingSync: boolean;

  @relation('books', 'book_id') book: Relation<Book>;
  @children('reading_sessions') readingSessions: Query<ReadingSession>;

  @action async updateStatus(newStatus: BookStatus) { /* ... */ }
  @action async updateRating(rating: number) { /* ... */ }
  @action async updateProgress(page: number) { /* ... */ }
}
```

### Sync System

#### Three-Phase Sync Process

1. **Upload Pending Covers**: Custom cover images uploaded to CDN
2. **Push Local Changes**: Send all `isPendingSync=true` records
3. **Pull Server Changes**: Fetch changes since `lastPulledAt`

#### Auto-Sync Triggers

| Trigger | Debounce | Purpose |
|---------|----------|---------|
| App foreground | Immediate | Sync when user returns to app |
| Network reconnection | 1 second | Sync after connectivity restored |
| After mutations | 2 seconds | Batch nearby changes |

#### Conflict Resolution

- **Page Count**: Keep the higher value (mobile or server)
- **Status/Dates**: Mobile update takes precedence
- **ID Mapping**: Local IDs mapped to server IDs after push

### Database Hooks

```typescript
// Observe library with real-time updates
const { books, loading } = useLibrary(status);

// Single book observation
const { userBook, book, loading } = useUserBook(id);

// Add book atomically (creates Book + UserBook)
const { addToLibrary } = useAddToLibrary();
await addToLibrary(bookData, 'want_to_read');

// Update book
const { updateStatus, updateRating, updateProgress } = useUpdateUserBook();
await updateStatus(userBookId, 'reading');
```

---

## Design Patterns

### Controller Pattern
Business logic extracted to hooks, screens only render:
```typescript
// Controller handles all logic
const controller = useLibraryController();

// Screen is purely presentational
<LibraryView {...controller} />
```

### Offline-First Pattern
All data stored locally, synced in background:
```typescript
// Mutation marks for sync
await database.write(async () => {
  await userBook.updateStatus('reading');
});

// Background sync triggered
scheduleSyncAfterMutation();
```

### Soft Delete Pattern
Records flagged instead of removed:
```typescript
// Soft delete
await userBook.softDelete(); // Sets isDeleted = true, isPendingSync = true

// Queries exclude deleted
Q.where('is_deleted', false)
```

### Observer Pattern (RxJS)
Real-time database subscriptions:
```typescript
// Hook subscribes to changes
const { books } = useLibrary();

// Updates automatically when data changes
// Unsubscribes on unmount
```

### Optimistic UI Pattern
Update UI before server confirmation:
```typescript
// Update local immediately
await updateUserBook(id, { status: 'read' });

// Sync happens in background
// Rollback on error (handled by sync adapter)
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout (auth required) |
| POST | `/api/auth/forgot-password` | Send reset link |
| POST | `/api/auth/reset-password` | Reset with token |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get current user |
| PATCH | `/api/user` | Update profile |
| PATCH | `/api/user/password` | Change password |
| PATCH | `/api/user/theme` | Update theme |
| POST | `/api/user/avatar` | Upload avatar |
| DELETE | `/api/user/avatar` | Remove avatar |
| PATCH | `/api/user/preferences` | Update preferences |
| GET | `/api/user/export` | Export library data |
| POST | `/api/user/import` | Import from Goodreads |
| DELETE | `/api/user` | Delete account |

### Book Search Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books/search` | Search books (Google Books) |
| GET | `/api/books/editions` | Get editions by title/author |
| GET | `/api/books/{book}` | Get book details |

### Library Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/library` | Get user's library |
| POST | `/api/library` | Add book to library |
| GET | `/api/library/{userBook}` | Get single entry |
| PATCH | `/api/library/{userBook}` | Update book |
| DELETE | `/api/library/{userBook}` | Remove from library |
| GET | `/api/library/external-ids` | Map external IDs to status |
| PATCH | `/api/library/reorder` | Reorder TBR queue |
| PATCH | `/api/library/{userBook}/pin` | Pin as featured |
| DELETE | `/api/library/{userBook}/pin` | Unpin |

### Session Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Get sessions |
| POST | `/api/sessions` | Log new session |

### Tag Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | List tags |
| POST | `/api/tags` | Create tag |
| PATCH | `/api/tags/{tag}` | Update tag |
| DELETE | `/api/tags/{tag}` | Delete tag |
| GET | `/api/tags/colors` | List colors |
| POST | `/api/library/{userBook}/tags` | Sync tags |
| POST | `/api/library/{userBook}/tags/{tag}` | Attach tag |
| DELETE | `/api/library/{userBook}/tags/{tag}` | Detach tag |

### Goal Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | Get active goals |
| POST | `/api/goals` | Create/update goal |
| PATCH | `/api/goals/{goal}` | Update goal |
| DELETE | `/api/goals/{goal}` | Delete goal |
| GET | `/api/goals/types` | Get goal types |
| GET | `/api/goals/periods` | Get periods |
| POST | `/api/goals/recalculate` | Recalculate all |

### Stats Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Basic stats |
| GET | `/api/stats/heatmap` | Activity heatmap |
| GET | `/api/stats/format-velocity` | Pages/hour by format |
| GET | `/api/stats/mood-ring` | Tag & genre breakdown |
| GET | `/api/stats/dnf-analytics` | DNF patterns |
| GET | `/api/stats/page-economy` | Cost-per-hour analysis |
| GET | `/api/stats/calendar` | Day-by-day activity |

### Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync/pull` | Fetch changes since timestamp |
| POST | `/api/sync/push` | Push local changes |
| POST | `/api/sync/upload-cover` | Upload custom cover |

### API Response Format

**Important**: Backend uses `JsonResource::withoutWrapping()` - responses return data directly without a `data` wrapper:

```typescript
// Mobile - NO .data unwrapping needed
const tags = await apiClient<Tag[]>('/tags');           // Returns Tag[] directly
const book = await apiClient<UserBook>('/library/1');   // Returns UserBook directly
```

---

## Development Commands

### Backend (Laravel)

```powershell
cd backend
composer setup          # Initial setup
composer dev            # Run server + queue + logs + vite
composer test           # Run PHPUnit tests
php artisan pint        # Code formatting
```

### Mobile (Expo)

```powershell
cd mobile
npm start               # Start Expo dev server
npm run android         # Run on Android
npm run ios             # Run on iOS simulator
npm test                # Run Jest tests
npm run test:watch      # Watch mode
```

---

## Code Style Requirements

### Backend (PHP/Laravel)

- `declare(strict_types=1)` on all PHP files
- PHPDoc blocks and full type hints required
- No `$fillable` property on models (globally unguarded)
- Use PHP enums for status values
- No inline comments (use PHPDoc instead)
- Service classes for external APIs

### Mobile (TypeScript/React Native)

- Use path alias `@/` for imports from `src/`
- Controller hooks pattern for business logic
- Component hierarchy: atoms → molecules → organisms
- Icons via Hugeicons
- Always use semantic color tokens
- Never add inline comments (JSDoc only when needed)

---

*Generated from codebase analysis - January 2026*
