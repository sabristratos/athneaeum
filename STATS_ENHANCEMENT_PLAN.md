# Stats Enhancement & AI-Ready Architecture Plan

## Executive Summary

This plan outlines enhancements to the Reader DNA stats system and establishes a foundation for AI/LLM integration. The architecture follows a **pre-aggregated statistics** model that enables:
- Fast stat retrieval without heavy calculations
- Structured data ready for LLM consumption
- Event-driven updates via Laravel observers
- Exportable reading profiles for personalized AI features

---

## Part 1: Current State Analysis

### Existing Data Model
```
users
├── preferences (JSON)
└── theme

books
├── title, author, page_count
├── genres (JSON)
└── published_date

user_books
├── status, rating, current_page
├── is_dnf, dnf_reason
├── started_at, finished_at
├── format, price
└── tags (pivot)

reading_sessions
├── date, pages_read
├── start_page, end_page
├── duration_seconds
└── notes
```

### Current Stats (Calculated On-Demand)
- Heatmap (365-day activity)
- Streaks (current/longest)
- Reading rhythm detection
- Format velocity (pages/hour)
- Mood ring (genre/tag breakdown)
- DNF analytics
- Page economy

### Limitations
1. **Performance**: Heavy calculations on every request
2. **No historical tracking**: Can't compare "this month vs last month"
3. **No goals system**: Users can't set reading targets
4. **Not LLM-ready**: Data isn't structured for AI consumption
5. **Limited insights**: Missing time-of-day patterns, velocity trends, predictions

---

## Part 2: Enhanced Statistics Features

### 2.1 Time Intelligence

**Time-of-Day Analysis**
- When does the user read? (Morning/Afternoon/Evening/Night)
- Peak reading hours histogram
- Session duration by time of day

**Implementation**: Add `started_at` timestamp to reading_sessions (currently only has `date`)

```php
// reading_sessions migration addition
$table->timestamp('started_at')->nullable();
$table->timestamp('ended_at')->nullable();
```

**Day-of-Week Patterns**
- Already partially implemented in rhythm detection
- Enhance with visualization: "Your most productive day is Saturday"

**Seasonal Patterns**
- Already implemented in mood ring
- Enhance: Track reading volume by season, not just genres

### 2.2 Velocity & Progress Tracking

**Reading Speed Trends**
- Pages/hour over time (is user getting faster?)
- Speed by genre (faster at fiction vs non-fiction?)
- Speed by format (already implemented)

**Completion Predictions**
- Based on current velocity, estimate finish date
- "At your current pace, you'll finish in 5 days"

**Book Length Preferences**
- Average page count of completed books
- DNF rate by page count ranges
- Sweet spot detection: "You finish 90% of books between 200-350 pages"

### 2.3 Reading Preferences Deep Dive

**Genre Analysis**
- Top genres by count, rating, completion rate
- Genre diversity score (Herfindahl index)
- Genre trends over time
- "You've been reading more mystery lately"

**Author Loyalty**
- Authors read multiple times
- Average rating by author
- "You've read 5 books by Brandon Sanderson"

**Rating Patterns**
- Average rating overall
- Rating distribution histogram
- Are they a generous or critical rater?
- Rating trends over time

### 2.4 Goals & Challenges System

**Reading Goals**
```php
// New table: reading_goals
Schema::create('reading_goals', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type'); // 'books', 'pages', 'minutes', 'streak'
    $table->string('period'); // 'daily', 'weekly', 'monthly', 'yearly'
    $table->integer('target');
    $table->integer('year');
    $table->integer('month')->nullable(); // for monthly goals
    $table->timestamps();
});
```

**Goal Types**
- Books per year/month
- Pages per day/week/month
- Reading minutes per day
- Streak goals (read X days in a row)

**Progress Tracking**
- Percentage complete
- On-track indicator
- Projected completion

### 2.5 Social & Comparative Stats

**Percentile Rankings** (requires aggregate data across users)
- "You read more than 75% of Athenaeum users"
- "Your reading speed is in the top 20%"

**Reading Consistency Score**
- Based on streak frequency, session regularity
- 0-100 score with label (Casual, Regular, Dedicated, Obsessed)

**Diversity Score**
- Genre variety (more genres = higher score)
- Format variety
- Author variety

### 2.6 Year in Review

**Annual Summary**
- Total books, pages, hours
- Top genres, authors
- Longest book, fastest read
- Reading timeline visualization
- Memorable quotes (if quote capture is implemented)
- Shareable cards for social media

---

## Part 3: Pre-Aggregated Statistics Architecture

