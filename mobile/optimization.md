# React Native Optimization Checklist

Reference this document when building screens and components. Check off items as you implement them.

---

## Architecture & Structure

- [x] **Feature-based organization** - Group related components, hooks, services, and types by feature
- [x] **Separate container/presentational components** - Keep business logic out of UI components
- [x] **Extract logic to custom hooks** - Move complex state and effects into reusable hooks
- [x] **Use PascalCase for components** - `UserProfile.tsx`, `BookCard.tsx`
- [x] **Use lowercase/hyphenated directories** - `user-profile/`, `book-card/`

---

## State Management

### Zustand (Client State)
- [x] **Use Zustand for UI state only** - Theme, preferences, form data, navigation state
- [x] **Create logical slices** - Separate stores by domain (`themeStore`, `uiStore`)
- [x] **Persist important state** - Use AsyncStorage middleware for user preferences
- [x] **Use shallow selectors** - Prevent unnecessary re-renders with `useShallow`

### TanStack Query (Server State)
- [x] **Use TanStack Query for all API data** - Books, user data, search results
- [x] **Configure stale times appropriately** - Avoid over-fetching
- [x] **Handle AppState changes** - Refetch on app focus when appropriate
- [x] **Use optimistic updates** - For mutations that should feel instant
- [x] **Implement proper error boundaries** - Handle query failures gracefully

---

## Component Performance

- [x] **Memoize expensive components** - Use `React.memo()` for list items and complex components
- [x] **Memoize callbacks** - Use `useCallback` for functions passed as props
- [x] **Memoize computed values** - Use `useMemo` for expensive calculations
- [x] **Avoid inline object/array creation** - Define outside render or memoize
- [x] **Avoid inline functions in JSX** - Extract and memoize event handlers
- [x] **Keep render functions pure** - No side effects in render

---

## FlatList Optimization

- [x] **Provide `keyExtractor`** - Use unique, stable keys for caching
- [x] **Implement `getItemLayout`** - If items have uniform height (MarginaliaSection)
- [x] **Memoize `renderItem` function** - Wrap in `useCallback`
- [x] **Memoize list item components** - Wrap in `React.memo()`
- [x] **Tune `windowSize`** - Reduce from default 21 if memory is a concern
- [x] **Tune `maxToRenderPerBatch`** - Reduce for large items
- [x] **Enable `removeClippedSubviews`** - Detach off-screen views
- [x] **Keep list items simple** - Minimize nested Views
- [x] **Use optimized images** - `expo-image` or `react-native-fast-image`
- [x] **Consider FlashList** - For very long lists with recycling
- [x] **FlashList v2 auto-sizing** - FlashList v2+ automatically calculates item sizes (no estimatedItemSize needed)

---

## Animation Best Practices

### General Principles
- [x] **Use Reanimated for all animations** - Not the Animated API
- [x] **Animate non-layout properties** - Prefer `transform`, `opacity` over `width`, `height`
- [x] **Keep worklets on UI thread** - Don't read shared values on JS thread
- [x] **Limit simultaneous animations** - Too many causes dropped frames
- [x] **Test on mid-range Android** - Not just high-end devices

### Animation Types
- [x] **Use `withSpring` for natural interactions** - Buttons, cards, toggles
- [x] **Use `withTiming` for precise animations** - Progress bars, controlled transitions
- [x] **Use `withDecay` for momentum** - Fling gestures, physics-based motion
- [x] **Make animations interruptible** - Save context for gesture pickup

### Accessibility
- [x] **Check `reduceMotion` setting** - Provide alternatives for motion-sensitive users
- [x] **Keep essential animations simple** - Fade instead of complex motion when reduced

---

## Gesture Handling

- [x] **Wrap app in `GestureHandlerRootView`** - As close to root as possible
- [x] **Use Gesture Handler + Reanimated together** - For 60-120fps gestures
- [x] **Use gesture composition wisely** - `Race()` for exclusive, `Simultaneous()` for multi-touch
- [x] **Implement interruptible gestures** - Use context to track state
- [x] **Add haptic feedback** - Use `expo-haptics` for tactile responses

---

## Navigation & Transitions

- [x] **Use `native-stack` for performance** - Not JS-based stack unless customization needed
- [x] **Choose appropriate animations** - `slide_from_right`, `fade`, `slide_from_bottom`
- [x] **Lazy load screens** - Don't load all screens upfront (`lazy: true`, `freezeOnBlur: true`)
- [x] **Use `InteractionManager.runAfterInteractions`** - Defer heavy work until after transitions

