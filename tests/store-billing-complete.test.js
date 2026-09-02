const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const tempDir = path.join(root, ".temp-store-billing-tests");

function buildModules() {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "commonjs",
      moduleResolution: "node",
      rootDir: root,
      outDir: tempDir,
      skipLibCheck: true,
      baseUrl: root,
      paths: {
        "@/*": ["*"],
      },
    },
    include: [
      path.join(root, "services", "subscription-store-config.ts"),
      path.join(root, "services", "subscription-service.ts"),
    ],
  };

  const tsconfigPath = path.join(tempDir, "tsconfig.json");
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  execFileSync("npx", ["tsc", "-p", tsconfigPath], {
    cwd: root,
    stdio: "pipe",
  });

  const memory = new Map();
  global.__subStorage = memory;

  fs.writeFileSync(
    path.join(tempDir, "async-storage-mock.js"),
    `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__subStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__subStorage.set(key, value); },
    removeItem: async (key) => { global.__subStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((key) => global.__subStorage.delete(key)); },
  },
};
`
  );

  const Module = require("node:module");
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === "@react-native-async-storage/async-storage") {
      return path.join(tempDir, "async-storage-mock.js");
    }
    if (request.startsWith("@/services/")) {
      return path.join(tempDir, "services", `${request.replace("@/services/", "")}.js`);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  return {
    config: require(path.join(tempDir, "services", "subscription-store-config.js")),
    service: require(path.join(tempDir, "services", "subscription-service.js")),
  };
}

const { config, service } = buildModules();

test("Catálogo e IDs Oficiais: StoreKit (iOS) e Google Play Billing (Android)", () => {
  const { OFFICIAL_STORE_PRODUCTS, resolveStoreProductId } = config;

  // IDs canônicos da Apple e Google
  assert.equal(OFFICIAL_STORE_PRODUCTS.monthly.appleProductId, "com.dragoncorp.pro.monthly");
  assert.equal(OFFICIAL_STORE_PRODUCTS.monthly.googleProductId, "dragoncorp_pro_monthly");
  assert.equal(OFFICIAL_STORE_PRODUCTS.annual.appleProductId, "com.dragoncorp.pro.annual");
  assert.equal(OFFICIAL_STORE_PRODUCTS.annual.googleProductId, "dragoncorp_pro_annual");

  // Resolução correta por plataforma
  assert.equal(resolveStoreProductId("monthly", "apple"), "com.dragoncorp.pro.monthly");
  assert.equal(resolveStoreProductId("monthly", "google"), "dragoncorp_pro_monthly");
  assert.equal(resolveStoreProductId("annual", "apple"), "com.dragoncorp.pro.annual");
  assert.equal(resolveStoreProductId("annual", "google"), "dragoncorp_pro_annual");

  // Preços oficiais
  assert.equal(OFFICIAL_STORE_PRODUCTS.monthly.referencePrice, 49.9);
  assert.equal(OFFICIAL_STORE_PRODUCTS.annual.referencePrice, 479.0);
});

test("Mapeamento Profissional de Erros de Faturamento das Lojas", () => {
  const { mapStoreBillingError } = config;

  const cancelErr = mapStoreBillingError("USER_CANCELLED");
  assert.equal(cancelErr.code, "USER_CANCELLED");
  assert.equal(cancelErr.userMessage, "Compra cancelada.");

  const notFoundErr = mapStoreBillingError("PRODUCT_NOT_FOUND");
  assert.equal(notFoundErr.code, "PRODUCT_NOT_FOUND");
  assert.ok(notFoundErr.userMessage.includes("Não foi possível carregar o produto"));

  const restoreEmpty = mapStoreBillingError("RESTORE_EMPTY");
  assert.equal(restoreEmpty.code, "RESTORE_EMPTY");
  assert.ok(restoreEmpty.userMessage.includes("Não encontramos nenhuma compra"));

  const networkErr = mapStoreBillingError("NETWORK_ERROR");
  assert.equal(networkErr.code, "NETWORK_ERROR");
  assert.ok(networkErr.userMessage.includes("Verifique sua conexão"));
});

