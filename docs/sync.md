# Sync System Documentation

## Overview

The Digital Athenaeum implements an offline-first, three-phase synchronization system between the mobile app's local WatermelonDB and the Laravel backend API.

---

## 1. WatermelonDB Setup

**Location:** `mobile/src/database/index.ts`

```typescript
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false, // Compatible with Expo Go
  onSetUpError: () => {},
});

export const database = new Database({
  adapter,
  modelClasses: [Book, UserBook, ReadingSession, SyncMetadata],
});
```

---

## 2. Schema Definition

**Location:** `mobile/src/database/schema.ts`

### Tables

| Table | Purpose |
|-------|---------|
| `books` | Book metadata (title, author, cover, etc.) |
| `user_books` | User's relationship with books |
| `reading_sessions` | Reading activity logs |
| `sync_metadata` | Sync timestamps |

### Common Columns

All main tables include:
- `server_id` - Server database ID (nullable, indexed)
- `is_pending_sync` - Flag for unsync'd changes
- `is_deleted` - Soft delete flag
- `created_at`, `updated_at` - Timestamps

---

## 3. Model Decorators

WatermelonDB models use decorators for column definitions:

```typescript
@field('server_id') serverId!: number | null;
@text('title') title!: string;
@date('created_at') createdAt!: Date;
@readonly @date('created_at') createdAt!: Date;
@children('user_books') userBooks!: Query<UserBook>;
@relation('books', 'book_id') book!: Book;
@writer async markForSync() { /* atomic update */ }
```

**Decorator Types:**
- `@field` - Numeric fields
- `@text` - String fields
- `@date` - Date fields (stored as milliseconds)
- `@readonly` - Prevents modification
- `@children` - Has-many relationship
- `@relation` - Belongs-to relationship
- `@writer` - Async atomic update method

---

## 4. Soft Delete Pattern

Each model has a `softDelete()` writer:

```typescript
@writer async softDelete() {
  await this.update((record) => {
    record.isDeleted = true;
    record.isPendingSync = true;
    record.updatedAt = new Date();
  });
}
```

**Flow:**
1. Mark `isDeleted = true` (not removed from DB)
2. Set `isPendingSync = true` for sync
3. Push includes server ID in `deleted` array
4. After sync success: `destroyPermanently()`

---

## 5. Pending Sync Pattern

Every write operation that needs syncing:

```typescript
@writer async updateStatus(newStatus: BookStatus) {
  await this.update((record) => {
    record.status = newStatus;
    record.isPendingSync = true;
    record.updatedAt = new Date();
  });
}
```

**Pending Count Tracking:**
```typescript
const pending = await database
  .get('user_books')
  .query(
    Q.where('is_pending_sync', true),
    Q.where('is_deleted', false)
  )
  .fetchCount();
```

---

## 6. Three-Phase Sync

**Location:** `mobile/src/database/sync/syncAdapter.ts`

```typescript
export async function syncWithServer(): Promise<SyncResult> {
  // Phase 1: Upload pending covers
  await uploadPendingCovers();

  // Phase 2: Push local changes
  const pushResult = await pushChanges();

  // Phase 3: Pull server changes
  const lastPulledAt = await getLastPulledAt();
  const newTimestamp = await pullChanges(lastPulledAt);

  return { status: 'success', pushed: pushResult.counts, pulledAt: newTimestamp };
}
```

### Phase 1: Cover Sync

Uploads pending cover images before data sync:

```typescript
const userBooks = await database
  .get<UserBook>('user_books')
  .query(Q.where('pending_cover_upload', true))
  .fetch();

// Upload each via FileSystem.uploadAsync
// Update book.coverUrl and clear pendingCoverUpload flag
```

### Phase 2: Push Changes

```typescript
// Gather pending records (not deleted)
const pendingBooks = await booksCollection.query(
  Q.where('is_pending_sync', true),
  Q.where('is_deleted', false)
).fetch();

// Gather deleted records
const deletedUserBooks = await userBooksCollection.query(
  Q.where('is_deleted', true),
  Q.where('is_pending_sync', true)
).fetch();

// Build payload
const payload = {
  books: { created: [], updated: [], deleted: [] },
  user_books: { created: [], updated: [], deleted: [] },
  reading_sessions: { created: [], updated: [], deleted: [] }
};

// POST to /sync/push
// Apply ID mappings
// Clear pending flags
// destroyPermanently() deleted records
```

### Phase 3: Pull Changes

```typescript
const response = await apiClient(`/sync/pull?last_pulled_at=${lastPulledAt}`);

// Process created/updated/deleted for each entity type
// Skip updates if local isPendingSync = true
// Update sync metadata timestamp
```

---

## 7. Conflict Resolution

### Strategy: Last-Write-Wins with Exceptions

**Book Conflicts:**
- Local pending changes are preserved
- Server updates ignored if `isPendingSync = true`

**UserBook Page Progress:**
- Special merge logic - keeps higher value
```typescript
if (existing.isPendingSync) {
  const serverPage = serverUserBook.current_page;
  const localPage = existing.currentPage;
  if (serverPage > localPage) {
    await existing.update(r => r.currentPage = serverPage);
  }
  return; // Skip other updates
}
```

**ReadingSessions:**
- Append-only, no updates
- Server sessions never updated if exists locally

---

## 8. ID Mapping

