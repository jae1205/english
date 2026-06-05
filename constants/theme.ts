/**
 * Anki Flashcard App Color Schema
 * Based on Stitch Design: https://stitch.withgoogle.com/projects/17984646321015771690
 *
 * Design Theme:
 * - Mode: Dark (primary)
 * - Accent: #13ec5b (bright green)
 * - Font: Lexend
 * - Border Radius: 8px
 */

import { Platform } from 'react-native';

// Primary accent color from Stitch design
const accent = '#13ec5b';

// SRS Status Colors (for card states)
export const SRSColors = {
  new: '#475569',      // Slate - cards never studied
  learning: '#a16207', // Amber - cards being learned
  review: '#15803d',   // Green - cards due for review
  young: '#0891b2',    // Cyan - graduated but interval < 21 days
  mature: '#166534',   // Dark green - well-known cards (interval >= 21 days)
} as const;

// Rating Colors (for study session feedback)
export const RatingColors = {
  again: '#ef4444',    // Red - failed, needs immediate review
  hard: '#f97316',     // Orange - difficult, shorter interval
  good: '#22c55e',     // Green - correct, normal interval
  easy: '#86efac',     // Light green - easy, longer interval
} as const;

// Zinc color scale for consistent grays
const Zinc = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
} as const;

export const Colors = {
  light: {
    // Backgrounds
    background: '#f6f8f6',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',

    // Text
    text: '#0a0a0a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textDimmed: '#94a3b8',
    textFaint: '#cbd5e1',

    // Accent
    tint: accent,
    accent: accent,
    accentMuted: '#10b981',

    // UI Elements
    icon: '#475569',
    iconMuted: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: accent,

    // Borders & Dividers
    border: '#e2e8f0',
    borderMuted: '#f1f5f9',

    // Card backgrounds
    card: '#ffffff',
    cardFront: '#ffffff',
    cardBack: '#f8fafc',

    // Status
    success: '#15803d',
    warning: '#a16207',
    error: '#dc2626',
    info: '#0284c7',
  },
  dark: {
    // Backgrounds
    background: '#000000',       // Pure black
    surface: '#000000',          // Pure black (was #141414)
    surfaceElevated: Zinc[900],  // #18181b

    // Text - Zinc scale hierarchy
    text: '#ffffff',             // Pure white for primary text
    textSecondary: Zinc[200],    // #e4e4e7 - deck titles, important text
    textMuted: Zinc[500],        // #71717a - labels, less important
    textDimmed: Zinc[600],       // #52525b - inactive numbers
    textFaint: Zinc[700],        // #3f3f46 - very dim text

    // Accent
    tint: accent,
    accent: accent,
    accentMuted: '#10b981',

    // UI Elements
    icon: Zinc[400],             // #a1a1aa
    iconMuted: Zinc[500],        // #71717a
    tabIconDefault: Zinc[500],   // #71717a
    tabIconSelected: accent,

    // Borders & Dividers
    border: Zinc[800],           // #27272a
    borderMuted: Zinc[900],      // #18181b - progress track

    // Card backgrounds
    card: Zinc[900],             // #18181b
    cardFront: Zinc[900],        // #18181b
    cardBack: Zinc[800],         // #27272a

    // Status
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#38bdf8',
  },
} as const;

// Design tokens from Stitch
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 0,
} as const;

// Font family from Stitch design: Lexend
// Note: Lexend needs to be loaded via expo-font or @expo-google-fonts/lexend
export const FontFamily = {
  // Use Lexend when loaded, fallback to system fonts
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  semiBold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

// Legacy Fonts export for compatibility
export const Fonts = Platform.select({
  ios: {
    sans: 'Lexend_400Regular',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Lexend_400Regular',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Lexend, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Type exports for type-safe color/token access
export type ColorKey = keyof typeof Colors.light;
export type SRSColorKey = keyof typeof SRSColors;
export type RatingColorKey = keyof typeof RatingColors;
export type SpacingKey = keyof typeof Spacing;
export type BorderRadiusKey = keyof typeof BorderRadius;
export type FontSizeKey = keyof typeof FontSize;
export type FontWeightKey = keyof typeof FontWeight;
