# Import Feature Documentation

## Overview

The Import feature allows users to migrate their reading data from external services into Digital Athenaeum. Currently supports Goodreads CSV exports, with an extensible architecture for adding additional sources.

---

## 1. Supported Sources

### Goodreads

**Provider Name:** `goodreads`
**File Extensions:** `.csv`, `.txt`

**How to Export from Goodreads:**
1. Go to Goodreads.com → My Books
2. Click "Import and Export" in the left sidebar
3. Click "Export Library" under "Export"
4. Download the generated CSV file

---

## 2. Import Options

Users can configure import behavior through the `ImportOptionsModal`:

| Option | Description | Default |
|--------|-------------|---------|
| `enrichment_enabled` | Fetch covers and descriptions from Google Books | `true` |
| `import_tags` | Convert Goodreads shelves to tags | `true` |
| `import_reviews` | Import personal book reviews | `true` |

**Import Options DTO** (`backend/app/DTOs/ImportOptions.php`):
```php
class ImportOptions
{
    public function __construct(
        public bool $enrichmentEnabled = true,
        public bool $importTags = true,
        public bool $importReviews = true,
    ) {}
}
```

---

## 3. Data Mapping

### Goodreads → Digital Athenaeum

| Goodreads Column | Athenaeum Field | Notes |
|------------------|-----------------|-------|
| Book Id | `book.external_id` | Provider: `goodreads` |
| Title | `book.title` | Required |
| Author | `book.author` | Required |
| ISBN13 / ISBN | `book.isbn` | Cleaned of quotes/equals |
| Number of Pages | `book.page_count` | |
| Year Published | `book.published_date` | Falls back to Original Publication Year |
| Publisher | `book.description` | Temporary until enrichment |

### Status Mapping

| Goodreads Shelf | Athenaeum Status |
|-----------------|------------------|
| `to-read` | `want_to_read` |
| `currently-reading` | `reading` |
| `read` | `read` |
| *(other)* | `want_to_read` |

### Format Mapping

| Goodreads Binding | Athenaeum Format |
|-------------------|------------------|
| kindle, ebook, e-book | `ebook` |
| audio, cd | `audiobook` |
| hardcover, paperback, mass market | `physical` |
| *(default)* | `physical` |

### Date Handling

- **Started At**: Set to `Date Added` for `reading` and `read` status
- **Finished At**: Set to `Date Read` (or `Date Added` fallback) for `read` status
- **Current Page**: Set to `page_count` for completed books, 0 otherwise

---

## 4. Tag Import

When `import_tags` is enabled, Goodreads "Bookshelves" column is parsed:

1. Split by comma (e.g., `"fantasy, favorites, 2024-reads"`)
2. Each shelf name is:
   - Slugified for unique identification
   - Title-cased for display (`fantasy` → `Fantasy`)
   - Assigned a deterministic color based on hash
3. Tags are created if they don't exist
4. Book-tag associations are synced

**Example Transformation:**
```
Input:  "to-read, sci-fi, must-read-2024"
Tags:   "To Read", "Sci Fi", "Must Read 2024"
```

---

## 5. Enrichment Process

When `enrichment_enabled` is true, books are queued for Google Books enrichment:

**EnrichBookJob:**
1. Searches Google Books API by title + author
2. If match found:
   - Updates cover URL
   - Updates description
   - Updates genres
   - Updates dimensions
3. Jobs are staggered (2-second delay between each) to respect API rate limits

```php
// Dispatched after import completes
foreach ($importedBookIds as $index => $bookId) {
    EnrichBookJob::dispatch($bookId)->delay(now()->addSeconds($index * 2));
}
```

---

## 6. Duplicate Handling

Books are skipped (not duplicated) when:

1. **Same Goodreads ID exists**: Book with matching `external_id` + `external_provider='goodreads'` already in user's library
2. **Duplicate in same file**: Same `Book Id` appears multiple times in CSV

**Deduplication Logic:**
```php
// Check for existing user book by Goodreads ID
$existingUserBook = UserBook::query()
    ->where('user_id', $user->id)
    ->whereHas('book', function ($query) use ($goodreadsId) {
        $query->where('external_id', $goodreadsId)
            ->where('external_provider', 'goodreads');
    })
    ->first();

if ($existingUserBook) {
    $result->addSkipped();
    continue;
}
```

---

## 7. Import Results

The import process returns an `ImportResult` DTO:

```php
class ImportResult
{
    public int $imported = 0;    // Successfully imported books
    public int $skipped = 0;     // Duplicates or already-existing books
    public int $errors = 0;      // Failed rows
    public array $errorMessages = [];  // First 10 error messages
}
```

