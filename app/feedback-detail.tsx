import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  FeedbackStatus,
  NotificationAudience,
  TrainingFeedback,
  addTrainerResponse,
  formatFeedbackDate,
  getFeedbackById,
  getFeedbackStatusLabel,
  markFeedbackViewed,
  markNotificationRead,
  updateFeedbackStatus,
} from "@/services/feedback-store";
import { useCurrentSession } from "@/hooks/use-current-session";

export default function FeedbackDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; role?: NotificationAudience; notificationId?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const role: NotificationAudience = session?.user.role === "STUDENT" ? "student" : "trainer";
  const userId = session?.user.id;
  const [feedback, setFeedback] = useState<TrainingFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async () => {
    if (!params.id || !userId) {
      setError("Feedback não encontrado.");
      setLoading(false);
      return;
    }

    setError("");

    try {
      if (params.notificationId) {
        await markNotificationRead(params.notificationId, userId);
      }

      if (role === "trainer") {
        await markFeedbackViewed(params.id, userId);
      }

      const item = await getFeedbackById(params.id, userId, role);
      setFeedback(item);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir este feedback.");
    } finally {
      setLoading(false);
    }
  }, [params.id, params.notificationId, role, userId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleResponse = async () => {
    if (!feedback || !userId || role !== "trainer") return;

    Keyboard.dismiss();
    setActionLoading(true);
    setError("");

    try {
      await addTrainerResponse(feedback.id, response, userId);
      setResponse("");
      const updated = await getFeedbackById(feedback.id, userId, "trainer");
      setFeedback(updated);
      Alert.alert("Resposta enviada", "O aluno foi notificado.");
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Falha ao responder.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (nextStatus: FeedbackStatus) => {
    if (!feedback || !userId || role !== "trainer") return;

    setActionLoading(true);
    setError("");

    try {
      await updateFeedbackStatus(feedback.id, nextStatus as "encerrado" | "visualizado" | "respondido", userId);
      const updated = await getFeedbackById(feedback.id, userId, "trainer");
      setFeedback(updated);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Falha ao alterar o status.");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmClose = () => {
    Alert.alert(
      "Encerrar feedback",
      "O histórico será mantido. Deseja encerrar este feedback?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Encerrar", style: "destructive", onPress: () => handleStatusChange("encerrado") },
      ]
    );
  };

  const reopen = () => {
    if (!feedback) return;
    handleStatusChange(feedback.responses.length > 0 ? "respondido" : "visualizado");
  };

  const renderStars = (value: number) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={value >= star ? "star" : "star-outline"}
          size={18}
          color="#D90000"
        />
      ))}
    </View>
  );

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Abrindo feedback...</Text>
      </View>
    );
  }

  if (error && !feedback) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={38} color="#ff4444" />
        <Text style={styles.centerTitle}>Não foi possível abrir</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!feedback) return null;

  const canTrainerAct = role === "trainer";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Detalhes do feedback</Text>
          <Text style={styles.headerSubtitle}>{getFeedbackStatusLabel(feedback.status)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.studentCard}>
          {feedback.studentAvatar ? (
            <Image source={{ uri: feedback.studentAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={20} color="#D90000" />
            </View>
          )}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{feedback.studentName}</Text>
            <Text style={styles.mutedText}>{feedback.workoutName}</Text>
            <Text style={styles.mutedText}>{formatFeedbackDate(feedback.finishedAt)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{getFeedbackStatusLabel(feedback.status)}</Text>
          </View>
        </View>

        {/* FOTO REGISTRADA DO ALUNO PÓS-TREINO */}
        {feedback.photoUrl && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Foto Pós-Treino</Text>
            <View style={styles.photoBox}>
              <Image source={{ uri: feedback.photoUrl }} style={styles.photoDetailImage} resizeMode="cover" />
              <View style={styles.photoOverlayBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
                <Text style={styles.photoOverlayBadgeText}>
                  {feedback.completionTime ? `Registro às ${feedback.completionTime}` : "Registro Pós-Treino"}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sessão</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plano</Text>
            <Text style={styles.infoValue}>{feedback.planName ?? "Sem plano vinculado"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Início</Text>
            <Text style={styles.infoValue}>{formatFeedbackDate(feedback.startedAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Término</Text>
            <Text style={styles.infoValue}>{formatFeedbackDate(feedback.finishedAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duração</Text>
            <Text style={styles.infoValue}>{feedback.durationMinutes} min</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Avaliação</Text>
          <View style={styles.ratingRow}>
            {renderStars(feedback.rating)}
            <Text style={styles.ratingText}>{feedback.rating}/5 estrelas</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Intensidade</Text>
            <Text style={styles.infoValue}>{feedback.intensity}</Text>
          </View>
          <Text style={styles.commentText}>
            {feedback.comment || "Aluno não adicionou comentário."}
          </Text>
        </View>

        <View style={[styles.card, feedback.hasPain && styles.attentionCard]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.sectionTitle}>Dor ou desconforto</Text>
            {feedback.hasPain && <Ionicons name="alert-circle-outline" size={20} color="#ff4444" />}
          </View>
          {feedback.hasPain ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Região</Text>
                <Text style={styles.infoValue}>{feedback.painRegion}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nível</Text>
                <Text style={styles.infoValue}>{feedback.painLevel}/10</Text>
              </View>
            </>
          ) : (
            <Text style={styles.mutedText}>Nenhum desconforto informado.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Exercícios</Text>
          {feedback.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseItem}>
              <Ionicons name="barbell-outline" size={18} color="#D90000" />
              <View style={styles.exerciseText}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.mutedText}>{exercise.prescription}</Text>
                {!!exercise.notes && <Text style={styles.exerciseNotes}>{exercise.notes}</Text>}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Histórico de respostas</Text>
          {feedback.responses.length === 0 ? (
            <Text style={styles.mutedText}>Nenhuma resposta enviada ainda.</Text>
          ) : (
            feedback.responses.map((item) => (
              <View key={item.id} style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <Text style={styles.responseAuthor}>{item.authorName}</Text>
                  <Text style={styles.responseDate}>{formatFeedbackDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.responseMessage}>{item.message}</Text>
              </View>
            ))
          )}
        </View>

        {canTrainerAct && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Responder aluno</Text>
            <TextInput
              style={styles.responseInput}
              value={response}
              onChangeText={setResponse}
              placeholder="Escreva uma orientação objetiva para o aluno..."
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
              maxLength={800}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primaryButton, actionLoading && styles.disabledButton]}
              onPress={handleResponse}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Enviar resposta</Text>
                  <Ionicons name="send" size={18} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {canTrainerAct && (
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleStatusChange("visualizado")}>
              <Ionicons name="eye-outline" size={18} color="#D90000" />
              <Text style={styles.actionText}>Visualizado</Text>
            </TouchableOpacity>

            {feedback.status === "encerrado" ? (
              <TouchableOpacity style={styles.actionButton} onPress={reopen}>
                <Ionicons name="refresh" size={18} color="#D90000" />
                <Text style={styles.actionText}>Reabrir</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionButton} onPress={confirmClose}>
                <Ionicons name="lock-closed-outline" size={18} color="#ff4444" />
                <Text style={styles.actionText}>Encerrar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/profile")}>
              <Ionicons name="person-outline" size={18} color="#D90000" />
              <Text style={styles.actionText}>Perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/training")}>
              <Ionicons name="fitness-outline" size={18} color="#D90000" />
              <Text style={styles.actionText}>Treino</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#D90000",
    fontWeight: "700",
    marginTop: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
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
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
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
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  attentionCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ff4444",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 7,
  },
  infoLabel: {
    color: "#888",
    fontWeight: "700",
  },
  infoValue: {
    color: "#fff",
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },
  mutedText: {
    color: "#888",
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    gap: 3,
  },
  ratingText: {
    color: "#fff",
    fontWeight: "900",
  },
  photoBox: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#101010",
    position: "relative",
  },
  photoDetailImage: {
    width: "100%",
    height: "100%",
  },
  photoOverlayBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  photoOverlayBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  commentText: {
    color: "#fff",
    lineHeight: 21,
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  exerciseText: {
    flex: 1,
  },
  exerciseName: {
    color: "#fff",
    fontWeight: "800",
  },
  exerciseNotes: {
    color: "#666",
    marginTop: 4,
    lineHeight: 18,
  },
  responseCard: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  responseAuthor: {
    color: "#fff",
    fontWeight: "800",
  },
  responseDate: {
    color: "#666",
    fontSize: 12,
  },
  responseMessage: {
    color: "#ddd",
    lineHeight: 20,
  },
  responseInput: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    minHeight: 120,
    padding: 14,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: "#ff4444",
    marginBottom: 10,
    lineHeight: 19,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionText: {
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
});
