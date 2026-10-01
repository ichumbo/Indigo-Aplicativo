/**
 * Reservei / DragonCorp — Motor Central de Notificações Orientado a Eventos
 * Arquitetura Event-Driven, Fila/Outbox Transacional, Idempotência,
 * Resolução Multiempresa, Gestão de Tokens, Templates e Lembretes.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// =============================================================================
// 1. TIPOS DE EVENTOS DE DOMÍNIO E CANAIS
// =============================================================================

export type DomainEventType =
  // Agendamentos (Appointments)
  | "appointment.created"
  | "appointment.confirmed"
  | "appointment.rejected"
  | "appointment.awaiting_confirmation"
  | "appointment.rescheduled"
  | "appointment.reschedule_requested"
  | "appointment.cancelled"
  | "appointment.reminder_due"
  | "appointment.check_in_available"
  | "appointment.completed"
  | "appointment.no_show"
  | "appointment.waitlist_spot_available"
  | "appointment.waitlist_spot_expired"
  // Financeiro & Pagamentos (Payments)
  | "payment.requested"
  | "payment.pix_generated"
  | "payment.pix_expiring"
  | "payment.approved"
  | "payment.failed"
  | "payment.refunded"
  | "payment.daily_closure"
  // Assinatura do SaaS (Subscription)
  | "subscription.trial_expiring"
  | "subscription.activated"
  | "subscription.renewed"
  | "subscription.failed_to_renew"
  | "subscription.expiring_soon"
  | "subscription.expired"
  | "subscription.limit_reached"
  // Equipe & Permissões (Team & Access)
  | "team.invitation_created"
  | "team.invitation_accepted"
  | "team.permission_changed"
  | "team.member_removed"
  // Segurança da Conta (Security)
  | "security.new_login"
  | "security.password_changed"
  | "security.password_reset_requested"
  | "security.suspicious_activity"
  | "security.account_deletion_requested"
  // Operacional & Resumos
  | "operational.daily_agenda_summary"
  | "operational.weekly_agenda_summary"
  | "operational.system_alert";

export type DeliveryChannel = "in_app" | "push" | "email" | "web_push" | "sms" | "whatsapp";

export type DeliveryStatus =
  | "created"
  | "scheduled"
  | "queued"
  | "processing"
  | "sent"
  | "delivered"
  | "read"
  | "clicked"
  | "failed"
  | "retrying"
  | "cancelled"
  | "expired"
  | "suppressed";

export type UserRole =
  | "CLIENT"
  | "PROFESSIONAL"
  | "TEAM_MEMBER"
  | "MANAGER"
  | "ADMIN"
  | "SUPER_ADMIN";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationCategory =
  | "appointment"
  | "payment"
  | "subscription"
  | "team"
  | "security"
  | "operational"
  | "marketing";

// =============================================================================
// 2. INTERFACES DE DADOS
// =============================================================================

export interface DomainNotificationEvent {
  eventId: string;
  eventType: DomainEventType;
  tenantId: string;
  actorId?: string;
  recipientId: string;
  recipientRole: UserRole;
  resourceType: "appointment" | "payment" | "subscription" | "user" | "team" | "system";
  resourceId: string;
  occurredAt: string;
  scheduledFor?: string;
  timezone: string;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface NotificationRecord {
  id: string;
  tenantId: string;
  recipientId: string;
  recipientRole: UserRole;
  eventType: DomainEventType;
  category: NotificationCategory;
  title: string;
  body: string;
  icon?: string;
  priority: NotificationPriority;
  resourceType: string;
  resourceId: string;
  deepLink: string;
  createdAt: string;
  readAt?: string | null;
  read: boolean;
  archivedAt?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: DeliveryChannel;
  provider: "expo_push" | "apns" | "fcm" | "in_app_local" | "smtp" | "webhook";
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  nextRetryAt?: string | null;
}

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  tenantId: string;
  deviceInstallationId: string;
  platform: "ios" | "android" | "web";
  tokenType: "expo" | "apns" | "fcm" | "web_push";
  pushToken: string;
  environment: "development" | "production";
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  revokedAt?: string | null;
  isActive: boolean;
}

export interface UserNotificationPreferences {
  userId: string;
  tenantId: string;
  enablePush: boolean;
  enableInApp: boolean;
  enableEmail: boolean;
  enableWebPush: boolean;
  enableMarketing: boolean;
  enableDailySummary: boolean;
  dailySummaryTime: string; // "08:00"
  timezone: string;
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "07:00"
  };
  categories: {
    appointment: boolean;
    payment: boolean;
    subscription: boolean;
    team: boolean;
    security: boolean; // Sempre true por conformidade
    marketing: boolean;
    operational: boolean;
  };
}

export interface BusinessNotificationSettings {
  tenantId: string;
  reminders: {
    enabled: boolean;
    intervalsHours: number[]; // [24, 2]
    channels: DeliveryChannel[];
  };
  cancellations: {
    notifyClient: boolean;
    notifyProfessional: boolean;
    notifyManager: boolean;
  };
  reschedules: {
    notifyClient: boolean;
    notifyProfessional: boolean;
  };
  waitlist: {
    autoOfferNextInMinutes: number; // 30 minutos
  };
  dailySummary: {
    enabled: boolean;
    sendAt: string; // "07:30"
    targetRoles: UserRole[];
  };
  timezone: string;
}

// =============================================================================
// 3. STORAGE KEYS
// =============================================================================

const STORAGE_KEY_OUTBOX = "@dragoncorp/notification_outbox_v2";
const STORAGE_KEY_NOTIFS = "@dragoncorp/notifications_v2";
const STORAGE_KEY_DELIVERIES = "@dragoncorp/notification_deliveries_v2";
const STORAGE_KEY_TOKENS = "@dragoncorp/device_tokens_v2";
const STORAGE_KEY_USER_PREFS = "@dragoncorp/user_notification_prefs_v2";
const STORAGE_KEY_BUSINESS_SETTINGS = "@dragoncorp/business_notification_settings_v2";

// =============================================================================
// 4. TEMPLATES PADRÃO & RESOLVEDOR SEGURO DE VARIÁVEIS
// =============================================================================

export interface TemplateDefinition {
  titleTemplate: string;
  bodyTemplate: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  deepLinkPattern: string;
}

export const CANONICAL_TEMPLATES: Record<DomainEventType, TemplateDefinition> = {
  // Agendamentos
  "appointment.created": {
    titleTemplate: "Novo Agendamento Solicitado",
    bodyTemplate: "Agendamento para {{clientName}} com {{professionalName}} em {{appointmentDate}} às {{appointmentTime}} ({{serviceName}}).",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "/(tabs)/index?appointmentId={{appointmentId}}",
  },
  "appointment.confirmed": {
    titleTemplate: "Agendamento Confirmado! ✅",
    bodyTemplate: "Seu atendimento de {{serviceName}} com {{professionalName}} está confirmado para {{appointmentDate}} às {{appointmentTime}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?appointmentId={{appointmentId}}",
  },
  "appointment.rejected": {
    titleTemplate: "Agendamento Recusado",
    bodyTemplate: "O horário solicitado para {{appointmentDate}} às {{appointmentTime}} não pôde ser confirmado.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student",
  },
  "appointment.awaiting_confirmation": {
    titleTemplate: "Confirmação Pendente",
    bodyTemplate: "Por favor, confirme sua presença para o atendimento de {{serviceName}} amanhã às {{appointmentTime}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?appointmentId={{appointmentId}}",
  },
  "appointment.rescheduled": {
    titleTemplate: "Agendamento Reagendado 🗓️",
    bodyTemplate: "O atendimento de {{serviceName}} foi alterado para {{appointmentDate}} às {{appointmentTime}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "/(tabs)/index?appointmentId={{appointmentId}}",
  },
  "appointment.reschedule_requested": {
    titleTemplate: "Solicitação de Reagendamento",
    bodyTemplate: "{{clientName}} solicitou alteração do agendamento para nova data.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "/(tabs)/index?appointmentId={{appointmentId}}",
  },
  "appointment.cancelled": {
    titleTemplate: "Agendamento Cancelado",
    bodyTemplate: "O atendimento de {{serviceName}} agendado para {{appointmentDate}} às {{appointmentTime}} foi cancelado.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "/(tabs)/index",
  },
  "appointment.reminder_due": {
    titleTemplate: "Lembrete de Atendimento ⏰",
    bodyTemplate: "Faltam {{timeRemaining}} para o seu atendimento de {{serviceName}} com {{professionalName}} na unidade {{unitName}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?appointmentId={{appointmentId}}",
  },
  "appointment.check_in_available": {
    titleTemplate: "Check-in Disponível 📍",
    bodyTemplate: "Você já pode realizar o check-in para o seu atendimento na unidade {{unitName}}.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "/(tabs)/student?appointmentId={{appointmentId}}",
  },
  "appointment.completed": {
    titleTemplate: "Atendimento Concluído ✨",
    bodyTemplate: "Seu atendimento de {{serviceName}} foi finalizado. Como foi sua experiência?",
    category: "appointment",
    priority: "low",
    deepLinkPattern: "/feedback-detail?appointmentId={{appointmentId}}",
  },
  "appointment.no_show": {
    titleTemplate: "Ausência Registrada (No-Show)",
    bodyTemplate: "O cliente {{clientName}} não compareceu ao atendimento de {{appointmentTime}}.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "/(tabs)/index?appointmentId={{appointmentId}}",
  },
  "appointment.waitlist_spot_available": {
    titleTemplate: "Vaga Liberada na Lista de Espera! 🎉",
    bodyTemplate: "Um horário foi liberado para {{serviceName}} em {{appointmentDate}} às {{appointmentTime}}. Toque para confirmar em até {{deadlineMinutes}} min.",
    category: "appointment",
    priority: "urgent",
    deepLinkPattern: "/(tabs)/student?waitlistSpotId={{resourceId}}",
  },
  "appointment.waitlist_spot_expired": {
    titleTemplate: "Vaga Expirada",
    bodyTemplate: "O prazo para confirmar o horário da lista de espera expirou e foi oferecido ao próximo cliente.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "/(tabs)/student",
  },

  // Financeiro
  "payment.requested": {
    titleTemplate: "Pagamento Solicitado",
    bodyTemplate: "Cobrança de {{formattedAmount}} disponível para o serviço {{serviceName}}.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?paymentId={{paymentId}}",
  },
  "payment.pix_generated": {
    titleTemplate: "Código PIX Gerado 💠",
    bodyTemplate: "Copie a chave PIX de {{formattedAmount}} para concluir seu agendamento.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?paymentId={{paymentId}}",
  },
  "payment.pix_expiring": {
    titleTemplate: "Chave PIX Próxima de Expirar ⏳",
    bodyTemplate: "Sua chave PIX expira em 10 minutos. Conclua o pagamento para garantir o horário.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?paymentId={{paymentId}}",
  },
  "payment.approved": {
    titleTemplate: "Pagamento Confirmado! 💳",
    bodyTemplate: "O pagamento de {{formattedAmount}} foi aprovado com sucesso.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?paymentId={{paymentId}}",
  },
  "payment.failed": {
    titleTemplate: "Falha no Pagamento",
    bodyTemplate: "Não foi possível processar o pagamento de {{formattedAmount}}. Verifique seu meio de pagamento.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "/(tabs)/student?paymentId={{paymentId}}",
  },
  "payment.refunded": {
    titleTemplate: "Estorno Realizado",
    bodyTemplate: "O reembolso de {{formattedAmount}} foi efetuado com sucesso.",
    category: "payment",
    priority: "normal",
    deepLinkPattern: "/(tabs)/student",
  },
  "payment.daily_closure": {
    titleTemplate: "Fechamento Financeiro Diário 📊",
    bodyTemplate: "Total recebido hoje: {{formattedAmount}} em {{transactionCount}} atendimentos.",
    category: "payment",
    priority: "normal",
    deepLinkPattern: "/admin-dashboard",
  },

  // Assinatura do SaaS
  "subscription.trial_expiring": {
    titleTemplate: "Período de Teste Encerrando ⏳",
    bodyTemplate: "Seu teste PRO encerra em {{daysRemaining}} dias. Mantenha seus recursos ativos!",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "/subscription",
  },
  "subscription.activated": {
    titleTemplate: "Plano PRO Ativado! 🚀",
    bodyTemplate: "Parabéns! Você tem acesso ilimitado a todos os recursos profissionais da plataforma.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "/subscription",
  },
  "subscription.renewed": {
    titleTemplate: "Assinatura Renovada",
    bodyTemplate: "Sua assinatura PRO foi renovada com sucesso até {{nextBillingDate}}.",
    category: "subscription",
    priority: "normal",
    deepLinkPattern: "/subscription",
  },
  "subscription.failed_to_renew": {
    titleTemplate: "Aviso de Cobrança da Assinatura",
    bodyTemplate: "A loja não conseguiu renovar sua assinatura. Atualize seu meio de pagamento para evitar suspensão.",
    category: "subscription",
    priority: "urgent",
    deepLinkPattern: "/subscription",
  },
  "subscription.expiring_soon": {
    titleTemplate: "Assinatura Vencendo",
    bodyTemplate: "Sua assinatura expira em breve. Renove para continuar gerenciando sua carteira completa.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "/subscription",
  },
  "subscription.expired": {
    titleTemplate: "Assinatura Expirada",
    bodyTemplate: "Sua assinatura expirou. Escolha um plano para reativar seu acesso PRO.",
    category: "subscription",
    priority: "urgent",
    deepLinkPattern: "/subscription",
  },
  "subscription.limit_reached": {
    titleTemplate: "Limite de Alunos Atingido",
    bodyTemplate: "Você atingiu o limite de 1 aluno do plano Gratuito. Faça upgrade para PRO e libere alunos ilimitados.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "/subscription",
  },

  // Equipe
  "team.invitation_created": {
    titleTemplate: "Convite para Equipe 👥",
    bodyTemplate: "Você foi convidado para ingressar na equipe de {{businessName}} como {{roleName}}.",
    category: "team",
    priority: "high",
    deepLinkPattern: "/account-profile",
  },
  "team.invitation_accepted": {
    titleTemplate: "Convite Aceito",
    bodyTemplate: "{{memberName}} aceitou o convite e agora faz parte da sua equipe.",
    category: "team",
    priority: "normal",
    deepLinkPattern: "/account-profile",
  },
  "team.permission_changed": {
    titleTemplate: "Permissões de Acesso Alteradas",
    bodyTemplate: "Suas permissões de acesso na empresa {{businessName}} foram atualizadas.",
    category: "team",
    priority: "high",
    deepLinkPattern: "/account-profile",
  },
  "team.member_removed": {
    titleTemplate: "Membro Removido da Equipe",
    bodyTemplate: "O vínculo profissional com a empresa foi encerrado.",
    category: "team",
    priority: "normal",
    deepLinkPattern: "/account-profile",
  },

  // Segurança
  "security.new_login": {
    titleTemplate: "Novo Acesso Detectado 🔐",
    bodyTemplate: "Novo login realizado em {{deviceName}} ({{location}}). Se não foi você, altere sua senha imediatamente.",
    category: "security",
    priority: "urgent",
    deepLinkPattern: "/account-profile",
  },
  "security.password_changed": {
    titleTemplate: "Senha Alterada com Sucesso",
    bodyTemplate: "A senha da sua conta foi redefinida recentemente.",
    category: "security",
    priority: "high",
    deepLinkPattern: "/account-profile",
  },
  "security.password_reset_requested": {
    titleTemplate: "Recuperação de Senha Solicitada",
    bodyTemplate: "Uma solicitação de recuperação de senha foi iniciada para o seu e-mail.",
    category: "security",
    priority: "high",
    deepLinkPattern: "/reset-password",
  },
  "security.suspicious_activity": {
    titleTemplate: "Alerta de Atividade Suspeita",
    bodyTemplate: "Detectamos múltiplas tentativas de autenticação inválidas na sua conta.",
    category: "security",
    priority: "urgent",
    deepLinkPattern: "/account-profile",
  },
  "security.account_deletion_requested": {
    titleTemplate: "Exclusão de Conta em Processamento",
    bodyTemplate: "Sua solicitação de exclusão definitiva de conta foi recebida e está sendo processada.",
    category: "security",
    priority: "urgent",
    deepLinkPattern: "/delete-account",
  },

  // Operacional
  "operational.daily_agenda_summary": {
    titleTemplate: "Resumo da sua Agenda de Hoje 📋",
    bodyTemplate: "Você tem {{totalAppointments}} atendimentos agendados para hoje. Primeiro às {{firstAppointmentTime}}.",
    category: "operational",
    priority: "normal",
    deepLinkPattern: "/(tabs)/index",
  },
  "operational.weekly_agenda_summary": {
    titleTemplate: "Resumo Semanal da Consultoria 📊",
    bodyTemplate: "Esta semana você possui {{totalAppointments}} atendimentos e avaliações agendados.",
    category: "operational",
    priority: "normal",
    deepLinkPattern: "/(tabs)/index",
  },
  "operational.system_alert": {
    titleTemplate: "Aviso do Sistema",
    bodyTemplate: "{{message}}",
    category: "operational",
    priority: "normal",
    deepLinkPattern: "/notifications",
  },
};

/**
 * Interpola variáveis de forma segura sem permitir injeção de tags HTML/executáveis
 */
