# Stats & Analytics (Reader DNA) Documentation

## Overview

The Stats/Analytics system, called "Reader DNA," provides deep insights into reading habits and patterns. It includes a 365-day heatmap, reading streaks, format velocity analysis, mood/genre breakdowns, DNF analytics, page economy calculations, and calendar views.

### Offline-First Stats

Basic reading statistics are calculated **locally from WatermelonDB** for offline support:

**Local Stats Service** (`mobile/src/services/LocalStatsService.ts`):
- Total pages read, sessions, reading time
- Books completed and in progress
- Current and longest streak
- This week / this month breakdowns
- Recent sessions with book info

**Hook:** `useLocalStats()` from `@/hooks` provides reactive local stats.

**UI Indicator:** The "Offline" badge appears on ReadingStatsScreen when showing local-only data.

Advanced Reader DNA features (format velocity, mood ring, page economy) require server sync for complete data.

Note: The backend also includes pre-aggregated statistics tables (`user_statistics` and `user_statistics_monthly`) that are updated via observers and can be recalculated via an artisan command. The current API endpoints (`/api/stats` and `/api/stats/*`) compute their responses from sessions and user books.

---

## 1. Statistics Data Model

### UserStatistics Model

**Location:** `backend/app/Models/UserStatistics.php`

Stores pre-aggregated reading metrics updated via observers.

**Core Fields:**
```php
// All-time metrics
total_books_read, total_pages_read, total_reading_seconds
total_books_dnf, total_sessions, total_spent

// This year/month
books_read_this_year, books_read_this_month
pages_read_this_year, pages_read_this_month
reading_seconds_this_year, reading_seconds_this_month

// Streak tracking
current_streak, longest_streak
last_reading_date, streak_start_date

// Averages
avg_pages_per_hour, avg_pages_per_session
avg_session_minutes, avg_rating, avg_book_length

// Distribution arrays (JSON)
reading_by_hour: array[24]
reading_by_day_of_week: array[7]
genres_breakdown, formats_breakdown, authors_breakdown
ratings_distribution: array[1-5]

// Scores
consistency_score: 0-100
diversity_score: 0-100
```

---

## 2. Reader DNA Components

### 2.1 Heatmap (365-Day Activity)

**API:** `GET /stats/heatmap`

**Algorithm:**
```
1. Get last 365 days from today
2. Query all reading sessions in date range
3. Group by date, sum pages_read per day
4. Calculate intensity level (0-4) based on pages relative to max
5. Calculate reading streaks
6. Detect reading rhythm pattern
```

**Intensity Levels:**
- 0 = 0 pages
- 1 = 0-25% of max pages
- 2 = 25-50% of max pages
- 3 = 50-75% of max pages
- 4 = 75-100% of max pages

**Reading Rhythm Types:**
- `weekend_warrior` - 70%+ reading on weekends
- `weekday_devotee` - 85%+ reading on weekdays
- `daily_reader` - 80%+ days reading
- `marathon_reader` - avg session > 90 minutes
- `balanced` - default

### 2.2 Format Velocity

**API:** `GET /stats/format-velocity`

Analyzes reading speed by book format (physical, ebook, audiobook).

**Calculation:**
```
For each format:
  Total pages = sum of pages_read from sessions
  Total seconds = sum of duration_seconds
  Pages per hour = total_pages / (total_seconds / 3600)
```

**Response:**
```json
{
  "formats": [
    { "format": "ebook", "pages_per_hour": 45.2, "total_pages": 1500 }
  ],
  "fastest_format": "ebook",
  "average_velocity": 38.5
}
```

### 2.3 Mood Ring (Genres & Tags)

**API:** `GET /stats/mood-ring`

**Calculations:**
- Tags breakdown: Count each tag, calculate percentage
- Genres breakdown: Extract from book metadata, count occurrences
- Seasonal patterns: Group finished books by season, identify top genre

**Response:**
```json
{
  "by_tags": [{ "name": "Favorites", "count": 15, "percentage": 25.0 }],
  "by_genres": [{ "genre": "Fantasy", "count": 20, "percentage": 33.3 }],
  "seasonal_patterns": [
    { "season": "winter", "top_genre": "Mystery", "percentage": 45 }
  ]
}
```

### 2.4 DNF Analytics

**API:** `GET /stats/dnf-analytics`

**Patterns Detected:**
1. **Long Books Pattern** - 25%+ of 400+ page books are DNF
2. **Genre Pattern** - 40%+ of specific genre books are DNF

**Abandonment Points:**
- 0-25% (early abandon)
- 25-50%
- 50-75%
- 75-100%

**DNF Reasons:**
- `not_for_me`, `boring`, `writing`, `content`, `other`

