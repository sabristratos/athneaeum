# Tags Feature Documentation

## Overview

The Tags feature allows users to categorize and organize their books with custom or system tags. Tags support multiple colors, can be used for filtering books, and include advanced filtering modes (AND/OR logic).

---

## 1. Tag Data Model

### Backend Model

**Fields:**
- `id` (int): Unique identifier
- `user_id` (nullable int): NULL for system tags, set for user-created tags
- `name` (string, max 50): Display name
- `slug` (string): URL-safe slug, auto-generated
- `color` (TagColorEnum): Tag color from 10 predefined colors
- `emoji` (string, nullable, max 10): Optional emoji
- `is_system` (boolean): System-defined (immutable) or user-created
- `sort_order` (integer): Sort order for display

**Relationships:**
```php
public function user(): BelongsTo
public function userBooks(): BelongsToMany  // Through 'user_book_tag' pivot
```

**Auto-Features:**
- Slug auto-generated from name via `Str::slug()`

---

## 2. Color System

### Available Colors

| Value | Label | Use Case |
|-------|-------|----------|
| `primary` | Primary | Theme-aligned color |
| `gold` | Gold | Warmth, highlights |
| `green` | Green | Positive, growth |
| `purple` | Purple | Mystery, creativity |
| `copper` | Copper | Antiquity, classic |
| `blue` | Blue | Calm, sky |
| `orange` | Orange | Energy, adventure |
| `teal` | Teal | Balance, modern |
| `rose` | Rose | Romance, love |
| `slate` | Slate | Neutral |

### Theme-Specific Colors

Each theme defines its own tag colors:
```typescript
// Scholar theme example
tagColors: {
  primary: { bg: '#8b2e2e', text: '#dcd0c0' },
  gold: { bg: '#b8860b', text: '#12100e' },
  // ...
}
```

**Usage:**
```typescript
const tagColor = theme.tagColors[tag.color];
// Returns: { bg: string; text: string }
```

---

## 3. API Endpoints

### List Tags
```
GET /api/tags
Returns: TagResource[] (sorted by is_system DESC, sort_order, name)
Includes: books_count per tag
```

### Get Available Colors
```
GET /api/tags/colors
Returns: { data: [{ value, label }] }
```

### Create Tag
```
POST /api/tags
Body: {
  name: string (required, max 50),
  color: TagColor (required),
  emoji?: string (max 10)
}
```

### Update Tag
```
PATCH /api/tags/{tag}
Body: {
  name?: string,
  color?: TagColor,
  emoji?: string
}
Authorization: Must own tag, cannot edit system tags
```

### Delete Tag
```
DELETE /api/tags/{tag}
Authorization: Must own tag, cannot delete system tags
Cascade: Removes all entries in user_book_tag pivot
```

---

## 4. Attach/Detach from Books

### Sync Tags (Replace All)
```
POST /api/library/{userBook}/tags
Body: { tag_ids: [1, 2, 3] }
```

### Attach Single Tag
```
POST /api/library/{userBook}/tags/{tag}
```

### Detach Single Tag
```
DELETE /api/library/{userBook}/tags/{tag}
```

---

## 5. Filtering Modes

### Mode: `any` (OR)
Shows books tagged with **ANY** of the selected tags.

### Mode: `all` (AND)
Shows books tagged with **ALL** of the selected tags.

**Frontend Implementation:**
```typescript
if (filterMode === 'any') {
  return selectedTagFilters.some(slug => bookTagSlugs.includes(slug))
} else {
  return selectedTagFilters.every(slug => bookTagSlugs.includes(slug))
}
```

---

## 6. Mobile Components

### TagEditor
Modal for creating/editing tags with:
- Live preview chip
- Name input with character counter
- Color picker
- Delete button (edit mode only)

### TagColorPicker
10 circular color options with selected border highlight.

### TagFilterBar
Horizontal scrollable filter UI:
- Settings icon for tag management
- Filter mode toggle (AND/OR) when 2+ tags selected
- Clear filters button
- Filter count badge