### 3.1 User Statistics Table

```php
Schema::create('user_statistics', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();

    // Lifetime Totals
    $table->integer('total_books_read')->default(0);
    $table->integer('total_pages_read')->default(0);
    $table->integer('total_reading_seconds')->default(0);
    $table->integer('total_books_dnf')->default(0);
    $table->decimal('total_spent', 10, 2)->default(0);

    // Current Period (resets monthly/yearly)
    $table->integer('books_read_this_year')->default(0);
    $table->integer('books_read_this_month')->default(0);
    $table->integer('pages_read_this_year')->default(0);
    $table->integer('pages_read_this_month')->default(0);

    // Streaks
    $table->integer('current_streak')->default(0);
    $table->integer('longest_streak')->default(0);
    $table->date('last_reading_date')->nullable();

    // Velocity
    $table->decimal('avg_pages_per_hour', 6, 2)->nullable();
    $table->decimal('avg_pages_per_session', 6, 2)->nullable();
    $table->integer('avg_session_minutes')->nullable();

    // Patterns (JSON for flexibility)
    $table->json('reading_by_hour')->nullable();      // {0: 5, 1: 2, ..., 23: 10}
    $table->json('reading_by_day')->nullable();       // {0: 100, 1: 50, ..., 6: 200}
    $table->json('reading_by_month')->nullable();     // {1: 500, 2: 600, ...}
    $table->json('genres_breakdown')->nullable();     // [{genre, count, pages, avg_rating}]
    $table->json('formats_breakdown')->nullable();    // [{format, count, velocity}]
    $table->json('ratings_distribution')->nullable(); // {1: 2, 2: 5, 3: 10, 4: 20, 5: 15}

    // Computed Scores
    $table->integer('consistency_score')->nullable(); // 0-100
    $table->integer('diversity_score')->nullable();   // 0-100
    $table->string('reader_type')->nullable();        // 'weekend_warrior', etc.

    // LLM-Ready Profile
    $table->json('reading_profile')->nullable();      // Structured for AI consumption
    $table->text('profile_narrative')->nullable();    // Natural language summary

    // Timestamps
    $table->timestamp('last_calculated_at')->nullable();
    $table->timestamps();

    $table->unique('user_id');
});
```

### 3.2 Monthly Statistics Archive

```php
Schema::create('user_statistics_monthly', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->integer('year');
    $table->integer('month');

    $table->integer('books_read')->default(0);
    $table->integer('books_dnf')->default(0);
    $table->integer('pages_read')->default(0);
    $table->integer('reading_seconds')->default(0);
    $table->integer('sessions_count')->default(0);
    $table->decimal('avg_rating', 3, 2)->nullable();
    $table->json('genres')->nullable();
    $table->json('top_books')->nullable(); // [{id, title, rating}]

    $table->timestamps();

    $table->unique(['user_id', 'year', 'month']);
});
```

### 3.3 Observer-Based Updates

```php
// app/Observers/ReadingSessionObserver.php
class ReadingSessionObserver
{
    public function created(ReadingSession $session): void
    {
        app(StatisticsAggregationService::class)
            ->incrementSessionStats($session);
    }

    public function updated(ReadingSession $session): void
    {
        app(StatisticsAggregationService::class)
            ->recalculateForSession($session);
    }

    public function deleted(ReadingSession $session): void
    {
        app(StatisticsAggregationService::class)
            ->decrementSessionStats($session);
    }
}

// app/Observers/UserBookObserver.php
class UserBookObserver
{
    public function updated(UserBook $userBook): void
    {
        if ($userBook->wasChanged('status')) {
            app(StatisticsAggregationService::class)
                ->handleStatusChange($userBook);
        }

        if ($userBook->wasChanged('rating')) {
            app(StatisticsAggregationService::class)
                ->updateRatingStats($userBook);
        }
    }
}
```

### 3.4 Aggregation Service

