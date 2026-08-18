import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  calculateCompositionProtocol,
  type BioimpedanceMeasurement,
  type BodyCompositionProtocolId,
  type BodyCompositionProtocolSnapshot,
  type CompositionProtocolMeasurements,
} from "@/services/body-composition-protocols";
import {
  calculateFunctionalTestSnapshot,
  type FunctionalScreening,
  type FunctionalTestExecution,
} from "@/services/functional-test-catalog";
import {
  calculateCardioProtocolSnapshot,
  getCardioProtocolDefinition,
  type CardioProtocolId,
  type CardioTestExecution,
} from "@/services/cardiorespiratory-protocols";
import { DEMO_STUDENT, DEMO_TRAINER } from "@/services/feedback-store";

export { DEMO_STUDENT, DEMO_TRAINER };

export type AssessmentStatus = "rascunho" | "em_andamento" | "concluida";
export type AssessmentType = "inicial" | "periodica" | "retorno" | "final";
export type AssessmentRole = "student" | "trainer";
export type Sex = "male" | "female";
export type CompositionMethod = "bioimpedancia" | "dobras" | "manual" | "outro";
export type SkinfoldProtocol = "jackson-pollock-3" | "jackson-pollock-7";
export type CardioProtocol = CardioProtocolId;
export type PhotoView = "frontal" | "posterior" | "lateral_direita" | "lateral_esquerda" | "adicional";
export type PosturalRegion =
  | "cabeca"
  | "cervical"
  | "ombros"
  | "escapulas"
  | "coluna_toracica"
  | "coluna_lombar"
  | "pelve"
  | "quadril"
  | "joelhos"
  | "tornozelos"
  | "pes";

export type AssessmentStepId =
  | "general"
  | "anamnesis"
  | "composition"
  | "perimeters"
  | "skinfolds"
  | "cardio"
  | "functional"
  | "photos"
  | "conclusion";

export type AssessmentStepDefinition = {
  id: AssessmentStepId;
  title: string;
  shortTitle: string;
  required: boolean;
};

export type AssessmentStepState = {
  complete: boolean;
  pending: string[];
  updatedAt?: string;
};

export type GeneralInfo = {
  mainGoal?: string;
  secondaryGoals?: string;
  experienceLevel?: "iniciante" | "intermediario" | "avancado";
  weeklyTrainingFrequency?: number;
  profession?: string;
  dailyRoutine?: string;
};

export type Anamnesis = {
  sleepQuality?: "ruim" | "regular" | "boa" | "excelente";
  stressLevel?: "baixo" | "moderado" | "alto";
  waterIntakeLiters?: number;
  nutritionNotes?: string;
  smoker?: boolean;
  alcoholUse?: "nao" | "ocasional" | "frequente";
  otherActivities?: boolean;
  otherActivitiesDetails?: string;
  sportsHistory?: string;
  diagnosedDiseases?: boolean;
  diagnosedDiseasesDetails?: string;
  surgeries?: boolean;
  surgeriesDetails?: string;
  previousInjuries?: boolean;
  previousInjuriesDetails?: string;
  currentPain?: boolean;
  currentPainDetails?: string;
  medications?: boolean;
  medicationsDetails?: string;
  limitations?: string;
  medicalRestrictions?: boolean;
  medicalRestrictionsDetails?: string;
  needsMedicalClearance?: boolean;
  notes?: string;
};

export type BodyComposition = {
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  bodyFatPercent?: number;
  fatMassKg?: number;
  leanMassKg?: number;
  targetBodyFatPercent?: number;
  muscleMassKg?: number;
  totalBodyWaterLiters?: number;
  boneMassKg?: number;
  visceralFat?: number;
  metabolicAge?: number;
  basalMetabolicRateKcal?: number;
  method?: CompositionMethod;
  methodDetails?: string;
  protocolId?: BodyCompositionProtocolId;
  protocolMeasurements?: CompositionProtocolMeasurements;
  bioimpedance?: BioimpedanceMeasurement;
  protocolSnapshot?: BodyCompositionProtocolSnapshot;
  manuallyEditedFields?: string[];
  notes?: string;
};

export type PerimeterKey =
  | "neck"
  | "shoulders"
  | "chest"
  | "waist"
  | "abdomen"
  | "hip"
  | "rightArmRelaxed"
  | "leftArmRelaxed"
  | "rightArmFlexed"
  | "leftArmFlexed"
  | "rightForearm"
  | "leftForearm"
  | "rightThigh"
  | "leftThigh"
  | "rightCalf"
  | "leftCalf";

export type PerimeterMeasurement = {
  valueCm?: number;
  notes?: string;
};

export type Perimeters = Partial<Record<PerimeterKey, PerimeterMeasurement>>;

