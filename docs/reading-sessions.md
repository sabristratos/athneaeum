# Reading Sessions Feature Documentation

## Overview

Reading Sessions track user reading activity, including pages read, duration, notes, and dates. Sessions are the core data for statistics, goal tracking, and reading history.

---

## 1. Session Data Model

### Backend Model

**Fields:**
- `id` - Primary key
- `user_book_id` - Foreign key to UserBook
- `date` - The date the session occurred
- `pages_read` - Number of pages read (calculated: end_page - start_page)
- `start_page` - Starting page number
- `end_page` - Ending page number
- `duration_seconds` - Optional reading duration
- `notes` - Optional user notes (max 2000 chars)
- `created_at` / `updated_at` - Timestamps

**Calculated Attributes:**
- `formattedDuration` - Formats seconds to "2h 45m" or "30m"

### Mobile Model (WatermelonDB)

**Fields:**
- `serverId` - Server ID for synced records
- `userBookId` - Local reference to user book
- `serverUserBookId` - Server's user_book_id
- `sessionDate` - Date as ISO string
- `pagesRead`, `startPage`, `endPage` - Page tracking
- `durationSeconds`, `notes` - Optional fields
- `isPendingSync`, `isDeleted` - Sync flags

---

## 2. Session Logging Flow

### Quick Log Sheet (Primary Entry Point)

The `QuickLogSheet` component provides a streamlined session logging experience:

**Flow:**
1. User taps "Log Reading" on BookDetailScreen
2. QuickLogSheet bottom sheet appears
3. User enters end page (input field) or taps +10/+25/+50 buttons
4. One tap to "Log Session" - instant feedback
5. Optional: Expand "Add details" section for duration/notes

**Location:** `mobile/src/components/organisms/modals/QuickLogSheet.tsx`

### Backend API

```
POST /api/sessions
Body: {
  user_book_id: number,
  date: string,
  start_page: number,
  end_page: number,
  duration_seconds?: number,
  notes?: string
}
```

**Process:**
1. Validates request data
2. Ensures user has permission for the book
3. Creates session with calculated `pages_read`
4. Auto-transitions book status: "want_to_read" → "reading"
5. Updates UserBook's `current_page` to `end_page`
6. Returns `ReadingSessionResource`

**Validation Rules:**
- `date` - Required, must be before or equal to today
- `start_page` - Required, integer, min 0
- `end_page` - Required, must be greater than start_page
- `duration_seconds` - Optional, integer, min 0
- `notes` - Optional, string, max 2000 characters

### Mobile Logging

**The `handleLogSession` function:**
```typescript
async (data: {
  endPage: number;
  durationSeconds?: number;
  notes?: string;
  date: string;
}) => Promise<void>
```

**Database Transaction:**
```typescript
await database.write(async () => {
  // 1. Create session record with isPendingSync = true
  // 2. Update userBook.currentPage
  // 3. Auto-transition status if needed
  // 4. Schedule sync after mutation
});
```

---

## 3. Duration Tracking

### Timer Mode
- User taps "Start Timer" → Begins counting seconds
- Timer displays in MM:SS format
- States: Idle, Running, Paused
- Background detection with warning

### Manual Mode
- User enters hours and minutes manually
- Converted to total seconds: `(hours * 3600) + (minutes * 60)`
- Optional field - can be null

### Formatting
```typescript
formatDuration(seconds: number) => "2h 45m" or "30m"
secondsToDuration(seconds: number) => { hours, minutes }
durationToSeconds(hours, minutes) => seconds
```

---

## 4. Session Notes

- **Optional field**: Can be null or empty
- **Max length**: 2000 characters
- **Display**: Shown in SessionCard in quote format
- **Theme-aware placeholders**:
  - Scholar: "Reflections on this passage..."
  - Other themes: "Any thoughts?"

---

## 5. Editing and Deletion

### Editing Sessions

