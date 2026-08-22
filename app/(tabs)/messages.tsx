import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import {
  ChatMessage,
  Conversation,
  MessageTag,
  getOrCreateConversation,
  listConversationsForTrainer,
  listMessages,
  markConversationAsRead,
  sendChatMessage,
  sendTrainerAnnouncement,
} from "@/services/chat-store";
import {
  AppNotification,
  DEMO_STUDENT,
  DEMO_TRAINER,
  formatRelativeTime,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/feedback-store";
import { getWhatsAppUrl } from "@/services/student-profile-store";

type MainTab = "chat" | "notifications";

type QuickPrompt = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  text: string;
  tag: MessageTag;
};

const QUICK_STUDENT_PROMPTS: QuickPrompt[] = [
  {
    icon: "help-circle-outline",
    label: "Dúvida de Treino",
    text: "Olá Personal! Fiquei com uma dúvida na execução do exercício de hoje.",
    tag: "duvida",
  },
  {
    icon: "alert-circle-outline",
    label: "Relato de Dor",
    text: "Oi professor! Senti um desconforto articular durante o treino.",
    tag: "dor",
  },
  {
    icon: "barbell-outline",
    label: "Ajuste de Carga",
    text: "Professor, achei a carga leve/pesada. Posso ajustar na próxima série?",
    tag: "ajuste",
  },
  {
    icon: "calendar-outline",
    label: "Reavaliação Física",
    text: "Olá! Gostaria de agendar a data da minha próxima reavaliação física.",
    tag: "geral",
  },
];

const QUICK_TRAINER_REPLIES = [
  { icon: "checkmark-circle-outline" as const, text: "Excelente execução! Pode manter o ritmo na próxima série." },
  { icon: "arrow-down-circle-outline" as const, text: "Pode reduzir a carga em 10% para priorizar a técnica." },
  { icon: "shield-checkmark-outline" as const, text: "Mantenha as escápulas aduzidas e o core firme no movimento." },
  { icon: "calendar-outline" as const, text: "Vamos alinhar os novos ajustes na sua próxima reavaliação!" },
  { icon: "trending-up-outline" as const, text: "Ótima evolução esta semana! Parabéns pela consistência." },
];

