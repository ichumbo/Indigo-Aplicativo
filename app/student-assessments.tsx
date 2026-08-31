import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  PhysicalAssessment,
  formatAssessmentDate,
  getAssessmentStatusLabel,
  getAssessmentSummary,
  getAssessmentTypeLabel,
  listAssessmentsForStudent,
  listAssessmentsForTrainer,
} from "@/services/assessment-store";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";

type FilterStatus = "all" | "concluida" | "rascunho";

function getStatusTheme(status: PhysicalAssessment["status"], theme: any) {
  switch (status) {
    case "concluida":
      return {
        label: "Concluída",
        color: theme.badgeSuccessText,
        bgColor: theme.badgeSuccess,
        borderColor: "transparent",
      };
    case "em_andamento":
      return {
        label: "Em andamento",
        color: "#00A3FF",
        bgColor: "rgba(0, 163, 255, 0.12)",
        borderColor: "rgba(0, 163, 255, 0.3)",
      };
    case "rascunho":
    default:
      return {
        label: "Rascunho",
        color: theme.badgeNeutralText,
        bgColor: theme.badgeNeutral,
        borderColor: theme.badgeNeutralBorder,
      };
  }
}

export default function StudentAssessmentsScreen() {
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>("all");

  const loadAssessments = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");
    try {
      const isTrainer = session.user.role === "TRAINER";
      const items = isTrainer
        ? await listAssessmentsForTrainer(session.user.id)
        : await listAssessmentsForStudent(session.user.id);
      setAssessments(items);
    } catch {
      setError("Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadAssessments();
    }, [loadAssessments])
  );

  const isTrainer = session?.user.role === "TRAINER";

  const totalCount = assessments.length;
  const concludedCount = useMemo(
    () => assessments.filter((a) => a.status === "concluida").length,
    [assessments]
  );
  const draftCount = useMemo(
    () => assessments.filter((a) => a.status !== "concluida").length,
    [assessments]
  );

  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      const typeLabel = getAssessmentTypeLabel(item.type).toLowerCase();
      const studentName = (item.studentName || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || typeLabel.includes(q) || studentName.includes(q);

      if (selectedFilter === "concluida") {
        return matchesSearch && item.status === "concluida";
      }
      if (selectedFilter === "rascunho") {
        return matchesSearch && item.status !== "concluida";
      }
      return matchesSearch;
    });
  }, [assessments, searchQuery, selectedFilter]);

  const renderAssessmentItem = ({ item }: { item: PhysicalAssessment }) => {
    const summary = getAssessmentSummary(item);
    const isCompleted = item.status === "concluida";
    const statusTheme = getStatusTheme(item.status, theme);
    const typeLabel = getAssessmentTypeLabel(item.type);

    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {/* Card Header clickable */}
        <TouchableOpacity
          style={styles.cardHeaderRow}
          onPress={() =>
            router.push({
              pathname: "/assessment-detail" as never,
              params: { id: item.id, role: isTrainer ? "trainer" : "student" },
            })
          }
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.cardSecondary }]}>
            <Ionicons name="clipboard-outline" size={20} color="#D90000" />
          </View>

          <View style={styles.cardMainContent}>
            <View style={styles.cardTitleLine}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {typeLabel}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusTheme.bgColor,
                    borderColor: statusTheme.borderColor,
                  },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: statusTheme.color }]} />
                <Text style={[styles.statusText, { color: statusTheme.color }]}>
                  {getAssessmentStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.cardSubtitleRow}>
              {isTrainer && item.studentName ? (
                <>
                  <Text style={[styles.studentNameText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.studentName}
                  </Text>
                  <Text style={[styles.metaDot, { color: theme.textMuted }]}>•</Text>
                </>
              ) : null}
              <Text style={[styles.dateText, { color: theme.textMuted }]}>{formatAssessmentDate(item.assessedAt)}</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Progress Bar Track */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeaderRow}>
            <View style={styles.progressLabelLeft}>
              <Ionicons name="analytics-outline" size={12} color="#D90000" />
              <Text style={[styles.progressSectionLabel, { color: theme.textSecondary }]}>Progresso do Laudo</Text>
            </View>
            <Text style={[styles.progressPercentText, { color: theme.textSecondary }]}>
              {summary.progressPercent}% ({summary.completedSteps}/{summary.totalSteps} etapas)
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.cardSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(summary.progressPercent, 4)}%`,
                  backgroundColor: summary.progressPercent === 100 ? "#10B981" : "#D90000",
                },
              ]}
            />
          </View>
        </View>

        {/* Metadata Info Rail */}
        <View style={[styles.metadataRail, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
          <View style={styles.metaRailItem}>
            <Ionicons name="images-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.metaRailText, { color: theme.textSecondary }]}>
              {item.photos?.length || 0} {item.photos?.length === 1 ? "foto" : "fotos"}
            </Text>
          </View>

          <View style={[styles.metaRailDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.metaRailItem}>
            <Ionicons name="body-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.metaRailText, { color: theme.textSecondary }]}>
              {item.composition?.weightKg ? `${item.composition.weightKg} kg` : "Peso pendente"}
            </Text>
          </View>

          <View style={[styles.metaRailDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.metaRailItem}>
            <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.metaRailText, { color: theme.textSecondary }]}>
              Retorno: {formatAssessmentDate(item.nextAssessmentAt)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[styles.actionButtonSecondary, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() =>
              router.push({
                pathname: "/assessment-detail" as never,
                params: { id: item.id, role: isTrainer ? "trainer" : "student" },
              })
            }
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={13} color={theme.text} />
            <Text style={[styles.actionButtonSecondaryText, { color: theme.text }]}>Ver Laudo</Text>
          </TouchableOpacity>

          {isTrainer && !isCompleted ? (
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() =>
                router.push({
                  pathname: "/assessment-editor" as never,
                  params: { id: item.id },
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={13} color="#FFFFFF" />
              <Text style={styles.actionButtonPrimaryText}>Continuar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando avaliações...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={40} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadAssessments()}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBlock}>
          <Text style={[styles.title, { color: theme.text }]}>
            {isTrainer ? "Avaliações dos Alunos" : "Minhas Avaliações"}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isTrainer ? "Relatórios físicos e funcionais" : "Relatórios liberados pelo personal"}
          </Text>
        </View>

        {isTrainer ? (
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => router.push("/assessment-editor" as never)}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Nova Avaliação"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, selectedFilter === "all" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("all")}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, { color: theme.textSecondary }, selectedFilter === "all" && styles.filterChipTextActive]}>
            Todas ({totalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, selectedFilter === "concluida" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("concluida")}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, { color: theme.textSecondary }, selectedFilter === "concluida" && styles.filterChipTextActive]}>
            Concluídas ({concludedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, selectedFilter === "rascunho" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("rascunho")}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, { color: theme.textSecondary }, selectedFilter === "rascunho" && styles.filterChipTextActive]}>
            Rascunhos ({draftCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar (if more than 2 items) */}
      {totalCount > 2 ? (
        <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
          <Ionicons name="search" size={14} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={isTrainer ? "Buscar por aluno ou tipo..." : "Buscar avaliação..."}
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={6}>
              <Ionicons name="close-circle" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* List */}
      <FlatList
        data={filteredAssessments}
        keyExtractor={(item) => item.id}
        renderItem={renderAssessmentItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAssessments(true)} tintColor="#D90000" />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.cardSecondary }]}>
              <Ionicons name="clipboard-outline" size={32} color="#D90000" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery || selectedFilter !== "all"
                ? "Nenhuma avaliação encontrada"
                : "Nenhuma avaliação cadastrada"}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery || selectedFilter !== "all"
                ? "Tente ajustar os filtros ou termo de busca."
                : isTrainer
                ? "Toque no botão + acima para cadastrar a primeira avaliação física."
                : "Quando seu personal cadastrar seu laudo, ele aparecerá aqui."}
            </Text>
            {isTrainer && !searchQuery && selectedFilter === "all" ? (
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => router.push("/assessment-editor" as never)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyCreateBtnText}>Criar Nova Avaliação</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  newButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
  },
  filterChipActive: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderColor: "#D90000",
  },
  filterChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#121212",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222222",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12.5,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  cardMainContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  cardTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "900",
    letterSpacing: -0.2,
    flex: 1,
  },
  cardSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  studentNameText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "700",
    maxWidth: "50%",
  },
  metaDot: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "900",
  },
  dateText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  progressSection: {
    gap: 5,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  progressSectionLabel: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  progressPercentText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "800",
  },
  progressTrack: {
    height: 5,
    backgroundColor: "#0d0d0d",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  metadataRail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0e0e0e",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaRailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaRailDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#222222",
  },
  metaRailText: {
    color: "#aaaaaa",
    fontSize: 11,
    fontWeight: "700",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1c1c1c",
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#181818",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 7.5,
  },
  actionButtonSecondaryText: {
    color: "#dddddd",
    fontSize: 11.5,
    fontWeight: "800",
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#D90000",
    borderRadius: 8,
    paddingVertical: 7.5,
  },
  actionButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    padding: 24,
    marginTop: 20,
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "#888888",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  centerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 4,
  },
  centerText: {
    color: "#888888",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});
