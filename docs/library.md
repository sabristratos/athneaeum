# Library Feature Documentation

## Overview

The Library feature is the core of the Digital Athenaeum, allowing users to manage their personal book collection with multiple view modes, status-based organization, tag filtering, and detailed book tracking.

---

## 1. Data Structure

### Book vs UserBook Model

The library system uses a two-model approach separating book metadata from user-specific relationships:

**Book Model** (Backend: `backend/app/Models/Book.php`)
- Stores canonical book information sourced from external APIs (Google Books) or manual entry
- Fields: title, author, cover_url, page_count, isbn, description, genres, published_date, dimensions
- External references: external_id, external_provider
- Immutable metadata reused across users

**UserBook Model** (Backend: `backend/app/Models/UserBook.php`)
- User's personal relationship with a book - unique per user+book combination
- Status field: want_to_read, reading, read, dnf (Did Not Finish)
- Reading tracking: current_page, started_at, finished_at, progress_percentage
- User metadata: rating, is_dnf, dnf_reason, review, price, format
- Queue management: queue_position, is_pinned

**Mobile WatermelonDB Models:**
- Mirrors backend structure with `is_pending_sync` and `is_deleted` flags
- Enables offline-first operations with background sync

---

## 2. View Modes

The library screen supports **4 distinct view modes**:

### List View (Default)
- Vertical scrolling list with FlashList for performance
- Shows: cover thumbnail, title, author, reading progress bar
- Supports scroll physics with tilt/skew effects

### Grid View
- 3-column cover grid
- Shows book covers with optional title and author
- Groups into shelf rows with shelf rail visualization

### Spine View (Bookshelf)
- Renders books as spines lined up on a shelf
- Mimics physical library shelves
- Each spine shows: book color, title (vertical text), spine width based on thickness

### TBR Stack View
- Unique to want_to_read tab only
- Renders up to 4 books in a stacked configuration
- Top card interactive: swipe left (start reading), swipe right (read later), tap (details)

---

## 3. Tab Filtering (Status-Based)

The library screen has **5 primary tabs** filtering by BookStatus:

| Tab | Filter | Description |
|-----|--------|-------------|
| All | - | All books regardless of status |
| Reading | `reading` | Currently being read |
| TBR | `want_to_read` | To Be Read - shows stack view option |
| Read | `read` | Completed books |
| DNF | `dnf` | Did Not Finish |

**Status Enum Values:**
```php
WantToRead = 'want_to_read'
Reading = 'reading'
Read = 'read'
Dnf = 'dnf'
```

**Automatic Timestamps:**
- When status → Reading: auto-set `started_at`
- When status → Read: auto-set `finished_at`, `current_page = page_count`
- When status → Dnf: auto-set `is_dnf = true`

---

## 4. Tag Filtering and Search Lens

### Tag Filtering
- Users can select multiple tags to filter books
- **Filter Mode Toggle**: AND (all selected tags) vs ANY (at least one tag)
- TagFilterBar displays: selected tag pills, clear button, filter mode toggle

**Filter Logic:**
```typescript
if (filterMode === 'any') {
  return selectedTagFilters.some(slug => bookTagSlugs.includes(slug))
} else {
  return selectedTagFilters.every(slug => bookTagSlugs.includes(slug))
}
```

### Search Lens
- Full-screen search overlay activated via SearchLensButton
- Real-time matching against book title + author
- **Match Scoring Algorithm:**
  - 1.0: Exact title/author match
  - 0.95: Title starts with query
  - 0.85: Title contains query
  - 0.7: Author contains query
  - 0.6: Individual word matches
- Non-matching books fade to opacity 0.2

---

## 5. Book Detail Screen

Complete reading journal and metadata management for a single book:

### Header Section
- Book cover image with progress percentage badge
- Title, author, genre chips
- User tags (max 2 display + more button)
- Status badge
- Rating input (only visible when status === 'read')

