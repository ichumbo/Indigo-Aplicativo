import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAuthUserById } from "@/services/auth-store";
import {
  DEMO_TRAINER,
  TrainingFeedback,
  getUnreadNotificationCount,
  listFeedbacksForTrainer,
  listNotificationsForUser,
} from "@/services/feedback-store";
import {
  PhysicalAssessment,
  listAssessmentsForTrainer,
} from "@/services/assessment-store";
import {
  StudentProfile,
  StudentStatus,
  calculateAdherence,
  daysSince,
  daysUntil,
  listStudentProfilesForTrainer,
} from "@/services/student-profile-store";
import {
  TrainingDashboard,
  getSessionEffectiveStatus,
  getTrainingDashboard,
} from "@/services/training-plan-store";

export type TrainerHomeShortcutId =
  | "agenda"
  | "reassessments"
  | "workout-models"
  | "expirations"
  | "frequency"
  | "evolution"
  | "registration"
  | "exercise-library"
  | "feedbacks"
  | "contacts"
  | "anamnesis"
  | "assessments";

export type TrainerHomeTodayIndicatorId =
  | "appointments"
  | "training"
  | "assessments"
  | "anamnesis"
  | "feedbacks"
  | "absences"
  | "expiring";

export type TrainerHomeStudentFilter =
  | "all"
  | "active"
  | "pending"
  | "paused"
  | "inactive"
  | "without-workout"
  | "workout-expiring"
  | "reassessment-pending"
  | "anamnesis-pending"
  | "feedback-pending"
  | "absent-recently"
  | "pain";

export type TrainerHomeSort = "priority" | "name" | "last-activity" | "next-assessment" | "workout-expiration" | "adherence";

export type TrainerHomePendingPriority = "critical" | "expired" | "soon" | "recent" | "admin";

export type TrainerHomePreferenceState = {
  trainerId: string;
  shortcutIds: TrainerHomeShortcutId[];
  todayIndicatorIds: TrainerHomeTodayIndicatorId[];
  viewedPendingIds: string[];
  snoozedPendingIds: Record<string, string>;
  savedStudentFilter?: TrainerHomeStudentFilter;
  savedSort?: TrainerHomeSort;
  updatedAt: string;
};

export type TrainerHomeShortcut = {
  id: TrainerHomeShortcutId;
  label: string;
  detail: string;
  icon: string;
  badge?: number;
  action: "route" | "filter" | "modal";
  route?: TrainerHomeRoute;
  filter?: TrainerHomeStudentFilter;
  modal?: "agenda" | "registration";
};

export type TrainerHomeRoute =
  | "/profile"
  | "/training"
  | "/feedbacks"
  | "/trainer-agenda"
  | "/student-feedbacks"
  | "/student-assessments"
  | "/exercise-performance"
  | "/exercises"
  | "/notifications"
  | "/assessment-editor"
  | "/trainer-contacts"
  | "/trainer-expirations"
  | "/trainer-feedback-hub"
  | "/trainer-my-exercises"
  | "/trainer-ranking-evolution"
  | "/trainer-ranking-frequency"
  | "/trainer-reassessments"
  | "/trainer-registration-link"
  | "/trainer-workout-templates"
  | "/trainer-anamnesis"
  | "/trainer-attention";

export type TrainerHomeTodayIndicator = {
  id: TrainerHomeTodayIndicatorId;
  label: string;
  value: number;
  detail: string;
  icon: string;
  action: "route" | "filter" | "modal";
  route?: TrainerHomeRoute;
  filter?: TrainerHomeStudentFilter;
  modal?: "agenda";
};

export type TrainerHomePending = {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  title: string;
  detail: string;
  type: string;
  date?: string;
  priority: TrainerHomePendingPriority;
  priorityLabel: string;
  actionLabel: string;
  route: TrainerHomeRoute;
  filter?: TrainerHomeStudentFilter;
  viewed: boolean;
  snoozedUntil?: string;
};

export type TrainerHomeStudentSummary = {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  objective: string;
  status: StudentStatus;
  statusLabel: string;
  lastActivityAt: string;
  lastActivityLabel: string;
  nextSessionAt: string;
  nextSessionLabel: string;
  nextAssessmentAt: string;
  nextAssessmentLabel: string;
  currentWorkoutName: string;
  workoutExpirationAt: string;
  workoutExpirationLabel: string;
  adherencePercent: number;
  pendingCount: number;
  nextAction: string;
  hasPain: boolean;
  hasFeedbackPending: boolean;
  hasAbsentRecently: boolean;
  hasAnamnesisPending: boolean;
  hasWorkoutExpiring: boolean;
  hasNoWorkout: boolean;
  hasReassessmentPending: boolean;
  hasDocumentPending: boolean;
  searchText: string;
  priorityScore: number;
};

