import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import {
  TrainingFeedback,
  formatFeedbackDate,
  getFeedbackStatusLabel,
  listFeedbacksForTrainer,
} from "@/services/feedback-store";
import {
  PhysicalAssessment,
  listAssessmentsForTrainer,
} from "@/services/assessment-store";
import {
  StudentProfile,
  buildLoadEvolutionInsights,
  calculateAdherence,
  daysUntil,
  formatProfileDate,
  getWhatsAppUrl,
} from "@/services/student-profile-store";
import {
  TrainerHomeDashboard,
  TrainerHomeStudentSummary,
  getTrainerHomeDashboard,
} from "@/services/trainer-home-store";

export type TrainerToolMode =
  | "evolution-ranking"
  | "registration-link"
  | "my-exercises"
  | "feedback"
  | "contacts"
  | "reassessments"
  | "workout-templates"
  | "expirations"
  | "frequency-ranking";

type ToolConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type CustomExercise = {
  id: string;
  name: string;
  category: string;
  metric: string;
  note: string;
};

type WorkoutTemplate = {
  id: string;
  name: string;
  focus: string;
  level: string;
  sessions: string;
};

const ACCENT = "#D90000";
const BACKGROUND = "#0f0f0f";
const CARD = "#191919";
const CARD_SOFT = "#222";
const BORDER = "#303030";
const TEXT = "#fff";
const MUTED = "#9a9a9a";
const SUBTLE = "#6f6f6f";

const TOOL_CONFIG: Record<TrainerToolMode, ToolConfig> = {
  "evolution-ranking": {
    eyebrow: "Ranking",
    title: "Ranking evolução",
    subtitle: "Alunos com melhor progressão de carga e composição.",
    icon: "stats-chart-outline",
  },
  "registration-link": {
    eyebrow: "Cadastro",
    title: "Link cadastro",
    subtitle: "Convites prontos para enviar e acompanhar.",
    icon: "link-outline",
  },
  "my-exercises": {
    eyebrow: "Biblioteca",
    title: "Meus exercícios",
    subtitle: "Exercícios usados, personalizados e rastreáveis.",
    icon: "barbell-outline",
  },
  feedback: {
    eyebrow: "Triagem",
    title: "Feedback",
    subtitle: "Devolutivas dos alunos com prioridade de resposta.",
    icon: "chatbubble-ellipses-outline",
  },
  contacts: {
    eyebrow: "Relacionamento",
    title: "Contato",
    subtitle: "Central de WhatsApp, telefone e email dos alunos.",
    icon: "id-card-outline",
  },
  reassessments: {
    eyebrow: "Agenda clínica",
    title: "Reavaliações",
    subtitle: "Vencidas, próximas e prontas para criar.",
    icon: "calendar-number-outline",
  },
  "workout-templates": {
    eyebrow: "Prescrição",
    title: "Treinos padrões",
    subtitle: "Modelos reutilizáveis para acelerar a montagem.",
    icon: "list-outline",
  },
  expirations: {
    eyebrow: "Operação",
    title: "Próximo vencimento",
    subtitle: "Treinos e reavaliações por ordem de urgência.",
    icon: "timer-outline",
  },
  "frequency-ranking": {
    eyebrow: "Ranking",
    title: "Ranking frequência",
    subtitle: "Aderência, faltas e consistência dos alunos.",
    icon: "refresh-circle-outline",
  },
};

const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  { id: "tpl-strength-a", name: "Forca base A/B", focus: "Forca", level: "Intermediario", sessions: "4x semana" },
  { id: "tpl-hypertrophy", name: "Hipertrofia enxuta", focus: "Hipertrofia", level: "Intermediario", sessions: "5x semana" },
  { id: "tpl-return", name: "Retorno progressivo", focus: "Readaptacao", level: "Iniciante", sessions: "3x semana" },
  { id: "tpl-conditioning", name: "Condicionamento 30'", focus: "Cardio e core", level: "Todos", sessions: "2x semana" },
];

