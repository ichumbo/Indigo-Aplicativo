import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  processAIAssistantPrompt,
  saveStudentFromDraft,
  saveWorkoutFromDraft,
  AIAssistantMessage,
} from "@/services/ai-assistant-service";
import { PaywallModal } from "@/components/PaywallModal";

// expo-speech-recognition é um módulo nativo: no Expo Go ele não existe e o
// require lança na hora do import. Carregamos de forma segura para o app
// continuar funcionando (com o ditado desabilitado) fora de um dev build.
let ExpoSpeechRecognitionModule: typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule | null =
  null;
let useSpeechRecognitionEvent: typeof import("expo-speech-recognition").useSpeechRecognitionEvent =
  () => {};
let isSpeechRecognitionAvailable = false;

try {
  const speechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
  isSpeechRecognitionAvailable = true;
} catch {
  isSpeechRecognitionAvailable = false;
}

interface AIAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  trainerId: string;
  studentContextId?: string;
  onStudentCreated?: () => void;
  onWorkoutCreated?: () => void;
}

const QUICK_SUGGESTIONS = [
  "Cadastrar João, 27 anos, 82kg, objetivo hipertrofia 4x por semana",
  "Monte um treino de hipertrofia focado em peito e tríceps para João",
  "Resuma a evolução de cargas e histórico recente",
];

