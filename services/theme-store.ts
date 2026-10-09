import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BrandTokens,
  generateBrandTokens,
  isValidHex,
  normalizeHex,
} from "./color-contrast-utils";

export type ThemePreference = "dark" | "light" | "system";
export type ThemeMode = "dark" | "light";

export type BrandTheme = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryPressed: string;
  primaryDisabled: string;
  primarySoft: string;
  primaryMuted: string;
  primaryBorder: string;
  onPrimary: '#FFFFFF' | '#000000';
  focusRing: string;
  contrastOnDark: number;
  contrastOnLight: number;
  isAccessibleOnDark: boolean;
  isAccessibleOnLight: boolean;
  suggestedAccessibleHex: string;
  isCustom: boolean;
  logoUrl?: string | null;
  updatedAt?: string;
};

export type SemanticColors = {
  success: string;
  warning: string;
  danger: string; // #EF4444 (permanece fixo)
  error: string;  // #EF4444 (permanece fixo)
  info: string;   // #3B82F6
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
};

export type ThemeColors = {
  isDark: boolean;
  isLight: boolean;
  mode: ThemeMode;

  // Primary Brand & Consulting Dynamic Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryPressed: string;
  primaryDisabled: string;
  primarySoft: string;
  primaryMuted: string;
  primaryBorder: string;
  onPrimary: '#FFFFFF' | '#000000';
  focusRing: string;

  // Design System Hierarchical Tokens
  brand: BrandTheme;
  semantic: SemanticColors;

  // Backgrounds & Surfaces
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;

  // Cards
  card: string;
  cardSecondary: string;
  cardHighlighted: string;
  cardBorder: string;
  cardBorderSubtle: string;

  // Typography
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverted: string;

  // Borders & Dividers
  border: string;
  divider: string;

  // Inputs
  inputBackground: string;
  inputBorder: string;
  placeholder: string;

  // Navigation & System
  tabBar: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarInactive: string;
  statusBarStyle: "light-content" | "dark-content";
  icon: string;

  // Overlays & Utilities
  backdrop: string;
  overlay: string;
  skeleton: string;
  shadow: string;

  // Feedback Colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Chips & Badges
  chipBackground: string;
  chipActiveBackground: string;
  chipBorder: string;
  badgeNeutral: string;
  badgeNeutralBorder: string;
  badgeNeutralText: string;
  badgeSuccess: string;
  badgeSuccessText: string;
  badgeWarning: string;
  badgeWarningText: string;
  badgeError: string;
  badgeErrorText: string;

  // Charts
  chartBackground: string;
  chartGrid: string;
  chartText: string;
  chartLine: string;

  // Bottle & Hydration
  bottleBody: string;
  bottleBorder: string;
  bottleCap: string;
  bottleCapBorder: string;
  bottleTicks: string;
};

export const DEFAULT_OFFICIAL_BRAND = "#D90000";
export const BRAND_STORAGE_KEY = "@dragoncorp/active_brand_color_v2";
const THEME_STORAGE_KEY = "@dragoncorp/theme_mode_v1";

let activeBrandColor: string = DEFAULT_OFFICIAL_BRAND;