export function renderTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) return "";
    return String(val)
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  });
}

// =============================================================================
// 5. DETERMINAÇÃO DE IDEMPOTÊNCIA E DEDUPLICAÇÃO
// =============================================================================

/**
 * Gera uma chave idempotente determinística para evitar duplicidade de notificações
 */
export function generateDeterministicIdempotencyKey(
  eventType: DomainEventType,
  resourceId: string,
  recipientId: string,
  discriminator?: string
): string {
  const parts = [eventType, resourceId, recipientId];
  if (discriminator) {
    parts.push(discriminator);
  }
  return parts.join(":");
}

// =============================================================================
// 6. VALIDAÇÃO DE HORÁRIO SILENCIOSO & FUSO HORÁRIO
// =============================================================================

/**
 * Verifica se o momento atual está dentro do horário silencioso configurado pelo usuário
 */
export function isInQuietHours(
  now: Date,
  quietHours: { enabled: boolean; start: string; end: string }
): boolean {
  if (!quietHours?.enabled) return false;

  const [startH, startM] = quietHours.start.split(":").map(Number);
  const [endH, endM] = quietHours.end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

  if (startMinutes > endMinutes) {
    // Ex: 22:00 até 07:00 (cruza a meia-noite)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Ex: 01:00 até 06:00 (mesmo dia)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

// =============================================================================
// 7. MOTOR PRINCIPAL DE DISPARO & OUTBOX
// =============================================================================

export class NotificationEventEngine {
  /**
   * Processa um evento de domínio de forma atômica, segura e idempotente
   */
  static async publishDomainEvent(event: DomainNotificationEvent): Promise<{
    processed: boolean;
    notification?: NotificationRecord;
    suppressedReason?: string;
  }> {
    // 1. Validação de Tenant e Destinatário
    if (!event.tenantId || !event.recipientId || !event.eventType) {
      return { processed: false, suppressedReason: "Dados obrigatórios de evento ausentes." };
    }

    // 2. Proteção de Segurança e RBAC para Dados Financeiros
    if (
      event.eventType.startsWith("payment.daily_closure") &&
      event.recipientRole !== "ADMIN" &&
      event.recipientRole !== "MANAGER" &&
      event.recipientRole !== "SUPER_ADMIN"
    ) {
      return {
        processed: false,
        suppressedReason: "Acesso negado: dados financeiros restritos a gestores/administradores.",
      };
    }

    // 3. Verificação de Deduplicação e Idempotência
    const idempotencyKey =
      event.idempotencyKey ||
      generateDeterministicIdempotencyKey(
        event.eventType,
        event.resourceId,
        event.recipientId
      );

    const existingNotifs = await this.listStoredNotifications();
    const isDuplicate = existingNotifs.some(
      (n) => n.idempotencyKey === idempotencyKey && n.tenantId === event.tenantId
    );

    if (isDuplicate) {
      return { processed: false, suppressedReason: "Evento já processado anteriormente (Idempotency Hit)." };
    }

    // 4. Carrega Preferências do Usuário
    const userPrefs = await this.getUserPreferences(event.recipientId, event.tenantId);

    // 5. Resolve Template
    const templateDef = CANONICAL_TEMPLATES[event.eventType];
    if (!templateDef) {
      return { processed: false, suppressedReason: `Template não cadastrado para ${event.eventType}` };
    }

    // 6. Verifica Opt-out de Marketing e Categorias
    if (templateDef.category === "marketing" && !userPrefs.enableMarketing) {
      return { processed: false, suppressedReason: "Usuário optou por não receber notificações de marketing." };
    }

    // 7. Renderiza Mensagens
    const title = renderTemplate(templateDef.titleTemplate, event.metadata || {});
    const body = renderTemplate(templateDef.bodyTemplate, event.metadata || {});
    const deepLink = renderTemplate(templateDef.deepLinkPattern, {
      ...event.metadata,
      appointmentId: event.resourceId,
      paymentId: event.resourceId,
      resourceId: event.resourceId,
    });

    const nowIso = new Date().toISOString();
    const notification: NotificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      tenantId: event.tenantId,
      recipientId: event.recipientId,
      recipientRole: event.recipientRole,
      eventType: event.eventType,
      category: templateDef.category,
      title,
      body,
      priority: templateDef.priority,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      deepLink,
      createdAt: nowIso,
      read: false,
      metadata: event.metadata,
      idempotencyKey,
    };

    // 8. Persiste Notificação na Central In-App
    await this.saveNotification(notification);

    // 9. Enfileira Entregas de Canais (Push, In-App, Email) no Outbox
    await this.enqueueDeliveries(notification, event, userPrefs);

    return { processed: true, notification };
  }

  /**
   * Enfileira entregas para os canais autorizados
   */
  private static async enqueueDeliveries(
    notification: NotificationRecord,
    event: DomainNotificationEvent,
    userPrefs: UserNotificationPreferences
  ): Promise<void> {
    const deliveries: NotificationDelivery[] = [];
    const scheduledAt = event.scheduledFor || notification.createdAt;

    // Canal In-App (sempre ativo para histórico)
    deliveries.push({
      id: `del_inapp_${Date.now()}`,
      notificationId: notification.id,
      channel: "in_app",
      provider: "in_app_local",
      status: "delivered",
      attempts: 1,
      maxAttempts: 1,
      scheduledAt,
      deliveredAt: new Date().toISOString(),
    });

    // Canal Push Notification (se permitido nas preferências e não for suprimido)
    if (userPrefs.enablePush && userPrefs.categories[notification.category] !== false) {
      const isUrgentOrSecurity =
        notification.priority === "urgent" || notification.category === "security";
      const quiet = isInQuietHours(new Date(), userPrefs.quietHours);

      // Se estiver em horário silencioso e não for alerta urgente/segurança, adia ou suprime
      const status: DeliveryStatus = quiet && !isUrgentOrSecurity ? "suppressed" : "queued";

      deliveries.push({
        id: `del_push_${Date.now()}`,
        notificationId: notification.id,
        channel: "push",
        provider: "expo_push",
        status,
        attempts: status === "queued" ? 0 : 1,
        maxAttempts: 3,
        scheduledAt,
      });
    }

    await this.saveDeliveries(deliveries);
  }

  // ===========================================================================
  // 8. CANCELAMENTO DE LEMBRETES OBSOLETOS (REAGENDAMENTO E CANCELAMENTO)
  // ===========================================================================

  /**
   * Cancela todos os lembretes pendentes de um agendamento específico
   */
  static async cancelPendingRemindersForAppointment(
    tenantId: string,
    appointmentId: string
  ): Promise<number> {
    const notifs = await this.listStoredNotifications();
    const deliveries = await this.listStoredDeliveries();

    let cancelledCount = 0;
    const appointmentReminderPrefix = `appointment.reminder_due:${appointmentId}:`;

    // Atualiza entregas pendentes para 'cancelled'
    const updatedDeliveries = deliveries.map((del) => {
      const matchNotif = notifs.find(
        (n) =>
          n.id === del.notificationId &&
          n.tenantId === tenantId &&
          (n.resourceId === appointmentId || n.idempotencyKey.startsWith(appointmentReminderPrefix))
      );

      if (matchNotif && (del.status === "queued" || del.status === "scheduled")) {
        cancelledCount++;
        return {
          ...del,
          status: "cancelled" as DeliveryStatus,
          errorMessage: "Lembrete cancelado devido a alteração/cancelamento do agendamento original.",
        };
      }
      return del;
    });

    if (cancelledCount > 0) {
      await AsyncStorage.setItem(STORAGE_KEY_DELIVERIES, JSON.stringify(updatedDeliveries));
    }

    return cancelledCount;
  }

  // ===========================================================================
  // 9. GERENCIAMENTO DE TOKENS DE DISPOSITIVO
  // ===========================================================================

  /**
   * Registra ou atualiza o token de push do dispositivo vinculado ao usuário e tenant
   */
  static async registerDeviceToken(input: {
    userId: string;
    tenantId: string;
    deviceInstallationId: string;
    platform: "ios" | "android" | "web";
    pushToken: string;
    environment?: "development" | "production";
    appVersion?: string;
  }): Promise<DeviceTokenRecord> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_TOKENS);
    const tokens: DeviceTokenRecord[] = raw ? JSON.parse(raw) : [];

    const now = new Date().toISOString();
    const existingIndex = tokens.findIndex(
      (t) => t.deviceInstallationId === input.deviceInstallationId
    );

    const record: DeviceTokenRecord = {
      id: existingIndex >= 0 ? tokens[existingIndex]!.id : `tok_${Date.now()}`,
      userId: input.userId,
      tenantId: input.tenantId,
      deviceInstallationId: input.deviceInstallationId,
      platform: input.platform,
      tokenType: input.pushToken.includes("ExponentPushToken") ? "expo" : input.platform === "ios" ? "apns" : "fcm",
      pushToken: input.pushToken,
      environment: input.environment || "production",
      appVersion: input.appVersion || "1.0.0",
      createdAt: existingIndex >= 0 ? tokens[existingIndex]!.createdAt : now,
      updatedAt: now,
      lastActiveAt: now,
      isActive: true,
    };

    if (existingIndex >= 0) {
      tokens[existingIndex] = record;
    } else {
      tokens.push(record);
    }

    await AsyncStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
    return record;
  }

  /**
   * Revoga e remove o vínculo do token no logout do usuário
   */
  static async revokeDeviceTokenOnLogout(deviceInstallationId: string): Promise<boolean> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_TOKENS);
    if (!raw) return false;

    const tokens: DeviceTokenRecord[] = JSON.parse(raw);
    const updated = tokens.map((t) =>
      t.deviceInstallationId === deviceInstallationId
        ? { ...t, isActive: false, revokedAt: new Date().toISOString() }
        : t
    );

    await AsyncStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(updated));
    return true;
  }

  // ===========================================================================
  // 10. PREFERÊNCIAS DO USUÁRIO
  // ===========================================================================

  static async getUserPreferences(
    userId: string,
    tenantId: string
  ): Promise<UserNotificationPreferences> {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_USER_PREFS}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }

    return {
      userId,
      tenantId,
      enablePush: true,
      enableInApp: true,
      enableEmail: true,
      enableWebPush: true,
      enableMarketing: false,
      enableDailySummary: true,
      dailySummaryTime: "08:00",
      timezone: "America/Sao_Paulo",
      quietHours: {
        enabled: true,
        start: "22:00",
        end: "07:00",
      },
      categories: {
        appointment: true,
        payment: true,
        subscription: true,
        team: true,
        security: true,
        marketing: false,
        operational: true,
      },
    };
  }

  static async saveUserPreferences(
    prefs: UserNotificationPreferences
  ): Promise<UserNotificationPreferences> {
    // Segurança: a categoria de segurança é obrigatória e não pode ser desativada
    prefs.categories.security = true;
    await AsyncStorage.setItem(
      `${STORAGE_KEY_USER_PREFS}_${prefs.userId}`,
      JSON.stringify(prefs)
    );
    return prefs;
  }

  // ===========================================================================
  // 11. MÉTODOS DE PERSISTÊNCIA AUXILIARES
  // ===========================================================================

  static async listStoredNotifications(): Promise<NotificationRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_NOTIFS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static async saveNotification(notification: NotificationRecord): Promise<void> {
    const list = await this.listStoredNotifications();
    list.unshift(notification);
    // Limite de segurança de 200 notificações no storage local
    const trimmed = list.slice(0, 200);
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(trimmed));
  }

  static async listStoredDeliveries(): Promise<NotificationDelivery[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_DELIVERIES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static async saveDeliveries(newDeliveries: NotificationDelivery[]): Promise<void> {
    const list = await this.listStoredDeliveries();
    list.push(...newDeliveries);
    await AsyncStorage.setItem(STORAGE_KEY_DELIVERIES, JSON.stringify(list));
  }
}
