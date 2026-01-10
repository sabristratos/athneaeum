# The Digital Athenaeum - Implementation Plan

## Project Overview
A book tracking app with dual-aesthetic themes (Dark Academia / Cozy Cottagecore) targeting the modern "aesthetic" reader community.

**Tech Stack:**
- Backend: Laravel 11 (API)
- Frontend: Expo (React Native)
- Database: SQLite (mobile) + PostgreSQL (backend)
- Styling: NativeWind (Tailwind CSS for React Native)
- Language: TypeScript

---

## Project Structure

```
athenaeum/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Enums/
│   │   ├── Http/Controllers/Api/
│   │   ├── Models/
│   │   └── Services/
│   ├── database/migrations/
│   └── routes/api.php
│
└── mobile/                     # Expo App
    ├── src/
    │   ├── api/               # API client & hooks
    │   ├── components/        # Shared components
    │   ├── features/          # Feature-based modules
    │   │   ├── auth/
    │   │   ├── library/
    │   │   ├── reading/
    │   │   └── search/
    │   ├── hooks/
    │   ├── navigation/
    │   ├── stores/            # Zustand stores
    │   ├── themes/            # Dual theme system
    │   └── types/
    ├── app.json
    └── tailwind.config.js
```

---

## Phase 1: Foundation & MVP

### Step 1: Backend Setup (Laravel)

#### 1.1 Create Laravel Project
```bash
composer create-project laravel/laravel backend
cd backend
composer require laravel/sanctum
php artisan install:api
```

#### 1.2 Database Schema

**migrations/create_books_table.php**
```php
Schema::create('books', function (Blueprint $table) {
    $table->id();
    $table->string('google_books_id')->unique()->nullable();
    $table->string('title');
    $table->string('author');
    $table->string('cover_url')->nullable();
    $table->integer('page_count')->nullable();
    $table->string('isbn')->nullable();
    $table->text('description')->nullable();
    $table->json('genres')->nullable();
    $table->date('published_date')->nullable();
    $table->timestamps();
});
```

**migrations/create_user_books_table.php**
```php
Schema::create('user_books', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('book_id')->constrained()->cascadeOnDelete();
    $table->string('status'); // want_to_read, reading, read, dnf
    $table->decimal('rating', 3, 2)->nullable(); // 0.00 - 5.00 (quarter increments)
    $table->integer('current_page')->default(0);
    $table->boolean('is_dnf')->default(false);
    $table->text('dnf_reason')->nullable();
    $table->date('started_at')->nullable();
    $table->date('finished_at')->nullable();
    $table->timestamps();

    $table->unique(['user_id', 'book_id']);
});
```

**migrations/create_reading_sessions_table.php**
```php
Schema::create('reading_sessions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_book_id')->constrained()->cascadeOnDelete();
    $table->date('date');
    $table->integer('pages_read');
    $table->integer('start_page');
    $table->integer('end_page');
    $table->integer('duration_seconds')->nullable();
    $table->text('notes')->nullable();
    $table->timestamps();
});
```

**migrations/add_theme_to_users_table.php**
```php
Schema::table('users', function (Blueprint $table) {
    $table->string('theme')->default('scholar'); // scholar | dreamer
    $table->json('preferences')->nullable();
});
```

#### 1.3 Enums

```php
// app/Enums/BookStatusEnum.php
enum BookStatusEnum: string
{
    case WantToRead = 'want_to_read';
    case Reading = 'reading';
    case Read = 'read';
    case Dnf = 'dnf';
}

// app/Enums/ThemeEnum.php
enum ThemeEnum: string
{
    case Scholar = 'scholar';  // Dark Academia
    case Dreamer = 'dreamer';  // Cozy Cottagecore
}
```

#### 1.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login (Sanctum) |
| GET | `/api/books/search` | Search Google Books API |
| POST | `/api/books` | Add book to database |
| GET | `/api/library` | Get user's library |
| POST | `/api/library/{book}` | Add book to library |
| PATCH | `/api/library/{userBook}` | Update reading status |
| DELETE | `/api/library/{userBook}` | Remove from library |
| POST | `/api/sessions` | Log reading session |
| GET | `/api/sessions` | Get reading history |
| PATCH | `/api/user/theme` | Toggle theme preference |

