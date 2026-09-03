const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-prelaunch-readiness-tests");
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
    getItem: async (key) => global.__prelaunchStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__prelaunchStorage.set(key, value); },
    removeItem: async (key) => { global.__prelaunchStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((k) => global.__prelaunchStorage.delete(k)); },
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

global.__prelaunchStorage = memory;

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

const conconiService = require([
  path.join(outDir, "conconi-protocol-service.js"),
  path.join(outDir, "services", "conconi-protocol-service.js"),
].find((c) => fs.existsSync(c)));

test("1. Auditoria de Layout: Safe Area, Status Bar e Eliminação do Bug do Topo", () => {
  const rootLayout = fs.readFileSync(path.resolve(root, "app/_layout.tsx"), "utf-8");
  assert.ok(rootLayout.includes("SafeAreaProvider"), "RootLayout deve montar SafeAreaProvider no topo da árvore");
  assert.ok(rootLayout.includes("GlobalErrorBoundary"), "RootLayout deve conter GlobalErrorBoundary");

  const appScreen = fs.readFileSync(path.resolve(root, "components/AppScreen.tsx"), "utf-8");
  assert.ok(appScreen.includes('contentInsetAdjustmentBehavior="never"'), "AppScreen deve definir contentInsetAdjustmentBehavior='never'");

  const homeTab = fs.readFileSync(path.resolve(root, "app/(tabs)/index.tsx"), "utf-8");
  assert.ok(homeTab.includes('contentInsetAdjustmentBehavior="never"'), "Home Tab FlatList deve prevenir saltos no scroll");

  const profileTab = fs.readFileSync(path.resolve(root, "app/(tabs)/profile.tsx"), "utf-8");
  assert.ok(profileTab.includes('contentInsetAdjustmentBehavior="never"'), "Profile Tab ScrollView deve prevenir saltos no scroll");
});

test("2. Auditoria de Loading: Padrão 5 Estados e Cache de Sessão sem Flash Branco", () => {
  const dataStateLayout = fs.readFileSync(path.resolve(root, "components/DataStateLayout.tsx"), "utf-8");
  assert.ok(dataStateLayout.includes('"initial" | "loading" | "success" | "empty" | "error"'), "Padrão de 5 estados deve estar presente");
  assert.ok(dataStateLayout.includes("stale-while-revalidate"), "Deve suportar revalidação sem flicker");

  const sessionHook = fs.readFileSync(path.resolve(root, "hooks/use-current-session.ts"), "utf-8");
  assert.ok(sessionHook.includes("inMemorySession"), "Hook deve utilizar cache em memória da sessão");
  assert.ok(sessionHook.includes("notifySessionChanged"), "Hook deve disponibilizar notificador reativo");
});

test("3. Auditoria de Segurança e RBAC: Isolamento Absoluto Personal A vs Aluno B (403 Forbidden)", async () => {
  await authStore.resetAuthStoreForTests();

  // 1. Criar Perfis para Personal Alpha e Personal Beta
  const studentAlpha = await studentStore.createStudentProfile(
    {
      trainerId: "trainer-alpha-id",
      fullName: "Aluno Alpha",
      birthDate: "2000-01-01",
      email: "alpha@teste.com",
    },
    "trainer-alpha-id",
    "trainer"
  );
  const studentBeta = await studentStore.createStudentProfile(
    {
      trainerId: "trainer-beta-id",
      fullName: "Aluno Beta",
      birthDate: "2000-01-01",
      email: "beta@teste.com",
    },
    "trainer-beta-id",
    "trainer"
  );

  // 2. Personal Alpha NÃO pode acessar perfil do Aluno Beta
  await assert.rejects(
    async () => {
      await studentStore.getStudentProfile(studentBeta.id, "trainer-alpha-id", "trainer");
    },
    /permissao/i,
    "Personal Alpha deve ser bloqueado ao tentar ler Aluno Beta"
  );

  // 3. Plano do Aluno Beta
  const planBeta = await trainingStore.ensureTrainingPlanForStudent(studentBeta.id, "trainer-beta-id");

  // 4. Personal Alpha NÃO pode criar sessão de treino no plano do Aluno Beta
  await assert.rejects(
    async () => {
      await trainingStore.createTrainingSession(
        {
          planId: planBeta.id,
          name: "Treino Invasor",
          objective: "Teste de violação",
          exercises: [],
        },
        "trainer-alpha-id"
      );
    },
    /permissao/i,
    "Personal Alpha deve ser bloqueado ao prescrever para Aluno Beta"
  );

  // 5. Protocolo Conconi: Personal Beta novo não recebe dados vazados de outros personais
  const betaProtocols = await conconiService.listConconiProtocols("trainer-beta-id", studentBeta.id);
  assert.equal(betaProtocols.length, 0, "Novo aluno não deve receber protocolos de amostra vazados");
});

