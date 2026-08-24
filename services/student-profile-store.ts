import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEMO_STUDENT, DEMO_TRAINER } from "@/services/feedback-store";
import { validateStudentAdditionAllowed } from "@/services/subscription-service";

export type StudentProfileRole = "student" | "trainer" | "admin";

export type StudentStatus = "ativo" | "aguardando_inicio" | "pausado" | "inativo" | "encerrado";

export type AnamnesisStatus =
  | "nao_iniciada"
  | "em_preenchimento"
  | "enviada_pelo_aluno"
  | "aguardando_revisao"
  | "revisada_pelo_treinador"
  | "necessita_esclarecimentos"
  | "atualizacao_solicitada"
  | "arquivada";

export type ReviewPointStatus =
  | "confirmado"
  | "corrigido"
  | "esclarecido"
  | "acompanhar"
  | "solicitar_documento"
  | "recomendar_encaminhamento"
  | "nao_se_aplica";

export type StudentProfileSection =
  | "registration"
  | "anamnesis"
  | "assessments"
  | "workouts"
  | "frequency"
  | "feedbacks"
  | "loads"
  | "body"
  | "diet"
  | "messages"
  | "documents"
  | "notes"
  | "access";

export type StudentAuditEvent = {
  id: string;
  action: string;
  actorId: string;
  actorRole: StudentProfileRole;
  createdAt: string;
  details: string;
};

export type StudentContact = {
  phone?: string;
  whatsapp?: string;
  email?: string;
  emergencyName?: string;
  emergencyPhone?: string;
};

export type StudentRegistration = {
  fullName: string;
  avatar?: string;
  birthDate: string;
  mainGoal: string;
  secondaryGoals?: string[];
  gender?: "male" | "female" | "not_informed";
  profession?: string;
  address?: string;
  contact: StudentContact;
  administrativeNotes?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type FollowUpSummary = {
  startedAt: string;
  statusUpdatedAt: string;
  lastActivityAt: string;
  lastTrainingAt: string;
  nextSessionAt: string;
  nextAssessmentAt: string;
  plannedTrainingFrequency: number;
  completedTrainingFrequency: number;
  currentWorkoutName: string;
  currentWorkoutStartedAt: string;
  currentWorkoutExpiresAt: string;
  lastFeedbackAt?: string;
  pendingFeedbacks: number;
};

export type AnamnesisQuestionAnswer = {
  id: string;
  stageId: string;
  label: string;
  originalAnswer: string;
  confirmedAnswer?: string;
  attention: boolean;
  unanswered?: boolean;
  reviewStatus?: ReviewPointStatus;
  trainerNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type AnamnesisChecklistItem = {
  id: string;
  label: string;
  sourceQuestionId?: string;
  priority: "normal" | "attention" | "critical";
  done: boolean;
};

export type AnamnesisVersion = {
  id: string;
  version: number;
  status: AnamnesisStatus;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  dueAt?: string;
  answeredBy: string;
  termVersion: string;
  progressPercent: number;
  answers: AnamnesisQuestionAnswer[];
  checklist: AnamnesisChecklistItem[];
  attachments: StudentDocument[];
  trainerReviewNote?: string;
};

export type AnamnesisInvite = {
  id: string;
  status: "active" | "used" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  dueAt?: string;
  delivery: "app" | "share_link" | "notification";
  reminderCount: number;
  lastReminderAt?: string;
  revokedAt?: string;
  tokenLast4: string;
};

export type AnamnesisState = {
  status: AnamnesisStatus;
  activeInvite?: AnamnesisInvite;
  versions: AnamnesisVersion[];
  nextUpdateAt?: string;
};

export type StudentDocument = {
  id: string;
  title: string;
  type: "medical_clearance" | "exam" | "restriction" | "nutrition_plan" | "other";
  status: "pending_review" | "approved" | "rejected" | "expired";
  uploadedAt: string;
  reviewedAt?: string;
  privateToTrainer: boolean;
};

export type StudentRestriction = {
  id: string;
  label: string;
  severity: "info" | "warning" | "critical";
  source: "anamnesis" | "assessment" | "feedback" | "document" | "trainer";
  createdAt: string;
  active: boolean;
};

export type StudentFrequency = {
  plannedSessions: number;
  completedSessions: number;
  absences: number;
  cancellations: number;
  periodLabel: string;
};

export type BodyEvolutionPoint = {
  date: string;
  weightKg?: number;
  bodyFatPercent?: number;
  waistCm?: number;
  source: "assessment" | "manual";
};

export type EquipmentSnapshot = {
  id: string;
  name: string;
  type: "free_weight" | "machine" | "bodyweight" | "cardio" | "other";
  manufacturer?: string;
  model?: string;
  unilateral?: boolean;
};

export type ExecutedSet = {
  id: string;
  date: string;
  workoutId: string;
  workoutName: string;
  exerciseId: string;
  exerciseName: string;
  equipment: EquipmentSnapshot;
  plannedLoad?: number;
  executedLoad?: number;
  loadUnit: "kg" | "lb" | "level" | "bodyweight" | "none";
  loadMode?: "per_side" | "total" | "per_dumbbell";
  plannedReps?: number;
  executedReps?: number;
  plannedSets?: number;
  executedSetIndex: number;
  durationSeconds?: number;
  distanceMeters?: number;
  side?: "left" | "right" | "bilateral";
  effort?: number;
  technique?: "boa" | "regular" | "ruim";
  completed: boolean;
  warmup: boolean;
  validForProgression: boolean;
  pain?: {
    region: string;
    level: number;
  };
  note?: string;
};

export type LoadEvolutionInsight = {
  id: string;
  exerciseName: string;
  equipmentName: string;
  unit: ExecutedSet["loadUnit"];
  compatibleRecords: number;
  lastDate: string;
  bestLoad?: number;
  bestVolume?: number;
  lastLoad?: number;
  lastVolume?: number;
  progressPercent?: number;
  trendLabel: string;
  hasPainAlert: boolean;
  dataQuality: "insufficient" | "compatible" | "attention";
  records: {
    date: string;
    load?: number;
    reps?: number;
    volume?: number;
    effort?: number;
  }[];
};

export type StudentAccessState = {
  accountStatus: "not_invited" | "invited" | "active" | "blocked";
  activatedAt?: string;
  lastAccessAt?: string;
  lastInviteAt?: string;
  sessionsRevokedAt?: string;
};

export type StudentCommunicationState = {
  lastMessageAt?: string;
  unreadFromStudent: number;
  unreadFromTrainer: number;
};

export type StudentProfile = {
  id: string;
  trainerId: string;
  registration: StudentRegistration;
  status: StudentStatus;
  followUp: FollowUpSummary;
  anamnesis: AnamnesisState;
  frequency: StudentFrequency;
  restrictions: StudentRestriction[];
  documents: StudentDocument[];
  bodyEvolution: BodyEvolutionPoint[];
  executedSets: ExecutedSet[];
  access: StudentAccessState;
  communication: StudentCommunicationState;
  privateTrainerNotes: string[];
  updatedAt: string;
  audit: StudentAuditEvent[];
};

type StudentProfileStoreState = {
  profiles: Record<string, StudentProfile>;
};

export type CreateStudentProfileInput = {
  trainerId: string;
  fullName: string;
  birthDate: string;
  mainGoal?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  administrativeNotes?: string;
};

export type RegistrationValidationResult = {
  valid: boolean;
  errors: string[];
};

export const STUDENT_STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "aguardando_inicio", label: "Aguardando inicio" },
  { value: "pausado", label: "Pausado" },
  { value: "inativo", label: "Inativo" },
  { value: "encerrado", label: "Encerrado" },
];

