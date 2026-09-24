import {
  OFFICIAL_STORE_PRODUCTS,
  StoreBillingError,
  mapStoreBillingError,
} from "./subscription-store-config";

declare const require: any;

function getPlatformOS(): "ios" | "android" | "web" {
  try {
    const g = globalThis as unknown as { Platform?: { OS?: "ios" | "android" | "web" } };
    return g?.Platform?.OS || "android";
  } catch {
    return "android";
  }
}

function isExpoGo(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants")?.default || require("expo-constants");
    if (!Constants) return false;
    return (
      Constants.executionEnvironment === "storeClient" ||
      Constants.appOwnership === "expo"
    );
  } catch {
    return false;
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

function getFallbackStoreProducts(): NativeStoreProduct[] {
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

// Lazy-load de expo-iap para compatibilidade com ambiente de testes (Node.js/Jest), Web e Expo Go
let ExpoIap: typeof import("expo-iap") | null = null;
let isNativeModuleUnavailable = false;
let isIapInitialized = false;

async function getIapModule(): Promise<typeof import("expo-iap") | null> {
  if (
    isNativeModuleUnavailable ||
    isExpoGo() ||
    getPlatformOS() === "web" ||
    isNodeTestEnvironment()
  ) {
    return null;
  }
  if (!ExpoIap) {
    try {
      ExpoIap = await import("expo-iap");
    } catch {
      isNativeModuleUnavailable = true;
      ExpoIap = null;
    }
  }
  return ExpoIap;
}

/**
 * Inicializa a conexão com o Google Play Billing / StoreKit
 */
export async function initStoreBilling(): Promise<boolean> {
  if (isNativeModuleUnavailable || isExpoGo()) return false;
  const iap = await getIapModule();
  if (!iap) return false;

  try {
    const result = await iap.initConnection();
    isIapInitialized = !!result;
    return isIapInitialized;
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    if (
      errMessage.includes("Cannot find native module") ||
      errMessage.includes("ExpoIap") ||
      errMessage.includes("UnavailabilityError")
    ) {
      isNativeModuleUnavailable = true;
      console.info("[Billing] Módulo nativo de faturamento não disponível no runtime atual. Usando catálogo padrão.");
    } else {
      console.warn("[Billing] Falha ao inicializar Google Play Billing / StoreKit:", err);
    }
    isIapInitialized = false;
    return false;
  }
}

/**
 * Encerra a conexão com o serviço de faturamento
 */
export async function endStoreBilling(): Promise<void> {
  if (isNativeModuleUnavailable) return;
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
  if (isNativeModuleUnavailable || isExpoGo() || getPlatformOS() === "web" || isNodeTestEnvironment()) {
    return getFallbackStoreProducts();
  }

  const iap = await getIapModule();
  const skus = getSubscriptionSkus();

  if (!iap) {
    return getFallbackStoreProducts();
  }

  try {
    if (!isIapInitialized) {
      const initialized = await initStoreBilling();
      if (!initialized) {
        return getFallbackStoreProducts();
      }
    }

    const subscriptions = await iap.fetchProducts({ skus, type: "subs" });

    if (!subscriptions || subscriptions.length === 0) {
      return getFallbackStoreProducts();
    }

    return subscriptions.map((sub): NativeStoreProduct => {
      const subRecord = sub as unknown as Record<string, unknown>;
      const productId = String(subRecord.productId || subRecord.id || "");
      const isAnnual =
        productId.includes("annual") || productId.includes("anual");
      const billingPeriod: "monthly" | "annual" = isAnnual ? "annual" : "monthly";

      let localizedPrice =
        (typeof subRecord.localizedPrice === "string" && subRecord.localizedPrice) ||
        (typeof subRecord.displayPrice === "string" && subRecord.displayPrice) ||
        "";
      let price =
        typeof subRecord.price === "number" && subRecord.price > 0
          ? subRecord.price
          : parseFloat(String(subRecord.price || "0"));
      let currency =
        typeof subRecord.currency === "string" && subRecord.currency
          ? subRecord.currency
          : "BRL";
      let offerToken: string | undefined = undefined;

      // Suporte unificado: OpenIAP (subscriptionOffers com offerTokenAndroid) e legado/mock (subscriptionOfferDetailsAndroid com offerToken)
      const offerList =
        (Array.isArray(subRecord.subscriptionOffers) ? subRecord.subscriptionOffers : null) ||
        (Array.isArray(subRecord.subscriptionOfferDetailsAndroid)
          ? subRecord.subscriptionOfferDetailsAndroid
          : null) ||
        [];

      if (offerList.length > 0) {
        for (const rawOffer of offerList) {
          const offer = rawOffer as Record<string, unknown>;
          if (!offer) continue;

          const token =
            (typeof offer.offerTokenAndroid === "string" && offer.offerTokenAndroid) ||
            (typeof offer.offerToken === "string" && offer.offerToken) ||
            (typeof offer.token === "string" && offer.token) ||
            undefined;

          if (token && token.trim() !== "") {
            offerToken = token.trim();

            if (typeof offer.displayPrice === "string" && offer.displayPrice) {
              localizedPrice = offer.displayPrice;
            }
            if (typeof offer.price === "number" && offer.price > 0) {
              price = offer.price;
            }
            if (typeof offer.currency === "string" && offer.currency) {
              currency = offer.currency;
            }

            const pricingPhases =
              (offer.pricingPhasesAndroid as Record<string, unknown>) ||
              (offer.pricingPhases as Record<string, unknown>);
            const phaseList =
              (pricingPhases?.pricingPhaseList as Array<Record<string, unknown>>) ||
              [];
            const firstPhase = phaseList?.[0];
            if (firstPhase) {
              if (typeof firstPhase.formattedPrice === "string" && firstPhase.formattedPrice) {
                localizedPrice = firstPhase.formattedPrice;
              }
              if (firstPhase.priceAmountMicros) {
                price = parseFloat(String(firstPhase.priceAmountMicros)) / 1000000;
              }
              if (typeof firstPhase.priceCurrencyCode === "string" && firstPhase.priceCurrencyCode) {
                currency = firstPhase.priceCurrencyCode;
              }
            }
            break;
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
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    if (
      errMessage.includes("Cannot find native module") ||
      errMessage.includes("ExpoIap") ||
      errMessage.includes("UnavailabilityError")
    ) {
      isNativeModuleUnavailable = true;
      console.info("[Billing] ExpoIap nativo não encontrado. Usando catálogo de fallback.");
    } else {
      console.warn("[Billing] Erro ao buscar assinaturas da loja:", error);
    }
    return getFallbackStoreProducts();
  }
}

/**
 * Inicia o fluxo oficial de checkout da Google Play / App Store (launchBillingFlow)
 */
export async function launchStoreCheckout(params: {
  sku: string;
  offerToken?: string;
}): Promise<PurchaseResult> {
  const platform: "apple" | "google" = getPlatformOS() === "ios" ? "apple" : "google";

  if (isNativeModuleUnavailable || isExpoGo() || isNodeTestEnvironment() || getPlatformOS() === "web") {
    return {
      status: "ERROR",
      platform,
      error: {
        code: "STORE_UNAVAILABLE",
        message: "Google Play Billing / StoreKit não disponível no ambiente atual.",
        userMessage: "O faturamento nativo requer uma compilação de desenvolvimento (EAS Build / Dev Client) ou dispositivo com Play Store/App Store.",
      },
    };
  }

  const iap = await getIapModule();

  if (!iap) {
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

    let resolvedOfferToken = params.offerToken;

    // No Android (Google Play Billing v5+ / OpenIAP), se o offerToken não foi passado diretamente,
    // auto-resolve buscando do catálogo ativo da loja
    if (getPlatformOS() === "android" && (!resolvedOfferToken || resolvedOfferToken.trim() === "")) {
      try {
        const availableProds = await fetchStoreSubscriptions();
        const matched = availableProds.find(
          (p) =>
            p.productId === params.sku ||
            p.productId.toLowerCase().includes(params.sku.toLowerCase()) ||
            params.sku.toLowerCase().includes(p.productId.toLowerCase())
        );
        if (matched?.offerToken && matched.offerToken.trim() !== "") {
          resolvedOfferToken = matched.offerToken;
        }
      } catch (lookupErr) {
        console.warn("[Billing] Não foi possível auto-resolver offerToken:", lookupErr);
      }
    }

    // Se no Android ainda não houver offerToken válido, NÃO passar offerToken: "" pois isso quebra no Kotlin
    if (getPlatformOS() === "android" && (!resolvedOfferToken || resolvedOfferToken.trim() === "")) {
      return {
        status: "ERROR",
        platform: "google",
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: `Nenhuma oferta ativa ou plano base foi localizado no Google Play para o produto '${params.sku}'.`,
          userMessage:
            "Não foi possível carregar as ofertas da assinatura no Google Play. Verifique se o produto e o plano base estão ativos no Google Play Console.",
        },
      };
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
            orderId: purchase.transactionId || undefined,
            platform,
            rawPurchase: purchase,
          });
          return;
        }

        resolve({
          status: "PURCHASED",
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken || undefined,
          transactionId: purchase.transactionId || undefined,
          orderId: purchase.transactionId || undefined,
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
          error: mapStoreBillingError(errCode || "UNKNOWN_ERROR", err),
        });
      });

      try {
        if (getPlatformOS() === "android") {
          await iap.requestPurchase({
            type: "subs",
            request: {
              google: {
                skus: [params.sku],
                subscriptionOffers: [
                  { sku: params.sku, offerToken: resolvedOfferToken! },
                ],
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
          error: mapStoreBillingError(errCode || "UNKNOWN_ERROR", reqErr),
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
  if (isNativeModuleUnavailable || isExpoGo()) return true;
  const iap = await getIapModule();
  if (!iap) return true;

  try {
    await iap.finishTransaction({
      purchase: purchase as import("expo-iap").Purchase,
      isConsumable: false,
    });
    return true;
  } catch (err) {
    console.warn("[Billing] Falha ao finalizar/reconhecer transação na loja:", err);
    return false;
  }
}

/**
 * Consulta todas as compras e assinaturas ativas na conta da Google Play / App Store do dispositivo
 */
export async function getActiveStorePurchases(): Promise<PurchaseResult[]> {
  if (isNativeModuleUnavailable || isExpoGo() || getPlatformOS() === "web" || isNodeTestEnvironment()) {
    return [];
  }
  const iap = await getIapModule();
  const platform: "apple" | "google" = getPlatformOS() === "ios" ? "apple" : "google";
  if (!iap) return [];

  try {
    if (!isIapInitialized) {
      const initialized = await initStoreBilling();
      if (!initialized) return [];
    }

    const purchases = await iap.getAvailablePurchases();
    if (!purchases || purchases.length === 0) {
      return [];
    }

    return purchases.map((p): PurchaseResult => ({
      status: "PURCHASED",
      productId: p.productId,
      purchaseToken: p.purchaseToken || undefined,
      transactionId: p.transactionId || undefined,
      orderId: p.transactionId || undefined,
      platform,
      rawPurchase: p,
    }));
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    if (
      errMessage.includes("Cannot find native module") ||
      errMessage.includes("ExpoIap")
    ) {
      isNativeModuleUnavailable = true;
    } else {
      console.warn("[Billing] Erro ao consultar compras ativas para restauração:", err);
    }
    return [];
  }
}
