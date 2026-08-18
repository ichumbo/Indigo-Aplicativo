import type {
  TrainingExecutedSet,
  TrainingExecution,
  TrainingExercisePrescription,
  TrainingLoadUnit,
  TrainingPlan,
  TrainingSession,
} from "./training-plan-store";

export type PerformancePeriodPreset = "4w" | "3m" | "6m" | "12m" | "all" | "custom";

export type PerformanceMetric =
  | "load"
  | "reps"
  | "sets"
  | "volume"
  | "bestSet"
  | "estimated1rm"
  | "duration"
  | "distance"
  | "speed"
  | "pace"
  | "power"
  | "level"
  | "effort";

export type ExerciseTrendStatus =
  | "evolving"
  | "stable"
  | "declining"
  | "returning"
  | "new"
  | "insufficient"
  | "not_recent"
  | "unavailable";

export type ExerciseTrendTone = "primary" | "neutral" | "warning" | "danger";

export type ExercisePerformancePeriod = {
  preset: PerformancePeriodPreset;
  start?: string;
  end?: string;
  label: string;
  comparisonLabel: string;
};

export type ExercisePerformanceRecord = {
  id: string;
  metric: PerformanceMetric;
  label: string;
  value: number;
  unit: string;
  date: string;
  executionId: string;
  setId?: string;
  context: string;
  calculationVersion: string;
};

export type ExercisePerformancePoint = {
  id: string;
  executionId: string;
  sessionId: string;
  sessionName: string;
  sessionIdentifier?: string;
  date: string;
  finishedAt?: string;
  status: TrainingExecution["status"];
  version: number;
  exerciseId: string;
  exerciseName: string;
  equipmentName: string;
  equipmentType: string;
  loadUnit: TrainingLoadUnit;
  validSets: TrainingExecutedSet[];
  warmupSets: TrainingExecutedSet[];
  invalidSets: TrainingExecutedSet[];
  allSets: TrainingExecutedSet[];
  values: Partial<Record<PerformanceMetric, number>>;
  bestSet?: TrainingExecutedSet;
  bestSetLabel: string;
  volume?: number;
  hasPain: boolean;
  hasObservation: boolean;
  hasPrivateTrainerNote: boolean;
  recordMetrics: PerformanceMetric[];
  incompatibleReason?: string;
};

export type ExercisePerformanceSummary = {
  id: string;
  exerciseId: string;
  exerciseCatalogId?: string;
  exerciseName: string;
  variation?: string;
  muscleGroup: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  equipmentManufacturer?: string;
  equipmentModel?: string;
  planId: string;
  planName: string;
  sessionIds: string[];
  sessionNames: string[];
  unilateral: boolean;
  side: string;
  loadUnit: TrainingLoadUnit;
  metricsAvailable: PerformanceMetric[];
  preferredMetric: PerformanceMetric;
  firstDate?: string;
  lastDate?: string;
  executionCount: number;
  validSetCount: number;
  warmupSetCount: number;
  invalidSetCount: number;
  compatibleRecords: number;
  status: ExerciseTrendStatus;
  statusLabel: string;
  statusTone: ExerciseTrendTone;
  statusReason: string;
  explanation: string[];
  primaryMetricLabel: string;
  primaryMetricValue?: number;
  primaryMetricUnit: string;
  primaryMetricDisplay: string;
  previousMetricValue?: number;
  variationAbsolute?: number;
  variationPercent?: number;
  variationLabel: string;
  lastBestSetLabel: string;
  hasPain: boolean;
  hasObservation: boolean;
  hasPrivateTrainerNote: boolean;
  newRecordCount: number;
  records: ExercisePerformanceRecord[];
  points: ExercisePerformancePoint[];
  allTimePoints: ExercisePerformancePoint[];
  dataQuality: "empty" | "insufficient" | "compatible" | "attention";
};

export type ExercisePerformanceDashboard = {
  plan: TrainingPlan;
  period: ExercisePerformancePeriod;
  generatedAt: string;
  summaries: ExercisePerformanceSummary[];
  totals: {
    evolving: number;
    stable: number;
    declining: number;
    returning: number;
    newExercises: number;
    insufficient: number;
    notRecent: number;
    unavailable: number;
    notPerformed: number;
    newRecords: number;
    withPain: number;
    consistencyPercent: number;
  };
  filters: {
    sessions: { id: string; name: string }[];
    plans: { id: string; name: string }[];
    muscleGroups: string[];
    equipments: string[];
    equipmentTypes: string[];
    metrics: PerformanceMetric[];
    trends: ExerciseTrendStatus[];
  };
};

