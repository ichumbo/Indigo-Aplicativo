import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  PerformancePeriodPreset,
  buildExercisePerformanceDashboard as buildExercisePerformanceAnalytics,
  getExercisePerformanceSummaryByKey,
} from "@/services/exercise-performance";
import { getAuthUserById } from "@/services/auth-store";
import {
  DEMO_STUDENT,
  DEMO_TRAINER,
  SubmitFeedbackContext,
  WorkoutExercise,
  createWorkoutNotification,
} from "@/services/feedback-store";

export type TrainingRole = "student" | "trainer" | "admin";
export type TrainingPlanStatus =
  | "rascunho"
  | "ativo"
  | "pausado"
  | "vencido"
  | "substituido"
  | "arquivado";
export type TrainingSessionStatus =
  | "rascunho"
  | "programado"
  | "liberado"
  | "bloqueado"
  | "pausado"
  | "vencido"
  | "substituido"
  | "arquivado";
export type TrainingSessionVersionStatus =
  | "draft"
  | "published"
  | "scheduled"
  | "archived";
export type TrainingExerciseType =
  | "warmup"
  | "main"
  | "accessory"
  | "mobility"
  | "aerobic"
  | "cooldown";
export type TrainingLevel =
  | "iniciante"
  | "intermediario"
  | "avancado"
  | "misto";
export type TrainingExecutionStatus =
  | "in_progress"
  | "completed"
  | "interrupted";
export type TrainingLoadUnit = "kg" | "lb" | "level" | "bodyweight" | "none";
export type TrainingExecutedSetType =
  | "warmup"
  | "approach"
  | "working"
  | "drop"
  | "invalid"
  | "partial"
  | "assisted"
  | "interrupted";

export type TrainingAuditEvent = {
  id: string;
  action: string;
  actorId: string;
  actorRole: TrainingRole;
  createdAt: string;
  details: string;
};

export type TrainingExercisePrescription = {
  id: string;
  exerciseCatalogId?: string;
  name: string;
  type: TrainingExerciseType;
  muscleGroup: string;
  order: number;
  plannedSets: number;
  plannedReps?: number;
  plannedRepsMin?: number;
  plannedRepsMax?: number;
  plannedLoad?: number;
  loadUnit: TrainingLoadUnit;
  durationSeconds?: number;
  distanceMeters?: number;
  restSeconds?: number;
  tempo?: string;
  side?: "left" | "right" | "bilateral";
  observation?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  unilateral: boolean;
  warmupSet: boolean;
  validSet: boolean;
  alternativeExerciseName?: string;
  safetyNotes?: string;
  equipment?: {
    id: string;
    name: string;
    type: "free_weight" | "machine" | "bodyweight" | "cardio" | "other";
    manufacturer?: string;
    model?: string;
  };
};

export type TrainingSessionVersion = {
  id: string;
  sessionId: string;
  version: number;
  status: TrainingSessionVersionStatus;
  createdFromVersionId?: string;
  name: string;
  identifier?: string;
  objective: string;
  description?: string;
  muscleGroups: string[];
  level: TrainingLevel;
  estimatedDurationMinutes: number;
  validFrom: string;
  validUntil: string;
  recommendedDays: string[];
  order: number;
  instructions?: string;
  releaseAt?: string;
  showWhenLocked: boolean;
  requiresSupervision: boolean;
  privateTrainerNotes?: string;
  exercises: TrainingExercisePrescription[];
  createdAt: string;
  publishedAt?: string;
  publishedBy?: string;
};

export type TrainingSessionRelease = {
  visibleToStudent: boolean;
  releaseAt?: string;
  blockedReason?: string;
  allowExecutionAfterExpiration: boolean;
  expirationToleranceDays: number;
  notifyOnRelevantUpdates: boolean;
  progressiveRelease: boolean;
};

export type TrainingStatusHistory = {
  id: string;
  from: TrainingSessionStatus;
  to: TrainingSessionStatus;
  reason?: string;
  actorId: string;
  actorRole: TrainingRole;
  createdAt: string;
};

export type TrainingSession = {
  id: string;
  planId: string;
  studentId: string;
  trainerId: string;
  status: TrainingSessionStatus;
  activeVersionId?: string;
  versions: TrainingSessionVersion[];
  release: TrainingSessionRelease;
  replacedBySessionId?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: TrainingStatusHistory[];
  audit: TrainingAuditEvent[];
};

export type WeeklyScheduleItem = {
  day: string;
  sessionId: string;
  optional?: boolean;
};

export type TrainingPlan = {
  id: string;
  studentId: string;
  trainerId: string;
  name: string;
  objective: string;
  status: TrainingPlanStatus;
  version: number;
  startAt: string;
  validUntil: string;
  frequencyPerWeek: number;
  sessionIds: string[];
  weeklySchedule: WeeklyScheduleItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  audit: TrainingAuditEvent[];
};

export type TrainingExecutedSet = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  plannedSetIndex: number;
  setType?: TrainingExecutedSetType;
  plannedLoad?: number;
  executedLoad?: number;
  loadUnit: TrainingLoadUnit;
  plannedReps?: number;
  executedReps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  speedKmh?: number;
  powerWatts?: number;
  equipmentLevel?: number;
  cadence?: string;
  side?: "left" | "right" | "bilateral";
  plannedRestSeconds?: number;
  actualRestSeconds?: number;
  effort?: number;
  completed: boolean;
  warmup: boolean;
  validForProgression: boolean;
  pain?: {
    region: string;
    level: number;
    side?: "left" | "right" | "bilateral";
    moment?: string;
    interrupted?: boolean;
    note?: string;
  };
  note?: string;
  studentNote?: string;
  trainerNote?: string;
  privateTrainerNote?: string;
  importantNote?: boolean;
  invalidReason?: string;
  assisted?: boolean;
  partial?: boolean;
  interrupted?: boolean;
  correctionAudit?: TrainingSetCorrectionAudit[];
  recordedAt: string;
};

export type TrainingSetCorrectionAudit = {
  id: string;
  actorId: string;
  actorRole: TrainingRole;
  reason: string;
  createdAt: string;
  previousValues: Partial<TrainingExecutedSet>;
  nextValues: Partial<TrainingExecutedSet>;
};

export type TrainingExecution = {
  id: string;
  planId: string;
  sessionId: string;
  sessionVersionId: string;
  studentId: string;
  trainerId: string;
  status: TrainingExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  durationMinutes?: number;
  snapshot: TrainingSessionVersion;
  sets: TrainingExecutedSet[];
  skippedExerciseIds: string[];
  pausedPeriods: { startedAt: string; endedAt?: string }[];
  feedbackId?: string;
  createdAt: string;
  updatedAt: string;
};

type TrainingPlanStoreState = {
  plans: Record<string, TrainingPlan>;
  sessions: Record<string, TrainingSession>;
  executions: Record<string, TrainingExecution>;
  migratedStaticWorkoutAt?: string;
};

export type TrainingSessionInput = {
  planId: string;
  name: string;
  identifier?: string;
  objective: string;
  description?: string;
  muscleGroups: string[];
  level: TrainingLevel;
  estimatedDurationMinutes: number;
  validFrom?: string;
  validUntil?: string;
  recommendedDays: string[];
  order?: number;
  instructions?: string;
  releaseAt?: string;
  showWhenLocked?: boolean;
  requiresSupervision?: boolean;
  privateTrainerNotes?: string;
  exercises?: TrainingExercisePrescription[];
  publishMode?: "draft" | "now" | "scheduled";
};

