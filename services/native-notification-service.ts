import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: boolean;
}

export interface NativeNotificationPreferences {
  pushEnabled: boolean;
  workoutReminderEnabled: boolean;
  workoutReminderTime: string; // "08:00"
  hydrationReminderEnabled: boolean;
  hydrationIntervalHours: number; // 2 hours
  trainerWeeklySummaryEnabled: boolean;
  painAlertsEnabled: boolean;
  chatAlertsEnabled: boolean;
  assessmentAlertsEnabled: boolean;
}

export const DEFAULT_NATIVE_PREFS: NativeNotificationPreferences = {
  pushEnabled: true,
  workoutReminderEnabled: true,
  workoutReminderTime: "08:00",
  hydrationReminderEnabled: true,
  hydrationIntervalHours: 2,
  trainerWeeklySummaryEnabled: true,
  painAlertsEnabled: true,
  chatAlertsEnabled: true,
  assessmentAlertsEnabled: true,
};

const STORAGE_KEY_PREFS = "@dragoncorp/native_notification_prefs_v1";
const STORAGE_KEY_PUSH_TOKEN = "@dragoncorp/push_token_v1";
const STORAGE_KEY_PERMISSION_PROMPTED = "@dragoncorp/permission_prompted_v1";

// Identificadores de lembretes agendados
export const NOTIFICATION_IDS = {
  DAILY_WORKOUT: "dragoncorp_daily_workout",
  HYDRATION_PREFIX: "dragoncorp_hydration_",
  TRAINER_WEEKLY_SUMMARY: "dragoncorp_trainer_weekly_summary",
  ASSESSMENT_REMINDER: "dragoncorp_assessment_reminder",
};

// Canais Android Completos (Fase 9)
export const ANDROID_CHANNELS = {
  // Canais canônicos oficiais
  CRITICAL_ALERTS: "critical_alerts",
  MESSAGES: "messages",
  WORKOUTS: "workouts",
  ASSESSMENTS: "assessments",
  APPOINTMENTS: "appointments",
  ACCOUNT_AND_BILLING: "account_and_billing",
  REMINDERS_CHANNEL: "reminders",
  GENERAL: "general",

  // Aliases mantidos para compatibilidade retroativa
  DEFAULT: "dragoncorp_default",
  REMINDERS: "dragoncorp_reminders",
  URGENT: "dragoncorp_urgent",
  CHAT: "dragoncorp_chat",
};

/**
 * Inicializa e configura o handler global de notificações do app em foreground
 */
export function initForegroundNotificationHandler() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn("[Notifications] Erro ao configurar notification handler:", error);
  }
}

/**
 * Cria os canais de notificação no Android com alta prioridade e identidade DragonCorp
 */
