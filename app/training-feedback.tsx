import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  FeedbackIntensity,
  CURRENT_WORKOUT,
  SubmitFeedbackContext,
  hasFeedbackForExecution,
  skipWorkoutFeedback,
  submitWorkoutFeedback,
} from "@/services/feedback-store";
import { useCurrentSession } from "@/hooks/use-current-session";
import { getTrainingExecutionFeedbackContext } from "@/services/training-plan-store";

const intensities: FeedbackIntensity[] = [
  "Muito leve",
  "Leve",
  "Adequado",
  "Intenso",
  "Muito intenso",
];

const painRegions = ["Ombro", "Lombar", "Joelho", "Quadril", "Punho", "Outro"];

export default function TrainingFeedbackScreen() {
  const params = useLocalSearchParams<{ executionId?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [intensity, setIntensity] = useState<FeedbackIntensity | null>(null);
  const [hasPain, setHasPain] = useState(false);
  const [painRegion, setPainRegion] = useState("");
  const [customPainRegion, setCustomPainRegion] = useState("");
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(true);
  const [alreadySent, setAlreadySent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackContext, setFeedbackContext] = useState<SubmitFeedbackContext | undefined>(undefined);

  const executionId = params.executionId;
  const workoutName = feedbackContext?.workoutName ?? CURRENT_WORKOUT.name;

  useEffect(() => {
    let mounted = true;

    if (!session) {
      if (!loadingSession) {
        setErrorMessage("Sessao obrigatoria para enviar feedback.");
        setCheckingDuplicate(false);
      }
      return;
    }
    if (session.user.role !== "STUDENT") {
      setErrorMessage("Somente o aluno pode enviar feedback pos-treino.");
      setCheckingDuplicate(false);
      return;
    }

    Promise.all([
      executionId ? getTrainingExecutionFeedbackContext(executionId) : Promise.resolve(undefined),
      hasFeedbackForExecution(executionId),
    ])
      .then(([context, exists]) => {
        if (!mounted) return;
        if (context && context.studentId !== session.user.id) {
          throw new Error("Esta execucao nao pertence ao aluno autenticado.");
        }
        setFeedbackContext(context);
        setAlreadySent(exists);
      })
      .catch(() => {
        if (!mounted) return;
        setErrorMessage("Não foi possível verificar o feedback deste treino.");
      })
      .finally(() => {
        if (mounted) setCheckingDuplicate(false);
      });

    return () => {
      mounted = false;
    };
  }, [executionId, loadingSession, session]);

  const validate = () => {
    if (rating === 0) return "Avalie o treino de 1 a 5 estrelas.";
    if (!intensity) return "Informe como você sentiu a intensidade do treino.";
    const selectedPainRegion = painRegion === "Outro" ? customPainRegion : painRegion;
    if (hasPain && !selectedPainRegion.trim()) return "Informe a região do desconforto.";
    if (hasPain && painLevel === null) return "Informe o nível da dor.";
    return "";
  };

  const handleSubmit = async () => {
    if (session?.user.role !== "STUDENT") {
      setErrorMessage("Somente o aluno pode enviar feedback pos-treino.");
      return;
    }

    const validation = validate();
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const selectedPainRegion = painRegion === "Outro" ? customPainRegion : painRegion;

      await submitWorkoutFeedback(
        {
          rating,
          comment,
          intensity: intensity as FeedbackIntensity,
          hasPain,
          painRegion: selectedPainRegion,
          painLevel: painLevel ?? undefined,
        },
        feedbackContext
      );

      setAlreadySent(true);
      Alert.alert("Feedback enviado", "Seu personal foi notificado.", [
        { text: "OK", onPress: () => router.replace("/training") },
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      await skipWorkoutFeedback(executionId);
      router.replace("/training");
    } catch {
      setErrorMessage("Não foi possível finalizar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Feedback do treino</Text>
          <Text style={styles.subtitle}>{workoutName}</Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loadingSession || checkingDuplicate ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#D90000" />
            <Text style={styles.loadingText}>Verificando sessão...</Text>
          </View>
        ) : alreadySent ? (
          <View style={styles.confirmationCard}>
            <Ionicons name="checkmark-circle" size={44} color="#D90000" />
            <Text style={styles.confirmationTitle}>Feedback já enviado</Text>
            <Text style={styles.confirmationText}>
              Esta execução de treino já possui um feedback registrado.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/training")}>
              <Text style={styles.primaryButtonText}>Voltar para treinos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="star-outline" size={20} color="#D90000" />
                <Text style={styles.cardTitle}>Como foi o treino?</Text>
              </View>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => setRating(star)}
                    accessibilityRole="button"
                    accessibilityLabel={`Avaliar com ${star} estrelas`}
                  >
                    <Ionicons
                      name={rating >= star ? "star" : "star-outline"}
                      size={34}
                      color="#D90000"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="speedometer-outline" size={20} color="#D90000" />
                <Text style={styles.cardTitle}>Intensidade percebida</Text>
              </View>

              <View style={styles.chipsWrap}>
                {intensities.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, intensity === option && styles.chipActive]}
                    onPress={() => setIntensity(option)}
                  >
                    <Text style={[styles.chipText, intensity === option && styles.chipTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#D90000" />
                <Text style={styles.cardTitle}>Comentário opcional</Text>
              </View>

              <TextInput
                style={styles.textArea}
                value={comment}
                onChangeText={setComment}
                placeholder="Conte como se sentiu, dificuldades ou observações..."
                placeholderTextColor="#666"
                multiline
                maxLength={800}
                textAlignVertical="top"
              />
              <Text style={styles.counter}>{comment.length}/800</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={styles.painToggle}
                onPress={() => {
                  setHasPain((value) => !value);
                  if (hasPain) {
                    setPainRegion("");
                    setCustomPainRegion("");
                    setPainLevel(null);
                  }
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hasPain }}
              >
                <Ionicons
                  name={hasPain ? "checkbox" : "square-outline"}
                  size={22}
                  color="#D90000"
                />
                <View style={styles.painTextBlock}>
                  <Text style={styles.cardTitle}>Senti dor ou desconforto</Text>
                  <Text style={styles.helperText}>Seu personal verá esse registro com atenção.</Text>
                </View>
              </TouchableOpacity>

              {hasPain && (
                <View style={styles.painDetails}>
                  <Text style={styles.label}>Região</Text>
                  <View style={styles.chipsWrap}>
                    {painRegions.map((region) => (
                      <TouchableOpacity
                        key={region}
                        style={[styles.chip, painRegion === region && styles.chipActive]}
                        onPress={() => setPainRegion(region)}
                      >
                        <Text style={[styles.chipText, painRegion === region && styles.chipTextActive]}>
                          {region}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {painRegion === "Outro" && (
                    <TextInput
                      style={styles.input}
                      value={customPainRegion}
                      onChangeText={setCustomPainRegion}
                      placeholder="Digite a região"
                      placeholderTextColor="#666"
                    />
                  )}

                  <Text style={styles.label}>Nível da dor</Text>
                  <View style={styles.painScale}>
                    {Array.from({ length: 11 }, (_, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.scaleItem, painLevel === index && styles.scaleItemActive]}
                        onPress={() => setPainLevel(index)}
                        accessibilityLabel={`Dor nível ${index}`}
                      >
                        <Text style={[styles.scaleText, painLevel === index && styles.scaleTextActive]}>
                          {index}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {!!errorMessage && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color="#ff4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Enviar feedback</Text>
                  <Ionicons name="send" size={18} color="#000" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Responder depois</Text>
            </TouchableOpacity>
          </>
        )}
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
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#888",
    fontSize: 13,
    marginTop: 3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 42,
  },
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  starButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#101010",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  chipText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  textArea: {
    minHeight: 118,
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    padding: 14,
    fontSize: 15,
    lineHeight: 21,
  },
  counter: {
    color: "#666",
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  painToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  painTextBlock: {
    flex: 1,
  },
  helperText: {
    color: "#888",
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  painDetails: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 16,
  },
  label: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    padding: 14,
    fontSize: 15,
    marginTop: 10,
  },
  painScale: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scaleItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101010",
  },
  scaleItemActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  scaleText: {
    color: "#888",
    fontWeight: "700",
  },
  scaleTextActive: {
    color: "#fff",
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#D90000",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff4444",
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: "#fff",
    flex: 1,
    lineHeight: 19,
  },
  loadingCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  loadingText: {
    color: "#888",
  },
  confirmationCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  confirmationTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 14,
  },
  confirmationText: {
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginVertical: 14,
  },
});