export default function MessagesScreen() {
  const layout = useResponsiveLayout();
  const params = useLocalSearchParams<{ studentId?: string; tab?: string }>();
  const { session, loadingSession } = useCurrentSession();

  const isTrainer = session?.user.role === "TRAINER";

  const tabBarWidth = Math.min(
    Math.max(0, layout.width - layout.tabBarHorizontalMargin * 2),
    layout.contentMaxWidth
  );

  // Tab State
  const [activeTab, setActiveTab] = useState<MainTab>(
    params.tab === "notifications" ? "notifications" : "chat"
  );

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<
    "all" | "unread" | "workout" | "update"
  >("all");

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [trainerConversations, setTrainerConversations] = useState<Conversation[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    params.studentId || DEMO_STUDENT.id
  );

  // Input State
  const [inputText, setInputText] = useState("");
  const [selectedTag, setSelectedTag] = useState<MessageTag | undefined>(undefined);
  const [sending, setSending] = useState(false);

  // Trainer Announcement Modal
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState<"all" | "selected">("selected");
  const [announcementCategory, setAnnouncementCategory] = useState<
    "workout" | "reminder" | "update"
  >("update");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Loading & Refresh
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const loadData = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Notificações
      const notifs = await listNotificationsForUser(session.user.id);
      setNotifications(notifs);

      // 2. Chat
      if (session.user.role === "TRAINER") {
        const convs = await listConversationsForTrainer(session.user.id);
        setTrainerConversations(convs);

        const targetId = selectedStudentId || DEMO_STUDENT.id;
        const conv = await getOrCreateConversation(
          session.user.id,
          targetId,
          session.user.name,
          DEMO_STUDENT.name,
          session.user.avatar,
          DEMO_STUDENT.avatar
        );
        setCurrentConversation(conv);

        const msgs = await listMessages(conv.id);
        setMessages(msgs);
        await markConversationAsRead(conv.id, session.user.id);
      } else {
        // Aluno
        const trainerId = session.user.trainerId || DEMO_TRAINER.id;
        const conv = await getOrCreateConversation(
          trainerId,
          session.user.id,
          DEMO_TRAINER.name,
          session.user.name,
          "https://i.pravatar.cc/150?img=32",
          session.user.avatar || DEMO_STUDENT.avatar
        );
        setCurrentConversation(conv);

        const msgs = await listMessages(conv.id);
        setMessages(msgs);
        await markConversationAsRead(conv.id, session.user.id);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStudentId, session]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (params.studentId) {
      setSelectedStudentId(params.studentId);
    }
  }, [params.studentId]);

  const handleSendMessage = async (customText?: string, customTag?: MessageTag) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !session || !currentConversation) return;

    const tagToUse = customTag || selectedTag;

    setSending(true);
    try {
      const isStudentSender = session.user.role === "STUDENT";
      const receiverId = isStudentSender
        ? currentConversation.trainerId
        : currentConversation.studentId;
      const receiverName = isStudentSender
        ? currentConversation.trainerName
        : currentConversation.studentName;
      const receiverRole = isStudentSender ? "TRAINER" : "STUDENT";

      const newMsg = await sendChatMessage({
        conversationId: currentConversation.id,
        senderId: session.user.id,
        senderName: session.user.name,
        senderRole: session.user.role === "STUDENT" ? "STUDENT" : "TRAINER",
        senderAvatar: session.user.avatar,
        receiverId,
        receiverName,
        receiverRole,
        text: textToSend,
        tag: tagToUse,
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText("");
      setSelectedTag(undefined);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch {
      // Ignore
    } finally {
      setSending(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim() || !session) return;

    setSendingAnnouncement(true);
    try {
      await sendTrainerAnnouncement({
        trainerId: session.user.id,
        trainerName: session.user.name,
        studentId: announcementTarget === "selected" ? selectedStudentId : DEMO_STUDENT.id,
        studentName: currentConversation?.studentName || DEMO_STUDENT.name,
        title: announcementTitle.trim(),
        message: announcementBody.trim(),
        type: announcementCategory,
      });

      setAnnouncementModalVisible(false);
      setAnnouncementTitle("");
      setAnnouncementBody("");
      await loadData(true);
    } catch {
      // Ignore
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const markAllNotifs = async () => {
    if (!session) return;
    await markAllNotificationsRead(session.user.id);
    await loadData(true);
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (!session) return;
    await markNotificationRead(notif.id, session.user.id);

    if (notif.feedbackId) {
      router.push({
        pathname: "/feedback-detail" as never,
        params: {
          id: notif.feedbackId,
          role: session.user.role === "STUDENT" ? "student" : "trainer",
          notificationId: notif.id,
        },
      });
      return;
    }

    if (notif.type === "update" || notif.type === "workout") {
      setActiveTab("chat");
      return;
    }

    await loadData(true);
  };

  const openPartnerWhatsApp = () => {
    const whatsappUrl = getWhatsAppUrl("5511999998888");
    if (whatsappUrl) void Linking.openURL(whatsappUrl);
  };

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (notificationFilter === "unread") return !n.read;
      if (notificationFilter === "workout") return n.type === "workout";
      if (notificationFilter === "update") return n.type === "update" || n.type === "feedback-response";
      return true;
    });
  }, [notificationFilter, notifications]);

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" size="large" />
        <Text style={styles.centerText}>Carregando mensagens...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* HEADER PRINCIPAL */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.topPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Mensagens</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {isTrainer
                ? "Canal direto com alunos"
                : "Canal direto com seu personal"}
            </Text>
          </View>

          {isTrainer && (
            <TouchableOpacity
              style={styles.actionHeaderBtn}
              onPress={() => setAnnouncementModalVisible(true)}
              activeOpacity={0.84}
            >
              <Ionicons name="megaphone-outline" size={13} color="#fff" />
              <Text style={styles.actionHeaderBtnText}>Comunicado</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* TABS SEGMENTADAS MINIMALISTAS */}
        <View style={styles.tabBarWrap}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "chat" && styles.tabButtonActive]}
            onPress={() => setActiveTab("chat")}
            activeOpacity={0.84}
          >
            <Ionicons
              name={activeTab === "chat" ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
              size={15}
              color={activeTab === "chat" ? "#fff" : "#777"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "chat" && styles.tabButtonTextActive,
              ]}
            >
              {isTrainer ? "Conversas" : "Chat"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "notifications" && styles.tabButtonActive]}
            onPress={() => setActiveTab("notifications")}
            activeOpacity={0.84}
          >
            <Ionicons
              name={activeTab === "notifications" ? "notifications" : "notifications-outline"}
              size={15}
              color={activeTab === "notifications" ? "#fff" : "#777"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "notifications" && styles.tabButtonTextActive,
              ]}
            >
              Avisos
            </Text>
            {unreadNotifCount > 0 && (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTEÚDO PRINCIPAL */}
      {activeTab === "chat" ? (
        <View style={styles.chatShell}>
          {/* Seletor horizontal de alunos para o Treinador */}
          {isTrainer && trainerConversations.length > 0 && (
            <View style={styles.studentSelectorRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentSelectorScroll}
              >
                {trainerConversations.map((conv) => {
                  const isSelected = conv.studentId === selectedStudentId;
                  return (
                    <TouchableOpacity
                      key={conv.id}
                      style={[styles.studentChip, isSelected && styles.studentChipSelected]}
                      onPress={() => setSelectedStudentId(conv.studentId)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: conv.studentAvatar || DEMO_STUDENT.avatar }}
                        style={styles.studentChipAvatar}
                      />
                      <Text
                        style={[styles.studentChipName, isSelected && styles.studentChipNameSelected]}
                        numberOfLines={1}
                      >
                        {conv.studentName}
                      </Text>
                      {conv.unreadForTrainer > 0 && (
                        <View style={styles.studentChipBadge}>
                          <Text style={styles.studentChipBadgeText}>{conv.unreadForTrainer}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* CARD DO PERSONAL TRAINER (Para o Aluno) - MINIMALISTA E PROFISSIONAL */}
          {!isTrainer && currentConversation && (
            <View style={styles.partnerCardClean}>
              <View style={styles.partnerAvatarFrame}>
                <Image
                  source={{ uri: currentConversation.trainerAvatar || "https://i.pravatar.cc/150?img=32" }}
                  style={styles.partnerAvatarImg}
                />
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.partnerTextCol}>
                <View style={styles.partnerTitleRow}>
                  <Text style={styles.partnerNameText}>{currentConversation.trainerName}</Text>
                  <View style={styles.verifiedBadgeClean}>
                    <Ionicons name="shield-checkmark" size={11} color="#D90000" />
                    <Text style={styles.verifiedBadgeCleanText}>Certificado</Text>
                  </View>
                </View>
                <Text style={styles.partnerRoleSubtitle}>
                  Personal Trainer • <Text style={styles.onlineHighlight}>Online</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles.partnerQuickActionBtn}
                onPress={openPartnerWhatsApp}
                activeOpacity={0.8}
                accessibilityLabel="WhatsApp"
              >
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              </TouchableOpacity>
            </View>
          )}

          {/* CHIPS DE AÇÃO / SUGESTÕES RÁPIDAS (100% ÍCONES, ZERO EMOJIS) */}
          <View style={styles.quickPromptsBarClean}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptsScrollClean}
            >
              {!isTrainer
                ? QUICK_STUDENT_PROMPTS.map((prompt, idx) => {
                    const isSelected = selectedTag === prompt.tag;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.quickActionPill,
                          isSelected && styles.quickActionPillActive,
                        ]}
                        onPress={() => {
                          setInputText(prompt.text);
                          setSelectedTag(prompt.tag);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={prompt.icon}
                          size={14}
                          color={isSelected ? "#fff" : "#D90000"}
                        />
                        <Text
                          style={[
                            styles.quickActionPillText,
                            isSelected && styles.quickActionPillTextActive,
                          ]}
                        >
                          {prompt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : QUICK_TRAINER_REPLIES.map((reply, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickActionPill}
                      onPress={() => handleSendMessage(reply.text, "geral")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={reply.icon} size={14} color="#D90000" />
                      <Text style={styles.quickActionPillText}>{reply.text}</Text>
                    </TouchableOpacity>
                  ))}
            </ScrollView>
          </View>

          {/* TIMELINE DE MENSAGENS */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessageBubble
                message={item}
                isMine={item.senderId === session?.user.id}
              />
            )}
            contentContainerStyle={[
              styles.messagesScrollList,
              { paddingBottom: layout.tabBarContentPadding + 95 },
            ]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadData(true)}
                tintColor="#D90000"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyMessagesBox}>
                <Ionicons name="chatbubbles-outline" size={38} color="#444" />
                <Text style={styles.emptyTitle}>Nenhuma mensagem ainda</Text>
                <Text style={styles.emptySubtitle}>
                  {isTrainer
                    ? "Envie orientações e ajustes para seu aluno."
                    : "Envie dúvidas, relatos de treino ou agende avaliações com seu personal."}
                </Text>
              </View>
            }
          />

          {/* BARRA INFERIOR DE DIGITAÇÃO MINIMALISTA */}
          <View
            style={[
              styles.inputBarContainerClean,
              {
                bottom: layout.tabBarHeight + layout.tabBarBottom + 14,
                width: tabBarWidth,
                left: "50%",
                transform: [{ translateX: -tabBarWidth / 2 }],
              },
            ]}
          >
            {selectedTag && (
              <View style={styles.activeTagRow}>
                <View style={styles.activeTagPill}>
                  <Ionicons name="pricetag" size={11} color="#D90000" />
                  <Text style={styles.activeTagLabel}>Tag: {selectedTag.toUpperCase()}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedTag(undefined)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#888" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputFlexRow}>
              <TextInput
                style={styles.textInputClean}
                placeholder={
                  isTrainer
                    ? "Escreva uma resposta ou orientação..."
                    : "Digite sua dúvida ou mensagem..."
                }
                placeholderTextColor="#555"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.sendButtonClean,
                  (!inputText.trim() || sending) && styles.sendButtonCleanDisabled,
                ]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || sending}
                activeOpacity={0.84}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* ABA DE AVISOS E NOTIFICAÇÕES */
        <ScrollView
          contentContainerStyle={[
            styles.notifsScrollContent,
            {
              paddingHorizontal: layout.horizontalPadding,
              paddingBottom: layout.tabBarContentPadding,
              maxWidth: layout.contentMaxWidth,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor="#D90000"
            />
          }
        >
          <View style={styles.notifFilterRowClean}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.notifFilterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.notifFilterChipClean,
                  notificationFilter === "all" && styles.notifFilterChipCleanActive,
                ]}
                onPress={() => setNotificationFilter("all")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.notifFilterTextClean,
                    notificationFilter === "all" && styles.notifFilterTextCleanActive,
                  ]}
                >
                  Todas ({notifications.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.notifFilterChipClean,
                  notificationFilter === "unread" && styles.notifFilterChipCleanActive,
                ]}
                onPress={() => setNotificationFilter("unread")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.notifFilterTextClean,
                    notificationFilter === "unread" && styles.notifFilterTextCleanActive,
                  ]}
                >
                  Não Lidas ({unreadNotifCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.notifFilterChipClean,
                  notificationFilter === "workout" && styles.notifFilterChipCleanActive,
                ]}
                onPress={() => setNotificationFilter("workout")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.notifFilterTextClean,
                    notificationFilter === "workout" && styles.notifFilterTextCleanActive,
                  ]}
                >
                  Treinos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.notifFilterChipClean,
                  notificationFilter === "update" && styles.notifFilterChipCleanActive,
                ]}
                onPress={() => setNotificationFilter("update")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.notifFilterTextClean,
                    notificationFilter === "update" && styles.notifFilterTextCleanActive,
                  ]}
                >
                  Avisos do Personal
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.markAllBtnClean}
              onPress={markAllNotifs}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={14} color="#D90000" />
              <Text style={styles.markAllBtnTextClean}>Lidas</Text>
            </TouchableOpacity>
          </View>

          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyCardClean}>
              <Ionicons name="notifications-off-outline" size={34} color="#444" />
              <Text style={styles.emptyTitle}>Nenhum aviso encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Avisos de treinos, respostas e lembretes aparecerão aqui.
              </Text>
            </View>
          ) : null}

          {filteredNotifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[
                styles.notificationCardClean,
                !notif.read && styles.notificationCardCleanUnread,
              ]}
              onPress={() => handleNotificationPress(notif)}
              activeOpacity={0.84}
            >
              <View style={styles.notifIconBoxClean}>
                <Ionicons
                  name={getNotificationIcon(notif.type)}
                  size={18}
                  color="#D90000"
                />
              </View>
              <View style={styles.notifContentClean}>
                <Text style={styles.notifTitleClean}>{notif.title}</Text>
                <Text style={styles.notifMessageClean}>{notif.message}</Text>
                <Text style={styles.notifTimeClean}>
                  {formatRelativeTime(notif.createdAt)}
                </Text>
              </View>
              {!notif.read && <View style={styles.unreadDotClean} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* MODAL: NOVO COMUNICADO / NOTIFICAÇÃO (PARA O TREINADOR) */}
      <Modal
        visible={announcementModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnnouncementModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardClean}>
            <View style={styles.modalHeaderClean}>
              <View style={styles.modalHeaderTitleBlock}>
                <Ionicons name="megaphone-outline" size={18} color="#D90000" />
                <Text style={styles.modalTitleClean}>Novo Comunicado</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAnnouncementModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitleClean}>
              Envie um comunicado oficial com notificação direta para o aluno.
            </Text>

            {/* Destinatário */}
            <Text style={styles.inputLabelClean}>Destinatário</Text>
            <View style={styles.segmentedTargetRowClean}>
              <TouchableOpacity
                style={[
                  styles.segmentBtnClean,
                  announcementTarget === "selected" && styles.segmentBtnCleanActive,
                ]}
                onPress={() => setAnnouncementTarget("selected")}
              >
                <Text
                  style={[
                    styles.segmentBtnTextClean,
                    announcementTarget === "selected" && styles.segmentBtnTextCleanActive,
                  ]}
                >
                  Aluno Atual ({currentConversation?.studentName || "João Silva"})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtnClean,
                  announcementTarget === "all" && styles.segmentBtnCleanActive,
                ]}
                onPress={() => setAnnouncementTarget("all")}
              >
                <Text
                  style={[
                    styles.segmentBtnTextClean,
                    announcementTarget === "all" && styles.segmentBtnTextCleanActive,
                  ]}
                >
                  Todos os Alunos
                </Text>
              </TouchableOpacity>
            </View>

            {/* Categoria com Ícones */}
            <Text style={styles.inputLabelClean}>Categoria</Text>
            <View style={styles.segmentedCategoryRowClean}>
              <TouchableOpacity
                style={[
                  styles.categoryBtnClean,
                  announcementCategory === "update" && styles.categoryBtnCleanActive,
                ]}
                onPress={() => setAnnouncementCategory("update")}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={14}
                  color={announcementCategory === "update" ? "#fff" : "#888"}
                />
                <Text
                  style={[
                    styles.categoryBtnTextClean,
                    announcementCategory === "update" && styles.categoryBtnTextCleanActive,
                  ]}
                >
                  Geral
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryBtnClean,
                  announcementCategory === "workout" && styles.categoryBtnCleanActive,
                ]}
                onPress={() => setAnnouncementCategory("workout")}
              >
                <Ionicons
                  name="barbell-outline"
                  size={14}
                  color={announcementCategory === "workout" ? "#fff" : "#888"}
                />
                <Text
                  style={[
                    styles.categoryBtnTextClean,
                    announcementCategory === "workout" && styles.categoryBtnTextCleanActive,
                  ]}
                >
                  Treino
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryBtnClean,
                  announcementCategory === "reminder" && styles.categoryBtnCleanActive,
                ]}
                onPress={() => setAnnouncementCategory("reminder")}
              >
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={announcementCategory === "reminder" ? "#fff" : "#888"}
                />
                <Text
                  style={[
                    styles.categoryBtnTextClean,
                    announcementCategory === "reminder" && styles.categoryBtnTextCleanActive,
                  ]}
                >
                  Lembrete
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabelClean}>Título do Comunicado</Text>
            <TextInput
              style={styles.modalInputClean}
              placeholder="Ex: Novo ciclo de treino liberado"
              placeholderTextColor="#555"
              value={announcementTitle}
              onChangeText={setAnnouncementTitle}
            />

            <Text style={styles.inputLabelClean}>Mensagem</Text>
            <TextInput
              style={[styles.modalInputClean, styles.modalInputMultilineClean]}
              placeholder="Descreva as instruções detalhadas..."
              placeholderTextColor="#555"
              value={announcementBody}
              onChangeText={setAnnouncementBody}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[
                styles.modalSubmitButtonClean,
                (!announcementTitle.trim() || !announcementBody.trim() || sendingAnnouncement) &&
                  styles.modalSubmitButtonCleanDisabled,
              ]}
              onPress={handleSendAnnouncement}
              disabled={!announcementTitle.trim() || !announcementBody.trim() || sendingAnnouncement}
              activeOpacity={0.84}
            >
              {sendingAnnouncement ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.modalSubmitButtonTextClean}>Enviar Notificação</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/**
 * Bubble de Mensagem Minimalista e Profissional
 */