export type TrainingSetInput = {
  exerciseId: string;
  exerciseName: string;
  plannedSetIndex: number;
  setType?: TrainingExecutedSetType;
  plannedLoad?: number;
  executedLoad?: number;
  loadUnit: TrainingLoadUnit;
  plannedReps?: number;
  executedReps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  speedKmh?: number;
  powerWatts?: number;
  equipmentLevel?: number;
  cadence?: string;
  side?: "left" | "right" | "bilateral";
  plannedRestSeconds?: number;
  actualRestSeconds?: number;
  effort?: number;
  completed: boolean;
  warmup: boolean;
  validForProgression: boolean;
  pain?: {
    region: string;
    level: number;
    side?: "left" | "right" | "bilateral";
    moment?: string;
    interrupted?: boolean;
    note?: string;
  };
  note?: string;
  studentNote?: string;
  trainerNote?: string;
  privateTrainerNote?: string;
  importantNote?: boolean;
  invalidReason?: string;
  assisted?: boolean;
  partial?: boolean;
  interrupted?: boolean;
};

export type TrainingDashboard = {
  plan: TrainingPlan;
  sessions: TrainingSession[];
  executions: TrainingExecution[];
  progressPercent: number;
  lastExecution?: TrainingExecution;
  nextSuggestedSession?: TrainingSession;
  alerts: TrainingDashboardAlert[];
  trainer?: {
    id: string;
    name: string;
    avatar: string;
    professionalId?: string;
  };
};

export type TrainingDashboardAlert = {
  id: string;
  title: string;
  detail: string;
  tone: "info" | "warning" | "danger";
  sessionId?: string;
};

export type TrainingLoadSummary = {
  id: string;
  exerciseName: string;
  sessionName: string;
  equipmentName?: string;
  compatibleRecords: number;
  bestLoad?: number;
  bestVolume?: number;
  lastLoad?: number;
  lastVolume?: number;
  hasPainAlert: boolean;
  trendLabel: string;
};

export const TRAINING_SESSION_STATUS_OPTIONS: {
  value: TrainingSessionStatus;
  label: string;
}[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "programado", label: "Programado" },
  { value: "liberado", label: "Liberado" },
  { value: "bloqueado", label: "Bloqueado" },
  { value: "pausado", label: "Pausado" },
  { value: "vencido", label: "Vencido" },
  { value: "substituido", label: "Substituido" },
  { value: "arquivado", label: "Arquivado" },
];

const STORAGE_KEY = "@indigo/training-plan-store/v1";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function dateDaysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function makeAudit(
  action: string,
  actorId: string,
  actorRole: TrainingRole,
  details: string,
): TrainingAuditEvent {
  return {
    id: createId("audit"),
    action,
    actorId,
    actorRole,
    createdAt: new Date().toISOString(),
    details,
  };
}

function cloneSessionVersion(
  version: TrainingSessionVersion,
  patch: Partial<TrainingSessionVersion> = {},
) {
  return {
    ...version,
    ...patch,
    exercises: version.exercises.map((exercise) => ({
      ...exercise,
      equipment: exercise.equipment ? { ...exercise.equipment } : undefined,
    })),
    muscleGroups: [...version.muscleGroups],
    recommendedDays: [...version.recommendedDays],
  };
}

function createExercise(
  input: Partial<TrainingExercisePrescription> &
    Pick<
      TrainingExercisePrescription,
      "name" | "type" | "muscleGroup" | "order"
    >,
): TrainingExercisePrescription {
  return {
    id: input.id ?? createId("exercise"),
    exerciseCatalogId: input.exerciseCatalogId,
    name: input.name,
    type: input.type,
    muscleGroup: input.muscleGroup,
    order: input.order,
    plannedSets: input.plannedSets ?? 3,
    plannedReps: input.plannedReps,
    plannedRepsMin: input.plannedRepsMin,
    plannedRepsMax: input.plannedRepsMax,
    plannedLoad: input.plannedLoad,
    loadUnit: input.loadUnit ?? "kg",
    durationSeconds: input.durationSeconds,
    distanceMeters: input.distanceMeters,
    restSeconds: input.restSeconds ?? 90,
    tempo: input.tempo,
    side: input.side ?? "bilateral",
    observation: input.observation,
    videoUrl: input.videoUrl,
    thumbnailUrl: input.thumbnailUrl,
    unilateral: input.unilateral ?? false,
    warmupSet: input.warmupSet ?? input.type === "warmup",
    validSet:
      input.validSet ?? (input.type !== "warmup" && input.type !== "cooldown"),
    alternativeExerciseName: input.alternativeExerciseName,
    safetyNotes: input.safetyNotes,
    equipment: input.equipment,
  };
}

