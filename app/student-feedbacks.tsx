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
  TrainingFeedback,
  formatFeedbackDate,
  getFeedbackStatusLabel,
  listFeedbacksForStudent,
  listFeedbacksForTrainer,
} from "@/services/feedback-store";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function StudentFeedbacksScreen() {
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFeedbacks = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const isTrainer = session.user.role === "TRAINER";
      const items = isTrainer
        ? await listFeedbacksForTrainer(session.user.id)
        : await listFeedbacksForStudent(session.user.id);
      setFeedbacks(items);
    } catch {
      setError("Não foi possível carregar os feedbacks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadFeedbacks();
    }, [loadFeedbacks])
  );

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
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      onPress={() =>
        router.push({
          pathname: "/feedback-detail" as never,
          params: { id: item.id, role: session?.user.role === "TRAINER" ? "trainer" : "student" },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: theme.cardSecondary }]}>
          <Ionicons name="fitness-outline" size={18} color="#D90000" />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{item.workoutName}</Text>
          <Text style={[styles.dateText, { color: theme.textMuted }]}>{formatFeedbackDate(item.finishedAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
          <Text style={[styles.statusText, { color: theme.text }]}>{getFeedbackStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {renderStars(item.rating)}
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.intensity}</Text>
      </View>

      <Text style={[styles.commentText, { color: theme.text }]} numberOfLines={3}>
        {item.comment || "Você não adicionou comentário."}
      </Text>

      <View style={styles.footerRow}>
        <View style={[styles.footerFlag, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
          <Ionicons
            name={item.responses.length > 0 ? "chatbubble" : "chatbubble-outline"}
            size={14}
            color="#D90000"
          />
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {item.responses.length > 0
              ? `${item.responses.length} resposta(s)`
              : "Aguardando resposta"}
          </Text>
        </View>
        {item.hasPain && (
          <View style={[styles.footerFlag, { backgroundColor: isDark ? "rgba(255, 68, 68, 0.12)" : "rgba(255, 68, 68, 0.08)", borderColor: "rgba(255, 68, 68, 0.3)" }]}>
            <Ionicons name="alert-circle-outline" size={14} color="#ff4444" />
            <Text style={[styles.footerText, { color: "#ff4444" }]}>Dor informada</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadFeedbacks()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
            {session?.user.role === "TRAINER" ? "Feedbacks dos Alunos" : "Meus feedbacks"}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {session?.user.role === "TRAINER" ? "Devolutivas e respostas dos alunos" : "Respostas e avaliações enviadas"}
          </Text>
        </View>
      </View>

      <FlatList
        data={feedbacks}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedback}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.centerTitle}>Nenhum feedback enviado</Text>
            <Text style={styles.centerText}>
              Depois de finalizar um treino, seu feedback aparecerá aqui.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleBlock: {
    flex: 1,
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
    paddingBottom: 36,
  },
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleBlock: {
    flex: 1,
  },
  workoutName: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  dateText: {
    color: "#666",
    marginTop: 4,
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
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
  },
  commentText: {
    color: "#fff",
    marginTop: 12,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  footerFlag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#101010",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  footerText: {
    color: "#888",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
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
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  centerText: {
    color: "#888",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#D90000",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
});