---

### Step 2: Mobile App Setup (Expo)

#### 2.1 Create Expo Project
```bash
npx create-expo-app@latest mobile --template expo-template-blank-typescript
cd mobile
npx expo install nativewind tailwindcss
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install zustand
npx expo install @tanstack/react-query
npx expo install expo-secure-store
npx expo install expo-haptics expo-av
```

#### 2.2 Theme System Architecture

**src/themes/tokens.ts**
```typescript
export const themes = {
  scholar: {
    // Dark Academia
    colors: {
      canvas: '#1a1814',
      surface: '#2d2a24',
      surfaceHover: '#3d3930',
      primary: '#c9a962',
      primaryHover: '#d4b872',
      foreground: '#e8e4d9',
      foregroundMuted: '#a8a296',
      accent: '#8b7355',
      success: '#6b8e6b',
      danger: '#a65d5d',
    },
    fonts: {
      heading: 'PlayfairDisplay',
      body: 'CrimsonText',
    },
    icons: {
      rating: 'star-sharp',
      progress: 'ink-pot',
    },
    sounds: {
      tap: 'mechanical-click',
      success: 'paper-rustle',
    },
  },
  dreamer: {
    // Cozy Cottagecore
    colors: {
      canvas: '#faf8f5',
      surface: '#f0ebe3',
      surfaceHover: '#e8e2d8',
      primary: '#7d9471',
      primaryHover: '#6b8260',
      foreground: '#3d3d3d',
      foregroundMuted: '#6b6b6b',
      accent: '#d4a574',
      success: '#7d9471',
      danger: '#c47d7d',
    },
    fonts: {
      heading: 'Nunito',
      body: 'NunitoSans',
    },
    icons: {
      rating: 'heart-soft',
      progress: 'plant',
    },
    sounds: {
      tap: 'soft-click',
      success: 'water-drop',
    },
  },
} as const;
```

**src/stores/themeStore.ts**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'scholar' | 'dreamer';

interface ThemeStore {
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'scholar',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'scholar' ? 'dreamer' : 'scholar'
      })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

#### 2.3 NativeWind Configuration

**tailwind.config.js**
```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dynamic colors set via CSS variables
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        foreground: 'var(--color-foreground)',
        // ... etc
      },
    },
  },
};
```

---

### Step 3: Core Features Implementation

#### 3.1 Book Search (Google Books API)

**Backend: app/Services/GoogleBooksService.php**
```php
class GoogleBooksService
{
    public function search(string $query, int $limit = 20): array
    {
        $response = Http::get('https://www.googleapis.com/books/v1/volumes', [
            'q' => $query,
            'maxResults' => $limit,
            'key' => config('services.google_books.key'),
        ]);

        return $this->transformResults($response->json('items', []));
    }
}
```

**Mobile: src/features/search/SearchScreen.tsx**
- Debounced search input
- Results list with book covers
- "Add to Library" action

#### 3.2 Library Management

**Mobile screens:**
- `LibraryScreen.tsx` - Tabbed view (All, Reading, Want to Read, Finished, DNF)
- `BookDetailScreen.tsx` - Book info, status controls, rating
- `AddToLibraryModal.tsx` - Shelf selection

#### 3.3 Reading Progress & Sessions

**Mobile: src/features/reading/LogSessionScreen.tsx**
- Page picker (current -> new page)
- Date picker (defaults to today)
- Optional duration timer
- Notes field

#### 3.4 Fractional Rating Component

**src/components/FractionalRating.tsx**
- Custom component supporting 0.25 increments
- Scholar mode: Sharp stars
- Dreamer mode: Soft hearts
- Touch/drag interaction

#### 3.5 DNF Handling

**Logic:**
- Separate "DNF" shelf that preserves reading history
- DNF reason selection (pacing, writing style, content, lost interest, other)
- DNF books don't count toward "finished" stats but track pages read

