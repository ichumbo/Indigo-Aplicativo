import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MigrationStep } from "@/services/mobile-migration-store";

interface MigrationBottomBarProps {
  currentStep: MigrationStep;
  canGoBack: boolean;
  canProceed: boolean;
  onBack: () => void;
  onProceed: () => void;
  disabledReason?: string;
  activeColor: string;
  theme: {
    card: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
  };
}

export const MigrationBottomBar: React.FC<MigrationBottomBarProps> = ({
  currentStep,
  canGoBack,
  canProceed,
  onBack,
  onProceed,
  disabledReason,
  activeColor,
  theme,
}) => {
  const insets = useSafeAreaInsets();

  const getProceedLabel = () => {
    switch (currentStep) {
      case 1:
        return "Continuar";
      case 2:
        return "Analisar Arquivos";
      case 3:
        return "Revisar Resultados";
      case 4:
        return "Avançar para Importação";
      case 5:
        return "Concluir Migração";
      default:
        return "Continuar";
    }
  };

  const getProceedIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (currentStep) {
      case 1:
        return "arrow-forward";
      case 2:
        return "scan-outline";
      case 3:
        return "checkbox-outline";
      case 4:
        return "cloud-upload-outline";
      case 5:
        return "checkmark-done";
      default:
        return "arrow-forward";
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.cardBorder,
          paddingBottom: Math.max(14, insets.bottom + 6),
        },
      ]}
    >
      {disabledReason ? (
        <View style={styles.disabledReasonBox}>
          <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
          <Text style={[styles.disabledReasonText, { color: theme.textMuted }]}>
            {disabledReason}
          </Text>
        </View>
      ) : null}

      <View style={styles.buttonsRow}>
        {canGoBack ? (
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: theme.cardBorder }]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={theme.text} />
            <Text style={[styles.backBtnText, { color: theme.text }]}>Voltar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <TouchableOpacity
          style={[
            styles.proceedBtn,
            { backgroundColor: canProceed ? activeColor : "rgba(255,255,255,0.08)" },
            !canProceed && styles.proceedBtnDisabled,
          ]}
          onPress={onProceed}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.proceedBtnText,
              { color: canProceed ? "#FFFFFF" : theme.textMuted },
            ]}
          >
            {getProceedLabel()}
          </Text>
          <Ionicons
            name={getProceedIcon()}
            size={18}
            color={canProceed ? "#FFFFFF" : theme.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  disabledReasonBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  disabledReasonText: {
    fontSize: 11.5,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  backSpacer: {
    flex: 0.4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  proceedBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  proceedBtnDisabled: {
    opacity: 0.6,
  },
  proceedBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

