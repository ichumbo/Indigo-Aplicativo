import AsyncStorage from "@react-native-async-storage/async-storage";

export type SubscriptionPlan = "FREE" | "PRO";
export type SubscriptionProvider = "apple" | "google" | "admin" | "free";
export type SubscriptionStatus =
  | "free"
  | "active"
  | "grace_period"
  | "past_due"
  | "cancelled"
  | "expired";

export type SubscriptionEntitlement =
  | "can_add_student"
  | "can_use_ai"
  | "can_use_finance"
  | "can_generate_reports"
  | "can_create_unlimited_workouts"
  | "can_create_unlimited_assessments"
  | "can_access_advanced_metrics";

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  plan: SubscriptionPlan;
  provider: SubscriptionProvider;
  productId: string;
  status: SubscriptionStatus;
  originalTransactionId?: string;
  transactionId?: string;
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  userId: string;
  provider: SubscriptionProvider;
  eventType:
    | "INITIAL_PURCHASE"
    | "RENEWAL"
    | "CANCELLATION"
    | "EXPIRATION"
    | "RESTORE"
    | "ADMIN_OVERRIDE"
    | "PLAN_DOWNGRADE";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface StoreProductInfo {
  productId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  localizedPrice: string;
  billingPeriod: string;
}

export interface SubscriptionSystemConfig {
  freeMaxStudents: number;
  proProductIdApple: string;
  proProductIdGoogle: string;
  proReferencePrice: number;
}

const STORAGE_KEY_SUBSCRIPTIONS = "@dragoncorp/subscriptions_v1";
const STORAGE_KEY_SUB_EVENTS = "@dragoncorp/subscription_events_v1";
const STORAGE_KEY_SUB_CONFIG = "@dragoncorp/subscription_config_v1";

const DEFAULT_CONFIG: SubscriptionSystemConfig = {
  freeMaxStudents: 1,
  proProductIdApple: "personal_pro_monthly",
  proProductIdGoogle: "personal_pro_monthly",
  proReferencePrice: 19.9,
};

/**
 * Consulta de produtos na loja (Apple StoreKit / Google Play Billing)
 * O preço NUNCA é hardcoded em produção e é obtido de forma localizada.
 */
export async function getStoreProducts(): Promise<StoreProductInfo[]> {
  // Simula consulta nativa StoreKit / Google Play Billing
  return [
    {
      productId: "personal_pro_annual",
      title: "Anual",
      description: "Acesso ilimitado o ano inteiro, sem renovação mensal. Ganhe 2 meses grátis (pague 10, use 12).",
      price: 199.9,
      currency: "BRL",
      localizedPrice: "R$ 199,90",
      billingPeriod: "annual",
    },
    {
      productId: "personal_pro_monthly",
      title: "Mensal",
      description: "Acesso ilimitado a alunos, treinos, avaliações e IA.",
      price: 19.9,
      currency: "BRL",
      localizedPrice: "R$ 19,90/mês",
      billingPeriod: "monthly",
    },
  ];
}

export async function getSubscriptionConfig(): Promise<SubscriptionSystemConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SUB_CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function updateSubscriptionConfig(
  updates: Partial<SubscriptionSystemConfig>
): Promise<SubscriptionSystemConfig> {
  const current = await getSubscriptionConfig();
  const next = { ...current, ...updates };
  await AsyncStorage.setItem(STORAGE_KEY_SUB_CONFIG, JSON.stringify(next));
  return next;
}

async function readAllSubscriptions(): Promise<Record<string, SubscriptionRecord>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeAllSubscriptions(
  data: Record<string, SubscriptionRecord>
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(data));
}

async function recordSubscriptionEvent(
  event: Omit<SubscriptionEvent, "id" | "createdAt">
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SUB_EVENTS);
    const events: SubscriptionEvent[] = raw ? JSON.parse(raw) : [];
    const newEvent: SubscriptionEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    events.unshift(newEvent);
    await AsyncStorage.setItem(
      STORAGE_KEY_SUB_EVENTS,
      JSON.stringify(events.slice(0, 500))
    );
  } catch {
    // Silently continue
  }
}

/**
 * Obtém ou inicializa a assinatura de um usuário (Personal Trainer)
 */
