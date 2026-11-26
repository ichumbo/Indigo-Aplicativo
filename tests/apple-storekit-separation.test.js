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

let rcUser;
let rcPurchaseError;
let rcPurchases = 0;
let rcRestores = 0;
const rcPackage = { product: { identifier: "com.dragoncorp.pro.annual", title: "Pro Anual", description: "Anual", price: 199, currencyCode: "BRL", priceString: "R$ 199,00" } };
const revenueCatMock = {
  isConfigured: async () => !!rcUser,
  configure: ({ appUserID }) => { rcUser = appUserID; },
  getAppUserID: async () => rcUser,
  logIn: async id => { rcUser = id; },
  isAnonymous: async () => !rcUser,
  logOut: async () => { rcUser = undefined; },
  getOfferings: async () => ({ all: { default: { availablePackages: [rcPackage] } } }),
  purchasePackage: async () => {
    if (rcPurchaseError) throw rcPurchaseError;
    rcPurchases++;
    return { transaction: { transactionIdentifier: "rc-transaction" } };
  },
  restorePurchases: async () => { rcRestores++; },
  invalidateCustomerInfoCache: async () => {},
  getCustomerInfo: async () => ({}),
};
fs.writeFileSync(path.join(outDir, "revenuecat-mock.js"), "module.exports = { __esModule: true, default: global.__revenueCatMock };");
global.__revenueCatMock = revenueCatMock;

function setServerSession(userId) {
  global.__appleBillingStorage.set("@dragoncorp/auth-session/v1", JSON.stringify({ user: { id: userId, role: "TRAINER" }, accessToken: "server-token" }));
}
function serverFetch(userId, isPro = true) {
  return async url => ({ ok: true, json: async () => url.endsWith("/auth/me")
    ? { user: { id: userId, role: "TRAINER" } }
    : { id: `sub-${userId}`, isPro, status: isPro ? "active" : "free", provider: "apple", environment: "sandbox",
        productId: "com.dragoncorp.pro.annual", currentPeriodEnd: "2099-01-01T00:00:00Z", autoRenew: true } });
}
process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY = "appl_test";

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "react-native-purchases") return path.join(outDir, "revenuecat-mock.js");
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

