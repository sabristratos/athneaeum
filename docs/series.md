# Series Feature Documentation

## Overview

The Series feature allows users to organize books into series/collections, track reading progress across volumes, and receive suggestions for the next book in a series. It supports automatic detection from Google Books metadata and manual series assignment.

---

## 1. Data Structure

### Series Model (Backend: `backend/app/Models/Series.php`)

A series represents a collection of related books (e.g., "The Lord of the Rings", "Harry Potter").

**Database Fields:**
```php
Schema::create('series', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->string('author');
    $table->string('external_id')->nullable();      // Google Books series ID
    $table->unsignedInteger('total_volumes')->nullable();
    $table->boolean('is_complete')->default(false);
    $table->text('description')->nullable();
    $table->timestamps();

    $table->unique(['title', 'author']);
});
```

### Book-Series Relationship

Books table includes series reference fields:

```php
$table->foreignId('series_id')->nullable()->constrained()->nullOnDelete();
$table->unsignedInteger('volume_number')->nullable();
$table->string('volume_title')->nullable();  // e.g., "The Fellowship of the Ring"
```

### Mobile WatermelonDB Models

**Series Model** (`mobile/src/database/models/Series.ts`):
```typescript
tableSchema({
  name: 'series',
  columns: [
    { name: 'server_id', type: 'number', isOptional: true, isIndexed: true },
    { name: 'title', type: 'string' },
    { name: 'author', type: 'string' },
    { name: 'total_volumes', type: 'number', isOptional: true },
    { name: 'is_complete', type: 'boolean' },
    { name: 'is_pending_sync', type: 'boolean' },
    { name: 'is_deleted', type: 'boolean' },
  ],
})
```

**Book Model additions:**
```typescript
{ name: 'series_id', type: 'string', isOptional: true, isIndexed: true },
{ name: 'server_series_id', type: 'number', isOptional: true },
{ name: 'volume_number', type: 'number', isOptional: true },
{ name: 'volume_title', type: 'string', isOptional: true },
```

---

## 2. Series Detection

### Automatic Detection (Google Books)

When adding a book from search, the app parses Google Books metadata for series indicators:

**Sources Checked:**
1. `volumeInfo.seriesInfo` - Primary series data (when available)
2. Subtitle parsing - Patterns like "Book 1", "Vol. 2", "#3"
3. Title parsing - "Title (Series Name #1)"

**Pattern Detection:**
```typescript
const SERIES_PATTERNS = [
  /\(([^)]+)\s*#(\d+)\)/,           // "(Series Name #1)"
  /\(([^)]+),?\s*Book\s*(\d+)\)/i,  // "(Series Name, Book 1)"
  /,?\s*Book\s*(\d+)$/i,             // "Title, Book 1"
  /,?\s*Vol\.?\s*(\d+)$/i,           // "Title, Vol. 2"
];
```

### Series Suggest Modal

When adding a book with detected series info, the `SeriesSuggestModal` prompts users:

1. Shows detected series name and volume number
2. Offers to match with existing series in library
3. Allows creating a new series entry
4. Can skip series assignment

---

## 3. Manual Series Assignment

### From Book Detail Screen

The Info tab includes a "Series" section:
- **Unassigned books**: Shows "Tap to add to series"
- **Assigned books**: Shows series name and volume number with edit capability

Tapping opens the `SeriesAssignModal`:

### SeriesAssignModal Features

1. **Search existing series** - Filter from user's series list
2. **Select series** - Pick from search results
3. **Create new series** - Name + author input
4. **Set volume number** - Numeric input
5. **Remove from series** - Unassign current book

```tsx
<SeriesAssignModal
  visible={showSeriesAssignModal}
  onClose={handleCloseSeriesAssignModal}
  onSuccess={handleSeriesAssignSuccess}
  book={book}
  currentSeries={book.series ?? null}
  currentVolumeNumber={book.volume_number ?? null}
/>
```

---

## 4. Series Group View

The Library screen supports grouping books by series:

### View Mode Toggle
When filtering by series, books display grouped under their series header:

```tsx
// LibraryScreen.tsx - Group by series option
<ViewModeToggle
  mode={viewMode}
  onModeChange={setViewMode}
  showSeriesGroup={true}
/>
```

### SeriesGroupView Component

Renders books organized by series with:
- Series header (title, author, progress)
- Volume list sorted by volume_number
- Read/unread indicators per volume
- "View All" link to SeriesDetailScreen