**API Response:**
```json
{
  "imported": 42,
  "skipped": 5,
  "errors": 2,
  "error_messages": [
    "Row 15: Missing title or author",
    "Row 89: Database error"
  ]
}
```

---

## 8. API Endpoints

### Import Endpoints
```
GET    /user/import/sources     - List available import sources
POST   /user/import             - Process import file
```

### Request Format

**POST /user/import** (multipart/form-data):
```
file: [CSV file]
source: "goodreads"
enrichment_enabled: true
import_tags: true
import_reviews: true
```

### Response Format
```json
{
  "imported": 42,
  "skipped": 5,
  "errors": 0,
  "error_messages": []
}
```

---

## 9. Mobile Implementation

### Import Flow

1. User navigates to Profile → Settings → Import
2. Taps "Import from Goodreads"
3. `ImportOptionsModal` opens with toggles
4. User selects CSV file via document picker
5. `ImportProgressModal` shows status: `uploading` → `complete`/`error`
6. Results displayed with counts

### Components

**ImportOptionsModal:**
- Checkboxes for enrichment, tags, reviews
- File name display
- Cancel/Start Import buttons

**ImportProgressModal:**
- Status states: `idle`, `selecting`, `uploading`, `complete`, `error`
- Animated spinner during upload
- Success/error icons
- Result counts display
- Error messages (first 5)

### Mobile Share Import

The app handles shared CSV files via `ShareImportHandler`:

```tsx
// ShareImportHandler.tsx
useEffect(() => {
  const handleShareIntent = async () => {
    const sharedFile = await ReceiveSharingIntent.getReceivedFiles();
    if (sharedFile && sharedFile.filePath?.endsWith('.csv')) {
      setImportFile(sharedFile);
      setShowImportOptions(true);
    }
  };
  handleShareIntent();
}, []);
```

---

## 11. CSV Validation

### Required Columns (Goodreads)

The following columns must be present:
- `Book Id`
- `Title`
- `Author`
- `Exclusive Shelf`

### Supported Columns

| Column | Required | Description |
|--------|----------|-------------|
| Book Id | Yes | Goodreads book identifier |
| Title | Yes | Book title |
| Author | Yes | Primary author |
| Exclusive Shelf | Yes | Primary shelf (status) |
| ISBN13 | No | 13-digit ISBN |
| ISBN | No | 10-digit ISBN (fallback) |
| Number of Pages | No | Page count |
| My Rating | No | User's 0-5 rating |
| Binding | No | Format (hardcover, kindle, etc.) |
| Bookshelves | No | Additional shelves (tags) |
| My Review | No | User's review text |
| Date Read | No | When book was finished |
| Date Added | No | When added to Goodreads |
| Year Published | No | Publication year |
| Original Publication Year | No | First publication year |
| Publisher | No | Publisher name |

---

## 12. Key Files

### Backend
- `backend/app/Http/Controllers/Api/ImportController.php`
- `backend/app/Contracts/ImportServiceInterface.php`
- `backend/app/Services/Import/GoodreadsImportService.php`
- `backend/app/DTOs/ImportOptions.php`
- `backend/app/DTOs/ImportResult.php`
- `backend/app/Http/Requests/ImportRequest.php`
- `backend/app/Providers/ImportServiceProvider.php`
- `backend/app/Jobs/EnrichBookJob.php`

### Mobile
- `mobile/src/components/organisms/modals/ImportOptionsModal.tsx`
- `mobile/src/components/organisms/modals/ImportProgressModal.tsx`
- `mobile/src/components/ShareImportHandler.tsx`
- `mobile/src/features/settings/ImportScreen.tsx`

---

## 13. Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| "Missing required column" | CSV missing Title/Author/etc. | Use official Goodreads export |
| "Row X: Missing title or author" | Empty required fields | Manual data entry needed |
| "Unable to open CSV file" | File read failure | Re-upload file |
| "CSV file is empty" | No data rows | Use non-empty export |

### Transaction Safety

Each row is imported within a database transaction:
```php
$bookId = DB::transaction(function () use (...) {
    $book = $this->findOrCreateBook(...);
    $userBook = $this->createUserBook(...);
    $this->importBookshelves(...);
    return $book->id;
});
```

If any step fails, the entire row is rolled back and counted as an error.

---

## 14. Performance Considerations

- **Batch Processing**: Files are processed row-by-row, not loaded entirely into memory
- **Staggered Enrichment**: Google Books API calls are delayed 2 seconds apart
- **Duplicate Skip**: Quick lookup by Goodreads ID prevents unnecessary processing
- **Error Limit**: Only first 10 error messages are returned to reduce payload size

**Recommended Import Size:**
- Small libraries (< 100 books): Immediate processing
- Medium libraries (100-500 books): May take 1-2 minutes
- Large libraries (500+ books): May take several minutes; enrichment continues in background