### TagList
Flowing grid layout:
- Optional max display with "+N" overflow
- Remove button support
- Long-press for context actions

### TagPicker
Bottom sheet for multi-select:
- Search/filter by name
- Recently used section
- System tags section
- User tags section ("My Tags")
- Inline tag creation from search

### TagChip
Reusable tag badge:
- Unselected: border with colored dot
- Selected: filled with color
- Optional book count badge
- Optional remove button

---

## 7. State Management

### Tag Store (Zustand)

**State:**
```typescript
interface TagStore {
  tags: Tag[];
  selectedTagFilters: string[];      // Tag slugs
  filterMode: TagFilterMode;         // 'any' | 'all'
  recentlyUsedTagIds: number[];      // Max 5 recent
  deletedTag: DeletedTagInfo | null; // For undo
}
```

**Actions:**
```typescript
setTags, addTag, updateTag, deleteTag
undoDeleteTag, clearDeletedTag
toggleTagFilter, setTagFilters, clearTagFilters
setFilterMode, markTagUsed
```

**Selectors:**
```typescript
getSystemTags, getUserTags
getRecentlyUsedTags
getTagById, getTagBySlug
```

**Persistence:**
- Stored in MMKV
- Partial: tags, selectedTagFilters, filterMode, recentlyUsedTagIds

---

## 8. Undo Functionality

Deleted tags cached for 5 seconds:
```typescript
const undoDelete = () => {
  const tag = undoDeleteTag();
  if (tag) {
    // Restore tag via API
    createTag({ name: tag.name, color: tag.color });
  }
};
```

---

## 9. Type Definitions

```typescript
type TagColor =
  | 'primary' | 'gold' | 'green' | 'purple' | 'copper'
  | 'blue' | 'orange' | 'teal' | 'rose' | 'slate';

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: TagColor;
  color_label: string;
  emoji?: string;
  is_system: boolean;
  sort_order: number;
  books_count?: number;
}

type TagFilterMode = 'any' | 'all';
```

---

## 10. Database Schema

### tags Table
```sql
CREATE TABLE tags (
  id BIGINT UNSIGNED PRIMARY KEY,
  user_id BIGINT UNSIGNED NULLABLE,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  color VARCHAR(255) NOT NULL,
  emoji VARCHAR(10) NULLABLE,
  is_system BOOLEAN DEFAULT 0,
  sort_order INT DEFAULT 0,
  UNIQUE (user_id, slug)
);
```

### user_book_tag Table (Pivot)
```sql
CREATE TABLE user_book_tag (
  id BIGINT UNSIGNED PRIMARY KEY,
  user_book_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  UNIQUE (user_book_id, tag_id)
);
```

---

## 11. Key Files

### Backend
- `backend/app/Models/Tag.php`
- `backend/app/Http/Controllers/Api/TagController.php`
- `backend/app/Http/Controllers/Api/UserBookTagController.php`
- `backend/app/Enums/TagColorEnum.php`
- `backend/app/Http/Resources/TagResource.php`

### Mobile
- `mobile/src/stores/tagStore.ts`
- `mobile/src/components/TagEditor.tsx`
- `mobile/src/components/TagColorPicker.tsx`
- `mobile/src/components/TagFilterBar.tsx`
- `mobile/src/components/TagList.tsx`
- `mobile/src/components/TagPicker.tsx`
- `mobile/src/components/molecules/TagChip.tsx`
- `mobile/src/types/tag.ts`

---

## 12. Key Implementation Notes

### System vs User Tags
- **System Tags**: `is_system = true`, cannot be deleted/edited
- **User Tags**: `is_system = false`, full CRUD available

### Authorization Pattern
```php
if ($tag->is_system || $tag->user_id !== $request->user()->id) {
    abort(403);
}
```

### Recently Used Tracking
- Tracks 5 most recently used tags
- Updated when tags attached to books
- Displayed in TagPicker for quick access
