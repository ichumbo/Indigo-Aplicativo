import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
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

const STAR_LABELS: Record<number, string> = {
  1: "Muito Fraco / Exaustivo",
  2: "Abaixo do Esperado",
  3: "Bom / Adequado",
  4: "Excelente Treino!",
  5: "Impecável / Máxima Performance!",
};

export default function TrainingFeedbackScreen() {
  const params = useLocalSearchParams<{ executionId?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [intensity, setIntensity] = useState<FeedbackIntensity | null>("Adequado");
  const [hasPain, setHasPain] = useState(false);
  const [painRegion, setPainRegion] = useState("");
  const [customPainRegion, setCustomPainRegion] = useState("");
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [completionTime, setCompletionTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(true);
  const [alreadySent, setAlreadySent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackContext, setFeedbackContext] = useState<SubmitFeedbackContext | undefined>(undefined);

  const executionId = params.executionId;
  const workoutName = feedbackContext?.workoutName ?? CURRENT_WORKOUT.name;

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setCompletionTime(formatted);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!session) {
      if (!loadingSession) {
        setErrorMessage("Sessão obrigatória para enviar feedback.");
        setCheckingDuplicate(false);
      }
      return;
    }
    if (session.user.role !== "STUDENT") {
      setErrorMessage("Somente o aluno pode enviar feedback pós-treino.");
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
          throw new Error("Esta execução não pertence ao aluno autenticado.");
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

  const handlePickPhoto = async (fromCamera = false) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso à câmera para registrar sua foto de treino.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          setPhotoUri(result.assets[0].uri);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso às fotos para selecionar sua imagem de treino.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          setPhotoUri(result.assets[0].uri);
        }
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar a imagem.");
    }
  };

  const handleShareAchievement = async () => {
    try {
      const studentName = session?.user.name || "Aluno";
      const shareMessage = `Treino Concluído!\n\n${workoutName}\nConcluído às ${completionTime}\nAvaliação: ${rating}/5 estrelas\n\nTreino acompanhado pelo app DragonCorp.`;
      await Share.share({
        title: `Treino Concluído - ${studentName}`,
        message: shareMessage,
      });
    } catch {}
  };

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
      setErrorMessage("Somente o aluno pode enviar feedback pós-treino.");
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
          photoUrl: photoUri || session?.user.avatar,
          completionTime,
        },
        feedbackContext
      );

      setAlreadySent(true);
      Alert.alert(
        "Treino Finalizado com Sucesso!",
        "Seu feedback, foto e avaliação foram registrados e seu personal trainer foi notificado.",
        [{ text: "OK", onPress: () => router.replace("/training") }]
      );
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

  const displayImageUri = photoUri || session?.user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={22} color="#D90000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Finalizar Treino</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{workoutName}</Text>
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={loading}>
          <Text style={styles.skipBtnText}>Pular</Text>
        </TouchableOpacity>
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
            <Ionicons name="checkmark-circle" size={52} color="#D90000" />
            <Text style={styles.confirmationTitle}>Treino Já Finalizado</Text>
            <Text style={styles.confirmationText}>
              Esta execução de treino já possui foto e avaliação registradas.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/training")}>
              <Text style={styles.primaryButtonText}>Voltar para Treinos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 1. CARD EXECUTIVO DA FOTO DO ALUNO & BADGES DE CONCLUSÃO */}
            <View style={styles.photoContainerCard}>
              <View style={styles.photoFrame}>
                <Image source={{ uri: displayImageUri }} style={styles.photoImage} resizeMode="cover" />

                {/* Badge Top Left: Concluído */}
                <View style={styles.badgeTopLeft}>
                  <View style={styles.badgePulseDot} />
                  <Text style={styles.badgeTopLeftText}>TREINO CONCLUÍDO</Text>
                </View>

                {/* Badge Top Right: Hora */}
                <View style={styles.badgeTopRight}>
                  <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.badgeTopRightText}>{completionTime || "13:40"}</Text>
                </View>

                {/* Badge Bottom Overlay: Estrelas & Nome */}
                <View style={styles.badgeBottomBar}>
                  <Text style={styles.badgeStudentName} numberOfLines={1}>
                    {session?.user.name || "Aluno DragonCorp"}
                  </Text>
                  <View style={styles.badgeStarsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={rating >= s ? "star" : "star-outline"}
                        size={14}
                        color={rating >= s ? "#F59E0B" : "#666"}
                      />
                    ))}
                  </View>
                </View>
              </View>

              {/* Botões de Ação de Foto */}
              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={() => handlePickPhoto(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={16} color="#D90000" />
                  <Text style={styles.photoActionBtnText}>Tirar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={() => handlePickPhoto(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="image-outline" size={16} color="#D90000" />
                  <Text style={styles.photoActionBtnText}>Escolher Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoShareMiniBtn}
                  onPress={handleShareAchievement}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. CARD DE AVALIAÇÃO COM ESTRELAS (⭐ 1 A 5) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="star" size={18} color="#D90000" />
                <Text style={styles.cardTitle}>Avalie o Treino de Hoje</Text>
                <View style={styles.cardTimePillBox}>
                  <Ionicons name="time-outline" size={12} color="#AAAAAA" />
                  <Text style={styles.cardTimePillText}>{completionTime}</Text>
                </View>
              </View>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Avaliar com ${star} estrelas`}
                  >
                    <Ionicons
                      name={rating >= star ? "star" : "star-outline"}
                      size={38}
                      color={rating >= star ? "#F59E0B" : "#444444"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.starFeedbackLabel}>
                {STAR_LABELS[rating] || "Toque nas estrelas para avaliar"}
              </Text>
            </View>

            {/* 3. INTENSIDADE PERCEBIDA (PSE / RPE) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="speedometer-outline" size={18} color="#D90000" />
                <Text style={styles.cardTitle}>Intensidade Percebida</Text>
              </View>

              <View style={styles.chipsWrap}>
                {intensities.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, intensity === option && styles.chipActive]}
                    onPress={() => setIntensity(option)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, intensity === option && styles.chipTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 4. COMENTÁRIO PARA O PERSONAL */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#D90000" />
                <Text style={styles.cardTitle}>Comentário para o Treinador</Text>
              </View>

              <TextInput
                style={styles.textArea}
                value={comment}
                onChangeText={setComment}
                placeholder="Como você se sentiu hoje? Deixe um recado para seu personal..."
                placeholderTextColor="#666"
                multiline
                maxLength={800}
                textAlignVertical="top"
              />
              <Text style={styles.counter}>{comment.length}/800</Text>
            </View>

            {/* 5. RELATO DE DESCONFORTO / DOR */}
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
                activeOpacity={0.8}
              >
                <Ionicons
                  name={hasPain ? "checkbox" : "square-outline"}
                  size={22}
                  color={hasPain ? "#D90000" : "#666"}
                />
                <View style={styles.painTextBlock}>
                  <Text style={styles.cardTitle}>Senti dor ou desconforto</Text>
                  <Text style={styles.helperText}>Seu personal verá esse aviso em destaque.</Text>
                </View>
              </TouchableOpacity>

              {hasPain && (
                <View style={styles.painDetails}>
                  <Text style={styles.label}>Região afetada:</Text>
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

                  <Text style={[styles.label, { marginTop: 10 }]}>Nível do incômodo (0 a 10):</Text>
                  <View style={styles.painScale}>
                    {Array.from({ length: 11 }, (_, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.scaleItem, painLevel === index && styles.scaleItemActive]}
                        onPress={() => setPainLevel(index)}
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

            {/* BOTÃO PRINCIPAL DE FINALIZAÇÃO */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#000" />
                  <Text style={styles.primaryButtonText}>Finalizar Treino & Enviar</Text>
                </>
              )}
            </TouchableOpacity>

            {/* BOTÃO DE COMPARTILHAMENTO DE CONQUISTA */}
            <TouchableOpacity
              style={styles.shareCtaButton}
              onPress={handleShareAchievement}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#CCCCCC" />
              <Text style={styles.shareCtaButtonText}>Compartilhar Conquista Pós-Treino</Text>
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
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 14,
    backgroundColor: "#181818",
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  backButton: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "600",
    marginTop: 1,
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipBtnText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  /* 1. Photo Card Styles */
  photoContainerCard: {
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 12,
    gap: 10,
  },
  photoFrame: {
    width: "100%",
    height: 230,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#202020",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  badgeTopLeft: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(18, 18, 18, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.5)",
  },
  badgePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D90000",
  },
  badgeTopLeftText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  badgeTopRight: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(18, 18, 18, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  badgeTopRightText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  badgeBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(12, 12, 12, 0.88)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  badgeStudentName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  badgeStarsRow: {
    flexDirection: "row",
    gap: 2,
  },
  photoActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#222222",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    paddingVertical: 9,
  },
  photoActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  photoShareMiniBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },

  /* 2. Rating & Cards Styles */
  card: {
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  cardTimePillBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#222222",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333333",
  },
  cardTimePillText: {
    color: "#AAAAAA",
    fontSize: 11,
    fontWeight: "700",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 6,
  },
  starButton: {
    padding: 4,
  },
  starFeedbackLabel: {
    textAlign: "center",
    color: "#D90000",
    fontSize: 13,
    fontWeight: "800",
    marginTop: -4,
  },

  /* Chips */
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#202020",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#303030",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  chipText: {
    color: "#AAAAAA",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#000000",
    fontWeight: "900",
  },

  /* Textarea */
  textArea: {
    backgroundColor: "#1F1F1F",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    color: "#FFFFFF",
    fontSize: 13,
    padding: 12,
    minHeight: 80,
  },
  counter: {
    color: "#666666",
    fontSize: 11,
    textAlign: "right",
    marginTop: -6,
  },

  /* Pain Section */
  painToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  painTextBlock: {
    flex: 1,
  },
  helperText: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },
  painDetails: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#262626",
    gap: 8,
  },
  label: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#1F1F1F",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    color: "#FFFFFF",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  painScale: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  scaleItem: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleItemActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  scaleText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
  },
  scaleTextActive: {
    color: "#000",
    fontWeight: "900",
  },

  /* Error & Loading */
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    borderWidth: 1,
    borderColor: "#D90000",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: "#FF8888",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  loadingCard: {
    backgroundColor: "#181818",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#888",
    fontSize: 13,
  },
  confirmationCard: {
    backgroundColor: "#181818",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  confirmationTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  confirmationText: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  /* Primary CTA */
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D90000",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.6,
  },
  shareCtaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1C1C1C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    paddingVertical: 12,
  },
  shareCtaButtonText: {
    color: "#CCCCCC",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