type BuildPerformanceInput = {
  plan: TrainingPlan;
  sessions: TrainingSession[];
  executions: TrainingExecution[];
  periodPreset?: PerformancePeriodPreset;
  customStart?: string;
  customEnd?: string;
  referenceDate?: Date;
};

type ExerciseIdentity = {
  key: string;
  exercise: TrainingExercisePrescription;
  planId: string;
  planName: string;
  sessionId: string;
  sessionName: string;
  sessionIdentifier?: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  equipmentManufacturer?: string;
  equipmentModel?: string;
  side: string;
};

const CALCULATION_VERSION = "exercise-performance-v1";
const RETURNING_GAP_DAYS = 21;
const NOT_RECENT_DAYS = 45;

export const PERFORMANCE_PERIOD_OPTIONS: { value: PerformancePeriodPreset; label: string }[] = [
  { value: "4w", label: "4 semanas" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
  { value: "all", label: "Tudo" },
  { value: "custom", label: "Personalizado" },
];

export const PERFORMANCE_METRIC_LABELS: Record<PerformanceMetric, string> = {
  load: "Carga",
  reps: "Repeticoes",
  sets: "Series",
  volume: "Volume",
  bestSet: "Melhor serie",
  estimated1rm: "1RM estimado",
  duration: "Tempo",
  distance: "Distancia",
  speed: "Velocidade",
  pace: "Ritmo",
  power: "Potencia",
  level: "Nivel",
  effort: "Esforco",
};

export const TREND_STATUS_LABELS: Record<ExerciseTrendStatus, string> = {
  evolving: "Evoluindo",
  stable: "Estavel",
  declining: "Em queda",
  returning: "Retomando",
  new: "Novo exercicio",
  insufficient: "Dados insuficientes",
  not_recent: "Sem execucao recente",
  unavailable: "Comparacao indisponivel",
};

export function resolvePerformancePeriod(
  preset: PerformancePeriodPreset = "3m",
  customStart?: string,
  customEnd?: string,
  referenceDate = new Date()
): ExercisePerformancePeriod {
  const end = endOfDay(customEnd ? new Date(`${customEnd}T12:00:00`) : referenceDate);
  let start: Date | undefined;

  if (preset === "4w") start = addDays(end, -28);
  if (preset === "3m") start = addMonths(end, -3);
  if (preset === "6m") start = addMonths(end, -6);
  if (preset === "12m") start = addMonths(end, -12);
  if (preset === "custom") start = customStart ? startOfDay(new Date(`${customStart}T12:00:00`)) : addMonths(end, -3);

  const option = PERFORMANCE_PERIOD_OPTIONS.find((item) => item.value === preset);
  const label = preset === "custom"
    ? `${formatShortDate(start?.toISOString())} a ${formatShortDate(end.toISOString())}`
    : option?.label ?? "3 meses";

  return {
    preset,
    start: start?.toISOString(),
    end: preset === "all" ? undefined : end.toISOString(),
    label,
    comparisonLabel: preset === "all" ? "Todo o historico" : `Periodo: ${label}`,
  };
}

export function buildExercisePerformanceDashboard(input: BuildPerformanceInput): ExercisePerformanceDashboard {
  const period = resolvePerformancePeriod(input.periodPreset, input.customStart, input.customEnd, input.referenceDate);
  const identities = buildPrescribedIdentities(input.plan, input.sessions);
  const pointsByIdentity = new Map<string, ExercisePerformancePoint[]>();

  input.executions.forEach((execution) => {
    execution.snapshot.exercises.forEach((exercise) => {
      const identity = buildExerciseIdentity(input.plan, execution, exercise);
      if (!identities.has(identity.key)) identities.set(identity.key, identity);
      const point = buildPerformancePoint(execution, exercise, identity);
      if (!point) return;
      pointsByIdentity.set(identity.key, [...(pointsByIdentity.get(identity.key) ?? []), point]);
    });
  });

  const summaries = [...identities.entries()]
    .map(([key, identity]) => {
      const allTimePoints = [...(pointsByIdentity.get(key) ?? [])].sort(sortPointAsc);
      const periodPoints = allTimePoints.filter((point) => isPointInPeriod(point, period));
      return buildExerciseSummary(key, identity, allTimePoints, periodPoints, period, input.referenceDate ?? new Date());
    })
    .sort(sortSummary);

  const totals = summaries.reduce<ExercisePerformanceDashboard["totals"]>(
    (acc, summary) => {
      if (summary.status === "evolving") acc.evolving += 1;
      if (summary.status === "stable") acc.stable += 1;
      if (summary.status === "declining") acc.declining += 1;
      if (summary.status === "returning") acc.returning += 1;
      if (summary.status === "new") acc.newExercises += 1;
      if (summary.status === "insufficient") acc.insufficient += 1;
      if (summary.status === "not_recent") acc.notRecent += 1;
      if (summary.status === "unavailable") acc.unavailable += 1;
      if (summary.executionCount === 0) acc.notPerformed += 1;
      acc.newRecords += summary.newRecordCount;
      if (summary.hasPain) acc.withPain += 1;
      return acc;
    },
    {
      evolving: 0,
      stable: 0,
      declining: 0,
      returning: 0,
      newExercises: 0,
      insufficient: 0,
      notRecent: 0,
      unavailable: 0,
      notPerformed: 0,
      newRecords: 0,
      withPain: 0,
      consistencyPercent: 0,
    }
  );

  const expected = summaries.filter((summary) => summary.executionCount > 0).length;
  totals.consistencyPercent = expected > 0
    ? Math.round((summaries.filter((summary) => summary.compatibleRecords >= 2).length / expected) * 100)
    : 0;

  return {
    plan: input.plan,
    period,
    generatedAt: new Date().toISOString(),
    summaries,
    totals,
    filters: {
      sessions: input.sessions.map((session) => ({
        id: session.id,
        name: getSessionDisplayName(session),
      })),
      plans: [{ id: input.plan.id, name: input.plan.name }],
      muscleGroups: uniqueSorted(summaries.map((summary) => summary.muscleGroup).filter(Boolean)),
      equipments: uniqueSorted(summaries.map((summary) => summary.equipmentName).filter(Boolean)),
      equipmentTypes: uniqueSorted(summaries.map((summary) => summary.equipmentType).filter(Boolean)),
      metrics: uniqueSorted(summaries.flatMap((summary) => summary.metricsAvailable)) as PerformanceMetric[],
      trends: uniqueSorted(summaries.map((summary) => summary.status)) as ExerciseTrendStatus[],
    },
  };
}

export function getExercisePerformanceSummaryByKey(dashboard: ExercisePerformanceDashboard, key: string) {
  return dashboard.summaries.find((summary) => summary.id === key);
}

export function getCompatibleMetrics(summary: ExercisePerformanceSummary) {
  return summary.metricsAvailable.filter((metric) =>
    summary.points.some((point) => typeof point.values[metric] === "number")
  );
}

export function formatPerformanceValue(value: number | undefined, metric: PerformanceMetric, unit: string) {
  if (typeof value !== "number" || Number.isNaN(value)) return metric === "load" ? "Sem carga registrada" : "Dados insuficientes";
  if (metric === "duration") return `${Math.round(value)}s`;
  if (metric === "distance") return value >= 1000 ? `${round(value / 1000, 2)} km` : `${round(value, 0)} m`;
  if (metric === "pace") return `${round(value, 2)} min/km`;
  if (metric === "speed") return `${round(value, 1)} km/h`;
  if (metric === "power") return `${round(value, 0)} W`;
  if (metric === "effort") return `${round(value, 1)}/10`;
  if (metric === "sets") return `${round(value, 0)} serie(s)`;
  if (metric === "reps") return `${round(value, 0)} rep(s)`;
  if (metric === "level") return `nivel ${round(value, 1)}`;
  if (metric === "estimated1rm") return `${round(value, 1)} ${unit} estimado`;
  if (metric === "volume") return `${round(value, 1)} ${unit === "none" ? "" : unit}.rep`.trim();
  return `${round(value, 1)}${unit === "none" ? "" : ` ${unit}`}`;
}

export function formatShortDate(value?: string) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatPerformanceDateTime(value?: string) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem registro";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function estimateOneRmEpley(load: number | undefined, reps: number | undefined) {
  if (typeof load !== "number" || typeof reps !== "number") return undefined;
  if (load <= 0 || reps < 1 || reps > 12) return undefined;
  return round(load * (1 + reps / 30), 1);
}