export function buildThemeColors(brandHex: string = activeBrandColor): ThemeColors {
  const cleanHex = isValidHex(brandHex) ? normalizeHex(brandHex) : DEFAULT_OFFICIAL_BRAND;
  const tokens: BrandTokens = generateBrandTokens(cleanHex);

  const brandTheme: BrandTheme = {
    primary: tokens.brandPrimary,
    primaryLight: tokens.brandPrimaryLight,
    primaryDark: tokens.brandPrimaryDark,
    primaryPressed: tokens.brandPrimaryPressed,
    primaryDisabled: tokens.brandPrimaryDisabled,
    primarySoft: tokens.brandPrimarySoft,
    primaryMuted: tokens.brandPrimaryMuted,
    primaryBorder: tokens.brandPrimaryBorder,
    onPrimary: tokens.brandOnPrimary,
    focusRing: tokens.brandFocus,
    contrastOnDark: tokens.contrastOnDark,
    contrastOnLight: tokens.contrastOnLight,
    isAccessibleOnDark: tokens.isAccessibleOnDark,
    isAccessibleOnLight: tokens.isAccessibleOnLight,
    suggestedAccessibleHex: tokens.suggestedAccessibleHex,
    isCustom: tokens.isCustom,
  };

  const semanticColors: SemanticColors = {
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    error: "#EF4444",
    info: "#3B82F6",
    background: "#0F0F0F",
    surface: "#161616",
    surfaceElevated: "#1E1E1E",
    text: "#FFFFFF",
    textMuted: "#71717A",
    border: "#262626",
  };

  return {
    isDark: true,
    isLight: false,
    mode: "dark",

    // Dynamic brand tokens mapped to primary
    primary: tokens.brandPrimary,
    primaryLight: tokens.brandPrimaryLight,
    primaryDark: tokens.brandPrimaryDark,
    primaryPressed: tokens.brandPrimaryPressed,
    primaryDisabled: tokens.brandPrimaryDisabled,
    primarySoft: tokens.brandPrimarySoft,
    primaryMuted: tokens.brandPrimaryMuted,
    primaryBorder: tokens.brandPrimaryBorder,
    onPrimary: tokens.brandOnPrimary,
    focusRing: tokens.brandFocus,

    brand: brandTheme,
    semantic: semanticColors,

    // Neutral dark surfaces
    background: "#0F0F0F",
    backgroundSecondary: "#141414",
    surface: "#161616",
    surfaceSecondary: "#1E1E1E",

    card: "#161616",
    cardSecondary: "#1E1E1E",
    cardHighlighted: "#222222",
    cardBorder: "#262626",
    cardBorderSubtle: "#1F1F1F",

    text: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    textInverted: "#0F172A",

    border: "#262626",
    divider: "#222222",

    inputBackground: "#161616",
    inputBorder: "#262626",
    placeholder: "#666666",

    tabBar: "#1B1B1B",
    tabBarBackground: "#1B1B1B",
    tabBarBorder: "rgba(255, 255, 255, 0.1)",
    tabBarInactive: "#71717A",
    statusBarStyle: "light-content",
    icon: "#FFFFFF",

    backdrop: "rgba(0, 0, 0, 0.7)",
    overlay: "rgba(0, 0, 0, 0.6)",
    skeleton: "#262626",
    shadow: "rgba(0, 0, 0, 0.5)",

    // Fixed semantic feedback colors
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",

    chipBackground: "#161616",
    chipActiveBackground: tokens.brandPrimary,
    chipBorder: "#262626",
    badgeNeutral: "#222222",
    badgeNeutralBorder: "#2A2A2A",
    badgeNeutralText: "#A1A1AA",
    badgeSuccess: "rgba(16, 185, 129, 0.15)",
    badgeSuccessText: "#10B981",
    badgeWarning: "rgba(245, 158, 11, 0.15)",
    badgeWarningText: "#F59E0B",
    badgeError: "rgba(239, 68, 68, 0.15)",
    badgeErrorText: "#EF4444",

    chartBackground: "#161616",
    chartGrid: "#262626",
    chartText: "#71717A",
    chartLine: tokens.brandPrimary,

    bottleBody: "#0c1219",
    bottleBorder: "#1e2c3d",
    bottleCap: "#1c2430",
    bottleCapBorder: "#2d3d52",
    bottleTicks: "#475569",
  };
}

export let DARK_THEME: ThemeColors = buildThemeColors(DEFAULT_OFFICIAL_BRAND);
export let LIGHT_THEME: ThemeColors = buildThemeColors(DEFAULT_OFFICIAL_BRAND);

const listeners = new Set<(mode: ThemeMode, preference: ThemePreference) => void>();
const brandListeners = new Set<(theme: ThemeColors) => void>();

export function resolveThemeMode(
  _preference?: ThemePreference,
  _systemScheme?: "light" | "dark" | null
): ThemeMode {
  return "dark";
}

export function getThemeColors(_mode: ThemeMode = "dark"): ThemeColors {
  return buildThemeColors(activeBrandColor);
}

export function getCurrentThemeMode(): ThemeMode {
  return "dark";
}

export function getCurrentThemePreference(): ThemePreference {
  return "dark";
}

export function getActiveBrandColor(): string {
  return activeBrandColor;
}

export async function getStoredActiveBrandColor(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(BRAND_STORAGE_KEY);
    if (stored && isValidHex(stored)) {
      activeBrandColor = normalizeHex(stored);
      DARK_THEME = buildThemeColors(activeBrandColor);
      LIGHT_THEME = DARK_THEME;
      return activeBrandColor;
    }
  } catch {
    // ignore
  }
  return DEFAULT_OFFICIAL_BRAND;
}