### 2.5 Page Economy

**API:** `GET /stats/page-economy`

Analyzes cost-per-hour entertainment value.

**Algorithm:**
```
For each book with price:
  If has sessions: hours = duration_seconds / 3600 (tracked)
  Else if finished: hours = page_count / 60 (estimated)

Cost per hour = total_spent / total_hours
```

**Comparison:**
- Netflix: $15.49/month
- Movie theater: $15.00/ticket
- Books: calculated cost/hour

### 2.6 Calendar Data

**API:** `GET /stats/calendar?year=2025&month=12`

**Response:**
```json
{
  "days": [
    {
      "date": "2025-12-01",
      "pages_read": 45,
      "intensity": 2,
      "sessions": [...],
      "books_completed": [...]
    }
  ],
  "monthly_summaries": [
    { "month": 12, "year": 2025, "books_completed": 3, "pages_read": 450 }
  ]
}
```

---

## 3. Streak Calculation Algorithm

### Step-by-Step:

**Step 1: Get Unique Dates**
```
Extract all unique dates from reading sessions
Sort chronologically
```

**Step 2: Calculate Longest Streak**
```
streak = 1
longest = 1

for each date (starting at index 1):
  if current_date - previous_date == 1 day:
    streak++
  else:
    longest = max(longest, streak)
    streak = 1
```

**Step 3: Calculate Current Streak**
```
if last_session_date == today OR yesterday:
  current_streak = 1
  work backwards counting consecutive days
else:
  current_streak = 0
```

---

## 4. API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /stats` | Basic stats (totals, averages, recent sessions) |
| `GET /stats/heatmap` | 365-day activity heatmap with streaks |
| `GET /stats/format-velocity` | Reading speed by format |
| `GET /stats/mood-ring` | Genre and tag preferences |
| `GET /stats/dnf-analytics` | DNF patterns and reasons |
| `GET /stats/page-economy` | Cost-per-hour analysis |
| `GET /stats/calendar` | Month view with daily details |

---

## 5. Mobile Components

### ReaderDNAScreen
Main screen with two tabs: "Reader DNA" and "Calendar"

### Component Sections (DNA Tab)
1. **The Pulse** - Heatmap + Streaks + Rhythm Badge
2. **The Input** - Volume metrics (pages, books, active days)
3. **Format Friction** - Reading velocity by format
4. **Taste DNA** - Genre breakdown with donut chart
5. **The Graveyard** - DNF analytics
6. **Page Economy** - Cost-per-hour analysis

### Key Components
- `HeatmapChart` - 365-day visual grid
- `StreakDisplay` - Current and longest streaks
- `RhythmBadge` - Reading pattern classification
- `MoodRingSection` - Donut chart with genre breakdown
- `FormatVelocitySection` - Bar chart by format
- `GraveyardSection` - DNF histogram and patterns
- `PageEconomySection` - Cost comparison

---

## 6. Type Definitions

```typescript
type ReadingRhythm =
  | 'weekend_warrior'
  | 'weekday_devotee'
  | 'marathon_reader'
  | 'daily_reader'
  | 'balanced';

interface HeatmapDay {
  date: string;
  pages_read: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

interface FormatVelocityItem {
  format: 'physical' | 'ebook' | 'audiobook';
  label: string;
  pages_per_hour: number;
  total_pages: number;
  total_hours: number;
}

interface DnfPattern {
  pattern: 'long_books' | 'genre';
  label: string;
  rate: number;
}
```

---

## 7. Key Files

### Backend
- `backend/app/Services/Stats/ReaderDNAService.php`
- `backend/app/Services/Stats/StatisticsAggregationService.php`
- `backend/app/Http/Controllers/Api/StatsController.php`
- `backend/app/Models/UserStatistics.php`
- `backend/app/Models/UserStatisticsMonthly.php`

### Mobile
- `mobile/src/features/stats/ReaderDNAScreen.tsx`
- `mobile/src/features/stats/hooks/useReaderDNAController.ts`
- `mobile/src/features/stats/hooks/useCalendarController.ts`
- `mobile/src/features/stats/components/` (all section components)
- `mobile/src/queries/useReadingStats.ts`
- `mobile/src/types/stats.ts`

---

## 8. Statistics Update Flow

**When session logged/updated/deleted:**
1. Observer triggers incremental stat update
2. Session marked `isPendingSync = true`
3. Sync pushes changes to backend
4. Backend recalculates affected stats
5. Frontend queries stats endpoint
6. QueryClient invalidates stats cache
7. Components re-render with new values

**Full Recalculation:**
- Available via an artisan command (see backend console commands)
- Rebuilds stats from raw session data
- Used for data correction or initial setup
