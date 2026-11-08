const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const root = process.cwd();
const outDir = path.join(root, ".temp-apple-storekit-test-build");

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

global.__appleBillingStorage = new Map();
let currentMockPlatform = "ios";

fs.writeFileSync(
  path.join(outDir, "react-native-mock.js"),
  `
module.exports = {
  Platform: {
    get OS() {
      return global.__MOCK_PLATFORM_OS__ || "ios";
    },
    select: (obj) => {
      const os = global.__MOCK_PLATFORM_OS__ || "ios";
      return obj[os] || obj.default;
    },
  },
  Alert: { alert: () => {} },
  Linking: { openURL: async () => {}, canOpenURL: async () => true },
};
`
);

let mockIapState = {
  products: [
    {
      productId: "com.dragoncorp.pro.annual",
      title: "Plano Pro Anual",
      description: "Acesso ilimitado o ano inteiro",
      price: 199.0,
      currency: "BRL",
      localizedPrice: "R$ 199,00",
    },
    {
      productId: "com.dragoncorp.pro.monthly",
      title: "Plano Pro Mensal",
      description: "Acesso ilimitado mensal",
      price: 19.9,
      currency: "BRL",
      localizedPrice: "R$ 19,90/mês",
    },
  ],
  purchases: [],
  requestPurchaseHook: null,
};

