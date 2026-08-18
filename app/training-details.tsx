import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useCurrentSession } from "@/hooks/use-current-session";
import { DEMO_STUDENT } from "@/services/feedback-store";
import {
  TrainingExecution,
  TrainingExecutedSetType,
  TrainingExecutedSet,
  TrainingExercisePrescription,
  TrainingSetInput,
  TrainingSession,
  formatExercisePrescription,
  formatTrainingDate,
  getActiveVersion,
  getPreviousExecutionValue,
  getStudentSessionAccess,
  getTrainingDashboard,
  getTrainingSessionById,
  interruptTrainingExecution,
  saveTrainingExecutionSets,
  startTrainingExecution,
  finishTrainingExecution,
} from "@/services/training-plan-store";
import { useResponsiveLayout } from "@/constants/responsive";

type SetDraft = {
  reps: string;
  load: string;
  duration: string;
  distance: string;
  effort: string;
  setType: TrainingExecutedSetType;
  completed: boolean;
  pain: boolean;
  painRegion: string;
  painLevel: string;
  painMoment: string;
  painInterrupted: boolean;
  note: string;
};

type DraftByExercise = Record<string, Record<number, SetDraft>>;

const DEFAULT_SESSION_ID = "session-elite-a";
const EXERCISE_THUMBNAILS: Record<string, string> = {
  deadlift: "https://img.youtube.com/vi/r4MzxtBKyNE/hqdefault.jpg",
  "back-squat": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg",
  "double-under": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Fast_Skipping/0.jpg",
  "hip-flexor": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Hip_Flexor/0.jpg",
  "pull-down": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg",
  "machine-row": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
  "leg-press": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
  "shoulder-cars": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Shoulder_Circles/0.jpg",
};

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId ?? DEFAULT_SESSION_ID;
  const { session: authSession, loadingSession } = useCurrentSession();
  const layout = useResponsiveLayout();

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [execution, setExecution] = useState<TrainingExecution | null>(null);
  const [previousExecutions, setPreviousExecutions] = useState<TrainingExecution[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [drafts, setDrafts] = useState<DraftByExercise>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [setDetailsExpanded, setSetDetailsExpanded] = useState(false);

  const loadSession = useCallback(async () => {
    if (!authSession) return;
    setLoading(true);
    setError("");
    try {
      const isStudent = authSession.user.role === "STUDENT";
      const studentId = isStudent ? authSession.user.id : DEMO_STUDENT.id;
      const legacyRole = isStudent ? "student" : "trainer";
      const [nextSession, dashboard] = await Promise.all([
        getTrainingSessionById(sessionId, authSession.user.id, legacyRole),
        getTrainingDashboard(studentId, authSession.user.id, legacyRole, isStudent ? "student" : "trainer"),
      ]);

      if (!isStudent) {
        setSession(nextSession);
        setPreviousExecutions(dashboard.executions);
        setError("Treinador pode revisar a prescricao, mas nao registrar execucao real pelo aluno.");
        return;
      }

      const access = getStudentSessionAccess(nextSession);
      if (!access.canStart) {
        setSession(nextSession);
        setPreviousExecutions(dashboard.executions);
        setError(access.reason);
        return;
      }

      const nextExecution = await startTrainingExecution(nextSession.id, studentId);
      setSession(nextSession);
      setExecution(nextExecution);
      setPreviousExecutions(dashboard.executions.filter((item) => item.id !== nextExecution.id));
      setDrafts(buildInitialDrafts(nextExecution.snapshot.exercises, nextExecution.sets));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nao foi possivel abrir a sessao.");
    } finally {
      setLoading(false);
    }
  }, [authSession, sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const exercises = useMemo(
    () => execution?.snapshot.exercises ?? (session ? getActiveVersion(session).exercises : []),
    [execution, session]
  );
  const currentExercise = exercises[currentExerciseIndex];
  const totals = useMemo(() => calculateTotals(drafts), [drafts]);
  const sessionProgress = useMemo(() => {
    const totalSets = exercises.reduce((total, exercise) => total + exercise.plannedSets, 0);
    const completed = Object.values(drafts).reduce(
      (total, bySet) => total + Object.values(bySet).filter((draft) => draft.completed).length,
      0
    );
    return {
      completed,
      total: totalSets,
      pending: Math.max(totalSets - completed, 0),
      percent: totalSets ? Math.round((completed / totalSets) * 100) : 0,
    };
  }, [drafts, exercises]);
  const progress = sessionProgress.percent;

  const updateSetDraft = (exerciseId: string, setIndex: number, patch: Partial<SetDraft>) => {
    setDrafts((current) => ({
      ...current,
      [exerciseId]: {
        ...(current[exerciseId] ?? {}),
        [setIndex]: {
          ...getSetDraft(current, exerciseId, setIndex),
          ...patch,
        },
      },
    }));
  };

  const repeatLastValue = (exercise: TrainingExercisePrescription, setIndex: number) => {
    const previous = getPreviousExecutionValue(previousExecutions, exercise.id);
    if (!previous) {
      Alert.alert("Sem registro anterior", "Ainda nao existe carga executada anterior para este exercicio.");
      return;
    }

    updateSetDraft(exercise.id, setIndex, {
      load: previous.load !== undefined ? String(previous.load) : "",
      reps: previous.reps !== undefined ? String(previous.reps) : "",
      effort: previous.effort !== undefined ? String(previous.effort) : "",
    });
  };

  const persistProgress = async () => {
    if (!execution || authSession?.user.role !== "STUDENT") return;

    setSaving(true);
    try {
      const sets = buildSetInputs(exercises, drafts);
      const updated = await saveTrainingExecutionSets(execution.id, sets, authSession.user.id);
      setExecution(updated);
      showSaved("Progresso salvo.");
    } catch (saveError) {
      Alert.alert("Falha ao salvar", saveError instanceof Error ? saveError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const confirmFinish = () => {
    if (!execution || authSession?.user.role !== "STUDENT") return;

    Alert.alert(
      "Finalizar treino",
      "Concluir esta execucao e enviar para o resumo final? As series realizadas ficarao vinculadas a esta versao da sessao.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Finalizar",
          onPress: () => {
            void finishExecution();
          },
        },
      ]
    );
  };

  const finishExecution = async () => {
    if (!execution || authSession?.user.role !== "STUDENT") return;

    setSaving(true);
    try {
      const sets = buildSetInputs(exercises, drafts);
      const updated = await finishTrainingExecution(execution.id, sets, authSession.user.id);
      setExecution(updated);
      router.push({
        pathname: "/training-feedback" as never,
        params: { executionId: updated.id },
      });
    } catch (finishError) {
      Alert.alert("Nao foi possivel finalizar", finishError instanceof Error ? finishError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const interruptExecution = async () => {
    if (!execution || authSession?.user.role !== "STUDENT") return;

    Alert.alert("Interromper sessao", "A execucao sera preservada como interrompida.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Interromper",
        style: "destructive",
        onPress: () => {
          void interruptNow();
        },
      },
    ]);
  };

  const interruptNow = async () => {
    if (!execution || authSession?.user.role !== "STUDENT") return;

    setSaving(true);
    try {
      await interruptTrainingExecution(execution.id, "Aluno interrompeu manualmente.", authSession.user.id);
      router.replace("/training");
    } catch {
      Alert.alert("Falha", "Nao foi possivel interromper agora.");
    } finally {
      setSaving(false);
    }
  };

  const showSaved = (message: string) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(""), 2200);
  };

  const goBackToTraining = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/training");
  };

  const goPrevious = () => {
    if (currentExerciseIndex === 0) {
      goBackToTraining();
      return;
    }
    setCurrentExerciseIndex((value) => value - 1);
  };

  const goNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((value) => value + 1);
      return;
    }
    confirmFinish();
  };

  const currentExerciseCompletion = currentExercise ? getExerciseCompletion(drafts, currentExercise) : { completed: 0, total: 0 };
  const footerBottomPadding = Math.max(18, layout.insets.bottom + 14);
  const footerReservedHeight = 14 + 48 + footerBottomPadding + 18;

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Abrindo sessao...</Text>
      </View>
    );
  }

  if (error || !session || !currentExercise || !execution) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="lock-closed-outline" size={42} color="#D90000" />
        <Text style={styles.centerTitle}>Sessao indisponivel</Text>
        <Text style={styles.centerText}>{error || "Nao foi possivel iniciar esta sessao."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/training")}>
          <Text style={styles.primaryButtonText}>Voltar para treinos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: layout.topPadding,
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: footerReservedHeight,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={goBackToTraining}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Image source={require("@/assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity style={styles.iconButton} onPress={interruptExecution} disabled={saving}>
            <Ionicons name="pause-outline" size={22} color="#D90000" />
          </TouchableOpacity>
        </View>

        {savedMessage ? (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#D90000" />
            <Text style={styles.savedText}>{savedMessage}</Text>
          </View>
        ) : null}

        <View style={styles.sessionCard}>
          <View style={styles.sessionAccent} />
          <View style={styles.sessionHeaderRow}>
            <View style={styles.sessionIdentity}>
              <View style={styles.sessionStatusDot} />
              <Text style={styles.sessionLabel} numberOfLines={1}>
                {execution.snapshot.identifier ?? "Sessao"} • v{execution.snapshot.version}
              </Text>
            </View>
            <View style={styles.sessionCountPill}>
              <Ionicons name="barbell-outline" size={16} color="#D90000" />
              <Text style={styles.sessionCountText} numberOfLines={1}>{exercises.length} exercicios</Text>
            </View>
          </View>

          <Text style={styles.sessionTitle}>{execution.snapshot.name}</Text>

          <View style={styles.sessionMetaRow}>
            <View style={styles.sessionMetaPill}>
              <Ionicons name="calendar-outline" size={14} color="#D90000" />
              <Text style={styles.sessionMetaText}>Ate {formatTrainingDate(execution.snapshot.validUntil)}</Text>
            </View>
            <View style={styles.sessionMetaPill}>
              <Ionicons name="time-outline" size={14} color="#D90000" />
              <Text style={styles.sessionMetaText}>{execution.snapshot.estimatedDurationMinutes} min</Text>
            </View>
          </View>

          <View style={styles.progressPanel}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso</Text>
              <Text style={styles.progressValue}>
                {sessionProgress.completed}/{sessionProgress.total} series
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressHint}>
                {sessionProgress.pending ? `${sessionProgress.pending} series pendentes` : "Treino completo"}
              </Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox icon="repeat-outline" label="Reps" value={String(totals.reps)} />
          <StatBox icon="analytics-outline" label="Volume" value={`${totals.volume}kg`} />
          <StatBox
            icon={totals.pain ? "alert-circle-outline" : "shield-checkmark-outline"}
            label="Dor"
            value={totals.pain ? "Com dor" : "Sem dor"}
            danger={totals.pain}
          />
        </View>

        <ExercisePreviewRail
          exercises={exercises}
          drafts={drafts}
          currentExerciseIndex={currentExerciseIndex}
          onSelect={setCurrentExerciseIndex}
        />

        <View style={styles.exerciseCard}>
          <View style={styles.exerciseTop}>
            <View style={styles.exerciseTitleBlock}>
              <Text style={styles.exerciseStep}>
                {currentExerciseIndex + 1}/{exercises.length}
              </Text>
              <Text style={styles.exerciseTitle}>{currentExercise.name}</Text>
              <Text style={styles.exercisePrescription}>{formatExercisePrescription(currentExercise)}</Text>
            </View>
            <View style={styles.exerciseTypeBadge}>
              <Text style={styles.exerciseTypeText}>{formatExerciseType(currentExercise.type)}</Text>
            </View>
          </View>

          <ExerciseMiniVisual
            exercise={currentExercise}
            completion={currentExerciseCompletion}
            onDemoPress={
              currentExercise.videoUrl ? () => Linking.openURL(currentExercise.videoUrl as string) : undefined
            }
          />

          {!!currentExercise.observation && (
            <InfoNote icon="information-circle-outline" text={currentExercise.observation} />
          )}
          {!!currentExercise.safetyNotes && (
            <InfoNote icon="shield-checkmark-outline" text={currentExercise.safetyNotes} />
          )}
        </View>

        <View style={styles.setListHeader}>
          <View>
            <Text style={styles.setListTitle}>Series</Text>
            <Text style={styles.setListSubtitle}>Registre somente os campos relevantes para este exercicio.</Text>
          </View>
          <Text style={styles.setListCounter}>{currentExerciseCompletion.completed}/{currentExerciseCompletion.total}</Text>
        </View>

        <View style={styles.setList}>
          {Array.from({ length: currentExercise.plannedSets }, (_, index) => {
            const setIndex = index + 1;
            const draft = getSetDraft(drafts, currentExercise.id, setIndex);
            const primaryField = getPrimarySetField(currentExercise, draft);
            const showLoad = shouldShowLoadInput(currentExercise);

            return (
              <View key={setIndex} style={[styles.setCard, draft.completed && styles.setCardCompleted]}>
                <View style={styles.setCardHeader}>
                  <View style={styles.setCardIdentity}>
                    <TouchableOpacity
                      style={[styles.checkBox, draft.completed && styles.checkBoxActive]}
                      onPress={() => updateSetDraft(currentExercise.id, setIndex, { completed: !draft.completed })}
                    >
                      {draft.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.setCardTitle}>Serie {setIndex}</Text>
                      <Text style={styles.setCardStatus}>{draft.completed ? "Concluida" : "Pendente"}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.repeatButton} onPress={() => repeatLastValue(currentExercise, setIndex)}>
                    <Ionicons name="repeat-outline" size={17} color="#D90000" />
                  </TouchableOpacity>
                </View>

                <View style={styles.setFields}>
                  <SetField
                    label={primaryField.label}
                    value={primaryField.value}
                    placeholder={primaryField.placeholder}
                    onChangeText={(value) => updateSetDraft(currentExercise.id, setIndex, primaryField.patch(value))}
                  />
                  {showLoad ? (
                    <SetField
                      label={formatLoadUnitLabel(currentExercise.loadUnit)}
                      value={draft.load}
                      placeholder={currentExercise.plannedLoad !== undefined ? String(currentExercise.plannedLoad) : "-"}
                      onChangeText={(load) => updateSetDraft(currentExercise.id, setIndex, { load })}
                    />
                  ) : null}
                  <SetField
                    label="RPE"
                    value={draft.effort}
                    placeholder="0-10"
                    onChangeText={(effort) => updateSetDraft(currentExercise.id, setIndex, { effort })}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <SetDetails
          exercise={currentExercise}
          drafts={drafts}
          onChange={updateSetDraft}
          expanded={setDetailsExpanded}
          onToggle={() => setSetDetailsExpanded((value) => !value)}
        />

        <TouchableOpacity style={styles.saveProgressButton} onPress={persistProgress} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveProgressText}>Salvar progresso</Text>}
        </TouchableOpacity>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: footerBottomPadding,
          },
        ]}
      >
        <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={goPrevious} disabled={saving}>
          <Ionicons name="chevron-back" size={19} color="#fff" />
          <Text style={styles.navText}>Anterior</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={goNext} disabled={saving}>
          <Text style={styles.navTextDark}>{currentExerciseIndex < exercises.length - 1 ? "Proximo" : "Finalizar"}</Text>
          <Ionicons name={currentExerciseIndex < exercises.length - 1 ? "chevron-forward" : "checkmark"} size={19} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExercisePreviewRail({
  exercises,
  drafts,
  currentExerciseIndex,
  onSelect,
}: {
  exercises: TrainingExercisePrescription[];
  drafts: DraftByExercise;
  currentExerciseIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.previewSection}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Exercicios</Text>
        <Text style={styles.previewCounter}>{currentExerciseIndex + 1}/{exercises.length}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewScrollContent}
      >
        {exercises.map((exercise, index) => {
          const active = index === currentExerciseIndex;
          const completion = getExerciseCompletion(drafts, exercise);
          const done = completion.total > 0 && completion.completed === completion.total;

          return (
            <TouchableOpacity
              key={exercise.id}
              style={[styles.previewCard, active && styles.previewCardActive, done && styles.previewCardDone]}
              onPress={() => onSelect(index)}
              activeOpacity={0.86}
            >
              <View style={styles.previewVisual}>
                <Image source={getExerciseThumbnailSource(exercise)} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewImageOverlay} />
                <View style={styles.previewIconBadge}>
                  <Ionicons name={getExerciseIcon(exercise)} size={16} color="#fff" />
                </View>
                <View style={[styles.previewIndexBadge, done && styles.previewIndexBadgeDone]}>
                  <Text style={[styles.previewIndexText, done && styles.previewIndexTextDone]}>{index + 1}</Text>
                </View>
              </View>
              <Text style={styles.previewExerciseName} numberOfLines={2}>{exercise.name}</Text>
              <Text style={styles.previewMuscle} numberOfLines={1}>{exercise.muscleGroup}</Text>
              <View style={styles.previewSetRow}>
                {Array.from({ length: Math.min(exercise.plannedSets, 5) }, (_, setIndex) => (
                  <View
                    key={setIndex}
                    style={[styles.previewSetDot, setIndex < completion.completed && styles.previewSetDotDone]}
                  />
                ))}
              </View>
              <Text style={styles.previewProgressText}>{completion.completed}/{completion.total} series</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ExerciseMiniVisual({
  exercise,
  completion,
  onDemoPress,
}: {
  exercise: TrainingExercisePrescription;
  completion: { completed: number; total: number };
  onDemoPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.exerciseMiniVisual}
      onPress={onDemoPress}
      disabled={!onDemoPress}
      activeOpacity={0.86}
    >
      <Image source={getExerciseThumbnailSource(exercise)} style={styles.exerciseMiniImage} resizeMode="cover" />
      <View style={styles.exerciseMiniOverlay} />
      <View style={styles.exerciseMiniInfo}>
        <View style={styles.exerciseMiniMetric}>
          <Text style={styles.exerciseMiniLabel}>Grupo</Text>
          <Text style={styles.exerciseMiniValue} numberOfLines={1}>{exercise.muscleGroup}</Text>
        </View>
        <View style={styles.exerciseMiniMetricRow}>
          <View style={styles.exerciseMiniMetricSmall}>
            <Text style={styles.exerciseMiniLabel}>Series</Text>
            <Text style={styles.exerciseMiniValue}>{completion.completed}/{completion.total}</Text>
          </View>
          <View style={styles.exerciseMiniMetricSmall}>
            <Text style={styles.exerciseMiniLabel}>Descanso</Text>
            <Text style={styles.exerciseMiniValue}>{formatRest(exercise.restSeconds)}</Text>
          </View>
        </View>
      </View>
      {onDemoPress ? (
        <View style={styles.exerciseMiniPlayBadge}>
          <Ionicons name="play" size={14} color="#fff" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function SetField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.setField}>
      <Text style={styles.setFieldLabel}>{label}</Text>
      <TextInput
        style={styles.setFieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor="#707070"
      />
    </View>
  );
}

function StatBox({
  icon,
  label,
  value,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={[styles.statBox, danger && styles.statBoxDanger]}>
      <View style={[styles.statIconBox, danger && styles.statIconBoxDanger]}>
        <Ionicons name={icon} size={17} color={danger ? "#ff4444" : "#D90000"} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, danger && styles.statLabelDanger]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function InfoNote({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoNote}>
      <Ionicons name={icon} size={16} color="#D90000" />
      <Text style={styles.infoNoteText}>{text}</Text>
    </View>
  );
}

function SetDetails({
  exercise,
  drafts,
  onChange,
  expanded,
  onToggle,
}: {
  exercise: TrainingExercisePrescription;
  drafts: DraftByExercise;
  onChange: (exerciseId: string, setIndex: number, patch: Partial<SetDraft>) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.extraCard}>
      <TouchableOpacity style={styles.extraHeaderButton} onPress={onToggle} activeOpacity={0.84}>
        <View style={styles.extraHeaderTextBlock}>
          <Text style={styles.extraTitle}>Detalhes por serie</Text>
          <Text style={styles.extraHint}>
            {expanded ? "Aquecimentos, dor e observacoes de cada serie." : "Aquecimento, dor, tempo, distancia e observacoes."}
          </Text>
        </View>
        <View style={styles.extraHeaderIcon}>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#D90000" />
        </View>
      </TouchableOpacity>

      {!expanded ? (
        <View style={styles.extraCollapsedRow}>
          <View style={styles.extraCollapsedPill}>
            <Ionicons name="flame-outline" size={14} color="#D90000" />
            <Text style={styles.extraCollapsedText}>Tipos de serie</Text>
          </View>
          <View style={styles.extraCollapsedPill}>
            <Ionicons name="alert-circle-outline" size={14} color="#D90000" />
            <Text style={styles.extraCollapsedText}>Dor</Text>
          </View>
          <View style={styles.extraCollapsedPill}>
            <Ionicons name="create-outline" size={14} color="#D90000" />
            <Text style={styles.extraCollapsedText}>Notas</Text>
          </View>
        </View>
      ) : null}

      {expanded ? Array.from({ length: exercise.plannedSets }, (_, index) => {
        const setIndex = index + 1;
        const draft = getSetDraft(drafts, exercise.id, setIndex);
        const isWarmup = draft.setType === "warmup" || draft.setType === "approach";
        const isInterrupted = draft.setType === "interrupted";

        return (
          <View key={setIndex} style={styles.setDetailCard}>
            <View style={styles.setDetailHeader}>
              <Text style={styles.setDetailTitle}>Serie {setIndex}</Text>
              <View style={styles.setTypeRow}>
                <SetTypeButton
                  label="Valida"
                  active={draft.setType === "working"}
                  onPress={() => onChange(exercise.id, setIndex, { setType: "working" })}
                />
                <SetTypeButton
                  label="Aquec."
                  active={isWarmup}
                  onPress={() => onChange(exercise.id, setIndex, { setType: "warmup" })}
                />
                <SetTypeButton
                  label="Interr."
                  active={isInterrupted}
                  onPress={() => onChange(exercise.id, setIndex, { setType: "interrupted", completed: false })}
                />
              </View>
            </View>

            <View style={styles.metricsRow}>
              <TextInput
                style={styles.extraInput}
                value={draft.duration}
                onChangeText={(duration) => onChange(exercise.id, setIndex, { duration })}
                placeholder="Tempo s"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.extraInput}
                value={draft.distance}
                onChangeText={(distance) => onChange(exercise.id, setIndex, { distance })}
                placeholder="Dist. m"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.painToggle}
              onPress={() => onChange(exercise.id, setIndex, { pain: !draft.pain })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.pain }}
            >
              <Ionicons name={draft.pain ? "checkbox" : "square-outline"} size={22} color="#D90000" />
              <View style={styles.painTextBlock}>
                <Text style={styles.extraTitleSmall}>Dor ou desconforto nesta serie</Text>
                <Text style={styles.extraHint}>O treinador sera alertado sem sugestao automatica de progressao.</Text>
              </View>
            </TouchableOpacity>

            {draft.pain ? (
              <View style={styles.painFields}>
                <TextInput
                  style={styles.extraInput}
                  value={draft.painRegion}
                  onChangeText={(painRegion) => onChange(exercise.id, setIndex, { painRegion })}
                  placeholder="Regiao"
                  placeholderTextColor="#666"
                />
                <TextInput
                  style={styles.extraInput}
                  value={draft.painLevel}
                  onChangeText={(painLevel) => onChange(exercise.id, setIndex, { painLevel })}
                  placeholder="0-10"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.extraInput}
                  value={draft.painMoment}
                  onChangeText={(painMoment) => onChange(exercise.id, setIndex, { painMoment })}
                  placeholder="Momento"
                  placeholderTextColor="#666"
                />
              </View>
            ) : null}

            <TextInput
              style={styles.noteInput}
              value={draft.note}
              onChangeText={(note) => onChange(exercise.id, setIndex, { note })}
              placeholder="Observacao do aluno para esta serie"
              placeholderTextColor="#666"
              multiline
            />
          </View>
        );
      }) : null}
    </View>
  );
}

function SetTypeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.setTypeButton, active && styles.setTypeButtonActive]} onPress={onPress}>
      <Text style={[styles.setTypeButtonText, active && styles.setTypeButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function buildInitialDrafts(exercises: TrainingExercisePrescription[], existingSets: TrainingExecutedSet[]): DraftByExercise {
  return exercises.reduce<DraftByExercise>((acc, exercise) => {
    const bySet: Record<number, SetDraft> = {};
    Array.from({ length: exercise.plannedSets }, (_, index) => index + 1).forEach((setIndex) => {
      const existing = existingSets.find((set) => set.exerciseId === exercise.id && set.plannedSetIndex === setIndex);
      bySet[setIndex] = {
        reps: existing?.executedReps !== undefined ? String(existing.executedReps) : "",
        load: existing?.executedLoad !== undefined ? String(existing.executedLoad) : "",
        duration: existing?.durationSeconds !== undefined ? String(existing.durationSeconds) : "",
        distance: existing?.distanceMeters !== undefined ? String(existing.distanceMeters) : "",
        effort: existing?.effort !== undefined ? String(existing.effort) : "",
        setType: existing?.setType ?? (existing?.warmup || exercise.warmupSet ? "warmup" : "working"),
        completed: existing?.completed ?? false,
        pain: Boolean(existing?.pain),
        painRegion: existing?.pain?.region ?? "",
        painLevel: existing?.pain?.level !== undefined ? String(existing.pain.level) : "",
        painMoment: existing?.pain?.moment ?? "",
        painInterrupted: existing?.pain?.interrupted ?? false,
        note: existing?.studentNote ?? existing?.note ?? "",
      };
    });
    acc[exercise.id] = bySet;
    return acc;
  }, {});
}

function getSetDraft(drafts: DraftByExercise, exerciseId: string, setIndex: number): SetDraft {
  return drafts[exerciseId]?.[setIndex] ?? {
    reps: "",
    load: "",
    duration: "",
    distance: "",
    effort: "",
    setType: "working",
    completed: false,
    pain: false,
    painRegion: "",
    painLevel: "",
    painMoment: "",
    painInterrupted: false,
    note: "",
  };
}

function buildSetInputs(exercises: TrainingExercisePrescription[], drafts: DraftByExercise): TrainingSetInput[] {
  return exercises.flatMap((exercise) =>
    Array.from({ length: exercise.plannedSets }, (_, index) => {
      const setIndex = index + 1;
      const draft = getSetDraft(drafts, exercise.id, setIndex);
      const warmup = draft.setType === "warmup" || draft.setType === "approach" || exercise.warmupSet;
      const interrupted = draft.setType === "interrupted";
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        plannedSetIndex: setIndex,
        setType: draft.setType,
        plannedLoad: exercise.plannedLoad,
        executedLoad: parseNumber(draft.load),
        loadUnit: exercise.loadUnit,
        plannedReps: exercise.plannedReps,
        executedReps: parseNumber(draft.reps),
        durationSeconds: parseNumber(draft.duration),
        distanceMeters: parseNumber(draft.distance),
        equipmentLevel: exercise.loadUnit === "level" ? parseNumber(draft.load) : undefined,
        side: exercise.side,
        plannedRestSeconds: exercise.restSeconds,
        effort: parseNumber(draft.effort),
        completed: draft.completed && !interrupted,
        warmup,
        validForProgression: exercise.validSet && !warmup && !interrupted,
        pain: draft.pain && draft.painRegion.trim() && parseNumber(draft.painLevel) !== undefined
          ? {
              region: draft.painRegion.trim(),
              level: parseNumber(draft.painLevel) as number,
              moment: draft.painMoment.trim() || undefined,
              interrupted,
            }
          : undefined,
        note: draft.note.trim() || undefined,
        studentNote: draft.note.trim() || undefined,
        interrupted,
        invalidReason: interrupted ? "Serie interrompida pelo aluno." : undefined,
      };
    })
  );
}

function calculateTotals(drafts: DraftByExercise) {
  return Object.values(drafts).reduce<{ reps: number; volume: number; pain: boolean }>(
    (totals, bySet) => {
      Object.values(bySet).forEach((draft) => {
        if (!draft.completed || draft.setType !== "working") return;
        const reps = parseNumber(draft.reps) ?? 0;
        const load = parseNumber(draft.load) ?? 0;
        totals.reps += reps;
        totals.volume += reps * load;
        if (draft.pain) totals.pain = true;
      });
      return totals;
    },
    { reps: 0, volume: 0, pain: false }
  );
}

function getExerciseCompletion(drafts: DraftByExercise, exercise: TrainingExercisePrescription) {
  const bySet = drafts[exercise.id] ?? {};
  const completed = Object.values(bySet).filter((draft) => draft.completed).length;
  return {
    completed,
    total: exercise.plannedSets,
  };
}

function getExerciseIcon(exercise: TrainingExercisePrescription): keyof typeof Ionicons.glyphMap {
  if (exercise.equipment?.type === "cardio" || exercise.type === "aerobic") return "pulse-outline";
  if (exercise.type === "mobility" || exercise.type === "cooldown") return "body-outline";
  if (exercise.type === "warmup") return "flame-outline";
  if (exercise.loadUnit === "none" || exercise.loadUnit === "bodyweight") return "fitness-outline";
  return "barbell-outline";
}

function getExerciseThumbnailSource(exercise: TrainingExercisePrescription) {
  const fallbackThumbnail = EXERCISE_THUMBNAILS[exercise.id];
  if (exercise.thumbnailUrl ?? fallbackThumbnail) return { uri: exercise.thumbnailUrl ?? fallbackThumbnail };
  const youtubeThumbnail = getYoutubeThumbnailUrl(exercise.videoUrl);
  if (youtubeThumbnail) return { uri: youtubeThumbnail };
  return require("@/assets/images/workout-bg.jpg");
}

function getYoutubeThumbnailUrl(videoUrl?: string) {
  if (!videoUrl) return undefined;
  const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : undefined;
}

function getPrimarySetField(exercise: TrainingExercisePrescription, draft: SetDraft) {
  if (!hasPlannedReps(exercise) && exercise.durationSeconds) {
    return {
      label: "Tempo",
      value: draft.duration,
      placeholder: String(exercise.durationSeconds),
      patch: (duration: string): Partial<SetDraft> => ({ duration }),
    };
  }

  if (!hasPlannedReps(exercise) && exercise.distanceMeters) {
    return {
      label: "Dist.",
      value: draft.distance,
      placeholder: String(exercise.distanceMeters),
      patch: (distance: string): Partial<SetDraft> => ({ distance }),
    };
  }

  return {
    label: "Reps",
    value: draft.reps,
    placeholder: getRepsPlaceholder(exercise),
    patch: (reps: string): Partial<SetDraft> => ({ reps }),
  };
}

function hasPlannedReps(exercise: TrainingExercisePrescription) {
  return Boolean(exercise.plannedReps || exercise.plannedRepsMin || exercise.plannedRepsMax);
}

function getRepsPlaceholder(exercise: TrainingExercisePrescription) {
  if (exercise.plannedReps) return String(exercise.plannedReps);
  if (exercise.plannedRepsMin && exercise.plannedRepsMax) return `${exercise.plannedRepsMin}-${exercise.plannedRepsMax}`;
  return "0";
}

function shouldShowLoadInput(exercise: TrainingExercisePrescription) {
  return exercise.loadUnit !== "none" && exercise.loadUnit !== "bodyweight";
}

function formatLoadUnitLabel(unit: TrainingExercisePrescription["loadUnit"]) {
  if (unit === "level") return "Nivel";
  return unit;
}

function formatExerciseType(type: TrainingExercisePrescription["type"]) {
  const labels: Record<TrainingExercisePrescription["type"], string> = {
    accessory: "Acessorio",
    aerobic: "Cardio",
    cooldown: "Final",
    main: "Principal",
    mobility: "Mobilidade",
    warmup: "Aquec.",
  };

  return labels[type];
}

function formatRest(seconds: number | undefined) {
  if (!seconds) return "Livre";
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds}s`;
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  scrollContent: {
    width: "100%",
    alignSelf: "center",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  centerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
  },
  centerText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 36,
    height: 36,
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    marginBottom: 12,
  },
  savedText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  sessionCard: {
    backgroundColor: "#171717",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    padding: 18,
    marginBottom: 14,
    overflow: "hidden",
  },
  sessionAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: "#D90000",
  },
  sessionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sessionIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  sessionStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D90000",
  },
  sessionLabel: {
    color: "#f4f4f4",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sessionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
  },
  sessionCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.28)",
  },
  sessionCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  sessionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  sessionMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  sessionMetaText: {
    color: "#d7d7d7",
    fontSize: 12,
    fontWeight: "800",
  },
  progressPanel: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 12,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  progressLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  progressValue: {
    color: "#999",
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#2a2a2a",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#D90000",
  },
  progressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 9,
  },
  progressHint: {
    flex: 1,
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
  },
  progressPercent: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    minHeight: 112,
    backgroundColor: "#171717",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 12,
    justifyContent: "space-between",
  },
  statBoxDanger: {
    borderColor: "rgba(255, 68, 68, 0.35)",
    backgroundColor: "rgba(255, 68, 68, 0.08)",
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statIconBoxDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.12)",
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    color: "#999",
    fontSize: 11,
    fontWeight: "900",
  },
  statLabelDanger: {
    color: "#ff4444",
  },
  previewSection: {
    marginBottom: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  previewCounter: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  previewScrollContent: {
    gap: 10,
    paddingRight: 2,
  },
  previewCard: {
    width: 132,
    minHeight: 154,
    borderRadius: 16,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 10,
  },
  previewCardActive: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderColor: "#D90000",
  },
  previewCardDone: {
    borderColor: "rgba(217, 0, 0, 0.55)",
  },
  previewVisual: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
    position: "relative",
    overflow: "hidden",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  previewImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.36)",
  },
  previewIconBadge: {
    position: "absolute",
    left: 9,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewIndexBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  previewIndexBadgeDone: {
    backgroundColor: "#D90000",
  },
  previewIndexText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  previewIndexTextDone: {
    color: "#fff",
  },
  previewExerciseName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    minHeight: 30,
  },
  previewMuscle: {
    color: "#888",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
  previewSetRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 10,
  },
  previewSetDot: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#333",
  },
  previewSetDotDone: {
    backgroundColor: "#D90000",
  },
  previewProgressText: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 7,
  },
  exerciseCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    marginBottom: 12,
  },
  exerciseTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  exerciseTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  exerciseStep: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  exerciseTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  exercisePrescription: {
    color: "#999",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },
  exerciseTypeBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.24)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  exerciseTypeText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  exerciseMiniVisual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#101010",
    borderRadius: 16,
    minHeight: 152,
    padding: 14,
    marginTop: 14,
    overflow: "hidden",
    position: "relative",
  },
  exerciseMiniImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  exerciseMiniOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.46)",
  },
  exerciseMiniPlayBadge: {
    position: "absolute",
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D90000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseMiniInfo: {
    width: "56%",
    minWidth: 0,
    gap: 8,
    zIndex: 2,
  },
  exerciseMiniMetric: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.54)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.13)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  exerciseMiniMetricRow: {
    flexDirection: "row",
    gap: 8,
  },
  exerciseMiniMetricSmall: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.54)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.13)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  exerciseMiniLabel: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 10,
    fontWeight: "900",
  },
  exerciseMiniValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  infoNoteText: {
    color: "#ddd",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  setListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  setListTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  setListSubtitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 2,
  },
  setListCounter: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  setList: {
    gap: 10,
    marginBottom: 10,
  },
  setCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 12,
  },
  setCardCompleted: {
    borderColor: "rgba(217, 0, 0, 0.32)",
    backgroundColor: "rgba(217, 0, 0, 0.06)",
  },
  setCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  setCardIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: {
    backgroundColor: "#D90000",
  },
  setCardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  setCardStatus: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  setFields: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  setField: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "30%",
    minWidth: 92,
    borderRadius: 11,
    backgroundColor: "#292929",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  setFieldLabel: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
  },
  setFieldInput: {
    minHeight: 28,
    padding: 0,
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  repeatButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  extraCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  extraHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  extraHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  extraHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  extraCollapsedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  extraCollapsedPill: {
    minHeight: 32,
    borderRadius: 10,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
  },
  extraCollapsedText: {
    color: "#999",
    fontSize: 11,
    fontWeight: "800",
  },
  setDetailCard: {
    backgroundColor: "#242424",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginTop: 12,
  },
  setDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  setDetailTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  setTypeRow: {
    flexDirection: "row",
    flexShrink: 1,
    gap: 6,
  },
  setTypeButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#383838",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#1c1c1c",
  },
  setTypeButtonActive: {
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderColor: "#D90000",
  },
  setTypeButtonText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "900",
  },
  setTypeButtonTextActive: {
    color: "#D90000",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  painToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
  },
  painTextBlock: {
    flex: 1,
  },
  extraTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  extraTitleSmall: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  extraHint: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  painFields: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  extraInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#292929",
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  noteInput: {
    minHeight: 76,
    borderRadius: 10,
    backgroundColor: "#292929",
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    padding: 12,
    marginTop: 12,
    textAlignVertical: "top",
    fontSize: 13,
  },
  saveProgressButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveProgressText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#0f0f0fff",
    borderTopWidth: 1,
    borderTopColor: "#242424",
    paddingTop: 14,
  },
  navButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  prevButton: {
    backgroundColor: "#1c1c1c",
  },
  nextButton: {
    backgroundColor: "#D90000",
  },
  navText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  navTextDark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
});
