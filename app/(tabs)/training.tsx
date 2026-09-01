import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";

import { useResponsiveLayout } from "@/constants/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { UserAvatar } from "@/components/user-avatar";
import { DEMO_STUDENT, getUnreadNotificationCount } from "@/services/feedback-store";
import {
  listStudentProfilesForTrainer,
  StudentProfile,
} from "@/services/student-profile-store";
import {
  TrainingDashboard,
  TrainingExecution,
  TrainingSession,
  TrainingSessionInput,
  TrainingSessionStatus,
  TrainingSessionVersion,
  TrainingSessionsPage,
  TrainingExercisePrescription,
  buildTrainingLoadSummaries,
  createTrainingSession,
  updateTrainingSession,
  ensureTrainingPlanForStudent,
  daysUntilTrainingDate,
  duplicateTrainingSession,
  extendTrainingSessionValidity,
  formatExercisePrescription,
  formatTrainingDate,
  formatTrainingDateTime,
  getActiveVersion,
  getSessionAlerts,
  getSessionEffectiveStatus,
  getStudentSessionAccess,
  getTrainingDashboard,
  getTrainingSessionsPage,
  getTrainingSessionStatusLabel,
  publishTrainingSession,
  setTrainingSessionStatus,
} from "@/services/training-plan-store";
import {
  TrainerWorkoutEditor,
  WorkoutExerciseItem,
  WorkoutGeneralInfo,
  WorkoutSectionHeader,
  getSectionIcon,
} from "@/components/trainer-workout-editor";
import { shareWorkoutAsPdf } from "@/services/workout-pdf-service";
import { formatDateInput } from "@/services/student-profile-store";

type Perspective = "trainer" | "student";


type SessionDraftForm = {
  name: string;
  identifier: string;
  objective: string;
  description: string;
  muscleGroups: string;
  estimatedDurationMinutes: string;
  validUntil: string;
  recommendedDays: string;
  instructions: string;
  releaseAt: string;
  requiresSupervision: boolean;
};

const DEFAULT_FORM: SessionDraftForm = {
  name: "",
  identifier: "",
  objective: "",
  description: "",
  muscleGroups: "",
  estimatedDurationMinutes: "50",
  validUntil: "",
  recommendedDays: "Segunda, Quarta",
  instructions: "",
  releaseAt: "",
  requiresSupervision: false,
};