### Session Tab
- Inline Progress Widget: Current page / total pages input
- Pages read today counter
- Quick action cards: Capture Quote, Add Marginalia
- Reading History: Last 5 sessions
- Saved Quotes: Last 3 quotes

### Info Tab
- Classifications (Tags)
- Subject Matter (Genres)
- Synopsis (About)
- My Edition (Format, Price)
- My Reflections (Review)
- Bibliographic Details

### Modals/Sheets
1. **Status Picker** - Change reading status
2. **Reading Session Modal** - Log new session
3. **Edit Session Modal** - Modify/delete session
4. **DNF Modal** - Confirm with reason input
5. **Quote Capture Modal** - Add/edit quote
6. **Tag Picker** - Multi-select tags
7. **Book Details Sheet** - Edit format and price
8. **Review Sheet** - Edit personal review

---

## 6. Status Transitions

**Valid Status Transitions:**
```
want_to_read → reading        (Start reading)
reading → read                (Finished)
reading → dnf                 (Give up)
read → reading                (Re-read with confirmation)
any → want_to_read            (Reset status)
```

**Re-read Detection:** If status='read' and switching to 'reading', show confirmation modal.

---

## 7. API Endpoints

### Library Management
```
GET    /library                    - List user's library
GET    /library/external-ids       - Map external_id → { status, user_book_id }
POST   /library                    - Add book to library
GET    /library/{userBook}         - Get book details
PATCH  /library/{userBook}         - Update book (status, rating, progress)
DELETE /library/{userBook}         - Remove from library
PATCH  /library/reorder            - Reorder TBR queue
PATCH  /library/{userBook}/pin     - Pin book
DELETE /library/{userBook}/pin     - Unpin book
```

### Response Format
Backend uses `JsonResource::withoutWrapping()` - responses return data directly without a `data` wrapper.

```php
return new UserBookResource($userBook);  // Returns object directly
return TagResource::collection($tags);   // Returns array directly
```

---

## 8. Key Files

### Backend
- `backend/app/Http/Controllers/Api/LibraryController.php`
- `backend/app/Models/Book.php`
- `backend/app/Models/UserBook.php`
- `backend/app/Enums/BookStatusEnum.php`
- `backend/app/Enums/BookFormatEnum.php`

### Mobile
- `mobile/src/features/library/LibraryScreen.tsx`
- `mobile/src/features/library/BookDetailScreen.tsx`
- `mobile/src/features/library/hooks/useLibraryController.ts`
- `mobile/src/features/library/hooks/useBookDetailController.ts`
- `mobile/src/features/library/hooks/useSearchLens.ts`
- `mobile/src/features/library/components/ViewModeToggle.tsx`
- `mobile/src/features/library/components/SearchLens.tsx`
- `mobile/src/features/library/components/CoverGridView.tsx`
- `mobile/src/features/library/components/TBRStack/TBRStackView.tsx`
- `mobile/src/database/models/Book.ts`
- `mobile/src/database/models/UserBook.ts`
- `mobile/src/database/hooks/useLibrary.ts`

---

## 9. Offline-First Pattern

All mutations create local WatermelonDB records with `isPendingSync=true`:

```tsx
import { scheduleSyncAfterMutation } from '@/database/sync';

await database.write(async () => {
  await userBook.updateStatus('reading');
});
scheduleSyncAfterMutation(); // Triggers background sync
```

---

## 10. Theme Awareness

Each theme has distinct visual styling:

| Theme | Style | Corners | Messaging |
|-------|-------|---------|-----------|
| Scholar | Dark Academia | Sharp | "Archives", "Marginalia" |
| Dreamer | Cottagecore | Rounded | "Find a story" |
| Wanderer | Desert/Travel | Medium | Compass icons |
| Midnight | Celestial | Medium | Moon icons |

All themes use semantic color tokens (`surface`, `foreground`, `primary`, etc.) - never raw Tailwind colors.
