"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRAINING_SESSION_STATUS_OPTIONS = void 0;
exports.getTrainingSessionStatusLabel = getTrainingSessionStatusLabel;
exports.formatTrainingDate = formatTrainingDate;
exports.formatTrainingDateTime = formatTrainingDateTime;
exports.daysUntilTrainingDate = daysUntilTrainingDate;
exports.getActiveVersion = getActiveVersion;
exports.getSessionEffectiveStatus = getSessionEffectiveStatus;
exports.getStudentSessionAccess = getStudentSessionAccess;
exports.validateSessionForPublication = validateSessionForPublication;
exports.getSessionAlerts = getSessionAlerts;
exports.getTrainingDashboard = getTrainingDashboard;
exports.getTrainingSessionsPage = getTrainingSessionsPage;
exports.getTrainingSessionById = getTrainingSessionById;
exports.ensureTrainingPlanForStudent = ensureTrainingPlanForStudent;
exports.createTrainingSession = createTrainingSession;
exports.updateTrainingSession = updateTrainingSession;
exports.duplicateTrainingSession = duplicateTrainingSession;
exports.publishTrainingSession = publishTrainingSession;
exports.setTrainingSessionStatus = setTrainingSessionStatus;
exports.extendTrainingSessionValidity = extendTrainingSessionValidity;
exports.startTrainingExecution = startTrainingExecution;
exports.saveTrainingExecutionSets = saveTrainingExecutionSets;
exports.finishTrainingExecution = finishTrainingExecution;
exports.interruptTrainingExecution = interruptTrainingExecution;
exports.getTrainingExecutionFeedbackContext = getTrainingExecutionFeedbackContext;
exports.formatExercisePrescription = formatExercisePrescription;
exports.getPreviousExecutionValue = getPreviousExecutionValue;
exports.buildTrainingLoadSummaries = buildTrainingLoadSummaries;
exports.getExercisePerformanceDashboard = getExercisePerformanceDashboard;
exports.getExercisePerformanceSummary = getExercisePerformanceSummary;
exports.correctTrainingExecutionSet = correctTrainingExecutionSet;
exports.getStudentTrainingPlans = getStudentTrainingPlans;
exports.resetTrainingPlanStoreForTests = resetTrainingPlanStoreForTests;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const exercise_performance_1 = require("@/services/exercise-performance");
const auth_store_1 = require("@/services/auth-store");
const feedback_store_1 = require("@/services/feedback-store");
exports.TRAINING_SESSION_STATUS_OPTIONS = [
    { value: "rascunho", label: "Rascunho" },
    { value: "programado", label: "Programado" },
    { value: "liberado", label: "Liberado" },
    { value: "bloqueado", label: "Bloqueado" },
    { value: "pausado", label: "Pausado" },
    { value: "vencido", label: "Vencido" },
    { value: "substituido", label: "Substituido" },
    { value: "arquivado", label: "Arquivado" },
];
const STORAGE_KEY = "@dragoncorp/training-plan-store/v1";
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function dateDaysFromNow(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
}
function makeAudit(action, actorId, actorRole, details) {
    return {
        id: createId("audit"),
        action,
        actorId,
        actorRole,
        createdAt: new Date().toISOString(),
        details,
    };
}
function cloneSessionVersion(version, patch = {}) {
    return {
        ...version,
        ...patch,
        sections: version.sections?.map((section) => ({ ...section })),
        exercises: version.exercises.map((exercise) => ({
            ...exercise,
            equipment: exercise.equipment ? { ...exercise.equipment } : undefined,
            plannedSetDetails: exercise.plannedSetDetails?.map((set) => ({ ...set })),
        })),
        muscleGroups: version.muscleGroups ? [...version.muscleGroups] : [],
        recommendedDays: version.recommendedDays ? [...version.recommendedDays] : [],
    };
}
function createExercise(input) {
    return {
        id: input.id ?? createId("exercise"),
        exerciseCatalogId: input.exerciseCatalogId,
        name: input.name,
        type: input.type,
        muscleGroup: input.muscleGroup,
        order: input.order,
        sectionId: input.sectionId,
        combinationId: input.combinationId,
        combinationLabel: input.combinationLabel,
        plannedSets: input.plannedSets ?? 3,
        plannedSetDetails: input.plannedSetDetails,
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
        validSet: input.validSet ?? (input.type !== "warmup" && input.type !== "cooldown"),
        alternativeExerciseName: input.alternativeExerciseName,
        safetyNotes: input.safetyNotes,
        equipment: input.equipment,
    };
}
function buildDefaultState() {
    const now = new Date().toISOString();
    const planId = "plan-elite";
    const sessionAId = "session-elite-a";
    const sessionBId = "session-elite-b";
    const sessionMobilityId = "session-mobility";
    const sessionCId = "session-elite-c";
    const plan = {
        id: planId,
        studentId: feedback_store_1.DEMO_STUDENT.id,
        trainerId: feedback_store_1.DEMO_TRAINER.id,
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
        notes: "Plano migrado da estrutura estatica anterior para sessoes versionadas.",
        createdAt: now,
        updatedAt: now,
        audit: [
            makeAudit("migrated_static_workout", feedback_store_1.DEMO_TRAINER.id, "trainer", "Treino estatico existente preservado como sessao A."),
        ],
    };
    const sessionA = createSessionFromVersion({
        id: sessionAId,
        planId,
        studentId: feedback_store_1.DEMO_STUDENT.id,
        trainerId: feedback_store_1.DEMO_TRAINER.id,
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
            objective: "Sessao de forca com movimentos globais e finalizacao de mobilidade.",
            description: "Preserva o conteudo do treino atual do app.",
            muscleGroups: ["Posterior", "Pernas", "Core", "Condicionamento"],
            level: "intermediario",
            estimatedDurationMinutes: 68,
            validFrom: dateDaysFromNow(-18),
            validUntil: dateDaysFromNow(72),
            recommendedDays: ["Segunda", "Quinta"],
            order: 1,
            instructions: "Priorize tecnica e registre carga executada em cada serie valida.",
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
            publishedBy: feedback_store_1.DEMO_TRAINER.id,
        },
    });
    const sessionB = createSessionFromVersion({
        id: sessionBId,
        planId,
        studentId: feedback_store_1.DEMO_STUDENT.id,
        trainerId: feedback_store_1.DEMO_TRAINER.id,
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
            publishedBy: feedback_store_1.DEMO_TRAINER.id,
        },
    });
    const sessionC = createSessionFromVersion({
        id: sessionCId,
        planId,
        studentId: feedback_store_1.DEMO_STUDENT.id,
        trainerId: feedback_store_1.DEMO_TRAINER.id,
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
        studentId: feedback_store_1.DEMO_STUDENT.id,
        trainerId: feedback_store_1.DEMO_TRAINER.id,
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
            publishedBy: feedback_store_1.DEMO_TRAINER.id,
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
function createSessionFromVersion(input) {
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
            makeAudit("session_created", input.trainerId, "trainer", "Sessao criada no plano versionado."),
        ],
    };
}
function createDefaultExecutions(plan, sessionA, sessionB) {
    const executionA = createCompletedExecution(plan, sessionA, dateDaysFromNow(-8), [
        { exerciseId: "deadlift", load: 78, reps: 5, effort: 7 },
        { exerciseId: "back-squat", load: 80, reps: 6, effort: 7 },
    ]);
    const executionB = createCompletedExecution(plan, sessionB, dateDaysFromNow(-3), [
        { exerciseId: "pull-down", load: 45, reps: 10, effort: 7 },
        {
            exerciseId: "machine-row",
            load: 8,
            reps: 11,
            effort: 8,
            painRegion: "ombro direito",
            painLevel: 2,
        },
    ]);
    return {
        [executionA.id]: executionA,
        [executionB.id]: executionB,
    };
}
function createCompletedExecution(plan, session, startedAt, setsInput) {
    const version = getActiveVersion(session);
    const finishedAt = new Date(new Date(startedAt).getTime() + version.estimatedDurationMinutes * 60000).toISOString();
    const sets = setsInput.flatMap((input) => {
        const exercise = version.exercises.find((item) => item.id === input.exerciseId);
        if (!exercise)
            return [];
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
                pain: input.painRegion && typeof input.painLevel === "number"
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
async function readState() {
    const stored = await async_storage_1.default.getItem(STORAGE_KEY);
    if (!stored) {
        const initial = buildDefaultState();
        await async_storage_1.default.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }
    try {
        const parsed = JSON.parse(stored);
        const next = {
            plans: parsed.plans ?? {},
            sessions: parsed.sessions ?? {},
            executions: parsed.executions ?? {},
            migratedStaticWorkoutAt: parsed.migratedStaticWorkoutAt,
        };
        if (!Object.values(next.plans).some((plan) => plan.studentId === feedback_store_1.DEMO_STUDENT.id)) {
            const defaultState = buildDefaultState();
            const merged = {
                plans: { ...next.plans, ...defaultState.plans },
                sessions: { ...next.sessions, ...defaultState.sessions },
                executions: { ...next.executions, ...defaultState.executions },
                migratedStaticWorkoutAt: next.migratedStaticWorkoutAt ?? defaultState.migratedStaticWorkoutAt,
            };
            await async_storage_1.default.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
        }
        return next;
    }
    catch {
        const initial = buildDefaultState();
        await async_storage_1.default.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }
}
async function writeState(nextState) {
    await async_storage_1.default.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
function hasPlanPermission(plan, requesterId, role) {
    if (role === "admin")
        return true;
    if (role === "student")
        return plan.studentId === requesterId;
    return plan.trainerId === requesterId;
}
function hasSessionPermission(session, requesterId, role) {
    if (role === "admin")
        return true;
    if (role === "student")
        return session.studentId === requesterId;
    return session.trainerId === requesterId;
}
function requireSessionPermission(session, requesterId, role) {
    if (!hasSessionPermission(session, requesterId, role)) {
        throw new Error("Voce nao tem permissao para acessar esta sessao.");
    }
}
function getTrainingSessionStatusLabel(status) {
    return (exports.TRAINING_SESSION_STATUS_OPTIONS.find((option) => option.value === status)
        ?.label ?? status);
}
function formatTrainingDate(value) {
    if (!value)
        return "Sem data";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Sem data";
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}
function formatTrainingDateTime(value) {
    if (!value)
        return "Sem registro";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Sem registro";
    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function daysUntilTrainingDate(value, referenceDate = new Date()) {
    if (!value)
        return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return Math.ceil((date.getTime() - referenceDate.getTime()) / 86400000);
}
function getActiveVersion(session) {
    const active = session.versions.find((version) => version.id === session.activeVersionId);
    if (active)
        return active;
    const published = session.versions.find((version) => version.status === "published" || version.status === "scheduled");
    if (published)
        return published;
    return session.versions[0];
}
function getSessionEffectiveStatus(session, referenceDate = new Date()) {
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
function getStudentSessionAccess(session, referenceDate = new Date()) {
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
    if (effectiveStatus === "vencido" &&
        !session.release.allowExecutionAfterExpiration) {
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
function validateSessionForPublication(session) {
    const version = getActiveVersion(session);
    const errors = [];
    if (!version.name.trim())
        errors.push("Informe o nome da sessao.");
    if (!version.objective.trim())
        errors.push("Informe o objetivo da sessao.");
    if (!version.validFrom || !version.validUntil)
        errors.push("Informe inicio e vencimento.");
    if (new Date(version.validUntil).getTime() <
        new Date(version.validFrom).getTime()) {
        errors.push("A data de vencimento precisa ser posterior ao inicio.");
    }
    if (version.estimatedDurationMinutes <= 0)
        errors.push("Informe uma duracao estimada valida.");
    if (version.exercises.length === 0)
        errors.push("Adicione pelo menos um exercicio.");
    version.exercises.forEach((exercise) => {
        if (!exercise.name.trim())
            errors.push("Existe exercicio sem nome.");
        if (exercise.plannedSets <= 0)
            errors.push(`${exercise.name}: informe series validas.`);
        if (exercise.loadUnit !== "none" &&
            exercise.plannedLoad !== undefined &&
            exercise.plannedLoad < 0) {
            errors.push(`${exercise.name}: carga planejada invalida.`);
        }
    });
    return { valid: errors.length === 0, errors };
}
function getSessionAlerts(session, executions) {
    const version = getActiveVersion(session);
    const alerts = [];
    const effectiveStatus = getSessionEffectiveStatus(session);
    const daysToExpiration = daysUntilTrainingDate(version.validUntil);
    const executionItems = executions.filter((execution) => execution.sessionId === session.id);
    if (effectiveStatus === "vencido") {
        alerts.push({
            id: `${session.id}:expired`,
            title: "Sessao vencida",
            detail: "Revise ou prorrogue a validade.",
            tone: "danger",
            sessionId: session.id,
        });
    }
    else if (daysToExpiration !== null &&
        [15, 7, 0].some((days) => daysToExpiration <= days) &&
        daysToExpiration <= 15) {
        alerts.push({
            id: `${session.id}:expiring`,
            title: "Sessao vencendo",
            detail: daysToExpiration <= 0
                ? "Vence hoje."
                : `Vence em ${daysToExpiration} dia(s).`,
            tone: "warning",
            sessionId: session.id,
        });
    }
    if (executionItems.some((execution) => execution.sets.some((set) => set.pain))) {
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
            detail: session.release.blockedReason ?? "Aluno nao pode iniciar esta sessao.",
            tone: "warning",
            sessionId: session.id,
        });
    }
    return alerts;
}
async function getTrainingDashboard(studentId = feedback_store_1.DEMO_STUDENT.id, requesterId = feedback_store_1.DEMO_TRAINER.id, role = "trainer", perspective = "trainer") {
    const state = await readState();
    const plan = Object.values(state.plans).find((item) => item.studentId === studentId && item.status !== "arquivado");
    if (!plan)
        throw new Error("Plano de treino nao encontrado.");
    if (!hasPlanPermission(plan, requesterId, role))
        throw new Error("Voce nao tem permissao para acessar este plano.");
    const planSessions = plan.sessionIds
        .map((sessionId) => state.sessions[sessionId])
        .filter((session) => Boolean(session))
        .filter((session) => hasSessionPermission(session, requesterId, role))
        .sort((first, second) => getActiveVersion(first).order - getActiveVersion(second).order);
    const visibleSessions = perspective === "student"
        ? planSessions.filter((session) => getStudentSessionAccess(session).visible)
        : planSessions;
    const executions = Object.values(state.executions)
        .filter((execution) => execution.planId === plan.id && execution.studentId === studentId)
        .sort((first, second) => new Date(second.startedAt).getTime() -
        new Date(first.startedAt).getTime());
    const completedSessionIds = new Set(executions
        .filter((execution) => execution.status === "completed")
        .map((execution) => execution.sessionId));
    const releasedSessions = planSessions.filter((session) => getSessionEffectiveStatus(session) === "liberado");
    const progressPercent = releasedSessions.length
        ? Math.round((completedSessionIds.size / releasedSessions.length) * 100)
        : 0;
    const nextSuggestedSession = releasedSessions.find((session) => !completedSessionIds.has(session.id) &&
        getStudentSessionAccess(session).canStart) ??
        releasedSessions.find((session) => getStudentSessionAccess(session).canStart);
    const alerts = planSessions.flatMap((session) => getSessionAlerts(session, executions));
    const trainerAccount = await (0, auth_store_1.getAuthUserById)(plan.trainerId);
    const trainer = {
        id: plan.trainerId,
        name: trainerAccount?.name ?? feedback_store_1.DEMO_TRAINER.name,
        avatar: trainerAccount?.avatar ?? undefined,
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
async function getTrainingSessionsPage(studentId, requesterId, role, options = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, options.limit ?? 15);
    const state = await readState();
    const plans = Object.values(state.plans).filter((item) => item.studentId === studentId && item.status !== "arquivado");
    if (plans.length && !plans.some((plan) => hasPlanPermission(plan, requesterId, role))) {
        throw new Error("Voce nao tem permissao para acessar os treinos deste aluno.");
    }
    const allSessions = plans
        .flatMap((plan) => plan.sessionIds.map((sessionId) => state.sessions[sessionId]))
        .filter((session) => Boolean(session))
        .filter((session) => session.status !== "arquivado")
        .filter((session) => hasSessionPermission(session, requesterId, role))
        .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
    const total = allSessions.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = allSessions.slice(start, start + limit);
    return { items, page, limit, total, totalPages };
}
async function getTrainingSessionById(sessionId, requesterId, role) {
    const state = await readState();
    const session = state.sessions[sessionId];
    if (!session)
        throw new Error("Sessao nao encontrada.");
    requireSessionPermission(session, requesterId, role);
    return session;
}
// Garante que o aluno tenha um plano para receber sessoes: cria um plano vazio
// na primeira vez que o treinador monta um treino para ele (evita depender de
// dados de seed/demo, que so existiam para o aluno de demonstracao).
async function ensureTrainingPlanForStudent(studentId, trainerId) {
    const state = await readState();
    const existing = Object.values(state.plans).find((plan) => plan.studentId === studentId && plan.status !== "arquivado");
    if (existing)
        return existing;
    const now = new Date().toISOString();
    const plan = {
        id: createId("plan"),
        studentId,
        trainerId,
        name: "Plano de Treino",
        objective: "Acompanhamento personalizado",
        status: "ativo",
        version: 1,
        startAt: now,
        validUntil: dateDaysFromNow(180),
        frequencyPerWeek: 3,
        sessionIds: [],
        weeklySchedule: [],
        createdAt: now,
        updatedAt: now,
        audit: [
            makeAudit("plan_created", trainerId, "trainer", "Plano criado automaticamente ao montar o primeiro treino do aluno."),
        ],
    };
    await writeState({
        ...state,
        plans: { ...state.plans, [plan.id]: plan },
    });
    return plan;
}
async function createTrainingSession(input, actorId = feedback_store_1.DEMO_TRAINER.id) {
    const state = await readState();
    const plan = state.plans[input.planId];
    if (!plan)
        throw new Error("Plano de treino nao encontrado.");
    if (!hasPlanPermission(plan, actorId, "trainer"))
        throw new Error("Voce nao tem permissao para criar sessoes neste plano.");
    const now = new Date().toISOString();
    const sessionId = createId("session");
    const versionId = createId("version");
    const publishMode = input.publishMode ?? "draft";
    const status = publishMode === "now"
        ? "liberado"
        : publishMode === "scheduled"
            ? "programado"
            : "rascunho";
    const version = {
        id: versionId,
        sessionId,
        version: 1,
        status: publishMode === "now"
            ? "published"
            : publishMode === "scheduled"
                ? "scheduled"
                : "draft",
        name: input.name.trim(),
        identifier: input.identifier?.trim() || undefined,
        objective: input.objective.trim(),
        description: input.description?.trim(),
        muscleGroups: (input.muscleGroups ?? []).filter(Boolean),
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
        coverUrl: input.coverUrl?.trim() || undefined,
        sections: input.sections ?? [],
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
    const validation = publishMode === "draft"
        ? { valid: true, errors: [] }
        : validateSessionForPublication(session);
    if (!validation.valid)
        throw new Error(validation.errors.join("\n"));
    const updatedPlan = {
        ...plan,
        sessionIds: [...plan.sessionIds, sessionId],
        updatedAt: now,
        audit: [
            makeAudit("session_added", actorId, "trainer", `Sessao ${version.name} adicionada ao plano.`),
            ...plan.audit,
        ],
    };
    await writeState({
        ...state,
        plans: { ...state.plans, [plan.id]: updatedPlan },
        sessions: { ...state.sessions, [sessionId]: session },
    });
    if (publishMode !== "draft") {
        await (0, feedback_store_1.createWorkoutNotification)({
            userId: plan.studentId,
            audience: "student",
            title: publishMode === "scheduled"
                ? "Treino programado"
                : "Nova sessao liberada",
            message: `${version.identifier ? `${version.identifier} - ` : ""}${version.name} foi adicionada ao seu plano.`,
            dedupeKey: `session-created:${session.id}:${version.id}`,
        });
    }
    return { plan: updatedPlan, session };
}
async function updateTrainingSession(sessionId, input, actorId = feedback_store_1.DEMO_TRAINER.id) {
    const state = await readState();
    const session = state.sessions[sessionId];
    if (!session)
        throw new Error("Sessao nao encontrada.");
    requireSessionPermission(session, actorId, "trainer");
    const previous = getActiveVersion(session);
    const now = new Date().toISOString();
    const publishMode = input.publishMode ?? "draft";
    const previousStatus = session.status;
    const nextStatus = publishMode === "now"
        ? "liberado"
        : publishMode === "scheduled"
            ? "programado"
            : "rascunho";
    const nextVersion = {
        id: createId("version"),
        sessionId,
        version: previous.version + 1,
        status: publishMode === "now"
            ? "published"
            : publishMode === "scheduled"
                ? "scheduled"
                : "draft",
        createdFromVersionId: previous.id,
        name: input.name.trim(),
        identifier: input.identifier?.trim() || undefined,
        objective: input.objective.trim(),
        description: input.description?.trim(),
        muscleGroups: (input.muscleGroups ?? previous.muscleGroups ?? []).filter(Boolean),
        level: input.level,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        validFrom: input.validFrom ?? previous.validFrom,
        validUntil: input.validUntil ?? previous.validUntil,
        recommendedDays: input.recommendedDays,
        order: previous.order,
        instructions: input.instructions?.trim(),
        releaseAt: input.releaseAt,
        showWhenLocked: input.showWhenLocked ?? previous.showWhenLocked,
        requiresSupervision: input.requiresSupervision ?? previous.requiresSupervision,
        privateTrainerNotes: input.privateTrainerNotes?.trim(),
        coverUrl: input.coverUrl !== undefined ? (input.coverUrl?.trim() || undefined) : previous.coverUrl,
        sections: input.sections ?? previous.sections ?? [],
        exercises: input.exercises ?? [],
        createdAt: now,
        publishedAt: publishMode === "now" ? now : previous.publishedAt,
        publishedBy: publishMode === "now" ? actorId : previous.publishedBy,
    };
    const updatedSession = {
        ...session,
        status: nextStatus,
        activeVersionId: nextVersion.id,
        versions: [...session.versions, nextVersion],
        release: {
            ...session.release,
            visibleToStudent: publishMode !== "draft",
        },
        updatedAt: now,
        statusHistory: previousStatus === nextStatus
            ? session.statusHistory
            : [
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
            makeAudit("session_updated", actorId, "trainer", `Sessao ${nextVersion.name} atualizada.`),
            ...session.audit,
        ],
    };
    const validation = publishMode === "draft"
        ? { valid: true, errors: [] }
        : validateSessionForPublication(updatedSession);
    if (!validation.valid)
        throw new Error(validation.errors.join("\n"));
    await writeState({
        ...state,
        sessions: { ...state.sessions, [sessionId]: updatedSession },
    });
    if (publishMode !== "draft" && previousStatus !== nextStatus) {
        await (0, feedback_store_1.createWorkoutNotification)({
            userId: session.studentId,
            audience: "student",
            title: publishMode === "scheduled" ? "Treino programado" : "Treino atualizado",
            message: `${nextVersion.identifier ? `${nextVersion.identifier} - ` : ""}${nextVersion.name} foi atualizado.`,
            dedupeKey: `session-updated:${session.id}:${nextVersion.id}`,
        });
    }
    return updatedSession;
}
async function duplicateTrainingSession(sessionId, actorId = feedback_store_1.DEMO_TRAINER.id) {
    const state = await readState();
    const session = state.sessions[sessionId];
    if (!session)
        throw new Error("Sessao nao encontrada.");
    requireSessionPermission(session, actorId, "trainer");
    const plan = state.plans[session.planId];
    if (!plan)
        throw new Error("Plano de treino nao encontrado.");
    const source = getActiveVersion(session);
    // Nunca compartilhar registros mutaveis (secoes, combinacoes, series) entre o
    // treino original e a copia: gera IDs novos e remapeia todas as referencias.
    const sectionIdMap = new Map();
    const sections = (source.sections ?? []).map((section, index) => {
        const newId = createId("section");
        sectionIdMap.set(section.id, newId);
        return { ...section, id: newId, order: index };
    });
    const combinationIdMap = new Map();
    const exercises = source.exercises.map((exercise, index) => {
        let combinationId;
        if (exercise.combinationId) {
            combinationId = combinationIdMap.get(exercise.combinationId);
            if (!combinationId) {
                combinationId = createId("combination");
                combinationIdMap.set(exercise.combinationId, combinationId);
            }
        }
        return {
            ...exercise,
            id: createId("exercise"),
            order: index + 1,
            sectionId: exercise.sectionId ? sectionIdMap.get(exercise.sectionId) : undefined,
            combinationId,
            plannedSetDetails: exercise.plannedSetDetails?.map((set) => ({
                ...set,
                id: createId("set"),
            })),
            equipment: exercise.equipment ? { ...exercise.equipment } : undefined,
        };
    });
    return createTrainingSession({
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
        sections,
        exercises,
        publishMode: "draft",
    }, actorId);
}
async function publishTrainingSession(sessionId, actorId = feedback_store_1.DEMO_TRAINER.id, scheduledAt) {
    const state = await readState();
    const session = state.sessions[sessionId];
    if (!session)
        throw new Error("Sessao nao encontrada.");
    requireSessionPermission(session, actorId, "trainer");
    const validation = validateSessionForPublication(session);
    if (!validation.valid)
        throw new Error(validation.errors.join("\n"));
    const now = new Date().toISOString();
    const previousStatus = session.status;
    const nextStatus = scheduledAt
        ? "programado"
        : "liberado";
    const activeVersion = getActiveVersion(session);
    const versions = session.versions.map((version) => {
        if (version.id !== activeVersion.id)
            return version;
        return {
            ...version,
            status: scheduledAt
                ? "scheduled"
                : "published",
            releaseAt: scheduledAt,
            publishedAt: scheduledAt ? undefined : now,
            publishedBy: actorId,
        };
    });
    const updatedSession = {
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
            makeAudit("session_published", actorId, "trainer", scheduledAt ? "Publicacao programada." : "Sessao publicada ao aluno."),
            ...session.audit,
        ],
    };
    await writeState({
        ...state,
        sessions: { ...state.sessions, [sessionId]: updatedSession },
    });
    await (0, feedback_store_1.createWorkoutNotification)({
        userId: session.studentId,
        audience: "student",
        title: scheduledAt ? "Treino programado" : "Sessao liberada",
        message: `${activeVersion.identifier ? `${activeVersion.identifier} - ` : ""}${activeVersion.name} ${scheduledAt ? "foi programada" : "esta disponivel"}.`,
        dedupeKey: `session-published:${session.id}:${activeVersion.id}:${scheduledAt ?? "now"}`,
    });
    return updatedSession;
}
async function setTrainingSessionStatus(sessionId, nextStatus, reason, actorId = feedback_store_1.DEMO_TRAINER.id) {
    const state = await readState();
    const session = state.sessions[sessionId];
    if (!session)
        throw new Error("Sessao nao encontrada.");
    requireSessionPermission(session, actorId, "trainer");
    const executions = Object.values(state.executions).filter((execution) => execution.sessionId === sessionId);
    if (nextStatus === "arquivado" && executions.length > 0) {
        reason =
            reason.trim() || "Sessao arquivada preservando execucoes registradas.";
    }
    const now = new Date().toISOString();
    const updatedSession = {
        ...session,
        status: nextStatus,
        release: {
            ...session.release,
            visibleToStudent: nextStatus === "liberado" || session.release.visibleToStudent,
            blockedReason: nextStatus === "bloqueado"
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
            makeAudit("session_status_changed", actorId, "trainer", reason.trim() || `Status alterado para ${nextStatus}.`),
            ...session.audit,
        ],
    };
    await writeState({
        ...state,
        sessions: { ...state.sessions, [sessionId]: updatedSession },
    });
    if (["bloqueado", "pausado", "substituido", "liberado"].includes(nextStatus)) {
        const version = getActiveVersion(updatedSession);
        await (0, feedback_store_1.createWorkoutNotification)({
            userId: session.studentId,
            audience: "student",
            title: nextStatus === "liberado" ? "Sessao liberada" : "Sessao atualizada",
            message: `${version.identifier ? `${version.identifier} - ` : ""}${version.name}: ${getTrainingSessionStatusLabel(nextStatus)}.`,
            dedupeKey: `session-status:${session.id}:${nextStatus}:${now.slice(0, 16)}`,
        });
    }
    return updatedSession;
}
async function extendTrainingSessionValidity(sessionId, validUntil, actorId = feedback_store_1.DEMO_TRAINER.id) {
    const state = await readState();
    const session = state.sessions[sessionId];
    if (!session)
        throw new Error("Sessao nao encontrada.");
    requireSessionPermission(session, actorId, "trainer");
    const activeVersion = getActiveVersion(session);
    if (new Date(validUntil).getTime() <=
        new Date(activeVersion.validFrom).getTime()) {
        throw new Error("A nova validade precisa ser posterior ao inicio da sessao.");
    }
    const now = new Date().toISOString();
    const versions = session.versions.map((version) => version.id === activeVersion.id ? { ...version, validUntil } : version);
    const updatedSession = {
        ...session,
        status: session.status === "vencido"
            ? "liberado"
            : session.status,
        versions,
        updatedAt: now,
        audit: [
            makeAudit("session_validity_extended", actorId, "trainer", `Validade prorrogada ate ${formatTrainingDate(validUntil)}.`),
            ...session.audit,
        ],
    };
    await writeState({
        ...state,
        sessions: { ...state.sessions, [sessionId]: updatedSession },
    });
    await (0, feedback_store_1.createWorkoutNotification)({
        userId: session.studentId,
        audience: "student",
        title: "Validade prorrogada",
        message: `${activeVersion.name} foi prorrogada ate ${formatTrainingDate(validUntil)}.`,
        dedupeKey: `session-extended:${session.id}:${validUntil}`,
    });
    return updatedSession;
}
async function startTrainingExecution(sessionId, studentId = feedback_store_1.DEMO_STUDENT.id) {
    const state = await readState();
    const session = state.sessions[sessionId];
    if (!session)
        throw new Error("Sessao nao encontrada.");
    requireSessionPermission(session, studentId, "student");
    const access = getStudentSessionAccess(session);
    if (!access.canStart)
        throw new Error(access.reason);
    const activeInProgress = Object.values(state.executions).find((execution) => execution.sessionId === sessionId &&
        execution.studentId === studentId &&
        execution.status === "in_progress");
    if (activeInProgress)
        return activeInProgress;
    const plan = state.plans[session.planId];
    if (!plan)
        throw new Error("Plano de treino nao encontrado.");
    const version = getActiveVersion(session);
    const now = new Date().toISOString();
    const execution = {
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
async function saveTrainingExecutionSets(executionId, sets, studentId = feedback_store_1.DEMO_STUDENT.id) {
    const state = await readState();
    const execution = state.executions[executionId];
    if (!execution || execution.studentId !== studentId)
        throw new Error("Execucao nao encontrada.");
    const now = new Date().toISOString();
    const updatedExecution = {
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
async function finishTrainingExecution(executionId, sets, studentId = feedback_store_1.DEMO_STUDENT.id) {
    const state = await readState();
    const execution = state.executions[executionId];
    if (!execution || execution.studentId !== studentId)
        throw new Error("Execucao nao encontrada.");
    const now = new Date().toISOString();
    const completedSets = sets.map((set) => ({
        id: createId("set"),
        ...set,
        recordedAt: now,
    }));
    const skippedExerciseIds = execution.snapshot.exercises
        .filter((exercise) => !completedSets.some((set) => set.exerciseId === exercise.id && set.completed))
        .map((exercise) => exercise.id);
    const durationMinutes = Math.max(1, Math.round((new Date(now).getTime() - new Date(execution.startedAt).getTime()) /
        60000));
    const updatedExecution = {
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
    await (0, feedback_store_1.createWorkoutNotification)({
        userId: execution.trainerId,
        audience: "trainer",
        title: completedSets.some((set) => set.pain)
            ? "Treino concluido com dor"
            : "Treino concluido",
        message: `${feedback_store_1.DEMO_STUDENT.name} concluiu ${execution.snapshot.name}.`,
        highlightPain: completedSets.some((set) => set.pain),
        dedupeKey: `execution-completed:${execution.id}`,
    });
    return updatedExecution;
}
async function interruptTrainingExecution(executionId, reason, studentId = feedback_store_1.DEMO_STUDENT.id) {
    const state = await readState();
    const execution = state.executions[executionId];
    if (!execution || execution.studentId !== studentId)
        throw new Error("Execucao nao encontrada.");
    const now = new Date().toISOString();
    const updatedExecution = {
        ...execution,
        status: "interrupted",
        finishedAt: now,
        updatedAt: now,
        skippedExerciseIds: execution.snapshot.exercises.map((exercise) => exercise.id),
    };
    await writeState({
        ...state,
        executions: { ...state.executions, [executionId]: updatedExecution },
    });
    await (0, feedback_store_1.createWorkoutNotification)({
        userId: execution.trainerId,
        audience: "trainer",
        title: "Sessao interrompida",
        message: `${feedback_store_1.DEMO_STUDENT.name} interrompeu ${execution.snapshot.name}. ${reason.trim()}`,
        dedupeKey: `execution-interrupted:${execution.id}`,
    });
    return updatedExecution;
}
async function getTrainingExecutionFeedbackContext(executionId) {
    const state = await readState();
    const execution = state.executions[executionId];
    if (!execution)
        throw new Error("Execucao nao encontrada.");
    const plan = state.plans[execution.planId];
    const exercises = execution.snapshot.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        prescription: formatExercisePrescription(exercise),
        notes: exercise.observation,
    }));
    return {
        studentId: execution.studentId,
        studentName: feedback_store_1.DEMO_STUDENT.name,
        studentAvatar: feedback_store_1.DEMO_STUDENT.avatar,
        trainerId: execution.trainerId,
        trainerName: feedback_store_1.DEMO_TRAINER.name,
        workoutId: execution.sessionId,
        workoutName: execution.snapshot.name,
        planId: execution.planId,
        planName: plan?.name,
        executionId: execution.id,
        startedAt: execution.startedAt,
        exercises,
    };
}
function formatExercisePrescription(exercise) {
    const firstSet = exercise.plannedSetDetails?.[0];
    const setCount = exercise.plannedSetDetails?.length ?? exercise.plannedSets;
    if (firstSet) {
        const load = firstSet.load ? ` • ${firstSet.load}` : "";
        return `${setCount} serie(s) x ${firstSet.reps || "livre"}${load}`;
    }
    const reps = exercise.plannedReps
        ? `${exercise.plannedReps} reps`
        : exercise.plannedRepsMin && exercise.plannedRepsMax
            ? `${exercise.plannedRepsMin}-${exercise.plannedRepsMax} reps`
            : exercise.durationSeconds
                ? `${exercise.durationSeconds}s`
                : "livre";
    const load = exercise.plannedLoad !== undefined
        ? ` • ${exercise.plannedLoad} ${exercise.loadUnit}`
        : "";
    return `${setCount} serie(s) x ${reps}${load}`;
}
function getPreviousExecutionValue(executions, exerciseId) {
    const execution = executions
        .filter((item) => item.status === "completed")
        .sort((first, second) => new Date(second.startedAt).getTime() -
        new Date(first.startedAt).getTime())
        .find((item) => item.sets.some((set) => set.exerciseId === exerciseId && set.completed));
    const set = execution?.sets.find((item) => item.exerciseId === exerciseId && item.completed);
    if (!set)
        return undefined;
    return {
        load: set.executedLoad,
        reps: set.executedReps,
        effort: set.effort,
        date: execution?.startedAt,
    };
}
function buildTrainingLoadSummaries(executions) {
    const grouped = new Map();
    executions.forEach((execution) => {
        execution.sets.forEach((set) => {
            if (!set.completed || !set.validForProgression || set.warmup)
                return;
            const key = `${set.exerciseId}|${set.loadUnit}`;
            grouped.set(key, [...(grouped.get(key) ?? []), set]);
        });
    });
    return [...grouped.entries()].map(([key, sets]) => {
        const sorted = sets.sort((first, second) => new Date(first.recordedAt).getTime() -
            new Date(second.recordedAt).getTime());
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const volumes = sorted
            .map((set) => {
            if (set.loadUnit !== "kg" ||
                typeof set.executedLoad !== "number" ||
                typeof set.executedReps !== "number")
                return undefined;
            return set.executedLoad * set.executedReps;
        })
            .filter((value) => typeof value === "number");
        const loads = sorted
            .map((set) => set.executedLoad)
            .filter((value) => typeof value === "number");
        const firstVolume = volumes[0];
        const lastVolume = volumes[volumes.length - 1];
        const trendLabel = sorted.length < 2
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
async function getExercisePerformanceDashboard(studentId = feedback_store_1.DEMO_STUDENT.id, requesterId = feedback_store_1.DEMO_TRAINER.id, role = "trainer", periodPreset = "3m", customStart, customEnd) {
    const state = await readState();
    const plan = Object.values(state.plans).find((item) => item.studentId === studentId && item.status !== "arquivado");
    if (!plan)
        throw new Error("Plano de treino nao encontrado.");
    if (!hasPlanPermission(plan, requesterId, role))
        throw new Error("Voce nao tem permissao para acessar este plano.");
    const sessions = plan.sessionIds
        .map((sessionId) => state.sessions[sessionId])
        .filter((session) => Boolean(session))
        .filter((session) => hasSessionPermission(session, requesterId, role));
    const executions = Object.values(state.executions)
        .filter((execution) => execution.planId === plan.id && execution.studentId === studentId)
        .filter((execution) => role !== "student" || execution.studentId === requesterId)
        .sort((first, second) => new Date(first.startedAt).getTime() -
        new Date(second.startedAt).getTime());
    return (0, exercise_performance_1.buildExercisePerformanceDashboard)({
        plan,
        sessions,
        executions,
        periodPreset,
        customStart,
        customEnd,
    });
}
async function getExercisePerformanceSummary(exerciseKey, studentId = feedback_store_1.DEMO_STUDENT.id, requesterId = feedback_store_1.DEMO_TRAINER.id, role = "trainer", periodPreset = "3m", customStart, customEnd) {
    const dashboard = await getExercisePerformanceDashboard(studentId, requesterId, role, periodPreset, customStart, customEnd);
    const summary = (0, exercise_performance_1.getExercisePerformanceSummaryByKey)(dashboard, exerciseKey);
    if (!summary)
        throw new Error("Historico do exercicio nao encontrado.");
    return { dashboard, summary };
}
async function correctTrainingExecutionSet({ executionId, setId, patch, reason, actorId = feedback_store_1.DEMO_TRAINER.id, actorRole = "trainer", }) {
    const state = await readState();
    const execution = state.executions[executionId];
    if (!execution)
        throw new Error("Execucao nao encontrada.");
    if (actorRole === "student")
        throw new Error("Aluno nao pode corrigir historico concluido sem autorizacao.");
    const plan = state.plans[execution.planId];
    if (!plan || !hasPlanPermission(plan, actorId, actorRole)) {
        throw new Error("Voce nao tem permissao para corrigir esta execucao.");
    }
    if (!reason.trim())
        throw new Error("Informe o motivo da correcao.");
    const now = new Date().toISOString();
    const updatedSets = execution.sets.map((set) => {
        if (set.id !== setId)
            return set;
        const allowedPatch = {
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
        const cleanPatch = Object.fromEntries(Object.entries(allowedPatch).filter(([, value]) => value !== undefined));
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
    if (updatedSets === execution.sets ||
        !execution.sets.some((set) => set.id === setId)) {
        throw new Error("Serie nao encontrada.");
    }
    const updatedExecution = {
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
function pickSetAuditValues(set) {
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
async function getStudentTrainingPlans(studentId) {
    const state = await readState();
    return Object.values(state.plans).filter((p) => p.studentId === studentId);
}
async function resetTrainingPlanStoreForTests() {
    await writeState(buildDefaultState());
}