---

## Phase 2: Engagement Features (Future)

### Reading Room (Gamification)
- Isometric 2D room view using Skia or Expo GL
- Currency system (Ink/Dew) earned from pages read
- Furniture/decor shop
- Friend room visits

### Spoiler-Safe Social
- Chapter-tagged posts
- Progress-based visibility filtering
- Discussion threads per book

### Widget System
- iOS: WidgetKit via Expo
- Android: Widget using expo-widgets
- Lock screen progress bar
- Home screen "reminder" widget

---

## Phase 3: Intelligence (Future)

- OCR quote scanning (expo-camera + Cloud Vision API)
- Semantic search with pgvector
- Reading habit insights
- Personalized recommendations

---

## Implementation Order (MVP)

### Week 1-2: Project Setup
- [ ] Initialize Laravel backend with Sanctum auth
- [ ] Create database migrations
- [ ] Initialize Expo project with dependencies
- [ ] Set up NativeWind and theme system foundation

### Week 3-4: Authentication & Core API
- [ ] Implement user registration/login API
- [ ] Create API resources and controllers
- [ ] Build auth flow in mobile app
- [ ] Secure token storage with expo-secure-store

### Week 5-6: Book Search & Library
- [ ] Google Books API integration
- [ ] Book search screen
- [ ] Library screen with shelves
- [ ] Add/remove books from library

### Week 7-8: Reading Progress
- [ ] Book detail screen
- [ ] Reading session logging
- [ ] Progress visualization
- [ ] Fractional rating component

### Week 9-10: Theme System & Polish
- [ ] Complete dual-theme implementation
- [ ] Theme toggle with animations
- [ ] Haptic feedback
- [ ] Sound effects (optional)

### Week 11-12: Testing & Launch Prep
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] App store assets
- [ ] Beta testing

---

## Key Technical Decisions

1. **SQLite vs PostgreSQL**: SQLite for offline-first mobile storage, PostgreSQL for backend. Sync strategy TBD.

2. **State Management**: Zustand for simplicity over Redux. React Query for server state.

3. **Theme Switching**: CSS variables approach with NativeWind for instant theme switching without re-render.

4. **Offline Support**: Queue reading sessions locally, sync when online.

5. **Authentication**: Laravel Sanctum mobile tokens stored in expo-secure-store.

---

## Verification Plan

1. **Auth Flow**: Register -> Login -> Token persists across app restart
2. **Search**: Query "Harry Potter" -> Results display with covers
3. **Library**: Add book -> Appears in "Want to Read" -> Move to "Reading"
4. **Progress**: Log 50 pages -> Progress bar updates -> Stats reflect change
5. **Theme**: Toggle theme -> All screens update instantly
6. **Offline**: Log session offline -> Syncs when back online

---

## Files to Create (Initial Setup)

**Backend:**
- `backend/` - Laravel project root
- `backend/app/Models/Book.php`
- `backend/app/Models/UserBook.php`
- `backend/app/Models/ReadingSession.php`
- `backend/app/Http/Controllers/Api/AuthController.php`
- `backend/app/Http/Controllers/Api/BookController.php`
- `backend/app/Http/Controllers/Api/LibraryController.php`
- `backend/app/Http/Controllers/Api/SessionController.php`
- `backend/app/Services/GoogleBooksService.php`
- `backend/app/Enums/BookStatusEnum.php`
- `backend/app/Enums/ThemeEnum.php`

**Mobile:**
- `mobile/` - Expo project root
- `mobile/src/api/client.ts`
- `mobile/src/stores/authStore.ts`
- `mobile/src/stores/themeStore.ts`
- `mobile/src/themes/tokens.ts`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/features/auth/LoginScreen.tsx`
- `mobile/src/features/library/LibraryScreen.tsx`
- `mobile/src/features/search/SearchScreen.tsx`
- `mobile/src/features/reading/BookDetailScreen.tsx`
- `mobile/src/components/FractionalRating.tsx`
- `mobile/src/components/ThemeToggle.tsx`
