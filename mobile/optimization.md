# React Native Optimization Checklist

Reference this document when building screens and components. Check off items as you implement them.

---

## Architecture & Structure

- [ ] **Feature-based organization** - Group related components, hooks, services, and types by feature
- [ ] **Separate container/presentational components** - Keep business logic out of UI components
- [ ] **Extract logic to custom hooks** - Move complex state and effects into reusable hooks
- [ ] **Use PascalCase for components** - `UserProfile.tsx`, `BookCard.tsx`
- [ ] **Use lowercase/hyphenated directories** - `user-profile/`, `book-card/`

---

## State Management

### Zustand (Client State)
- [ ] **Use Zustand for UI state only** - Theme, preferences, form data, navigation state
- [ ] **Create logical slices** - Separate stores by domain (`themeStore`, `uiStore`)
- [ ] **Persist important state** - Use AsyncStorage middleware for user preferences
- [ ] **Use shallow selectors** - Prevent unnecessary re-renders with `useShallow`

### TanStack Query (Server State)
- [ ] **Use TanStack Query for all API data** - Books, user data, search results
- [ ] **Configure stale times appropriately** - Avoid over-fetching
- [ ] **Handle AppState changes** - Refetch on app focus when appropriate
- [ ] **Use optimistic updates** - For mutations that should feel instant
- [ ] **Implement proper error boundaries** - Handle query failures gracefully

---

## Component Performance

- [ ] **Memoize expensive components** - Use `React.memo()` for list items and complex components
- [ ] **Memoize callbacks** - Use `useCallback` for functions passed as props
- [ ] **Memoize computed values** - Use `useMemo` for expensive calculations
- [ ] **Avoid inline object/array creation** - Define outside render or memoize
- [ ] **Avoid inline functions in JSX** - Extract and memoize event handlers
- [ ] **Keep render functions pure** - No side effects in render

---

## FlatList Optimization

- [ ] **Provide `keyExtractor`** - Use unique, stable keys for caching
- [ ] **Implement `getItemLayout`** - If items have uniform height
- [ ] **Memoize `renderItem` function** - Wrap in `useCallback`
- [ ] **Memoize list item components** - Wrap in `React.memo()`
- [ ] **Tune `windowSize`** - Reduce from default 21 if memory is a concern
- [ ] **Tune `maxToRenderPerBatch`** - Reduce for large items
- [ ] **Enable `removeClippedSubviews`** - Detach off-screen views
- [ ] **Keep list items simple** - Minimize nested Views
- [ ] **Use optimized images** - `expo-image` or `react-native-fast-image`
- [ ] **Consider FlashList** - For very long lists with recycling

---

## Animation Best Practices

### General Principles
- [ ] **Use Reanimated for all animations** - Not the Animated API
- [ ] **Animate non-layout properties** - Prefer `transform`, `opacity` over `width`, `height`
- [ ] **Keep worklets on UI thread** - Don't read shared values on JS thread
- [ ] **Limit simultaneous animations** - Too many causes dropped frames
- [ ] **Test on mid-range Android** - Not just high-end devices

### Animation Types
- [ ] **Use `withSpring` for natural interactions** - Buttons, cards, toggles
- [ ] **Use `withTiming` for precise animations** - Progress bars, controlled transitions
- [ ] **Use `withDecay` for momentum** - Fling gestures, physics-based motion
- [ ] **Make animations interruptible** - Save context for gesture pickup

### Accessibility
- [ ] **Check `reduceMotion` setting** - Provide alternatives for motion-sensitive users
- [ ] **Keep essential animations simple** - Fade instead of complex motion when reduced

---

## Gesture Handling

- [ ] **Wrap app in `GestureHandlerRootView`** - As close to root as possible
- [ ] **Use Gesture Handler + Reanimated together** - For 60-120fps gestures
- [ ] **Use gesture composition wisely** - `Race()` for exclusive, `Simultaneous()` for multi-touch
- [ ] **Implement interruptible gestures** - Use context to track state
- [ ] **Add haptic feedback** - Use `expo-haptics` for tactile responses

---

## Navigation & Transitions

- [ ] **Use `native-stack` for performance** - Not JS-based stack unless customization needed
- [ ] **Choose appropriate animations** - `slide_from_right`, `fade`, `slide_from_bottom`
- [ ] **Lazy load screens** - Don't load all screens upfront
- [ ] **Use `InteractionManager.runAfterInteractions`** - Defer heavy work until after transitions

---

## NativeWind Styling

- [ ] **Use semantic color tokens** - `bg-surface`, `text-foreground`, never raw colors
- [ ] **Avoid dynamic class generation** - No template literals for class names
- [ ] **Use conditional classes correctly** - Ternary with full class names
- [ ] **Support dark mode** - Use `dark:` variants consistently
- [ ] **Define styled components outside render** - Prevent recreation

---

## Image Optimization

- [ ] **Use appropriate image sizes** - Don't load 4K images for thumbnails
- [ ] **Implement lazy loading** - Load images as they come into view
- [ ] **Use caching** - `expo-image` has built-in caching
- [ ] **Consider placeholder/blur** - Show low-res preview while loading
- [ ] **Use appropriate formats** - WebP for better compression

---

## Bundle & Memory

- [ ] **Enable Hermes** - 20-40% startup improvement
- [ ] **Use `inlineRequires`** - Defer module loading
- [ ] **Monitor bundle size** - Target ≤1.2MB gzipped initial JS
- [ ] **Monitor memory usage** - Target ≤300MB peak on 4GB devices
- [ ] **Remove unused dependencies** - Audit regularly
- [ ] **Use tree shaking** - Import specific modules, not entire libraries

---

## Micro-Interactions Checklist

### Buttons & Touchables
- [ ] **Scale on press** - Subtle scale down (0.95-0.98) with spring
- [ ] **Haptic feedback** - Light impact on press
- [ ] **Disabled state animation** - Fade or reduce opacity

### Cards & List Items
- [ ] **Press state** - Subtle background color change or scale
- [ ] **Swipe actions** - Smooth reveal of action buttons
- [ ] **Long press** - Visual feedback + haptic

### Loading States
- [ ] **Skeleton screens** - Show content structure while loading
- [ ] **Shimmer effect** - Animated gradient over skeletons
- [ ] **Pull-to-refresh** - Custom animated indicator matching theme

### Success/Error States
- [ ] **Success checkmark** - Bounce/spring into place
- [ ] **Error shake** - Horizontal shake animation
- [ ] **Toast notifications** - Slide in with spring

### Form Inputs
- [ ] **Focus animation** - Border color/width transition
- [ ] **Validation feedback** - Shake on error, checkmark on valid
- [ ] **Character counter** - Animate color as limit approaches

### Toggles & Switches
- [ ] **Spring animation** - Natural bounce between states
- [ ] **Color transition** - Smooth background color change
- [ ] **Haptic on toggle** - Selection feedback

### Navigation
- [ ] **Tab bar indicators** - Animated underline or background
- [ ] **Screen transitions** - Appropriate for navigation type
- [ ] **Shared elements** - Hero images between list and detail (when stable)

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