function buildPrescribedIdentities(plan: TrainingPlan, sessions: TrainingSession[]) {
  const identities = new Map<string, ExerciseIdentity>();
  sessions.forEach((session) => {
    session.versions.forEach((version) => {
      version.exercises.forEach((exercise) => {
        const identity = buildExerciseIdentity(plan, {
          id: "",
          sessionId: session.id,
          snapshot: version,
        } as TrainingExecution, exercise);
        identities.set(identity.key, identity);
      });
    });
  });
  return identities;
}

function buildExerciseIdentity(plan: TrainingPlan, execution: TrainingExecution, exercise: TrainingExercisePrescription): ExerciseIdentity {
  const equipment = exercise.equipment;
  const equipmentId = equipment?.id ?? `${exercise.loadUnit}-sem-equipamento`;
  const equipmentName = equipment?.name ?? getDefaultEquipmentName(exercise);
  const equipmentType = equipment?.type ?? (exercise.loadUnit === "none" ? "bodyweight" : "other");
  const side = exercise.side ?? (exercise.unilateral ? "unilateral" : "bilateral");
  const key = [
    exercise.exerciseCatalogId ?? exercise.id,
    normalizeKey(exercise.alternativeExerciseName ?? exercise.name),
    normalizeKey(equipmentId),
    normalizeKey(equipment?.manufacturer ?? "sem-fabricante"),
    normalizeKey(equipment?.model ?? "sem-modelo"),
    exercise.loadUnit,
    side,
    exercise.unilateral ? "unilateral" : "bilateral",
  ].join("|");

  return {
    key,
    exercise,
    planId: plan.id,
    planName: plan.name,
    sessionId: execution.sessionId,
    sessionName: execution.snapshot.name,
    sessionIdentifier: execution.snapshot.identifier,
    equipmentId,
    equipmentName,
    equipmentType,
    equipmentManufacturer: equipment?.manufacturer,
    equipmentModel: equipment?.model,
    side,
  };
}

