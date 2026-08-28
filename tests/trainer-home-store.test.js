const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-trainer-home-tests");
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
  files: [path.join(root, "services", "trainer-home-store.ts")],
}, null, 2));

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], {
  cwd: root,
  stdio: "inherit",
});

const compiledPath = [
  path.join(outDir, "trainer-home-store.js"),
  path.join(outDir, "services", "trainer-home-store.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled trainer-home-store.js not found.");

process.env.NODE_PATH = path.join(root, "node_modules");
Module._initPaths();
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/services/")) {
    return path.join(outDir, `${request.replace("@/services/", "")}.js`);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

const {
  sortTrainerHomeStudents,
  studentMatchesHomeFilter,
} = require(compiledPath);

test("filtros da home identificam pendencias acionaveis", () => {
  const student = makeStudent({
    hasPain: true,
    hasFeedbackPending: true,
    hasWorkoutExpiring: true,
  });

  assert.equal(studentMatchesHomeFilter(student, "pain"), true);
  assert.equal(studentMatchesHomeFilter(student, "feedback-pending"), true);
  assert.equal(studentMatchesHomeFilter(student, "workout-expiring"), true);
  assert.equal(studentMatchesHomeFilter(student, "without-workout"), false);
});

test("ordenacao por prioridade coloca aluno com pendencia critica primeiro", () => {
  const low = makeStudent({ id: "low", name: "Aluno B", priorityScore: 10 });
  const high = makeStudent({ id: "high", name: "Aluno A", priorityScore: 900 });

  const sorted = sortTrainerHomeStudents([low, high], "priority");
  assert.equal(sorted[0].id, "high");
});

test("ordenacao por aderencia usa maior consistencia primeiro", () => {
  const first = makeStudent({ id: "first", adherencePercent: 62 });
  const second = makeStudent({ id: "second", adherencePercent: 91 });

  const sorted = sortTrainerHomeStudents([first, second], "adherence");
  assert.equal(sorted[0].id, "second");
});

function makeStudent(patch) {
  return {
    id: patch.id ?? "student",
    name: patch.name ?? "Aluno",
    objective: "Hipertrofia",
    status: patch.status ?? "ativo",
    statusLabel: "Ativo",
    lastActivityAt: patch.lastActivityAt ?? "2026-08-12T12:00:00.000Z",
    lastActivityLabel: "Ontem",
    nextSessionAt: patch.nextSessionAt ?? "2026-08-14T12:00:00.000Z",
    nextSessionLabel: "Amanha",
    nextAssessmentAt: patch.nextAssessmentAt ?? "2026-08-20T12:00:00.000Z",
    nextAssessmentLabel: "Em 7 dias",
    currentWorkoutName: "Treino atual",
    workoutExpirationAt: patch.workoutExpirationAt ?? "2026-08-24T12:00:00.000Z",
    workoutExpirationLabel: "Em 11 dias",
    adherencePercent: patch.adherencePercent ?? 80,
    pendingCount: patch.pendingCount ?? 0,
    nextAction: "Acompanhamento em dia",
    hasPain: patch.hasPain ?? false,
    hasFeedbackPending: patch.hasFeedbackPending ?? false,
    hasAbsentRecently: patch.hasAbsentRecently ?? false,
    hasAnamnesisPending: patch.hasAnamnesisPending ?? false,
    hasWorkoutExpiring: patch.hasWorkoutExpiring ?? false,
    hasNoWorkout: patch.hasNoWorkout ?? false,
    hasReassessmentPending: patch.hasReassessmentPending ?? false,
    hasDocumentPending: patch.hasDocumentPending ?? false,
    searchText: "aluno hipertrofia",
    priorityScore: patch.priorityScore ?? 0,
  };
}
