import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";

export default function HydrationScreen() {
  const router = useRouter();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2024-09-26");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [waterData, setWaterData] = useState({
    "2024-09-26": { consumed: 1200, history: [250, 300] },
    "2024-09-25": { consumed: 800, history: [200, 250] },
    "2024-09-27": { consumed: 1500, history: [300, 400] },
  });
  const [metaAgua, setMetaAgua] = useState(2000);
  const metas = [1500, 2000, 2500, 3000];
  
  const getCurrentDayData = () => {
    return waterData[selectedDate] || { consumed: 0, history: [] };
  };
  
  const aguaBebida = getCurrentDayData().consumed;
  const waterHistory = getCurrentDayData().history;
  
  const copos = [250, 300, 500, 750];
  
  // Animações
  const shimmerAnim = useState(new Animated.Value(0))[0];
  const bubbleAnim1 = useState(new Animated.Value(0))[0];
  const bubbleAnim2 = useState(new Animated.Value(0))[0];
  const bubbleAnim3 = useState(new Animated.Value(0))[0];
  const bubbleAnim4 = useState(new Animated.Value(0))[0];
  const bubbleAnim5 = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const bubbleAnimations = [bubbleAnim1, bubbleAnim2, bubbleAnim3, bubbleAnim4, bubbleAnim5].map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 300),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + index * 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      )
    );

    shimmerAnimation.start();
    bubbleAnimations.forEach(anim => anim.start());

    return () => {
      shimmerAnimation.stop();
      bubbleAnimations.forEach(anim => anim.stop());
    };
  }, []);
  
  const adicionarAgua = (quantidade: number) => {
    setWaterData(prev => {
      const currentData = prev[selectedDate] || { consumed: 0, history: [] };
      const newConsumed = Math.min(currentData.consumed + quantidade, metaAgua);
      const newHistory = [quantidade, ...currentData.history];
      
      return {
        ...prev,
        [selectedDate]: {
          consumed: newConsumed,
          history: newHistory
        }
      };
    });
  };

  const removerAgua = (quantidade: number) => {
    setWaterData(prev => {
      const currentData = prev[selectedDate] || { consumed: 0, history: [] };
      const newConsumed = Math.max(currentData.consumed - quantidade, 0);
      const newHistory = currentData.history.filter((_, index) => index !== 0);
      
      return {
        ...prev,
        [selectedDate]: {
          consumed: newConsumed,
          history: newHistory
        }
      };
    });
  };

  const porcentagem = Math.round((aguaBebida / metaAgua) * 100);
  const progress = (aguaBebida / metaAgua) * 100;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return `${months[date.getMonth()]}' ${date.getFullYear().toString().slice(-2)}`;
  };

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
  };

  const createBubbleStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -80],
        }),
      },
    ],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#D90000" />
          </TouchableOpacity>
          <Text style={styles.title}>Hidratação</Text>
          <View style={styles.placeholder} />
        </View>

        {/* HEADER CALENDÁRIO */}
        <View style={[styles.calendarHeader, {paddingHorizontal: 20}]}>
          <Text style={styles.monthText}>{formatDate(selectedDate)}</Text>
          <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
            <Ionicons
              name={showCalendar ? "calendar" : "calendar-outline"}
              size={20}
              color="#4A90E2"
            />
          </TouchableOpacity>
        </View>

        {/* CALENDÁRIO EXPANDIDO */}
        {showCalendar && (
          <View style={[styles.calendarContainer, {marginHorizontal: 20}]}>
            <View style={styles.calendarHeader2}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalendar(false)}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#4A90E2",
                  selectedTextColor: "#000",
                },
              }}
              theme={{
                backgroundColor: "#1c1c1c",
                calendarBackground: "#1c1c1c",
                textSectionTitleColor: "#4A90E2",
                selectedDayBackgroundColor: "#4A90E2",
                selectedDayTextColor: "#000",
                todayTextColor: "#4A90E2",
                dayTextColor: "#fff",
                textDisabledColor: "#666",
                dotColor: "#4A90E2",
                selectedDotColor: "#000",
                arrowColor: "#4A90E2",
                monthTextColor: "#fff",
                indicatorColor: "#4A90E2",
                textDayFontWeight: "600",
                textMonthFontWeight: "700",
                textDayHeaderFontWeight: "700",
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
              }}
              style={{
                borderRadius: 16,
                paddingBottom: 10,
              }}
            />
          </View>
        )}

        {/* DIAS DA SEMANA */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.weekScroll, {paddingHorizontal: 20}]}
        >
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i - 3);
            const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const isSelected =
              date.toISOString().split("T")[0] === selectedDate;
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <TouchableOpacity
                key={i}
                style={styles.dayColumn}
                onPress={() =>
                  setSelectedDate(date.toISOString().split("T")[0])
                }
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && { color: "#4A90E2", fontWeight: "bold" },
                  ]}
                >
                  {dayNames[date.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && { color: "#4A90E2", fontWeight: "bold" },
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.progressContainer, {paddingHorizontal: 20}]}>
          <View style={styles.waterVisualization}>
            <View style={styles.waterBottleContainer}>
              <View style={styles.bottleWrapper}>
                <Animated.View style={[styles.bottleGlow, shimmerStyle]} />
                
                <View style={styles.bottleCap}>
                  <LinearGradient
                    colors={['#6BB6FF', '#4A90E2']}
                    style={styles.capTop}
                  />
                  <LinearGradient
                    colors={['#4A90E2', '#2E5BBA']}
                    style={styles.capNeck}
                  />
                </View>

                <View style={styles.bottleBody}>
                  <Animated.View
                    style={[
                      styles.waterFill,
                      {
                        height: `${progress}%`,
                        opacity: progress > 0 ? 1 : 0,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#6BB6FF', '#4A90E2', '#2E5BBA']}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    
                    {progress > 10 && (
                      <>
                        <Animated.View
                          style={[
                            styles.risingBubble,
                            { width: 3, height: 3, left: '25%' },
                            createBubbleStyle(bubbleAnim1),
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.risingBubble,
                            { width: 4, height: 4, left: '65%' },
                            createBubbleStyle(bubbleAnim2),
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.risingBubble,
                            { width: 2, height: 2, left: '45%' },
                            createBubbleStyle(bubbleAnim3),
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.risingBubble,
                            { width: 5, height: 5, left: '15%' },
                            createBubbleStyle(bubbleAnim4),
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.risingBubble,
                            { width: 3, height: 3, left: '75%' },
                            createBubbleStyle(bubbleAnim5),
                          ]}
                        />
                      </>
                    )}
                  </Animated.View>

                  {progress > 0 && (
                    <Animated.View
                      style={[
                        styles.waterSurface,
                        { bottom: `${progress}%` },
                        shimmerStyle,
                      ]}
                    />
                  )}

                  {[25, 50, 75].map((level) => (
                    <View key={level} style={styles.levelMarkContainer}>
                      <View
                        style={[
                          styles.waterLevelMark,
                          { bottom: `${level}%` },
                          progress >= level && styles.activeLevelMark,
                        ]}
                      />
                    </View>
                  ))}

                  <Animated.View style={[styles.bottleHighlight, shimmerStyle]} />
                  <View style={styles.bottleHighlight2} />
                  <View style={styles.bottleHighlight3} />

                  <Animated.View style={[styles.holographicEffect, shimmerStyle]} />

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
                  {waterHistory.slice(0, 3).map((amount, i) => (
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
                  {waterHistory.length > 3 ? (
                    <TouchableOpacity 
                      style={styles.waterGlass} 
                      onPress={() => setShowHistoryModal(true)}
                    >
                      <LinearGradient
                        colors={['#6BB6FF', '#4A90E2', '#2E5BBA']}
                        style={styles.glassGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.glassAmount}>+{waterHistory.length - 3}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : waterHistory.length === 0 ? (
                    <View style={styles.waterGlassEmpty}>
                      <View style={styles.glassEmptyContent}>
                        <Ionicons name="water" size={16} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.glassAmountEmpty}>-</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>

                   {/* CARD SELEÇÃO DE META */}
        <View style={[styles.goalCard, {marginHorizontal: 20}]}>
          <View style={styles.goalHeader}>
            <Ionicons name="flag" size={18} color="#D90000" />
            <Text style={styles.goalTitle}>Meta diária</Text>
          </View>
          <View style={styles.goalOptions}>
            {metas.map((meta) => (
              <TouchableOpacity
                key={meta}
                style={[
                  styles.goalOption,
                  metaAgua === meta && styles.goalOptionActive
                ]}
                onPress={() => setMetaAgua(meta)}
              >
                <Text style={[
                  styles.goalOptionText,
                  metaAgua === meta && styles.goalOptionTextActive
                ]}>
                  {meta}ml
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.quickActions, {marginHorizontal: 20}]}>
          <View style={styles.quickActionsHeader}>
            <View style={styles.quickActionsTitleContainer}>
              <Ionicons name="add-circle" size={20} color="#4A90E2" />
              <Text style={styles.quickActionsTitle}>Adicionar água</Text>
            </View>
          </View>
          <View style={styles.cupsContainer}>
            {copos.map((quantidade) => (
              <TouchableOpacity
                key={quantidade}
                style={styles.cupButton}
                onPress={() => adicionarAgua(quantidade)}
              >
                <Ionicons name="water" size={20} color="#fff" />
                <Text style={styles.cupText}>{quantidade}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.removeSection, {marginHorizontal: 20}]}>
          <View style={styles.removeSectionHeader}>
            <View style={styles.removeSectionTitleContainer}>
              <Ionicons name="remove-circle" size={20} color="#e74c3c" />
              <Text style={styles.removeSectionTitle}>Remover água</Text>
            </View>
          </View>
          <View style={styles.removeButtons}>
            {copos.map((quantidade) => (
              <TouchableOpacity
                key={`remove-${quantidade}`}
                style={styles.removeButton}
                onPress={() => removerAgua(quantidade)}
              >
                <Ionicons name="remove" size={20} color="#fff" />
                <Text style={styles.removeText}>{quantidade}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showHistoryModal}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Histórico Completo</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowHistoryModal(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalHistoryList}>
              {waterHistory.map((amount, i) => (
                <View key={i} style={styles.modalHistoryItem}>
                  <View style={styles.modalHistoryIcon}>
                    <Ionicons name="water" size={16} color="#4A90E2" />
                  </View>
                  <Text style={styles.modalHistoryText}>Adicionou {amount}ml</Text>
                  <Text style={styles.modalHistoryTime}>{14 - i}:30</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  monthText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "bold",
  },
  calendarContainer: {
    marginBottom: 20,
    backgroundColor: "#1c1c1c",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  calendarHeader2: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: "#333",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ECEDEE",
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingBottom: 100,
  },
  progressContainer: {
    marginBottom: 40,
  },
  waterVisualization: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  waterBottleContainer: {
    alignItems: "center",
  },
  bottleWrapper: {
    alignItems: "center",
    position: "relative",
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginRight: 10,
  },
  bottleGlow: {
    position: "absolute",
    width: 120,
    height: 220,
    backgroundColor: "rgba(74, 144, 226, 0.15)",
    borderRadius: 60,
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
    width: 26,
    height: 9,
    borderRadius: 5,
    marginBottom: 1,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  capNeck: {
    width: 32,
    height: 10,
    borderRadius: 4,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  bottleBody: {
    width: 95,
    height: 180,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 47,
    borderWidth: 1,
    borderColor: "rgba(107, 182, 255, 0.3)",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  waterFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 45,
  },
  risingBubble: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 10,
    bottom: 10,
  },
  waterSurface: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  levelMarkContainer: {
    position: "absolute",
    right: -8,
    width: 12,
    height: 1,
  },
  waterLevelMark: {
    position: "absolute",
    right: 0,
    width: 6,
    height: 1,
    backgroundColor: "rgba(107, 182, 255, 0.4)",
  },
  activeLevelMark: {
    backgroundColor: "#6BB6FF",
    shadowColor: "#6BB6FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  bottleHighlight: {
    position: "absolute",
    top: 20,
    left: 12,
    width: 16,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
  },
  bottleHighlight2: {
    position: "absolute",
    top: 35,
    right: 16,
    width: 6,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 3,
  },
  bottleHighlight3: {
    position: "absolute",
    bottom: 25,
    left: 20,
    width: 10,
    height: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 5,
  },
  holographicEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 45,
    backgroundColor: "rgba(107, 182, 255, 0.05)",
  },
  bottleBottomReflection: {
    position: "absolute",
    bottom: 8,
    left: 14,
    right: 14,
    height: 20,
    borderRadius: 25,
  },
  rightContent: {
    flex: 1,
  },
  waterStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(74, 144, 226, 0.2)",
  },
  waterStatItem: {
    alignItems: "center",
  },
  waterStatNumber: {
    color: "#ECEDEE",
    fontSize: 24,
    fontWeight: "700",
  },
  waterStatLabel: {
    color: "#4A90E2",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  waterStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(74, 144, 226, 0.3)",
  },
  waterGlassesContainer: {
    alignItems: "center",
  },
  waterGlassesTitle: {
    color: "#4A90E2",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  waterGlasses: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  waterGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  glassGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  glassAmount: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "600",
  },
  waterGlassEmpty: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
  },
  glassEmptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  glassAmountEmpty: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 8,
    fontWeight: "600",
  },
  weekScroll: {
    marginBottom: 20,
  },
  dayColumn: {
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginRight: 2,
    minWidth: 50,
  },
  dayLabel: {
    color: "#a6a6a6",
    fontSize: 14,
  },
  dayNumber: {
    color: "#fff",
    fontSize: 16,
  },
  quickActions: {
    backgroundColor: "#4a91e262",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#4a91e26e",
  },
  quickActionsHeader: {
    marginBottom: 16,
  },
  quickActionsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickActionsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ECEDEE",
    marginBottom: 15,
  },
  cupsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cupButton: {
    flex: 1,
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cupText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  historySection: {
    marginBottom: 30,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1c",
    padding: 15,
    borderRadius: 12,
  },
  historyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e6f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: "#ECEDEE",
    fontWeight: "500",
  },
  historyTime: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  removeSection: {
    backgroundColor: "rgba(231, 76, 60, 0.15)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e74d3c6e",
  },
  removeSectionHeader: {
    marginBottom: 16,
  },
  removeSectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removeSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  removeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  removeButton: {
    flex: 1,
    backgroundColor: "#e74c3c",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  removeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1c1c1c",
    borderRadius: 20,
    width: "90%",
    maxHeight: "70%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74, 144, 226, 0.2)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(74, 144, 226, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(74, 144, 226, 0.3)",
  },
  modalHistoryList: {
    maxHeight: 350,
  },
  modalHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalHistoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74, 144, 226, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "rgba(74, 144, 226, 0.4)",
  },
  modalHistoryText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalHistoryTime: {
    color: "#4A90E2",
    fontSize: 13,
    fontWeight: "500",
  },
  goalCard: {
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  goalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  goalOptions: {
    flexDirection: "row",
    gap: 8,
  },
  goalOption: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  goalOptionActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  goalOptionText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  goalOptionTextActive: {
    color: "#fff",
  },
});
