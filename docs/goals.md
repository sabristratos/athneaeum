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

Goals are updated through explicit operations in `ReadingGoalService`:

### Book Completion
```php
public function incrementBookGoals(User $user): void
// Called when book status → "read"
// Increments books goals by 1
```

### Page Addition
```php
public function addPagesToGoals(User $user, int $pages): void
// Called when reading session logs pages
// Increments pages goals by $pages
```

### Minutes Addition
```php
public function addMinutesToGoals(User $user, int $minutes): void
// Called when reading session logs duration
// Increments minutes goals by $minutes
```

### Streak Calculation
```php
public function updateStreakGoals(User $user): void
// Called after reading session creation
// Calculates current streak from history
// Only updates if new streak exceeds current
```

---

## 6. API Endpoints

### List Active Goals
```
GET /api/goals
Returns: ReadingGoalResource[]
```

### Create Goal
```
POST /api/goals
Body: {
  type: 'books' | 'pages' | 'minutes' | 'streak',
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  target: number,
  year: number,
  month?: number,
  week?: number
}
```

**Smart Upsert:** If goal exists for same type/period/timeframe, updates target instead of creating duplicate.

### Update Goal
```
PATCH /api/goals/{id}
Body: {
  target?: number,
  is_active?: boolean
}
```

### Delete Goal
```
DELETE /api/goals/{id}
```

### Recalculate All Goals
```
POST /api/goals/recalculate
// Rebuilds all active goal progress from scratch
```

### Get Options
```
GET /api/goals/types    → [{ value, label }]
GET /api/goals/periods  → [{ value, label }]
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

### With Reading Sessions
```php
// In session creation handler
$goalService->addPagesToGoals($user, $session->pages_read);
$goalService->addMinutesToGoals($user, $session->duration_seconds / 60);
$goalService->updateStreakGoals($user);
```

### With Book Status Changes
```php
// When status → "read"
$goalService->incrementBookGoals($user);
```

---

## 11. Key Files

### Backend
- `backend/app/Models/ReadingGoal.php`
- `backend/app/Http/Controllers/Api/ReadingGoalController.php`
- `backend/app/Services/Goals/ReadingGoalService.php`
- `backend/app/Enums/GoalTypeEnum.php`
- `backend/app/Enums/GoalPeriodEnum.php`
- `backend/app/Http/Requests/ReadingGoal/`
- `backend/app/Http/Resources/ReadingGoalResource.php`

### Mobile
- `mobile/src/api/goals.ts`
- Goal UI components (planned for future development)

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