function buildDefaultState(): TrainingPlanStoreState {
  const now = new Date().toISOString();
  const planId = "plan-elite";
  const sessionAId = "session-elite-a";
  const sessionBId = "session-elite-b";
  const sessionMobilityId = "session-mobility";
  const sessionCId = "session-elite-c";

  const plan: TrainingPlan = {
    id: planId,
    studentId: DEMO_STUDENT.id,
    trainerId: DEMO_TRAINER.id,
    name: "ELITE -  Program",
    objective: "Forca, hipertrofia e condicionamento com progresso controlado.",
    status: "ativo",
    version: 1,
    startAt: dateDaysFromNow(-18),
    validUntil: dateDaysFromNow(72),
    frequencyPerWeek: 4,
    sessionIds: [sessionAId, sessionBId, sessionCId, sessionMobilityId],
    weeklySchedule: [
      { day: "Segunda", sessionId: sessionAId },
      { day: "Terca", sessionId: sessionBId },
      { day: "Quinta", sessionId: sessionCId },
      { day: "Sabado", sessionId: sessionMobilityId, optional: true },
    ],
    notes:
      "Plano migrado da estrutura estatica anterior para sessoes versionadas.",
    createdAt: now,
    updatedAt: now,
    audit: [
      makeAudit(
        "migrated_static_workout",
        DEMO_TRAINER.id,
        "trainer",
        "Treino estatico existente preservado como sessao A.",
      ),
    ],
  };

  const sessionA = createSessionFromVersion({
    id: sessionAId,
    planId,
    studentId: DEMO_STUDENT.id,
    trainerId: DEMO_TRAINER.id,
    status: "liberado",
    release: {
      visibleToStudent: true,
      allowExecutionAfterExpiration: false,
      expirationToleranceDays: 3,
      notifyOnRelevantUpdates: true,
      progressiveRelease: false,
    },
    version: {
      sessionId: sessionAId,
      id: "version-session-a-1",
      version: 1,
      status: "published",
      name: "Peito, posteriores e condicionamento",
      identifier: "Treino A",
      objective:
        "Sessao de forca com movimentos globais e finalizacao de mobilidade.",
      description: "Preserva o conteudo do treino atual do app.",
      muscleGroups: ["Posterior", "Pernas", "Core", "Condicionamento"],
      level: "intermediario",
      estimatedDurationMinutes: 68,
      validFrom: dateDaysFromNow(-18),
      validUntil: dateDaysFromNow(72),
      recommendedDays: ["Segunda", "Quinta"],
      order: 1,
      instructions:
        "Priorize tecnica e registre carga executada em cada serie valida.",
      showWhenLocked: false,
      requiresSupervision: false,
      exercises: [
        createExercise({
          id: "deadlift",
          name: "Deadlift",
          type: "main",
          muscleGroup: "Posterior",
          order: 1,
          plannedSets: 3,
          plannedReps: 5,
          plannedLoad: 80,
          loadUnit: "kg",
          restSeconds: 210,
          observation: "Foque na tecnica. Descanso: 3-4 min entre series.",
          videoUrl: "https://www.youtube.com/watch?v=r4MzxtBKyNE",
          thumbnailUrl: "https://img.youtube.com/vi/r4MzxtBKyNE/hqdefault.jpg",
          equipment: {
            id: "barbell-20kg",
            name: "Barra livre 20 kg",
            type: "free_weight",
          },
        }),
        createExercise({
          id: "back-squat",
          name: "Back Squat",
          type: "main",
          muscleGroup: "Pernas",
          order: 2,
          plannedSets: 4,
          plannedReps: 6,
          plannedLoad: 85,
          loadUnit: "kg",
          restSeconds: 150,
          observation: "Profundidade completa. Descanso: 2-3 min.",
          safetyNotes: "Interromper em caso de dor lombar ou perda de tecnica.",
          thumbnailUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg",
          equipment: {
            id: "rack-free-bar-olympic",
            name: "Rack livre - barra olimpica",
            type: "free_weight",
          },
        }),
        createExercise({
          id: "double-under",
          name: "Double Under Crossover",
          type: "aerobic",
          muscleGroup: "Condicionamento",
          order: 3,
          plannedSets: 3,
          plannedReps: 30,
          loadUnit: "none",
          restSeconds: 60,
          observation: "Mantenha ritmo constante. Descanso: 1 min.",
          thumbnailUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Fast_Skipping/0.jpg",
        }),
        createExercise({
          id: "hip-flexor",
          name: "Hip Flexor Stretch",
          type: "cooldown",
          muscleGroup: "Mobilidade",
          order: 4,
          plannedSets: 2,
          durationSeconds: 30,
          loadUnit: "none",
          side: "bilateral",
          validSet: false,
          observation: "Alongamento final. Respiracao profunda.",
          thumbnailUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Hip_Flexor/0.jpg",
        }),
      ],
      createdAt: now,
      publishedAt: now,
      publishedBy: DEMO_TRAINER.id,
    },
  });

  const sessionB = createSessionFromVersion({
    id: sessionBId,
    planId,
    studentId: DEMO_STUDENT.id,
    trainerId: DEMO_TRAINER.id,
    status: "liberado",
    release: {
      visibleToStudent: true,
      allowExecutionAfterExpiration: false,
      expirationToleranceDays: 3,
      notifyOnRelevantUpdates: true,
      progressiveRelease: false,
    },
    version: {
      sessionId: sessionBId,
      id: "version-session-b-1",
      version: 1,
      status: "published",
      name: "Costas, biceps e lombar",
      identifier: "Treino B",
      objective: "Puxadas, remadas e estabilidade lombar.",
      description: "Sessao complementar para equilibrio de grupos musculares.",
      muscleGroups: ["Costas", "Biceps", "Lombar"],
      level: "intermediario",
      estimatedDurationMinutes: 58,
      validFrom: dateDaysFromNow(-18),
      validUntil: dateDaysFromNow(72),
      recommendedDays: ["Terca"],
      order: 2,
      instructions: "Evite compensacoes lombares nas remadas.",
      showWhenLocked: false,
      requiresSupervision: false,
      exercises: [
        createExercise({
          id: "pull-down",
          name: "Puxada frontal",
          type: "main",
          muscleGroup: "Costas",
          order: 1,
          plannedSets: 4,
          plannedRepsMin: 8,
          plannedRepsMax: 10,
          plannedLoad: 45,
          loadUnit: "kg",
          restSeconds: 90,
          thumbnailUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg",
          equipment: {
            id: "lat-pulldown-cable",
            name: "Puxador alto",
            type: "machine",
          },
        }),
        createExercise({
          id: "machine-row",
          name: "Remada maquina",
          type: "main",
          muscleGroup: "Costas",
          order: 2,
          plannedSets: 3,
          plannedReps: 10,
          plannedLoad: 8,
          loadUnit: "level",
          restSeconds: 90,
          observation: "Registrar como nivel do equipamento, nao kg.",
          thumbnailUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
          equipment: {
            id: "row-machine-levels",
            name: "Remada maquina - nivel",
            type: "machine",
            manufacturer: "LifeFitness",
            model: "RS-01",
          },
        }),
      ],
      createdAt: now,
      publishedAt: now,
      publishedBy: DEMO_TRAINER.id,
    },
  });

  const sessionC = createSessionFromVersion({
    id: sessionCId,
    planId,
    studentId: DEMO_STUDENT.id,
    trainerId: DEMO_TRAINER.id,
    status: "programado",
    release: {
      visibleToStudent: true,
      releaseAt: dateDaysFromNow(5),
      allowExecutionAfterExpiration: false,
      expirationToleranceDays: 3,
      notifyOnRelevantUpdates: true,
      progressiveRelease: true,
    },
    version: {
      sessionId: sessionCId,
      id: "version-session-c-1",
      version: 1,
      status: "scheduled",
      name: "Pernas completo",
      identifier: "Treino C",
      objective: "Volume de membros inferiores com progressao moderada.",
      description: "Liberacao progressiva programada.",
      muscleGroups: ["Quadriceps", "Gluteos", "Posterior"],
      level: "intermediario",
      estimatedDurationMinutes: 62,
      validFrom: dateDaysFromNow(5),
      validUntil: dateDaysFromNow(72),
      recommendedDays: ["Quinta"],
      order: 3,
      instructions: "Sessao programada para proxima fase do plano.",
      releaseAt: dateDaysFromNow(5),
      showWhenLocked: true,
      requiresSupervision: true,
      exercises: [
        createExercise({
          id: "leg-press",
          name: "Leg press",
          type: "main",
          muscleGroup: "Quadriceps",
          order: 1,
          plannedSets: 4,
          plannedReps: 10,
          plannedLoad: 120,
          loadUnit: "kg",
          restSeconds: 120,
          thumbnailUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
        }),
      ],
      createdAt: now,
    },
  });

  const mobilitySession = createSessionFromVersion({
    id: sessionMobilityId,
    planId,
    studentId: DEMO_STUDENT.id,
    trainerId: DEMO_TRAINER.id,
    status: "bloqueado",
    release: {
      visibleToStudent: true,
      blockedReason: "Aguardando revisao do desconforto no ombro.",
      allowExecutionAfterExpiration: false,
      expirationToleranceDays: 0,
      notifyOnRelevantUpdates: true,
      progressiveRelease: false,
    },
    version: {
      sessionId: sessionMobilityId,
      id: "version-session-mobility-1",
      version: 1,
      status: "published",
      name: "Mobilidade e recuperacao",
      identifier: "Mobilidade",
      objective: "Recuperacao ativa e amplitude de movimento.",
      muscleGroups: ["Mobilidade", "Core"],
      level: "misto",
      estimatedDurationMinutes: 32,
      validFrom: dateDaysFromNow(-18),
      validUntil: dateDaysFromNow(72),
      recommendedDays: ["Sabado"],
      order: 4,
      instructions: "Usar como sessao opcional quando liberada.",
      showWhenLocked: true,
      requiresSupervision: false,
      privateTrainerNotes: "Bloqueada ate revisar queixa de ombro.",
      exercises: [
        createExercise({
          id: "shoulder-cars",
          name: "Shoulder CARs",
          type: "mobility",
          muscleGroup: "Ombros",
          order: 1,
          plannedSets: 2,
          plannedReps: 6,
          loadUnit: "none",
          validSet: false,
          safetyNotes: "Movimento sem dor.",
          thumbnailUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Shoulder_Circles/0.jpg",
        }),
      ],
      createdAt: now,
      publishedAt: now,
      publishedBy: DEMO_TRAINER.id,
    },
  });

  return {
    plans: { [plan.id]: plan },
    sessions: {
      [sessionA.id]: sessionA,
      [sessionB.id]: sessionB,
      [sessionC.id]: sessionC,
      [mobilitySession.id]: mobilitySession,
    },
    executions: createDefaultExecutions(plan, sessionA, sessionB),
    migratedStaticWorkoutAt: now,
  };
}

function createSessionFromVersion(input: {
  id: string;
  planId: string;
  studentId: string;
  trainerId: string;
  status: TrainingSessionStatus;
  release: TrainingSessionRelease;
  version: TrainingSessionVersion;
}): TrainingSession {
  const now = new Date().toISOString();
  return {
    id: input.id,
    planId: input.planId,
    studentId: input.studentId,
    trainerId: input.trainerId,
    status: input.status,
    activeVersionId: input.version.id,
    versions: [input.version],
    release: input.release,
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      {
        id: createId("status"),
        from: "rascunho",
        to: input.status,
        actorId: input.trainerId,
        actorRole: "trainer",
        createdAt: now,
      },
    ],
    audit: [
      makeAudit(
        "session_created",
        input.trainerId,
        "trainer",
        "Sessao criada no plano versionado.",
      ),
    ],
  };
}