```php
// app/Services/Stats/StatisticsAggregationService.php
class StatisticsAggregationService
{
    public function recalculateAll(User $user): void
    {
        $stats = $this->calculateFromScratch($user);

        UserStatistics::updateOrCreate(
            ['user_id' => $user->id],
            $stats + ['last_calculated_at' => now()]
        );
    }

    public function incrementSessionStats(ReadingSession $session): void
    {
        $userId = $session->userBook->user_id;

        UserStatistics::where('user_id', $userId)->update([
            'total_pages_read' => DB::raw("total_pages_read + {$session->pages_read}"),
            'total_reading_seconds' => DB::raw("total_reading_seconds + {$session->duration_seconds}"),
            'pages_read_this_month' => DB::raw("pages_read_this_month + {$session->pages_read}"),
            'pages_read_this_year' => DB::raw("pages_read_this_year + {$session->pages_read}"),
        ]);

        $this->updateStreaks($userId, $session->date);
        $this->updateTimePatterns($userId);
    }

    public function handleStatusChange(UserBook $userBook): void
    {
        $newStatus = $userBook->status->value;
        $oldStatus = $userBook->getOriginal('status')?->value;

        if ($newStatus === 'read' && $oldStatus !== 'read') {
            $this->incrementBooksRead($userBook);
        } elseif ($oldStatus === 'read' && $newStatus !== 'read') {
            $this->decrementBooksRead($userBook);
        }

        if ($userBook->is_dnf && !$userBook->getOriginal('is_dnf')) {
            $this->incrementDnfCount($userBook);
        }
    }

    public function generateReadingProfile(User $user): array
    {
        // Structured data for LLM consumption
        return [
            'reader_identity' => [
                'type' => $this->determineReaderType($user),
                'consistency' => $this->getConsistencyLabel($user),
                'pace' => $this->getPaceLabel($user),
            ],
            'preferences' => [
                'favorite_genres' => $this->getTopGenres($user, 5),
                'preferred_length' => $this->getPreferredBookLength($user),
                'preferred_format' => $this->getPreferredFormat($user),
                'reading_times' => $this->getPreferredReadingTimes($user),
            ],
            'patterns' => [
                'dnf_triggers' => $this->getDnfTriggers($user),
                'high_rating_patterns' => $this->getHighRatingPatterns($user),
                'seasonal_trends' => $this->getSeasonalTrends($user),
            ],
            'metrics' => [
                'books_per_month' => $this->getAvgBooksPerMonth($user),
                'pages_per_hour' => $this->getAvgPagesPerHour($user),
                'avg_rating' => $this->getAvgRating($user),
                'completion_rate' => $this->getCompletionRate($user),
            ],
        ];
    }
}
```

### 3.5 Scheduled Jobs

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    // Daily: Update streaks at midnight
    $schedule->command('stats:update-streaks')->dailyAt('00:05');

    // Weekly: Recalculate all stats for consistency
    $schedule->command('stats:recalculate-all')->weeklyOn(0, '03:00');

    // Monthly: Archive previous month, reset monthly counters
    $schedule->command('stats:archive-month')->monthlyOn(1, '00:10');

    // Yearly: Generate year in review, reset yearly counters
    $schedule->command('stats:archive-year')->yearlyOn(1, 1, '00:30');
}
```

---

## Part 4: AI/LLM Integration Architecture

### 4.1 Reading Profile for LLMs

The `reading_profile` JSON field stores a structured summary optimized for LLM context:

```json
{
  "summary": "Avid fantasy reader who prefers long series, reads primarily on weekends, and rates books generously.",

  "identity": {
    "reader_type": "weekend_warrior",
    "pace": "moderate",
    "rating_style": "generous",
    "completion_style": "finisher"
  },

  "preferences": {
    "genres": {
      "favorites": ["Fantasy", "Science Fiction", "Mystery"],
      "avoided": ["Romance", "Horror"],
      "trending_up": ["Non-Fiction"],
      "trending_down": ["Young Adult"]
    },
    "books": {
      "preferred_length": "400-600 pages",
      "format": "ebook",
      "series_preference": "enjoys_series"
    },
    "reading_times": {
      "peak_hours": ["21:00-23:00", "09:00-11:00"],
      "peak_days": ["Saturday", "Sunday"],
      "season_peak": "winter"
    }
  },

  "patterns": {
    "dnf_triggers": [
      "Books over 600 pages",
      "Romance subplot heavy",
      "Slow first 100 pages"
    ],
    "high_rating_correlation": [
      "Magic systems",
      "Character-driven",
      "Series books"
    ],
    "reading_velocity": {
      "fantasy": 45,
      "non_fiction": 30,
      "mystery": 55
    }
  },

  "recent_activity": {
    "last_30_days": {
      "books_read": 3,
      "pages_read": 1200,
      "avg_rating": 4.2,
      "genres": ["Fantasy", "Fantasy", "Mystery"]
    },
    "currently_reading": [
      {"title": "The Way of Kings", "progress": 65, "velocity": 42}
    ]
  },

  "recommendations_context": {
    "recently_loved": ["Project Hail Mary", "The Name of the Wind"],
    "recently_disliked": ["Twilight"],
    "on_tbr": ["Mistborn", "Dune", "1984"],
    "mood_indicators": ["wants_escapism", "prefers_happy_endings"]
  }
}
```

### 4.2 Natural Language Profile

The `profile_narrative` field contains a human-readable summary for direct LLM injection:

```
"Alex is a dedicated weekend reader who has completed 47 books this year,
averaging 4 books per month. They strongly prefer fantasy and science fiction,
particularly epic series with complex magic systems. They read at about 45
pages per hour and typically finish books they start (87% completion rate).