test("Validação Server-Side: Compra Mensal, Período e Entitlements", async () => {
  await service.resetSubscriptionStoreForTests();
  const userId = "trainer-store-user-1";

  // Usuário começa no plano FREE
  const initial = await service.getSubscriptionForUser(userId);
  assert.equal(initial.plan, "FREE");
  assert.equal(initial.status, "free");

  // Validação server-side de compra StoreKit
  const res = await service.validateServerSidePurchase({
    userId,
    platform: "apple",
    productId: "com.dragoncorp.pro.monthly",
    transactionId: "txn_apple_1001",
    originalTransactionId: "txn_apple_1001",
    purchaseToken: "receipt_token_xyz_1",
    environment: "sandbox",
  });

  assert.equal(res.success, true);
  assert.equal(res.isDuplicate, false);
  assert.equal(res.subscription.plan, "PRO");
  assert.equal(res.subscription.provider, "apple");
  assert.equal(res.subscription.status, "active");
  assert.ok(res.subscription.expiresAt, "Data de expiração deve ser calculada");

  // Validação de Entitlements
  const entitlements = await service.getEntitlementsForUser(userId, 5);
  assert.equal(entitlements.isPro, true);
  assert.equal(entitlements.entitlements.can_add_student, true);
  assert.equal(entitlements.entitlements.can_use_finance, true);
});

test("Idempotência Server-Side: Prevenção de Cobranças Duplicadas e Reuso Indevido", async () => {
  await service.resetSubscriptionStoreForTests();
  const userIdA = "trainer-user-A";
  const userIdB = "trainer-user-B";
  const sameTxnId = "txn_play_unique_9999";

  // 1. Processamento da transação para o Usuário A
  const firstCall = await service.validateServerSidePurchase({
    userId: userIdA,
    platform: "google",
    productId: "dragoncorp_pro_monthly",
    transactionId: sameTxnId,
    environment: "production",
  });
  assert.equal(firstCall.success, true);
  assert.equal(firstCall.isDuplicate, false);

  // 2. Mesma transação enviada novamente pelo Usuário A (ex: retry de rede)
  const retryCall = await service.validateServerSidePurchase({
    userId: userIdA,
    platform: "google",
    productId: "dragoncorp_pro_monthly",
    transactionId: sameTxnId,
    environment: "production",
  });
  assert.equal(retryCall.success, true);
  assert.equal(retryCall.isDuplicate, true, "Deve retornar sucesso idempotente sem duplicar faturamento");

  // 3. Mesma transação tentada por outro usuário (Usuário B) -> Fraude / Reuso bloqueado
  await assert.rejects(async () => {
    await service.validateServerSidePurchase({
      userId: userIdB,
      platform: "google",
      productId: "dragoncorp_pro_monthly",
      transactionId: sameTxnId,
      environment: "production",
    });
  }, /vinculada a outra conta/);
});

test("Ciclo de Vida de Assinatura: Trial, Expiração e Sincronização no Cold Start", async () => {
  await service.resetSubscriptionStoreForTests();
  const userId = "trainer-user-lifecycle";

  // 1. Inicia com período de teste (Trial)
  const trialRes = await service.validateServerSidePurchase({
    userId,
    platform: "apple",
    productId: "com.dragoncorp.pro.monthly",
    transactionId: "txn_trial_1",
    isIntroductoryTrial: true,
    environment: "sandbox",
  });
  assert.equal(trialRes.subscription.status, "trial");
  assert.equal(config.isSubscriptionStatusActive(trialRes.subscription.status), true);

  // 2. Simulação de expiração por passagem de tempo
  const pastDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  await service.updateSubscriptionAdminOverride(userId, {
    expiresAt: pastDate,
  });

  // 3. Sincronização no Cold Start detecta que a data expirou e atualiza status
  const synced = await service.syncUserSubscriptionOnLaunch(userId);
  assert.equal(synced.status, "expired", "Assinatura com data passada deve transitar para expired");
  assert.equal(config.isSubscriptionStatusActive(synced.status), false);

  // 4. Verificação de adição de aluno bloqueada por expiração
  const validation = await service.validateStudentAdditionAllowed(userId, 1);
  assert.equal(validation.allowed, false);
  assert.equal(validation.requiresUpgrade, true);
});
