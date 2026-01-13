# Re-Reading Support Documentation

## Overview

The Re-Reading feature allows users to track multiple readings of the same book with separate ratings, reviews, and reading sessions for each read-through. This preserves complete reading history while maintaining the "one book per library" principle via the `UserBook` model.

---

## 1. Data Structure

### The Problem Solved

Previously, `UserBook` had a unique constraint on `(user_id, book_id)` with single `started_at`, `finished_at`, and `rating` fields. Re-reading a book would overwrite the original reading history.

### ReadThrough Model

The `ReadThrough` model represents a single "reading" of a book, allowing multiple reads per `UserBook`:

**Backend Model** (`backend/app/Models/ReadThrough.php`):
```php
Schema::create('read_throughs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_book_id')->constrained()->cascadeOnDelete();
    $table->unsignedInteger('read_number')->default(1);
    $table->date('started_at')->nullable();
    $table->date('finished_at')->nullable();
    $table->decimal('rating', 3, 2)->nullable();
    $table->text('review')->nullable();
    $table->string('status')->default('reading');
    $table->boolean('is_dnf')->default(false);
    $table->text('dnf_reason')->nullable();
    $table->timestamps();

    $table->unique(['user_book_id', 'read_number']);
});
```

### Relationships

```
User
  └── UserBook (unique per user+book)
        └── ReadThrough[] (multiple per UserBook)
              └── ReadingSession[] (belongs to specific ReadThrough)
```

**Key Relationship Change:**
- `ReadingSession` now references `read_through_id` instead of `user_book_id`
- Each session is tied to a specific read-through

---

## 2. Mobile WatermelonDB Schema

**ReadThrough Model** (`mobile/src/database/models/ReadThrough.ts`):
```typescript
static table = 'read_throughs';

static associations: Associations = {
  user_books: { type: 'belongs_to', key: 'user_book_id' },
  reading_sessions: { type: 'has_many', foreignKey: 'read_through_id' },
};

@field('server_id') serverId!: number | null;
@text('user_book_id') userBookId!: string;
@field('read_number') readNumber!: number;
@text('status') status!: BookStatus;
@field('rating') rating!: number | null;
@text('review') review!: string | null;
@field('is_dnf') isDnf!: boolean;
@text('dnf_reason') dnfReason!: string | null;
@date('started_at') startedAt!: Date | null;
@date('finished_at') finishedAt!: Date | null;
@field('is_pending_sync') isPendingSync!: boolean;
@field('is_deleted') isDeleted!: boolean;
```

---

## 3. User Flow: Starting a Re-read

### Automatic ReadThrough Creation

When a user starts reading a book for the first time, a `ReadThrough #1` is automatically created:

```typescript
// When status changes to 'reading' and no active ReadThrough exists
await database.write(async () => {
  await database.get('read_throughs').create((rt) => {
    rt.userBookId = userBook.id;
    rt.readNumber = 1;
    rt.status = 'reading';
    rt.startedAt = new Date();
    rt.isPendingSync = true;
  });
});
```

### Starting a Re-read

When a user finishes a book and wants to read it again:

1. User taps "Start Re-read" button on book detail
2. Confirmation modal appears
3. On confirm, new `ReadThrough` is created with incremented `read_number`
4. `UserBook` status resets to 'reading'
5. Current page resets to 0

**Controller Implementation:**
```typescript
const handleStartReread = useCallback(async () => {
  if (!userBook || !readThroughs) return;

  const maxReadNumber = Math.max(...readThroughs.map(rt => rt.read_number), 0);

  await database.write(async () => {
    // Create new ReadThrough
    await database.get('read_throughs').create((rt) => {
      rt.userBookId = userBook.id;
      rt.readNumber = maxReadNumber + 1;
      rt.status = 'reading';
      rt.startedAt = new Date();
      rt.isPendingSync = true;
    });

    // Reset UserBook progress
    await userBook.update((ub) => {
      ub.status = 'reading';
      ub.currentPage = 0;
      ub.progressPercentage = 0;
      ub.isPendingSync = true;
    });
  });

  scheduleSyncAfterMutation();
}, [userBook, readThroughs]);
```

---

## 4. Reading History UI

### Book Detail Screen - Reading History Section

The book detail screen displays all read-throughs in a "Reading History" section:

```tsx
// In BookDetailScreen.tsx
{readThroughs && readThroughs.length > 0 && (
  <SectionHeader title={isScholar ? 'Reading Chronicles' : 'Reading History'}>
    {readThroughs.map((rt) => (
      <ReadThroughCard
        key={rt.id}
        readThrough={rt}
        isCurrentRead={rt.id === currentReadThrough?.id}
        onRatingChange={(rating) => handleReadThroughRating(rt.id, rating)}
      />
    ))}
  </SectionHeader>
)}
```

### ReadThroughCard Component

Displays individual read-through information:

| Field | Display |
|-------|---------|
| Read Number | "Reading #1", "Read #2", etc. |
| Status | Badge: "Completed", "In Progress", "Did Not Finish" |
| Dates | Started / Finished dates |
| Pages | Total pages read in this read-through |
| Rating | Star/heart rating (editable for completed) |
| Review | Truncated review text |
| DNF Reason | Displayed for abandoned reads |

