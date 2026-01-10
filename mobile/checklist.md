---

# Violations To Fix

## Phase 1: Infrastructure Setup
- [x] Install babel-plugin-module-resolver: `npm install --save-dev babel-plugin-module-resolver`
- [x] Configure path aliases in tsconfig.json (add `baseUrl` and `paths`)
- [x] Configure path aliases in babel.config.js (add module-resolver plugin)

## Phase 2: Fix `any` Types (12 instances)
- [x] `src/components/Input.tsx:23,28` - Replace `any` with `TextInputProps['onFocus']`
- [x] `src/components/Pressable.tsx:56,73` - Replace `any` with `GestureResponderEvent`
- [x] `src/components/QuoteCaptureModal.tsx:42-44` - Replace `any` with proper camera/OCR types
- [x] `src/components/QuoteCaptureModal.tsx:252,255` - Define `OCRBlock` and `OCRLine` interfaces
- [x] `src/database/models/Book.ts:36` - Replace `any` with `Query<UserBook>`
- [x] `src/database/models/UserBook.ts:41` - Replace `any` with `Query<ReadingSession>`
- [x] `src/database/hooks/useLibrary.ts:58` - Replace `any` with `Subscription` type

## Phase 3: Convert Default Exports to Named Exports
- [x] `src/database/models/Book.ts` - Change to named export
- [x] `src/database/models/UserBook.ts` - Change to named export
- [x] `src/database/models/ReadingSession.ts` - Change to named export
- [x] `src/database/models/SyncMetadata.ts` - Change to named export

## Phase 4: Convert Relative Imports to Path Aliases (~100 files)
- [x] Convert all `../` imports to `@/` aliases
- [x] Convert all `./` imports to `@/` aliases

## Phase 5: Extract Business Logic to Custom Hooks
- [x] `LoginScreen.tsx` → Create `useLoginController.ts`
- [x] `RegisterScreen.tsx` → Create `useRegisterController.ts`
- [x] `SearchScreen.tsx` → Create `useSearchController.ts`
- [x] `LibraryScreen.tsx` → Create `useLibraryController.ts`
- [x] `BookDetailScreen.tsx` → Create `useBookDetailController.ts` (CRITICAL - 11+ useState, 150+ lines of handlers)
- [x] `ReadingStatsScreen.tsx` → Create `useReadingStatsController.ts`

## Phase 6: Replace Inline Styles with StyleSheet
- [x] `BookDetailScreen.tsx` - Extract 30+ inline styles
- [x] `SearchScreen.tsx` - Extract input/layout styles
- [x] `ReadingStatsScreen.tsx` - Extract stat box styles
- [x] `EditSessionModal.tsx` - Extract form styles
- [x] `LibraryScreen.tsx` - Extract layout styles
- [x] `LoginScreen.tsx` - Extract form styles
- [x] `RegisterScreen.tsx` - Extract form styles
- [x] `Button.tsx` - Extract 3D shadow styles
- [x] `ConfirmModal.tsx` - Extract modal styles

## Phase 7: Replace Magic Numbers with Theme Tokens
- [x] Add missing spacing tokens to `src/themes/shared.ts` (xxs: 2, xs: 4)
- [x] Create size constants in `src/themes/shared.ts` (iconSizes, coverSizes, componentSizes)
- [x] Update: `Chip.tsx`, `ThemeToggle.tsx`, `Rating.tsx`, `Divider.tsx`
- [x] Update: `CoverImage.tsx`, `FloatingActionButton.tsx`, `EditSessionModal.tsx`
- [x] Update: `SearchResultCard.tsx`, `BookListItem.tsx`, `MainNavigator.tsx`

## Phase 8: Replace Hardcoded Colors with Theme Colors
- [x] Add overlay colors to theme files (`overlay`, `overlayDark`, `overlayLight`, `shadow`)
- [x] `QuoteCaptureModal.tsx` - 5 hardcoded colors
- [x] `ConfirmModal.tsx` - 2 hardcoded colors
- [x] `CoverImage.tsx` - 1 hardcoded color
- [x] `QuickActionButton.tsx` - 1 hardcoded color
- [x] `DNFModal.tsx` - 1 hardcoded color
- [x] `BookDetailScreen.tsx` - 2 hardcoded colors

## Phase 9: Replace React Native Image with expo-image
- [x] Install expo-image: `npx expo install expo-image`
- [x] `src/components/CoverImage.tsx` - Replace Image import/usage
- [x] `src/components/SharedElementOverlay.tsx` - Replace Image import/usage
- [x] `src/components/AnimatedBookHero.tsx` - Replace Image import/usage
- [x] `src/features/reading/components/RecentSessionCard.tsx` - Replace Image import/usage
- [x] `src/features/search/components/SearchResultCard.tsx` - Replace Image import/usage

## Phase 10: Create Layout Primitives
- [x] Create `src/components/layout/Box.tsx`
- [x] Create `src/components/layout/Row.tsx`
- [x] Create `src/components/layout/Column.tsx`
- [x] Export from `src/components/index.ts`
