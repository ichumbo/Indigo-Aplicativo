const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const root = process.cwd();
const outDir = path.join(root, ".temp-ai-test-build");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const tsconfigPath = path.join(outDir, "tsconfig.json");
fs.writeFileSync(
  tsconfigPath,
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        moduleResolution: "node",
        skipLibCheck: true,
        outDir,
        rootDir: root,
        baseUrl: root,
        paths: {
          "@/*": ["./*"],
        },
      },
      include: [
        path.join(root, "services", "ai-assistant-service.ts"),
        path.join(root, "services", "subscription-service.ts"),
        path.join(root, "services", "student-profile-store.ts"),
        path.join(root, "services", "training-plan-store.ts"),
        path.join(root, "services", "exercise-store.ts"),
        path.join(root, "services", "feedback-store.ts"),
      ],
    },
    null,
    2
  )
);

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsc", "-p", tsconfigPath],
  { cwd: root, stdio: "inherit" }
);

process.env.NODE_PATH = path.join(root, "node_modules");
Module._initPaths();

global.__aiTestStorage = new Map();

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "@react-native-async-storage/async-storage") {
    return path.join(outDir, "async-storage-mock.js");
  }
  if (request.startsWith("@/services/")) {
    const serviceName = request.replace("@/services/", "");
    return path.join(outDir, "services", `${serviceName}.js`);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__aiTestStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__aiTestStorage.set(key, value); },
    removeItem: async (key) => { global.__aiTestStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((k) => global.__aiTestStorage.delete(k)); },
  },
};
`
);

const aiService = require(path.join(outDir, "services", "ai-assistant-service.js"));
const studentProfileStore = require(path.join(outDir, "services", "student-profile-store.js"));
const subscriptionService = require(path.join(outDir, "services", "subscription-service.js"));

test("Assistente IA: Interpretação de cadastro gera rascunho com Human-in-the-Loop", async () => {
  const prompt = "Cadastrar João, 27 anos, 82kg, objetivo hipertrofia e treina 4 vezes por semana";
  const draft = aiService.createStudentDraftTool(prompt);

  assert.equal(draft.fullName, "João");
  assert.equal(draft.ageYears, 27);
  assert.equal(draft.weightKg, 82);
  assert.equal(draft.mainGoal, "Hipertrofia Muscular");
  assert.equal(draft.frequencyWeekly, 4);

  // Testa fluxo do assistente com exigência de confirmação
  const response = await aiService.processAIAssistantPrompt({
    trainerId: "trainer-ai-1",
    prompt,
  });

  assert.equal(response.requiresConfirmation, true);
  assert.equal(response.draftType, "STUDENT_CREATION");
  assert.equal(response.status, "PENDING_REVIEW");
  assert.equal(response.actions.some((a) => a.actionType === "CONFIRM"), true);
});

test("Assistente IA: Prescrição de treino gera divisão com séries e repetições", async () => {
  const prompt = "Monte um treino de hipertrofia 4 vezes por semana para João";
  const draft = aiService.createWorkoutDraftTool("student-1", "João", prompt);

  assert.ok(draft.exercises.length >= 4);
  assert.equal(draft.exercises[0].name.includes("Supino"), true);
  assert.ok(draft.exercises[0].sets >= 3);
  assert.ok(draft.exercises[0].reps);

  const response = await aiService.processAIAssistantPrompt({
    trainerId: "trainer-ai-1",
    prompt,
    studentContextId: "student-1",
  });

  assert.equal(response.requiresConfirmation, true);
  assert.equal(response.draftType, "WORKOUT_PRESCRIPTION");
  assert.equal(response.status, "PENDING_REVIEW");
});

test("Assistente IA: Salvar aluno exige confirmação explícita e respeita limite Freemium", async () => {
  global.__aiTestStorage.clear();
  const trainerId = "trainer-ai-save-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  const draft = {
    fullName: "Aluno Primeiro",
    ageYears: 24,
    mainGoal: "Hipertrofia",
    frequencyWeekly: 3,
  };

  // 1º aluno salvo com sucesso pelo assistente
  const res1 = await aiService.saveStudentFromDraft(trainerId, draft);
  assert.equal(res1.success, true);
  assert.ok(res1.studentProfile);

  // Tentativa de 2º aluno no plano Free é bloqueada pelo assistente
  const draft2 = {
    fullName: "Aluno Segundo",
    ageYears: 30,
    mainGoal: "Emagrecimento",
    frequencyWeekly: 4,
  };

  const res2 = await aiService.saveStudentFromDraft(trainerId, draft2);
  assert.equal(res2.success, false);
  assert.match(res2.error, /plano gratuito/);
});
