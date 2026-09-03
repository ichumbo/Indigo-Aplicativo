const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const root = process.cwd();
const outDir = path.join(root, ".temp-billing-security-test-build");

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
        path.join(root, "services", "subscription-store-config.ts"),
        path.join(root, "services", "subscription-service.ts"),
        path.join(root, "services", "native-billing-service.ts"),
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

global.__billingTestStorage = new Map();

fs.writeFileSync(
  path.join(outDir, "react-native-mock.js"),
  `
module.exports = {
  Platform: { OS: "android", select: (obj) => obj.android || obj.default },
  Alert: { alert: () => {} },
  Linking: { openURL: async () => {}, canOpenURL: async () => true },
};
`
);

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "react-native") {
    return path.join(outDir, "react-native-mock.js");
  }
  if (request === "@react-native-async-storage/async-storage") {
    return path.join(outDir, "async-storage-mock.js");
  }
  if (request === "expo-iap" || request === "react-native-iap") {
    return path.join(outDir, "expo-iap-mock.js");
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__billingTestStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__billingTestStorage.set(key, value); },
    removeItem: async (key) => { global.__billingTestStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((k) => global.__billingTestStorage.delete(k)); },
  },
};
`
);

fs.writeFileSync(
  path.join(outDir, "expo-iap-mock.js"),
  `
let updateCallback = null;
let errorCallback = null;

