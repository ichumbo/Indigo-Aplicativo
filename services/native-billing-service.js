"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStoreBilling = initStoreBilling;
exports.endStoreBilling = endStoreBilling;
exports.getSubscriptionSkus = getSubscriptionSkus;
exports.fetchStoreSubscriptions = fetchStoreSubscriptions;
exports.launchStoreCheckout = launchStoreCheckout;
exports.acknowledgeStorePurchase = acknowledgeStorePurchase;
exports.getActiveStorePurchases = getActiveStorePurchases;
const subscription_store_config_1 = require("./subscription-store-config");
function getPlatformOS() {
    try {
        const g = globalThis;
        return g?.Platform?.OS || "android";
    }
    catch {
        return "android";
    }
}
function isNodeTestEnvironment() {
    try {
        const g = globalThis;
        return g?.process?.env?.NODE_ENV === "test";
    }
    catch {
        return false;
    }
}
// Lazy-load de expo-iap para compatibilidade com ambiente de testes (Node.js/Jest) e Web
let ExpoIap = null;
async function getIapModule() {
    if (getPlatformOS() === "web" || isNodeTestEnvironment()) {
        return null;
    }
    if (!ExpoIap) {
        try {
            ExpoIap = await Promise.resolve().then(() => __importStar(require("expo-iap")));
        }
        catch {
            ExpoIap = null;
        }
    }
    return ExpoIap;
}
let isIapInitialized = false;
/**
 * Inicializa a conexão com o Google Play Billing / StoreKit
 */
async function initStoreBilling() {
    const iap = await getIapModule();
    if (!iap)
        return false;
    try {
        const result = await iap.initConnection();
        isIapInitialized = !!result;
        return isIapInitialized;
    }
    catch (err) {
        console.warn("[Billing] Falha ao inicializar Google Play Billing / StoreKit:", err);
        isIapInitialized = false;
        return false;
    }
}
/**
 * Encerra a conexão com o serviço de faturamento
 */
async function endStoreBilling() {
    const iap = await getIapModule();
    if (!iap || !isIapInitialized)
        return;
    try {
        await iap.endConnection();
        isIapInitialized = false;
    }
    catch {
        // Silently ignore
    }
}
/**
 * Obtém os SKUs de assinaturas configurados para a plataforma atual
 */
function getSubscriptionSkus() {
    const isAndroid = getPlatformOS() === "android";
    return [
        isAndroid
            ? subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.googleProductId
            : subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.appleProductId,
        isAndroid
            ? subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.googleProductId
            : subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.appleProductId,
    ];
}
/**
 * Consulta os detalhes reais dos produtos e ofertas diretamente da Google Play / App Store
 */
