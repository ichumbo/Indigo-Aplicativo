import AsyncStorage from "@react-native-async-storage/async-storage";

export type FeedbackStatus =
  | "novo"
  | "visualizado"
  | "respondido"
  | "encerrado";
export type FeedbackIntensity =
  | "Muito leve"
  | "Leve"
  | "Adequado"
  | "Intenso"
  | "Muito intenso";
export type NotificationAudience = "student" | "trainer";
export type NotificationType =
  | "feedback-received"
  | "feedback-response"
  | "workout"
  | "achievement"
  | "reminder"
  | "update";

export type WorkoutExercise = {
  id: string;
  name: string;
  prescription: string;
  notes?: string;
};

export type FeedbackResponse = {
  id: string;
  feedbackId: string;
  authorId: string;
  authorName: string;
  authorRole: NotificationAudience;
  message: string;
  createdAt: string;
};

export type TrainingFeedback = {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  trainerId: string;
  trainerName: string;
  workoutId: string;
  workoutName: string;
  planId?: string;
  planName?: string;
  executionId: string;
  startedAt: string;
  finishedAt: string;
  durationMinutes: number;
  exercises: WorkoutExercise[];
  rating: number;
  comment?: string;
  intensity: FeedbackIntensity;
  hasPain: boolean;
  painRegion?: string;
  painLevel?: number;
  status: FeedbackStatus;
  viewedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  responses: FeedbackResponse[];
};

export type AppNotification = {
  id: string;
  userId: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  feedbackId?: string;
  highlightPain?: boolean;
  dedupeKey?: string;
};

type FeedbackStoreState = {
  feedbacks: TrainingFeedback[];
  notifications: AppNotification[];
  skippedFeedbackExecutionIds: string[];
};

export type FeedbackFilters = {
  query?: string;
  period?: "all" | "today" | "7d" | "30d";
  rating?: number | "all";
  status?: FeedbackStatus | "all";
  painOnly?: boolean;
  unansweredOnly?: boolean;
  sort?: "newest" | "oldest";
};

export type SubmitFeedbackInput = {
  rating: number;
  comment?: string;
  intensity: FeedbackIntensity;
  hasPain: boolean;
  painRegion?: string;
  painLevel?: number;
};

export type SubmitFeedbackContext = {
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  trainerId: string;
  trainerName: string;
  workoutId: string;
  workoutName: string;
  planId?: string;
  planName?: string;
  executionId: string;
  startedAt: string;
  exercises: WorkoutExercise[];
};

export const DEMO_STUDENT = {
  id: "student-joao",
  name: "Joao Silva",
  avatar: "https://i.pravatar.cc/150?img=12",
};

export const DEMO_TRAINER = {
  id: "trainer-main",
  name: "Personal Indigo",
};

export const CURRENT_WORKOUT = {
  id: "workout-elite-session-a",
  name: "ELITE -  Program",
  planId: "plan-elite",
  planName: "Elite Program",
  executionId: "execution-elite-session-a-2025-09-24",
  startedAt: new Date(Date.now() - 68 * 60 * 1000).toISOString(),
  exercises: [
    {
      id: "deadlift",
      name: "Deadlift",
      prescription: "3 sets x 5 reps",
      notes: "Foque na tecnica. Descanso: 3-4 min entre series",
    },
    {
      id: "back-squat",
      name: "Back Squat",
      prescription: "4 sets x 6 reps",
      notes: "Profundidade completa. Descanso: 2-3 min",
    },
    {
      id: "double-under",
      name: "Double Under Crossover",
      prescription: "3 rounds x 30 reps",
      notes: "Mantenha ritmo constante. Descanso: 1 min",
    },
    {
      id: "hip-flexor",
      name: "Hip Flexor Stretch",
      prescription: "2 sets x 30s cada lado",
      notes: "Alongamento final. Respiracao profunda",
    },
  ],
};

const STORAGE_KEY = "@indigo/feedback-store/v1";