export type SkinfoldPoint =
  | "triceps"
  | "biceps"
  | "subscapular"
  | "chest"
  | "midaxillary"
  | "suprailiac"
  | "abdominal"
  | "thigh"
  | "calf";

export type SkinfoldMeasurement = {
  attempts: { valueMm?: number; invalid?: boolean }[];
  notes?: string;
};

export type Skinfolds = {
  protocol?: SkinfoldProtocol;
  points: Partial<Record<SkinfoldPoint, SkinfoldMeasurement>>;
  resultBodyFatPercent?: number;
  formulaReference?: string;
  notes?: string;
};

export type CardioTest = CardioTestExecution;

export type FunctionalTest = FunctionalTestExecution;

export type PhotoConsent = {
  accepted: boolean;
  acceptedAt?: string;
  termVersion: string;
  grantedByUserId?: string;
  scopes: {
    capture: boolean;
    storage: boolean;
    professionalUse: boolean;
    comparison: boolean;
    studentAccess: boolean;
  };
};

export type PosturalAnnotation = {
  id: string;
  type: "point" | "line";
  region: PosturalRegion;
  side?: "direito" | "esquerdo" | "bilateral" | "centro";
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  note?: string;
  createdAt: string;
};

export type AssessmentPhoto = {
  id: string;
  view: PhotoView;
  uri: string;
  width?: number;
  height?: number;
  capturedAt: string;
  originalPreserved: true;
  consentTermVersion: string;
  notes?: string;
  annotations: PosturalAnnotation[];
};

export type AssessmentConclusion = {
  attentionPoints?: string;
  definedGoals?: string;
  trainerRecommendations?: string;
  reportSharedWithStudent?: boolean;
  releaseToStudent?: boolean;
  notes?: string;
};

export type AssessmentAuditEvent = {
  id: string;
  assessmentId: string;
  action: "created" | "updated" | "completed" | "reopened" | "deleted" | "photo_changed" | "consent_changed" | "viewed";
  actorId: string;
  actorRole: AssessmentRole;
  createdAt: string;
  details?: string;
};

export type PhysicalAssessment = {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  trainerId: string;
  trainerName: string;
  type: AssessmentType;
  status: AssessmentStatus;
  sex: Sex;
  birthDate?: string;
  assessedAt: string;
  nextAssessmentAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
  steps: Record<AssessmentStepId, AssessmentStepState>;
  general: GeneralInfo;
  anamnesis: Anamnesis;
  composition: BodyComposition;
  perimeters: Perimeters;
  skinfolds: Skinfolds;
  cardioTests: CardioTest[];
  functionalScreening?: FunctionalScreening;
  functionalTests: FunctionalTest[];
  photoConsent?: PhotoConsent;
  photos: AssessmentPhoto[];
  conclusion: AssessmentConclusion;
  audit: AssessmentAuditEvent[];
};

type AssessmentStoreState = {
  assessments: PhysicalAssessment[];
};

export type AssessmentSummary = {
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
  pendingCount: number;
  pendingLabels: string[];
};

export const ASSESSMENT_STEPS: AssessmentStepDefinition[] = [
  { id: "general", title: "Informações gerais", shortTitle: "Geral", required: true },
  { id: "anamnesis", title: "Anamnese", shortTitle: "Anamnese", required: true },
  { id: "composition", title: "Composição corporal", shortTitle: "Composição", required: true },
  { id: "perimeters", title: "Perímetros", shortTitle: "Perímetros", required: false },
  { id: "skinfolds", title: "Dobras cutâneas", shortTitle: "Dobras", required: false },
  { id: "cardio", title: "Avaliação cardiorrespiratória", shortTitle: "Cardio", required: false },
  { id: "functional", title: "Neuromotora e funcional", shortTitle: "Funcional", required: false },
  { id: "photos", title: "Fotos e Postura", shortTitle: "Fotos", required: false },
  { id: "conclusion", title: "Observações e conclusão", shortTitle: "Conclusão", required: true },
];

export const PHOTO_VIEWS: { id: PhotoView; label: string; instruction: string }[] = [
  { id: "frontal", label: "Frontal", instruction: "Corpo inteiro de frente, postura natural e pés alinhados." },
  { id: "posterior", label: "Posterior", instruction: "Corpo inteiro de costas, ombros relaxados e postura natural." },
  { id: "lateral_direita", label: "Lateral direita", instruction: "Perfil direito, olhar à frente e braços relaxados." },
  { id: "lateral_esquerda", label: "Lateral esquerda", instruction: "Perfil esquerdo, repetir distância e enquadramento." },
];

