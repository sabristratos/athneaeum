# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```powershell
npm start               # Start Expo dev server
npm run android         # Run on Android device/emulator
npm run ios             # Run on iOS simulator
npm run web             # Run in browser
```

## Architecture Overview

### Stack
- **Framework**: Expo 54, React 19, TypeScript
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **Styling**: NativeWind 4 (Tailwind CSS for React Native)
- **Local Database**: WatermelonDB with SQLite adapter (offline-first)
- **State**: Zustand stores persisted to MMKV storage
- **Auth**: expo-secure-store for token storage

### Provider Hierarchy
```
SafeAreaProvider
  └─ ThemeProvider (CSS vars via NativeWind)
      └─ DatabaseProvider (WatermelonDB + auto-sync)
          └─ RootNavigator
```

### Path Aliases
Use `@/` to import from `src/`:
```tsx
import { Button } from '@/components';
import { useTheme } from '@/themes';
```

## Theming System

### Three Themes
- **Scholar** (dark): Burgundy primary, Playfair/Crimson fonts, sharp corners, star ratings
- **Dreamer** (light): Lavender primary, Nunito font, rounded corners, heart ratings
- **Wanderer** (dark): Desert gold primary, compass rating icons

### Theme Architecture
1. Theme definitions in `src/themes/themes/{name}.ts` implement the `Theme` interface
2. `ThemeProvider` converts theme colors to CSS variables via NativeWind's `vars()`
3. `tailwind.config.js` maps semantic tokens to CSS variables
4. Components use NativeWind classes with semantic tokens

### Styling Rules
Always use semantic color tokens - never raw Tailwind colors:
```tsx
// Correct
<View className="bg-surface text-foreground border-border">
<Pressable className="bg-primary hover:bg-primary-hover">

// Wrong
<View className="bg-gray-900 text-white border-gray-700">
```

### Adding a New Theme
1. Create `src/themes/themes/mytheme.ts` implementing `Theme` interface
2. Export from `src/themes/themes/index.ts`
3. Add to `ThemeName` union in `src/types/theme.ts`

## Offline-First Database

### WatermelonDB Models
- `Book` - Book metadata (title, author, cover, etc.)
- `UserBook` - User's relationship to book (status, rating, progress)
- `ReadingSession` - Individual reading sessions with page tracking
- `SyncMetadata` - Tracks last sync timestamps

### Sync Pattern
All models use soft deletes (`is_deleted` flag) and pending sync flags (`is_pending_sync`). After mutations:
```tsx
import { scheduleSyncAfterMutation } from '@/database/sync';

await database.write(async () => {
  await userBook.updateStatus('reading');
});
scheduleSyncAfterMutation(); // Triggers background sync
```

### Database Hooks
- `useLibrary(status?)` - Observes user's library, optionally filtered by status
- `useUserBook(id)` - Observes single user_book with its book
- `useAddToLibrary()` - Returns `addBook` function
- `useSessions(userBookId)` - Observes reading sessions for a book

## Feature Structure

Features follow a modular pattern:
```
src/features/{feature}/
├── screens/           # Screen components
├── components/        # Feature-specific components
├── hooks/             # Controller hooks (useXxxController.ts)
└── index.ts           # Public exports
```

### Controller Pattern
Business logic is extracted into controller hooks:
```tsx
// src/features/auth/hooks/useLoginController.ts
export function useLoginController() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // ... all state and handlers
  return { email, setEmail, loading, handleLogin };
}

// Screen just renders UI
function LoginScreen() {
  const controller = useLoginController();
  return <AuthLayout>...</AuthLayout>;
}
```

## Component Guidelines

### Custom Components
Shared components in `src/components/` wrap React Native primitives with theming:
- `Text` - Themed text with `variant` prop (heading, body, caption, etc.)
- `Pressable` - Adds haptic feedback via `useHaptic` hook
- `Card` - Themed surface with border and shadows
- `Button` - Full button with variants (primary, secondary, ghost, danger)

### Icons
Use Hugeicons with the Icon component:
```tsx
import { Icon } from '@/components';
import { Book01Icon } from '@hugeicons/core-free-icons';

<Icon icon={Book01Icon} size={24} color={theme.colors.foreground} />
```

### Accessing Theme Values in Styles
For inline styles or StyleSheet, use the theme hooks:
```tsx
const { theme } = useTheme();
const colors = useThemeColors();
const radii = useThemeRadii();

<View style={{ backgroundColor: colors.surface, borderRadius: radii.md }}>
```

## API Client

Located in `src/api/client.ts`. Uses expo-secure-store for auth tokens:
```tsx
import { apiClient } from '@/api/client';

const data = await apiClient<BookResponse>('/books', {
  method: 'POST',
  body: { title: 'My Book' },
  requiresAuth: true, // default
});
```

Throws `AuthenticationError` on 401, `ApiRequestError` on other failures.

## Code Style

### Comments
- **Never add inline comments** (`//` or `/* */`)
- **Only use JSDoc blocks** (`/** */`) for functions and components that need documentation
- Code should be self-documenting through clear naming
