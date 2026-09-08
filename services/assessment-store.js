"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSTURAL_REGION_LABELS = exports.SKINFOLD_LABELS = exports.PERIMETER_LABELS = exports.PHOTO_VIEWS = exports.ASSESSMENT_STEPS = exports.DEMO_TRAINER = exports.DEMO_STUDENT = void 0;
exports.formatAssessmentDate = formatAssessmentDate;
exports.formatAssessmentDateTime = formatAssessmentDateTime;
exports.getAssessmentStatusLabel = getAssessmentStatusLabel;
exports.getAssessmentTypeLabel = getAssessmentTypeLabel;
exports.normalizeDecimal = normalizeDecimal;
exports.calculateBodyComposition = calculateBodyComposition;
exports.calculateBmrMifflin = calculateBmrMifflin;
exports.getAge = getAge;
exports.averageSkinfold = averageSkinfold;
exports.calculateSkinfoldBodyFat = calculateSkinfoldBodyFat;
exports.calculatePerimeterAsymmetry = calculatePerimeterAsymmetry;
exports.recalculateAssessment = recalculateAssessment;
exports.getAssessmentSummary = getAssessmentSummary;
exports.createAssessmentDraft = createAssessmentDraft;
exports.listAssessmentsForTrainer = listAssessmentsForTrainer;
exports.listAssessmentsForStudent = listAssessmentsForStudent;
exports.getAssessmentById = getAssessmentById;
exports.saveAssessment = saveAssessment;
exports.acceptPhotoConsent = acceptPhotoConsent;
exports.addAssessmentPhoto = addAssessmentPhoto;
exports.removeAssessmentPhoto = removeAssessmentPhoto;
exports.addPosturalAnnotation = addPosturalAnnotation;
exports.removePosturalAnnotation = removePosturalAnnotation;
exports.completeAssessment = completeAssessment;
exports.reopenAssessment = reopenAssessment;
exports.softDeleteAssessment = softDeleteAssessment;
exports.compareAssessments = compareAssessments;
exports.resetAssessmentStoreForTests = resetAssessmentStoreForTests;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const body_composition_protocols_1 = require("@/services/body-composition-protocols");
const functional_test_catalog_1 = require("@/services/functional-test-catalog");
const cardiorespiratory_protocols_1 = require("@/services/cardiorespiratory-protocols");
const feedback_store_1 = require("@/services/feedback-store");
Object.defineProperty(exports, "DEMO_STUDENT", { enumerable: true, get: function () { return feedback_store_1.DEMO_STUDENT; } });
Object.defineProperty(exports, "DEMO_TRAINER", { enumerable: true, get: function () { return feedback_store_1.DEMO_TRAINER; } });
exports.ASSESSMENT_STEPS = [
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
exports.PHOTO_VIEWS = [
    { id: "frontal", label: "Frontal", instruction: "Corpo inteiro de frente, postura natural e pés alinhados." },
    { id: "posterior", label: "Posterior", instruction: "Corpo inteiro de costas, ombros relaxados e postura natural." },
    { id: "lateral_direita", label: "Lateral direita", instruction: "Perfil direito, olhar à frente e braços relaxados." },
    { id: "lateral_esquerda", label: "Lateral esquerda", instruction: "Perfil esquerdo, repetir distância e enquadramento." },
];
exports.PERIMETER_LABELS = {
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
exports.SKINFOLD_LABELS = {
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
exports.POSTURAL_REGION_LABELS = {
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
const STORAGE_KEY = "@dragoncorp/assessment-store/v1";
const CONSENT_TERM_VERSION = "2026-08-12.v1";
const defaultState = {
    assessments: [],
};
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function addMonths(value, months) {
    const next = new Date(value);
    next.setMonth(next.getMonth() + months);
    return next;
}
function round(value, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
function parseDate(value) {
    if (!value)
        return undefined;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time) : undefined;
}
async function readState() {
    const stored = await async_storage_1.default.getItem(STORAGE_KEY);
    if (!stored) {
        await async_storage_1.default.setItem(STORAGE_KEY, JSON.stringify(defaultState));
        return defaultState;
    }
    try {
        const parsed = JSON.parse(stored);
        return {
            assessments: parsed.assessments ?? [],
        };
    }
    catch {
        await async_storage_1.default.setItem(STORAGE_KEY, JSON.stringify(defaultState));
        return defaultState;
    }
}
async function writeState(nextState) {
    await async_storage_1.default.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
function sortByAssessedAt(items) {
    return [...items].sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
}
function hasPermission(assessment, userId, role) {
    if (assessment.deletedAt)
        return false;
    if (role === "student")
        return assessment.studentId === userId && assessment.conclusion.releaseToStudent === true;
    return assessment.trainerId === userId;
}
function makeAudit(assessmentId, action, actorId, actorRole, details) {
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
function emptySteps() {
    return exports.ASSESSMENT_STEPS.reduce((acc, step) => {
        acc[step.id] = { complete: false, pending: [] };
        return acc;
    }, {});
}
function formatAssessmentDate(value) {
    if (!value)
        return "Não informado";
    const d = new Date(value);
    if (isNaN(d.getTime()))
        return value;
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}
function formatAssessmentDateTime(value) {
    if (!value)
        return "Não informado";
    const d = new Date(value);
    if (isNaN(d.getTime()))
        return value;
    return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function getAssessmentStatusLabel(status) {
    const labels = {
        rascunho: "Rascunho",
        em_andamento: "Em andamento",
        concluida: "Concluída",
    };
    return labels[status];
}
function getAssessmentTypeLabel(type) {
    const labels = {
        inicial: "Inicial",
        periodica: "Periódica",
        retorno: "Retorno",
        final: "Final",
    };
    return labels[type];
}
function normalizeDecimal(value) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
}
function calculateBodyComposition(input) {
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
function calculateBmrMifflin(weightKg, heightCm, age, sex) {
    if (!weightKg || !heightCm || !age || !sex)
        return undefined;
    const sexOffset = sex === "male" ? 5 : -161;
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
}
function getAge(birthDate, referenceDate = new Date()) {
    const birth = parseDate(birthDate);
    if (!birth)
        return undefined;
    let age = referenceDate.getFullYear() - birth.getFullYear();
    const monthDiff = referenceDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate()))
        age -= 1;
    return age;
}
function averageSkinfold(measurement) {
    if (!measurement)
        return undefined;
    const valid = measurement.attempts
        .filter((attempt) => !attempt.invalid && typeof attempt.valueMm === "number")
        .map((attempt) => attempt.valueMm);
    if (valid.length === 0)
        return undefined;
    return round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 1);
}
function sumSkinfolds(points, keys) {
    const values = keys.map((key) => averageSkinfold(points[key]));
    if (values.some((value) => typeof value !== "number"))
        return undefined;
    return values.reduce((sum, value) => sum + (value ?? 0), 0);
}
function calculateSkinfoldBodyFat(protocol, sex, age, points) {
    if (!protocol || !age)
        return undefined;
    let density;
    let reference = "";
    if (protocol === "jackson-pollock-3" && sex === "male") {
        const sum = sumSkinfolds(points, ["chest", "abdominal", "thigh"]);
        if (!sum)
            return undefined;
        // Jackson & Pollock 3-site male body density equation, converted with Siri body-fat equation.
        density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * age;
        reference = "Jackson & Pollock 3 dobras masculino + Siri";
    }
    if (protocol === "jackson-pollock-3" && sex === "female") {
        const sum = sumSkinfolds(points, ["triceps", "suprailiac", "thigh"]);
        if (!sum)
            return undefined;
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
        if (!sum)
            return undefined;
        if (sex === "male") {
            // Jackson & Pollock 7-site male body density equation, converted with Siri body-fat equation.
            density = 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * age;
            reference = "Jackson & Pollock 7 dobras masculino + Siri";
        }
        else {
            // Jackson & Pollock 7-site female body density equation, converted with Siri body-fat equation.
            density = 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * age;
            reference = "Jackson & Pollock 7 dobras feminino + Siri";
        }
    }
    if (!density)
        return undefined;
    return {
        bodyFatPercent: round(495 / density - 450, 1),
        formulaReference: reference,
    };
}
function calculatePerimeterAsymmetry(right, left) {
    if (!right?.valueCm || !left?.valueCm)
        return undefined;
    const diffCm = round(Math.abs(right.valueCm - left.valueCm), 1);
    const base = Math.max(right.valueCm, left.valueCm);
    return {
        diffCm,
        diffPercent: round((diffCm / base) * 100, 1),
        largerSide: right.valueCm > left.valueCm ? "direito" : left.valueCm > right.valueCm ? "esquerdo" : "igual",
    };
}
function validateGeneral(general) {
    const pending = [];
    if (!general.mainGoal?.trim())
        pending.push("Objetivo principal");
    if (!general.experienceLevel)
        pending.push("Nível de experiência");
    if (!general.weeklyTrainingFrequency)
        pending.push("Frequência semanal");
    return pending;
}
function validateAnamnesis(anamnesis) {
    const pending = [];
    if (!anamnesis.sleepQuality)
        pending.push("Qualidade do sono");
    if (!anamnesis.stressLevel)
        pending.push("Nível de estresse");
    if (anamnesis.previousInjuries && !anamnesis.previousInjuriesDetails?.trim())
        pending.push("Detalhar lesões");
    if (anamnesis.currentPain && !anamnesis.currentPainDetails?.trim())
        pending.push("Detalhar dores atuais");
    if (anamnesis.medications && !anamnesis.medicationsDetails?.trim())
        pending.push("Detalhar medicamentos");
    if (anamnesis.surgeries && !anamnesis.surgeriesDetails?.trim())
        pending.push("Detalhar cirurgias");
    if (anamnesis.medicalRestrictions && !anamnesis.medicalRestrictionsDetails?.trim())
        pending.push("Detalhar restrições médicas");
    return pending;
}
function validateComposition(composition) {
    const pending = [];
    if (!composition.weightKg)
        pending.push("Peso");
    if (!composition.heightCm)
        pending.push("Altura");
    if (!composition.protocolId)
        pending.push("Protocolo");
    if (composition.protocolSnapshot?.validation.errors.length) {
        pending.push(...composition.protocolSnapshot.validation.errors);
    }
    return pending;
}
function validateConclusion(conclusion) {
    const pending = [];
    if (!conclusion.definedGoals?.trim())
        pending.push("Objetivos definidos");
    if (!conclusion.trainerRecommendations?.trim())
        pending.push("Recomendações");
    return pending;
}
function normalizeCardioExecution(rawTest, index, now) {
    if ("protocolId" in rawTest && rawTest.protocolId) {
        const protocol = (0, cardiorespiratory_protocols_1.getCardioProtocolDefinition)(rawTest.protocolId);
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
    const legacy = rawTest;
    const legacyProtocol = legacy.protocol;
    const protocolId = legacyProtocol === "rockport-1mile"
        ? "rockport-1mile"
        : legacyProtocol === "distancia-definida"
            ? "run-2400m"
            : legacyProtocol === "cooper-12min"
                ? "cooper-12min"
                : "custom-cardio";
    const protocol = (0, cardiorespiratory_protocols_1.getCardioProtocolDefinition)(protocolId);
    const hasLegacyResult = typeof legacy.distanceMeters === "number" ||
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
function recalculateAssessment(assessment) {
    const now = new Date().toISOString();
    const age = getAge(assessment.birthDate, new Date(assessment.assessedAt));
    let composition = calculateBodyComposition({
        ...assessment.composition,
        basalMetabolicRateKcal: assessment.composition.manuallyEditedFields?.includes("basalMetabolicRateKcal")
            ? assessment.composition.basalMetabolicRateKcal
            : calculateBmrMifflin(assessment.composition.weightKg, assessment.composition.heightCm, age, assessment.sex),
    });
    if (composition.protocolId) {
        const protocolSnapshot = (0, body_composition_protocols_1.calculateCompositionProtocol)({
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
            bodyFatPercent: typeof protocolSnapshot.results.bodyFatPercent === "number" && !manual.has("bodyFatPercent")
                ? protocolSnapshot.results.bodyFatPercent
                : composition.bodyFatPercent,
            bmi: typeof protocolSnapshot.results.bmi === "number" && !manual.has("bmi") ? protocolSnapshot.results.bmi : composition.bmi,
            fatMassKg: typeof protocolSnapshot.results.fatMassKg === "number" && !manual.has("fatMassKg")
                ? protocolSnapshot.results.fatMassKg
                : composition.fatMassKg,
            leanMassKg: typeof protocolSnapshot.results.leanMassKg === "number" && !manual.has("leanMassKg")
                ? protocolSnapshot.results.leanMassKg
                : composition.leanMassKg,
        };
    }
    composition = calculateBodyComposition(composition);
    const skinfoldResult = calculateSkinfoldBodyFat(assessment.skinfolds.protocol, assessment.sex, age, assessment.skinfolds.points);
    const skinfolds = {
        ...assessment.skinfolds,
        resultBodyFatPercent: skinfoldResult?.bodyFatPercent,
        formulaReference: skinfoldResult?.formulaReference,
    };
    const cardioTests = assessment.cardioTests.map((test, index) => {
        const normalized = normalizeCardioExecution(test, index, now);
        try {
            return {
                ...normalized,
                snapshot: (0, cardiorespiratory_protocols_1.calculateCardioProtocolSnapshot)(normalized, {
                    ageYears: age,
                    sex: assessment.sex,
                    weightKg: composition.weightKg,
                }),
                updatedAt: now,
            };
        }
        catch {
            return normalized;
        }
    });
    const functionalTests = assessment.functionalTests.map((test, index) => {
        if (!test.testId)
            return test;
        try {
            return {
                ...test,
                order: typeof test.order === "number" ? test.order : index,
                snapshot: (0, functional_test_catalog_1.calculateFunctionalTestSnapshot)(test),
                updatedAt: now,
            };
        }
        catch {
            return test;
        }
    });
    const steps = {
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
            complete: exports.PHOTO_VIEWS.every((view) => assessment.photos.some((photo) => photo.view === view.id)),
            pending: assessment.photoConsent?.accepted
                ? exports.PHOTO_VIEWS.filter((view) => !assessment.photos.some((photo) => photo.view === view.id)).map((view) => view.label)
                : ["Consentimento"],
            updatedAt: now,
        },
        conclusion: {
            complete: validateConclusion(assessment.conclusion).length === 0,
            pending: validateConclusion(assessment.conclusion),
            updatedAt: now,
        },
    };
    const requiredComplete = exports.ASSESSMENT_STEPS.filter((step) => step.required).every((step) => steps[step.id].complete);
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
function getAssessmentSummary(assessment) {
    const completedSteps = exports.ASSESSMENT_STEPS.filter((step) => assessment.steps[step.id].complete).length;
    const pendingLabels = exports.ASSESSMENT_STEPS.flatMap((step) => assessment.steps[step.id].pending.map((pending) => `${step.shortTitle}: ${pending}`));
    return {
        completedSteps,
        totalSteps: exports.ASSESSMENT_STEPS.length,
        progressPercent: Math.round((completedSteps / exports.ASSESSMENT_STEPS.length) * 100),
        pendingCount: pendingLabels.length,
        pendingLabels,
    };
}
async function createAssessmentDraft(input) {
    const now = new Date().toISOString();
    const assessedAt = input?.assessedAt ?? now;
    const nextAssessmentAt = input?.nextAssessmentAt ?? addMonths(new Date(assessedAt), 3).toISOString();
    const id = createId("assessment");
    const draft = recalculateAssessment({
        id,
        studentId: input?.studentId ?? feedback_store_1.DEMO_STUDENT.id,
        studentName: input?.studentName ?? feedback_store_1.DEMO_STUDENT.name,
        studentAvatar: input?.studentAvatar ?? feedback_store_1.DEMO_STUDENT.avatar,
        trainerId: input?.trainerId ?? feedback_store_1.DEMO_TRAINER.id,
        trainerName: input?.trainerName ?? feedback_store_1.DEMO_TRAINER.name,
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
        audit: [makeAudit(id, "created", input?.trainerId ?? feedback_store_1.DEMO_TRAINER.id, "trainer", "Avaliação criada como rascunho.")],
    });
    const state = await readState();
    await writeState({ assessments: [draft, ...state.assessments] });
    return draft;
}
async function listAssessmentsForTrainer(trainerId = feedback_store_1.DEMO_TRAINER.id) {
    const state = await readState();
    return sortByAssessedAt(state.assessments.filter((item) => item.trainerId === trainerId && !item.deletedAt));
}
async function listAssessmentsForStudent(studentId = feedback_store_1.DEMO_STUDENT.id) {
    const state = await readState();
    return sortByAssessedAt(state.assessments.filter((item) => item.studentId === studentId && item.conclusion.releaseToStudent && !item.deletedAt));
}
async function getAssessmentById(assessmentId, userId = feedback_store_1.DEMO_TRAINER.id, role = "trainer") {
    const state = await readState();
    const assessment = state.assessments.find((item) => item.id === assessmentId);
    if (!assessment || !hasPermission(assessment, userId, role)) {
        throw new Error("Você não tem permissão para acessar esta avaliação.");
    }
    return assessment;
}
async function saveAssessment(assessmentId, patch, actorId = feedback_store_1.DEMO_TRAINER.id, actorRole = "trainer", details = "Avaliação atualizada.", action = "updated") {
    const state = await readState();
    let updatedAssessment;
    const assessments = state.assessments.map((assessment) => {
        if (assessment.id !== assessmentId || !hasPermission(assessment, actorId, actorRole))
            return assessment;
        updatedAssessment = recalculateAssessment({
            ...assessment,
            ...patch,
            id: assessment.id,
            audit: [...assessment.audit, makeAudit(assessment.id, action, actorId, actorRole, details)],
            updatedAt: new Date().toISOString(),
        });
        return updatedAssessment;
    });
    if (!updatedAssessment)
        throw new Error("Não foi possível salvar esta avaliação.");
    await writeState({ assessments });
    return updatedAssessment;
}
async function acceptPhotoConsent(assessmentId, grantedByUserId = feedback_store_1.DEMO_STUDENT.id) {
    const consent = {
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
    return saveAssessment(assessmentId, { photoConsent: consent }, feedback_store_1.DEMO_TRAINER.id, "trainer", "Consentimento de fotos registrado.", "consent_changed");
}
async function addAssessmentPhoto(assessmentId, input) {
    const assessment = await getAssessmentById(assessmentId, feedback_store_1.DEMO_TRAINER.id, "trainer");
    if (!assessment.photoConsent?.accepted)
        throw new Error("Registre o consentimento antes de adicionar fotos.");
    const photo = {
        id: createId("photo"),
        ...input,
        capturedAt: new Date().toISOString(),
        originalPreserved: true,
        consentTermVersion: assessment.photoConsent.termVersion,
        annotations: [],
    };
    const photos = [photo, ...assessment.photos.filter((item) => item.view !== input.view)];
    const updated = await saveAssessment(assessmentId, { photos }, feedback_store_1.DEMO_TRAINER.id, "trainer", `Foto ${input.view} registrada sem alterar o arquivo original.`, "photo_changed");
    return { updated, photo };
}
async function removeAssessmentPhoto(assessmentId, photoId) {
    const assessment = await getAssessmentById(assessmentId, feedback_store_1.DEMO_TRAINER.id, "trainer");
    const photos = assessment.photos.filter((photo) => photo.id !== photoId);
    return saveAssessment(assessmentId, { photos }, feedback_store_1.DEMO_TRAINER.id, "trainer", "Foto removida do registro.", "photo_changed");
}
async function addPosturalAnnotation(assessmentId, photoId, input) {
    const assessment = await getAssessmentById(assessmentId, feedback_store_1.DEMO_TRAINER.id, "trainer");
    const annotation = {
        id: createId("annotation"),
        createdAt: new Date().toISOString(),
        ...input,
    };
    const photos = assessment.photos.map((photo) => {
        if (photo.id !== photoId)
            return photo;
        return { ...photo, annotations: [...photo.annotations, annotation] };
    });
    const updated = await saveAssessment(assessmentId, { photos }, feedback_store_1.DEMO_TRAINER.id, "trainer", "Marcação postural não destrutiva adicionada.", "photo_changed");
    return { updated, annotation };
}
async function removePosturalAnnotation(assessmentId, photoId, annotationId) {
    const assessment = await getAssessmentById(assessmentId, feedback_store_1.DEMO_TRAINER.id, "trainer");
    const photos = assessment.photos.map((photo) => {
        if (photo.id !== photoId)
            return photo;
        return { ...photo, annotations: photo.annotations.filter((annotation) => annotation.id !== annotationId) };
    });
    return saveAssessment(assessmentId, { photos }, feedback_store_1.DEMO_TRAINER.id, "trainer", "Marcação postural removida.", "photo_changed");
}
async function completeAssessment(assessmentId) {
    const assessment = await getAssessmentById(assessmentId, feedback_store_1.DEMO_TRAINER.id, "trainer");
    const recalculated = recalculateAssessment(assessment);
    const summary = getAssessmentSummary(recalculated);
    const requiredPending = exports.ASSESSMENT_STEPS.filter((step) => step.required).flatMap((step) => recalculated.steps[step.id].pending.map((pending) => `${step.shortTitle}: ${pending}`));
    if (requiredPending.length > 0) {
        throw new Error(`Preencha os campos obrigatórios: ${requiredPending.join(", ")}.`);
    }
    return saveAssessment(assessmentId, {
        status: "concluida",
        completedAt: new Date().toISOString(),
    }, feedback_store_1.DEMO_TRAINER.id, "trainer", `Avaliação concluída com ${summary.progressPercent}% das etapas.`, "completed");
}
async function reopenAssessment(assessmentId) {
    const assessment = await getAssessmentById(assessmentId, feedback_store_1.DEMO_TRAINER.id, "trainer");
    return saveAssessment(assessmentId, {
        status: "em_andamento",
        completedAt: undefined,
    }, feedback_store_1.DEMO_TRAINER.id, "trainer", "Avaliação reaberta.", "reopened");
}
async function softDeleteAssessment(assessmentId) {
    const assessment = await getAssessmentById(assessmentId, feedback_store_1.DEMO_TRAINER.id, "trainer");
    if (assessment.status === "concluida") {
        throw new Error("Avaliações concluídas não podem ser excluídas diretamente.");
    }
    return saveAssessment(assessmentId, {
        deletedAt: new Date().toISOString(),
    }, feedback_store_1.DEMO_TRAINER.id, "trainer", "Avaliação removida.", "deleted");
}
async function compareAssessments(firstId, secondId) {
    const [first, second] = await Promise.all([
        getAssessmentById(firstId, feedback_store_1.DEMO_TRAINER.id, "trainer"),
        getAssessmentById(secondId, feedback_store_1.DEMO_TRAINER.id, "trainer"),
    ]);
    if (first.studentId !== second.studentId) {
        throw new Error("Só é possível comparar avaliações do mesmo aluno.");
    }
    return { first, second };
}
async function resetAssessmentStoreForTests() {
    await writeState(defaultState);
}