const initialNotifications: AppNotification[] = [
  {
    id: "notification-workout-ready",
    userId: DEMO_STUDENT.id,
    audience: "student",
    type: "workout",
    title: "Novo treino disponivel",
    message: "Seu treino Elite para hoje esta pronto!",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: "notification-goal",
    userId: DEMO_STUDENT.id,
    audience: "student",
    type: "achievement",
    title: "Meta atingida",
    message: "Parabens! Voce completou 75% dos treinos desta semana.",
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: "notification-reminder",
    userId: DEMO_STUDENT.id,
    audience: "student",
    type: "reminder",
    title: "Lembrete de treino",
    message: "Nao esqueca do seu treino de Endurance as 18h.",
    read: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

const defaultState: FeedbackStoreState = {
  feedbacks: [],
  notifications: initialNotifications,
  skippedFeedbackExecutionIds: [],
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readState(): Promise<FeedbackStoreState> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<FeedbackStoreState>;
    return {
      feedbacks: parsed.feedbacks ?? [],
      notifications: parsed.notifications ?? initialNotifications,
      skippedFeedbackExecutionIds: parsed.skippedFeedbackExecutionIds ?? [],
    };
  } catch {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
}

async function writeState(nextState: FeedbackStoreState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function sortByDate<T extends { createdAt: string }>(
  items: T[],
  direction: "newest" | "oldest" = "newest",
) {
  return [...items].sort((a, b) => {
    const diff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return direction === "newest" ? -diff : diff;
  });
}

function isInsidePeriod(dateValue: string, period: FeedbackFilters["period"]) {
  if (!period || period === "all") return true;

  const date = new Date(dateValue).getTime();
  const now = Date.now();

  if (period === "today") {
    return new Date(dateValue).toDateString() === new Date().toDateString();
  }

  const days = period === "7d" ? 7 : 30;
  return now - date <= days * 24 * 60 * 60 * 1000;
}

function hasPermissionForFeedback(
  feedback: TrainingFeedback,
  userId: string,
  role: NotificationAudience,
) {
  if (role === "student") return feedback.studentId === userId;
  return feedback.trainerId === userId;
}

export function getFeedbackStatusLabel(status: FeedbackStatus) {
  const labels: Record<FeedbackStatus, string> = {
    novo: "Novo",
    visualizado: "Visualizado",
    respondido: "Respondido",
    encerrado: "Encerrado",
  };
  return labels[status];
}

export function formatFeedbackDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) return `${minutes} min atras`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atras`;

  const days = Math.floor(hours / 24);
  return `${days} d atras`;
}

export async function getUnreadNotificationCount(userId: string) {
  const state = await readState();
  return state.notifications.filter(
    (notification) => notification.userId === userId && !notification.read,
  ).length;
}

export async function getUnreadFeedbackCount(trainerId = DEMO_TRAINER.id) {
  const state = await readState();
  return state.feedbacks.filter(
    (feedback) =>
      feedback.trainerId === trainerId && feedback.status === "novo",
  ).length;
}

export async function listNotificationsForUser(userId: string) {
  const state = await readState();
  return sortByDate(
    state.notifications.filter(
      (notification) => notification.userId === userId,
    ),
  );
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
) {
  const state = await readState();
  const notifications = state.notifications.map((notification) => {
    if (notification.id !== notificationId || notification.userId !== userId)
      return notification;
    return { ...notification, read: true };
  });

  await writeState({ ...state, notifications });
}

export async function markAllNotificationsRead(userId: string) {
  const state = await readState();
  const notifications = state.notifications.map((notification) => {
    if (notification.userId !== userId) return notification;
    return { ...notification, read: true };
  });

  await writeState({ ...state, notifications });
}

export async function createWorkoutNotification(input: {
  userId: string;
  audience: NotificationAudience;
  title: string;
  message: string;
  type?: NotificationType;
  dedupeKey?: string;
  highlightPain?: boolean;
  feedbackId?: string;
}) {
  const state = await readState();

  if (
    input.dedupeKey &&
    state.notifications.some(
      (notification) => notification.dedupeKey === input.dedupeKey,
    )
  ) {
    return undefined;
  }

  const notification: AppNotification = {
    id: createId("notification"),
    userId: input.userId,
    audience: input.audience,
    type: input.type ?? "workout",
    title: input.title,
    message: input.message,
    read: false,
    createdAt: new Date().toISOString(),
    dedupeKey: input.dedupeKey,
    highlightPain: input.highlightPain,
    feedbackId: input.feedbackId,
  };

  await writeState({
    ...state,
    notifications: [notification, ...state.notifications],
  });

  return notification;
}

export async function hasFeedbackForExecution(
  executionId = CURRENT_WORKOUT.executionId,
) {
  const state = await readState();
  return state.feedbacks.some(
    (feedback) => feedback.executionId === executionId,
  );
}

export async function submitWorkoutFeedback(
  input: SubmitFeedbackInput,
  context?: SubmitFeedbackContext,
) {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Avalie o treino de 1 a 5 estrelas.");
  }

  if (!input.intensity) {
    throw new Error("Informe como voce sentiu a intensidade do treino.");
  }

  if (input.hasPain && !input.painRegion?.trim()) {
    throw new Error("Informe a regiao do desconforto.");
  }

  if (input.hasPain && typeof input.painLevel !== "number") {
    throw new Error("Informe o nivel da dor.");
  }

  const state = await readState();
  const workout = context ?? {
    studentId: DEMO_STUDENT.id,
    studentName: DEMO_STUDENT.name,
    studentAvatar: DEMO_STUDENT.avatar,
    trainerId: DEMO_TRAINER.id,
    trainerName: DEMO_TRAINER.name,
    workoutId: CURRENT_WORKOUT.id,
    workoutName: CURRENT_WORKOUT.name,
    planId: CURRENT_WORKOUT.planId,
    planName: CURRENT_WORKOUT.planName,
    executionId: CURRENT_WORKOUT.executionId,
    startedAt: CURRENT_WORKOUT.startedAt,
    exercises: CURRENT_WORKOUT.exercises,
  };
  const duplicate = state.feedbacks.some(
    (feedback) => feedback.executionId === workout.executionId,
  );

  if (duplicate) {
    throw new Error("Este treino ja possui feedback enviado.");
  }

  const now = new Date().toISOString();
  const startedAt = workout.startedAt;
  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(now).getTime() - new Date(startedAt).getTime()) / 60000,
    ),
  );

  const feedback: TrainingFeedback = {
    id: createId("feedback"),
    studentId: workout.studentId,
    studentName: workout.studentName,
    studentAvatar: workout.studentAvatar,
    trainerId: workout.trainerId,
    trainerName: workout.trainerName,
    workoutId: workout.workoutId,
    workoutName: workout.workoutName,
    planId: workout.planId,
    planName: workout.planName,
    executionId: workout.executionId,
    startedAt,
    finishedAt: now,
    durationMinutes,
    exercises: workout.exercises,
    rating: input.rating,
    comment: input.comment?.trim() || undefined,
    intensity: input.intensity,
    hasPain: input.hasPain,
    painRegion: input.hasPain ? input.painRegion?.trim() : undefined,
    painLevel: input.hasPain ? input.painLevel : undefined,
    status: "novo",
    createdAt: now,
    updatedAt: now,
    responses: [],
  };

  const notification: AppNotification = {
    id: createId("notification"),
    userId: workout.trainerId,
    audience: "trainer",
    type: "feedback-received",
    title: input.hasPain
      ? "Feedback com alerta de dor"
      : "Novo feedback recebido",
    message: `${workout.studentName} concluiu ${workout.workoutName} com ${input.rating}/5 estrelas.`,
    read: false,
    createdAt: now,
    feedbackId: feedback.id,
    highlightPain: input.hasPain,
    dedupeKey: `feedback-received:${feedback.executionId}`,
  };

  await writeState({
    ...state,
    feedbacks: [feedback, ...state.feedbacks],
    notifications: [notification, ...state.notifications],
  });

  return feedback;
}

export async function skipWorkoutFeedback(
  executionId = CURRENT_WORKOUT.executionId,
) {
  const state = await readState();

  if (state.skippedFeedbackExecutionIds.includes(executionId)) return;

  await writeState({
    ...state,
    skippedFeedbackExecutionIds: [
      executionId,
      ...state.skippedFeedbackExecutionIds,
    ],
  });
}

export async function listFeedbacksForTrainer(
  trainerId = DEMO_TRAINER.id,
  filters: FeedbackFilters = {},
) {
  const state = await readState();
  const query = filters.query?.trim().toLowerCase();

  const filtered = state.feedbacks.filter((feedback) => {
    if (feedback.trainerId !== trainerId) return false;
    if (query && !feedback.studentName.toLowerCase().includes(query))
      return false;
    if (!isInsidePeriod(feedback.createdAt, filters.period)) return false;
    if (
      filters.rating !== undefined &&
      filters.rating !== "all" &&
      feedback.rating !== filters.rating
    )
      return false;
    if (
      filters.status &&
      filters.status !== "all" &&
      feedback.status !== filters.status
    )
      return false;
    if (filters.painOnly && !feedback.hasPain) return false;
    if (filters.unansweredOnly && feedback.responses.length > 0) return false;
    return true;
  });

  const direction = filters.sort ?? "newest";
  return sortByDate(filtered, direction).sort((a, b) => {
    if (a.status === "novo" && b.status !== "novo") return -1;
    if (a.status !== "novo" && b.status === "novo") return 1;
    return 0;
  });
}

export async function listFeedbacksForStudent(studentId = DEMO_STUDENT.id) {
  const state = await readState();
  return sortByDate(
    state.feedbacks.filter((feedback) => feedback.studentId === studentId),
  );
}

export async function getFeedbackById(
  feedbackId: string,
  userId: string,
  role: NotificationAudience,
) {
  const state = await readState();
  const feedback = state.feedbacks.find((item) => item.id === feedbackId);

  if (!feedback || !hasPermissionForFeedback(feedback, userId, role)) {
    throw new Error("Voce nao tem permissao para acessar este feedback.");
  }

  return feedback;
}

export async function markFeedbackViewed(
  feedbackId: string,
  trainerId = DEMO_TRAINER.id,
) {
  const state = await readState();
  let canWrite = false;
  const now = new Date().toISOString();

  const feedbacks = state.feedbacks.map((feedback) => {
    if (feedback.id !== feedbackId || feedback.trainerId !== trainerId)
      return feedback;

    canWrite = true;
    if (feedback.status !== "novo") return feedback;

    return {
      ...feedback,
      status: "visualizado" as FeedbackStatus,
      viewedAt: now,
      updatedAt: now,
    };
  });

  const notifications = state.notifications.map((notification) => {
    if (
      notification.userId !== trainerId ||
      notification.feedbackId !== feedbackId
    )
      return notification;
    return { ...notification, read: true };
  });

  if (!canWrite) {
    throw new Error("Voce nao tem permissao para visualizar este feedback.");
  }

  await writeState({ ...state, feedbacks, notifications });
}

export async function addTrainerResponse(
  feedbackId: string,
  message: string,
  trainerId = DEMO_TRAINER.id,
) {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    throw new Error("Escreva uma orientacao antes de enviar.");
  }

  const state = await readState();
  const now = new Date().toISOString();
  let targetFeedback: TrainingFeedback | undefined;

  const response: FeedbackResponse = {
    id: createId("response"),
    feedbackId,
    authorId: trainerId,
    authorName: DEMO_TRAINER.name,
    authorRole: "trainer",
    message: cleanMessage,
    createdAt: now,
  };

  const feedbacks = state.feedbacks.map((feedback) => {
    if (feedback.id !== feedbackId || feedback.trainerId !== trainerId)
      return feedback;

    targetFeedback = feedback;
    return {
      ...feedback,
      status: "respondido" as FeedbackStatus,
      responses: [...feedback.responses, response],
      updatedAt: now,
      viewedAt: feedback.viewedAt ?? now,
    };
  });

  if (!targetFeedback) {
    throw new Error("Voce nao tem permissao para responder este feedback.");
  }

  const notification: AppNotification = {
    id: createId("notification"),
    userId: targetFeedback.studentId,
    audience: "student",
    type: "feedback-response",
    title: "Seu personal respondeu",
    message: `${DEMO_TRAINER.name} respondeu o feedback de ${targetFeedback.workoutName}.`,
    read: false,
    createdAt: now,
    feedbackId,
  };

  await writeState({
    ...state,
    feedbacks,
    notifications: [notification, ...state.notifications],
  });

  return response;
}

export async function updateFeedbackStatus(
  feedbackId: string,
  nextStatus: Extract<
    FeedbackStatus,
    "encerrado" | "visualizado" | "respondido"
  >,
  trainerId = DEMO_TRAINER.id,
) {
  const state = await readState();
  const now = new Date().toISOString();
  let canWrite = false;

  const feedbacks = state.feedbacks.map((feedback) => {
    if (feedback.id !== feedbackId || feedback.trainerId !== trainerId)
      return feedback;

    canWrite = true;
    const resolvedStatus =
      nextStatus === "visualizado" && feedback.responses.length > 0
        ? "respondido"
        : nextStatus;

    return {
      ...feedback,
      status: resolvedStatus,
      viewedAt: feedback.viewedAt ?? now,
      closedAt: resolvedStatus === "encerrado" ? now : undefined,
      updatedAt: now,
    };
  });

  if (!canWrite) {
    throw new Error("Voce nao tem permissao para alterar este feedback.");
  }

  await writeState({ ...state, feedbacks });
}

export async function resetFeedbackStoreForTests() {
  await writeState(defaultState);
}