function createDefaultExecutions(
  plan: TrainingPlan,
  sessionA: TrainingSession,
  sessionB: TrainingSession,
) {
  const executionA = createCompletedExecution(
    plan,
    sessionA,
    dateDaysFromNow(-8),
    [
      { exerciseId: "deadlift", load: 78, reps: 5, effort: 7 },
      { exerciseId: "back-squat", load: 80, reps: 6, effort: 7 },
    ],
  );
  const executionB = createCompletedExecution(
    plan,
    sessionB,
    dateDaysFromNow(-3),
    [
      { exerciseId: "pull-down", load: 45, reps: 10, effort: 7 },
      {
        exerciseId: "machine-row",
        load: 8,
        reps: 11,
        effort: 8,
        painRegion: "ombro direito",
        painLevel: 2,
      },
    ],
  );

  return {
    [executionA.id]: executionA,
    [executionB.id]: executionB,
  };
}

function createCompletedExecution(
  plan: TrainingPlan,
  session: TrainingSession,
  startedAt: string,
  setsInput: {
    exerciseId: string;
    load?: number;
    reps?: number;
    effort?: number;
    painRegion?: string;
    painLevel?: number;
  }[],
): TrainingExecution {
  const version = getActiveVersion(session);
  const finishedAt = new Date(
    new Date(startedAt).getTime() + version.estimatedDurationMinutes * 60000,
  ).toISOString();
  const sets: TrainingExecutedSet[] = setsInput.flatMap((input) => {
    const exercise = version.exercises.find(
      (item) => item.id === input.exerciseId,
    );
    if (!exercise) return [];
    return [
      {
        id: createId("set"),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        plannedSetIndex: 1,
        plannedLoad: exercise.plannedLoad,
        executedLoad: input.load,
        loadUnit: exercise.loadUnit,
        plannedReps: exercise.plannedReps,
        executedReps: input.reps,
        plannedRestSeconds: exercise.restSeconds,
        effort: input.effort,
        completed: true,
        warmup: exercise.warmupSet,
        validForProgression: exercise.validSet,
        pain:
          input.painRegion && typeof input.painLevel === "number"
            ? { region: input.painRegion, level: input.painLevel }
            : undefined,
        recordedAt: finishedAt,
      },
    ];
  });

  return {
    id: createId("execution"),
    planId: plan.id,
    sessionId: session.id,
    sessionVersionId: version.id,
    studentId: plan.studentId,
    trainerId: plan.trainerId,
    status: "completed",
    startedAt,
    finishedAt,
    durationMinutes: version.estimatedDurationMinutes,
    snapshot: cloneSessionVersion(version),
    sets,
    skippedExerciseIds: [],
    pausedPeriods: [],
    createdAt: startedAt,
    updatedAt: finishedAt,
  };
}