module.exports = {
  initConnection: async () => true,
  endConnection: async () => true,
  fetchProducts: async ({ skus }) => [
    {
      productId: "dragoncorp_pro_annual",
      id: "dragoncorp_pro_annual",
      title: "DragonCorp Pro Anual",
      description: "Acesso anual completo",
      price: 199.90,
      currency: "BRL",
      localizedPrice: "R$ 199,90",
      subscriptionOfferDetailsAndroid: [
        {
          offerToken: "offer_annual_test_token_123",
          pricingPhases: {
            pricingPhaseList: [
              {
                formattedPrice: "R$ 199,90",
                priceAmountMicros: "199900000",
                priceCurrencyCode: "BRL",
              }
            ]
          }
        }
      ]
    },
    {
      productId: "dragoncorp_pro_monthly",
      id: "dragoncorp_pro_monthly",
      title: "DragonCorp Pro Mensal",
      description: "Acesso mensal",
      price: 19.90,
      currency: "BRL",
      localizedPrice: "R$ 19,90/mês",
      subscriptionOfferDetailsAndroid: [
        {
          offerToken: "offer_monthly_test_token_456",
          pricingPhases: {
            pricingPhaseList: [
              {
                formattedPrice: "R$ 19,90/mês",
                priceAmountMicros: "19900000",
                priceCurrencyCode: "BRL",
              }
            ]
          }
        }
      ]
    }
  ],
  purchaseUpdatedListener: (cb) => {
    updateCallback = cb;
    return { remove: () => { updateCallback = null; } };
  },
  purchaseErrorListener: (cb) => {
    errorCallback = cb;
    return { remove: () => { errorCallback = null; } };
  },
  requestPurchase: async ({ request }) => {
    const sku = request?.google?.skus?.[0] || request?.apple?.sku || "dragoncorp_pro_annual";
    if (global.__mockIapBehavior === "CANCEL") {
      if (errorCallback) {
        const err = new Error("User cancelled checkout");
        err.code = "E_USER_CANCELLED";
        errorCallback(err);
      }
      return;
    }
    if (global.__mockIapBehavior === "ERROR") {
      if (errorCallback) {
        const err = new Error("Payment declined by bank");
        err.code = "E_PAYMENT_DECLINED";
        errorCallback(err);
      }
      return;
    }
    if (global.__mockIapBehavior === "PENDING") {
      if (updateCallback) {
        updateCallback({
          productId: sku,
          purchaseToken: "test-token-pending-123",
          transactionId: "GPA.1234-5678-PENDING",
          purchaseState: "pending",
        });
      }
      return;
    }
    // Default: PURCHASED
    if (updateCallback) {
      updateCallback({
        productId: sku,
        purchaseToken: "test-token-purchased-xyz-" + Date.now(),
        transactionId: "GPA.1234-5678-9012-" + Date.now(),
        purchaseState: "purchased",
      });
    }
  },
  finishTransaction: async ({ purchase }) => {
    global.__mockLastAcknowledgedPurchase = purchase;
    return true;
  },
  getAvailablePurchases: async () => {
    return global.__mockAvailablePurchases || [];
  },
};
`
);

const subscriptionService = require(path.join(outDir, "services", "subscription-service.js"));
const billingConfig = require(path.join(outDir, "services", "subscription-store-config.js"));

test("TESTE A — CANCELAMENTO: Usuário cancela o checkout do Google Play -> Premium permanece FREE", async () => {
  global.__billingTestStorage.clear();
  global.__mockIapBehavior = "CANCEL";

  const trainerId = "trainer-cancel-flow-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  const outcome = await subscriptionService.purchaseSubscriptionFlow({
    userId: trainerId,
    productId: "dragoncorp_pro_annual",
    offerToken: "offer_annual_test_token_123",
  });

  assert.equal(outcome.status, "CANCELLED");
  assert.equal(outcome.success, false);

  // Verifica que o plano continua FREE
  const sub = await subscriptionService.getSubscriptionForUser(trainerId);
  assert.equal(sub.plan, "FREE");
  assert.equal(sub.status, "free");

  const ent = await subscriptionService.getEntitlementsForUser(trainerId, 1);
  assert.equal(ent.isPro, false);
});

test("TESTE B — PAGAMENTO APROVADO: Google Play PURCHASED + Validação Server-Side + Acknowledge -> Premium Ativo", async () => {
  global.__billingTestStorage.clear();
  global.__mockIapBehavior = "PURCHASED";
  global.__mockLastAcknowledgedPurchase = null;

  const trainerId = "trainer-purchased-flow-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  const outcome = await subscriptionService.purchaseSubscriptionFlow({
    userId: trainerId,
    productId: "dragoncorp_pro_annual",
    offerToken: "offer_annual_test_token_123",
  });

  assert.equal(outcome.status, "PURCHASED");
  assert.equal(outcome.success, true);
  assert.equal(outcome.subscription.plan, "PRO");
  assert.equal(outcome.subscription.status, "active");
  assert.equal(outcome.subscription.acknowledged, true);
  assert.ok(outcome.subscription.purchaseToken.startsWith("test-token-purchased-xyz"));

  // Verifica que o Acknowledge foi disparado para a Google Play
  assert.ok(global.__mockLastAcknowledgedPurchase);
  assert.equal(global.__mockLastAcknowledgedPurchase.productId, "dragoncorp_pro_annual");

  // Verifica Entitlements
  const ent = await subscriptionService.getEntitlementsForUser(trainerId, 100);
  assert.equal(ent.isPro, true);
  assert.equal(ent.maxStudentsAllowed, 99999);
  assert.equal(ent.entitlements.can_create_unlimited_workouts, true);
});

test("TESTE C — PAGAMENTO RECUSADO / ERRO: Falha no checkout -> Premium NÃO ativado", async () => {
  global.__billingTestStorage.clear();
  global.__mockIapBehavior = "ERROR";

  const trainerId = "trainer-error-flow-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  await assert.rejects(
    async () => {
      await subscriptionService.purchaseSubscriptionFlow({
        userId: trainerId,
        productId: "dragoncorp_pro_monthly",
      });
    },
    /Não foi possível/
  );

  const sub = await subscriptionService.getSubscriptionForUser(trainerId);
  assert.equal(sub.plan, "FREE");
  assert.equal(sub.status, "free");
});

test("TESTE D — PENDING: Pagamento em processamento -> Premium NÃO ativado até confirmação", async () => {
  global.__billingTestStorage.clear();
  global.__mockIapBehavior = "PENDING";

  const trainerId = "trainer-pending-flow-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  const outcome = await subscriptionService.purchaseSubscriptionFlow({
    userId: trainerId,
    productId: "dragoncorp_pro_monthly",
  });

  assert.equal(outcome.status, "PENDING");
  assert.equal(outcome.success, false);
  assert.match(outcome.message, /processad/i);

  // Premium NÃO pode estar ativo
  const sub = await subscriptionService.getSubscriptionForUser(trainerId);
  assert.equal(sub.plan, "FREE");
  assert.equal(sub.status, "free");
});

test("TESTE E — DUPLO CLIQUE & IDEMPOTÊNCIA: Validação repetida da mesma transação não duplica nem altera", async () => {
  global.__billingTestStorage.clear();

  const trainerId = "trainer-idempotence-test";
  const purchaseToken = "token-unique-test-123456";
  const transactionId = "GPA.9999-8888-7777";

  // 1ª validação
  const res1 = await subscriptionService.validateServerSidePurchase({
    userId: trainerId,
    platform: "google",
    productId: "dragoncorp_pro_annual",
    transactionId,
    purchaseToken,
  });

  assert.equal(res1.success, true);
  assert.equal(res1.isDuplicate, false);
  assert.equal(res1.subscription.plan, "PRO");

  // 2ª validação idêntica (duplo clique / replay)
  const res2 = await subscriptionService.validateServerSidePurchase({
    userId: trainerId,
    platform: "google",
    productId: "dragoncorp_pro_annual",
    transactionId,
    purchaseToken,
  });

  assert.equal(res2.success, true);
  assert.equal(res2.isDuplicate, true);
  assert.equal(res2.subscription.id, res1.subscription.id);

  // Tentativa de fraude (usar o mesmo token para outro usuário)
  await assert.rejects(
    async () => {
      await subscriptionService.validateServerSidePurchase({
        userId: "trainer-fraud-attacker",
        platform: "google",
        productId: "dragoncorp_pro_annual",
        transactionId: "GPA.fake-txn",
        purchaseToken,
      });
    },
    /já foi vinculado a outra conta/
  );
});

test("TESTE F — RESTAURAÇÃO DE COMPRAS: Sincroniza compra ativa com a Google Play", async () => {
  global.__billingTestStorage.clear();

  const trainerId = "trainer-restore-test";
  await subscriptionService.getSubscriptionForUser(trainerId);

  global.__mockAvailablePurchases = [
    {
      productId: "dragoncorp_pro_annual",
      purchaseToken: "token-restored-from-play-store",
      transactionId: "GPA.RESTORE.1111",
      orderId: "GPA.RESTORE.1111",
      platform: "google",
      rawPurchase: { productId: "dragoncorp_pro_annual" },
    },
  ];

  const restoreResult = await subscriptionService.restorePurchases(trainerId);
  assert.equal(restoreResult.restored, true);
  assert.equal(restoreResult.subscription.plan, "PRO");
  assert.equal(restoreResult.subscription.status, "active");

  const ent = await subscriptionService.getEntitlementsForUser(trainerId, 50);
  assert.equal(ent.isPro, true);
});

test("TESTE G — CONSULTA DE PREÇOS REAIS: Retorna ofertas e preços da Google Play", async () => {
  const products = await subscriptionService.getStoreProducts();
  assert.ok(products.length >= 2);

  const annual = products.find((p) => p.billingPeriod === "annual");
  assert.ok(annual);
  assert.equal(annual.localizedPrice, "R$ 199,90");
  assert.equal(annual.offerToken, "offer_annual_test_token_123");
});
