import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
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

export default function StudentAssessmentsScreen() {
  const { session, loadingSession } = useCurrentSession();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  const renderAssessment = ({ item }: { item: PhysicalAssessment }) => {
    const summary = getAssessmentSummary(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/assessment-detail" as never,
            params: { id: item.id, role: session?.user.role === "TRAINER" ? "trainer" : "student" },
          })
        }
      >
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <Ionicons name="clipboard-outline" size={22} color="#D90000" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{getAssessmentTypeLabel(item.type)}</Text>
            <Text style={styles.mutedText}>{formatAssessmentDate(item.assessedAt)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{getAssessmentStatusLabel(item.status)}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.flag}>
            <Ionicons name="analytics-outline" size={14} color="#D90000" />
            <Text style={styles.flagText}>{summary.progressPercent}% completo</Text>
          </View>
          <View style={styles.flag}>
            <Ionicons name="images-outline" size={14} color="#D90000" />
            <Text style={styles.flagText}>{item.photos.length} foto(s)</Text>
          </View>
        </View>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {session?.user.role === "TRAINER" ? "Avaliações dos Alunos" : "Minhas avaliações"}
          </Text>
          <Text style={styles.subtitle}>
            {session?.user.role === "TRAINER" ? "Relatórios físicos e funcionais" : "Relatórios liberados pelo personal"}
          </Text>
        </View>
        {session?.user.role === "TRAINER" ? (
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => router.push("/assessment-editor" as never)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={assessments}
        keyExtractor={(item) => item.id}
        renderItem={renderAssessment}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAssessments(true)} tintColor="#D90000" />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={40} color="#D90000" />
            <Text style={styles.centerTitle}>Nenhuma avaliação liberada</Text>
            <Text style={styles.centerText}>Quando o personal liberar um relatório, ele aparecerá aqui.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 34 }} />}
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
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: "#888",
    marginTop: 3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  mutedText: {
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
    fontWeight: "800",
    fontSize: 11,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  flag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#101010",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  flagText: {
    color: "#888",
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    padding: 24,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
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
    textAlign: "center",
    marginTop: 10,
  },
  centerText: {
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  newButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
});