They tend to DNF books that are over 600 pages or have slow starts. Their
highest-rated books share common themes: strong character development,
intricate world-building, and satisfying conclusions.

Currently reading 'The Way of Kings' at 65% progress. Recent favorites
include 'Project Hail Mary' (5 stars) and 'The Name of the Wind' (4.5 stars).
Their TBR includes several Sanderson novels, suggesting interest in
continuing the Cosmere series."
```

### 4.3 AI Feature Endpoints

```php
// routes/api.php
Route::prefix('ai')->middleware('auth:sanctum')->group(function () {
    // Get structured profile for LLM context
    Route::get('/profile', [AiController::class, 'profile']);

    // Get recommendations based on profile
    Route::get('/recommendations', [AiController::class, 'recommendations']);

    // Natural language query about reading data
    Route::post('/query', [AiController::class, 'query']);

    // Generate insights for a specific book
    Route::get('/book-insights/{userBook}', [AiController::class, 'bookInsights']);
});
```

### 4.4 LLM Integration Service

```php
// app/Services/AI/ReadingAssistantService.php
class ReadingAssistantService
{
    public function __construct(
        private LLMClient $llm,
        private StatisticsAggregationService $stats
    ) {}

    public function getPersonalizedRecommendations(User $user, int $count = 5): array
    {
        $profile = $this->stats->generateReadingProfile($user);

        $prompt = $this->buildRecommendationPrompt($profile, $count);

        return $this->llm->complete($prompt);
    }

    public function answerReadingQuery(User $user, string $query): string
    {
        $profile = $user->statistics->reading_profile;
        $narrative = $user->statistics->profile_narrative;

        $context = "User Reading Profile:\n{$narrative}\n\nDetailed Data:\n" .
                   json_encode($profile, JSON_PRETTY_PRINT);

        return $this->llm->chat([
            ['role' => 'system', 'content' => "You are a reading assistant..."],
            ['role' => 'user', 'content' => "Context: {$context}\n\nQuestion: {$query}"]
        ]);
    }

    public function generateMonthlyInsights(User $user): array
    {
        $currentMonth = $user->statisticsMonthly()
            ->where('year', now()->year)
            ->where('month', now()->month)
            ->first();

        $lastMonth = $user->statisticsMonthly()
            ->where('year', now()->subMonth()->year)
            ->where('month', now()->subMonth()->month)
            ->first();

        // Generate comparative insights
        return $this->llm->complete(
            $this->buildInsightsPrompt($currentMonth, $lastMonth)
        );
    }
}
```

### 4.5 Event Streaming for Real-Time AI

```php
// app/Events/ReadingActivityEvent.php
class ReadingActivityEvent implements ShouldBroadcast
{
    public function __construct(
        public User $user,
        public string $type, // 'session_logged', 'book_finished', 'rating_added'
        public array $data
    ) {}
}

