import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

export default function RankingScreen() {
  const [selectedDate, setSelectedDate] = useState("2024-09-26");
  const [selectedTechnique, setSelectedTechnique] = useState("all");
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState("2024-09");

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
      "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
    ];
    return `${months[date.getMonth()]}' ${date.getFullYear().toString().slice(-2)}`;
  };

  // Dados simulados com WOD, peso, tempo e repetições
  const getWorkoutData = (date: string) => {
    const day = new Date(date).getDate();
    
    return [
      {
        id: 1,
        user: "João Silva",
        gym: "CrossFit Elite",
        avatar: "https://i.pravatar.cc/150?img=1",
        wod: "Fran",
        weight: 95 + (day % 10),
        time: 180 + (day % 30), // segundos
        reps: 21 + (day % 5),
        date: date,
        technique: "elite"
      },
      {
        id: 2,
        user: "Maria Santos",
        gym: "Box Fitness",
        avatar: "https://i.pravatar.cc/150?img=2",
        wod: "Helen",
        weight: 75 + (day % 8),
        time: 240 + (day % 25),
        reps: 15 + (day % 4),
        date: date,
        technique: "elite"
      },
      {
        id: 3,
        user: "Pedro Costa",
        gym: "Iron Box",
        avatar: "https://i.pravatar.cc/150?img=3",
        wod: "Cindy",
        weight: 85 + (day % 6),
        time: 300 + (day % 40),
        reps: 18 + (day % 3),
        date: date,
        technique: "endurance"
      },
      {
        id: 4,
        user: "Ana Lima",
        gym: "CrossFit Elite",
        avatar: "https://i.pravatar.cc/150?img=4",
        wod: "Grace",
        weight: 65 + (day % 5),
        time: 200 + (day % 35),
        reps: 30 + (day % 6),
        date: date,
        technique: "elite"
      },
      {
        id: 5,
        user: "Carlos Mendes",
        gym: "Beast Mode",
        avatar: "https://i.pravatar.cc/150?img=5",
        wod: "Murph",
        weight: 90 + (day % 7),
        time: 450 + (day % 50),
        reps: 25 + (day % 4),
        date: date,
        technique: "endurance"
      }
    ];
  };

  // Calcula pontuação total baseada em peso, tempo e reps
  const calculateTotalScore = (workout: any) => {
    // Normaliza os valores para criar uma pontuação equilibrada
    const weightScore = workout.weight * 2; // Peso tem peso 2x
    const timeScore = Math.max(0, 600 - workout.time); // Menos tempo = mais pontos
    const repsScore = workout.reps * 3; // Reps tem peso 3x
    
    return weightScore + timeScore + repsScore;
  };

  // Gera ranking ordenado por pontuação total
  const getRankingForDate = (date: string, technique: string) => {
    const workouts = getWorkoutData(date);
    const day = new Date(date).getDate();
    const availableTechniques = getWorkoutForDay(day);
    
    let filteredWorkouts = workouts;
    
    if (technique !== "all") {
      filteredWorkouts = workouts.filter(w => 
        w.technique === technique && availableTechniques.includes(technique)
      );
    }
    
    // Calcula pontuação e ordena
    const rankedWorkouts = filteredWorkouts
      .map(workout => ({
        ...workout,
        totalScore: calculateTotalScore(workout),
        displayTime: `${Math.floor(workout.time / 60)}:${(workout.time % 60).toString().padStart(2, '0')}`
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
    
    return rankedWorkouts;
  };

  const availableTechniques = getWorkoutForDay(new Date(selectedDate).getDate());
  const rankingData = getRankingForDate(selectedDate, selectedTechnique);

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return "trophy";
      case 2:
        return "medal";
      case 3:
        return "medal-outline";
      default:
        return "fitness-outline";
    }
  };

  const getRankingColor = (position: number) => {
    switch (position) {
      case 1:
        return "#FFD700"; // Ouro
      case 2:
        return "#C0C0C0"; // Prata
      case 3:
        return "#CD7F32"; // Bronze
      default:
        return "#fab12f";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Ranking</Text>
        <View style={styles.headerRight} />
      </View>

      {/* DATE HEADER */}
      <View style={styles.calendarHeader}>
        <Text style={styles.monthText}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
          <Ionicons
            name={showCalendar ? "calendar" : "calendar-outline"}
            size={20}
            color="#fab12f"
          />
        </TouchableOpacity>
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
          const isSelected = date.toISOString().split("T")[0] === selectedDate;
          const isToday = date.toDateString() === new Date().toDateString();
          const dayWorkouts = getWorkoutForDay(date.getDate());

          return (
            <TouchableOpacity
              key={i}
              style={styles.dayColumn}
              onPress={() => setSelectedDate(date.toISOString().split("T")[0])}
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


      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {rankingData.map((item, index) => (
          <View key={item.id} style={[
            styles.rankingCard,
            index < 3 && { borderWidth: 2, borderColor: getRankingColor(index + 1) }
          ]}>
            <View style={styles.rankingPosition}>
              <Ionicons 
                name={getRankingIcon(index + 1) as any}
                size={24} 
                color={getRankingColor(index + 1)} 
              />
              <Text style={[
                styles.positionNumber,
                { color: getRankingColor(index + 1) }
              ]}>
                {index + 1}º
              </Text>
            </View>

            <Image 
              source={{ uri: item.avatar }}
              style={styles.userAvatar}
            />

            <View style={styles.rankingInfo}>
              <View style={styles.userHeader}>
                <View>
                  <Text style={styles.userName}>{item.user}</Text>
                  <Text style={styles.gymName}>{item.gym}</Text>
                </View>
                <Text style={[
                  styles.totalScore,
                  { 
                    backgroundColor: index < 3 ? `${getRankingColor(index + 1)}44` : '#303030ff',
                    color: index < 3 ? getRankingColor(index + 1) : '#fab12f'
                  }
                ]}>{item.totalScore} pts</Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{item.weight}kg</Text>
                  <Text style={styles.statLabel}>Peso</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{item.displayTime}</Text>
                  <Text style={styles.statLabel}>Tempo</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{item.reps}</Text>
                  <Text style={styles.statLabel}>Reps</Text>
                </View>
              </View>
            </View>

          </View>
        ))}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
  },
  logo: {
    width: 35,
    height: 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerRight: {
    width: 35,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  calendarContainer: {
    marginBottom: 0,
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
    marginBottom: 0,
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
    marginBottom: 15,
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
  weekWorkoutIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 2,
    marginTop: 2,
  },
  rankingCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  rankingPosition: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 40,
  },
  positionNumber: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#fab12f",
  },
  rankingInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  gymName: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  totalScore: {
    color: "#fab12f",
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: "#fab12f",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statLabel: {
    color: "#666",
    fontSize: 11,
  },
});