function buildPerformancePoint(
  execution: TrainingExecution,
  exercise: TrainingExercisePrescription,
  identity: ExerciseIdentity
): ExercisePerformancePoint | null {
  const allSets = execution.sets.filter((set) => set.exerciseId === exercise.id);
  if (allSets.length === 0) return null;

  const warmupSets = allSets.filter((set) => set.warmup || set.setType === "warmup" || set.setType === "approach");
  const invalidSets = allSets.filter((set) => !isSetValidForMainCalculations(set));
  const validSets = allSets.filter(isSetValidForMainCalculations);
  const bestSet = chooseBestSet(validSets);
  const values = calculatePointValues(validSets, exercise);
  const hasPain = allSets.some((set) => Boolean(set.pain));
  const hasObservation = allSets.some((set) => Boolean(set.note || set.studentNote || set.trainerNote));
  const hasPrivateTrainerNote = allSets.some((set) => Boolean(set.privateTrainerNote));

  return {
    id: `${execution.id}:${exercise.id}:${identity.key}`,
    executionId: execution.id,
    sessionId: execution.sessionId,
    sessionName: execution.snapshot.name,
    sessionIdentifier: execution.snapshot.identifier,
    date: execution.startedAt,
    finishedAt: execution.finishedAt,
    status: execution.status,
    version: execution.snapshot.version,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    equipmentName: identity.equipmentName,
    equipmentType: identity.equipmentType,
    loadUnit: exercise.loadUnit,
    validSets,
    warmupSets,
    invalidSets,
    allSets,
    values,
    bestSet,
    bestSetLabel: formatBestSet(bestSet, exercise.loadUnit),
    volume: values.volume,
    hasPain,
    hasObservation,
    hasPrivateTrainerNote,
    recordMetrics: [],
  };
}