export const ANAMNESIS_STATUS_OPTIONS: { value: AnamnesisStatus; label: string }[] = [
  { value: "nao_iniciada", label: "Nao iniciada" },
  { value: "em_preenchimento", label: "Em preenchimento" },
  { value: "enviada_pelo_aluno", label: "Enviada pelo aluno" },
  { value: "aguardando_revisao", label: "Aguardando revisao" },
  { value: "revisada_pelo_treinador", label: "Revisada pelo treinador" },
  { value: "necessita_esclarecimentos", label: "Necessita esclarecimentos" },
  { value: "atualizacao_solicitada", label: "Atualizacao solicitada" },
  { value: "arquivada", label: "Arquivada" },
];

export const ANAMNESIS_STEPS = [
  {
    id: "goals",
    title: "Objetivos e rotina",
    fields: [
      "Objetivo principal",
      "Experiencia com exercicios",
      "Frequencia disponivel",
      "Local de treino",
      "Sono",
      "Estresse",
      "Hidratacao",
    ],
  },
  {
    id: "health",
    title: "Historico de saude",
    fields: [
      "Doencas diagnosticadas",
      "Pressao arterial",
      "Diabetes",
      "Desmaios ou tontura",
      "Cirurgias",
      "Medicamentos",
      "Liberacao medica",
    ],
  },
  {
    id: "musculoskeletal",
    title: "Historico musculoesqueletico",
    fields: [
      "Lesoes anteriores",
      "Dores atuais",
      "Regiao e lado",
      "Intensidade",
      "Movimentos que pioram",
      "Limitacoes",
      "Tratamento atual",
    ],
  },
  {
    id: "preferences",
    title: "Experiencia e preferencias",
    fields: [
      "Exercicios preferidos",
      "Exercicios que causam desconforto",
      "Equipamentos disponiveis",
      "Horarios preferidos",
      "Motivacao",
      "Dificuldades",
    ],
  },
  {
    id: "readiness",
    title: "Prontidao e consentimento",
    fields: [
      "Prontidao para exercicio",
      "Veracidade das respostas",
      "Ciencia sobre avaliacao medica",
      "Consentimento de uso profissional",
      "Versao do termo",
    ],
  },
];

const STORAGE_KEY = "@indigo/student-profile-store/v1";
const CURRENT_ANAMNESIS_TERM = "anamnesis-term-v1";

function dateDaysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeAudit(
  action: string,
  actorId: string,
  actorRole: StudentProfileRole,
  details: string
): StudentAuditEvent {
  return {
    id: createId("audit"),
    action,
    actorId,
    actorRole,
    createdAt: new Date().toISOString(),
    details,
  };
}