async function fetchStoreSubscriptions() {
    const iap = await getIapModule();
    const skus = getSubscriptionSkus();
    if (!iap) {
        // Fallback estruturado para ambientes sem bridge nativo (web / dev / testes)
        return [
            {
                productId: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.id,
                title: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.title,
                description: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.description,
                price: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.referencePrice,
                currency: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.currency,
                localizedPrice: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.annual.localizedPrice,
                billingPeriod: "annual",
            },
            {
                productId: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.id,
                title: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.title,
                description: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.description,
                price: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.referencePrice,
                currency: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.currency,
                localizedPrice: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.localizedPrice,
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
        return subscriptions.map((sub) => {
            const subRecord = sub;
            const productId = String(subRecord.productId || subRecord.id || "");
            const isAnnual = productId.includes("annual") || productId.includes("anual");
            const billingPeriod = isAnnual ? "annual" : "monthly";
            let localizedPrice = (typeof subRecord.localizedPrice === "string" && subRecord.localizedPrice) ||
                (typeof subRecord.displayPrice === "string" && subRecord.displayPrice) ||
                "";
            let price = typeof subRecord.price === "number" && subRecord.price > 0
                ? subRecord.price
                : parseFloat(String(subRecord.price || "0"));
            let currency = typeof subRecord.currency === "string" && subRecord.currency
                ? subRecord.currency
                : "BRL";
            let offerToken = undefined;
            // Suporte unificado: OpenIAP (subscriptionOffers com offerTokenAndroid) e legado/mock (subscriptionOfferDetailsAndroid com offerToken)
            const offerList = (Array.isArray(subRecord.subscriptionOffers) ? subRecord.subscriptionOffers : null) ||
                (Array.isArray(subRecord.subscriptionOfferDetailsAndroid)
                    ? subRecord.subscriptionOfferDetailsAndroid
                    : null) ||
                [];
            if (offerList.length > 0) {
                for (const rawOffer of offerList) {
                    const offer = rawOffer;
                    if (!offer)
                        continue;
                    const token = (typeof offer.offerTokenAndroid === "string" && offer.offerTokenAndroid) ||
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
                        const pricingPhases = offer.pricingPhasesAndroid ||
                            offer.pricingPhases;
                        const phaseList = pricingPhases?.pricingPhaseList ||
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
                title: subRecord.title || (isAnnual ? "Plano Pro Anual" : "Plano Pro Mensal"),
                description: subRecord.description || "",
                price: price || (isAnnual ? 199.9 : 19.9),
                currency,
                localizedPrice: localizedPrice || (isAnnual ? "R$ 199,90" : "R$ 19,90/mês"),
                billingPeriod,
                offerToken,
                rawProduct: sub,
            };
        });
    }
    catch (error) {
        console.error("[Billing] Erro ao buscar assinaturas da loja:", error);
        return [];
    }
}
/**
 * Inicia o fluxo oficial de checkout da Google Play / App Store (launchBillingFlow)
 */
async function launchStoreCheckout(params) {
    const iap = await getIapModule();
    const platform = getPlatformOS() === "ios" ? "apple" : "google";
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
                    error: (0, subscription_store_config_1.mapStoreBillingError)("STORE_UNAVAILABLE"),
                };
            }
        }
        let resolvedOfferToken = params.offerToken;
        // No Android (Google Play Billing v5+ / OpenIAP), se o offerToken não foi passado diretamente,
        // auto-resolve buscando do catálogo ativo da loja
        if (getPlatformOS() === "android" && (!resolvedOfferToken || resolvedOfferToken.trim() === "")) {
            try {
                const availableProds = await fetchStoreSubscriptions();
                const matched = availableProds.find((p) => p.productId === params.sku ||
                    p.productId.toLowerCase().includes(params.sku.toLowerCase()) ||
                    params.sku.toLowerCase().includes(p.productId.toLowerCase()));
                if (matched?.offerToken && matched.offerToken.trim() !== "") {
                    resolvedOfferToken = matched.offerToken;
                }
            }
            catch (lookupErr) {
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
                    userMessage: "Não foi possível carregar as ofertas da assinatura no Google Play. Verifique se o produto e o plano base estão ativos no Google Play Console.",
                },
            };
        }
        return await new Promise(async (resolve) => {
            let finished = false;
            let updateSub = null;
            let errorSub = null;
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
                if (finished)
                    return;
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
                if (finished)
                    return;
                finished = true;
                cleanup();
                const errorObj = err;
                const errCode = errorObj?.code || errorObj?.name || "";
                const errMsg = errorObj?.message || "";
                if (errCode === "E_USER_CANCELLED" ||
                    errCode === "USER_CANCELLED" ||
                    errMsg.toLowerCase().includes("cancel")) {
                    resolve({
                        status: "CANCELLED",
                        platform,
                        error: (0, subscription_store_config_1.mapStoreBillingError)("USER_CANCELLED"),
                    });
                    return;
                }
                if (errCode === "E_ALREADY_OWNED" ||
                    errMsg.toLowerCase().includes("already owned")) {
                    resolve({
                        status: "ALREADY_OWNED",
                        platform,
                        error: (0, subscription_store_config_1.mapStoreBillingError)("ALREADY_OWNED"),
                    });
                    return;
                }
                resolve({
                    status: "ERROR",
                    platform,
                    error: (0, subscription_store_config_1.mapStoreBillingError)(errCode || "UNKNOWN_ERROR", err),
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
                                    { sku: params.sku, offerToken: resolvedOfferToken },
                                ],
                            },
                        },
                    });
                }
                else {
                    await iap.requestPurchase({
                        type: "subs",
                        request: {
                            apple: {
                                sku: params.sku,
                            },
                        },
                    });
                }
            }
            catch (reqErr) {
                if (finished)
                    return;
                finished = true;
                cleanup();
                const errorObj = reqErr;
                const errCode = errorObj?.code || "";
                if (errCode === "E_USER_CANCELLED" ||
                    errCode === "USER_CANCELLED" ||
                    errorObj?.message?.toLowerCase().includes("cancel")) {
                    resolve({
                        status: "CANCELLED",
                        platform,
                        error: (0, subscription_store_config_1.mapStoreBillingError)("USER_CANCELLED"),
                    });
                    return;
                }
                resolve({
                    status: "ERROR",
                    platform,
                    error: (0, subscription_store_config_1.mapStoreBillingError)(errCode || "UNKNOWN_ERROR", reqErr),
                });
            }
        });
    }
    catch (err) {
        return {
            status: "ERROR",
            platform,
            error: (0, subscription_store_config_1.mapStoreBillingError)("UNKNOWN_ERROR", err),
        };
    }
}
/**
 * Executa o Acknowledgment obrigatório da Google Play após validação com o backend
 */
async function acknowledgeStorePurchase(purchase) {
    const iap = await getIapModule();
    if (!iap)
        return true;
    try {
        await iap.finishTransaction({
            purchase: purchase,
            isConsumable: false,
        });
        return true;
    }
    catch (err) {
        console.error("[Billing] Falha ao finalizar/reconhecer transação na loja:", err);
        return false;
    }
}
/**
 * Consulta todas as compras e assinaturas ativas na conta da Google Play / App Store do dispositivo
 */
async function getActiveStorePurchases() {
    const iap = await getIapModule();
    const platform = getPlatformOS() === "ios" ? "apple" : "google";
    if (!iap)
        return [];
    try {
        if (!isIapInitialized) {
            await initStoreBilling();
        }
        const purchases = await iap.getAvailablePurchases();
        if (!purchases || purchases.length === 0) {
            return [];
        }
        return purchases.map((p) => ({
            status: "PURCHASED",
            productId: p.productId,
            purchaseToken: p.purchaseToken || undefined,
            transactionId: p.transactionId,
            orderId: p.transactionId,
            platform,
            rawPurchase: p,
        }));
    }
    catch (err) {
        console.error("[Billing] Erro ao consultar compras ativas para restauração:", err);
        return [];
    }
}
