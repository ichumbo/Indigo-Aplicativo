
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import {
  Animated,
  Image,
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
                      backgroundColor: isActive ? '#fbbf24' : '#333',
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
          <View style={styles.videoContainer}>
            <Image
              style={styles.exerciseVideo}
              source={{
                uri: "https://img.youtube.com/vi/r4MzxtBKyNE/maxresdefault.jpg",
              }}
            />
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.lastLabel}>LAST</Text>
            <Text style={styles.lastValues}>
              3, 3, 2, 2, 1, 1 {"\n"}@ 45, 50, 54, 58, 61, 65 kg
            </Text>
          </View>
          <View style={styles.maxInfo}>
            <Text style={styles.lastLabel}>WORKING MAX</Text>
            <Text style={styles.maxValue}>65</Text>
            <Ionicons
              name="return-down-forward-outline"
              size={20}
              color="#fbbf24"
              style={{ marginTop: 5 }}
            />
          </View>
        </View>

        {/* TITLE + OBS */}
        <View style={styles.titleSection}>
          <Text style={styles.exerciseTitle}>{exercises[currentExerciseIndex].name}</Text>
          <View style={styles.obsContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#fbbf24" />
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
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="create-outline" size={18} color="#fbbf24" />
            <Text style={styles.noteLabel}>EXERCISE NOTES</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Add your notes here..."
            placeholderTextColor="#666"
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={goToPreviousExercise}>
          <Ionicons name="arrow-back-outline" size={20} color="#fbbf24" />
          <Text style={styles.footerText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.footerBtn, currentExerciseIndex >= exercises.length - 1 && styles.disabledFooterBtn]} 
          onPress={goToNextExercise}
          disabled={currentExerciseIndex >= exercises.length - 1}
        >
          <Ionicons 
            name="arrow-forward-outline" 
            size={20} 
            color={currentExerciseIndex >= exercises.length - 1 ? "#333" : "#fbbf24"} 
          />
          <Text style={[styles.footerText, currentExerciseIndex >= exercises.length - 1 && { color: "#333" }]}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030303",
  },
  header: {
    marginTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 35,
    height: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fab12f',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  placeholder: {
    width: 40,
  },


  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    gap: 40,
  },
  statsText: {
    color: "#fff",
    fontSize: 14,
  },
  highlight: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 32,
  },

  exerciseCard: {
    marginTop: 40,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1f",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#fbbf24",
  },
  videoContainer: {
    flex: 1,
    marginRight: 20,
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 5,
  },
  exerciseVideo: {
    width: "100%",
    height: 65,
    borderRadius: 5,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  lastLabel: {
    color: "#a6a2ad",
    fontSize: 12,
  },
  lastValues: {
    color: "#fbbf24",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
    fontWeight: "bold",
  },
  maxInfo: {
    alignItems: "center",
  },
  maxValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  titleSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  exerciseTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    paddingLeft: 2,
  },
  obsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1a1a1f",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#fbbf24",
  },
  exerciseObs: {
    color: "#e5e5e5",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    marginLeft: 8,
  },

  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 5,
  },
  setsHeaderText: {
    color: "#fbbf24",
    fontSize: 13,
    width: 30,
    textAlign: "center",
    marginRight: 10,
  },
  repsHeaderText: {
    color: "#fbbf24",
    fontSize: 13,
    width: 125,
    textAlign: "center",
    marginHorizontal: 6,
  },
  kgHeaderText: {
    color: "#fbbf24",
    fontSize: 13,
    width: 130,
    textAlign: "center",
    marginHorizontal: 6,
  },
  checkboxHeaderSpace: {
    width: 22,
    marginLeft: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
  },
  setNumber: {
    color: "#fff",
    width: 25,
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 20,
    marginRight: 10,
  },
  input: {
    backgroundColor: "#1a1a1f",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 6,
    width: 130,
    height: 40,
    textAlign: "center",
    fontSize: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#fbbf24",
    borderRadius: 4,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#fbbf24",
  },

  setControls: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 10,
    gap: 15,
  },
  minusButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#666",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  plusButton: {
    backgroundColor: "#fbbf24",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  setControlText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.3,
  },
  disabledFooterBtn: {
    opacity: 0.3,
  },

  noteContainer: {
    marginTop: 25,
    marginBottom: 20,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  noteLabel: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
  },
  noteInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#333",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderTopWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  footerBtn: {
    flexDirection: "column",
    alignItems: "center",
  },
  footerText: {
    color: "#fff",
    fontSize: 16,
    marginHorizontal: 5,
  },

});