const SESSIONS_PAGE_LIMIT = 15;

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const monthLabels = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export default function TrainingScreen() {
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ perspective?: Perspective; studentId?: string }>();
  const [dashboard, setDashboard] = useState<TrainingDashboard | null>(null);
  const [perspective, setPerspective] = useState<Perspective>("student");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showCalendar, setShowCalendar] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [workoutEditorVisible, setWorkoutEditorVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [loadsVisible, setLoadsVisible] = useState(false);
  const [draft, setDraft] = useState<SessionDraftForm>(DEFAULT_FORM);

  // Alunos vinculados ao treinador
  const [trainerStudents, setTrainerStudents] = useState<StudentProfile[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(params.studentId ?? null);

  // Lista paginada de treinos do aluno selecionado (Treinos -> lista -> editor)
  const [trainerEditorOpen, setTrainerEditorOpen] = useState(false);
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
  const [sessionsPageData, setSessionsPageData] = useState<TrainingSessionsPage | null>(null);
  const [sessionsPageNumber, setSessionsPageNumber] = useState(1);
  const [loadingSessionsList, setLoadingSessionsList] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Se veio de "Ver treinos" do perfil de um aluno específico, pula a lista e abre direto o treino dele
  useEffect(() => {
    if (params.studentId) {
      setActiveStudentId(params.studentId);
    }
  }, [params.studentId]);

  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top + 6 : (Platform.OS === "ios" ? 48 : 16);

  const currentStudent = useMemo(() => {
    return trainerStudents.find((s) => s.id === activeStudentId) ?? trainerStudents[0];
  }, [trainerStudents, activeStudentId]);

  const currentStudentName = currentStudent?.registration?.fullName || "Aluno";

  useEffect(() => {
    if (session?.user.role === "TRAINER") setPerspective("trainer");
    if (session?.user.role === "STUDENT") setPerspective("student");
  }, [session?.user.role]);

  const loadDashboard = useCallback(async (asRefresh = false, nextPerspective = perspective) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const isStudent = session.user.role === "STUDENT";
      let studentId = isStudent ? session.user.id : DEMO_STUDENT.id;

      if (!isStudent) {
        const studentProfiles = await listStudentProfilesForTrainer(session.user.id, session.user.id, "trainer");
        setTrainerStudents(studentProfiles);

        const target = studentProfiles.find((s) => s.id === activeStudentId);
        if (!activeStudentId || !target) {
          // Nenhum aluno escolhido ainda (ou o escolhido não existe mais): mostra a lista de alunos.
          if (activeStudentId && !target) setActiveStudentId(null);
          setDashboard(null);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        studentId = target.id;
      }

      const requesterId = session.user.id;
      const legacyRole = isStudent ? "student" : "trainer";
      const effectivePerspective = isStudent ? "student" : nextPerspective;
      const [nextDashboard, notificationCount] = await Promise.all([
        getTrainingDashboard(
          studentId,
          requesterId,
          legacyRole,
          effectivePerspective
        ),
        getUnreadNotificationCount(studentId),
      ]);

      setDashboard(nextDashboard);
      setUnreadNotifications(notificationCount);
      setSelectedSessionId((current) => current ?? nextDashboard.nextSuggestedSession?.id ?? nextDashboard.sessions[0]?.id ?? null);
    } catch {
      setError("");
      setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [perspective, session, activeStudentId]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  // Lista paginada de treinos do aluno (paginação real: a função de serviço corta por página)
  const loadSessionsList = useCallback(
    async (page = sessionsPageNumber) => {
      if (!session || session.user.role !== "TRAINER" || !activeStudentId) return;
      setLoadingSessionsList(true);
      try {
        const result = await getTrainingSessionsPage(activeStudentId, session.user.id, "trainer", {
          page,
          limit: SESSIONS_PAGE_LIMIT,
        });
        setSessionsPageData(result);
      } catch {
        setSessionsPageData(null);
      } finally {
        setLoadingSessionsList(false);
      }
    },
    [session, activeStudentId, sessionsPageNumber]
  );

  useEffect(() => {
    setSessionsPageNumber(1);
  }, [activeStudentId]);

  useEffect(() => {
    if (!trainerEditorOpen) {
      void loadSessionsList(sessionsPageNumber);
    }
  }, [loadSessionsList, sessionsPageNumber, trainerEditorOpen]);

  const selectedSession = useMemo(() => {
    if (!dashboard) return undefined;
    return dashboard.sessions.find((session) => session.id === selectedSessionId) ?? dashboard.sessions[0];
  }, [dashboard, selectedSessionId]);

  const selectedVersion = selectedSession ? getActiveVersion(selectedSession) : undefined;
  const sessionExecutions = useMemo(
    () => dashboard?.executions.filter((execution) => execution.sessionId === selectedSession?.id) ?? [],
    [dashboard, selectedSession]
  );
  const lastExecution = sessionExecutions[0];
  const loadSummaries = useMemo(() => (dashboard ? buildTrainingLoadSummaries(dashboard.executions) : []), [dashboard]);
  const exercises = selectedVersion?.exercises ?? [];
  const completedCount = exercises.filter((exercise) => completedExercises[exercise.id]).length;
  const progressPercent = exercises.length > 0 ? Math.min(100, Math.round((completedCount / exercises.length) * 100)) : 0;
  const hasUnreadNotifications = unreadNotifications > 0;

  // Sincroniza exercicios concluidos a partir da execucao registrada da sessao
  useEffect(() => {
    if (!lastExecution || !selectedVersion) return;
    const initialCompleted: Record<string, boolean> = {};
    selectedVersion.exercises.forEach((exercise) => {
      const exerciseSets = lastExecution.sets?.filter((s) => s.exerciseId === exercise.id) || [];
      const hasCompletedSet = exerciseSets.length > 0 && exerciseSets.some((s) => s.completed);
      if (hasCompletedSet || lastExecution.status === "completed") {
        initialCompleted[exercise.id] = true;
      }
    });
    if (Object.keys(initialCompleted).length > 0) {
      setCompletedExercises((prev) => ({ ...initialCompleted, ...prev }));
    }
  }, [lastExecution, selectedVersion]);

  const currentEditorInfo: Partial<WorkoutGeneralInfo> = useMemo(() => {
    if (isCreatingNewSession || !selectedVersion) {
      return {
        name: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        notes: "",
        releaseToStudent: false,
        notifyExpiration: true,
        splitByWeekDay: false,
        recommendedDays: ["Segunda", "Quarta", "Sexta"],
        coverUrl: "",
      };
    }
    return {
      name: selectedVersion.name || selectedVersion.identifier || "Treino do Aluno",
      startDate: selectedVersion.validFrom ? selectedVersion.validFrom.slice(0, 10) : new Date().toISOString().slice(0, 10),
      endDate: selectedVersion.validUntil ? selectedVersion.validUntil.slice(0, 10) : new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      notes: selectedVersion.instructions || selectedVersion.objective || "",
      releaseToStudent: selectedSession?.release.visibleToStudent ?? false,
      notifyExpiration: selectedSession?.release.notifyOnRelevantUpdates ?? true,
      splitByWeekDay: (selectedVersion.recommendedDays && selectedVersion.recommendedDays.length > 0) || false,
      recommendedDays: selectedVersion.recommendedDays || ["Segunda", "Quarta"],
      coverUrl: selectedVersion.coverUrl || "",
    };
  }, [selectedVersion, selectedSession, isCreatingNewSession]);

  const currentEditorSections: WorkoutSectionHeader[] = useMemo(() => {
    if (isCreatingNewSession || !selectedVersion) return [];
    return selectedVersion.sections ?? [];
  }, [selectedVersion, isCreatingNewSession]);

  const currentEditorExercises: WorkoutExerciseItem[] = useMemo(() => {
    if (isCreatingNewSession || !selectedVersion || selectedVersion.exercises.length === 0) {
      return [];
    }
    return selectedVersion.exercises.map((ex, idx) => ({
      id: ex.id || `ex-${idx}`,
      name: ex.name,
      category: ex.muscleGroup || "Geral",
      muscleGroup: ex.muscleGroup || "Geral",
      videoUrl: ex.videoUrl,
      thumbnailUrl: ex.thumbnailUrl,
      observation: ex.observation,
      cadence: ex.tempo || "3-0-1-0",
      sectionId: ex.sectionId,
      combinationId: ex.combinationId,
      combinationLabel: ex.combinationLabel,
      sets: ex.plannedSetDetails && ex.plannedSetDetails.length > 0
        ? ex.plannedSetDetails.map((set) => ({
            id: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            load: set.load,
            restSeconds: set.restSeconds,
            notes: set.notes ?? "",
          }))
        : Array.from({ length: ex.plannedSets || 3 }, (_, sIdx) => ({
            id: `s-${ex.id}-${sIdx + 1}`,
            setNumber: sIdx + 1,
            reps: ex.plannedReps ? String(ex.plannedReps) : "10 a 12",
            load: ex.plannedLoad ? `${ex.plannedLoad} kg` : "20 kg",
            restSeconds: ex.restSeconds || 60,
            notes: "",
          })),
    }));
  }, [selectedVersion, isCreatingNewSession]);

  const saveWorkoutFromEditor = async (data: {
    info: WorkoutGeneralInfo;
    exercises: WorkoutExerciseItem[];
    sections: WorkoutSectionHeader[];
  }) => {
    if (session?.user.role !== "TRAINER") return;
    setSaving(true);
    try {
      let planId = dashboard?.plan?.id;
      if (!planId) {
        const studentId = activeStudentId || DEMO_STUDENT.id;
        const plan = await ensureTrainingPlanForStudent(studentId, session.user.id);
        planId = plan.id;
      }

      const prescriptions: TrainingExercisePrescription[] = data.exercises.map((item, index) => ({
        id: item.id || `ex-${Date.now()}-${index}`,
        name: item.name,
        type: item.category?.toLowerCase().includes("aquecimento")
          ? "warmup"
          : item.category?.toLowerCase().includes("aerób")
          ? "aerobic"
          : "main",
        muscleGroup: item.muscleGroup || item.category || "Geral",
        order: index + 1,
        sectionId: item.sectionId,
        combinationId: item.combinationId,
        combinationLabel: item.combinationLabel,
        plannedSets: item.sets.length || 3,
        plannedSetDetails: item.sets.map((set, setIndex) => ({
          id: set.id || `set-${item.id}-${setIndex}`,
          setNumber: set.setNumber ?? setIndex + 1,
          reps: set.reps || "10 a 12",
          load: set.load || "Livre",
          restSeconds: set.restSeconds ?? 60,
          notes: set.notes || undefined,
        })),
        plannedReps: parseInt(item.sets[0]?.reps || "10", 10) || 10,
        plannedRepsMin: 8,
        plannedRepsMax: 12,
        plannedLoad: parseInt(item.sets[0]?.load || "20", 10) || 20,
        loadUnit: "kg",
        restSeconds: item.sets[0]?.restSeconds || 60,
        tempo: item.cadence,
        observation: item.observation,
        videoUrl: item.videoUrl,
        thumbnailUrl: item.thumbnailUrl,
        unilateral: false,
        warmupSet: false,
        validSet: true,
      }));

      const input: TrainingSessionInput = {
        planId,
        name: data.info.name,
        identifier: data.info.name.split("-")[0]?.trim() || "Treino",
        objective: data.info.notes || "Treino Personalizado",
        description: data.info.notes,
        muscleGroups: Array.from(new Set(data.exercises.map((e) => e.muscleGroup).filter(Boolean))),
        level: "intermediario",
        estimatedDurationMinutes: data.exercises.length * 15 || 50,
        validFrom: data.info.startDate ? new Date(`${data.info.startDate}T00:00:00`).toISOString() : undefined,
        validUntil: data.info.endDate ? new Date(`${data.info.endDate}T23:59:00`).toISOString() : undefined,
        recommendedDays: data.info.recommendedDays,
        instructions: data.info.notes,
        requiresSupervision: false,
        publishMode: data.info.releaseToStudent ? "now" : "draft",
        coverUrl: data.info.coverUrl,
        sections: data.sections,
        exercises: prescriptions,
      };

      if (!isCreatingNewSession && selectedSession) {
        await updateTrainingSession(selectedSession.id, input, session.user.id);
      } else {
        await createTrainingSession(input, session.user.id);
      }

      setTrainerEditorOpen(false);
      setIsCreatingNewSession(false);
      showSaved("Treino salvo e atualizado com sucesso!");
      await loadDashboard(true, perspective);
      await loadSessionsList(sessionsPageNumber);
    } catch (err) {
      Alert.alert("Erro ao salvar", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCurrentSessionPdf = async () => {
    if (!selectedVersion) return;
    setActionMenuVisible(false);
    try {
      await shareWorkoutAsPdf({
        trainerId: session?.user.id,
        studentName: currentStudentName,
        studentAvatar: currentStudent?.registration?.avatar,
        workoutInfo: currentEditorInfo as WorkoutGeneralInfo,
        exercises: currentEditorExercises,
      });
    } catch (err) {
      Alert.alert("Erro ao Gerar PDF", err instanceof Error ? err.message : "Tente novamente.");
    }
  };

  const getWorkoutForDay = (day: number) => {
    if (!dashboard) return [];
    const date = new Date(`${currentMonth}-${String(day).padStart(2, "0")}T12:00:00`);
    const label = dayNames[date.getDay()];
    return dashboard.plan.weeklySchedule
      .filter((item) => item.day.slice(0, 3).toLowerCase() === label.slice(0, 3).toLowerCase())
      .map((item) => item.sessionId);
  };

  const formatMonth = (dateString: string) => {
    const date = new Date(`${dateString}T12:00:00`);
    return `${monthLabels[date.getMonth()]}' ${date.getFullYear().toString().slice(-2)}`;
  };

  const showSaved = (message: string) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(""), 2400);
  };

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((current) => ({
      ...current,
      [exerciseId]: !current[exerciseId],
    }));
  };

  const setPerspectiveAndReload = (nextPerspective: Perspective) => {
    if (session?.user.role !== "TRAINER") return;
    setPerspective(nextPerspective);
    loadDashboard(false, nextPerspective);
  };

  const openSession = () => {
    if (!selectedSession) return;
    const access = getStudentSessionAccess(selectedSession);

    if (!access.canStart && perspective === "student") {
      Alert.alert("Sessao indisponivel", access.reason);
      return;
    }

    router.push({
      pathname: "/training-details" as never,
      params: { sessionId: selectedSession.id },
    });
  };

  const resetDraft = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    setDraft({ ...DEFAULT_FORM, validUntil: date.toISOString().slice(0, 10) });
  };

  const openCreateModal = () => {
    if (session?.user.role !== "TRAINER") {
      Alert.alert("Acesso negado", "Somente o treinador pode criar sessoes.");
      return;
    }
    resetDraft();
    setActionMenuVisible(false);
    setWorkoutEditorVisible(true);
  };

  const createSession = async (mode: "draft" | "now" | "scheduled") => {
    if (session?.user.role !== "TRAINER") return;

    setSaving(true);

    try {
      let planId = dashboard?.plan?.id;
      if (!planId) {
        const studentId = activeStudentId || DEMO_STUDENT.id;
        const plan = await ensureTrainingPlanForStudent(studentId, session.user.id);
        planId = plan.id;
      }

      const input: TrainingSessionInput = {
        planId,
        name: draft.name,
        identifier: draft.identifier,
        objective: draft.objective,
        description: draft.description,
        muscleGroups: splitList(draft.muscleGroups),
        level: "intermediario",
        estimatedDurationMinutes: Number(draft.estimatedDurationMinutes) || 50,
        validUntil: draft.validUntil ? new Date(`${draft.validUntil}T23:59:00`).toISOString() : undefined,
        recommendedDays: splitList(draft.recommendedDays),
        instructions: draft.instructions,
        releaseAt: mode === "scheduled" && draft.releaseAt ? new Date(`${draft.releaseAt}T08:00:00`).toISOString() : undefined,
        showWhenLocked: mode === "scheduled",
        requiresSupervision: draft.requiresSupervision,
        publishMode: mode,
      };

      await createTrainingSession(input, session.user.id);
      setCreateModalVisible(false);
      showSaved(mode === "draft" ? "Sessao salva como rascunho." : "Sessao criada.");
      await loadDashboard(true, perspective);
    } catch (createError) {
      Alert.alert("Nao foi possivel criar", createError instanceof Error ? createError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateSession = async (targetSessionId?: string) => {
    const sessionIdToDuplicate = targetSessionId ?? selectedSession?.id;
    if (!sessionIdToDuplicate || session?.user.role !== "TRAINER") return;

    setSaving(true);
    try {
      await duplicateTrainingSession(sessionIdToDuplicate, session.user.id);
      setActionMenuVisible(false);
      setTrainerEditorOpen(false);
      showSaved("Sessao duplicada como rascunho.");
      await loadDashboard(true, perspective);
      await loadSessionsList(sessionsPageNumber);
    } catch (duplicateError) {
      Alert.alert("Nao foi possivel duplicar", duplicateError instanceof Error ? duplicateError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSessionFromList = (targetSessionId: string, sessionName: string) => {
    if (!session || session.user.role !== "TRAINER") return;
    Alert.alert(
      "Excluir Treino",
      `Deseja realmente remover "${sessionName}"? Ele deixará de aparecer para você e para o aluno.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await setTrainingSessionStatus(targetSessionId, "arquivado", "Removido pelo treinador.", session.user.id);
              await loadSessionsList(sessionsPageNumber);
              await loadDashboard(true, perspective);
            } catch (deleteError) {
              Alert.alert("Nao foi possivel excluir", deleteError instanceof Error ? deleteError.message : "Tente novamente.");
            }
          },
        },
      ]
    );
  };

  const publishSession = async () => {
    if (!selectedSession || session?.user.role !== "TRAINER") return;

    setSaving(true);
    try {
      await publishTrainingSession(selectedSession.id, session.user.id);
      setActionMenuVisible(false);
      showSaved("Sessao publicada ao aluno.");
      await loadDashboard(true, perspective);
    } catch (publishError) {
      Alert.alert("Nao foi possivel publicar", publishError instanceof Error ? publishError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (
    nextStatus: "bloqueado" | "pausado" | "arquivado" | "substituido" | "liberado",
    reason: string
  ) => {
    if (!selectedSession || session?.user.role !== "TRAINER") return;

    Alert.alert(
      getTrainingSessionStatusLabel(nextStatus),
      "A alteracao sera registrada e o historico de execucoes sera preservado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: nextStatus === "bloqueado" || nextStatus === "arquivado" ? "destructive" : "default",
          onPress: () => {
            void saveStatus(nextStatus, reason);
          },
        },
      ]
    );
  };

  const saveStatus = async (
    nextStatus: "bloqueado" | "pausado" | "arquivado" | "substituido" | "liberado",
    reason: string
  ) => {
    if (!selectedSession || session?.user.role !== "TRAINER") return;

    setSaving(true);
    try {
      await setTrainingSessionStatus(selectedSession.id, nextStatus, reason, session.user.id);
      setActionMenuVisible(false);
      showSaved("Status da sessao atualizado.");
      await loadDashboard(true, perspective);
    } catch (statusError) {
      Alert.alert("Nao foi possivel alterar", statusError instanceof Error ? statusError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const extendSession = async () => {
    if (!selectedSession || session?.user.role !== "TRAINER") return;

    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 3);

    setSaving(true);
    try {
      await extendTrainingSessionValidity(selectedSession.id, nextDate.toISOString(), session.user.id);
      setActionMenuVisible(false);
      showSaved("Validade prorrogada.");
      await loadDashboard(true, perspective);
    } catch (extendError) {
      Alert.alert("Nao foi possivel prorrogar", extendError instanceof Error ? extendError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando treinos...</Text>
      </View>
    );
  }

  // Se for PERSONAL TRAINER e ainda não escolheu um aluno: mostra o Hub de Treinos com Header Padrão
  if (session?.user.role === "TRAINER" && !activeStudentId) {
    const topInsetScreen = insets.top > 0 ? insets.top + 8 : Platform.OS === "ios" ? 52 : 20;
    const totalStudents = trainerStudents.length;
    const pendingCount = totalStudents;
    const expiredCount = 0;

    const filteredStudents = trainerStudents.filter((s) => {
      if (!studentSearchQuery.trim()) return true;
      const q = studentSearchQuery.toLowerCase();
      return (
        s.registration?.fullName?.toLowerCase().includes(q) ||
        s.registration?.mainGoal?.toLowerCase().includes(q)
      );
    });

    return (
      <View style={[styles.container, { flex: 1 }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

        {/* 1. TOP BAR PADRONIZADA */}
        <View style={[styles.headerBar, { paddingTop: topInsetScreen, paddingHorizontal: layout.horizontalPadding }]}>
          <TouchableOpacity
            style={[styles.headerActionButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() => router.back()}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Treinos
          </Text>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {}}
              activeOpacity={0.8}
              hitSlop={6}
            >
              <Ionicons name="filter" size={18} color="#D90000" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
              hitSlop={6}
            >
              <Ionicons name="add" size={20} color="#D90000" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding + 20,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor="#D90000" />
          }
        >
          {/* 2. SUMMARY / HERO CARD PADRONIZADO */}
          <View style={styles.summaryCard}>
            <Image
              source={require("@/assets/images/logo-white.png")}
              style={styles.heroWatermark}
              resizeMode="contain"
            />
            <View style={styles.summaryTop}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryEyebrow} numberOfLines={1}>HOJE</Text>
                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {totalStudents} {totalStudents === 1 ? "aluno" : "alunos"}
                </Text>
                <Text style={styles.summarySubtitle} numberOfLines={1}>
                  Vencidos, próximos e prontos para criar
                </Text>
              </View>
              <TouchableOpacity style={styles.summaryAction} onPress={() => {}} activeOpacity={0.85}>
                <Ionicons name="locate-outline" size={16} color="#FFFFFF" />
                <Text style={styles.summaryActionText} numberOfLines={1}>Hoje</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryStats}>
              <View style={styles.metricPill}>
                <View style={styles.metricTopRow}>
                  <Ionicons name="calendar-outline" size={15} color="rgba(255, 255, 255, 0.85)" />
                  <Text style={styles.metricValue} numberOfLines={1}>{expiredCount}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={1}>VENCIDAS</Text>
              </View>

              <View style={styles.metricPill}>
                <View style={styles.metricTopRow}>
                  <Ionicons name="barbell-outline" size={15} color="rgba(255, 255, 255, 0.85)" />
                  <Text style={styles.metricValue} numberOfLines={1}>{pendingCount || totalStudents}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={1}>PENDÊNCIAS</Text>
              </View>

              <View style={styles.metricPill}>
                <View style={styles.metricTopRow}>
                  <Ionicons name="alert-circle-outline" size={15} color="rgba(255, 255, 255, 0.85)" />
                  <Text style={styles.metricValue} numberOfLines={1}>{totalStudents}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={1}>ALUNOS</Text>
              </View>
            </View>
          </View>

          {/* 3. SEARCH BOX */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#D90000" />
            <TextInput
              style={styles.searchInput}
              value={studentSearchQuery}
              onChangeText={setStudentSearchQuery}
              placeholder="Buscar por aluno, objetivo ou status"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
            {studentSearchQuery ? (
              <TouchableOpacity onPress={() => setStudentSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 4. LISTA DE ALUNOS */}
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color="#D90000" />
              <Text style={styles.centerText}>Carregando alunos...</Text>
            </View>
          ) : trainerStudents.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="people-outline" size={42} color="#444" />
              <Text style={styles.centerTitle}>Nenhum Aluno Cadastrado</Text>
              <Text style={styles.centerText}>
                Cadastre seu primeiro aluno para começar a prescrever e organizar treinos.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/(tabs)/profile")}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Cadastrar Novo Aluno</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredStudents.map((s) => {
                const goal = s.registration?.mainGoal?.toLowerCase() || "";
                const isTest = goal.includes("teste");
                const badge = isTest
                  ? { label: "Teste", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.14)", border: "rgba(59, 130, 246, 0.3)" }
                  : { label: "Plano Ativo", color: "#10B981", bg: "rgba(16, 185, 129, 0.14)", border: "rgba(16, 185, 129, 0.3)" };

                return (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.studentPickerRow}
                    onPress={() => setActiveStudentId(s.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarWrapper}>
                      <Image
                        source={{
                          uri: s.registration?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                        }}
                        style={styles.studentPickerAvatar}
                      />
                      <View style={styles.avatarOnlineDot} />
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.studentHeaderRow}>
                        <Text style={styles.studentPickerName} numberOfLines={1}>
                          {s.registration?.fullName || "Aluno"}
                        </Text>
                        <View style={[styles.statusChip, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.statusChipText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      </View>

                      <View style={styles.studentGoalRow}>
                        <Ionicons name="fitness-outline" size={13} color="#94A3B8" />
                        <Text style={styles.studentPickerSub} numberOfLines={1}>
                          {s.registration?.mainGoal || "Objetivo não informado"}
                        </Text>
                      </View>

                      <View style={styles.studentTagsRow}>
                        <View style={styles.microChip}>
                          <Ionicons name="calendar-outline" size={11} color="#888888" />
                          <Text style={styles.microChipText}>Treinos em dia</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionArrowBtn}>
                      <Ionicons name="chevron-forward" size={16} color="#FF3333" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Se for PERSONAL TRAINER com aluno escolhido: renderiza a tela interativa de gestão e montagem de treino
  if (session?.user.role === "TRAINER" && activeStudentId) {
    const currentStudent = trainerStudents.find((s) => s.id === activeStudentId) ?? trainerStudents[0];
    const currentStudentName = currentStudent?.registration?.fullName || "Aluno";
    const currentStudentAvatar = currentStudent?.registration?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200";

    if (loading && !dashboard) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color="#D90000" />
          <Text style={styles.centerText}>Carregando treino de {currentStudentName}...</Text>
        </View>
      );
    }

    if (trainerEditorOpen) {
      return (
        <View style={[styles.container, { flex: 1 }]}>
          <StatusBar barStyle="light-content" backgroundColor="#121212" />
          {/* TELA DIRETA DE GESTÃO, CRIAÇÃO, ARRASTAR E IMAGENS DO TREINO */}
          <TrainerWorkoutEditor
            visible={true}
            isEmbedded={false}
            studentName={currentStudentName}
            studentAvatar={currentStudentAvatar}
            trainerId={session.user.id}
            initialInfo={currentEditorInfo}
            initialSections={currentEditorSections}
            initialExercises={currentEditorExercises}
            onClose={() => setTrainerEditorOpen(false)}
            onSave={saveWorkoutFromEditor}
            onDuplicate={() => duplicateSession(selectedSession?.id)}
          />
        </View>
      );
    }

    return (
      <TrainerSessionsListScreen
        layout={layout}
        currentStudentName={currentStudentName}
        pageData={sessionsPageData}
        loading={loadingSessionsList}
        onRefresh={() => loadSessionsList(sessionsPageNumber)}
        onPrevPage={() => setSessionsPageNumber((value) => Math.max(1, value - 1))}
        onNextPage={() => setSessionsPageNumber((value) => value + 1)}
        onCreateNew={() => {
          setIsCreatingNewSession(true);
          setTrainerEditorOpen(true);
        }}
        onOpenSession={(id) => {
          setIsCreatingNewSession(false);
          setSelectedSessionId(id);
          setTrainerEditorOpen(true);
        }}
        onDuplicateSession={(id) => duplicateSession(id)}
        onDeleteSession={(id, name) => deleteSessionFromList(id, name)}
        onBackToStudents={() => setActiveStudentId(null)}
      />
    );
  }

  // Se não houver treinos ou não houver alunos (Visão Aluno)
  if (!dashboard || !selectedSession || !selectedVersion || dashboard.sessions.length === 0) {
    const isTrainer = (session?.user.role as string | undefined) === "TRAINER";
    const hasNoStudents = isTrainer && trainerStudents.length === 0;
    const currentStudent = trainerStudents.find((s) => s.id === activeStudentId) ?? trainerStudents[0];
    const currentStudentName = currentStudent?.registration?.fullName || "Aluno";

    return (
      <View style={[styles.container, { paddingHorizontal: layout.horizontalPadding }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: layout.tabBarContentPadding,
              maxWidth: layout.contentMaxWidth,
              flexGrow: 1,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDashboard(true)}
              tintColor="#D90000"
            />
          }
        >
          {/* HEADER PRINCIPAL */}
          <View style={[styles.header, { marginTop: layout.topPadding }]}>
            <View style={styles.headerTop}>
              <Image
                source={require("@/assets/images/logo-principal.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.exercisesButton}
                  onPress={() => router.push("/exercises")}
                >
                  <Ionicons name="list-outline" size={20} color="#D90000" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notificationContainer}
                  onPress={() => router.push("/notifications")}
                >
                  <Ionicons name="notifications-outline" size={20} color="#D90000" />
                  {hasUnreadNotifications && <View style={styles.notificationBadge} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
                  <UserAvatar
                    uri={session?.user?.avatar}
                    size={38}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SELETOR DE ALUNOS (CASO O PERSONAL TENHA MAIS DE 1 ALUNO) */}
          {isTrainer && trainerStudents.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.studentChipsScroll}
              contentContainerStyle={styles.studentChipsContent}
            >
              {trainerStudents.map((s) => {
                const isSelected = s.id === activeStudentId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.studentChip,
                      isSelected && styles.studentChipActive,
                    ]}
                    onPress={() => {
                      setActiveStudentId(s.id);
                    }}
                  >
                    <Ionicons
                      name="person"
                      size={13}
                      color={isSelected ? "#000" : "#888"}
                    />
                    <Text
                      style={[
                        styles.studentChipText,
                        isSelected && styles.studentChipTextActive,
                      ]}
                    >
                      {s.registration.fullName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* CARD DE ESTADO VAZIO ELEGANTE */}
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={
                  hasNoStudents
                    ? "person-add-outline"
                    : isTrainer
                    ? "barbell-outline"
                    : "fitness-outline"
                }
                size={36}
                color="#D90000"
              />
            </View>

            <Text style={styles.emptyStateTitle}>
              {hasNoStudents
                ? "Nenhum Aluno Cadastrado"
                : isTrainer
                ? `Nenhum Treino para ${currentStudentName}`
                : "Nenhum Treino Disponível"}
            </Text>

            <Text style={styles.emptyStateDescription}>
              {hasNoStudents
                ? "Você ainda não possui alunos cadastrados na sua consultoria. Cadastre seu primeiro aluno para começar a prescrever e organizar treinos."
                : isTrainer
                ? `O aluno ${currentStudentName} ainda não possui um plano de treino ativo montado. Crie o primeiro treino para este aluno agora mesmo.`
                : "Seu personal trainer ainda está elaborando seu plano de treinos personalizado. Assim que estiver publicado, você poderá acompanhar e registrar suas execuções aqui."}
            </Text>

            {hasNoStudents ? (
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => router.push("/(tabs)/profile")}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={18} color="#000" />
                <Text style={styles.emptyActionButtonText}>
                  Cadastrar Novo Aluno
                </Text>
              </TouchableOpacity>
            ) : isTrainer ? (
              <View style={styles.emptyActionColumn}>
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={openCreateModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={18} color="#000" />
                  <Text style={styles.emptyActionButtonText}>
                    Criar Treino para {currentStudentName}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emptySecondaryButton}
                  onPress={() => router.push("/(tabs)/profile")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptySecondaryButtonText}>
                    Ver Todos os Alunos
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => router.push("/(tabs)/feedbacks")}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#000" />
                <Text style={styles.emptyActionButtonText}>
                  Falar com meu Personal
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <CreateSessionModal
          visible={createModalVisible}
          draft={draft}
          saving={saving}
          onChange={setDraft}
          onClose={() => setCreateModalVisible(false)}
          onSaveDraft={() => createSession("draft")}
          onPublishNow={() => createSession("now")}
          onSchedule={() => createSession("scheduled")}
        />

        <TrainerWorkoutEditor
          visible={workoutEditorVisible}
          studentName={currentStudentName}
          studentAvatar={currentStudent?.registration?.avatar}
          initialInfo={currentEditorInfo}
          initialSections={currentEditorSections}
          initialExercises={currentEditorExercises}
          onClose={() => setWorkoutEditorVisible(false)}
          onSave={saveWorkoutFromEditor}
          onDuplicate={duplicateSession}
        />
      </View>
    );
  }

  const isTrainer = (session?.user.role as string | undefined) === "TRAINER";
  const access = getStudentSessionAccess(selectedSession);
  const effectiveStatus = getSessionEffectiveStatus(selectedSession);
  const sessionAlerts = getSessionAlerts(selectedSession, dashboard.executions);
  const daysToExpiration = daysUntilTrainingDate(selectedVersion.validUntil);

  return (
    <View style={[styles.container, { paddingHorizontal: layout.horizontalPadding, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: layout.tabBarContentPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor="#D90000" />}
      >
        <View style={[styles.header, { marginTop: layout.topPadding }]}>
          <View style={styles.headerTop}>
            <Image source={require("@/assets/images/logo-principal.png")} style={styles.logo} resizeMode="contain" />
            <View style={styles.headerRight}>
              {isTrainer && (
                <TouchableOpacity
                  style={styles.trainerBackToStudentsPill}
                  onPress={() => setActiveStudentId(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people-outline" size={15} color="#D90000" />
                  <Text style={styles.trainerBackToStudentsPillText}>Alunos</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.exercisesButton} onPress={() => router.push("/exercises")}>
                <Ionicons name="list-outline" size={20} color="#D90000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.notificationContainer} onPress={() => router.push("/notifications")}>
                <Ionicons name="notifications-outline" size={20} color="#D90000" />
                {hasUnreadNotifications && <View style={styles.notificationBadge} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
                <UserAvatar uri={session?.user?.avatar} size={38} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {savedMessage ? (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#D90000" />
            <Text style={styles.savedText}>{savedMessage}</Text>
          </View>
        ) : null}

        <View style={styles.calendarHeader}>
          <Text style={[styles.monthText, { color: theme.text }]}>{formatMonth(selectedDate)}</Text>
          <TouchableOpacity onPress={() => setShowCalendar((value) => !value)}>
            <Ionicons name={showCalendar ? "calendar" : "calendar-outline"} size={20} color="#D90000" />
          </TouchableOpacity>
        </View>

        {showCalendar && (
          <View style={[styles.calendarContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.calendarHeader2}>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.cardSecondary }]} onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              onMonthChange={(month) => {
                setCurrentMonth(`${month.year}-${month.month.toString().padStart(2, "0")}`);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#D90000",
                  selectedTextColor: "#ffffff",
                },
                ...Object.fromEntries(
                  Array.from({ length: 31 }, (_, index) => {
                    const day = index + 1;
                    const dateStr = `${currentMonth}-${day.toString().padStart(2, "0")}`;
                    const workouts = getWorkoutForDay(day);
                    if (workouts.length === 0 || dateStr === selectedDate) return null;
                    return [dateStr, { marked: true, dots: [{ color: "#D90000" }] }];
                  }).filter((item): item is [string, { marked: true; dots: { color: string }[] }] => Boolean(item))
                ),
              }}
              markingType="multi-dot"
              theme={{
                backgroundColor: theme.card,
                calendarBackground: theme.card,
                textSectionTitleColor: "#D90000",
                selectedDayBackgroundColor: "#D90000",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#D90000",
                dayTextColor: theme.text,
                textDisabledColor: theme.textMuted,
                dotColor: "#D90000",
                selectedDotColor: "#ffffff",
                arrowColor: "#D90000",
                monthTextColor: theme.text,
                indicatorColor: "#D90000",
                textDayFontWeight: "600",
                textMonthFontWeight: "700",
                textDayHeaderFontWeight: "700",
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
              }}
              style={{ borderRadius: 16, paddingBottom: 10 }}
            />
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
          {Array.from({ length: 14 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index - 7);
            const dateString = date.toISOString().split("T")[0];
            const isSelected = dateString === selectedDate;
            const dayWorkouts = getWorkoutForDay(date.getDate());

            return (
              <TouchableOpacity key={dateString} style={styles.dayColumn} onPress={() => setSelectedDate(dateString)}>
                <Text style={[styles.dayLabel, { color: theme.textSecondary }, isSelected && styles.daySelectedText]}>{dayNames[date.getDay()]}</Text>
                <Text style={[styles.dayNumber, { color: theme.text }, isSelected && styles.daySelectedText]}>{date.getDate()}</Text>
                {dayWorkouts.length > 0 && (
                  <View style={styles.weekWorkoutIndicators}>
                    <View style={styles.weekEliteDot} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.progressCard}>
          <View style={styles.progressContent}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressTitle}>
                {selectedVersion?.name || selectedVersion?.identifier || "Progresso do Treino"}
              </Text>
              <Text style={styles.progressSubtitle}>
                {exercises.length === 0
                  ? "Nenhum exercício cadastrado"
                  : completedCount === exercises.length && exercises.length > 0
                  ? `${completedCount} de ${exercises.length} concluídos • 100% concluído 🏆`
                  : `${completedCount} de ${exercises.length} concluído(s) • ${progressPercent}% do treino`}
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressPercent > 0 ? `${Math.min(Math.max(progressPercent, 4), 100)}%` : "0%",
                    },
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sessionSelector}
          contentContainerStyle={styles.sessionSelectorContent}
        >
          {dashboard.sessions.map((session) => {
            const version = getActiveVersion(session);
            const active = session.id === selectedSession.id;
            return (
              <TouchableOpacity
                key={session.id}
                style={[styles.sessionChip, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, active && styles.sessionChipActive]}
                activeOpacity={0.75}
                onPress={() => setSelectedSessionId(session.id)}
              >
                <Text style={[styles.sessionChipText, { color: active ? "#ffffff" : theme.textSecondary }, active && styles.sessionChipTextActive]}>
                  {version.identifier ?? version.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.programCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, padding: 14 }]}>
          <View style={styles.programHeader}>
            <UserAvatar
              uri={dashboard.trainer?.avatar ?? ((session?.user.role as string | undefined) === "TRAINER" ? session?.user.avatar : undefined)}
              size={48}
              style={styles.trainerAvatar}
            />
            <View style={styles.programTextBlock}>
              <Text style={[styles.programTitle, { color: theme.text }]} numberOfLines={1}>
                {dashboard.trainer?.name ?? ((session?.user.role as string | undefined) === "TRAINER" ? session?.user.name : "Personal Trainer")}
              </Text>
              <Text style={[styles.programSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {selectedVersion.name || selectedVersion.identifier || "Treino do Dia"}
                {lastExecution ? ` • Ultima ${formatTrainingDateTime(lastExecution.startedAt)}` : ` • ${formatTrainingDate(selectedVersion.validFrom)}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setActionMenuVisible(true)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.sessionInfoRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getTrainingSessionStatusLabel(effectiveStatus)}</Text>
            </View>
            <Text style={[styles.sessionInfoText, { color: theme.textSecondary }]}>
              {selectedVersion.exercises.length} exercicio(s) • {selectedVersion.estimatedDurationMinutes} min • {progressPercent}% feito
            </Text>
          </View>

          <TouchableOpacity style={[styles.sessionButton, !access.canStart && styles.sessionButtonDisabled]} onPress={openSession}>
            <Text style={styles.sessionText}>{access.canStart ? "Comecar Sessao" : "Sessao indisponivel"}</Text>
          </TouchableOpacity>

          {!access.canStart && <Text style={[styles.unavailableText, { color: theme.textMuted }]}>{access.reason}</Text>}
        </View>

        <View style={styles.coachTitleContainer}>
          <Ionicons name="clipboard-outline" size={24} color="#D90000" />
          <View>
            <Text style={[styles.coachTitle, { color: theme.text }]}>Coach Instructions - Elite</Text>
            <Text style={[styles.coachSubtitle, { color: theme.textSecondary }]}>{selectedVersion.objective}</Text>
          </View>
        </View>

        <View style={[styles.coachCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, borderLeftColor: "#D90000", borderLeftWidth: 4 }]}>
          <Text style={[styles.coachText, { color: theme.text }]}>{selectedVersion.instructions ?? dashboard.plan.notes ?? "Execute a sessao mantendo controle tecnico."}</Text>

          <View style={[styles.tipsSection, { backgroundColor: isDark ? "#D900003f" : "rgba(217, 0, 0, 0.08)", borderColor: "#D90000" }]}>
            <Ionicons name="bulb-outline" size={16} color="#D90000" />
            <Text style={styles.tipsText}>
              Validade ate {formatTrainingDate(selectedVersion.validUntil)}
              {daysToExpiration !== null && daysToExpiration <= 15 ? ` • vence em ${Math.max(daysToExpiration, 0)} dia(s)` : ""}
            </Text>
          </View>
        </View>

        {sessionAlerts.map((alert) => (
          <View key={alert.id} style={[styles.alertCard, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Ionicons name={alert.tone === "danger" ? "alert-circle-outline" : "warning-outline"} size={17} color={alert.tone === "danger" ? "#ff4444" : "#D90000"} />
            <Text style={[styles.alertText, { color: theme.text }]}>{alert.title}: {alert.detail}</Text>
          </View>
        ))}

        {(() => {
          const sections = selectedVersion?.sections || [];

          const renderExerciseCard = (exercise: TrainingExercisePrescription) => (
            <TouchableOpacity
              key={exercise.id}
              style={[styles.modalExerciseCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }]}
              onPress={() =>
                router.push({
                  pathname: "/training-details" as never,
                  params: { sessionId: selectedSession.id },
                })
              }
            >
              <View style={styles.modalExerciseHeader}>
                <Ionicons name={getExerciseIcon(exercise.type)} size={20} color="#D90000" />
                <Text style={[styles.modalExerciseTitle, { color: theme.text }]}>{exercise.name}</Text>
                {exercise.combinationLabel && (
                  <View style={styles.previewComboBadge}>
                    <Text style={styles.previewComboBadgeText}>{exercise.combinationLabel}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.exerciseCheckbox,
                  {
                    borderColor: completedExercises[exercise.id] ? "#D90000" : theme.cardBorder,
                    backgroundColor: completedExercises[exercise.id] ? "#D90000" : theme.cardSecondary,
                  },
                  completedExercises[exercise.id] && styles.exerciseCheckboxActive,
                ]}
                onPress={() => toggleExercise(exercise.id)}
              >
                {completedExercises[exercise.id] && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </TouchableOpacity>
              <Text style={styles.modalExerciseDetails}>{formatExercisePrescription(exercise)}</Text>
              {!!exercise.observation && <Text style={[styles.modalExerciseNotes, { color: theme.textSecondary }]}>{exercise.observation}</Text>}
            </TouchableOpacity>
          );

          if (sections.length > 0) {
            return (
              <View style={{ gap: 10 }}>
                {sections.map((section) => {
                  const secExercises = exercises.filter((e) => e.sectionId === section.id);
                  if (secExercises.length === 0) return null;
                  const isAerobic =
                    section.title.toLowerCase().includes("aerób") ||
                    section.title.toLowerCase().includes("aerob") ||
                    section.title.toLowerCase().includes("cardio") ||
                    section.title.toLowerCase().includes("protocolo");

                  return (
                    <View key={`sec-block-${section.id}`} style={{ marginBottom: 12 }}>
                      <View style={styles.studentSectionHeader}>
                        <View style={styles.studentSectionHeaderLeft}>
                          <View style={styles.studentSectionAccentPill} />
                          <View style={styles.studentSectionIconBox}>
                            <Ionicons name={getSectionIcon(section.title, section.icon)} size={13} color="#FFFFFF" />
                          </View>
                          <Text style={styles.studentSectionTitle} numberOfLines={1}>
                            {isAerobic ? "PROTOCOLO AERÓBIO" : section.title}
                          </Text>
                          {isAerobic && (
                            <View style={styles.sectionDateBadge}>
                              <Ionicons name="calendar-outline" size={11} color="#A1A1AA" />
                              <Text style={styles.sectionDateBadgeText}>
                                Início: {formatTrainingDate(selectedVersion?.validFrom || new Date().toISOString())}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.studentSectionCountBadge}>
                          <Text style={styles.studentSectionCountBadgeText}>{secExercises.length}</Text>
                        </View>
                      </View>

                      {isAerobic && (
                        <View style={styles.aerobicObservationCard}>
                          <View style={styles.aerobicObservationHeader}>
                            <Ionicons name="repeat" size={13} color="#D90000" />
                            <Text style={styles.aerobicObservationTitle}>Observação do Treinador:</Text>
                          </View>
                          <Text style={styles.aerobicObservationText}>
                            O protocolo será atualizado a cada 2 semanas se forem feitos 2 vezes cada treino.
                          </Text>
                        </View>
                      )}

                      <View style={{ gap: 8 }}>
                        {secExercises.map(renderExerciseCard)}
                      </View>
                    </View>
                  );
                })}

                {/* Exercícios sem seção atribuída */}
                {(() => {
                  const unassigned = exercises.filter(
                    (e) => !e.sectionId || !sections.some((s) => s.id === e.sectionId)
                  );
                  if (unassigned.length === 0) return null;
                  return (
                    <View style={{ marginBottom: 12 }}>
                      <View style={styles.studentSectionHeader}>
                        <View style={styles.studentSectionHeaderLeft}>
                          <View style={styles.studentSectionAccentPill} />
                          <View style={styles.studentSectionIconBox}>
                            <Ionicons name="barbell" size={13} color="#FFFFFF" />
                          </View>
                          <Text style={styles.studentSectionTitle} numberOfLines={1}>Outros Exercícios</Text>
                        </View>
                        <View style={styles.studentSectionCountBadge}>
                          <Text style={styles.studentSectionCountBadgeText}>{unassigned.length}</Text>
                        </View>
                      </View>
                      <View style={{ gap: 8 }}>
                        {unassigned.map(renderExerciseCard)}
                      </View>
                    </View>
                  );
                })()}
              </View>
            );
          }

          return (
            <View style={{ gap: 8 }}>
              {exercises.map(renderExerciseCard)}
            </View>
          );
        })()}

        {historyVisible && <HistoryPanel executions={dashboard.executions} />}
        {loadsVisible && <LoadsPanel summaries={loadSummaries} />}
      </ScrollView>

      <ActionMenu
        visible={actionMenuVisible}
        perspective={perspective}
        canManage={(session?.user.role as string | undefined) === "TRAINER"}
        saving={saving}
        onClose={() => setActionMenuVisible(false)}
        onCreate={openCreateModal}
        onDuplicate={duplicateSession}
        onPublish={publishSession}
        onBlock={() => changeStatus("bloqueado", "Bloqueada temporariamente pelo treinador.")}
        onPause={() => changeStatus("pausado", "Pausada para ajuste da prescricao.")}
        onRelease={() => changeStatus("liberado", "Liberada novamente ao aluno.")}
        onExtend={extendSession}
        onArchive={() => changeStatus("arquivado", "Arquivada preservando historico e execucoes.")}
        onExportPdf={handleExportCurrentSessionPdf}
        onOpenFullEditor={() => {
          setActionMenuVisible(false);
          setWorkoutEditorVisible(true);
        }}
        onTogglePerspective={() => {
          const next = perspective === "student" ? "trainer" : "student";
          setActionMenuVisible(false);
          setPerspectiveAndReload(next);
        }}
        onHistory={() => {
          setHistoryVisible((value) => !value);
          setActionMenuVisible(false);
        }}
        onLoads={() => {
          setLoadsVisible((value) => !value);
          setActionMenuVisible(false);
        }}
      />

      <CreateSessionModal
        visible={createModalVisible}
        draft={draft}
        saving={saving}
        onChange={setDraft}
        onClose={() => setCreateModalVisible(false)}
        onSaveDraft={() => createSession("draft")}
        onPublishNow={() => createSession("now")}
        onSchedule={() => createSession("scheduled")}
      />

      <TrainerWorkoutEditor
        visible={workoutEditorVisible}
        studentName={currentStudentName}
        studentAvatar={currentStudent?.registration?.avatar}
        initialInfo={currentEditorInfo}
        initialSections={currentEditorSections}
        initialExercises={currentEditorExercises}
        onClose={() => setWorkoutEditorVisible(false)}
        onSave={saveWorkoutFromEditor}
        onDuplicate={duplicateSession}
      />
    </View>
  );
}

const WORKOUT_COVER_IMAGES: Record<string, string> = {
  peito: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop&q=80",
  peitoral: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop&q=80",
  costas: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&auto=format&fit=crop&q=80",
  dorsal: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&auto=format&fit=crop&q=80",
  perna: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&auto=format&fit=crop&q=80",
  pernas: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&auto=format&fit=crop&q=80",
  quadriceps: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&auto=format&fit=crop&q=80",
  posterior: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&auto=format&fit=crop&q=80",
  posteriors: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&auto=format&fit=crop&q=80",
  gluteo: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=80",
  gluteos: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=80",
  ombro: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&auto=format&fit=crop&q=80",
  ombros: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&auto=format&fit=crop&q=80",
  deltoide: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&auto=format&fit=crop&q=80",
  deltoides: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&auto=format&fit=crop&q=80",
  biceps: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80",
  triceps: "https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=400&auto=format&fit=crop&q=80",
  braco: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80",
  bracos: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80",
  core: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&auto=format&fit=crop&q=80",
  abs: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&auto=format&fit=crop&q=80",
  abdomen: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&auto=format&fit=crop&q=80",
  mobilidade: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=80",
  recuperacao: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=80",
  alongamento: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=80",
  cardio: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&auto=format&fit=crop&q=80",
  corrida: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&auto=format&fit=crop&q=80",
  condicionamento: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80",
  forca: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=80",
  hipertrofia: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=80",
};

function getWorkoutThumbnail(version: TrainingSessionVersion): string {
  if (version.coverUrl && version.coverUrl.trim() !== "") {
    return version.coverUrl;
  }

  if (version.exercises && version.exercises.length > 0) {
    const exerciseWithThumb = version.exercises.find(
      (ex) => ex.thumbnailUrl && ex.thumbnailUrl.trim() !== ""
    );
    if (exerciseWithThumb?.thumbnailUrl) {
      return exerciseWithThumb.thumbnailUrl;
    }
  }

  const textToMatch = `${version.name || ""} ${version.identifier || ""} ${(version.muscleGroups || []).join(" ")} ${version.objective || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const [key, url] of Object.entries(WORKOUT_COVER_IMAGES)) {
    if (key !== "default" && textToMatch.includes(key)) {
      return url;
    }
  }

  return WORKOUT_COVER_IMAGES.default;
}

function getSessionStatusTheme(status: TrainingSessionStatus) {
  switch (status) {
    case "liberado":
      return {
        color: "#22c55e",
        borderColor: "rgba(34, 197, 94, 0.3)",
        bgColor: "rgba(34, 197, 94, 0.08)",
      };
    case "programado":
      return {
        color: "#f59e0b",
        borderColor: "rgba(245, 158, 11, 0.3)",
        bgColor: "rgba(245, 158, 11, 0.08)",
      };
    case "bloqueado":
    case "vencido":
      return {
        color: "#ef4444",
        borderColor: "rgba(239, 68, 68, 0.3)",
        bgColor: "rgba(239, 68, 68, 0.08)",
      };
    case "rascunho":
    case "pausado":
    default:
      return {
        color: "#888888",
        borderColor: "rgba(136, 136, 136, 0.25)",
        bgColor: "rgba(255, 255, 255, 0.04)",
      };
  }
}

function TrainerSessionsListScreen({
  layout,
  currentStudentName,
  pageData,
  loading,
  onRefresh,
  onPrevPage,
  onNextPage,
  onCreateNew,
  onOpenSession,
  onDuplicateSession,
  onDeleteSession,
  onBackToStudents,
}: {
  layout: ReturnType<typeof useResponsiveLayout>;
  currentStudentName: string;
  pageData: TrainingSessionsPage | null;
  loading: boolean;
  onRefresh: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onCreateNew: () => void;
  onOpenSession: (id: string) => void;
  onDuplicateSession: (id: string) => void;
  onDeleteSession: (id: string, name: string) => void;
  onBackToStudents?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const topInset = insets.top > 0 ? insets.top + 8 : Platform.OS === "ios" ? 52 : 20;
  const [sessionSearch, setSessionSearch] = useState("");

  const totalSessions = pageData?.total ?? 0;
  const activeSessionsCount =
    pageData?.items?.filter((i) => getSessionEffectiveStatus(i) === "liberado").length ?? totalSessions;
  const firstDuration = pageData?.items?.[0]
    ? getActiveVersion(pageData.items[0])?.estimatedDurationMinutes || 60
    : 60;

  const filteredItems = useMemo(() => {
    if (!pageData?.items) return [];
    if (!sessionSearch.trim()) return pageData.items;
    const q = sessionSearch.toLowerCase();
    return pageData.items.filter((item) => {
      const v = getActiveVersion(item);
      return v.name?.toLowerCase().includes(q) || v.identifier?.toLowerCase().includes(q);
    });
  }, [pageData?.items, sessionSearch]);

  return (
    <View style={[styles.container, { flex: 1 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* 1. TOP BAR PADRONIZADA */}
      <View style={[styles.headerBar, { paddingTop: topInset, paddingHorizontal: layout.horizontalPadding }]}>
        {onBackToStudents ? (
          <TouchableOpacity
            style={[styles.headerActionButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={onBackToStudents}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActionPlaceholder} />
        )}

        <Text style={styles.headerTitle} numberOfLines={1}>
          Treinos de {currentStudentName.split(" ")[0]}
        </Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={onRefresh}
            activeOpacity={0.8}
            hitSlop={6}
          >
            <Ionicons name="filter" size={18} color="#D90000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={onCreateNew}
            activeOpacity={0.8}
            hitSlop={6}
          >
            <Ionicons name="add" size={20} color="#D90000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.sessionsListContent,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding + 20,
            paddingTop: 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#D90000" />}
      >
        {/* 2. SUMMARY / HERO CARD PADRONIZADO */}
        <View style={styles.summaryCard}>
          <Image
            source={require("@/assets/images/logo-white.png")}
            style={styles.heroWatermark}
            resizeMode="contain"
          />
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryEyebrow} numberOfLines={1}>ALUNO ATIVO</Text>
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {totalSessions} {totalSessions === 1 ? "treino" : "treinos"}
              </Text>
              <Text style={styles.summarySubtitle} numberOfLines={1}>
                Prescrições oficiais de {currentStudentName}
              </Text>
            </View>
            <TouchableOpacity style={styles.summaryAction} onPress={onCreateNew} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.summaryActionText} numberOfLines={1}>Novo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.metricPill}>
              <View style={styles.metricTopRow}>
                <Ionicons name="barbell-outline" size={15} color="rgba(255, 255, 255, 0.85)" />
                <Text style={styles.metricValue} numberOfLines={1}>{activeSessionsCount}</Text>
              </View>
              <Text style={styles.metricLabel} numberOfLines={1}>ATIVOS</Text>
            </View>

            <View style={styles.metricPill}>
              <View style={styles.metricTopRow}>
                <Ionicons name="time-outline" size={15} color="rgba(255, 255, 255, 0.85)" />
                <Text style={styles.metricValue} numberOfLines={1}>{firstDuration}m</Text>
              </View>
              <Text style={styles.metricLabel} numberOfLines={1}>MÉDIA</Text>
            </View>

            <View style={styles.metricPill}>
              <View style={styles.metricTopRow}>
                <Ionicons name="calendar-outline" size={15} color="rgba(255, 255, 255, 0.85)" />
                <Text style={styles.metricValue} numberOfLines={1}>{totalSessions}</Text>
              </View>
              <Text style={styles.metricLabel} numberOfLines={1}>SESSÕES</Text>
            </View>
          </View>
        </View>

        {/* 3. SEARCH BOX */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#D90000" />
          <TextInput
            style={styles.searchInput}
            value={sessionSearch}
            onChangeText={setSessionSearch}
            placeholder="Buscar por nome do treino ou identificador"
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
          {sessionSearch ? (
            <TouchableOpacity onPress={() => setSessionSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 4. CONTEÚDO */}
        {loading && !pageData ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#D90000" />
            <Text style={styles.centerText}>Carregando treinos...</Text>
          </View>
        ) : !pageData || pageData.items.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 20 }}>
            <View style={styles.emptyCard}>
              <Ionicons name="barbell-outline" size={42} color="#D90000" />
              <Text style={styles.centerTitle}>Nenhum treino cadastrado</Text>
              <Text style={styles.centerText}>Crie o primeiro treino para {currentStudentName}.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={onCreateNew} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Criar Treino</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredItems.map((item) => {
              const version = getActiveVersion(item);
              const effectiveStatus = getSessionEffectiveStatus(item);
              const statusTheme = getSessionStatusTheme(effectiveStatus);
              const thumbUrl = getWorkoutThumbnail(version);
              const exerciseCount = version.exercises?.length ?? 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.workoutCard}
                  onPress={() => onOpenSession(item.id)}
                  activeOpacity={0.85}
                >
                  {/* Top: Header Info with Thumbnail, Title, Status & Chevron */}
                  <View style={styles.workoutCardTop}>
                    <View style={styles.workoutThumbContainer}>
                      <Image
                        source={{ uri: thumbUrl }}
                        style={styles.workoutThumbImage}
                        resizeMode="cover"
                      />
                    </View>

                    <View style={styles.workoutCardMainContent}>
                      <View style={styles.workoutCardTitleRow}>
                        <Text style={styles.workoutCardTitle} numberOfLines={1}>
                          {version.name || version.identifier || "Treino"}
                        </Text>

                        <View
                          style={[
                            styles.workoutStatusBadge,
                            {
                              backgroundColor: statusTheme.bgColor,
                              borderColor: statusTheme.borderColor,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.workoutStatusDot,
                              { backgroundColor: statusTheme.color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.workoutStatusText,
                              { color: statusTheme.color },
                            ]}
                          >
                            {getTrainingSessionStatusLabel(effectiveStatus)}
                          </Text>
                        </View>
                      </View>

                      {/* Clean Stats Subtitle */}
                      <View style={styles.workoutCardStatsRow}>
                        <View style={styles.workoutStatItem}>
                          <Ionicons name="barbell-outline" size={13} color="#D90000" />
                          <Text style={styles.workoutStatItemText}>
                            {exerciseCount} {exerciseCount === 1 ? "exercício" : "exercícios"}
                          </Text>
                        </View>

                        {version.estimatedDurationMinutes ? (
                          <>
                            <Text style={styles.workoutStatSeparator}>•</Text>
                            <View style={styles.workoutStatItem}>
                              <Ionicons name="time-outline" size={13} color="#888888" />
                              <Text style={styles.workoutStatItemText}>
                                {version.estimatedDurationMinutes} min
                              </Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color="#555555" />
                  </View>

                  {/* Single Clean Schedule Bar */}
                  <View style={styles.workoutScheduleStrip}>
                    <View style={styles.workoutScheduleLeft}>
                      <Ionicons name="calendar-outline" size={12} color="#D90000" />
                      <Text style={styles.workoutScheduleLabel}>Vigência:</Text>
                      <Text style={styles.workoutScheduleDates}>
                        {formatTrainingDate(version.validFrom)} até {formatTrainingDate(version.validUntil)}
                      </Text>
                    </View>

                    {version.identifier && version.identifier !== version.name && (
                      <View style={styles.workoutIdBadge}>
                        <Text style={styles.workoutIdBadgeText}>{version.identifier}</Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom: Modern Action Buttons */}
                  <View style={styles.workoutCardActions}>
                    <TouchableOpacity
                      style={styles.workoutActionBtn}
                      onPress={() => onOpenSession(item.id)}
                      activeOpacity={0.75}
                      hitSlop={4}
                    >
                      <Ionicons name="create-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.workoutActionText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.workoutActionBtn}
                      onPress={() => onDuplicateSession(item.id)}
                      activeOpacity={0.75}
                      hitSlop={4}
                    >
                      <Ionicons name="copy-outline" size={13} color="#CCCCCC" />
                      <Text style={styles.workoutActionText}>Duplicar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.workoutActionBtn, styles.workoutActionDeleteBtn]}
                      onPress={() => onDeleteSession(item.id, version.name)}
                      activeOpacity={0.75}
                      hitSlop={4}
                    >
                      <Ionicons name="trash-outline" size={13} color="#FF5A5A" />
                      <Text style={[styles.workoutActionText, { color: "#FF5A5A" }]}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {pageData && pageData.totalPages > 1 && (
          <View style={styles.sessionsPaginationRow}>
            <TouchableOpacity
              style={[styles.sessionsPaginationBtn, pageData.page <= 1 && styles.sessionsPaginationBtnDisabled]}
              onPress={onPrevPage}
              disabled={pageData.page <= 1}
            >
              <Text style={styles.sessionsPaginationText}>Anterior</Text>
            </TouchableOpacity>
            <Text style={styles.sessionsPaginationLabel}>
              Página {pageData.page} de {pageData.totalPages}
            </Text>
            <TouchableOpacity
              style={[
                styles.sessionsPaginationBtn,
                pageData.page >= pageData.totalPages && styles.sessionsPaginationBtnDisabled,
              ]}
              onPress={onNextPage}
              disabled={pageData.page >= pageData.totalPages}
            >
              <Text style={styles.sessionsPaginationText}>Próxima</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HistoryPanel({ executions }: { executions: TrainingExecution[] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Historico de sessoes</Text>
      {executions.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma execucao registrada.</Text>
      ) : (
        executions.slice(0, 6).map((execution) => (
          <View key={execution.id} style={styles.historyRow}>
            <Ionicons name={execution.status === "completed" ? "checkmark-circle-outline" : "pause-circle-outline"} size={18} color="#D90000" />
            <View style={styles.historyTextBlock}>
              <Text style={styles.historyTitle}>{execution.snapshot.name}</Text>
              <Text style={styles.historyDetail}>
                {formatTrainingDateTime(execution.startedAt)} • v{execution.snapshot.version}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function LoadsPanel({ summaries }: { summaries: ReturnType<typeof buildTrainingLoadSummaries> }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Evolucao de cargas</Text>
      {summaries.length === 0 ? (
        <Text style={styles.emptyText}>Dados insuficientes para tendencia.</Text>
      ) : (
        summaries.map((summary) => (
          <View key={summary.id} style={styles.historyRow}>
            <Ionicons name={summary.hasPainAlert ? "alert-circle-outline" : "analytics-outline"} size={18} color={summary.hasPainAlert ? "#ff4444" : "#D90000"} />
            <View style={styles.historyTextBlock}>
              <Text style={styles.historyTitle}>{summary.exerciseName}</Text>
              <Text style={styles.historyDetail}>
                {summary.compatibleRecords} registro(s) • {summary.trendLabel}
              </Text>
            </View>
            <Text style={styles.loadValue}>{summary.bestLoad ?? "-"}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function ActionMenu({
  visible,
  perspective,
  canManage,
  saving,
  onClose,
  onCreate,
  onDuplicate,
  onPublish,
  onBlock,
  onPause,
  onRelease,
  onExtend,
  onArchive,
  onExportPdf,
  onOpenFullEditor,
  onTogglePerspective,
  onHistory,
  onLoads,
}: {
  visible: boolean;
  perspective: Perspective;
  canManage: boolean;
  saving: boolean;
  onClose: () => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
  onBlock: () => void;
  onPause: () => void;
  onRelease: () => void;
  onExtend: () => void;
  onArchive: () => void;
  onExportPdf?: () => void;
  onOpenFullEditor?: () => void;
  onTogglePerspective: () => void;
  onHistory: () => void;
  onLoads: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.actionSheet}>
          <Text style={styles.actionTitle}>Acoes da sessao</Text>
          {canManage ? (
            <>
              {onOpenFullEditor && (
                <MenuAction icon="construct-outline" label="Montar/Editar Treino (5 Abas)" onPress={onOpenFullEditor} disabled={saving} />
              )}
              {onExportPdf && (
                <MenuAction icon="document-text-outline" label="Mandar Treino em PDF" onPress={onExportPdf} disabled={saving} />
              )}
              <MenuAction icon="person-outline" label={perspective === "student" ? "Modo treinador" : "Visao aluno"} onPress={onTogglePerspective} />
              <MenuAction icon="add-circle-outline" label="Criar sessao" onPress={onCreate} disabled={saving} />
              <MenuAction icon="copy-outline" label="Duplicar como rascunho" onPress={onDuplicate} disabled={saving} />
              <MenuAction icon="lock-open-outline" label="Liberar/Publicar" onPress={onPublish} disabled={saving} />
              <MenuAction icon="lock-closed-outline" label="Bloquear" onPress={onBlock} disabled={saving} />
              <MenuAction icon="pause-outline" label="Pausar" onPress={onPause} disabled={saving} />
              <MenuAction icon="checkmark-circle-outline" label="Liberar novamente" onPress={onRelease} disabled={saving} />
              <MenuAction icon="calendar-outline" label="Prorrogar 3 meses" onPress={onExtend} disabled={saving} />
            </>
          ) : null}
          <MenuAction icon="time-outline" label="Historico" onPress={onHistory} />
          <MenuAction icon="analytics-outline" label="Evolucao de cargas" onPress={onLoads} />
          {canManage ? <MenuAction icon="archive-outline" label="Arquivar" onPress={onArchive} disabled={saving} danger /> : null}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function MenuAction({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuAction, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={19} color={danger ? "#ff4444" : "#D90000"} />
      <Text style={[styles.menuActionText, danger && styles.menuActionTextDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CreateSessionModal({
  visible,
  draft,
  saving,
  onChange,
  onClose,
  onSaveDraft,
  onPublishNow,
  onSchedule,
}: {
  visible: boolean;
  draft: SessionDraftForm;
  saving: boolean;
  onChange: (next: SessionDraftForm) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onPublishNow: () => void;
  onSchedule: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.createModal}>
        <View style={styles.createHeader}>
          <TouchableOpacity style={styles.exercisesButton} onPress={onClose}>
            <Ionicons name="close" size={20} color="#D90000" />
          </TouchableOpacity>
          <Text style={styles.createTitle}>Nova sessao</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.createContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <FormField label="Nome da sessao" value={draft.name} onChangeText={(name) => onChange({ ...draft, name })} />
          <FormField label="Identificacao" value={draft.identifier} placeholder="Treino A, Mobilidade..." onChangeText={(identifier) => onChange({ ...draft, identifier })} />
          <FormField label="Objetivo" value={draft.objective} onChangeText={(objective) => onChange({ ...draft, objective })} />
          <FormField label="Descricao" value={draft.description} multiline onChangeText={(description) => onChange({ ...draft, description })} />
          <FormField label="Grupos musculares" value={draft.muscleGroups} placeholder="Peito, ombros, triceps" onChangeText={(muscleGroups) => onChange({ ...draft, muscleGroups })} />
          <FormField label="Duracao estimada" value={draft.estimatedDurationMinutes} keyboardType="numeric" onChangeText={(estimatedDurationMinutes) => onChange({ ...draft, estimatedDurationMinutes })} />
          <FormField label="Vencimento" value={draft.validUntil} placeholder="00/00/0000" keyboardType="numeric" onChangeText={(validUntil) => onChange({ ...draft, validUntil: formatDateInput(validUntil) })} />
          <FormField label="Dias recomendados" value={draft.recommendedDays} onChangeText={(recommendedDays) => onChange({ ...draft, recommendedDays })} />
          <FormField label="Instrucoes gerais" value={draft.instructions} multiline onChangeText={(instructions) => onChange({ ...draft, instructions })} />
          <FormField label="Liberar em" value={draft.releaseAt} placeholder="00/00/0000" keyboardType="numeric" onChangeText={(releaseAt) => onChange({ ...draft, releaseAt: formatDateInput(releaseAt) })} />

          <TouchableOpacity
            style={styles.supervisionRow}
            onPress={() => onChange({ ...draft, requiresSupervision: !draft.requiresSupervision })}
          >
            <Ionicons name={draft.requiresSupervision ? "checkbox" : "square-outline"} size={22} color="#D90000" />
            <Text style={styles.supervisionText}>Exige supervisao do treinador</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={onSaveDraft} disabled={saving}>
            <Text style={styles.outlineButtonText}>Salvar rascunho</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={onSchedule} disabled={saving}>
            <Text style={styles.outlineButtonText}>Programar liberacao</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sessionButton} onPress={onPublishNow} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.sessionText}>Liberar agora</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && styles.formInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#666"
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function getExerciseIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "aerobic") return "heart-outline";
  if (type === "mobility" || type === "cooldown") return "body-outline";
  if (type === "accessory") return "fitness-outline";
  return "barbell-outline";
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
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
    fontWeight: "800",
  },
  header: {
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
    backgroundColor: "#D900003f",
    borderWidth: 1,
    borderColor: "#D90000",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D900003f",
    borderWidth: 1,
    borderColor: "#D90000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4444",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#D90000",
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  savedText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
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
  daySelectedText: {
    color: "#D90000",
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
    backgroundColor: "#D90000",
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
    backgroundColor: "#D90000",
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
    color: "#fff",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#FFFFFF",
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
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sessionSelector: {
    marginTop: 18,
    marginBottom: 6,
  },
  sessionSelectorContent: {
    gap: 8,
    paddingRight: 20,
  },
  sessionChip: {
    height: 38,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sessionChipText: {
    color: "#8e8e8e",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  sessionChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  programCard: {
    borderRadius: 15,
    marginTop: 18,
  },
  programHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trainerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#D90000",
    marginRight: 12,
  },
  programTextBlock: {
    flex: 1,
  },
  programTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  programSub: {
    color: "#a6a6a6",
    fontSize: 12,
    marginTop: 2,
  },
  sessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  statusBadge: {
    backgroundColor: "#D900003f",
    borderWidth: 1,
    borderColor: "#D90000",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusBadgeText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  sessionInfoText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  sessionButton: {
    backgroundColor: "#D90000",
    borderRadius: 15,
    paddingVertical: 15,
    marginTop: 15,
  },
  sessionButtonDisabled: {
    opacity: 0.55,
  },
  sessionText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  unavailableText: {
    color: "#888",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
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
    borderLeftColor: "#D90000",
    marginBottom: 20,
  },
  coachText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  tipsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D900003f",
    padding: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#D90000",
  },
  tipsText: {
    color: "#D90000",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 12,
    marginBottom: 10,
  },
  alertText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    lineHeight: 17,
  },
  studentSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  studentSectionHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studentSectionAccentPill: {
    width: 2.5,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    borderRadius: 1.5,
  },
  studentSectionIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  studentSectionTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.15,
    flex: 1,
  },
  studentSectionCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  studentSectionCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  sectionDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginLeft: 6,
  },
  sectionDateBadgeText: {
    color: "#D4D4D8",
    fontSize: 11,
    fontWeight: "700",
  },
  aerobicObservationCard: {
    backgroundColor: "#16161B",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262630",
    borderLeftWidth: 3,
    borderLeftColor: "#D90000",
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 4,
  },
  aerobicObservationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aerobicObservationTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  aerobicObservationText: {
    color: "#D4D4D8",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  previewComboBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  previewComboBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
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
    paddingRight: 34,
  },
  modalExerciseDetails: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalExerciseNotes: {
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
  exerciseCheckbox: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D90000",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseCheckboxActive: {
    backgroundColor: "#D90000",
  },
  panel: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
  },
  panelTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  historyTextBlock: {
    flex: 1,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  historyDetail: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  loadValue: {
    color: "#D90000",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: "#999",
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
    padding: 20,
  },
  actionSheet: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    gap: 4,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  menuAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  menuActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  menuActionTextDanger: {
    color: "#ff4444",
  },
  disabled: {
    opacity: 0.45,
  },
  createModal: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  createHeader: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#242424",
  },
  createTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  createContent: {
    padding: 20,
    paddingBottom: 70,
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    color: "#999",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  formInput: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#fff",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
  },
  formInputMultiline: {
    minHeight: 88,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  supervisionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginBottom: 14,
  },
  supervisionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  outlineButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  outlineButtonText: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "900",
  },
  studentChipsScroll: {
    marginBottom: 16,
  },
  studentChipsContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
  },
  studentChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#FF2B2B",
  },
  studentChipText: {
    color: "#AAAAAA",
    fontSize: 13,
    fontWeight: "700",
  },
  studentChipTextActive: {
    color: "#000000",
    fontWeight: "800",
  },
  emptyStateCard: {
    backgroundColor: "#141414",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginHorizontal: 4,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(217, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyStateTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyStateDescription: {
    color: "#999999",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  emptyActionColumn: {
    width: "100%",
    gap: 10,
  },
  emptyActionButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#D90000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyActionButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
  },
  emptySecondaryButton: {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySecondaryButtonText: {
    color: "#CCCCCC",
    fontSize: 13.5,
    fontWeight: "700",
  },

  /* Trainer Student Bar */
  trainerStudentBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    gap: 8,
  },
  trainerBackToStudentsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#201414",
    borderWidth: 1,
    borderColor: "#4A1818",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  trainerBackToStudentsPillText: {
    color: "#D90000",
    fontSize: 11.5,
    fontWeight: "800",
  },
  trainerStudentBarDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#2A2A2A",
  },
  trainerStudentBarLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  studentPickerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  studentPickerSubtitle: {
    color: "#999",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  studentPickerList: {
    paddingBottom: 40,
    gap: 10,
  },
  studentPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
  },
  avatarWrapper: {
    position: "relative",
  },
  studentPickerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#262626",
  },
  avatarOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#141414",
  },
  studentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  studentPickerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  studentGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  studentPickerSub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  studentTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  microChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  microChipText: {
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "700",
  },
  actionArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  /* Header Bar Padrão */
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  headerTitle: {
    color: "#D90000",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionPlaceholder: {
    width: 38,
  },

  /* Summary Hero Card Padrão */
  summaryCard: {
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 13,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
  },
  heroWatermark: {
    position: "absolute",
    right: -12,
    top: -12,
    width: 120,
    height: 120,
    opacity: 0.04,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryEyebrow: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.2,
  },
  summarySubtitle: {
    color: "#999999",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  summaryAction: {
    minHeight: 34,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: "#D90000",
    borderWidth: 1,
    borderColor: "#B30000",
    flexShrink: 0,
  },
  summaryActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  summaryStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  metricPill: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#262626",
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 2,
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  metricLabel: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  searchBox: {
    height: 38,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 4,
  },
  studentSwitcherWrapper: {
    marginTop: 4,
    marginBottom: 8,
  },
  sessionsListContent: {
    paddingTop: 6,
    gap: 8,
  },
  workoutCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 10,
  },
  workoutCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutThumbContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  workoutThumbImage: {
    width: "100%",
    height: "100%",
  },
  workoutCardMainContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  workoutCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  workoutCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    flex: 1,
  },
  workoutStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  workoutStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  workoutStatusText: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  workoutCardStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  workoutStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  workoutStatItemText: {
    color: "#aaaaaa",
    fontSize: 12,
    fontWeight: "700",
  },
  workoutStatSeparator: {
    color: "#444444",
    fontSize: 12,
    fontWeight: "900",
  },
  workoutScheduleStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0e0e0e",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  workoutScheduleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  workoutScheduleLabel: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "700",
  },
  workoutScheduleDates: {
    color: "#cccccc",
    fontSize: 11,
    fontWeight: "800",
  },
  workoutIdBadge: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  workoutIdBadgeText: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
  },
  workoutCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1c1c1c",
  },
  workoutActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#181818",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 7,
  },
  workoutActionDeleteBtn: {
    backgroundColor: "rgba(255, 90, 90, 0.08)",
    borderColor: "rgba(255, 90, 90, 0.25)",
  },
  workoutActionText: {
    color: "#dddddd",
    fontSize: 11.5,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    alignItems: "center",
    padding: 24,
    width: "100%",
  },
  sessionsPaginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 24,
  },
  sessionsPaginationBtn: {
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sessionsPaginationBtnDisabled: {
    opacity: 0.4,
  },
  sessionsPaginationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  sessionsPaginationLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
});
