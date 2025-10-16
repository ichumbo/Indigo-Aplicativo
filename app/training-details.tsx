import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const [checkedSets, setCheckedSets] = useState<{[key: number]: boolean}>({});
  const [numberOfSets, setNumberOfSets] = useState(3);
  const [setData, setSetData] = useState<{[key: number]: {reps: string, kg: string}}>({});
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  
  const exercises = [
    { name: "Deadlift", sets: "3 sets x 5 reps" },
    { name: "Back Squat", sets: "4 sets x 6 reps" },
    { name: "Double Under Crossover", sets: "3 rounds x 30 reps" },
    { name: "Hip Flexor Stretch", sets: "2 sets x 30s cada lado" }
  ];
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const animatedValues = useRef(exercises.map(() => new Animated.Value(0))).current;
  
  useEffect(() => {
    animatedValues.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === currentExerciseIndex ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [currentExerciseIndex]);

  const toggleCheck = (setNumber: number) => {
    setCheckedSets(prev => ({
      ...prev,
      [setNumber]: !prev[setNumber]
    }));
  };

  const updateSetData = (setNumber: number, field: 'reps' | 'kg', value: string) => {
    setSetData(prev => ({
      ...prev,
      [setNumber]: {
        ...prev[setNumber],
        [field]: value
      }
    }));
  };

  const calculateTotals = () => {
    let totalReps = 0;
    let totalKg = 0;
    
    for (let i = 1; i <= numberOfSets; i++) {
      if (checkedSets[i]) {
        const data = setData[i];
        if (data) {
          const reps = parseInt(data.reps) || 0;
          const kg = parseFloat(data.kg) || 0;
          totalReps += reps;
          totalKg += kg;
        }
      }
    }
    
    return { totalReps, totalKg };
  };

  const { totalReps, totalKg } = calculateTotals();

  const addSet = () => {
    setNumberOfSets(prev => prev + 1);
  };

  const removeSet = () => {
    if (numberOfSets > 1) {
      setCheckedSets(prev => {
        const newChecked = { ...prev };
        delete newChecked[numberOfSets];
        return newChecked;
      });
      setNumberOfSets(prev => prev - 1);
    }
  };

  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setCheckedSets({});
      setNumberOfSets(3);
      setSetData({});
    } else {
      router.push('/training');
    }
  };

  const goToNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCheckedSets({});
      setNumberOfSets(3);
      setSetData({});
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <TouchableOpacity>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* NAVIGATION */}
        <View style={styles.navigation}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/training')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.progressDots}>
            {exercises.map((_, i) => {
              const isActive = i === currentExerciseIndex;
              const animatedWidth = animatedValues[i].interpolate({
                inputRange: [0, 1],
                outputRange: [8, 24],
              });
              const animatedOpacity = animatedValues[i].interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              });
              
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: animatedWidth,
                      backgroundColor: isActive ? '#7448ff' : '#333',
                      opacity: animatedOpacity,
                      transform: [{
                        scale: animatedValues[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.1],
                        })
                      }]
                    }
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* REPS / KG INFO */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            <Text style={styles.highlight}>{totalReps}</Text> REPS
          </Text>
          <Text style={styles.statsText}>
            <Text style={styles.highlight}>{totalKg}</Text> KG
          </Text>
        </View>

        {/* EXERCISE CARD */}
        <View style={styles.exerciseCard}>
          <TouchableOpacity 
            style={styles.videoContainer}
            onPress={() => Linking.openURL('https://www.youtube.com/watch?v=r4MzxtBKyNE')}
          >
            <Image
              style={styles.exerciseVideo}
              source={{
                uri: "https://img.youtube.com/vi/r4MzxtBKyNE/maxresdefault.jpg",
              }}
            />
            <View style={styles.playButton}>
              <Ionicons name="play" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* TITLE + OBS */}
        <View style={styles.titleSection}>
          <Text style={styles.exerciseTitle}>{exercises[currentExerciseIndex].name}</Text>
          <View style={styles.obsContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#7448ff" />
            <Text style={styles.exerciseObs}>
              Construa pra uma carga desafiadora, mas mantendo um bom padrão técnico.
            </Text>
          </View>
        </View>

        {/* TABELA DE SETS */}
        <View style={styles.tableHeader}>
          <Text style={styles.setsHeaderText}>Sets</Text>
          <Text style={styles.repsHeaderText}>Reps</Text>
          <Text style={styles.kgHeaderText}>Kg</Text>
          <View style={styles.checkboxHeaderSpace} />
        </View>

        {Array.from({ length: numberOfSets }, (_, i) => i + 1).map((set) => (
          <View key={set} style={styles.tableRow}>
            <Text style={styles.setNumber}>{set}</Text>
            <TextInput
              style={styles.input}
              value={setData[set]?.reps || ''}
              onChangeText={(value) => updateSetData(set, 'reps', value)}
              keyboardType="numeric"
              placeholder="Reps"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={setData[set]?.kg || ''}
              onChangeText={(value) => updateSetData(set, 'kg', value)}
              keyboardType="numeric"
              placeholder="Kg"
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              style={[styles.checkbox, checkedSets[set] && styles.checkboxChecked]}
              onPress={() => toggleCheck(set)}
            >
              {checkedSets[set] && (
                <Ionicons name="checkmark" size={16} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        ))}

        {/* SET CONTROLS */}
        <View style={styles.setControls}>
          <TouchableOpacity 
            style={[styles.minusButton, numberOfSets <= 1 && styles.disabledButton]} 
            onPress={removeSet}
            disabled={numberOfSets <= 1}
          >
            <Ionicons name="remove" size={18} color={numberOfSets <= 1 ? "#333" : "#666"} />
          </TouchableOpacity>
          <Text style={styles.setControlText}>Set</Text>
          <TouchableOpacity style={styles.plusButton} onPress={addSet}>
            <Ionicons name="add" size={18} color="#000" />
          </TouchableOpacity>
        </View>

        {/* ADD NOTE */}
        <TouchableOpacity style={styles.noteContainer} onPress={() => setShowNoteInput(!showNoteInput)}>
          <Ionicons name="create-outline" size={16} color="#7448ff" />
          <Text style={styles.noteText}>Adicionar nota</Text>
        </TouchableOpacity>

        {showNoteInput && (
          <View style={styles.noteInputContainer}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Digite sua nota..."
              placeholderTextColor="#666"
              multiline
            />
          </View>
        )}

        <View style={{ height: 100 }} />


      </ScrollView>
      
      {/* FIXED NAVIGATION BUTTONS */}
      <View style={styles.fixedNavigationButtons}>
        <TouchableOpacity 
          style={[styles.navButton, styles.prevButton]} 
          onPress={goToPreviousExercise}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.navButtonText}>Anterior</Text>
        </TouchableOpacity>
        
        {currentExerciseIndex < exercises.length - 1 ? (
          <TouchableOpacity 
            style={[styles.navButton, styles.nextButton]} 
            onPress={goToNextExercise}
          >
            <Text style={styles.navButtonText}>Próximo</Text>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.navButton, styles.finishButton]}
            onPress={() => router.push('/training')}
          >
            <Text style={styles.navButtonText}>Finalizar</Text>
            <Ionicons name="checkmark" size={20} color="#000" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#7448ff",
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  placeholder: {
    width: 40,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: "#1c1c1c",
    borderRadius: 15,
  },
  statsText: {
    color: "#ffffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  highlight: {
    color: "#ffffffff",
    fontSize: 32,
    fontWeight: "bold",
  },
  exerciseCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },
  videoContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  exerciseVideo: {
    width: "100%",
    height: 200,
    backgroundColor: "#333",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(116, 72, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  lastLabel: {
    color: "#7448ff",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  lastValues: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 16,
  },
  maxInfo: {
    alignItems: "flex-end",
  },
  maxValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  titleSection: {
    marginBottom: 20,
  },
  exerciseTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  obsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#7348ff3f",
    padding: 12,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#7448ff",
  },
  exerciseObs: {
    color: "#7448ff",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1c1c1c",
    borderRadius: 8,
    marginBottom: 8,
  },
  setsHeaderText: {
    color: "#7448ff",
    fontSize: 14,
    fontWeight: "bold",
    width: 40,
  },
  repsHeaderText: {
    color: "#7448ff",
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  kgHeaderText: {
    color: "#7448ff",
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  checkboxHeaderSpace: {
    width: 40,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1c1c1c",
    borderRadius: 8,
    marginBottom: 8,
  },
  setNumber: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    width: 40,
  },
  input: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  checkboxChecked: {
    backgroundColor: "#7448ff",
  },
  setControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginVertical: 20,
  },
  minusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  setControlText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1c1c1c",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#7448ff",
    borderStyle: "dashed",
  },
  noteText: {
    color: "#7448ff",
    fontSize: 14,
    fontWeight: "600",
  },
  fixedNavigationButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#0f0f0fff",
    borderTopWidth: 1,
    borderTopColor: "#1c1c1c",
  },
  noteInputContainer: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  noteInput: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  prevButton: {
    backgroundColor: "#1c1c1c",
  },
  nextButton: {
    backgroundColor: "#7448ff",
  },
  finishButton: {
    backgroundColor: "#7448ff",
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});