function buildExerciseSummary(
  key: string,
  identity: ExerciseIdentity,
  allTimePoints: ExercisePerformancePoint[],
  periodPoints: ExercisePerformancePoint[],
  period: ExercisePerformancePeriod,
  referenceDate: Date
): ExercisePerformanceSummary {
  const metricsAvailable = getMetricsAvailable(allTimePoints, identity.exercise);
  const preferredMetric = choosePreferredMetric(metricsAvailable, identity.exercise);
  const metricUnit = getMetricUnit(preferredMetric, identity.exercise.loadUnit);
  const compatiblePoints = periodPoints.filter((point) => typeof point.values[preferredMetric] === "number");
  const records = calculateRecords(periodPoints, allTimePoints, identity.exercise.loadUnit);
  const points = markPointRecords(periodPoints, records);
  const firstPoint = periodPoints[0];
  const lastPoint = periodPoints[periodPoints.length - 1];
  const primaryMetricValue = lastPoint?.values[preferredMetric];
  const previousMetricValue = firstPoint?.values[preferredMetric];
  const variationAbsolute =
    typeof primaryMetricValue === "number" && typeof previousMetricValue === "number"
      ? round(primaryMetricValue - previousMetricValue, 2)
      : undefined;
  const variationPercent =
    typeof variationAbsolute === "number" && previousMetricValue && previousMetricValue !== 0
      ? round((variationAbsolute / previousMetricValue) * 100, 1)
      : undefined;
  const trend = classifyTrend({
    preferredMetric,
    compatiblePoints,
    allTimePoints,
    period,
    referenceDate,
  });

  const validSetCount = points.reduce((total, point) => total + point.validSets.length, 0);
  const warmupSetCount = points.reduce((total, point) => total + point.warmupSets.length, 0);
  const invalidSetCount = points.reduce((total, point) => total + point.invalidSets.length, 0);
  const hasPain = points.some((point) => point.hasPain);
  const hasObservation = points.some((point) => point.hasObservation);
  const hasPrivateTrainerNote = points.some((point) => point.hasPrivateTrainerNote);
  const dataQuality = hasPain
    ? "attention"
    : points.length === 0
      ? "empty"
      : compatiblePoints.length < 2
        ? "insufficient"
        : "compatible";

  return {
    id: key,
    exerciseId: identity.exercise.id,
    exerciseCatalogId: identity.exercise.exerciseCatalogId,
    exerciseName: identity.exercise.name,
    variation: identity.exercise.alternativeExerciseName,
    muscleGroup: identity.exercise.muscleGroup,
    equipmentId: identity.equipmentId,
    equipmentName: identity.equipmentName,
    equipmentType: identity.equipmentType,
    equipmentManufacturer: identity.equipmentManufacturer,
    equipmentModel: identity.equipmentModel,
    planId: identity.planId,
    planName: identity.planName,
    sessionIds: uniqueSorted([identity.sessionId, ...points.map((point) => point.sessionId)]),
    sessionNames: uniqueSorted([identity.sessionName, ...points.map((point) => point.sessionName)]),
    unilateral: identity.exercise.unilateral,
    side: identity.side,
    loadUnit: identity.exercise.loadUnit,
    metricsAvailable,
    preferredMetric,
    firstDate: firstPoint?.date,
    lastDate: lastPoint?.date,
    executionCount: points.length,
    validSetCount,
    warmupSetCount,
    invalidSetCount,
    compatibleRecords: compatiblePoints.length,
    status: trend.status,
    statusLabel: TREND_STATUS_LABELS[trend.status],
    statusTone: trend.tone,
    statusReason: trend.reason,
    explanation: trend.explanation,
    primaryMetricLabel: PERFORMANCE_METRIC_LABELS[preferredMetric],
    primaryMetricValue,
    primaryMetricUnit: metricUnit,
    primaryMetricDisplay: formatPerformanceValue(primaryMetricValue, preferredMetric, metricUnit),
    previousMetricValue,
    variationAbsolute,
    variationPercent,
    variationLabel: formatVariation(variationAbsolute, variationPercent, metricUnit),
    lastBestSetLabel: lastPoint?.bestSetLabel ?? "Dados insuficientes",
    hasPain,
    hasObservation,
    hasPrivateTrainerNote,
    newRecordCount: records.length,
    records,
    points,
    allTimePoints,
    dataQuality,
  };
}

function classifyTrend({
  preferredMetric,
  compatiblePoints,
  allTimePoints,
  referenceDate,
}: {
  preferredMetric: PerformanceMetric;
  compatiblePoints: ExercisePerformancePoint[];
  allTimePoints: ExercisePerformancePoint[];
  period: ExercisePerformancePeriod;
  referenceDate: Date;
}): { status: ExerciseTrendStatus; tone: ExerciseTrendTone; reason: string; explanation: string[] } {
  if (allTimePoints.length === 0) {
    return {
      status: "not_recent",
      tone: "neutral",
      reason: "Exercicio prescrito, mas ainda nao executado no historico.",
      explanation: ["Nenhuma serie concluida foi encontrada para esta identidade de exercicio."],
    };
  }

  const lastPoint = allTimePoints[allTimePoints.length - 1];
  const daysSinceLast = diffDays(referenceDate, new Date(lastPoint.date));
  if (daysSinceLast > NOT_RECENT_DAYS) {
    return {
      status: "not_recent",
      tone: "warning",
      reason: `Ultima execucao ha ${daysSinceLast} dias.`,
      explanation: ["O historico existe, mas nao ha execucao recente suficiente para comparar o periodo atual."],
    };
  }

  if (compatiblePoints.length === 1 && allTimePoints.length === 1) {
    return {
      status: "new",
      tone: "primary",
      reason: "Primeiro registro valido deste exercicio.",
      explanation: ["O exercicio entrou no historico agora; ainda nao ha comparacao temporal confiavel."],
    };
  }

  if (compatiblePoints.length < 3) {
    return {
      status: "insufficient",
      tone: "neutral",
      reason: "Menos de tres execucoes comparaveis no periodo.",
      explanation: ["A regra evita classificar evolucao ou queda com poucos pontos."],
    };
  }

  const penultimate = allTimePoints[allTimePoints.length - 2];
  const gap = diffDays(new Date(lastPoint.date), new Date(penultimate.date));
  if (gap >= RETURNING_GAP_DAYS) {
    return {
      status: "returning",
      tone: "warning",
      reason: `Retorno apos ${gap} dias sem este exercicio.`,
      explanation: ["A classificacao prioriza o contexto de retomada antes de comparar carga ou volume."],
    };
  }

  const values = compatiblePoints
    .map((point) => point.values[preferredMetric])
    .filter((value): value is number => typeof value === "number");
  if (values.length < 3) {
    return {
      status: "unavailable",
      tone: "neutral",
      reason: "A metrica principal nao possui pontos numericos suficientes.",
      explanation: ["Ha execucoes no historico, mas os registros nao permitem comparar esta metrica com seguranca."],
    };
  }

  const firstWindow = average(values.slice(0, Math.max(1, Math.floor(values.length / 2))));
  const lastWindow = average(values.slice(Math.ceil(values.length / 2)));
  const delta = lastWindow - firstWindow;
  const tolerance = getTolerance(preferredMetric, firstWindow);
  const slope = linearSlope(values);
  const explanation = [
    `Metrica usada: ${PERFORMANCE_METRIC_LABELS[preferredMetric]}.`,
    `Comparacao por medias do inicio e fim do periodo, com tolerancia de ${round(tolerance, 2)}.`,
    "Series de aquecimento, invalidas, assistidas ou interrompidas ficam fora do calculo principal.",
  ];

  if (delta > tolerance && slope >= 0) {
    return {
      status: "evolving",
      tone: "primary",
      reason: `Crescimento consistente de ${round(delta, 2)} ${getLooseMetricUnit(preferredMetric)}.`,
      explanation,
    };
  }

  if (delta < -tolerance && slope <= 0) {
    return {
      status: "declining",
      tone: "danger",
      reason: `Reducao recorrente de ${round(Math.abs(delta), 2)} ${getLooseMetricUnit(preferredMetric)}.`,
      explanation: [...explanation, "Nao foi considerada apenas a ultima execucao isolada."],
    };
  }

  return {
    status: "stable",
    tone: "neutral",
    reason: "Variacao dentro da tolerancia definida.",
    explanation,
  };
}

