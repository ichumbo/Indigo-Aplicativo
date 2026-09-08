"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TREND_STATUS_LABELS = exports.PERFORMANCE_METRIC_LABELS = exports.PERFORMANCE_PERIOD_OPTIONS = void 0;
exports.resolvePerformancePeriod = resolvePerformancePeriod;
exports.buildExercisePerformanceDashboard = buildExercisePerformanceDashboard;
exports.getExercisePerformanceSummaryByKey = getExercisePerformanceSummaryByKey;
exports.getCompatibleMetrics = getCompatibleMetrics;
exports.formatPerformanceValue = formatPerformanceValue;
exports.formatShortDate = formatShortDate;
exports.formatPerformanceDateTime = formatPerformanceDateTime;
exports.estimateOneRmEpley = estimateOneRmEpley;
const CALCULATION_VERSION = "exercise-performance-v1";
const RETURNING_GAP_DAYS = 21;
const NOT_RECENT_DAYS = 45;
exports.PERFORMANCE_PERIOD_OPTIONS = [
    { value: "4w", label: "4 semanas" },
    { value: "3m", label: "3 meses" },
    { value: "6m", label: "6 meses" },
    { value: "12m", label: "12 meses" },
    { value: "all", label: "Tudo" },
    { value: "custom", label: "Personalizado" },
];
exports.PERFORMANCE_METRIC_LABELS = {
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
exports.TREND_STATUS_LABELS = {
    evolving: "Evoluindo",
    stable: "Estavel",
    declining: "Em queda",
    returning: "Retomando",
    new: "Novo exercicio",
    insufficient: "Dados insuficientes",
    not_recent: "Sem execucao recente",
    unavailable: "Comparacao indisponivel",
};
function resolvePerformancePeriod(preset = "3m", customStart, customEnd, referenceDate = new Date()) {
    const end = endOfDay(customEnd ? new Date(`${customEnd}T12:00:00`) : referenceDate);
    let start;
    if (preset === "4w")
        start = addDays(end, -28);
    if (preset === "3m")
        start = addMonths(end, -3);
    if (preset === "6m")
        start = addMonths(end, -6);
    if (preset === "12m")
        start = addMonths(end, -12);
    if (preset === "custom")
        start = customStart ? startOfDay(new Date(`${customStart}T12:00:00`)) : addMonths(end, -3);
    const option = exports.PERFORMANCE_PERIOD_OPTIONS.find((item) => item.value === preset);
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
function buildExercisePerformanceDashboard(input) {
    const period = resolvePerformancePeriod(input.periodPreset, input.customStart, input.customEnd, input.referenceDate);
    const identities = buildPrescribedIdentities(input.plan, input.sessions);
    const pointsByIdentity = new Map();
    input.executions.forEach((execution) => {
        execution.snapshot.exercises.forEach((exercise) => {
            const identity = buildExerciseIdentity(input.plan, execution, exercise);
            if (!identities.has(identity.key))
                identities.set(identity.key, identity);
            const point = buildPerformancePoint(execution, exercise, identity);
            if (!point)
                return;
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
    const totals = summaries.reduce((acc, summary) => {
        if (summary.status === "evolving")
            acc.evolving += 1;
        if (summary.status === "stable")
            acc.stable += 1;
        if (summary.status === "declining")
            acc.declining += 1;
        if (summary.status === "returning")
            acc.returning += 1;
        if (summary.status === "new")
            acc.newExercises += 1;
        if (summary.status === "insufficient")
            acc.insufficient += 1;
        if (summary.status === "not_recent")
            acc.notRecent += 1;
        if (summary.status === "unavailable")
            acc.unavailable += 1;
        if (summary.executionCount === 0)
            acc.notPerformed += 1;
        acc.newRecords += summary.newRecordCount;
        if (summary.hasPain)
            acc.withPain += 1;
        return acc;
    }, {
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
    });
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
            metrics: uniqueSorted(summaries.flatMap((summary) => summary.metricsAvailable)),
            trends: uniqueSorted(summaries.map((summary) => summary.status)),
        },
    };
}
function getExercisePerformanceSummaryByKey(dashboard, key) {
    return dashboard.summaries.find((summary) => summary.id === key);
}
function getCompatibleMetrics(summary) {
    return summary.metricsAvailable.filter((metric) => summary.points.some((point) => typeof point.values[metric] === "number"));
}
function formatPerformanceValue(value, metric, unit) {
    if (typeof value !== "number" || Number.isNaN(value))
        return metric === "load" ? "Sem carga registrada" : "Dados insuficientes";
    if (metric === "duration")
        return `${Math.round(value)}s`;
    if (metric === "distance")
        return value >= 1000 ? `${round(value / 1000, 2)} km` : `${round(value, 0)} m`;
    if (metric === "pace")
        return `${round(value, 2)} min/km`;
    if (metric === "speed")
        return `${round(value, 1)} km/h`;
    if (metric === "power")
        return `${round(value, 0)} W`;
    if (metric === "effort")
        return `${round(value, 1)}/10`;
    if (metric === "sets")
        return `${round(value, 0)} serie(s)`;
    if (metric === "reps")
        return `${round(value, 0)} rep(s)`;
    if (metric === "level")
        return `nivel ${round(value, 1)}`;
    if (metric === "estimated1rm")
        return `${round(value, 1)} ${unit} estimado`;
    if (metric === "volume")
        return `${round(value, 1)} ${unit === "none" ? "" : unit}.rep`.trim();
    return `${round(value, 1)}${unit === "none" ? "" : ` ${unit}`}`;
}
function formatShortDate(value) {
    if (!value)
        return "Sem data";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Sem data";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function formatPerformanceDateTime(value) {
    if (!value)
        return "Sem registro";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Sem registro";
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function estimateOneRmEpley(load, reps) {
    if (typeof load !== "number" || typeof reps !== "number")
        return undefined;
    if (load <= 0 || reps < 1 || reps > 12)
        return undefined;
    return round(load * (1 + reps / 30), 1);
}
function buildPrescribedIdentities(plan, sessions) {
    const identities = new Map();
    sessions.forEach((session) => {
        session.versions.forEach((version) => {
            version.exercises.forEach((exercise) => {
                const identity = buildExerciseIdentity(plan, {
                    id: "",
                    sessionId: session.id,
                    snapshot: version,
                }, exercise);
                identities.set(identity.key, identity);
            });
        });
    });
    return identities;
}
function buildExerciseIdentity(plan, execution, exercise) {
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
function buildPerformancePoint(execution, exercise, identity) {
    const allSets = execution.sets.filter((set) => set.exerciseId === exercise.id);
    if (allSets.length === 0)
        return null;
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
function buildExerciseSummary(key, identity, allTimePoints, periodPoints, period, referenceDate) {
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
    const variationAbsolute = typeof primaryMetricValue === "number" && typeof previousMetricValue === "number"
        ? round(primaryMetricValue - previousMetricValue, 2)
        : undefined;
    const variationPercent = typeof variationAbsolute === "number" && previousMetricValue && previousMetricValue !== 0
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
        statusLabel: exports.TREND_STATUS_LABELS[trend.status],
        statusTone: trend.tone,
        statusReason: trend.reason,
        explanation: trend.explanation,
        primaryMetricLabel: exports.PERFORMANCE_METRIC_LABELS[preferredMetric],
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
function classifyTrend({ preferredMetric, compatiblePoints, allTimePoints, referenceDate, }) {
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
        .filter((value) => typeof value === "number");
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
        `Metrica usada: ${exports.PERFORMANCE_METRIC_LABELS[preferredMetric]}.`,
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
function calculatePointValues(validSets, exercise) {
    const values = {};
    if (validSets.length === 0)
        return values;
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
    if (loads.length)
        values.load = Math.max(...loads);
    if (reps.length)
        values.reps = reps.reduce(sum, 0);
    if (loads.length && reps.length)
        values.volume = calculateVolume(validSets);
    if (oneRmValues.length)
        values.estimated1rm = Math.max(...oneRmValues);
    if (durations.length)
        values.duration = durations.reduce(sum, 0);
    if (distances.length)
        values.distance = distances.reduce(sum, 0);
    if (speed.length)
        values.speed = average(speed);
    if (power.length)
        values.power = Math.max(...power);
    if (effort.length)
        values.effort = average(effort);
    if (exercise.loadUnit === "level" && loads.length)
        values.level = Math.max(...loads);
    const bestSet = chooseBestSet(validSets);
    if (bestSet) {
        values.bestSet = estimateOneRmEpley(bestSet.executedLoad, bestSet.executedReps)
            ?? calculateSetVolume(bestSet)
            ?? bestSet.executedLoad
            ?? bestSet.executedReps;
    }
    if (values.distance && values.duration && values.duration > 0) {
        values.pace = round((values.duration / 60) / (values.distance / 1000), 2);
        if (!values.speed)
            values.speed = round((values.distance / 1000) / (values.duration / 3600), 2);
    }
    return values;
}
function getMetricsAvailable(points, exercise) {
    const metrics = new Set();
    points.forEach((point) => {
        Object.entries(point.values).forEach(([metric, value]) => {
            if (typeof value === "number")
                metrics.add(metric);
        });
    });
    if (exercise.loadUnit === "kg" || exercise.loadUnit === "lb") {
        metrics.add("load");
        metrics.add("bestSet");
        metrics.add("volume");
        metrics.add("estimated1rm");
    }
    if (exercise.loadUnit === "level")
        metrics.add("level");
    if (exercise.plannedReps || exercise.plannedRepsMin || exercise.plannedRepsMax)
        metrics.add("reps");
    if (exercise.durationSeconds)
        metrics.add("duration");
    if (exercise.distanceMeters)
        metrics.add("distance");
    metrics.add("sets");
    metrics.add("effort");
    return [...metrics];
}
function choosePreferredMetric(metrics, exercise) {
    if ((exercise.loadUnit === "kg" || exercise.loadUnit === "lb") && metrics.includes("bestSet"))
        return "bestSet";
    if (exercise.loadUnit === "level" && metrics.includes("level"))
        return "level";
    if (metrics.includes("duration"))
        return "duration";
    if (metrics.includes("distance"))
        return "distance";
    if (metrics.includes("reps"))
        return "reps";
    return metrics[0] ?? "sets";
}
function calculateRecords(periodPoints, allTimePoints, unit) {
    const records = [];
    const metrics = ["load", "reps", "volume", "estimated1rm", "duration", "distance", "power", "level"];
    metrics.forEach((metric) => {
        const periodBest = maxPointByMetric(periodPoints, metric);
        if (!periodBest)
            return;
        const previousBestValue = Math.max(...allTimePoints
            .filter((point) => new Date(point.date).getTime() < new Date(periodBest.point.date).getTime())
            .map((point) => point.values[metric])
            .filter(isNumber), Number.NEGATIVE_INFINITY);
        if (previousBestValue !== Number.NEGATIVE_INFINITY && periodBest.value <= previousBestValue + getTolerance(metric, previousBestValue))
            return;
        records.push({
            id: `${periodBest.point.id}:${metric}`,
            metric,
            label: exports.PERFORMANCE_METRIC_LABELS[metric],
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
function markPointRecords(points, records) {
    return points.map((point) => ({
        ...point,
        recordMetrics: records.filter((record) => record.executionId === point.executionId).map((record) => record.metric),
    }));
}
function isSetValidForMainCalculations(set) {
    return Boolean(set.completed &&
        set.validForProgression &&
        !set.warmup &&
        set.setType !== "warmup" &&
        set.setType !== "approach" &&
        set.setType !== "invalid" &&
        !set.invalidReason &&
        !set.assisted &&
        !set.partial &&
        !set.interrupted);
}
function chooseBestSet(sets) {
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
function calculateVolume(sets) {
    const volumes = sets.map(calculateSetVolume).filter(isNumber);
    return volumes.length ? round(volumes.reduce(sum, 0), 1) : undefined;
}
function calculateSetVolume(set) {
    const load = getComparableLoad(set);
    if (typeof load !== "number" || typeof set.executedReps !== "number")
        return undefined;
    return round(load * set.executedReps, 1);
}
function getComparableLoad(set) {
    if (typeof set.executedLoad === "number")
        return set.executedLoad;
    if (typeof set.equipmentLevel === "number")
        return set.equipmentLevel;
    return undefined;
}
function formatBestSet(set, unit) {
    if (!set)
        return "Dados insuficientes";
    const load = getComparableLoad(set);
    const reps = set.executedReps;
    const duration = set.durationSeconds;
    const distance = set.distanceMeters;
    if (typeof load === "number" && typeof reps === "number") {
        return `${round(load, 1)} ${unit} x ${reps} rep(s)`;
    }
    if (typeof reps === "number")
        return `${reps} rep(s)`;
    if (typeof duration === "number")
        return `${duration}s`;
    if (typeof distance === "number")
        return `${distance}m`;
    return "Registro sem metrica principal";
}
function maxPointByMetric(points, metric) {
    return points.reduce((best, point) => {
        const value = point.values[metric];
        if (typeof value !== "number")
            return best;
        if (!best || value > best.value)
            return { point, value };
        return best;
    }, undefined);
}
function getMetricUnit(metric, unit) {
    if (metric === "duration")
        return "s";
    if (metric === "distance")
        return "m";
    if (metric === "speed")
        return "km/h";
    if (metric === "pace")
        return "min/km";
    if (metric === "power")
        return "W";
    if (metric === "effort")
        return "RPE";
    if (metric === "reps")
        return "rep";
    if (metric === "sets")
        return "serie";
    if (metric === "volume")
        return unit === "none" ? "rep" : unit;
    if (metric === "level")
        return "nivel";
    if (metric === "estimated1rm")
        return unit;
    return unit;
}
function getLooseMetricUnit(metric) {
    if (metric === "reps")
        return "rep(s)";
    if (metric === "sets")
        return "serie(s)";
    if (metric === "duration")
        return "s";
    if (metric === "distance")
        return "m";
    if (metric === "effort")
        return "RPE";
    return "";
}
function getTolerance(metric, baseline) {
    const relative = Math.abs(baseline) * 0.05;
    if (metric === "load" || metric === "bestSet" || metric === "estimated1rm")
        return Math.max(1, relative);
    if (metric === "reps" || metric === "sets")
        return Math.max(1, relative);
    if (metric === "effort")
        return 0.5;
    if (metric === "duration" || metric === "distance" || metric === "volume" || metric === "power")
        return Math.max(1, relative);
    return Math.max(0.5, relative);
}
function formatVariation(delta, percent, unit) {
    if (typeof delta !== "number")
        return "Comparacao indisponivel";
    const sign = delta > 0 ? "+" : "";
    const percentText = typeof percent === "number" ? ` (${sign}${percent}%)` : "";
    return `${sign}${round(delta, 2)} ${unit}${percentText}`;
}
function isPointInPeriod(point, period) {
    const time = new Date(point.date).getTime();
    if (period.start && time < new Date(period.start).getTime())
        return false;
    if (period.end && time > new Date(period.end).getTime())
        return false;
    return true;
}
function sortPointAsc(first, second) {
    return new Date(first.date).getTime() - new Date(second.date).getTime();
}
function sortSummary(first, second) {
    const statusWeight = {
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
function getSessionDisplayName(session) {
    const active = session.versions.find((version) => version.id === session.activeVersionId) ?? session.versions[0];
    return active?.identifier ? `${active.identifier} - ${active.name}` : active?.name ?? session.id;
}
function getDefaultEquipmentName(exercise) {
    if (exercise.loadUnit === "bodyweight" || exercise.loadUnit === "none")
        return "Peso corporal / sem equipamento";
    if (exercise.loadUnit === "level")
        return "Equipamento por nivel";
    return "Equipamento nao informado";
}
function normalizeKey(value) {
    return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
}
function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return startOfDay(next);
}
function addMonths(date, months) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return startOfDay(next);
}
function startOfDay(date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}
function endOfDay(date) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
}
function diffDays(left, right) {
    return Math.max(0, Math.floor((left.getTime() - right.getTime()) / 86400000));
}
function average(values) {
    if (values.length === 0)
        return 0;
    return values.reduce(sum, 0) / values.length;
}
function linearSlope(values) {
    if (values.length < 2)
        return 0;
    const xs = values.map((_, index) => index + 1);
    const avgX = average(xs);
    const avgY = average(values);
    const numerator = values.reduce((total, y, index) => total + (xs[index] - avgX) * (y - avgY), 0);
    const denominator = xs.reduce((total, x) => total + (x - avgX) ** 2, 0);
    return denominator === 0 ? 0 : numerator / denominator;
}
function round(value, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
function sum(total, value) {
    return total + value;
}
function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function uniqueSorted(items) {
    return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}
