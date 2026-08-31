import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import {
  ThemeColors,
  ThemeMode,
  ThemePreference,
  getCurrentThemeMode,
  getCurrentThemePreference,
  getStoredThemeMode,
  getThemeColors,
  resolveThemeMode,
  setThemeMode as saveThemeMode,
  subscribeThemeMode,
  toggleThemeMode as switchThemeMode,
} from "@/services/theme-store";

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(getCurrentThemePreference());
  const [mode, setMode] = useState<ThemeMode>(() => resolveThemeMode(preference, systemScheme));
  const [theme, setTheme] = useState<ThemeColors>(() => getThemeColors(mode));

  useEffect(() => {
    // Inicializa com a preferência salva
    void getStoredThemeMode().then((storedPref) => {
      setPreference(storedPref);
      const resolved = resolveThemeMode(storedPref, systemScheme);
      setMode(resolved);
      setTheme(getThemeColors(resolved));
    });

    // Inscreve para alterações de tema reativas em tempo real
    const unsubscribe = subscribeThemeMode((newResolvedMode, newPref) => {
      setMode(newResolvedMode);
      setPreference(newPref);
      setTheme(getThemeColors(newResolvedMode));
    });

    return unsubscribe;
  }, [systemScheme]);

  // Reage a mudanças no tema do sistema operacional quando a preferência é "system"
  useEffect(() => {
    if (preference === "system") {
      const resolved = resolveThemeMode("system", systemScheme);
      setMode(resolved);
      setTheme(getThemeColors(resolved));
    }
  }, [preference, systemScheme]);

  const changeThemeMode = (nextPref: ThemePreference) => {
    void saveThemeMode(nextPref, systemScheme);
  };

  const toggleTheme = () => {
    void switchThemeMode(systemScheme);
  };

  return {
    theme,
    mode,
    preference,
    isDark: theme.isDark,
    isLight: theme.isLight,
    setThemeMode: changeThemeMode,
    toggleTheme,
  };
}