// For future: Real-time AI assistant that reacts to reading activity
// "I noticed you just finished a book! Based on your rating, here are similar books..."
```

---

## Part 5: New Mobile UI Components

### 5.1 Enhanced Stats Dashboard

**Trend Charts**
- Line graph: Pages read over time (last 30/90/365 days)
- Bar chart: Books by month
- Comparison: This period vs last period

**Interactive Filters**
- Time period selector: Week / Month / Year / All Time
- Genre filter: Show stats for specific genres
- Format filter: Physical / Ebook / Audiobook

### 5.2 Goals Widget

```
┌─────────────────────────────────────┐
│  2024 Reading Goal                  │
│  ████████████░░░░░░░░  24/50 books  │
│  48% complete • On track (+2)       │
│                                     │
│  Monthly: ████████░░░░  4/5 books   │
│  Daily streak: 🔥 12 days           │
└─────────────────────────────────────┘
```

### 5.3 Insights Feed

AI-generated insight cards that appear contextually:

```
┌─────────────────────────────────────┐
│ 💡 Insight                          │
│                                     │
│ You've been reading 40% more this   │
│ month! Your fantasy reading has     │
│ increased, especially on weekends.  │
│                                     │
│ [See Details]        [Dismiss]      │
└─────────────────────────────────────┘
```

### 5.4 Year in Review Screen

Swipeable cards with:
- Total stats (books, pages, hours)
- Top 5 books by rating
- Genre breakdown donut
- Reading timeline heatmap
- Memorable quotes
- "Share" button for social cards

---

## Part 6: Implementation Phases

### Phase 1: Data Foundation (1-2 weeks)
- [ ] Create `user_statistics` table
- [ ] Create `user_statistics_monthly` table
- [ ] Create `reading_goals` table
- [ ] Implement `StatisticsAggregationService`
- [ ] Create observers for automatic updates
- [ ] Create `stats:recalculate-all` command
- [ ] Migrate existing data

### Phase 2: Enhanced Stats (1-2 weeks)
- [ ] Add `started_at`/`ended_at` to reading_sessions
- [ ] Implement time-of-day analysis
- [ ] Implement velocity trends
- [ ] Implement genre/author deep dive
- [ ] Update ReaderDNAService to use pre-aggregated data
- [ ] Add comparative stats (this month vs last)

### Phase 3: Goals System (1 week)
- [ ] Create goals API endpoints
- [ ] Build goals UI components
- [ ] Implement progress tracking
- [ ] Add goal notifications

### Phase 4: AI Integration Prep (1-2 weeks)
- [ ] Implement `generateReadingProfile()`
- [ ] Implement `profile_narrative` generation
- [ ] Create AI-focused API endpoints
- [ ] Build export functionality

### Phase 5: AI Features (2-3 weeks)
- [ ] Integrate LLM provider (OpenAI/Anthropic)
- [ ] Implement personalized recommendations
- [ ] Implement natural language queries
- [ ] Build insights generation
- [ ] Create insights feed UI

### Phase 6: Year in Review (1 week)
- [ ] Design shareable cards
- [ ] Build Year in Review screen
- [ ] Implement social sharing

---

## Part 7: API Changes Summary

### New Endpoints

```php
// Statistics
GET  /api/stats/overview          // Aggregated stats from user_statistics
GET  /api/stats/trends            // Time-series data for charts
GET  /api/stats/compare           // Period comparison

// Goals
GET  /api/goals                   // List user's goals
POST /api/goals                   // Create goal
PUT  /api/goals/{id}              // Update goal
GET  /api/goals/{id}/progress     // Goal progress

// AI
GET  /api/ai/profile              // LLM-ready profile
GET  /api/ai/recommendations      // AI recommendations
POST /api/ai/query                // Natural language query
GET  /api/ai/insights             // Generated insights

// Year in Review
GET  /api/stats/year-review/{year}
```

### Modified Endpoints

```php
// Existing stats endpoints now read from pre-aggregated data
GET /api/stats/heatmap           // Faster, uses cached calculations
GET /api/stats/format-velocity   // Reads from user_statistics.formats_breakdown
GET /api/stats/mood-ring         // Reads from user_statistics.genres_breakdown
```

---

## Part 8: Difficulty Assessment for AI Integration

### Easy (Foundation is solid)
- Pre-aggregated statistics storage
- Observer-based updates
- Structured profile generation
- Basic export functionality

### Medium (Requires careful design)
- Natural language profile generation
- Trend analysis and comparisons
- Goals system with notifications
- Year in review generation

### Challenging (Requires LLM integration)
- Personalized recommendations
- Natural language queries
- Real-time insights
- Predictive features (finish date, DNF probability)

### Key Success Factors
1. **Clean data model**: The current schema is well-structured
2. **Observer pattern**: Laravel makes this straightforward
3. **JSON flexibility**: Storing patterns as JSON allows evolution
4. **Incremental approach**: Can add AI features gradually

---

## Conclusion

The current architecture is a solid foundation. The main additions needed are:

1. **Pre-aggregated statistics table** - Single most important change for performance and AI readiness
2. **Observer-based updates** - Keep aggregates in sync automatically
3. **Structured reading profile** - Enable any LLM to understand user preferences
4. **Goals system** - High user value, relatively simple implementation

The AI integration becomes straightforward once the data layer is in place. The reading profile JSON serves as the "context" that can be injected into any LLM prompt, enabling features like:
- "Recommend books based on my reading history"
- "Why do I keep DNF'ing fantasy books?"
- "Generate my year in review summary"
- "Predict if I'll finish this book"

**Estimated total effort**: 6-10 weeks for full implementation
**Minimum viable enhancement**: 2-3 weeks (Phase 1 + 2)
