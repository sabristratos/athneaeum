Here is the comprehensive plan for the **Stratos Recommendation Engine**.

---

# Architecture Specification: The Librarian Engine

## 1. Core Philosophy & Roles

The architecture strictly separates concerns to maintain the "Stratos" standard of control.

* **The Backend (The Brain):** Handles all heavy lifting—Ingestion, ETL, Vectorization, Mathematical Similarity, and Querying. It exposes a clean, pre-calculated API to the mobile app.
* **The Mobile App (The Window):** Purely strictly a display layer. It renders high-performance lists and acts as a sensor, capturing "User Signals" (taps, scrolls, ignores) to feed back into the Brain.

## 2. Database Schema Strategy

We will use a **Hybrid Schema**: Normalized tables for strict relationships (Authors, Series) and JSONB/Vectors for flexible/AI data.

### Schema Structure

| Table | Type | Responsibility | Key Columns |
| --- | --- | --- | --- |
| `books` | **Core** | The central entity | `id`, `slug`, `embedding` (vector), `characters` (jsonb), `popularity_score` |
| `authors` | **Relation** | Normalized identities | `id`, `name`, `slug` |
| `series` | **Relation** | Series metadata | `id`, `title`, `slug`, `is_complete` |
| `genres` | **Relation** | Strict categorization | `id`, `name`, `slug` |
| `book_genre` | **Pivot** | Many-to-Many map | `book_id`, `genre_id` |
| `user_signals` | **Analytics** | Feedback loop data | `user_id`, `book_id`, `signal_type` (click/view), `weight` |

### Migration Logic (PostgreSQL + pgvector)

```sql
-- Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Books Table with Vector & HNSW Index
CREATE TABLE books (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    series_volume DECIMAL(4,1), -- Allows 1.5
    embedding vector(1536), -- OpenAI Ada-003 dimension
    characters JSONB, -- Flexible data
    popularity_score FLOAT DEFAULT 0, -- (Rating * log(ReviewCount))
    ...
);

-- High-Performance Index
CREATE INDEX books_embedding_idx ON books USING hnsw (embedding vector_cosine_ops);

```

---

## 3. Data Ingestion Pipeline (The "Craft")

The ingestion logic is the most critical part of the backend. It must sanitize "dirty" CSV data into our strict schema.

### The `IngestKaggleDataset` Action

1. **Chunking:** Process the CSV in batches of 500 to prevent memory leaks.
2. **Series Parsing:** Use Regex to extract Series Title vs. Volume.
* *Regex:* `/(.+?)\s+#(\d+(\.\d+)?)/`
* *Input:* "The Hunger Games #1" -> **Series:** "The Hunger Games", **Vol:** 1.


3. **Relation Management:**
* **Authors:** `firstOrCreate` by name.
* **Genres:** Decode JSON string `['Fiction', 'Dystopia']` -> `firstOrCreate` Genres -> Sync.


4. **Vectorization Strategy (Cost Control):**
* **Do not** embed all 50k books immediately.
* Flag imported books as `pending_embedding`.
* Run a background job to embed the top 5,000 (by review count) first.



---

## 4. Backend Logic (The Intelligence)

We replace "Services" with strictly typed **Action Classes**.

### Key Actions

1. **`IngestBookAction`**:
* **Input:** `BookData` DTO (Strictly typed).
* **Logic:** Handles the complex relationship mapping and database upserts.


2. **`GenerateEmbeddingAction`**:
* **Trigger:** Job dispatch.
* **Logic:** Concatenates `Title + Author + Description + Genres` -> Sends to OpenAI API -> Updates `embedding` column.


3. **`GetPersonalizedFeedAction`**:
* **Logic:** The core recommendation query.
* **Cold Start:** If user has no history, return `TopRated` cache.
* **Personalized:** Fetch user's last 3 read books -> Average their vectors -> Query Neighbors.



### The Query (Pseudo-SQL)

```sql
SELECT id, title,
       1 - (embedding <=> :user_vector) AS similarity -- Cosine Distance
FROM books
ORDER BY (embedding <=> :user_vector) ASC, popularity_score DESC
LIMIT 20;

```

---

## 5. Frontend Implementation (The Window)

### Mobile Architecture

1. **FlashList:** Mandatory for performance with cover images.
2. **Controller Hook:** `useDiscoveryController` handles fetching and signal logic.
3. **Signal Batching:** Do not hit the API on every tap. Queue signals locally and flush every 30 seconds or on backgrounding.

### API Response Contract

```json
{
  "sections": [
    {
      "type": "personalized",
      "title": "Because you read 'Dune'",
      "data": [ ...BookObjects ]
    },
    {
      "type": "trending",
      "title": "Trending this Week",
      "data": [ ...BookObjects ]
    }
  ]
}

```

---

## 6. The Execution Prompt

Feed this prompt to your coding AI to generate the implementation.

---

**Role:**
Act as a Senior Backend Architect and React Native Specialist. I am the owner of "Stratos," a one-man bespoke software company. We prioritize control, strict typing (DTOs), and maintainability.

**Context:**
We are adding a **Recommendation Engine** to a Laravel 12 / Expo / PostgreSQL app. The app currently uses WatermelonDB (Offline-first), but Recommendations will be **Online-Only** via API.

**Technical Stack:**

* **Backend:** Laravel 12, PostgreSQL 16 (pgvector), `spatie/laravel-data`.
* **Mobile:** Expo 54, FlashList, TypeScript.

**The Task:**
Generate the complete scaffolding for the Recommendation System.

**Requirements:**

**1. Database Migration (SQL)**

* Create `authors`, `series`, `genres` (normalized tables).
* Create `book_genre` pivot.
* Update `books` table: Add `vector(1536)` column (nullable), `jsonb` characters column, `popularity_score` (float).
* Add **HNSW Index** for the vector column.

**2. Backend Logic (PHP)**

* **DTO:** Create `BookIngestData` DTO using `spatie/laravel-data`.
* **Action:** Create `IngestKaggleRowAction`.
* *Logic:* Parse "Series #1" using Regex `/(.+?)\s+#(\d+(\.\d+)?)/`.
* *Logic:* `firstOrCreate` Authors/Series/Genres.


* **Action:** Create `GetPersonalizedFeedAction`.
* *Logic:* Query `books` using Cosine Similarity (`<=>`) against a provided User Vector. Mix in `popularity_score` for ordering.



**3. Frontend Logic (TypeScript)**

* **Hook:** `useDiscoveryController`.
* *Logic:* Fetch feed data.
* *Logic:* `logSignal(bookId, type)` function that debounces/queues analytics to send to backend.


* **Component:** `DiscoverScreen` using `SectionList` + horizontal `FlashList`.

**Style Guide:**

* **Strictly Typed:** No `unguard`. No loose arrays.
* **Action Pattern:** Single capability per class (e.g., `App\Actions\Library\IngestBookAction`).
* **Tone:** Professional, production-ready code.

---