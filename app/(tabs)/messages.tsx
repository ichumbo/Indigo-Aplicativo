import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { UserAvatar } from "@/components/user-avatar";
import {
  ChatMessage,
  Conversation,
  MessageMediaType,
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

  // Input & Media State
  const [inputText, setInputText] = useState("");
  const [selectedTag, setSelectedTag] = useState<MessageTag | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);

  // Audio Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Full Screen Media Preview Modal
  const [previewMedia, setPreviewMedia] = useState<{
    type: "image" | "video";
    url: string;
    caption?: string;
  } | null>(null);

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
          undefined,
          session.user.avatar || undefined
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

  // Audio timer effect
  useEffect(() => {
    if (isRecordingAudio) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecordingAudio]);

  const handleSendMessage = async (
    customText?: string,
    customTag?: MessageTag,
    mediaPayload?: {
      mediaType: MessageMediaType;
      mediaUrl: string;
      mediaDurationSeconds?: number;
      mediaThumbnailUrl?: string;
    }
  ) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !mediaPayload && !inputText) return;
    if (!session || !currentConversation) return;

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
        mediaType: mediaPayload?.mediaType,
        mediaUrl: mediaPayload?.mediaUrl,
        mediaDurationSeconds: mediaPayload?.mediaDurationSeconds,
        mediaThumbnailUrl: mediaPayload?.mediaThumbnailUrl,
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

  // Handlers for Photos and Videos
  const handlePickPhoto = async (fromCamera: boolean) => {
    setAttachmentModalVisible(false);
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso à câmera para tirar foto.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          await handleSendMessage(inputText, selectedTag, {
            mediaType: "image",
            mediaUrl: result.assets[0].uri,
          });
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso às fotos para selecionar imagem.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          await handleSendMessage(inputText, selectedTag, {
            mediaType: "image",
            mediaUrl: result.assets[0].uri,
          });
        }
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar a imagem.");
    }
  };

  const handlePickVideo = async (fromCamera: boolean) => {
    setAttachmentModalVisible(false);
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso à câmera para gravar vídeo.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          await handleSendMessage(inputText || "Vídeo da Execução", selectedTag, {
            mediaType: "video",
            mediaUrl: result.assets[0].uri,
            mediaDurationSeconds: result.assets[0].duration ? Math.round(result.assets[0].duration / 1000) : 15,
            mediaThumbnailUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
          });
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso aos vídeos para selecionar da galeria.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          await handleSendMessage(inputText || "Vídeo da Execução", selectedTag, {
            mediaType: "video",
            mediaUrl: result.assets[0].uri,
            mediaDurationSeconds: result.assets[0].duration ? Math.round(result.assets[0].duration / 1000) : 15,
            mediaThumbnailUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
          });
        }
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o vídeo.");
    }
  };

  // Audio Recording Handlers
  const handleStartAudioRecording = () => {
    setAttachmentModalVisible(false);
    setIsRecordingAudio(true);
  };

  const handleCancelAudioRecording = () => {
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  const handleFinishAudioRecording = async () => {
    const finalSeconds = Math.max(1, recordingSeconds);
    setIsRecordingAudio(false);
    setRecordingSeconds(0);

    // Envia a mensagem de áudio
    await handleSendMessage("", selectedTag, {
      mediaType: "audio",
      mediaUrl: "mock://audio-recording.m4a",
      mediaDurationSeconds: finalSeconds,
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
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
                <UserAvatar
                  uri={currentConversation.trainerAvatar}
                  size={42}
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

          {/* CHIPS DE AÇÃO / SUGESTÕES RÁPIDAS */}
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

          {/* TIMELINE DE MENSAGENS COM FOTO, ÁUDIO E VÍDEO */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessageBubble
                message={item}
                isMine={item.senderId === session?.user.id}
                onOpenMedia={(type, url, caption) => setPreviewMedia({ type, url, caption })}
              />
            )}
            contentContainerStyle={[
              styles.messagesScrollList,
              { paddingBottom: layout.tabBarContentPadding + 105 },
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
                    ? "Envie orientações, fotos, áudios e vídeos de execução para seu aluno."
                    : "Envie dúvidas, fotos, áudios ou vídeos da sua execução para o personal."}
                </Text>
              </View>
            }
          />

          {/* BARRA INFERIOR DE DIGITAÇÃO / GRAVAÇÃO DE ÁUDIO MINIMALISTA */}
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

            {isRecordingAudio ? (
              /* MODO GRAVAÇÃO DE ÁUDIO AO VIVO */
              <View style={styles.audioRecordingRail}>
                <View style={styles.audioRecDot} />
                <Text style={styles.audioRecTimerText}>
                  Gravando áudio {formatSeconds(recordingSeconds)}
                </Text>

                <View style={styles.audioWaveLines}>
                  {[12, 22, 16, 28, 14, 24, 18, 10].map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.audioWaveBar,
                        { height: h, backgroundColor: i % 2 === 0 ? "#D90000" : "#888" },
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.audioCancelBtn}
                  onPress={handleCancelAudioRecording}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color="#888" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.audioSendBtn}
                  onPress={handleFinishAudioRecording}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              /* MODO INPUT PADRÃO COM BOTÃO DE ANEXOS E MICROFONE */
              <View style={styles.inputFlexRow}>
                {/* Botão de Anexo (Foto / Vídeo / Áudio) */}
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={() => setAttachmentModalVisible(true)}
                  activeOpacity={0.75}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={22} color="#D90000" />
                </TouchableOpacity>

                <TextInput
                  style={styles.textInputClean}
                  placeholder={
                    isTrainer
                      ? "Mensagem ou orientação..."
                      : "Dúvida, relato ou mensagem..."
                  }
                  placeholderTextColor="#555"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />

                {/* Botão de Microfone de Acesso Rápido (se o campo estiver vazio) */}
                {!inputText.trim() ? (
                  <TouchableOpacity
                    style={styles.micQuickBtn}
                    onPress={handleStartAudioRecording}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mic" size={18} color="#fff" />
                  </TouchableOpacity>
                ) : (
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
                )}
              </View>
            )}
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
                    notificationFilter === "unread" && styles.notifFilterChipCleanActive,
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
                    notificationFilter === "workout" && styles.notifFilterChipCleanActive,
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
                    notificationFilter === "update" && styles.notifFilterChipCleanActive,
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
            <View style={styles.emptyNotifsBox}>
              <Ionicons name="notifications-off-outline" size={40} color="#444" />
              <Text style={styles.emptyTitle}>Nenhum aviso encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Avisos e comunicados importantes aparecerão aqui.
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                style={[
                  styles.notifCardClean,
                  !notif.read && styles.notifCardUnreadClean,
                ]}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.notifIconBoxClean,
                    notif.highlightPain && styles.notifIconBoxPain,
                  ]}
                >
                  <Ionicons
                    name={getNotificationIcon(notif.type)}
                    size={16}
                    color={notif.highlightPain ? "#ff4444" : "#D90000"}
                  />
                </View>

                <View style={styles.notifContentClean}>
                  <View style={styles.notifHeaderRowClean}>
                    <Text style={styles.notifTitleClean} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    <Text style={styles.notifTimeClean}>
                      {formatRelativeTime(notif.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.notifMessageClean} numberOfLines={2}>
                    {notif.message}
                  </Text>
                </View>

                {!notif.read && <View style={styles.unreadDotClean} />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL DE ANEXOS PROFISSIONAL (FOTO, ÁUDIO, VÍDEO) */}
      <Modal
        visible={attachmentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.attachModalBackdrop}
          activeOpacity={1}
          onPress={() => setAttachmentModalVisible(false)}
        >
          <View style={styles.attachModalSheet}>
            <View style={styles.attachModalDragHandle} />
            <Text style={styles.attachModalHeaderTitle}>Enviar Mídia no Chat</Text>

            <View style={styles.attachGrid}>
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => handlePickPhoto(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: "#2A1414" }]}>
                  <Ionicons name="camera" size={22} color="#D90000" />
                </View>
                <Text style={styles.attachGridItemLabel}>Tirar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => handlePickPhoto(false)}
                activeOpacity={0.8}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: "#15202B" }]}>
                  <Ionicons name="images" size={22} color="#1E88E5" />
                </View>
                <Text style={styles.attachGridItemLabel}>Fotos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => handlePickVideo(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: "#241B10" }]}>
                  <Ionicons name="videocam" size={22} color="#F59E0B" />
                </View>
                <Text style={styles.attachGridItemLabel}>Gravar Vídeo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => handlePickVideo(false)}
                activeOpacity={0.8}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: "#1B221B" }]}>
                  <Ionicons name="film" size={22} color="#10B981" />
                </View>
                <Text style={styles.attachGridItemLabel}>Vídeos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={handleStartAudioRecording}
                activeOpacity={0.8}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: "#2B172B" }]}>
                  <Ionicons name="mic" size={22} color="#A855F7" />
                </View>
                <Text style={styles.attachGridItemLabel}>Mensagem de Voz</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.attachCancelBtn}
              onPress={() => setAttachmentModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.attachCancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE PREVIEW EM TELA CHEIA PARA FOTO / VÍDEO */}
      <Modal
        visible={previewMedia !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewMedia(null)}
      >
        <View style={styles.mediaViewerOverlay}>
          <TouchableOpacity
            style={styles.mediaViewerCloseBtn}
            onPress={() => setPreviewMedia(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          {previewMedia && (
            <View style={styles.mediaViewerContent}>
              <Image
                source={{ uri: previewMedia.url }}
                style={styles.mediaViewerImage}
                resizeMode="contain"
              />
              {previewMedia.type === "video" && (
                <View style={styles.videoPlayingBadge}>
                  <Ionicons name="play-circle" size={48} color="#D90000" />
                  <Text style={styles.videoPlayingText}>Vídeo de Execução</Text>
                </View>
              )}
              {previewMedia.caption && (
                <Text style={styles.mediaViewerCaption}>{previewMedia.caption}</Text>
              )}
            </View>
          )}
        </View>
      </Modal>

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

            {/* Título */}
            <Text style={styles.inputLabelClean}>Título do Comunicado</Text>
            <TextInput
              style={styles.modalInputClean}
              placeholder="Ex: Ajuste na ficha de treino"
              placeholderTextColor="#555"
              value={announcementTitle}
              onChangeText={setAnnouncementTitle}
            />

            {/* Mensagem */}
            <Text style={styles.inputLabelClean}>Mensagem</Text>
            <TextInput
              style={[styles.modalInputClean, styles.modalInputMultilineClean]}
              placeholder="Digite o conteúdo da notificação..."
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={16} color="#fff" />
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
 * Bubble de Mensagem com Suporte Completo a Foto, Áudio e Vídeo
 */
function ChatMessageBubble({
  message,
  isMine,
  onOpenMedia,
}: {
  message: ChatMessage;
  isMine: boolean;
  onOpenMedia?: (type: "image" | "video", url: string, caption?: string) => void;
}) {
  const isTrainer = message.senderRole === "TRAINER";

  // Audio Playback Simulation State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const durationSec = message.mediaDurationSeconds || 12;

  const togglePlayAudio = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    } else {
      setIsPlayingAudio(true);
      if (audioProgress >= 1) setAudioProgress(0);

      const step = 1 / (durationSec * 10);
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 1) {
            if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + step * playbackSpeed;
        });
      }, 100);
    }
  };

  const toggleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(1.5);
    else if (playbackSpeed === 1.5) setPlaybackSpeed(2);
    else setPlaybackSpeed(1);
  };

  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

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
        <UserAvatar
          uri={message.senderAvatar}
          size={32}
          style={{ marginRight: 8, alignSelf: "flex-end" }}
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

        {/* 1. MENSAGEM COM FOTO */}
        {message.mediaType === "image" && message.mediaUrl && (
          <TouchableOpacity
            style={styles.bubblePhotoCard}
            onPress={() => onOpenMedia?.("image", message.mediaUrl!, message.text)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: message.mediaUrl }} style={styles.bubblePhotoImage} resizeMode="cover" />
            <View style={styles.bubblePhotoOverlayIcon}>
              <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* 2. MENSAGEM COM VÍDEO */}
        {message.mediaType === "video" && (
          <TouchableOpacity
            style={styles.bubbleVideoCard}
            onPress={() =>
              onOpenMedia?.(
                "video",
                message.mediaUrl || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
                message.text
              )
            }
            activeOpacity={0.85}
          >
            <Image
              source={{
                uri:
                  message.mediaThumbnailUrl ||
                  message.mediaUrl ||
                  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
              }}
              style={styles.bubbleVideoThumb}
              resizeMode="cover"
            />
            <View style={styles.bubbleVideoPlayBtn}>
              <Ionicons name="play" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.bubbleVideoBadge}>
              <Ionicons name="videocam" size={11} color="#FFFFFF" />
              <Text style={styles.bubbleVideoBadgeText}>
                {message.mediaDurationSeconds ? `${message.mediaDurationSeconds}s` : "VÍDEO"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 3. MENSAGEM COM ÁUDIO */}
        {message.mediaType === "audio" && (
          <View style={styles.bubbleAudioPlayerBox}>
            <TouchableOpacity
              style={styles.bubbleAudioPlayBtn}
              onPress={togglePlayAudio}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlayingAudio ? "pause" : "play"}
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={styles.bubbleAudioTrack}>
              <View style={styles.bubbleAudioWaveRow}>
                {[14, 22, 10, 26, 18, 28, 12, 24, 16, 20, 10, 22].map((h, idx) => {
                  const barProgress = idx / 12;
                  const isPassed = audioProgress >= barProgress;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.audioTrackBar,
                        {
                          height: h,
                          backgroundColor: isPassed ? "#D90000" : isMine ? "#888" : "#555",
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.bubbleAudioMetaRow}>
                <Text style={styles.bubbleAudioDurationText}>
                  {formatDurationSeconds(Math.round(durationSec * audioProgress))} / {formatDurationSeconds(durationSec)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bubbleAudioSpeedBtn}
              onPress={toggleSpeed}
              activeOpacity={0.75}
            >
              <Text style={styles.bubbleAudioSpeedText}>{playbackSpeed}x</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TEXTO DA MENSAGEM OU LEGENDA */}
        {message.text && (
          <Text
            style={[
              styles.bubbleTextClean,
              isMine ? styles.bubbleTextCleanMine : styles.bubbleTextCleanOther,
            ]}
          >
            {message.text}
          </Text>
        )}

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

function formatDurationSeconds(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
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
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#D90000",
  },
  tabButtonText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontWeight: "900",
  },
  badgePill: {
    backgroundColor: "#fff",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgePillText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },

  /* Chat Shell */
  chatShell: {
    flex: 1,
  },
  studentSelectorRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingVertical: 6,
  },
  studentSelectorScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#161616",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#262626",
  },
  studentChipSelected: {
    borderColor: "#D90000",
    backgroundColor: "#201212",
  },
  studentChipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  studentChipName: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  studentChipNameSelected: {
    color: "#fff",
    fontWeight: "800",
  },
  studentChipBadge: {
    backgroundColor: "#D90000",
    borderRadius: 8,
    paddingHorizontal: 4,
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
    backgroundColor: "#141414",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
    gap: 10,
  },
  partnerAvatarFrame: {
    position: "relative",
  },
  partnerAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 1.5,
    borderColor: "#141414",
  },
  partnerTextCol: {
    flex: 1,
  },
  partnerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partnerNameText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  verifiedBadgeClean: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#251212",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedBadgeCleanText: {
    color: "#D90000",
    fontSize: 9,
    fontWeight: "800",
  },
  partnerRoleSubtitle: {
    color: "#777",
    fontSize: 11,
    marginTop: 1,
  },
  onlineHighlight: {
    color: "#22C55E",
    fontWeight: "700",
  },
  partnerQuickActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1A2E1A",
    alignItems: "center",
    justifyContent: "center",
  },

  quickPromptsBarClean: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  quickPromptsScrollClean: {
    paddingHorizontal: 12,
    gap: 6,
  },
  quickActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#171717",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
  },
  quickActionPillActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  quickActionPillText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  quickActionPillTextActive: {
    color: "#fff",
    fontWeight: "800",
  },

  messagesScrollList: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  emptyMessagesBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 17,
  },

  /* Input Bar */
  inputBarContainerClean: {
    position: "absolute",
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 6,
  },
  activeTagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  activeTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activeTagLabel: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  inputFlexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
  },
  textInputClean: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxHeight: 90,
  },
  micQuickBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonClean: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonCleanDisabled: {
    backgroundColor: "#262626",
  },

  /* Audio Recording Live Rail */
  audioRecordingRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  audioRecDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D90000",
  },
  audioRecTimerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  audioWaveLines: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginRight: 6,
  },
  audioWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  audioSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Message Bubble */
  bubbleContainer: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 8,
  },
  bubbleContainerMine: {
    justifyContent: "flex-end",
  },
  bubbleContainerOther: {
    justifyContent: "flex-start",
  },
  bubbleAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignSelf: "flex-end",
  },
  bubbleBox: {
    maxWidth: "80%",
    borderRadius: 14,
    padding: 10,
  },
  bubbleBoxMine: {
    backgroundColor: "#211515",
    borderWidth: 1,
    borderColor: "#3D1E1E",
    borderBottomRightRadius: 2,
  },
  bubbleBoxOther: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#282828",
    borderBottomLeftRadius: 2,
  },
  bubbleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  bubbleSenderName: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
  },
  trainerTagBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 4,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  bubbleTagPillText: {
    fontSize: 9,
    fontWeight: "800",
  },

  /* Media in Bubbles */
  bubblePhotoCard: {
    width: 200,
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111",
    marginBottom: 6,
    position: "relative",
  },
  bubblePhotoImage: {
    width: "100%",
    height: "100%",
  },
  bubblePhotoOverlayIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 4,
    borderRadius: 6,
  },
  bubbleVideoCard: {
    width: 200,
    height: 140,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111",
    marginBottom: 6,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleVideoThumb: {
    width: "100%",
    height: "100%",
  },
  bubbleVideoPlayBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(217, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleVideoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  bubbleVideoBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  /* Audio in Bubbles */
  bubbleAudioPlayerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 190,
    paddingVertical: 4,
  },
  bubbleAudioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleAudioTrack: {
    flex: 1,
    gap: 3,
  },
  bubbleAudioWaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 28,
  },
  audioTrackBar: {
    width: 3,
    borderRadius: 1.5,
  },
  bubbleAudioMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bubbleAudioDurationText: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "700",
  },
  bubbleAudioSpeedBtn: {
    backgroundColor: "#262626",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bubbleAudioSpeedText: {
    color: "#AAAAAA",
    fontSize: 9,
    fontWeight: "800",
  },

  bubbleTextClean: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextCleanMine: {
    color: "#FFFFFF",
  },
  bubbleTextCleanOther: {
    color: "#EDEDED",
  },
  bubbleMetaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  bubbleTimestamp: {
    color: "#666",
    fontSize: 9,
  },

  /* Attachment Modal Sheet */
  attachModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  attachModalSheet: {
    backgroundColor: "#181818",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: "#282828",
  },
  attachModalDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
  },
  attachModalHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  attachGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  attachGridItem: {
    width: "30%",
    alignItems: "center",
    gap: 6,
  },
  attachIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  attachGridItemLabel: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  attachCancelBtn: {
    backgroundColor: "#222",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  attachCancelBtnText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Full Screen Media Viewer */
  mediaViewerOverlay: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaViewerCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  mediaViewerContent: {
    width: "100%",
    height: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaViewerImage: {
    width: "90%",
    height: "90%",
  },
  videoPlayingBadge: {
    position: "absolute",
    alignItems: "center",
    gap: 8,
  },
  videoPlayingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  mediaViewerCaption: {
    color: "#CCCCCC",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  /* Notifications Styles */
  notifsScrollContent: {
    paddingTop: 10,
    gap: 10,
  },
  notifFilterRowClean: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notifFilterScroll: {
    gap: 6,
  },
  notifFilterChipClean: {
    backgroundColor: "#161616",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
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
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  markAllBtnTextClean: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyNotifsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
  },
  notifCardClean: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    padding: 10,
    gap: 10,
  },
  notifCardUnreadClean: {
    borderColor: "#3D1E1E",
    backgroundColor: "#1C1212",
  },
  notifIconBoxClean: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#241212",
    alignItems: "center",
    justifyContent: "center",
  },
  notifIconBoxPain: {
    backgroundColor: "#3A1414",
  },
  notifContentClean: {
    flex: 1,
    gap: 2,
  },
  notifHeaderRowClean: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTitleClean: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "800",
    flex: 1,
  },
  notifTimeClean: {
    color: "#666",
    fontSize: 10,
  },
  notifMessageClean: {
    color: "#888",
    fontSize: 11.5,
    lineHeight: 15,
  },
  unreadDotClean: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D90000",
  },

  /* Announcement Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCardClean: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    gap: 8,
  },
  modalHeaderClean: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTitleClean: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitleClean: {
    color: "#777",
    fontSize: 11.5,
    marginBottom: 6,
  },
  inputLabelClean: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  segmentedTargetRowClean: {
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
  segmentedCategoryRowClean: {
    flexDirection: "row",
    gap: 6,
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