export type TrainerHomeDashboard = {
  trainer: {
    id: string;
    name: string;
    avatar?: string;
    professionalId?: string;
  };
  generatedAt: string;
  students: TrainerHomeStudentSummary[];
  rawProfiles: StudentProfile[];
  preferences: TrainerHomePreferenceState;
  today: TrainerHomeTodayIndicator[];
  todayCatalog: TrainerHomeTodayIndicator[];
  pendings: TrainerHomePending[];
  shortcuts: TrainerHomeShortcut[];
  shortcutCatalog: TrainerHomeShortcut[];
  filterCounts: Record<TrainerHomeStudentFilter, number>;
  unreadNotifications: number;
  partialErrors: string[];
};

const STORAGE_KEY = "@dragoncorp/trainer-home-preferences/v1";

export const DEFAULT_HOME_SHORTCUTS: TrainerHomeShortcutId[] = [
  "agenda",
  "feedbacks",
  "anamnesis",
  "assessments",
  "workout-models",
  "expirations",
  "frequency",
  "evolution",
];

export const DEFAULT_HOME_TODAY_INDICATORS: TrainerHomeTodayIndicatorId[] = [
  "appointments",
  "training",
  "assessments",
  "anamnesis",
  "feedbacks",
  "absences",
];

const ALL_SHORTCUTS: TrainerHomeShortcutId[] = [
  "agenda",
  "reassessments",
  "workout-models",
  "expirations",
  "frequency",
  "evolution",
  "registration",
  "exercise-library",
  "feedbacks",
  "contacts",
  "anamnesis",
  "assessments",
];

const ALL_TODAY_INDICATORS: TrainerHomeTodayIndicatorId[] = [
  "appointments",
  "training",
  "assessments",
  "anamnesis",
  "feedbacks",
  "absences",
  "expiring",
];

export const STUDENT_FILTER_LABELS: Record<TrainerHomeStudentFilter, string> = {
  all: "Todos",
  active: "Ativos",
  pending: "Pendentes",
  paused: "Pausados",
  inactive: "Inativos",
  "without-workout": "Sem treino",
  "workout-expiring": "Treino vencendo",
  "reassessment-pending": "Reavaliacao pendente",
  "anamnesis-pending": "Anamnese pendente",
  "feedback-pending": "Feedback pendente",
  "absent-recently": "Ausencia recente",
  pain: "Com dor",
};

export const STUDENT_SORT_LABELS: Record<TrainerHomeSort, string> = {
  priority: "Prioridade",
  name: "Nome",
  "last-activity": "Ultima atividade",
  "next-assessment": "Proxima avaliacao",
  "workout-expiration": "Vencimento do treino",
  adherence: "Aderencia",
};

