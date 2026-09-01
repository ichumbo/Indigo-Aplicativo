import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import {
  checkNotificationPermissionStatus,
  DEFAULT_NATIVE_PREFS,
  getStoredNativeNotificationPreferences,
  hasUserBeenPromptedForPermission,
  initForegroundNotificationHandler,
  markPermissionAsPrompted,
  NativeNotificationPreferences,
  NotificationPermissionStatus,
  requestNotificationPermission,
  saveAndApplyNotificationPreferences,
  setupAndroidNotificationChannels,
  syncAppBadgeCount,
  triggerLocalNotification,
} from "@/services/native-notification-service";
import { useCurrentSession } from "@/hooks/use-current-session";

export function useNotifications() {
  const router = useRouter();
  const { session } = useCurrentSession();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>("undetermined");
  const [preferences, setPreferences] = useState<NativeNotificationPreferences>(DEFAULT_NATIVE_PREFS);
  const [loading, setLoading] = useState(true);
  const [hasPrompted, setHasPrompted] = useState(true);

  // Carrega status de permissão e preferências
  const loadState = useCallback(async () => {
    try {
      const [status, prefs, prompted] = await Promise.all([
        checkNotificationPermissionStatus(),
        getStoredNativeNotificationPreferences(),
        hasUserBeenPromptedForPermission(),
      ]);
      setPermissionStatus(status);
      setPreferences(prefs);
      setHasPrompted(prompted);
    } catch (err) {
      console.warn("[useNotifications] Erro ao carregar estado:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initForegroundNotificationHandler();
    void setupAndroidNotificationChannels();
    void loadState();

    // Listener para quando o usuário toca em uma notificação
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && typeof data.route === "string") {
        router.push(data.route as never);
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [loadState, router]);

  // Solicita permissão ao usuário
  const askPermission = useCallback(async (): Promise<boolean> => {
    const result = await requestNotificationPermission();
    setPermissionStatus(result);
    setHasPrompted(true);

    if (result === "granted") {
      await saveAndApplyNotificationPreferences(
        { pushEnabled: true },
        session?.user?.role as "TRAINER" | "STUDENT" | "ADMIN" | undefined
      );
      return true;
    }
    return false;
  }, [session?.user?.role]);

  // Atualiza preferências
  const updatePreferences = useCallback(
    async (updates: Partial<NativeNotificationPreferences>) => {
      const next = await saveAndApplyNotificationPreferences(
        updates,
        session?.user?.role as "TRAINER" | "STUDENT" | "ADMIN" | undefined
      );
      setPreferences(next);
      return next;
    },
    [session?.user?.role]
  );

  // Dispara notificação de teste imediata
  const sendTestNotification = useCallback(
    async (title = "DragonCorp Notificações 🐉", body = "Notificações ativadas com sucesso para iPhone e Android!") => {
      if (permissionStatus !== "granted") {
        const granted = await askPermission();
        if (!granted) {
          return null;
        }
      }

      return triggerLocalNotification({
        title,
        body,
        data: { route: "/notifications", type: "test" },
      });
    },
    [askPermission, permissionStatus]
  );

  // Abre as configurações do sistema operacional caso a permissão tenha sido negada
  const openSystemSettings = useCallback(async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      console.warn("[useNotifications] Erro ao abrir configurações:", e);
    }
  }, []);

  return {
    permissionStatus,
    isPermissionGranted: permissionStatus === "granted",
    isPermissionDenied: permissionStatus === "denied",
    needsPermissionPrompt: permissionStatus === "undetermined" && !hasPrompted,
    preferences,
    loading,
    askPermission,
    updatePreferences,
    sendTestNotification,
    openSystemSettings,
    syncBadge: syncAppBadgeCount,
    reloadState: loadState,
  };
}
