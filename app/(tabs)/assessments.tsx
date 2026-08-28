import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  PhysicalAssessment,
  createAssessmentDraft,
  formatAssessmentDate,
  getAssessmentStatusLabel,
  getAssessmentSummary,
  getAssessmentTypeLabel,
  listAssessmentsForTrainer,
  softDeleteAssessment,
} from "@/services/assessment-store";
import { exportAssessmentToPdf } from "@/services/assessment-pdf-service";
import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";

type FilterTab = "all" | "completed" | "draft";

export default function AssessmentsScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [exportingId, setExportingId] = useState<string | null>(null);

  const loadAssessments = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const items = await listAssessmentsForTrainer(session.user.id);
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

  const handleCreate = async () => {
    if (!session) return;
    setCreating(true);
    try {
      const draft = await createAssessmentDraft({ trainerId: session.user.id, trainerName: session.user.name });
      router.push({ pathname: "/assessment-editor" as never, params: { id: draft.id } });
    } catch {
      Alert.alert("Falha ao iniciar", "Não foi possível criar a avaliação agora.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (assessmentId: string, studentName: string) => {
    Alert.alert(
      "Excluir Avaliação",
      `Deseja realmente remover a avaliação de ${studentName}? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await softDeleteAssessment(assessmentId);
              setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
            } catch {
              Alert.alert("Erro", "Não foi possível excluir a avaliação.");
            }
          },
        },
      ]
    );
  };

  const handleExportPdf = async (item: PhysicalAssessment) => {
    setExportingId(item.id);
    try {
      await exportAssessmentToPdf(item, session?.user.id);
    } catch {
      Alert.alert("Erro", "Falha ao gerar o laudo em PDF.");
    } finally {
      setExportingId(null);
    }
  };

  const completedList = useMemo(() => assessments.filter((item) => item.status === "concluida"), [assessments]);
  const draftList = useMemo(() => assessments.filter((item) => item.status !== "concluida"), [assessments]);

  const filteredAssessments = useMemo(() => {
    let list = assessments;

    if (activeTab === "completed") {
      list = completedList;
    } else if (activeTab === "draft") {
      list = draftList;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.studentName.toLowerCase().includes(query) ||
          getAssessmentTypeLabel(a.type).toLowerCase().includes(query)
      );
    }

    return list;
  }, [assessments, activeTab, searchQuery, completedList, draftList]);

  const renderAssessment = ({ item }: { item: PhysicalAssessment }) => {
    const summary = getAssessmentSummary(item);
    const isDraft = item.status !== "concluida";
    const comp = item.composition;
    const isExporting = exportingId === item.id;

    return (
      <View style={styles.card}>
        {/* HEADER DO CARD */}
        <View style={styles.cardTop}>
          {item.studentAvatar ? (
            <Image source={{ uri: item.studentAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={20} color="#D90000" />
            </View>
          )}

          <View style={styles.cardInfo}>
            <View style={styles.studentNameRow}>
              <Text style={styles.studentName} numberOfLines={1}>
                {item.studentName}
              </Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{getAssessmentTypeLabel(item.type)}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="#777" />
                <Text style={styles.cardMeta}>{formatAssessmentDate(item.assessedAt)}</Text>
              </View>
              {item.nextAssessmentAt && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#777" />
                  <Text style={styles.cardMeta}>Próx: {formatAssessmentDate(item.nextAssessmentAt)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* STATUS PILL */}
          <View style={[styles.statusBadge, isDraft ? styles.statusBadgeDraft : styles.statusBadgeCompleted]}>
            <Ionicons
              name={isDraft ? "create-outline" : "checkmark-circle"}
              size={12}
              color={isDraft ? "#FF4D4D" : "#22C55E"}
            />
            <Text style={[styles.statusText, isDraft ? styles.statusTextDraft : styles.statusTextCompleted]}>
              {getAssessmentStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* PROGRESS TRACK */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${summary.progressPercent}%` },
                !isDraft && styles.progressFillCompleted,
              ]}
            />
          </View>
          <View style={styles.progressInfoRow}>
            <Text style={styles.progressText}>
              {summary.completedSteps} de {summary.totalSteps} etapas concluídas
            </Text>
            <Text style={[styles.progressPercentText, !isDraft && styles.progressPercentTextCompleted]}>
              {summary.progressPercent}%
            </Text>
          </View>
        </View>

        {/* CHIPS DE RESULTADOS OU PENDÊNCIAS */}
        {isDraft ? (
          summary.pendingCount > 0 && (
            <View style={styles.pendingChipsContainer}>
              <View style={styles.pendingHeaderRow}>
                <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
                <Text style={styles.pendingHeaderTitle}>Etapas Pendentes:</Text>
              </View>
              <View style={styles.chipsWrap}>
                {summary.pendingLabels.slice(0, 3).map((label, idx) => (
                  <View key={idx} style={styles.pendingChip}>
                    <Text style={styles.pendingChipText} numberOfLines={1}>
                      {label.replace(/^Geral:\s*/, "")}
                    </Text>
                  </View>
                ))}
                {summary.pendingCount > 3 && (
                  <View style={styles.pendingChipMore}>
                    <Text style={styles.pendingChipMoreText}>+{summary.pendingCount - 3}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        ) : (
          <View style={styles.resultsChipsContainer}>
            <View style={styles.chipsWrap}>
              {comp.weightKg ? (
                <View style={styles.metricChip}>
                  <Ionicons name="scale-outline" size={11} color="#86EFAC" />
                  <Text style={styles.metricChipText}>{comp.weightKg} kg</Text>
                </View>
              ) : null}
              {comp.bodyFatPercent ? (
                <View style={styles.metricChip}>
                  <Ionicons name="flame-outline" size={11} color="#86EFAC" />
                  <Text style={styles.metricChipText}>{comp.bodyFatPercent.toFixed(1)}% Gordura</Text>
                </View>
              ) : null}
              {comp.leanMassKg ? (
                <View style={styles.metricChip}>
                  <Ionicons name="fitness-outline" size={11} color="#86EFAC" />
                  <Text style={styles.metricChipText}>{comp.leanMassKg.toFixed(1)} kg Magra</Text>
                </View>
              ) : null}
              {comp.bmi ? (
                <View style={styles.metricChip}>
                  <Ionicons name="speedometer-outline" size={11} color="#86EFAC" />
                  <Text style={styles.metricChipText}>IMC {comp.bmi.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* FOOTER ACTIONS */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, !isDraft && styles.secondaryActionBtn]}
            onPress={() =>
              router.push({
                pathname: isDraft ? ("/assessment-editor" as never) : ("/assessment-detail" as never),
                params: { id: item.id, role: "trainer" },
              })
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name={isDraft ? "play" : "document-text-outline"}
              size={14}
              color={isDraft ? "#FFFFFF" : "#D90000"}
            />
            <Text style={[styles.primaryActionBtnText, !isDraft && styles.secondaryActionBtnText]}>
              {isDraft ? "Continuar Avaliação" : "Ver Laudo Completo"}
            </Text>
          </TouchableOpacity>

          {!isDraft ? (
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => handleExportPdf(item)}
              activeOpacity={0.8}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#D90000" />
              ) : (
                <Ionicons name="share-social-outline" size={16} color="#CCCCCC" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => handleDelete(item.id, item.studentName)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#FF6666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#D90000" />
        <Text style={styles.centerText}>Carregando avaliações...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={44} color="#D90000" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadAssessments()}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={filteredAssessments}
      keyExtractor={(item) => item.id}
      renderItem={renderAssessment}
      contentContainerStyle={[
        styles.listContent,
        {
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.topPadding,
          paddingBottom: layout.tabBarContentPadding + 20,
          maxWidth: layout.contentMaxWidth,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAssessments(true)}
          tintColor="#D90000"
        />
      }
      ListHeaderComponent={
        <View style={styles.headerContainer}>
          {/* TOP BAR HEADER */}
          <View style={styles.topHeader}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Avaliações</Text>
              <Text style={styles.subtitle}>
                {draftList.length > 0
                  ? `${draftList.length} rascunho(s) pendente(s) para finalizar`
                  : `${completedList.length} avaliação(ões) física(s) registrada(s)`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => loadAssessments(true)}
              activeOpacity={0.8}
              hitSlop={8}
            >
              <Ionicons name="refresh-outline" size={18} color="#D90000" />
            </TouchableOpacity>
          </View>

          {/* DASHBOARD STATS ROW */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconBox}>
                <Ionicons name="documents-outline" size={15} color="#AAAAAA" />
              </View>
              <Text style={styles.statValue}>{assessments.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBox, styles.statIconBoxGreen]}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#22C55E" />
              </View>
              <Text style={[styles.statValue, styles.statValueGreen]}>{completedList.length}</Text>
              <Text style={styles.statLabel}>Concluídas</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBox, styles.statIconBoxOrange]}>
                <Ionicons name="time-outline" size={15} color="#F59E0B" />
              </View>
              <Text style={[styles.statValue, styles.statValueOrange]}>{draftList.length}</Text>
              <Text style={styles.statLabel}>Rascunhos</Text>
            </View>
          </View>

          {/* ACTION BUTTONS ROW */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Nova Avaliação</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, completedList.length < 2 && styles.disabledButton]}
              disabled={completedList.length < 2}
              onPress={() => router.push("/assessment-compare" as never)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="git-compare-outline"
                size={16}
                color={completedList.length < 2 ? "#555" : "#FFFFFF"}
              />
              <Text style={[styles.secondaryButtonText, completedList.length < 2 && styles.disabledText]}>
                Comparar
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#777777" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar aluno ou protocolo..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={6}>
                <Ionicons name="close-circle" size={16} color="#777777" />
              </TouchableOpacity>
            )}
          </View>

          {/* FILTER CHIPS (TABS) */}
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.filterChip, activeTab === "all" && styles.filterChipActive]}
              onPress={() => setActiveTab("all")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, activeTab === "all" && styles.filterChipTextActive]}>
                Todas ({assessments.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeTab === "completed" && styles.filterChipActive]}
              onPress={() => setActiveTab("completed")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, activeTab === "completed" && styles.filterChipTextActive]}>
                Concluídas ({completedList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeTab === "draft" && styles.filterChipActive]}
              onPress={() => setActiveTab("draft")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, activeTab === "draft" && styles.filterChipTextActive]}>
                Rascunhos ({draftList.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="clipboard-outline" size={32} color="#D90000" />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? "Nenhum resultado encontrado" : "Nenhuma avaliação cadastrada"}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? `Nenhuma avaliação corresponde ao termo "${searchQuery}".`
              : "Inicie uma avaliação física para registrar antropometria, fotos posturais e laudos comparativos."}
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.emptyActionButton} onPress={handleCreate} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionButtonText}>Criar Primeira Avaliação</Text>
            </TouchableOpacity>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  listContent: {
    backgroundColor: "#0a0a0a",
    width: "100%",
    alignSelf: "center",
  },
  headerContainer: {
    marginBottom: 16,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#888888",
    fontSize: 12,
    marginTop: 4,
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1C1414",
    borderWidth: 1,
    borderColor: "#331818",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Stats Row */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statIconBoxGreen: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  statIconBoxOrange: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  statValueGreen: {
    color: "#22C55E",
  },
  statValueOrange: {
    color: "#F59E0B",
  },
  statLabel: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },

  /* Action Buttons */
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  secondaryButton: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.45,
  },
  disabledText: {
    color: "#666666",
  },

  /* Search Bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12.5,
    paddingVertical: 0,
  },

  /* Filter Chips */
  filterChipsRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: "#2B1414",
    borderColor: "#D90000",
  },
  filterChipText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  /* Assessment Card */
  card: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#D90000",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E1212",
    borderWidth: 1.5,
    borderColor: "#4A1C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studentName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    flexShrink: 1,
  },
  typeBadge: {
    backgroundColor: "#202020",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    color: "#AAAAAA",
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMeta: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusBadgeDraft: {
    backgroundColor: "#261313",
    borderColor: "#4D1C1C",
  },
  statusBadgeCompleted: {
    backgroundColor: "#0F2417",
    borderColor: "#194D2B",
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "900",
  },
  statusTextDraft: {
    color: "#FF4D4D",
  },
  statusTextCompleted: {
    color: "#22C55E",
  },

  /* Progress Section */
  progressContainer: {
    marginTop: 12,
  },
  progressTrack: {
    height: 5,
    backgroundColor: "#121212",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D90000",
    borderRadius: 999,
  },
  progressFillCompleted: {
    backgroundColor: "#22C55E",
  },
  progressInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  progressText: {
    color: "#777777",
    fontSize: 10.5,
    fontWeight: "700",
  },
  progressPercentText: {
    color: "#D90000",
    fontSize: 10.5,
    fontWeight: "900",
  },
  progressPercentTextCompleted: {
    color: "#22C55E",
  },

  /* Pending Chips */
  pendingChipsContainer: {
    marginTop: 10,
    backgroundColor: "#19140C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#332612",
    padding: 8,
  },
  pendingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  pendingHeaderTitle: {
    color: "#F59E0B",
    fontSize: 10.5,
    fontWeight: "800",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pendingChip: {
    backgroundColor: "#261C10",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#4A3519",
  },
  pendingChipText: {
    color: "#FCD34D",
    fontSize: 10,
    fontWeight: "700",
  },
  pendingChipMore: {
    backgroundColor: "#261C10",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#4A3519",
  },
  pendingChipMoreText: {
    color: "#FCD34D",
    fontSize: 10,
    fontWeight: "900",
  },

  /* Metric Chips for Completed Assessments */
  resultsChipsContainer: {
    marginTop: 10,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#112015",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#1C3E25",
  },
  metricChipText: {
    color: "#86EFAC",
    fontSize: 10.5,
    fontWeight: "800",
  },

  /* Card Footer Actions */
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },
  primaryActionBtn: {
    flex: 1,
    height: 38,
    backgroundColor: "#D90000",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  secondaryActionBtn: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2E2E2E",
  },
  secondaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    padding: 24,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#201212",
    borderWidth: 1,
    borderColor: "#3E1B1B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "#888888",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  emptyActionButton: {
    marginTop: 16,
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyActionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  /* Center Loading / Error States */
  centerState: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  centerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },
  centerText: {
    color: "#888888",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});