export async function getTrainerHomeDashboard(trainerId = DEMO_TRAINER.id): Promise<TrainerHomeDashboard> {
  const trainerAccount = await getAuthUserById(trainerId);
  const [preferences, profiles, feedbacks, assessments, unreadNotifications, notifications] = await Promise.all([
    getTrainerHomePreferences(trainerId),
    listStudentProfilesForTrainer(trainerId, trainerId, "trainer"),
    listFeedbacksForTrainer(trainerId),
    listAssessmentsForTrainer(trainerId),
    getUnreadNotificationCount(trainerId),
    listNotificationsForUser(trainerId),
  ]);

  const trainingResults = await Promise.allSettled(
    profiles.map((profile) => getTrainingDashboard(profile.id, trainerId, "trainer", "trainer"))
  );
  const trainingByStudent = new Map<string, TrainingDashboard>();
  const partialErrors: string[] = [];

  trainingResults.forEach((result, index) => {
    const profile = profiles[index];
    if (result.status === "fulfilled") {
      trainingByStudent.set(profile.id, result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason ?? "");
      // Se for apenas ausência de plano cadastrado para o aluno, trata como estado vazio natural
      if (reason.toLowerCase().includes("nao encontrado") || reason.toLowerCase().includes("não encontrado")) {
        // Aluno ainda sem plano cadastrado - estado normal
      } else {
        partialErrors.push(`Treinos indisponíveis para ${profile.registration.fullName}.`);
      }
    }
  });

  const pendingContext = {
    preferences,
    feedbacks,
    assessments,
    trainingByStudent,
    notifications,
  };
  const pendings = profiles
    .flatMap((profile) => buildPendingsForStudent(profile, pendingContext))
    .filter((pending) => !isSnoozedActive(pending))
    .sort(sortPendingByPriority);
  const students = profiles
    .map((profile) => buildStudentSummary(profile, pendings, feedbacks, trainingByStudent.get(profile.id)))
    .sort((first, second) => second.priorityScore - first.priorityScore);
  const filterCounts = buildFilterCounts(students);
  const todayCatalog = buildTodayIndicators(profiles, feedbacks, assessments, trainingByStudent);
  const today = preferences.todayIndicatorIds
    .map((id) => todayCatalog.find((indicator) => indicator.id === id))
    .filter((indicator): indicator is TrainerHomeTodayIndicator => Boolean(indicator));
  const shortcutCatalog = buildShortcutCatalog({
    unreadNotifications,
    pendingFeedbacks: todayCatalog.find((item) => item.id === "feedbacks")?.value ?? 0,
    pendingAnamnesis: todayCatalog.find((item) => item.id === "anamnesis")?.value ?? 0,
    reassessments: todayCatalog.find((item) => item.id === "assessments")?.value ?? 0,
    expiring: filterCounts["workout-expiring"],
    pain: filterCounts.pain,
  });
  const shortcuts = preferences.shortcutIds
    .map((id) => shortcutCatalog.find((shortcut) => shortcut.id === id))
    .filter((shortcut): shortcut is TrainerHomeShortcut => Boolean(shortcut));

  return {
    trainer: {
      id: trainerId,
      name: trainerAccount?.name ?? DEMO_TRAINER.name,
      avatar: trainerAccount?.avatar ?? undefined,
      professionalId: trainerAccount?.professionalId ?? "CREF ativo",
    },
    generatedAt: new Date().toISOString(),
    students,
    rawProfiles: profiles,
    preferences,
    today,
    todayCatalog,
    pendings,
    shortcuts,
    shortcutCatalog,
    filterCounts,
    unreadNotifications,
    partialErrors,
  };
}

export async function getTrainerHomePreferences(trainerId = DEMO_TRAINER.id): Promise<TrainerHomePreferenceState> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  const fallback = makeDefaultPreferences(trainerId);

  if (!stored) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ [trainerId]: fallback }));
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored) as Record<string, Partial<TrainerHomePreferenceState>>;
    const current = parsed[trainerId] ?? fallback;
    const shortcutIds = normalizeShortcutIds(current.shortcutIds);
    const todayIndicatorIds = Array.isArray(current.todayIndicatorIds)
      ? normalizeTodayIndicatorIds(current.todayIndicatorIds)
      : DEFAULT_HOME_TODAY_INDICATORS;
    const next = {
      ...fallback,
      ...current,
      trainerId,
      shortcutIds: shortcutIds.length ? shortcutIds : DEFAULT_HOME_SHORTCUTS,
      todayIndicatorIds,
      viewedPendingIds: current.viewedPendingIds ?? [],
      snoozedPendingIds: current.snoozedPendingIds ?? {},
    };
    return next;
  } catch {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ [trainerId]: fallback }));
    return fallback;
  }
}

export async function saveTrainerHomeShortcutIds(shortcutIds: TrainerHomeShortcutId[], trainerId = DEMO_TRAINER.id) {
  const next = {
    ...(await getTrainerHomePreferences(trainerId)),
    shortcutIds: normalizeShortcutIds(shortcutIds),
    updatedAt: new Date().toISOString(),
  };
  await writeTrainerPreferences(trainerId, next);
  return next;
}

export async function restoreTrainerHomeShortcutDefaults(trainerId = DEMO_TRAINER.id) {
  return saveTrainerHomeShortcutIds(DEFAULT_HOME_SHORTCUTS, trainerId);
}

export async function saveTrainerHomeTodayIndicatorIds(todayIndicatorIds: TrainerHomeTodayIndicatorId[], trainerId = DEMO_TRAINER.id) {
  const next = {
    ...(await getTrainerHomePreferences(trainerId)),
    todayIndicatorIds: normalizeTodayIndicatorIds(todayIndicatorIds),
    updatedAt: new Date().toISOString(),
  };
  await writeTrainerPreferences(trainerId, next);
  return next;
}

export async function restoreTrainerHomeTodayIndicatorDefaults(trainerId = DEMO_TRAINER.id) {
  return saveTrainerHomeTodayIndicatorIds(DEFAULT_HOME_TODAY_INDICATORS, trainerId);
}

