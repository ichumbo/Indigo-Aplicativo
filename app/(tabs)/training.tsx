import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
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
  const [customExercises, setCustomExercises] = useState([]);
  const [customEnduranceExercises, setCustomEnduranceExercises] = useState([]);

  const hasUnreadNotifications = notifications.some(n => !n.read);

  useEffect(() => {
    if (params.addExercise) {
      const exercise = JSON.parse(params.addExercise as string);
      const section = params.section as string;
      
      if (section === 'endurance') {
        setCustomEnduranceExercises(prev => [...prev, exercise]);
      } else {
        setCustomExercises(prev => [...prev, exercise]);
      }
    }
  }, [params.addExercise, params.section]);

  const getWorkoutForDay = (day: number) => {
    const workouts = {
      1: ["elite"],
      2: ["endurance"],
      3: ["elite", "endurance"],
      4: [],
      5: ["elite"],
      6: ["endurance"],
      7: [],
      8: ["elite"],
      9: ["endurance"],
      10: ["elite", "endurance"],
      11: [],
      12: ["elite"],
      13: ["endurance"],
      14: [],
      15: ["elite", "endurance"],
      16: ["elite"],
      17: [],
      18: ["endurance"],
      19: ["elite"],
      20: ["elite", "endurance"],
      21: [],
      22: ["elite"],
      23: ["endurance"],
      24: ["elite"],
      25: ["endurance"],
      26: ["elite", "endurance"],
      27: [],
      28: ["elite"],
      29: ["endurance"],
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
                <Ionicons name="list-outline" size={20} color="#fab12f" />
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
              <Ionicons name="notifications-outline" size={20} color="#fab12f" />
              {hasUnreadNotifications && (
                <View style={styles.notificationBadge} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
              <Ionicons
                name={showCalendar ? "calendar" : "calendar-outline"}
                size={20}
                color="#fab12f"
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
                  selectedColor: "#fab12f",
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
                            ? [{ color: "#fab12f" }]
                            : []),
                          ...(workouts.includes("endurance")
                            ? [{ color: "#ff6b35" }]
                            : []),
                        ],
                      },
                    ];
                  }).filter(Boolean)
                ),
              }}
              markingType={"multi-dot"}
              theme={{
                backgroundColor: "#1a1a1a",
                calendarBackground: "#1a1a1a",
                textSectionTitleColor: "#fab12f",
                selectedDayBackgroundColor: "#fab12f",
                selectedDayTextColor: "#000",
                todayTextColor: "#fab12f",
                dayTextColor: "#fff",
                textDisabledColor: "#666",
                dotColor: "#fab12f",
                selectedDotColor: "#000",
                arrowColor: "#fab12f",
                monthTextColor: "#fff",
                indicatorColor: "#fab12f",
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
                    isSelected && { color: "#fab12f", fontWeight: "bold" },
                  ]}
                >
                  {dayNames[date.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && { color: "#fab12f", fontWeight: "bold" },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {dayWorkouts.length > 0 && (
                  <View style={styles.weekWorkoutIndicators}>
                    {dayWorkouts.includes("elite") && (
                      <View style={styles.weekEliteDot} />
                    )}
                    {dayWorkouts.includes("endurance") && (
                      <View style={styles.weekEnduranceDot} />
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
          <Ionicons name="clipboard-outline" size={24} color="#fab12f" />
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
            <Ionicons name="bulb-outline" size={16} color="#fab12f" />
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
            <Ionicons name="barbell-outline" size={20} color="#fab12f" />
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
            <Ionicons name="fitness-outline" size={20} color="#fab12f" />
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
            <Ionicons name="heart-outline" size={20} color="#fab12f" />
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
            <Ionicons name="body-outline" size={20} color="#fab12f" />
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

        {customExercises.map((exercise, index) => (
          <TouchableOpacity
            key={`custom-${index}`}
            style={styles.modalExerciseCard}
            onPress={() => router.push("/training-details")}
          >
            <View style={styles.modalExerciseHeader}>
              <Ionicons name={exercise.icon as any} size={20} color="#fab12f" />
              <Text style={styles.modalExerciseTitle}>{exercise.name}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.exerciseCheckbox,
                completedExercises[`custom-${index}`] && styles.exerciseCheckboxActive,
              ]}
              onPress={() => toggleExercise(`custom-${index}`)}
            >
              {completedExercises[`custom-${index}`] && (
                <Ionicons name="checkmark" size={14} color="#000" />
              )}
            </TouchableOpacity>
            <Text style={styles.modalExerciseDetails}>Personalizado</Text>
            <Text style={styles.modalExerciseNotes}>
              {exercise.description}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={styles.addExerciseButton}
          onPress={() => router.push("/exercises")}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fab12f" />
          <Text style={styles.addExerciseText}>Adicionar Exercício</Text>
        </TouchableOpacity>

        {/* SEGUNDO PROGRAMA - ENDURANCE */}
        <View style={styles.programCardOrange}>
          <View style={styles.programHeader}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.programLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.programTitleOrange}>
                ENDURANCE - Resistance Program
              </Text>
              <Text style={styles.programSub}>PM: SESSION B - 2025-09-24</Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          </View>

          <TouchableOpacity 
            style={styles.sessionButtonOrange}
            onPress={() => router.push("/training-details")}
          >
            <Text style={styles.sessionTextOrange}>Começar Sessão</Text>
          </TouchableOpacity>
        </View>

        {/* COACH INSTRUCTIONS - ENDURANCE */}
        <View style={styles.coachTitleContainerOrange}>
          <Ionicons name="clipboard-outline" size={24} color="#ff6b35" />
          <View>
            <Text style={styles.coachTitleOrange}>
              Coach Instructions - Endurance
            </Text>
            <Text style={styles.coachSubtitle}>
              Orientações para o treino de resistência
            </Text>
          </View>
        </View>

        <View style={styles.coachCardOrange}>
          <Text style={styles.coachText}>
            Mantenha ritmo constante durante todo o treino. Foque na resistência
            e controle da respiração. Execute os movimentos com fluidez e
            persistência.
          </Text>

          <View style={styles.tipsSectionOrange}>
            <Ionicons name="bulb-outline" size={16} color="#ff6b35" />
            <Text style={styles.tipsTextOrange}>
              Dica: Mantenha hidratação constante. Foque na consistência dos
              movimentos.
            </Text>
          </View>
        </View>

        {/* LISTA DE EXERCÍCIOS - ENDURANCE */}
        <TouchableOpacity
          style={styles.modalExerciseCard}
          onPress={() => router.push("/training-details")}
        >
          <View style={styles.modalExerciseHeader}>
            <Ionicons name="timer-outline" size={20} color="#ff6b35" />
            <Text style={styles.modalExerciseTitle}>Rowing Machine</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.exerciseCheckboxOrange,
              completedExercises["rowing"] &&
                styles.exerciseCheckboxActiveOrange,
            ]}
            onPress={() => toggleExercise("rowing")}
          >
            {completedExercises["rowing"] && (
              <Ionicons name="checkmark" size={14} color="#000" />
            )}
          </TouchableOpacity>
          <Text style={[styles.modalExerciseDetails, { color: "#ff6b35" }]}>
            5 sets x 500m
          </Text>
          <Text style={styles.modalExerciseNotes}>
            Ritmo moderado-alto. Descanso: 90s entre sets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalExerciseCard}
          onPress={() => router.push("/training-details")}
        >
          <View style={styles.modalExerciseHeader}>
            <Ionicons name="bicycle-outline" size={20} color="#ff6b35" />
            <Text style={styles.modalExerciseTitle}>Bike Intervals</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.exerciseCheckboxOrange,
              completedExercises["bike"] && styles.exerciseCheckboxActiveOrange,
            ]}
            onPress={() => toggleExercise("bike")}
          >
            {completedExercises["bike"] && (
              <Ionicons name="checkmark" size={14} color="#000" />
            )}
          </TouchableOpacity>
          <Text style={[styles.modalExerciseDetails, { color: "#ff6b35" }]}>
            8 rounds x 30s alta intensidade
          </Text>
          <Text style={styles.modalExerciseNotes}>
            30s descanso entre rounds. Máxima intensidade
          </Text>
        </TouchableOpacity>

        {customEnduranceExercises.map((exercise, index) => (
          <TouchableOpacity
            key={`endurance-${index}`}
            style={styles.modalExerciseCard}
            onPress={() => router.push("/training-details")}
          >
            <View style={styles.modalExerciseHeader}>
              <Ionicons name={exercise.icon as any} size={20} color="#ff6b35" />
              <Text style={styles.modalExerciseTitle}>{exercise.name}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.exerciseCheckboxOrange,
                completedExercises[`endurance-${index}`] && styles.exerciseCheckboxActiveOrange,
              ]}
              onPress={() => toggleExercise(`endurance-${index}`)}
            >
              {completedExercises[`endurance-${index}`] && (
                <Ionicons name="checkmark" size={14} color="#000" />
              )}
            </TouchableOpacity>
            <Text style={[styles.modalExerciseDetails, { color: "#ff6b35" }]}>Personalizado</Text>
            <Text style={styles.modalExerciseNotes}>
              {exercise.description}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={styles.addExerciseButtonOrange}
          onPress={() => router.push("/exercises")}
        >
          <Ionicons name="add-circle-outline" size={24} color="#ff6b35" />
          <Text style={styles.addExerciseTextOrange}>Adicionar Exercício</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030303",
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 50,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 35,
    height: 15,
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
    backgroundColor: "rgba(250, 177, 47, 0.1)",
    borderWidth: 1,
    borderColor: "#fab12f",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fab12f",
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
    backgroundColor: "#111",
    borderRadius: 15,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#fab12f",
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
    backgroundColor: "rgba(250, 177, 47, 0.1)",
    padding: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#fab12f",
  },
  tipsText: {
    color: "#fab12f",
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
    color: "#fab12f",
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
    backgroundColor: "#1a1a1a",
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
    backgroundColor: "#fab12f",
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
    backgroundColor: "#fab12f",
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
    backgroundColor: "#fab12f",
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
    backgroundColor: "#111",
    borderRadius: 15,
    padding: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  exerciseIcon: {
    backgroundColor: "#111",
    borderRadius: 50,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fab12f",
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
    color: "#fab12f",
    fontWeight: "bold",
    fontSize: 14,
  },
  checkButton: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#fab12f",
    justifyContent: "center",
    alignItems: "center",
  },
  checkButtonActive: {
    backgroundColor: "#fab12f",
  },

  fab: {
    backgroundColor: "#fab12f",
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

  programCardOrange: {
    borderRadius: 15,
    marginTop: 25,
  },
  programTitleOrange: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  orangeIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sessionButtonOrange: {
    backgroundColor: "#ff6b35",
    borderRadius: 15,
    paddingVertical: 15,
    marginTop: 15,
  },
  sessionTextOrange: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },

  coachTitleContainerOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 35,
    marginBottom: 15,
  },
  coachTitleOrange: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  coachCardOrange: {
    backgroundColor: "#111",
    borderRadius: 15,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ff6b35",
    marginBottom: 20,
  },
  tipsSectionOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    padding: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6B35",
  },
  tipsTextOrange: {
    color: "#ff6b35",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  exerciseCardOrange: {
    backgroundColor: "#111",
    borderRadius: 15,
    padding: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  exerciseIconOrange: {
    backgroundColor: "#111",
    borderRadius: 50,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ff6b35",
  },
  exerciseSetsOrange: {
    color: "#ff6b35",
    fontWeight: "bold",
    fontSize: 14,
  },
  checkButtonOrange: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ff6b35",
    justifyContent: "center",
    alignItems: "center",
  },
  checkButtonActiveOrange: {
    backgroundColor: "#ff6b35",
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
    backgroundColor: "#fab12f",
  },
  weekEnduranceDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#ff6b35",
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
    borderColor: "#fab12f",
    backgroundColor: "rgba(250, 177, 47, 0.1)",
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
    backgroundColor: "#111",
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
    color: "#fab12f",
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
    backgroundColor: "#fab12f",
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
    borderColor: "#fab12f",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseCheckboxActive: {
    backgroundColor: "#fab12f",
  },
  exerciseCheckboxOrange: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ff6b35",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseCheckboxActiveOrange: {
    backgroundColor: "#ff6b35",
  },
  addExerciseButton: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#fab12f",
    borderStyle: "dashed",
  },
  addExerciseText: {
    color: "#fab12f",
    fontSize: 16,
    fontWeight: "600",
  },
  addExerciseButtonOrange: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff6b35",
    borderStyle: "dashed",
  },
  addExerciseTextOrange: {
    color: "#ff6b35",
    fontSize: 16,
    fontWeight: "600",
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
