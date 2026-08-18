import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
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
} from "@/services/assessment-store";
import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";

export default function AssessmentsScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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

  const completed = assessments.filter((item) => item.status === "concluida");
  const draft = assessments.find((item) => item.status !== "concluida");

  const renderAssessment = ({ item }: { item: PhysicalAssessment }) => {
    const summary = getAssessmentSummary(item);
    const isDraft = item.status !== "concluida";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: isDraft ? "/assessment-editor" as never : "/assessment-detail" as never,
            params: { id: item.id, role: "trainer" },
          })
        }
      >
        <View style={styles.cardTop}>
          {item.studentAvatar ? (
            <Image source={{ uri: item.studentAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={20} color="#D90000" />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={styles.cardMeta}>
              {getAssessmentTypeLabel(item.type)} • {formatAssessmentDate(item.assessedAt)}
            </Text>
            <Text style={styles.cardMeta}>Próxima: {formatAssessmentDate(item.nextAssessmentAt)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{getAssessmentStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${summary.progressPercent}%` }]} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            {summary.completedSteps}/{summary.totalSteps} etapas • {summary.progressPercent}%
          </Text>
          <View style={styles.openButton}>
            <Text style={styles.openButtonText}>{isDraft ? "Continuar" : "Relatório"}</Text>
            <Ionicons name="chevron-forward" size={16} color="#000" />
          </View>
        </View>

        {summary.pendingCount > 0 && (
          <Text style={styles.pendingText} numberOfLines={2}>
            Pendências: {summary.pendingLabels.slice(0, 3).join(", ")}
          </Text>
        )}
      </TouchableOpacity>
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
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadAssessments()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={assessments}
      keyExtractor={(item) => item.id}
      renderItem={renderAssessment}
      contentContainerStyle={[
        styles.listContent,
        {
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.topPadding,
          paddingBottom: layout.tabBarContentPadding,
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
        <View>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Avaliações</Text>
              <Text style={styles.subtitle}>
                {draft ? "Há um rascunho para retomar" : `${completed.length} avaliação(ões) concluída(s)`}
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="clipboard-outline" size={22} color="#D90000" />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={creating}>
              {creating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color="#000" />
                  <Text style={styles.primaryButtonText}>Nova avaliação</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, completed.length < 2 && styles.disabledButton]}
              disabled={completed.length < 2}
              onPress={() => router.push("/assessment-compare" as never)}
            >
              <Ionicons name="git-compare-outline" size={18} color={completed.length < 2 ? "#555" : "#D90000"} />
              <Text style={[styles.secondaryButtonText, completed.length < 2 && styles.disabledText]}>Comparar</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Ionicons name="clipboard-outline" size={40} color="#D90000" />
          <Text style={styles.centerTitle}>Nenhuma avaliação</Text>
          <Text style={styles.centerText}>
            Inicie uma avaliação física para registrar dados, fotos, postura e comparação de evolução.
          </Text>
        </View>
      }
      ListFooterComponent={<View style={styles.footerSpacer} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  listContent: {
    backgroundColor: "#0f0f0f",
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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
    backgroundColor: "#D900003f",
    borderWidth: 1,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    flex: 1,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: "#555",
  },
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#D90000",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  studentName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  cardMeta: {
    color: "#888",
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#101010",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D90000",
  },
  footerSpacer: {
    height: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10,
  },
  footerText: {
    color: "#888",
    flex: 1,
  },
  openButton: {
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  openButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  pendingText: {
    color: "#f6c343",
    marginTop: 10,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    padding: 24,
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  centerText: {
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
