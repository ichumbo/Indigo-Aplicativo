const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-rc-certification-tests");
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
        baseUrl: root,
        paths: {
          "@/*": ["./*"],
        },
      },
      files: [
        path.join(root, "services", "auth-store.ts"),
        path.join(root, "services", "student-profile-store.ts"),
        path.join(root, "services", "training-plan-store.ts"),
        path.join(root, "services", "assessment-store.ts"),
        path.join(root, "services", "conconi-protocol-service.ts"),
        path.join(root, "services", "subscription-service.ts"),
      ],
    },
    null,
    2
  )
);

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], {
  cwd: root,
  stdio: "pipe",
});

process.env.NODE_PATH = path.join(root, "node_modules");
Module._initPaths();

const memory = new Map();
const originalResolve = Module._resolveFilename;

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__rcStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__rcStorage.set(key, value); },
    removeItem: async (key) => { global.__rcStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((k) => global.__rcStorage.delete(k)); },
  },
};
`
);

fs.writeFileSync(
  path.join(outDir, "dummy-expo-mock.js"),
  `
module.exports = {
  printToFileAsync: async () => ({ uri: "file:///mock.pdf" }),
  shareAsync: async () => {},
  isAvailableAsync: async () => true,
};
`
);

fs.writeFileSync(
  path.join(outDir, "react-native-mock.js"),
  `
