const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const root = process.cwd();
const outDir = path.join(root, ".temp-sub-test-build");

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
        path.join(root, "services", "subscription-service.ts"),
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

global.__subTestStorage = new Map();

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "@react-native-async-storage/async-storage") {
    return path.join(outDir, "async-storage-mock.js");
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__subTestStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__subTestStorage.set(key, value); },
    removeItem: async (key) => { global.__subTestStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((k) => global.__subTestStorage.delete(k)); },
  },
};
`
);

const subscriptionService = require(path.join(outDir, "services", "subscription-service.js"));

test("Freemium: Personal Trainer inicializado recebe Plano FREE com limite de 1 aluno", async () => {
  global.__subTestStorage.clear();
  const sub = await subscriptionService.getSubscriptionForUser(
    "trainer-123",
    "Personal Silva",
    "silva@personal.com"
  );

  assert.equal(sub.plan, "FREE");
  assert.equal(sub.status, "free");
  assert.equal(sub.provider, "free");

  const ent = await subscriptionService.getEntitlementsForUser("trainer-123", 0);
  assert.equal(ent.isPro, false);
  assert.equal(ent.maxStudentsAllowed, 1);
  assert.equal(ent.entitlements.can_add_student, true);
});

test("Freemium: Limite de 1 aluno bloqueia segundo aluno no plano FREE", async () => {
  global.__subTestStorage.clear();
  const trainerId = "trainer-limit-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  // 1º aluno permitido
  const check1 = await subscriptionService.validateStudentAdditionAllowed(trainerId, 0);
  assert.equal(check1.allowed, true);
  assert.equal(check1.requiresUpgrade, false);

  // 2º aluno bloqueado (já possui 1 ativo)
  const check2 = await subscriptionService.validateStudentAdditionAllowed(trainerId, 1);
  assert.equal(check2.allowed, false);
  assert.equal(check2.requiresUpgrade, true);
  assert.match(check2.reason, /plano gratuito/);
});

test("In-App Purchase (StoreKit / Google Play): Upgrade para Plano PRO libera alunos ilimitados", async () => {
  global.__subTestStorage.clear();
  const trainerId = "trainer-upgrade-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  const upgraded = await subscriptionService.purchaseProduct(
    trainerId,
    "personal_pro_monthly",
    "apple"
  );

  assert.equal(upgraded.plan, "PRO");
  assert.equal(upgraded.status, "active");
  assert.equal(upgraded.provider, "apple");
  assert.ok(upgraded.transactionId.startsWith("txn-apple"));

  const ent = await subscriptionService.getEntitlementsForUser(trainerId, 50);
  assert.equal(ent.isPro, true);
  assert.equal(ent.entitlements.can_add_student, true);
  assert.equal(ent.entitlements.can_use_finance, true);
  assert.equal(ent.entitlements.can_create_unlimited_workouts, true);

  const check51 = await subscriptionService.validateStudentAdditionAllowed(trainerId, 50);
  assert.equal(check51.allowed, true);
  assert.equal(check51.requiresUpgrade, false);
});

test("Restauração de Compras: Sincroniza assinatura existente do usuário", async () => {
  const trainerId = "trainer-upgrade-test";
  const restored = await subscriptionService.restorePurchases(trainerId);
  assert.equal(restored.restored, true);
  assert.equal(restored.subscription.plan, "PRO");
});

test("Cancelamento & Expiração: Preserva dados e bloqueia novas adições acima do limite", async () => {
  global.__subTestStorage.clear();
  const trainerId = "trainer-cancel-test";
  await subscriptionService.purchaseProduct(trainerId, "personal_pro_monthly", "google");

  // Cancela renovação
  const cancelled = await subscriptionService.cancelSubscription(trainerId);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.autoRenew, false);

  // Força data de expiração no passado
  const pastDate = new Date(Date.now() - 86400000).toISOString();
  await subscriptionService.updateSubscriptionAdminOverride(trainerId, {
    expiresAt: pastDate,
  });

  // Ao buscar novamente, status é marcado como expired automaticamente
  const expired = await subscriptionService.getSubscriptionForUser(trainerId);
  assert.equal(expired.status, "expired");

  // Com 5 alunos cadastrados anteriormente, dados são preservados mas nova adição é bloqueada
  const check = await subscriptionService.validateStudentAdditionAllowed(trainerId, 5);
  assert.equal(check.allowed, false);
  assert.equal(check.requiresUpgrade, true);
});

test("Admin: Listagem com filtros e override de planos pelo Master Admin", async () => {
  global.__subTestStorage.clear();
  await subscriptionService.getSubscriptionForUser("trainer-a", "Trainer A", "a@test.com");
  await subscriptionService.purchaseProduct("trainer-b", "personal_pro_monthly", "apple");

  const all = await subscriptionService.listAllSubscriptions("all");
  assert.equal(all.length >= 2, true);

  const proOnly = await subscriptionService.listAllSubscriptions("pro");
  assert.equal(proOnly.every((s) => s.plan === "PRO"), true);

  // Master Admin concede Pro vitalício
  const overridden = await subscriptionService.updateSubscriptionAdminOverride("trainer-a", {
    plan: "PRO",
    status: "active",
    provider: "admin",
  });
  assert.equal(overridden.plan, "PRO");
  assert.equal(overridden.provider, "admin");
});