function calculatePointValues(validSets: TrainingExecutedSet[], exercise: TrainingExercisePrescription) {
  const values: Partial<Record<PerformanceMetric, number>> = {};
  if (validSets.length === 0) return values;

  const loads = validSets.map((set) => getComparableLoad(set)).filter(isNumber);
  const reps = validSets.map((set) => set.executedReps).filter(isNumber);
  const durations = validSets.map((set) => set.durationSeconds).filter(isNumber);
  const distances = validSets.map((set) => set.distanceMeters).filter(isNumber);
  const speed = validSets.map((set) => set.speedKmh).filter(isNumber);
  const power = validSets.map((set) => set.powerWatts).filter(isNumber);
  const effort = validSets.map((set) => set.effort).filter(isNumber);
  const oneRmValues = validSets
    .filter((set) => !set.assisted && !set.partial && set.loadUnit !== "level")
    .map((set) => estimateOneRmEpley(set.executedLoad, set.executedReps))
    .filter(isNumber);

  values.sets = validSets.length;
  if (loads.length) values.load = Math.max(...loads);
  if (reps.length) values.reps = reps.reduce(sum, 0);
  if (loads.length && reps.length) values.volume = calculateVolume(validSets);
  if (oneRmValues.length) values.estimated1rm = Math.max(...oneRmValues);
  if (durations.length) values.duration = durations.reduce(sum, 0);
  if (distances.length) values.distance = distances.reduce(sum, 0);
  if (speed.length) values.speed = average(speed);
  if (power.length) values.power = Math.max(...power);
  if (effort.length) values.effort = average(effort);
  if (exercise.loadUnit === "level" && loads.length) values.level = Math.max(...loads);

  const bestSet = chooseBestSet(validSets);
  if (bestSet) {
    values.bestSet = estimateOneRmEpley(bestSet.executedLoad, bestSet.executedReps)
      ?? calculateSetVolume(bestSet)
      ?? bestSet.executedLoad
      ?? bestSet.executedReps;
  }

  if (values.distance && values.duration && values.duration > 0) {
    values.pace = round((values.duration / 60) / (values.distance / 1000), 2);
    if (!values.speed) values.speed = round((values.distance / 1000) / (values.duration / 3600), 2);
  }

  return values;
}

function getMetricsAvailable(points: ExercisePerformancePoint[], exercise: TrainingExercisePrescription) {
  const metrics = new Set<PerformanceMetric>();
  points.forEach((point) => {
    Object.entries(point.values).forEach(([metric, value]) => {
      if (typeof value === "number") metrics.add(metric as PerformanceMetric);
    });
  });

  if (exercise.loadUnit === "kg" || exercise.loadUnit === "lb") {
    metrics.add("load");
    metrics.add("bestSet");
    metrics.add("volume");
    metrics.add("estimated1rm");
  }
  if (exercise.loadUnit === "level") metrics.add("level");
  if (exercise.plannedReps || exercise.plannedRepsMin || exercise.plannedRepsMax) metrics.add("reps");
  if (exercise.durationSeconds) metrics.add("duration");
  if (exercise.distanceMeters) metrics.add("distance");
  metrics.add("sets");
  metrics.add("effort");

  return [...metrics];
}