export function TrainerProfileToolScreen({ mode }: { mode: TrainerToolMode }) {
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const config = TOOL_CONFIG[mode];
  const [dashboard, setDashboard] = useState<TrainerHomeDashboard | null>(null);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(DEFAULT_TEMPLATES);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(mode === "registration-link" ? "complete" : "all");
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [exerciseDraft, setExerciseDraft] = useState<CustomExercise>(() => createExerciseDraft());
  const [templateDraft, setTemplateDraft] = useState<WorkoutTemplate>(() => createTemplateDraft());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (session.user.role !== "TRAINER") {
      setError("Area disponivel para profissionais.");
      setLoading(false);
      return;
    }

    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [nextDashboard, nextFeedbacks, nextAssessments, storedExercises, storedTemplates] = await Promise.all([
        getTrainerHomeDashboard(session.user.id),
        listFeedbacksForTrainer(session.user.id),
        listAssessmentsForTrainer(session.user.id),
        readJson<CustomExercise[]>(getStorageKey(session.user.id, "exercises"), []),
        readJson<WorkoutTemplate[]>(getStorageKey(session.user.id, "templates"), DEFAULT_TEMPLATES),
      ]);

      setDashboard(nextDashboard);
      setFeedbacks(nextFeedbacks);
      setAssessments(nextAssessments);
      setCustomExercises(storedExercises);
      setTemplates(storedTemplates.length ? storedTemplates : DEFAULT_TEMPLATES);
    } catch {
      setError("Nao foi possivel carregar esta area.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const students = dashboard?.students ?? [];
  const profiles = dashboard?.rawProfiles ?? [];
  const normalizedQuery = normalize(query);
  const totalStudents = students.length;

  const openStudent = (studentId: string) => {
    router.push({ pathname: "/profile" as never, params: { studentId } });
  };

  const saveExercise = async () => {
    if (!session) return;
    if (!exerciseDraft.name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome do exercicio.");
      return;
    }

    const next = [exerciseDraft, ...customExercises.filter((item) => item.id !== exerciseDraft.id)];
    setCustomExercises(next);
    await AsyncStorage.setItem(getStorageKey(session.user.id, "exercises"), JSON.stringify(next));
    setExerciseDraft(createExerciseDraft());
    setExerciseModalVisible(false);
  };

  const saveTemplate = async () => {
    if (!session) return;
    if (!templateDraft.name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome do modelo.");
      return;
    }

    const next = [templateDraft, ...templates.filter((item) => item.id !== templateDraft.id)];
    setTemplates(next);
    await AsyncStorage.setItem(getStorageKey(session.user.id, "templates"), JSON.stringify(next));
    setTemplateDraft(createTemplateDraft());
    setTemplateModalVisible(false);
  };

  const shareRegistrationLink = async () => {
    if (!session) return;
    const link = buildRegistrationLink(session.user.id, filter);
    await Share.share({
      message: `Cadastro Indigo para novos alunos: ${link}`,
    });
  };

  const content = () => {
    if (mode === "evolution-ranking") return renderEvolutionRanking(profiles, normalizedQuery, openStudent);
    if (mode === "registration-link") {
      return renderRegistrationLink(dashboard?.trainer.id ?? session?.user.id ?? "trainer", students, filter, setFilter, shareRegistrationLink);
    }
    if (mode === "my-exercises") {
      return renderExercises(
        profiles,
        customExercises,
        normalizedQuery,
        () => {
          setExerciseDraft(createExerciseDraft());
          setExerciseModalVisible(true);
        },
        (exercise) => {
          setExerciseDraft(exercise);
          setExerciseModalVisible(true);
        }
      );
    }
    if (mode === "feedback") return renderFeedback(feedbacks, normalizedQuery, filter, setFilter);
    if (mode === "contacts") return renderContacts(students, normalizedQuery, filter, setFilter, openStudent);
    if (mode === "reassessments") return renderReassessments(students, assessments, normalizedQuery, openStudent);
    if (mode === "workout-templates") {
      return renderWorkoutTemplates(
        templates,
        () => {
          setTemplateDraft(createTemplateDraft());
          setTemplateModalVisible(true);
        },
        (template) => {
          setTemplateDraft(template);
          setTemplateModalVisible(true);
        }
      );
    }
    if (mode === "expirations") return renderExpirations(students, normalizedQuery, filter, setFilter, openStudent);
    return renderFrequencyRanking(students, normalizedQuery, openStudent);
  };

  if (loadingSession || (loading && !refreshing)) {
    return <LoadingState label={`Carregando ${config.title.toLowerCase()}...`} />;
  }

  if (error || !dashboard) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={42} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error || "Area indisponivel."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => load()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: layout.topPadding,
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color={TEXT} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Ionicons name={config.icon} size={24} color={TEXT} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>{config.eyebrow}</Text>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>{config.subtitle}</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <Kpi label="Alunos" value={String(totalStudents)} />
          <Kpi label="Pendencias" value={String(dashboard.pendings.length)} />
          <Kpi label="Feedbacks" value={String(feedbacks.length)} />
        </View>

        {mode !== "registration-link" && mode !== "workout-templates" ? (
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={ACCENT} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por aluno, item ou objetivo"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={SUBTLE} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {content()}
      </ScrollView>

      <ExerciseModal
        visible={exerciseModalVisible}
        draft={exerciseDraft}
        onClose={() => setExerciseModalVisible(false)}
        onChange={setExerciseDraft}
        onSave={saveExercise}
      />

      <TemplateModal
        visible={templateModalVisible}
        draft={templateDraft}
        onClose={() => setTemplateModalVisible(false)}
        onChange={setTemplateDraft}
        onSave={saveTemplate}
      />
    </View>
  );
}

function renderEvolutionRanking(
  profiles: StudentProfile[],
  normalizedQuery: string,
  openStudent: (studentId: string) => void
) {
  const ranking = profiles
    .map((profile) => {
      const insights = buildLoadEvolutionInsights(profile);
      const loadProgress = average(insights.map((item) => item.progressPercent ?? 0).filter((value) => value > 0));
      const body = getBodyDelta(profile);
      const adherence = calculateAdherence(profile.frequency);
      const score = Math.round(loadProgress * 0.55 + Math.max(0, body.compositionScore) * 0.35 + adherence * 0.1);

      return {
        id: profile.id,
        name: profile.registration.fullName,
        avatar: profile.registration.avatar,
        score,
        loadProgress,
        body,
        adherence,
        detail: insights[0]?.exerciseName ?? profile.followUp.currentWorkoutName,
      };
    })
    .filter((item) => !normalizedQuery || normalize(item.name).includes(normalizedQuery) || normalize(item.detail).includes(normalizedQuery))
    .sort((first, second) => second.score - first.score);

  return (
    <View style={styles.sectionStack}>
      <InsightCard
        icon="trophy-outline"
        title={`${ranking[0]?.name ?? "Sem lider"} no topo`}
        detail={ranking[0] ? `${ranking[0].score} pontos combinando carga, composicao e aderencia.` : "Sem dados suficientes para ranking."}
      />
      {ranking.map((item, index) => (
        <LeaderboardRow
          key={item.id}
          rank={index + 1}
          title={item.name}
          subtitle={`${Math.round(item.loadProgress)}% progressao media • ${item.detail}`}
          value={`${item.score}`}
          progress={Math.min(100, item.score)}
          avatar={item.avatar}
          onPress={() => openStudent(item.id)}
          chips={[
            `${item.adherence}% aderencia`,
            item.body.waistDelta ? `${formatSigned(item.body.waistDelta, "cm")} cintura` : "Composicao estavel",
          ]}
        />
      ))}
    </View>
  );
}

function renderRegistrationLink(
  trainerId: string,
  students: TrainerHomeStudentSummary[],
  inviteType: string,
  setInviteType: (value: string) => void,
  shareRegistrationLink: () => void
) {
  const pending = students.filter((student) => student.status === "aguardando_inicio" || student.hasAnamnesisPending);
  const options = [
    { id: "complete", label: "Cadastro completo", icon: "document-text-outline" as const },
    { id: "quick", label: "Cadastro rapido", icon: "flash-outline" as const },
    { id: "anamnesis", label: "Anamnese primeiro", icon: "medkit-outline" as const },
  ];

  return (
    <View style={styles.sectionStack}>
      <View style={styles.linkCard}>
        <Text style={styles.cardTitle}>Modelo do convite</Text>
        <View style={styles.optionGrid}>
          {options.map((option) => {
            const active = inviteType === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionButton, active && styles.optionButtonActive]}
                onPress={() => setInviteType(option.id)}
              >
                <Ionicons name={option.icon} size={20} color={active ? TEXT : ACCENT} />
                <Text style={[styles.optionButtonText, active && styles.optionButtonTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.generatedLinkBox}>
          <Text style={styles.generatedLinkLabel}>Link gerado</Text>
          <Text style={styles.generatedLinkValue} numberOfLines={2}>{buildRegistrationLink(trainerId, inviteType)}</Text>
        </View>
        <TouchableOpacity style={styles.primaryWideButton} onPress={shareRegistrationLink}>
          <Ionicons name="share-social-outline" size={18} color={TEXT} />
          <Text style={styles.primaryWideText}>Compartilhar convite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <PanelHeader title="Convites e pendencias" detail={`${pending.length} aluno(s)`} />
        {pending.length ? (
          pending.map((student) => (
            <CompactStudentRow
              key={student.id}
              student={student}
              rightLabel={student.hasAnamnesisPending ? "Anamnese" : "Inicio"}
              icon="send-outline"
            />
          ))
        ) : (
          <EmptyInline icon="checkmark-circle-outline" title="Sem convites pendentes" detail="Todos os alunos ativos ja estao com cadastro encaminhado." />
        )}
      </View>
    </View>
  );
}

function renderExercises(
  profiles: StudentProfile[],
  customExercises: CustomExercise[],
  normalizedQuery: string,
  onCreate: () => void,
  onEdit: (exercise: CustomExercise) => void
) {
  const usedExercises = getUsedExercises(profiles);
  const customRows = customExercises
    .filter((item) => !normalizedQuery || normalize(`${item.name} ${item.category} ${item.note}`).includes(normalizedQuery));
  const nativeRows = usedExercises
    .filter((item) => !normalizedQuery || normalize(`${item.name} ${item.category}`).includes(normalizedQuery));

  return (
    <View style={styles.sectionStack}>
      <TouchableOpacity style={styles.primaryWideButton} onPress={onCreate}>
        <Ionicons name="add-circle-outline" size={18} color={TEXT} />
        <Text style={styles.primaryWideText}>Novo exercicio personalizado</Text>
      </TouchableOpacity>

      <View style={styles.panel}>
        <PanelHeader title="Personalizados" detail={`${customRows.length} item(ns)`} />
        {customRows.length ? (
          customRows.map((item) => (
            <TouchableOpacity key={item.id} style={styles.libraryRow} onPress={() => onEdit(item)}>
              <View style={styles.rowIcon}>
                <Ionicons name="barbell-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowTextBlock}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>{item.category} • {item.metric}</Text>
                {item.note ? <Text style={styles.rowDetail} numberOfLines={2}>{item.note}</Text> : null}
              </View>
              <Ionicons name="create-outline" size={17} color={SUBTLE} />
            </TouchableOpacity>
          ))
        ) : (
          <EmptyInline icon="barbell-outline" title="Nenhum exercicio personalizado" detail="Crie exercicios com metricas proprias do seu metodo." />
        )}
      </View>

      <View style={styles.panel}>
        <PanelHeader title="Usados nos treinos" detail={`${nativeRows.length} exercicio(s)`} />
        {nativeRows.map((item) => (
          <View key={item.id} style={styles.libraryRow}>
            <View style={styles.rowIcon}>
              <Ionicons name={item.icon} size={18} color={ACCENT} />
            </View>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>{item.category} • {item.count} registro(s)</Text>
            </View>
            <Text style={styles.metricText}>{item.lastLoad}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function renderFeedback(
  feedbacks: TrainingFeedback[],
  normalizedQuery: string,
  filter: string,
  setFilter: (value: string) => void
) {
  const options = [
    { id: "all", label: "Todos" },
    { id: "open", label: "Sem resposta" },
    { id: "pain", label: "Com dor" },
    { id: "new", label: "Novos" },
  ];
  const filtered = feedbacks
    .filter((feedback) => {
      if (filter === "open" && feedback.responses.length > 0) return false;
      if (filter === "pain" && !feedback.hasPain) return false;
      if (filter === "new" && feedback.status !== "novo") return false;
      return !normalizedQuery || normalize(`${feedback.studentName} ${feedback.workoutName} ${feedback.comment ?? ""}`).includes(normalizedQuery);
    })
    .slice(0, 24);

  return (
    <View style={styles.sectionStack}>
      <ChipRail options={options} active={filter} onChange={setFilter} />
      {filtered.map((feedback) => (
        <TouchableOpacity
          key={feedback.id}
          style={[styles.feedbackRow, feedback.status === "novo" && styles.feedbackRowActive]}
          onPress={() => router.push({ pathname: "/feedback-detail" as never, params: { id: feedback.id, role: "trainer" } })}
        >
          <View style={styles.feedbackTop}>
            <Avatar uri={feedback.studentAvatar} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>{feedback.studentName}</Text>
              <Text style={styles.rowSubtitle}>{feedback.workoutName}</Text>
              <Text style={styles.rowDetail}>{formatFeedbackDate(feedback.finishedAt)}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getFeedbackStatusLabel(feedback.status)}</Text>
            </View>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons key={star} name={feedback.rating >= star ? "star" : "star-outline"} size={14} color={ACCENT} />
            ))}
            <Text style={styles.rowDetail}>{feedback.intensity}</Text>
          </View>
          {feedback.comment ? <Text style={styles.feedbackComment} numberOfLines={3}>{feedback.comment}</Text> : null}
        </TouchableOpacity>
      ))}
      {!filtered.length ? <EmptyInline icon="chatbubble-outline" title="Nenhum feedback encontrado" detail="Ajuste a busca ou os filtros." /> : null}
    </View>
  );
}

function renderContacts(
  students: TrainerHomeStudentSummary[],
  normalizedQuery: string,
  filter: string,
  setFilter: (value: string) => void,
  openStudent: (studentId: string) => void
) {
  const options = [
    { id: "all", label: "Todos" },
    { id: "active", label: "Ativos" },
    { id: "pending", label: "Pendentes" },
  ];
  const filtered = students.filter((student) => {
    if (filter === "active" && student.status !== "ativo") return false;
    if (filter === "pending" && student.pendingCount <= 0) return false;
    return !normalizedQuery || student.searchText.includes(normalizedQuery);
  });

  return (
    <View style={styles.sectionStack}>
      <ChipRail options={options} active={filter} onChange={setFilter} />
      {filtered.map((student) => (
        <View key={student.id} style={styles.contactRow}>
          <TouchableOpacity style={styles.contactMain} onPress={() => openStudent(student.id)}>
            <Avatar uri={student.avatar} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>{student.name}</Text>
              <Text style={styles.rowSubtitle}>{student.email ?? "Email nao informado"}</Text>
              <Text style={styles.rowDetail}>{student.phone ?? student.whatsapp ?? "Telefone nao informado"}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.contactActions}>
            <IconAction icon="logo-whatsapp" onPress={() => openUrl(getWhatsAppUrl(student.whatsapp ?? student.phone))} />
            <IconAction icon="call-outline" onPress={() => openUrl(student.phone ? `tel:${student.phone.replace(/\D/g, "")}` : undefined)} />
            <IconAction icon="mail-outline" onPress={() => openUrl(student.email ? `mailto:${student.email}` : undefined)} />
          </View>
        </View>
      ))}
      {!filtered.length ? <EmptyInline icon="id-card-outline" title="Nenhum contato encontrado" detail="Ajuste a busca ou os filtros." /> : null}
    </View>
  );
}

function renderReassessments(
  students: TrainerHomeStudentSummary[],
  assessments: PhysicalAssessment[],
  normalizedQuery: string,
  openStudent: (studentId: string) => void
) {
  const rows = students
    .filter((student) => !normalizedQuery || student.searchText.includes(normalizedQuery))
    .map((student) => ({
      student,
      days: daysUntil(student.nextAssessmentAt),
      count: assessments.filter((assessment) => assessment.studentId === student.id).length,
    }))
    .sort((first, second) => (first.days ?? 999) - (second.days ?? 999));

  return (
    <View style={styles.sectionStack}>
      <InsightCard
        icon="calendar-number-outline"
        title={`${rows.filter((item) => (item.days ?? 999) <= 7).length} reavaliacao(oes) em 7 dias`}
        detail="Priorize vencidas e alunos com treino proximo do fim."
      />
      {rows.map(({ student, days, count }) => (
        <TouchableOpacity key={student.id} style={styles.timelineRow} onPress={() => openStudent(student.id)}>
          <View style={[styles.timelineDot, (days ?? 999) <= 0 && styles.timelineDotDanger]} />
          <View style={styles.rowTextBlock}>
            <Text style={styles.rowTitle}>{student.name}</Text>
            <Text style={styles.rowSubtitle}>Proxima: {formatProfileDate(student.nextAssessmentAt)}</Text>
            <Text style={styles.rowDetail}>{count} avaliacao(oes) no historico</Text>
          </View>
          <View style={styles.daysBadge}>
            <Text style={styles.daysBadgeValue}>{days === null ? "-" : Math.abs(days)}</Text>
            <Text style={styles.daysBadgeLabel}>{days !== null && days < 0 ? "venc." : "dias"}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function renderWorkoutTemplates(
  templates: WorkoutTemplate[],
  onCreate: () => void,
  onEdit: (template: WorkoutTemplate) => void
) {
  return (
    <View style={styles.sectionStack}>
      <TouchableOpacity style={styles.primaryWideButton} onPress={onCreate}>
        <Ionicons name="add-circle-outline" size={18} color={TEXT} />
        <Text style={styles.primaryWideText}>Novo treino padrao</Text>
      </TouchableOpacity>
      {templates.map((template) => (
        <TouchableOpacity key={template.id} style={styles.templateCard} onPress={() => onEdit(template)}>
          <View style={styles.templateTop}>
            <View style={styles.rowIcon}>
              <Ionicons name="list-outline" size={19} color={ACCENT} />
            </View>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>{template.name}</Text>
              <Text style={styles.rowSubtitle}>{template.focus} • {template.level}</Text>
            </View>
            <Ionicons name="create-outline" size={17} color={SUBTLE} />
          </View>
          <View style={styles.templateFooter}>
            <Tag label={template.sessions} />
            <TouchableOpacity style={styles.smallAction} onPress={() => router.push("/training" as never)}>
              <Text style={styles.smallActionText}>Usar modelo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function renderExpirations(
  students: TrainerHomeStudentSummary[],
  normalizedQuery: string,
  filter: string,
  setFilter: (value: string) => void,
  openStudent: (studentId: string) => void
) {
  const options = [
    { id: "all", label: "Todos" },
    { id: "urgent", label: "Urgentes" },
    { id: "week", label: "7 dias" },
  ];
  const rows = students
    .filter((student) => {
      const days = daysUntil(student.workoutExpirationAt);
      if (filter === "urgent" && (days === null || days > 3)) return false;
      if (filter === "week" && (days === null || days > 7)) return false;
      return !normalizedQuery || student.searchText.includes(normalizedQuery);
    })
    .sort((first, second) => (daysUntil(first.workoutExpirationAt) ?? 999) - (daysUntil(second.workoutExpirationAt) ?? 999));

  return (
    <View style={styles.sectionStack}>
      <ChipRail options={options} active={filter} onChange={setFilter} />
      {rows.map((student) => {
        const days = daysUntil(student.workoutExpirationAt);
        return (
          <TouchableOpacity key={student.id} style={styles.expirationCard} onPress={() => openStudent(student.id)}>
            <View style={styles.expirationTop}>
              <Avatar uri={student.avatar} />
              <View style={styles.rowTextBlock}>
                <Text style={styles.rowTitle}>{student.name}</Text>
                <Text style={styles.rowSubtitle}>{student.currentWorkoutName}</Text>
                <Text style={styles.rowDetail}>Vence {formatProfileDate(student.workoutExpirationAt)}</Text>
              </View>
              <View style={[styles.daysBadge, days !== null && days <= 3 && styles.daysBadgeDanger]}>
                <Text style={styles.daysBadgeValue}>{days === null ? "-" : Math.abs(days)}</Text>
                <Text style={styles.daysBadgeLabel}>{days !== null && days < 0 ? "venc." : "dias"}</Text>
              </View>
            </View>
            <ProgressBar value={days === null ? 0 : Math.max(4, Math.min(100, 100 - days * 5))} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function renderFrequencyRanking(
  students: TrainerHomeStudentSummary[],
  normalizedQuery: string,
  openStudent: (studentId: string) => void
) {
  const ranking = students
    .filter((student) => !normalizedQuery || student.searchText.includes(normalizedQuery))
    .sort((first, second) => second.adherencePercent - first.adherencePercent);

  return (
    <View style={styles.sectionStack}>
      <InsightCard
        icon="pulse-outline"
        title={`${ranking.filter((student) => student.adherencePercent >= 80).length} aluno(s) acima de 80%`}
        detail="Use este ranking para reconhecer consistencia e recuperar faltosos."
      />
      {ranking.map((student, index) => (
        <LeaderboardRow
          key={student.id}
          rank={index + 1}
          title={student.name}
          subtitle={`${student.lastActivityLabel} • ${student.nextAction}`}
          value={`${student.adherencePercent}%`}
          progress={student.adherencePercent}
          avatar={student.avatar}
          onPress={() => openStudent(student.id)}
          chips={[
            student.hasAbsentRecently ? "Ausencia recente" : "Regular",
            student.statusLabel,
          ]}
        />
      ))}
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={ACCENT} />
      <Text style={styles.centerText}>{label}</Text>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function PanelHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.panelHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.panelDetail}>{detail}</Text>
    </View>
  );
}

function ChipRail({
  options,
  active,
  onChange,
}: {
  options: { id: string; label: string }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[styles.chip, active === option.id && styles.chipActive]}
          onPress={() => onChange(option.id)}
        >
          <Text style={[styles.chipText, active === option.id && styles.chipTextActive]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function LeaderboardRow({
  rank,
  title,
  subtitle,
  value,
  progress,
  avatar,
  chips,
  onPress,
}: {
  rank: number;
  title: string;
  subtitle: string;
  value: string;
  progress: number;
  avatar?: string;
  chips: string[];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.leaderboardRow} onPress={onPress} activeOpacity={0.86}>
      <Text style={styles.rankText}>{rank}</Text>
      <Avatar uri={avatar} />
      <View style={styles.rowTextBlock}>
        <View style={styles.leaderboardTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.leaderboardValue}>{value}</Text>
        </View>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        <ProgressBar value={progress} />
        <View style={styles.tagRow}>
          {chips.map((chip) => <Tag key={chip} label={chip} />)}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompactStudentRow({
  student,
  rightLabel,
  icon,
}: {
  student: TrainerHomeStudentSummary;
  rightLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.compactRow}>
      <Avatar uri={student.avatar} />
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowTitle}>{student.name}</Text>
        <Text style={styles.rowSubtitle}>{student.statusLabel} • {student.objective}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Ionicons name={icon} size={13} color={ACCENT} />
        <Text style={styles.statusBadgeText}>{rightLabel}</Text>
      </View>
    </View>
  );
}

function InsightCard({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightIcon}>
        <Ionicons name={icon} size={21} color={TEXT} />
      </View>
      <View style={styles.rowTextBlock}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function EmptyInline({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.emptyInline}>
      <Ionicons name={icon} size={28} color={ACCENT} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

function Avatar({ uri }: { uri?: string }) {
  return (
    <View style={styles.avatarFrame}>
      {uri ? <Image source={{ uri }} style={styles.avatar} /> : <Ionicons name="person" size={19} color={ACCENT} />}
    </View>
  );
}

function IconAction({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.iconAction} onPress={onPress}>
      <Ionicons name={icon} size={18} color={TEXT} />
    </TouchableOpacity>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(4, Math.min(100, value))}%` }]} />
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function ExerciseModal({
  visible,
  draft,
  onClose,
  onChange,
  onSave,
}: {
  visible: boolean;
  draft: CustomExercise;
  onClose: () => void;
  onChange: (draft: CustomExercise) => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <SheetHeader title="Exercicio personalizado" onClose={onClose} />
          <Field label="Nome" value={draft.name} onChangeText={(value) => onChange({ ...draft, name: value })} />
          <Field label="Categoria" value={draft.category} onChangeText={(value) => onChange({ ...draft, category: value })} />
          <Field label="Metrica principal" value={draft.metric} onChangeText={(value) => onChange({ ...draft, metric: value })} />
          <Field label="Observacao tecnica" value={draft.note} onChangeText={(value) => onChange({ ...draft, note: value })} multiline />
          <TouchableOpacity style={styles.primaryWideButton} onPress={onSave}>
            <Text style={styles.primaryWideText}>Salvar exercicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TemplateModal({
  visible,
  draft,
  onClose,
  onChange,
  onSave,
}: {
  visible: boolean;
  draft: WorkoutTemplate;
  onClose: () => void;
  onChange: (draft: WorkoutTemplate) => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <SheetHeader title="Treino padrao" onClose={onClose} />
          <Field label="Nome" value={draft.name} onChangeText={(value) => onChange({ ...draft, name: value })} />
          <Field label="Foco" value={draft.focus} onChangeText={(value) => onChange({ ...draft, focus: value })} />
          <Field label="Nivel" value={draft.level} onChangeText={(value) => onChange({ ...draft, level: value })} />
          <Field label="Frequencia" value={draft.sessions} onChangeText={(value) => onChange({ ...draft, sessions: value })} />
          <TouchableOpacity style={styles.primaryWideButton} onPress={onSave}>
            <Text style={styles.primaryWideText}>Salvar modelo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetTitle}>{title}</Text>
      <TouchableOpacity style={styles.sheetCloseButton} onPress={onClose}>
        <Ionicons name="close" size={20} color={TEXT} />
      </TouchableOpacity>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#666"
        multiline={multiline}
      />
    </View>
  );
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function getStorageKey(trainerId: string, scope: "exercises" | "templates") {
  return `@indigo/trainer-profile-tools/${trainerId}/${scope}/v1`;
}

function createExerciseDraft(): CustomExercise {
  return {
    id: `exercise-${Date.now()}`,
    name: "",
    category: "Forca",
    metric: "Carga + repeticoes",
    note: "",
  };
}

function createTemplateDraft(): WorkoutTemplate {
  return {
    id: `template-${Date.now()}`,
    name: "",
    focus: "Forca",
    level: "Intermediario",
    sessions: "3x semana",
  };
}

function buildRegistrationLink(trainerId: string, type: string) {
  return `https://indigo.app/cadastro/${trainerId}?fluxo=${type}`;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getBodyDelta(profile: StudentProfile) {
  const ordered = [...profile.bodyEvolution].sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const waistDelta = first?.waistCm && last?.waistCm ? Number((last.waistCm - first.waistCm).toFixed(1)) : 0;
  const fatDelta = first?.bodyFatPercent && last?.bodyFatPercent ? Number((last.bodyFatPercent - first.bodyFatPercent).toFixed(1)) : 0;
  return {
    waistDelta,
    fatDelta,
    compositionScore: Math.max(0, -waistDelta * 4) + Math.max(0, -fatDelta * 6),
  };
}

function formatSigned(value: number, unit: string) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${unit}`;
}

function getUsedExercises(profiles: StudentProfile[]) {
  const map = new Map<string, { id: string; name: string; category: string; icon: keyof typeof Ionicons.glyphMap; count: number; lastLoad: string; lastAt: number }>();

  profiles.flatMap((profile) => profile.executedSets).forEach((set) => {
    const id = `${set.exerciseId}-${set.equipment.id}`;
    const current = map.get(id);
    const dateTime = new Date(set.date).getTime();
    const load = typeof set.executedLoad === "number" ? `${set.executedLoad}${set.loadUnit === "kg" ? "kg" : ""}` : "BW";
    map.set(id, {
      id,
      name: set.exerciseName,
      category: set.equipment.type === "cardio" ? "Cardio" : set.equipment.type === "machine" ? "Maquina" : "Forca",
      icon: set.equipment.type === "cardio" ? "pulse-outline" : "barbell-outline",
      count: (current?.count ?? 0) + 1,
      lastLoad: dateTime >= (current?.lastAt ?? 0) ? load : current?.lastLoad ?? load,
      lastAt: Math.max(dateTime, current?.lastAt ?? 0),
    });
  });

  return [...map.values()].sort((first, second) => second.lastAt - first.lastAt);
}

async function openUrl(url?: string | null) {
  if (!url) {
    Alert.alert("Contato indisponivel", "Este aluno nao possui esse dado cadastrado.");
    return;
  }
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert("Nao foi possivel abrir", "Verifique os apps disponiveis no aparelho.");
    return;
  }
  await Linking.openURL(url);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scrollContent: {
    width: "100%",
    alignSelf: "center",
    gap: 14,
  },
  centerState: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
  },
  centerText: {
    color: MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
  },
  primaryButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    justifyContent: "center",
  },
  kpiValue: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900",
  },
  kpiLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  searchBox: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionStack: {
    gap: 12,
  },
  panel: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
  },
  panelDetail: {
    color: SUBTLE,
    fontSize: 12,
    fontWeight: "800",
  },
  linkCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 12,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    flexGrow: 1,
    minWidth: "30%",
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  optionButtonText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  optionButtonTextActive: {
    color: TEXT,
  },
  generatedLinkBox: {
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  generatedLinkLabel: {
    color: SUBTLE,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  generatedLinkValue: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  primaryWideButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },
  primaryWideText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  chipRail: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "900",
  },
  chipTextActive: {
    color: TEXT,
  },
  insightCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#210f0f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.34)",
    padding: 14,
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  insightDetail: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
  leaderboardRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  rankText: {
    width: 24,
    color: ACCENT,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 11,
  },
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  rowTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  leaderboardTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    flexShrink: 1,
  },
  rowSubtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  rowDetail: {
    color: SUBTLE,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  leaderboardValue: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "900",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#101010",
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: "rgba(217,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.24)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: "900",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusBadgeText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: "900",
  },
  libraryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 8,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(217,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  metricText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "900",
  },
  feedbackRow: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  feedbackRowActive: {
    borderColor: "rgba(217,0,0,0.48)",
    backgroundColor: "#211313",
  },
  feedbackTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  feedbackComment: {
    color: TEXT,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  contactRow: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  contactMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginLeft: 54,
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT,
  },
  timelineDotDanger: {
    backgroundColor: "#ff4444",
  },
  daysBadge: {
    minWidth: 52,
    borderRadius: 13,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    paddingVertical: 7,
  },
  daysBadgeDanger: {
    borderColor: "rgba(255,68,68,0.5)",
    backgroundColor: "rgba(255,68,68,0.1)",
  },
  daysBadgeValue: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20,
  },
  daysBadgeLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "900",
  },
  templateCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  templateTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  templateFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  smallAction: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.36)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallActionText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: "900",
  },
  expirationCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  expirationTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyInline: {
    minHeight: 150,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyDetail: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
    padding: 18,
  },
  sheet: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CARD_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBlock: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
  },
  fieldInput: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  fieldInputMultiline: {
    minHeight: 90,
    paddingTop: 10,
    textAlignVertical: "top",
  },
});