---

## NativeWind Styling

- [x] **Use semantic color tokens** - `bg-surface`, `text-foreground`, never raw colors
- [x] **Avoid dynamic class generation** - No template literals for class names
- [x] **Use conditional classes correctly** - Ternary with full class names
- [x] **Support dark mode** - Use `dark:` variants consistently
- [x] **Define styled components outside render** - Prevent recreation

---

## Image Optimization

- [x] **Use appropriate image sizes** - Don't load 4K images for thumbnails
- [x] **Implement lazy loading** - Load images as they come into view
- [x] **Use caching** - `expo-image` has built-in caching (`cachePolicy="memory-disk"`)
- [x] **Consider placeholder/blur** - Show low-res preview while loading (shimmer placeholder)
- [x] **Use appropriate formats** - WebP for better compression (useOptimizedImage hook)

---

## Bundle & Memory

- [x] **Enable Hermes** - 20-40% startup improvement
- [x] **Use `inlineRequires`** - Defer module loading
- [x] **Monitor bundle size** - Target ≤1.2MB gzipped initial JS (useBundleEstimate hook)
- [x] **Monitor memory usage** - Target ≤300MB peak on 4GB devices (useMemoryMonitor hook)
- [ ] **Remove unused dependencies** - Audit regularly
- [x] **Use tree shaking** - Import specific modules, not entire libraries

---

## Micro-Interactions Checklist

### Buttons & Touchables
- [x] **Scale on press** - Subtle scale down (0.95-0.98) with spring
- [x] **Haptic feedback** - Light impact on press
- [x] **Disabled state animation** - Fade or reduce opacity

### Cards & List Items
- [x] **Press state** - Subtle background color change or scale
- [x] **Swipe actions** - Smooth reveal of action buttons (SwipeableRow component)
- [x] **Long press** - Visual feedback + haptic (Pressable component)

### Loading States
- [x] **Skeleton screens** - Show content structure while loading
- [x] **Shimmer effect** - Animated gradient over skeletons
- [x] **Pull-to-refresh** - Custom animated indicator matching theme (ThemedRefreshControl)

### Success/Error States
- [x] **Success checkmark** - Bounce/spring into place
- [x] **Error shake** - Horizontal shake animation
- [x] **Toast notifications** - Slide in with spring (ToastContainer)

### Form Inputs
- [x] **Focus animation** - Border color/width transition
- [x] **Validation feedback** - Shake on error, checkmark on valid
- [x] **Character counter** - Animate color as limit approaches (Input showCharacterCount prop)

### Toggles & Switches
- [x] **Spring animation** - Natural bounce between states
- [x] **Color transition** - Smooth background color change
- [x] **Haptic on toggle** - Selection feedback

### Navigation
- [x] **Tab bar indicators** - Animated underline or background
- [x] **Screen transitions** - Appropriate for navigation type
- [x] **Shared elements** - Hero images between list and detail (when stable)

---

## Testing Checklist

- [ ] **Test on real devices** - Especially mid-range Android
- [ ] **Profile with Flipper** - Identify performance bottlenecks
- [ ] **Monitor frame rate** - Target consistent 60fps
- [ ] **Test with large datasets** - 100+ items in lists
- [ ] **Test with slow network** - 3G simulation
- [ ] **Test accessibility** - Screen readers, reduced motion

---

## Quick Reference: Animation Snippets

### Button Press Animation
```tsx
const scale = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

const gesture = Gesture.Tap()
  .onBegin(() => {
    scale.value = withSpring(0.96);
  })
  .onFinalize(() => {
    scale.value = withSpring(1);
  });
```

### Fade In On Mount
```tsx
const opacity = useSharedValue(0);

useEffect(() => {
  opacity.value = withTiming(1, { duration: 300 });
}, []);

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
}));
```

### Slide Up On Mount
```tsx
const translateY = useSharedValue(20);
const opacity = useSharedValue(0);

useEffect(() => {
  translateY.value = withSpring(0);
  opacity.value = withTiming(1, { duration: 200 });
}, []);
```

### Shake Animation (Error)
```tsx
const translateX = useSharedValue(0);

const shake = () => {
  translateX.value = withSequence(
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
};
```

---

## Sources

- [React Native Performance Overview](https://reactnative.dev/docs/performance)
- [Reanimated Performance Docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [React Native FlatList Optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Gesture Handler Documentation](https://docs.swmansion.com/react-native-gesture-handler/)
- [Expo Documentation](https://docs.expo.dev/)
