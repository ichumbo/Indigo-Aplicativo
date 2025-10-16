import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function WaterCard({ aguaBebida, metaAgua, setAguaBebida, onPress }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [waterAmount, setWaterAmount] = useState("");
  const [waterHistory, setWaterHistory] = useState([]);
  const progress = metaAgua > 0 ? (aguaBebida / metaAgua) * 100 : 0;
  
  const shimmerValue = useSharedValue(0);
  const bubbleValue = useSharedValue(0);
  const glowValue = useSharedValue(0);
  const bubble1 = useSharedValue(0);
  const bubble2 = useSharedValue(0);
  const bubble3 = useSharedValue(0);
  const bubble4 = useSharedValue(0);
  const bubble5 = useSharedValue(0);
  
  // Animações contínuas
  shimmerValue.value = withRepeat(
    withTiming(1, { duration: 2000 }),
    -1,
    true
  );
  
  bubbleValue.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 3000 }),
      withTiming(0, { duration: 100 })
    ),
    -1,
    false
  );
  
  glowValue.value = withRepeat(
    withTiming(1, { duration: 1500 }),
    -1,
    true
  );
  
  // Animações das bolinhas com delays diferentes
  bubble1.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 100 })
    ),
    -1,
    false
  );
  
  bubble2.value = withRepeat(
    withSequence(
      withTiming(0, { duration: 500 }),
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 100 })
    ),
    -1,
    false
  );
  
  bubble3.value = withRepeat(
    withSequence(
      withTiming(0, { duration: 1000 }),
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 100 })
    ),
    -1,
    false
  );
  
  bubble4.value = withRepeat(
    withSequence(
      withTiming(0, { duration: 1500 }),
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 100 })
    ),
    -1,
    false
  );
  
  bubble5.value = withRepeat(
    withSequence(
      withTiming(0, { duration: 2000 }),
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 100 })
    ),
    -1,
    false
  );

  const handleAddWater = () => {
    const amount = parseInt(waterAmount);
    if (amount > 0) {
      setAguaBebida(aguaBebida + amount);
      setWaterHistory((prev) => [amount, ...prev].slice(0, 2));
      setWaterAmount("");
      setModalVisible(false);
    }
  };

  const animatedFill = useAnimatedStyle(() => ({
    height: withSpring(`${progress}%`, {
      damping: 15,
      stiffness: 100,
    }),
  }));
  
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerValue.value, [0, 1], [-30, 30]);
    return {
      transform: [{ translateX }],
    };
  });
  
  const bubbleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(bubbleValue.value, [0, 1], [0, -100]);
    const opacity = interpolate(bubbleValue.value, [0, 0.8, 1], [0.8, 0.4, 0]);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });
  
  const createBubbleStyle = (bubbleValue) => useAnimatedStyle(() => {
    const translateY = interpolate(bubbleValue.value, [0, 1], [0, -110]);
    const opacity = interpolate(bubbleValue.value, [0, 0.2, 0.8, 1], [0, 0.8, 0.6, 0]);
    const scale = interpolate(bubbleValue.value, [0, 0.5, 1], [0.5, 1, 0.3]);
    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });
  
  const bubble1Style = createBubbleStyle(bubble1);
  const bubble2Style = createBubbleStyle(bubble2);
  const bubble3Style = createBubbleStyle(bubble3);
  const bubble4Style = createBubbleStyle(bubble4);
  const bubble5Style = createBubbleStyle(bubble5);
  
  const glowStyle = useAnimatedStyle(() => {
    const scale = interpolate(glowValue.value, [0, 1], [1, 1.1]);
    const opacity = interpolate(glowValue.value, [0, 1], [0.3, 0.8]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <TouchableOpacity style={styles.waterCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.waterHeader}>
        <View style={styles.waterTitleContainer}>
          <Ionicons name="water" size={20} color="#4A90E2" />
          <Text style={styles.waterTitle}>Hidratação</Text>
        </View>
        <View style={styles.waterBadge}>
          <Text style={styles.waterBadgeText}>{Math.round(progress)}%</Text>
        </View>
      </View>

      <View style={styles.waterMainContent}>
        <View style={styles.waterVisualization}>
          <View style={styles.waterBottleContainer}>
            <View style={styles.bottleWrapper}>
              {/* Glow Effect */}
              <Animated.View style={[styles.bottleGlow, glowStyle]} />
              
              {/* Bottle Cap */}
              <View style={styles.bottleCap}>
                <LinearGradient
                  colors={['#6BB6FF', '#4A90E2', '#2E5BBA']}
                  style={styles.capTop}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.capRing} />
                <View style={styles.capReflection} />
              </View>

              {/* Bottle Neck */}
              <LinearGradient
                colors={['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)']}
                style={styles.bottleNeck}
              />

              {/* Main Bottle Body */}
              <View style={styles.waterBottle}>
                {/* Water Fill with Gradient */}
                <Animated.View style={[styles.waterFill, animatedFill]}>
                  <LinearGradient
                    colors={['#6BB6FF', '#4A90E2', '#2E5BBA']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  
                  {/* Bolinhas subindo */}
                  {progress > 10 && (
                    <>
                      <Animated.View
                        style={[
                          styles.risingBubble,
                          { width: 3, height: 3, left: '25%' },
                          bubble1Style,
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.risingBubble,
                          { width: 4, height: 4, left: '65%' },
                          bubble2Style,
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.risingBubble,
                          { width: 2, height: 2, left: '45%' },
                          bubble3Style,
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.risingBubble,
                          { width: 5, height: 5, left: '15%' },
                          bubble4Style,
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.risingBubble,
                          { width: 3, height: 3, left: '75%' },
                          bubble5Style,
                        ]}
                      />
                    </>
                  )}
                </Animated.View>

                {/* Water surface effect with animation */}
                {progress > 0 && (
                  <Animated.View
                    style={[
                      styles.waterSurface,
                      { bottom: `${progress}%` },
                      shimmerStyle,
                    ]}
                  />
                )}

                {/* Level marks with glow */}
                {[25, 50, 75].map((level) => (
                  <View key={level} style={styles.levelMarkContainer}>
                    <View
                      style={[
                        styles.waterLevelMark,
                        { bottom: `${level}%` },
                        progress >= level && styles.activeLevelMark,
                      ]}
                    />
                    {progress >= level && (
                      <View
                        style={[
                          styles.levelMarkGlow,
                          { bottom: `${level}%` },
                        ]}
                      />
                    )}
                  </View>
                ))}

                {/* Enhanced highlights */}
                <Animated.View style={[styles.bottleHighlight, shimmerStyle]} />
                <View style={styles.bottleHighlight2} />
                <View style={styles.bottleHighlight3} />

                {/* Holographic effect */}
                <Animated.View style={[styles.holographicEffect, shimmerStyle]} />

                {/* Bottom reflection */}
                <LinearGradient
                  colors={['transparent', 'rgba(255, 255, 255, 0.1)', 'transparent']}
                  style={styles.bottleBottomReflection}
                />
              </View>
            </View>
          </View>

          <View style={styles.rightContent}>
            <View style={styles.waterStats}>
              <View style={styles.waterStatItem}>
                <Text style={styles.waterStatNumber}>{aguaBebida}</Text>
                <Text style={styles.waterStatLabel}>ml bebidos</Text>
              </View>
              <View style={styles.waterStatDivider} />
              <View style={styles.waterStatItem}>
                <Text style={styles.waterStatNumber}>
                  {metaAgua - aguaBebida}
                </Text>
                <Text style={styles.waterStatLabel}>ml restantes</Text>
              </View>
            </View>

            <View style={styles.waterGlassesContainer}>
              <Text style={styles.waterGlassesTitle}>Histórico</Text>
              <View style={styles.waterGlasses}>
                <TouchableOpacity
                  onPress={() => setModalVisible(true)}
                  style={styles.waterGlass}
                >
                  <LinearGradient
                    colors={['#6BB6FF', '#4A90E2', '#2E5BBA']}
                    style={styles.glassGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
                {waterHistory.map((amount, i) => (
                  <View key={i} style={styles.waterGlass}>
                    <LinearGradient
                      colors={['#6BB6FF', '#4A90E2', '#2E5BBA']}
                      style={styles.glassGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="water" size={16} color="#fff" />
                      <Text style={styles.glassAmount}>{amount}</Text>
                    </LinearGradient>
                  </View>
                ))}
                {[...Array(2 - waterHistory.length)].map((_, i) => (
                  <View key={`empty-${i}`} style={styles.waterGlassEmpty}>
                    <View style={styles.glassEmptyContent}>
                      <Ionicons name="water" size={16} color="rgba(255,255,255,0.3)" />
                      <Text style={styles.glassAmountEmpty}>-</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Água</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Quantidade em ml"
              placeholderTextColor="#666"
              value={waterAmount}
              onChangeText={setWaterAmount}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setWaterAmount("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddWater}
              >
                <Text style={styles.addButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  waterCard: {
    backgroundColor: "#4a91e262",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
  waterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  waterTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waterTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  waterBadge: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waterBadgeText: { color: "#fff", fontWeight: "700" },
  waterMainContent: { marginTop: 16 },
  waterVisualization: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  rightContent: {
    flex: 1,
  },
  waterBottleContainer: { alignItems: "center" },
  bottleWrapper: {
    alignItems: "center",
    position: "relative",
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginRight: 10,
  },
  bottleGlow: {
    position: "absolute",
    width: 90,
    height: 170,
    backgroundColor: "rgba(74, 144, 226, 0.15)",
    borderRadius: 45,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  bottleCap: {
    alignItems: "center",
    zIndex: 3,
    marginBottom: 1,
  },
  capTop: {
    width: 20,
    height: 7,
    borderRadius: 4,
    marginBottom: 1,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  capReflection: {
    position: "absolute",
    top: 1,
    left: 2,
    width: 8,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 1,
  },
  capRing: {
    width: 24,
    height: 6,
    backgroundColor: "#4A90E2",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#3A7BC8",
  },
  bottleNeck: {
    width: 26,
    height: 18,
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  waterBottle: {
    width: 55,
    height: 120,
    backgroundColor: "rgba(5, 5, 15, 0.95)",
    borderWidth: 2.5,
    borderColor: "#4A90E2",
    borderRadius: 24,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  bottleHighlight: {
    position: "absolute",
    left: 8,
    top: 10,
    width: 12,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 6,
    opacity: 0.9,
  },
  bottleHighlight2: {
    position: "absolute",
    right: 6,
    top: 20,
    width: 6,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
  },
  bottleHighlight3: {
    position: "absolute",
    left: 4,
    bottom: 15,
    width: 8,
    height: 20,
    backgroundColor: "rgba(107, 182, 255, 0.3)",
    borderRadius: 4,
  },
  holographicEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)",
    opacity: 0.6,
  },
  waterFill: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 50,
    bottom: 10,
  },
  risingBubble: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 50,
    bottom: 5,
    shadowColor: "#6BB6FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
  waterSurface: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#6BB6FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  levelMarkContainer: {
    position: "absolute",
    right: 0,
  },
  waterLevelMark: {
    position: "absolute",
    right: -1,
    width: 8,
    height: 1,
    backgroundColor: "rgba(74, 144, 226, 0.4)",
  },
  activeLevelMark: {
    backgroundColor: "#4A90E2",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  levelMarkGlow: {
    position: "absolute",
    right: -2,
    width: 10,
    height: 3,
    backgroundColor: "#4A90E2",
    opacity: 0.3,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  bottleBottomReflection: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    height: 15,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    opacity: 0.8,
  },
  waterBottleLabel: { color: "#aaa", marginTop: 8, fontSize: 11 },
  waterStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 10,
  },
  waterStatItem: {
    alignItems: "center"
  },
  waterStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#4A90E2",
    opacity: 0.3,
  },
  waterStatNumber: { color: "#fff", fontSize: 28, fontWeight: "600" },
  waterStatLabel: { color: "#4A90E2", fontSize: 12, fontWeight: "700" },
  waterGlassesContainer: { marginTop: 20 },
  waterGlassesTitle: {
    color: "#4A90E2",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  waterGlasses: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  waterGlass: {
    width: 50,
    height: 50,
    borderRadius: 12,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  glassGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  waterGlassEmpty: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(74, 144, 226, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(74, 144, 226, 0.2)",
  },
  glassEmptyContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  glassAmount: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 1,
  },
  glassAmountEmpty: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1c1c1c",
    padding: 20,
    borderRadius: 16,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    marginBottom: 20,
    textAlign: "center",
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#2a2a2a",
  },
  addButton: {
    backgroundColor: "#4A90E2",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
