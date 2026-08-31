import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardTypeOptions,
} from "react-native";

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useTrainerBranding } from "@/hooks/use-trainer-branding";
import { TrainerBrandingModal } from "@/components/trainer-branding-modal";
import {
  getSubscriptionForUser,
  validateStudentAdditionAllowed,
  SubscriptionRecord,
} from "@/services/subscription-service";
import { PaywallModal } from "@/components/PaywallModal";
import {
  PhysicalAssessment,
  formatAssessmentDate,
  getAssessmentStatusLabel,
  getAssessmentTypeLabel,
  listAssessmentsForStudent,
} from "@/services/assessment-store";
import { signOut } from "@/services/auth-store";
import {
  TrainingFeedback,
  listFeedbacksForStudent,
} from "@/services/feedback-store";
import {
  ANAMNESIS_STEPS,
  STUDENT_STATUS_OPTIONS,
  StudentProfile,
  StudentProfileSection,
  StudentRegistration,
  StudentStatus,
  buildLoadEvolutionInsights,
  buildStudentAlerts,
  calculateAdherence,
  calculateAge,
  calculateFollowUpDuration,
  cancelAnamnesisInvite,
  createStudentProfile,
  daysSince,
  daysUntil,
  formatDateInput,
  formatPhoneInput,
  formatProfileDate,
  formatProfileDateTime,
  formatRelativeDayCount,
  generateAnamnesisInvite,
  getAnamnesisStatusLabel,
  getLatestAnamnesisVersion,
  getStudentProfile,
  getStudentStatusLabel,
  getWhatsAppUrl,
  markAnamnesisReviewed,
  parseDateString,
  requestAnamnesisUpdate,
  revokeStudentSessions,
  saveStudentRegistration,
  sendAnamnesisReminder,
  updateStudentStatus,
  validateRegistration,
} from "@/services/student-profile-store";
import {
  STUDENT_FILTER_LABELS,
  TrainerHomeDashboard,
  TrainerHomeRoute,
  TrainerHomeStudentFilter,
  TrainerHomeStudentSummary,
  getTrainerHomeDashboard,
  sortTrainerHomeStudents,
  studentMatchesHomeFilter,
} from "@/services/trainer-home-store";
import { TrainerStudentHubView } from "@/components/trainer-student-hub-view";

type LoadMetric = "volume" | "load" | "effort";

const SECTION_LABELS: Record<StudentProfileSection, string> = {
  registration: "Dados cadastrais",
  anamnesis: "Anamnese",
  assessments: "Avaliacoes",
  workouts: "Treinos",
  frequency: "Frequencia",
  feedbacks: "Feedbacks",
  loads: "Evolucao de desempenho",
  body: "Evolucao corporal",
  diet: "Dieta & Nutrição",
  messages: "Mensagens",
  documents: "Documentos",
  notes: "Observacoes",
  access: "Acesso",
};

type TrainerProfileShortcut = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: (dashboard: TrainerHomeDashboard) => number;
};

const TRAINER_PROFILE_SHORTCUTS: TrainerProfileShortcut[] = [
  {
    id: "agenda",
    label: "Agenda",
    icon: "calendar-outline",
    route: "/trainer-agenda",
    badge: (dashboard) =>
      dashboard.today.find((item) => item.id === "appointments")?.value ?? 0,
  },
  {
    id: "reassessments",
    label: "Reavaliações",
    icon: "calendar-number-outline",
    route: "/trainer-reassessments",
    badge: (dashboard) => dashboard.filterCounts["reassessment-pending"] ?? 0,
  },
  {
    id: "workout-templates",
    label: "Treinos padrões",
    icon: "list-outline",
    route: "/trainer-workout-templates",
  },
  {
    id: "import-workout",
    label: "Importar ficha",
    icon: "scan-outline",
    route: "/import-workout",
  },
  {
    id: "expirations",
    label: "Próximo vencimento",
    icon: "timer-outline",
    route: "/trainer-expirations",
    badge: (dashboard) => dashboard.filterCounts["workout-expiring"] ?? 0,
  },
  {
    id: "frequency-ranking",
    label: "Ranking frequência",
    icon: "refresh-circle-outline",
    route: "/trainer-ranking-frequency",
  },
  {
    id: "evolution-ranking",
    label: "Ranking evolução",
    icon: "stats-chart-outline",
    route: "/trainer-ranking-evolution",
  },
  {
    id: "registration-link",
    label: "Link cadastro",
    icon: "link-outline",
    route: "/trainer-registration-link",
  },
  {
    id: "my-exercises",
    label: "Meus exercícios",
    icon: "barbell-outline",
    route: "/trainer-my-exercises",
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: "chatbubble-ellipses-outline",
    route: "/trainer-feedback-hub",
    badge: (dashboard) => dashboard.filterCounts["feedback-pending"] ?? 0,
  },
  {
    id: "contacts",
    label: "Contato",
    icon: "id-card-outline",
    route: "/trainer-contacts",
  },
  {
    id: "admin-dashboard",
    label: "Admin Master",
    icon: "shield-checkmark-outline",
    route: "/admin-dashboard",
  },
];

type NewStudentDraft = {
  fullName: string;
  birthDate: string;
  gender: "male" | "female" | "not_informed";
  mainGoal: string;
  whatsapp: string;
  email: string;
  administrativeNotes: string;
};

