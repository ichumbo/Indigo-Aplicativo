import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEMO_STUDENT, DEMO_TRAINER, createWorkoutNotification, NotificationType } from "@/services/feedback-store";

export type MessageSenderRole = "STUDENT" | "TRAINER";

export type MessageTag = "duvida" | "dor" | "treino" | "ajuste" | "geral";

export type MessageMediaType = "image" | "audio" | "video";

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: MessageSenderRole;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverRole: MessageSenderRole;
  text: string;
  tag?: MessageTag;
  mediaType?: MessageMediaType;
  mediaUrl?: string;
  mediaDurationSeconds?: number;
  mediaThumbnailUrl?: string;
  read: boolean;
  createdAt: string;
};

export type Conversation = {
  id: string;
  trainerId: string;
  trainerName: string;
  trainerAvatar?: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  lastMessage?: ChatMessage;
  unreadForStudent: number;
  unreadForTrainer: number;
  updatedAt: string;
};

type ChatStoreState = {
  conversations: Record<string, Conversation>;
  messages: Record<string, ChatMessage[]>; // conversationId -> ChatMessage[]
};

const CHAT_STORAGE_KEY = "@indigo/chat-store/v1";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getConversationId(trainerId: string, studentId: string): string {
  return `conv_${trainerId}_${studentId}`;
}

const initialConversationId = getConversationId(DEMO_TRAINER.id, DEMO_STUDENT.id);

