import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  TrainerHomeDashboard,
  TrainerHomePending,
  TrainerHomePendingPriority,
  getTrainerHomeDashboard,
  markTrainerHomePendingViewed,
  snoozeTrainerHomePending,
} from "@/services/trainer-home-store";

type FilterType = "all" | "critical" | "reassessment" | "anamnesis" | "document" | "unviewed";

export default function TrainerAttentionScreen() {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();

  const [dashboard, setDashboard] = useState<TrainerHomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const loadData = useCallback(
    async (asRefresh = false) => {
      if (!session) return;
      if (asRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const nextDashboard = await getTrainerHomeDashboard(session.user.id);
        setDashboard(nextDashboard);
      } catch (err) {
        console.error("Erro ao carregar itens de atenção:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pendings = dashboard?.pendings ?? [];

  const filteredPendings = useMemo(() => {
    return pendings.filter((item) => {
      if (activeFilter === "critical" && item.priority !== "critical" && item.priority !== "expired") {
        return false;
      }
      if (activeFilter === "reassessment" && item.type !== "Reavaliacao" && !item.title.toLowerCase().includes("reavaliacao")) {
        return false;
      }
      if (activeFilter === "anamnesis" && item.type !== "Anamnese" && !item.title.toLowerCase().includes("anamnese")) {
        return false;
      }
      if (activeFilter === "document" && item.type !== "Documento" && !item.title.toLowerCase().includes("documento")) {
        return false;
      }
      if (activeFilter === "unviewed" && item.viewed) {
        return false;
      }

      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDetail = item.detail.toLowerCase().includes(q);
        return matchesName || matchesTitle || matchesDetail;
      }

      return true;
    });
  }, [pendings, activeFilter, query]);

  const handleOpen = (item: TrainerHomePending) => {
    if (item.route === "/profile" && item.studentId) {
      router.push({ pathname: "/profile" as never, params: { studentId: item.studentId } });
      return;
    }
    router.push(item.route as never);
  };

  const handleView = async (item: TrainerHomePending) => {
    if (!session) return;
    setSaving(true);
    try {
      await markTrainerHomePendingViewed(item.id, session.user.id);
      await loadData(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSnooze = async (item: TrainerHomePending) => {
    if (!session) return;
    setSaving(true);
    try {
      await snoozeTrainerHomePending(item.id, 3, session.user.id);
      await loadData(true);
    } finally {
      setSaving(false);
    }
  };

  const criticalCount = pendings.filter(
    (p) => p.priority === "critical" || p.priority === "expired"
  ).length;
  const unviewedCount = pendings.filter((p) => !p.viewed).length;

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={[styles.centerState, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#D90000" />
        <Text style={styles.centerText}>Carregando itens de atenção...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Itens de Atenção</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {pendings.length} {pendings.length === 1 ? "pendência na fila" : "pendências na fila"}
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{pendings.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: layout.horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor="#D90000"
          />
        }
      >
        {/* Summary Hero Card */}
        <View style={styles.heroCard}>
          <Image
            source={require("@/assets/images/logo-white.png")}
            style={styles.heroWatermark}
            resizeMode="contain"
          />
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="alert-circle" size={20} color="#ffffff" />
            </View>
            <View style={styles.heroHeaderText}>
              <Text style={styles.heroEyebrow}>TRIAGEM CLÍNICA & GESTÃO</Text>
              <Text style={styles.heroTitle}>Atenção Necessária</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{pendings.length}</Text>
              <Text style={styles.heroStatLabel}>TOTAL</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: criticalCount ? "#ff4d4d" : "#ffffff" }]}>
                {criticalCount}
              </Text>
              <Text style={styles.heroStatLabel}>CRÍTICOS</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{unviewedCount}</Text>
              <Text style={styles.heroStatLabel}>NÃO VISTOS</Text>
            </View>
          </View>
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#D90000" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por aluno, tipo ou motivo..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips Rail */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRail}
        >
          <FilterChip
            label="Todos"
            count={pendings.length}
            active={activeFilter === "all"}
            onPress={() => setActiveFilter("all")}
          />
          <FilterChip
            label="Críticos"
            count={criticalCount}
            active={activeFilter === "critical"}
            onPress={() => setActiveFilter("critical")}
          />
          <FilterChip
            label="Não vistos"
            count={unviewedCount}
            active={activeFilter === "unviewed"}
            onPress={() => setActiveFilter("unviewed")}
          />
          <FilterChip
            label="Reavaliações"
            active={activeFilter === "reassessment"}
            onPress={() => setActiveFilter("reassessment")}
          />
          <FilterChip
            label="Anamneses"
            active={activeFilter === "anamnesis"}
            onPress={() => setActiveFilter("anamnesis")}
          />
          <FilterChip
            label="Documentos"
            active={activeFilter === "document"}
            onPress={() => setActiveFilter("document")}
          />
        </ScrollView>

        {/* List of Pending Items */}
        {filteredPendings.length ? (
          <View style={styles.list}>
            {filteredPendings.map((item) => (
              <AttentionCard
                key={item.id}
                item={item}
                saving={saving}
                onOpen={() => handleOpen(item)}
                onView={() => handleView(item)}
                onSnooze={() => handleSnooze(item)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#D90000" />
            <Text style={styles.emptyTitle}>Tudo em dia!</Text>
            <Text style={styles.emptyText}>
              Nenhum item de atenção pendente para os filtros selecionados.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label} {typeof count === "number" ? `(${count})` : ""}
      </Text>
    </TouchableOpacity>
  );
}

function AttentionCard({
  item,
  saving,
  onOpen,
  onView,
  onSnooze,
}: {
  item: TrainerHomePending;
  saving: boolean;
  onOpen: () => void;
  onView: () => void;
  onSnooze: () => void;
}) {
  return (
    <View style={[styles.card, item.viewed && styles.cardViewed]}>
      {/* Top row with avatar, name, and priority badge */}
      <TouchableOpacity style={styles.cardHeader} onPress={onOpen} activeOpacity={0.84}>
        <View style={styles.avatarWrap}>
          {item.studentAvatar ? (
            <Image source={{ uri: item.studentAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={16} color="#ffffff" />
            </View>
          )}
          <View style={[styles.priorityDot, getPriorityDotStyle(item.priority)]} />
        </View>

        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>
            {item.studentName}
          </Text>
          <Text style={styles.cardType} numberOfLines={1}>
            {item.type}
          </Text>
        </View>

        <View style={[styles.priorityPill, getPriorityPillStyle(item.priority)]}>
          <Text style={[styles.priorityPillText, getPriorityTextStyle(item.priority)]} numberOfLines={1}>
            {item.priorityLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity style={styles.cardBody} onPress={onOpen} activeOpacity={0.84}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDetail} numberOfLines={3}>
          {item.detail}
        </Text>
      </TouchableOpacity>

      {/* Action Buttons Row */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.openButton}
          onPress={onOpen}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward-circle-outline" size={16} color="#ffffff" />
          <Text style={styles.openButtonText}>{item.actionLabel || "Abrir"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewButton, item.viewed && styles.viewButtonActive]}
          onPress={onView}
          disabled={saving || item.viewed}
          activeOpacity={0.8}
        >
          <Ionicons
            name={item.viewed ? "checkmark-done" : "checkmark"}
            size={15}
            color={item.viewed ? "#22c55e" : "#888"}
          />
          <Text style={[styles.viewButtonText, item.viewed && styles.viewButtonTextActive]}>
            {item.viewed ? "Visto" : "Visto"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.snoozeButton}
          onPress={onSnooze}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={15} color="#888" />
          <Text style={styles.snoozeButtonText}>Adiar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getPriorityDotStyle(priority: TrainerHomePendingPriority) {
  switch (priority) {
    case "critical":
    case "expired":
      return { backgroundColor: "#D90000" };
    case "soon":
      return { backgroundColor: "#f97316" };
    case "admin":
      return { backgroundColor: "#ffb703" };
    case "recent":
      return { backgroundColor: "#38bdf8" };
    default:
      return { backgroundColor: "#666" };
  }
}

function getPriorityPillStyle(priority: TrainerHomePendingPriority) {
  switch (priority) {
    case "critical":
    case "expired":
      return { backgroundColor: "rgba(217, 0, 0, 0.16)", borderColor: "rgba(217, 0, 0, 0.35)" };
    case "soon":
      return { backgroundColor: "rgba(249, 115, 22, 0.16)", borderColor: "rgba(249, 115, 22, 0.35)" };
    case "admin":
      return { backgroundColor: "rgba(255, 183, 3, 0.16)", borderColor: "rgba(255, 183, 3, 0.35)" };
    case "recent":
      return { backgroundColor: "rgba(56, 189, 248, 0.16)", borderColor: "rgba(56, 189, 248, 0.35)" };
    default:
      return { backgroundColor: "#1e1e1e", borderColor: "#333" };
  }
}

function getPriorityTextStyle(priority: TrainerHomePendingPriority) {
  switch (priority) {
    case "critical":
    case "expired":
      return { color: "#ff4d4d" };
    case "soon":
      return { color: "#f97316" };
    case "admin":
      return { color: "#ffb703" };
    case "recent":
      return { color: "#38bdf8" };
    default:
      return { color: "#999" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  headerBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#D90000",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
    overflow: "hidden",
    position: "relative",
  },
  heroWatermark: {
    position: "absolute",
    right: -12,
    top: -12,
    width: 130,
    height: 130,
    opacity: 0.12,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroHeaderText: {
    flex: 1,
  },
  heroEyebrow: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#161616",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "#262626",
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  filterRail: {
    gap: 8,
    paddingBottom: 2,
  },
  filterChip: {
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  filterChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 10,
  },
  cardViewed: {
    opacity: 0.72,
    backgroundColor: "#121212",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#222",
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#161616",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  cardType: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  priorityPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  cardDetail: {
    color: "#aaaaaa",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  openButton: {
    flex: 1.2,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#D90000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  openButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  viewButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#2d2d2d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  viewButtonActive: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  viewButtonText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  viewButtonTextActive: {
    color: "#22c55e",
  },
  snoozeButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#2d2d2d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  snoozeButtonText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 6,
  },
  emptyText: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
