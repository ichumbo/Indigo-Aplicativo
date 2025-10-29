import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

export default function AdminScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState("2024-09-26");
  const [showCalendar, setShowCalendar] = useState(false);
  const [trainingNote, setTrainingNote] = useState("");
  const [trainingTip, setTrainingTip] = useState("");

  useEffect(() => {
    if (params.addExercises) {
      const exercises = JSON.parse(params.addExercises as string);
      const program = params.program as string;
      const date = (params.selectedDate as string) || selectedDate;
      
      setTrainingData(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          [program]: [
            ...(prev[date]?.[program] || []),
            ...exercises
          ]
        }
      }));
    }
    
    if (params.addExercise) {
      const exercise = JSON.parse(params.addExercise as string);
      
      setTrainingData(prev => ({
        ...prev,
        [selectedDate]: {
          ...prev[selectedDate],
          elite: [
            ...(prev[selectedDate]?.elite || []),
            exercise
          ]
        }
      }));
    }
  }, [params.addExercises, params.addExercise, params.program, params.selectedDate, selectedDate]);

  const [trainingData, setTrainingData] = useState({
    "2024-09-26": {
      elite: [
        { name: "Deadlift", sets: "3", reps: "5", notes: "Foque na técnica" },
        { name: "Back Squat", sets: "4", reps: "6", notes: "Profundidade completa" },
      ],
    },
  });

  const getCurrentDayData = () => {
    return trainingData[selectedDate] || { elite: [] };
  };

  const removeExercise = (program: string, index: number) => {
    Alert.alert(
      "Remover Exercício",
      "Tem certeza que deseja remover este exercício?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            setTrainingData(prev => ({
              ...prev,
              [selectedDate]: {
                ...prev[selectedDate],
                [program]: prev[selectedDate]?.[program]?.filter((_, i) => i !== index) || []
              }
            }));
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return `${months[date.getMonth()]}' ${date.getFullYear().toString().slice(-2)}`;
  };

  const currentData = getCurrentDayData();

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
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#7448ff" />
                <Text style={styles.adminText}>ADMIN</Text>
              </View>
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
          <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
            <Ionicons
              name={showCalendar ? "calendar" : "calendar-outline"}
              size={20}
              color="#7448ff"
            />
          </TouchableOpacity>
        </View>

        {/* SEÇÃO DE ANOTAÇÕES */}
        <View style={styles.notesSection}>
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View style={styles.noteIconContainer}>
                <Ionicons name="document-text" size={20} color="#7448ff" />
              </View>
              <Text style={styles.noteTitle}>Anotação do Treino</Text>
            </View>
            <TextInput
              style={[styles.noteInput, trainingNote && styles.noteInputFocused]}
              placeholder="Adicione suas observações sobre o treino..."
              placeholderTextColor="#666"
              value={trainingNote}
              onChangeText={setTrainingNote}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View style={styles.noteIconContainer}>
                <Ionicons name="bulb" size={20} color="#FFD700" />
              </View>
              <Text style={styles.noteTitle}>Dica do Treino</Text>
            </View>
            <TextInput
              style={[styles.noteInput, trainingTip && styles.noteInputFocused]}
              placeholder="Compartilhe uma dica importante..."
              placeholderTextColor="#666"
              value={trainingTip}
              onChangeText={setTrainingTip}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

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
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#7448ff",
                  selectedTextColor: "#000",
                },
              }}
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

        {/* PROGRAMA ELITE */}
        <View style={styles.programSection}>
          <View style={styles.programHeader}>
            <View style={styles.programTitleContainer}>
              <Ionicons name="barbell" size={20} color="#7448ff" />
              <Text style={styles.programTitle}>ELITE Program</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                router.push("/exercises");
              }}
            >
              <Ionicons name="add" size={20} color="#7448ff" />
            </TouchableOpacity>
          </View>

          <View style={styles.exercisesList}>
            {currentData.elite.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Ionicons name="barbell-outline" size={20} color="#7448ff" />
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
                <Text style={styles.exerciseDetails}>
                  {exercise.sets} sets x {exercise.reps}
                </Text>
                {exercise.notes && (
                  <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeExercise("elite", index)}
                >
                  <Ionicons name="trash" size={16} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
            {currentData.elite.length === 0 && (
              <Text style={styles.emptyText}>Nenhum exercício adicionado</Text>
            )}
          </View>
        </View>

        {/* BOTÃO SALVAR TREINO DO DIA */}
        <TouchableOpacity 
          style={styles.saveTrainingButton}
          onPress={() => {
            Alert.alert(
              "Salvar Treino",
              `Deseja salvar o treino do dia ${selectedDate}?`,
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Salvar",
                  onPress: () => {
                    Alert.alert("Sucesso", "Treino do dia salvo com sucesso!");
                  }
                }
              ]
            );
          }}
        >
          <View style={styles.saveButtonContent}>
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Salvar Treino do Dia</Text>
          </View>
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
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7348ff3f",
    borderWidth: 1,
    borderColor: "#7448ff",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminText: {
    color: "#7448ff",
    fontSize: 12,
    fontWeight: "600",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#7448ff",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  programSection: {
    marginBottom: 15,
  },
  programHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  programTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#7448ff",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(116, 72, 255, 0.1)",
    borderWidth: 2,
    borderColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
  },
  exercisesList: {
    gap: 10,
  },
  exerciseCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    position: "relative",
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  exerciseDetails: {
    color: "#7448ff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  exerciseNotes: {
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
  removeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    borderWidth: 1,
    borderColor: "#e74c3c",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  notesSection: {
    marginBottom: 20,
    gap: 16,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  noteTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  noteIconContainer: {
    backgroundColor: "#7448ff20",
    padding: 10,
    borderRadius: 12,
    marginRight: 4,
  },
  noteInput: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 16,
    color: "#fff",
    fontSize: 15,
    borderWidth: 2,
    borderColor: "#7448ff",
    textAlignVertical: "top",
    minHeight: 90,
    lineHeight: 22,
    fontWeight: "500",
  },
  noteInputFocused: {
    borderColor: "#7448ff",
    backgroundColor: "#1a1a1a",
  },
  saveTrainingButton: {
    backgroundColor: "#7448ff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 25,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});