const initialMessages: ChatMessage[] = [
  {
    id: "msg-init-1",
    conversationId: initialConversationId,
    senderId: DEMO_TRAINER.id,
    senderName: DEMO_TRAINER.name,
    senderRole: "TRAINER",
    senderAvatar: "https://i.pravatar.cc/150?img=32",
    receiverId: DEMO_STUDENT.id,
    receiverName: DEMO_STUDENT.name,
    receiverRole: "STUDENT",
    text: "Olá, João! Seja muito bem-vindo ao Indigo. Seu plano de treinos já está liberado. Qualquer dúvida ou ajuste que precisar, pode me chamar por aqui!",
    tag: "geral",
    read: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-init-2",
    conversationId: initialConversationId,
    senderId: DEMO_STUDENT.id,
    senderName: DEMO_STUDENT.name,
    senderRole: "STUDENT",
    senderAvatar: DEMO_STUDENT.avatar,
    receiverId: DEMO_TRAINER.id,
    receiverName: DEMO_TRAINER.name,
    receiverRole: "TRAINER",
    text: "Opa, tudo bem professor! Fiz o treino A hoje e correu tudo ótimo. Só fiquei com uma leve dúvida na pegada do Deadlift.",
    tag: "duvida",
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-init-3",
    conversationId: initialConversationId,
    senderId: DEMO_TRAINER.id,
    senderName: DEMO_TRAINER.name,
    senderRole: "TRAINER",
    senderAvatar: "https://i.pravatar.cc/150?img=32",
    receiverId: DEMO_STUDENT.id,
    receiverName: DEMO_STUDENT.name,
    receiverRole: "STUDENT",
    text: "Pode usar a pegada pronada dupla no início para fortalecer o antebraço. Se a carga ficar muito pesada, a pegada mista ou invertida ajuda bastante!",
    tag: "treino",
    read: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-init-4",
    conversationId: initialConversationId,
    senderId: DEMO_STUDENT.id,
    senderName: DEMO_STUDENT.name,
    senderRole: "STUDENT",
    senderAvatar: DEMO_STUDENT.avatar,
    receiverId: DEMO_TRAINER.id,
    receiverName: DEMO_TRAINER.name,
    receiverRole: "TRAINER",
    text: "Perfeito, vou testar na sessão de amanhã! Valeu pela dica!",
    tag: "geral",
    read: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

const initialConversations: Record<string, Conversation> = {
  [initialConversationId]: {
    id: initialConversationId,
    trainerId: DEMO_TRAINER.id,
    trainerName: DEMO_TRAINER.name,
    trainerAvatar: "https://i.pravatar.cc/150?img=32",
    studentId: DEMO_STUDENT.id,
    studentName: DEMO_STUDENT.name,
    studentAvatar: DEMO_STUDENT.avatar,
    lastMessage: initialMessages[initialMessages.length - 1],
    unreadForStudent: 0,
    unreadForTrainer: 0,
    updatedAt: initialMessages[initialMessages.length - 1].createdAt,
  },
};

const defaultState: ChatStoreState = {
  conversations: initialConversations,
  messages: {
    [initialConversationId]: initialMessages,
  },
};

async function readChatState(): Promise<ChatStoreState> {
  try {
    const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(defaultState));
      return defaultState;
    }
    const parsed = JSON.parse(stored) as Partial<ChatStoreState>;
    return {
      conversations: parsed.conversations ?? initialConversations,
      messages: parsed.messages ?? { [initialConversationId]: initialMessages },
    };
  } catch {
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
}

async function writeChatState(state: ChatStoreState) {
  await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Obtém ou inicializa a conversa entre um treinador e um aluno
 */
export async function getOrCreateConversation(
  trainerId: string = DEMO_TRAINER.id,
  studentId: string = DEMO_STUDENT.id,
  trainerName: string = DEMO_TRAINER.name,
  studentName: string = DEMO_STUDENT.name,
  trainerAvatar?: string,
  studentAvatar?: string
): Promise<Conversation> {
  const state = await readChatState();
  const convId = getConversationId(trainerId, studentId);

  if (state.conversations[convId]) {
    return state.conversations[convId];
  }

  const now = new Date().toISOString();
  const newConversation: Conversation = {
    id: convId,
    trainerId,
    trainerName,
    trainerAvatar,
    studentId,
    studentName,
    studentAvatar,
    unreadForStudent: 0,
    unreadForTrainer: 0,
    updatedAt: now,
  };

  const nextState: ChatStoreState = {
    conversations: {
      ...state.conversations,
      [convId]: newConversation,
    },
    messages: {
      ...state.messages,
      [convId]: state.messages[convId] ?? [],
    },
  };

  await writeChatState(nextState);
  return newConversation;
}

/**
 * Lista as mensagens de uma conversa ordenadas da mais antiga para a mais recente
 */
export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const state = await readChatState();
  const messages = state.messages[conversationId] ?? [];
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Lista todas as conversas do treinador
 */
export async function listConversationsForTrainer(
  trainerId: string = DEMO_TRAINER.id
): Promise<Conversation[]> {
  const state = await readChatState();
  const convs = Object.values(state.conversations).filter(
    (c) => c.trainerId === trainerId
  );
  return convs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Envia uma mensagem no chat
 */
export async function sendChatMessage(input: {
  conversationId?: string;
  trainerId?: string;
  studentId?: string;
  senderId: string;
  senderName: string;
  senderRole: MessageSenderRole;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverRole: MessageSenderRole;
  text?: string;
  tag?: MessageTag;
  mediaType?: MessageMediaType;
  mediaUrl?: string;
  mediaDurationSeconds?: number;
  mediaThumbnailUrl?: string;
}): Promise<ChatMessage> {
  const cleanText = (input.text || "").trim();
  if (!cleanText && !input.mediaUrl && !input.mediaType) {
    throw new Error("A mensagem não pode estar vazia.");
  }

  const state = await readChatState();
  const convId =
    input.conversationId ||
    getConversationId(
      input.senderRole === "TRAINER" ? input.senderId : input.receiverId,
      input.senderRole === "STUDENT" ? input.senderId : input.receiverId
    );

  const now = new Date().toISOString();

  const displayText = cleanText || (
    input.mediaType === "image"
      ? "📷 Foto"
      : input.mediaType === "audio"
      ? "🎙️ Mensagem de voz"
      : input.mediaType === "video"
      ? "🎥 Vídeo"
      : ""
  );

  const newMessage: ChatMessage = {
    id: makeId("msg"),
    conversationId: convId,
    senderId: input.senderId,
    senderName: input.senderName,
    senderRole: input.senderRole,
    senderAvatar: input.senderAvatar,
    receiverId: input.receiverId,
    receiverName: input.receiverName,
    receiverRole: input.receiverRole,
    text: displayText,
    tag: input.tag,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl,
    mediaDurationSeconds: input.mediaDurationSeconds,
    mediaThumbnailUrl: input.mediaThumbnailUrl,
    read: false,
    createdAt: now,
  };

  const existingConv = state.conversations[convId] || {
    id: convId,
    trainerId: input.senderRole === "TRAINER" ? input.senderId : input.receiverId,
    trainerName: input.senderRole === "TRAINER" ? input.senderName : input.receiverName,
    studentId: input.senderRole === "STUDENT" ? input.senderId : input.receiverId,
    studentName: input.senderRole === "STUDENT" ? input.senderName : input.receiverName,
    unreadForStudent: 0,
    unreadForTrainer: 0,
    updatedAt: now,
  };

  const isSentByStudent = input.senderRole === "STUDENT";

  const updatedConv: Conversation = {
    ...existingConv,
    lastMessage: newMessage,
    unreadForStudent: isSentByStudent
      ? existingConv.unreadForStudent
      : (existingConv.unreadForStudent || 0) + 1,
    unreadForTrainer: isSentByStudent
      ? (existingConv.unreadForTrainer || 0) + 1
      : existingConv.unreadForTrainer,
    updatedAt: now,
  };

  const convMessages = state.messages[convId] ?? [];
  const nextMessages = [...convMessages, newMessage];

  const nextState: ChatStoreState = {
    conversations: {
      ...state.conversations,
      [convId]: updatedConv,
    },
    messages: {
      ...state.messages,
      [convId]: nextMessages,
    },
  };

  await writeChatState(nextState);

  // Cria notificação no feedback-store para alertar o destinatário
  try {
    await createWorkoutNotification({
      userId: input.receiverId,
      audience: input.receiverRole === "STUDENT" ? "student" : "trainer",
      title:
        input.senderRole === "TRAINER"
          ? `Mensagem de ${input.senderName}`
          : `Nova mensagem de ${input.senderName}`,
      message: cleanText.length > 80 ? `${cleanText.slice(0, 77)}...` : cleanText,
      type: "update",
    });
  } catch {
    // Silently continue if notification fails
  }

  return newMessage;
}

/**
 * Marca as mensagens de uma conversa como lidas pelo leitor
 */
export async function markConversationAsRead(
  conversationId: string,
  readerUserId: string
): Promise<void> {
  const state = await readChatState();
  const conv = state.conversations[conversationId];
  if (!conv) return;

  const isStudent = conv.studentId === readerUserId;
  const isTrainer = conv.trainerId === readerUserId;

  const messages = (state.messages[conversationId] ?? []).map((m) => {
    if (m.receiverId === readerUserId && !m.read) {
      return { ...m, read: true };
    }
    return m;
  });

  const updatedConv: Conversation = {
    ...conv,
    unreadForStudent: isStudent ? 0 : conv.unreadForStudent,
    unreadForTrainer: isTrainer ? 0 : conv.unreadForTrainer,
  };

  await writeChatState({
    conversations: {
      ...state.conversations,
      [conversationId]: updatedConv,
    },
    messages: {
      ...state.messages,
      [conversationId]: messages,
    },
  });
}

/**
 * Obtém contagem total de mensagens não lidas para um usuário
 */
export async function getUnreadChatCountForUser(
  userId: string,
  role: MessageSenderRole
): Promise<number> {
  const state = await readChatState();
  const convs = Object.values(state.conversations);

  if (role === "STUDENT") {
    return convs
      .filter((c) => c.studentId === userId)
      .reduce((sum, c) => sum + (c.unreadForStudent || 0), 0);
  }

  return convs
    .filter((c) => c.trainerId === userId)
    .reduce((sum, c) => sum + (c.unreadForTrainer || 0), 0);
}

/**
 * Permite ao treinador enviar um aviso/comunicado formal para o aluno ou lista de alunos
 */
export async function sendTrainerAnnouncement(input: {
  trainerId?: string;
  trainerName?: string;
  studentId?: string; // se undefined, envia para DEMO_STUDENT
  studentName?: string;
  title: string;
  message: string;
  type?: NotificationType;
  category?: string;
}): Promise<void> {
  const targetStudentId = input.studentId || DEMO_STUDENT.id;
  const targetStudentName = input.studentName || DEMO_STUDENT.name;
  const tId = input.trainerId || DEMO_TRAINER.id;
  const tName = input.trainerName || DEMO_TRAINER.name;

  // 1. Cria a notificação oficial
  await createWorkoutNotification({
    userId: targetStudentId,
    audience: "student",
    title: input.title,
    message: input.message,
    type: input.type || "update",
  });

  // 2. Também envia no chat como mensagem formal do treinador
  await sendChatMessage({
    trainerId: tId,
    studentId: targetStudentId,
    senderId: tId,
    senderName: tName,
    senderRole: "TRAINER",
    receiverId: targetStudentId,
    receiverName: targetStudentName,
    receiverRole: "STUDENT",
    text: `📢 **${input.title}**\n\n${input.message}`,
    tag: "geral",
  });
}

/**
 * Reseta o store de chat para testes
 */
export async function resetChatStoreForTests() {
  await writeChatState(defaultState);
}
