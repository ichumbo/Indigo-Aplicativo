import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportCategory =
  | "acesso"
  | "cadastro"
  | "assinatura"
  | "cobranca"
  | "aluno"
  | "treino"
  | "avaliacao"
  | "imagem"
  | "video"
  | "notificacao"
  | "problema_tecnico"
  | "privacidade"
  | "exclusao"
  | "seguranca"
  | "outro";

export type TicketStatus = "aberto" | "em_analise" | "aguardando_usuario" | "resolvido" | "encerrado";

export type SupportTicket = {
  id: string;
  protocolNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: SupportCategory;
  subject: string;
  description: string;
  attachmentUris?: string[];
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  responses: {
    senderId: string;
    senderRole: "USER" | "SUPPORT_AGENT";
    message: string;
    timestamp: string;
  }[];
  satisfactionRating?: number; // 1 to 5
};

export type ContentReport = {
  id: string;
  reportedByUserId: string;
  reportedTargetId: string;
  targetType: "user_message" | "trainer_profile" | "exercise_comment" | "feed_post";
  reason: "offensive_language" | "harassment" | "spam" | "impersonation" | "inappropriate_image" | "other";
  details?: string;
  status: "pending_review" | "action_taken" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

export type BlockedUserRecord = {
  blockerUserId: string;
  blockedUserId: string;
  blockedAt: string;
  reason?: string;
};

const SUPPORT_TICKETS_STORAGE_KEY = "@dragoncorp/support_tickets_v1";
const CONTENT_REPORTS_STORAGE_KEY = "@dragoncorp/content_reports_v1";
const BLOCKED_USERS_STORAGE_KEY = "@dragoncorp/blocked_users_v1";

export const FAQ_CATALOG = [
  {
    category: "assinatura",
    question: "Como funciona a assinatura e cobrança?",
    answer: "A assinatura Pro do DragonCorp é gerenciada diretamente pela sua conta da Apple App Store (iOS) ou Google Play Store (Android). O plano FREE inicial inclui 1 aluno com todas as funcionalidades de prescrição e avaliação.",
  },
  {
    category: "aluno",
    question: "Como adicionar alunos ao meu painel?",
    answer: "Você pode compartilhar seu código de treinador ou cadastrar o aluno diretamente pelo botão 'Adicionar Aluno' na tela inicial.",
  },
  {
    category: "privacidade",
    question: "Como funciona a exclusão definitiva da minha conta?",
    answer: "Você pode solicitar a exclusão a qualquer momento na tela de Perfil ou pelo canal público de privacidade. Todos os seus dados pessoais e avaliações são permanentemente apagados dos nossos servidores em conformidade com a LGPD.",
  },
  {
    category: "avaliacao",
    question: "Os laudos de avaliação física têm validade médica?",
    answer: "Não. As avaliações físicas fornecem estimativas de composição corporal e testes funcionais para direcionar a prescrição do treinamento esportivo e não substituem diagnóstico médico.",
  },
];

export function generateProtocolNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomHex = Math.floor(1000 + Math.random() * 9000).toString();
  return `DGC-${dateStr}-${randomHex}`;
}

export async function createSupportTicket(input: {
  userId: string;
  userName: string;
  userEmail: string;
  category: SupportCategory;
  subject: string;
  description: string;
  attachmentUris?: string[];
}): Promise<SupportTicket> {
  if (!input.subject.trim() || input.subject.trim().length < 4) {
    throw new Error("Informe um assunto claro para o chamado (mínimo 4 caracteres).");
  }
  if (!input.description.trim() || input.description.trim().length < 10) {
    throw new Error("Descreva detalhadamente a sua solicitação ou problema (mínimo 10 caracteres).");
  }

  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    protocolNumber: generateProtocolNumber(),
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    category: input.category,
    subject: input.subject.trim(),
    description: input.description.trim(),
    attachmentUris: input.attachmentUris || [],
    status: "aberto",
    createdAt: now,
    updatedAt: now,
    responses: [
      {
        senderId: "system",
        senderRole: "SUPPORT_AGENT",
        message: `Chamado registrado com sucesso sob o protocolo ${generateProtocolNumber()}. Nossa equipe de atendimento responderá em até 24 horas úteis no e-mail ${input.userEmail}.`,
        timestamp: now,
      },
    ],
  };

  const existing = await getAllSupportTickets();
  existing.unshift(ticket);
  await AsyncStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(existing));

  return ticket;
}

export async function getAllSupportTickets(): Promise<SupportTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
  const all = await getAllSupportTickets();
  return all.filter((t) => t.userId === userId);
}

export async function reportInappropriateContent(input: {
  reportedByUserId: string;
  reportedTargetId: string;
  targetType: ContentReport["targetType"];
  reason: ContentReport["reason"];
  details?: string;
}): Promise<ContentReport> {
  const report: ContentReport = {
    id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reportedByUserId: input.reportedByUserId,
    reportedTargetId: input.reportedTargetId,
    targetType: input.targetType,
    reason: input.reason,
    details: input.details,
    status: "pending_review",
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = await AsyncStorage.getItem(CONTENT_REPORTS_STORAGE_KEY);
    const list: ContentReport[] = raw ? JSON.parse(raw) : [];
    list.unshift(report);
    await AsyncStorage.setItem(CONTENT_REPORTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Non-blocking
  }

  return report;
}

export async function blockUser(blockerUserId: string, blockedUserId: string, reason?: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(BLOCKED_USERS_STORAGE_KEY);
    const list: BlockedUserRecord[] = raw ? JSON.parse(raw) : [];

    const existingIndex = list.findIndex(
      (b) => b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId
    );

    if (existingIndex === -1) {
      list.push({
        blockerUserId,
        blockedUserId,
        blockedAt: new Date().toISOString(),
        reason,
      });
      await AsyncStorage.setItem(BLOCKED_USERS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Non-blocking
  }
}

export async function getBlockedUserIds(blockerUserId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOCKED_USERS_STORAGE_KEY);
    if (!raw) return [];
    const list: BlockedUserRecord[] = JSON.parse(raw);
    return list.filter((b) => b.blockerUserId === blockerUserId).map((b) => b.blockedUserId);
  } catch {
    return [];
  }
}