const EMPTY_NEW_STUDENT_DRAFT: NewStudentDraft = {
  fullName: "",
  birthDate: "",
  gender: "male",
  mainGoal: "",
  whatsapp: "",
  email: "",
  administrativeNotes: "",
};

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const layout = useResponsiveLayout();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedSection, setExpandedSection] =
    useState<StudentProfileSection>("anamnesis");
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [registrationDraft, setRegistrationDraft] =
    useState<StudentRegistration | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [loadMetric, setLoadMetric] = useState<LoadMetric>("volume");
  const [selectedLoadInsightId, setSelectedLoadInsightId] = useState<
    string | null
  >(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedAlert, setSelectedAlert] = useState<ReturnType<typeof buildStudentAlerts>[number] | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const requestedStudentId =
    typeof params.studentId === "string" ? params.studentId : undefined;
  const targetStudentId =
    session?.user.role === "STUDENT" ? session.user.id : requestedStudentId;
  const canManageStudent =
    session?.user.role === "TRAINER" && Boolean(targetStudentId);
  const canEditRegistration = Boolean(targetStudentId);

  const loadProfile = useCallback(
    async (asRefresh = false) => {
      if (!session) return;
      if (!targetStudentId) {
        setLoading(false);
        return;
      }

      if (asRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      try {
        const requesterRole =
          session.user.role === "STUDENT" ? "student" : "trainer";
        const [nextProfile, assessmentItems, feedbackItems] = await Promise.all(
          [
            getStudentProfile(targetStudentId, session.user.id, requesterRole),
            listAssessmentsForStudent(targetStudentId),
            listFeedbacksForStudent(targetStudentId),
          ],
        );

        setProfile(
          canManageStudent
            ? nextProfile
            : {
                ...nextProfile,
                privateTrainerNotes: [],
                registration: {
                  ...nextProfile.registration,
                  administrativeNotes: undefined,
                },
              },
        );
        setAssessments(assessmentItems);
        setFeedbacks(feedbackItems);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar o perfil.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canManageStudent, session, targetStudentId],
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const age = profile ? calculateAge(profile.registration.birthDate) : null;
  const latestAssessment = assessments[0];
  const latestFeedback = feedbacks[0];
  const actualPendingFeedbacks = feedbacks.filter(
    (feedback) =>
      feedback.status === "novo" || feedback.status === "visualizado",
  ).length;
  const loadInsights = useMemo(
    () => (profile ? buildLoadEvolutionInsights(profile) : []),
    [profile],
  );
  const selectedLoadInsight =
    loadInsights.find((insight) => insight.id === selectedLoadInsightId) ??
    loadInsights[0];
  const alerts = useMemo(
    () => (profile ? buildStudentAlerts(profile) : []),
    [profile],
  );

  useEffect(() => {
    if (!selectedLoadInsightId && loadInsights[0]) {
      setSelectedLoadInsightId(loadInsights[0].id);
    }
  }, [loadInsights, selectedLoadInsightId]);

  const updateProfileState = (nextProfile: StudentProfile, message: string) => {
    setProfile(nextProfile);
    setSaveState(message);
    setTimeout(() => setSaveState(""), 2500);
  };

  const openEditModal = () => {
    if (!profile) return;
    setRegistrationDraft(profile.registration);
    setEditModalVisible(true);
    setActionMenuVisible(false);
  };

  const openWhatsApp = async () => {
    if (!profile) return;

    const url = getWhatsAppUrl(profile.registration.contact.whatsapp);
    if (!url) {
      Alert.alert(
        "WhatsApp invalido",
        "Revise o numero do aluno antes de iniciar contato.",
      );
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(
        "Nao foi possivel abrir",
        "Verifique se ha um navegador ou WhatsApp disponivel no aparelho.",
      );
      return;
    }

    await Linking.openURL(url);
  };

  const confirmStatusChange = (nextStatus: StudentStatus) => {
    if (!profile || !canManageStudent || nextStatus === profile.status) return;

    Alert.alert(
      "Alterar status",
      `Alterar para ${getStudentStatusLabel(nextStatus)}? Historico, treinos, avaliacoes e feedbacks serao preservados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            void handleStatusChange(nextStatus);
          },
        },
      ],
    );
  };

  const handleStatusChange = async (nextStatus: StudentStatus) => {
    if (!profile || !session || !canManageStudent) return;

    setSaving(true);
    try {
      const nextProfile = await updateStudentStatus(
        profile.id,
        nextStatus,
        session.user.id,
        "trainer",
      );
      updateProfileState(nextProfile, "Status atualizado.");
      setStatusModalVisible(false);
      setActionMenuVisible(false);
    } catch (statusError) {
      Alert.alert(
        "Nao foi possivel alterar",
        statusError instanceof Error ? statusError.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!profile || !session || !canManageStudent) return;

    setSaving(true);
    try {
      const result = await generateAnamnesisInvite(profile.id, session.user.id);
      updateProfileState(result.profile, "Convite gerado.");
      setActionMenuVisible(false);
      await Share.share({
        message: `Convite seguro CrossPlan para preencher a anamnese: ${result.shareUrl}`,
      });
    } catch (inviteError) {
      Alert.alert(
        "Falha no convite",
        inviteError instanceof Error ? inviteError.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReminder = async () => {
    if (!profile || !session || !canManageStudent) return;

    setSaving(true);
    try {
      const nextProfile = await sendAnamnesisReminder(
        profile.id,
        session.user.id,
      );
      updateProfileState(nextProfile, "Lembrete registrado.");
    } catch (reminderError) {
      Alert.alert(
        "Nao foi possivel reenviar",
        reminderError instanceof Error
          ? reminderError.message
          : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!profile || !canManageStudent) return;

    Alert.alert(
      "Cancelar convite",
      "O link ativo deixara de funcionar e o historico sera preservado.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar convite",
          style: "destructive",
          onPress: () => {
            void cancelActiveInvite();
          },
        },
      ],
    );
  };

  const cancelActiveInvite = async () => {
    if (!profile || !session || !canManageStudent) return;

    setSaving(true);
    try {
      const nextProfile = await cancelAnamnesisInvite(
        profile.id,
        session.user.id,
      );
      updateProfileState(nextProfile, "Convite cancelado.");
    } catch (cancelError) {
      Alert.alert(
        "Nao foi possivel cancelar",
        cancelError instanceof Error ? cancelError.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAnamnesis = async () => {
    if (!profile || !canManageStudent) return;

    Alert.alert(
      "Concluir revisao",
      "Marcar pontos pendentes como revisados pelo treinador?",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Concluir",
          onPress: () => {
            void reviewAnamnesis();
          },
        },
      ],
    );
  };

  const reviewAnamnesis = async () => {
    if (!profile || !session || !canManageStudent) return;

    setSaving(true);
    try {
      const nextProfile = await markAnamnesisReviewed(
        profile.id,
        "Revisao presencial concluida pelo treinador.",
        session.user.id,
      );
      updateProfileState(nextProfile, "Anamnese revisada.");
    } catch (reviewError) {
      Alert.alert(
        "Nao foi possivel revisar",
        reviewError instanceof Error ? reviewError.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRequestUpdate = async () => {
    if (!profile || !session || !canManageStudent) return;

    setSaving(true);
    try {
      const nextProfile = await requestAnamnesisUpdate(
        profile.id,
        session.user.id,
      );
      updateProfileState(nextProfile, "Atualizacao solicitada.");
    } catch (requestError) {
      Alert.alert(
        "Nao foi possivel solicitar",
        requestError instanceof Error
          ? requestError.message
          : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!profile || !canManageStudent) return;

    Alert.alert(
      "Revogar sessoes",
      "O aluno precisara entrar novamente. O historico sera preservado.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Revogar",
          style: "destructive",
          onPress: () => {
            void revokeSessions();
          },
        },
      ],
    );
  };

  const revokeSessions = async () => {
    if (!profile || !session || !canManageStudent) return;

    setSaving(true);
    try {
      const nextProfile = await revokeStudentSessions(
        profile.id,
        session.user.id,
      );
      updateProfileState(nextProfile, "Sessoes revogadas.");
    } catch (revokeError) {
      Alert.alert(
        "Nao foi possivel revogar",
        revokeError instanceof Error ? revokeError.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmRegistrationSave = () => {
    if (!registrationDraft || !profile) return;

    const validation = validateRegistration(registrationDraft);
    if (!validation.valid) {
      Alert.alert("Revise os dados", validation.errors.join("\n"));
      return;
    }

    Alert.alert(
      "Salvar cadastro",
      "Alteracoes cadastrais sensiveis serao registradas no historico do aluno.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salvar",
          onPress: () => {
            void saveRegistration();
          },
        },
      ],
    );
  };

  const saveRegistration = async () => {
    if (!registrationDraft || !profile || !session || !canEditRegistration)
      return;

    setSaving(true);
    try {
      const actorRole = session.user.role === "STUDENT" ? "student" : "trainer";
      const nextProfile = await saveStudentRegistration(
        profile.id,
        registrationDraft,
        session.user.id,
        actorRole,
      );
      updateProfileState(nextProfile, "Cadastro salvo.");
      setEditModalVisible(false);
    } catch (saveError) {
      Alert.alert(
        "Nao foi possivel salvar",
        saveError instanceof Error ? saveError.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const setDraftField = <K extends keyof StudentRegistration>(
    field: K,
    value: StudentRegistration[K],
  ) => {
    if (!registrationDraft) return;
    setRegistrationDraft({ ...registrationDraft, [field]: value });
  };

  const setDraftContactField = (
    field: keyof StudentRegistration["contact"],
    value: string,
  ) => {
    if (!registrationDraft) return;
    setRegistrationDraft({
      ...registrationDraft,
      contact: {
        ...registrationDraft.contact,
        [field]:
          field === "email" || field === "emergencyName"
            ? value
            : formatPhoneInput(value),
      },
    });
  };

  const toggleSection = (section: StudentProfileSection) => {
    setExpandedSection((current) =>
      current === section ? "anamnesis" : section,
    );
  };

  const navigateTo = (
    path:
      | "/student-assessments"
      | "/student-feedbacks"
      | "/training"
      | "/notifications"
      | "/messages"
      | "/exercise-performance"
      | "/student-anamnesis"
      | "/student-diet",
  ) => {
    router.push(path as never);
  };

  const handleAlertAction = (
    actionKey: string,
    alert: ReturnType<typeof buildStudentAlerts>[number]
  ) => {
    setSelectedAlert(null);

    switch (actionKey) {
      case "open_anamnesis":
        setExpandedSection("anamnesis");
        setTimeout(() => scrollViewRef.current?.scrollTo({ y: 1100, animated: true }), 150);
        break;
      case "review_anamnesis":
        void reviewAnamnesis();
        break;
      case "request_anamnesis":
        void handleRequestUpdate();
        break;
      case "open_training":
        router.push("/training" as never);
        break;
      case "open_chat":
        router.push({
          pathname: "/messages" as never,
          params: targetStudentId ? { studentId: targetStudentId } : undefined,
        });
        break;
      case "open_whatsapp":
        void openWhatsApp();
        break;
      case "open_loads":
        router.push({
          pathname: "/exercise-performance" as never,
          params: targetStudentId ? { studentId: targetStudentId } : undefined,
        });
        break;
      case "open_feedbacks":
        router.push({
          pathname: "/student-feedbacks" as never,
          params: targetStudentId ? { studentId: targetStudentId } : undefined,
        });
        break;
      case "open_assessments":
        router.push({
          pathname: "/student-assessments" as never,
          params: targetStudentId ? { studentId: targetStudentId } : undefined,
        });
        break;
      case "open_documents":
        setExpandedSection("documents");
        setTimeout(() => scrollViewRef.current?.scrollTo({ y: 1100, animated: true }), 150);
        break;
      case "view_in_profile":
        setExpandedSection(alert.section);
        setTimeout(() => scrollViewRef.current?.scrollTo({ y: 1100, animated: true }), 150);
        break;
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/login" as never);
  };

  if (!loadingSession && session?.user.role === "TRAINER" && !targetStudentId) {
    return (
      <TrainerAccountProfile
        trainerId={session.user.id}
        name={session.user.name}
        email={session.user.email}
        avatar={session.user.avatar}
        professionalId={session.user.professionalId}
        onLogout={handleLogout}
      />
    );
  }

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={42} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error || "Perfil indisponivel."}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => loadProfile()}
        >
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const followUpDuration = calculateFollowUpDuration(
    profile.followUp.startedAt,
  );
  const daysFromLastTraining = daysSince(profile.followUp.lastTrainingAt);
  const nextAssessmentDays = daysUntil(profile.followUp.nextAssessmentAt);
  const adherence = calculateAdherence(profile.frequency);
  const latestAnamnesis = getLatestAnamnesisVersion(profile);

  const summaryRows = [
    { label: "Objetivo atual", value: profile.registration.mainGoal },
    {
      label: "Frequencia planejada",
      value: `${profile.followUp.plannedTrainingFrequency}x/semana`,
    },
    {
      label: "Frequencia realizada",
      value: `${profile.frequency.completedSessions}/${profile.frequency.plannedSessions}`,
    },
    { label: "Aderencia no periodo", value: `${adherence}%` },
    { label: "Treino atual", value: profile.followUp.currentWorkoutName },
    {
      label: "Inicio do treino",
      value: formatProfileDate(profile.followUp.currentWorkoutStartedAt),
    },
    {
      label: "Validade do treino",
      value: formatProfileDate(profile.followUp.currentWorkoutExpiresAt),
    },
    {
      label: "Ultima avaliacao",
      value: latestAssessment
        ? formatAssessmentDate(latestAssessment.assessedAt)
        : "Sem avaliacao liberada",
    },
    {
      label: "Proxima avaliacao",
      value: formatRelativeDayCount(nextAssessmentDays, "until"),
    },
    {
      label: "Ultimo feedback",
      value: latestFeedback
        ? formatProfileDateTime(latestFeedback.finishedAt)
        : "Sem feedback",
    },
    {
      label: "Feedbacks pendentes",
      value: String(
        actualPendingFeedbacks || profile.followUp.pendingFeedbacks,
      ),
    },
    {
      label: "Dias desde o ultimo treino",
      value: formatRelativeDayCount(daysFromLastTraining, "since"),
    },
  ];

  if (canManageStudent && profile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#161616" />
        <TrainerStudentHubView
          profile={profile}
          saving={saving}
          onBack={() => router.replace("/profile" as never)}
          onSaveRegistration={async (draft, nextStatus) => {
            setSaving(true);
            try {
              let updated = await saveStudentRegistration(profile.id, draft, session!.user.id, "trainer");
              if (profile.status !== nextStatus) {
                updated = await updateStudentStatus(profile.id, nextStatus, session!.user.id, "trainer");
              }
              updateProfileState(updated, "Dados e status salvos!");
              Alert.alert("Sucesso", "Dados do aluno atualizados com sucesso!");
            } catch (err) {
              Alert.alert("Erro ao salvar", err instanceof Error ? err.message : "Tente novamente.");
            } finally {
              setSaving(false);
            }
          }}
          onNavigateToDiet={() => {
            router.push({
              pathname: "/student-diet" as never,
              params: {
                studentId: profile.id,
                studentName: profile.registration.fullName,
              },
            });
          }}
          onNavigateToAnamnesis={() => {
            router.push({
              pathname: "/student-anamnesis" as never,
              params: {
                studentId: profile.id,
                studentName: profile.registration.fullName,
              },
            });
          }}
          onNavigateToAssessments={() => {
            router.push({
              pathname: "/student-assessments" as never,
              params: {
                studentId: profile.id,
                studentName: profile.registration.fullName,
              },
            });
          }}
          onNavigateToWorkouts={() => {
            router.push({
              pathname: "/training" as never,
              params: { studentId: profile.id },
            });
          }}
          onNavigateToLoads={() => {
            router.push({
              pathname: "/exercise-performance" as never,
              params: {
                studentId: profile.id,
                studentName: profile.registration.fullName,
              },
            });
          }}
          onShareAccessLink={async () => {
            const studentName = profile.registration.fullName;
            const whatsappNumber = profile.registration.contact.whatsapp || profile.registration.contact.phone;
            const accessUrl = `https://dragoncorp.app/login?student=${encodeURIComponent(profile.id)}&email=${encodeURIComponent(profile.registration.contact.email || "")}`;
            const message = `Olá ${studentName}! Aqui está o seu link exclusivo de acesso ao aplicativo DragonCorp para acompanhar seus treinos, avaliações e evolução:\n\n${accessUrl}`;

            Alert.alert(
              "Link de Acesso do Aluno",
              `Como deseja enviar o link de acesso de ${studentName}?`,
              [
                {
                  text: "Enviar no WhatsApp",
                  onPress: async () => {
                    const url = getWhatsAppUrl(whatsappNumber, message);
                    if (url) {
                      try {
                        const can = await Linking.canOpenURL(url);
                        if (can) await Linking.openURL(url);
                        else await Share.share({ message });
                      } catch {
                        await Share.share({ message });
                      }
                    } else {
                      await Share.share({ message });
                    }
                  },
                },
                {
                  text: "Compartilhar Link",
                  onPress: async () => {
                    try {
                      await Share.share({
                        title: `Acesso DragonCorp - ${studentName}`,
                        message,
                      });
                    } catch {}
                  },
                },
                { text: "Cancelar", style: "cancel" },
              ]
            );
          }}
          onDeleteStudent={() => {
            Alert.alert(
              "Excluir / Arquivar Aluno",
              `Deseja realmente desativar/arquivar o perfil de ${profile.registration.fullName}? Os dados históricos de treinos e avaliações permanecerão salvos em segurança.`,
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Excluir / Arquivar",
                  style: "destructive",
                  onPress: async () => {
                    setSaving(true);
                    try {
                      const next = await updateStudentStatus(profile.id, "inativo", session!.user.id, "trainer");
                      updateProfileState(next, "Aluno inativado/arquivado.");
                      Alert.alert("Aluno Arquivado", "O aluno foi inativado sem exclusão destrutiva de histórico.");
                      router.replace("/profile" as never);
                    } catch (err) {
                      Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível arquivar.");
                    } finally {
                      setSaving(false);
                    }
                  },
                },
              ]
            );
          }}
        >
          {/* DETAILED EXPANDED ACCORDION VIEW */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {SECTION_LABELS[expandedSection]}
              </Text>
              <Text style={styles.sectionHint}>Central detalhada</Text>
            </View>

            {renderExpandedSection({
              activeSection: expandedSection,
              profile,
              assessments,
              feedbacks,
              latestAnamnesis,
              selectedLoadInsight,
              loadInsights,
              loadMetric,
              setLoadMetric,
              setSelectedLoadInsightId,
              onGenerateInvite: handleGenerateInvite,
              onReminder: handleReminder,
              onCancelInvite: handleCancelInvite,
              onReviewAnamnesis: handleReviewAnamnesis,
              onRequestUpdate: handleRequestUpdate,
              onOpenEdit: openEditModal,
              onRevokeSessions: handleRevokeSessions,
              onNavigateAssessments: () => navigateTo("/student-assessments"),
              onNavigateFeedbacks: () => navigateTo("/student-feedbacks"),
              onNavigatePerformance: () => navigateTo("/exercise-performance"),
              canManageStudent,
              canEditRegistration,
            })}
          </View>
        </TrainerStudentHubView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Animated.ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: layout.topPadding,
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            tintColor="#D90000"
          />
        }
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {canManageStudent ? (
          <TouchableOpacity
            style={styles.backToTrainerProfileButton}
            onPress={() => router.replace("/profile" as never)}
            activeOpacity={0.84}
          >
            <Ionicons name="chevron-back" size={18} color="#D90000" />
            <Text style={styles.backToTrainerProfileText}>
              Perfil do personal
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.avatarFrame}>
              {profile.registration.avatar ? (
                <Image
                  source={{ uri: profile.registration.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons name="person" size={36} color="#D90000" />
              )}
            </View>

            <View style={styles.headerActions}>
              {canManageStudent ? (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={openWhatsApp}
                >
                  <Ionicons name="logo-whatsapp" size={19} color="#25D366" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setActionMenuVisible(true)}
              >
                <Ionicons name="ellipsis-horizontal" size={19} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.studentName}>
            {profile.registration.fullName}
          </Text>
          <Text style={styles.studentMeta}>
            {age ? `${age} anos` : "Idade não calculada"} •{" "}
            {profile.registration.profession ?? "Profissão não informada"}
          </Text>

          {profile.registration.mainGoal ? (
            <View style={styles.studentGoalBox}>
              <View style={styles.studentGoalIcon}>
                <Ionicons name="flag" size={13} color="#D90000" />
              </View>
              <Text style={styles.studentGoalText}>
                {profile.registration.mainGoal}
              </Text>
            </View>
          ) : null}

          <View style={styles.headerChips}>
            <View style={styles.statusPillActive}>
              <View style={styles.activeDot} />
              <Text style={styles.statusPillActiveText}>
                {getStudentStatusLabel(profile.status)}
              </Text>
            </View>
            <View style={styles.statusPillNeutral}>
              <Ionicons name="time-outline" size={13} color="#888" />
              <Text style={styles.statusPillNeutralText}>
                {followUpDuration}
              </Text>
            </View>
            <View style={styles.statusPillNeutral}>
              <Ionicons name="flash-outline" size={13} color="#888" />
              <Text style={styles.statusPillNeutralText}>
                Ativo {formatRelativeDayCount(daysSince(profile.followUp.lastActivityAt), "since")}
              </Text>
            </View>
          </View>

          <View style={styles.headerSchedule}>
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIconBox}>
                <Ionicons name="calendar" size={16} color="#D90000" />
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleLabel}>Próxima sessão</Text>
                <Text style={styles.scheduleValue}>
                  {formatProfileDateTime(profile.followUp.nextSessionAt)}
                </Text>
              </View>
            </View>

            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIconBox}>
                <Ionicons name="clipboard" size={16} color="#D90000" />
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleLabel}>Próxima avaliação</Text>
                <Text style={styles.scheduleValue}>
                  {formatProfileDate(profile.followUp.nextAssessmentAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {saveState ? (
          <View style={styles.saveState}>
            <Ionicons name="checkmark-circle" size={16} color="#D90000" />
            <Text style={styles.saveStateText}>{saveState}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertas importantes</Text>
            <View style={styles.alertCountBadge}>
              <Text style={styles.alertCountText}>{alerts.length} ativo(s)</Text>
            </View>
          </View>

          {alerts.length > 0 ? (
            <>
              {(showAllAlerts ? alerts : alerts.slice(0, 4)).map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={[
                    styles.alertRow,
                    alert.tone === "danger" && styles.alertRowDanger,
                  ]}
                  onPress={() => setSelectedAlert(alert)}
                  activeOpacity={0.78}
                >
                  <View
                    style={[
                      styles.alertIcon,
                      alert.tone === "danger" && styles.alertIconDanger,
                    ]}
                  >
                    <Ionicons
                      name={
                        alert.tone === "danger"
                          ? "alert-circle"
                          : "warning"
                      }
                      size={18}
                      color={alert.tone === "danger" ? "#ff4444" : "#D90000"}
                    />
                  </View>
                  <View style={styles.alertTextBlock}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertDetail}>{alert.detail}</Text>
                  </View>
                  <View style={styles.alertActionPill}>
                    <Text style={styles.alertActionPillText}>Ação</Text>
                    <Ionicons name="chevron-forward" size={13} color="#D90000" />
                  </View>
                </TouchableOpacity>
              ))}

              {alerts.length > 4 && (
                <TouchableOpacity
                  style={styles.showAllAlertsBtn}
                  onPress={() => setShowAllAlerts(!showAllAlerts)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.showAllAlertsBtnText}>
                    {showAllAlerts
                      ? "Mostrar menos alertas"
                      : `Ver todos os ${alerts.length} alertas`}
                  </Text>
                  <Ionicons
                    name={showAllAlerts ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#888"
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <EmptyInline
              icon="checkmark-circle-outline"
              text="Nenhum alerta critico no momento."
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do acompanhamento</Text>
          <View style={styles.summaryList}>
            {summaryRows.map((item) => (
              <View key={item.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atalhos do perfil</Text>
          <View style={styles.shortcutsGrid}>
            <ShortcutButton
              icon="document-text-outline"
              label="Anamnese"
              onPress={() => navigateTo("/student-anamnesis")}
            />
            <ShortcutButton
              icon="clipboard-outline"
              label="Avaliacoes"
              onPress={() => navigateTo("/student-assessments")}
            />
            <ShortcutButton
              icon="fitness-outline"
              label="Treinos"
              onPress={() => navigateTo("/training")}
            />
            <ShortcutButton
              icon="nutrition-outline"
              label="Dieta"
              onPress={() => navigateTo("/student-diet")}
            />
            <ShortcutButton
              icon="chatbubbles-outline"
              label="Feedbacks"
              onPress={() => navigateTo("/student-feedbacks")}
            />
            <ShortcutButton
              icon="calendar-outline"
              label="Frequencia"
              onPress={() => toggleSection("frequency")}
            />
            <ShortcutButton
              icon="body-outline"
              label="Corporal"
              onPress={() => toggleSection("body")}
            />
            <ShortcutButton
              icon="mail-outline"
              label="Mensagens"
              onPress={() =>
                navigateTo(
                  session?.user.role === "STUDENT"
                    ? "/messages"
                    : "/notifications",
                )
              }
            />
            <ShortcutButton
              icon="folder-open-outline"
              label="Documentos"
              onPress={() => toggleSection("documents")}
            />
            {canManageStudent ? (
              <>
                <ShortcutButton
                  icon="reader-outline"
                  label="Observacoes"
                  onPress={() => toggleSection("notes")}
                />
                <ShortcutButton
                  icon="key-outline"
                  label="Acesso"
                  onPress={() => toggleSection("access")}
                />
                <ShortcutButton
                  icon="person-outline"
                  label="Cadastro"
                  onPress={() => toggleSection("registration")}
                />
              </>
            ) : null}

            {/* BOTÃO EM BAIXO QUE OCUPA AS 3 COLUNAS E VERMELHO PARA TELA DE EVOLUÇÃO DE CARGAS */}
            <TouchableOpacity
              style={styles.evolutionCargasFullButton}
              onPress={() => navigateTo("/exercise-performance")}
              activeOpacity={0.85}
            >
              <View style={styles.evolutionCargasIconBox}>
                <Ionicons name="trending-up" size={22} color="#fff" />
              </View>
              <View style={styles.evolutionCargasTextCol}>
                <Text style={styles.evolutionCargasTitle}>Evolução de Cargas</Text>
                <Text style={styles.evolutionCargasSubtitle}>
                  Gráficos por exercício, histórico e recordes
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {SECTION_LABELS[expandedSection]}
            </Text>
            <Text style={styles.sectionHint}>Central do aluno</Text>
          </View>

          {renderExpandedSection({
            activeSection: expandedSection,
            profile,
            assessments,
            feedbacks,
            latestAnamnesis,
            selectedLoadInsight,
            loadInsights,
            loadMetric,
            setLoadMetric,
            setSelectedLoadInsightId,
            onGenerateInvite: handleGenerateInvite,
            onReminder: handleReminder,
            onCancelInvite: handleCancelInvite,
            onReviewAnamnesis: handleReviewAnamnesis,
            onRequestUpdate: handleRequestUpdate,
            onOpenEdit: openEditModal,
            onRevokeSessions: handleRevokeSessions,
            onNavigateAssessments: () => navigateTo("/student-assessments"),
            onNavigateFeedbacks: () => navigateTo("/student-feedbacks"),
            onNavigatePerformance: () => navigateTo("/exercise-performance"),
            canManageStudent,
            canEditRegistration,
          })}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Image
            source={require("@/assets/images/logotipo-principal.png")}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={styles.appVersion}>DragonCorp System • v1.0.0</Text>
        </View>
      </Animated.ScrollView>

      <ActionMenu
        visible={actionMenuVisible}
        saving={saving}
        canManageStudent={canManageStudent}
        canEditRegistration={canEditRegistration}
        onClose={() => setActionMenuVisible(false)}
        onEdit={openEditModal}
        onStatus={() => {
          setStatusModalVisible(true);
          setActionMenuVisible(false);
        }}
        onInvite={handleGenerateInvite}
        onAnamnesis={() => {
          setExpandedSection("anamnesis");
          setActionMenuVisible(false);
        }}
        onAccess={() => {
          setExpandedSection("access");
          setActionMenuVisible(false);
        }}
        onPause={() => confirmStatusChange("pausado")}
        onCloseStudent={() => confirmStatusChange("encerrado")}
      />

      <StatusModal
        visible={statusModalVisible}
        currentStatus={profile.status}
        saving={saving}
        onClose={() => setStatusModalVisible(false)}
        onChange={confirmStatusChange}
      />

      <EditRegistrationModal
        visible={editModalVisible}
        draft={registrationDraft}
        saving={saving}
        canManageStudent={canManageStudent}
        onClose={() => setEditModalVisible(false)}
        onChangeField={setDraftField}
        onChangeContact={setDraftContactField}
        onSave={confirmRegistrationSave}
      />

      <AlertDetailModal
        visible={Boolean(selectedAlert)}
        alert={selectedAlert}
        studentName={profile.registration.fullName}
        canManageStudent={canManageStudent}
        onClose={() => setSelectedAlert(null)}
        onAction={(actionKey) => selectedAlert && handleAlertAction(actionKey, selectedAlert)}
      />
    </View>
  );
}

function TrainerAccountProfile({
  trainerId,
  name,
  email,
  avatar,
  professionalId,
  onLogout,
}: {
  trainerId: string;
  name: string;
  email: string;
  avatar?: string;
  professionalId?: string;
  onLogout: () => void;
}) {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const [dashboard, setDashboard] = useState<TrainerHomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<TrainerHomeStudentFilter>("all");
  const [newStudentModalVisible, setNewStudentModalVisible] = useState(false);
  const { branding, updateBranding, refreshBranding } = useTrainerBranding();
  const [brandingModalVisible, setBrandingModalVisible] = useState(false);
  const [newStudentDraft, setNewStudentDraft] = useState<NewStudentDraft>(
    EMPTY_NEW_STUDENT_DRAFT,
  );
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [newStudentError, setNewStudentError] = useState("");
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);

  const loadDashboard = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      try {
        const [nextDashboard, sub] = await Promise.all([
          getTrainerHomeDashboard(trainerId),
          getSubscriptionForUser(trainerId, name, email),
        ]);
        setDashboard(nextDashboard);
        setSubscription(sub);
        setActiveFilter(nextDashboard.preferences.savedStudentFilter ?? "all");
      } catch {
        setError("Nao foi possivel carregar os alunos do personal.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [trainerId, name, email],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const filteredStudents = useMemo(() => {
    if (!dashboard) return [];
    const search = normalizeTrainerProfileSearch(query);
    const filtered = dashboard.students.filter((student) => {
      const matchesFilter = studentMatchesHomeFilter(student, activeFilter);
      const matchesSearch = !search || student.searchText.includes(search);
      return matchesFilter && matchesSearch;
    });
    return sortTrainerHomeStudents(filtered, "priority");
  }, [activeFilter, dashboard, query]);

  const navigateToRoute = (route: TrainerHomeRoute, studentId?: string) => {
    if (route === "/profile" && studentId) {
      router.push({ pathname: "/profile" as never, params: { studentId } });
      return;
    }
    router.push(route as never);
  };

  const openStudent = (studentId: string) => {
    navigateToRoute("/profile", studentId);
  };

  const openStudentWhatsApp = async (student: TrainerHomeStudentSummary) => {
    const url = getWhatsAppUrl(student.whatsapp ?? student.phone);
    if (!url) {
      Alert.alert(
        "WhatsApp invalido",
        "Revise o numero do aluno antes de iniciar contato.",
      );
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(
        "Nao foi possivel abrir",
        "Verifique se ha um navegador ou WhatsApp disponivel no aparelho.",
      );
      return;
    }

    await Linking.openURL(url);
  };

  const openNewStudentModal = async () => {
    const canAdd = await validateStudentAdditionAllowed(trainerId, totalStudents);
    if (!canAdd.allowed) {
      setPaywallVisible(true);
      return;
    }
    setNewStudentDraft(EMPTY_NEW_STUDENT_DRAFT);
    setNewStudentError("");
    setNewStudentModalVisible(true);
  };

  const closeNewStudentModal = () => {
    if (creatingStudent) return;
    setNewStudentModalVisible(false);
    setNewStudentError("");
  };

  const setNewStudentField = (field: keyof NewStudentDraft, value: string) => {
    setNewStudentDraft((current) => ({
      ...current,
      [field]:
        field === "whatsapp"
          ? formatPhoneInput(value)
          : field === "birthDate"
          ? formatDateInput(value)
          : value,
    }));
  };

  const saveNewStudent = async () => {
    setCreatingStudent(true);
    setNewStudentError("");

    try {
      const created = await createStudentProfile(
        {
          trainerId,
          fullName: newStudentDraft.fullName,
          birthDate: newStudentDraft.birthDate,
          gender: newStudentDraft.gender,
          mainGoal: newStudentDraft.mainGoal,
          whatsapp: newStudentDraft.whatsapp,
          phone: newStudentDraft.whatsapp,
          email: newStudentDraft.email,
          administrativeNotes: newStudentDraft.administrativeNotes,
        },
        trainerId,
        "trainer",
      );

      setNewStudentModalVisible(false);
      setNewStudentDraft(EMPTY_NEW_STUDENT_DRAFT);
      setActiveFilter("all");
      setQuery("");
      await loadDashboard();
      setActiveFilter("all");
      router.push({
        pathname: "/profile" as never,
        params: { studentId: created.id },
      });
    } catch (createError) {
      setNewStudentError(
        createError instanceof Error
          ? createError.message
          : "Nao foi possivel cadastrar o aluno.",
      );
    } finally {
      setCreatingStudent(false);
    }
  };

  const trainerAvatar = branding.avatarUrl || dashboard?.trainer.avatar || avatar;
  const filterOptions: TrainerHomeStudentFilter[] = [
    "all",
    "active",
    "inactive",
    "pending",
    "workout-expiring",
    "feedback-pending",
    "pain",
  ];
  const trainerDisplayName = branding.displayName || dashboard?.trainer.name || name;
  const trainerProfessionalId =
    branding.professionalId ||
    dashboard?.trainer.professionalId ||
    professionalId ||
    "CREF 123456-G/SP";
  const trainerFirstName =
    trainerDisplayName.split(" ")[0] || trainerDisplayName;
  const totalStudents = dashboard?.students.length ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView
        contentContainerStyle={[
          styles.trainerProfileScrollContent,
          {
            paddingTop: layout.topPadding,
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor="#D90000"
          />
        }
      >
        <View style={styles.trainerHomeHeader}>
          <View style={styles.trainerHomeHeaderTop}>
            <Image
              source={require("@/assets/images/logotipo-principal.png")}
              style={styles.trainerHomeLogo}
              resizeMode="contain"
            />
            <View style={styles.trainerHomeActions}>
              <TouchableOpacity
                style={styles.trainerHomeIconButton}
                onPress={onLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#D90000" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trainerHomeAvatarButton}
                onPress={() => router.push("/profile" as never)}
              >
                {trainerAvatar ? (
                  <Image
                    source={{ uri: trainerAvatar }}
                    style={styles.trainerHomeAvatar}
                  />
                ) : (
                  <Ionicons name="person" size={20} color="#D90000" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.trainerHomeWelcomeBlock}>
            <Text style={styles.trainerHomeWelcome}>Perfil do</Text>
            <Text style={styles.trainerHomeName}>{trainerFirstName}</Text>
          </View>
        </View>

        <View style={styles.trainerIdentityBlock}>
          <TouchableOpacity
            style={styles.trainerIdentityAvatarFrame}
            onPress={() => setBrandingModalVisible(true)}
            activeOpacity={0.84}
          >
            {trainerAvatar ? (
              <Image
                source={{ uri: trainerAvatar }}
                style={styles.trainerIdentityAvatar}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={38} color="#D90000" />
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="create-outline" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View style={styles.trainerIdentityTextBlock}>
            <View style={styles.trainerIdentityTopRow}>
              <Text style={styles.trainerIdentityName} numberOfLines={1}>
                {trainerDisplayName}
              </Text>
              <TouchableOpacity
                style={styles.editBrandingButton}
                onPress={() => setBrandingModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="color-palette-outline" size={12} color="#D90000" />
                <Text style={styles.editBrandingButtonText}>
                  Editar
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.trainerIdentityCref}>
              {trainerProfessionalId}
            </Text>

            <Text style={styles.trainerIdentityEmail} numberOfLines={1}>
              {email}
            </Text>

          </View>
        </View>

        {loading && !dashboard ? (
          <View style={styles.trainerProfileStateCard}>
            <ActivityIndicator color="#D90000" />
            <Text style={styles.trainerProfileStateText}>
              Carregando alunos...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.trainerProfileStateCard}>
            <Ionicons name="alert-circle-outline" size={30} color="#ff4444" />
            <Text style={styles.trainerProfileStateTitle}>
              Falha ao carregar
            </Text>
            <Text style={styles.trainerProfileStateText}>{error}</Text>
            <TouchableOpacity
              style={styles.trainerProfileRetryButton}
              onPress={() => loadDashboard()}
            >
              <Text style={styles.trainerProfileRetryText}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : dashboard ? (
          <>
            <View style={styles.trainerShortcutPanel}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.trainerShortcutScroller}
                contentContainerStyle={styles.trainerShortcutRail}
              >
                {TRAINER_PROFILE_SHORTCUTS.map((shortcut) => {
                  const badge = shortcut.badge?.(dashboard) ?? 0;
                  return (
                    <TouchableOpacity
                      key={shortcut.id}
                      style={styles.trainerShortcutItem}
                      onPress={() => router.push(shortcut.route as never)}
                      activeOpacity={0.84}
                    >
                      <View style={styles.trainerShortcutCircle}>
                        <Ionicons
                          name={shortcut.icon}
                          size={25}
                          color="#D90000"
                        />
                        {badge ? (
                          <View style={styles.trainerShortcutBadge}>
                            <Text style={styles.trainerShortcutBadgeText}>
                              {badge > 9 ? "9+" : badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={styles.trainerShortcutLabel}
                        numberOfLines={2}
                      >
                        {shortcut.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.trainerShortcutHint}>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </View>
            </View>

            {/* Banner de Destaque: Migração & Importador Inteligente */}
            <TouchableOpacity
              style={styles.trainerMigrationBanner}
              onPress={() => router.push("/import-workout" as never)}
              activeOpacity={0.88}
            >
              <View style={styles.trainerMigrationIconBox}>
                <Ionicons name="scan-outline" size={20} color="#D90000" />
              </View>
              <View style={styles.trainerMigrationContent}>
                <View style={styles.trainerMigrationTitleRow}>
                  <Text style={styles.trainerMigrationTitle}>Migrador de Planilhas & Fichas</Text>
                  <View style={styles.trainerMigrationBadge}>
                    <Text style={styles.trainerMigrationBadgeText}>NOVO</Text>
                  </View>
                </View>
                <Text style={styles.trainerMigrationSubtitle}>
                  Importe fotos de fichas, planilhas ou PDFs para o app
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D90000" />
            </TouchableOpacity>

            <View style={styles.trainerSearchBox}>
              <Ionicons name="search" size={19} color="#D90000" />
              <TextInput
                style={styles.trainerSearchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Pesquisar aluno"
                placeholderTextColor="#777"
                autoCapitalize="none"
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#777" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trainerFilterRail}
            >
              {filterOptions.map((filter) => {
                const active = activeFilter === filter;
                const count = dashboard.filterCounts[filter] ?? 0;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.trainerFilterChip,
                      active && styles.trainerFilterChipActive,
                    ]}
                    onPress={() => setActiveFilter(filter)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.trainerFilterChipText,
                        active && styles.trainerFilterChipTextActive,
                      ]}
                    >
                      {STUDENT_FILTER_LABELS[filter]}
                    </Text>
                    <View
                      style={[
                        styles.trainerFilterBadge,
                        active && styles.trainerFilterBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.trainerFilterBadgeText,
                          active && styles.trainerFilterBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.trainerListHeader}>
              <View style={styles.trainerListTitleBlock}>
                <Text style={styles.trainerListTitle}>Alunos</Text>
                <Text style={styles.trainerListSubtitle}>
                  {filteredStudents.length} de {totalStudents} aluno(s)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.trainerAddStudentButton}
                onPress={openNewStudentModal}
                activeOpacity={0.86}
              >
                <Ionicons name="person-add-outline" size={17} color="#fff" />
                <Text style={styles.trainerAddStudentText} numberOfLines={1}>
                  Novo aluno
                </Text>
              </TouchableOpacity>
            </View>

            {activeFilter !== "all" || query ? (
              <View style={styles.trainerListMetaRow}>
                <Text style={styles.trainerListMetaText} numberOfLines={1}>
                  Lista filtrada
                </Text>
                <TouchableOpacity
                  style={styles.trainerClearButton}
                  onPress={() => {
                    setActiveFilter("all");
                    setQuery("");
                  }}
                >
                  <Text style={styles.trainerClearButtonText}>
                    Limpar filtros
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {filteredStudents.length ? (
              filteredStudents.map((student) => (
                <TrainerStudentListItem
                  key={student.id}
                  dashboard={dashboard}
                  student={student}
                  onOpen={() => openStudent(student.id)}
                  onWhatsApp={() => openStudentWhatsApp(student)}
                />
              ))
            ) : (
              <View style={styles.trainerProfileStateCard}>
                <Ionicons name="people-outline" size={30} color="#D90000" />
                <Text style={styles.trainerProfileStateTitle}>
                  Nenhum aluno encontrado
                </Text>
                <Text style={styles.trainerProfileStateText}>
                  Ajuste a busca ou remova os filtros para ver outros alunos.
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <NewStudentModal
        visible={newStudentModalVisible}
        draft={newStudentDraft}
        saving={creatingStudent}
        error={newStudentError}
        onClose={closeNewStudentModal}
        onChangeField={setNewStudentField}
        onSave={saveNewStudent}
      />

      <TrainerBrandingModal
        visible={brandingModalVisible}
        initialBranding={branding}
        onClose={() => setBrandingModalVisible(false)}
        onSave={async (updated) => {
          await updateBranding(updated);
          await loadDashboard(true);
        }}
      />

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        userId={trainerId}
        onSuccess={() => loadDashboard(true)}
      />
    </View>
  );
}

function TrainerStudentListItem({
  dashboard,
  student,
  onOpen,
  onWhatsApp,
}: {
  dashboard: TrainerHomeDashboard;
  student: TrainerHomeStudentSummary;
  onOpen: () => void;
  onWhatsApp: () => void;
}) {
  const rawProfile = dashboard.rawProfiles.find(
    (item) => item.id === student.id,
  );
  const assessmentCount = rawProfile?.bodyEvolution.length ?? 0;
  const trainingCount = rawProfile?.followUp.completedTrainingFrequency ?? 0;
  const active = student.status === "ativo";

  return (
    <TouchableOpacity
      style={styles.trainerStudentRow}
      onPress={onOpen}
      activeOpacity={0.86}
    >
      <View style={styles.trainerStudentHeader}>
        <View style={styles.trainerStudentAvatarFrame}>
          {student.avatar ? (
            <Image
              source={{ uri: student.avatar }}
              style={styles.trainerStudentAvatar}
            />
          ) : (
            <Ionicons name="person" size={25} color="#D90000" />
          )}
        </View>
        <View style={styles.trainerStudentTextBlock}>
          <View style={styles.trainerStudentNameLine}>
            <Text style={styles.trainerStudentName} numberOfLines={1}>
              {student.name}
            </Text>
            <View
              style={[
                styles.trainerStudentStatusPill,
                active && styles.trainerStudentStatusPillActive,
              ]}
            >
              <Text
                style={[
                  styles.trainerStudentStatusText,
                  active && styles.trainerStudentStatusTextActive,
                ]}
              >
                {student.statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.trainerStudentEmail} numberOfLines={1}>
            {student.email ?? student.objective}
          </Text>
        </View>
      </View>

      <View style={styles.trainerStudentWorkoutBox}>
        <View style={styles.trainerStudentWorkoutIcon}>
          <Ionicons name="fitness-outline" size={18} color="#D90000" />
        </View>
        <View style={styles.trainerStudentWorkoutText}>
          <Text style={styles.trainerStudentWorkoutLabel}>Treino atual</Text>
          <Text style={styles.trainerStudentWorkoutValue} numberOfLines={1}>
            {student.currentWorkoutName}
          </Text>
          <Text style={styles.trainerStudentNextAction} numberOfLines={1}>
            {student.nextAction}
          </Text>
        </View>
      </View>

      <View style={styles.trainerStudentFooter}>
        <View style={styles.trainerStudentPills}>
          <View style={styles.trainerStudentPill}>
            <Ionicons name="clipboard-outline" size={14} color="#D90000" />
            <Text style={styles.trainerStudentPillText} numberOfLines={1}>
              {assessmentCount} avaliações
            </Text>
          </View>
          <View style={styles.trainerStudentPill}>
            <Ionicons name="barbell-outline" size={14} color="#D90000" />
            <Text style={styles.trainerStudentPillText} numberOfLines={1}>
              {trainingCount} treinos
            </Text>
          </View>
        </View>
        <View style={styles.trainerStudentActions}>
          <TouchableOpacity
            style={styles.trainerWhatsAppButton}
            onPress={onWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#D90000" />
          </TouchableOpacity>
          <View
            style={[
              styles.trainerStatusBadge,
              active && styles.trainerStatusBadgeActive,
            ]}
          >
            <View
              style={[
                styles.trainerStatusDot,
                active && styles.trainerStatusDotActive,
              ]}
            />
            <Text
              style={[
                styles.trainerStatusBadgeText,
                active && styles.trainerStatusBadgeTextActive,
              ]}
            >
              {student.statusLabel}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const QUICK_GOAL_PRESETS = [
  { id: "hipertrofia", label: "Hipertrofia", icon: "barbell-outline" as const },
  { id: "emagrecimento", label: "Emagrecimento", icon: "flame-outline" as const },
  { id: "condicionamento", label: "Condicionamento", icon: "flash-outline" as const },
  { id: "forca", label: "Ganho de Força", icon: "trophy-outline" as const },
  { id: "saude", label: "Saúde & Postura", icon: "heart-outline" as const },
  { id: "corrida", label: "Corrida / Resistência", icon: "walk-outline" as const },
  { id: "reabilitacao", label: "Reabilitação", icon: "medkit-outline" as const },
];

const GENDER_OPTIONS: {
  value: "male" | "female" | "not_informed";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "male", label: "Masculino", icon: "male-outline" },
  { value: "female", label: "Feminino", icon: "female-outline" },
  { value: "not_informed", label: "Não informar", icon: "person-outline" },
];

function NewStudentModal({
  visible,
  draft,
  saving,
  error,
  onClose,
  onChangeField,
  onSave,
}: {
  visible: boolean;
  draft: NewStudentDraft;
  saving: boolean;
  error: string;
  onClose: () => void;
  onChangeField: (field: keyof NewStudentDraft, value: string) => void;
  onSave: () => void;
}) {
  const calculatedAge = useMemo(() => calculateAge(draft.birthDate), [draft.birthDate]);

  const handleSelectGoal = (goalLabel: string) => {
    if (!draft.mainGoal.trim()) {
      onChangeField("mainGoal", goalLabel);
      return;
    }
    const current = draft.mainGoal.trim();
    if (current.toLowerCase() === goalLabel.toLowerCase()) {
      onChangeField("mainGoal", "");
      return;
    }
    if (current.toLowerCase().includes(goalLabel.toLowerCase())) {
      const updated = current
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.toLowerCase() !== goalLabel.toLowerCase())
        .join(", ");
      onChangeField("mainGoal", updated);
      return;
    }
    onChangeField("mainGoal", `${current}, ${goalLabel}`);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                disabled={saving}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.editTitle}>Novo aluno</Text>
                <Text style={styles.editHeaderSubtitle}>Cadastro inicial rápido</Text>
              </View>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabled]}
                onPress={() => {
                  Keyboard.dismiss();
                  onSave();
                }}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={[styles.editContent, { paddingBottom: 240 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Header Hero Card */}
              <View style={styles.newStudentHeroCard}>
                <View style={styles.newStudentHeroIconWrap}>
                  <Ionicons name="person-add" size={22} color="#D90000" />
                </View>
                <View style={styles.newStudentHeroTextBlock}>
                  <Text style={styles.newStudentHeroTitle}>Cadastro Inicial</Text>
                  <Text style={styles.newStudentHeroSubtitle}>
                    Preencha os dados essenciais para iniciar o acompanhamento e prescrever treinos.
                  </Text>
                </View>
              </View>

              {error ? (
                <View style={styles.formErrorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#FF4444" />
                  <Text style={styles.formErrorText}>{error}</Text>
                </View>
              ) : null}

              {/* SEÇÃO 1: DADOS PESSOAIS */}
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <View style={styles.formSectionIconWrap}>
                    <Ionicons name="person-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.formSectionTitle}>Dados Pessoais</Text>
                </View>

                <FormField
                  label="Nome completo"
                  value={draft.fullName}
                  placeholder="Nome do aluno"
                  autoCapitalize="words"
                  icon="person-outline"
                  required
                  onClear={() => onChangeField("fullName", "")}
                  onChangeText={(value) => onChangeField("fullName", value)}
                />

                {/* Gênero */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Gênero</Text>
                  <View style={styles.genderSelector}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = (draft.gender || "male") === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.genderOption,
                            selected && styles.genderOptionActive,
                          ]}
                          onPress={() => onChangeField("gender", option.value)}
                        >
                          <Ionicons
                            name={option.icon}
                            size={16}
                            color={selected ? "#FF4444" : "#777"}
                          />
                          <Text
                            style={[
                              styles.genderOptionText,
                              selected && styles.genderOptionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <FormField
                  label="Data de nascimento"
                  value={draft.birthDate}
                  placeholder="00/00/0000"
                  keyboardType="numeric"
                  maxLength={10}
                  icon="calendar-outline"
                  required
                  badge={
                    calculatedAge !== null && calculatedAge > 0 && calculatedAge <= 120 ? (
                      <View style={styles.calculatedAgeBadge}>
                        <Ionicons name="gift-outline" size={12} color="#D90000" />
                        <Text style={styles.calculatedAgeText}>
                          {calculatedAge} anos
                        </Text>
                      </View>
                    ) : null
                  }
                  helperText="Formato: 00/00/0000 (Cálculo automático de idade)"
                  onClear={() => onChangeField("birthDate", "")}
                  onChangeText={(value) => onChangeField("birthDate", value)}
                />
              </View>

              {/* SEÇÃO 2: OBJETIVO & FOCO */}
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <View style={styles.formSectionIconWrap}>
                    <Ionicons name="trophy-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.formSectionTitle}>Objetivo & Foco</Text>
                </View>

                <Text style={styles.quickGoalsLabel}>Sugestões rápidas:</Text>
                <View style={styles.quickGoalsContainer}>
                  {QUICK_GOAL_PRESETS.map((goal) => {
                    const isSelected = draft.mainGoal
                      .toLowerCase()
                      .includes(goal.label.toLowerCase());
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        style={[
                          styles.quickGoalChip,
                          isSelected && styles.quickGoalChipActive,
                        ]}
                        onPress={() => handleSelectGoal(goal.label)}
                      >
                        <Ionicons
                          name={goal.icon}
                          size={13}
                          color={isSelected ? "#FF4444" : "#888"}
                        />
                        <Text
                          style={[
                            styles.quickGoalChipText,
                            isSelected && styles.quickGoalChipTextActive,
                          ]}
                        >
                          {goal.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <FormField
                  label="Objetivo principal"
                  value={draft.mainGoal}
                  placeholder="Hipertrofia, emagrecimento, performance..."
                  icon="flag-outline"
                  onClear={() => onChangeField("mainGoal", "")}
                  onChangeText={(value) => onChangeField("mainGoal", value)}
                />
              </View>

              {/* SEÇÃO 3: CONTATO & ACESSO */}
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <View style={styles.formSectionIconWrap}>
                    <Ionicons name="chatbubbles-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.formSectionTitle}>Contato & Acesso</Text>
                </View>

                <FormField
                  label="WhatsApp"
                  value={draft.whatsapp}
                  placeholder="(11) 99999-9999"
                  keyboardType="phone-pad"
                  maxLength={15}
                  icon="logo-whatsapp"
                  iconColor="#25D366"
                  helperText="Utilizado para envio de treinos e convite de anamnese"
                  onClear={() => onChangeField("whatsapp", "")}
                  onChangeText={(value) => onChangeField("whatsapp", value)}
                />

                <FormField
                  label="E-mail"
                  value={draft.email}
                  placeholder="aluno@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                  onClear={() => onChangeField("email", "")}
                  onChangeText={(value) => onChangeField("email", value)}
                />
              </View>

              {/* SEÇÃO 4: OBSERVAÇÕES INICIAIS */}
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <View style={styles.formSectionIconWrap}>
                    <Ionicons name="document-text-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.formSectionTitle}>Observações & Contexto</Text>
                </View>

                <FormField
                  label="Observações iniciais"
                  value={draft.administrativeNotes}
                  placeholder="Plano contratado, histórico de lesões, restrições médicas ou disponibilidade de horários..."
                  multiline
                  icon="document-text-outline"
                  onChangeText={(value) =>
                    onChangeField("administrativeNotes", value)
                  }
                />
              </View>

              {/* Bottom Primary Submit Button */}
              <TouchableOpacity
                style={[styles.newStudentPrimaryBtn, saving && styles.disabled]}
                onPress={() => {
                  Keyboard.dismiss();
                  onSave();
                }}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.newStudentPrimaryBtnText}>Salvar Aluno</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function renderExpandedSection(props: {
  activeSection: StudentProfileSection;
  profile: StudentProfile;
  assessments: PhysicalAssessment[];
  feedbacks: TrainingFeedback[];
  latestAnamnesis: ReturnType<typeof getLatestAnamnesisVersion>;
  selectedLoadInsight:
    | ReturnType<typeof buildLoadEvolutionInsights>[number]
    | undefined;
  loadInsights: ReturnType<typeof buildLoadEvolutionInsights>;
  loadMetric: LoadMetric;
  setLoadMetric: (metric: LoadMetric) => void;
  setSelectedLoadInsightId: (id: string) => void;
  onGenerateInvite: () => void;
  onReminder: () => void;
  onCancelInvite: () => void;
  onReviewAnamnesis: () => void;
  onRequestUpdate: () => void;
  onOpenEdit: () => void;
  onRevokeSessions: () => void;
  onNavigateAssessments: () => void;
  onNavigateFeedbacks: () => void;
  onNavigatePerformance: () => void;
  canManageStudent: boolean;
  canEditRegistration: boolean;
}) {
  return <SectionContent {...props} />;
}

function SectionContent(props: {
  activeSection: StudentProfileSection;
  profile: StudentProfile;
  assessments: PhysicalAssessment[];
  feedbacks: TrainingFeedback[];
  latestAnamnesis: ReturnType<typeof getLatestAnamnesisVersion>;
  selectedLoadInsight:
    | ReturnType<typeof buildLoadEvolutionInsights>[number]
    | undefined;
  loadInsights: ReturnType<typeof buildLoadEvolutionInsights>;
  loadMetric: LoadMetric;
  setLoadMetric: (metric: LoadMetric) => void;
  setSelectedLoadInsightId: (id: string) => void;
  onGenerateInvite: () => void;
  onReminder: () => void;
  onCancelInvite: () => void;
  onReviewAnamnesis: () => void;
  onRequestUpdate: () => void;
  onOpenEdit: () => void;
  onRevokeSessions: () => void;
  onNavigateAssessments: () => void;
  onNavigateFeedbacks: () => void;
  onNavigatePerformance: () => void;
  canManageStudent: boolean;
  canEditRegistration: boolean;
}) {
  const {
    activeSection,
    profile,
    assessments,
    feedbacks,
    latestAnamnesis,
    selectedLoadInsight,
    loadInsights,
    loadMetric,
    setLoadMetric,
    setSelectedLoadInsightId,
    canManageStudent,
    canEditRegistration,
  } = props;

  switch (activeSection) {
    case "registration":
      return (
        <View style={styles.cardBlock}>
          <InfoLine
            icon="person-outline"
            label="Nome completo"
            value={profile.registration.fullName}
          />
          <InfoLine
            icon="calendar-outline"
            label="Nascimento"
            value={formatProfileDate(profile.registration.birthDate)}
          />
          <InfoLine
            icon="mail-outline"
            label="E-mail"
            value={profile.registration.contact.email ?? "Nao informado"}
          />
          <InfoLine
            icon="call-outline"
            label="Telefone"
            value={profile.registration.contact.phone ?? "Nao informado"}
          />
          <InfoLine
            icon="briefcase-outline"
            label="Profissao"
            value={profile.registration.profession ?? "Nao informada"}
          />
          <InfoLine
            icon="alert-circle-outline"
            label="Contato de emergencia"
            value={
              profile.registration.contact.emergencyName ?? "Nao informado"
            }
          />
          {canEditRegistration ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={props.onOpenEdit}
            >
              <Ionicons name="create-outline" size={18} color="#D90000" />
              <Text style={styles.secondaryButtonText}>Editar cadastro</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );

    case "anamnesis":
      return (
        <View style={styles.cardBlock}>
          <InfoLine
            icon="document-text-outline"
            label="Situacao"
            value={getAnamnesisStatusLabel(profile.anamnesis.status)}
          />
          <InfoLine
            icon="layers-outline"
            label="Versao atual"
            value={
              latestAnamnesis
                ? `v${latestAnamnesis.version} • ${latestAnamnesis.progressPercent}%`
                : "Sem versao"
            }
          />
          <InfoLine
            icon="time-outline"
            label="Enviada em"
            value={formatProfileDateTime(latestAnamnesis?.submittedAt)}
          />
          <InfoLine
            icon="link-outline"
            label="Convite"
            value={
              profile.anamnesis.activeInvite?.status === "active"
                ? `Ativo ate ${formatProfileDate(profile.anamnesis.activeInvite.expiresAt)}`
                : "Nenhum convite ativo"
            }
          />

          <ProgressBar value={latestAnamnesis?.progressPercent ?? 0} />

          {canManageStudent ? (
            <View style={styles.inlineActions}>
              <SmallAction
                icon="send-outline"
                label="Convite"
                onPress={props.onGenerateInvite}
              />
              <SmallAction
                icon="notifications-outline"
                label="Lembrete"
                onPress={props.onReminder}
              />
              <SmallAction
                icon="checkmark-done-outline"
                label="Revisar"
                onPress={props.onReviewAnamnesis}
              />
            </View>
          ) : null}

          {canManageStudent &&
          profile.anamnesis.activeInvite?.status === "active" ? (
            <TouchableOpacity
              style={styles.warningButton}
              onPress={props.onCancelInvite}
            >
              <Ionicons name="close-circle-outline" size={18} color="#ff4444" />
              <Text style={styles.warningButtonText}>
                Cancelar convite ativo
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.subsectionTitle}>Etapas do questionario</Text>
          {ANAMNESIS_STEPS.map((step) => {
            const answeredCount =
              latestAnamnesis?.answers.filter(
                (answer) => answer.stageId === step.id,
              ).length ?? 0;
            return (
              <View key={step.id} style={styles.compactRow}>
                <View style={styles.compactIcon}>
                  <Ionicons
                    name={answeredCount > 0 ? "checkmark" : "ellipse-outline"}
                    size={16}
                    color="#D90000"
                  />
                </View>
                <View style={styles.compactTextBlock}>
                  <Text style={styles.compactTitle}>{step.title}</Text>
                  <Text style={styles.compactDetail}>
                    {answeredCount} resposta(s) registradas
                  </Text>
                </View>
              </View>
            );
          })}

          <Text style={styles.subsectionTitle}>Checklist presencial</Text>
          {latestAnamnesis?.checklist.length ? (
            latestAnamnesis.checklist.map((item) => (
              <View key={item.id} style={styles.compactRow}>
                <View
                  style={[
                    styles.compactIcon,
                    item.priority === "attention" && styles.compactIconAlert,
                  ]}
                >
                  <Ionicons
                    name={
                      item.done ? "checkmark-circle" : "alert-circle-outline"
                    }
                    size={16}
                    color={item.done ? "#D90000" : "#ff4444"}
                  />
                </View>
                <Text style={styles.compactTitle}>{item.label}</Text>
              </View>
            ))
          ) : (
            <EmptyInline
              icon="checkmark-circle-outline"
              text="Nenhuma pendencia para revisao presencial."
            />
          )}

          {canManageStudent ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={props.onRequestUpdate}
            >
              <Ionicons name="refresh-outline" size={18} color="#D90000" />
              <Text style={styles.secondaryButtonText}>
                Solicitar atualizacao futura
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );

    case "assessments":
      return (
        <View style={styles.cardBlock}>
          {assessments[0] ? (
            <>
              <InfoLine
                icon="clipboard-outline"
                label="Ultima avaliacao"
                value={formatAssessmentDate(assessments[0].assessedAt)}
              />
              <InfoLine
                icon="flag-outline"
                label="Status"
                value={getAssessmentStatusLabel(assessments[0].status)}
              />
              <InfoLine
                icon="analytics-outline"
                label="Tipo"
                value={getAssessmentTypeLabel(assessments[0].type)}
              />
            </>
          ) : (
            <EmptyInline
              icon="clipboard-outline"
              text="Nenhuma avaliacao liberada para este aluno."
            />
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={props.onNavigateAssessments}
          >
            <Ionicons name="open-outline" size={18} color="#D90000" />
            <Text style={styles.secondaryButtonText}>Abrir avaliacoes</Text>
          </TouchableOpacity>
        </View>
      );

    case "workouts":
      return (
        <View style={styles.cardBlock}>
          <InfoLine
            icon="fitness-outline"
            label="Treino atual"
            value={profile.followUp.currentWorkoutName}
          />
          <InfoLine
            icon="calendar-outline"
            label="Inicio"
            value={formatProfileDate(profile.followUp.currentWorkoutStartedAt)}
          />
          <InfoLine
            icon="timer-outline"
            label="Validade"
            value={formatProfileDate(profile.followUp.currentWorkoutExpiresAt)}
          />
          <InfoLine
            icon="pulse-outline"
            label="Ultimo treino"
            value={formatRelativeDayCount(
              daysSince(profile.followUp.lastTrainingAt),
              "since",
            )}
          />
        </View>
      );

    case "frequency":
      return (
        <View style={styles.cardBlock}>
          <InfoLine
            icon="calendar-outline"
            label="Periodo"
            value={profile.frequency.periodLabel}
          />
          <InfoLine
            icon="checkmark-done-outline"
            label="Sessoes concluidas"
            value={`${profile.frequency.completedSessions}/${profile.frequency.plannedSessions}`}
          />
          <InfoLine
            icon="close-circle-outline"
            label="Faltas"
            value={String(profile.frequency.absences)}
          />
          <InfoLine
            icon="swap-horizontal-outline"
            label="Cancelamentos"
            value={String(profile.frequency.cancellations)}
          />
          <ProgressBar value={calculateAdherence(profile.frequency)} />
        </View>
      );

    case "feedbacks":
      return (
        <View style={styles.cardBlock}>
          {feedbacks[0] ? (
            <>
              <InfoLine
                icon="chatbubble-outline"
                label="Ultimo feedback"
                value={formatProfileDateTime(feedbacks[0].finishedAt)}
              />
              <InfoLine
                icon="star-outline"
                label="Nota"
                value={`${feedbacks[0].rating}/5 • ${feedbacks[0].intensity}`}
              />
              <InfoLine
                icon={
                  feedbacks[0].hasPain
                    ? "alert-circle-outline"
                    : "checkmark-circle-outline"
                }
                label="Dor"
                value={
                  feedbacks[0].hasPain
                    ? `${feedbacks[0].painRegion} • ${feedbacks[0].painLevel}/10`
                    : "Nao relatada"
                }
              />
            </>
          ) : (
            <EmptyInline
              icon="chatbubbles-outline"
              text="Nenhum feedback enviado pelo aluno."
            />
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={props.onNavigateFeedbacks}
          >
            <Ionicons name="open-outline" size={18} color="#D90000" />
            <Text style={styles.secondaryButtonText}>Abrir feedbacks</Text>
          </TouchableOpacity>
        </View>
      );

    case "loads":
      return (
        <View style={styles.cardBlock}>
          <InfoLine
            icon="analytics-outline"
            label="Analise principal"
            value="Execucoes e series registradas"
          />
          <InfoLine
            icon="shield-checkmark-outline"
            label="Regra"
            value="Aquecimentos e series invalidas ficam fora do calculo principal"
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={props.onNavigatePerformance}
          >
            <Ionicons name="open-outline" size={18} color="#D90000" />
            <Text style={styles.secondaryButtonText}>
              Abrir evolucao por exercicio
            </Text>
          </TouchableOpacity>

          <Text style={styles.subsectionTitle}>Resumo rapido de cargas</Text>
          <View style={styles.segmentedControl}>
            <SegmentButton
              label="Volume"
              active={loadMetric === "volume"}
              onPress={() => setLoadMetric("volume")}
            />
            <SegmentButton
              label="Carga"
              active={loadMetric === "load"}
              onPress={() => setLoadMetric("load")}
            />
            <SegmentButton
              label="Esforco"
              active={loadMetric === "effort"}
              onPress={() => setLoadMetric("effort")}
            />
          </View>

          <View style={styles.filterWrap}>
            {loadInsights.map((insight) => (
              <TouchableOpacity
                key={insight.id}
                style={[
                  styles.filterChip,
                  selectedLoadInsight?.id === insight.id &&
                    styles.filterChipActive,
                ]}
                onPress={() => setSelectedLoadInsightId(insight.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedLoadInsight?.id === insight.id &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {insight.exerciseName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedLoadInsight ? (
            <>
              <InfoLine
                icon="barbell-outline"
                label="Exercicio"
                value={selectedLoadInsight.exerciseName}
              />
              <InfoLine
                icon="construct-outline"
                label="Equipamento comparado"
                value={selectedLoadInsight.equipmentName}
              />
              <InfoLine
                icon="analytics-outline"
                label="Tendencia"
                value={selectedLoadInsight.trendLabel}
              />
              <InfoLine
                icon="trophy-outline"
                label="Melhor marca"
                value={
                  selectedLoadInsight.bestLoad
                    ? `${selectedLoadInsight.bestLoad}${selectedLoadInsight.unit === "kg" ? "kg" : ` ${selectedLoadInsight.unit}`}`
                    : "Nao calculavel"
                }
              />
              <LoadChart insight={selectedLoadInsight} metric={loadMetric} />
              {selectedLoadInsight.hasPainAlert ? (
                <View style={styles.inlineWarning}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color="#ff4444"
                  />
                  <Text style={styles.inlineWarningText}>
                    Ha registro de dor neste historico. Revise antes de
                    progredir.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <EmptyInline
              icon="bar-chart-outline"
              text="Dados insuficientes para evolucao de cargas."
            />
          )}
        </View>
      );

    case "body":
      return (
        <View style={styles.cardBlock}>
          {profile.bodyEvolution.length ? (
            profile.bodyEvolution.map((point) => (
              <View key={point.date} style={styles.compactRow}>
                <View style={styles.compactIcon}>
                  <Ionicons name="body-outline" size={16} color="#D90000" />
                </View>
                <View style={styles.compactTextBlock}>
                  <Text style={styles.compactTitle}>
                    {formatProfileDate(point.date)}
                  </Text>
                  <Text style={styles.compactDetail}>
                    {point.weightKg
                      ? `${point.weightKg}kg`
                      : "Peso sem registro"}
                    {point.bodyFatPercent
                      ? ` • ${point.bodyFatPercent}% gordura`
                      : ""}
                    {point.waistCm ? ` • cintura ${point.waistCm}cm` : ""}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyInline
              icon="body-outline"
              text="Nenhuma evolucao corporal registrada."
            />
          )}
        </View>
      );

    case "diet":
      return (
        <View style={styles.cardBlock}>
          <View style={styles.dietMacroSummary}>
            <View style={styles.dietMacroBox}>
              <Text style={styles.dietMacroValue}>2.400</Text>
              <Text style={styles.dietMacroLabel}>Kcal / dia</Text>
            </View>
            <View style={styles.dietMacroBox}>
              <Text style={styles.dietMacroValue}>160g</Text>
              <Text style={styles.dietMacroLabel}>Proteínas (2.0g/kg)</Text>
            </View>
            <View style={styles.dietMacroBox}>
              <Text style={styles.dietMacroValue}>280g</Text>
              <Text style={styles.dietMacroLabel}>Carboidratos</Text>
            </View>
            <View style={styles.dietMacroBox}>
              <Text style={styles.dietMacroValue}>65g</Text>
              <Text style={styles.dietMacroLabel}>Gorduras</Text>
            </View>
          </View>

          <Text style={styles.subsectionTitle}>Refeições do Dia</Text>

          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealIcon}>
                <Ionicons name="sunny-outline" size={16} color="#D90000" />
              </View>
              <Text style={styles.mealTitle}>Refeição 1 • Café da manhã (07:30)</Text>
            </View>
            <Text style={styles.mealContent}>
              • 3 ovos mexidos ou cozidos{"\n"}
              • 40g de aveia em flocos{"\n"}
              • 1 banana média (100g){"\n"}
              • Café preto sem açúcar
            </Text>
          </View>

          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealIcon}>
                <Ionicons name="restaurant-outline" size={16} color="#D90000" />
              </View>
              <Text style={styles.mealTitle}>Refeição 2 • Almoço (12:30)</Text>
            </View>
            <Text style={styles.mealContent}>
              • 150g de peito de frango grelhado ou patinho{"\n"}
              • 150g de arroz integral / batata doce{"\n"}
              • 100g de feijão carioca / preto{"\n"}
              • Salada verde à vontade + 1 col. azeite de oliva
            </Text>
          </View>

          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealIcon}>
                <Ionicons name="flame-outline" size={16} color="#D90000" />
              </View>
              <Text style={styles.mealTitle}>Refeição 3 • Pré-treino (16:30)</Text>
            </View>
            <Text style={styles.mealContent}>
              • 160g de iogurte natural / desnatado{"\n"}
              • 30g de Whey Protein 100%{"\n"}
              • 1 maçã média{"\n"}
              • 15g de pasta de amendoim integral
            </Text>
          </View>

          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealIcon}>
                <Ionicons name="moon-outline" size={16} color="#D90000" />
              </View>
              <Text style={styles.mealTitle}>Refeição 4 • Jantar / Pós-treino (20:00)</Text>
            </View>
            <Text style={styles.mealContent}>
              • 150g de carne magra / tilápia grelhada{"\n"}
              • 200g de batata inglesa ou mandioca cozida{"\n"}
              • Legumes cozidos no vapor (brócolis, cenoura)
            </Text>
          </View>

          <Text style={styles.subsectionTitle}>Hidratação & Suplementação</Text>
          <View style={styles.supplementBox}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Ionicons name="water-outline" size={14} color="#D90000" />
              <Text style={styles.supplementText}>Meta de água: 3,5 Litros por dia</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Ionicons name="flash-outline" size={14} color="#D90000" />
              <Text style={styles.supplementText}>Creatina Monohidratada: 5g ao dia (todos os dias)</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="medkit-outline" size={14} color="#D90000" />
              <Text style={styles.supplementText}>Multivitamínico: 1 cápsula após o café da manhã</Text>
            </View>
          </View>
        </View>
      );

    case "documents":
      return (
        <View style={styles.cardBlock}>
          {profile.documents.map((document) => (
            <View key={document.id} style={styles.compactRow}>
              <View style={styles.compactIcon}>
                <Ionicons
                  name="document-attach-outline"
                  size={16}
                  color="#D90000"
                />
              </View>
              <View style={styles.compactTextBlock}>
                <Text style={styles.compactTitle}>{document.title}</Text>
                <Text style={styles.compactDetail}>
                  {document.status === "pending_review"
                    ? "Aguardando analise"
                    : document.status}
                </Text>
              </View>
            </View>
          ))}
          {profile.restrictions.map((restriction) => (
            <View key={restriction.id} style={styles.inlineWarning}>
              <Ionicons name="warning-outline" size={16} color="#ff4444" />
              <Text style={styles.inlineWarningText}>{restriction.label}</Text>
            </View>
          ))}
        </View>
      );

    case "notes":
      if (!canManageStudent) {
        return (
          <EmptyInline
            icon="lock-closed-outline"
            text="Observacoes privadas nao estao disponiveis para o aluno."
          />
        );
      }

      return (
        <View style={styles.cardBlock}>
          {profile.privateTrainerNotes.map((note, index) => (
            <View key={`${note}-${index}`} style={styles.noteRow}>
              <Ionicons name="lock-closed-outline" size={16} color="#D90000" />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
          <Text style={styles.privateHint}>
            Observacoes privadas nao aparecem para o aluno.
          </Text>
        </View>
      );

    case "access":
      if (!canManageStudent) {
        return (
          <EmptyInline
            icon="lock-closed-outline"
            text="Controles de acesso sao exclusivos do treinador."
          />
        );
      }

      return (
        <View style={styles.cardBlock}>
          <InfoLine
            icon="person-circle-outline"
            label="Conta"
            value={
              profile.access.accountStatus === "active"
                ? "Ativa"
                : profile.access.accountStatus
            }
          />
          <InfoLine
            icon="log-in-outline"
            label="Ultimo acesso"
            value={formatProfileDateTime(profile.access.lastAccessAt)}
          />
          <InfoLine
            icon="mail-outline"
            label="Ultimo convite"
            value={formatProfileDateTime(profile.access.lastInviteAt)}
          />
          <InfoLine
            icon="shield-checkmark-outline"
            label="Sessoes revogadas"
            value={formatProfileDateTime(profile.access.sessionsRevokedAt)}
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={props.onGenerateInvite}
          >
            <Ionicons name="send-outline" size={18} color="#D90000" />
            <Text style={styles.secondaryButtonText}>
              Gerar novo convite seguro
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.warningButton}
            onPress={props.onRevokeSessions}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#ff4444" />
            <Text style={styles.warningButtonText}>Revogar sessoes ativas</Text>
          </TouchableOpacity>
        </View>
      );

    case "messages":
      return (
        <View style={styles.cardBlock}>
          <InfoLine
            icon="mail-outline"
            label="Ultima mensagem"
            value={formatProfileDateTime(profile.communication.lastMessageAt)}
          />
          <InfoLine
            icon="chatbubble-ellipses-outline"
            label="Nao lidas do aluno"
            value={String(profile.communication.unreadFromStudent)}
          />
        </View>
      );

    default:
      return null;
  }
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "neutral";
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === "primary" && styles.statusPillPrimary,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          tone === "primary" && styles.statusPillTextPrimary,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoLine}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color="#D90000" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ShortcutButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shortcutButton} onPress={onPress}>
      <View style={styles.shortcutIcon}>
        <Ionicons name={icon} size={19} color="#D90000" />
      </View>
      <Text style={styles.shortcutText} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SmallAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.smallAction} onPress={onPress}>
      <Ionicons name={icon} size={17} color="#D90000" />
      <Text style={styles.smallActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.segmentButtonText,
          active && styles.segmentButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ProgressBar({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${normalized}%` }]} />
      <Text style={styles.progressLabel}>{normalized}%</Text>
    </View>
  );
}

function LoadChart({
  insight,
  metric,
}: {
  insight: ReturnType<typeof buildLoadEvolutionInsights>[number];
  metric: LoadMetric;
}) {
  const values = insight.records.map((record) => {
    if (metric === "volume") return record.volume ?? 0;
    if (metric === "load") return record.load ?? 0;
    return record.effort ?? 0;
  });
  const maxValue = Math.max(...values, 1);

  return (
    <View style={styles.chartWrap}>
      {insight.records.map((record, index) => {
        const value = values[index];
        const height = Math.max(12, Math.round((value / maxValue) * 72));
        return (
          <TouchableOpacity
            key={`${record.date}-${index}`}
            style={styles.chartPoint}
            onPress={() =>
              Alert.alert(
                "Registro",
                `${formatProfileDate(record.date)}\nCarga: ${record.load ?? "-"}\nReps: ${record.reps ?? "-"}\nVolume: ${
                  record.volume ?? "nao calculavel"
                }\nEsforco: ${record.effort ?? "-"}`,
              )
            }
          >
            <View style={[styles.chartBar, { height }]} />
            <Text style={styles.chartLabel}>
              {formatProfileDate(record.date).slice(0, 5)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EmptyInline({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.emptyInline}>
      <Ionicons name={icon} size={18} color="#D90000" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function ActionMenu({
  visible,
  saving,
  canManageStudent,
  canEditRegistration,
  onClose,
  onEdit,
  onStatus,
  onInvite,
  onAnamnesis,
  onAccess,
  onPause,
  onCloseStudent,
}: {
  visible: boolean;
  saving: boolean;
  canManageStudent: boolean;
  canEditRegistration: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatus: () => void;
  onInvite: () => void;
  onAnamnesis: () => void;
  onAccess: () => void;
  onPause: () => void;
  onCloseStudent: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.modalTitle}>
            {canManageStudent ? "Acoes do aluno" : "Perfil"}
          </Text>
          {canEditRegistration ? (
            <MenuAction
              icon="create-outline"
              label="Editar cadastro"
              onPress={onEdit}
            />
          ) : null}
          {canManageStudent ? (
            <MenuAction
              icon="swap-horizontal-outline"
              label="Alterar status"
              onPress={onStatus}
            />
          ) : null}
          <MenuAction
            icon="document-text-outline"
            label="Abrir anamnese"
            onPress={onAnamnesis}
          />
          {canManageStudent ? (
            <>
              <MenuAction
                icon="send-outline"
                label="Gerar convite"
                onPress={onInvite}
              />
              <MenuAction
                icon="key-outline"
                label="Controle de acesso"
                onPress={onAccess}
              />
              <MenuAction
                icon="pause-circle-outline"
                label="Pausar acompanhamento"
                onPress={onPause}
                disabled={saving}
              />
              <MenuAction
                icon="archive-outline"
                label="Encerrar acompanhamento"
                onPress={onCloseStudent}
                danger
                disabled={saving}
              />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuAction({
  icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuAction, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={19} color={danger ? "#ff4444" : "#D90000"} />
      <Text
        style={[styles.menuActionText, danger && styles.menuActionTextDanger]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatusModal({
  visible,
  currentStatus,
  saving,
  onClose,
  onChange,
}: {
  visible: boolean;
  currentStatus: StudentStatus;
  saving: boolean;
  onClose: () => void;
  onChange: (status: StudentStatus) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.modalTitle}>Status do vinculo</Text>
          {STUDENT_STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.menuAction,
                currentStatus === option.value && styles.menuActionActive,
              ]}
              onPress={() => onChange(option.value)}
              disabled={saving}
            >
              <Ionicons
                name={
                  currentStatus === option.value
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={19}
                color="#D90000"
              />
              <Text style={styles.menuActionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AlertDetailModal({
  visible,
  alert,
  studentName,
  canManageStudent,
  onClose,
  onAction,
}: {
  visible: boolean;
  alert: ReturnType<typeof buildStudentAlerts>[number] | null;
  studentName: string;
  canManageStudent: boolean;
  onClose: () => void;
  onAction: (actionKey: string) => void;
}) {
  if (!alert) return null;

  const isDanger = alert.tone === "danger";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.alertModalCard}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.alertModalHeader}>
            <View
              style={[
                styles.alertModalIconBox,
                isDanger && styles.alertModalIconBoxDanger,
              ]}
            >
              <Ionicons
                name={isDanger ? "alert-circle" : "warning"}
                size={22}
                color={isDanger ? "#ff4444" : "#D90000"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.alertModalTagRow}>
                <Text
                  style={[
                    styles.alertModalTag,
                    isDanger && styles.alertModalTagDanger,
                  ]}
                >
                  {isDanger ? "ALERTA CRÍTICO" : "ATENÇÃO NECESSÁRIA"}
                </Text>
              </View>
              <Text style={styles.alertModalTitle}>{alert.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.alertModalCloseBtn}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.alertModalContextBox}>
            <Text style={styles.alertModalStudentName}>
              Aluno: {studentName}
            </Text>
            <Text style={styles.alertModalDetail}>{alert.detail}</Text>
          </View>

          <Text style={styles.alertModalActionsTitle}>Ações recomendadas:</Text>

          <View style={styles.alertModalActionsList}>
            {alert.id === "anamnesis-review" && (
              <>
                <TouchableOpacity
                  style={styles.alertPrimaryActionBtn}
                  onPress={() => onAction("open_anamnesis")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text" size={18} color="#fff" />
                  <Text style={styles.alertPrimaryActionText}>
                    Ler Respostas da Anamnese
                  </Text>
                </TouchableOpacity>

                {canManageStudent && (
                  <TouchableOpacity
                    style={styles.alertSecondaryActionBtn}
                    onPress={() => onAction("review_anamnesis")}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#D90000"
                    />
                    <Text style={styles.alertSecondaryActionText}>
                      Marcar como Revisada
                    </Text>
                  </TouchableOpacity>
                )}

                {canManageStudent && (
                  <TouchableOpacity
                    style={styles.alertSecondaryActionBtn}
                    onPress={() => onAction("request_anamnesis")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#888" />
                    <Text style={styles.alertSecondaryActionTextMuted}>
                      Solicitar Atualização ao Aluno
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {alert.id === "workout-expiring" && (
              <>
                <TouchableOpacity
                  style={styles.alertPrimaryActionBtn}
                  onPress={() => onAction("open_training")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="fitness" size={18} color="#fff" />
                  <Text style={styles.alertPrimaryActionText}>
                    Abrir e Renovar Treinos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertSecondaryActionBtn}
                  onPress={() => onAction("open_chat")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color="#D90000"
                  />
                  <Text style={styles.alertSecondaryActionText}>
                    Avisar Aluno pelo Chat
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {alert.id === "absence" && (
              <>
                <TouchableOpacity
                  style={styles.alertPrimaryActionBtn}
                  onPress={() => onAction("open_chat")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  <Text style={styles.alertPrimaryActionText}>
                    Enviar Mensagem de Incentivo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertSecondaryActionBtn}
                  onPress={() => onAction("open_whatsapp")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text
                    style={[
                      styles.alertSecondaryActionText,
                      { color: "#25D366" },
                    ]}
                  >
                    Contatar via WhatsApp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertSecondaryActionBtn}
                  onPress={() => onAction("view_in_profile")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#888" />
                  <Text style={styles.alertSecondaryActionTextMuted}>
                    Ver Histórico de Frequência
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {alert.id === "pain-load" && (
              <>
                <TouchableOpacity
                  style={styles.alertPrimaryActionBtn}
                  onPress={() => onAction("open_loads")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trending-up" size={18} color="#fff" />
                  <Text style={styles.alertPrimaryActionText}>
                    Ver Histórico de Cargas & Dores
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertSecondaryActionBtn}
                  onPress={() => onAction("open_chat")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color="#D90000"
                  />
                  <Text style={styles.alertSecondaryActionText}>
                    Orientar Aluno no Chat
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertSecondaryActionBtn}
                  onPress={() => onAction("open_feedbacks")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="star-outline" size={18} color="#888" />
                  <Text style={styles.alertSecondaryActionTextMuted}>
                    Ver Feedbacks dos Treinos
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {alert.id === "assessment-expired" && (
              <>
                <TouchableOpacity
                  style={styles.alertPrimaryActionBtn}
                  onPress={() => onAction("open_assessments")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="clipboard" size={18} color="#fff" />
                  <Text style={styles.alertPrimaryActionText}>
                    Ver / Criar Avaliação Física
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertSecondaryActionBtn}
                  onPress={() => onAction("open_whatsapp")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text
                    style={[
                      styles.alertSecondaryActionText,
                      { color: "#25D366" },
                    ]}
                  >
                    Agendar no WhatsApp
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {(alert.id === "document-review" || alert.id === "restriction") && (
              <>
                <TouchableOpacity
                  style={styles.alertPrimaryActionBtn}
                  onPress={() => onAction("open_documents")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text style={styles.alertPrimaryActionText}>
                    Ver Documentos & Restrições
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertSecondaryActionBtn}
                  onPress={() => onAction("open_chat")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color="#D90000"
                  />
                  <Text style={styles.alertSecondaryActionText}>
                    Conversar com Aluno
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.alertSecondaryActionBtn}
              onPress={() => onAction("view_in_profile")}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={18} color="#aaa" />
              <Text style={styles.alertSecondaryActionTextMuted}>
                Visualizar Seção no Perfil
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EditRegistrationModal({
  visible,
  draft,
  saving,
  canManageStudent,
  onClose,
  onChangeField,
  onChangeContact,
  onSave,
}: {
  visible: boolean;
  draft: StudentRegistration | null;
  saving: boolean;
  canManageStudent: boolean;
  onClose: () => void;
  onChangeField: <K extends keyof StudentRegistration>(
    field: K,
    value: StudentRegistration[K],
  ) => void;
  onChangeContact: (
    field: keyof StudentRegistration["contact"],
    value: string,
  ) => void;
  onSave: () => void;
}) {
  if (!draft) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.editTitle}>Dados cadastrais</Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  Keyboard.dismiss();
                  onSave();
                }}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Salvando" : "Salvar"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={[styles.editContent, { paddingBottom: 360 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <FormField
                label="Nome completo"
                value={draft.fullName}
                icon="person-outline"
                required
                onClear={() => onChangeField("fullName", "")}
                onChangeText={(value) => onChangeField("fullName", value)}
              />
              <FormField
                label="Data de nascimento"
                value={draft.birthDate}
                placeholder="00/00/0000"
                keyboardType="numeric"
                maxLength={10}
                icon="calendar-outline"
                required
                onClear={() => onChangeField("birthDate", "")}
                onChangeText={(value) => onChangeField("birthDate", formatDateInput(value))}
              />
              <FormField
                label="Objetivo principal"
                value={draft.mainGoal}
                icon="trophy-outline"
                onClear={() => onChangeField("mainGoal", "")}
                onChangeText={(value) => onChangeField("mainGoal", value)}
              />
              <FormField
                label="Telefone"
                value={draft.contact.phone ?? ""}
                placeholder="(11) 99999-9999"
                keyboardType="phone-pad"
                maxLength={15}
                icon="call-outline"
                onClear={() => onChangeContact("phone", "")}
                onChangeText={(value) => onChangeContact("phone", formatPhoneInput(value))}
              />
              <FormField
                label="WhatsApp"
                value={draft.contact.whatsapp ?? ""}
                placeholder="(11) 99999-9999"
                keyboardType="phone-pad"
                maxLength={15}
                icon="logo-whatsapp"
                iconColor="#25D366"
                onClear={() => onChangeContact("whatsapp", "")}
                onChangeText={(value) => onChangeContact("whatsapp", formatPhoneInput(value))}
              />
              <FormField
                label="E-mail"
                value={draft.contact.email ?? ""}
                placeholder="aluno@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                onClear={() => onChangeContact("email", "")}
                onChangeText={(value) => onChangeContact("email", value)}
              />
              <FormField
                label="Profissao"
                value={draft.profession ?? ""}
                icon="briefcase-outline"
                onClear={() => onChangeField("profession", "")}
                onChangeText={(value) => onChangeField("profession", value)}
              />
              <FormField
                label="Endereco"
                value={draft.address ?? ""}
                icon="location-outline"
                onClear={() => onChangeField("address", "")}
                onChangeText={(value) => onChangeField("address", value)}
              />
              <FormField
                label="Contato de emergencia"
                value={draft.contact.emergencyName ?? ""}
                icon="shield-outline"
                onClear={() => onChangeContact("emergencyName", "")}
                onChangeText={(value) => onChangeContact("emergencyName", value)}
              />
              <FormField
                label="Telefone de emergencia"
                value={draft.contact.emergencyPhone ?? ""}
                placeholder="(11) 99999-9999"
                keyboardType="phone-pad"
                maxLength={15}
                icon="call-outline"
                onClear={() => onChangeContact("emergencyPhone", "")}
                onChangeText={(value) => onChangeContact("emergencyPhone", formatPhoneInput(value))}
              />
              {canManageStudent ? (
                <FormField
                  label="Observacoes administrativas"
                  value={draft.administrativeNotes ?? ""}
                  multiline
                  icon="document-text-outline"
                  onChangeText={(value) =>
                    onChangeField("administrativeNotes", value)
                  }
                />
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  icon,
  iconColor = "#D90000",
  required,
  badge,
  helperText,
  errorText,
  onClear,
  maxLength,
  rightElement,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  required?: boolean;
  badge?: React.ReactNode;
  helperText?: string;
  errorText?: string;
  onClear?: () => void;
  maxLength?: number;
  rightElement?: React.ReactNode;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.formField}>
      <View style={styles.formLabelRow}>
        <View style={styles.formLabelLeft}>
          <Text style={styles.formLabel}>{label}</Text>
          {required ? <Text style={styles.formRequiredDot}>*</Text> : null}
        </View>
        {badge ? <View>{badge}</View> : null}
      </View>
      <View
        style={[
          styles.formInputContainer,
          isFocused && styles.formInputContainerFocused,
          Boolean(errorText) && styles.formInputContainerError,
          multiline && styles.formInputContainerMultiline,
        ]}
      >
        {icon ? (
          <View
            style={[
              styles.formInputIconWrap,
              multiline && styles.formInputIconWrapMultiline,
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={isFocused ? "#D90000" : iconColor || "#777"}
            />
          </View>
        ) : null}
        <TextInput
          style={[
            styles.formInput,
            icon ? styles.formInputWithIcon : undefined,
            multiline && styles.formInputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#555"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
        />
        {rightElement ? (
          <View style={styles.formInputRightElement}>{rightElement}</View>
        ) : onClear && Boolean(value) && !multiline ? (
          <TouchableOpacity
            style={styles.formInputClearButton}
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={16} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>
      {errorText ? (
        <Text style={styles.formFieldErrorText}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.formFieldHelperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

function normalizeTrainerProfileSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },
  centerText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#D90000",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  backToTrainerProfileButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  backToTrainerProfileText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  header: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  avatarFrame: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "#111111",
    borderWidth: 2,
    borderColor: "#D90000",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  studentName: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  studentMeta: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  studentGoalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#101010",
    borderLeftWidth: 3,
    borderLeftColor: "#D90000",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  studentGoalIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  studentGoalText: {
    flex: 1,
    color: "#E0E0E0",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  headerChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  statusPillActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D90000",
  },
  statusPillActiveText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
  },
  statusPillNeutral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusPillNeutralText: {
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    maxWidth: "100%",
  },
  statusPillPrimary: {
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderColor: "rgba(217, 0, 0, 0.28)",
  },
  statusPillText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "700",
  },
  statusPillTextPrimary: {
    color: "#D90000",
  },
  headerSchedule: {
    borderTopWidth: 1,
    borderTopColor: "#262626",
    marginTop: 16,
    paddingTop: 14,
    gap: 10,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scheduleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  scheduleInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scheduleLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  scheduleValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  saveState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  saveStateText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  sectionHint: {
    color: "#666",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  alertRow: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  alertRowDanger: {
    borderColor: "rgba(255, 68, 68, 0.25)",
    backgroundColor: "#1f1717",
  },
  alertCountBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  alertCountText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  alertActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alertActionPillText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  showAllAlertsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#151515",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    marginTop: 4,
    marginBottom: 8,
  },
  showAllAlertsBtnText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  alertModalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#161616",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#303030",
    padding: 20,
  },
  alertModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  alertModalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertModalIconBoxDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.18)",
  },
  alertModalTagRow: {
    marginBottom: 2,
  },
  alertModalTag: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  alertModalTagDanger: {
    color: "#ff4444",
  },
  alertModalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  alertModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  alertModalContextBox: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 16,
  },
  alertModalStudentName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  alertModalDetail: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 18,
  },
  alertModalActionsTitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  alertModalActionsList: {
    gap: 8,
  },
  alertPrimaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D90000",
    borderRadius: 14,
    paddingVertical: 14,
  },
  alertPrimaryActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  alertSecondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2e2e2e",
  },
  alertSecondaryActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  alertSecondaryActionTextMuted: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertIconDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  alertTextBlock: {
    flex: 1,
  },
  alertTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  alertDetail: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
  },
  summaryList: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  summaryLabel: {
    flex: 0.82,
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    flex: 1.2,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 18,
  },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  shortcutButton: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 90,
    minHeight: 92,
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    justifyContent: "space-between",
  },
  shortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  evolutionCargasFullButton: {
    width: "100%",
    minHeight: 64,
    backgroundColor: "#D90000",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  evolutionCargasIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  evolutionCargasTextCol: {
    flex: 1,
  },
  evolutionCargasTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  evolutionCargasSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  dietMacroSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  dietMacroBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    alignItems: "center",
  },
  dietMacroValue: {
    color: "#D90000",
    fontSize: 16,
    fontWeight: "900",
  },
  dietMacroLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  mealCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    marginBottom: 8,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  mealIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  mealTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  mealContent: {
    color: "#bbb",
    fontSize: 12,
    lineHeight: 18,
    paddingLeft: 4,
  },
  supplementBox: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    gap: 6,
  },
  supplementText: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "600",
  },
  cardBlock: {
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    gap: 10,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 34,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217, 0, 0, 0.1)",
  },
  infoLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    flex: 0.8,
  },
  infoValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1.1,
    textAlign: "right",
    lineHeight: 18,
  },
  progressTrack: {
    height: 24,
    borderRadius: 9,
    backgroundColor: "#2a2a2a",
    overflow: "hidden",
    justifyContent: "center",
    marginVertical: 6,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#D90000",
  },
  progressLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  smallAction: {
    flexGrow: 1,
    minWidth: "30%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  smallActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.35)",
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  warningButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.4)",
    backgroundColor: "rgba(255, 68, 68, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  warningButtonText: {
    color: "#ff4444",
    fontSize: 13,
    fontWeight: "800",
  },
  subsectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#252525",
  },
  compactIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  compactIconAlert: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  compactTextBlock: {
    flex: 1,
  },
  compactTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    flex: 1,
  },
  compactDetail: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  emptyInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  emptyText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#242424",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 9,
  },
  segmentButtonActive: {
    backgroundColor: "#D90000",
  },
  segmentButtonText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "800",
  },
  segmentButtonTextActive: {
    color: "#fff",
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: {
    borderColor: "rgba(217, 0, 0, 0.45)",
    backgroundColor: "rgba(217, 0, 0, 0.12)",
  },
  filterChipText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  chartWrap: {
    minHeight: 112,
    borderRadius: 12,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 8,
  },
  chartPoint: {
    flex: 1,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  chartBar: {
    width: "72%",
    borderRadius: 8,
    backgroundColor: "#D90000",
  },
  chartLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
  },
  inlineWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.25)",
    borderRadius: 10,
    padding: 10,
  },
  inlineWarningText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    flex: 1,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  noteText: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  privateHint: {
    color: "#777",
    fontSize: 12,
    lineHeight: 18,
  },
  trainerProfileScrollContent: {
    width: "100%",
    alignSelf: "center",
  },
  trainerProfileTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 22,
  },
  trainerProfileTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  trainerProfileMenuButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerProfileEyebrow: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  trainerProfileTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  trainerProfileLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  trainerProfileLogoutText: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "900",
  },
  trainerHomeHeader: {
    marginBottom: 12,
  },
  trainerHomeHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 26,
  },
  trainerHomeLogo: {
    width: 140,
    height: 42,
  },
  trainerHomeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trainerHomeIconButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2f2f2f",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerHomeAvatarButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 2,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  trainerHomeAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  trainerHomeWelcomeBlock: {
    marginBottom: 10,
  },
  trainerHomeWelcome: {
    color: "#ECEDEE",
    fontSize: 25,
    fontWeight: "700",
  },
  trainerHomeName: {
    color: "#D90000",
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  trainerIdentityBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#161616",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    marginBottom: 14,
  },
  trainerIdentityAvatarFrame: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#101010",
    borderWidth: 2,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  trainerIdentityAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#161616",
  },
  trainerIdentityTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  trainerIdentityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  trainerIdentityName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
  },
  editBrandingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D90000",
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(217, 0, 0, 0.08)",
  },
  editBrandingButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D90000",
  },
  trainerIdentityCref: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginTop: 2,
    color: "#D90000",
  },
  trainerIdentityEmail: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  trainerIdentityChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  trainerRolePill: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  trainerRolePillText: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  trainerShortcutPanel: {
    backgroundColor: "#D90000",
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
  },
  trainerShortcutScroller: {
    marginRight: 34,
  },
  trainerShortcutRail: {
    gap: 6,
    paddingLeft: 12,
    paddingRight: 10,
    paddingTop: 2,
    paddingBottom: 2,
  },
  trainerShortcutItem: {
    width: 82,
    alignItems: "center",
  },
  trainerShortcutCircle: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#0f0f0fff",
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  trainerShortcutBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  trainerShortcutBadgeText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  trainerShortcutLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 14,
    marginTop: 8,
    width: "100%",
  },
  trainerShortcutHint: {
    position: "absolute",
    right: 10,
    top: 34,
    width: 26,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(15, 15, 15, 0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerMigrationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  trainerMigrationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerMigrationContent: {
    flex: 1,
    gap: 2,
  },
  trainerMigrationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trainerMigrationTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  trainerMigrationBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trainerMigrationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  trainerMigrationSubtitle: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  trainerSearchBox: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  trainerSearchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  trainerFilterRail: {
    gap: 8,
    paddingBottom: 14,
    paddingRight: 20,
  },
  trainerFilterChip: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
  },
  trainerFilterChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  trainerFilterChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  trainerFilterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  trainerFilterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  trainerFilterBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  trainerFilterBadgeText: {
    color: "#AAAAAA",
    fontSize: 10,
    fontWeight: "900",
  },
  trainerFilterBadgeTextActive: {
    color: "#FFFFFF",
  },
  trainerListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  trainerListTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  trainerListTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  trainerListSubtitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  trainerAddStudentButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#D90000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  trainerAddStudentText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  trainerListMetaRow: {
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#292929",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingLeft: 12,
    paddingRight: 8,
    marginTop: -4,
    marginBottom: 12,
  },
  trainerListMetaText: {
    flex: 1,
    color: "#777",
    fontSize: 12,
    fontWeight: "800",
  },
  trainerClearButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  trainerClearButtonText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  trainerStudentRow: {
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginBottom: 12,
  },
  trainerStudentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trainerStudentMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trainerStudentAvatarFrame: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(217, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  trainerStudentAvatar: {
    width: "100%",
    height: "100%",
  },
  trainerStudentTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  trainerStudentNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trainerStudentName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
  },
  trainerStudentEmail: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  trainerStudentMeta: {
    color: "#777",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  trainerStudentStatusPill: {
    borderRadius: 9,
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#343434",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  trainerStudentStatusPillActive: {
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderColor: "rgba(217, 0, 0, 0.35)",
  },
  trainerStudentStatusText: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "900",
  },
  trainerStudentStatusTextActive: {
    color: "#D90000",
  },
  trainerStudentWorkoutBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#242424",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#303030",
    padding: 11,
    marginTop: 12,
  },
  trainerStudentWorkoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0f0f0fff",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerStudentWorkoutText: {
    flex: 1,
    minWidth: 0,
  },
  trainerStudentWorkoutLabel: {
    color: "#777",
    fontSize: 10,
    fontWeight: "900",
  },
  trainerStudentWorkoutValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  trainerStudentNextAction: {
    color: "#999",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  trainerWhatsAppButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerStatusBadge: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  trainerStatusBadgeActive: {
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderColor: "rgba(217, 0, 0, 0.34)",
  },
  trainerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#777",
  },
  trainerStatusDotActive: {
    backgroundColor: "#D90000",
  },
  trainerStatusBadgeText: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "900",
  },
  trainerStatusBadgeTextActive: {
    color: "#D90000",
  },
  trainerStudentFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  trainerStudentPills: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 7,
    minWidth: 0,
  },
  trainerStudentPill: {
    height: 34,
    borderRadius: 11,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#303030",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  trainerStudentPillText: {
    color: "#d7d7d7",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    flexShrink: 1,
  },
  trainerStudentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  trainerProfileStateCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    padding: 18,
    marginTop: 8,
  },
  trainerProfileStateTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },
  trainerProfileStateText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  trainerProfileRetryButton: {
    borderRadius: 10,
    backgroundColor: "#D90000",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  trainerProfileRetryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1c1c",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#ff4444",
    gap: 12,
  },
  logoutText: {
    color: "#ff4444",
    fontSize: 16,
    fontWeight: "700",
  },
  appInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  appLogo: {
    width: 130,
    height: 36,
    marginBottom: 8,
  },
  appVersion: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
    padding: 20,
  },
  actionSheet: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    gap: 6,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  menuAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuActionActive: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
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
  editModal: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  editHeader: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#242424",
  },
  editTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  saveButton: {
    backgroundColor: "#D90000",
    borderRadius: 10,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  editContent: {
    padding: 20,
    paddingBottom: 60,
  },
  editHeaderSubtitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  newStudentHeroCard: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  newStudentHeroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  newStudentHeroTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  newStudentHeroTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  newStudentHeroSubtitle: {
    color: "#999",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 4,
  },
  formErrorBanner: {
    backgroundColor: "rgba(255, 68, 68, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.3)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  formErrorText: {
    flex: 1,
    color: "#FF6666",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  formSection: {
    backgroundColor: "#131313",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
    marginBottom: 16,
  },
  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  formSectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  formSectionTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  formField: {
    marginBottom: 14,
  },
  formLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  formLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  formLabel: {
    color: "#bbb",
    fontSize: 12,
    fontWeight: "800",
  },
  formRequiredDot: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  formInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#2B2B2B",
    paddingHorizontal: 12,
  },
  formInputContainerFocused: {
    borderColor: "#D90000",
    backgroundColor: "#1E1616",
  },
  formInputContainerError: {
    borderColor: "#FF4444",
  },
  formInputContainerMultiline: {
    minHeight: 90,
    alignItems: "flex-start",
    paddingTop: 10,
  },
  formInputIconWrap: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  formInputIconWrapMultiline: {
    marginTop: 2,
  },
  formInput: {
    flex: 1,
    minHeight: 46,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 8,
  },
  formInputWithIcon: {
    paddingLeft: 0,
  },
  formInputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  formInputClearButton: {
    padding: 6,
  },
  formInputRightElement: {
    paddingLeft: 6,
  },
  formFieldHelperText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 2,
  },
  formFieldErrorText: {
    color: "#FF5555",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    marginLeft: 2,
  },
  calculatedAgeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  calculatedAgeText: {
    color: "#FF4444",
    fontSize: 11,
    fontWeight: "800",
  },
  genderSelector: {
    flexDirection: "row",
    gap: 8,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#2B2B2B",
  },
  genderOptionActive: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.15)",
  },
  genderOptionText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  genderOptionTextActive: {
    color: "#fff",
    fontWeight: "900",
  },
  quickGoalsLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  quickGoalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 14,
  },
  quickGoalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#303030",
  },
  quickGoalChipActive: {
    backgroundColor: "rgba(217, 0, 0, 0.2)",
    borderColor: "#D90000",
  },
  quickGoalChipText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "700",
  },
  quickGoalChipTextActive: {
    color: "#fff",
    fontWeight: "900",
  },
  newStudentPrimaryBtn: {
    backgroundColor: "#D90000",
    borderRadius: 14,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  newStudentPrimaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
