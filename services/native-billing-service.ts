import {
  OFFICIAL_STORE_PRODUCTS,
  StoreBillingError,
  mapStoreBillingError,
} from "./subscription-store-config";

function getPlatformOS(): "ios" | "android" | "web" {
  try {
    const g = globalThis as unknown as { Platform?: { OS?: "ios" | "android" | "web" } };
    return g?.Platform?.OS || "android";
  } catch {
    return "android";
  }
}

// Interface para detalhes de produtos de assinatura retornados da loja
export interface NativeStoreProduct {
  productId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  localizedPrice: string;
  billingPeriod: "monthly" | "annual";
  offerToken?: string;
  rawProduct?: unknown;
}

export interface PurchaseResult {
  status: "PURCHASED" | "PENDING" | "CANCELLED" | "ERROR" | "ALREADY_OWNED";
  productId?: string;
  purchaseToken?: string;
  orderId?: string;
  transactionId?: string;
  transactionReceipt?: string;
  platform: "apple" | "google";
  rawPurchase?: unknown;
  error?: StoreBillingError;
}

function isNodeTestEnvironment(): boolean {
  try {
    const g = globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } };
    return g?.process?.env?.NODE_ENV === "test";
  } catch {
    return false;
  }
}

// Lazy-load de expo-iap para compatibilidade com ambiente de testes (Node.js/Jest) e Web
let ExpoIap: typeof import("expo-iap") | null = null;

async function getIapModule(): Promise<typeof import("expo-iap") | null> {
  if (getPlatformOS() === "web" || isNodeTestEnvironment()) {
    return null;
  }
  if (!ExpoIap) {
    try {
      ExpoIap = await import("expo-iap");
    } catch {
      ExpoIap = null;
    }
  }
  return ExpoIap;
}

let isIapInitialized = false;

/**
 * Inicializa a conexão com o Google Play Billing / StoreKit
 */
export async function initStoreBilling(): Promise<boolean> {
  const iap = await getIapModule();
  if (!iap) return false;

  try {
    const result = await iap.initConnection();
    isIapInitialized = !!result;
    return isIapInitialized;
  } catch (err) {
    console.warn("[Billing] Falha ao inicializar Google Play Billing / StoreKit:", err);
    isIapInitialized = false;
    return false;
  }
}

/**
 * Encerra a conexão com o serviço de faturamento
 */
export async function endStoreBilling(): Promise<void> {
  const iap = await getIapModule();
  if (!iap || !isIapInitialized) return;
  try {
    await iap.endConnection();
    isIapInitialized = false;
  } catch {
    // Silently ignore
  }
}

/**
 * Obtém os SKUs de assinaturas configurados para a plataforma atual
 */
export function getSubscriptionSkus(): string[] {
  const isAndroid = getPlatformOS() === "android";
  return [
    isAndroid
      ? OFFICIAL_STORE_PRODUCTS.annual.googleProductId
      : OFFICIAL_STORE_PRODUCTS.annual.appleProductId,
    isAndroid
      ? OFFICIAL_STORE_PRODUCTS.monthly.googleProductId
      : OFFICIAL_STORE_PRODUCTS.monthly.appleProductId,
  ];
}

/**
 * Consulta os detalhes reais dos produtos e ofertas diretamente da Google Play / App Store
 */
