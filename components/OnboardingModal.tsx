import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "@/hooks/use-app-theme";
import { AppRole } from "@/services/auth-store";

interface OnboardingStep {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TRAINER_STEPS: OnboardingStep[] = [
  {
    title: "Cadastre seus Alunos",
    description: "Adicione alunos rapidamente com dados essenciais e configure o acompanhamento individual.",
    icon: "people",
  },
  {
    title: "Prescreva Treinos e Avaliações",
    description: "Crie fichas completas, protocolos aeróbios e registre avaliações físicas com fotos e dobras.",
    icon: "barbell",
  },
  {
    title: "Acompanhe e Personalize",
    description: "Visualize alertas de dor, feedbacks em tempo real e personalize a consultoria com suas cores e logo.",
    icon: "color-wand",
  },
];

const STUDENT_STEPS: OnboardingStep[] = [
  {
    title: "Seu Treino na Palma da Mão",
    description: "Acesse o treino do dia imediatamente ao abrir o app com instruções claras e vídeos demonstrativos.",
    icon: "play-circle",
  },
  {
    title: "Registre suas Cargas",
    description: "Marque séries concluídas, registre cargas e perceba sua evolução semana após semana.",
    icon: "trending-up",
  },
  {
    title: "Feedbacks e Comunicação",
    description: "Relate dores, envie percepções de esforço e receba orientações diretamente do seu treinador.",
    icon: "chatbubbles",
  },
];

export interface OnboardingModalProps {
  role: AppRole;
  forceVisible?: boolean;
  onDismiss?: () => void;
}

export function OnboardingModal({ role, forceVisible, onDismiss }: OnboardingModalProps) {
  const { theme, isDark } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = role === "TRAINER" ? TRAINER_STEPS : STUDENT_STEPS;
  const storageKey = `@dragoncorp/onboarding_completed_${role.toLowerCase()}`;

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      if (forceVisible) {
        if (mounted) {
          setCurrentStep(0);
          setVisible(true);
        }
        return;
      }
      try {
        const completed = await AsyncStorage.getItem(storageKey);
        if (!completed && mounted) {
          setVisible(true);
        }
      } catch {
        // Ignora erro de leitura
      }
    };
    void checkStatus();
    return () => {
      mounted = false;
    };
  }, [forceVisible, role, storageKey]);

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(storageKey, "true");
    } catch {
      // Ignora erro
    }
    setVisible(false);
    onDismiss?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      void handleComplete();
    }
  };

  const handleSkip = () => {
    void handleComplete();
  };

  if (!visible) return null;

  const currentStepData = steps[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header com indicador de progresso */}
          <View style={styles.header}>
            <View style={styles.dotsRow}>
              {steps.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        idx === currentStep
                          ? "#D90000"
                          : isDark
                          ? "#333333"
                          : "#CCCCCC",
                      width: idx === currentStep ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.skipButton}
              accessibilityLabel="Pular tutorial"
            >
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>Pular</Text>
            </TouchableOpacity>
          </View>

          {/* Ícone e Conteúdo */}
          <View style={styles.content}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
              <Ionicons name={currentStepData.icon} size={44} color="#D90000" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              {currentStepData.title}
            </Text>

            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {currentStepData.description}
            </Text>
          </View>

          {/* Botões de Ação */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
              activeOpacity={0.85}
              accessibilityLabel={currentStep === steps.length - 1 ? "Concluir" : "Próximo passo"}
            >
              <Text style={styles.primaryButtonText}>
                {currentStep === steps.length - 1 ? "Começar agora" : "Próximo"}
              </Text>
              <Ionicons
                name={currentStep === steps.length - 1 ? "checkmark" : "arrow-forward"}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    alignItems: "center",
    paddingVertical: 12,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  footer: {
    marginTop: 28,
  },
  primaryButton: {
    backgroundColor: "#D90000",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