export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== "android") return;

  try {
    // 1. Alertas Críticos (Dor aguda, segurança, falha de pagamento)
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.CRITICAL_ALERTS, {
      name: "Alertas Críticos e Dores",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // 2. Mensagens e Chat
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.MESSAGES, {
      name: "Mensagens e Chat",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // 3. Treinos
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.WORKOUTS, {
      name: "Treinos e Prescrições",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // 4. Avaliações
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.ASSESSMENTS, {
      name: "Avaliações Físicas",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // 5. Atendimentos e Agenda
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.APPOINTMENTS, {
      name: "Atendimentos e Agenda",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // 6. Conta e Faturamento
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.ACCOUNT_AND_BILLING, {
      name: "Conta e Assinatura",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // 7. Lembretes Diários
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.REMINDERS_CHANNEL, {
      name: "Lembretes e Hábitos",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    // 8. Geral
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.GENERAL, {
      name: "Geral",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#D90000",
      sound: "default",
      showBadge: true,
    });

    // Canais legados (compatibilidade com instalações existentes)
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.DEFAULT, {
      name: "DragonCorp Notificações",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.REMINDERS, {
      name: "Lembretes de Treino e Hidratação",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.URGENT, {
      name: "Alertas Importantes e Dores",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.CHAT, {
      name: "Mensagens e Orientações",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#D90000",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
  } catch (error) {
    console.warn("[Notifications] Erro ao configurar canais Android:", error);
  }
}

/**
 * Configura categorias e ações rápidas para iOS
 */
export async function setupIOSNotificationCategories() {
  if (Platform.OS !== "ios") return;

  try {
    await Notifications.setNotificationCategoryAsync("WORKOUT", [
      { identifier: "OPEN_WORKOUT", buttonTitle: "Abrir Treino", options: { opensAppToForeground: true } },
      { identifier: "REMIND_LATER", buttonTitle: "Lembrar mais tarde", options: { opensAppToForeground: false } },
    ]);

    await Notifications.setNotificationCategoryAsync("FEEDBACK", [
      { identifier: "VIEW_FEEDBACK", buttonTitle: "Ver Feedback", options: { opensAppToForeground: true } },
      { identifier: "MARK_READ", buttonTitle: "Marcar como lida", options: { opensAppToForeground: false } },
    ]);

    await Notifications.setNotificationCategoryAsync("PAIN_ALERT", [
      { identifier: "VIEW_STUDENT", buttonTitle: "Ver Aluno", options: { opensAppToForeground: true } },
    ]);

    await Notifications.setNotificationCategoryAsync("MESSAGE", [
      { identifier: "REPLY_MESSAGE", buttonTitle: "Responder", options: { opensAppToForeground: true } },
      { identifier: "MARK_READ", buttonTitle: "Marcar como lida", options: { opensAppToForeground: false } },
    ]);
  } catch (error) {
    console.warn("[Notifications] Erro ao configurar categorias iOS:", error);
  }
}

/**
 * Verifica o status atual da permissão de notificações no sistema operacional
 */
export async function checkNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.status === "granted") {
      return "granted";
    }
    if (settings.status === "denied" || (!settings.canAskAgain && settings.status !== "undetermined")) {
      return "denied";
    }
    return "undetermined";
  } catch (error) {
    console.warn("[Notifications] Erro ao verificar permissões:", error);
    return "undetermined";
  }
}

/**
 * Solicita a permissão nativa de notificação ao usuário (iOS e Android 13+)
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  try {
    await markPermissionAsPrompted();

    const currentStatus = await checkNotificationPermissionStatus();
    if (currentStatus === "granted") {
      return "granted";
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const isGranted = status === "granted";
    if (isGranted) {
      await setupAndroidNotificationChannels();
      await registerForPushNotificationsAsync();
    }

    return isGranted ? "granted" : "denied";
  } catch (error) {
    console.warn("[Notifications] Erro ao solicitar permissão:", error);
    return "denied";
  }
}

/**
 * Registra o dispositivo e obtém o Push Token (Expo Push Token)
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice && Platform.OS !== "web") {
      const mockToken = `ExponentPushToken[mock_simulator_${Platform.OS}_${Date.now()}]`;
      await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, mockToken);
      return mockToken;
    }

    const status = await checkNotificationPermissionStatus();
    if (status !== "granted") {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    const token = tokenData?.data || null;

    if (token) {
      await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, token);
    }
    return token;
  } catch (error) {
    console.warn("[Notifications] Erro ao obter push token:", error);
    return null;
  }
}

/**
 * Retorna o Push Token salvo
 */
export async function getSavedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_PUSH_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Verifica se o usuário já viu o prompt inicial de permissão
 */
export async function hasUserBeenPromptedForPermission(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY_PERMISSION_PROMPTED);
    return val === "true";
  } catch {
    return false;
  }
}

/**
 * Marca que o usuário já visualizou o prompt de permissão
 */
export async function markPermissionAsPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PERMISSION_PROMPTED, "true");
  } catch (error) {
    console.warn("[Notifications] Erro ao salvar status de prompt:", error);
  }
}

/**
 * Dispara uma notificação local imediata (útil para testes e alertas instantâneos)
 */
export async function triggerLocalNotification(payload: NotificationPayload, channelId = ANDROID_CHANNELS.DEFAULT): Promise<string | null> {
  try {
    const permission = await checkNotificationPermissionStatus();
    if (permission !== "granted") {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound !== false,
        badge: payload.badge,
        color: "#D90000",
      },
      trigger: null, // Imediata
    });

    return notificationId;
  } catch (error) {
    console.warn("[Notifications] Erro ao disparar notificação local:", error);
    return null;
  }
}

/**
 * Agenda o lembrete diário de treino
 */
export async function scheduleDailyWorkoutReminder(
  timeStr = "08:00",
  title = "Hora do Treino! 🏋️",
  body = "Seu plano de hoje está pronto no DragonCorp. Vamos superar limites!"
): Promise<void> {
  try {
    // Cancela agendamento anterior
    await cancelDailyWorkoutReminder();

    const [hourStr, minuteStr] = timeStr.split(":");
    const hour = parseInt(hourStr || "8", 10);
    const minute = parseInt(minuteStr || "0", 10);

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.DAILY_WORKOUT,
      content: {
        title,
        body,
        sound: true,
        color: "#D90000",
        data: { route: "/(tabs)/training", type: "workout_reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: ANDROID_CHANNELS.REMINDERS,
      },
    });
  } catch (error) {
    console.warn("[Notifications] Erro ao agendar lembrete diário de treino:", error);
  }
}

