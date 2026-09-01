import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "dark" | "light" | "system";
export type ThemeMode = "dark" | "light";

export type ThemeColors = {
  isDark: boolean;
  isLight: boolean;
  mode: ThemeMode;

  // Primary Brand (Crimson Red)
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryPressed: string;
  primaryDisabled: string;

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

export const DARK_THEME: ThemeColors = {
  isDark: true,
  isLight: false,
  mode: "dark",

  primary: "#D90000",
  primaryLight: "#FF4444",
  primaryDark: "#990000",
  primaryPressed: "#B30000",
  primaryDisabled: "rgba(217, 0, 0, 0.4)",

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

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  chipBackground: "#161616",
  chipActiveBackground: "#D90000",
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
  chartLine: "#D90000",

  bottleBody: "#0c1219",
  bottleBorder: "#1e2c3d",
  bottleCap: "#1c2430",
  bottleCapBorder: "#2d3d52",
  bottleTicks: "#475569",
};

// O aplicativo opera exclusivamente no Modo Escuro (DragonCorp Dark Theme)
export const LIGHT_THEME: ThemeColors = { ...DARK_THEME };

const THEME_STORAGE_KEY = "@dragoncorp/theme_mode_v1";

let currentPreference: ThemePreference = "dark";
let currentResolvedMode: ThemeMode = "dark";
const listeners = new Set<(mode: ThemeMode, preference: ThemePreference) => void>();

export function resolveThemeMode(
  _preference?: ThemePreference,
  _systemScheme?: "light" | "dark" | null
): ThemeMode {
  return "dark";
}

export function getThemeColors(_mode: ThemeMode = "dark"): ThemeColors {
  return DARK_THEME;
}

export function getCurrentThemeMode(): ThemeMode {
  return "dark";
}

export function getCurrentThemePreference(): ThemePreference {
  return "dark";
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
  currentPreference = "dark";
  currentResolvedMode = "dark";

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