function createDefaultAnamnesisVersion(): AnamnesisVersion {
  const submittedAt = dateDaysFromNow(-4);

  const answers: AnamnesisQuestionAnswer[] = [
    {
      id: "main_goal",
      stageId: "goals",
      label: "Objetivo principal",
      originalAnswer: "Ganhar massa muscular com melhora de condicionamento.",
      confirmedAnswer: "Ganhar massa muscular com melhora de condicionamento.",
      attention: false,
      reviewStatus: "confirmado",
    },
    {
      id: "available_frequency",
      stageId: "goals",
      label: "Frequencia disponivel",
      originalAnswer: "4 vezes por semana, preferencialmente apos 18h.",
      confirmedAnswer: "4 vezes por semana, preferencialmente apos 18h.",
      attention: false,
      reviewStatus: "confirmado",
    },
    {
      id: "current_pain",
      stageId: "musculoskeletal",
      label: "Dor atual",
      originalAnswer: "Desconforto leve no ombro direito em movimentos acima da cabeca.",
      attention: true,
      reviewStatus: "acompanhar",
      trainerNote: "Confirmar amplitude, exercicios que pioram e necessidade de regressao.",
    },
    {
      id: "medications",
      stageId: "health",
      label: "Medicamentos",
      originalAnswer: "Nao utiliza medicamentos continuos.",
      attention: false,
      reviewStatus: "confirmado",
    },
    {
      id: "medical_clearance",
      stageId: "readiness",
      label: "Liberacao medica",
      originalAnswer: "Informou que possui liberacao verbal recente.",
      attention: true,
      reviewStatus: "solicitar_documento",
      trainerNote: "Solicitar documento antes de progressao intensa.",
    },
    {
      id: "consent",
      stageId: "readiness",
      label: "Consentimento",
      originalAnswer: "Aceitou uso profissional dos dados no aplicativo.",
      attention: false,
      reviewStatus: "confirmado",
    },
  ];

  return {
    id: "anamnesis-version-initial",
    version: 1,
    status: "aguardando_revisao",
    createdAt: submittedAt,
    submittedAt,
    dueAt: dateDaysFromNow(3),
    answeredBy: DEMO_STUDENT.id,
    termVersion: CURRENT_ANAMNESIS_TERM,
    progressPercent: 100,
    answers,
    checklist: buildChecklistFromAnswers(answers),
    attachments: [],
    trainerReviewNote: "",
  };
}

function createDefaultProfile(): StudentProfile {
  const now = new Date().toISOString();
  const version = createDefaultAnamnesisVersion();

  return {
    id: DEMO_STUDENT.id,
    trainerId: DEMO_TRAINER.id,
    registration: {
      fullName: "Joao Silva",
      avatar: DEMO_STUDENT.avatar,
      birthDate: "1996-06-15",
      mainGoal: "Hipertrofia com melhora de condicionamento",
      secondaryGoals: ["Melhorar mobilidade de ombro", "Aumentar consistencia semanal"],
      gender: "male",
      profession: "Analista de produto",
      address: "Sao Paulo, SP",
      contact: {
        phone: "(11) 98765-4321",
        whatsapp: "(11) 98765-4321",
        email: "joao.silva@example.com",
        emergencyName: "Mariana Silva",
        emergencyPhone: "(11) 91234-5678",
      },
      administrativeNotes: "Plano trimestral ativo. Conferir renovacao no proximo ciclo.",
      updatedAt: now,
      updatedBy: DEMO_TRAINER.id,
    },
    status: "ativo",
    followUp: {
      startedAt: dateDaysFromNow(-126),
      statusUpdatedAt: dateDaysFromNow(-18),
      lastActivityAt: dateDaysFromNow(-1),
      lastTrainingAt: dateDaysFromNow(-2),
      nextSessionAt: dateDaysFromNow(1),
      nextAssessmentAt: dateDaysFromNow(10),
      plannedTrainingFrequency: 4,
      completedTrainingFrequency: 3,
      currentWorkoutName: "Elite Program - Forca e condicionamento",
      currentWorkoutStartedAt: dateDaysFromNow(-18),
      currentWorkoutExpiresAt: dateDaysFromNow(12),
      lastFeedbackAt: dateDaysFromNow(-2),
      pendingFeedbacks: 1,
    },
    anamnesis: {
      status: "aguardando_revisao",
      versions: [version],
      nextUpdateAt: dateDaysFromNow(90),
    },
    frequency: {
      plannedSessions: 16,
      completedSessions: 13,
      absences: 1,
      cancellations: 2,
      periodLabel: "Ultimos 30 dias",
    },
    restrictions: [
      {
        id: "restriction-shoulder",
        label: "Dor no ombro direito em movimentos acima da cabeca",
        severity: "warning",
        source: "anamnesis",
        createdAt: dateDaysFromNow(-4),
        active: true,
      },
    ],
    documents: [
      {
        id: "document-clearance",
        title: "Liberacao medica",
        type: "medical_clearance",
        status: "pending_review",
        uploadedAt: dateDaysFromNow(-3),
        privateToTrainer: false,
      },
    ],
    bodyEvolution: [
      {
        date: dateDaysFromNow(-92),
        weightKg: 82.4,
        bodyFatPercent: 19.8,
        waistCm: 91,
        source: "assessment",
      },
      {
        date: dateDaysFromNow(-45),
        weightKg: 81.2,
        bodyFatPercent: 18.7,
        waistCm: 89,
        source: "assessment",
      },
      {
        date: dateDaysFromNow(-8),
        weightKg: 80.6,
        bodyFatPercent: 17.9,
        waistCm: 87.5,
        source: "assessment",
      },
    ],
    executedSets: createDefaultExecutedSets(),
    access: {
      accountStatus: "active",
      activatedAt: dateDaysFromNow(-118),
      lastAccessAt: dateDaysFromNow(-1),
      lastInviteAt: dateDaysFromNow(-120),
    },
    communication: {
      lastMessageAt: dateDaysFromNow(-1),
      unreadFromStudent: 1,
      unreadFromTrainer: 0,
    },
    privateTrainerNotes: [
      "Priorizar qualidade tecnica antes de progressao de carga.",
      "Confirmar desconforto no ombro na proxima sessao.",
    ],
    updatedAt: now,
    audit: [makeAudit("created", DEMO_TRAINER.id, "trainer", "Perfil inicial criado no armazenamento local.")],
  };
}

