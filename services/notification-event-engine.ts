/**
 * DragonCorp — Motor Central de Notificações Orientado a Eventos
 * Arquitetura Event-Driven, Fila/Outbox Transacional, Idempotência,
 * Resolução Multi-Tenant, Gestão de Push Devices, Sanitização e Acessibilidade.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// =============================================================================
// 1. TIPOS DE EVENTOS DE DOMÍNIO E CANAIS
// =============================================================================

export type DomainEventType =
  // Treinos (Workouts) - Aluno e Personal
  | "workout.assigned"
  | "workout.updated"
  | "workout.substituted"
  | "workout.expiring"
  | "workout.expired"
  | "workout.today"
  | "workout.reminder"
  | "workout.unfinished"
  | "workout.feedback_added"
  | "workout.adapted"
  | "workout.completed"
  | "workout.abandoned"
  | "workout.no_execution_period"
  | "workout.substitution_requested"
  | "workout.series_inconsistency"

  // Avaliações e Reavaliações (Assessments)
  | "assessment.scheduled"
  | "assessment.reminder"
  | "assessment.due"
  | "reassessment.available"
  | "reassessment.week"
  | "assessment.expired"
  | "assessment.completed"
  | "assessment.report_ready"
  | "assessment.photos_available"
  | "assessment.week_summary"
  | "assessment.student_ready"
  | "assessment.photos_received"
  | "assessment.incomplete"
  | "assessment.awaiting_report"

  // Anamnese (Anamnesis)
  | "anamnesis.requested"
  | "anamnesis.reminder"
  | "anamnesis.revision_needed"
  | "anamnesis.received"
  | "anamnesis.new_version"
  | "anamnesis.attention_needed"
  | "anamnesis.health_update"

  // Protocolos Aeróbios & de Força
  | "protocol.created"
  | "protocol.updated"
  | "protocol.review_due"
  | "protocol.fortnight_completed"
  | "protocol.pending_sessions"
  | "protocol.new_ready"

  // Check-in de Prontidão & Cuidados
  | "checkin.available"
  | "checkin.reminder"
  | "checkin.trainer_replied"
  | "checkin.adapted"
  | "checkin.care_alert"
  | "checkin.pending_before_workout"
  | "checkin.low_energy"
  | "checkin.poor_sleep"
  | "checkin.high_fatigue"
  | "checkin.pain_flagged"
  | "checkin.unfavorable_sequence"

  // Relatos de Dor (Pain Reports)
  | "pain_report.created"
  | "pain_report.high_priority"
  | "pain_report.trainer_replied"
  | "pain_report.care_orientation"
  | "pain_report.unanswered"
  | "pain_report.continuous_pain"

  // Feedbacks
  | "feedback.created"
  | "feedback.answered"
  | "feedback.low_rating"
  | "feedback.high_effort"
  | "feedback.exercise_difficulty"
  | "feedback.resolved"

  // Agenda e Atendimentos / Consultorias
  | "appointment.created"
  | "appointment.scheduled"
  | "appointment.reminder"
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
  | "consultancy.expiring"
  | "consultancy.renewed"
  | "consultancy.expired"
  | "consultancy.renewal_pending"

  // Mensagens e Chat
  | "message.created"
  | "message.reply"
  | "message.urgent"
  | "message.attachment"
  | "message.waiting_reply"

  // Evolução e Engajamento
  | "achievement.unlocked"
  | "achievement.pr_confirmed"
  | "achievement.streak"
  | "engagement.low_frequency"
  | "engagement.welcome_back"

  // Hidratação (Estritamente Opt-in!)
  | "hydration.reminder"
  | "hydration.goal_reached"

  // Alunos (Visão do Personal)
  | "student.linked"
  | "student.link_requested"
  | "student.awaiting_approval"
  | "student.inactive"
  | "student.low_frequency"
  | "student.without_workout"
  | "student.consultancy_expiring"

  // Financeiro & Assinaturas SaaS (IAP StoreKit & Google Play)
  | "payment.requested"
  | "payment.pix_generated"
  | "payment.pix_expiring"
  | "payment.approved"
  | "payment.failed"
  | "payment.refunded"
  | "payment.daily_closure"
  | "subscription.started"
  | "subscription.validated"
  | "subscription.plan_changed"
  | "subscription.trial_expiring"
  | "subscription.activated"
  | "subscription.renewed"
  | "subscription.failed_to_renew"
  | "subscription.renewal_failed"
  | "subscription.payment_pending"
  | "subscription.cancelled"
  | "subscription.expiring_soon"
  | "subscription.expired"
  | "subscription.grace_period"
  | "subscription.restore_completed"
  | "subscription.limit_near"
  | "subscription.limit_reached"

  // Equipe & Segurança
  | "team.invitation_created"
  | "team.invitation_accepted"
  | "team.permission_changed"
  | "team.member_removed"
  | "security.new_login"
  | "security.password_changed"
  | "security.password_reset_requested"
  | "security.suspicious_activity"
  | "security.account_deletion_requested"
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
  | "STUDENT"
  | "TRAINER"
  | "PROFESSIONAL"
  | "TEAM_MEMBER"
  | "MANAGER"
  | "ADMIN"
  | "SUPER_ADMIN";

export type NotificationPriority = "low" | "normal" | "high" | "critical" | "urgent";

export type NotificationCategory =
  | "workout"
  | "assessment"
  | "anamnesis"
  | "protocol"
  | "checkin"
  | "pain_report"
  | "feedback"
  | "appointment"
  | "consultancy"
  | "message"
  | "achievement"
  | "hydration"
  | "student"
  | "payment"
  | "subscription"
  | "team"
  | "security"
  | "operational"
  | "marketing";

// =============================================================================
// 2. MODELOS CANÔNICOS DE DADOS
// =============================================================================

export type Notification = {
  id: string;
  recipientId: string;
  tenantId?: string;
  personalId?: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "critical";
  data?: Record<string, unknown>;
  deepLink?: string;
  sourceType?: string;
  sourceId?: string;
  dedupeKey?: string;
  status:
    | "created"
    | "queued"
    | "sent"
    | "delivered"
    | "read"
    | "dismissed"
    | "failed"
    | "cancelled";
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  expiresAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type PushDevice = {
  id: string;
  userId: string;
  tenantId?: string;
  token: string;
  provider: "expo" | "fcm" | "apns" | "web";
  platform: "ios" | "android" | "web";
  deviceId?: string;
  appVersion?: string;
  environment: "development" | "staging" | "production";
  active: boolean;
  lastSeenAt?: string;
  lastActiveAt?: string;
  invalidatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export interface DomainNotificationEvent {
  eventId: string;
  eventType: DomainEventType;
  tenantId: string;
  actorId?: string;
  recipientId: string;
  recipientRole: UserRole;
  resourceType: "workout" | "assessment" | "anamnesis" | "protocol" | "feedback" | "appointment" | "message" | "subscription" | "user" | "team" | "system";
  resourceId: string;
  occurredAt: string;
  scheduledFor?: string;
  timezone: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
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
  lockScreenBody?: string;
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

export interface DeviceTokenRecord extends PushDevice {
  deviceInstallationId: string;
  tokenType: "expo" | "apns" | "fcm" | "web_push";
  pushToken: string;
  isActive: boolean;
  revokedAt?: string | null;
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
  timezone: string; // "America/Sao_Paulo"
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  categories: {
    workout: boolean;
    assessment: boolean;
    anamnesis: boolean;
    protocol: boolean;
    checkin: boolean;
    pain_report: boolean;
    feedback: boolean;
    appointment: boolean;
    consultancy: boolean;
    message: boolean;
    achievement: boolean;
    hydration: boolean;
    student: boolean;
    payment: boolean;
    subscription: boolean;
    team: boolean;
    security: boolean; // Sempre true
    marketing: boolean;
    operational: boolean;
  };
}

// =============================================================================
// 3. STORAGE KEYS
// =============================================================================

const STORAGE_KEY_NOTIFS = "@dragoncorp/notifications_v2";
const STORAGE_KEY_DELIVERIES = "@dragoncorp/notification_deliveries_v2";
const STORAGE_KEY_TOKENS = "@dragoncorp/device_tokens_v2";
const STORAGE_KEY_USER_PREFS = "@dragoncorp/user_notification_prefs_v2";

// =============================================================================
// 4. TEMPLATES PADRÃO & RESOLVEDOR SEGURO DE VARIÁVEIS
// =============================================================================

export interface TemplateDefinition {
  titleTemplate: string;
  bodyTemplate: string;
  lockScreenBodyTemplate?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  deepLinkPattern: string;
}

export const CANONICAL_TEMPLATES: Record<DomainEventType, TemplateDefinition> = {
  // Treinos - Aluno
  "workout.assigned": {
    titleTemplate: "Novo Treino Liberado! 🏋️",
    bodyTemplate: "Seu personal prescreveu o treino {{workoutName}} para você. Vamos com tudo!",
    category: "workout",
    priority: "high",
    deepLinkPattern: "dragoncorp://training-details?workoutId={{workoutId}}",
  },
  "workout.updated": {
    titleTemplate: "Treino Atualizado",
    bodyTemplate: "O treino {{workoutName}} recebeu ajustes do seu personal trainer.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://training-details?workoutId={{workoutId}}",
  },
  "workout.substituted": {
    titleTemplate: "Exercício Substituído",
    bodyTemplate: "O personal substituiu um exercício no seu treino {{workoutName}}.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://training-details?workoutId={{workoutId}}",
  },
  "workout.expiring": {
    titleTemplate: "Treino Próximo do Vencimento ⏳",
    bodyTemplate: "Seu plano de treino {{workoutName}} expira em breve. Converse com seu personal para nova prescrição.",
    category: "workout",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "workout.expired": {
    titleTemplate: "Treino Vencido",
    bodyTemplate: "A validade do seu treino {{workoutName}} expirou. Seu personal já foi avisado para renovação.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "workout.today": {
    titleTemplate: "Treino de Hoje 🎯",
    bodyTemplate: "Hoje é dia de treinar {{workoutName}}. Supere seus limites!",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://training-details?workoutId={{workoutId}}",
  },
  "workout.reminder": {
    titleTemplate: "Hora do Treino! ⏰",
    bodyTemplate: "Lembrete: seu treino programado de hoje está aguardando você.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "workout.unfinished": {
    titleTemplate: "Treino em Andamento",
    bodyTemplate: "Você iniciou o treino {{workoutName}}. Deseja retomar e registrar suas séries?",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://training-details?workoutId={{workoutId}}",
  },
  "workout.feedback_added": {
    titleTemplate: "Comentário do Personal no Treino",
    bodyTemplate: "Seu personal adicionou uma orientação técnica no treino {{workoutName}}.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://training-details?workoutId={{workoutId}}",
  },
  "workout.adapted": {
    titleTemplate: "Adaptação de Treino Liberada",
    bodyTemplate: "Seu treino foi adaptado com sucesso para melhor recuperação.",
    category: "workout",
    priority: "high",
    deepLinkPattern: "dragoncorp://training-details?workoutId={{workoutId}}",
  },

  // Treinos - Personal
  "workout.completed": {
    titleTemplate: "Treino Concluído! 🏆",
    bodyTemplate: "{{studentName}} finalizou o treino {{workoutName}} com sucesso.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "workout.abandoned": {
    titleTemplate: "Treino Interrompido",
    bodyTemplate: "{{studentName}} não concluiu todas as séries programadas de {{workoutName}}.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "workout.no_execution_period": {
    titleTemplate: "Aluno sem Treinar",
    bodyTemplate: "{{studentName}} não registra treinos há mais de {{daysInactive}} dias.",
    category: "workout",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "workout.substitution_requested": {
    titleTemplate: "Solicitação de Troca de Exercício",
    bodyTemplate: "{{studentName}} solicitou adaptação no exercício {{exerciseName}} do treino {{workoutName}}.",
    category: "workout",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "workout.series_inconsistency": {
    titleTemplate: "Aviso de Carga / Séries",
    bodyTemplate: "{{studentName}} registrou uma variação atípica de carga em {{exerciseName}}.",
    category: "workout",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },

  // Avaliações
  "assessment.scheduled": {
    titleTemplate: "Avaliação Física Agendada 📋",
    bodyTemplate: "Sua avaliação física foi agendada para {{date}} às {{time}}.",
    category: "assessment",
    priority: "high",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.reminder": {
    titleTemplate: "Lembrete de Avaliação Física ⏰",
    bodyTemplate: "Sua avaliação física está programada para {{timeRemaining}}.",
    category: "assessment",
    priority: "high",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.due": {
    titleTemplate: "Avaliação Física Próxima",
    bodyTemplate: "Sua avaliação com {{trainerName}} acontecerá em breve.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "reassessment.available": {
    titleTemplate: "Reavaliação Disponível 📈",
    bodyTemplate: "Já se passaram 60 dias desde sua última avaliação. Hora de medir a evolução!",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "reassessment.week": {
    titleTemplate: "Semana de Reavaliação",
    bodyTemplate: "Esta é a semana prevista para reavaliar sua composição corporal.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.expired": {
    titleTemplate: "Avaliação Expirada",
    bodyTemplate: "A data de reavaliação física está vencida.",
    category: "assessment",
    priority: "high",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.completed": {
    titleTemplate: "Avaliação Concluída! ✨",
    bodyTemplate: "Sua avaliação física foi finalizada pelo personal.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.report_ready": {
    titleTemplate: "Relatório de Evolução Liberado 📊",
    bodyTemplate: "O relatório detalhado da sua composição corporal já está disponível para consulta.",
    category: "assessment",
    priority: "high",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.photos_available": {
    titleTemplate: "Fotos Comparativas Disponíveis 📸",
    bodyTemplate: "Novas fotos de evolução postural e física foram sincronizadas no seu histórico.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.week_summary": {
    titleTemplate: "Avaliações da Semana 📅",
    bodyTemplate: "Você possui {{assessmentCount}} avaliações e reavaliações programadas para esta semana.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/assessments",
  },
  "assessment.student_ready": {
    titleTemplate: "Aluno Apto para Reavaliação",
    bodyTemplate: "{{studentName}} completou o ciclo e está disponível para nova avaliação física.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "assessment.photos_received": {
    titleTemplate: "Fotos Recebidas",
    bodyTemplate: "{{studentName}} enviou novas fotos para acompanhamento.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "assessment.incomplete": {
    titleTemplate: "Avaliação Incompleta",
    bodyTemplate: "A avaliação de {{studentName}} possui dados pendentes de preenchimento.",
    category: "assessment",
    priority: "high",
    deepLinkPattern: "dragoncorp://assessments",
  },
  "assessment.awaiting_report": {
    titleTemplate: "Avaliação Aguardando Relatório",
    bodyTemplate: "Avaliação física realizada. Emita o laudo para liberar os resultados ao aluno.",
    category: "assessment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://assessments",
  },

  // Anamnese
  "anamnesis.requested": {
    titleTemplate: "Anamnese Solicitada 📝",
    bodyTemplate: "Seu personal solicitou o preenchimento da ficha de anamnese inicial.",
    category: "anamnesis",
    priority: "high",
    deepLinkPattern: "dragoncorp://student-anamnesis",
  },
  "anamnesis.reminder": {
    titleTemplate: "Lembrete: Preencha sua Anamnese",
    bodyTemplate: "Sua anamnese é essencial para que o personal prescreva treinos seguros e eficientes.",
    category: "anamnesis",
    priority: "normal",
    deepLinkPattern: "dragoncorp://student-anamnesis",
  },
  "anamnesis.revision_needed": {
    titleTemplate: "Ajuste na Anamnese Solicitado",
    bodyTemplate: "Seu personal solicitou esclarecimento em algumas respostas da sua ficha de saúde.",
    category: "anamnesis",
    priority: "high",
    deepLinkPattern: "dragoncorp://student-anamnesis",
  },
  "anamnesis.received": {
    titleTemplate: "Nova Anamnese Recebida! 📄",
    bodyTemplate: "{{studentName}} concluiu e enviou a ficha de anamnese para análise.",
    category: "anamnesis",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "anamnesis.new_version": {
    titleTemplate: "Atualização de Anamnese Solicitada",
    bodyTemplate: "Por favor, atualize suas informações de saúde para manter sua prescrição em dia.",
    category: "anamnesis",
    priority: "normal",
    deepLinkPattern: "dragoncorp://student-anamnesis",
  },
  "anamnesis.attention_needed": {
    titleTemplate: "Anamnese Exige Atenção ⚠️",
    bodyTemplate: "A ficha de {{studentName}} contém restrições de saúde que exigem cuidados especiais.",
    category: "anamnesis",
    priority: "critical",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "anamnesis.health_update": {
    titleTemplate: "Atualização de Saúde do Aluno",
    bodyTemplate: "{{studentName}} atualizou suas informações clínicas na anamnese.",
    category: "anamnesis",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },

  // Protocolos
  "protocol.created": {
    titleTemplate: "Novo Protocolo Liberado! 🏃",
    bodyTemplate: "Seu protocolo aeróbio {{protocolName}} foi prescrito pelo personal.",
    category: "protocol",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "protocol.updated": {
    titleTemplate: "Protocolo Aeróbio Atualizado",
    bodyTemplate: "Os parâmetros do seu teste aeróbio foram ajustados.",
    category: "protocol",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "protocol.review_due": {
    titleTemplate: "Revisão do Protocolo Próxima",
    bodyTemplate: "Seu ciclo aeróbio de 2 semanas está concluído e pronto para revisão.",
    category: "protocol",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "protocol.fortnight_completed": {
    titleTemplate: "Ciclo de 2 Semanas Concluído! 🏅",
    bodyTemplate: "Parabéns por concluir as sessões do protocolo aeróbio.",
    category: "protocol",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "protocol.pending_sessions": {
    titleTemplate: "Sessões de Protocolo Pendentes",
    bodyTemplate: "Faltam {{remainingSessions}} sessões para completar a meta do seu protocolo.",
    category: "protocol",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "protocol.new_ready": {
    titleTemplate: "Novo Protocolo Pronto",
    bodyTemplate: "Uma nova planilha de testes foi liberada para seu perfil.",
    category: "protocol",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },

  // Check-in
  "checkin.available": {
    titleTemplate: "Check-in de Prontidão Disponível 🔋",
    bodyTemplate: "Como você está se sentindo hoje? Responda o check-in rápido antes de treinar.",
    category: "checkin",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "checkin.reminder": {
    titleTemplate: "Lembrete: Check-in de Prontidão",
    bodyTemplate: "Informe seus níveis de sono, dor e estresse para calibrar o treino de hoje.",
    category: "checkin",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "checkin.trainer_replied": {
    titleTemplate: "Orientação do Personal",
    bodyTemplate: "Seu personal respondeu ao seu check-in com recomendações para a sessão.",
    category: "checkin",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "checkin.adapted": {
    titleTemplate: "Carga Adaptada para Hoje",
    bodyTemplate: "Com base no seu check-in, seu treino de hoje foi ajustado.",
    category: "checkin",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "checkin.care_alert": {
    titleTemplate: "Aviso de Cuidado no Treino",
    bodyTemplate: "Seu personal deixou instruções preventivas para a sua sessão de hoje.",
    category: "checkin",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "checkin.pending_before_workout": {
    titleTemplate: "Check-in Pendente",
    bodyTemplate: "Para sua segurança, complete o check-in antes de iniciar os exercícios.",
    category: "checkin",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "checkin.low_energy": {
    titleTemplate: "Check-in: Baixa Prontidão",
    bodyTemplate: "{{studentName}} relatou baixa energia e fadiga elevada antes do treino.",
    lockScreenBodyTemplate: "Um aluno registrou baixa prontidão antes do treino.",
    category: "checkin",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "checkin.poor_sleep": {
    titleTemplate: "Check-in: Sono Insuficiente",
    bodyTemplate: "{{studentName}} indicou qualidade de sono ruim na noite anterior.",
    lockScreenBodyTemplate: "Atualização de prontidão de aluno recebida.",
    category: "checkin",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "checkin.high_fatigue": {
    titleTemplate: "Alerta de Fadiga Elevada",
    bodyTemplate: "{{studentName}} registrou fadiga severa no check-in.",
    lockScreenBodyTemplate: "Alerta de prontidão recebido de aluno.",
    category: "checkin",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "checkin.pain_flagged": {
    titleTemplate: "Desconforto Indicado no Check-in ⚠️",
    bodyTemplate: "{{studentName}} apontou sensação de dor antes de iniciar a sessão.",
    lockScreenBodyTemplate: "Um aluno apontou desconforto antes do treino.",
    category: "checkin",
    priority: "critical",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "checkin.unfavorable_sequence": {
    titleTemplate: "Sequência Desfavorável de Check-ins",
    bodyTemplate: "{{studentName}} acumula 3 check-ins consecutivos com recuperação deficiente.",
    lockScreenBodyTemplate: "Alerta de recuperação de aluno acumulada.",
    category: "checkin",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },

  // Relatos de Dor & Feedbacks
  "pain_report.created": {
    titleTemplate: "Relato de Desconforto Pós-Treino ⚠️",
    bodyTemplate: "{{studentName}} relatou desconforto em {{painRegion}} (nível {{painLevel}}/10) após o treino.",
    lockScreenBodyTemplate: "Um aluno enviou um relato que exige atenção profissional.",
    category: "pain_report",
    priority: "critical",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "pain_report.high_priority": {
    titleTemplate: "ALERTA: Dor Aguda Relatada 🚨",
    bodyTemplate: "{{studentName}} apontou desconforto acentuado (nível {{painLevel}}/10). Recomenda-se orientação profissional.",
    lockScreenBodyTemplate: "Um aluno registrou um relato de prioridade crítica.",
    category: "pain_report",
    priority: "critical",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "pain_report.trainer_replied": {
    titleTemplate: "Resposta do Personal sobre o Desconforto",
    bodyTemplate: "Seu personal avaliou seu relato e enviou orientações preventivas.",
    category: "pain_report",
    priority: "high",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "pain_report.care_orientation": {
    titleTemplate: "Orientação Profissional Adicionada",
    bodyTemplate: "Consulte as recomendações de cuidado adicionadas ao seu registro.",
    category: "pain_report",
    priority: "normal",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "pain_report.unanswered": {
    titleTemplate: "Relato de Dor sem Resposta",
    bodyTemplate: "O relato enviado por {{studentName}} ainda aguarda seu retorno.",
    lockScreenBodyTemplate: "Um relato de aluno aguarda sua resposta.",
    category: "pain_report",
    priority: "critical",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "pain_report.continuous_pain": {
    titleTemplate: "Reincidência de Desconforto",
    bodyTemplate: "{{studentName}} segue registrando incômodo na mesma região em treinos sucessivos.",
    lockScreenBodyTemplate: "Alerta de reincidência de relato recebido.",
    category: "pain_report",
    priority: "critical",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },

  // Feedbacks
  "feedback.created": {
    titleTemplate: "Novo Feedback de Treino 💬",
    bodyTemplate: "{{studentName}} avaliou o treino {{workoutName}} com {{rating}} estrelas.",
    category: "feedback",
    priority: "normal",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "feedback.answered": {
    titleTemplate: "Personal Respondeu ao seu Feedback! 💬",
    bodyTemplate: "Seu feedback do treino {{workoutName}} recebeu uma resposta.",
    category: "feedback",
    priority: "normal",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "feedback.low_rating": {
    titleTemplate: "Feedback com Avaliação Baixa",
    bodyTemplate: "{{studentName}} avaliou o treino com nota {{rating}}/5. Verifique a percepção do aluno.",
    category: "feedback",
    priority: "high",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "feedback.high_effort": {
    titleTemplate: "Percepção de Esforço Máxima",
    bodyTemplate: "{{studentName}} relatou esforço excessivo na execução da sessão.",
    category: "feedback",
    priority: "high",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "feedback.exercise_difficulty": {
    titleTemplate: "Dificuldade em Exercício",
    bodyTemplate: "{{studentName}} indicou dificuldade técnica na execução.",
    category: "feedback",
    priority: "normal",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },
  "feedback.resolved": {
    titleTemplate: "Feedback Concluído",
    bodyTemplate: "As orientações do feedback de {{studentName}} foram registradas.",
    category: "feedback",
    priority: "low",
    deepLinkPattern: "dragoncorp://feedback-detail?id={{feedbackId}}",
  },

  // Agenda e Consultoria
  "appointment.created": {
    titleTemplate: "Novo Agendamento Solicitado 📅",
    bodyTemplate: "Atendimento agendado para {{date}} às {{time}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.scheduled": {
    titleTemplate: "Atendimento Agendado",
    bodyTemplate: "Sessão agendada com {{trainerName}} para {{date}} às {{time}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.reminder": {
    titleTemplate: "Lembrete de Atendimento ⏰",
    bodyTemplate: "Seu atendimento presencial/online acontecerá em {{timeRemaining}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.confirmed": {
    titleTemplate: "Atendimento Confirmado! ✅",
    bodyTemplate: "Seu horário de {{time}} no dia {{date}} foi confirmado.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.rejected": {
    titleTemplate: "Horário Não Confirmado",
    bodyTemplate: "O horário solicitado não pôde ser confirmado.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.awaiting_confirmation": {
    titleTemplate: "Confirmação Pendente",
    bodyTemplate: "Por favor, confirme sua presença para a sessão de amanhã às {{time}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.rescheduled": {
    titleTemplate: "Horário Reagendado 🗓️",
    bodyTemplate: "O atendimento foi alterado para {{date}} às {{time}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.reschedule_requested": {
    titleTemplate: "Solicitação de Reagendamento",
    bodyTemplate: "{{studentName}} solicitou alteração de horário.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.cancelled": {
    titleTemplate: "Atendimento Cancelado",
    bodyTemplate: "A sessão agendada para {{date}} às {{time}} foi cancelada.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.reminder_due": {
    titleTemplate: "Lembrete de Sessão ⏰",
    bodyTemplate: "Sua sessão com {{trainerName}} começará em {{timeRemaining}}.",
    category: "appointment",
    priority: "high",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.check_in_available": {
    titleTemplate: "Check-in de Presença Disponível 📍",
    bodyTemplate: "Você já pode confirmar sua chegada para o treino presencial.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.completed": {
    titleTemplate: "Sessão Concluída ✨",
    bodyTemplate: "Seu atendimento foi finalizado com sucesso.",
    category: "appointment",
    priority: "low",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "appointment.no_show": {
    titleTemplate: "Ausência Registrada",
    bodyTemplate: "O aluno não compareceu ao horário agendado.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.waitlist_spot_available": {
    titleTemplate: "Vaga Liberada na Agenda! 🎉",
    bodyTemplate: "Um horário foi liberado em {{date}} às {{time}}. Toque para confirmar.",
    category: "appointment",
    priority: "urgent",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "appointment.waitlist_spot_expired": {
    titleTemplate: "Vaga da Lista Expirada",
    bodyTemplate: "O prazo para aceitar a vaga liberada expirou.",
    category: "appointment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://trainer-agenda",
  },
  "consultancy.expiring": {
    titleTemplate: "Consultoria Próxima do Vencimento ⏳",
    bodyTemplate: "O período da sua consultoria encerra em {{daysRemaining}} dias. Fale com seu personal para renovação.",
    category: "consultancy",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/profile",
  },
  "consultancy.renewed": {
    titleTemplate: "Consultoria Renovada! 🚀",
    bodyTemplate: "Sua consultoria foi renovada por mais {{periodMonths}} meses. Vamos em frente!",
    category: "consultancy",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/profile",
  },
  "consultancy.expired": {
    titleTemplate: "Consultoria Vencida",
    bodyTemplate: "O período da consultoria encerrou. Renove para continuar com acompanhamento ativo.",
    category: "consultancy",
    priority: "critical",
    deepLinkPattern: "dragoncorp://(tabs)/profile",
  },
  "consultancy.renewal_pending": {
    titleTemplate: "Renovação de Consultoria Pendente",
    bodyTemplate: "{{studentName}} está com a consultoria próxima do fim.",
    category: "consultancy",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },

  // Mensagens
  "message.created": {
    titleTemplate: "Nova Mensagem 💬",
    bodyTemplate: "{{senderName}}: {{messageSnippet}}",
    category: "message",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/messages",
  },
  "message.reply": {
    titleTemplate: "Resposta Recebida 💬",
    bodyTemplate: "{{senderName}} respondeu à sua mensagem.",
    category: "message",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/messages",
  },
  "message.urgent": {
    titleTemplate: "Mensagem Importante 🚨",
    bodyTemplate: "{{senderName}}: {{messageSnippet}}",
    category: "message",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/messages",
  },
  "message.attachment": {
    titleTemplate: "Arquivo Recebido 📎",
    bodyTemplate: "{{senderName}} enviou um documento ou mídia para você.",
    category: "message",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/messages",
  },
  "message.waiting_reply": {
    titleTemplate: "Mensagem Aguardando Resposta",
    bodyTemplate: "{{studentName}} aguarda seu retorno há mais de {{waitingHours}} horas.",
    category: "message",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/messages",
  },

  // Evolução e Conquistas
  "achievement.unlocked": {
    titleTemplate: "Nova Conquista Desbloqueada! 🏆",
    bodyTemplate: "Parabéns! Você alcançou o marco: {{achievementTitle}}.",
    category: "achievement",
    priority: "low",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "achievement.pr_confirmed": {
    titleTemplate: "Novo Recorde Pessoal! 🔥",
    bodyTemplate: "Você superou sua marca histórica no exercício {{exerciseName}} com {{load}}kg!",
    category: "achievement",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "achievement.streak": {
    titleTemplate: "Sequência Incrível! ⚡",
    bodyTemplate: "Você está treinando há {{streakWeeks}} semanas consecutivas sem falhar!",
    category: "achievement",
    priority: "low",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "engagement.low_frequency": {
    titleTemplate: "Sentimos sua Falta nos Treinos",
    bodyTemplate: "Não deixe o ritmo cair! Que tal planejar seu próximo treino hoje?",
    category: "achievement",
    priority: "low",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },
  "engagement.welcome_back": {
    titleTemplate: "Bem-vindo de Volta aos Treinos! 🚀",
    bodyTemplate: "Excelente retorno! A consistência é a chave para os grandes resultados.",
    category: "achievement",
    priority: "low",
    deepLinkPattern: "dragoncorp://(tabs)/training",
  },

  // Hidratação (Opt-in estrito)
  "hydration.reminder": {
    titleTemplate: "Hora de Beber Água 💧",
    bodyTemplate: "Mantenha seu corpo hidratado para acelerar a recuperação e o desempenho.",
    category: "hydration",
    priority: "low",
    deepLinkPattern: "dragoncorp://hydration",
  },
  "hydration.goal_reached": {
    titleTemplate: "Meta de Hidratação Atingida! 🌊",
    bodyTemplate: "Parabéns! Você alcançou sua meta diária de ingestão hídrica.",
    category: "hydration",
    priority: "low",
    deepLinkPattern: "dragoncorp://hydration",
  },

  // Alunos
  "student.linked": {
    titleTemplate: "Novo Aluno Vinculado! 🤝",
    bodyTemplate: "{{studentName}} foi adicionado à sua consultoria.",
    category: "student",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "student.link_requested": {
    titleTemplate: "Solicitação de Vínculo de Aluno",
    bodyTemplate: "{{studentName}} solicitou ingresso na sua consultoria.",
    category: "student",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/student",
  },
  "student.awaiting_approval": {
    titleTemplate: "Aluno Aguardando Aprovação",
    bodyTemplate: "Há novos alunos aguardando liberação de acesso.",
    category: "student",
    priority: "high",
    deepLinkPattern: "dragoncorp://(tabs)/student",
  },
  "student.inactive": {
    titleTemplate: "Aluno Inativo",
    bodyTemplate: "{{studentName}} está sem interações há mais de 15 dias.",
    category: "student",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "student.low_frequency": {
    titleTemplate: "Baixa Aderência de Aluno",
    bodyTemplate: "{{studentName}} executou menos de 50% dos treinos previstos no mês.",
    category: "student",
    priority: "normal",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "student.without_workout": {
    titleTemplate: "Aluno sem Treino Vigente ⚠️",
    bodyTemplate: "{{studentName}} está ativo mas sem ficha de treino prescrita.",
    category: "student",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },
  "student.consultancy_expiring": {
    titleTemplate: "Consultoria de Aluno Encerrando",
    bodyTemplate: "A consultoria de {{studentName}} encerra em breve.",
    category: "student",
    priority: "high",
    deepLinkPattern: "dragoncorp://students/{{studentId}}",
  },

  // Financeiro & Assinatura
  "payment.requested": {
    titleTemplate: "Pagamento Solicitado",
    bodyTemplate: "Cobrança de {{formattedAmount}} disponível para o serviço {{serviceName}}.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "payment.pix_generated": {
    titleTemplate: "Código PIX Gerado 💠",
    bodyTemplate: "Copie a chave PIX de {{formattedAmount}} para concluir seu pagamento.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "payment.pix_expiring": {
    titleTemplate: "Chave PIX Próxima de Expirar ⏳",
    bodyTemplate: "Sua chave PIX expira em 10 minutos. Conclua para garantir seu plano.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "payment.approved": {
    titleTemplate: "Pagamento Confirmado! 💳",
    bodyTemplate: "O pagamento de {{formattedAmount}} foi aprovado com sucesso.",
    category: "payment",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "payment.failed": {
    titleTemplate: "Falha no Pagamento",
    bodyTemplate: "Não foi possível processar o pagamento de {{formattedAmount}}.",
    category: "payment",
    priority: "critical",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "payment.refunded": {
    titleTemplate: "Estorno Realizado",
    bodyTemplate: "O reembolso de {{formattedAmount}} foi efetuado com sucesso.",
    category: "payment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "payment.daily_closure": {
    titleTemplate: "Fechamento Financeiro Diário 📊",
    bodyTemplate: "Total recebido hoje: {{formattedAmount}} em {{transactionCount}} atendimentos.",
    category: "payment",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/admin",
  },
  "subscription.started": {
    titleTemplate: "Assinatura Iniciada 🚀",
    bodyTemplate: "Sua assinatura foi solicitada e aguarda confirmação da loja.",
    category: "subscription",
    priority: "normal",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.validated": {
    titleTemplate: "Assinatura Validada! ✅",
    bodyTemplate: "Sua compra foi confirmada com sucesso pelas lojas oficiais.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.plan_changed": {
    titleTemplate: "Plano Alterado com Sucesso",
    bodyTemplate: "Seu plano agora é {{planName}}. Aproveite todos os recursos!",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.trial_expiring": {
    titleTemplate: "Período de Teste Encerrando ⏳",
    bodyTemplate: "Seu teste PRO encerra em {{daysRemaining}} dias. Mantenha seus recursos ativos!",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.activated": {
    titleTemplate: "Plano PRO Ativado! 🚀",
    bodyTemplate: "Parabéns! Você tem acesso ilimitado a todos os recursos profissionais da plataforma.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.renewed": {
    titleTemplate: "Assinatura Renovada",
    bodyTemplate: "Sua assinatura PRO foi renovada com sucesso até {{nextBillingDate}}.",
    category: "subscription",
    priority: "normal",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.failed_to_renew": {
    titleTemplate: "Aviso de Cobrança da Assinatura",
    bodyTemplate: "A loja não conseguiu renovar sua assinatura. Atualize seu meio de pagamento para evitar suspensão.",
    category: "subscription",
    priority: "critical",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.renewal_failed": {
    titleTemplate: "Falha na Renovação da Assinatura",
    bodyTemplate: "Houve uma falha na renovação da sua assinatura. Atualize sua forma de pagamento.",
    category: "subscription",
    priority: "critical",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.payment_pending": {
    titleTemplate: "Pagamento da Assinatura Pendente",
    bodyTemplate: "A confirmação de pagamento da assinatura está em processamento.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.cancelled": {
    titleTemplate: "Cancelamento de Assinatura Registrado",
    bodyTemplate: "Sua assinatura foi cancelada e permanecerá ativa até o fim do período vigente.",
    category: "subscription",
    priority: "normal",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.expiring_soon": {
    titleTemplate: "Assinatura Vencendo",
    bodyTemplate: "Sua assinatura expira em breve. Renove para continuar gerenciando sua carteira completa.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.expired": {
    titleTemplate: "Assinatura Expirada",
    bodyTemplate: "Sua assinatura expirou. Escolha um plano para reativar seu acesso PRO completo.",
    category: "subscription",
    priority: "critical",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.grace_period": {
    titleTemplate: "Período de Tolerância Ativo",
    bodyTemplate: "Sua assinatura está em período de carência. Regularize o pagamento para evitar bloqueio.",
    category: "subscription",
    priority: "critical",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.restore_completed": {
    titleTemplate: "Compras Restauradas com Sucesso! 🔄",
    bodyTemplate: "Sua assinatura anterior foi sincronizada e seus benefícios reativados.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.limit_near": {
    titleTemplate: "Próximo do Limite de Alunos",
    bodyTemplate: "Você está próximo de atingir a cota máxima de alunos permitida no seu plano.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },
  "subscription.limit_reached": {
    titleTemplate: "Limite de Alunos Atingido",
    bodyTemplate: "Você atingiu o limite de alunos do plano gratuito. Faça upgrade para PRO e libere alunos ilimitados.",
    category: "subscription",
    priority: "high",
    deepLinkPattern: "dragoncorp://subscription",
  },

  // Equipe
  "team.invitation_created": {
    titleTemplate: "Convite para Equipe 👥",
    bodyTemplate: "Você foi convidado para ingressar na equipe de {{businessName}} como {{roleName}}.",
    category: "team",
    priority: "high",
    deepLinkPattern: "dragoncorp://account-profile",
  },
  "team.invitation_accepted": {
    titleTemplate: "Convite Aceito",
    bodyTemplate: "{{memberName}} aceitou o convite e agora faz parte da sua equipe.",
    category: "team",
    priority: "normal",
    deepLinkPattern: "dragoncorp://account-profile",
  },
  "team.permission_changed": {
    titleTemplate: "Permissões de Acesso Alteradas",
    bodyTemplate: "Suas permissões de acesso na empresa {{businessName}} foram atualizadas.",
    category: "team",
    priority: "high",
    deepLinkPattern: "dragoncorp://account-profile",
  },
  "team.member_removed": {
    titleTemplate: "Membro Removido da Equipe",
    bodyTemplate: "O vínculo profissional com a equipe foi encerrado.",
    category: "team",
    priority: "normal",
    deepLinkPattern: "dragoncorp://account-profile",
  },

  // Segurança
  "security.new_login": {
    titleTemplate: "Novo Acesso Detectado 🔐",
    bodyTemplate: "Novo login realizado em {{deviceName}} ({{location}}). Se não foi você, altere sua senha imediatamente.",
    category: "security",
    priority: "critical",
    deepLinkPattern: "dragoncorp://account-profile",
  },
  "security.password_changed": {
    titleTemplate: "Senha Alterada com Sucesso",
    bodyTemplate: "A senha da sua conta foi redefinida recentemente.",
    category: "security",
    priority: "high",
    deepLinkPattern: "dragoncorp://account-profile",
  },
  "security.password_reset_requested": {
    titleTemplate: "Recuperação de Senha Solicitada",
    bodyTemplate: "Uma solicitação de recuperação de senha foi iniciada para o seu e-mail.",
    category: "security",
    priority: "high",
    deepLinkPattern: "dragoncorp://reset-password",
  },
  "security.suspicious_activity": {
    titleTemplate: "Alerta de Atividade Suspeita",
    bodyTemplate: "Detectamos múltiplas tentativas de autenticação inválidas na sua conta.",
    category: "security",
    priority: "critical",
    deepLinkPattern: "dragoncorp://account-profile",
  },
  "security.account_deletion_requested": {
    titleTemplate: "Exclusão de Conta em Processamento",
    bodyTemplate: "Sua solicitação de exclusão definitiva de conta foi recebida e está sendo processada.",
    category: "security",
    priority: "critical",
    deepLinkPattern: "dragoncorp://delete-account",
  },

  // Operacional
  "operational.daily_agenda_summary": {
    titleTemplate: "Resumo da sua Agenda de Hoje 📋",
    bodyTemplate: "Você tem {{totalAppointments}} atendimentos agendados para hoje. Primeiro às {{firstAppointmentTime}}.",
    category: "operational",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "operational.weekly_agenda_summary": {
    titleTemplate: "Resumo Semanal da Consultoria 📊",
    bodyTemplate: "Esta semana você possui {{totalAppointments}} atendimentos e avaliações agendados.",
    category: "operational",
    priority: "normal",
    deepLinkPattern: "dragoncorp://(tabs)/index",
  },
  "operational.system_alert": {
    titleTemplate: "Aviso do Sistema",
    bodyTemplate: "{{message}}",
    category: "operational",
    priority: "normal",
    deepLinkPattern: "dragoncorp://notifications",
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

export function generateDeterministicIdempotencyKey(
  eventType: DomainEventType | string,
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

export function isInQuietHours(
  now: Date,
  quietHours: { enabled: boolean; start: string; end: string }
): boolean {
  if (!quietHours?.enabled) return false;

  const [startH, startM] = (quietHours.start || "22:00").split(":").map(Number);
  const [endH, endM] = (quietHours.end || "08:00").split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 8) * 60 + (endM ?? 0);

  if (startMinutes > endMinutes) {
    // Ex: 22:00 até 08:00 (cruza a meia-noite)
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

    // 6. Verifica Opt-out de Marketing e Categorias Específicas
    if (templateDef.category === "marketing" && !userPrefs.enableMarketing) {
      return { processed: false, suppressedReason: "Usuário optou por não receber notificações de marketing." };
    }

    // Hidratação é estritamente opt-in: não envia se usuário desabilitou
    if (templateDef.category === "hydration" && !userPrefs.categories?.hydration) {
      return { processed: false, suppressedReason: "Lembretes de hidratação desativados pelo usuário." };
    }

    // 7. Renderiza Mensagens e Sanitiza Tela Bloqueada
    const title = renderTemplate(templateDef.titleTemplate, event.metadata || {});
    const body = renderTemplate(templateDef.bodyTemplate, event.metadata || {});
    const lockScreenBody = templateDef.lockScreenBodyTemplate
      ? renderTemplate(templateDef.lockScreenBodyTemplate, event.metadata || {})
      : body;

    const deepLink = renderTemplate(templateDef.deepLinkPattern, {
      ...event.metadata,
      workoutId: event.resourceId,
      assessmentId: event.resourceId,
      studentId: event.metadata?.studentId || event.resourceId,
      feedbackId: event.metadata?.feedbackId || event.resourceId,
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
      lockScreenBody,
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

    // 9. Enfileira Entregas de Canais no Outbox
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
      id: `del_inapp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notificationId: notification.id,
      channel: "in_app",
      provider: "in_app_local",
      status: "delivered",
      attempts: 1,
      maxAttempts: 1,
      scheduledAt,
      deliveredAt: new Date().toISOString(),
    });

    // Canal Push Notification (se permitido nas preferências)
    if (userPrefs.enablePush && userPrefs.categories?.[notification.category] !== false) {
      const isCriticalOrSecurity =
        notification.priority === "critical" ||
        notification.priority === "urgent" ||
        notification.category === "security" ||
        notification.category === "pain_report";

      const quiet = isInQuietHours(new Date(), userPrefs.quietHours);

      // Se estiver em horário silencioso e não for alerta crítico/segurança, adia ou suprime
      const status: DeliveryStatus = quiet && !isCriticalOrSecurity ? "suppressed" : "queued";

      deliveries.push({
        id: `del_push_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
  // 8. CANCELAMENTO DE LEMBRETES OBSOLETOS
  // ===========================================================================

  static async cancelPendingRemindersForAppointment(
    tenantId: string,
    appointmentId: string
  ): Promise<number> {
    const notifs = await this.listStoredNotifications();
    const deliveries = await this.listStoredDeliveries();

    let cancelledCount = 0;
    const appointmentReminderPrefix = `appointment.reminder_due:${appointmentId}:`;

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

  static async cancelPendingRemindersForWorkout(
    tenantId: string,
    workoutId: string
  ): Promise<number> {
    const notifs = await this.listStoredNotifications();
    const deliveries = await this.listStoredDeliveries();

    let cancelledCount = 0;
    const updatedDeliveries = deliveries.map((del) => {
      const match = notifs.find(
        (n) =>
          n.id === del.notificationId &&
          n.tenantId === tenantId &&
          n.resourceId === workoutId &&
          (n.eventType === "workout.reminder" || n.eventType === "workout.today")
      );

      if (match && (del.status === "queued" || del.status === "scheduled")) {
        cancelledCount++;
        return {
          ...del,
          status: "cancelled" as DeliveryStatus,
          errorMessage: "Treino já concluído ou cancelado.",
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
  // 9. GERENCIAMENTO DE TOKENS E DISPOSITIVOS
  // ===========================================================================

  static async registerDeviceToken(input: {
    userId: string;
    tenantId: string;
    deviceInstallationId: string;
    platform: "ios" | "android" | "web";
    pushToken: string;
    environment?: "development" | "staging" | "production";
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
      token: input.pushToken,
      provider: input.pushToken.includes("ExponentPushToken") ? "expo" : input.platform === "ios" ? "apns" : "fcm",
      deviceId: input.deviceInstallationId,
      environment: input.environment || "production",
      appVersion: input.appVersion || "1.0.0",
      createdAt: existingIndex >= 0 ? tokens[existingIndex]!.createdAt : now,
      updatedAt: now,
      lastSeenAt: now,
      lastActiveAt: now,
      isActive: true,
      active: true,
    };

    if (existingIndex >= 0) {
      tokens[existingIndex] = record;
    } else {
      tokens.push(record);
    }

    await AsyncStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
    return record;
  }

  static async revokeDeviceTokenOnLogout(deviceInstallationId: string): Promise<boolean> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_TOKENS);
    if (!raw) return false;

    const tokens: DeviceTokenRecord[] = JSON.parse(raw);
    const updated = tokens.map((t) =>
      t.deviceInstallationId === deviceInstallationId
        ? { ...t, isActive: false, active: false, revokedAt: new Date().toISOString(), invalidatedAt: new Date().toISOString() }
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
        end: "08:00",
      },
      categories: {
        workout: true,
        assessment: true,
        anamnesis: true,
        protocol: true,
        checkin: true,
        pain_report: true,
        feedback: true,
        appointment: true,
        consultancy: true,
        message: true,
        achievement: true,
        hydration: false, // Estritamente opt-in!
        student: true,
        payment: true,
        subscription: true,
        team: true,
        security: true, // Sempre verdadeiro
        marketing: false,
        operational: true,
      },
    };
  }

  static async saveUserPreferences(
    prefs: UserNotificationPreferences
  ): Promise<UserNotificationPreferences> {
    prefs.categories.security = true;
    await AsyncStorage.setItem(
      `${STORAGE_KEY_USER_PREFS}_${prefs.userId}`,
      JSON.stringify(prefs)
    );
    return prefs;
  }

  // ===========================================================================
  // 11. PERSISTÊNCIA E CONSULTA NA CENTRAL DE NOTIFICAÇÕES
  // ===========================================================================

  static async listStoredNotifications(): Promise<NotificationRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_NOTIFS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static async listNotificationsForUser(
    userId: string,
    tenantId?: string,
    options?: { category?: string; unreadOnly?: boolean }
  ): Promise<{ notifications: NotificationRecord[]; total: number; unreadCount: number }> {
    const all = await this.listStoredNotifications();
    const userNotifs = all.filter((n) => {
      const matchUser = n.recipientId === userId;
      const matchTenant = !tenantId || n.tenantId === tenantId;
      return matchUser && matchTenant;
    });

    const unreadCount = userNotifs.filter((n) => !n.read).length;

    let filtered = userNotifs;
    if (options?.category && options.category !== "all") {
      filtered = filtered.filter((n) => n.category === options.category);
    }
    if (options?.unreadOnly) {
      filtered = filtered.filter((n) => !n.read);
    }

    return {
      notifications: filtered,
      total: userNotifs.length,
      unreadCount,
    };
  }

  static async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const list = await this.listStoredNotifications();
    let updated = false;
    const now = new Date().toISOString();

    const next = list.map((n) => {
      if (n.id === id && n.recipientId === userId) {
        updated = true;
        return { ...n, read: true, readAt: now };
      }
      return n;
    });

    if (updated) {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(next));
    }
    return updated;
  }

  static async markAllNotificationsAsRead(userId: string): Promise<number> {
    const list = await this.listStoredNotifications();
    let count = 0;
    const now = new Date().toISOString();

    const next = list.map((n) => {
      if (n.recipientId === userId && !n.read) {
        count++;
        return { ...n, read: true, readAt: now };
      }
      return n;
    });

    if (count > 0) {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(next));
    }
    return count;
  }

  static async dismissNotification(id: string, userId: string): Promise<boolean> {
    const list = await this.listStoredNotifications();
    const next = list.filter((n) => !(n.id === id && n.recipientId === userId));
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(next));
    return true;
  }

  static async saveNotification(notification: NotificationRecord): Promise<void> {
    const list = await this.listStoredNotifications();
    list.unshift(notification);
    const trimmed = list.slice(0, 300);
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
    const trimmed = list.slice(0, 500);
    await AsyncStorage.setItem(STORAGE_KEY_DELIVERIES, JSON.stringify(trimmed));
  }
}
