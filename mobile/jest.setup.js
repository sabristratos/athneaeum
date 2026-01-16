import '@testing-library/react-native/pure';

jest.mock('react-native-worklets', () => ({
  Worklets: {
    createContext: jest.fn(),
    defaultContext: {},
  },
}));

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      call: jest.fn(),
      createAnimatedComponent: (component) => component,
      addWhitelistedUIProps: jest.fn(),
      addWhitelistedNativeProps: jest.fn(),
    },
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedGestureHandler: jest.fn(() => ({})),
    useReducedMotion: jest.fn(() => false),
    withTiming: jest.fn((toValue) => toValue),
    withSpring: jest.fn((toValue) => toValue),
    withDelay: jest.fn((_, toValue) => toValue),
    withSequence: jest.fn((...args) => args[args.length - 1]),
    withRepeat: jest.fn((animation) => animation),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn(),
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      bezier: jest.fn(() => jest.fn()),
      inOut: jest.fn(() => jest.fn()),
    },
    Layout: { springify: jest.fn(() => ({ damping: jest.fn(() => ({ stiffness: jest.fn() })) })) },
    FadeIn: { duration: jest.fn(() => ({})) },
    FadeOut: { duration: jest.fn(() => ({})) },
    SlideInDown: { springify: jest.fn(() => ({ damping: jest.fn(() => ({ stiffness: jest.fn() })) })) },
    SlideOutDown: { duration: jest.fn(() => ({})) },
    FadeInDown: { duration: jest.fn(() => ({})), delay: jest.fn(() => ({})) },
    FadeOutUp: { duration: jest.fn(() => ({})) },
    ZoomIn: { duration: jest.fn(() => ({})) },
    ZoomOut: { duration: jest.fn(() => ({})) },
    createAnimatedComponent: (component) => component,
    View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
    FlatList: require('react-native').FlatList,
  };
});

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@somesoap/react-native-image-palette', () => ({
  getColors: jest.fn().mockResolvedValue({
    dominant: '#8b2e2e',
    vibrant: '#8b2e2e',
    darkVibrant: '#5a1f1f',
    lightVibrant: '#c45555',
    muted: '#7a5555',
    darkMuted: '#4a3333',
    lightMuted: '#b08888',
  }),
}));

global.__DEV__ = true;

global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 16);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};