**Current Read Indicator:**
The active read-through is highlighted with primary border color and "Current" badge.

---

## 5. Session Association

Reading sessions are now tied to specific read-throughs:

```typescript
// When logging a new session
await database.write(async () => {
  await database.get('reading_sessions').create((session) => {
    session.readThroughId = currentReadThrough.id;  // Not userBookId
    session.startPage = startPage;
    session.endPage = endPage;
    session.pagesRead = endPage - startPage;
    session.sessionDate = new Date();
    session.isPendingSync = true;
  });
});
```

### Session Display

Sessions in book detail show which read-through they belong to (for books with multiple reads).

---

## 6. Rating Per Read-Through

Each read-through can have its own rating:

```typescript
// Update rating for specific read-through
const handleReadThroughRating = useCallback(async (
  readThroughId: string,
  rating: number
) => {
  const readThrough = await database.get('read_throughs').find(readThroughId);
  await readThrough.updateRating(rating);
  scheduleSyncAfterMutation();
}, []);
```

### Aggregate Rating Display

The book detail header shows the most recent completed read-through's rating, or the highest rating if multiple completed.

---

## 7. Statistics Integration

### Read Count

`UserBook` includes computed `read_count` field:
```typescript
// API response includes
read_count: number;  // Count of completed read_throughs
```

### Stats Calculations

Statistics now consider multiple read-throughs:
- Total books read = unique books with at least one completed read-through
- Re-reads tracked separately in "Reading Habits" section
- Time-based stats aggregate across all read-throughs

---

## 8. API Endpoints

### Read-Through Management
```
GET    /library/{userBook}/read-throughs     - List all read-throughs
POST   /library/{userBook}/read-throughs     - Start new read-through
GET    /library/{userBook}/read-throughs/{rt} - Get specific read-through
PATCH  /library/{userBook}/read-throughs/{rt} - Update rating/review
DELETE /library/{userBook}/read-throughs/{rt} - Delete read-through
```

### Request/Response

**Start Re-read:**
```json
POST /library/123/read-throughs
{
  "started_at": "2024-01-15"
}

Response:
{
  "id": 456,
  "user_book_id": 123,
  "read_number": 2,
  "status": "reading",
  "started_at": "2024-01-15",
  "finished_at": null,
  "rating": null
}
```

**Update Rating:**
```json
PATCH /library/123/read-throughs/456
{
  "rating": 4.5,
  "review": "Even better the second time!"
}
```

---

## 9. Sync Behavior

Read-throughs sync using the standard offline-first pattern:

```typescript
// Pull includes read_throughs
const pullChanges = async (lastPulledAt: number) => {
  const response = await apiClient('/sync/pull', {
    params: { last_pulled_at: lastPulledAt }
  });
  // response.read_throughs contains server data
  // response.reading_sessions now include read_through_id
};

// Push includes read_through changes
const pushChanges = async (changes: SyncChanges) => {
  await apiClient('/sync/push', {
    method: 'POST',
    body: {
      ...changes,
      read_throughs: pendingReadThroughChanges,
    }
  });
};
```

---

## 10. Key Files

### Backend
- `backend/app/Models/ReadThrough.php`
- `backend/app/Http/Resources/ReadThroughResource.php`
- `backend/database/migrations/xxxx_create_read_throughs_table.php`
- `backend/database/migrations/xxxx_migrate_sessions_to_read_throughs.php`

### Mobile
- `mobile/src/database/models/ReadThrough.ts`
- `mobile/src/components/ReadThroughCard.tsx`
- `mobile/src/features/library/hooks/useBookDetailController.ts`
- `mobile/src/features/library/BookDetailScreen.tsx`
- `mobile/src/database/hooks/useReadThroughs.ts`

---

## 11. Migration Strategy

For existing data, the migration:

1. Creates `read_throughs` table
2. For each `UserBook` with reading history:
   - Creates `ReadThrough #1` with existing dates/rating
   - Updates `ReadingSession` records to reference new `read_through_id`
3. Preserves all historical data

```php
// Migration pseudocode
foreach (UserBook::whereNotNull('started_at')->get() as $userBook) {
    $readThrough = ReadThrough::create([
        'user_book_id' => $userBook->id,
        'read_number' => 1,
        'started_at' => $userBook->started_at,
        'finished_at' => $userBook->finished_at,
        'rating' => $userBook->rating,
        'review' => $userBook->review,
        'status' => $userBook->status,
    ]);

    $userBook->readingSessions()->update([
        'read_through_id' => $readThrough->id
    ]);
}
```

---

## 12. UI Considerations

### Theme Variations

| Theme | Section Title | Read Label |
|-------|---------------|------------|
| Scholar | "Reading Chronicles" | "Reading #1" |
| Dreamer | "Reading History" | "Read #1" |
| Wanderer | "Reading History" | "Read #1" |
| Midnight | "Reading History" | "Read #1" |

### Re-read Button Visibility

"Start Re-read" button appears when:
- Book status is 'read' (completed)
- No active read-through exists

### Confirmation Modal

Re-read confirmation shows:
- Number of previous reads
- Warning that progress will reset
- Cancel / Confirm buttons
