# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Digital Athenaeum is a book tracking mobile app with dual-aesthetic themes (Dark Academia "Scholar" / Cozy Cottagecore "Dreamer"). It's a monorepo with a Laravel API backend and Expo React Native mobile frontend.

## Monorepo Structure

```
athenaeum/
├── backend/           # Laravel 12 API
└── mobile/            # Expo React Native app
```

## Development Commands

### Backend (Laravel)
```powershell
cd backend
composer setup          # Initial setup: install, env, key, migrate, npm
composer dev            # Run server + queue + logs + vite concurrently
composer test           # Run PHPUnit tests
php artisan test --filter=TestName  # Run single test
php artisan pint        # Code formatting
```

### Mobile (Expo)
```powershell
cd mobile
npm start               # Start Expo dev server
npm run android         # Run on Android
npm run ios             # Run on iOS simulator
npm run web             # Run in browser
```

## Architecture

### Backend
- **Framework**: Laravel 12 with Sanctum for mobile token auth
- **Database**: SQLite (dev), PostgreSQL (production planned)
- **API Pattern**: RESTful endpoints under `/api/` with auth:sanctum middleware

### Mobile
- **Framework**: Expo 54 with React 19, TypeScript
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **State**: Zustand for client state, TanStack Query for server state
- **Styling**: NativeWind (Tailwind CSS for React Native) with CSS variables
- **Auth Storage**: expo-secure-store for tokens

### Dual Theme System

The app has two complete visual identities switchable at runtime:

**Scholar (Dark Academia)**
- Dark surfaces (#12100e canvas)
- Deep burgundy primary (#8b2e2e)
- Fonts: Playfair Display (heading), Crimson Text (body)
- Sharp corners, star ratings

**Dreamer (Cottagecore)**
- Light surfaces (#fdfbf7 canvas)
- Sage green primary (#8da399)
- Fonts: Nunito Bold (heading), Nunito SemiBold (body)
- Rounded corners (12-48px), heart ratings

Theme colors are set via CSS variables in `ThemeProvider`, enabling instant switching without re-renders:
- Theme definitions: `mobile/src/themes/themes/` (each theme in own file)
- Tailwind config: `mobile/tailwind.config.js`
- Theme store: `mobile/src/stores/themeStore.ts` (persisted to AsyncStorage)

## Code Patterns

### Mobile Components
Use semantic color tokens in NativeWind classes - never raw colors:
```tsx
// Correct
<View className="bg-surface text-foreground border-border">
<Text className="text-foreground-muted">

// Wrong - never use raw colors
<View className="bg-gray-100 text-gray-900">
```

### Mobile Directory Structure
```
mobile/src/
├── components/        # Shared UI (Text, Button, Card, Input, Rating, etc.)
├── themes/            # Theme system
│   ├── themes/        # Individual theme files (scholar.ts, dreamer.ts)
│   ├── shared.ts      # Shared constants (spacing)
│   ├── utils.ts       # getTheme(), getThemeCSSVars()
│   └── ThemeContext.tsx
├── stores/            # Zustand stores (themeStore.ts)
├── types/             # TypeScript interfaces
├── api/               # API client (to implement)
├── hooks/             # Custom hooks
├── features/          # Feature modules (auth, library, search, reading)
└── navigation/        # Navigation config
```

### Backend
- Sanctum tokens for mobile auth
- Service classes for external APIs (e.g., GoogleBooksService)
- Enums for status values (BookStatusEnum, ThemeEnum)
- `declare(strict_types=1)` on all PHP files
- PHPDoc blocks and type hints required
- Modify original migrations instead of creating new ones, then `migrate:fresh --seed`
- No comments unless necessary

## Key Files

- `plan.md` - Full implementation roadmap with database schemas and API endpoints
- `mobile/src/themes/themes/` - Theme definitions (scholar.ts, dreamer.ts)
- `mobile/tailwind.config.js` - Semantic color tokens
- `backend/routes/api.php` - API route definitions
- `backend/config/sanctum.php` - Token auth configuration

## Adding a New Theme

1. Create `mobile/src/themes/themes/newtheme.ts` with a `Theme` object
2. Add to registry in `mobile/src/themes/themes/index.ts`
3. Update `ThemeName` type in `mobile/src/types/theme.ts`

## Planned Features (from plan.md)

MVP scope: Authentication, book search (Google Books API), library management with shelves (want-to-read, reading, read, DNF), reading progress tracking with sessions, fractional ratings (0.25 increments).