function choosePreferredMetric(metrics: PerformanceMetric[], exercise: TrainingExercisePrescription): PerformanceMetric {
  if ((exercise.loadUnit === "kg" || exercise.loadUnit === "lb") && metrics.includes("bestSet")) return "bestSet";
  if (exercise.loadUnit === "level" && metrics.includes("level")) return "level";
  if (metrics.includes("duration")) return "duration";
  if (metrics.includes("distance")) return "distance";
  if (metrics.includes("reps")) return "reps";
  return metrics[0] ?? "sets";
}

function calculateRecords(periodPoints: ExercisePerformancePoint[], allTimePoints: ExercisePerformancePoint[], unit: TrainingLoadUnit): ExercisePerformanceRecord[] {
  const records: ExercisePerformanceRecord[] = [];
  const metrics: PerformanceMetric[] = ["load", "reps", "volume", "estimated1rm", "duration", "distance", "power", "level"];

  metrics.forEach((metric) => {
    const periodBest = maxPointByMetric(periodPoints, metric);
    if (!periodBest) return;
    const previousBestValue = Math.max(
      ...allTimePoints
        .filter((point) => new Date(point.date).getTime() < new Date(periodBest.point.date).getTime())
        .map((point) => point.values[metric])
        .filter(isNumber),
      Number.NEGATIVE_INFINITY
    );
    if (previousBestValue !== Number.NEGATIVE_INFINITY && periodBest.value <= previousBestValue + getTolerance(metric, previousBestValue)) return;

    records.push({
      id: `${periodBest.point.id}:${metric}`,
      metric,
      label: PERFORMANCE_METRIC_LABELS[metric],
      value: periodBest.value,
      unit: getMetricUnit(metric, unit),
      date: periodBest.point.date,
      executionId: periodBest.point.executionId,
      setId: periodBest.point.bestSet?.id,
      context: `${periodBest.point.sessionIdentifier ?? "Sessao"} • ${periodBest.point.bestSetLabel}`,
      calculationVersion: CALCULATION_VERSION,
    });
  });

  return records;
}

function markPointRecords(points: ExercisePerformancePoint[], records: ExercisePerformanceRecord[]) {
  return points.map((point) => ({
    ...point,
    recordMetrics: records.filter((record) => record.executionId === point.executionId).map((record) => record.metric),
  }));
}

function isSetValidForMainCalculations(set: TrainingExecutedSet) {
  return Boolean(
    set.completed &&
      set.validForProgression &&
      !set.warmup &&
      set.setType !== "warmup" &&
      set.setType !== "approach" &&
      set.setType !== "invalid" &&
      !set.invalidReason &&
      !set.assisted &&
      !set.partial &&
      !set.interrupted
  );
}

function chooseBestSet(sets: TrainingExecutedSet[]) {
  return [...sets].sort((first, second) => {
    const firstScore = estimateOneRmEpley(first.executedLoad, first.executedReps)
      ?? calculateSetVolume(first)
      ?? first.executedReps
      ?? first.durationSeconds
      ?? 0;
    const secondScore = estimateOneRmEpley(second.executedLoad, second.executedReps)
      ?? calculateSetVolume(second)
      ?? second.executedReps
      ?? second.durationSeconds
      ?? 0;
    return secondScore - firstScore;
  })[0];
}

function calculateVolume(sets: TrainingExecutedSet[]) {
  const volumes = sets.map(calculateSetVolume).filter(isNumber);
  return volumes.length ? round(volumes.reduce(sum, 0), 1) : undefined;
}

function calculateSetVolume(set: TrainingExecutedSet) {
  const load = getComparableLoad(set);
  if (typeof load !== "number" || typeof set.executedReps !== "number") return undefined;
  return round(load * set.executedReps, 1);
}

function getComparableLoad(set: TrainingExecutedSet) {
  if (typeof set.executedLoad === "number") return set.executedLoad;
  if (typeof set.equipmentLevel === "number") return set.equipmentLevel;
  return undefined;
}

function formatBestSet(set: TrainingExecutedSet | undefined, unit: TrainingLoadUnit) {
  if (!set) return "Dados insuficientes";
  const load = getComparableLoad(set);
  const reps = set.executedReps;
  const duration = set.durationSeconds;
  const distance = set.distanceMeters;
  if (typeof load === "number" && typeof reps === "number") {
    return `${round(load, 1)} ${unit} x ${reps} rep(s)`;
  }
  if (typeof reps === "number") return `${reps} rep(s)`;
  if (typeof duration === "number") return `${duration}s`;
  if (typeof distance === "number") return `${distance}m`;
  return "Registro sem metrica principal";
}