**EditSessionModal Form Fields:**
- Date selector (must be before or equal to today)
- Page range input (end_page > start_page)
- Duration input (hours + minutes)
- Notes textarea

### Deleting Sessions

**Delete Flow:**
1. User taps "Delete Session" button
2. Confirmation modal appears
3. Session soft-deleted (`isDeleted = true`)
4. Toast shows "Session deleted" with undo action

**Undo Mechanism:**
```typescript
const handleDeleteSession = async (sessionId) => {
  const savedData = { ...sessionToDelete };
  await deleteSession(sessionId);

  toast.undo('Session deleted', async () => {
    await logSession(savedData); // Restore by re-creating
    toast.success('Session restored');
  });
}
```

---

## 6. Impact on Statistics

### Aggregate Stats
- `total_pages_read` - Sum of all pages_read
- `total_sessions` - Count of sessions
- `total_reading_time_seconds` - Sum of duration_seconds
- `avg_pages_per_session` - Pages / Sessions
- `avg_session_duration_seconds` - Avg duration

### Time Period Stats
- This Week: pages, sessions, time
- This Month: pages, sessions, time

### Streak Calculations
- **Current Streak**: Consecutive days with at least one session
- **Longest Streak**: Maximum streak ever achieved

**Algorithm:**
```
1. Extract unique dates from all sessions
2. Sort chronologically
3. Count consecutive day gaps
4. Current streak = 0 if last session > 1 day ago
```

---

## 7. Sync Behavior

### Offline-First Architecture

**Local Recording:**
1. Session created locally with `isPendingSync: true`
2. Toast: "Session logged"
3. `scheduleSyncAfterMutation()` triggers background sync

### Sync Lifecycle

**Push to Server:**
```typescript
const pendingSessions = await sessionsCollection.query(
  Q.where('is_pending_sync', true),
  Q.where('is_deleted', false)
).fetch();

// Transform and send to /sync/push
// After success: markSynced(serverId, serverUserBookId)
```

**Soft Deletes Sync:**
```typescript
const deletedSessions = await sessionsCollection.query(
  Q.where('is_deleted', true),
  Q.where('is_pending_sync', true)
).fetch();

// Send server IDs in deleted array
// After success: destroyPermanently()
```

**Pull from Server:**
- Skip updates if local `isPendingSync: true`
- Sessions are append-only (no updates on pull)
- Permanently delete records in server's deleted list

---

## 8. API Endpoints

```
GET    /api/sessions              - List all sessions
GET    /api/sessions?user_book_id=X  - Sessions for specific book
POST   /api/sessions              - Create new session
```

**Note:** Session updates and deletes are handled through the sync system rather than direct API endpoints. Changes made locally are pushed to the server via `/api/sync/push`.

---

## 9. Key Files

### Backend
- `backend/app/Http/Controllers/Api/SessionController.php`
- `backend/app/Models/ReadingSession.php`
- `backend/app/Http/Requests/Session/StoreReadingSessionRequest.php`
- `backend/app/Http/Resources/ReadingSessionResource.php`

### Mobile
- `mobile/src/database/models/ReadingSession.ts`
- `mobile/src/database/hooks/useSessions.ts`
- `mobile/src/components/SessionCard.tsx`
- `mobile/src/components/ReadingProgressCard.tsx`
- `mobile/src/components/organisms/ReadingSessionModal.tsx`
- `mobile/src/components/organisms/EditSessionModal.tsx`

---

## 10. Architecture Diagram

```
User Creates Session
      ↓
WatermelonDB.write() {
  - Create ReadingSession record
  - Update UserBook.currentPage
  - Set isPendingSync = true
}
      ↓
Toast: "Session logged"
      ↓
scheduleSyncAfterMutation()
      ↓
[Network Available]
      ↓
Push to /api/sync/push
      ↓
Server processes, returns ID mappings
      ↓
markSynced(serverId)
      ↓
Pull from /api/sync/pull
      ↓
UI shows updated sessions and stats
```