fs.writeFileSync(
  path.join(outDir, "expo-iap-mock.js"),
  `
let updateCallback = null;
let errorCallback = null;

module.exports = {
  initConnection: async () => true,
  endConnection: async () => true,
  fetchProducts: async ({ skus }) => {
    return (global.__mockIapState?.products || []).filter((p) => skus.includes(p.productId));
  },
  purchaseUpdatedListener: (cb) => {
    updateCallback = cb;
    return { remove: () => { updateCallback = null; } };
  },
  purchaseErrorListener: (cb) => {
    errorCallback = cb;
    return { remove: () => { errorCallback = null; } };
  },
  requestPurchase: async (payload) => {
    if (global.__mockIapState?.requestPurchaseHook) {
      return global.__mockIapState.requestPurchaseHook(payload, updateCallback, errorCallback);
    }
    // Default success flow
    if (updateCallback) {
      const sku = payload.request?.apple?.sku || payload.request?.google?.skus?.[0] || "com.dragoncorp.pro.monthly";
      setTimeout(() => {
        if (updateCallback) {
          updateCallback({
            productId: sku,
            transactionId: "tx-apple-" + Date.now(),
            originalTransactionIdentifierIOS: "orig-apple-" + Date.now(),
            transactionReceipt: "fake-apple-receipt-jws",
            purchaseState: "purchased",
          });
        }
      }, 10);
    }
  },
  finishTransaction: async () => true,
  getAvailablePurchases: async () => global.__mockIapState?.purchases || [],
};
`
);

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__appleBillingStorage.get(key) ?? null,
    setItem: async (key, val) => { global.__appleBillingStorage.set(key, val); },
    removeItem: async (key) => { global.__appleBillingStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach(k => global.__appleBillingStorage.delete(k)); },
    clear: async () => { global.__appleBillingStorage.clear(); },
  },
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
  if (request.startsWith("@/services/")) {
    const sub = request.replace("@/services/", "");
    return path.join(outDir, "services", `${sub}.js`);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

global.__mockIapState = mockIapState;
global.__MOCK_PLATFORM_OS__ = "ios";

const billingConfig = require(path.join(outDir, "services", "subscription-store-config.js"));
const nativeBilling = require(path.join(outDir, "services", "native-billing-service.js"));
const subService = require(path.join(outDir, "services", "subscription-service.js"));

test("1. Catálogo e IDs Oficiais Apple StoreKit (App Store Connect)", () => {
  const { OFFICIAL_STORE_PRODUCTS, resolveStoreProductId } = billingConfig;

  assert.equal(OFFICIAL_STORE_PRODUCTS.monthly.appleProductId, "com.dragoncorp.pro.monthly");
  assert.equal(OFFICIAL_STORE_PRODUCTS.annual.appleProductId, "com.dragoncorp.pro.annual");

  assert.equal(
    resolveStoreProductId("personal_pro_monthly", "apple"),
    "com.dragoncorp.pro.monthly"
  );
  assert.equal(
    resolveStoreProductId("personal_pro_annual", "apple"),
    "com.dragoncorp.pro.annual"
  );
});

test("2. Separação de Plataforma: iOS consulta SKUs Apple e Android consulta SKUs Google", () => {
  global.__MOCK_PLATFORM_OS__ = "ios";
  const iosSkus = nativeBilling.getSubscriptionSkus();
  assert.deepEqual(iosSkus, ["com.dragoncorp.pro.annual", "com.dragoncorp.pro.monthly"]);

  global.__MOCK_PLATFORM_OS__ = "android";
  const androidSkus = nativeBilling.getSubscriptionSkus();
  assert.deepEqual(androidSkus, ["dragoncorp_pro_annual", "dragoncorp_pro_monthly"]);
  global.__MOCK_PLATFORM_OS__ = "ios";
});

test("3. Guideline 2.1(b): No iOS, checkout usa StoreKit e NUNCA exige offerToken do Google Play", async () => {
  global.__MOCK_PLATFORM_OS__ = "ios";
  let capturedRequest = null;

  global.__mockIapState.requestPurchaseHook = async (payload, onUpdate) => {
    capturedRequest = payload;
    setTimeout(() => {
      onUpdate({
        productId: payload.request?.apple?.sku,
        transactionId: "tx-ios-12345",
        originalTransactionIdentifierIOS: "orig-ios-12345",
        transactionReceipt: "receipt-jws-token",
        purchaseState: "purchased",
      });
    }, 10);
  };

  const result = await nativeBilling.launchStoreCheckout({
    sku: "com.dragoncorp.pro.annual",
    // offerToken está ausente (como ocorre no iOS)
  });

  assert.equal(result.status, "PURCHASED");
  assert.equal(result.platform, "apple");
  assert.equal(result.productId, "com.dragoncorp.pro.annual");
  assert.ok(capturedRequest.request?.apple?.sku === "com.dragoncorp.pro.annual");
  assert.equal(capturedRequest.request?.google, undefined, "Payload Google não deve ser enviado no iOS");
});

test("4. Guideline 2.1(b): Mapeamento de Erros no iOS JAMAIS cita Google Play ou Google Play Console", () => {
  const { mapStoreBillingError } = billingConfig;

  const devErrApple = mapStoreBillingError("DEVELOPER_ERROR", null, "apple");
  assert.ok(!devErrApple.userMessage.toLowerCase().includes("google play"), "userMessage não pode citar Google Play no iOS");
  assert.ok(!devErrApple.userMessage.toLowerCase().includes("play console"), "userMessage não pode citar Play Console no iOS");
  assert.ok(devErrApple.userMessage.includes("App Store"), "userMessage deve referenciar App Store no iOS");

  const unavailApple = mapStoreBillingError("STORE_UNAVAILABLE", null, "apple");
  assert.ok(!unavailApple.userMessage.toLowerCase().includes("google play"));
  assert.ok(unavailApple.userMessage.includes("App Store"));

  const netErrApple = mapStoreBillingError("NETWORK_ERROR", null, "apple");
  assert.ok(!netErrApple.userMessage.toLowerCase().includes("google play"));
  assert.ok(netErrApple.userMessage.includes("App Store"));

  const itemUnavailApple = mapStoreBillingError("ITEM_UNAVAILABLE", null, "apple");
  assert.ok(!itemUnavailApple.userMessage.toLowerCase().includes("google play"));
  assert.ok(itemUnavailApple.userMessage.includes("App Store"));
});

test("5. Guideline 2.3.10: Verificação de Metadados e Ausência de 'Google Play' nos textos de iOS", () => {
  const subscriptionScreen = fs.readFileSync(path.join(root, "app", "subscription.tsx"), "utf-8");
  const paywallModal = fs.readFileSync(path.join(root, "components", "PaywallModal.tsx"), "utf-8");
  const deleteAccount = fs.readFileSync(path.join(root, "app", "delete-account.tsx"), "utf-8");
  const termsOfUse = fs.readFileSync(path.join(root, "app", "terms-of-use.tsx"), "utf-8");
  const privacyPolicy = fs.readFileSync(path.join(root, "app", "privacy-policy.tsx"), "utf-8");

  // No rodapé da tela de assinatura, deve existir condicional de plataforma
  assert.ok(
    subscriptionScreen.includes('Platform.OS === "ios"'),
    "app/subscription.tsx deve condicionar textos de loja por plataforma"
  );
  assert.ok(
    subscriptionScreen.includes("Pagamento 100% seguro via App Store"),
    "app/subscription.tsx deve exibir texto puro de App Store no iOS"
  );

  // No PaywallModal, não deve haver 'App Store ou Google Play' hardcoded
  assert.ok(
    !paywallModal.includes("App Store ou Google Play"),
    "components/PaywallModal.tsx não deve conter texto estático 'App Store ou Google Play'"
  );

  // Em delete-account, terms-of-use e privacy-policy
  assert.ok(
    !deleteAccount.includes("Assinaturas Apple / Google Play"),
    "delete-account não deve conter 'Assinaturas Apple / Google Play' estático"
  );
  assert.ok(
    !termsOfUse.includes("Guideline 3.1.2) & Google Play"),
    "terms-of-use não deve exibir 'Guideline 3.1.2) & Google Play' incondicionalmente"
  );
});

test("6. Suporte a iPad Air e Tablets: app.json e responsividade de tela", () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf-8"));
  assert.equal(appJson.expo.ios.supportsTablet, true, "app.json deve habilitar supportsTablet");

  const subScreen = fs.readFileSync(path.join(root, "app", "subscription.tsx"), "utf-8");
  assert.ok(subScreen.includes("maxWidth: 680"), "app/subscription.tsx deve limitar largura máxima para iPad");
  assert.ok(subScreen.includes('alignSelf: "center"'), "app/subscription.tsx deve centralizar conteúdo no iPad");
});