function maxPointByMetric(points: ExercisePerformancePoint[], metric: PerformanceMetric) {
  return points.reduce<{ point: ExercisePerformancePoint; value: number } | undefined>((best, point) => {
    const value = point.values[metric];
    if (typeof value !== "number") return best;
    if (!best || value > best.value) return { point, value };
    return best;
  }, undefined);
}

function getMetricUnit(metric: PerformanceMetric, unit: TrainingLoadUnit) {
  if (metric === "duration") return "s";
  if (metric === "distance") return "m";
  if (metric === "speed") return "km/h";
  if (metric === "pace") return "min/km";
  if (metric === "power") return "W";
  if (metric === "effort") return "RPE";
  if (metric === "reps") return "rep";
  if (metric === "sets") return "serie";
  if (metric === "volume") return unit === "none" ? "rep" : unit;
  if (metric === "level") return "nivel";
  if (metric === "estimated1rm") return unit;
  return unit;
}

function getLooseMetricUnit(metric: PerformanceMetric) {
  if (metric === "reps") return "rep(s)";
  if (metric === "sets") return "serie(s)";
  if (metric === "duration") return "s";
  if (metric === "distance") return "m";
  if (metric === "effort") return "RPE";
  return "";
}

function getTolerance(metric: PerformanceMetric, baseline: number) {
  const relative = Math.abs(baseline) * 0.05;
  if (metric === "load" || metric === "bestSet" || metric === "estimated1rm") return Math.max(1, relative);
  if (metric === "reps" || metric === "sets") return Math.max(1, relative);
  if (metric === "effort") return 0.5;
  if (metric === "duration" || metric === "distance" || metric === "volume" || metric === "power") return Math.max(1, relative);
  return Math.max(0.5, relative);
}

function formatVariation(delta: number | undefined, percent: number | undefined, unit: string) {
  if (typeof delta !== "number") return "Comparacao indisponivel";
  const sign = delta > 0 ? "+" : "";
  const percentText = typeof percent === "number" ? ` (${sign}${percent}%)` : "";
  return `${sign}${round(delta, 2)} ${unit}${percentText}`;
}

function isPointInPeriod(point: ExercisePerformancePoint, period: ExercisePerformancePeriod) {
  const time = new Date(point.date).getTime();
  if (period.start && time < new Date(period.start).getTime()) return false;
  if (period.end && time > new Date(period.end).getTime()) return false;
  return true;
}

function sortPointAsc(first: ExercisePerformancePoint, second: ExercisePerformancePoint) {
  return new Date(first.date).getTime() - new Date(second.date).getTime();
}

function sortSummary(first: ExercisePerformanceSummary, second: ExercisePerformanceSummary) {
  const statusWeight: Record<ExerciseTrendStatus, number> = {
    declining: 0,
    returning: 1,
    evolving: 2,
    new: 3,
    stable: 4,
    insufficient: 5,
    not_recent: 6,
    unavailable: 7,
  };
  if (statusWeight[first.status] !== statusWeight[second.status]) {
    return statusWeight[first.status] - statusWeight[second.status];
  }
  return new Date(second.lastDate ?? 0).getTime() - new Date(first.lastDate ?? 0).getTime();
}

function getSessionDisplayName(session: TrainingSession) {
  const active = session.versions.find((version) => version.id === session.activeVersionId) ?? session.versions[0];
  return active?.identifier ? `${active.identifier} - ${active.name}` : active?.name ?? session.id;
}

function getDefaultEquipmentName(exercise: TrainingExercisePrescription) {
  if (exercise.loadUnit === "bodyweight" || exercise.loadUnit === "none") return "Peso corporal / sem equipamento";
  if (exercise.loadUnit === "level") return "Equipamento por nivel";
  return "Equipamento nao informado";
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return startOfDay(next);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function diffDays(left: Date, right: Date) {
  return Math.max(0, Math.floor((left.getTime() - right.getTime()) / 86400000));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce(sum, 0) / values.length;
}

function linearSlope(values: number[]) {
  if (values.length < 2) return 0;
  const xs = values.map((_, index) => index + 1);
  const avgX = average(xs);
  const avgY = average(values);
  const numerator = values.reduce((total, y, index) => total + (xs[index] - avgX) * (y - avgY), 0);
  const denominator = xs.reduce((total, x) => total + (x - avgX) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sum(total: number, value: number) {
  return total + value;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function uniqueSorted<T extends string>(items: T[]) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}
