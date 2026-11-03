import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationStep } from "@/services/mobile-migration-store";

interface MigrationStepperProps {
  currentStep: MigrationStep;
  activeColor: string;
  theme: {
    card: string;
    cardSecondary: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
  };
}

const STEPS: { step: MigrationStep; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { step: 1, label: "Origem", icon: "apps-outline" },
  { step: 2, label: "Arquivos", icon: "cloud-upload-outline" },
  { step: 3, label: "Análise", icon: "scan-outline" },
  { step: 4, label: "Revisão", icon: "checkbox-outline" },
  { step: 5, label: "Concluir", icon: "checkmark-circle-outline" },
];

export const MigrationStepper: React.FC<MigrationStepperProps> = ({
  currentStep,
  activeColor,
  theme,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 480;

  const currentStepData = STEPS.find((s) => s.step === currentStep) || STEPS[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {/* Indicador no Celular (Etapa X de 5: Nome) */}
      <View style={styles.mobileSummaryRow}>
        <View style={styles.mobileSummaryLeft}>
          <Text style={[styles.stepCountText, { color: activeColor }]}>
            Etapa {currentStep} de 5
          </Text>
          <Text style={[styles.stepTitleText, { color: theme.text }]}>
            {currentStepData.label}
          </Text>
        </View>

        {/* Mini barra de progresso contínua */}
        <View style={[styles.progressBarBg, { backgroundColor: theme.cardSecondary }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(currentStep / 5) * 100}%`, backgroundColor: activeColor },
            ]}
          />
        </View>
      </View>

      {/* Stepper horizontal (discreto e responsivo) */}
      <View style={styles.stepsRail}>
        {STEPS.map((s, idx) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <React.Fragment key={s.step}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    {
                      backgroundColor: isCurrent
                        ? activeColor
                        : isDone
                        ? theme.cardSecondary
                        : theme.cardSecondary,
                      borderColor: isCurrent
                        ? activeColor
                        : isDone
                        ? activeColor
                        : theme.cardBorder,
                    },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color={activeColor} />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        {
                          color: isCurrent ? "#FFFFFF" : theme.textMuted,
                          fontWeight: isCurrent ? "800" : "600",
                        },
                      ]}
                    >
                      {s.step}
                    </Text>
                  )}
                </View>

                {!isCompact && (
                  <Text
                    style={[
                      styles.stepLabelDesktop,
                      {
                        color: isCurrent
                          ? theme.text
                          : isDone
                          ? theme.textSecondary
                          : theme.textMuted,
                        fontWeight: isCurrent ? "700" : "500",
                      },
                    ]}
                  >
                    {s.label}
                  </Text>
                )}
              </View>

              {idx < STEPS.length - 1 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: isDone ? activeColor : theme.cardBorder,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mobileSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mobileSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepCountText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepTitleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBarBg: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepsRail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  circleText: {
    fontSize: 11,
  },
  stepLabelDesktop: {
    fontSize: 12,
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
  },
});

