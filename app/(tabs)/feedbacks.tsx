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

            {/* PERÍODO (4 colunas iguais) */}
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

            {/* NOTA (6 colunas iguais) */}
            <Text style={styles.filterLabel}>Avaliação</Text>
            <View style={styles.segmentedRow}>
              {ratingOptions.map((option) => (
                <TouchableOpacity
                  key={String(option)}
                  style={[styles.segmentBtn, rating === option && styles.segmentBtnActive]}
                  onPress={() => setRating(option)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentBtnText, rating === option && styles.segmentBtnTextActive]}>
                    {option === "all" ? "Todas" : `${option}★`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* STATUS (Grade organizada 3 + 2) */}
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
                    {getFeedbackStatusLabel(option)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* FILTROS ESPECIAIS (2 colunas) */}
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

            {/* ORDENAÇÃO (2 colunas) */}
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