export const PERIMETER_LABELS: Record<PerimeterKey, string> = {
  neck: "Pescoço",
  shoulders: "Ombros",
  chest: "Tórax",
  waist: "Cintura",
  abdomen: "Abdômen",
  hip: "Quadril",
  rightArmRelaxed: "Braço direito relaxado",
  leftArmRelaxed: "Braço esquerdo relaxado",
  rightArmFlexed: "Braço direito contraído",
  leftArmFlexed: "Braço esquerdo contraído",
  rightForearm: "Antebraço direito",
  leftForearm: "Antebraço esquerdo",
  rightThigh: "Coxa direita",
  leftThigh: "Coxa esquerda",
  rightCalf: "Panturrilha direita",
  leftCalf: "Panturrilha esquerda",
};

export const SKINFOLD_LABELS: Record<SkinfoldPoint, string> = {
  triceps: "Tríceps",
  biceps: "Bíceps",
  subscapular: "Subescapular",
  chest: "Peitoral",
  midaxillary: "Axilar média",
  suprailiac: "Supra-ilíaca",
  abdominal: "Abdominal",
  thigh: "Coxa",
  calf: "Panturrilha",
};

export const POSTURAL_REGION_LABELS: Record<PosturalRegion, string> = {
  cabeca: "Cabeça",
  cervical: "Cervical",
  ombros: "Ombros",
  escapulas: "Escápulas",
  coluna_toracica: "Coluna torácica",
  coluna_lombar: "Coluna lombar",
  pelve: "Pelve",
  quadril: "Quadril",
  joelhos: "Joelhos",
  tornozelos: "Tornozelos",
  pes: "Pés",
};

const STORAGE_KEY = "@indigo/assessment-store/v1";
const CONSENT_TERM_VERSION = "2026-08-12.v1";

const defaultState: AssessmentStoreState = {
  assessments: [],
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time) : undefined;
}

async function readState(): Promise<AssessmentStoreState> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<AssessmentStoreState>;
    return {
      assessments: parsed.assessments ?? [],
    };
  } catch {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
}

