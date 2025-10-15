import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { CircularProgress } from 'react-native-circular-progress';

export default function TimerScreen() {
  const [timerTime, setTimerTime] = useState(180);
  const [initialTime, setInitialTime] = useState(180);
  const [isRunning, setIsRunning] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState('Rest Timer');
  const [isStopwatch, setIsStopwatch] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [tabataRound, setTabataRound] = useState(1);
  const [tabataPhase, setTabataPhase] = useState('work');
  const [emomRound, setEmomRound] = useState(1);
  
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      if (isStopwatch) {
        timerInterval.current = setInterval(() => {
          setStopwatchTime(prev => prev + 1);
        }, 1000);
      } else if (selectedWorkout === 'Tabata') {
        timerInterval.current = setInterval(() => {
          setTimerTime(prev => {
            if (prev <= 1) {
              if (tabataPhase === 'work') {
                setTabataPhase('rest');
                return 10;
              } else {
                if (tabataRound < 8) {
                  setTabataRound(r => r + 1);
                  setTabataPhase('work');
                  return 20;
                } else {
                  setIsRunning(false);
                  Vibration.vibrate([500, 200, 500]);
                  return 0;
                }
              }
            }
            return prev - 1;
          });
        }, 1000);
      } else if (selectedWorkout === 'EMOM') {
        timerInterval.current = setInterval(() => {
          setTimerTime(prev => {
            if (prev <= 1) {
              if (emomRound < 10) {
                setEmomRound(r => r + 1);
                Vibration.vibrate([200]);
                return 60;
              } else {
                setIsRunning(false);
                Vibration.vibrate([500, 200, 500]);
                return 0;
              }
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        timerInterval.current = setInterval(() => {
          setTimerTime(prev => {
            if (prev <= 1) {
              setIsRunning(false);
              Vibration.vibrate([500, 200, 500]);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isRunning, timerTime, isStopwatch, selectedWorkout, tabataPhase, tabataRound, emomRound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (isStopwatch) {
      setStopwatchTime(0);
    } else {
      setTimerTime(initialTime);
      if (selectedWorkout === 'Tabata') {
        setTabataRound(1);
        setTabataPhase('work');
        setTimerTime(20);
      } else if (selectedWorkout === 'EMOM') {
        setEmomRound(1);
        setTimerTime(60);
      }
    }
  };

  const setCustomTime = () => {
    const mins = parseInt(customMinutes) || 0;
    const secs = parseInt(customSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    if (totalSeconds > 0) {
      setIsStopwatch(false);
      setTimerTime(totalSeconds);
      setInitialTime(totalSeconds);
      setShowCustomModal(false);
      setCustomMinutes('');
      setCustomSeconds('');
    }
  };

  const getProgress = () => {
    if (isStopwatch) return 0;
    if (selectedWorkout === 'Tabata') {
      const totalTime = 240;
      const elapsed = (tabataRound - 1) * 30 + (tabataPhase === 'work' ? 20 - timerTime : 30 - timerTime);
      return (elapsed / totalTime) * 100;
    }
    if (selectedWorkout === 'EMOM') {
      const totalTime = 600;
      const elapsed = (emomRound - 1) * 60 + (60 - timerTime);
      return (elapsed / totalTime) * 100;
    }
    return initialTime > 0 ? ((initialTime - timerTime) / initialTime) * 100 : 0;
  };

  const workoutPresets = [
    { label: 'Rest Timer', time: 180, icon: 'bed-outline', color: '#4CAF50', description: 'Descanso entre séries' },
    { label: 'Stopwatch', time: 0, icon: 'stopwatch-outline', color: '#2196F3', description: 'Cronômetro livre' },
    { label: 'AMRAP', time: 1200, icon: 'infinite-outline', color: '#FF5722', description: 'As Many Rounds As Possible' },
    { label: 'For Time', time: 0, icon: 'timer-outline', color: '#E91E63', description: 'Complete o mais rápido possível' },
    { label: 'Tabata', time: 240, icon: 'flash-outline', color: '#FF9800', description: '20s on / 10s off x 8 rounds' },
    { label: 'EMOM', time: 600, icon: 'repeat-outline', color: '#9C27B0', description: 'Every Minute On the Minute' },
    { label: 'Custom Interval', time: 0, icon: 'settings-outline', color: '#fab12f', description: 'Intervalos personalizados' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timer de Treino</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.circularTimerContainer}>
          <View style={styles.timerOuterRing}>
            <View style={styles.timerInnerShadow}>
              <CircularProgress
                size={280}
                width={12}
                fill={getProgress()}
                tintColor={timerTime <= 10 ? '#FF5722' : isRunning ? '#fab12f' : '#4CAF50'}
                backgroundColor="#1a1a1a"
                rotation={-90}
                lineCap="round"
              >
                {() => (
                  <View style={styles.timerCenter}>
                    <View style={styles.timeDisplay}>
                      <Text style={[styles.timeText, { color: timerTime <= 10 ? '#FF5722' : '#fab12f' }]}>
                        {isStopwatch ? formatTime(stopwatchTime) : formatTime(timerTime)}
                      </Text>
                      <View style={styles.timeDots}>
                        <View style={[styles.dot, { opacity: isRunning ? 1 : 0.3 }]} />
                        <View style={[styles.dot, { opacity: isRunning ? 0.6 : 0.2 }]} />
                        <View style={[styles.dot, { opacity: isRunning ? 0.3 : 0.1 }]} />
                      </View>
                    </View>
                    <Text style={styles.timeLabel}>
                      {selectedWorkout === 'Tabata' && isRunning ? 
                        `Round ${tabataRound}/8 - ${tabataPhase === 'work' ? 'WORK' : 'REST'}` :
                      selectedWorkout === 'EMOM' && isRunning ? 
                        `Round ${emomRound}/10` :
                      isRunning ? 'Em andamento' : 
                      (timerTime === 0 && stopwatchTime === 0) ? 'Finalizado!' : 'Pronto'
                      }
                    </Text>
                  </View>
                )}
              </CircularProgress>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.workoutSelector}
          onPress={() => setShowWorkoutModal(true)}
        >
          <View style={styles.workoutSelectorContent}>
            <Text style={styles.workoutSelectorLabel}>Tipo de Treino</Text>
            <View style={styles.selectedWorkout}>
              <Text style={styles.selectedWorkoutText}>{selectedWorkout}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color="#fab12f" />
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.resetButton]}
            onPress={resetTimer}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.primaryButton]}
            onPress={() => setIsRunning(!isRunning)}
            disabled={!isStopwatch && timerTime === 0 && stopwatchTime === 0}
          >
            <Ionicons 
              name={isRunning ? "pause" : "play"} 
              size={28} 
              color="#000" 
            />
            <Text style={[styles.controlButtonText, styles.primaryButtonText]}>
              {isRunning ? 'Pausar' : 'Iniciar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showWorkoutModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.workoutModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolher Tipo de Treino</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowWorkoutModal(false)}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {workoutPresets.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.workoutOption,
                    selectedWorkout === preset.label && styles.selectedWorkoutOption
                  ]}
                  onPress={() => {
                    if (preset.label === 'Custom Interval') {
                      setShowWorkoutModal(false);
                      setShowCustomModal(true);
                    } else if (preset.label === 'Stopwatch' || preset.label === 'For Time') {
                      setIsStopwatch(true);
                      setStopwatchTime(0);
                      setSelectedWorkout(preset.label);
                      setIsRunning(false);
                      setShowWorkoutModal(false);
                    } else {
                      setIsStopwatch(false);
                      setSelectedWorkout(preset.label);
                      setIsRunning(false);
                      if (preset.label === 'Tabata') {
                        setTimerTime(20);
                        setInitialTime(240);
                        setTabataRound(1);
                        setTabataPhase('work');
                      } else if (preset.label === 'EMOM') {
                        setTimerTime(60);
                        setInitialTime(600);
                        setEmomRound(1);
                      } else {
                        setTimerTime(preset.time);
                        setInitialTime(preset.time);
                      }
                      setShowWorkoutModal(false);
                    }
                  }}
                >
                  <View style={styles.workoutOptionLeft}>
                    <View style={[styles.workoutIcon, { backgroundColor: preset.color + '20' }]}>
                      <Ionicons name={preset.icon as any} size={24} color={preset.color} />
                    </View>
                    <View style={styles.workoutOptionInfo}>
                      <Text style={styles.workoutOptionLabel}>
                        {preset.label}
                      </Text>
                      <Text style={styles.workoutOptionDescription}>
                        {preset.description}
                      </Text>
                      {preset.time > 0 && (
                        <Text style={styles.workoutOptionTime}>{formatTime(preset.time)}</Text>
                      )}
                    </View>
                  </View>
                  {selectedWorkout === preset.label && (
                    <Ionicons name="checkmark-circle" size={24} color="#fab12f" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tempo Personalizado</Text>
            
            <View style={styles.timeInputContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Minutos</Text>
                <TextInput
                  style={styles.timeInput}
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                />
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Segundos</Text>
                <TextInput
                  style={styles.timeInput}
                  value={customSeconds}
                  onChangeText={setCustomSeconds}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  setCustomTime();
                  setSelectedWorkout('Custom Interval');
                }}
              >
                <Text style={styles.confirmButtonText}>Definir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  circularTimerContainer: {
    alignItems: 'center',
    marginBottom: 45,
    marginTop: 10,
  },
  timerOuterRing: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#2a2a2a',
  },
  timerInnerShadow: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
    borderWidth: 4,
    borderColor: '#fab12f',
  },
  timerCenter: {
    alignItems: 'center',
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 52,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 3,
    textShadowColor: 'rgba(250, 177, 47, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  timeDots: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fab12f',
  },
  timeLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  workoutSelector: {
    backgroundColor: '#1c1c1c',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  workoutSelectorContent: {
    flex: 1,
  },
  workoutSelectorLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  selectedWorkout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedWorkoutText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  workoutModalContent: {
    backgroundColor: '#1c1c1c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    position: 'absolute',
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButton: {
    padding: 4,
  },
  workoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    marginBottom: 12,
  },
  selectedWorkoutOption: {
    backgroundColor: '#fab12f20',
    borderWidth: 2,
    borderColor: '#fab12f',
  },
  workoutOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutOptionInfo: {
    gap: 4,
  },
  workoutOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  workoutOptionTime: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  workoutOptionDescription: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  resetButton: {
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#3a3a3a',
  },
  primaryButton: {
    backgroundColor: '#fab12f',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  primaryButtonText: {
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1c1c1c',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  inputGroup: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    fontWeight: '600',
  },
  timeInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    width: 80,
    fontWeight: '700',
  },
  timeSeparator: {
    fontSize: 24,
    color: '#fab12f',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
  },
  confirmButton: {
    backgroundColor: '#fab12f',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#000',
    fontWeight: '700',
  },
});