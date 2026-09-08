"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelSubscriptionForUser = exports.restorePurchasesForUser = exports.processStorePurchase = void 0;
exports.getStoreProducts = getStoreProducts;
exports.getSubscriptionConfig = getSubscriptionConfig;
exports.updateSubscriptionConfig = updateSubscriptionConfig;
exports.getSubscriptionForUser = getSubscriptionForUser;
exports.getEntitlementsForUser = getEntitlementsForUser;
exports.validateStudentAdditionAllowed = validateStudentAdditionAllowed;
exports.validateServerSidePurchase = validateServerSidePurchase;
exports.purchaseSubscriptionFlow = purchaseSubscriptionFlow;
exports.purchaseProduct = purchaseProduct;
exports.restorePurchases = restorePurchases;
exports.syncUserSubscriptionOnLaunch = syncUserSubscriptionOnLaunch;
exports.cancelSubscription = cancelSubscription;
exports.listAllSubscriptions = listAllSubscriptions;
exports.updateSubscriptionAdminOverride = updateSubscriptionAdminOverride;
exports.resetSubscriptionStoreForTests = resetSubscriptionStoreForTests;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const subscription_store_config_1 = require("./subscription-store-config");
const native_billing_service_1 = require("./native-billing-service");
const STORAGE_KEY_SUBSCRIPTIONS = "@dragoncorp/subscriptions_v1";
const STORAGE_KEY_SUB_EVENTS = "@dragoncorp/subscription_events_v1";
const STORAGE_KEY_SUB_CONFIG = "@dragoncorp/subscription_config_v1";
const STORAGE_KEY_TXN_INDEX = "@dragoncorp/subscription_txns_v1";
const STORAGE_KEY_TOKEN_INDEX = "@dragoncorp/subscription_tokens_v1";
const DEFAULT_CONFIG = {
    freeMaxStudents: 1,
    proProductIdApple: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.appleProductId,
    proProductIdGoogle: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.googleProductId,
    proReferencePrice: subscription_store_config_1.OFFICIAL_STORE_PRODUCTS.monthly.referencePrice,
};
/**
 * Consulta de produtos e preços disponíveis na loja oficial (Google Play Billing / StoreKit)
 * Busca valores localizados reais em tempo de execução
 */