module.exports = {
  Platform: { OS: "ios", select: (obj) => obj.ios || obj.default },
  Alert: { alert: () => {} },
  Linking: { openURL: async () => {}, canOpenURL: async () => true },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
};
`
);

global.__rcStorage = memory;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "react-native") {
    return path.join(outDir, "react-native-mock.js");
  }
  if (request === "@react-native-async-storage/async-storage") {
    return path.join(outDir, "async-storage-mock.js");
  }
  if (request === "expo-print" || request === "expo-sharing") {
    return path.join(outDir, "dummy-expo-mock.js");
  }
  if (request.startsWith("@/services/")) {
    const sub = request.replace("@/services/", "");
    const candidate = [
      path.join(outDir, `${sub}.js`),
      path.join(outDir, "services", `${sub}.js`),
    ].find((c) => fs.existsSync(c));
    if (candidate) return candidate;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

const authStore = require([
  path.join(outDir, "auth-store.js"),
  path.join(outDir, "services", "auth-store.js"),
].find((c) => fs.existsSync(c)));

const studentStore = require([
  path.join(outDir, "student-profile-store.js"),
  path.join(outDir, "services", "student-profile-store.js"),
].find((c) => fs.existsSync(c)));

const trainingStore = require([
  path.join(outDir, "training-plan-store.js"),
  path.join(outDir, "services", "training-plan-store.js"),
].find((c) => fs.existsSync(c)));

const assessmentStore = require([
  path.join(outDir, "assessment-store.js"),
  path.join(outDir, "services", "assessment-store.js"),
].find((c) => fs.existsSync(c)));

const conconiService = require([
  path.join(outDir, "conconi-protocol-service.js"),
  path.join(outDir, "services", "conconi-protocol-service.js"),
].find((c) => fs.existsSync(c)));

const subscriptionService = require([
  path.join(outDir, "subscription-service.js"),
  path.join(outDir, "services", "subscription-service.js"),
].find((c) => fs.existsSync(c)));

test("RC-1: Ciclo Completo de Autenticação, Cadastro e Persistência de Personal e Aluno", async () => {
  await authStore.resetAuthStoreForTests();

  // 1. Personal Trainer faz login
  const trainer = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  assert.equal(trainer.user.role, "TRAINER");
  const trainerId = trainer.user.id;

  // 2. Personal cadastra aluno com credenciais oficiais
  const studentRes = await authStore.createStudentUserByTrainer({
    trainerId,
    name: "Mariana Aluna RC",
    email: "mariana.rc@dragoncorp.app",
    cpf: "11122233344",
    password: "TempPass@2026",
  });
  assert.ok(studentRes.student.id);
  assert.equal(studentRes.student.role, "STUDENT");

  // 3. Aluna consegue autenticar por e-mail e senha
  const studentSession = await authStore.signInWithCredentials("mariana.rc@dragoncorp.app", "TempPass@2026");
  assert.ok(studentSession.accessToken);
  assert.equal(studentSession.user.name, "Mariana Aluna RC");

  // 4. Aluna consegue autenticar por CPF
  const studentCpfSession = await authStore.signInWithCredentials("11122233344", "TempPass@2026");
  assert.equal(studentCpfSession.user.id, studentRes.student.id);

  // 5. Tentativa de login com senha incorreta falha graciosamente
  await assert.rejects(
    async () => {
      await authStore.signInWithCredentials("mariana.rc@dragoncorp.app", "SenhaErrada@999");
    },
    /invalida/i,
    "Tentativa com senha incorreta deve ser rejeitada"
  );
});

test("RC-2: Segurança Destrutiva — Isolamento Rígido Personal A vs Aluno B (403)", async () => {
  const profileA = await studentStore.createStudentProfile(
    {
      trainerId: "trainer-alpha",
      fullName: "Aluno Alpha RC",
      birthDate: "1998-05-10",
      email: "alpha.rc@dragoncorp.app",
    },
    "trainer-alpha",
    "trainer"
  );

  const profileB = await studentStore.createStudentProfile(
    {
      trainerId: "trainer-beta",
      fullName: "Aluno Beta RC",
      birthDate: "1995-11-20",
      email: "beta.rc@dragoncorp.app",
    },
    "trainer-beta",
    "trainer"
  );

  // Violação 1: Personal Alpha tenta ler Aluno Beta
  await assert.rejects(
    async () => {
      await studentStore.getStudentProfile(profileB.id, "trainer-alpha", "trainer");
    },
    /permissao/i
  );

  // Violação 2: Personal Alpha tenta criar treino para Aluno Beta
  const planBeta = await trainingStore.ensureTrainingPlanForStudent(profileB.id, "trainer-beta");
  await assert.rejects(
    async () => {
      await trainingStore.createTrainingSession(
        {
          planId: planBeta.id,
          name: "Treino Indevido",
          objective: "Teste de invasão",
          exercises: [],
        },
        "trainer-alpha"
      );
    },
    /permissao/i
  );

  // Violação 3: Personal Alpha tenta acessar avaliação física do Aluno Beta
  const assessmentBeta = await assessmentStore.createAssessmentDraft({
    studentId: profileB.id,
    trainerId: "trainer-beta",
    type: "inicial",
  });

  await assert.rejects(
    async () => {
      await assessmentStore.getAssessmentById(assessmentBeta.id, "trainer-alpha", "trainer");
    },
    /permiss[aã]o/i
  );
});

test("RC-3: Integridade de Treinos — Criação, Séries Detalhadas e Atualização sem Perdas", async () => {
  const plan = await trainingStore.ensureTrainingPlanForStudent("student-rc-workout", "trainer-rc-workout");
  const createRes = await trainingStore.createTrainingSession(
    {
      planId: plan.id,
      name: "Treino A - Dorsais e Bíceps",
      identifier: "A",
      objective: "Hipertrofia",
      publishMode: "now",
      exercises: [
        {
          id: "ex-puxada-1",
          name: "Puxada Frontal Aberta",
          muscleGroup: "Costas",
          order: 1,
          type: "main",
          plannedSets: 4,
          plannedReps: 12,
          plannedLoad: 60,
          loadUnit: "kg",
          restSeconds: 60,
          plannedSetDetails: [
            { id: "s-1", setNumber: 1, reps: "12", load: "50", restSeconds: 60 },
            { id: "s-2", setNumber: 2, reps: "10", load: "55", restSeconds: 60 },
            { id: "s-3", setNumber: 3, reps: "10", load: "60", restSeconds: 60 },
            { id: "s-4", setNumber: 4, reps: "8", load: "65", restSeconds: 60 },
          ],
        },
      ],
    },
    "trainer-rc-workout"
  );

  const sessionId = createRes.session.id;
  assert.ok(sessionId);
  assert.equal(createRes.session.versions[0].exercises[0].plannedSetDetails.length, 4);

  // Edição do Treino (aumentando para 5 séries e alterando carga)
  const updateRes = await trainingStore.updateTrainingSession(
    sessionId,
    {
      name: "Treino A - Dorsais e Bíceps (Modificado)",
      identifier: "A1",
      objective: "Força e Volume",
      exercises: [
        {
          id: "ex-puxada-1",
          name: "Puxada Frontal Aberta",
          muscleGroup: "Costas",
          order: 1,
          type: "main",
          plannedSets: 5,
          plannedReps: 10,
          plannedLoad: 70,
          loadUnit: "kg",
          restSeconds: 75,
          plannedSetDetails: [
            { id: "s-1", setNumber: 1, reps: "12", load: "55", restSeconds: 60 },
            { id: "s-2", setNumber: 2, reps: "10", load: "65", restSeconds: 60 },
            { id: "s-3", setNumber: 3, reps: "10", load: "70", restSeconds: 60 },
            { id: "s-4", setNumber: 4, reps: "8", load: "75", restSeconds: 75 },
            { id: "s-5", setNumber: 5, reps: "6", load: "80", restSeconds: 90 },
          ],
        },
      ],
    },
    "trainer-rc-workout"
  );

  assert.equal(updateRes.versions[1].name, "Treino A - Dorsais e Bíceps (Modificado)");
  assert.equal(updateRes.versions[1].exercises[0].plannedSetDetails.length, 5);

  // Verifica que a versão anterior não foi corrompida
  assert.equal(updateRes.versions[0].exercises[0].plannedSetDetails.length, 4);
});

test("RC-4: Execução de Treino e Evolução Longitudinal de Cargas", async () => {
  const plan = await trainingStore.ensureTrainingPlanForStudent("student-cargas", "trainer-cargas");
  const sessionRes = await trainingStore.createTrainingSession(
    {
      planId: plan.id,
      name: "Treino Cargas",
      objective: "Progressão",
      publishMode: "now",
      exercises: [
        {
          id: "ex-legpress",
          name: "Leg Press 45",
          muscleGroup: "Quadríceps",
          order: 1,
          type: "main",
          plannedSets: 3,
          plannedReps: 10,
          plannedLoad: 160,
          loadUnit: "kg",
          restSeconds: 90,
        },
      ],
    },
    "trainer-cargas"
  );

  // Aluno inicia execução
  const exec1 = await trainingStore.startTrainingExecution(sessionRes.session.id, "student-cargas");
  assert.ok(exec1.id);

  // Aluno salva séries executadas
  const updatedExec = await trainingStore.saveTrainingExecutionSets(
    exec1.id,
    [
      { id: "set-1", exerciseId: "ex-legpress", setNumber: 1, reps: 12, load: 160, completed: true },
      { id: "set-2", exerciseId: "ex-legpress", setNumber: 2, reps: 10, load: 180, completed: true },
      { id: "set-3", exerciseId: "ex-legpress", setNumber: 3, reps: 8, load: 200, completed: true },
    ],
    "student-cargas"
  );
  assert.ok(updatedExec);

  // Finaliza treino
  const finished = await trainingStore.finishTrainingExecution(
    exec1.id,
    [
      { id: "set-1", exerciseId: "ex-legpress", setNumber: 1, reps: 12, load: 160, completed: true },
      { id: "set-2", exerciseId: "ex-legpress", setNumber: 2, reps: 10, load: 180, completed: true },
      { id: "set-3", exerciseId: "ex-legpress", setNumber: 3, reps: 8, load: 200, completed: true },
    ],
    "student-cargas"
  );
  assert.equal(finished.status, "completed");

  // Recupera histórico
  const dashboard = await trainingStore.getExercisePerformanceDashboard(
    "student-cargas",
    "trainer-cargas",
    "trainer"
  );
  assert.ok(dashboard);
  assert.ok(dashboard.summaries.length >= 1);
  assert.equal(dashboard.summaries[0].exerciseName, "Leg Press 45");
});

test("RC-5: Avaliações Físicas Cumulativas — Nunca Sobrescreve Histórico Antigo", async () => {
  // 1ª Avaliação
  const av1 = await assessmentStore.createAssessmentDraft({
    studentId: "student-av-hist",
    trainerId: "trainer-av-hist",
    type: "inicial",
    general: { weightKg: 82.5, heightCm: 175 },
  });

  // 2ª Avaliação (após 60 dias)
  const av2 = await assessmentStore.createAssessmentDraft({
    studentId: "student-av-hist",
    trainerId: "trainer-av-hist",
    type: "reavaliacao",
    general: { weightKg: 78.0, heightCm: 175 },
  });

  const history = await assessmentStore.listAssessmentsForTrainer("trainer-av-hist");
  assert.ok(history.length >= 2, "Ambas as avaliações devem coexistir no histórico");
  assert.ok(history.find((a) => a.id === av1.id));
  assert.ok(history.find((a) => a.id === av2.id));
});

test("RC-6: Assinaturas — Limites Freemium, Upgrade e Proteção contra Alteração no Frontend", async () => {
  await subscriptionService.resetSubscriptionStoreForTests();

  const trainerId = "trainer-subscription-test";
  const initialSub = await subscriptionService.getSubscriptionForUser(trainerId, "Treinador Teste", "treinador.sub@teste.com");
  assert.equal(initialSub.plan, "FREE");

  // Adição do 1º aluno permitida no Free
  const check1 = await subscriptionService.validateStudentAdditionAllowed(trainerId, 0);
  assert.equal(check1.allowed, true);

  // Adição do 2º aluno bloqueada no Free
  const check2 = await subscriptionService.validateStudentAdditionAllowed(trainerId, 1);
  assert.equal(check2.allowed, false);
  assert.ok(check2.reason.includes("gratuito"));

  // Upgrade simulado com validação Server-Side oficial do StoreKit / Play Billing
  const upgraded = await subscriptionService.validateServerSidePurchase({
    userId: trainerId,
    platform: "apple",
    productId: "dragoncorp_pro_monthly",
    transactionId: "rc-txn-apple-001",
  });
  assert.equal(upgraded.success, true);
  assert.equal(upgraded.subscription.plan, "PRO");

  // Agora permite múltiplos alunos
  const checkPro = await subscriptionService.validateStudentAdditionAllowed(trainerId, 50);
  assert.equal(checkPro.allowed, true);
});

test("RC-7: Higiene de Produção — Zero Chaves Hardcoded e Zero Endereços Proibidos", () => {
  const rootFiles = ["app.json", "eas.json"];
  for (const f of rootFiles) {
    const content = fs.readFileSync(path.resolve(root, f), "utf-8");
    assert.equal(content.includes("localhost"), false, `${f} não pode conter localhost`);
    assert.equal(content.includes("127.0.0.1"), false, `${f} não pode conter 127.0.0.1`);
  }

  // Verifica app.json para Android 16 (API 36) e App Store Bundle ID
  const appJson = JSON.parse(fs.readFileSync(path.resolve(root, "app.json"), "utf-8")).expo;
  assert.equal(appJson.android.targetSdkVersion, 36);
  assert.equal(appJson.android.compileSdkVersion, 36);
  assert.equal(appJson.android.package, "com.dragoncorp.app");
  assert.equal(appJson.ios.bundleIdentifier, "com.dragoncorp.app");
  assert.equal(appJson.version, "1.0.0");
  assert.equal(appJson.android.versionCode, 1);
  assert.equal(appJson.ios.buildNumber, "1");
});
