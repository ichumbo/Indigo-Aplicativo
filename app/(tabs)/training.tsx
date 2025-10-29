import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

export default function TrainingScreen() {
  const params = useLocalSearchParams();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2024-09-26");
  const [completedExercises, setCompletedExercises] = useState<{
    [key: string]: boolean;
  }>({});
  const [currentMonth, setCurrentMonth] = useState("2024-09");
  const [notifications] = useState([
    { id: 1, read: false },
    { id: 2, read: false },
    { id: 3, read: true },
    { id: 4, read: true }
  ]);
  const hasUnreadNotifications = notifications.some(n => !n.read);

  const getWorkoutForDay = (day: number) => {
    const workouts = {
      1: ["elite"],
      2: [],
      3: ["elite"],
      4: [],
      5: ["elite"],
      6: [],
      7: [],
      8: ["elite"],
      9: [],
      10: ["elite"],
      11: [],
      12: ["elite"],
      13: [],
      14: [],
      15: ["elite"],
      16: ["elite"],
      17: [],
      18: [],
      19: ["elite"],
      20: ["elite"],
      21: [],
      22: ["elite"],
      23: [],
      24: ["elite"],
      25: [],
      26: ["elite"],
      27: [],
      28: ["elite"],
      29: [],
      30: ["elite"],
    };
    return workouts[day as keyof typeof workouts] || [];
  };

  const exercises = ["A", "B1", "C", "D"];
  const completedCount =
    Object.values(completedExercises).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / exercises.length) * 100);

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "JAN",
      "FEV",
      "MAR",
      "ABR",
      "MAI",
      "JUN",
      "JUL",
      "AGO",
      "SET",
      "OUT",
      "NOV",
      "DEZ",
    ];
    return `${months[date.getMonth()]}' ${date
      .getFullYear()
      .toString()
      .slice(-2)}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.exercisesButton}
                onPress={() => router.push("/exercises")}
              >
                <Ionicons name="list-outline" size={20} color="#7448ff" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Image
                  source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* HEADER CALENDÁRIO */}
        <View style={styles.calendarHeader}>
          <Text style={styles.monthText}>{formatDate(selectedDate)}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.notificationContainer}
              onPress={() => router.push("/notifications")}
            >
              <Ionicons name="notifications-outline" size={20} color="#7448ff" />
              {hasUnreadNotifications && (
                <View style={styles.notificationBadge} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
              <Ionicons
                name={showCalendar ? "calendar" : "calendar-outline"}
                size={20}
                color="#7448ff"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* CALENDÁRIO EXPANDIDO */}
        {showCalendar && (
          <View style={styles.calendarContainer}>
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
              onMonthChange={(month) => {
                setCurrentMonth(
                  `${month.year}-${month.month.toString().padStart(2, "0")}`
                );
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#7448ff",
                  selectedTextColor: "#000",
                },
                ...Object.fromEntries(
                  Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentMonth}-${day
                      .toString()
                      .padStart(2, "0")}`;
                    const workouts = getWorkoutForDay(day);

                    if (workouts.length === 0 || dateStr === selectedDate)
                      return null;

                    return [
                      dateStr,
                      {
                        marked: true,
                        dots: [
                          ...(workouts.includes("elite")
                            ? [{ color: "#7448ff" }]
                            : []),
                        ],
                      },
                    ];
                  }).filter(Boolean)
                ),
              }}
              markingType={"multi-dot"}
              theme={{
                backgroundColor: "#1c1c1c",
                calendarBackground: "#1c1c1c",
                textSectionTitleColor: "#7448ff",
                selectedDayBackgroundColor: "#7448ff",
                selectedDayTextColor: "#000",
                todayTextColor: "#7448ff",
                dayTextColor: "#fff",
                textDisabledColor: "#666",
                dotColor: "#7448ff",
                selectedDotColor: "#000",
                arrowColor: "#7448ff",
                monthTextColor: "#fff",
                indicatorColor: "#7448ff",
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
          style={styles.weekScroll}
        >
          {Array.from({ length: 14 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i - 7);
            const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const isSelected =
              date.toISOString().split("T")[0] === selectedDate;
            const isToday = date.toDateString() === new Date().toDateString();

            const dayWorkouts = getWorkoutForDay(date.getDate());

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
                    isSelected && { color: "#7448ff", fontWeight: "bold" },
                  ]}
                >
                  {dayNames[date.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && { color: "#7448ff", fontWeight: "bold" },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {dayWorkouts.length > 0 && (
                  <View style={styles.weekWorkoutIndicators}>
                    {dayWorkouts.includes("elite") && (
                      <View style={styles.weekEliteDot} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CARD DE PROGRESSO */}
        <View style={styles.progressCard}>
          <View style={styles.progressContent}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressTitle}>Progresso CrossFit</Text>
              <Text style={styles.progressSubtitle}>Meta mensal</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </View>
            <View style={styles.progressRight}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* PROGRAMA */}
        <View style={styles.programCard}>
          <View style={styles.programHeader}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.programLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.programTitle}>ELITE - JapaBox Program</Text>
              <Text style={styles.programSub}>AM: SESSION A - 2025-09-24</Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          </View>

          <TouchableOpacity 
            style={styles.sessionButton}
            onPress={() => router.push("/training-details")}
          >
            <Text style={styles.sessionText}>Começar Sessão</Text>
          </TouchableOpacity>
        </View>

        {/* COACH INSTRUCTIONS */}
        <View style={styles.coachTitleContainer}>
          <Ionicons name="clipboard-outline" size={24} color="#7448ff" />
          <View>
            <Text style={styles.coachTitle}>Coach Instructions - Elite</Text>
            <Text style={styles.coachSubtitle}>
              Orientações para o treino de força
            </Text>
          </View>
        </View>

        <View style={styles.coachCard}>
          <Text style={styles.coachText}>
            Foque na técnica perfeita durante os movimentos. Mantenha a
            respiração controlada e execute cada repetição com precisão.
            Lembre-se de aquecer adequadamente antes de iniciar.
          </Text>

          <View style={styles.tipsSection}>
            <Ionicons name="bulb-outline" size={16} color="#7448ff" />
            <Text style={styles.tipsText}>
              Dica: Hidrate-se bem antes e depois do treino. Mantenha o core
              sempre ativado.
            </Text>
          </View>
        </View>

        {/* LISTA DE EXERCÍCIOS */}
        <TouchableOpacity
          style={styles.modalExerciseCard}
          onPress={() => router.push("/training-details")}
        >
          <View style={styles.modalExerciseHeader}>
            <Ionicons name="barbell-outline" size={20} color="#7448ff" />
            <Text style={styles.modalExerciseTitle}>Deadlift</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.exerciseCheckbox,
              completedExercises["deadlift"] && styles.exerciseCheckboxActive,
            ]}
            onPress={() => toggleExercise("deadlift")}
          >
            {completedExercises["deadlift"] && (
              <Ionicons name="checkmark" size={14} color="#000" />
            )}
          </TouchableOpacity>
          <Text style={styles.modalExerciseDetails}>3 sets x 5 reps</Text>
          <Text style={styles.modalExerciseNotes}>
            Foque na técnica. Descanso: 3-4 min entre séries
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalExerciseCard}
          onPress={() => router.push("/training-details")}
        >
          <View style={styles.modalExerciseHeader}>
            <Ionicons name="fitness-outline" size={20} color="#7448ff" />
            <Text style={styles.modalExerciseTitle}>Back Squat</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.exerciseCheckbox,
              completedExercises["backsquat"] && styles.exerciseCheckboxActive,
            ]}
            onPress={() => toggleExercise("backsquat")}
          >
            {completedExercises["backsquat"] && (
              <Ionicons name="checkmark" size={14} color="#000" />
            )}
          </TouchableOpacity>
          <Text style={styles.modalExerciseDetails}>4 sets x 6 reps</Text>
          <Text style={styles.modalExerciseNotes}>
            Profundidade completa. Descanso: 2-3 min
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalExerciseCard}
          onPress={() => router.push("/training-details")}
        >
          <View style={styles.modalExerciseHeader}>
            <Ionicons name="heart-outline" size={20} color="#7448ff" />
            <Text style={styles.modalExerciseTitle}>
              Double Under Crossover
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.exerciseCheckbox,
              completedExercises["doubleunder"] &&
                styles.exerciseCheckboxActive,
            ]}
            onPress={() => toggleExercise("doubleunder")}
          >
            {completedExercises["doubleunder"] && (
              <Ionicons name="checkmark" size={14} color="#000" />
            )}
          </TouchableOpacity>
          <Text style={styles.modalExerciseDetails}>3 rounds x 30 reps</Text>
          <Text style={styles.modalExerciseNotes}>
            Mantenha ritmo constante. Descanso: 1 min
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalExerciseCard}
          onPress={() => router.push("/training-details")}
        >
          <View style={styles.modalExerciseHeader}>
            <Ionicons name="body-outline" size={20} color="#7448ff" />
            <Text style={styles.modalExerciseTitle}>Hip Flexor Stretch</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.exerciseCheckbox,
              completedExercises["hipflexor"] && styles.exerciseCheckboxActive,
            ]}
            onPress={() => toggleExercise("hipflexor")}
          >
            {completedExercises["hipflexor"] && (
              <Ionicons name="checkmark" size={14} color="#000" />
            )}
          </TouchableOpacity>
          <Text style={styles.modalExerciseDetails}>
            2 sets x 30s cada lado
          </Text>
          <Text style={styles.modalExerciseNotes}>
            Alongamento final. Respiração profunda
          </Text>
        </TouchableOpacity>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 50,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingVertical: 20,
    minHeight: 80,
  },
  logo: {
    width: 35,
    height: 35,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exercisesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7348ff3f",
    borderWidth: 1,
    borderColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#7448ff",
  },
  coachTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 35,
    marginBottom: 15,
  },
  coachTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  coachSubtitle: {
    color: "#888",
    fontSize: 14,
  },
  coachCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 15,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#7448ff",
    marginBottom: 20,
  },
  coachText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 25,
  },
  tipsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7348ff3f",
    padding: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#7448ff",
  },
  tipsText: {
    color: "#7448ff",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcome: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "700",
  },
  name: {
    color: "#7448ff",
    fontSize: 30,
    fontWeight: "700",
  },

  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  monthText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "bold",
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
    color: "#a6a2ad",
    fontSize: 14,
  },
  dayNumber: {
    color: "#fff",
    fontSize: 16,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#7448ff",
    marginTop: 4,
  },

  progressCard: {
    borderRadius: 20,
    padding: 18,
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: "#7448ff",
  },
  progressContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLeft: {
    flex: 1,
    paddingRight: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#000",
    opacity: 1,
    fontWeight: "500",
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    width: "68%",
    backgroundColor: "#000",
    borderRadius: 4,
  },
  progressRight: {
    alignItems: "center",
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  personImage: {
    width: 80,
    height: 100,
    position: "absolute",
    right: 10,
    top: -20,
    zIndex: 2,
  },

  programCard: {
    borderRadius: 15,
    marginTop: 25,
  },
  programHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  programLogo: {
    width: 35,
    height: 35,
    borderRadius: 18,
    marginRight: 10,
  },
  programTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  programSub: {
    color: "#a6a2ad",
    fontSize: 12,
  },
  sessionButton: {
    backgroundColor: "#7448ff",
    borderRadius: 15,
    paddingVertical: 15,
    marginTop: 15,
  },
  sessionText: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
  },

  commentTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },

  exerciseCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 15,
    padding: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  exerciseIcon: {
    backgroundColor: "#1c1c1c",
    borderRadius: 50,
    padding: 10,
    borderWidth: 1,
    borderColor: "#7448ff",
  },

  exerciseText: {
    flex: 1,
    marginLeft: 12,
    gap: 3,
  },
  exerciseCategory: {
    color: "#a6a2ad",
    fontSize: 11,
  },
  exerciseName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  exerciseSets: {
    color: "#7448ff",
    fontWeight: "bold",
    fontSize: 14,
  },
  checkButton: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkButtonActive: {
    backgroundColor: "#7448ff",
  },

  fab: {
    backgroundColor: "#7448ff",
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    position: "absolute",
    bottom: 100,
    right: 30,
  },
  fabText: {
    color: "#000",
    fontSize: 30,
    fontWeight: "bold",
  },



  weekWorkoutIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 2,
    marginTop: 2,
  },
  weekEliteDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#7448ff",
  },


  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#030303",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  modalIconElite: {
    borderColor: "#7448ff",
    backgroundColor: "#7348ff3f",
  },
  modalIconEndurance: {
    borderColor: "#ff6b35",
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: "#888",
    fontSize: 14,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  workoutInfo: {
    marginBottom: 24,
  },
  workoutDate: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  workoutDuration: {
    color: "#888",
    fontSize: 14,
  },
  exercisesList: {
    gap: 16,
  },
  modalExerciseCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    position: "relative",
  },
  modalExerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  modalExerciseTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalExerciseDetails: {
    color: "#7448ff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalExerciseNotes: {
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    paddingBottom: 40,
  },
  startWorkoutButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  startWorkoutButtonElite: {
    backgroundColor: "#7448ff",
  },
  startWorkoutButtonEndurance: {
    backgroundColor: "#ff6b35",
  },
  startWorkoutText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseCheckbox: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseCheckboxActive: {
    backgroundColor: "#7448ff",
  },



  notificationContainer: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4444",
  },
});

