# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Digital Athenaeum is a book tracking mobile app with multi-theme aesthetics (Dark Academia "Scholar" / Cottagecore "Dreamer" / Desert "Wanderer"). It's a monorepo with a Laravel API backend and Expo React Native mobile frontend.

```
athenaeum/
├── backend/           # Laravel 12 API
└── mobile/            # Expo React Native app (see mobile/CLAUDE.md for details)
```

## Development Commands

### Backend (Laravel)
```powershell
cd backend
composer setup          # Initial setup: install, env, key, migrate, npm
composer dev            # Run server + queue + logs + vite concurrently
composer test           # Run PHPUnit tests
php artisan test --filter=TestName  # Run single test
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

## Architecture

### Backend Stack
- **Framework**: Laravel 12 with Sanctum token auth
- **Database**: SQLite (dev), PostgreSQL (production)
- **API Pattern**: RESTful under `/api/` with `auth:sanctum` middleware

### Mobile Stack
- **Framework**: Expo 54, React 19, TypeScript
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **Styling**: NativeWind 4 (Tailwind CSS for React Native) with CSS variables
- **Local Database**: WatermelonDB with SQLite (offline-first)
- **Server State**: TanStack Query
- **Client State**: Zustand stores persisted to MMKV
- **Auth Storage**: expo-secure-store for tokens

### Provider Hierarchy (Mobile)
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

## Theme System

Four complete visual themes switchable at runtime:

| Theme    | Style          | Primary   | Corners | Rating Icon |
|----------|----------------|-----------|---------|-------------|
| Scholar  | Dark Academia  | Burgundy  | Sharp   | Star        |
| Dreamer  | Cottagecore    | Lavender  | Rounded | Heart       |
| Wanderer | Desert/Travel  | Gold      | Medium  | Compass     |
| Midnight | Celestial      | Indigo    | Medium  | Moon        |

Theme colors are CSS variables set by `ThemeProvider`, referenced in Tailwind config.

**Always use semantic color tokens** - never raw Tailwind colors:
```tsx
// Correct
<View className="bg-surface text-foreground border-border">

// Wrong
<View className="bg-gray-900 text-white">
```

### Adding a Theme
1. Create `mobile/src/themes/themes/mytheme.ts` implementing `Theme` interface
2. Export from `mobile/src/themes/themes/index.ts`
3. Add to `ThemeName` union in `mobile/src/types/theme.ts`

## API Response Format

**Important**: Backend uses `JsonResource::withoutWrapping()` - responses return data directly without a `data` wrapper.

```php
// Controller
return new UserBookResource($userBook);
return TagResource::collection($tags);
```

```tsx
// Mobile - NO .data unwrapping needed
const tags = await apiClient<Tag[]>('/tags');           // Returns Tag[] directly
const book = await apiClient<UserBook>('/library/1');   // Returns UserBook directly
```

## Offline-First Sync (Mobile)

WatermelonDB models use soft deletes (`is_deleted`) and pending sync flags (`is_pending_sync`). After mutations:
```tsx
import { scheduleSyncAfterMutation } from '@/database/sync';