test("7. Restauração de Compras Apple (StoreKit): Valida transações e ativa Pro", async () => {
  global.__MOCK_PLATFORM_OS__ = "ios";
  await subService.resetSubscriptionStoreForTests();
  const userId = "trainer-ipad-user-1";

  global.__mockIapState.purchases = [
    {
      productId: "com.dragoncorp.pro.annual",
      transactionId: "tx-restore-ipad-999",
      originalTransactionIdentifierIOS: "orig-restore-ipad-999",
      transactionReceipt: "apple-restore-receipt",
    },
  ];

  const restoreOutcome = await subService.restorePurchases(userId);
  assert.equal(restoreOutcome.restored, true, "Deve restaurar assinatura com sucesso");
  assert.equal(restoreOutcome.subscription?.plan, "PRO");
  assert.equal(restoreOutcome.subscription?.provider, "apple");

  const entitlements = await subService.getEntitlementsForUser(userId);
  assert.equal(entitlements.isPro, true);
  assert.ok(entitlements.maxStudentsAllowed >= 99999, "Pro deve liberar alunos ilimitados");
});

test("8. Não-regressão Android: Fluxo Google Play permanece intacto", () => {
  const { OFFICIAL_STORE_PRODUCTS } = billingConfig;
  assert.equal(OFFICIAL_STORE_PRODUCTS.monthly.googleProductId, "dragoncorp_pro_monthly");
  assert.equal(OFFICIAL_STORE_PRODUCTS.annual.googleProductId, "dragoncorp_pro_annual");

  const { mapStoreBillingError } = billingConfig;
  const devErrGoogle = mapStoreBillingError("DEVELOPER_ERROR", null, "google");
  assert.ok(devErrGoogle.userMessage.includes("Play Console"), "Mensagem do Google Play Console deve ser mantida para Android");
});
