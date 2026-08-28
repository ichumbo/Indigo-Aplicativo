import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  FeedbackFilters,
  FeedbackStatus,
  TrainingFeedback,
  formatFeedbackDate,
  getFeedbackStatusLabel,
  listFeedbacksForTrainer,
} from "@/services/feedback-store";
import {
  Conversation,
  listConversationsForTrainer,
  sendTrainerAnnouncement,
  getUnreadChatCountForUser,
} from "@/services/chat-store";
import {
  StudentProfile,
  listStudentProfilesForTrainer,
} from "@/services/student-profile-store";
import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";

const NOTIFICATION_TEMPLATES = {
  workout: [
    { title: "Treino novo disponível!", body: "Atualizei sua divisão de treinos no app. Confira a nova ficha e bom treino!" },
    { title: "Atualização de cargas", body: "Revisei seus feedbacks e realizei os ajustes de carga para esta semana." },
    { title: "Lembrete de execução", body: "Não esqueça de registrar vídeos das séries principais para correção postural." },
  ],
  reminder: [
    { title: "Lembrete de Treino", body: "Não se esqueça de registrar o seu treino de hoje e enviar seu feedback!" },
    { title: "Reavaliação Física", body: "Sua próxima avaliação física está agendada. Prepare-se para atualizar suas medidas!" },
    { title: "Hidratação & Descanso", body: "Mantenha o foco na ingestão hídrica diária e boa noite de sono para recuperação." },
  ],
  update: [
    { title: "Aviso Importante", body: "Aviso geral do personal: fique atento às novidades e orientações desta semana." },
    { title: "Horários no Feriado", body: "Informamos que haverá alteração de horários no próximo feriado." },
    { title: "Parabéns pela Constância!", body: "Excelente dedicação e consistência nos treinos recentes. Continue firme!" },
  ],
};

const statusOptions: (FeedbackStatus | "all")[] = ["all", "novo", "visualizado", "respondido", "encerrado"];
const periodOptions: NonNullable<FeedbackFilters["period"]>[] = ["all", "today", "7d", "30d"];
const ratingOptions: (number | "all")[] = ["all", 5, 4, 3, 2, 1];

const periodLabels: Record<NonNullable<FeedbackFilters["period"]>, string> = {
  all: "Todos",
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
};