test("3. No iOS, RevenueCat compra sem offerToken e sem inicializar expo-iap", async () => {
  global.__MOCK_PLATFORM_OS__ = "ios";
  setServerSession("trainer-rc");
  const previousFetch = global.fetch;
  global.fetch = serverFetch("trainer-rc");
  let legacyCalled = false;
  global.__mockIapState.requestPurchaseHook = async () => { legacyCalled = true; };
  try {
    const result = await nativeBilling.launchStoreCheckout({ sku: "com.dragoncorp.pro.annual" });
    assert.equal(result.status, "PURCHASED");
    assert.equal(result.platform, "apple");
    assert.equal(result.transactionId, "rc-transaction");
    assert.equal(legacyCalled, false);
    assert.equal(rcUser, "trainer-rc");
  } finally { global.fetch = previousFetch; }
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

test("7. Restauração Apple usa RevenueCat e só libera PRO confirmado no backend", async () => {
  const previousEnv = process.env.NODE_ENV;
  const previousFetch = global.fetch;
  process.env.NODE_ENV = "production";
  global.__MOCK_PLATFORM_OS__ = "ios";
  setServerSession("trainer-restored");
  global.fetch = serverFetch("trainer-restored");
  try {
    const result = await subService.restorePurchases("trainer-restored");
    assert.equal(result.restored, true);
    assert.equal(result.subscription.plan, "PRO");
    assert.equal(rcUser, "trainer-restored");
    assert.equal(rcRestores, 1);
  } finally {
    global.fetch = previousFetch;
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
  }
});

test("8. Não-regressão Android: Fluxo Google Play permanece intacto", () => {
  const { OFFICIAL_STORE_PRODUCTS } = billingConfig;
  assert.equal(OFFICIAL_STORE_PRODUCTS.monthly.googleProductId, "dragoncorp_pro_monthly");
  assert.equal(OFFICIAL_STORE_PRODUCTS.annual.googleProductId, "dragoncorp_pro_annual");

  const { mapStoreBillingError } = billingConfig;
  const devErrGoogle = mapStoreBillingError("DEVELOPER_ERROR", null, "google");
  assert.ok(devErrGoogle.userMessage.includes("Play Console"), "Mensagem do Google Play Console deve ser mantida para Android");
});

test("9. Falha de sincronização RevenueCat não libera PRO; reabrir o app reconcilia", async () => {
  const previousEnv = process.env.NODE_ENV;
  const previousFetch = global.fetch;
  process.env.NODE_ENV = "production";
  global.__appleBillingStorage.clear();
  setServerSession("trainer-remote");
  try {
    global.fetch = async () => { throw new Error("offline"); };
    await assert.rejects(subService.syncRevenueCatSubscription("trainer-remote"), /offline/);
    assert.equal((await subService.getSubscriptionForUser("trainer-remote")).plan, "FREE");
    global.fetch = serverFetch("trainer-remote");
    const synced = await subService.syncUserSubscriptionOnLaunch("trainer-remote");
    assert.equal(synced.plan, "PRO");
    assert.equal(synced.environment, "sandbox");
  } finally {
    global.fetch = previousFetch;
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
  }
});

test("10. Rejeição do servidor não ativa PRO nem aceita identidade de outra conta", async () => {
  const previousFetch = global.fetch;
  global.__appleBillingStorage.clear();
  setServerSession("trainer-rejected");
  try {
    global.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(subService.syncRevenueCatSubscription("trainer-rejected"), /pendente/);
    assert.equal((await subService.getSubscriptionForUser("trainer-rejected")).plan, "FREE");
    await assert.rejects(subService.syncRevenueCatSubscription("trainer-other"), /autenticada/);
  } finally { global.fetch = previousFetch; }
});

test("11. Sessão local é recusada antes de abrir o checkout", async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  global.__appleBillingStorage.clear();
  global.__appleBillingStorage.set("@dragoncorp/auth-session/v1", JSON.stringify({accessToken: "access-local", user: {role: "TRAINER"}}));
  try {
    await assert.rejects(subService.purchaseSubscriptionFlow({userId: "local", productId: "com.dragoncorp.pro.monthly"}), /autenticada no servidor/);
  } finally {
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
  }
});

test("12. Compra confirmada com backend indisponível fica pendente sem nova cobrança", async () => {
  const previousEnv = process.env.NODE_ENV;
  const previousFetch = global.fetch;
  process.env.NODE_ENV = "production";
  setServerSession("trainer-pending");
  global.__MOCK_PLATFORM_OS__ = "ios";
  let syncCalls = 0;
  const callsBefore = rcPurchases;
  global.fetch = async url => {
    if (url.endsWith("/subscription/sync") && ++syncCalls > 1) return { ok: false, status: 503 };
    return serverFetch("trainer-pending", false)(url);
  };
  try {
    const result = await subService.purchaseSubscriptionFlow({ userId: "trainer-pending", productId: "com.dragoncorp.pro.annual" });
    assert.equal(result.status, "PENDING");
    assert.equal(rcPurchases, callsBefore + 1);
    assert.equal((await subService.getSubscriptionForUser("trainer-pending")).plan, "FREE");
  } finally {
    global.fetch = previousFetch;
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
  }
});

test("13. Cancelamento do usuário e pagamento pendente não ativam assinatura", async () => {
  const previousFetch = global.fetch;
  setServerSession("trainer-cancel");
  global.fetch = serverFetch("trainer-cancel");
  try {
    rcPurchaseError = { userCancelled: true };
    assert.equal((await nativeBilling.launchStoreCheckout({ sku: "com.dragoncorp.pro.annual" })).status, "CANCELLED");
    rcPurchaseError = { code: "20" };
    assert.equal((await nativeBilling.launchStoreCheckout({ sku: "com.dragoncorp.pro.annual" })).status, "PENDING");
  } finally { rcPurchaseError = undefined; global.fetch = previousFetch; }
});

test("14. Logout remove identidade RevenueCat e não permite compra sem sessão", async () => {
  const revenuecat = require(path.join(outDir, "services", "revenuecat-service.js"));
  await revenuecat.resetRevenueCatIdentity();
  assert.equal(rcUser, undefined);
  global.__appleBillingStorage.clear();
  assert.equal((await nativeBilling.launchStoreCheckout({ sku: "com.dragoncorp.pro.annual" })).status, "ERROR");
});

test("15. Catálogo iOS mostra preços localizados dos pacotes configurados no RevenueCat", async () => {
  const previousFetch = global.fetch;
  setServerSession("trainer-catalog");
  global.fetch = serverFetch("trainer-catalog");
  try {
    const products = await nativeBilling.fetchStoreSubscriptions();
    assert.equal(products.length, 1);
    assert.equal(products[0].productId, "com.dragoncorp.pro.annual");
    assert.equal(products[0].localizedPrice, "R$ 199,00");
    assert.equal(products[0].billingPeriod, "annual");
  } finally { global.fetch = previousFetch; }
});