/**
 * Cancela o lembrete diário de treino
 */
export async function cancelDailyWorkoutReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY_WORKOUT);
  } catch {
    // Ignora se não existir
  }
}

/**
 * Agenda lembretes de hidratação distribuídos ao longo do dia (das 08h às 20h)
 */
export async function scheduleHydrationReminders(
  intervalHours = 2,
  title = "Hora de se Hidratar! 💧",
  body = "Mantenha o rendimento e registre seu consumo de água no DragonCorp."
): Promise<void> {
  try {
    await cancelHydrationReminders();

    const startHour = 8;
    const endHour = 20;

    for (let hour = startHour; hour <= endHour; hour += intervalHours) {
      const identifier = `${NOTIFICATION_IDS.HYDRATION_PREFIX}${hour}`;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: true,
          color: "#D90000",
          data: { route: "/hydration", type: "hydration_reminder" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: ANDROID_CHANNELS.REMINDERS,
        },
      });
    }
  } catch (error) {
    console.warn("[Notifications] Erro ao agendar lembretes de hidratação:", error);
  }
}

/**
 * Cancela todos os lembretes de hidratação
 */
export async function cancelHydrationReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith(NOTIFICATION_IDS.HYDRATION_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch {
    // Ignora
  }
}

/**
 * Agenda o resumo semanal do Personal Trainer (Toda Segunda-feira às 08h)
 */
export async function scheduleTrainerWeeklySummaryReminder(
  hour = 8,
  minute = 0,
  title = "Resumo Semanal da sua Consultoria 📊",
  body = "Confira suas avaliações, reavaliações e alunos agendados para esta semana."
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.TRAINER_WEEKLY_SUMMARY);

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.TRAINER_WEEKLY_SUMMARY,
      content: {
        title,
        body,
        sound: true,
        color: "#D90000",
        data: { route: "/notifications", type: "weekly_summary" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // Segunda-feira (1 = Domingo, 2 = Segunda no Expo Notifications)
        hour,
        minute,
        channelId: ANDROID_CHANNELS.REMINDERS,
      },
    });
  } catch (error) {
    console.warn("[Notifications] Erro ao agendar resumo semanal do treinador:", error);
  }
}

/**
 * Atualiza o número de badge no ícone do aplicativo (iOS e Android)
 */
export async function syncAppBadgeCount(count: number): Promise<void> {
  try {
    const safeCount = Math.max(0, count);
    await Notifications.setBadgeCountAsync(safeCount);
  } catch (error) {
    console.warn("[Notifications] Erro ao sincronizar badge count:", error);
  }
}

/**
 * Recupera as preferências de notificações salvas
 */
export async function getStoredNativeNotificationPreferences(): Promise<NativeNotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFS);
    if (!raw) return DEFAULT_NATIVE_PREFS;
    return { ...DEFAULT_NATIVE_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NATIVE_PREFS;
  }
}

/**
 * Salva as preferências e aplica automaticamente os agendamentos correspondentes
 */
export async function saveAndApplyNotificationPreferences(
  updates: Partial<NativeNotificationPreferences>,
  role?: "TRAINER" | "STUDENT" | "ADMIN"
): Promise<NativeNotificationPreferences> {
  const current = await getStoredNativeNotificationPreferences();
  const next: NativeNotificationPreferences = { ...current, ...updates };

  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(next));

    const permission = await checkNotificationPermissionStatus();
    if (permission !== "granted" || !next.pushEnabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return next;
    }

    // Aplica lembrete de treino
    if (next.workoutReminderEnabled) {
      await scheduleDailyWorkoutReminder(next.workoutReminderTime);
    } else {
      await cancelDailyWorkoutReminder();
    }

    // Aplica lembrete de hidratação
    if (next.hydrationReminderEnabled) {
      await scheduleHydrationReminders(next.hydrationIntervalHours);
    } else {
      await cancelHydrationReminders();
    }

    // Aplica resumo semanal para treinador
    if (role === "TRAINER" && next.trainerWeeklySummaryEnabled) {
      await scheduleTrainerWeeklySummaryReminder();
    }

    return next;
  } catch (error) {
    console.warn("[Notifications] Erro ao salvar e aplicar preferências:", error);
    return next;
  }
}