function createDefaultExecutedSets(): ExecutedSet[] {
  const squatEquipment: EquipmentSnapshot = {
    id: "rack-free-bar-olympic",
    name: "Rack livre - barra olimpica",
    type: "free_weight",
    manufacturer: "Padrao",
    model: "20 kg",
    unilateral: false,
  };

  const rowMachine: EquipmentSnapshot = {
    id: "row-machine-levels",
    name: "Remada maquina - nivel",
    type: "machine",
    manufacturer: "LifeFitness",
    model: "RS-01",
    unilateral: false,
  };

  return [
    {
      id: "set-squat-1",
      date: dateDaysFromNow(-28),
      workoutId: "elite-a",
      workoutName: "Elite A",
      exerciseId: "back-squat",
      exerciseName: "Back Squat",
      equipment: squatEquipment,
      plannedLoad: 78,
      executedLoad: 80,
      loadUnit: "kg",
      loadMode: "total",
      plannedReps: 6,
      executedReps: 6,
      plannedSets: 4,
      executedSetIndex: 1,
      side: "bilateral",
      effort: 7,
      technique: "boa",
      completed: true,
      warmup: false,
      validForProgression: true,
    },
    {
      id: "set-squat-2",
      date: dateDaysFromNow(-14),
      workoutId: "elite-a",
      workoutName: "Elite A",
      exerciseId: "back-squat",
      exerciseName: "Back Squat",
      equipment: squatEquipment,
      plannedLoad: 82,
      executedLoad: 82.5,
      loadUnit: "kg",
      loadMode: "total",
      plannedReps: 6,
      executedReps: 6,
      plannedSets: 4,
      executedSetIndex: 2,
      side: "bilateral",
      effort: 8,
      technique: "boa",
      completed: true,
      warmup: false,
      validForProgression: true,
    },
    {
      id: "set-squat-3",
      date: dateDaysFromNow(-5),
      workoutId: "elite-a",
      workoutName: "Elite A",
      exerciseId: "back-squat",
      exerciseName: "Back Squat",
      equipment: squatEquipment,
      plannedLoad: 85,
      executedLoad: 85,
      loadUnit: "kg",
      loadMode: "total",
      plannedReps: 6,
      executedReps: 6,
      plannedSets: 4,
      executedSetIndex: 3,
      side: "bilateral",
      effort: 8,
      technique: "boa",
      completed: true,
      warmup: false,
      validForProgression: true,
    },
    {
      id: "set-row-1",
      date: dateDaysFromNow(-21),
      workoutId: "elite-b",
      workoutName: "Elite B",
      exerciseId: "machine-row",
      exerciseName: "Remada maquina",
      equipment: rowMachine,
      plannedLoad: 8,
      executedLoad: 8,
      loadUnit: "level",
      plannedReps: 10,
      executedReps: 10,
      plannedSets: 3,
      executedSetIndex: 1,
      side: "bilateral",
      effort: 7,
      technique: "regular",
      completed: true,
      warmup: false,
      validForProgression: true,
      note: "Nivel do equipamento. Comparar apenas na mesma maquina.",
    },
    {
      id: "set-row-2",
      date: dateDaysFromNow(-7),
      workoutId: "elite-b",
      workoutName: "Elite B",
      exerciseId: "machine-row",
      exerciseName: "Remada maquina",
      equipment: rowMachine,
      plannedLoad: 8,
      executedLoad: 8,
      loadUnit: "level",
      plannedReps: 10,
      executedReps: 11,
      plannedSets: 3,
      executedSetIndex: 2,
      side: "bilateral",
      effort: 8,
      technique: "regular",
      completed: true,
      warmup: false,
      validForProgression: true,
      pain: {
        region: "ombro direito",
        level: 2,
      },
      note: "Desconforto leve relatado.",
    },
  ];
}

function createDefaultState(): StudentProfileStoreState {
  const profile = createDefaultProfile();
  return {
    profiles: {
      [profile.id]: profile,
    },
  };
}

async function readState(): Promise<StudentProfileStoreState> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    const initialState = createDefaultState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StudentProfileStoreState>;
    const profiles = parsed.profiles ?? {};

    if (!profiles[DEMO_STUDENT.id]) {
      const seeded = createDefaultProfile();
      const nextState = {
        profiles: {
          ...profiles,
          [seeded.id]: seeded,
        },
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    }

    return { profiles };
  } catch {
    const initialState = createDefaultState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }
}

