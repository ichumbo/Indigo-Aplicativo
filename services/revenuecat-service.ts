import AsyncStorage from "@react-native-async-storage/async-storage";
import type Purchases from "react-native-purchases";
import type { PurchasesPackage } from "react-native-purchases";
import type { NativeStoreProduct, PurchaseResult } from "./native-billing-service";
import { OFFICIAL_STORE_PRODUCTS, mapStoreBillingError } from "./subscription-store-config";

declare const process: { env: Record<string, string | undefined> };
declare const require: (name: string) => { Platform: { OS: string } };

const SESSION_KEY = "@dragoncorp/auth-session/v1";
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "https://api.dragoncorp.app/api/v1").replace(/\/$/, "");
let sdk: typeof Purchases | undefined;
let operations: Promise<unknown> = Promise.resolve();

export function isRevenueCatIOS(): boolean {
  // Lazy loading keeps Node tests and web independent of native modules.
  const mock = (globalThis as { __MOCK_PLATFORM_OS__?: string }).__MOCK_PLATFORM_OS__;
  if (mock) return mock === "ios";
  try {
    return require("react-native").Platform.OS === "ios";
  } catch {
    return false;
  }
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = operations.then(operation, operation);
  operations = next.catch(() => undefined);
  return next;
}

export async function getRevenueCatSession(expectedUserId?: string) {
  const session = JSON.parse((await AsyncStorage.getItem(SESSION_KEY)) || "null");
  const token = session?.token || session?.accessToken;
  if (!session?.user?.id || !token || token.startsWith("access-") ||
      (expectedUserId && session.user.id !== expectedUserId)) {
    throw new Error("Entre com sua conta autenticada para gerenciar a assinatura.");
  }
  return { userId: String(session.user.id), token: String(token) };
}

async function withCustomer<T>(operation: (purchases: typeof Purchases) => Promise<T>): Promise<T> {
  return serialize(async () => {
    if (!isRevenueCatIOS()) throw new Error("RevenueCat disponível somente no iOS.");
    const session = await getRevenueCatSession();
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Não foi possível confirmar sua sessão. Entre novamente.");
    const { user } = await response.json();
    if (String(user?.id) !== session.userId || !["TRAINER", "SUPER_ADMIN"].includes(String(user?.role).toUpperCase())) {
      throw new Error("Apenas a conta autenticada do treinador pode gerenciar planos.");
    }
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
    if (!apiKey?.startsWith("appl_")) throw new Error("Assinaturas Apple ainda não configuradas.");
    sdk ??= (await import("react-native-purchases")).default;
    if (!await sdk.isConfigured()) sdk.configure({ apiKey, appUserID: session.userId });
    else if (await sdk.getAppUserID() !== session.userId) await sdk.logIn(session.userId);
    await getRevenueCatSession(session.userId);
    const result = await operation(sdk);
    await getRevenueCatSession(session.userId);
    return result;
  });
}

async function packages(purchases: typeof Purchases): Promise<PurchasesPackage[]> {
  const offerings = await purchases.getOfferings();
  const offering = offerings.all[process.env.EXPO_PUBLIC_REVENUECAT_OFFERING || "default"];
  return (offering?.availablePackages || []).filter(({ product }) =>
    Object.values(OFFICIAL_STORE_PRODUCTS).some(p => p.appleProductId === product.identifier));
}

export async function getRevenueCatProducts(): Promise<NativeStoreProduct[]> {
  return withCustomer(async purchases => (await packages(purchases)).map(({ product }) => ({
    productId: product.identifier, title: product.title, description: product.description,
    price: product.price, currency: product.currencyCode, localizedPrice: product.priceString,
    billingPeriod: product.identifier === OFFICIAL_STORE_PRODUCTS.annual.appleProductId ? "annual" : "monthly",
  })));
}

export async function purchaseRevenueCatProduct(sku: string): Promise<PurchaseResult> {
  let purchased = false;
  try {
    return await withCustomer(async purchases => {
      const selected = (await packages(purchases)).find(p => p.product.identifier === sku);
      if (!selected) throw new Error("Plano indisponível na App Store.");
      await getRevenueCatSession(await purchases.getAppUserID());
      const result = await purchases.purchasePackage(selected);
      purchased = true;
      return { status: "PURCHASED", platform: "apple", productId: sku,
        transactionId: result.transaction.transactionIdentifier };
    });
  } catch (error) {
    if (purchased) return { status: "PENDING", platform: "apple" };
    const e = error as { code?: string; userCancelled?: boolean };
    if (e.userCancelled) return { status: "CANCELLED", platform: "apple" };
    if (e.code === "20") return { status: "PENDING", platform: "apple" };
    if (e.code === "6") return { status: "ALREADY_OWNED", platform: "apple" };
    return { status: "ERROR", platform: "apple", error: mapStoreBillingError("STORE_UNAVAILABLE", error, "apple") };
  }
}

export async function restoreRevenueCatPurchases(): Promise<void> {
  await withCustomer(async purchases => { await purchases.restorePurchases(); });
}

export async function refreshRevenueCatCustomer(): Promise<void> {
  await withCustomer(async purchases => {
    await purchases.invalidateCustomerInfoCache();
    await purchases.getCustomerInfo();
  });
}

export async function resetRevenueCatIdentity(): Promise<void> {
  await serialize(async () => {
    if (sdk && await sdk.isConfigured() && !await sdk.isAnonymous()) await sdk.logOut();
  });
}