export async function fetchStoreSubscriptions(): Promise<NativeStoreProduct[]> {
  const iap = await getIapModule();
  const skus = getSubscriptionSkus();

  if (!iap) {
    // Fallback estruturado para ambientes sem bridge nativo (web / dev / testes)
    return [
      {
        productId: OFFICIAL_STORE_PRODUCTS.annual.id,
        title: OFFICIAL_STORE_PRODUCTS.annual.title,
        description: OFFICIAL_STORE_PRODUCTS.annual.description,
        price: OFFICIAL_STORE_PRODUCTS.annual.referencePrice,
        currency: OFFICIAL_STORE_PRODUCTS.annual.currency,
        localizedPrice: OFFICIAL_STORE_PRODUCTS.annual.localizedPrice,
        billingPeriod: "annual",
      },
      {
        productId: OFFICIAL_STORE_PRODUCTS.monthly.id,
        title: OFFICIAL_STORE_PRODUCTS.monthly.title,
        description: OFFICIAL_STORE_PRODUCTS.monthly.description,
        price: OFFICIAL_STORE_PRODUCTS.monthly.referencePrice,
        currency: OFFICIAL_STORE_PRODUCTS.monthly.currency,
        localizedPrice: OFFICIAL_STORE_PRODUCTS.monthly.localizedPrice,
        billingPeriod: "monthly",
      },
    ];
  }

  try {
    if (!isIapInitialized) {
      await initStoreBilling();
    }

    const subscriptions = await iap.fetchProducts({ skus, type: "subs" });

    if (!subscriptions || subscriptions.length === 0) {
      console.warn("[Billing] Nenhum produto retornado pela loja. Verifique o Play Console.");
      return [];
    }

    return subscriptions.map((sub): NativeStoreProduct => {
      const subRecord = sub as unknown as Record<string, unknown>;
      const productId = String(subRecord.productId || subRecord.id || "");
      const isAnnual =
        productId.includes("annual") || productId.includes("anual");
      const billingPeriod: "monthly" | "annual" = isAnnual ? "annual" : "monthly";

      let localizedPrice = typeof subRecord.localizedPrice === "string" ? subRecord.localizedPrice : "";
      let price = typeof subRecord.price === "number" ? subRecord.price : parseFloat(String(subRecord.price || "0"));
      let currency = typeof subRecord.currency === "string" ? subRecord.currency : "BRL";
      let offerToken: string | undefined = undefined;

      // Google Play Billing v5+ subscriptionOfferDetailsAndroid
      const offerDetails =
        (subRecord.subscriptionOfferDetailsAndroid as Array<Record<string, unknown>>) ||
        (subRecord.subscriptionOffers as Array<Record<string, unknown>>) ||
        [];

      if (Array.isArray(offerDetails) && offerDetails.length > 0) {
        const primaryOffer = offerDetails[0];
        if (primaryOffer) {
          offerToken = (primaryOffer.offerToken as string) || undefined;
          const pricingPhases = primaryOffer.pricingPhases as Record<string, unknown>;
          const pricingPhaseList = pricingPhases?.pricingPhaseList as Array<Record<string, unknown>>;
          const firstPhase = pricingPhaseList?.[0];
          if (firstPhase) {
            localizedPrice = (firstPhase.formattedPrice as string) || localizedPrice;
            price = parseFloat(String(firstPhase.priceAmountMicros || "0")) / 1000000;
            currency = (firstPhase.priceCurrencyCode as string) || currency;
          }
        }
      }

      return {
        productId,
        title: (subRecord.title as string) || (isAnnual ? "Plano Pro Anual" : "Plano Pro Mensal"),
        description: (subRecord.description as string) || "",
        price: price || (isAnnual ? 199.9 : 19.9),
        currency,
        localizedPrice: localizedPrice || (isAnnual ? "R$ 199,90" : "R$ 19,90/mês"),
        billingPeriod,
        offerToken,
        rawProduct: sub,
      };
    });
  } catch (error) {
    console.error("[Billing] Erro ao buscar assinaturas da loja:", error);
    return [];
  }
}

/**
 * Inicia o fluxo oficial de checkout da Google Play / App Store (launchBillingFlow)
 */