---

## 5. Series Detail Screen

Dedicated screen showing all volumes in a series:

### Header Section
- Series title and author
- Progress summary: "3 of 7 read"
- Completion status badge

### Volume List
- All books in series sorted by volume_number
- Cover, title, volume number for each
- Status indicators (read, reading, TBR, not in library)
- Add missing volumes from search

### Navigation
```tsx
navigation.navigate('SeriesDetail', { seriesId: series.id });
```

---

## 6. Next in Series

When finishing a volume, the app suggests the next book:

### Detection Logic
```typescript
function getNextInSeries(
  currentBook: Book,
  userLibrary: UserBook[]
): Book | null {
  if (!currentBook.series_id || !currentBook.volume_number) return null;

  const nextVolumeNumber = currentBook.volume_number + 1;

  // Check if next volume exists in library
  return userLibrary.find(ub =>
    ub.book.series_id === currentBook.series_id &&
    ub.book.volume_number === nextVolumeNumber
  )?.book ?? null;
}
```

### UI Integration
- "Next in Series" card appears on book detail after finishing
- Shown in On-Deck Queue when relevant
- Links directly to next volume's detail screen

---

## 7. API Endpoints

### Series Management
```
GET    /series                     - List user's series (with books)
GET    /series/{series}            - Get series with all volumes
POST   /series                     - Create new series
PATCH  /series/{series}            - Update series details
DELETE /series/{series}            - Delete series (nullifies book FKs)
```

### Book-Series Assignment
```
POST   /series/{series}/books      - Assign book to series
DELETE /series/{series}/books      - Remove book from series
```

### Request/Response Examples

**Create Series:**
```json
POST /series
{
  "title": "The Lord of the Rings",
  "author": "J.R.R. Tolkien",
  "total_volumes": 3,
  "is_complete": true
}
```

**Assign to Series:**
```json
POST /series/45/books
{
  "series_id": 45,
  "volume_number": 1,
  "volume_title": "The Fellowship of the Ring"
}
```

---

## 8. React Query Hooks

### Series Queries (`mobile/src/queries/useSeries.ts`)

```typescript
// List all series
const { data: series } = useSeriesQuery(searchQuery);

// Get series details with books
const { data: seriesDetail } = useSeriesDetailQuery(seriesId);

// Smart series matching (for auto-suggest)
const { matches, bestMatch } = useFindMatchingSeries('Lord of the Rings');
// Returns confidence levels: 'exact' | 'high' | 'medium'
```

### Series Mutations

```typescript
// Assign book to series
const assignMutation = useAssignBookToSeriesMutation();
await assignMutation.mutateAsync({
  bookId: 123,
  seriesId: 45,
  volumeNumber: 1,
  volumeTitle: 'The Fellowship of the Ring',
});

// Remove book from series
const removeMutation = useRemoveBookFromSeriesMutation();
await removeMutation.mutateAsync({ bookId: 123 });

// Create new series
const createMutation = useCreateSeriesMutation();
const newSeries = await createMutation.mutateAsync({
  title: 'Mistborn',
  author: 'Brandon Sanderson',
});
```

---

## 9. Key Files

### Backend
- `backend/app/Models/Series.php`
- `backend/app/Http/Controllers/Api/SeriesController.php`
- `backend/app/Http/Resources/SeriesResource.php`
- `backend/database/migrations/xxxx_create_series_table.php`
- `backend/database/migrations/xxxx_add_series_to_books.php`

### Mobile
- `mobile/src/database/models/Series.ts`
- `mobile/src/queries/useSeries.ts`
- `mobile/src/features/library/SeriesDetailScreen.tsx`
- `mobile/src/features/library/components/SeriesGroupView.tsx`
- `mobile/src/components/organisms/modals/SeriesSuggestModal.tsx`
- `mobile/src/components/organisms/modals/SeriesAssignModal.tsx`

---

## 10. Sync Behavior

Series data syncs with the standard offline-first pattern:

```typescript
// Pull changes includes series
const pullChanges = async (lastPulledAt: number) => {
  const response = await apiClient('/sync/pull', {
    params: { last_pulled_at: lastPulledAt }
  });
  // response.series contains server series data
};

// Push changes includes series assignments
const pushChanges = async (changes: SyncChanges) => {
  await apiClient('/sync/push', {
    method: 'POST',
    body: changes // Includes book.series_id updates
  });
};
```
