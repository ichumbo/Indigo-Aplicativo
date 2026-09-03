/**
 * Configuração Centralizada de Assinaturas e Produtos DragonCorp
 * Compatível com Apple App Store (StoreKit) e Google Play Billing
 */

export type AppEnvironment = "development" | "homologation" | "production";

export type StorePlatform = "apple" | "google" | "admin" | "free";

export type SubscriptionStatus =
  | "free"
  | "active"
  | "trial"
  | "renewed"
  | "grace_period"
  | "past_due"
  | "cancelled"
  | "expired"
  | "pending"
  | "rejected"
  | "refunded"
  | "revoked";

export interface StoreProductDefinition {
  id: string;
  appleProductId: string;
  googleProductId: string;
  aliases: string[];
  plan: "PRO";
  billingPeriod: "monthly" | "annual";
  referencePrice: number;
  currency: string;
  localizedPrice: string;
  title: string;
  description: string;
  trialDays: number;
}

export interface StoreBillingError {
  code:
    | "USER_CANCELLED"
    | "PRODUCT_NOT_FOUND"
    | "NETWORK_ERROR"
    | "PAYMENT_PENDING"
    | "STORE_UNAVAILABLE"
    | "VALIDATION_FAILED"
    | "EXPIRED"
    | "ALREADY_OWNED"
    | "RESTORE_EMPTY"
    | "UNKNOWN_ERROR";
  message: string;
  userMessage: string;
}

/**
 * Catálogo Canônico de Produtos DragonCorp
 * Nunca espalhar IDs hardcoded pelas telas
 */
export const OFFICIAL_STORE_PRODUCTS: Record<"monthly" | "annual", StoreProductDefinition> = {
  monthly: {
    id: "personal_pro_monthly",
    appleProductId: "com.dragoncorp.pro.monthly",
    googleProductId: "dragoncorp_pro_monthly",
    aliases: ["personal_pro_monthly", "com.dragoncorp.pro.monthly", "dragoncorp_pro_monthly"],
    plan: "PRO",
    billingPeriod: "monthly",
    referencePrice: 49.9,
    currency: "BRL",
    localizedPrice: "R$ 49,90/mês",
    title: "Plano Pro Mensal",
    description: "Acesso ilimitado a alunos, prescrição de treinos, avaliações físicas e IA.",
    trialDays: 7,
  },
  annual: {
    id: "personal_pro_annual",
    appleProductId: "com.dragoncorp.pro.annual",
    googleProductId: "dragoncorp_pro_annual",
    aliases: ["personal_pro_annual", "com.dragoncorp.pro.annual", "dragoncorp_pro_annual"],
    plan: "PRO",
    billingPeriod: "annual",
    referencePrice: 479.0,
    currency: "BRL",
    localizedPrice: "R$ 479,00/ano",
    title: "Plano Pro Anual (20% OFF)",
    description: "Acesso ilimitado o ano inteiro com desconto especial. Economize mais de 2 meses!",
    trialDays: 7,
  },
};

/**
 * Resolve o identificador do produto de acordo com a plataforma
 */
export function resolveStoreProductId(
  productIdOrAlias: string,
  platform: "apple" | "google"
): string {
  const clean = productIdOrAlias.trim().toLowerCase();

  if (clean.includes("annual") || clean.includes("anual")) {
    return platform === "apple"
      ? OFFICIAL_STORE_PRODUCTS.annual.appleProductId
      : OFFICIAL_STORE_PRODUCTS.annual.googleProductId;
  }

  return platform === "apple"
    ? OFFICIAL_STORE_PRODUCTS.monthly.appleProductId
    : OFFICIAL_STORE_PRODUCTS.monthly.googleProductId;
}

/**
 * Determina se o status concede acesso efetivo aos recursos Premium
 */
export function isSubscriptionStatusActive(status: SubscriptionStatus): boolean {
  return (
    status === "active" ||
    status === "trial" ||
    status === "renewed" ||
    status === "grace_period"
  );
}

/**
 * Mapeamento profissional de erros das lojas oficiais para mensagens amigáveis
 */
export function mapStoreBillingError(
  code: StoreBillingError["code"] | string,
  rawError?: unknown
): StoreBillingError {
  const details = rawError instanceof Error ? rawError.message : String(rawError || "");

  switch (code) {
    case "USER_CANCELLED":
    case "E_USER_CANCELLED":
      return {
        code: "USER_CANCELLED",
        message: "O usuário cancelou a transação na loja.",
        userMessage: "Compra cancelada.",
      };
    case "PRODUCT_NOT_FOUND":
      return {
        code: "PRODUCT_NOT_FOUND",
        message: "O produto solicitado não foi encontrado no catálogo da loja.",
        userMessage: "Não foi possível carregar o produto na loja. Tente novamente em instantes.",
      };
    case "NETWORK_ERROR":
      return {
        code: "NETWORK_ERROR",
        message: "Falha de conexão com os servidores da loja.",
        userMessage: "Falha de conexão com a App Store/Google Play. Verifique sua conexão com a internet.",
      };
    case "PAYMENT_PENDING":
      return {
        code: "PAYMENT_PENDING",
        message: "O pagamento está em análise pela instituição bancária.",
        userMessage: "Seu pagamento está pendente de processamento pela loja. O acesso Pro será ativado assim que for confirmado.",
      };
    case "STORE_UNAVAILABLE":
      return {
        code: "STORE_UNAVAILABLE",
        message: "Serviço de faturamento da loja temporariamente indisponível.",
        userMessage: "A loja de aplicativos está temporariamente indisponível. Tente novamente mais tarde.",
      };
    case "VALIDATION_FAILED":
      return {
        code: "VALIDATION_FAILED",
        message: "Falha na validação do recibo ou assinatura da transação.",
        userMessage: "Não foi possível validar o recibo da sua compra. Entre em contato com o suporte.",
      };
    case "ALREADY_OWNED":
      return {
        code: "ALREADY_OWNED",
        message: "A conta já possui esta assinatura ativa.",
        userMessage: "Esta assinatura já pertence à sua conta. Toque em 'Restaurar Compras' para sincronizar.",
      };
    case "RESTORE_EMPTY":
      return {
        code: "RESTORE_EMPTY",
        message: "Nenhuma compra anterior foi localizada para restaurar.",
        userMessage: "Não encontramos nenhuma compra ativa para restaurar nesta conta da loja.",
      };
    case "EXPIRED":
      return {
        code: "EXPIRED",
        message: "Assinatura expirada.",
        userMessage: "Sua assinatura anterior expirou. Escolha um plano para reativar seu acesso Pro.",
      };
    default:
      return {
        code: "UNKNOWN_ERROR",
        message: details || "Erro desconhecido no faturamento.",
        userMessage: "Não foi possível concluir sua assinatura. Tente novamente.",
      };
  }
}