async function readState(): Promise<TrainingPlanStoreState> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = buildDefaultState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<TrainingPlanStoreState>;
    const next: TrainingPlanStoreState = {
      plans: parsed.plans ?? {},
      sessions: parsed.sessions ?? {},
      executions: parsed.executions ?? {},
      migratedStaticWorkoutAt: parsed.migratedStaticWorkoutAt,
    };

    if (
      !Object.values(next.plans).some(
        (plan) => plan.studentId === DEMO_STUDENT.id,
      )
    ) {
      const defaultState = buildDefaultState();
      const merged = {
        plans: { ...next.plans, ...defaultState.plans },
        sessions: { ...next.sessions, ...defaultState.sessions },
        executions: { ...next.executions, ...defaultState.executions },
        migratedStaticWorkoutAt:
          next.migratedStaticWorkoutAt ?? defaultState.migratedStaticWorkoutAt,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    return next;
  } catch {
    const initial = buildDefaultState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

async function writeState(nextState: TrainingPlanStoreState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function hasPlanPermission(
  plan: TrainingPlan,
  requesterId: string,
  role: TrainingRole,
) {
  if (role === "admin") return true;
  if (role === "student") return plan.studentId === requesterId;
  return plan.trainerId === requesterId;
}

function hasSessionPermission(
  session: TrainingSession,
  requesterId: string,
  role: TrainingRole,
) {
  if (role === "admin") return true;
  if (role === "student") return session.studentId === requesterId;
  return session.trainerId === requesterId;
}

function requireSessionPermission(
  session: TrainingSession,
  requesterId: string,
  role: TrainingRole,
) {
  if (!hasSessionPermission(session, requesterId, role)) {
    throw new Error("Voce nao tem permissao para acessar esta sessao.");
  }
}

export function getTrainingSessionStatusLabel(status: TrainingSessionStatus) {
  return (
    TRAINING_SESSION_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function formatTrainingDate(value?: string) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatTrainingDateTime(value?: string) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem registro";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntilTrainingDate(
  value?: string,
  referenceDate = new Date(),
) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - referenceDate.getTime()) / 86400000);
}

export function getActiveVersion(session: TrainingSession) {
  const active = session.versions.find(
    (version) => version.id === session.activeVersionId,
  );
  if (active) return active;
  const published = session.versions.find(
    (version) =>
      version.status === "published" || version.status === "scheduled",
  );
  if (published) return published;
  return session.versions[0];
}

export function getSessionEffectiveStatus(
  session: TrainingSession,
  referenceDate = new Date(),
): TrainingSessionStatus {
  if (session.status === "liberado") {
    const version = getActiveVersion(session);
    const releaseAt = session.release.releaseAt ?? version.releaseAt;
    if (releaseAt && new Date(releaseAt).getTime() > referenceDate.getTime())
      return "programado";
    if (new Date(version.validUntil).getTime() < referenceDate.getTime())
      return "vencido";
  }

  return session.status;
}

export function getStudentSessionAccess(
  session: TrainingSession,
  referenceDate = new Date(),
) {
  const version = getActiveVersion(session);
  const effectiveStatus = getSessionEffectiveStatus(session, referenceDate);
  const releaseAt = session.release.releaseAt ?? version.releaseAt;

  if (!session.release.visibleToStudent && !version.showWhenLocked) {
    return {
      visible: false,
      canStart: false,
      reason: "Sessao nao liberada ao aluno.",
    };
  }

  if (effectiveStatus === "programado") {
    return {
      visible: version.showWhenLocked,
      canStart: false,
      reason: `Programada para ${formatTrainingDate(releaseAt ?? version.validFrom)}.`,
    };
  }

  if (effectiveStatus === "bloqueado") {
    return {
      visible: version.showWhenLocked,
      canStart: false,
      reason: session.release.blockedReason ?? "Sessao bloqueada.",
    };
  }

  if (effectiveStatus === "pausado") {
    return {
      visible: version.showWhenLocked,
      canStart: false,
      reason: "Sessao pausada pelo treinador.",
    };
  }

  if (effectiveStatus === "substituido") {
    return {
      visible: version.showWhenLocked,
      canStart: false,
      reason: "Sessao substituida por uma nova versao.",
    };
  }

  if (effectiveStatus === "arquivado" || effectiveStatus === "rascunho") {
    return { visible: false, canStart: false, reason: "Sessao indisponivel." };
  }

  if (
    effectiveStatus === "vencido" &&
    !session.release.allowExecutionAfterExpiration
  ) {
    return { visible: true, canStart: false, reason: "Sessao vencida." };
  }

  if (version.requiresSupervision) {
    return {
      visible: true,
      canStart: false,
      reason: "Esta sessao exige supervisao do treinador.",
    };
  }

  return { visible: true, canStart: true, reason: "Disponivel para execucao." };
}

export function validateSessionForPublication(session: TrainingSession) {
  const version = getActiveVersion(session);
  const errors: string[] = [];

  if (!version.name.trim()) errors.push("Informe o nome da sessao.");
  if (!version.objective.trim()) errors.push("Informe o objetivo da sessao.");
  if (!version.validFrom || !version.validUntil)
    errors.push("Informe inicio e vencimento.");
  if (
    new Date(version.validUntil).getTime() <
    new Date(version.validFrom).getTime()
  ) {
    errors.push("A data de vencimento precisa ser posterior ao inicio.");
  }
  if (version.estimatedDurationMinutes <= 0)
    errors.push("Informe uma duracao estimada valida.");
  if (version.exercises.length === 0)
    errors.push("Adicione pelo menos um exercicio.");
  version.exercises.forEach((exercise) => {
    if (!exercise.name.trim()) errors.push("Existe exercicio sem nome.");
    if (exercise.plannedSets <= 0)
      errors.push(`${exercise.name}: informe series validas.`);
    if (
      exercise.loadUnit !== "none" &&
      exercise.plannedLoad !== undefined &&
      exercise.plannedLoad < 0
    ) {
      errors.push(`${exercise.name}: carga planejada invalida.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function getSessionAlerts(
  session: TrainingSession,
  executions: TrainingExecution[],
) {
  const version = getActiveVersion(session);
  const alerts: TrainingDashboardAlert[] = [];
  const effectiveStatus = getSessionEffectiveStatus(session);
  const daysToExpiration = daysUntilTrainingDate(version.validUntil);
  const executionItems = executions.filter(
    (execution) => execution.sessionId === session.id,
  );

  if (effectiveStatus === "vencido") {
    alerts.push({
      id: `${session.id}:expired`,
      title: "Sessao vencida",
      detail: "Revise ou prorrogue a validade.",
      tone: "danger",
      sessionId: session.id,
    });
  } else if (
    daysToExpiration !== null &&
    [15, 7, 0].some((days) => daysToExpiration <= days) &&
    daysToExpiration <= 15
  ) {
    alerts.push({
      id: `${session.id}:expiring`,
      title: "Sessao vencendo",
      detail:
        daysToExpiration <= 0
          ? "Vence hoje."
          : `Vence em ${daysToExpiration} dia(s).`,
      tone: "warning",
      sessionId: session.id,
    });
  }

  if (
    executionItems.some((execution) => execution.sets.some((set) => set.pain))
  ) {
    alerts.push({
      id: `${session.id}:pain`,
      title: "Relato de dor",
      detail: "Ha dor registrada em execucao recente.",
      tone: "danger",
      sessionId: session.id,
    });
  }

  if (session.status === "bloqueado") {
    alerts.push({
      id: `${session.id}:blocked`,
      title: "Sessao bloqueada",
      detail:
        session.release.blockedReason ?? "Aluno nao pode iniciar esta sessao.",
      tone: "warning",
      sessionId: session.id,
    });
  }

  return alerts;
}

export async function getTrainingDashboard(
  studentId = DEMO_STUDENT.id,
  requesterId = DEMO_TRAINER.id,
  role: TrainingRole = "trainer",
  perspective: "trainer" | "student" = "trainer",
): Promise<TrainingDashboard> {
  const state = await readState();
  const plan = Object.values(state.plans).find(
    (item) => item.studentId === studentId && item.status !== "arquivado",
  );
  if (!plan) throw new Error("Plano de treino nao encontrado.");
  if (!hasPlanPermission(plan, requesterId, role))
    throw new Error("Voce nao tem permissao para acessar este plano.");

  const planSessions = plan.sessionIds
    .map((sessionId) => state.sessions[sessionId])
    .filter((session): session is TrainingSession => Boolean(session))
    .filter((session) => hasSessionPermission(session, requesterId, role))
    .sort(
      (first, second) =>
        getActiveVersion(first).order - getActiveVersion(second).order,
    );

  const visibleSessions =
    perspective === "student"
      ? planSessions.filter(
          (session) => getStudentSessionAccess(session).visible,
        )
      : planSessions;

  const executions = Object.values(state.executions)
    .filter(
      (execution) =>
        execution.planId === plan.id && execution.studentId === studentId,
    )
    .sort(
      (first, second) =>
        new Date(second.startedAt).getTime() -
        new Date(first.startedAt).getTime(),
    );

  const completedSessionIds = new Set(
    executions
      .filter((execution) => execution.status === "completed")
      .map((execution) => execution.sessionId),
  );
  const releasedSessions = planSessions.filter(
    (session) => getSessionEffectiveStatus(session) === "liberado",
  );
  const progressPercent = releasedSessions.length
    ? Math.round((completedSessionIds.size / releasedSessions.length) * 100)
    : 0;

  const nextSuggestedSession =
    releasedSessions.find(
      (session) =>
        !completedSessionIds.has(session.id) &&
        getStudentSessionAccess(session).canStart,
    ) ??
    releasedSessions.find(
      (session) => getStudentSessionAccess(session).canStart,
    );

  const alerts = planSessions.flatMap((session) =>
    getSessionAlerts(session, executions),
  );

  const trainerAccount = await getAuthUserById(plan.trainerId);
  const trainer = {
    id: plan.trainerId,
    name: trainerAccount?.name ?? DEMO_TRAINER.name,
    avatar: trainerAccount?.avatar ?? "https://i.pravatar.cc/150?img=32",
    professionalId: trainerAccount?.professionalId ?? "Personal Trainer",
  };

  return {
    plan,
    sessions: visibleSessions,
    executions,
    progressPercent,
    lastExecution: executions[0],
    nextSuggestedSession,
    alerts,
    trainer,
  };
}

export async function getTrainingSessionById(
  sessionId: string,
  requesterId: string,
  role: TrainingRole,
) {
  const state = await readState();
  const session = state.sessions[sessionId];
  if (!session) throw new Error("Sessao nao encontrada.");
  requireSessionPermission(session, requesterId, role);
  return session;
}

export async function createTrainingSession(
  input: TrainingSessionInput,
  actorId = DEMO_TRAINER.id,
) {
  const state = await readState();
  const plan = state.plans[input.planId];
  if (!plan) throw new Error("Plano de treino nao encontrado.");
  if (!hasPlanPermission(plan, actorId, "trainer"))
    throw new Error("Voce nao tem permissao para criar sessoes neste plano.");

  const now = new Date().toISOString();
  const sessionId = createId("session");
  const versionId = createId("version");
  const publishMode = input.publishMode ?? "draft";
  const status: TrainingSessionStatus =
    publishMode === "now"
      ? "liberado"
      : publishMode === "scheduled"
        ? "programado"
        : "rascunho";

  const version: TrainingSessionVersion = {
    id: versionId,
    sessionId,
    version: 1,
    status:
      publishMode === "now"
        ? "published"
        : publishMode === "scheduled"
          ? "scheduled"
          : "draft",
    name: input.name.trim(),
    identifier: input.identifier?.trim() || undefined,
    objective: input.objective.trim(),
    description: input.description?.trim(),
    muscleGroups: input.muscleGroups.filter(Boolean),
    level: input.level,
    estimatedDurationMinutes: input.estimatedDurationMinutes,
    validFrom: input.validFrom ?? now,
    validUntil: input.validUntil ?? dateDaysFromNow(90),
    recommendedDays: input.recommendedDays,
    order: input.order ?? plan.sessionIds.length + 1,
    instructions: input.instructions?.trim(),
    releaseAt: input.releaseAt,
    showWhenLocked: input.showWhenLocked ?? publishMode === "scheduled",
    requiresSupervision: input.requiresSupervision ?? false,
    privateTrainerNotes: input.privateTrainerNotes?.trim(),
    exercises: input.exercises ?? [],
    createdAt: now,
    publishedAt: publishMode === "now" ? now : undefined,
    publishedBy: publishMode === "now" ? actorId : undefined,
  };

  const session = createSessionFromVersion({
    id: sessionId,
    planId: plan.id,
    studentId: plan.studentId,
    trainerId: plan.trainerId,
    status,
    release: {
      visibleToStudent: publishMode !== "draft",
      releaseAt: input.releaseAt,
      allowExecutionAfterExpiration: false,
      expirationToleranceDays: 3,
      notifyOnRelevantUpdates: true,
      progressiveRelease: publishMode === "scheduled",
    },
    version,
  });

  const validation =
    publishMode === "draft"
      ? { valid: true, errors: [] }
      : validateSessionForPublication(session);
  if (!validation.valid) throw new Error(validation.errors.join("\n"));

  const updatedPlan: TrainingPlan = {
    ...plan,
    sessionIds: [...plan.sessionIds, sessionId],
    updatedAt: now,
    audit: [
      makeAudit(
        "session_added",
        actorId,
        "trainer",
        `Sessao ${version.name} adicionada ao plano.`,
      ),
      ...plan.audit,
    ],
  };

  await writeState({
    ...state,
    plans: { ...state.plans, [plan.id]: updatedPlan },
    sessions: { ...state.sessions, [sessionId]: session },
  });

  if (publishMode !== "draft") {
    await createWorkoutNotification({
      userId: plan.studentId,
      audience: "student",
      title:
        publishMode === "scheduled"
          ? "Treino programado"
          : "Nova sessao liberada",
      message: `${version.identifier ? `${version.identifier} - ` : ""}${version.name} foi adicionada ao seu plano.`,
      dedupeKey: `session-created:${session.id}:${version.id}`,
    });
  }

  return { plan: updatedPlan, session };
}

export async function duplicateTrainingSession(
  sessionId: string,
  actorId = DEMO_TRAINER.id,
) {
  const state = await readState();
  const session = state.sessions[sessionId];
  if (!session) throw new Error("Sessao nao encontrada.");
  requireSessionPermission(session, actorId, "trainer");

  const plan = state.plans[session.planId];
  if (!plan) throw new Error("Plano de treino nao encontrado.");
  const source = getActiveVersion(session);

  const exercises = source.exercises.map((exercise, index) => ({
    ...exercise,
    id: createId("exercise"),
    order: index + 1,
  }));

  return createTrainingSession(
    {
      planId: plan.id,
      name: `${source.name} copia`,
      identifier: source.identifier ? `${source.identifier} copia` : undefined,
      objective: source.objective,
      description: source.description,
      muscleGroups: source.muscleGroups,
      level: source.level,
      estimatedDurationMinutes: source.estimatedDurationMinutes,
      validFrom: source.validFrom,
      validUntil: source.validUntil,
      recommendedDays: source.recommendedDays,
      order: plan.sessionIds.length + 1,
      instructions: source.instructions,
      showWhenLocked: false,
      requiresSupervision: source.requiresSupervision,
      exercises,
      publishMode: "draft",
    },
    actorId,
  );
}

export async function publishTrainingSession(
  sessionId: string,
  actorId = DEMO_TRAINER.id,
  scheduledAt?: string,
) {
  const state = await readState();
  const session = state.sessions[sessionId];
  if (!session) throw new Error("Sessao nao encontrada.");
  requireSessionPermission(session, actorId, "trainer");

  const validation = validateSessionForPublication(session);
  if (!validation.valid) throw new Error(validation.errors.join("\n"));

  const now = new Date().toISOString();
  const previousStatus = session.status;
  const nextStatus: TrainingSessionStatus = scheduledAt
    ? "programado"
    : "liberado";
  const activeVersion = getActiveVersion(session);
  const versions = session.versions.map((version) => {
    if (version.id !== activeVersion.id) return version;
    return {
      ...version,
      status: scheduledAt
        ? ("scheduled" as TrainingSessionVersionStatus)
        : ("published" as TrainingSessionVersionStatus),
      releaseAt: scheduledAt,
      publishedAt: scheduledAt ? undefined : now,
      publishedBy: actorId,
    };
  });

  const updatedSession: TrainingSession = {
    ...session,
    status: nextStatus,
    release: {
      ...session.release,
      visibleToStudent: true,
      releaseAt: scheduledAt,
      progressiveRelease: Boolean(scheduledAt),
    },
    versions,
    updatedAt: now,
    statusHistory: [
      {
        id: createId("status"),
        from: previousStatus,
        to: nextStatus,
        actorId,
        actorRole: "trainer",
        createdAt: now,
      },
      ...session.statusHistory,
    ],
    audit: [
      makeAudit(
        "session_published",
        actorId,
        "trainer",
        scheduledAt ? "Publicacao programada." : "Sessao publicada ao aluno.",
      ),
      ...session.audit,
    ],
  };

  await writeState({
    ...state,
    sessions: { ...state.sessions, [sessionId]: updatedSession },
  });

  await createWorkoutNotification({
    userId: session.studentId,
    audience: "student",
    title: scheduledAt ? "Treino programado" : "Sessao liberada",
    message: `${activeVersion.identifier ? `${activeVersion.identifier} - ` : ""}${activeVersion.name} ${scheduledAt ? "foi programada" : "esta disponivel"}.`,
    dedupeKey: `session-published:${session.id}:${activeVersion.id}:${scheduledAt ?? "now"}`,
  });

  return updatedSession;
}

export async function setTrainingSessionStatus(
  sessionId: string,
  nextStatus: Extract<
    TrainingSessionStatus,
    "bloqueado" | "pausado" | "arquivado" | "substituido" | "liberado"
  >,
  reason: string,
  actorId = DEMO_TRAINER.id,
) {
  const state = await readState();
  const session = state.sessions[sessionId];
  if (!session) throw new Error("Sessao nao encontrada.");
  requireSessionPermission(session, actorId, "trainer");

  const executions = Object.values(state.executions).filter(
    (execution) => execution.sessionId === sessionId,
  );
  if (nextStatus === "arquivado" && executions.length > 0) {
    reason =
      reason.trim() || "Sessao arquivada preservando execucoes registradas.";
  }

  const now = new Date().toISOString();
  const updatedSession: TrainingSession = {
    ...session,
    status: nextStatus,
    release: {
      ...session.release,
      visibleToStudent:
        nextStatus === "liberado" || session.release.visibleToStudent,
      blockedReason:
        nextStatus === "bloqueado"
          ? reason.trim() || "Bloqueada pelo treinador."
          : session.release.blockedReason,
    },
    updatedAt: now,
    statusHistory: [
      {
        id: createId("status"),
        from: session.status,
        to: nextStatus,
        reason: reason.trim() || undefined,
        actorId,
        actorRole: "trainer",
        createdAt: now,
      },
      ...session.statusHistory,
    ],
    audit: [
      makeAudit(
        "session_status_changed",
        actorId,
        "trainer",
        reason.trim() || `Status alterado para ${nextStatus}.`,
      ),
      ...session.audit,
    ],
  };

  await writeState({
    ...state,
    sessions: { ...state.sessions, [sessionId]: updatedSession },
  });

  if (
    ["bloqueado", "pausado", "substituido", "liberado"].includes(nextStatus)
  ) {
    const version = getActiveVersion(updatedSession);
    await createWorkoutNotification({
      userId: session.studentId,
      audience: "student",
      title:
        nextStatus === "liberado" ? "Sessao liberada" : "Sessao atualizada",
      message: `${version.identifier ? `${version.identifier} - ` : ""}${version.name}: ${getTrainingSessionStatusLabel(nextStatus)}.`,
      dedupeKey: `session-status:${session.id}:${nextStatus}:${now.slice(0, 16)}`,
    });
  }

  return updatedSession;
}

export async function extendTrainingSessionValidity(
  sessionId: string,
  validUntil: string,
  actorId = DEMO_TRAINER.id,
) {
  const state = await readState();
  const session = state.sessions[sessionId];
  if (!session) throw new Error("Sessao nao encontrada.");
  requireSessionPermission(session, actorId, "trainer");

  const activeVersion = getActiveVersion(session);
  if (
    new Date(validUntil).getTime() <=
    new Date(activeVersion.validFrom).getTime()
  ) {
    throw new Error(
      "A nova validade precisa ser posterior ao inicio da sessao.",
    );
  }

  const now = new Date().toISOString();
  const versions = session.versions.map((version) =>
    version.id === activeVersion.id ? { ...version, validUntil } : version,
  );
  const updatedSession = {
    ...session,
    status:
      session.status === "vencido"
        ? ("liberado" as TrainingSessionStatus)
        : session.status,
    versions,
    updatedAt: now,
    audit: [
      makeAudit(
        "session_validity_extended",
        actorId,
        "trainer",
        `Validade prorrogada ate ${formatTrainingDate(validUntil)}.`,
      ),
      ...session.audit,
    ],
  };

  await writeState({
    ...state,
    sessions: { ...state.sessions, [sessionId]: updatedSession },
  });

  await createWorkoutNotification({
    userId: session.studentId,
    audience: "student",
    title: "Validade prorrogada",
    message: `${activeVersion.name} foi prorrogada ate ${formatTrainingDate(validUntil)}.`,
    dedupeKey: `session-extended:${session.id}:${validUntil}`,
  });

  return updatedSession;
}

export async function startTrainingExecution(
  sessionId: string,
  studentId = DEMO_STUDENT.id,
) {
  const state = await readState();
  const session = state.sessions[sessionId];
  if (!session) throw new Error("Sessao nao encontrada.");
  requireSessionPermission(session, studentId, "student");

  const access = getStudentSessionAccess(session);
  if (!access.canStart) throw new Error(access.reason);

  const activeInProgress = Object.values(state.executions).find(
    (execution) =>
      execution.sessionId === sessionId &&
      execution.studentId === studentId &&
      execution.status === "in_progress",
  );
  if (activeInProgress) return activeInProgress;

  const plan = state.plans[session.planId];
  if (!plan) throw new Error("Plano de treino nao encontrado.");
  const version = getActiveVersion(session);
  const now = new Date().toISOString();
  const execution: TrainingExecution = {
    id: createId("execution"),
    planId: plan.id,
    sessionId: session.id,
    sessionVersionId: version.id,
    studentId,
    trainerId: session.trainerId,
    status: "in_progress",
    startedAt: now,
    snapshot: cloneSessionVersion(version),
    sets: [],
    skippedExerciseIds: [],
    pausedPeriods: [],
    createdAt: now,
    updatedAt: now,
  };

  await writeState({
    ...state,
    executions: { ...state.executions, [execution.id]: execution },
  });
  return execution;
}

export async function saveTrainingExecutionSets(
  executionId: string,
  sets: TrainingSetInput[],
  studentId = DEMO_STUDENT.id,
) {
  const state = await readState();
  const execution = state.executions[executionId];
  if (!execution || execution.studentId !== studentId)
    throw new Error("Execucao nao encontrada.");

  const now = new Date().toISOString();
  const updatedExecution: TrainingExecution = {
    ...execution,
    sets: sets.map((set) => ({
      id: createId("set"),
      ...set,
      recordedAt: now,
    })),
    updatedAt: now,
  };

  await writeState({
    ...state,
    executions: { ...state.executions, [executionId]: updatedExecution },
  });
  return updatedExecution;
}

export async function finishTrainingExecution(
  executionId: string,
  sets: TrainingSetInput[],
  studentId = DEMO_STUDENT.id,
) {
  const state = await readState();
  const execution = state.executions[executionId];
  if (!execution || execution.studentId !== studentId)
    throw new Error("Execucao nao encontrada.");

  const now = new Date().toISOString();
  const completedSets: TrainingExecutedSet[] = sets.map((set) => ({
    id: createId("set"),
    ...set,
    recordedAt: now,
  }));
  const skippedExerciseIds = execution.snapshot.exercises
    .filter(
      (exercise) =>
        !completedSets.some(
          (set) => set.exerciseId === exercise.id && set.completed,
        ),
    )
    .map((exercise) => exercise.id);
  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(now).getTime() - new Date(execution.startedAt).getTime()) /
        60000,
    ),
  );

  const updatedExecution: TrainingExecution = {
    ...execution,
    status: "completed",
    finishedAt: now,
    durationMinutes,
    sets: completedSets,
    skippedExerciseIds,
    updatedAt: now,
  };

  await writeState({
    ...state,
    executions: { ...state.executions, [executionId]: updatedExecution },
  });

  await createWorkoutNotification({
    userId: execution.trainerId,
    audience: "trainer",
    title: completedSets.some((set) => set.pain)
      ? "Treino concluido com dor"
      : "Treino concluido",
    message: `${DEMO_STUDENT.name} concluiu ${execution.snapshot.name}.`,
    highlightPain: completedSets.some((set) => set.pain),
    dedupeKey: `execution-completed:${execution.id}`,
  });

  return updatedExecution;
}

export async function interruptTrainingExecution(
  executionId: string,
  reason: string,
  studentId = DEMO_STUDENT.id,
) {
  const state = await readState();
  const execution = state.executions[executionId];
  if (!execution || execution.studentId !== studentId)
    throw new Error("Execucao nao encontrada.");

  const now = new Date().toISOString();
  const updatedExecution = {
    ...execution,
    status: "interrupted" as TrainingExecutionStatus,
    finishedAt: now,
    updatedAt: now,
    skippedExerciseIds: execution.snapshot.exercises.map(
      (exercise) => exercise.id,
    ),
  };

  await writeState({
    ...state,
    executions: { ...state.executions, [executionId]: updatedExecution },
  });

  await createWorkoutNotification({
    userId: execution.trainerId,
    audience: "trainer",
    title: "Sessao interrompida",
    message: `${DEMO_STUDENT.name} interrompeu ${execution.snapshot.name}. ${reason.trim()}`,
    dedupeKey: `execution-interrupted:${execution.id}`,
  });

  return updatedExecution;
}

export async function getTrainingExecutionFeedbackContext(
  executionId: string,
): Promise<SubmitFeedbackContext> {
  const state = await readState();
  const execution = state.executions[executionId];
  if (!execution) throw new Error("Execucao nao encontrada.");
  const plan = state.plans[execution.planId];

  const exercises: WorkoutExercise[] = execution.snapshot.exercises.map(
    (exercise) => ({
      id: exercise.id,
      name: exercise.name,
      prescription: formatExercisePrescription(exercise),
      notes: exercise.observation,
    }),
  );

  return {
    studentId: execution.studentId,
    studentName: DEMO_STUDENT.name,
    studentAvatar: DEMO_STUDENT.avatar,
    trainerId: execution.trainerId,
    trainerName: DEMO_TRAINER.name,
    workoutId: execution.sessionId,
    workoutName: execution.snapshot.name,
    planId: execution.planId,
    planName: plan?.name,
    executionId: execution.id,
    startedAt: execution.startedAt,
    exercises,
  };
}

export function formatExercisePrescription(
  exercise: TrainingExercisePrescription,
) {
  const reps = exercise.plannedReps
    ? `${exercise.plannedReps} reps`
    : exercise.plannedRepsMin && exercise.plannedRepsMax
      ? `${exercise.plannedRepsMin}-${exercise.plannedRepsMax} reps`
      : exercise.durationSeconds
        ? `${exercise.durationSeconds}s`
        : "livre";
  const load =
    exercise.plannedLoad !== undefined
      ? ` • ${exercise.plannedLoad} ${exercise.loadUnit}`
      : "";
  return `${exercise.plannedSets} serie(s) x ${reps}${load}`;
}

export function getPreviousExecutionValue(
  executions: TrainingExecution[],
  exerciseId: string,
) {
  const execution = executions
    .filter((item) => item.status === "completed")
    .sort(
      (first, second) =>
        new Date(second.startedAt).getTime() -
        new Date(first.startedAt).getTime(),
    )
    .find((item) =>
      item.sets.some((set) => set.exerciseId === exerciseId && set.completed),
    );

  const set = execution?.sets.find(
    (item) => item.exerciseId === exerciseId && item.completed,
  );
  if (!set) return undefined;
  return {
    load: set.executedLoad,
    reps: set.executedReps,
    effort: set.effort,
    date: execution?.startedAt,
  };
}

export function buildTrainingLoadSummaries(
  executions: TrainingExecution[],
): TrainingLoadSummary[] {
  const grouped = new Map<string, TrainingExecutedSet[]>();

  executions.forEach((execution) => {
    execution.sets.forEach((set) => {
      if (!set.completed || !set.validForProgression || set.warmup) return;
      const key = `${set.exerciseId}|${set.loadUnit}`;
      grouped.set(key, [...(grouped.get(key) ?? []), set]);
    });
  });

  return [...grouped.entries()].map(([key, sets]) => {
    const sorted = sets.sort(
      (first, second) =>
        new Date(first.recordedAt).getTime() -
        new Date(second.recordedAt).getTime(),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const volumes = sorted
      .map((set) => {
        if (
          set.loadUnit !== "kg" ||
          typeof set.executedLoad !== "number" ||
          typeof set.executedReps !== "number"
        )
          return undefined;
        return set.executedLoad * set.executedReps;
      })
      .filter((value): value is number => typeof value === "number");
    const loads = sorted
      .map((set) => set.executedLoad)
      .filter((value): value is number => typeof value === "number");
    const firstVolume = volumes[0];
    const lastVolume = volumes[volumes.length - 1];
    const trendLabel =
      sorted.length < 2
        ? "Dados insuficientes"
        : firstVolume && lastVolume && lastVolume > firstVolume
          ? "Evolucao de volume"
          : "Historico preservado";

    return {
      id: key,
      exerciseName: first.exerciseName,
      sessionName: "Sessoes executadas",
      compatibleRecords: sorted.length,
      bestLoad: loads.length ? Math.max(...loads) : undefined,
      bestVolume: volumes.length ? Math.max(...volumes) : undefined,
      lastLoad: last.executedLoad,
      lastVolume,
      hasPainAlert: sorted.some((set) => Boolean(set.pain)),
      trendLabel,
    };
  });
}

export async function getExercisePerformanceDashboard(
  studentId = DEMO_STUDENT.id,
  requesterId = DEMO_TRAINER.id,
  role: TrainingRole = "trainer",
  periodPreset: PerformancePeriodPreset = "3m",
  customStart?: string,
  customEnd?: string,
) {
  const state = await readState();
  const plan = Object.values(state.plans).find(
    (item) => item.studentId === studentId && item.status !== "arquivado",
  );
  if (!plan) throw new Error("Plano de treino nao encontrado.");
  if (!hasPlanPermission(plan, requesterId, role))
    throw new Error("Voce nao tem permissao para acessar este plano.");

  const sessions = plan.sessionIds
    .map((sessionId) => state.sessions[sessionId])
    .filter((session): session is TrainingSession => Boolean(session))
    .filter((session) => hasSessionPermission(session, requesterId, role));

  const executions = Object.values(state.executions)
    .filter(
      (execution) =>
        execution.planId === plan.id && execution.studentId === studentId,
    )
    .filter(
      (execution) => role !== "student" || execution.studentId === requesterId,
    )
    .sort(
      (first, second) =>
        new Date(first.startedAt).getTime() -
        new Date(second.startedAt).getTime(),
    );

  return buildExercisePerformanceAnalytics({
    plan,
    sessions,
    executions,
    periodPreset,
    customStart,
    customEnd,
  });
}

export async function getExercisePerformanceSummary(
  exerciseKey: string,
  studentId = DEMO_STUDENT.id,
  requesterId = DEMO_TRAINER.id,
  role: TrainingRole = "trainer",
  periodPreset: PerformancePeriodPreset = "3m",
  customStart?: string,
  customEnd?: string,
) {
  const dashboard = await getExercisePerformanceDashboard(
    studentId,
    requesterId,
    role,
    periodPreset,
    customStart,
    customEnd,
  );
  const summary = getExercisePerformanceSummaryByKey(dashboard, exerciseKey);
  if (!summary) throw new Error("Historico do exercicio nao encontrado.");
  return { dashboard, summary };
}

export async function correctTrainingExecutionSet({
  executionId,
  setId,
  patch,
  reason,
  actorId = DEMO_TRAINER.id,
  actorRole = "trainer",
}: {
  executionId: string;
  setId: string;
  patch: Partial<TrainingExecutedSet>;
  reason: string;
  actorId?: string;
  actorRole?: TrainingRole;
}) {
  const state = await readState();
  const execution = state.executions[executionId];
  if (!execution) throw new Error("Execucao nao encontrada.");
  if (actorRole === "student")
    throw new Error(
      "Aluno nao pode corrigir historico concluido sem autorizacao.",
    );

  const plan = state.plans[execution.planId];
  if (!plan || !hasPlanPermission(plan, actorId, actorRole)) {
    throw new Error("Voce nao tem permissao para corrigir esta execucao.");
  }

  if (!reason.trim()) throw new Error("Informe o motivo da correcao.");

  const now = new Date().toISOString();
  const updatedSets = execution.sets.map((set) => {
    if (set.id !== setId) return set;

    const allowedPatch: Partial<TrainingExecutedSet> = {
      setType: patch.setType,
      executedLoad: patch.executedLoad,
      executedReps: patch.executedReps,
      durationSeconds: patch.durationSeconds,
      distanceMeters: patch.distanceMeters,
      speedKmh: patch.speedKmh,
      powerWatts: patch.powerWatts,
      equipmentLevel: patch.equipmentLevel,
      cadence: patch.cadence,
      actualRestSeconds: patch.actualRestSeconds,
      effort: patch.effort,
      completed: patch.completed,
      validForProgression: patch.validForProgression,
      pain: patch.pain,
      note: patch.note,
      studentNote: patch.studentNote,
      trainerNote: patch.trainerNote,
      privateTrainerNote: patch.privateTrainerNote,
      importantNote: patch.importantNote,
      invalidReason: patch.invalidReason,
      assisted: patch.assisted,
      partial: patch.partial,
      interrupted: patch.interrupted,
    };
    const cleanPatch = Object.fromEntries(
      Object.entries(allowedPatch).filter(([, value]) => value !== undefined),
    ) as Partial<TrainingExecutedSet>;

    return {
      ...set,
      ...cleanPatch,
      correctionAudit: [
        {
          id: createId("set-correction"),
          actorId,
          actorRole,
          reason: reason.trim(),
          createdAt: now,
          previousValues: pickSetAuditValues(set),
          nextValues: cleanPatch,
        },
        ...(set.correctionAudit ?? []),
      ],
    };
  });

  if (
    updatedSets === execution.sets ||
    !execution.sets.some((set) => set.id === setId)
  ) {
    throw new Error("Serie nao encontrada.");
  }

  const updatedExecution: TrainingExecution = {
    ...execution,
    sets: updatedSets,
    updatedAt: now,
  };

  await writeState({
    ...state,
    executions: {
      ...state.executions,
      [execution.id]: updatedExecution,
    },
  });

  return updatedExecution;
}

function pickSetAuditValues(
  set: TrainingExecutedSet,
): Partial<TrainingExecutedSet> {
  return {
    setType: set.setType,
    executedLoad: set.executedLoad,
    executedReps: set.executedReps,
    durationSeconds: set.durationSeconds,
    distanceMeters: set.distanceMeters,
    speedKmh: set.speedKmh,
    powerWatts: set.powerWatts,
    equipmentLevel: set.equipmentLevel,
    cadence: set.cadence,
    actualRestSeconds: set.actualRestSeconds,
    effort: set.effort,
    completed: set.completed,
    validForProgression: set.validForProgression,
    pain: set.pain,
    note: set.note,
    studentNote: set.studentNote,
    trainerNote: set.trainerNote,
    privateTrainerNote: set.privateTrainerNote,
    importantNote: set.importantNote,
    invalidReason: set.invalidReason,
    assisted: set.assisted,
    partial: set.partial,
    interrupted: set.interrupted,
  };
}

export async function resetTrainingPlanStoreForTests() {
  await writeState(buildDefaultState());
}