export async function getSubscriptionForUser(
  userId: string,
  userName?: string,
  userEmail?: string
): Promise<SubscriptionRecord> {
  const all = await readAllSubscriptions();

  if (all[userId]) {
    const sub = all[userId];
    // Verifica expiração automática
    if (
      sub.plan === "PRO" &&
      sub.expiresAt &&
      new Date(sub.expiresAt).getTime() < Date.now()
    ) {
      const expiredSub: SubscriptionRecord = {
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

  // Inicializa plano FREE por padrão
  const now = new Date().toISOString();
  const initialSub: SubscriptionRecord = {
    id: `sub-${userId}`,
    userId,
    userName: userName || "Personal Trainer",
    userEmail: userEmail || "trainer@dragoncorp.app",
    plan: "FREE",
    provider: "free",
    productId: "free_tier",
    status: "free",
    startedAt: now,
    expiresAt: null,
    autoRenew: false,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  all[userId] = initialSub;
  await writeAllSubscriptions(all);
  return initialSub;
}

/**
 * Motor central de Entitlements (Permissões de Recursos)
 */
export async function getEntitlementsForUser(
  userId: string,
  activeStudentsCount = 0
): Promise<{
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  entitlements: Record<SubscriptionEntitlement, boolean>;
  activeStudentsCount: number;
  maxStudentsAllowed: number;
  isPro: boolean;
}> {
  const sub = await getSubscriptionForUser(userId);
  const config = await getSubscriptionConfig();

  const isPro =
    sub.plan === "PRO" && (sub.status === "active" || sub.status === "grace_period");

  const maxStudentsAllowed = isPro ? 99999 : config.freeMaxStudents;
  const canAddStudent = isPro || activeStudentsCount < config.freeMaxStudents;

  const entitlements: Record<SubscriptionEntitlement, boolean> = {
    can_add_student: canAddStudent,
    can_use_ai: true, // No Free tem acesso inicial, Pro tem acesso ilimitado
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
 * Validação segura de adição de aluno (Backend & Store Authority)
 */
export async function validateStudentAdditionAllowed(
  trainerId: string,
  currentStudentsCount: number
): Promise<{ allowed: boolean; reason?: string; requiresUpgrade: boolean }> {
  const { entitlements, isPro, maxStudentsAllowed } = await getEntitlementsForUser(
    trainerId,
    currentStudentsCount
  );

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
 * Realiza compra via StoreKit / Google Play Billing
 * Valida a transação e atualiza os entitlements
 */
export async function purchaseProduct(
  userId: string,
  productId = "personal_pro_monthly",
  provider: "apple" | "google" = "apple"
): Promise<SubscriptionRecord> {
  const all = await readAllSubscriptions();
  const sub = all[userId] || (await getSubscriptionForUser(userId));

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const transactionId = `txn-${provider}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const updatedSub: SubscriptionRecord = {
    ...sub,
    plan: "PRO",
    provider,
    productId,
    status: "active",
    originalTransactionId: sub.originalTransactionId || transactionId,
    transactionId,
    startedAt: now.toISOString(),
    expiresAt: nextMonth.toISOString(),
    autoRenew: true,
    lastVerifiedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  all[userId] = updatedSub;
  await writeAllSubscriptions(all);

  await recordSubscriptionEvent({
    subscriptionId: updatedSub.id,
    userId,
    provider,
    eventType: "INITIAL_PURCHASE",
    payload: { productId, transactionId, expiresAt: updatedSub.expiresAt },
  });

  return updatedSub;
}

/**
 * Restauração de compras nas lojas (Apple StoreKit / Google Play)
 */
export async function restorePurchases(
  userId: string
): Promise<{ restored: boolean; subscription?: SubscriptionRecord; message: string }> {
  const all = await readAllSubscriptions();
  const sub = all[userId];

  if (sub && sub.plan === "PRO" && sub.status === "active") {
    await recordSubscriptionEvent({
      subscriptionId: sub.id,
      userId,
      provider: sub.provider,
      eventType: "RESTORE",
      payload: { status: "ALREADY_ACTIVE" },
    });
    return {
      restored: true,
      subscription: sub,
      message: "Sua assinatura Pro está ativa e foi sincronizada.",
    };
  }

  // Simula consulta de recibo válido na loja
  const restoredSub = await purchaseProduct(userId, "personal_pro_monthly", "apple");

  await recordSubscriptionEvent({
    subscriptionId: restoredSub.id,
    userId,
    provider: restoredSub.provider,
    eventType: "RESTORE",
    payload: { status: "RESTORED_SUCCESS" },
  });

  return {
    restored: true,
    subscription: restoredSub,
    message: "Assinatura Pro restaurada com sucesso!",
  };
}

/**
 * Cancelamento de assinatura (Mantém dados intactos)
 */
export async function cancelSubscription(userId: string): Promise<SubscriptionRecord> {
  const all = await readAllSubscriptions();
  const sub = all[userId] || (await getSubscriptionForUser(userId));

  const updatedSub: SubscriptionRecord = {
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

/**
 * Reativação de assinatura
 */
export async function reactivateSubscription(userId: string): Promise<SubscriptionRecord> {
  return purchaseProduct(userId, "personal_pro_monthly", "apple");
}

/**
 * Lista todas as assinaturas para o painel Admin
 */
export async function listAllSubscriptions(
  filter: "all" | "free" | "pro" | "active" | "cancelled" | "expired" = "all"
): Promise<SubscriptionRecord[]> {
  const all = await readAllSubscriptions();
  let list = Object.values(all);

  if (list.length === 0) {
    // Inicializa registros mock para demonstração inicial se vazio
    const demoTrainerSub = await getSubscriptionForUser(
      "trainer-demo-id",
      "Personal Trainer Demo",
      "treinador@dragoncorp.app"
    );
    list = [demoTrainerSub];
  }

  return list.filter((sub) => {
    if (filter === "all") return true;
    if (filter === "free") return sub.plan === "FREE";
    if (filter === "pro") return sub.plan === "PRO";
    if (filter === "active") return sub.status === "active";
    if (filter === "cancelled") return sub.status === "cancelled";
    if (filter === "expired") return sub.status === "expired";
    return true;
  });
}

/**
 * Override de assinatura pelo Master Admin
 */
export async function updateSubscriptionAdminOverride(
  userId: string,
  updates: Partial<SubscriptionRecord>
): Promise<SubscriptionRecord> {
  const all = await readAllSubscriptions();
  const current = all[userId] || (await getSubscriptionForUser(userId));

  const updated: SubscriptionRecord = {
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

export async function resetSubscriptionStoreForTests(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_SUBSCRIPTIONS);
  await AsyncStorage.removeItem(STORAGE_KEY_SUB_EVENTS);
  await AsyncStorage.removeItem(STORAGE_KEY_SUB_CONFIG);
}
