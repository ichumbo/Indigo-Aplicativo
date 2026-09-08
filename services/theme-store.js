"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIGHT_THEME = exports.DARK_THEME = void 0;
exports.resolveThemeMode = resolveThemeMode;
exports.getThemeColors = getThemeColors;
exports.getCurrentThemeMode = getCurrentThemeMode;
exports.getCurrentThemePreference = getCurrentThemePreference;
exports.getStoredThemeMode = getStoredThemeMode;
exports.setThemeMode = setThemeMode;
exports.toggleThemeMode = toggleThemeMode;
exports.subscribeThemeMode = subscribeThemeMode;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
exports.DARK_THEME = {
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
exports.LIGHT_THEME = { ...exports.DARK_THEME };
const THEME_STORAGE_KEY = "@dragoncorp/theme_mode_v1";
let currentPreference = "dark";
let currentResolvedMode = "dark";
const listeners = new Set();
function resolveThemeMode(_preference, _systemScheme) {
    return "dark";
}
function getThemeColors(_mode = "dark") {
    return exports.DARK_THEME;
}
function getCurrentThemeMode() {
    return "dark";
}
function getCurrentThemePreference() {
    return "dark";
}
async function getStoredThemeMode() {
    try {
        await async_storage_1.default.setItem(THEME_STORAGE_KEY, "dark");
    }
    catch {
        // ignore
    }
    return "dark";
}
async function setThemeMode(_preference = "dark", _systemScheme) {
    currentPreference = "dark";
    currentResolvedMode = "dark";
    try {
        await async_storage_1.default.setItem(THEME_STORAGE_KEY, "dark");
    }
    catch {
        // ignore
    }
    listeners.forEach((listener) => {
        try {
            listener("dark", "dark");
        }
        catch {
            // ignore
        }
    });
    return "dark";
}
async function toggleThemeMode(_systemScheme) {
    return "dark";
}
function subscribeThemeMode(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