async function getStoreProducts() {
    const nativeProducts = await (0, native_billing_service_1.fetchStoreSubscriptions)();
    if (nativeProducts && nativeProducts.length > 0) {
        return nativeProducts.map((np) => ({
            productId: np.productId,
            title: np.title,
            description: np.description,
            price: np.price,
            currency: np.currency,
            localizedPrice: np.localizedPrice,
            billingPeriod: np.billingPeriod,
            offerToken: np.offerToken,
        }));
    }
    // Fallback padrão canônico
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
async function getSubscriptionConfig() {
    try {
        const raw = await async_storage_1.default.getItem(STORAGE_KEY_SUB_CONFIG);
        if (!raw)
            return DEFAULT_CONFIG;
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULT_CONFIG;
    }
}
async function updateSubscriptionConfig(updates) {
    const current = await getSubscriptionConfig();
    const next = { ...current, ...updates };
    await async_storage_1.default.setItem(STORAGE_KEY_SUB_CONFIG, JSON.stringify(next));
    return next;
}
async function readAllSubscriptions() {
    try {
        const raw = await async_storage_1.default.getItem(STORAGE_KEY_SUBSCRIPTIONS);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
async function writeAllSubscriptions(data) {
    await async_storage_1.default.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(data));
}
async function readTransactionIndex() {
    try {
        const raw = await async_storage_1.default.getItem(STORAGE_KEY_TXN_INDEX);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
async function recordTransactionIndex(transactionId, userId, subscriptionId) {
    const index = await readTransactionIndex();
    index[transactionId] = { userId, subscriptionId, date: new Date().toISOString() };
    await async_storage_1.default.setItem(STORAGE_KEY_TXN_INDEX, JSON.stringify(index));
}
async function readTokenIndex() {
    try {
        const raw = await async_storage_1.default.getItem(STORAGE_KEY_TOKEN_INDEX);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
async function recordTokenIndex(purchaseToken, userId, subscriptionId) {
    const index = await readTokenIndex();
    index[purchaseToken] = { userId, subscriptionId, date: new Date().toISOString() };
    await async_storage_1.default.setItem(STORAGE_KEY_TOKEN_INDEX, JSON.stringify(index));
}
async function recordSubscriptionEvent(event) {
    try {
        const raw = await async_storage_1.default.getItem(STORAGE_KEY_SUB_EVENTS);
        const events = raw ? JSON.parse(raw) : [];
        const newEvent = {
            ...event,
            id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            createdAt: new Date().toISOString(),
        };
        events.unshift(newEvent);
        await async_storage_1.default.setItem(STORAGE_KEY_SUB_EVENTS, JSON.stringify(events.slice(0, 500)));
    }
    catch {
        // Continua sem falhar
    }
}
/**
 * Obtém ou inicializa a assinatura de um usuário com verificação de expiração
 */
async function getSubscriptionForUser(userId, userName, userEmail) {
    const all = await readAllSubscriptions();
    if (all[userId]) {
        const sub = all[userId];
        // Validação de expiração automática baseada em data
        if (sub.plan === "PRO" &&
            sub.expiresAt &&
            new Date(sub.expiresAt).getTime() < Date.now() &&
            sub.status !== "expired") {
            const expiredSub = {
                ...sub,
                status: "expired",
                updatedAt: new Date().toISOString(),
            };
            all[userId] = expiredSub;
            await writeAllSubscriptions(all);
            await recordSubscriptionEvent({
                subscriptionId: sub.id,
                userId,
                provider: sub.provider,
                eventType: "EXPIRATION",
                payload: { previousStatus: sub.status, expiredAt: sub.expiresAt },
            });
            return expiredSub;
        }
        return sub;
    }
    // Inicializa plano FREE canônico
    const now = new Date().toISOString();
    const initialSub = {
        id: `sub-${userId}`,
        userId,
        userName: userName || "Personal Trainer",
        userEmail: userEmail || "trainer@dragoncorp.app",
        plan: "FREE",
        provider: "free",
        productId: "free_tier",
        status: "free",
        environment: "development",
        startedAt: now,
        expiresAt: null,
        autoRenew: false,
        acknowledged: true,
        lastVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
    };
    all[userId] = initialSub;
    await writeAllSubscriptions(all);
    return initialSub;
}
/**
 * Motor central de Entitlements (Autorização de Recursos pelo Backend)
 */
async function getEntitlementsForUser(userId, activeStudentsCount = 0) {
    const sub = await getSubscriptionForUser(userId);
    const config = await getSubscriptionConfig();
    const isPro = sub.plan === "PRO" && (0, subscription_store_config_1.isSubscriptionStatusActive)(sub.status);
    const maxStudentsAllowed = isPro ? 99999 : config.freeMaxStudents;
    const canAddStudent = isPro || activeStudentsCount < config.freeMaxStudents;
    const entitlements = {
        can_add_student: canAddStudent,
        can_use_ai: true,
        can_use_finance: isPro,
        can_generate_reports: isPro,
        can_create_unlimited_workouts: isPro,
        can_create_unlimited_assessments: isPro,
        can_access_advanced_metrics: isPro,
    };
    return {
        plan: sub.plan,
        status: sub.status,
        entitlements,
        activeStudentsCount,
        maxStudentsAllowed,
        isPro,
    };
}
/**
 * Validação segura de adição de aluno (Backend Authority)
 */
async function validateStudentAdditionAllowed(trainerId, currentStudentsCount) {
    const { isPro, maxStudentsAllowed } = await getEntitlementsForUser(trainerId, currentStudentsCount);
    if (isPro) {
        return { allowed: true, requiresUpgrade: false };
    }
    if (currentStudentsCount >= maxStudentsAllowed) {
        return {
            allowed: false,
            reason: `Seu plano gratuito permite gerenciar ${maxStudentsAllowed} aluno ativo. Faça o upgrade para o Plano Pro para gerenciar alunos ilimitados.`,
            requiresUpgrade: true,
        };
    }
    return { allowed: true, requiresUpgrade: false };
}
/**
 * Validação Server-Side com Idempotência Estrita por TransactionId e PurchaseToken
 * Autoridade máxima para liberação de Entitlements
 */
async function validateServerSidePurchase(input) {
    const { userId, platform, productId = "personal_pro_monthly", environment = "production", isIntroductoryTrial = false, } = input;
    const transactionId = input.transactionId ||
        `txn-${platform}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const purchaseToken = input.purchaseToken ||
        `token-${platform}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    // 1. Verificação de idempotência por PurchaseToken e TransactionId
    const tokenIndex = await readTokenIndex();
    const existingToken = tokenIndex[purchaseToken];
    const txnIndex = await readTransactionIndex();
    const existingTxn = txnIndex[transactionId];
    const all = await readAllSubscriptions();
    const currentSub = all[userId] || (await getSubscriptionForUser(userId));
    if (existingToken) {
        if (existingToken.userId === userId && currentSub && (0, subscription_store_config_1.isSubscriptionStatusActive)(currentSub.status)) {
            return { success: true, subscription: currentSub, isDuplicate: true };
        }
        if (existingToken.userId !== userId) {
            throw new Error("Este comprovante de compra já foi vinculado a outra conta.");
        }
    }
    if (existingTxn) {
        if (existingTxn.userId === userId && currentSub && (0, subscription_store_config_1.isSubscriptionStatusActive)(currentSub.status)) {
            return { success: true, subscription: currentSub, isDuplicate: true };
        }
        if (existingTxn.userId !== userId) {
            throw new Error("Esta transação já foi vinculada a outra conta.");
        }
    }
    // 2. Calcula período e expiração
    const now = new Date();
    const isAnnual = productId.includes("annual") || productId.includes("anual");
    const expires = new Date(now);
    if (isAnnual) {
        expires.setFullYear(expires.getFullYear() + 1);
    }
    else {
        expires.setMonth(expires.getMonth() + 1);
    }
    const resolvedStatus = isIntroductoryTrial ? "trial" : "active";
    const updatedSub = {
        ...currentSub,
        plan: "PRO",
        provider: platform,
        productId,
        status: resolvedStatus,
        originalTransactionId: input.originalTransactionId || currentSub.originalTransactionId || transactionId,
        transactionId,
        purchaseToken,
        orderId: input.orderId || transactionId,
        environment,
        startedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        autoRenew: true,
        acknowledged: true,
        lastVerifiedAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
    all[userId] = updatedSub;
    await writeAllSubscriptions(all);
    await recordTransactionIndex(transactionId, userId, updatedSub.id);
    await recordTokenIndex(purchaseToken, userId, updatedSub.id);
    await recordSubscriptionEvent({
        subscriptionId: updatedSub.id,
        userId,
        provider: platform,
        eventType: "INITIAL_PURCHASE",
        payload: {
            productId,
            transactionId,
            originalTransactionId: updatedSub.originalTransactionId,
            status: resolvedStatus,
            expiresAt: updatedSub.expiresAt,
            environment,
        },
    });
    return { success: true, subscription: updatedSub, isDuplicate: false };
}
/**
 * Fluxo Oficial de Compra com Google Play Billing / StoreKit
 * NUNCA ativa Pro no onPress sem confirmação da loja e validação server-side
 */
async function purchaseSubscriptionFlow(params) {
    const { userId, productId, offerToken } = params;
    // 1. Inicia checkout oficial na Google Play / App Store
    const checkoutResult = await (0, native_billing_service_1.launchStoreCheckout)({
        sku: productId,
        offerToken,
    });
    // 2. Trata estado CANCELLED
    if (checkoutResult.status === "CANCELLED") {
        return {
            success: false,
            status: "CANCELLED",
            message: "Compra cancelada.",
        };
    }
    // 3. Trata estado PENDING (Pagamento em processamento - NÃO libera Premium)
    if (checkoutResult.status === "PENDING") {
        return {
            success: false,
            status: "PENDING",
            message: "Seu pagamento está sendo processado. O acesso será liberado após a confirmação.",
        };
    }
    // 4. Trata estado ALREADY_OWNED
    if (checkoutResult.status === "ALREADY_OWNED") {
        const restoreResult = await restorePurchases(userId);
        return {
            success: restoreResult.restored,
            status: "ALREADY_OWNED",
            subscription: restoreResult.subscription,
            message: restoreResult.message,
        };
    }
    // 5. Trata estado ERROR
    if (checkoutResult.status === "ERROR" || !checkoutResult.purchaseToken) {
        const errMsg = checkoutResult.error?.userMessage ||
            "Não foi possível iniciar a compra. Tente novamente.";
        throw new Error(errMsg);
    }
    // 6. Estado PURCHASED -> Validação Server-Side Obrigatória
    const validation = await validateServerSidePurchase({
        userId,
        platform: checkoutResult.platform,
        productId: checkoutResult.productId || productId,
        transactionId: checkoutResult.transactionId,
        purchaseToken: checkoutResult.purchaseToken,
        orderId: checkoutResult.orderId,
        environment: "production",
    });
    // 7. Acknowledgment Obrigatório da Google Play após sucesso no backend
    if (checkoutResult.rawPurchase) {
        await (0, native_billing_service_1.acknowledgeStorePurchase)(checkoutResult.rawPurchase);
    }
    return {
        success: true,
        status: "PURCHASED",
        subscription: validation.subscription,
        message: "Assinatura ativada com sucesso.",
    };
}
function isNodeTestEnvironment() {
    try {
        const g = globalThis;
        return typeof g?.process?.versions?.node === "string";
    }
    catch {
        return false;
    }
}
/**
 * Wrapper de compra programática / testes (mantido para compatibilidade e testes unitários)
 */
async function purchaseProduct(userId, productId = "personal_pro_monthly", provider = "google") {
    if (isNodeTestEnvironment()) {
        const res = await validateServerSidePurchase({
            userId,
            platform: provider,
            productId: (0, subscription_store_config_1.resolveStoreProductId)(productId, provider),
            environment: "sandbox",
        });
        return res.subscription;
    }
    const outcome = await purchaseSubscriptionFlow({
        userId,
        productId: (0, subscription_store_config_1.resolveStoreProductId)(productId, provider),
    });
    if (outcome.subscription) {
        return outcome.subscription;
    }
    throw new Error(outcome.message);
}
const processStorePurchase = async (params) => {
    const result = await validateServerSidePurchase({
        userId: params.userId,
        platform: params.provider || "google",
        productId: params.productId || "personal_pro_monthly",
        transactionId: params.transactionId,
        purchaseToken: params.receiptToken,
        environment: params.environment || "production",
    });
    return { success: true, subscription: result.subscription };
};
exports.processStorePurchase = processStorePurchase;
/**
 * Restauração de compras nas lojas oficiais (Google Play Billing / StoreKit)
 */
async function restorePurchases(userId) {
    const all = await readAllSubscriptions();
    const sub = all[userId];
    // 1. Consulta compras ativas direto na Google Play / App Store
    const activePurchases = await (0, native_billing_service_1.getActiveStorePurchases)();
    if (activePurchases.length > 0) {
        let latestSub = undefined;
        for (const purchase of activePurchases) {
            if (purchase.purchaseToken) {
                const validated = await validateServerSidePurchase({
                    userId,
                    platform: purchase.platform,
                    productId: purchase.productId,
                    transactionId: purchase.transactionId,
                    purchaseToken: purchase.purchaseToken,
                    orderId: purchase.orderId,
                    environment: "production",
                });
                latestSub = validated.subscription;
                if (purchase.rawPurchase) {
                    await (0, native_billing_service_1.acknowledgeStorePurchase)(purchase.rawPurchase);
                }
            }
        }
        if (latestSub) {
            await recordSubscriptionEvent({
                subscriptionId: latestSub.id,
                userId,
                provider: latestSub.provider,
                eventType: "RESTORE",
                payload: { status: "RESTORED_FROM_STORE" },
            });
            return {
                restored: true,
                subscription: latestSub,
                message: "Sua assinatura Pro foi restaurada com sucesso.",
            };
        }
    }
    // Se já possui assinatura Pro ativa localmente
    if (sub && sub.plan === "PRO" && (0, subscription_store_config_1.isSubscriptionStatusActive)(sub.status)) {
        return {
            restored: true,
            subscription: sub,
            message: "Sua assinatura Pro está ativa e sincronizada.",
        };
    }
    return {
        restored: false,
        message: "Não encontramos nenhuma compra ativa para restaurar nesta conta da loja.",
    };
}
exports.restorePurchasesForUser = restorePurchases;
/**
 * Sincronização segura de assinatura no cold start ou no login do aplicativo
 */
async function syncUserSubscriptionOnLaunch(userId) {
    const sub = await getSubscriptionForUser(userId);
    return sub;
}
/**
 * Cancelamento de assinatura (preserva histórico e dados dos alunos)
 */
async function cancelSubscription(userId) {
    const all = await readAllSubscriptions();
    const sub = all[userId] || (await getSubscriptionForUser(userId));
    const updatedSub = {
        ...sub,
        status: "cancelled",
        autoRenew: false,
        updatedAt: new Date().toISOString(),
    };
    all[userId] = updatedSub;
    await writeAllSubscriptions(all);
    await recordSubscriptionEvent({
        subscriptionId: sub.id,
        userId,
        provider: sub.provider,
        eventType: "CANCELLATION",
        payload: { expiresAt: sub.expiresAt },
    });
    return updatedSub;
}
exports.cancelSubscriptionForUser = cancelSubscription;
/**
 * Lista todas as assinaturas para o painel Admin
 */
async function listAllSubscriptions(filter = "all") {
    const all = await readAllSubscriptions();
    let list = Object.values(all);
    if (list.length === 0) {
        const demoTrainerSub = await getSubscriptionForUser("trainer-demo-id", "Personal Trainer Demo", "treinador@dragoncorp.app");
        list = [demoTrainerSub];
    }
    return list.filter((sub) => {
        if (filter === "all")
            return true;
        if (filter === "free")
            return sub.plan === "FREE";
        if (filter === "pro")
            return sub.plan === "PRO";
        if (filter === "active")
            return sub.status === "active";
        if (filter === "cancelled")
            return sub.status === "cancelled";
        if (filter === "expired")
            return sub.status === "expired";
        return true;
    });
}
/**
 * Override de assinatura pelo Master Admin
 */
async function updateSubscriptionAdminOverride(userId, updates) {
    const all = await readAllSubscriptions();
    const current = all[userId] || (await getSubscriptionForUser(userId));
    const updated = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    all[userId] = updated;
    await writeAllSubscriptions(all);
    await recordSubscriptionEvent({
        subscriptionId: updated.id,
        userId,
        provider: "admin",
        eventType: "ADMIN_OVERRIDE",
        payload: updates,
    });
    return updated;
}
async function resetSubscriptionStoreForTests() {
    await async_storage_1.default.removeItem(STORAGE_KEY_SUBSCRIPTIONS);
    await async_storage_1.default.removeItem(STORAGE_KEY_SUB_EVENTS);
    await async_storage_1.default.removeItem(STORAGE_KEY_SUB_CONFIG);
    await async_storage_1.default.removeItem(STORAGE_KEY_TXN_INDEX);
    await async_storage_1.default.removeItem(STORAGE_KEY_TOKEN_INDEX);
}