Maps local WatermelonDB IDs (UUIDs) to server database IDs (integers).

```typescript
interface IdMapping {
  local_id: string;        // WatermelonDB UUID
  server_id: number;       // Server database ID
}
```

**Flow:**
1. Local creation with UUID, no server ID
2. Push includes `local_id` in payload
3. Server creates record, returns server ID
4. Response includes `id_mappings` array
5. Update local record with server ID

**Complex Relationships:**
```typescript
// UserBook has two foreign keys
interface UserBookPayload {
  local_id: string;
  book_local_id: string;      // Local Book ID
  server_book_id?: number;    // Server Book ID (if already synced)
}
```

---

## 9. Auto-Sync Triggers

### App Foreground
```typescript
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    triggerSync();
  }
});
```

### Network Connectivity
```typescript
NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    setTimeout(() => syncWithServer(), 1000); // 1s debounce
  }
});
```

### After Mutations
```typescript
export function scheduleSyncAfterMutation(): void {
  clearTimeout(mutationSyncTimer);
  mutationSyncTimer = setTimeout(() => {
    syncWithServer();
  }, 2000); // 2s debounce
}
```

### DatabaseProvider Initialization
```typescript
useEffect(() => {
  setupAutoSync();
  triggerSync(); // Initial sync on app start
  return () => teardownAutoSync();
}, []);
```

---

## 10. Error Handling

### SyncResult Type
```typescript
interface SyncResult {
  status: 'success' | 'already_syncing' | 'offline' | 'error';
  pushed?: SyncCounts;
  pulledAt?: number;
  error?: string;
}
```

### Error Cases
- **Authentication:** Clear auth, redirect to login
- **Offline:** Return `{ status: 'offline' }`
- **Concurrent:** Return `{ status: 'already_syncing' }`
- **Generic:** Return error message in result

### Sync Listeners
```typescript
const { addSyncListener } = useSync();

useEffect(() => {
  const unsubscribe = addSyncListener((result) => {
    if (result.status === 'success') toast.success('Synced');
    else if (result.status === 'error') toast.danger(result.error);
  });
  return unsubscribe;
}, []);
```

---

## 11. API Routes

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/sync/push', [SyncController::class, 'push']);
    Route::get('/sync/pull', [SyncController::class, 'pull']);
    Route::post('/sync/upload-cover', [SyncController::class, 'uploadCover']);
});
```

### Push Request
```typescript
{
  books: { created: [], updated: [], deleted: [] },
  user_books: { created: [], updated: [], deleted: number[] },
  reading_sessions: { created: [], updated: [], deleted: number[] }
}
```

### Push Response
```typescript
{
  status: string,
  id_mappings: {
    books: IdMapping[],
    user_books: IdMapping[],
    reading_sessions: IdMapping[]
  },
  counts: { created, updated, deleted },
  skipped: {
    user_books: SkippedRecord[],
    reading_sessions: SkippedRecord[]
  },
  timestamp: number
}
```

**Skipped Records:**
When a record cannot be synced due to missing dependencies (e.g., a user_book's parent book hasn't synced yet), the server returns it in the `skipped` array with a reason code:
- `book_not_found` - UserBook's parent book hasn't synced
- `user_book_not_found` - ReadingSession's parent user_book hasn't synced

Skipped records retain `isPendingSync = true` and will retry on the next sync.

### Pull Response
```typescript
{
  changes: {
    books: { created: [], updated: [], deleted: number[] },
    user_books: { created: [], updated: [], deleted: number[] },
    reading_sessions: { created: [], updated: [], deleted: number[] }
  },
  timestamp: number
}
```

---

## 12. DatabaseProvider Context

**Location:** `mobile/src/database/DatabaseProvider.tsx`

```typescript
interface DatabaseContextValue {
  database: Database;
  isReady: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  triggerSync: () => Promise<void>;
}
```

**Usage:**
```typescript
const database = useDatabase();
const isReady = useDatabaseReady();
const { isSyncing, pendingCount, triggerSync } = useSync();
```

---

## 13. Key Files

### Mobile
- `mobile/src/database/index.ts` - Database initialization
- `mobile/src/database/schema.ts` - Schema definition
- `mobile/src/database/migrations.ts` - Schema migrations
- `mobile/src/database/models/` - Model definitions
- `mobile/src/database/sync/syncAdapter.ts` - Main sync orchestration
- `mobile/src/database/sync/pushChanges.ts` - Push logic
- `mobile/src/database/sync/pullChanges.ts` - Pull logic
- `mobile/src/database/sync/coverSync.ts` - Cover upload
- `mobile/src/database/sync/types.ts` - Type definitions
- `mobile/src/database/DatabaseProvider.tsx` - Context provider

### Backend
- `backend/app/Http/Controllers/Api/SyncController.php`
- `backend/routes/api.php` - Sync routes

---

## 14. Design Patterns Summary

| Pattern | Implementation |
|---------|----------------|
| **Offline-First** | Changes written locally first, sync async |
| **Soft Deletes** | Logical deletion, physical cleanup after sync |
| **Pending Flags** | Track unsync'd changes |
| **ID Mapping** | Local UUIDs → Server integers |
| **Conflict Resolution** | Local pending wins; page progress merges |
| **Debouncing** | 1s network, 2s mutations |
| **Transactions** | Backend wraps push atomically |
| **Listener Pattern** | Components subscribe to sync results |