function ChatMessageBubble({
  message,
  isMine,
}: {
  message: ChatMessage;
  isMine: boolean;
}) {
  const isTrainer = message.senderRole === "TRAINER";

  const getTagInfo = (tag?: MessageTag) => {
    if (tag === "dor") return { label: "Relato de Dor", icon: "alert-circle-outline" as const, color: "#ff4444" };
    if (tag === "duvida") return { label: "Dúvida de Treino", icon: "help-circle-outline" as const, color: "#3b82f6" };
    if (tag === "ajuste") return { label: "Ajuste de Carga", icon: "barbell-outline" as const, color: "#eab308" };
    if (tag === "treino") return { label: "Orientação", icon: "fitness-outline" as const, color: "#10b981" };
    return null;
  };

  const tagInfo = getTagInfo(message.tag);

  return (
    <View
      style={[
        styles.bubbleContainer,
        isMine ? styles.bubbleContainerMine : styles.bubbleContainerOther,
      ]}
    >
      {!isMine && (
        <Image
          source={{
            uri:
              message.senderAvatar ||
              (isTrainer ? "https://i.pravatar.cc/150?img=32" : DEMO_STUDENT.avatar),
          }}
          style={styles.bubbleAvatarImg}
        />
      )}

      <View
        style={[
          styles.bubbleBox,
          isMine ? styles.bubbleBoxMine : styles.bubbleBoxOther,
        ]}
      >
        {!isMine && (
          <View style={styles.bubbleHeaderRow}>
            <Text style={styles.bubbleSenderName}>{message.senderName}</Text>
            {isTrainer && (
              <View style={styles.trainerTagBadge}>
                <Text style={styles.trainerTagBadgeText}>Personal</Text>
              </View>
            )}
          </View>
        )}

        {tagInfo && (
          <View style={[styles.bubbleTagPill, { borderColor: `${tagInfo.color}40`, backgroundColor: `${tagInfo.color}15` }]}>
            <Ionicons name={tagInfo.icon} size={11} color={tagInfo.color} />
            <Text style={[styles.bubbleTagPillText, { color: tagInfo.color }]}>
              {tagInfo.label}
            </Text>
          </View>
        )}

        <Text
          style={[
            styles.bubbleTextClean,
            isMine ? styles.bubbleTextCleanMine : styles.bubbleTextCleanOther,
          ]}
        >
          {message.text}
        </Text>

        <View style={styles.bubbleMetaFooter}>
          <Text style={styles.bubbleTimestamp}>{formatRelativeTime(message.createdAt)}</Text>
          {isMine && (
            <Ionicons
              name={message.read ? "checkmark-done" : "checkmark"}
              size={13}
              color={message.read ? "#D90000" : "#666"}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "feedback-response") return "chatbubble-ellipses-outline";
  if (type === "feedback-received") return "chatbubbles-outline";
  if (type === "workout") return "barbell-outline";
  if (type === "achievement") return "trophy-outline";
  if (type === "reminder") return "time-outline";
  return "notifications-outline";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  header: {
    width: "100%",
    alignSelf: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerTextBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#777",
    fontSize: 11.5,
    marginTop: 1,
  },
  actionHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D90000",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionHeaderBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  tabBarWrap: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 11,
    padding: 3,
    borderWidth: 1,
    borderColor: "#222",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: "#D90000",
  },
  tabButtonText: {
    color: "#777",
    fontSize: 11.5,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  badgePill: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgePillText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  chatShell: {
    flex: 1,
  },
  studentSelectorRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  studentSelectorScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141414",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
  },
  studentChipSelected: {
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderColor: "#D90000",
  },
  studentChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  studentChipName: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  studentChipNameSelected: {
    color: "#fff",
  },
  studentChipBadge: {
    backgroundColor: "#D90000",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  studentChipBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  partnerCardClean: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  partnerAvatarFrame: {
    position: "relative",
  },
  partnerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D90000",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
    borderWidth: 1.5,
    borderColor: "#141414",
  },
  partnerTextCol: {
    flex: 1,
  },
  partnerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  partnerNameText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  verifiedBadgeClean: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeCleanText: {
    color: "#D90000",
    fontSize: 9,
    fontWeight: "800",
  },
  partnerRoleSubtitle: {
    color: "#777",
    fontSize: 11,
    marginTop: 2,
  },
  onlineHighlight: {
    color: "#10b981",
    fontWeight: "700",
  },
  partnerQuickActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  quickPromptsBarClean: {
    paddingVertical: 8,
  },
  quickPromptsScrollClean: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#141414",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
  },
  quickActionPillActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  quickActionPillText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "700",
  },
  quickActionPillTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  messagesScrollList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bubbleContainer: {
    flexDirection: "row",
    marginVertical: 4,
    maxWidth: "86%",
  },
  bubbleContainerMine: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  bubbleContainerOther: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
    gap: 8,
  },
  bubbleAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 4,
  },
  bubbleBox: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleBoxMine: {
    backgroundColor: "#1a1414",
    borderColor: "rgba(217, 0, 0, 0.25)",
    borderTopRightRadius: 3,
  },
  bubbleBoxOther: {
    backgroundColor: "#141414",
    borderColor: "#222",
    borderTopLeftRadius: 3,
  },
  bubbleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  bubbleSenderName: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  trainerTagBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  trainerTagBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
  bubbleTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  bubbleTagPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  bubbleTextClean: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  bubbleTextCleanMine: {
    color: "#fff",
  },
  bubbleTextCleanOther: {
    color: "#e2e2e2",
  },
  bubbleMetaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 5,
  },
  bubbleTimestamp: {
    color: "#666",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyMessagesBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  emptySubtitle: {
    color: "#777",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },
  inputBarContainerClean: {
    position: "absolute",
    backgroundColor: "#141414",
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: "#262626",
  },
  activeTagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activeTagLabel: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "800",
  },
  inputFlexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  textInputClean: {
    flex: 1,
    color: "#fff",
    fontSize: 13.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxHeight: 80,
  },
  sendButtonClean: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonCleanDisabled: {
    backgroundColor: "#222",
  },
  notifsScrollContent: {
    paddingTop: 12,
  },
  notifFilterRowClean: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  notifFilterScroll: {
    gap: 6,
  },
  notifFilterChipClean: {
    backgroundColor: "#141414",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
  },
  notifFilterChipCleanActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  notifFilterTextClean: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
  },
  notifFilterTextCleanActive: {
    color: "#fff",
    fontWeight: "800",
  },
  markAllBtnClean: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#141414",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
  },
  markAllBtnTextClean: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyCardClean: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  notificationCardClean: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    padding: 13,
    marginBottom: 8,
    position: "relative",
  },
  notificationCardCleanUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#D90000",
    backgroundColor: "#181414",
  },
  notifIconBoxClean: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  notifContentClean: {
    flex: 1,
  },
  notifTitleClean: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  notifMessageClean: {
    color: "#888",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  notifTimeClean: {
    color: "#555",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  unreadDotClean: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D90000",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCardClean: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  modalHeaderClean: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitleClean: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitleClean: {
    color: "#777",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 14,
  },
  inputLabelClean: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  segmentedTargetRowClean: {
    flexDirection: "row",
    gap: 6,
  },
  segmentedCategoryRowClean: {
    flexDirection: "row",
    gap: 6,
  },
  segmentBtnClean: {
    flex: 1,
    backgroundColor: "#101010",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
  },
  segmentBtnCleanActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  segmentBtnTextClean: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
  },
  segmentBtnTextCleanActive: {
    color: "#fff",
    fontWeight: "800",
  },
  categoryBtnClean: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#101010",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
  categoryBtnCleanActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  categoryBtnTextClean: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
  },
  categoryBtnTextCleanActive: {
    color: "#fff",
    fontWeight: "800",
  },
  modalInputClean: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#fff",
    fontSize: 13,
  },
  modalInputMultilineClean: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  modalSubmitButtonClean: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 16,
  },
  modalSubmitButtonCleanDisabled: {
    backgroundColor: "#222",
  },
  modalSubmitButtonTextClean: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerText: {
    color: "#777",
    fontSize: 13,
    marginTop: 10,
  },
});
