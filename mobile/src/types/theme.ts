export type ThemeName = 'scholar' | 'dreamer' | 'wanderer' | 'midnight';

export interface ThemeColors {
  // Base surfaces
  canvas: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
  muted: string;

  // Borders
  border: string;
  borderHover: string;
  borderMuted: string;

  // Primary
  primary: string;
  primaryHover: string;
  primaryDark?: string;      // Dreamer: deepest green
  primaryGlow?: string;      // Scholar: for glow effects
  primarySubtle: string;

  // Foreground/Text
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  foregroundFaint?: string;  // Scholar: faintest text
  foregroundWarm?: string;   // Dreamer: warm brown text

  // Accent
  accent: string;
  accentWarm?: string;       // Dreamer: warm tan
  accentLight?: string;      // Dreamer: light tan

  // Semantic
  success: string;
  successSubtle: string;
  danger: string;
  dangerSubtle: string;
  warning: string;
  warningSubtle: string;

  // On-color (text on colored backgrounds)
  onPrimary: string;
  onDanger: string;

  // Special surfaces
  paper: string;
  tintPrimary: string;
  tintAccent: string;
  tintGreen?: string;        // Dreamer: soft green bg
  tintYellow?: string;       // Dreamer: warm yellow bg
  tintPeach?: string;        // Dreamer: soft peach bg
  tintBeige?: string;        // Dreamer: warm beige bg

  // Overlays & Shadows
  overlay: string;           // Semi-transparent black overlay
  overlayDark: string;       // Darker overlay for modals
  overlayLight: string;      // Light overlay for camera UI
  shadow: string;            // Shadow color for elevation
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface ThemeRadii {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  full: number;
}

export interface ThemeShadows {
  sm: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  md: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  lg: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export interface ThemeSpacing {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface ThemeBorders {
  thin: number;
  default: number;
  thick: number;
}

export interface ThemeFontWeights {
  normal: string;
  medium: string;
  semibold: string;
  bold: string;
}

export interface ThemeLetterSpacing {
  tight: number;
  normal: number;
  wide: number;
}

export interface ThemeLineHeights {
  tight: number;
  normal: number;
  relaxed: number;
}

export interface ThemeIcons {
  rating: 'star' | 'heart' | 'compass' | 'moon';
  progress: 'ink' | 'liquid' | 'trail';
}

export interface TagColorValue {
  bg: string;
  text: string;
}

export interface ThemeTagColors {
  primary: TagColorValue;
  gold: TagColorValue;
  green: TagColorValue;
  purple: TagColorValue;
  copper: TagColorValue;
  blue: TagColorValue;
  orange: TagColorValue;
  teal: TagColorValue;
  rose: TagColorValue;
  slate: TagColorValue;
}

export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
  fonts: ThemeFonts;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  fontWeights: ThemeFontWeights;
  letterSpacing: ThemeLetterSpacing;
  lineHeights: ThemeLineHeights;
  icons: ThemeIcons;
  tagColors: ThemeTagColors;
  isDark: boolean;
}

export interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  toggleTheme: () => void;
  setTheme: (name: ThemeName) => void;
  isDark: boolean;
}
