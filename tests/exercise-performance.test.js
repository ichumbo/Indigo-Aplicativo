const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "indigo-exercise-performance-tests");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const tsconfigPath = path.join(outDir, "tsconfig.json");
fs.writeFileSync(tsconfigPath, JSON.stringify({
  compilerOptions: {
    target: "ES2020",
    module: "commonjs",
    moduleResolution: "node",
    skipLibCheck: true,
    outDir,
    baseUrl: root,
    paths: {
      "@/*": ["./*"],
    },
  },
  files: [path.join(root, "services", "exercise-performance.ts")],
}, null, 2));

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], {
  cwd: root,
  stdio: "inherit",
});

const compiledPath = [
  path.join(outDir, "exercise-performance.js"),
  path.join(outDir, "services", "exercise-performance.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled exercise-performance.js not found.");

const {
  buildExercisePerformanceDashboard,
  estimateOneRmEpley,
} = require(compiledPath);

const plan = {
  id: "plan-test",
  name: "Plano teste",
  sessionIds: ["session-a"],
};

const barbellBench = createExercise({
  id: "bench-barbell",
  name: "Supino",
  equipment: { id: "bench-barbell-rack", name: "Banco com barra", type: "free_weight" },
});

const machineBench = createExercise({
  id: "bench-machine",
  name: "Supino",
  loadUnit: "level",
  equipment: { id: "bench-machine-a", name: "Supino maquina A", type: "machine", manufacturer: "A", model: "01" },
});

const session = {
  id: "session-a",
  activeVersionId: "version-a",
  versions: [{
    id: "version-a",
    sessionId: "session-a",
    version: 1,
    name: "Treino A",
    identifier: "A",
    exercises: [barbellBench, machineBench],
  }],
};

test("estimativa de 1RM usa Epley em faixa valida", () => {
  assert.equal(estimateOneRmEpley(100, 6), 120);
  assert.equal(estimateOneRmEpley(100, 15), undefined);
});

test("evolucao considera carga e repeticoes, nao apenas maior carga", () => {
  const dashboard = buildExercisePerformanceDashboard({
    plan,
    sessions: [session],
    executions: [
      execution("2026-07-01T10:00:00.000Z", barbellBench, [
        set(barbellBench, 1, { load: 50, reps: 8 }),
        set(barbellBench, 2, { load: 50, reps: 8 }),
      ]),
      execution("2026-07-10T10:00:00.000Z", barbellBench, [
        set(barbellBench, 1, { load: 50, reps: 12 }),
        set(barbellBench, 2, { load: 50, reps: 10 }),
      ]),
      execution("2026-07-20T10:00:00.000Z", barbellBench, [
        set(barbellBench, 1, { load: 52.5, reps: 10 }),
        set(barbellBench, 2, { load: 52.5, reps: 9 }),
      ]),
    ],
    periodPreset: "all",
    referenceDate: new Date("2026-08-01T12:00:00.000Z"),
  });

  const summary = dashboard.summaries.find((item) => item.exerciseId === "bench-barbell");
  assert.equal(summary.status, "evolving");
  assert.equal(summary.records.some((record) => record.metric === "estimated1rm"), true);
});

test("equipamentos incompatíveis não são agrupados pelo mesmo nome", () => {
  const dashboard = buildExercisePerformanceDashboard({
    plan,
    sessions: [session],
    executions: [
      execution("2026-07-01T10:00:00.000Z", barbellBench, [set(barbellBench, 1, { load: 50, reps: 8 })]),
      execution("2026-07-02T10:00:00.000Z", machineBench, [set(machineBench, 1, { load: 8, reps: 10, unit: "level" })]),
    ],
    periodPreset: "all",
    referenceDate: new Date("2026-08-01T12:00:00.000Z"),
  });

  const supinoSummaries = dashboard.summaries.filter((item) => item.exerciseName === "Supino");
  assert.equal(supinoSummaries.length, 2);
  assert.notEqual(supinoSummaries[0].equipmentName, supinoSummaries[1].equipmentName);
});

test("aquecimento e serie invalida ficam fora dos calculos principais", () => {
  const dashboard = buildExercisePerformanceDashboard({
    plan,
    sessions: [session],
    executions: [
      execution("2026-07-01T10:00:00.000Z", barbellBench, [
        set(barbellBench, 1, { load: 120, reps: 1, warmup: true }),
        set(barbellBench, 2, { load: 130, reps: 1, invalidReason: "Erro de registro" }),
        set(barbellBench, 3, { load: 50, reps: 8 }),
      ]),
      execution("2026-07-08T10:00:00.000Z", barbellBench, [
        set(barbellBench, 1, { load: 52.5, reps: 8 }),
      ]),
      execution("2026-07-15T10:00:00.000Z", barbellBench, [
        set(barbellBench, 1, { load: 55, reps: 8 }),
      ]),
    ],
    periodPreset: "all",
    referenceDate: new Date("2026-08-01T12:00:00.000Z"),
  });

  const summary = dashboard.summaries.find((item) => item.exerciseId === "bench-barbell");
  assert.equal(summary.validSetCount, 3);
  assert.equal(summary.warmupSetCount, 1);
  assert.equal(summary.invalidSetCount, 2);
  assert.equal(summary.records.some((record) => record.value >= 120), false);
});

test("ultima execucao menor isolada nao classifica queda automaticamente", () => {
  const dashboard = buildExercisePerformanceDashboard({
    plan,
    sessions: [session],
    executions: [
      execution("2026-07-01T10:00:00.000Z", barbellBench, [set(barbellBench, 1, { load: 50, reps: 8 })]),
      execution("2026-07-08T10:00:00.000Z", barbellBench, [set(barbellBench, 1, { load: 55, reps: 8 })]),
      execution("2026-07-15T10:00:00.000Z", barbellBench, [set(barbellBench, 1, { load: 55, reps: 8 })]),
      execution("2026-07-22T10:00:00.000Z", barbellBench, [set(barbellBench, 1, { load: 50, reps: 8 })]),
    ],
    periodPreset: "all",
    referenceDate: new Date("2026-08-01T12:00:00.000Z"),
  });

  const summary = dashboard.summaries.find((item) => item.exerciseId === "bench-barbell");
  assert.notEqual(summary.status, "declining");
});

test("dor e observacao por serie aparecem no historico", () => {
  const dashboard = buildExercisePerformanceDashboard({
    plan,
    sessions: [session],
    executions: [
      execution("2026-07-01T10:00:00.000Z", barbellBench, [
        set(barbellBench, 1, {
          load: 50,
          reps: 8,
          pain: { region: "ombro", level: 3 },
          note: "Amplitude reduzida",
        }),
      ]),
    ],
    periodPreset: "all",
    referenceDate: new Date("2026-08-01T12:00:00.000Z"),
  });

  const summary = dashboard.summaries.find((item) => item.exerciseId === "bench-barbell");
  assert.equal(summary.hasPain, true);
  assert.equal(summary.hasObservation, true);
  assert.equal(summary.points[0].allSets[0].note, "Amplitude reduzida");
});

function createExercise(patch) {
  return {
    id: patch.id,
    exerciseCatalogId: patch.id,
    name: patch.name,
    type: "main",
    muscleGroup: "Peito",
    order: 1,
    plannedSets: 3,
    plannedReps: 8,
    loadUnit: patch.loadUnit ?? "kg",
    unilateral: false,
    warmupSet: false,
    validSet: true,
    equipment: patch.equipment,
  };
}

function execution(date, exercise, sets) {
  return {
    id: `execution-${exercise.id}-${date}`,
    planId: plan.id,
    sessionId: session.id,
    sessionVersionId: "version-a",
    studentId: "student",
    trainerId: "trainer",
    status: "completed",
    startedAt: date,
    finishedAt: new Date(new Date(date).getTime() + 45 * 60000).toISOString(),
    snapshot: {
      ...session.versions[0],
      exercises: [exercise],
    },
    sets,
    skippedExerciseIds: [],
    pausedPeriods: [],
    createdAt: date,
    updatedAt: date,
  };
}

function set(exercise, index, patch) {
  const warmup = patch.warmup ?? false;
  const invalid = Boolean(patch.invalidReason);
  return {
    id: `set-${exercise.id}-${index}-${Math.random()}`,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    plannedSetIndex: index,
    setType: warmup ? "warmup" : invalid ? "invalid" : "working",
    plannedLoad: exercise.plannedLoad,
    executedLoad: patch.load,
    loadUnit: patch.unit ?? exercise.loadUnit,
    plannedReps: exercise.plannedReps,
    executedReps: patch.reps,
    effort: patch.effort ?? 7,
    completed: !patch.interrupted,
    warmup,
    validForProgression: !warmup && !invalid && !patch.interrupted,
    invalidReason: patch.invalidReason,
    pain: patch.pain,
    note: patch.note,
    recordedAt: new Date().toISOString(),
  };
}
