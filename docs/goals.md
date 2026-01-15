# Reading Goals Feature Documentation

## Overview

The Reading Goals feature allows users to set and track reading targets across multiple dimensions (books, pages, reading time, and day streaks) with flexible time periods (daily, weekly, monthly, yearly).

---

## 1. Goal Types

| Type | Value | Unit | Description |
|------|-------|------|-------------|
| **Books** | `books` | books | Count of books completed |
| **Pages** | `pages` | pages | Total pages read |
| **Minutes** | `minutes` | minutes | Total reading time |
| **Streak** | `streak` | days | Consecutive days with reading |

**Location:** `backend/app/Enums/GoalTypeEnum.php`

---

## 2. Goal Periods

| Period | Value | Duration |
|--------|-------|----------|
| **Daily** | `daily` | 24 hours |
| **Weekly** | `weekly` | 7 days |
| **Monthly** | `monthly` | Calendar month |
| **Yearly** | `yearly` | Calendar year |

**Location:** `backend/app/Enums/GoalPeriodEnum.php`

---

## 3. Data Model

**Table:** `reading_goals`

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `user_id` | bigint | Foreign key to users |
| `type` | string | Goal type enum |
| `period` | string | Period enum |
| `target` | integer | Target value |
| `current_value` | integer | Current progress |
| `year` | integer | Year the goal applies to |
| `month` | integer | Month for monthly goals |
| `week` | integer | ISO week for weekly goals |
| `is_active` | boolean | Whether goal is active |
| `completed_at` | timestamp | When goal was completed |

---

## 4. Calculated Attributes

### Progress Percentage
```php
min(100, round(($current_value / $target) * 100, 1))
```

### Is Completed
```php
$current_value >= $target
```

### Remaining
```php
max(0, $target - $current_value)
```

### Is On Track
Compares actual progress against expected progress based on elapsed time:

```php
$expectedProgress = $target * $elapsedFraction;
return $current_value >= $expectedProgress;
```

**Elapsed Fraction by Period:**
- Daily: 1.0 (always 100%)
- Weekly: dayOfWeek / 7
- Monthly: day / daysInMonth
- Yearly: dayOfYear / 365 (or 366)

**Example:** Yearly goal to read 52 books
- Jan 30 (day 30): elapsed = 30/365 = 8.2%
- Expected: 52 × 0.082 = 4.26 books
- Actual: 5 books → `is_on_track = true`

---

## 5. Auto-Increment Behavior

Goal progress is computed on the mobile app from local reading data. The backend stores goal targets and metadata.

---

## 6. API Endpoints

### List Active Goals
```
GET /api/goals
Returns: ReadingGoalResource[]
```

Goal creation, updates, and deletion are performed via the sync system:

```
POST /api/sync/push
GET  /api/sync/pull
```

### Get Options
```
GET /api/goals/types    → [{ value, label }]
GET /api/goals/periods  → [{ value, label }]
```

### Get Single Goal
```
GET /api/goals/{goal}
```

---

## 7. Response Format

```json
{
  "id": 1,
  "type": "books",
  "period": "yearly",
  "target": 52,
  "current_value": 13,
  "year": 2026,
  "month": null,
  "week": null,
  "is_active": true,
  "progress_percentage": 25.0,
  "is_completed": false,
  "remaining": 39,
  "is_on_track": true,
  "completed_at": null,
  "created_at": "2026-01-11T00:00:00Z",
  "updated_at": "2026-01-15T08:30:00Z"
}
```

---

## 8. Mobile Integration

### API Client
```typescript
const goalsApi = {
  getAll: () => Promise<ReadingGoal[]>,
  create: (data: CreateGoalData) => Promise<ReadingGoal>,
  get: (id: number) => Promise<ReadingGoal>,
  update: (id: number, data: UpdateGoalData) => Promise<ReadingGoal>,
  delete: (id: number) => Promise<MessageResponse>,
  getTypes: () => Promise<GoalOption[]>,
  getPeriods: () => Promise<GoalOption[]>,
};
```

### Type Definitions
```typescript
interface ReadingGoal {
  id: number;
  type: GoalType;
  period: GoalPeriod;
  target: number;
  current_value: number;
  year: number;
  month: number | null;
  week: number | null;
  is_active: boolean;
  progress_percentage: number;
  is_completed: boolean;
  remaining: number;
  is_on_track: boolean;
  completed_at: string | null;
}
```

---

## 9. Completion Detection

```php
private function checkAndMarkCompleted(ReadingGoal $goal): void {
    $goal->refresh();

    if ($goal->current_value >= $goal->target && !$goal->completed_at) {
        $goal->update(['completed_at' => now()]);
    }
}
```

**Key Behaviors:**
- Triggered after every update
- One-time only - `completed_at` set exactly once
- Permanent record - never changes even if value decreases

---

## 10. Integration Points

Goal progress is derived on the mobile app from locally stored sessions, books, and streak calculations.

---

## 11. Key Files

### Backend
- `backend/app/Models/ReadingGoal.php`
- `backend/app/Http/Controllers/Api/ReadingGoalController.php`
- `backend/app/Enums/GoalTypeEnum.php`
- `backend/app/Enums/GoalPeriodEnum.php`
- `backend/app/Http/Requests/ReadingGoal/`
- `backend/app/Http/Resources/ReadingGoalResource.php`

### Mobile
- Goal UI and computation live in the mobile app (local database + sync)

---

## 12. Design Patterns

### Derived Attributes
Goals expose computed values (`progress_percentage`, `is_completed`, `remaining`, `is_on_track`) that are always fresh and never stored.

### Idempotent Completion
The `completed_at` timestamp is set exactly once via `checkAndMarkCompleted()`.

### Period-Aware Incrementing
All increment methods check `isGoalInCurrentPeriod()` before updating.

### Flexible Time Scoping
Period boundaries calculated dynamically using Carbon's date utilities.
