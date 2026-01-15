# Search Feature Documentation

## Overview

The Search feature is a comprehensive book discovery system that allows users to search via Google Books and (optionally) an OPDS catalog, apply advanced filters, and seamlessly add results to their library.

---

## 1. Google Books API Integration

### Service Architecture

**Location:** `backend/app/Services/BookSearch/GoogleBooksService.php`

The `GoogleBooksService` implements the `BookSearchServiceInterface`:

```php
public function search(
    string $query,
    int $limit = 20,
    int $startIndex = 0,
    ?string $langRestrict = null,
    ?array $genres = null,
    ?float $minRating = null,
    ?int $yearFrom = null,
    ?int $yearTo = null
): array
```

**Configuration:**
- **Base URL:** `https://www.googleapis.com/books/v1/volumes`
- **API Key:** `config('services.google_books.key')`
- **Max Results per Request:** 40 items
- **Request Timeout:** 15 seconds
- **Cache TTL:** 15 minutes

### Dual-Query Strategy

The service uses an intelligent two-pronged search approach:

1. **Title Search** - Uses `intitle:` operator for exact title matches
2. **Regular Search** - Uses Google's relevance ranking

Results are merged, deduplicated, and re-ranked using a custom scoring algorithm.

### ISBN Detection

Automatically detects ISBN queries:
- **ISBN-13:** Format like 978-0-123456-78-X
- **ISBN-10:** Format like 0-123456-78-X
- Uses `isbn:` prefix for precise lookups

### Metadata Extraction

Transforms Google Books API responses:
- `external_id` - Google Books ID
- `title`, `author` - Book metadata
- `cover_url` - HTTPS URL (auto-upgraded)
- `page_count`, `isbn`, `description`, `genres`
- `published_date` - Normalized to YYYY-MM-DD
- `average_rating`, `ratings_count`
- `height_cm`, `width_cm`, `thickness_cm` - Dimensions

---

## 2. Scoring System

The service uses a multi-factor scoring algorithm:

### Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Rating Score | 40% | Based on average rating and review count |
| Title Match | 30% | Exact match (1.0), contains (0.85), word overlap (0.7) |
| Relevance | 15% | Position in Google's results |
| Completeness | 15% | Metadata quality (cover, description, ISBN, page count) |

### Calculation Example
```php
$ratingScore = $this->calculateRatingScore($book);
$titleScore = $this->calculateTitleMatchScore($book['title'], $query);
$relevanceScore = ($total - $position) / $total;
$completenessScore = /* cover + description + isbn + pageCount presence */;

$finalScore = $ratingScore * 0.4
            + $titleScore * 0.3
            + $relevanceScore * 0.15
            + $completenessScore * 0.15;
```

---

## 3. Filter Options

### Language Filter
- English (Default), All Languages
- Spanish, French, German, Italian, Portuguese
- Japanese, Chinese, Korean, Russian, Arabic

### Genre Filter (12 options)
Fiction, Fantasy, Romance, Mystery, Science Fiction, Biography, History, Self-Help, Thriller, Horror, Young Adult, Non-Fiction

### Rating Filter
- Any (0), 3+, 4+, 4.5+

### Year Range Filter
- `yearFrom` - Earliest publication year (min: 1800)
- `yearTo` - Latest publication year (max: current year)

---

## 4. Caching Strategy

**Cache Key Generation:**
```php
$key = 'books.search.' . md5(serialize([
    $query, $limit, $startIndex,
    $langRestrict, $genres, $minRating,
    $yearFrom, $yearTo
]));
```

- TTL: 15 minutes
- Each unique parameter combination has its own cache entry

---

## 5. API Endpoints

### Search Books
```
GET /api/books/search
Parameters:
  - query (required, 2-255 chars)
  - limit (optional, 1-40, default: 20)
  - start_index (optional, default: 0)
  - lang (optional, language code)
  - genres (optional, comma-separated)
  - min_rating (optional, 0-5)
  - year_from, year_to (optional)
  - source (optional: google | opds | both)

Response:
{
  "items": SearchResult[],
  "total": number,
  "start_index": number,
  "has_more": boolean,
  "provider": "google_books"
}
```