export default function FeedbacksScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const hasLoadedRef = useRef(false);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [hubMode, setHubMode] = useState<"feedbacks" | "chat">("feedbacks");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatUnreadTotal, setChatUnreadTotal] = useState(0);
  const [trainerStudents, setTrainerStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchText, setStudentSearchText] = useState("");
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState<"all" | "selected">("all");
  const [announcementCategory, setAnnouncementCategory] = useState<"workout" | "reminder" | "update">("update");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<FeedbackFilters["period"]>("all");
  const [rating, setRating] = useState<number | "all">("all");
  const [status, setStatus] = useState<FeedbackStatus | "all">("all");
  const [painOnly, setPainOnly] = useState(false);
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [sort, setSort] = useState<FeedbackFilters["sort"]>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);

  const loadFeedbacks = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) {
      setRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setLoading(true);
    }

    setError("");

    try {
      const [items, convs, unreadCount, studentsList] = await Promise.all([
        listFeedbacksForTrainer(session.user.id, {
          query,
          period,
          rating,
          status,
          painOnly,
          unansweredOnly,
          sort,
        }),
        listConversationsForTrainer(session.user.id),
        getUnreadChatCountForUser(session.user.id, "TRAINER"),
        listStudentProfilesForTrainer(session.user.id),
      ]);
      setFeedbacks(items);
      setConversations(convs);
      setChatUnreadTotal(unreadCount);
      setTrainerStudents(studentsList);
      setVisibleCount(8);
    } catch {
      setError("Não foi possível carregar os feedbacks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
    }
  }, [painOnly, period, query, rating, session, sort, status, unansweredOnly]);

  useFocusEffect(
    useCallback(() => {
      loadFeedbacks();
    }, [loadFeedbacks])
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadFeedbacks();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadFeedbacks]);

  const visibleFeedbacks = feedbacks.slice(0, visibleCount);
  const newCount = feedbacks.filter((feedback) => feedback.status === "novo").length;
  const unansweredCount = feedbacks.filter((feedback) => feedback.responses.length === 0).length;
  const painCount = feedbacks.filter((feedback) => feedback.hasPain).length;
  const hasActiveFilters =
    query.trim() !== "" || painOnly || unansweredOnly || rating !== "all" || status !== "all" || period !== "all" || sort !== "newest";

  const clearFilters = () => {
    setQuery("");
    setPeriod("all");
    setRating("all");
    setStatus("all");
    setPainOnly(false);
    setUnansweredOnly(false);
    setSort("newest");
  };

  const renderStars = (value: number) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={value >= star ? "star" : "star-outline"}
          size={14}
          color="#D90000"
        />
      ))}
    </View>
  );

  const renderFeedback = ({ item }: { item: TrainingFeedback }) => (
    <TouchableOpacity
      style={[styles.feedbackCard, item.status === "novo" && styles.unreadCard]}
      onPress={() =>
        router.push({
          pathname: "/feedback-detail" as never,
          params: { id: item.id, role: "trainer" },
        })
      }
    >
      <View style={styles.cardTop}>
        {item.studentAvatar ? (
          <Image source={{ uri: item.studentAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={18} color="#D90000" />
          </View>
        )}

        <View style={styles.studentBlock}>
          <Text style={styles.studentName}>{item.studentName}</Text>
          <Text style={styles.workoutName} numberOfLines={1}>{item.workoutName}</Text>
          <Text style={styles.dateText}>{formatFeedbackDate(item.finishedAt)}</Text>
        </View>

        <View style={styles.rightBlock}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{getFeedbackStatusLabel(item.status)}</Text>
          </View>
          {item.status === "novo" && <View style={styles.unreadDot} />}
        </View>
      </View>

      <View style={styles.metaRow}>
        {renderStars(item.rating)}
        <Text style={styles.metaText}>{item.intensity}</Text>
      </View>

      {!!item.comment && <Text style={styles.commentText} numberOfLines={3}>{item.comment}</Text>}

      <View style={styles.flagsRow}>
        {item.hasPain && (
          <View style={styles.flag}>
            <Ionicons name="alert-circle-outline" size={14} color="#ff4444" />
            <Text style={styles.flagText}>Relato de dor</Text>
          </View>
        )}
        <View style={styles.flag}>
          <Ionicons
            name={item.responses.length > 0 ? "chatbubble" : "chatbubble-outline"}
            size={14}
            color="#D90000"
          />
          <Text style={styles.flagText}>
            {item.responses.length > 0 ? "Respondido" : "Sem resposta"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderChip = (
    label: string,
    active: boolean,
    onPress: () => void,
    icon?: keyof typeof Ionicons.glyphMap
  ) => (
    <TouchableOpacity key={label} style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.84}>
      {icon && <Ionicons name={icon} size={14} color={active ? "#fff" : "#888"} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(trainerStudents.map((s) => s.id));
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim() || !session) return;

    let targetIds: string[] = [];
    if (announcementTarget === "all") {
      targetIds = trainerStudents.map((s) => s.id);
      if (targetIds.length === 0 && conversations.length > 0) {
        targetIds = conversations.map((c) => c.studentId);
      }
      if (targetIds.length === 0) {
        targetIds = ["student-1"];
      }
    } else {
      targetIds = selectedStudentIds;
      if (targetIds.length === 0) {
        Alert.alert("Seleção Vazia", "Selecione ao menos um aluno para enviar a notificação.");
        return;
      }
    }

    setSendingAnnouncement(true);
    try {
      for (const sId of targetIds) {
        const studentObj = trainerStudents.find((s) => s.id === sId);
        await sendTrainerAnnouncement({
          trainerId: session.user.id,
          trainerName: session.user.name,
          studentId: sId,
          studentName: studentObj?.registration?.fullName || undefined,
          title: announcementTitle.trim(),
          message: announcementBody.trim(),
          type: announcementCategory,
        });
      }

      setAnnouncementModalVisible(false);
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setSelectedStudentIds([]);
      setStudentSearchText("");
      setAnnouncementTarget("all");
      await loadFeedbacks(true);

      Alert.alert(
        "Notificação Enviada!",
        `Sua notificação foi enviada com sucesso para ${targetIds.length} ${
          targetIds.length === 1 ? "aluno" : "alunos"
        }.`
      );
    } catch {
      setError("Erro ao enviar comunicado.");
      Alert.alert("Erro", "Não foi possível enviar a notificação.");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.convCard, item.unreadForTrainer > 0 && styles.convCardUnread]}
      onPress={() => router.push({ pathname: "/messages" as never, params: { studentId: item.studentId } })}
      activeOpacity={0.84}
    >
      <View style={styles.cardTop}>
        <Image
          source={{ uri: item.studentAvatar || "https://i.pravatar.cc/150?img=12" }}
          style={styles.avatar}
        />
        <View style={styles.studentBlock}>
          <View style={styles.convNameRow}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            {item.unreadForTrainer > 0 && (
              <View style={styles.convUnreadBadge}>
                <Text style={styles.convUnreadBadgeText}>{item.unreadForTrainer} nova(s)</Text>
              </View>
            )}
          </View>
          <Text style={styles.convLastMessage} numberOfLines={2}>
            {item.lastMessage?.text || "Nenhuma mensagem ainda."}
          </Text>
          <Text style={styles.dateText}>
            {item.lastMessage ? formatFeedbackDate(item.lastMessage.createdAt) : "Recente"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.convActionBtn}
          onPress={() => router.push({ pathname: "/messages" as never, params: { studentId: item.studentId } })}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
          <Text style={styles.convActionBtnText}>Abrir Chat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const listHeader = (
    <View>
      {/* SELETOR SUPERIOR ENTRE FEEDBACKS E MENSAGENS */}
      <View style={styles.hubTabWrap}>
        <TouchableOpacity
          style={[styles.hubTabBtn, hubMode === "feedbacks" && styles.hubTabBtnActive]}
          onPress={() => setHubMode("feedbacks")}
          activeOpacity={0.82}
        >
          <Ionicons name="clipboard-outline" size={14} color={hubMode === "feedbacks" ? "#fff" : "#888"} />
          <Text style={[styles.hubTabBtnText, hubMode === "feedbacks" && styles.hubTabBtnTextActive]}>
            Feedbacks
          </Text>
          {newCount > 0 && (
            <View style={styles.hubTabBadge}>
              <Text style={styles.hubTabBadgeText}>{newCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubTabBtn, hubMode === "chat" && styles.hubTabBtnActive]}
          onPress={() => setHubMode("chat")}
          activeOpacity={0.82}
        >
          <Ionicons name="chatbubbles-outline" size={14} color={hubMode === "chat" ? "#fff" : "#888"} />
          <Text style={[styles.hubTabBtnText, hubMode === "chat" && styles.hubTabBtnTextActive]}>
            Mensagens
          </Text>
          {chatUnreadTotal > 0 && (
            <View style={styles.hubTabBadge}>
              <Text style={styles.hubTabBadgeText}>{chatUnreadTotal}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {hubMode === "feedbacks" ? (
        <View style={styles.feedbackPanel}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>Feedbacks de Treino</Text>
              <Text style={styles.subtitle}>
                {newCount > 0 ? `${newCount} novo(s) para revisar` : "Nenhum feedback novo"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newAnnouncementBtn}
              onPress={() => setAnnouncementModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="megaphone-outline" size={13} color="#fff" />
              <Text style={styles.newAnnouncementBtnText}>Notificar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.feedbackStats}>
            <FeedbackStat
              icon="sparkles"
              label="Novos"
              value={newCount}
              active={status === "novo"}
              onPress={() => setStatus((curr) => (curr === "novo" ? "all" : "novo"))}
            />
            <FeedbackStat
              icon="chatbubble"
              label="Sem resposta"
              value={unansweredCount}
              active={unansweredOnly}
              onPress={() => setUnansweredOnly((curr) => !curr)}
            />
            <FeedbackStat
              icon="alert-circle"
              label="Com dor"
              value={painCount}
              active={painOnly}
              onPress={() => setPainOnly((curr) => !curr)}
            />
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#D90000" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Pesquisar aluno, treino ou comentário"
                placeholderTextColor="#666"
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#777" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.filterToggleBtn, (showFilters || hasActiveFilters) && styles.filterToggleBtnActive]}
              onPress={() => setShowFilters((prev) => !prev)}
              accessibilityLabel="Filtrar feedbacks"
            >
              <Ionicons
                name={showFilters ? "options" : "options-outline"}
                size={20}
                color={showFilters || hasActiveFilters ? "#ffffff" : "#D90000"}
              />
              {hasActiveFilters && !showFilters ? <View style={styles.filterActiveDot} /> : null}
            </TouchableOpacity>
          </View>

          {showFilters ? (
            <View style={styles.filterPanel}>
              <View style={styles.filterHeader}>
                <View>
                  <Text style={styles.filterTitle}>Triagem</Text>
                  <Text style={styles.filterSubtitle}>Refine por período, nota e status</Text>
                </View>
                <TouchableOpacity
                  style={[styles.clearButton, !hasActiveFilters && styles.clearButtonDisabled]}
                  onPress={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  <Text style={[styles.clearButtonText, !hasActiveFilters && styles.clearButtonTextDisabled]}>Limpar</Text>
                </TouchableOpacity>
              </View>

              {/* PERÍODO */}
              <Text style={styles.filterLabel}>Período</Text>
              <View style={styles.segmentedRow}>
                {periodOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.segmentBtn, period === option && styles.segmentBtnActive]}
                    onPress={() => setPeriod(option)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentBtnText, period === option && styles.segmentBtnTextActive]}>
                      {periodLabels[option]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* NOTA */}
              <Text style={styles.filterLabel}>Avaliação</Text>
              <View style={styles.segmentedRow}>
                {ratingOptions.map((option) => (
                  <TouchableOpacity
                    key={String(option)}
                    style={[styles.segmentBtn, rating === option && styles.segmentBtnActive]}
                    onPress={() => setRating(option)}
                    activeOpacity={0.8}
                  >
                    {option === "all" ? (
                      <Text style={[styles.segmentBtnText, rating === option && styles.segmentBtnTextActive]}>
                        Todas
                      </Text>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={[styles.segmentBtnText, rating === option && styles.segmentBtnTextActive]}>
                          {option}
                        </Text>
                        <Ionicons
                          name="star"
                          size={11}
                          color={rating === option ? "#000000" : "#D90000"}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* STATUS */}
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.gridRow}>
                {statusOptions.slice(0, 3).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.gridBtn, status === option && styles.gridBtnActive]}
                    onPress={() => setStatus(option)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.gridBtnText, status === option && styles.gridBtnTextActive]}>
                      {option === "all" ? "Todos" : getFeedbackStatusLabel(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.gridRow, { marginTop: 6 }]}>
                {statusOptions.slice(3).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.gridBtn, status === option && styles.gridBtnActive]}
                    onPress={() => setStatus(option)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.gridBtnText, status === option && styles.gridBtnTextActive]}>
                      {option === "all" ? "Todos" : getFeedbackStatusLabel(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* FILTROS ESPECIAIS */}
              <Text style={styles.filterLabel}>Filtros Especiais</Text>
              <View style={styles.gridRow}>
                <TouchableOpacity
                  style={[styles.gridBtn, painOnly && styles.gridBtnActive]}
                  onPress={() => setPainOnly((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="alert-circle-outline" size={15} color={painOnly ? "#ffffff" : "#ff4d4d"} />
                  <Text style={[styles.gridBtnText, painOnly && styles.gridBtnTextActive]}>Com relato de dor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gridBtn, unansweredOnly && styles.gridBtnActive]}
                  onPress={() => setUnansweredOnly((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-outline" size={15} color={unansweredOnly ? "#ffffff" : "#ff4d4d"} />
                  <Text style={[styles.gridBtnText, unansweredOnly && styles.gridBtnTextActive]}>Não respondidos</Text>
                </TouchableOpacity>
              </View>

              {/* ORDENAÇÃO */}
              <Text style={styles.filterLabel}>Ordenação</Text>
              <View style={styles.gridRow}>
                <TouchableOpacity
                  style={[styles.gridBtn, sort === "newest" && styles.gridBtnActive]}
                  onPress={() => setSort("newest")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-down" size={14} color={sort === "newest" ? "#ffffff" : "#888"} />
                  <Text style={[styles.gridBtnText, sort === "newest" && styles.gridBtnTextActive]}>Mais recentes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gridBtn, sort === "oldest" && styles.gridBtnActive]}
                  onPress={() => setSort("oldest")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-up" size={14} color={sort === "oldest" ? "#ffffff" : "#888"} />
                  <Text style={[styles.gridBtnText, sort === "oldest" && styles.gridBtnTextActive]}>Mais antigos</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        /* CABEÇALHO DO CHAT / MENSAGENS DOS ALUNOS */
        <View style={styles.feedbackPanel}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>Mensagens</Text>
              <Text style={styles.subtitle}>
                {chatUnreadTotal > 0
                  ? `${chatUnreadTotal} mensagem(ns) pendente(s)`
                  : "Todas as mensagens lidas"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newAnnouncementBtn}
              onPress={() => setAnnouncementModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="megaphone-outline" size={13} color="#fff" />
              <Text style={styles.newAnnouncementBtnText}>Comunicado</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando feedbacks e mensagens...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={38} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadFeedbacks()}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <FlatList
        style={styles.list}
        data={hubMode === "feedbacks" ? (visibleFeedbacks as any[]) : (conversations as any[])}
        keyExtractor={(item) => item.id}
        renderItem={hubMode === "feedbacks" ? (renderFeedback as any) : (renderConversationItem as any)}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.topPadding,
            paddingBottom: layout.tabBarContentPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFeedbacks(true)}
            tintColor="#D90000"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={38} color="#D90000" />
            <Text style={styles.centerTitle}>
              {hubMode === "feedbacks" ? "Nenhum feedback recebido" : "Nenhuma conversa iniciada"}
            </Text>
            <Text style={styles.centerText}>
              {hubMode === "feedbacks"
                ? "Os feedbacks de treinos enviados pelos alunos aparecerão aqui."
                : "As mensagens enviadas pelos alunos aparecerão aqui."}
            </Text>
          </View>
        }
        ListFooterComponent={
          hubMode === "feedbacks" && feedbacks.length > visibleCount ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setVisibleCount((value) => value + 8)}
              activeOpacity={0.84}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.loadMoreText}>Carregar mais</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footerSpacer} />
          )
        }
      />

      {/* MODAL DE NOVO COMUNICADO / NOTIFICAÇÃO */}
      <Modal
        visible={announcementModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnnouncementModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBlock}>
                <View style={styles.modalHeaderIconBadge}>
                  <Ionicons name="notifications" size={18} color="#D90000" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Enviar Notificação</Text>
                  <Text style={styles.modalSubtitle}>Avisos em tempo real para os alunos</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAnnouncementModalVisible(false)}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#CCCCCC" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* TIPO DE NOTIFICAÇÃO */}
              <Text style={styles.modalSectionLabel}>TIPO DE NOTIFICAÇÃO</Text>
              <View style={styles.announcementCategoryRow}>
                <TouchableOpacity
                  style={[
                    styles.announcementCatChip,
                    announcementCategory === "reminder" && styles.announcementCatChipActive,
                  ]}
                  onPress={() => setAnnouncementCategory("reminder")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="alarm-outline"
                    size={18}
                    color={announcementCategory === "reminder" ? "#D90000" : "#777777"}
                  />
                  <Text
                    style={[
                      styles.announcementCatChipText,
                      announcementCategory === "reminder" && styles.announcementCatChipTextActive,
                    ]}
                  >
                    Lembrete
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.announcementCatChip,
                    announcementCategory === "workout" && styles.announcementCatChipActive,
                  ]}
                  onPress={() => setAnnouncementCategory("workout")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="barbell-outline"
                    size={18}
                    color={announcementCategory === "workout" ? "#D90000" : "#777777"}
                  />
                  <Text
                    style={[
                      styles.announcementCatChipText,
                      announcementCategory === "workout" && styles.announcementCatChipTextActive,
                    ]}
                  >
                    Treino
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.announcementCatChip,
                    announcementCategory === "update" && styles.announcementCatChipActive,
                  ]}
                  onPress={() => setAnnouncementCategory("update")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="megaphone-outline"
                    size={18}
                    color={announcementCategory === "update" ? "#D90000" : "#777777"}
                  />
                  <Text
                    style={[
                      styles.announcementCatChipText,
                      announcementCategory === "update" && styles.announcementCatChipTextActive,
                    ]}
                  >
                    Comunicado
                  </Text>
                </TouchableOpacity>
              </View>

              {/* DESTINATÁRIOS */}
              <Text style={styles.modalSectionLabel}>DESTINATÁRIOS</Text>
              <View style={styles.segmentedTrack}>
                <TouchableOpacity
                  style={[styles.modalSegmentBtn, announcementTarget === "all" && styles.modalSegmentBtnActive]}
                  onPress={() => setAnnouncementTarget("all")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="people-outline"
                    size={14}
                    color={announcementTarget === "all" ? "#000000" : "#888888"}
                  />
                  <Text style={[styles.modalSegmentBtnText, announcementTarget === "all" && styles.modalSegmentBtnTextActive]}>
                    Todos ({trainerStudents.length || 1})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSegmentBtn, announcementTarget === "selected" && styles.modalSegmentBtnActive]}
                  onPress={() => setAnnouncementTarget("selected")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={announcementTarget === "selected" ? "#000000" : "#888888"}
                  />
                  <Text style={[styles.modalSegmentBtnText, announcementTarget === "selected" && styles.modalSegmentBtnTextActive]}>
                    Escolher Alunos {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ""}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SELEÇÃO DE ALUNOS (QUANDO "selected") */}
              {announcementTarget === "selected" && (
                <View style={styles.studentPickerSection}>
                  <View style={styles.studentPickerHeader}>
                    <View style={styles.studentPickerSearch}>
                      <Ionicons name="search" size={14} color="#777777" />
                      <TextInput
                        style={styles.studentPickerSearchInput}
                        placeholder="Filtrar por nome..."
                        placeholderTextColor="#666666"
                        value={studentSearchText}
                        onChangeText={setStudentSearchText}
                      />
                      {studentSearchText ? (
                        <TouchableOpacity onPress={() => setStudentSearchText("")} hitSlop={4}>
                          <Ionicons name="close-circle" size={14} color="#888888" />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={styles.studentPickerQuickActions}>
                      <TouchableOpacity
                        style={styles.quickActionPill}
                        onPress={handleSelectAllStudents}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickActionPillText}>Todos</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionPill}
                        onPress={handleClearSelectedStudents}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.quickActionPillText, { color: "#888888" }]}>Limpar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView
                    style={styles.studentPickerList}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {trainerStudents
                      .filter((s) =>
                        !studentSearchText.trim()
                          ? true
                          : s.registration?.fullName?.toLowerCase().includes(studentSearchText.toLowerCase())
                      )
                      .map((student) => {
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <TouchableOpacity
                            key={student.id}
                            style={[
                              styles.studentPickerItem,
                              isChecked && styles.studentPickerItemActive,
                            ]}
                            onPress={() => handleToggleStudentSelection(student.id)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name={isChecked ? "checkmark-circle" : "ellipse-outline"}
                              size={18}
                              color={isChecked ? "#D90000" : "#555555"}
                            />
                            <Image
                              source={{
                                uri:
                                  student.registration?.avatar ||
                                  "https://i.pravatar.cc/150?img=12",
                              }}
                              style={styles.studentPickerAvatar}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.studentPickerName, isChecked && styles.studentPickerNameActive]} numberOfLines={1}>
                                {student.registration?.fullName || "Aluno"}
                              </Text>
                              <Text style={styles.studentPickerMeta} numberOfLines={1}>
                                {student.registration?.mainGoal || "Musculação"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    {trainerStudents.length === 0 && (
                      <Text style={styles.emptyPickerText}>Nenhum aluno encontrado.</Text>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* ATALHOS / TEMPLATES RÁPIDOS */}
              <View style={styles.templatePresetsContainer}>
                <Text style={styles.modalSectionLabel}>SUGESTÕES RÁPIDAS (1 TOQUE)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templateChipsRail}
                >
                  {(NOTIFICATION_TEMPLATES[announcementCategory] || NOTIFICATION_TEMPLATES.update).map((tpl, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.templateChip}
                      onPress={() => {
                        setAnnouncementTitle(tpl.title);
                        setAnnouncementBody(tpl.body);
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="sparkles-outline" size={11} color="#D90000" />
                      <Text style={styles.templateChipText}>{tpl.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.modalSectionLabel}>TÍTULO DA NOTIFICAÇÃO</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Treino da semana atualizado!"
                placeholderTextColor="#555555"
                value={announcementTitle}
                onChangeText={setAnnouncementTitle}
              />

              <Text style={styles.modalSectionLabel}>MENSAGEM</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                placeholder="Digite a orientação ou aviso completo..."
                placeholderTextColor="#555555"
                value={announcementBody}
                onChangeText={setAnnouncementBody}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  (!announcementTitle.trim() ||
                    !announcementBody.trim() ||
                    sendingAnnouncement ||
                    (announcementTarget === "selected" && selectedStudentIds.length === 0)) &&
                    styles.modalSubmitButtonDisabled,
                ]}
                onPress={handleSendAnnouncement}
                disabled={
                  !announcementTitle.trim() ||
                  !announcementBody.trim() ||
                  sendingAnnouncement ||
                  (announcementTarget === "selected" && selectedStudentIds.length === 0)
                }
                activeOpacity={0.82}
              >
                {sendingAnnouncement ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane"
                      size={16}
                      color={
                        !announcementTitle.trim() ||
                        !announcementBody.trim() ||
                        (announcementTarget === "selected" && selectedStudentIds.length === 0)
                          ? "#555555"
                          : "#000000"
                      }
                    />
                    <Text
                      style={[
                        styles.modalSubmitButtonText,
                        (!announcementTitle.trim() ||
                          !announcementBody.trim() ||
                          (announcementTarget === "selected" && selectedStudentIds.length === 0)) &&
                          styles.modalSubmitButtonTextDisabled,
                      ]}
                    >
                      {announcementTarget === "all"
                        ? `Enviar para Todos (${trainerStudents.length || 1})`
                        : `Enviar (${selectedStudentIds.length})`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FeedbackStat({
  icon,
  label,
  value,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.feedbackStat, active && styles.feedbackStatActive]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.feedbackStatTop}>
        <View style={[styles.feedbackStatIconWrap, active && styles.feedbackStatIconWrapActive]}>
          <Ionicons name={icon} size={15} color="#ffffff" />
        </View>
        <Text style={styles.feedbackStatValue}>{value}</Text>
      </View>
      <Text style={styles.feedbackStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  listContent: {
    backgroundColor: "#0f0f0fff",
    width: "100%",
    alignSelf: "center",
  },
  feedbackPanel: {
    backgroundColor: "#151515",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#888",
    fontSize: 11.5,
    marginTop: 2,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#D90000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  feedbackStat: {
    flex: 1,
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "#D90000",
    padding: 10,
    justifyContent: "space-between",
  },
  feedbackStatActive: {
    borderColor: "#ffffff",
    backgroundColor: "#B30000",
    borderWidth: 1.5,
  },
  feedbackStatTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  feedbackStatIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackStatIconWrapActive: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  feedbackStatValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  feedbackStatLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#101010",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#303030",
  },
  searchInput: {
    color: "#fff",
    flex: 1,
    minHeight: 48,
    fontSize: 15,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterToggleBtnActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  filterActiveDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ff4d4d",
  },
  filterPanel: {
    borderTopWidth: 1,
    borderTopColor: "#282828",
    marginTop: 14,
    paddingTop: 14,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  filterTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  filterSubtitle: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  clearButton: {
    minHeight: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0,0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  clearButtonDisabled: {
    borderColor: "#333",
    backgroundColor: "#1c1c1c",
  },
  clearButtonText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  clearButtonTextDisabled: {
    color: "#555",
  },
  filterLabel: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  segmentBtnActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  segmentBtnText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
  },
  segmentBtnTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  gridRow: {
    flexDirection: "row",
    gap: 6,
  },
  gridBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  gridBtnActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  gridBtnText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
  },
  gridBtnTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  feedbackCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#D90000",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#D90000",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  studentBlock: {
    flex: 1,
  },
  studentName: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  workoutName: {
    color: "#888",
    marginTop: 2,
  },
  dateText: {
    color: "#666",
    marginTop: 4,
    fontSize: 12,
  },
  rightBlock: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D90000",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 10,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  metaText: {
    color: "#888",
    fontWeight: "700",
    flexShrink: 1,
  },
  commentText: {
    color: "#fff",
    marginTop: 12,
    lineHeight: 20,
  },
  flagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  flag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#101010",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  flagText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#101010",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#222",
  },
  chipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  chipText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  centerText: {
    color: "#888",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#D90000",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: {
    color: "#fff",
    fontWeight: "800",
  },
  emptyState: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  loadMoreButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loadMoreText: {
    color: "#D90000",
    fontWeight: "800",
  },
  footerSpacer: {
    height: 1,
  },
  hubTabWrap: {
    flexDirection: "row",
    backgroundColor: "#161616",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 12,
  },
  hubTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
  },
  hubTabBtnActive: {
    backgroundColor: "#D90000",
  },
  hubTabBtnText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
  },
  hubTabBtnTextActive: {
    color: "#fff",
  },
  hubTabBadge: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  hubTabBadgeText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  convCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  convCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#D90000",
    backgroundColor: "#1d1717",
  },
  convNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  convUnreadBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  convUnreadBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  convLastMessage: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  convActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D90000",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "center",
  },
  convActionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  newAnnouncementBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D90000",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newAnnouncementBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
    backgroundColor: "#141414",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#262626",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalHeaderTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalSectionLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 6,
  },
  announcementCategoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  announcementCatChip: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  announcementCatChipActive: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderColor: "#D90000",
  },
  announcementCatChipText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "800",
    textAlign: "center",
  },
  announcementCatChipTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  segmentedTrack: {
    flexDirection: "row",
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 3,
    marginBottom: 4,
  },
  modalSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 9,
    paddingVertical: 8,
  },
  modalSegmentBtnActive: {
    backgroundColor: "#D90000",
  },
  modalSegmentBtnText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  modalSegmentBtnTextActive: {
    color: "#000000",
    fontWeight: "900",
  },
  studentPickerSection: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 8,
    marginTop: 4,
    marginBottom: 6,
    gap: 8,
  },
  studentPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  studentPickerSearch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#161616",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    borderWidth: 1,
    borderColor: "#282828",
  },
  studentPickerSearchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 12,
    paddingVertical: 0,
  },
  studentPickerQuickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickActionPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#282828",
  },
  quickActionPillText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  studentPickerList: {
    maxHeight: 130,
  },
  studentPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  studentPickerItemActive: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#2e2e2e",
  },
  studentPickerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#222222",
  },
  studentPickerName: {
    color: "#cccccc",
    fontSize: 12,
    fontWeight: "800",
  },
  studentPickerNameActive: {
    color: "#ffffff",
  },
  studentPickerMeta: {
    color: "#666666",
    fontSize: 10,
  },
  emptyPickerText: {
    color: "#666666",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
  templatePresetsContainer: {
    marginTop: 4,
    marginBottom: 2,
  },
  templateChipsRail: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#101010",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  templateChipText: {
    color: "#aaaaaa",
    fontSize: 11,
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#ffffff",
    fontSize: 13,
    marginBottom: 4,
  },
  modalInputMultiline: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  modalSubmitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D90000",
    borderRadius: 12,
    height: 44,
    marginTop: 10,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#242424",
  },
  modalSubmitButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "900",
  },
  modalSubmitButtonTextDisabled: {
    color: "#555555",
  },
});