export function AIAssistantModal({
  visible,
  onClose,
  trainerId,
  studentContextId,
  onStudentCreated,
  onWorkoutCreated,
}: AIAssistantModalProps) {
  const [messages, setMessages] = useState<AIAssistantMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      text: "Olá, Treinador! Sou o **Assistente IA DragonCorp**.\n\nPosso estruturar cadastros de alunos, prescrever treinos completos ou resumir a evolução de cargas com precisão clínica.\n\n*Lembre-se: eu gero rascunhos para você revisar antes de qualquer envio ao banco de dados.*",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setInputText(transcript);
  });
  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    if (event.error !== "no-speech" && event.error !== "aborted") {
      Alert.alert("Erro no Microfone", "Não foi possível reconhecer sua voz. Tente novamente.");
    }
  });

  const handleMicPress = async () => {
    if (!isSpeechRecognitionAvailable || !ExpoSpeechRecognitionModule) {
      Alert.alert(
        "Recurso indisponível",
        "O ditado por voz precisa de uma versão de desenvolvimento do app (não funciona no Expo Go). Gere um development build para usar este recurso."
      );
      return;
    }

    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permissão Necessária",
        "Permita acesso ao microfone e ao reconhecimento de fala para ditar sua mensagem."
      );
      return;
    }

    setInputText("");
    ExpoSpeechRecognitionModule.start({
      lang: "pt-BR",
      interimResults: true,
      continuous: false,
    });
  };

  const handleSendPrompt = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: AIAssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText("");
    setLoading(true);

    try {
      const response = await processAIAssistantPrompt({
        trainerId,
        prompt: userMsg.text,
        studentContextId,
      });
      setMessages((prev) => [...prev, response]);
    } catch {
      Alert.alert("Erro", "Não foi possível processar o comando no momento.");
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = async (
    msg: AIAssistantMessage,
    actionType: "CONFIRM" | "EDIT" | "REGENERATE" | "CANCEL"
  ) => {
    if (actionType === "CANCEL") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, status: "CANCELLED", text: `${m.text}\n\n*(Ação cancelada pelo personal)*` } : m
        )
      );
      return;
    }

    if (actionType === "REGENERATE") {
      handleSendPrompt("Monte uma variação alternativa para este treino");
      return;
    }

    if (actionType === "CONFIRM") {
      if (msg.draftType === "STUDENT_CREATION" && msg.studentDraft) {
        setLoading(true);
        try {
          const res = await saveStudentFromDraft(trainerId, msg.studentDraft);
          if (!res.success) {
            if (res.error?.includes("plano gratuito")) {
              setPaywallVisible(true);
              return;
            }
            Alert.alert("Aviso", res.error || "Não foi possível cadastrar o aluno.");
            return;
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    status: "CONFIRMED",
                    text: `**Aluno ${msg.studentDraft?.fullName} cadastrado com sucesso no seu painel!**`,
                  }
                : m
            )
          );
          onStudentCreated?.();
          Alert.alert("Sucesso!", `Aluno ${msg.studentDraft.fullName} cadastrado com sucesso!`);
        } finally {
          setLoading(false);
        }
      } else if (msg.draftType === "WORKOUT_PRESCRIPTION" && msg.workoutDraft) {
        setLoading(true);
        try {
          const res = await saveWorkoutFromDraft(
            trainerId,
            msg.workoutDraft.studentId,
            msg.workoutDraft
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    status: "CONFIRMED",
                    text: `**Treino salvo e vinculado ao aluno com sucesso!**`,
                  }
                : m
            )
          );
          onWorkoutCreated?.();
          Alert.alert("Sucesso!", res.message);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheetContainer}>
            {/* HEADER */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                  <Text style={styles.aiBadgeText}>DRAGONCORP AI</Text>
                </View>
                <Text style={styles.sheetTitle}>Assistente IA do Treinador</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#AAAAAA" />
              </TouchableOpacity>
            </View>

            {/* QUICK PROMPT CHIPS */}
            <View style={styles.quickChipsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {QUICK_SUGGESTIONS.map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chipButton}
                    onPress={() => handleSendPrompt(chip)}
                  >
                    <Ionicons name="flash-outline" size={12} color="#D90000" style={{ marginRight: 5 }} />
                    <Text style={styles.chipButtonText} numberOfLines={1}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* MESSAGES LIST */}
            <ScrollView
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <View
                    key={m.id}
                    style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}
                  >
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
                      {m.text}
                    </Text>

                    {/* DRAFT CARD: STUDENT CREATION */}
                    {m.draftType === "STUDENT_CREATION" && m.studentDraft && m.status === "PENDING_REVIEW" && (
                      <View style={styles.draftCard}>
                        <View style={styles.draftCardHeader}>
                          <Ionicons name="person-add-outline" size={16} color="#D90000" />
                          <Text style={styles.draftCardTitle}>Prévia de Cadastro</Text>
                        </View>
                        <Text style={styles.draftItem}><Text style={styles.bold}>Nome:</Text> {m.studentDraft.fullName}</Text>
                        <Text style={styles.draftItem}><Text style={styles.bold}>Idade:</Text> {m.studentDraft.ageYears} anos</Text>
                        <Text style={styles.draftItem}><Text style={styles.bold}>Peso:</Text> {m.studentDraft.weightKg} kg</Text>
                        <Text style={styles.draftItem}><Text style={styles.bold}>Objetivo:</Text> {m.studentDraft.mainGoal}</Text>
                        <Text style={styles.draftItem}><Text style={styles.bold}>Frequência:</Text> {m.studentDraft.frequencyWeekly}x por semana</Text>

                        <View style={styles.reviewBanner}>
                          <Ionicons name="information-circle-outline" size={14} color="#FFA500" />
                          <Text style={styles.reviewBannerText}>Revise antes de confirmar.</Text>
                        </View>

                        {/* HUMAN-IN-THE-LOOP ACTION BUTTONS */}
                        <View style={styles.draftActionsRow}>
                          <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => handleActionClick(m, "CONFIRM")}
                          >
                            <Text style={styles.confirmBtnText}>CONFIRMAR CADASTRO</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelDraftBtn}
                            onPress={() => handleActionClick(m, "CANCEL")}
                          >
                            <Text style={styles.cancelDraftBtnText}>CANCELAR</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* DRAFT CARD: WORKOUT PRESCRIPTION */}
                    {m.draftType === "WORKOUT_PRESCRIPTION" && m.workoutDraft && m.status === "PENDING_REVIEW" && (
                      <View style={styles.draftCard}>
                        <View style={styles.draftCardHeader}>
                          <Ionicons name="barbell-outline" size={16} color="#D90000" />
                          <Text style={styles.draftCardTitle}>{m.workoutDraft.divisionName}</Text>
                        </View>

                        {m.workoutDraft.exercises.map((ex, i) => (
                          <View key={i} style={styles.exerciseDraftRow}>
                            <Text style={styles.exerciseNameText}>• {ex.name}</Text>
                            <Text style={styles.exerciseSetsText}>
                              {ex.sets} x {ex.reps} {ex.loadKg ? `(${ex.loadKg}kg)` : ""}
                            </Text>
                          </View>
                        ))}

                        <View style={styles.reviewBanner}>
                          <Ionicons name="information-circle-outline" size={14} color="#FFA500" />
                          <Text style={styles.reviewBannerText}>Revise antes de confirmar.</Text>
                        </View>

                        {/* HUMAN-IN-THE-LOOP ACTION BUTTONS */}
                        <View style={styles.draftActionsRow}>
                          <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => handleActionClick(m, "CONFIRM")}
                          >
                            <Text style={styles.confirmBtnText}>ADICIONAR AO ALUNO</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.regenBtn}
                            onPress={() => handleActionClick(m, "REGENERATE")}
                          >
                            <Text style={styles.regenBtnText}>GERAR NOVAMENTE</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelDraftBtn}
                            onPress={() => handleActionClick(m, "CANCEL")}
                          >
                            <Text style={styles.cancelDraftBtnText}>CANCELAR</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {loading && (
                <View style={styles.aiLoadingWrap}>
                  <ActivityIndicator size="small" color="#D90000" />
                  <Text style={styles.aiLoadingText}>Assistente IA está processando...</Text>
                </View>
              )}
            </ScrollView>

            {/* INPUT BAR */}
            <View style={styles.inputBarContainer}>
              <TouchableOpacity
                style={[styles.micButton, isListening && styles.micButtonActive]}
                onPress={handleMicPress}
                disabled={loading}
              >
                <Ionicons
                  name={isListening ? "radio-button-on" : "mic-outline"}
                  size={20}
                  color={isListening ? "#FFFFFF" : "#AAAAAA"}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder={isListening ? "Ouvindo... fale agora" : "Peça um treino, cadastro de aluno ou análise..."}
                placeholderTextColor={isListening ? "#D90000" : "#555555"}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendPrompt()}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={() => handleSendPrompt()}
                disabled={!inputText.trim() || loading}
              >
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        userId={trainerId}
        title="Limite do Plano Gratuito"
        subtitle="Para cadastrar novos alunos com auxílio da IA, assine o Plano Pro com alunos ilimitados."
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#0F0F0F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    height: "90%",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D90000",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  aiBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 3,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  closeBtn: {
    padding: 4,
  },
  quickChipsWrap: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 260,
  },
  chipButtonText: {
    fontSize: 12,
    color: "#AAAAAA",
    fontWeight: "500",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 14,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 14,
    maxWidth: "92%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#D90000",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  assistantText: {
    color: "#E0E0E0",
  },
  draftCard: {
    marginTop: 12,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 10,
    padding: 12,
  },
  draftCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  draftCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  draftItem: {
    color: "#CCCCCC",
    fontSize: 13,
    marginBottom: 3,
  },
  bold: {
    color: "#888888",
    fontWeight: "700",
  },
  exerciseDraftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  exerciseNameText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseSetsText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C180E",
    borderWidth: 1,
    borderColor: "#4A3B18",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 10,
  },
  reviewBannerText: {
    color: "#E6B800",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },
  draftActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: "#D90000",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  regenBtn: {
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  regenBtnText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "700",
  },
  cancelDraftBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelDraftBtnText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
  },
  aiLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  aiLoadingText: {
    color: "#777777",
    fontSize: 13,
    marginLeft: 8,
  },
  inputBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  micButtonActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
});