If `source` includes `opds`, the user must have OPDS settings configured via the user OPDS endpoints.

### Get Book Editions
```
GET /api/books/editions
Parameters:
  - title (required)
  - author (required)

Response:
{
  "items": SearchResult[],
  "total": number
}
```

---

## 6. Mobile Implementation

### Query Hooks

**useBookSearchQuery** - Single page search
```typescript
const { data, isLoading, error } = useBookSearchQuery(query, filters);
```

**useInfiniteBookSearchQuery** - Infinite scroll pagination
```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useInfiniteBookSearchQuery(query, filters);

// data.results = all items across pages
// data.meta = metadata from last page
```

### SearchController Hook

**Location:** `mobile/src/features/search/hooks/useSearchController.ts`

```typescript
interface UseSearchControllerReturn {
  query: string;
  setQuery: (query: string) => void;
  addingId: string | null;
  addedIds: Set<string>;
  libraryMap: Record<string, LibraryExternalIdEntry>;
  activeFilterCount: number;
  results: SearchResult[];
  meta: SearchMeta | undefined;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  handleAddToLibrary: (book, status) => Promise<void>;
  handleEndReached: () => void;
  refresh: () => Promise<void>;
}
```

---

## 7. Search Screen Layout

```
SafeAreaView
├─ Search Header
│  ├─ TextInput (placeholder: "Search by title, author, or ISBN...")
│  ├─ Barcode Scanner Button
│  └─ SearchFilterPanel (Expandable)
│     ├─ GenreChips (horizontal scroll)
│     ├─ MinRating RadioGroup
│     ├─ YearRangeInput
│     └─ Language RadioGroup
│
├─ Results List (FlatList)
│  ├─ SearchResultCard (repeated)
│  │  ├─ Cover image
│  │  ├─ Title, Author
│  │  ├─ Rating, Page count, Year
│  │  ├─ Genre badges
│  │  ├─ Status badge (if in library)
│  │  └─ Quick-add buttons
│  └─ LoadMoreFooter
│
└─ Modals
   ├─ ManualBookEntryModal
   ├─ BarcodeScannerModal
   └─ EditionPickerModal
```

---

## 8. Adding Books to Library

### Flow
1. User taps "Want to Read" or "Reading" on SearchResultCard
2. If multiple editions exist, EditionPickerModal opens
3. `handleAddToLibrary()` maps SearchResult to AddToLibraryData
4. Book is added locally (offline-first) and marked for sync
5. Background sync pushes changes to the backend via `/api/sync/push`
6. Haptic feedback + toast with "View" action

### Data Mapping
```typescript
const addData: AddToLibraryData = {
  external_id: book.external_id,
  external_provider: 'google_books',
  title: book.title,
  author: book.author,
  cover_url: book.cover_url,
  page_count: book.page_count,
  // ... dimensions, isbn, description, genres
  status: 'want_to_read',
};
```

The backend receives these changes as part of the sync payload (`POST /api/sync/push`).

---

## 9. Recent Searches

**Location:** `mobile/src/stores/recentSearchesStore.ts`

- Zustand store with MMKV persistence
- Stores array of search query strings
- Only stores searches that yield results
- Displayed when no active search query

---

## 10. Key Files

### Backend
- `backend/app/Services/BookSearch/GoogleBooksService.php`
- `backend/app/Http/Controllers/Api/BookController.php`
- `backend/app/Contracts/BookSearchServiceInterface.php`

### Mobile
- `mobile/src/features/search/SearchScreen.tsx`
- `mobile/src/features/search/hooks/useSearchController.ts`
- `mobile/src/features/search/components/SearchResultCard.tsx`
- `mobile/src/features/search/components/SearchFilterPanel.tsx`
- `mobile/src/features/search/components/GenreChips.tsx`
- `mobile/src/features/search/components/YearRangeInput.tsx`
- `mobile/src/queries/useBookSearch.ts`
- `mobile/src/api/books.ts`
- `mobile/src/stores/recentSearchesStore.ts`
