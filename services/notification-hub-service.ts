import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppNotification,
  listNotificationsForUser,
  createWorkoutNotification,
} from "@/services/feedback-store";
import { listTrainerAgendaEvents, TrainerAgendaStoredEvent } from "@/services/trainer-agenda-store";
import { listAssessmentsForTrainer } from "@/services/assessment-store";
import { listStudentProfilesForTrainer } from "@/services/student-profile-store";
import { triggerLocalNotification, ANDROID_CHANNELS } from "@/services/native-notification-service";

export type NotificationCategory =
  | "weekly_summary"
  | "assessment"
  | "reassessment"
  | "consultancy"
  | "feedback_pain"
  | "workout_expiration"
  | "account_status"
  | "subscription";

export interface WeeklySummaryStats {
  startDate: string;
  endDate: string;
  initialAssessmentsCount: number;
  reassessmentsCount: number;
  consultanciesCount: number;
  totalAppointments: number;
  summaryMessage: string;
}

const STORAGE_KEY_NOTIFICATION_PREFS = "@dragoncorp/notification_preferences_v1";

export interface UserNotificationPreferences {
  enablePush: boolean;
  enableWeeklySummary: boolean;
  weeklySummaryDay: "monday" | "sunday";
  weeklySummaryTime: string; // "08:00"
  enableAssessmentsAlert: boolean;
  enableFeedbacksAlert: boolean;
  enableExpirationsAlert: boolean;
  enableSubscriptionAlert: boolean;
}

const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  enablePush: true,
  enableWeeklySummary: true,
  weeklySummaryDay: "monday",
  weeklySummaryTime: "08:00",
  enableAssessmentsAlert: true,
  enableFeedbacksAlert: true,
  enableExpirationsAlert: true,
  enableSubscriptionAlert: true,
};

/**
 * Calcula os limites da semana atual (Segunda-feira 00:00:00 a Domingo 23:59:59)
 */
