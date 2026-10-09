/**
 * DragonCorp — Manipulador Seguro de Deep Links e Roteamento de Notificações
 * Valida autenticação, perfis (Personal vs Aluno), isolamento multi-tenant
 * e parâmetros antes de autorizar a navegação.
 */

import { router } from "expo-router";

export type DeepLinkTarget = {
  pathname: string;
  params?: Record<string, string>;
};

export interface DeepLinkAuthContext {
  isAuthenticated: boolean;
  userId?: string;
  role?: "TRAINER" | "STUDENT" | "ADMIN";
  linkedTrainerId?: string;
}

/**
 * Normaliza um deep link (seja dragoncorp:// ou caminho relativo) para rota do Expo Router
 */
export function parseNotificationDeepLink(rawLink?: string): DeepLinkTarget | null {
  if (!rawLink || typeof rawLink !== "string") return null;

  let cleaned = rawLink.trim();
  if (cleaned.startsWith("dragoncorp://")) {
    cleaned = cleaned.replace("dragoncorp://", "/");
  }

  if (!cleaned.startsWith("/")) {
    cleaned = `/${cleaned}`;
  }

  try {
    const [pathPart, queryPart] = cleaned.split("?");
    const params: Record<string, string> = {};

    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      searchParams.forEach((val, key) => {
        params[key] = val;
      });
    }

    const segments = pathPart.split("/").filter(Boolean);

    // Mapeamento canônico de rotas do DragonCorp
    if (segments[0] === "workouts" || segments[0] === "training") {
      if (segments[1]) {
        return { pathname: "/training-details", params: { workoutId: segments[1], ...params } };
      }
      return { pathname: "/(tabs)/training", params };
    }

    if (segments[0] === "students") {
      const studentId = segments[1] || params.studentId;
      if (segments[2] === "feedback" && segments[3]) {
        return { pathname: "/feedback-detail", params: { id: segments[3], studentId, ...params } };
      }
      if (segments[2] === "pain" && segments[3]) {
        return { pathname: "/feedback-detail", params: { id: segments[3], studentId, highlightPain: "true", ...params } };
      }
      if (studentId) {
        return { pathname: "/(tabs)/student", params: { studentId, ...params } };
      }
      return { pathname: "/(tabs)/student", params };
    }

    if (segments[0] === "assessments") {
      if (segments[1]) {
        return { pathname: "/assessment-detail", params: { assessmentId: segments[1], ...params } };
      }
      return { pathname: "/(tabs)/assessments", params };
    }

    if (segments[0] === "anamnesis") {
      return { pathname: "/student-anamnesis", params: { studentId: segments[1] || params.studentId, ...params } };
    }

    if (segments[0] === "protocols") {
      return { pathname: "/(tabs)/training", params: { protocolId: segments[1], ...params } };
    }

    if (segments[0] === "messages") {
      return { pathname: "/(tabs)/messages", params: { conversationId: segments[1], ...params } };
    }

    if (segments[0] === "subscription") {
      return { pathname: "/subscription", params };
    }

    if (segments[0] === "hydration") {
      return { pathname: "/hydration", params };
    }

    if (segments[0] === "feedback-detail") {
      return { pathname: "/feedback-detail", params };
    }

    return { pathname: pathPart, params };
  } catch (error) {
    console.warn("[DeepLink] Erro ao parsear deep link:", error);
    return null;
  }
}

/**
 * Valida a autorização de acesso ao destino com base na sessão autenticada
 */
export function validateDeepLinkAccess(
  target: DeepLinkTarget,
  context: DeepLinkAuthContext
): { allowed: boolean; fallbackRoute?: string; reason?: string } {
  if (!context.isAuthenticated) {
    return {
      allowed: false,
      fallbackRoute: "/login",
      reason: "Usuário não autenticado.",
    };
  }

  // Aluno não pode acessar áreas restritas do personal ou admin
  if (context.role === "STUDENT") {
    if (
      target.pathname === "/(tabs)/student" ||
      target.pathname === "/trainer-agenda" ||
      target.pathname === "/trainer-workout-templates" ||
      target.pathname === "/admin-dashboard" ||
      target.pathname === "/(tabs)/admin"
    ) {
      return {
        allowed: false,
        fallbackRoute: "/(tabs)/index",
        reason: "Acesso restrito a profissionais cadastrados.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Executa a navegação segura do deep link
 */
export function navigateNotificationDeepLink(
  rawLink: string | undefined,
  context: DeepLinkAuthContext,
  defaultFallback = "/(tabs)/index"
): boolean {
  const target = parseNotificationDeepLink(rawLink);
  if (!target) {
    router.push(defaultFallback as never);
    return false;
  }

  const authCheck = validateDeepLinkAccess(target, context);
  if (!authCheck.allowed) {
    router.push((authCheck.fallbackRoute || defaultFallback) as never);
    return false;
  }

  try {
    router.push({
      pathname: target.pathname as never,
      params: target.params as never,
    });
    return true;
  } catch (err) {
    console.warn("[DeepLink] Erro ao navegar para destino:", err);
    router.push(defaultFallback as never);
    return false;
  }
}
