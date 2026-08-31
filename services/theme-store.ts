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

export const LIGHT_THEME: ThemeColors = {
  isDark: false,
  isLight: true,
  mode: "light",

  primary: "#D90000",
  primaryLight: "#EF4444",
  primaryDark: "#B91C1C",
  primaryPressed: "#B30000",
  primaryDisabled: "rgba(217, 0, 0, 0.4)",

  background: "#F8FAFC",
  backgroundSecondary: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8FAFC",

  card: "#FFFFFF",
  cardSecondary: "#F8FAFC",
  cardHighlighted: "#F1F5F9",
  cardBorder: "#E2E8F0",
  cardBorderSubtle: "#EEF2F6",

  text: "#0F172A",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textInverted: "#FFFFFF",

  border: "#E2E8F0",
  divider: "#E2E8F0",

  inputBackground: "#FFFFFF",
  inputBorder: "#CBD5E1",
  placeholder: "#94A3B8",

  tabBar: "#FFFFFF",
  tabBarBackground: "#FFFFFF",
  tabBarBorder: "rgba(0, 0, 0, 0.08)",
  tabBarInactive: "#94A3B8",
  statusBarStyle: "dark-content",
  icon: "#0F172A",

  backdrop: "rgba(15, 23, 42, 0.5)",
  overlay: "rgba(15, 23, 42, 0.4)",
  skeleton: "#E2E8F0",
  shadow: "rgba(0, 0, 0, 0.08)",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  chipBackground: "#F1F5F9",
  chipActiveBackground: "#D90000",
  chipBorder: "#E2E8F0",
  badgeNeutral: "#F1F5F9",
  badgeNeutralBorder: "#E2E8F0",
  badgeNeutralText: "#475569",
  badgeSuccess: "rgba(16, 185, 129, 0.12)",
  badgeSuccessText: "#059669",
  badgeWarning: "rgba(245, 158, 11, 0.12)",
  badgeWarningText: "#D97706",
  badgeError: "rgba(239, 68, 68, 0.12)",
  badgeErrorText: "#DC2626",

  chartBackground: "#FFFFFF",
  chartGrid: "#E2E8F0",
  chartText: "#64748B",
  chartLine: "#D90000",

  bottleBody: "#F0F9FF",
  bottleBorder: "#BAE6FD",
  bottleCap: "#E2E8F0",
  bottleCapBorder: "#CBD5E1",
  bottleTicks: "#64748B",
};

const THEME_STORAGE_KEY = "@dragoncorp/theme_mode_v1";

let currentPreference: ThemePreference = "dark";
let currentResolvedMode: ThemeMode = "dark";
const listeners = new Set<(mode: ThemeMode, preference: ThemePreference) => void>();

export function resolveThemeMode(
  preference: ThemePreference,
  systemScheme?: "light" | "dark" | null
): ThemeMode {
  if (preference === "system") {
    return systemScheme === "light" ? "light" : "dark";
  }
  return preference;
}

export function getThemeColors(mode: ThemeMode = currentResolvedMode): ThemeColors {
  return mode === "light" ? LIGHT_THEME : DARK_THEME;
}

export function getCurrentThemeMode(): ThemeMode {
  return currentResolvedMode;
}

export function getCurrentThemePreference(): ThemePreference {
  return currentPreference;
}

export async function getStoredThemeMode(): Promise<ThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      currentPreference = stored as ThemePreference;
      return stored as ThemePreference;
    }
  } catch {
    // fallback to dark
  }
  return "dark";
}

export async function setThemeMode(
  preference: ThemePreference,
  systemScheme?: "light" | "dark" | null
): Promise<ThemeMode> {
  currentPreference = preference;
  currentResolvedMode = resolveThemeMode(preference, systemScheme);

  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore
  }

  listeners.forEach((listener) => {
    try {
      listener(currentResolvedMode, currentPreference);
    } catch {
      // ignore
    }
  });

  return currentResolvedMode;
}

export async function toggleThemeMode(systemScheme?: "light" | "dark" | null): Promise<ThemeMode> {
  const nextMode: ThemeMode = currentResolvedMode === "dark" ? "light" : "dark";
  return setThemeMode(nextMode, systemScheme);
}

export function subscribeThemeMode(
  listener: (mode: ThemeMode, preference: ThemePreference) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