async function writeState(nextState: AssessmentStoreState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function sortByAssessedAt(items: PhysicalAssessment[]) {
  return [...items].sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
}

function hasPermission(assessment: PhysicalAssessment, userId: string, role: AssessmentRole) {
  if (assessment.deletedAt) return false;
  if (role === "student") return assessment.studentId === userId && assessment.conclusion.releaseToStudent === true;
  return assessment.trainerId === userId;
}

function makeAudit(
  assessmentId: string,
  action: AssessmentAuditEvent["action"],
  actorId: string,
  actorRole: AssessmentRole,
  details?: string
): AssessmentAuditEvent {
  return {
    id: createId("audit"),
    assessmentId,
    action,
    actorId,
    actorRole,
    createdAt: new Date().toISOString(),
    details,
  };
}

function emptySteps(): Record<AssessmentStepId, AssessmentStepState> {
  return ASSESSMENT_STEPS.reduce((acc, step) => {
    acc[step.id] = { complete: false, pending: [] };
    return acc;
  }, {} as Record<AssessmentStepId, AssessmentStepState>);
}

export function formatAssessmentDate(value?: string) {
  if (!value) return "Não informado";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatAssessmentDateTime(value?: string) {
  if (!value) return "Não informado";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getAssessmentStatusLabel(status: AssessmentStatus) {
  const labels: Record<AssessmentStatus, string> = {
    rascunho: "Rascunho",
    em_andamento: "Em andamento",
    concluida: "Concluída",
  };
  return labels[status];
}

export function getAssessmentTypeLabel(type: AssessmentType) {
  const labels: Record<AssessmentType, string> = {
    inicial: "Inicial",
    periodica: "Periódica",
    retorno: "Retorno",
    final: "Final",
  };
  return labels[type];
}

export function normalizeDecimal(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function calculateBodyComposition(input: BodyComposition): BodyComposition {
  const next = { ...input };
  const manual = new Set(input.manuallyEditedFields ?? []);
  const heightM = input.heightCm ? input.heightCm / 100 : undefined;

  if (input.weightKg && heightM && heightM > 0 && !manual.has("bmi")) {
    next.bmi = round(input.weightKg / (heightM * heightM), 1);
  }

  if (input.weightKg && typeof input.bodyFatPercent === "number") {
    if (!manual.has("fatMassKg")) {
      next.fatMassKg = round(input.weightKg * (input.bodyFatPercent / 100), 1);
    }
    if (!manual.has("leanMassKg")) {
      next.leanMassKg = round(input.weightKg - (next.fatMassKg ?? 0), 1);
    }
  }

  return next;
}

export function calculateBmrMifflin(weightKg?: number, heightCm?: number, age?: number, sex?: Sex) {
  if (!weightKg || !heightCm || !age || !sex) return undefined;
  const sexOffset = sex === "male" ? 5 : -161;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
}

export function getAge(birthDate?: string, referenceDate = new Date()) {
  const birth = parseDate(birthDate);
  if (!birth) return undefined;
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function averageSkinfold(measurement?: SkinfoldMeasurement) {
  if (!measurement) return undefined;
  const valid = measurement.attempts
    .filter((attempt) => !attempt.invalid && typeof attempt.valueMm === "number")
    .map((attempt) => attempt.valueMm as number);

  if (valid.length === 0) return undefined;
  return round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 1);
}

function sumSkinfolds(points: Partial<Record<SkinfoldPoint, SkinfoldMeasurement>>, keys: SkinfoldPoint[]) {
  const values = keys.map((key) => averageSkinfold(points[key]));
  if (values.some((value) => typeof value !== "number")) return undefined;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function calculateSkinfoldBodyFat(
  protocol: SkinfoldProtocol | undefined,
  sex: Sex,
  age: number | undefined,
  points: Partial<Record<SkinfoldPoint, SkinfoldMeasurement>>
) {
  if (!protocol || !age) return undefined;

  let density: number | undefined;
  let reference = "";

  if (protocol === "jackson-pollock-3" && sex === "male") {
    const sum = sumSkinfolds(points, ["chest", "abdominal", "thigh"]);
    if (!sum) return undefined;
    // Jackson & Pollock 3-site male body density equation, converted with Siri body-fat equation.
    density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * age;
    reference = "Jackson & Pollock 3 dobras masculino + Siri";
  }

  if (protocol === "jackson-pollock-3" && sex === "female") {
    const sum = sumSkinfolds(points, ["triceps", "suprailiac", "thigh"]);
    if (!sum) return undefined;
    // Jackson & Pollock 3-site female body density equation, converted with Siri body-fat equation.
    density = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * age;
    reference = "Jackson & Pollock 3 dobras feminino + Siri";
  }

  if (protocol === "jackson-pollock-7") {
    const sum = sumSkinfolds(points, [
      "chest",
      "midaxillary",
      "triceps",
      "subscapular",
      "abdominal",
      "suprailiac",
      "thigh",
    ]);
    if (!sum) return undefined;
    if (sex === "male") {
      // Jackson & Pollock 7-site male body density equation, converted with Siri body-fat equation.
      density = 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * age;
      reference = "Jackson & Pollock 7 dobras masculino + Siri";
    } else {
      // Jackson & Pollock 7-site female body density equation, converted with Siri body-fat equation.
      density = 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * age;
      reference = "Jackson & Pollock 7 dobras feminino + Siri";
    }
  }

  if (!density) return undefined;

  return {
    bodyFatPercent: round(495 / density - 450, 1),
    formulaReference: reference,
  };
}

export function calculatePerimeterAsymmetry(
  right?: PerimeterMeasurement,
  left?: PerimeterMeasurement
) {
  if (!right?.valueCm || !left?.valueCm) return undefined;
  const diffCm = round(Math.abs(right.valueCm - left.valueCm), 1);
  const base = Math.max(right.valueCm, left.valueCm);
  return {
    diffCm,
    diffPercent: round((diffCm / base) * 100, 1),
    largerSide: right.valueCm > left.valueCm ? "direito" : left.valueCm > right.valueCm ? "esquerdo" : "igual",
  };
}

function validateGeneral(general: GeneralInfo) {
  const pending: string[] = [];
  if (!general.mainGoal?.trim()) pending.push("Objetivo principal");
  if (!general.experienceLevel) pending.push("Nível de experiência");
  if (!general.weeklyTrainingFrequency) pending.push("Frequência semanal");
  return pending;
}

function validateAnamnesis(anamnesis: Anamnesis) {
  const pending: string[] = [];
  if (!anamnesis.sleepQuality) pending.push("Qualidade do sono");
  if (!anamnesis.stressLevel) pending.push("Nível de estresse");
  if (anamnesis.previousInjuries && !anamnesis.previousInjuriesDetails?.trim()) pending.push("Detalhar lesões");
  if (anamnesis.currentPain && !anamnesis.currentPainDetails?.trim()) pending.push("Detalhar dores atuais");
  if (anamnesis.medications && !anamnesis.medicationsDetails?.trim()) pending.push("Detalhar medicamentos");
  if (anamnesis.surgeries && !anamnesis.surgeriesDetails?.trim()) pending.push("Detalhar cirurgias");
  if (anamnesis.medicalRestrictions && !anamnesis.medicalRestrictionsDetails?.trim()) pending.push("Detalhar restrições médicas");
  return pending;
}

function validateComposition(composition: BodyComposition) {
  const pending: string[] = [];
  if (!composition.weightKg) pending.push("Peso");
  if (!composition.heightCm) pending.push("Altura");
  if (!composition.protocolId) pending.push("Protocolo");
  if (composition.protocolSnapshot?.validation.errors.length) {
    pending.push(...composition.protocolSnapshot.validation.errors);
  }
  return pending;
}

function validateConclusion(conclusion: AssessmentConclusion) {
  const pending: string[] = [];
  if (!conclusion.definedGoals?.trim()) pending.push("Objetivos definidos");
  if (!conclusion.trainerRecommendations?.trim()) pending.push("Recomendações");
  return pending;
}

type LegacyCardioTest = {
  id?: string;
  protocol?: string;
  name?: string;
  durationMinutes?: number;
  distanceMeters?: number;
  restingHeartRate?: number;
  initialHeartRate?: number;
  finalHeartRate?: number;
  recoveryHeartRate?: number;
  perceivedExertion?: number;
  notes?: string;
};

function normalizeCardioExecution(rawTest: CardioTest | LegacyCardioTest, index: number, now: string): CardioTest {
  if ("protocolId" in rawTest && rawTest.protocolId) {
    const protocol = getCardioProtocolDefinition(rawTest.protocolId);
    return {
      ...rawTest,
      protocolVersion: rawTest.protocolVersion ?? protocol?.version ?? "legacy-cardio.v1",
      status: rawTest.status ?? "rascunho",
      order: typeof rawTest.order === "number" ? rawTest.order : index,
      config: {
        protocolName: protocol?.name,
        ...(rawTest.config ?? {}),
      },
      external: rawTest.external ?? {},
      stages: rawTest.stages ?? [],
      heartRateSamples: rawTest.heartRateSamples ?? [],
      recovery: rawTest.recovery ?? {},
      createdAt: rawTest.createdAt ?? now,
      updatedAt: rawTest.updatedAt ?? now,
    };
  }

  const legacy = rawTest as LegacyCardioTest;
  const legacyProtocol = legacy.protocol;
  const protocolId: CardioProtocolId =
    legacyProtocol === "rockport-1mile"
      ? "rockport-1mile"
      : legacyProtocol === "distancia-definida"
        ? "run-2400m"
        : legacyProtocol === "cooper-12min"
          ? "cooper-12min"
          : "custom-cardio";
  const protocol = getCardioProtocolDefinition(protocolId);
  const hasLegacyResult =
    typeof legacy.distanceMeters === "number" ||
    typeof legacy.durationMinutes === "number" ||
    typeof legacy.finalHeartRate === "number";

  return {
    id: legacy.id ?? createId("cardio"),
    protocolId,
    protocolVersion: protocol?.version ?? "legacy-cardio.v1",
    status: hasLegacyResult ? "concluido" : "rascunho",
    order: index,
    config: {
      protocolName: legacy.name ?? protocol?.name,
      customNotes: legacy.notes,
    },
    external: {
      distanceMeters: legacy.distanceMeters,
      timeMinutes: legacy.durationMinutes,
      heartRateRest: legacy.restingHeartRate,
      heartRateStart: legacy.initialHeartRate,
      heartRateEnd: legacy.finalHeartRate,
      heartRateRecovery1Min: legacy.recoveryHeartRate,
      rpeFinal: legacy.perceivedExertion,
      notes: legacy.notes,
    },
    stages: [],
    heartRateSamples: [],
    recovery: {
      immediateBpm: legacy.finalHeartRate,
      after1MinBpm: legacy.recoveryHeartRate,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function recalculateAssessment(assessment: PhysicalAssessment) {
  const now = new Date().toISOString();
  const age = getAge(assessment.birthDate, new Date(assessment.assessedAt));
  let composition = calculateBodyComposition({
    ...assessment.composition,
    basalMetabolicRateKcal:
      assessment.composition.manuallyEditedFields?.includes("basalMetabolicRateKcal")
        ? assessment.composition.basalMetabolicRateKcal
        : calculateBmrMifflin(
            assessment.composition.weightKg,
            assessment.composition.heightCm,
            age,
            assessment.sex
          ),
  });

  if (composition.protocolId) {
    const protocolSnapshot = calculateCompositionProtocol({
      protocolId: composition.protocolId,
      sex: assessment.sex,
      ageYears: age,
      weightKg: composition.weightKg,
      heightCm: composition.heightCm,
      targetBodyFatPercent: composition.targetBodyFatPercent,
      assessedAt: assessment.assessedAt,
      measurements: composition.protocolMeasurements,
    });
    const manual = new Set(composition.manuallyEditedFields ?? []);
    composition = {
      ...composition,
      method: composition.protocolId === "bioimpedance" ? "bioimpedancia" : "dobras",
      protocolSnapshot,
      bioimpedance: composition.protocolId === "bioimpedance" ? composition.protocolMeasurements?.bioimpedance : composition.bioimpedance,
      bodyFatPercent:
        typeof protocolSnapshot.results.bodyFatPercent === "number" && !manual.has("bodyFatPercent")
          ? protocolSnapshot.results.bodyFatPercent
          : composition.bodyFatPercent,
      bmi: typeof protocolSnapshot.results.bmi === "number" && !manual.has("bmi") ? protocolSnapshot.results.bmi : composition.bmi,
      fatMassKg:
        typeof protocolSnapshot.results.fatMassKg === "number" && !manual.has("fatMassKg")
          ? protocolSnapshot.results.fatMassKg
          : composition.fatMassKg,
      leanMassKg:
        typeof protocolSnapshot.results.leanMassKg === "number" && !manual.has("leanMassKg")
          ? protocolSnapshot.results.leanMassKg
          : composition.leanMassKg,
    };
  }

  composition = calculateBodyComposition(composition);

  const skinfoldResult = calculateSkinfoldBodyFat(
    assessment.skinfolds.protocol,
    assessment.sex,
    age,
    assessment.skinfolds.points
  );

  const skinfolds: Skinfolds = {
    ...assessment.skinfolds,
    resultBodyFatPercent: skinfoldResult?.bodyFatPercent,
    formulaReference: skinfoldResult?.formulaReference,
  };

  const cardioTests = assessment.cardioTests.map((test, index) => {
    const normalized = normalizeCardioExecution(test as CardioTest | LegacyCardioTest, index, now);
    try {
      return {
        ...normalized,
        snapshot: calculateCardioProtocolSnapshot(normalized, {
          ageYears: age,
          sex: assessment.sex,
          weightKg: composition.weightKg,
        }),
        updatedAt: now,
      };
    } catch {
      return normalized;
    }
  });
  const functionalTests = assessment.functionalTests.map((test, index) => {
    if (!test.testId) return test;
    try {
      return {
        ...test,
        order: typeof test.order === "number" ? test.order : index,
        snapshot: calculateFunctionalTestSnapshot(test),
        updatedAt: now,
      };
    } catch {
      return test;
    }
  });

  const steps: Record<AssessmentStepId, AssessmentStepState> = {
    ...assessment.steps,
    general: { complete: validateGeneral(assessment.general).length === 0, pending: validateGeneral(assessment.general), updatedAt: now },
    anamnesis: {
      complete: validateAnamnesis(assessment.anamnesis).length === 0,
      pending: validateAnamnesis(assessment.anamnesis),
      updatedAt: now,
    },
    composition: {
      complete: validateComposition(composition).length === 0,
      pending: validateComposition(composition),
      updatedAt: now,
    },
    perimeters: {
      complete: Object.values(assessment.perimeters).some((item) => typeof item?.valueCm === "number"),
      pending: [],
      updatedAt: now,
    },
    skinfolds: {
      complete: typeof skinfolds.resultBodyFatPercent === "number",
      pending: skinfolds.protocol && typeof skinfolds.resultBodyFatPercent !== "number" ? ["Medidas do protocolo"] : [],
      updatedAt: now,
    },
    cardio: {
      complete: cardioTests.some((test) => test.status === "concluido" && test.snapshot?.validation.isSavable),
      pending: cardioTests
        .filter((test) => test.status === "concluido" && test.snapshot && !test.snapshot.validation.isSavable)
        .map((test) => test.snapshot?.protocolName ?? "Teste cardiorrespiratório"),
      updatedAt: now,
    },
    functional: {
      complete: functionalTests.some((test) => test.status === "concluido" && test.snapshot?.validation.isSavable),
      pending: functionalTests
        .filter((test) => test.required && test.snapshot && !test.snapshot.validation.isSavable)
        .map((test) => test.snapshot?.testName ?? "Teste funcional"),
      updatedAt: now,
    },
    photos: {
      complete: PHOTO_VIEWS.every((view) => assessment.photos.some((photo) => photo.view === view.id)),
      pending: assessment.photoConsent?.accepted
        ? PHOTO_VIEWS.filter((view) => !assessment.photos.some((photo) => photo.view === view.id)).map((view) => view.label)
        : ["Consentimento"],
      updatedAt: now,
    },
    conclusion: {
      complete: validateConclusion(assessment.conclusion).length === 0,
      pending: validateConclusion(assessment.conclusion),
      updatedAt: now,
    },
  };

  const requiredComplete = ASSESSMENT_STEPS.filter((step) => step.required).every((step) => steps[step.id].complete);

  return {
    ...assessment,
    status: assessment.status === "concluida" ? assessment.status : requiredComplete ? "em_andamento" : assessment.status,
    composition,
    skinfolds,
    cardioTests,
    functionalTests,
    steps,
    updatedAt: now,
  };
}

export function getAssessmentSummary(assessment: PhysicalAssessment): AssessmentSummary {
  const completedSteps = ASSESSMENT_STEPS.filter((step) => assessment.steps[step.id].complete).length;
  const pendingLabels = ASSESSMENT_STEPS.flatMap((step) =>
    assessment.steps[step.id].pending.map((pending) => `${step.shortTitle}: ${pending}`)
  );
  return {
    completedSteps,
    totalSteps: ASSESSMENT_STEPS.length,
    progressPercent: Math.round((completedSteps / ASSESSMENT_STEPS.length) * 100),
    pendingCount: pendingLabels.length,
    pendingLabels,
  };
}

export async function createAssessmentDraft(input?: Partial<PhysicalAssessment>) {
  const now = new Date().toISOString();
  const assessedAt = input?.assessedAt ?? now;
  const nextAssessmentAt = input?.nextAssessmentAt ?? addMonths(new Date(assessedAt), 3).toISOString();
  const id = createId("assessment");
  const draft: PhysicalAssessment = recalculateAssessment({
    id,
    studentId: input?.studentId ?? DEMO_STUDENT.id,
    studentName: input?.studentName ?? DEMO_STUDENT.name,
    studentAvatar: input?.studentAvatar ?? DEMO_STUDENT.avatar,
    trainerId: input?.trainerId ?? DEMO_TRAINER.id,
    trainerName: input?.trainerName ?? DEMO_TRAINER.name,
    type: input?.type ?? "inicial",
    status: "rascunho",
    sex: input?.sex ?? "male",
    birthDate: input?.birthDate ?? "1996-06-15",
    assessedAt,
    nextAssessmentAt,
    createdAt: now,
    updatedAt: now,
    steps: emptySteps(),
    general: {},
    anamnesis: {},
    composition: {},
    perimeters: {},
    skinfolds: { points: {} },
    cardioTests: [],
    functionalScreening: {},
    functionalTests: [],
    photos: [],
    conclusion: {},
    audit: [makeAudit(id, "created", input?.trainerId ?? DEMO_TRAINER.id, "trainer", "Avaliação criada como rascunho.")],
  });

  const state = await readState();
  await writeState({ assessments: [draft, ...state.assessments] });
  return draft;
}

export async function listAssessmentsForTrainer(trainerId = DEMO_TRAINER.id) {
  const state = await readState();
  return sortByAssessedAt(state.assessments.filter((item) => item.trainerId === trainerId && !item.deletedAt));
}

export async function listAssessmentsForStudent(studentId = DEMO_STUDENT.id) {
  const state = await readState();
  return sortByAssessedAt(
    state.assessments.filter((item) => item.studentId === studentId && item.conclusion.releaseToStudent && !item.deletedAt)
  );
}

export async function getAssessmentById(
  assessmentId: string,
  userId = DEMO_TRAINER.id,
  role: AssessmentRole = "trainer"
) {
  const state = await readState();
  const assessment = state.assessments.find((item) => item.id === assessmentId);
  if (!assessment || !hasPermission(assessment, userId, role)) {
    throw new Error("Você não tem permissão para acessar esta avaliação.");
  }
  return assessment;
}

export async function saveAssessment(
  assessmentId: string,
  patch: Partial<PhysicalAssessment>,
  actorId = DEMO_TRAINER.id,
  actorRole: AssessmentRole = "trainer",
  details = "Avaliação atualizada.",
  action: AssessmentAuditEvent["action"] = "updated"
) {
  const state = await readState();
  let updatedAssessment: PhysicalAssessment | undefined;

  const assessments = state.assessments.map((assessment) => {
    if (assessment.id !== assessmentId || !hasPermission(assessment, actorId, actorRole)) return assessment;

    updatedAssessment = recalculateAssessment({
      ...assessment,
      ...patch,
      id: assessment.id,
      audit: [...assessment.audit, makeAudit(assessment.id, action, actorId, actorRole, details)],
      updatedAt: new Date().toISOString(),
    });
    return updatedAssessment;
  });

  if (!updatedAssessment) throw new Error("Não foi possível salvar esta avaliação.");

  await writeState({ assessments });
  return updatedAssessment;
}

export async function acceptPhotoConsent(assessmentId: string, grantedByUserId = DEMO_STUDENT.id) {
  const consent: PhotoConsent = {
    accepted: true,
    acceptedAt: new Date().toISOString(),
    termVersion: CONSENT_TERM_VERSION,
    grantedByUserId,
    scopes: {
      capture: true,
      storage: true,
      professionalUse: true,
      comparison: true,
      studentAccess: true,
    },
  };

  return saveAssessment(
    assessmentId,
    { photoConsent: consent },
    DEMO_TRAINER.id,
    "trainer",
    "Consentimento de fotos registrado.",
    "consent_changed"
  );
}

export async function addAssessmentPhoto(
  assessmentId: string,
  input: Omit<AssessmentPhoto, "id" | "capturedAt" | "originalPreserved" | "consentTermVersion" | "annotations">
) {
  const assessment = await getAssessmentById(assessmentId, DEMO_TRAINER.id, "trainer");
  if (!assessment.photoConsent?.accepted) throw new Error("Registre o consentimento antes de adicionar fotos.");

  const photo: AssessmentPhoto = {
    id: createId("photo"),
    ...input,
    capturedAt: new Date().toISOString(),
    originalPreserved: true,
    consentTermVersion: assessment.photoConsent.termVersion,
    annotations: [],
  };

  const photos = [photo, ...assessment.photos.filter((item) => item.view !== input.view)];
  const updated = await saveAssessment(
    assessmentId,
    { photos },
    DEMO_TRAINER.id,
    "trainer",
    `Foto ${input.view} registrada sem alterar o arquivo original.`,
    "photo_changed"
  );
  return { updated, photo };
}

export async function removeAssessmentPhoto(assessmentId: string, photoId: string) {
  const assessment = await getAssessmentById(assessmentId, DEMO_TRAINER.id, "trainer");
  const photos = assessment.photos.filter((photo) => photo.id !== photoId);
  return saveAssessment(assessmentId, { photos }, DEMO_TRAINER.id, "trainer", "Foto removida do registro.", "photo_changed");
}

export async function addPosturalAnnotation(
  assessmentId: string,
  photoId: string,
  input: Omit<PosturalAnnotation, "id" | "createdAt">
) {
  const assessment = await getAssessmentById(assessmentId, DEMO_TRAINER.id, "trainer");
  const annotation: PosturalAnnotation = {
    id: createId("annotation"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  const photos = assessment.photos.map((photo) => {
    if (photo.id !== photoId) return photo;
    return { ...photo, annotations: [...photo.annotations, annotation] };
  });

  const updated = await saveAssessment(
    assessmentId,
    { photos },
    DEMO_TRAINER.id,
    "trainer",
    "Marcação postural não destrutiva adicionada.",
    "photo_changed"
  );
  return { updated, annotation };
}

export async function removePosturalAnnotation(assessmentId: string, photoId: string, annotationId: string) {
  const assessment = await getAssessmentById(assessmentId, DEMO_TRAINER.id, "trainer");
  const photos = assessment.photos.map((photo) => {
    if (photo.id !== photoId) return photo;
    return { ...photo, annotations: photo.annotations.filter((annotation) => annotation.id !== annotationId) };
  });
  return saveAssessment(
    assessmentId,
    { photos },
    DEMO_TRAINER.id,
    "trainer",
    "Marcação postural removida.",
    "photo_changed"
  );
}

export async function completeAssessment(assessmentId: string) {
  const assessment = await getAssessmentById(assessmentId, DEMO_TRAINER.id, "trainer");
  const recalculated = recalculateAssessment(assessment);
  const summary = getAssessmentSummary(recalculated);
  const requiredPending = ASSESSMENT_STEPS.filter((step) => step.required).flatMap((step) =>
    recalculated.steps[step.id].pending.map((pending) => `${step.shortTitle}: ${pending}`)
  );

  if (requiredPending.length > 0) {
    throw new Error(`Preencha os campos obrigatórios: ${requiredPending.join(", ")}.`);
  }

  return saveAssessment(
    assessmentId,
    {
      status: "concluida",
      completedAt: new Date().toISOString(),
    },
    DEMO_TRAINER.id,
    "trainer",
    `Avaliação concluída com ${summary.progressPercent}% das etapas.`,
    "completed"
  );
}

export async function reopenAssessment(assessmentId: string) {
  const assessment = await getAssessmentById(assessmentId, DEMO_TRAINER.id, "trainer");
  return saveAssessment(
    assessmentId,
    {
      status: "em_andamento",
      completedAt: undefined,
    },
    DEMO_TRAINER.id,
    "trainer",
    "Avaliação reaberta.",
    "reopened"
  );
}

export async function softDeleteAssessment(assessmentId: string) {
  const assessment = await getAssessmentById(assessmentId, DEMO_TRAINER.id, "trainer");
  if (assessment.status === "concluida") {
    throw new Error("Avaliações concluídas não podem ser excluídas diretamente.");
  }

  return saveAssessment(
    assessmentId,
    {
      deletedAt: new Date().toISOString(),
    },
    DEMO_TRAINER.id,
    "trainer",
    "Avaliação removida.",
    "deleted"
  );
}

export async function compareAssessments(firstId: string, secondId: string) {
  const [first, second] = await Promise.all([
    getAssessmentById(firstId, DEMO_TRAINER.id, "trainer"),
    getAssessmentById(secondId, DEMO_TRAINER.id, "trainer"),
  ]);

  if (first.studentId !== second.studentId) {
    throw new Error("Só é possível comparar avaliações do mesmo aluno.");
  }

  return { first, second };
}

export async function resetAssessmentStoreForTests() {
  await writeState(defaultState);
}
