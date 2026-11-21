import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AerobicProtocolRecord,
  AerobicDayPrescription,
  AerobicExecutionRecord,
  recordAerobicExecution,
} from "@/services/aerobic-protocol-store";

interface AerobicExecutionRunnerProps {
  visible: boolean;
  protocol: AerobicProtocolRecord;
  dayPrescription: AerobicDayPrescription;
  studentId: string;
  brandColor?: string;
  onClose: () => void;
  onExecutionCompleted?: (execution: AerobicExecutionRecord) => void;
}

type ExecutionStage = {
  type: "warmup" | "work" | "rest" | "continuous" | "cooldown";
  title: string;
  durationSeconds: number;
  targetSpeedKmh?: number;
  targetHrRange?: string;
  repNumber?: number;
  totalReps?: number;
  notes?: string;
};

export function AerobicExecutionRunner({
  visible,
  protocol,
  dayPrescription,
  studentId,
  brandColor = "#D90000",
  onClose,
  onExecutionCompleted,
}: AerobicExecutionRunnerProps) {
  // Constrói a sequência linear de estágios de execução
  const stages: ExecutionStage[] = [];

  // 1. Aquecimento
  if (dayPrescription.warmupMinutes > 0) {
    stages.push({
      type: "warmup",
      title: "Aquecimento",
      durationSeconds: dayPrescription.warmupMinutes * 60,
      notes: dayPrescription.warmupText,
      targetSpeedKmh: 5.0,
    });
  }

  // 2. Blocos
  for (const block of dayPrescription.blocks) {
    if (block.blockType === "continuous") {
      stages.push({
        type: "continuous",
        title: block.name || "Bloco Contínuo",
        durationSeconds: block.workDurationSeconds || block.durationSeconds || 600,
        targetSpeedKmh: block.workSpeedKmh,
        targetHrRange:
          block.workHrBpmMin && block.workHrBpmMax
            ? `${block.workHrBpmMin}-${block.workHrBpmMax} bpm`
            : undefined,
        notes: block.notes,
      });
    } else if (block.blockType === "interblock_rest") {
      stages.push({
        type: "rest",
        title: block.name || "Descanso Interbloco",
        durationSeconds: block.restDurationSeconds || block.durationSeconds || 120,
        notes: block.notes,
      });
    } else if (block.blockType === "interval") {
      const reps = Math.max(1, block.reps || 1);
      for (let r = 1; r <= reps; r++) {
        // Tiro
        stages.push({
          type: "work",
          title: `${block.name} (Tiro ${r}/${reps})`,
          durationSeconds: block.workDurationSeconds || 60,
          targetSpeedKmh: block.workSpeedKmh,
          targetHrRange:
            block.workHrBpmMin && block.workHrBpmMax
              ? `${block.workHrBpmMin}-${block.workHrBpmMax} bpm`
              : undefined,
          repNumber: r,
          totalReps: reps,
          notes: block.notes,
        });

        // Recuperação
        if (block.includeRestAfterLastRep !== false || r < reps) {
          stages.push({
            type: "rest",
            title: `Recuperação Ativa (${r}/${reps})`,
            durationSeconds: block.restDurationSeconds || 60,
            targetSpeedKmh: block.restSpeedKmh,
            targetHrRange:
              block.restHrBpmMin && block.restHrBpmMax
                ? `${block.restHrBpmMin}-${block.restHrBpmMax} bpm`
                : undefined,
            repNumber: r,
            totalReps: reps,
          });
        }
      }
    }
  }

  // 3. Volta à calma
  if (dayPrescription.cooldownMinutes > 0) {
    stages.push({
      type: "cooldown",
      title: "Volta à Calma",
      durationSeconds: dayPrescription.cooldownMinutes * 60,
      notes: dayPrescription.cooldownText,
      targetSpeedKmh: 4.0,
    });
  }

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(stages[0]?.durationSeconds || 300);
  const [isActive, setIsActive] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [speedsLogged, setSpeedsLogged] = useState<number[]>([]);

  // Modal de registro pós-treino
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [rpe, setRpe] = useState(6);
  const [avgBpm, setAvgBpm] = useState("");
  const [interruptionReason, setInterruptionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isCompletedFull, setIsCompletedFull] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && stages.length > 0) {
      setCurrentStageIdx(0);
      setSecondsRemaining(stages[0].durationSeconds);
      setIsActive(false);
      setTotalElapsedTime(0);
      setSpeedsLogged([]);
    }
  }, [visible]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTotalElapsedTime((prev) => prev + 1);
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Próximo estágio
            handleNextStage();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, currentStageIdx]);

  const handleNextStage = () => {
    // Alerta tátil ao trocar de estágio
    try {
      Vibration.vibrate([0, 400, 200, 400]);
    } catch {
      // Ignora erro se não suportado
    }

    const currentStage = stages[currentStageIdx];
    if (currentStage?.targetSpeedKmh) {
      setSpeedsLogged((prev) => [...prev, currentStage.targetSpeedKmh!]);
    }

    if (currentStageIdx < stages.length - 1) {
      const nextIdx = currentStageIdx + 1;
      setCurrentStageIdx(nextIdx);
      setSecondsRemaining(stages[nextIdx].durationSeconds);
    } else {
      // Fim do treino
      setIsActive(false);
      setIsCompletedFull(true);
      setLogModalVisible(true);
    }
  };

  const handleStopEarly = () => {
    setIsActive(false);
    Alert.alert(
      "Encerrar Treino?",
      "Deseja finalizar o treino aeróbico agora e registrar os dados?",
      [
        { text: "Continuar", style: "cancel", onPress: () => setIsActive(true) },
        {
          text: "Finalizar",
          style: "destructive",
          onPress: () => {
            setIsCompletedFull(false);
            setLogModalVisible(true);
          },
        },
      ]
    );
  };

  const handleSaveExecution = async () => {
    const elapsedMinutes = Math.max(1, Math.round(totalElapsedTime / 60));
    const execution: AerobicExecutionRecord = {
      id: `exec-${Date.now()}`,
      protocolId: protocol.id,
      studentId,
      trainerId: protocol.trainerId,
      dayOfWeek: dayPrescription.dayOfWeek,
      executedAt: new Date().toISOString(),
      durationMinutes: elapsedMinutes,
      actualSpeeds: speedsLogged.length > 0 ? speedsLogged : [stages[currentStageIdx]?.targetSpeedKmh || 8.0],
      actualBpmAvg: avgBpm ? parseInt(avgBpm, 10) : undefined,
      rpeScore: rpe,
      completionStatus: isCompletedFull ? "completed" : "partial",
      interruptionReason: !isCompletedFull ? interruptionReason || "Interrompido antes do tempo total" : undefined,
      notes: notes.trim() || undefined,
    };

    await recordAerobicExecution(execution);
    setLogModalVisible(false);
    Alert.alert("Parabéns!", "Seu treino aeróbico foi registrado com sucesso!");
    if (onExecutionCompleted) onExecutionCompleted(execution);
    onClose();
  };

  const currentStage = stages[currentStageIdx] || stages[0];
  const nextStage = stages[currentStageIdx + 1];

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const totalWorkoutSeconds = stages.reduce((acc, s) => acc + s.durationSeconds, 0);
  const progressPct = totalWorkoutSeconds > 0 ? Math.min(100, Math.round((totalElapsedTime / totalWorkoutSeconds) * 100)) : 0;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleStopEarly} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {dayPrescription.sessionTitle}
            </Text>
            <Text style={styles.headerSub}>
              Etapa {currentStageIdx + 1} de {stages.length}
            </Text>
          </View>
          <View style={styles.headerRightBadge}>
            <Text style={styles.headerRightBadgeText}>{progressPct}%</Text>
          </View>
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPct}%`, backgroundColor: brandColor },
            ]}
          />
        </View>

        {/* DISPLAY PRINCIPAL */}
        <View style={styles.timerDisplayArea}>
          <Text
            style={[
              styles.stageTypeTag,
              currentStage?.type === "work" && { color: brandColor, borderColor: brandColor },
              currentStage?.type === "rest" && { color: "#10B981", borderColor: "#10B981" },
            ]}
          >
            {currentStage?.type === "work"
              ? "TIRO / ESTÍMULO"
              : currentStage?.type === "rest"
              ? "RECUPERAÇÃO ATIVA"
              : currentStage?.type === "warmup"
              ? "AQUECIMENTO"
              : currentStage?.type === "cooldown"
              ? "VOLTA À CALMA"
              : "CONTÍNUO"}
          </Text>

          <Text style={styles.stageTitleText}>{currentStage?.title}</Text>

          {/* CRONÔMETRO GRANDE */}
          <View style={styles.timerCircle}>
            <Text style={styles.timerDigits}>{formatTime(secondsRemaining)}</Text>
            <Text style={styles.timerSubLabel}>tempo restante nesta etapa</Text>
          </View>

          {/* REFERÊNCIA DE INTENSIDADE */}
          <View style={styles.targetMetricsBox}>
            {currentStage?.targetSpeedKmh ? (
              <View style={styles.metricCard}>
                <Ionicons name="speedometer-outline" size={20} color={brandColor} />
                <Text style={styles.metricVal}>{currentStage.targetSpeedKmh} km/h</Text>
                <Text style={styles.metricLabel}>Velocidade Alvo</Text>
              </View>
            ) : null}

            {currentStage?.targetHrRange ? (
              <View style={styles.metricCard}>
                <Ionicons name="heart-outline" size={20} color="#EF4444" />
                <Text style={styles.metricVal}>{currentStage.targetHrRange}</Text>
                <Text style={styles.metricLabel}>Zona Cardíaca Alvo</Text>
              </View>
            ) : null}
          </View>

          {currentStage?.notes ? (
            <View style={styles.notesBox}>
              <Ionicons name="information-circle-outline" size={16} color="#AAA" />
              <Text style={styles.notesText}>{currentStage.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* PRÓXIMA ETAPA PREVIEW */}
        {nextStage && (
          <View style={styles.nextStageCard}>
            <Text style={styles.nextStageLabel}>A SEGUIR:</Text>
            <Text style={styles.nextStageTitle} numberOfLines={1}>
              {nextStage.title} ({formatTime(nextStage.durationSeconds)} @{" "}
              {nextStage.targetSpeedKmh ? `${nextStage.targetSpeedKmh} km/h` : "Ritmo prescrito"})
            </Text>
          </View>
        )}

        {/* BOTÕES DE CONTROLE INFERIORES */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.controlSecondaryBtn}
            onPress={handleNextStage}
          >
            <Ionicons name="play-skip-forward-outline" size={24} color="#FFF" />
            <Text style={styles.controlSecondaryText}>Pular Etapa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlPlayBtn,
              { backgroundColor: isActive ? "#EF4444" : brandColor },
            ]}
            onPress={() => setIsActive(!isActive)}
          >
            <Ionicons name={isActive ? "pause" : "play"} size={36} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlSecondaryBtn}
            onPress={handleStopEarly}
          >
            <Ionicons name="stop-outline" size={24} color="#FFF" />
            <Text style={styles.controlSecondaryText}>Finalizar</Text>
          </TouchableOpacity>
        </View>

        {/* MODAL DE REGISTRO PÓS-TREINO */}
        <Modal visible={logModalVisible} animationType="slide" transparent>
          <View style={styles.logModalOverlay}>
            <View style={styles.logModalContent}>
              <View style={styles.logModalHeader}>
                <Ionicons name="checkmark-circle" size={32} color={brandColor} />
                <Text style={styles.logModalTitle}>
                  {isCompletedFull ? "Treino Concluído!" : "Treino Interrompido"}
                </Text>
                <Text style={styles.logModalSub}>
                  Duração Realizada: {Math.max(1, Math.round(totalElapsedTime / 60))} min
                </Text>
              </View>

              {/* PERCEPÇÃO DE ESFORÇO (BORG 1-10) */}
              <Text style={styles.logSectionTitle}>Percepção Subjetiva de Esforço (Borg 1-10):</Text>
              <View style={styles.rpeGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.rpePill,
                      rpe === val && { backgroundColor: brandColor, borderColor: brandColor },
                    ]}
                    onPress={() => setRpe(val)}
                  >
                    <Text style={[styles.rpePillText, rpe === val && styles.rpePillTextActive]}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.rpeDescription}>
                {rpe <= 3
                  ? "Muito leve / confortável"
                  : rpe <= 5
                  ? "Moderado / respiração rítmica"
                  : rpe <= 7
                  ? "Intenso / esforço sustentável"
                  : rpe <= 9
                  ? "Muito intenso / respiração ofegante"
                  : "Exaustivo / esforço máximo"}
              </Text>

              {/* FREQUÊNCIA CARDÍACA MÉDIA (OPCIONAL) */}
              <Text style={styles.logLabel}>Frequência Cardíaca Média Observada (bpm):</Text>
              <TextInput
                style={styles.logInput}
                keyboardType="numeric"
                value={avgBpm}
                onChangeText={setAvgBpm}
                placeholder="Ex: 154 (opcional)"
                placeholderTextColor="#666"
              />

              {!isCompletedFull && (
                <>
                  <Text style={styles.logLabel}>Motivo da Interrupção Antecipada:</Text>
                  <TextInput
                    style={styles.logInput}
                    value={interruptionReason}
                    onChangeText={setInterruptionReason}
                    placeholder="Ex: Dor articular, fadiga excessiva, falta de tempo..."
                    placeholderTextColor="#666"
                  />
                </>
              )}

              <Text style={styles.logLabel}>Observações para seu Personal:</Text>
              <TextInput
                style={[styles.logInput, styles.logTextArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Como você se sentiu durante os tiros e recuperações?"
                placeholderTextColor="#666"
                multiline
              />

              <TouchableOpacity
                style={[styles.saveExecutionBtn, { backgroundColor: brandColor }]}
                onPress={handleSaveExecution}
              >
                <Text style={styles.saveExecutionBtnText}>Salvar Registro de Treino</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: "#141414",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
  headerSub: {
    color: "#888",
    fontSize: 11.5,
  },
  headerRightBadge: {
    backgroundColor: "#202020",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  headerRightBadgeText: {
    color: "#DDD",
    fontSize: 12,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#222",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
  },
  timerDisplayArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 14,
  },
  stageTypeTag: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    color: "#FFF",
    borderColor: "#444",
  },
  stageTitleText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#141414",
    borderWidth: 3,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  timerDigits: {
    color: "#FFF",
    fontSize: 54,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  timerSubLabel: {
    color: "#777",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  targetMetricsBox: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#161616",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262626",
    gap: 4,
  },
  metricVal: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
  },
  metricLabel: {
    color: "#888",
    fontSize: 10.5,
    fontWeight: "700",
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#181818",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#282828",
  },
  notesText: {
    color: "#AAA",
    fontSize: 12,
    flex: 1,
  },
  nextStageCard: {
    marginHorizontal: 16,
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 10,
  },
  nextStageLabel: {
    color: "#777",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  nextStageTitle: {
    color: "#DDD",
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 2,
  },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#141414",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  controlSecondaryBtn: {
    alignItems: "center",
    gap: 4,
    minWidth: 80,
  },
  controlSecondaryText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  controlPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  logModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  logModalContent: {
    backgroundColor: "#181818",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  logModalHeader: {
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  logModalTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  logModalSub: {
    color: "#AAA",
    fontSize: 13,
  },
  logSectionTitle: {
    color: "#DDD",
    fontSize: 12.5,
    fontWeight: "800",
  },
  rpeGrid: {
    flexDirection: "row",
    gap: 6,
  },
  rpePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#242424",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  rpePillText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
  },
  rpePillTextActive: {
    color: "#FFF",
    fontWeight: "900",
  },
  rpeDescription: {
    color: "#888",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
  },
  logLabel: {
    color: "#CCC",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  logInput: {
    backgroundColor: "#222",
    color: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  logTextArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  saveExecutionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveExecutionBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
