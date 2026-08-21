import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface WaterCardProps {
  aguaBebida: number;
  metaAgua: number;
  setAguaBebida: (value: number | ((prev: number) => number)) => void;
  onPress?: () => void;
}

const PRESET_AMOUNTS = [150, 250, 300, 500];

export default function WaterCard({
  aguaBebida,
  metaAgua,
  setAguaBebida,
  onPress,
}: WaterCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [waterAmount, setWaterAmount] = useState("");
  const [waterHistory, setWaterHistory] = useState<number[]>([250, 300]);

  const safeMeta = metaAgua > 0 ? metaAgua : 2000;
  const progressPercent = Math.min(100, Math.max(0, Math.round((aguaBebida / safeMeta) * 100)));
  const remainingMl = Math.max(0, safeMeta - aguaBebida);

  const animatedFill = useAnimatedStyle(() => ({
    height: withSpring(`${Math.min(100, progressPercent)}%`, {
      damping: 18,
      stiffness: 120,
    }),
  }));

  const handleAddCustomWater = () => {
    const amount = parseInt(waterAmount, 10);
    if (amount > 0) {
      setAguaBebida((prev) => prev + amount);
      setWaterHistory((prev) => [amount, ...prev].slice(0, 2));
      setWaterAmount("");
      setModalVisible(false);
    }
  };

  const handleAddPreset = (amount: number) => {
    setAguaBebida((prev) => prev + amount);
    setWaterHistory((prev) => [amount, ...prev].slice(0, 2));
    setModalVisible(false);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.waterIconContainer}>
            <Ionicons name="water" size={18} color="#00A3FF" />
          </View>
          <View>
            <Text style={styles.title}>Hidratação</Text>
            <Text style={styles.subtitle}>Meta diária de {safeMeta.toLocaleString("pt-BR")}ml</Text>
          </View>
        </View>

        <View style={styles.percentageBadge}>
          <Text style={styles.percentageText}>{progressPercent}%</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentRow}>
        {/* Left: Modern Minimalist Bottle */}
        <View style={styles.bottleColumn}>
          <View style={styles.bottleContainer}>
            {/* Bottle Cap */}
            <View style={styles.bottleCap} />
            <View style={styles.bottleNeck} />

            {/* Main Bottle Body */}
            <View style={styles.bottleBody}>
              {/* Animated Water Fill */}
              <Animated.View style={[styles.waterFill, animatedFill]} />

              {/* Minimalist Water Surface Line */}
              {progressPercent > 0 && progressPercent < 100 ? (
                <View
                  style={[
                    styles.waterSurfaceLine,
                    { bottom: `${progressPercent}%` },
                  ]}
                />
              ) : null}

              {/* Measurement Ticks */}
              <View style={[styles.tickMark, { bottom: "75%" }]} />
              <View style={[styles.tickMark, { bottom: "50%" }]} />
              <View style={[styles.tickMark, { bottom: "25%" }]} />

              {/* Sleek Vertical Glass Reflection */}
              <View style={styles.glassReflection} />
            </View>
          </View>
        </View>

        {/* Right: Metrics & Quick Add History */}
        <View style={styles.infoColumn}>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{aguaBebida.toLocaleString("pt-BR")}</Text>
              <Text style={styles.statLabel}>ml bebidos</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, styles.statNumberHighlight]}>
                {remainingMl.toLocaleString("pt-BR")}
              </Text>
              <Text style={styles.statLabel}>ml restantes</Text>
            </View>
          </View>

          {/* Quick Add / History Section */}
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>HISTÓRICO / ADICIONAR</Text>

            <View style={styles.historyRow}>
              {/* Add Button */}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* History item 1 */}
              {waterHistory[0] !== undefined ? (
                <View style={styles.historyCard}>
                  <Ionicons name="water" size={14} color="#00A3FF" />
                  <Text style={styles.historyCardText}>+{waterHistory[0]}ml</Text>
                </View>
              ) : (
                <View style={styles.historyCardEmpty}>
                  <Ionicons name="water-outline" size={14} color="#555" />
                  <Text style={styles.historyCardEmptyText}>-</Text>
                </View>
              )}

              {/* History item 2 */}
              {waterHistory[1] !== undefined ? (
                <View style={styles.historyCard}>
                  <Ionicons name="water" size={14} color="#00A3FF" />
                  <Text style={styles.historyCardText}>+{waterHistory[1]}ml</Text>
                </View>
              ) : (
                <View style={styles.historyCardEmpty}>
                  <Ionicons name="water-outline" size={14} color="#555" />
                  <Text style={styles.historyCardEmptyText}>-</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Modal for Adding Water */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="water" size={20} color="#00A3FF" />
              </View>
              <Text style={styles.modalTitle}>Registrar Água</Text>
            </View>

            <Text style={styles.presetLabel}>Selecione um valor rápido:</Text>
            <View style={styles.presetRow}>
              {PRESET_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.presetButton}
                  onPress={() => handleAddPreset(amount)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.presetButtonText}>+{amount}ml</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.customInputLabel}>Ou digite a quantidade (ml):</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Ex: 350"
              placeholderTextColor="#666"
              value={waterAmount}
              onChangeText={setWaterAmount}
              keyboardType="numeric"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setModalVisible(false);
                  setWaterAmount("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAddCustomWater}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#161616",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waterIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  subtitle: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  percentageBadge: {
    backgroundColor: "rgba(0, 163, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentageText: {
    color: "#00A3FF",
    fontSize: 13,
    fontWeight: "800",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  bottleColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  bottleContainer: {
    alignItems: "center",
    width: 58,
  },
  bottleCap: {
    width: 20,
    height: 6,
    backgroundColor: "#00A3FF",
    borderRadius: 2,
    marginBottom: 1,
  },
  bottleNeck: {
    width: 24,
    height: 6,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(0, 163, 255, 0.35)",
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    marginBottom: 1,
  },
  bottleBody: {
    width: 58,
    height: 120,
    backgroundColor: "#0E141E",
    borderWidth: 1.5,
    borderColor: "#00A3FF",
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
  },
  waterFill: {
    width: "100%",
    backgroundColor: "#00A3FF",
    position: "absolute",
    bottom: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  waterSurfaceLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.6,
  },
  tickMark: {
    position: "absolute",
    right: 0,
    width: 8,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  glassReflection: {
    position: "absolute",
    left: 4,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 2,
  },
  infoColumn: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statNumberHighlight: {
    color: "#00A3FF",
  },
  statLabel: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#262626",
    marginHorizontal: 4,
  },
  historySection: {
    marginTop: 12,
  },
  historySectionTitle: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#00A3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  historyCard: {
    flex: 1,
    height: 44,
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  historyCardText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  historyCardEmpty: {
    flex: 1,
    height: 44,
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  historyCardEmptyText: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0, 163, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  presetLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flex: 1,
    minWidth: "20%",
    alignItems: "center",
  },
  presetButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  customInputLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalTextInput: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#222222",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#AAAAAA",
    fontSize: 14,
    fontWeight: "700",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#00A3FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