test("4. Auditoria de Banco de Dados: Persistência de Treinos, Séries e Cargas", async () => {
  const plan = await trainingStore.ensureTrainingPlanForStudent("student-audit-1", "trainer-audit-1");
  const res = await trainingStore.createTrainingSession(
    {
      planId: plan.id,
      name: "Peito e Tríceps",
      identifier: "A",
      objective: "Hipertrofia",
      publishMode: "now",
      exercises: [
        {
          id: "ex-supino-1",
          name: "Supino Reto com Barra",
          muscleGroup: "Peitoral",
          order: 1,
          type: "main",
          plannedSets: 4,
          plannedReps: 10,
          plannedLoad: 80,
          loadUnit: "kg",
          restSeconds: 90,
          plannedSetDetails: [
            { id: "set-1", setNumber: 1, reps: "12", load: "70", restSeconds: 90 },
            { id: "set-2", setNumber: 2, reps: "10", load: "80", restSeconds: 90 },
            { id: "set-3", setNumber: 3, reps: "10", load: "80", restSeconds: 90 },
            { id: "set-4", setNumber: 4, reps: "8", load: "85", restSeconds: 90 },
          ],
        },
      ],
    },
    "trainer-audit-1"
  );

  assert.ok(res.session.id, "Sessão de treino deve ser criada com ID persistido");
  assert.equal(res.session.versions[0].exercises[0].plannedSetDetails.length, 4, "Todas as 4 séries detalhadas devem ser persistidas");

  // Recupera sessão do storage
  const fetched = await trainingStore.getTrainingSessionById(res.session.id, "trainer-audit-1", "trainer");
  assert.equal(fetched.id, res.session.id);
  assert.equal(fetched.versions[0].exercises[0].name, "Supino Reto com Barra");
});

test("5. Auditoria de Publicação nas Lojas: App Store e Google Play Store", () => {
  const appJson = JSON.parse(fs.readFileSync(path.resolve(root, "app.json"), "utf-8")).expo;
  assert.equal(appJson.android.package, "com.dragoncorp.app", "Package Android deve estar configurado");
  assert.equal(appJson.ios.bundleIdentifier, "com.dragoncorp.app", "Bundle ID iOS deve estar configurado");
  assert.ok(appJson.android.targetSdkVersion >= 35, "Target SDK Android deve atender às diretrizes atuais da Google Play (>=35)");
  assert.ok(appJson.ios.privacyManifests, "Apple Privacy Manifests deve estar presente");
  assert.equal(appJson.ios.infoPlist.ITSAppUsesNonExemptEncryption, false, "Export Compliance da Apple deve estar declarado");

  const easJson = JSON.parse(fs.readFileSync(path.resolve(root, "eas.json"), "utf-8"));
  assert.equal(easJson.build.production.android.buildType, "app-bundle", "EAS Production deve gerar Android App Bundle (.aab)");
  assert.equal(easJson.build.production.ios.simulator, false, "EAS Production iOS não pode ser build de simulador");
});