export async function setBrandPrimary(
  newHex: string,
  options: { persist?: boolean } = { persist: true }
): Promise<ThemeColors> {
  const normalized = isValidHex(newHex) ? normalizeHex(newHex) : DEFAULT_OFFICIAL_BRAND;
  activeBrandColor = normalized;
  const nextTheme = buildThemeColors(normalized);
  DARK_THEME = nextTheme;
  LIGHT_THEME = nextTheme;

  if (options.persist !== false) {
    try {
      await AsyncStorage.setItem(BRAND_STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
  }

  // Notifica ambos os canais de ouvintes
  listeners.forEach((listener) => {
    try {
      listener("dark", "dark");
    } catch {
      // ignore
    }
  });

  brandListeners.forEach((listener) => {
    try {
      listener(nextTheme);
    } catch {
      // ignore
    }
  });

  themedStyleCache.clear();

  return nextTheme;
}

export async function resetBrandPrimary(
  options: { persist?: boolean } = { persist: true }
): Promise<ThemeColors> {
  return setBrandPrimary(DEFAULT_OFFICIAL_BRAND, options);
}

export function subscribeThemeBrand(listener: (theme: ThemeColors) => void): () => void {
  brandListeners.add(listener);
  return () => {
    brandListeners.delete(listener);
  };
}

export async function getStoredThemeMode(): Promise<ThemePreference> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, "dark");
  } catch {
    // ignore
  }
  return "dark";
}

export async function setThemeMode(
  _preference: ThemePreference = "dark",
  _systemScheme?: "light" | "dark" | null
): Promise<ThemeMode> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, "dark");
  } catch {
    // ignore
  }

  listeners.forEach((listener) => {
    try {
      listener("dark", "dark");
    } catch {
      // ignore
    }
  });

  return "dark";
}

export async function toggleThemeMode(_systemScheme?: "light" | "dark" | null): Promise<ThemeMode> {
  return "dark";
}

export function subscribeThemeMode(
  listener: (mode: ThemeMode, preference: ThemePreference) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  if (isNaN(num)) return "217, 0, 0";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

const themedStyleCache = new Map<string, any>();

export function patchThemedStyle(style: any, brandColor: string): any {
  if (!style || typeof style !== "object") return style;
  const copy: any = { ...style };
  const rgb = hexToRgbString(brandColor);

  const colorKeys = [
    "backgroundColor",
    "borderColor",
    "borderLeftColor",
    "borderRightColor",
    "borderTopColor",
    "borderBottomColor",
    "color",
    "tintColor",
    "shadowColor",
  ];

  for (const key of colorKeys) {
    const val = copy[key];
    if (typeof val === "string") {
      const lower = val.toLowerCase().trim();
      if (lower === "#d90000") {
        copy[key] = brandColor;
      } else if (lower.startsWith("#d90000") && lower.length === 9) {
        const alphaHex = lower.substring(7);
        const alpha = (parseInt(alphaHex, 16) / 255).toFixed(2);
        copy[key] = `rgba(${rgb}, ${alpha})`;
      } else if (
        lower.startsWith("rgba(217,") ||
        lower.startsWith("rgba(217,0,0,") ||
        lower.startsWith("rgba(217, 0, 0,")
      ) {
        const match = lower.match(/rgba\(\s*217\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)/);
        if (match) {
          copy[key] = `rgba(${rgb}, ${match[1]})`;
        }
      } else if (
        lower === "#2b1414" ||
        lower === "#201414" ||
        lower === "#261515" ||
        lower === "#221515" ||
        lower === "#1c1414" ||
        lower === "#1b1313"
      ) {
        copy[key] = `rgba(${rgb}, 0.18)`;
      } else if (lower === "#3a1818" || lower === "#3a1a1a" || lower === "#4a1a1a") {
        copy[key] = `rgba(${rgb}, 0.35)`;
      }
    }
  }
  return copy;
}

export function createThemedStyleSheet<T extends Record<string, any>>(styles: T): T {
  return new Proxy(styles, {
    get(target: any, prop: string) {
      const orig = target[prop];
      if (!orig || typeof orig !== "object") return orig;
      const brandColor = getActiveBrandColor();
      if (!brandColor || brandColor.toUpperCase() === DEFAULT_OFFICIAL_BRAND) return orig;
      const cacheKey = `${prop}_${brandColor}`;
      const cached = themedStyleCache.get(cacheKey);
      if (cached) return cached;
      const patched = patchThemedStyle(orig, brandColor);
      themedStyleCache.set(cacheKey, patched);
      return patched;
    },
  });
}