async function writeState(nextState: StudentProfileStoreState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function hasProfilePermission(profile: StudentProfile, requesterId: string, role: StudentProfileRole) {
  if (role === "admin") return true;
  if (role === "student") return profile.id === requesterId;
  return profile.trainerId === requesterId;
}

function requireProfilePermission(profile: StudentProfile, requesterId: string, role: StudentProfileRole) {
  if (!hasProfilePermission(profile, requesterId, role)) {
    throw new Error("Voce nao tem permissao para acessar este perfil.");
  }
}

export async function getStudentProfile(
  studentId = DEMO_STUDENT.id,
  requesterId = DEMO_TRAINER.id,
  role: StudentProfileRole = "trainer"
) {
  const state = await readState();
  const profile = state.profiles[studentId];

  if (!profile) {
    throw new Error("Perfil do aluno nao encontrado.");
  }

  requireProfilePermission(profile, requesterId, role);
  return profile;
}

export async function listStudentProfilesForTrainer(
  trainerId = DEMO_TRAINER.id,
  requesterId = trainerId,
  role: StudentProfileRole = "trainer"
) {
  const state = await readState();
  return Object.values(state.profiles)
    .filter((profile) => profile.trainerId === trainerId)
    .filter((profile) => hasProfilePermission(profile, requesterId, role))
    .sort((first, second) => first.registration.fullName.localeCompare(second.registration.fullName));
}

export async function createStudentProfile(
  input: CreateStudentProfileInput,
  actorId = input.trainerId,
  actorRole: StudentProfileRole = "trainer"
) {
  if (actorRole === "student") {
    throw new Error("Aluno nao pode cadastrar outro aluno.");
  }
  if (actorRole === "trainer" && actorId !== input.trainerId) {
    throw new Error("Voce nao tem permissao para cadastrar aluno para outro personal.");
  }

  const state = await readState();

  // Validação de limite Freemium (1 aluno ativo no plano Free)
  const currentTrainerStudents = Object.values(state.profiles).filter(
    (p) => p.trainerId === input.trainerId && p.status === "ativo"
  );
  const entitlementCheck = await validateStudentAdditionAllowed(
    input.trainerId,
    currentTrainerStudents.length
  );
  if (!entitlementCheck.allowed) {
    throw new Error(
      entitlementCheck.reason ||
        "Limite de alunos do plano gratuito atingido. Faça o upgrade para o Plano Pro."
    );
  }

  const now = new Date().toISOString();
  const email = input.email?.trim().toLowerCase() || undefined;
  const phone = input.phone ? formatPhoneInput(input.phone) : undefined;
  const whatsapp = input.whatsapp ? formatPhoneInput(input.whatsapp) : phone;

  if (
    email &&
    Object.values(state.profiles).some(
      (profile) =>
        profile.trainerId === input.trainerId &&
        profile.registration.contact.email === email
    )
  ) {
    throw new Error("Ja existe um aluno cadastrado com este e-mail.");
  }

  const registration: StudentRegistration = {
    fullName: input.fullName.trim(),
    birthDate: input.birthDate.trim(),
    mainGoal: input.mainGoal?.trim() || "Objetivo a definir",
    contact: {
      phone,
      whatsapp,
      email,
    },
    administrativeNotes: input.administrativeNotes?.trim() || undefined,
    updatedAt: now,
    updatedBy: actorId,
  };

  const validation = validateRegistration(registration);
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }

  const profile: StudentProfile = {
    id: createId("student"),
    trainerId: input.trainerId,
    registration,
    status: "aguardando_inicio",
    followUp: {
      startedAt: now,
      statusUpdatedAt: now,
      lastActivityAt: "",
      lastTrainingAt: "",
      nextSessionAt: "",
      nextAssessmentAt: dateDaysFromNow(30),
      plannedTrainingFrequency: 0,
      completedTrainingFrequency: 0,
      currentWorkoutName: "",
      currentWorkoutStartedAt: "",
      currentWorkoutExpiresAt: "",
      pendingFeedbacks: 0,
    },
    anamnesis: {
      status: "nao_iniciada",
      versions: [],
      nextUpdateAt: dateDaysFromNow(30),
    },
    frequency: {
      plannedSessions: 0,
      completedSessions: 0,
      absences: 0,
      cancellations: 0,
      periodLabel: "Inicio do acompanhamento",
    },
    restrictions: [],
    documents: [],
    bodyEvolution: [],
    executedSets: [],
    access: {
      accountStatus: "not_invited",
    },
    communication: {
      unreadFromStudent: 0,
      unreadFromTrainer: 0,
    },
    privateTrainerNotes: input.administrativeNotes?.trim()
      ? [input.administrativeNotes.trim()]
      : [],
    updatedAt: now,
    audit: [
      makeAudit(
        "created",
        actorId,
        actorRole,
        "Aluno cadastrado pelo personal."
      ),
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [profile.id]: profile,
    },
  });

  return profile;
}