export async function markTrainerHomePendingViewed(pendingId: string, trainerId = DEMO_TRAINER.id) {
  const preferences = await getTrainerHomePreferences(trainerId);
  const next = {
    ...preferences,
    viewedPendingIds: [...new Set([pendingId, ...preferences.viewedPendingIds])],
    updatedAt: new Date().toISOString(),
  };
  await writeTrainerPreferences(trainerId, next);
  return next;
}

export async function snoozeTrainerHomePending(pendingId: string, days = 3, trainerId = DEMO_TRAINER.id) {
  const preferences = await getTrainerHomePreferences(trainerId);
  const until = new Date();
  until.setDate(until.getDate() + days);
  const next = {
    ...preferences,
    snoozedPendingIds: {
      ...preferences.snoozedPendingIds,
      [pendingId]: until.toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  await writeTrainerPreferences(trainerId, next);
  return next;
}

export function studentMatchesHomeFilter(student: TrainerHomeStudentSummary, filter: TrainerHomeStudentFilter) {
  if (filter === "all") return true;
  if (filter === "active") return student.status === "ativo";
  if (filter === "pending") return student.status === "aguardando_inicio" || student.pendingCount > 0;
  if (filter === "paused") return student.status === "pausado";
  if (filter === "inactive") return student.status === "inativo" || student.status === "encerrado";
  if (filter === "without-workout") return student.hasNoWorkout;
  if (filter === "workout-expiring") return student.hasWorkoutExpiring;
  if (filter === "reassessment-pending") return student.hasReassessmentPending;
  if (filter === "anamnesis-pending") return student.hasAnamnesisPending;
  if (filter === "feedback-pending") return student.hasFeedbackPending;
  if (filter === "absent-recently") return student.hasAbsentRecently;
  if (filter === "pain") return student.hasPain;
  return true;
}

export function sortTrainerHomeStudents(students: TrainerHomeStudentSummary[], sort: TrainerHomeSort) {
  return [...students].sort((first, second) => {
    if (sort === "name") return first.name.localeCompare(second.name);
    if (sort === "last-activity") return dateMs(second.lastActivityAt) - dateMs(first.lastActivityAt);
    if (sort === "next-assessment") return dateMs(first.nextAssessmentAt) - dateMs(second.nextAssessmentAt);
    if (sort === "workout-expiration") return dateMs(first.workoutExpirationAt) - dateMs(second.workoutExpirationAt);
    if (sort === "adherence") return second.adherencePercent - first.adherencePercent;
    return second.priorityScore - first.priorityScore;
  });
}

function buildTodayIndicators(
  profiles: StudentProfile[],
  feedbacks: TrainingFeedback[],
  assessments: PhysicalAssessment[],
  trainingByStudent: Map<string, TrainingDashboard>
): TrainerHomeTodayIndicator[] {
  const todaySessions = profiles.filter((profile) => isToday(profile.followUp.nextSessionAt)).length;
  const trainingScheduledToday = profiles.filter((profile) => {
    const dashboard = trainingByStudent.get(profile.id);
    if (!dashboard) return isToday(profile.followUp.nextSessionAt);
    const weekday = getWeekdayName(new Date());
    return dashboard.plan.weeklySchedule.some((item) => item.day.toLowerCase() === weekday.toLowerCase());
  }).length;
  const assessmentsToday = assessments.filter((assessment) => isToday(assessment.assessedAt) || isToday(assessment.nextAssessmentAt)).length;
  const anamnesisPending = profiles.filter((profile) => profile.anamnesis.status === "aguardando_revisao").length;
  const pendingFeedbacks = feedbacks.filter(isFeedbackPending).length;
  const absent = profiles.filter((profile) => (daysSince(profile.followUp.lastTrainingAt) ?? 0) >= 5).length;
  const expiring = profiles.filter((profile) => (daysUntil(profile.followUp.currentWorkoutExpiresAt) ?? 999) <= 15).length;

  return [
    {
      id: "appointments",
      label: "Atendimentos hoje",
      value: todaySessions,
      detail: "Sessoes e contatos previstos",
      icon: "calendar-outline",
      action: "route",
      route: "/trainer-agenda",
    },
    {
      id: "training",
      label: "Treino previsto",
      value: trainingScheduledToday,
      detail: "Alunos com sessao no plano",
      icon: "fitness-outline",
      action: "route",
      route: "/training",
    },
    {
      id: "assessments",
      label: "Avaliacoes",
      value: assessmentsToday,
      detail: "Hoje ou reavaliacao marcada",
      icon: "clipboard-outline",
      action: "route",
      route: "/trainer-reassessments",
    },
    {
      id: "anamnesis",
      label: "Anamneses recebidas",
      value: anamnesisPending,
      detail: "Aguardando revisao",
      icon: "document-text-outline",
      action: "route",
      route: "/trainer-anamnesis",
    },
    {
      id: "feedbacks",
      label: "Feedbacks pendentes",
      value: pendingFeedbacks,
      detail: "Novos ou sem resposta",
      icon: "chatbubbles-outline",
      action: "route",
      route: "/trainer-feedback-hub",
    },
    {
      id: "absences",
      label: "Ausencias recentes",
      value: absent,
      detail: "Sem treino ha 5+ dias",
      icon: "walk-outline",
      action: "route",
      route: "/trainer-ranking-frequency",
    },
    {
      id: "expiring",
      label: "Treinos vencendo",
      value: expiring,
      detail: "Proximos 15 dias",
      icon: "time-outline",
      action: "route",
      route: "/trainer-expirations",
    },
  ];
}

function buildPendingsForStudent(
  profile: StudentProfile,
  context: {
    preferences: TrainerHomePreferenceState;
    feedbacks: TrainingFeedback[];
    assessments: PhysicalAssessment[];
    trainingByStudent: Map<string, TrainingDashboard>;
    notifications: Awaited<ReturnType<typeof listNotificationsForUser>>;
  }
): TrainerHomePending[] {
  const pendings: TrainerHomePending[] = [];
  const studentFeedbacks = context.feedbacks.filter((feedback) => feedback.studentId === profile.id);
  const dashboard = context.trainingByStudent.get(profile.id);

  const painFeedback = studentFeedbacks.find((feedback) => feedback.hasPain && feedback.status !== "encerrado");
  const painExecution = dashboard?.executions.find((execution) => execution.sets.some((set) => set.pain));
  if (painFeedback || painExecution) {
    pendings.push(makePending(profile, {
      id: "pain",
      title: "Relato de dor",
      detail: painFeedback?.painRegion
        ? `${painFeedback.painRegion} • nivel ${painFeedback.painLevel ?? "-"}`
        : "Dor registrada em execucao de treino.",
      type: "Seguranca",
      date: painFeedback?.finishedAt ?? painExecution?.finishedAt ?? painExecution?.startedAt,
      priority: "critical",
      actionLabel: "Abrir feedback",
      route: "/student-feedbacks",
      filter: "pain",
    }, context.preferences));
  }

  const pendingFeedback = studentFeedbacks.find(isFeedbackPending);
  if (pendingFeedback) {
    pendings.push(makePending(profile, {
      id: `feedback-${pendingFeedback.id}`,
      title: "Feedback sem resposta",
      detail: `${pendingFeedback.workoutName} • nota ${pendingFeedback.rating}/5`,
      type: "Feedback",
      date: pendingFeedback.createdAt,
      priority: "recent",
      actionLabel: "Responder",
      route: "/student-feedbacks",
      filter: "feedback-pending",
    }, context.preferences));
  }

  if (profile.anamnesis.status === "aguardando_revisao") {
    const latestSubmitted = profile.anamnesis.versions.find((version) => version.submittedAt);
    pendings.push(makePending(profile, {
      id: "anamnesis-review",
      title: "Anamnese aguardando revisao",
      detail: "Revisar respostas antes da proxima avaliacao.",
      type: "Anamnese",
      date: latestSubmitted?.submittedAt,
      priority: "recent",
      actionLabel: "Abrir aluno",
      route: "/profile",
      filter: "anamnesis-pending",
    }, context.preferences));
  }

  const nextAssessmentDays = daysUntil(profile.followUp.nextAssessmentAt);
  if (nextAssessmentDays !== null && nextAssessmentDays < 0) {
    pendings.push(makePending(profile, {
      id: "assessment-expired",
      title: "Avaliacao vencida",
      detail: `Vencida ha ${Math.abs(nextAssessmentDays)} dia(s).`,
      type: "Avaliacao",
      date: profile.followUp.nextAssessmentAt,
      priority: "expired",
      actionLabel: "Agendar",
      route: "/student-assessments",
      filter: "reassessment-pending",
    }, context.preferences));
  } else if (nextAssessmentDays !== null && nextAssessmentDays <= 7) {
    pendings.push(makePending(profile, {
      id: "assessment-soon",
      title: "Reavaliacao proxima",
      detail: `Prevista em ${Math.max(nextAssessmentDays, 0)} dia(s).`,
      type: "Reavaliacao",
      date: profile.followUp.nextAssessmentAt,
      priority: "soon",
      actionLabel: "Ver avaliacoes",
      route: "/student-assessments",
      filter: "reassessment-pending",
    }, context.preferences));
  }

  const workoutDays = daysUntil(profile.followUp.currentWorkoutExpiresAt);
  if (workoutDays !== null && workoutDays <= 15) {
    pendings.push(makePending(profile, {
      id: "workout-expiring",
      title: workoutDays < 0 ? "Treino vencido" : "Treino proximo do vencimento",
      detail: workoutDays < 0 ? `Vencido ha ${Math.abs(workoutDays)} dia(s).` : `Vence em ${workoutDays} dia(s).`,
      type: "Treino",
      date: profile.followUp.currentWorkoutExpiresAt,
      priority: workoutDays < 0 ? "expired" : "soon",
      actionLabel: "Abrir treinos",
      route: "/training",
      filter: "workout-expiring",
    }, context.preferences));
  }

  if (dashboard?.sessions.some((session) => ["rascunho", "bloqueado", "programado"].includes(getSessionEffectiveStatus(session)))) {
    pendings.push(makePending(profile, {
      id: "training-release",
      title: "Treino sem liberacao completa",
      detail: "Existe sessao em rascunho, bloqueada ou programada.",
      type: "Treino",
      priority: "admin",
      actionLabel: "Revisar",
      route: "/training",
      filter: "without-workout",
    }, context.preferences));
  }

  if (!dashboard && !profile.followUp.currentWorkoutName) {
    pendings.push(makePending(profile, {
      id: "without-workout",
      title: "Aluno sem treino ativo",
      detail: "Crie ou libere um plano antes do proximo atendimento.",
      type: "Treino",
      priority: "admin",
      actionLabel: "Criar treino",
      route: "/training",
      filter: "without-workout",
    }, context.preferences));
  }

  const daysWithoutTraining = daysSince(profile.followUp.lastTrainingAt);
  if (daysWithoutTraining !== null && daysWithoutTraining >= 5) {
    pendings.push(makePending(profile, {
      id: "absence",
      title: "Ausencia recorrente",
      detail: `Sem treino registrado ha ${daysWithoutTraining} dia(s).`,
      type: "Frequencia",
      date: profile.followUp.lastTrainingAt,
      priority: "soon",
      actionLabel: "Contatar",
      route: "/profile",
      filter: "absent-recently",
    }, context.preferences));
  }

  const activeInvite = profile.anamnesis.activeInvite;
  if (activeInvite?.status === "active") {
    pendings.push(makePending(profile, {
      id: "invite-active",
      title: "Convite ainda nao utilizado",
      detail: `Ativo ate ${formatShortDate(activeInvite.expiresAt)}.`,
      type: "Convite",
      date: activeInvite.createdAt,
      priority: "admin",
      actionLabel: "Abrir cadastro",
      route: "/profile",
      filter: "anamnesis-pending",
    }, context.preferences));
  }

  const pendingDocument = profile.documents.find((document) => document.status === "pending_review");
  if (pendingDocument) {
    pendings.push(makePending(profile, {
      id: `document-${pendingDocument.id}`,
      title: "Documento aguardando analise",
      detail: pendingDocument.title,
      type: "Documento",
      date: pendingDocument.uploadedAt,
      priority: "admin",
      actionLabel: "Abrir aluno",
      route: "/profile",
    }, context.preferences));
  }

  return pendings;
}

function makePending(
  profile: StudentProfile,
  input: Omit<TrainerHomePending, "id" | "studentId" | "studentName" | "studentAvatar" | "priorityLabel" | "viewed" | "snoozedUntil"> & { id: string },
  preferences: TrainerHomePreferenceState
): TrainerHomePending {
  const id = `${profile.id}:${input.id}`;
  return {
    ...input,
    id,
    studentId: profile.id,
    studentName: profile.registration.fullName,
    studentAvatar: profile.registration.avatar,
    priorityLabel: getPriorityLabel(input.priority),
    viewed: preferences.viewedPendingIds.includes(id),
    snoozedUntil: preferences.snoozedPendingIds[id],
  };
}

function buildStudentSummary(
  profile: StudentProfile,
  pendings: TrainerHomePending[],
  feedbacks: TrainingFeedback[],
  dashboard?: TrainingDashboard
): TrainerHomeStudentSummary {
  const studentPendings = pendings.filter((pending) => pending.studentId === profile.id);
  const adherence = calculateAdherence(profile.frequency);
  const statusLabel = getStatusLabel(profile.status);
  const hasPain = studentPendings.some((pending) => pending.filter === "pain") || profile.executedSets.some((set) => set.pain);
  const hasFeedbackPending = feedbacks.some((feedback) => feedback.studentId === profile.id && isFeedbackPending(feedback));
  const hasAbsentRecently = (daysSince(profile.followUp.lastTrainingAt) ?? 0) >= 5;
  const hasAnamnesisPending = profile.anamnesis.status === "aguardando_revisao";
  const workoutDays = daysUntil(profile.followUp.currentWorkoutExpiresAt);
  const hasWorkoutExpiring = workoutDays !== null && workoutDays <= 15;
  const hasNoWorkout = !dashboard && !profile.followUp.currentWorkoutName;
  const hasReassessmentPending = (daysUntil(profile.followUp.nextAssessmentAt) ?? 999) <= 7;
  const hasDocumentPending = profile.documents.some((document) => document.status === "pending_review");
  const nextAction =
    studentPendings[0]?.title ??
    (hasWorkoutExpiring ? "Revisar vencimento do treino" : hasReassessmentPending ? "Preparar reavaliacao" : "Acompanhamento em dia");

  return {
    id: profile.id,
    name: profile.registration.fullName,
    avatar: profile.registration.avatar,
    email: profile.registration.contact.email,
    phone: profile.registration.contact.phone,
    whatsapp: profile.registration.contact.whatsapp,
    objective: profile.registration.mainGoal,
    status: profile.status,
    statusLabel,
    lastActivityAt: profile.followUp.lastActivityAt,
    lastActivityLabel: formatRelativeFromDate(profile.followUp.lastActivityAt),
    nextSessionAt: profile.followUp.nextSessionAt,
    nextSessionLabel: formatRelativeUntilDate(profile.followUp.nextSessionAt),
    nextAssessmentAt: profile.followUp.nextAssessmentAt,
    nextAssessmentLabel: formatRelativeUntilDate(profile.followUp.nextAssessmentAt),
    currentWorkoutName: profile.followUp.currentWorkoutName || "Sem treino ativo",
    workoutExpirationAt: profile.followUp.currentWorkoutExpiresAt,
    workoutExpirationLabel: formatRelativeUntilDate(profile.followUp.currentWorkoutExpiresAt),
    adherencePercent: adherence,
    pendingCount: studentPendings.length,
    nextAction,
    hasPain,
    hasFeedbackPending,
    hasAbsentRecently,
    hasAnamnesisPending,
    hasWorkoutExpiring,
    hasNoWorkout,
    hasReassessmentPending,
    hasDocumentPending,
    searchText: normalizeSearch([
      profile.registration.fullName,
      profile.registration.contact.email,
      profile.registration.contact.phone,
      profile.registration.contact.whatsapp,
      profile.registration.mainGoal,
      profile.registration.administrativeNotes,
      ...profile.privateTrainerNotes,
    ].filter(Boolean).join(" ")),
    priorityScore: studentPendings.reduce((total, pending) => total + priorityScore(pending.priority), 0) + (100 - adherence),
  };
}

function buildShortcutCatalog(counts: {
  unreadNotifications: number;
  pendingFeedbacks: number;
  pendingAnamnesis: number;
  reassessments: number;
  expiring: number;
  pain: number;
}): TrainerHomeShortcut[] {
  return [
    { id: "agenda", label: "Agenda", detail: "Hoje e proximos horarios", icon: "calendar-outline", badge: counts.reassessments, action: "route", route: "/trainer-agenda" },
    { id: "reassessments", label: "Reavaliacoes", detail: "Vencidas e proximas", icon: "repeat-outline", badge: counts.reassessments, action: "route", route: "/trainer-reassessments" },
    { id: "workout-models", label: "Modelos de treino", detail: "Planos, sessoes e divisoes", icon: "library-outline", action: "route", route: "/trainer-workout-templates" },
    { id: "expirations", label: "Vencimentos", detail: "Treinos, avaliacoes e documentos", icon: "time-outline", badge: counts.expiring, action: "route", route: "/trainer-expirations" },
    { id: "frequency", label: "Frequencia", detail: "Aderencia e ausencias", icon: "pulse-outline", action: "route", route: "/trainer-ranking-frequency" },
    { id: "evolution", label: "Evolucao", detail: "Carga, volume e desempenho", icon: "analytics-outline", badge: counts.pain, action: "route", route: "/trainer-ranking-evolution" },
    { id: "registration", label: "Cadastrar aluno", detail: "Convites e acesso", icon: "person-add-outline", action: "route", route: "/trainer-registration-link" },
    { id: "exercise-library", label: "Biblioteca de exercicios", detail: "Nativos e personalizados", icon: "barbell-outline", action: "route", route: "/exercises" },
    { id: "feedbacks", label: "Feedbacks", detail: "Novos e sem resposta", icon: "chatbubbles-outline", badge: counts.pendingFeedbacks, action: "route", route: "/trainer-feedback-hub" },
    { id: "contacts", label: "Contatos", detail: "WhatsApp e mensagens", icon: "call-outline", action: "route", route: "/trainer-contacts" },
    { id: "anamnesis", label: "Anamneses", detail: "Recebidas e pendentes", icon: "document-text-outline", badge: counts.pendingAnamnesis, action: "route", route: "/trainer-anamnesis" },
    { id: "assessments", label: "Avaliacoes", detail: "Fisicas e funcionais", icon: "clipboard-outline", badge: counts.reassessments, action: "route", route: "/trainer-reassessments" },
  ];
}

function buildFilterCounts(students: TrainerHomeStudentSummary[]) {
  return Object.keys(STUDENT_FILTER_LABELS).reduce((acc, key) => {
    const filter = key as TrainerHomeStudentFilter;
    acc[filter] = students.filter((student) => studentMatchesHomeFilter(student, filter)).length;
    return acc;
  }, {} as Record<TrainerHomeStudentFilter, number>);
}

async function writeTrainerPreferences(trainerId: string, preferences: TrainerHomePreferenceState) {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  let parsed: Record<string, TrainerHomePreferenceState> = {};
  if (stored) {
    try {
      parsed = JSON.parse(stored) as Record<string, TrainerHomePreferenceState>;
    } catch {
      parsed = {};
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, [trainerId]: preferences }));
}

function makeDefaultPreferences(trainerId: string): TrainerHomePreferenceState {
  return {
    trainerId,
    shortcutIds: DEFAULT_HOME_SHORTCUTS,
    todayIndicatorIds: DEFAULT_HOME_TODAY_INDICATORS,
    viewedPendingIds: [],
    snoozedPendingIds: {},
    savedStudentFilter: "all",
    savedSort: "priority",
    updatedAt: new Date().toISOString(),
  };
}

function normalizeShortcutIds(shortcutIds: TrainerHomeShortcutId[] | undefined) {
  const unique = [...new Set(shortcutIds ?? [])];
  return unique.filter((id) => ALL_SHORTCUTS.includes(id));
}

function normalizeTodayIndicatorIds(todayIndicatorIds: TrainerHomeTodayIndicatorId[] | undefined) {
  const unique = [...new Set(todayIndicatorIds ?? [])];
  return unique.filter((id) => ALL_TODAY_INDICATORS.includes(id));
}

function isFeedbackPending(feedback: TrainingFeedback) {
  return feedback.status !== "encerrado" && (feedback.status === "novo" || feedback.status === "visualizado" || feedback.responses.length === 0);
}

function sortPendingByPriority(first: TrainerHomePending, second: TrainerHomePending) {
  const priorityDiff = priorityScore(second.priority) - priorityScore(first.priority);
  if (priorityDiff !== 0) return priorityDiff;
  return dateMs(second.date) - dateMs(first.date);
}

function priorityScore(priority: TrainerHomePendingPriority) {
  if (priority === "critical") return 1000;
  if (priority === "expired") return 800;
  if (priority === "soon") return 600;
  if (priority === "recent") return 400;
  return 200;
}

function getPriorityLabel(priority: TrainerHomePendingPriority) {
  if (priority === "critical") return "Seguranca";
  if (priority === "expired") return "Vencido";
  if (priority === "soon") return "Proximo prazo";
  if (priority === "recent") return "Recente";
  return "Administrativo";
}

function getStatusLabel(status: StudentStatus) {
  const labels: Record<StudentStatus, string> = {
    ativo: "Ativo",
    aguardando_inicio: "Aguardando inicio",
    pausado: "Pausado",
    inativo: "Inativo",
    encerrado: "Encerrado",
  };
  return labels[status];
}

function isSnoozedActive(pending: TrainerHomePending) {
  if (!pending.snoozedUntil) return false;
  return new Date(pending.snoozedUntil).getTime() > Date.now();
}

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function getWeekdayName(date: Date) {
  return ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"][date.getDay()];
}

function dateMs(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatRelativeFromDate(value?: string) {
  const days = daysSince(value);
  if (days === null) return "Sem registro";
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return `${days} dias atras`;
}

function formatRelativeUntilDate(value?: string) {
  const days = daysUntil(value);
  if (days === null) return "Sem data";
  if (days < 0) return `${Math.abs(days)} dias vencido`;
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanha";
  return `Em ${days} dias`;
}

function formatShortDate(value?: string) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