export function getCurrentWeekBounds(referenceDate = new Date()): { start: Date; end: Date } {
  const current = new Date(referenceDate);
  const dayOfWeek = current.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(current);
  start.setDate(current.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Calcula e gera os dados do Resumo Semanal do Personal Trainer
 */
export async function calculateTrainerWeeklySummary(
  trainerId: string,
  referenceDate = new Date()
): Promise<WeeklySummaryStats> {
  const { start, end } = getCurrentWeekBounds(referenceDate);
  const [events, assessments, profiles] = await Promise.all([
    listTrainerAgendaEvents(trainerId),
    listAssessmentsForTrainer(trainerId),
    listStudentProfilesForTrainer(trainerId, trainerId, "trainer"),
  ]);

  // Filtra eventos agendados dentro da semana atual
  const weekEvents = events.filter((e) => {
    const eventTime = new Date(e.startAt).getTime();
    return eventTime >= start.getTime() && eventTime <= end.getTime();
  });

  // Separação de avaliações, reavaliações e consultorias
  let initialAssessmentsCount = 0;
  let reassessmentsCount = 0;
  let consultanciesCount = 0;

  weekEvents.forEach((event) => {
    const titleLower = event.title.toLowerCase();
    const detailLower = event.detail.toLowerCase();

    if (event.type === "assessment" || titleLower.includes("avalia") || detailLower.includes("avalia")) {
      if (titleLower.includes("reavalia") || detailLower.includes("reavalia")) {
        reassessmentsCount++;
      } else {
        initialAssessmentsCount++;
      }
    } else if (event.type === "session" || titleLower.includes("consultoria") || detailLower.includes("consultoria") || titleLower.includes("atendimento")) {
      consultanciesCount++;
    }
  });

  // Verifica também reavaliações de alunos com vencimento na semana
  profiles.forEach((p) => {
    if (p.followUp?.nextAssessmentAt) {
      const nextTime = new Date(p.followUp.nextAssessmentAt).getTime();
      if (nextTime >= start.getTime() && nextTime <= end.getTime()) {
        const alreadyCounted = weekEvents.some((e) => e.studentId === p.id && (e.title.includes("Reavalia") || e.type === "assessment"));
        if (!alreadyCounted) {
          reassessmentsCount++;
        }
      }
    }
  });

  const totalAppointments = initialAssessmentsCount + reassessmentsCount + consultanciesCount;
  const summaryMessage = `Esta semana você possui ${initialAssessmentsCount} avaliações, ${reassessmentsCount} reavaliações e ${consultanciesCount} consultorias.`;

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    initialAssessmentsCount,
    reassessmentsCount,
    consultanciesCount,
    totalAppointments,
    summaryMessage,
  };
}

/**
 * Dispara notificação de Resumo Semanal para o Personal Trainer
 */
export async function emitTrainerWeeklySummaryNotification(
  trainerId: string,
  referenceDate = new Date()
): Promise<AppNotification | undefined> {
  const summary = await calculateTrainerWeeklySummary(trainerId, referenceDate);
  const weekNumber = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const dedupeKey = `weekly_summary_${trainerId}_${new Date().getFullYear()}_w${weekNumber}`;

  const notif = await createWorkoutNotification({
    userId: trainerId,
    audience: "trainer",
    type: "workout",
    title: "Resumo da sua Semana",
    message: summary.summaryMessage,
    dedupeKey,
  });

  if (notif) {
    await triggerLocalNotification({
      title: "Resumo da sua Semana 📊",
      body: summary.summaryMessage,
      data: { route: "/notifications", type: "weekly_summary" },
    }, ANDROID_CHANNELS.REMINDERS);
  }

  return notif;
}

/**
 * Emite alerta de Feedback com relato de dor
 */
export async function emitPainAlertNotification(input: {
  trainerId: string;
  studentName: string;
  painRegion?: string;
  painLevel?: number;
  workoutName: string;
  feedbackId: string;
}): Promise<AppNotification | undefined> {
  const dedupeKey = `pain_alert_${input.feedbackId}`;
  const title = `Atenção: ${input.studentName} relatou dor`;
  const message = `Desconforto em ${input.painRegion || "região não especificada"} (nível ${input.painLevel || 0}/10) no treino ${input.workoutName}.`;

  const notif = await createWorkoutNotification({
    userId: input.trainerId,
    audience: "trainer",
    type: "pain_alert",
    title,
    message,
    feedbackId: input.feedbackId,
    highlightPain: true,
    dedupeKey,
  });

  if (notif) {
    await triggerLocalNotification({
      title,
      body: message,
      data: {
        route: "/feedback-detail",
        id: input.feedbackId,
        role: "trainer",
      },
    }, ANDROID_CHANNELS.URGENT);
  }

  return notif;
}

/**
 * Emite notificação de status de conta do Personal
 */
export async function emitTrainerAccountStatusNotification(input: {
  trainerId: string;
  status: "approved" | "rejected" | "suspended" | "reactivated";
  reason?: string;
}): Promise<AppNotification | undefined> {
  const titles = {
    approved: "Cadastro Aprovado!",
    rejected: "Atualização no Cadastro",
    suspended: "Acesso Suspenso",
    reactivated: "Conta Reativada",
  };

  const messages = {
    approved: "Seu registro profissional foi validado com sucesso. Todos os recursos profissionais estão liberados.",
    rejected: `Seu cadastro requer ajustes: ${input.reason || "Verifique seus dados profissionais."}`,
    suspended: `Seu acesso foi suspenso temporariamente: ${input.reason || "Entre em contato com a administração."}`,
    reactivated: "Sua conta foi reativada e você já pode voltar a prescrever treinos e atender seus alunos.",
  };

  const notif = await createWorkoutNotification({
    userId: input.trainerId,
    audience: "trainer",
    type: "system",
    title: titles[input.status],
    message: messages[input.status],
    dedupeKey: `account_status_${input.trainerId}_${Date.now()}`,
  });

  if (notif) {
    await triggerLocalNotification({
      title: titles[input.status],
      body: messages[input.status],
      data: { route: "/notifications", type: "account_status" },
    }, ANDROID_CHANNELS.DEFAULT);
  }

  return notif;
}

/**
 * Recupera as preferências de notificação do usuário
 */
export async function getUserNotificationPreferences(): Promise<UserNotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATION_PREFS);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Salva as preferências de notificação do usuário
 */
export async function saveUserNotificationPreferences(
  updates: Partial<UserNotificationPreferences>
): Promise<UserNotificationPreferences> {
  const current = await getUserNotificationPreferences();
  const next = { ...current, ...updates };
  await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATION_PREFS, JSON.stringify(next));
  return next;
}