export function calculateAge(birthDate: string, referenceDate = new Date()) {
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  let age = referenceDate.getFullYear() - parsed.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsed.getMonth();
  const dayDiff = referenceDate.getDate() - parsed.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function normalizePhone(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatPhoneInput(value: string) {
  const digits = normalizePhone(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidEmail(value?: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getWhatsAppUrl(value?: string, prefilledMessage?: string) {
  const digits = normalizePhone(value);
  if (digits.length < 10) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (!/^\d{12,13}$/.test(withCountry)) return null;

  const base = `https://wa.me/${withCountry}`;
  return prefilledMessage ? `${base}?text=${encodeURIComponent(prefilledMessage)}` : base;
}

export function validateRegistration(registration: StudentRegistration): RegistrationValidationResult {
  const errors: string[] = [];
  const name = registration.fullName.trim();
  const phone = normalizePhone(registration.contact.phone);
  const whatsapp = normalizePhone(registration.contact.whatsapp);
  const emergencyPhone = normalizePhone(registration.contact.emergencyPhone);
  const age = calculateAge(registration.birthDate);

  if (name.length < 3) errors.push("Informe o nome completo.");
  if (!age || age > 120) errors.push("Informe uma data de nascimento valida.");
  if (registration.contact.email && !isValidEmail(registration.contact.email)) {
    errors.push("Informe um e-mail valido.");
  }
  if (registration.contact.phone && phone.length < 10) {
    errors.push("Informe um telefone valido.");
  }
  if (registration.contact.whatsapp && whatsapp.length < 10) {
    errors.push("Informe um WhatsApp valido.");
  }
  if (registration.contact.emergencyPhone && emergencyPhone.length < 10) {
    errors.push("Informe um telefone de emergencia valido.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function getChangedRegistrationFields(previous: StudentRegistration, next: StudentRegistration) {
  const changed: string[] = [];

  const directFields: (keyof Omit<StudentRegistration, "contact" | "secondaryGoals">)[] = [
    "fullName",
    "avatar",
    "birthDate",
    "mainGoal",
    "gender",
    "profession",
    "address",
    "administrativeNotes",
  ];

  directFields.forEach((field) => {
    if ((previous[field] ?? "") !== (next[field] ?? "")) changed.push(field);
  });

  if ((previous.secondaryGoals ?? []).join("|") !== (next.secondaryGoals ?? []).join("|")) {
    changed.push("secondaryGoals");
  }

  (Object.keys(next.contact) as (keyof StudentContact)[]).forEach((field) => {
    if ((previous.contact[field] ?? "") !== (next.contact[field] ?? "")) changed.push(`contact.${field}`);
  });

  return changed;
}

export async function saveStudentRegistration(
  studentId: string,
  registration: StudentRegistration,
  actorId = DEMO_TRAINER.id,
  actorRole: StudentProfileRole = "trainer"
) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, actorRole);

  const sanitized: StudentRegistration = {
    ...registration,
    fullName: registration.fullName.trim(),
    mainGoal: registration.mainGoal.trim(),
    profession: registration.profession?.trim(),
    address: registration.address?.trim(),
    administrativeNotes:
      actorRole === "student"
        ? profile.registration.administrativeNotes
        : registration.administrativeNotes?.trim(),
    contact: {
      phone: registration.contact.phone ? formatPhoneInput(registration.contact.phone) : undefined,
      whatsapp: registration.contact.whatsapp ? formatPhoneInput(registration.contact.whatsapp) : undefined,
      email: registration.contact.email?.trim().toLowerCase(),
      emergencyName: registration.contact.emergencyName?.trim(),
      emergencyPhone: registration.contact.emergencyPhone
        ? formatPhoneInput(registration.contact.emergencyPhone)
        : undefined,
    },
  };

  const validation = validateRegistration(sanitized);
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }

  const changedFields = getChangedRegistrationFields(profile.registration, sanitized);
  const now = new Date().toISOString();

  const updatedProfile: StudentProfile = {
    ...profile,
    registration: {
      ...sanitized,
      updatedAt: now,
      updatedBy: actorId,
    },
    updatedAt: now,
    audit: [
      makeAudit(
        "registration_updated",
        actorId,
        actorRole,
        changedFields.length > 0
          ? `Cadastro atualizado. Campos alterados: ${changedFields.join(", ")}.`
          : "Cadastro salvo sem alteracao de campos."
      ),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return updatedProfile;
}

export async function updateStudentStatus(
  studentId: string,
  nextStatus: StudentStatus,
  actorId = DEMO_TRAINER.id,
  actorRole: StudentProfileRole = "trainer"
) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, actorRole);

  const now = new Date().toISOString();
  const updatedProfile: StudentProfile = {
    ...profile,
    status: nextStatus,
    followUp: {
      ...profile.followUp,
      statusUpdatedAt: now,
    },
    updatedAt: now,
    audit: [
      makeAudit(
        "status_changed",
        actorId,
        actorRole,
        `Status alterado para ${getStudentStatusLabel(nextStatus)} sem apagar historico.`
      ),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return updatedProfile;
}

export async function generateAnamnesisInvite(
  studentId: string,
  actorId = DEMO_TRAINER.id,
  dueAt = dateDaysFromNow(7)
) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, "trainer");

  const now = new Date().toISOString();
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const invite: AnamnesisInvite = {
    id: createId("anamnesis-invite"),
    status: "active",
    createdAt: now,
    expiresAt: dateDaysFromNow(14),
    dueAt,
    delivery: profile.access.accountStatus === "active" ? "app" : "share_link",
    reminderCount: 0,
    tokenLast4: token.slice(-4),
  };

  const updatedProfile: StudentProfile = {
    ...profile,
    anamnesis: {
      ...profile.anamnesis,
      status: profile.anamnesis.status === "nao_iniciada" ? "nao_iniciada" : profile.anamnesis.status,
      activeInvite: invite,
    },
    updatedAt: now,
    audit: [
      makeAudit(
        "anamnesis_invite_created",
        actorId,
        "trainer",
        "Convite de anamnese gerado com validade e sem dados pessoais na URL."
      ),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return {
    profile: updatedProfile,
    invite,
    shareUrl: `crossplan://anamnesis/${invite.id}?token=${token}`,
  };
}

export async function sendAnamnesisReminder(studentId: string, actorId = DEMO_TRAINER.id) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, "trainer");

  if (!profile.anamnesis.activeInvite || profile.anamnesis.activeInvite.status !== "active") {
    throw new Error("Nao ha convite ativo para reenviar.");
  }

  const now = new Date().toISOString();
  const invite: AnamnesisInvite = {
    ...profile.anamnesis.activeInvite,
    reminderCount: profile.anamnesis.activeInvite.reminderCount + 1,
    lastReminderAt: now,
    delivery: "notification",
  };

  const updatedProfile: StudentProfile = {
    ...profile,
    anamnesis: {
      ...profile.anamnesis,
      activeInvite: invite,
    },
    updatedAt: now,
    audit: [
      makeAudit("anamnesis_reminder_sent", actorId, "trainer", "Lembrete de anamnese reenviado."),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return updatedProfile;
}

export async function cancelAnamnesisInvite(studentId: string, actorId = DEMO_TRAINER.id) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, "trainer");

  if (!profile.anamnesis.activeInvite || profile.anamnesis.activeInvite.status !== "active") {
    throw new Error("Nao ha convite ativo para cancelar.");
  }

  const now = new Date().toISOString();
  const updatedProfile: StudentProfile = {
    ...profile,
    anamnesis: {
      ...profile.anamnesis,
      activeInvite: {
        ...profile.anamnesis.activeInvite,
        status: "revoked",
        revokedAt: now,
      },
    },
    updatedAt: now,
    audit: [
      makeAudit("anamnesis_invite_revoked", actorId, "trainer", "Convite de anamnese revogado."),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return updatedProfile;
}

export async function markAnamnesisReviewed(studentId: string, trainerNote: string, actorId = DEMO_TRAINER.id) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, "trainer");

  const [latestVersion, ...previousVersions] = profile.anamnesis.versions;
  if (!latestVersion) throw new Error("Nao ha anamnese para revisar.");

  const now = new Date().toISOString();
  const reviewedVersion: AnamnesisVersion = {
    ...latestVersion,
    status: "revisada_pelo_treinador",
    reviewedAt: now,
    trainerReviewNote: trainerNote.trim() || latestVersion.trainerReviewNote,
    answers: latestVersion.answers.map((answer) => ({
      ...answer,
      reviewStatus: answer.reviewStatus ?? (answer.attention ? "acompanhar" : "confirmado"),
      reviewedAt: answer.reviewedAt ?? now,
      reviewedBy: answer.reviewedBy ?? actorId,
    })),
    checklist: latestVersion.checklist.map((item) => ({ ...item, done: true })),
  };

  const updatedProfile: StudentProfile = {
    ...profile,
    anamnesis: {
      ...profile.anamnesis,
      status: "revisada_pelo_treinador",
      versions: [reviewedVersion, ...previousVersions],
    },
    updatedAt: now,
    audit: [
      makeAudit(
        "anamnesis_reviewed",
        actorId,
        "trainer",
        "Anamnese revisada preservando respostas originais e observacoes do treinador."
      ),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return updatedProfile;
}

export async function requestAnamnesisUpdate(studentId: string, actorId = DEMO_TRAINER.id) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, "trainer");

  const now = new Date().toISOString();
  const updatedProfile: StudentProfile = {
    ...profile,
    anamnesis: {
      ...profile.anamnesis,
      status: "atualizacao_solicitada",
      nextUpdateAt: dateDaysFromNow(7),
    },
    updatedAt: now,
    audit: [
      makeAudit("anamnesis_update_requested", actorId, "trainer", "Atualizacao de anamnese solicitada ao aluno."),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return updatedProfile;
}

export async function revokeStudentSessions(studentId: string, actorId = DEMO_TRAINER.id) {
  const state = await readState();
  const profile = state.profiles[studentId];
  if (!profile) throw new Error("Perfil do aluno nao encontrado.");
  requireProfilePermission(profile, actorId, "trainer");

  const now = new Date().toISOString();
  const updatedProfile: StudentProfile = {
    ...profile,
    access: {
      ...profile.access,
      sessionsRevokedAt: now,
    },
    updatedAt: now,
    audit: [
      makeAudit("student_sessions_revoked", actorId, "trainer", "Sessoes ativas do aluno revogadas pelo treinador."),
      ...profile.audit,
    ],
  };

  await writeState({
    profiles: {
      ...state.profiles,
      [studentId]: updatedProfile,
    },
  });

  return updatedProfile;
}

export function buildChecklistFromAnswers(answers: AnamnesisQuestionAnswer[]): AnamnesisChecklistItem[] {
  return answers
    .filter((answer) => answer.attention || answer.unanswered)
    .map((answer) => ({
      id: `check-${answer.id}`,
      label: answer.unanswered ? `${answer.label}: confirmar resposta ausente` : answer.originalAnswer,
      sourceQuestionId: answer.id,
      priority: answer.attention ? "attention" : "normal",
      done: false,
    }));
}

export function getLatestAnamnesisVersion(profile: StudentProfile) {
  return profile.anamnesis.versions[0];
}

export function getStudentStatusLabel(status: StudentStatus) {
  return STUDENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getAnamnesisStatusLabel(status: AnamnesisStatus) {
  return ANAMNESIS_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function formatProfileDate(value?: string) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatProfileDateTime(value?: string) {
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

export function daysSince(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

export function daysUntil(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

export function formatRelativeDayCount(days: number | null, mode: "since" | "until") {
  if (days === null) return "Sem registro";
  if (days === 0) return mode === "since" ? "Hoje" : "Hoje";
  if (mode === "since") return `${days} dia${days === 1 ? "" : "s"} atras`;
  if (days < 0) return `${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"} vencido`;
  return `em ${days} dia${days === 1 ? "" : "s"}`;
}

export function calculateAdherence(frequency: StudentFrequency) {
  if (frequency.plannedSessions <= 0) return 0;
  return Math.round((frequency.completedSessions / frequency.plannedSessions) * 100);
}

export function calculateFollowUpDuration(startedAt: string) {
  const days = daysSince(startedAt);
  if (days === null) return "Sem inicio";
  if (days < 30) return `${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  return `${months} mes${months === 1 ? "" : "es"}`;
}

export function calculateSetVolume(set: ExecutedSet) {
  if (!set.validForProgression || set.warmup || !set.completed) return null;
  if (set.loadUnit !== "kg") return null;
  if (typeof set.executedLoad !== "number" || typeof set.executedReps !== "number") return null;
  return set.executedLoad * set.executedReps;
}

export function buildLoadEvolutionInsights(profile: StudentProfile): LoadEvolutionInsight[] {
  const grouped = new Map<string, ExecutedSet[]>();

  profile.executedSets.forEach((set) => {
    if (!set.validForProgression || set.warmup || !set.completed) return;

    const key = [
      set.exerciseId,
      set.equipment.id,
      set.loadUnit,
      set.loadMode ?? "default",
      set.side ?? "bilateral",
    ].join("|");

    grouped.set(key, [...(grouped.get(key) ?? []), set]);
  });

  return [...grouped.entries()]
    .map(([key, sets]) => {
      const sorted = [...sets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const records = sorted.map((set) => ({
        date: set.date,
        load: set.executedLoad,
        reps: set.executedReps,
        volume: calculateSetVolume(set) ?? undefined,
        effort: set.effort,
      }));

      const compatibleRecords = sorted.length;
      const volumes = records.map((record) => record.volume).filter((value): value is number => typeof value === "number");
      const loads = records.map((record) => record.load).filter((value): value is number => typeof value === "number");
      const bestVolume = volumes.length > 0 ? Math.max(...volumes) : undefined;
      const bestLoad = loads.length > 0 ? Math.max(...loads) : undefined;
      const lastVolume = records[records.length - 1]?.volume;
      const firstVolume = records[0]?.volume;
      const lastLoad = records[records.length - 1]?.load;
      const progressPercent =
        firstVolume && lastVolume ? Math.round(((lastVolume - firstVolume) / firstVolume) * 100) : undefined;
      const hasPainAlert = sorted.some((set) => Boolean(set.pain));

      let trendLabel = "Dados insuficientes para tendencia";
      let dataQuality: LoadEvolutionInsight["dataQuality"] = compatibleRecords >= 3 ? "compatible" : "insufficient";

      if (compatibleRecords >= 3 && firstVolume && lastVolume) {
        if (lastVolume > firstVolume) trendLabel = "Evolucao compativel";
        else if (lastVolume < firstVolume) trendLabel = "Queda recente";
        else trendLabel = "Estavel";
      } else if (compatibleRecords >= 3 && bestLoad && lastLoad) {
        trendLabel = "Comparacao por nivel/carga registrada";
      }

      if (hasPainAlert) {
        dataQuality = "attention";
      }

      return {
        id: key,
        exerciseName: first.exerciseName,
        equipmentName: first.equipment.name,
        unit: first.loadUnit,
        compatibleRecords,
        lastDate: last.date,
        bestLoad,
        bestVolume,
        lastLoad,
        lastVolume,
        progressPercent,
        trendLabel,
        hasPainAlert,
        dataQuality,
        records,
      };
    })
    .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
}

export function buildStudentAlerts(profile: StudentProfile) {
  const alerts: {
    id: string;
    title: string;
    detail: string;
    tone: "info" | "warning" | "danger";
    section: StudentProfileSection;
  }[] = [];

  if (profile.anamnesis.status === "aguardando_revisao") {
    alerts.push({
      id: "anamnesis-review",
      title: "Anamnese aguardando revisao",
      detail: "Leia as respostas antes da proxima avaliacao presencial.",
      tone: "warning",
      section: "anamnesis",
    });
  }

  const nextAssessmentDays = daysUntil(profile.followUp.nextAssessmentAt);
  if (nextAssessmentDays !== null && nextAssessmentDays < 0) {
    alerts.push({
      id: "assessment-expired",
      title: "Avaliacao vencida",
      detail: "Agende uma nova avaliacao fisica para atualizar os dados.",
      tone: "danger",
      section: "assessments",
    });
  }

  const workoutExpiresDays = daysUntil(profile.followUp.currentWorkoutExpiresAt);
  if (workoutExpiresDays !== null && workoutExpiresDays <= 7) {
    alerts.push({
      id: "workout-expiring",
      title: "Treino proximo do vencimento",
      detail: `Validade ${formatRelativeDayCount(workoutExpiresDays, "until")}.`,
      tone: "warning",
      section: "workouts",
    });
  }

  const daysWithoutTraining = daysSince(profile.followUp.lastTrainingAt);
  if (daysWithoutTraining !== null && daysWithoutTraining >= 5) {
    alerts.push({
      id: "absence",
      title: "Ausencia recente",
      detail: `Ultimo treino ${formatRelativeDayCount(daysWithoutTraining, "since")}.`,
      tone: "warning",
      section: "frequency",
    });
  }

  const painSet = profile.executedSets.find((set) => set.pain);
  if (painSet?.pain) {
    alerts.push({
      id: "pain-load",
      title: "Dor registrada no treino",
      detail: `${painSet.pain.region}, nivel ${painSet.pain.level}/10.`,
      tone: "danger",
      section: "loads",
    });
  }

  const pendingDocument = profile.documents.find((document) => document.status === "pending_review");
  if (pendingDocument) {
    alerts.push({
      id: "document-review",
      title: "Documento aguardando analise",
      detail: pendingDocument.title,
      tone: "warning",
      section: "documents",
    });
  }

  const activeRestriction = profile.restrictions.find((restriction) => restriction.active);
  if (activeRestriction) {
    alerts.push({
      id: "restriction",
      title: "Restricao registrada",
      detail: activeRestriction.label,
      tone: activeRestriction.severity === "critical" ? "danger" : "warning",
      section: "documents",
    });
  }

  return alerts;
}

export async function resetStudentProfileStoreForTests() {
  await writeState(createDefaultState());
}