await database.write(async () => {
  await userBook.updateStatus('reading');
});
scheduleSyncAfterMutation(); // Triggers background sync
```

## Backend Code Patterns

- `declare(strict_types=1)` on all PHP files
- PHPDoc blocks and type hints required
- No `$fillable` property on models (globally unguarded via `Model::unguard()`)
- Modify original migrations instead of creating new ones, then `migrate:fresh --seed`
- Use PHP enums for status values (e.g., `BookStatusEnum`)
- Service classes for external APIs (e.g., `GoogleBooksService`)
- No inline comments unless necessary

## Mobile Code Patterns

- Use path alias `@/` for imports from `src/`
- Controller hooks pattern: business logic in `useXxxController.ts`, screens just render
- Component hierarchy: atoms → molecules → organisms
- Icons via Hugeicons: `import { Book01Icon } from '@hugeicons/core-free-icons'`
- Never add inline comments - only JSDoc blocks when needed

### Component Usage
See `mobile/CLAUDE.md` for detailed component guidelines including:
- Button component (always use for interactive buttons)
- Custom Pressable limitations (use native Pressable for absolute positioning)
- Theme value access via hooks

## Key Files

- `mobile/CLAUDE.md` - Detailed mobile development guide
- `mobile/src/themes/themes/` - Theme definitions
- `mobile/src/database/models/` - WatermelonDB models (Book, UserBook, ReadingSession, ReadThrough, Series, Tag, SyncMetadata)
- `mobile/src/stores/` - Zustand stores (authStore, themeStore, tagStore, preferencesStore, etc.)
- `backend/routes/api.php` - API route definitions
- `backend/app/Providers/AppServiceProvider.php` - Model config, rate limiters
- `backend/app/Services/Stats/` - Statistics and analytics services

---

## Feature Documentation

### Re-Reading Support

Track multiple readings of the same book with separate ratings/reviews for each.

**Backend Model**: `ReadThrough` with columns: `user_book_id`, `read_number`, `started_at`, `finished_at`, `rating`, `review`, `status`, `is_dnf`, `dnf_reason`

**API Endpoints**:
- `PATCH /library/{userBook}/reread` - Start a new read-through
- `PATCH /read-throughs/{readThrough}` - Update a specific read-through (rating, review)
- `GET /library/{userBook}/history` - Get reading history with all read-throughs

**Key Relationships**:
- `UserBook` hasMany `ReadThrough`
- `ReadThrough` hasMany `ReadingSession`
- Each session is linked to a specific read-through

**ReadingSession Model**: `user_book_id`, `read_through_id`, `date`, `pages_read`, `start_page`, `end_page`, `duration_seconds`, `notes`

### Series Support

Group books into series/collections with volume tracking and ordering.

**Backend Model**: `Series` with columns: `title`, `author`, `external_id`, `external_provider`, `total_volumes`, `is_complete`, `description`

**Book Model Extensions**: Added `series_id`, `volume_number`, `volume_title`, `isbn13`, `publisher` columns

**API Endpoints**:
- `GET /series?search={query}` - List all series with book counts
- `GET /series/{series}` - Get series detail with all books
- `POST /series` - Create new series
- `PATCH /series/{series}` - Update series metadata
- `DELETE /series/{series}` - Delete series
- `POST /series/{series}/books` - Assign book to series with volume number
- `DELETE /series/{series}/books` - Remove book from series

**Mobile Hooks** (`src/queries/useSeries.ts`):
- `useSeriesQuery(search?)` - List series
- `useSeriesDetailQuery(seriesId)` - Single series with books
- `useCreateSeriesMutation()` - Create new series
- `useUpdateSeriesMutation()` - Update series metadata
- `useDeleteSeriesMutation()` - Delete series
- `useAssignBookToSeriesMutation()` - Add book to series
- `useRemoveBookFromSeriesMutation()` - Remove book from series
- `useFindMatchingSeries(name)` - Smart matching with confidence levels ('exact' | 'high' | 'medium')

### Tags System

User-created tags for categorizing books with color-coding.

**Backend Model**: `Tag` with columns: `name`, `slug`, `color` (enum), `emoji`, `is_system`, `sort_order`, `user_id`

**Pivot Table**: `user_book_tag` for many-to-many relationship

**Colors**: `TagColorEnum` with 10 options: Primary, Gold, Green, Purple, Copper, Blue, Orange, Teal, Rose, Slate

**API Endpoints**:
- `GET /tags` - List user's tags with book counts
- `GET /tags/colors` - List available tag colors
- `POST /tags` - Create tag
- `PATCH /tags/{tag}` - Update tag
- `DELETE /tags/{tag}` - Delete tag
- `POST /library/{userBook}/tags` - Sync tags on a book

**Mobile State** (`stores/tagStore.ts`):
- Zustand store persisted to MMKV
- Tag filtering with 'any'/'all' modes (OR/AND logic)
- Recently used tag tracking (max 5)
- Undo delete with 5-second window
- Hooks: `useTags()`, `useTagActions()`, `useTagFilters()`, `useRecentlyUsedTags()`

**Note**: Tags are primarily fetched from the API. The WatermelonDB `Tag` model stores minimal fields (`name`, `color`) for offline display, while the full tag data (including `slug`, `emoji`, `is_system`) comes from API responses.

### User Preferences (Favorites/Excludes)

Personalize discovery with favorite and excluded authors, genres, and series.

**Backend Model**: `UserPreference` with columns: `user_id`, `category`, `type`, `value`, `normalized`

**Enums**:
- `PreferenceCategoryEnum`: Author, Genre, Series
- `PreferenceTypeEnum`: Favorite, Exclude

**API Endpoints**:
- `GET /preferences` - Get all preferences grouped by type/category
- `GET /preferences/list` - Get flat list with full details
- `GET /preferences/options` - Get available categories and types
- `POST /preferences` - Add a single preference
- `DELETE /preferences/{id}` - Remove a preference
- `POST /preferences/batch` - Add multiple preferences
- `DELETE /preferences/batch` - Remove multiple preferences

**Search Integration**:
- Excluded authors/genres are automatically filtered from search results
- Filtering happens in `BookSearchManager::search()` after fetching results
- Uses normalized (lowercase) matching for case-insensitive comparisons

**Mobile Hooks** (`queries/usePreferences.ts`):
- `usePreferencesQuery()` - Get grouped preferences
- `useAddPreferenceMutation()` - Add with optimistic updates
- `useRemovePreferenceByValueMutation()` - Remove by value
- `useFavoriteAuthors()`, `useExcludedAuthors()` - Convenience hooks
- `useFavoriteGenres()`, `useExcludedGenres()` - Convenience hooks

**Mobile Screen**: `PreferencesScreen.tsx` in `features/settings/`

### Reading Goals

Flexible reading targets with multiple goal types and periods.

**Backend Model**: `ReadingGoal` with columns: `type`, `period`, `target`, `current_value`, `year`, `month`, `week`, `is_active`

**Enums**:
- `GoalTypeEnum`: Books, Pages, Minutes, Streak
- `GoalPeriodEnum`: Daily, Weekly, Monthly, Yearly

**API Endpoints**:
- `GET /goals` - List active goals
- `POST /goals` - Create/update goal
- `PATCH /goals/{goal}` - Update goal target
- `DELETE /goals/{goal}` - Delete goal
- `POST /goals/recalculate` - Recalculate all goal progress

**Computed Properties**:
- `progressPercentage` - Current value / target
- `isOnTrack` - Compares current vs expected progress based on elapsed time
- `remaining` - How much more needed

### Import Functionality

Bulk import books from external sources.

**Supported Sources**: Goodreads CSV export

**Backend Architecture**:
- `ImportController` - Handles file upload
- `GoodreadsImportService` - CSV parsing and data mapping
- DTOs: `ImportOptions`, `ImportResult`

**Goodreads Import Features**:
- Maps Goodreads shelf names to `BookStatusEnum`
- Extracts: ISBN, page count, publication year, rating, review
- Optional: `importTags` (convert shelves to tags), `importReviews`, `enrichmentEnabled`
- Returns counts: imported, skipped, errors

**API Endpoints**:
- `GET /user/import/sources` - List supported import sources
- `POST /user/import` - Upload and import file

### Statistics System

Pre-aggregated user reading statistics with advanced analytics.

**Backend Models**: `UserStatistics`, `UserStatisticsMonthly`

**Backend Services**: `ReaderDNAService` for advanced analytics calculations

**Tracked Metrics**:
- Totals: books_read, pages_read, reading_seconds, books_dnf, sessions, spent
- Time-based: This year/month stats
- Streaks: current_streak, longest_streak, last_reading_date
- Averages: pages per hour, pages per session, session minutes
- Distributions: by hour, day of week, month, genres, formats, authors

**API Endpoints**:
- `GET /stats` - Main statistics overview
- `GET /stats/heatmap` - Reading activity heatmap (365-day visualization)
- `GET /stats/format-velocity` - Format reading speeds comparison
- `GET /stats/calendar?year={year}&month={month}` - Calendar view of reading activity
- `GET /stats/mood-ring` - Tag/genre breakdown ("reader mood")
- `GET /stats/dnf-analytics` - DNF patterns and abandonment analysis
- `GET /stats/page-economy` - Pages read per format/genre analysis

### Profile & Settings

Enhanced user profile management.

**Backend Endpoints**:
- `GET /user` - Current user profile
- `PATCH /user` - Update name, bio
- `PATCH /user/password` - Change password
- `PATCH /user/theme` - Set preferred theme
- `POST /user/avatar` - Upload avatar
- `PATCH /user/preferences` - Update reading preferences
- `GET /user/export` - Export all user data
- `DELETE /user` - Delete account

**Mobile Screens** (`src/features/profile/`, `src/features/settings/`):
- `ProfileScreen.tsx` - Main profile hub
- `EditProfileScreen.tsx` - Edit name, bio, avatar
- `ChangePasswordScreen.tsx` - Password change
- `ReadingGoalsScreen.tsx` - Goal management
- `TagManagementScreen.tsx` - Tag CRUD
- `OPDSSettingsScreen.tsx` - OPDS server configuration

### OPDS Integration

Connect to OPDS (Open Publication Distribution System) servers for book discovery and metadata.

**User Model Extensions**: `opds_server_url`, `opds_username`, `opds_password` (encrypted), `preferred_search_source`

**Search Sources**: `SearchSourceEnum` with values: `google`, `opds`

**API Endpoints**:
- `GET /user/opds` - Get current OPDS settings
- `PATCH /user/opds` - Update OPDS server configuration
- `POST /user/opds/test` - Test OPDS connection
- `DELETE /user/opds` - Clear OPDS settings

**Backend Service**: `OPDSService` for OPDS catalog parsing and book search

**Mobile Screen**: `OPDSSettingsScreen.tsx` in `features/settings/`

---

## Database Relationships Overview

```
User
├── ReadingGoals (1:many)
├── Tags (1:many)
├── UserStatistics (1:1)
├── UserBooks (1:many)
│   ├── ReadThroughs (1:many)
│   │   └── ReadingSessions (1:many)
│   └── Tags (many:many via user_book_tag)
└── Books (many:many via user_books)
    └── Series (many:1)
```
