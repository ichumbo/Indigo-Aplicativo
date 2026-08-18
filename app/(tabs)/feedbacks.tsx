import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
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
import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";

const statusOptions: (FeedbackStatus | "all")[] = ["all", "novo", "visualizado", "respondido", "encerrado"];
const periodOptions: NonNullable<FeedbackFilters["period"]>[] = ["all", "today", "7d", "30d"];
const ratingOptions: (number | "all")[] = ["all", 5, 4, 3, 2, 1];

const periodLabels: Record<NonNullable<FeedbackFilters["period"]>, string> = {
  all: "Todo período",
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
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<FeedbackFilters["period"]>("all");
  const [rating, setRating] = useState<number | "all">("all");
  const [status, setStatus] = useState<FeedbackStatus | "all">("all");
  const [painOnly, setPainOnly] = useState(false);
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [sort, setSort] = useState<FeedbackFilters["sort"]>("newest");
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
      const items = await listFeedbacksForTrainer(session.user.id, {
        query,
        period,
        rating,
        status,
        painOnly,
        unansweredOnly,
        sort,
      });
      setFeedbacks(items);
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

  const listHeader = (
    <View>
      <View style={styles.feedbackPanel}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Feedbacks</Text>
            <Text style={styles.subtitle}>
              {newCount > 0 ? `${newCount} novo(s) para revisar` : "Nenhum feedback novo"}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
          </View>
        </View>

        <View style={styles.feedbackStats}>
          <FeedbackStat icon="sparkles-outline" label="Novos" value={newCount} active={newCount > 0} />
          <FeedbackStat icon="chatbubble-outline" label="Sem resposta" value={unansweredCount} active={unansweredCount > 0} />
          <FeedbackStat icon="alert-circle-outline" label="Com dor" value={painCount} active={painCount > 0} danger={painCount > 0} />
        </View>

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

          <Text style={styles.filterLabel}>Período</Text>
          <View style={styles.filterWrap}>
            {periodOptions.map((option) =>
              renderChip(periodLabels[option], period === option, () => setPeriod(option))
            )}
          </View>

          <Text style={styles.filterLabel}>Nota</Text>
          <View style={styles.filterWrap}>
            {ratingOptions.map((option) =>
              renderChip(option === "all" ? "Todas" : `${option}★`, rating === option, () => setRating(option))
            )}
          </View>

          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterWrap}>
            {statusOptions.map((option) =>
              renderChip(
                option === "all" ? "Todos" : getFeedbackStatusLabel(option),
                status === option,
                () => setStatus(option)
              )
            )}
          </View>

          <View style={styles.quickFilterRow}>
            {renderChip("Com dor", painOnly, () => setPainOnly((value) => !value), "alert-circle-outline")}
            {renderChip("Não respondidos", unansweredOnly, () => setUnansweredOnly((value) => !value), "chatbubble-outline")}
            {renderChip(sort === "newest" ? "Mais recentes" : "Mais antigos", true, () =>
              setSort((value) => (value === "newest" ? "oldest" : "newest")), "swap-vertical-outline"
            )}
          </View>
        </View>
      </View>
    </View>
  );

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando feedbacks...</Text>
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
    <FlatList
      style={styles.list}
      data={visibleFeedbacks}
      keyExtractor={(item) => item.id}
      renderItem={renderFeedback}
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
            {query || painOnly || unansweredOnly || rating !== "all" || status !== "all" || period !== "all"
              ? "Nenhum resultado"
              : "Nenhum feedback recebido"}
          </Text>
          <Text style={styles.centerText}>
            {query || painOnly || unansweredOnly || rating !== "all" || status !== "all" || period !== "all"
              ? "Ajuste os filtros para ampliar a busca."
              : "Os feedbacks enviados pelos alunos aparecerão aqui."}
          </Text>
        </View>
      }
      ListFooterComponent={
        feedbacks.length > visibleCount ? (
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
  );
}

function FeedbackStat({
  icon,
  label,
  value,
  active,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <View style={[styles.feedbackStat, active && styles.feedbackStatActive, danger && styles.feedbackStatDanger]}>
      <View style={styles.feedbackStatTop}>
        <Ionicons name={icon} size={15} color={danger ? "#ff6b6b" : active ? "#D90000" : "#777"} />
        <Text style={[styles.feedbackStatValue, danger && styles.feedbackStatValueDanger]}>{value}</Text>
      </View>
      <Text style={styles.feedbackStatLabel} numberOfLines={1}>{label}</Text>
    </View>
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
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    color: "#888",
    marginTop: 4,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    minHeight: 64,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#2d2d2d",
    backgroundColor: "#101010",
    padding: 10,
    justifyContent: "space-between",
  },
  feedbackStatActive: {
    borderColor: "rgba(217, 0, 0,0.34)",
    backgroundColor: "rgba(217, 0, 0,0.08)",
  },
  feedbackStatDanger: {
    borderColor: "rgba(255,107,107,0.28)",
    backgroundColor: "rgba(255,107,107,0.08)",
  },
  feedbackStatTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  feedbackStatValue: {
    color: "#D90000",
    fontSize: 18,
    fontWeight: "900",
  },
  feedbackStatValueDanger: {
    color: "#ff6b6b",
  },
  feedbackStatLabel: {
    color: "#999",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 6,
  },
  searchBox: {
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
    marginTop: 10,
    textTransform: "uppercase",
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 2,
  },
  quickFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#101010",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  chipText: {
    color: "#888",
    fontWeight: "900",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#fff",
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
});
