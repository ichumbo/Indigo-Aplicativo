import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ModernBottleVisualizer from "@/components/ModernBottleVisualizer";
import { recordWaterIntake } from "@/services/hydration-service";
import { useAppTheme } from "@/hooks/use-app-theme";

interface WaterCardProps {
  aguaBebida: number;
  metaAgua: number;
  setAguaBebida: (value: number | ((prev: number) => number)) => void;
  onPress?: () => void;
}

const PRESET_AMOUNTS = [150, 250, 300, 500, 750];

export default function WaterCard({
  aguaBebida,
  metaAgua,
  setAguaBebida,
  onPress,
}: WaterCardProps) {
  const { theme, isDark } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [waterAmount, setWaterAmount] = useState("");
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const safeMeta = metaAgua > 0 ? metaAgua : 2000;
  const progressPercent = Math.min(100, Math.max(0, Math.round((aguaBebida / safeMeta) * 100)));
  const remainingMl = Math.max(0, safeMeta - aguaBebida);
  const remainingGlasses = Math.ceil(remainingMl / 250);

  const handleAddWater = (amount: number, source: "cup" | "bottle" | "shaker" | "custom" = "cup") => {
    if (amount <= 0) return;
    setAguaBebida((prev) => prev + amount);
    setLastAdded(amount);
    void recordWaterIntake(amount, source);
  };

  const handleCustomSubmit = () => {
    const amount = parseInt(waterAmount, 10);
    if (amount > 0 && amount <= 5000) {
      handleAddWater(amount, "custom");
      setWaterAmount("");
      setModalVisible(false);
    } else {
      Alert.alert("Valor inválido", "Informe uma quantidade válida em ml (ex: 350).");
    }
  };

  const handleUndoLast = () => {
    if (lastAdded && lastAdded > 0) {
      setAguaBebida((prev) => Math.max(0, prev - lastAdded));
      setLastAdded(null);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {/* HEADER MINIMALISTA & NAVEGAÇÃO */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.waterIconContainer}>
            <Ionicons name="water" size={16} color="#00A3FF" />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Hidratação Diária</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Meta de <Text style={[styles.highlightText, { color: theme.text }]}>{safeMeta.toLocaleString("pt-BR")} ml</Text>
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.percentageBadge}>
            <Text style={styles.percentageText}>{progressPercent}%</Text>
          </View>
          {onPress && (
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginLeft: 4 }} />
          )}
        </View>
      </TouchableOpacity>

      {/* PAINEL CENTRAL (GARRAFA ESPORTIVA REALISTA + MÉTRICAS) */}
      <View style={styles.mainContentRow}>
        {/* GARRAFA INTELIGENTE MINIMALISTA COM FLUIDO ANIMADO */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={styles.bottleClickZone}
        >
          <ModernBottleVisualizer
            consumedMl={aguaBebida}
            targetMl={safeMeta}
            size="compact"
          />
        </TouchableOpacity>

        {/* MÉTRICAS & INDICADORES DE EVOLUÇÃO */}
        <View style={styles.metricsColumn}>
          <View style={[styles.kpiContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>CONSUMIDO</Text>
              <View style={styles.kpiValueRow}>
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{aguaBebida.toLocaleString("pt-BR")}</Text>
                <Text style={[styles.kpiUnit, { color: theme.textMuted }]}>ml</Text>
              </View>
            </View>

            <View style={[styles.kpiDivider, { backgroundColor: theme.divider }]} />

            <View style={styles.kpiBox}>
              <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>RESTANTE</Text>
              <View style={styles.kpiValueRow}>
                <Text style={[styles.kpiNumber, styles.kpiNumberCyan]}>
                  {remainingMl.toLocaleString("pt-BR")}
                </Text>
                <Text style={[styles.kpiUnit, styles.kpiNumberCyan]}>ml</Text>
              </View>
            </View>
          </View>

          {/* DICA / STATUS DE CONSUMO */}
          <View style={[styles.insightBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Ionicons
              name={progressPercent >= 100 ? "checkmark-circle" : "information-circle-outline"}
              size={13}
              color={progressPercent >= 100 ? "#10b981" : "#00A3FF"}
            />
            <Text style={[styles.insightText, { color: theme.textSecondary }]}>
              {progressPercent >= 100
                ? "Meta do dia atingida! Excelente hidratação."
                : `Faltam ~${remainingGlasses} copo${remainingGlasses > 1 ? "s" : ""} de 250ml hoje.`}
            </Text>
          </View>
        </View>
      </View>

      {/* BOTÕES DE INGESTÃO RÁPIDA (1 TOQUE) */}
      <View style={[styles.actionsSection, { borderTopColor: theme.divider }]}>
        <View style={styles.actionsHeader}>
          <Text style={[styles.actionsSectionTitle, { color: theme.textMuted }]}>REGISTRO RÁPIDO</Text>
          {lastAdded ? (
            <TouchableOpacity onPress={handleUndoLast} style={styles.undoBtn} activeOpacity={0.8}>
              <Ionicons name="arrow-undo" size={11} color={theme.textMuted} />
              <Text style={[styles.undoBtnText, { color: theme.textSecondary }]}>Desfazer +{lastAdded}ml</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.quickAddPill, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() => handleAddWater(250, "cup")}
            activeOpacity={0.8}
          >
            <Ionicons name="water-outline" size={13} color="#00A3FF" />
            <Text style={[styles.quickAddPillText, { color: theme.text }]}>+250ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAddPill, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() => handleAddWater(300, "cup")}
            activeOpacity={0.8}
          >
            <Ionicons name="water" size={13} color="#00A3FF" />
            <Text style={[styles.quickAddPillText, { color: theme.text }]}>+300ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAddPill, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() => handleAddWater(500, "bottle")}
            activeOpacity={0.8}
          >
            <Ionicons name="fitness-outline" size={13} color="#00A3FF" />
            <Text style={[styles.quickAddPillText, { color: theme.text }]}>+500ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customAddButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL DE VALOR PERSONALIZADO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalTopRow}>
              <View style={styles.modalTitleBlock}>
                <Ionicons name="water" size={18} color="#00A3FF" />
                <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Registrar Água</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setWaterAmount("");
                }}
                style={[styles.modalCloseBtn, { backgroundColor: theme.cardSecondary }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitleText, { color: theme.textSecondary }]}>Escolha um valor pré-definido:</Text>

            <View style={styles.presetsGrid}>
              {PRESET_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.presetChip, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
                  onPress={() => {
                    handleAddWater(amt, "custom");
                    setModalVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetChipText, { color: theme.text }]}>+{amt} ml</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSubtitleText, { color: theme.textSecondary }]}>Ou digite a quantidade exata:</Text>

            <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.customTextInput, { color: theme.text }]}
                placeholder="Ex: 350"
                placeholderTextColor={theme.placeholder}
                value={waterAmount}
                onChangeText={setWaterAmount}
                keyboardType="numeric"
                autoFocus
              />
              <Text style={[styles.inputUnitLabel, { color: theme.textMuted }]}>ml</Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, borderWidth: 1 }]}
                onPress={() => {
                  setModalVisible(false);
                  setWaterAmount("");
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalCancelButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCustomSubmit}
                activeOpacity={0.84}
              >
                <Text style={styles.modalConfirmButtonText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waterIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  highlightText: {
    color: "#CCCCCC",
    fontWeight: "800",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentageBadge: {
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.25)",
  },
  percentageText: {
    color: "#00A3FF",
    fontSize: 12,
    fontWeight: "900",
  },
  mainContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  bottleClickZone: {
    paddingVertical: 4,
  },
  metricsColumn: {
    flex: 1,
  },
  kpiContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#202020",
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  kpiBox: {
    flex: 1,
    alignItems: "center",
  },
  kpiLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  kpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  kpiNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  kpiNumberCyan: {
    color: "#00A3FF",
  },
  kpiUnit: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#242424",
    marginHorizontal: 4,
  },
  insightBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#101010",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  insightText: {
    flex: 1,
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "600",
    lineHeight: 14,
  },
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: "#1e1e1e",
    paddingTop: 10,
  },
  actionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  actionsSectionTitle: {
    color: "#666666",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  undoBtnText: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickAddPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
    paddingVertical: 8,
  },
  quickAddPillText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "800",
  },
  customAddButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#00A3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContentCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  modalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitleText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 9,
    alignItems: "center",
  },
  presetChipText: {
    color: "#00A3FF",
    fontSize: 12,
    fontWeight: "800",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  customTextInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    paddingVertical: 10,
  },
  inputUnitLabel: {
    color: "#777777",
    fontSize: 13,
    fontWeight: "800",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#222222",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "800",
  },
  modalConfirmButton: {
    flex: 2,
    backgroundColor: "#00A3FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