export async function launchStoreCheckout(params: {
  sku: string;
  offerToken?: string;
}): Promise<PurchaseResult> {
  const iap = await getIapModule();
  const platform: "apple" | "google" = getPlatformOS() === "ios" ? "apple" : "google";

  if (!iap) {
    // Em ambiente de teste/web onde não há Google Play Services nativo
    return {
      status: "ERROR",
      platform,
      error: {
        code: "STORE_UNAVAILABLE",
        message: "Google Play Billing não disponível no ambiente atual.",
        userMessage: "Não foi possível iniciar a compra na loja. Tente novamente em um dispositivo Android com Google Play.",
      },
    };
  }

  try {
    if (!isIapInitialized) {
      const initialized = await initStoreBilling();
      if (!initialized) {
        return {
          status: "ERROR",
          platform,
          error: mapStoreBillingError("STORE_UNAVAILABLE"),
        };
      }
    }

    return await new Promise<PurchaseResult>(async (resolve) => {
      let finished = false;
      let updateSub: { remove: () => void } | null = null;
      let errorSub: { remove: () => void } | null = null;

      const cleanup = () => {
        if (updateSub) {
          updateSub.remove();
          updateSub = null;
        }
        if (errorSub) {
          errorSub.remove();
          errorSub = null;
        }
      };

      updateSub = iap.purchaseUpdatedListener((purchase) => {
        if (finished) return;
        finished = true;
        cleanup();

        const isPending = purchase.purchaseState === "pending";
        if (isPending) {
          resolve({
            status: "PENDING",
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken || undefined,
            orderId: purchase.transactionId,
            platform,
            rawPurchase: purchase,
          });
          return;
        }

        resolve({
          status: "PURCHASED",
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken || undefined,
          transactionId: purchase.transactionId,
          orderId: purchase.transactionId,
          platform,
          rawPurchase: purchase,
        });
      });

      errorSub = iap.purchaseErrorListener((err) => {
        if (finished) return;
        finished = true;
        cleanup();

        const errorObj = err as { code?: string; name?: string; message?: string };
        const errCode = errorObj?.code || errorObj?.name || "";
        const errMsg = errorObj?.message || "";

        if (
          errCode === "E_USER_CANCELLED" ||
          errCode === "USER_CANCELLED" ||
          errMsg.toLowerCase().includes("cancel")
        ) {
          resolve({
            status: "CANCELLED",
            platform,
            error: mapStoreBillingError("USER_CANCELLED"),
          });
          return;
        }

        if (
          errCode === "E_ALREADY_OWNED" ||
          errMsg.toLowerCase().includes("already owned")
        ) {
          resolve({
            status: "ALREADY_OWNED",
            platform,
            error: mapStoreBillingError("ALREADY_OWNED"),
          });
          return;
        }

        resolve({
          status: "ERROR",
          platform,
          error: mapStoreBillingError("UNKNOWN_ERROR", err),
        });
      });

      try {
        if (getPlatformOS() === "android") {
          const subscriptionOffers = params.offerToken
            ? [{ sku: params.sku, offerToken: params.offerToken }]
            : [{ sku: params.sku, offerToken: "" }];

          await iap.requestPurchase({
            type: "subs",
            request: {
              google: {
                skus: [params.sku],
                subscriptionOffers,
              },
            },
          });
        } else {
          await iap.requestPurchase({
            type: "subs",
            request: {
              apple: {
                sku: params.sku,
              },
            },
          });
        }
      } catch (reqErr: unknown) {
        if (finished) return;
        finished = true;
        cleanup();

        const errorObj = reqErr as { code?: string; message?: string };
        const errCode = errorObj?.code || "";
        if (
          errCode === "E_USER_CANCELLED" ||
          errCode === "USER_CANCELLED" ||
          errorObj?.message?.toLowerCase().includes("cancel")
        ) {
          resolve({
            status: "CANCELLED",
            platform,
            error: mapStoreBillingError("USER_CANCELLED"),
          });
          return;
        }

        resolve({
          status: "ERROR",
          platform,
          error: mapStoreBillingError("UNKNOWN_ERROR", reqErr),
        });
      }
    });
  } catch (err: unknown) {
    return {
      status: "ERROR",
      platform,
      error: mapStoreBillingError("UNKNOWN_ERROR", err),
    };
  }
}

/**
 * Executa o Acknowledgment obrigatório da Google Play após validação com o backend
 */
export async function acknowledgeStorePurchase(
  purchase: unknown
): Promise<boolean> {
  const iap = await getIapModule();
  if (!iap) return true;

  try {
    await iap.finishTransaction({
      purchase: purchase as import("expo-iap").Purchase,
      isConsumable: false,
    });
    return true;
  } catch (err) {
    console.error("[Billing] Falha ao finalizar/reconhecer transação na loja:", err);
    return false;
  }
}

/**
 * Consulta todas as compras e assinaturas ativas na conta da Google Play / App Store do dispositivo
 */
export async function getActiveStorePurchases(): Promise<PurchaseResult[]> {
  const iap = await getIapModule();
  const platform: "apple" | "google" = getPlatformOS() === "ios" ? "apple" : "google";
  if (!iap) return [];

  try {
    if (!isIapInitialized) {
      await initStoreBilling();
    }

    const purchases = await iap.getAvailablePurchases();
    if (!purchases || purchases.length === 0) {
      return [];
    }

    return purchases.map((p): PurchaseResult => ({
      status: "PURCHASED",
      productId: p.productId,
      purchaseToken: p.purchaseToken || undefined,
      transactionId: p.transactionId,
      orderId: p.transactionId,
      platform,
      rawPurchase: p,
    }));
  } catch (err) {
    console.error("[Billing] Erro ao consultar compras ativas para restauração:", err);
    return [];
  }
}
