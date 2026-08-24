import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import {
  SYSTEM_EXERCISES,
  getYoutubeVideoId,
  getYoutubeThumbnailUrl,
} from "@/services/exercise-store";
import { shareWorkoutAsPdf } from "@/services/workout-pdf-service";
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
  | "frequency-ranking"
  | "anamnesis";

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

type TemplateExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  load?: string;
  restSeconds?: number;
  technique?: string;
  videoUrl?: string;
  notes?: string;
};

type WorkoutTemplate = {
  id: string;
  name: string;
  focus: string;
  level: string;
  sessions: string;
  estimatedDuration?: string;
  muscleGroups?: string[];
  description?: string;
  warmupInstructions?: string;
  videoUrl?: string;
  videoTitle?: string;
  equipments?: string[];
  postWorkoutQuestions?: {
    askRpe: boolean;
    askPain: boolean;
    askNotes: boolean;
    customQuestions: string[];
  };
  exercises?: TemplateExercise[];
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
    title: "Link de cadastro",
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
    title: "Feedbacks",
    subtitle: "Devolutivas dos alunos com prioridade de resposta.",
    icon: "chatbubble-ellipses-outline",
  },
  contacts: {
    eyebrow: "Relacionamento",
    title: "Cadastros & Contatos",
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
    title: "Próximos vencimentos",
    subtitle: "Treinos e reavaliações por ordem de urgência.",
    icon: "timer-outline",
  },
  "frequency-ranking": {
    eyebrow: "Ranking",
    title: "Ranking frequência",
    subtitle: "Aderência, faltas e consistência dos alunos.",
    icon: "refresh-circle-outline",
  },
  anamnesis: {
    eyebrow: "Triagem clínica",
    title: "Anamneses recebidas",
    subtitle: "Histórico de saúde, restrições e respostas dos alunos.",
    icon: "document-text-outline",
  },
};

const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "tpl-strength-a",
    name: "Força base",
    focus: "Força",
    level: "Intermediário",
    sessions: "4x semana",
    estimatedDuration: "60 min",
    muscleGroups: ["Peitoral", "Tríceps", "Ombros"],
    description: "Treino de força focado no desenvolvimento de força máxima e hipertrofia de peitorais e tríceps com controle excêntrico.",
    warmupInstructions: "5 min de cardio leve + mobilidade articular de ombros e punhos com elástico.",
    videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
    videoTitle: "Orientações gerais de execução e postura",
    equipments: ["Barra", "Halteres", "Banco", "Polia"],
    postWorkoutQuestions: {
      askRpe: true,
      askPain: true,
      askNotes: true,
      customQuestions: [
        "Conseguiu manter o tempo de descanso de 90s?",
        "Qual foi a carga máxima alcançada no supino?",
      ],
    },
    exercises: [
      {
        id: "ex-1",
        name: "Supino Reto com Barra",
        muscleGroup: "Peitoral",
        sets: 4,
        reps: "6 - 8",
        load: "80% 1RM",
        restSeconds: 90,
        technique: "Normal",
        videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
        notes: "Manter escápulas aduzidas e controle estrito na descida.",
      },
      {
        id: "ex-2",
        name: "Supino Inclinado com Halteres",
        muscleGroup: "Peitoral",
        sets: 3,
        reps: "10 - 12",
        load: "24 kg/lado",
        restSeconds: 60,
        technique: "Drop-set",
        notes: "Última série com drop de 20% do peso até a falha concêntrica.",
      },
      {
        id: "ex-3",
        name: "Tríceps Corda na Polia",
        muscleGroup: "Tríceps",
        sets: 4,
        reps: "12 - 15",
        load: "35 kg",
        restSeconds: 45,
        technique: "Rest-pause",
        notes: "Abrir a corda no final do movimento e segurar 1s.",
      },
    ],
  },
  {
    id: "tpl-hypertrophy",
    name: "Hipertrofia enxuta",
    focus: "Hipertrofia",
    level: "Intermediário",
    sessions: "5x semana",
    estimatedDuration: "50 min",
    muscleGroups: ["Costas", "Bíceps"],
    description: "Foco em densidade dorsal e pico de contração dos flexores de cotovelo com volume equalizado.",
    warmupInstructions: "Aquecimento com elástico para manguito e 2 séries de ativação na polia com carga leve.",
    videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    videoTitle: "Técnica de puxada e ativação de grande dorsal",
    equipments: ["Polia", "Halteres", "Barra"],
    postWorkoutQuestions: {
      askRpe: true,
      askPain: true,
      askNotes: true,
      customQuestions: ["Sentiu a ativação correta das costas sem fadiga prematura no antebraço?"],
    },
    exercises: [
      {
        id: "ex-4",
        name: "Puxada Alta Frente",
        muscleGroup: "Costas",
        sets: 4,
        reps: "10 - 12",
        load: "55 kg",
        restSeconds: 60,
        technique: "Pirâmide",
        notes: "Puxar em direção à clavícula sem balançar o tronco.",
      },
      {
        id: "ex-5",
        name: "Remada Curvada com Barra",
        muscleGroup: "Costas",
        sets: 4,
        reps: "8 - 10",
        load: "60 kg",
        restSeconds: 75,
        technique: "Normal",
        notes: "Coluna neutra e tronco estabilizado a 45 graus.",
      },
      {
        id: "ex-6",
        name: "Rosca Direta na Barra W",
        muscleGroup: "Bíceps",
        sets: 3,
        reps: "10 - 12",
        load: "12 kg/lado",
        restSeconds: 45,
        technique: "Super-slow",
        notes: "Cadência 3-1-2 (3s na descida excêntrica).",
      },
    ],
  },
  {
    id: "tpl-return",
    name: "Retorno progressivo",
    focus: "Readaptação",
    level: "Iniciante",
    sessions: "3x semana",
    estimatedDuration: "40 min",
    muscleGroups: ["Quadríceps", "Costas", "Peitoral", "Core"],
    description: "Treino regenerativo e de readaptação muscular articular para retorno seguro aos treinos.",
    warmupInstructions: "10 min de caminhada + mobilidade articular global de quadril e tornozelos.",
    equipments: ["Máquinas", "Halteres", "Peso Corporal"],
    postWorkoutQuestions: {
      askRpe: true,
      askPain: true,
      askNotes: true,
      customQuestions: ["Sentiu algum desconforto articular durante ou após a sessão?"],
    },
    exercises: [
      {
        id: "ex-7",
        name: "Leg Press 45°",
        muscleGroup: "Quadríceps",
        sets: 3,
        reps: "12 - 15",
        load: "80 kg",
        restSeconds: 60,
        technique: "Normal",
        notes: "Movimento controlado sem hiperestender os joelhos.",
      },
      {
        id: "ex-8",
        name: "Puxada Articulada Máquina",
        muscleGroup: "Costas",
        sets: 3,
        reps: "12 - 15",
        load: "30 kg",
        restSeconds: 60,
        technique: "Normal",
      },
    ],
  },
  {
    id: "tpl-conditioning",
    name: "Condicionamento 30'",
    focus: "Cardio e core",
    level: "Todos",
    sessions: "2x semana",
    estimatedDuration: "30 min",
    muscleGroups: ["Core", "Posterior"],
    description: "Circuito intervalado de alta densidade focado em VO2 máx, queima calórica e estabilidade central.",
    warmupInstructions: "Mobilidade dinâmica de quadril e polichinelos leves.",
    equipments: ["Peso Corporal", "Elásticos", "Halteres"],
    postWorkoutQuestions: {
      askRpe: true,
      askPain: false,
      askNotes: false,
      customQuestions: [],
    },
    exercises: [
      {
        id: "ex-10",
        name: "Prancha Abdominal",
        muscleGroup: "Core",
        sets: 3,
        reps: "45s",
        load: "Corporal",
        restSeconds: 30,
        technique: "Normal",
      },
      {
        id: "ex-11",
        name: "Kettlebell Swing",
        muscleGroup: "Glúteos",
        sets: 4,
        reps: "15",
        load: "Moderada",
        restSeconds: 45,
        technique: "Normal",
      },
    ],
  },
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

  const shareRegistrationLink = async () => {
    if (!session) return;
    const link = buildRegistrationLink(session.user.id, filter);
    await Share.share({
      message: `Cadastro DragonCorp para novos alunos: ${link}`,
    });
  };

  const heroData = useMemo(() => {
    if (mode === "reassessments") {
      const overdueOrPending = dashboard?.pendings.filter((p) => p.type?.includes("assessment")).length || assessments.length || 1;
      return {
        title: "Reavaliações",
        cardEyebrow: "HOJE",
        cardTitle: `${overdueOrPending} ${overdueOrPending === 1 ? "reavaliação" : "reavaliações"}`,
        cardSubtitle: "Vencidas, próximas e prontas para criar",
        actionLabel: "Hoje",
        actionIcon: "locate-outline" as const,
        onAction: () => {},
        rightButtons: [
          { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
          { icon: "add" as const, onPress: () => router.push("/assessment-editor" as never), label: "Nova reavaliação" },
        ],
        stats: [
          { icon: "calendar-outline" as const, value: String(overdueOrPending), label: "VENCIDAS" },
          { icon: "barbell-outline" as const, value: String(dashboard?.pendings.length ?? 0), label: "PENDÊNCIAS" },
          { icon: "alert-circle-outline" as const, value: String(totalStudents), label: "ALUNOS" },
        ],
      };
    }
    if (mode === "workout-templates") {
      const distinctFocuses = new Set(templates.map((t) => t.focus)).size;
      const totalExercises = templates.reduce((acc, t) => acc + (t.exercises?.length ?? 0), 0);
      return {
        title: "Treinos Padrões",
        cardEyebrow: "BIBLIOTECA DE MODELOS",
        cardTitle: `${templates.length} Modelos`,
        cardSubtitle: "Prescrições prontas com prévia e envio rápido",
        actionLabel: "Novo Modelo",
        actionIcon: "add-circle-outline" as const,
        onAction: () => {
          setTemplateDraft(createTemplateDraft());
          setTemplateModalVisible(true);
        },
        rightButtons: [
          {
            icon: "add" as const,
            onPress: () => {
              setTemplateDraft(createTemplateDraft());
              setTemplateModalVisible(true);
            },
            label: "Novo treino",
          },
        ],
        stats: [
          { icon: "barbell-outline" as const, value: String(templates.length), label: "MODELOS" },
          { icon: "layers-outline" as const, value: String(distinctFocuses), label: "FOCOS" },
          { icon: "fitness-outline" as const, value: String(totalExercises), label: "EXERCÍCIOS" },
        ],
      };
    }
    if (mode === "expirations") {
      const expiringCount = dashboard?.pendings.filter((p) => p.priority === "expired" || p.priority === "soon").length || 1;
      return {
        title: "Próximos Vencimentos",
        cardEyebrow: "STATUS",
        cardTitle: `${expiringCount} vencendo`,
        cardSubtitle: "Treinos e reavaliações por ordem de urgência",
        actionLabel: "Hoje",
        actionIcon: "locate-outline" as const,
        onAction: () => {},
        rightButtons: [
          { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
        ],
        stats: [
          { icon: "timer-outline" as const, value: String(expiringCount), label: "URGENTES" },
          { icon: "checkmark-circle-outline" as const, value: String(Math.max(0, totalStudents - expiringCount)), label: "EM DIA" },
          { icon: "people-outline" as const, value: String(totalStudents), label: "ALUNOS" },
        ],
      };
    }
    if (mode === "registration-link") {
      return {
        title: "Link de Cadastro",
        cardEyebrow: "CONVITES",
        cardTitle: `${totalStudents} cadastros`,
        cardSubtitle: "Convites prontos para enviar e acompanhar",
        actionLabel: "Compartilhar",
        actionIcon: "share-social-outline" as const,
        onAction: shareRegistrationLink,
        rightButtons: [
          { icon: "share-social-outline" as const, onPress: shareRegistrationLink, label: "Compartilhar" },
        ],
        stats: [
          { icon: "link-outline" as const, value: String(totalStudents), label: "CONVITES" },
          { icon: "person-outline" as const, value: String(students.filter((s) => s.status === "ativo").length || totalStudents), label: "ATIVOS" },
          { icon: "time-outline" as const, value: String(dashboard?.pendings.length ?? 0), label: "PENDENTES" },
        ],
      };
    }
    if (mode === "feedback") {
      const pendingFeedbacks = feedbacks.filter((f) => f.status === "novo" || f.responses.length === 0).length || feedbacks.length;
      return {
        title: "Feedbacks",
        cardEyebrow: "RESUMO",
        cardTitle: `${pendingFeedbacks} feedbacks`,
        cardSubtitle: "Devolutivas dos alunos com prioridade de resposta",
        actionLabel: "Hoje",
        actionIcon: "locate-outline" as const,
        onAction: () => {},
        rightButtons: [
          { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
        ],
        stats: [
          { icon: "chatbubbles-outline" as const, value: String(pendingFeedbacks), label: "PENDENTES" },
          { icon: "checkmark-done-outline" as const, value: String(feedbacks.filter((f) => f.responses.length > 0).length), label: "RESPONDIDOS" },
          { icon: "people-outline" as const, value: String(totalStudents), label: "ALUNOS" },
        ],
      };
    }
    if (mode === "anamnesis") {
      const pendingAnamnesis = profiles.filter((p) => p.anamnesis.status === "aguardando_revisao").length;
      const withRestrictions = profiles.filter((p) => p.restrictions.length > 0).length;
      return {
        title: "Anamneses Recebidas",
        cardEyebrow: "TRIAGEM CLÍNICA",
        cardTitle: `${pendingAnamnesis} pendentes`,
        cardSubtitle: "Histórico de saúde, restrições e objetivos dos alunos",
        actionLabel: "Revisar",
        actionIcon: "document-text-outline" as const,
        onAction: () => {},
        rightButtons: [
          { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
        ],
        stats: [
          { icon: "document-text-outline" as const, value: String(pendingAnamnesis), label: "PENDENTES" },
          { icon: "bandage-outline" as const, value: String(withRestrictions), label: "RESTRIÇÕES" },
          { icon: "people-outline" as const, value: String(totalStudents), label: "ALUNOS" },
        ],
      };
    }
    if (mode === "contacts") {
      const withWhatsapp = profiles.filter((p) => Boolean(p.registration.contact.whatsapp)).length || totalStudents;
      return {
        title: "Cadastros & Contatos",
        cardEyebrow: "BASE",
        cardTitle: `${totalStudents} alunos`,
        cardSubtitle: "Central de WhatsApp, telefone e email dos alunos",
        actionLabel: "WhatsApp",
        actionIcon: "logo-whatsapp" as const,
        onAction: () => {},
        rightButtons: [
          { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
          { icon: "person-add-outline" as const, onPress: () => {}, label: "Novo aluno" },
        ],
        stats: [
          { icon: "people-outline" as const, value: String(totalStudents), label: "ALUNOS" },
          { icon: "logo-whatsapp" as const, value: String(withWhatsapp), label: "WHATSAPP" },
          { icon: "checkmark-circle-outline" as const, value: String(students.filter((s) => s.status === "ativo").length || totalStudents), label: "ATIVOS" },
        ],
      };
    }
    if (mode === "my-exercises") {
      return {
        title: "Meus Exercícios",
        cardEyebrow: "CATÁLOGO",
        cardTitle: `${customExercises.length || 20} exercícios`,
        cardSubtitle: "Exercícios usados, personalizados e rastreáveis",
        actionLabel: "Novo",
        actionIcon: "add-circle-outline" as const,
        onAction: () => {
          setExerciseDraft(createExerciseDraft());
          setExerciseModalVisible(true);
        },
        rightButtons: [
          { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
          {
            icon: "add" as const,
            onPress: () => {
              setExerciseDraft(createExerciseDraft());
              setExerciseModalVisible(true);
            },
            label: "Novo exercício",
          },
        ],
        stats: [
          { icon: "barbell-outline" as const, value: String(customExercises.length || 20), label: "EXERCÍCIOS" },
          { icon: "grid-outline" as const, value: String(new Set(customExercises.map((e) => e.category)).size || 6), label: "GRUPOS" },
          { icon: "people-outline" as const, value: String(totalStudents), label: "ALUNOS" },
        ],
      };
    }
    if (mode === "evolution-ranking") {
      return {
        title: "Ranking de Evolução",
        cardEyebrow: "PROGRESSÃO",
        cardTitle: `${profiles.length} alunos`,
        cardSubtitle: "Alunos com melhor progressão de carga e composição",
        actionLabel: "Ranking",
        actionIcon: "trophy-outline" as const,
        onAction: () => {},
        rightButtons: [
          { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
        ],
        stats: [
          { icon: "trophy-outline" as const, value: String(profiles.length), label: "ALUNOS" },
          { icon: "trending-up-outline" as const, value: String(profiles.length), label: "EM ALTA" },
          { icon: "stats-chart-outline" as const, value: "92%", label: "MÉDIA" },
        ],
      };
    }
    return {
      title: "Ranking de Frequência",
      cardEyebrow: "ADERÊNCIA",
      cardTitle: "88% média",
      cardSubtitle: "Aderência, faltas e consistência dos alunos",
      actionLabel: "Ranking",
      actionIcon: "pulse-outline" as const,
      onAction: () => {},
      rightButtons: [
        { icon: "filter" as const, onPress: () => {}, label: "Filtrar" },
      ],
      stats: [
        { icon: "pulse-outline" as const, value: "88%", label: "ADERÊNCIA" },
        { icon: "checkmark-circle-outline" as const, value: String(students.filter((s) => !s.hasAbsentRecently).length || totalStudents), label: "REGULARES" },
        { icon: "people-outline" as const, value: String(totalStudents), label: "ALUNOS" },
      ],
    };
  }, [assessments, customExercises, dashboard?.pendings, feedbacks, mode, profiles, shareRegistrationLink, students, templates, totalStudents]);

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
      Alert.alert("Nome obrigatório", "Informe o nome do modelo de treino.");
      return;
    }

    const next = [templateDraft, ...templates.filter((item) => item.id !== templateDraft.id)];
    setTemplates(next);
    await AsyncStorage.setItem(getStorageKey(session.user.id, "templates"), JSON.stringify(next));
    setTemplateDraft(createTemplateDraft());
    setTemplateModalVisible(false);
  };

  const deleteTemplate = async (templateId: string) => {
    if (!session) return;
    const next = templates.filter((item) => item.id !== templateId);
    setTemplates(next);
    await AsyncStorage.setItem(getStorageKey(session.user.id, "templates"), JSON.stringify(next));
    setTemplateDraft(createTemplateDraft());
    setTemplateModalVisible(false);
  };

  const duplicateTemplate = async (template: WorkoutTemplate) => {
    if (!session) return;
    const cloned: WorkoutTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Cópia)`,
      exercises: template.exercises?.map((e) => ({
        ...e,
        id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    };
    const next = [cloned, ...templates];
    setTemplates(next);
    await AsyncStorage.setItem(getStorageKey(session.user.id, "templates"), JSON.stringify(next));
    Alert.alert("Modelo Duplicado", `O modelo "${cloned.name}" foi criado com sucesso.`);
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
        },
        duplicateTemplate
      );
    }
    if (mode === "expirations") return renderExpirations(students, normalizedQuery, filter, setFilter, openStudent);
    if (mode === "anamnesis") return renderAnamneses(profiles, normalizedQuery, filter, setFilter, openStudent);
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
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={ACCENT} />
          </TouchableOpacity>

          <Text style={styles.screenTitle} numberOfLines={1}>
            {heroData.title}
          </Text>

          <View style={styles.headerRightActions}>
            {heroData.rightButtons ? (
              heroData.rightButtons.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.headerActionButton}
                  onPress={btn.onPress}
                  accessibilityLabel={btn.label}
                >
                  <Ionicons name={btn.icon} size={20} color={ACCENT} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.headerActionPlaceholder} />
            )}
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Image
            source={require("@/assets/images/logo-white.png")}
            style={styles.heroWatermark}
            resizeMode="contain"
          />
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryEyebrow} numberOfLines={1}>{heroData.cardEyebrow}</Text>
              <Text style={styles.summaryTitle} numberOfLines={1}>{heroData.cardTitle}</Text>
              <Text style={styles.summarySubtitle} numberOfLines={1}>{heroData.cardSubtitle}</Text>
            </View>
            {heroData.actionLabel ? (
              <TouchableOpacity style={styles.summaryAction} onPress={heroData.onAction}>
                <Ionicons name={heroData.actionIcon} size={16} color={TEXT} />
                <Text style={styles.summaryActionText} numberOfLines={1}>{heroData.actionLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.summaryStats}>
            {heroData.stats.map((stat, idx) => (
              <View key={idx} style={styles.metricPill}>
                <View style={styles.metricTopRow}>
                  <Ionicons name={stat.icon} size={15} color="rgba(255, 255, 255, 0.85)" />
                  <Text style={styles.metricValue} numberOfLines={1}>{stat.value}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit>{stat.label}</Text>
              </View>
            ))}
          </View>
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
        onDelete={deleteTemplate}
        isExisting={templates.some((t) => t.id === templateDraft.id)}
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
            <IconAction icon="chatbubble-ellipses-outline" onPress={() => router.push({ pathname: "/messages" as never, params: { studentId: student.id } })} />
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

function WorkoutTemplatesView({
  templates,
  onCreate,
  onEdit,
  onDuplicate,
}: {
  templates: WorkoutTemplate[];
  onCreate: () => void;
  onEdit: (template: WorkoutTemplate) => void;
  onDuplicate: (template: WorkoutTemplate) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedFocus, setSelectedFocus] = useState("Todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const focusOptions = ["Todos", "Hipertrofia", "Força", "Readaptação", "Cardio e core", "Mobilidade"];

  const filtered = useMemo(() => {
    const q = normalize(search);
    return templates.filter((t) => {
      if (selectedFocus !== "Todos" && t.focus !== selectedFocus) return false;
      if (!q) return true;
      const inName = normalize(t.name).includes(q);
      const inFocus = normalize(t.focus).includes(q);
      const inLevel = normalize(t.level).includes(q);
      const inExercises = t.exercises?.some(
        (e) => normalize(e.name).includes(q) || normalize(e.muscleGroup).includes(q)
      );
      return inName || inFocus || inLevel || inExercises;
    });
  }, [templates, search, selectedFocus]);

  const openVideo = async (url?: string) => {
    if (!url) return;
    const videoId = getYoutubeVideoId(url);
    if (videoId) {
      const appUrl = `vnd.youtube:${videoId}`;
      const webUrl = `https://www.youtube.com/watch?v=${videoId}`;
      try {
        const can = await Linking.canOpenURL(appUrl);
        if (can) {
          await Linking.openURL(appUrl);
          return;
        }
      } catch {}
      try {
        await WebBrowser.openBrowserAsync(webUrl);
      } catch {
        try {
          await Linking.openURL(webUrl);
        } catch {
          Alert.alert("Vídeo Indisponível", "Não foi possível abrir o vídeo.");
        }
      }
    } else {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert("Vídeo Indisponível", "Link do vídeo não pôde ser aberto.");
      }
    }
  };

  return (
    <View style={styles.sectionStack}>
      {/* Search Bar */}
      <View style={styles.tplSearchBox}>
        <Ionicons name="search-outline" size={18} color="#D90000" />
        <TextInput
          style={styles.tplSearchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar modelo por nome, foco ou exercício..."
          placeholderTextColor="#666"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.tplSearchClear}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Focus Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tplFocusRail}
      >
        {focusOptions.map((f) => {
          const active = selectedFocus === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.tplFocusChip, active && styles.tplFocusChipActive]}
              onPress={() => setSelectedFocus(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tplFocusChipText, active && styles.tplFocusChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Header with Results Count & Add Button */}
      <View style={styles.tplListHeader}>
        <Text style={styles.tplListCountText}>
          {filtered.length} {filtered.length === 1 ? "modelo encontrado" : "modelos encontrados"}
        </Text>
        <TouchableOpacity style={styles.tplAddButtonSmall} onPress={onCreate} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={16} color="#FFFFFF" />
          <Text style={styles.tplAddButtonSmallText}>Novo Modelo</Text>
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {filtered.length === 0 && (
        <View style={styles.tplEmptyBox}>
          <Ionicons name="barbell-outline" size={38} color="#444" />
          <Text style={styles.tplEmptyTitle}>Nenhum modelo encontrado</Text>
          <Text style={styles.tplEmptySubtitle}>
            Tente buscar com outro termo ou limpe os filtros para ver todos os treinos.
          </Text>
          <TouchableOpacity
            style={styles.tplEmptyAction}
            onPress={() => {
              setSearch("");
              setSelectedFocus("Todos");
            }}
          >
            <Text style={styles.tplEmptyActionText}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Template Cards */}
      {filtered.map((template) => {
        const isExpanded = expandedId === template.id;
        const exercises = template.exercises ?? [];

        return (
          <View key={template.id} style={styles.tplCardContainer}>
            {/* Card Main Info */}
            <View style={styles.tplCardTop}>
              <View style={styles.tplIconContainer}>
                <Ionicons name="barbell" size={20} color="#D90000" />
              </View>
              <View style={styles.tplCardHeaderInfo}>
                <Text style={styles.tplCardTitle}>{template.name}</Text>
                <Text style={styles.tplCardSubtitle}>
                  {template.focus} • {template.level} • {template.sessions}
                </Text>
              </View>
              <View style={styles.tplExerciseBadge}>
                <Text style={styles.tplExerciseBadgeText}>
                  {exercises.length} {exercises.length === 1 ? "exercício" : "exercícios"}
                </Text>
              </View>
            </View>

            {/* Description Snippet */}
            {!!template.description && (
              <Text style={styles.tplCardDescription} numberOfLines={isExpanded ? undefined : 2}>
                {template.description}
              </Text>
            )}

            {/* Collapsed Exercises Preview */}
            {!isExpanded && exercises.length > 0 && (
              <View style={styles.tplCollapsedList}>
                {exercises.slice(0, 3).map((ex, idx) => (
                  <View key={ex.id || idx} style={styles.tplMiniRow}>
                    <View style={styles.tplMiniNumber}>
                      <Text style={styles.tplMiniNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.tplMiniName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.tplMiniSpecs}>
                      {ex.sets}x {ex.reps} {ex.load ? `• ${ex.load}` : ""}
                    </Text>
                  </View>
                ))}
                {exercises.length > 3 && (
                  <TouchableOpacity
                    style={styles.tplMoreLink}
                    onPress={() => setExpandedId(template.id)}
                  >
                    <Text style={styles.tplMoreLinkText}>
                      + {exercises.length - 3} outros exercícios no modelo
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#D90000" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Expanded Full Drawer */}
            {isExpanded && (
              <View style={styles.tplExpandedDrawer}>
                {/* Warmup Box */}
                {!!template.warmupInstructions && (
                  <View style={styles.tplDrawerWarmup}>
                    <Ionicons name="flame-outline" size={16} color="#D90000" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tplDrawerWarmupLabel}>Aquecimento e Mobilidade:</Text>
                      <Text style={styles.tplDrawerWarmupText}>{template.warmupInstructions}</Text>
                    </View>
                  </View>
                )}

                {/* Video Lesson Banner */}
                {!!template.videoUrl && (
                  <TouchableOpacity
                    style={styles.tplDrawerVideo}
                    onPress={() => openVideo(template.videoUrl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-youtube" size={18} color="#D90000" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tplDrawerVideoTitle}>
                        {template.videoTitle || "Vídeo de orientação da sessão"}
                      </Text>
                      <Text style={styles.tplDrawerVideoSub}>Toque para assistir demonstração</Text>
                    </View>
                    <Ionicons name="play-circle-outline" size={22} color="#D90000" />
                  </TouchableOpacity>
                )}

                {/* Full Exercise List */}
                <Text style={styles.tplDrawerSectionTitle}>Grade de Exercícios</Text>
                {exercises.map((ex, idx) => (
                  <View key={ex.id || idx} style={styles.tplDrawerExerciseCard}>
                    <View style={styles.tplDrawerExerciseTop}>
                      <View style={styles.tplDrawerNumBadge}>
                        <Text style={styles.tplDrawerNumText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tplDrawerExName}>{ex.name}</Text>
                        <Text style={styles.tplDrawerExGroup}>{ex.muscleGroup}</Text>
                      </View>
                      {!!ex.videoUrl && (
                        <TouchableOpacity
                          style={styles.tplExVideoBtn}
                          onPress={() => openVideo(ex.videoUrl)}
                        >
                          <Ionicons name="play-circle" size={20} color="#D90000" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Prescription Pills */}
                    <View style={styles.tplDrawerPillsRow}>
                      <View style={styles.tplDrawerPill}>
                        <Text style={styles.tplDrawerPillText}>
                          {ex.sets} séries × {ex.reps}
                        </Text>
                      </View>
                      {!!ex.load && (
                        <View style={styles.tplDrawerPill}>
                          <Text style={styles.tplDrawerPillText}>⚡ {ex.load}</Text>
                        </View>
                      )}
                      {!!ex.restSeconds && (
                        <View style={styles.tplDrawerPill}>
                          <Text style={styles.tplDrawerPillText}>⏱ {ex.restSeconds}s rest</Text>
                        </View>
                      )}
                      {!!ex.technique && ex.technique !== "Normal" && (
                        <View style={styles.tplDrawerPillAccent}>
                          <Text style={styles.tplDrawerPillAccentText}>★ {ex.technique}</Text>
                        </View>
                      )}
                    </View>

                    {/* Notes */}
                    {!!ex.notes && (
                      <Text style={styles.tplDrawerExNote}>💡 {ex.notes}</Text>
                    )}
                  </View>
                ))}

                {/* Questions Preview */}
                {template.postWorkoutQuestions && (
                  <View style={styles.tplDrawerQuestions}>
                    <Ionicons name="help-circle-outline" size={16} color="#888" />
                    <Text style={styles.tplDrawerQuestionsText}>
                      Check-in pós-treino:{" "}
                      {[
                        template.postWorkoutQuestions.askRpe ? "PSE/RPE" : null,
                        template.postWorkoutQuestions.askPain ? "Relato de dor" : null,
                        template.postWorkoutQuestions.askNotes ? "Comentários" : null,
                        template.postWorkoutQuestions.customQuestions?.length
                          ? `${template.postWorkoutQuestions.customQuestions.length} perguntas`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Bar */}
            <View style={styles.tplCardActionsRow}>
              <TouchableOpacity
                style={styles.tplBtnPreview}
                onPress={() => setExpandedId(isExpanded ? null : template.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isExpanded ? "chevron-up-outline" : "eye-outline"}
                  size={15}
                  color="#E0E0E0"
                />
                <Text style={styles.tplBtnPreviewText}>
                  {isExpanded ? "Ocultar" : "Pré-visualizar"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tplBtnSecondary}
                onPress={() => onDuplicate(template)}
                activeOpacity={0.8}
                accessibilityLabel="Duplicar modelo"
              >
                <Ionicons name="copy-outline" size={15} color="#CCCCCC" />
                <Text style={styles.tplBtnSecondaryText}>Duplicar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tplBtnSecondary}
                onPress={() => onEdit(template)}
                activeOpacity={0.8}
                accessibilityLabel="Editar modelo"
              >
                <Ionicons name="create-outline" size={15} color="#CCCCCC" />
                <Text style={styles.tplBtnSecondaryText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tplBtnSecondary}
                onPress={() => {
                  shareWorkoutAsPdf({
                    studentName: "Modelo de Treino",
                    workoutInfo: {
                      name: template.name,
                      startDate: new Date().toISOString().slice(0, 10),
                      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
                      notes: template.description || (template as any).objective || "",
                      releaseToStudent: true,
                      notifyExpiration: true,
                      splitByWeekDay: false,
                      recommendedDays: ["Segunda", "Quarta", "Sexta"],
                    },
                    exercises: (template.exercises || []).map((ex, idx) => ({
                      id: ex.id || `ex-${idx}`,
                      name: ex.name,
                      category: ex.muscleGroup || template.focus || "Geral",
                      muscleGroup: ex.muscleGroup || "Geral",
                      videoUrl: ex.videoUrl,
                      observation: ex.notes,
                      sets: Array.from({ length: ex.sets || 3 }, (_, sIdx) => ({
                        id: `s-${idx}-${sIdx}`,
                        setNumber: sIdx + 1,
                        reps: ex.reps || "10 a 12",
                        load: ex.load || "20 kg",
                        restSeconds: ex.restSeconds || 60,
                      })),
                    })),
                  });
                }}
                activeOpacity={0.8}
                accessibilityLabel="Exportar PDF do modelo"
              >
                <Ionicons name="document-text-outline" size={15} color="#CCCCCC" />
                <Text style={styles.tplBtnSecondaryText}>PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tplBtnPrimary}
                onPress={() => router.push("/training" as never)}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.tplBtnPrimaryText}>Usar</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function renderWorkoutTemplates(
  templates: WorkoutTemplate[],
  onCreate: () => void,
  onEdit: (template: WorkoutTemplate) => void,
  onDuplicate: (template: WorkoutTemplate) => void
) {
  return (
    <WorkoutTemplatesView
      templates={templates}
      onCreate={onCreate}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
    />
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

function renderAnamneses(
  profiles: StudentProfile[],
  normalizedQuery: string,
  filter: string,
  setFilter: (value: string) => void,
  openStudent: (studentId: string) => void
) {
  const options = [
    { id: "all", label: "Todas" },
    { id: "pending", label: "Aguardando revisão" },
    { id: "restrictions", label: "Com restrições" },
    { id: "reviewed", label: "Revisadas" },
  ];

  const rows = profiles
    .filter((profile) => {
      const anamnesis = profile.anamnesis;
      if (filter === "pending" && anamnesis.status !== "aguardando_revisao") return false;
      if (filter === "restrictions" && !profile.restrictions.length) return false;
      if (filter === "reviewed" && anamnesis.status !== "revisada_pelo_treinador") return false;
      return (
        !normalizedQuery ||
        normalize(
          `${profile.registration.fullName} ${profile.registration.mainGoal} ${profile.restrictions.map((r) => r.label).join(" ")}`
        ).includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      if (a.anamnesis.status === "aguardando_revisao" && b.anamnesis.status !== "aguardando_revisao") return -1;
      if (b.anamnesis.status === "aguardando_revisao" && a.anamnesis.status !== "aguardando_revisao") return 1;
      return 0;
    });

  const pendingCount = profiles.filter((p) => p.anamnesis.status === "aguardando_revisao").length;

  return (
    <View style={styles.sectionStack}>
      <ChipRail options={options} active={filter} onChange={setFilter} />

      {pendingCount > 0 ? (
        <InsightCard
          icon="document-text-outline"
          title={`${pendingCount} anamnese(s) aguardando revisão`}
          detail="Analise o histórico médico e as restrições antes de prescrever treinos."
        />
      ) : null}

      {rows.map((profile) => {
        const anamnesis = profile.anamnesis;
        const isPending = anamnesis.status === "aguardando_revisao";
        const hasRestrictions = profile.restrictions.length > 0;

        return (
          <TouchableOpacity
            key={profile.id}
            style={styles.cardBox}
            onPress={() => openStudent(profile.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardBoxTop}>
              <Avatar uri={profile.registration.avatar} />
              <View style={styles.rowTextBlock}>
                <Text style={styles.rowTitle}>{profile.registration.fullName}</Text>
                <Text style={styles.rowSubtitle}>{profile.registration.mainGoal || "Objetivo não informado"}</Text>
              </View>
              <View style={[styles.statusPill, isPending ? styles.statusPillDanger : styles.statusPillSuccess]}>
                <Text style={[styles.statusPillText, isPending ? styles.statusPillTextDanger : styles.statusPillTextSuccess]}>
                  {isPending ? "Aguardando" : "Revisada"}
                </Text>
              </View>
            </View>

            {hasRestrictions ? (
              <View style={styles.chipsRow}>
                {profile.restrictions.map((restriction) => (
                  <View
                    key={restriction.id}
                    style={restriction.severity === "critical" ? styles.miniTagDanger : styles.miniTagWarning}
                  >
                    <Ionicons
                      name={restriction.severity === "critical" ? "bandage-outline" : "medical-outline"}
                      size={12}
                      color={restriction.severity === "critical" ? "#ff4d4d" : "#ffb703"}
                    />
                    <Text
                      style={restriction.severity === "critical" ? styles.miniTagDangerText : styles.miniTagWarningText}
                      numberOfLines={1}
                    >
                      {restriction.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.cardBoxFooter}>
              <Text style={styles.cardBoxFooterText}>
                {profile.updatedAt ? `Preenchida em ${formatProfileDate(profile.updatedAt)}` : "Aguardando preenchimento"}
              </Text>
              <View style={styles.cardBoxAction}>
                <Text style={styles.cardBoxActionText}>Ver ficha</Text>
                <Ionicons name="chevron-forward" size={14} color={ACCENT} />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {!rows.length ? (
        <EmptyInline
          icon="document-text-outline"
          title="Nenhuma anamnese encontrada"
          detail="Nenhum aluno corresponde aos filtros selecionados."
        />
      ) : null}
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

function Kpi({
  label,
  value,
  variant = "secondary",
}: {
  label: string;
  value: string;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <View style={[styles.kpiCard, isPrimary ? styles.kpiCardPrimary : styles.kpiCardSecondary]}>
      <Text style={[styles.kpiValue, isPrimary ? styles.kpiValuePrimary : styles.kpiValueSecondary]}>
        {value}
      </Text>
      <Text style={[styles.kpiLabel, isPrimary ? styles.kpiLabelPrimary : styles.kpiLabelSecondary]}>
        {label}
      </Text>
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

const FOCUS_OPTIONS = [
  "Hipertrofia",
  "Força",
  "Definição",
  "Resistência",
  "Funcional",
  "Readaptação",
  "Cardio e core",
];

const LEVEL_OPTIONS = ["Iniciante", "Intermediário", "Avançado", "Todos"];

const FREQUENCY_OPTIONS = [
  "2x semana",
  "3x semana",
  "4x semana",
  "5x semana",
  "6x semana",
  "Livre",
];

const DURATION_OPTIONS = ["30 min", "45 min", "60 min", "75 min", "90 min"];

const MUSCLE_GROUP_OPTIONS = [
  "Peitoral",
  "Costas",
  "Quadríceps",
  "Posterior",
  "Glúteos",
  "Ombros",
  "Tríceps",
  "Bíceps",
  "Core",
  "Panturrilhas",
];

const EQUIPMENT_OPTIONS = [
  "Halteres",
  "Barra",
  "Polia",
  "Máquinas",
  "Peso Corporal",
  "Elásticos",
  "Banco",
  "Kettlebell",
];

const TECHNIQUE_OPTIONS = [
  "Normal",
  "Drop-set",
  "Rest-pause",
  "Bi-set",
  "Pirâmide",
  "Super-slow",
  "FST-7",
  "Cluster",
];

function TemplateModal({
  visible,
  draft,
  onClose,
  onChange,
  onSave,
  onDelete,
  isExisting,
}: {
  visible: boolean;
  draft: WorkoutTemplate;
  onClose: () => void;
  onChange: (draft: WorkoutTemplate) => void;
  onSave: () => void;
  onDelete?: (id: string) => void;
  isExisting?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"general" | "exercises" | "instructions" | "questions" | "preview">("general");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("Todos");
  const [newExercise, setNewExercise] = useState<TemplateExercise>({
    id: `ex-${Date.now()}`,
    name: "",
    muscleGroup: "Peitoral",
    sets: 4,
    reps: "10 - 12",
    load: "20 kg",
    restSeconds: 60,
    technique: "Normal",
    videoUrl: "",
    notes: "",
  });

  const toggleMuscleGroup = (muscle: string) => {
    const current = draft.muscleGroups ?? [];
    const next = current.includes(muscle) ? current.filter((m) => m !== muscle) : [...current, muscle];
    onChange({ ...draft, muscleGroups: next });
  };

  const toggleEquipment = (equipment: string) => {
    const current = draft.equipments ?? [];
    const next = current.includes(equipment) ? current.filter((e) => e !== equipment) : [...current, equipment];
    onChange({ ...draft, equipments: next });
  };

  const updateQuestions = (patch: Partial<NonNullable<WorkoutTemplate["postWorkoutQuestions"]>>) => {
    const current = draft.postWorkoutQuestions ?? {
      askRpe: true,
      askPain: true,
      askNotes: true,
      customQuestions: [],
    };
    onChange({ ...draft, postWorkoutQuestions: { ...current, ...patch } });
  };

  const addCustomQuestion = () => {
    if (!newQuestionText.trim()) return;
    const current = draft.postWorkoutQuestions?.customQuestions ?? [];
    updateQuestions({ customQuestions: [...current, newQuestionText.trim()] });
    setNewQuestionText("");
  };

  const removeCustomQuestion = (index: number) => {
    const current = draft.postWorkoutQuestions?.customQuestions ?? [];
    updateQuestions({ customQuestions: current.filter((_, idx) => idx !== index) });
  };

  const addExerciseToTemplate = () => {
    if (!newExercise.name.trim()) {
      Alert.alert("Nome do exercício", "Informe o nome do exercício para adicionar.");
      return;
    }
    const current = draft.exercises ?? [];
    onChange({
      ...draft,
      exercises: [...current, { ...newExercise, id: `ex-${Date.now()}` }],
    });
    setNewExercise({
      id: `ex-${Date.now()}`,
      name: "",
      muscleGroup: newExercise.muscleGroup,
      sets: 4,
      reps: "10 - 12",
      load: "20 kg",
      restSeconds: 60,
      technique: "Normal",
      videoUrl: "",
      notes: "",
    });
    setAddingExercise(false);
  };

  const selectCatalogExercise = (exItem: (typeof SYSTEM_EXERCISES)[number]) => {
    setNewExercise({
      ...newExercise,
      name: exItem.name,
      muscleGroup: exItem.category || newExercise.muscleGroup,
      videoUrl: exItem.videoUrl || "",
    });
    setShowCatalogModal(false);
    setAddingExercise(true);
  };

  const removeExercise = (index: number) => {
    const current = draft.exercises ?? [];
    onChange({ ...draft, exercises: current.filter((_, idx) => idx !== index) });
  };

  const openVideoLink = async (url?: string) => {
    const targetUrl = url || draft.videoUrl;
    if (!targetUrl) return;
    const videoId = getYoutubeVideoId(targetUrl);
    if (videoId) {
      const appUrl = `vnd.youtube:${videoId}`;
      const webUrl = `https://www.youtube.com/watch?v=${videoId}`;
      try {
        const can = await Linking.canOpenURL(appUrl);
        if (can) {
          await Linking.openURL(appUrl);
          return;
        }
      } catch {}
      try {
        await WebBrowser.openBrowserAsync(webUrl);
      } catch {
        try {
          await Linking.openURL(webUrl);
        } catch {
          Alert.alert("Vídeo Indisponível", "Não foi possível abrir o vídeo.");
        }
      }
    } else {
      try {
        await Linking.openURL(targetUrl);
      } catch {
        Alert.alert("Vídeo Indisponível", "Link do vídeo não pôde ser aberto.");
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir modelo",
      `Deseja realmente excluir o modelo "${draft.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => onDelete && onDelete(draft.id),
        },
      ]
    );
  };

  const exerciseCount = draft.exercises?.length ?? 0;

  const filteredCatalog = useMemo(() => {
    const q = normalize(catalogSearch);
    return SYSTEM_EXERCISES.filter((ex) => {
      if (catalogCategory !== "Todos" && ex.category !== catalogCategory) return false;
      if (!q) return true;
      return normalize(ex.name).includes(q) || normalize(ex.category).includes(q);
    });
  }, [catalogSearch, catalogCategory]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalSheetFull}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconBubble}>
                <Ionicons name="barbell" size={20} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {isExisting ? "Editar Modelo de Treino" : "Novo Modelo de Treino"}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  Prescrição, exercícios, instruções e prévia ao vivo
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.sheetCloseButton} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={TEXT} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.modalTabRailContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalTabRailContent}
            >
              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === "general" && styles.modalTabButtonActive]}
                onPress={() => setActiveTab("general")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={15}
                  color={activeTab === "general" ? "#fff" : MUTED}
                />
                <Text style={[styles.modalTabText, activeTab === "general" && styles.modalTabTextActive]}>
                  Geral
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === "exercises" && styles.modalTabButtonActive]}
                onPress={() => setActiveTab("exercises")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="fitness-outline"
                  size={15}
                  color={activeTab === "exercises" ? "#fff" : MUTED}
                />
                <Text style={[styles.modalTabText, activeTab === "exercises" && styles.modalTabTextActive]}>
                  Exercícios ({exerciseCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === "instructions" && styles.modalTabButtonActive]}
                onPress={() => setActiveTab("instructions")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="videocam-outline"
                  size={15}
                  color={activeTab === "instructions" ? "#fff" : MUTED}
                />
                <Text style={[styles.modalTabText, activeTab === "instructions" && styles.modalTabTextActive]}>
                  Vídeo & Detalhes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === "questions" && styles.modalTabButtonActive]}
                onPress={() => setActiveTab("questions")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={15}
                  color={activeTab === "questions" ? "#fff" : MUTED}
                />
                <Text style={[styles.modalTabText, activeTab === "questions" && styles.modalTabTextActive]}>
                  Perguntas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === "preview" && styles.modalTabButtonActive]}
                onPress={() => setActiveTab("preview")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="eye-outline"
                  size={15}
                  color={activeTab === "preview" ? "#fff" : "#D90000"}
                />
                <Text style={[styles.modalTabText, activeTab === "preview" && styles.modalTabTextActive, { color: activeTab === "preview" ? "#fff" : "#D90000" }]}>
                  Pré-visualização
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Tab Content */}
          <ScrollView
            style={styles.modalScrollBody}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* TAB 1: GERAL */}
            {activeTab === "general" && (
              <View style={styles.tabSection}>
                <Field
                  label="Nome do modelo ou treino *"
                  value={draft.name}
                  onChangeText={(value) => onChange({ ...draft, name: value })}
                  placeholder="Ex: Treino A - Peito, Deltoide e Tríceps"
                />

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Foco principal</Text>
                  <View style={styles.optionGrid}>
                    {FOCUS_OPTIONS.map((f) => {
                      const selected = draft.focus === f;
                      return (
                        <TouchableOpacity
                          key={f}
                          style={[styles.optionChip, selected && styles.optionChipActive]}
                          onPress={() => onChange({ ...draft, focus: f })}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                            {f}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Nível de condicionamento</Text>
                  <View style={styles.optionGrid}>
                    {LEVEL_OPTIONS.map((lvl) => {
                      const selected = draft.level === lvl;
                      return (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.optionChip, selected && styles.optionChipActive]}
                          onPress={() => onChange({ ...draft, level: lvl })}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Frequência sugerida</Text>
                  <View style={styles.optionGrid}>
                    {FREQUENCY_OPTIONS.map((freq) => {
                      const selected = draft.sessions === freq;
                      return (
                        <TouchableOpacity
                          key={freq}
                          style={[styles.optionChip, selected && styles.optionChipActive]}
                          onPress={() => onChange({ ...draft, sessions: freq })}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                            {freq}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Duração estimada</Text>
                  <View style={styles.optionGrid}>
                    {DURATION_OPTIONS.map((dur) => {
                      const selected = draft.estimatedDuration === dur;
                      return (
                        <TouchableOpacity
                          key={dur}
                          style={[styles.optionChip, selected && styles.optionChipActive]}
                          onPress={() => onChange({ ...draft, estimatedDuration: dur })}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                            {dur}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Grupos musculares trabalhados</Text>
                  <View style={styles.optionGrid}>
                    {MUSCLE_GROUP_OPTIONS.map((muscle) => {
                      const selected = (draft.muscleGroups ?? []).includes(muscle);
                      return (
                        <TouchableOpacity
                          key={muscle}
                          style={[styles.multiTagChip, selected && styles.multiTagChipActive]}
                          onPress={() => toggleMuscleGroup(muscle)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={selected ? "checkmark-circle" : "ellipse-outline"}
                            size={14}
                            color={selected ? "#D90000" : MUTED}
                          />
                          <Text style={[styles.multiTagText, selected && styles.multiTagTextActive]}>
                            {muscle}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: EXERCÍCIOS */}
            {activeTab === "exercises" && (
              <View style={styles.tabSection}>
                <View style={styles.exerciseListHeader}>
                  <Text style={styles.sectionHeaderTitle}>
                    Grade de Exercícios ({exerciseCount})
                  </Text>
                  {!addingExercise && (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        style={styles.catalogPickerTrigger}
                        onPress={() => setShowCatalogModal(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="book-outline" size={14} color="#D90000" />
                        <Text style={styles.catalogPickerTriggerText}>Catálogo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addExerciseTrigger}
                        onPress={() => setAddingExercise(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle" size={14} color="#fff" />
                        <Text style={styles.addExerciseTriggerText}>Criar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Form to Add Exercise */}
                {addingExercise && (
                  <View style={styles.exerciseFormCard}>
                    <View style={styles.exerciseFormHeader}>
                      <Text style={styles.exerciseFormTitle}>Adicionar Exercício</Text>
                      <TouchableOpacity
                        onPress={() => setAddingExercise(false)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                      </TouchableOpacity>
                    </View>

                    <Field
                      label="Nome do exercício *"
                      value={newExercise.name}
                      onChangeText={(val) => setNewExercise({ ...newExercise, name: val })}
                      placeholder="Ex: Supino Reto com Barra"
                    />

                    <View style={styles.formGroup}>
                      <Text style={styles.fieldLabel}>Grupo muscular</Text>
                      <View style={styles.optionGrid}>
                        {MUSCLE_GROUP_OPTIONS.slice(0, 6).map((m) => {
                          const selected = newExercise.muscleGroup === m;
                          return (
                            <TouchableOpacity
                              key={m}
                              style={[styles.optionChip, selected && styles.optionChipActive]}
                              onPress={() => setNewExercise({ ...newExercise, muscleGroup: m })}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                                {m}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* 3-column row: Séries, Repetições, Carga */}
                    <View style={styles.threeColRow}>
                      <View style={styles.colThird}>
                        <Field
                          label="Séries"
                          value={String(newExercise.sets)}
                          onChangeText={(val) =>
                            setNewExercise({ ...newExercise, sets: parseInt(val, 10) || 1 })
                          }
                          placeholder="4"
                        />
                      </View>
                      <View style={styles.colThird}>
                        <Field
                          label="Reps"
                          value={newExercise.reps}
                          onChangeText={(val) => setNewExercise({ ...newExercise, reps: val })}
                          placeholder="8 - 12"
                        />
                      </View>
                      <View style={styles.colThird}>
                        <Field
                          label="Carga"
                          value={newExercise.load ?? ""}
                          onChangeText={(val) => setNewExercise({ ...newExercise, load: val })}
                          placeholder="20 kg"
                        />
                      </View>
                    </View>

                    {/* 2-column row: Descanso, Técnica */}
                    <View style={styles.twoColRow}>
                      <View style={styles.colHalf}>
                        <Field
                          label="Descanso (segundos)"
                          value={String(newExercise.restSeconds ?? 60)}
                          onChangeText={(val) =>
                            setNewExercise({ ...newExercise, restSeconds: parseInt(val, 10) || 60 })
                          }
                          placeholder="60"
                        />
                      </View>
                      <View style={styles.colHalf}>
                        <Text style={styles.fieldLabel}>Método / Técnica</Text>
                        <View style={styles.optionGrid}>
                          {TECHNIQUE_OPTIONS.slice(0, 4).map((tech) => {
                            const selected = newExercise.technique === tech;
                            return (
                              <TouchableOpacity
                                key={tech}
                                style={[styles.optionChip, selected && styles.optionChipActive]}
                                onPress={() => setNewExercise({ ...newExercise, technique: tech })}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                                  {tech}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>

                    <Field
                      label="Link do vídeo do exercício (opcional)"
                      value={newExercise.videoUrl ?? ""}
                      onChangeText={(val) => setNewExercise({ ...newExercise, videoUrl: val })}
                      placeholder="https://youtube.com/watch?v=..."
                    />

                    <Field
                      label="Observações / Dica de execução"
                      value={newExercise.notes ?? ""}
                      onChangeText={(val) => setNewExercise({ ...newExercise, notes: val })}
                      placeholder="Ex: Pausa de 1s no ponto de pico de contração."
                    />

                    <View style={styles.exerciseFormActions}>
                      <TouchableOpacity
                        style={styles.cancelFormBtn}
                        onPress={() => setAddingExercise(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelFormBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmExerciseBtn}
                        onPress={addExerciseToTemplate}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.confirmExerciseBtnText}>Adicionar à lista</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Exercises List */}
                {(draft.exercises ?? []).length === 0 && !addingExercise && (
                  <View style={styles.emptyExerciseBox}>
                    <Ionicons name="barbell-outline" size={36} color={SUBTLE} />
                    <Text style={styles.emptyExerciseTitle}>Nenhum exercício adicionado</Text>
                    <Text style={styles.emptyExerciseSub}>
                      Escolha do catálogo ou adicione exercícios manualmente para montar a grade.
                    </Text>
                    <TouchableOpacity
                      style={styles.catalogPickerBtnLarge}
                      onPress={() => setShowCatalogModal(true)}
                    >
                      <Ionicons name="book-outline" size={16} color="#D90000" />
                      <Text style={styles.catalogPickerBtnLargeText}>Abrir Catálogo de Exercícios</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(draft.exercises ?? []).map((ex, index) => (
                  <View key={ex.id || index} style={styles.exerciseCardItem}>
                    <View style={styles.exerciseCardItemTop}>
                      <View style={styles.exerciseNumberBadge}>
                        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.exerciseItemDetails}>
                        <Text style={styles.exerciseItemName}>{ex.name}</Text>
                        <Text style={styles.exerciseItemCategory}>{ex.muscleGroup}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteExerciseBtn}
                        onPress={() => removeExercise(index)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={17} color="#ff5a5a" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.exerciseBadgeRow}>
                      <View style={styles.exerciseMiniPill}>
                        <Text style={styles.exerciseMiniPillText}>{ex.sets} séries × {ex.reps}</Text>
                      </View>
                      {!!ex.load && (
                        <View style={styles.exerciseMiniPill}>
                          <Text style={styles.exerciseMiniPillText}>⚡ {ex.load}</Text>
                        </View>
                      )}
                      {!!ex.restSeconds && (
                        <View style={styles.exerciseMiniPill}>
                          <Text style={styles.exerciseMiniPillText}>⏱ {ex.restSeconds}s rest</Text>
                        </View>
                      )}
                      {!!ex.technique && ex.technique !== "Normal" && (
                        <View style={styles.exerciseMiniPillAccent}>
                          <Text style={styles.exerciseMiniPillAccentText}>★ {ex.technique}</Text>
                        </View>
                      )}
                    </View>

                    {!!ex.notes && (
                      <Text style={styles.exerciseItemNote}>
                        💡 {ex.notes}
                      </Text>
                    )}

                    {!!ex.videoUrl && (
                      <TouchableOpacity
                        style={styles.exerciseVideoLink}
                        onPress={() => openVideoLink(ex.videoUrl)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play-circle-outline" size={14} color="#D90000" />
                        <Text style={styles.exerciseVideoLinkText}>Assistir demonstração</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* TAB 3: INSTRUÇÕES & VÍDEO */}
            {activeTab === "instructions" && (
              <View style={styles.tabSection}>
                <Field
                  label="Descrição e metodologia do treino"
                  value={draft.description ?? ""}
                  onChangeText={(value) => onChange({ ...draft, description: value })}
                  placeholder="Descreva as técnicas, cadência, recomendações de intervalo e objetivos deste modelo..."
                  multiline
                />

                <Field
                  label="Instruções de aquecimento & mobilidade"
                  value={draft.warmupInstructions ?? ""}
                  onChangeText={(value) => onChange({ ...draft, warmupInstructions: value })}
                  placeholder="Ex: 5 min de esteira + 2 séries de manguito rotador e rotação torácica com elástico..."
                  multiline
                />

                <View style={styles.videoSectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="logo-youtube" size={20} color="#D90000" />
                    <Text style={styles.sectionHeaderTitle}>Vídeo demonstrativo / Aula</Text>
                  </View>

                  <Field
                    label="URL do vídeo (YouTube, Vimeo ou MP4)"
                    value={draft.videoUrl ?? ""}
                    onChangeText={(value) => onChange({ ...draft, videoUrl: value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />

                  <Field
                    label="Título ou tema do vídeo"
                    value={draft.videoTitle ?? ""}
                    onChangeText={(value) => onChange({ ...draft, videoTitle: value })}
                    placeholder="Ex: Postura e execução correta do treino"
                  />

                  {!!draft.videoUrl && (
                    <TouchableOpacity
                      style={styles.testVideoBtn}
                      onPress={() => openVideoLink(draft.videoUrl)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play-circle-outline" size={18} color="#D90000" />
                      <Text style={styles.testVideoBtnText}>Testar / Assistir vídeo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Equipamentos necessários</Text>
                  <View style={styles.optionGrid}>
                    {EQUIPMENT_OPTIONS.map((equip) => {
                      const selected = (draft.equipments ?? []).includes(equip);
                      return (
                        <TouchableOpacity
                          key={equip}
                          style={[styles.multiTagChip, selected && styles.multiTagChipActive]}
                          onPress={() => toggleEquipment(equip)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={selected ? "checkmark-circle" : "ellipse-outline"}
                            size={14}
                            color={selected ? "#D90000" : MUTED}
                          />
                          <Text style={[styles.multiTagText, selected && styles.multiTagTextActive]}>
                            {equip}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* TAB 4: PERGUNTAS & FEEDBACK */}
            {activeTab === "questions" && (
              <View style={styles.tabSection}>
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle-outline" size={20} color="#D90000" />
                  <Text style={styles.infoBannerText}>
                    Defina o que o aluno deve responder no check-in ao finalizar a sessão para acompanhamento da sua evolução.
                  </Text>
                </View>

                <Text style={styles.sectionHeaderTitle}>Métricas de Check-in</Text>

                {/* Toggle PSE/RPE */}
                <TouchableOpacity
                  style={[
                    styles.toggleCard,
                    draft.postWorkoutQuestions?.askRpe && styles.toggleCardActive,
                  ]}
                  onPress={() =>
                    updateQuestions({
                      askRpe: !draft.postWorkoutQuestions?.askRpe,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>Solicitar Escala de Esforço (PSE / RPE 1 a 10)</Text>
                    <Text style={styles.toggleSub}>
                      Permite ao aluno classificar o nível de intensidade percebida da sessão.
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggleSwitch,
                      draft.postWorkoutQuestions?.askRpe && styles.toggleSwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        draft.postWorkoutQuestions?.askRpe && styles.toggleKnobActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Toggle Dor */}
                <TouchableOpacity
                  style={[
                    styles.toggleCard,
                    draft.postWorkoutQuestions?.askPain && styles.toggleCardActive,
                  ]}
                  onPress={() =>
                    updateQuestions({
                      askPain: !draft.postWorkoutQuestions?.askPain,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>Solicitar Relato de Dor ou Desconforto</Text>
                    <Text style={styles.toggleSub}>
                      O aluno sinaliza se sentiu dor articular e indica o local afetado.
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggleSwitch,
                      draft.postWorkoutQuestions?.askPain && styles.toggleSwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        draft.postWorkoutQuestions?.askPain && styles.toggleKnobActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Toggle Cargas */}
                <TouchableOpacity
                  style={[
                    styles.toggleCard,
                    draft.postWorkoutQuestions?.askNotes && styles.toggleCardActive,
                  ]}
                  onPress={() =>
                    updateQuestions({
                      askNotes: !draft.postWorkoutQuestions?.askNotes,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>Permitir Comentários & Observações Gerais</Text>
                    <Text style={styles.toggleSub}>
                      Campo livre para o aluno registrar sensações e dúvidas sobre o treino.
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggleSwitch,
                      draft.postWorkoutQuestions?.askNotes && styles.toggleSwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        draft.postWorkoutQuestions?.askNotes && styles.toggleKnobActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Perguntas Customizadas */}
                <View style={styles.customQuestionsSection}>
                  <Text style={styles.sectionHeaderTitle}>Perguntas Personalizadas do Treinador</Text>
                  <Text style={styles.helperNote}>
                    Perguntas específicas que você quer que o aluno responda após este treino.
                  </Text>

                  {(draft.postWorkoutQuestions?.customQuestions ?? []).map((q, idx) => (
                    <View key={idx} style={styles.questionRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#D90000" />
                      <Text style={styles.questionText}>{q}</Text>
                      <TouchableOpacity
                        style={styles.deleteQuestionBtn}
                        onPress={() => removeCustomQuestion(idx)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ff5a5a" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={styles.addQuestionBox}>
                    <TextInput
                      style={styles.addQuestionInput}
                      value={newQuestionText}
                      onChangeText={setNewQuestionText}
                      placeholder="Ex: Conseguiu cumprir o tempo de descanso de 60s?"
                      placeholderTextColor="#666"
                    />
                    <TouchableOpacity
                      style={styles.addQuestionBtn}
                      onPress={addCustomQuestion}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.addQuestionBtnText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 5: PRÉ-VISUALIZAÇÃO AO VIVO DO ALUNO */}
            {activeTab === "preview" && (
              <View style={styles.tabSection}>
                {/* Simulated Student Workout Header */}
                <View style={styles.livePreviewHero}>
                  <View style={styles.livePreviewBadgeRow}>
                    <View style={styles.livePreviewFocusPill}>
                      <Text style={styles.livePreviewFocusText}>{draft.focus || "Geral"}</Text>
                    </View>
                    <View style={styles.livePreviewLevelPill}>
                      <Text style={styles.livePreviewLevelText}>{draft.level || "Intermediário"}</Text>
                    </View>
                    <View style={styles.livePreviewDurationPill}>
                      <Ionicons name="time-outline" size={12} color="#D90000" />
                      <Text style={styles.livePreviewDurationText}>
                        {draft.estimatedDuration || "50 min"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.livePreviewTitle}>
                    {draft.name || "Nome do Treino"}
                  </Text>

                  <Text style={styles.livePreviewSubtitle}>
                    {draft.sessions || "4x semana"} • {exerciseCount} {exerciseCount === 1 ? "exercício prescrito" : "exercícios prescritos"}
                  </Text>

                  {/* Muscle Groups */}
                  {(draft.muscleGroups ?? []).length > 0 && (
                    <View style={styles.livePreviewMusclesRow}>
                      {(draft.muscleGroups ?? []).map((m) => (
                        <View key={m} style={styles.livePreviewMuscleTag}>
                          <Text style={styles.livePreviewMuscleTagText}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Description */}
                {!!draft.description && (
                  <View style={styles.livePreviewCard}>
                    <Text style={styles.livePreviewCardTitle}>Metodologia & Orientações</Text>
                    <Text style={styles.livePreviewCardBody}>{draft.description}</Text>
                  </View>
                )}

                {/* Warmup */}
                {!!draft.warmupInstructions && (
                  <View style={[styles.livePreviewCard, styles.livePreviewCardWarmup]}>
                    <View style={styles.livePreviewWarmupHeader}>
                      <Ionicons name="flame" size={16} color="#D90000" />
                      <Text style={styles.livePreviewWarmupTitle}>Aquecimento & Mobilidade</Text>
                    </View>
                    <Text style={styles.livePreviewCardBody}>{draft.warmupInstructions}</Text>
                  </View>
                )}

                {/* Video */}
                {!!draft.videoUrl && (
                  <TouchableOpacity
                    style={styles.livePreviewVideoCard}
                    onPress={() => openVideoLink(draft.videoUrl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-youtube" size={24} color="#D90000" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.livePreviewVideoTitle}>
                        {draft.videoTitle || "Vídeo da Aula / Orientações"}
                      </Text>
                      <Text style={styles.livePreviewVideoSub}>Toque para assistir demonstração</Text>
                    </View>
                    <Ionicons name="play-circle" size={28} color="#D90000" />
                  </TouchableOpacity>
                )}

                {/* Exercises Section Header */}
                <View style={styles.livePreviewSectionHeader}>
                  <Text style={styles.livePreviewSectionTitle}>Grade de Exercícios</Text>
                  <Text style={styles.livePreviewSectionBadge}>
                    {exerciseCount} {exerciseCount === 1 ? "exercício" : "exercícios"}
                  </Text>
                </View>

                {exerciseCount === 0 && (
                  <View style={styles.emptyExerciseBox}>
                    <Ionicons name="barbell-outline" size={32} color="#444" />
                    <Text style={styles.emptyExerciseTitle}>Nenhum exercício para pré-visualizar</Text>
                    <Text style={styles.emptyExerciseSub}>
                      Adicione exercícios na aba "Exercícios" para vê-los aqui.
                    </Text>
                  </View>
                )}

                {/* Exercise Cards */}
                {(draft.exercises ?? []).map((ex, idx) => (
                  <View key={ex.id || idx} style={styles.livePreviewExCard}>
                    <View style={styles.livePreviewExTop}>
                      <View style={styles.livePreviewExNumber}>
                        <Text style={styles.livePreviewExNumberText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.livePreviewExName}>{ex.name}</Text>
                        <Text style={styles.livePreviewExGroup}>{ex.muscleGroup}</Text>
                      </View>
                      {!!ex.videoUrl && (
                        <TouchableOpacity
                          style={styles.livePreviewExVideoBtn}
                          onPress={() => openVideoLink(ex.videoUrl)}
                        >
                          <Ionicons name="play-circle" size={22} color="#D90000" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Prescription Pills */}
                    <View style={styles.livePreviewPillsRow}>
                      <View style={styles.livePreviewPill}>
                        <Text style={styles.livePreviewPillText}>
                          {ex.sets} séries × {ex.reps}
                        </Text>
                      </View>
                      {!!ex.load && (
                        <View style={styles.livePreviewPill}>
                          <Text style={styles.livePreviewPillText}>⚡ {ex.load}</Text>
                        </View>
                      )}
                      {!!ex.restSeconds && (
                        <View style={styles.livePreviewPill}>
                          <Text style={styles.livePreviewPillText}>⏱ {ex.restSeconds}s descanso</Text>
                        </View>
                      )}
                      {!!ex.technique && ex.technique !== "Normal" && (
                        <View style={styles.livePreviewPillAccent}>
                          <Text style={styles.livePreviewPillAccentText}>★ {ex.technique}</Text>
                        </View>
                      )}
                    </View>

                    {/* Notes */}
                    {!!ex.notes && (
                      <View style={styles.livePreviewNoteBox}>
                        <Text style={styles.livePreviewNoteText}>💡 {ex.notes}</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Post Workout Check-in Simulation */}
                <View style={styles.livePreviewCheckinCard}>
                  <View style={styles.livePreviewCheckinHeader}>
                    <Ionicons name="checkbox-outline" size={18} color="#D90000" />
                    <Text style={styles.livePreviewCheckinTitle}>Check-in de Finalização</Text>
                  </View>
                  <Text style={styles.livePreviewCheckinSub}>
                    O aluno avaliará o treino com estas perguntas configuradas:
                  </Text>
                  <View style={styles.livePreviewCheckinList}>
                    {draft.postWorkoutQuestions?.askRpe && (
                      <View style={styles.livePreviewCheckinItem}>
                        <Ionicons name="checkmark-circle" size={14} color="#D90000" />
                        <Text style={styles.livePreviewCheckinItemText}>
                          Escala de Percepção de Esforço (PSE 1 a 10)
                        </Text>
                      </View>
                    )}
                    {draft.postWorkoutQuestions?.askPain && (
                      <View style={styles.livePreviewCheckinItem}>
                        <Ionicons name="checkmark-circle" size={14} color="#D90000" />
                        <Text style={styles.livePreviewCheckinItemText}>
                          Relato e mapeamento de dores ou desconfortos
                        </Text>
                      </View>
                    )}
                    {draft.postWorkoutQuestions?.askNotes && (
                      <View style={styles.livePreviewCheckinItem}>
                        <Ionicons name="checkmark-circle" size={14} color="#D90000" />
                        <Text style={styles.livePreviewCheckinItemText}>
                          Campo aberto de observações e dúvidas do aluno
                        </Text>
                      </View>
                    )}
                    {(draft.postWorkoutQuestions?.customQuestions ?? []).map((q, idx) => (
                      <View key={idx} style={styles.livePreviewCheckinItem}>
                        <Ionicons name="help-circle" size={14} color="#D90000" />
                        <Text style={styles.livePreviewCheckinItemText}>
                          Pergunta: "{q}"
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Sub-Modal: Catalog Picker */}
          <Modal
            visible={showCatalogModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCatalogModal(false)}
          >
            <View style={styles.catalogModalOverlay}>
              <View style={styles.catalogModalSheet}>
                <View style={styles.catalogModalHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="book" size={20} color="#D90000" />
                    <Text style={styles.catalogModalTitle}>Catálogo de Exercícios</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseButton}
                    onPress={() => setShowCatalogModal(false)}
                  >
                    <Ionicons name="close" size={20} color={TEXT} />
                  </TouchableOpacity>
                </View>

                {/* Catalog Search */}
                <View style={styles.catalogSearchBox}>
                  <Ionicons name="search-outline" size={16} color="#D90000" />
                  <TextInput
                    style={styles.catalogSearchInput}
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                    placeholder="Buscar exercício no catálogo..."
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                  />
                  {catalogSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setCatalogSearch("")}>
                      <Ionicons name="close-circle" size={16} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Catalog Categories */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catalogCategoryRail}
                >
                  {["Todos", "Peito", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Cardio"].map((cat) => {
                    const active = catalogCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catalogCatChip, active && styles.catalogCatChipActive]}
                        onPress={() => setCatalogCategory(cat)}
                      >
                        <Text style={[styles.catalogCatChipText, active && styles.catalogCatChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Catalog Results List */}
                <ScrollView style={styles.catalogListScroll} showsVerticalScrollIndicator={false}>
                  {filteredCatalog.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.catalogItemRow}
                      onPress={() => selectCatalogExercise(item)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.catalogItemIconBox}>
                        <Ionicons name="barbell-outline" size={18} color="#D90000" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catalogItemName}>{item.name}</Text>
                        <Text style={styles.catalogItemSub}>{item.category} • {item.muscleGroups?.join(", ") || "Geral"}</Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color="#D90000" />
                    </TouchableOpacity>
                  ))}
                  {filteredCatalog.length === 0 && (
                    <View style={styles.catalogEmptyBox}>
                      <Text style={styles.catalogEmptyText}>Nenhum exercício encontrado</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Footer Actions */}
          <View style={styles.modalFooterActions}>
            {isExisting && (
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#ff5a5a" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={onSave}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.modalSaveButtonText}>Salvar modelo de treino</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Não informado"}
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
    focus: "Hipertrofia",
    level: "Intermediário",
    sessions: "4x semana",
    estimatedDuration: "60 min",
    muscleGroups: ["Peitoral"],
    description: "",
    warmupInstructions: "",
    videoUrl: "",
    videoTitle: "",
    equipments: ["Halteres", "Barra"],
    postWorkoutQuestions: {
      askRpe: true,
      askPain: true,
      askNotes: true,
      customQuestions: [],
    },
    exercises: [],
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ACCENT,
    letterSpacing: 0.2,
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
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionPlaceholder: {
    width: 38,
  },
  summaryCard: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    overflow: "hidden",
    marginBottom: 14,
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
    color: TEXT,
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
    minHeight: 36,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
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
    marginTop: 14,
  },
  metricPill: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
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
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  metricLabel: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
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
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  kpiCardPrimary: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  kpiCardSecondary: {
    backgroundColor: CARD_SOFT,
    borderColor: BORDER,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  kpiValuePrimary: {
    color: "#fff",
  },
  kpiValueSecondary: {
    color: TEXT,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "800",
  },
  kpiLabelPrimary: {
    color: "rgba(255,255,255,0.85)",
  },
  kpiLabelSecondary: {
    color: SUBTLE,
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
  cardBox: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  cardBoxTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusPillDanger: {
    backgroundColor: "rgba(255, 77, 77, 0.12)",
    borderColor: "rgba(255, 77, 77, 0.3)",
  },
  statusPillSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusPillTextDanger: {
    color: "#ff4d4d",
  },
  statusPillTextSuccess: {
    color: "#22c55e",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  miniTagDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 77, 77, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 77, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  miniTagDangerText: {
    color: "#ff4d4d",
    fontSize: 11,
    fontWeight: "800",
  },
  miniTagWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 183, 3, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 183, 3, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  miniTagWarningText: {
    color: "#ffb703",
    fontSize: 11,
    fontWeight: "800",
  },
  cardBoxFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  cardBoxFooterText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  cardBoxAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardBoxActionText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "800",
  },
  // Workout Templates Styles
  templateEditBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  templateDesc: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  templateBadgeRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: "rgba(217,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoBadgeText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  questionsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  questionsBadgeText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "800",
  },
  templateFooterMeta: {
    color: SUBTLE,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  templateActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Template Modal Full
  modalSheetFull: {
    backgroundColor: "#141414",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#282828",
    maxHeight: "92%",
    flex: 1,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#242424",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modalIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(217,0,0,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  modalTabRailContainer: {
    backgroundColor: "#0d0d0d",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  modalTabRailContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  modalTabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
  },
  modalTabButtonActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  modalTabText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  modalTabTextActive: {
    color: "#fff",
    fontWeight: "900",
  },
  modalScrollBody: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  tabSection: {
    gap: 14,
  },
  formGroup: {
    marginBottom: 4,
  },
  optionVertical: {
    gap: 6,
    marginTop: 4,
  },
  optionChip: {
    borderRadius: 10,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionChipActive: {
    backgroundColor: "rgba(217,0,0,0.16)",
    borderColor: "#D90000",
  },
  optionChipText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  optionChipTextActive: {
    color: "#fff",
    fontWeight: "900",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  segmentedPill: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedPillActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  segmentedPillText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  segmentedPillTextActive: {
    color: "#fff",
    fontWeight: "900",
  },
  multiTagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  multiTagChipActive: {
    backgroundColor: "rgba(217,0,0,0.16)",
    borderColor: "#D90000",
  },
  multiTagText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  multiTagTextActive: {
    color: "#fff",
    fontWeight: "900",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  threeColRow: {
    flexDirection: "row",
    gap: 8,
  },
  colThird: {
    flex: 1,
  },
  videoSectionBox: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 14,
    gap: 10,
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  testVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: "rgba(217,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.3)",
    paddingVertical: 10,
  },
  testVideoBtnText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(217,0,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.22)",
    borderRadius: 12,
    padding: 12,
  },
  infoBannerText: {
    color: "#ff8b8b",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontWeight: "600",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 12,
  },
  toggleCardActive: {
    borderColor: "rgba(217,0,0,0.4)",
    backgroundColor: "#1a1111",
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  toggleSub: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2c2c2c",
    padding: 2,
    justifyContent: "center",
  },
  toggleSwitchActive: {
    backgroundColor: "#D90000",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  customQuestionsSection: {
    marginTop: 10,
    gap: 8,
  },
  helperNote: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    padding: 12,
  },
  questionText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  deleteQuestionBtn: {
    padding: 4,
  },
  addQuestionBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  addQuestionInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    color: TEXT,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  addQuestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addQuestionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  exerciseListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addExerciseTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addExerciseTriggerText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  exerciseFormCard: {
    backgroundColor: "#101010",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.4)",
    padding: 14,
    gap: 10,
  },
  exerciseFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  exerciseFormTitle: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  exerciseFormActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelFormBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelFormBtnText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  confirmExerciseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingVertical: 10,
  },
  confirmExerciseBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  emptyExerciseBox: {
    borderRadius: 16,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#262626",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyExerciseTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyExerciseSub: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },
  exerciseCardItem: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 12,
    gap: 8,
  },
  exerciseCardItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(217,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNumberText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  exerciseItemDetails: {
    flex: 1,
  },
  exerciseItemName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  exerciseItemCategory: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  deleteExerciseBtn: {
    padding: 6,
  },
  exerciseBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  exerciseMiniPill: {
    borderRadius: 6,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#303030",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  exerciseMiniPillText: {
    color: "#ccc",
    fontSize: 11,
    fontWeight: "800",
  },
  exerciseMiniPillAccent: {
    borderRadius: 6,
    backgroundColor: "rgba(217,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.28)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  exerciseMiniPillAccentText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  exerciseItemNote: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
  exerciseVideoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  exerciseVideoLinkText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  modalFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#242424",
    backgroundColor: "#101010",
  },
  modalDeleteButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,90,90,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D90000",
    borderRadius: 14,
    height: 48,
  },
  modalSaveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },

  /* Workout Templates View Styles */
  tplSearchBox: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  tplSearchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  tplSearchClear: {
    padding: 4,
  },
  tplFocusRail: {
    gap: 6,
    paddingBottom: 8,
  },
  tplFocusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#282828",
  },
  tplFocusChipActive: {
    backgroundColor: "#2B1414",
    borderColor: "#D90000",
  },
  tplFocusChipText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  tplFocusChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  tplListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 10,
  },
  tplListCountText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  tplAddButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tplAddButtonSmallText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  tplEmptyBox: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  tplEmptyTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  tplEmptySubtitle: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },
  tplEmptyAction: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#222222",
  },
  tplEmptyActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  tplCardContainer: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 14,
    marginBottom: 12,
  },
  tplCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tplIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#201414",
    borderWidth: 1,
    borderColor: "#3A1818",
    alignItems: "center",
    justifyContent: "center",
  },
  tplCardHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  tplCardTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  tplCardSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  tplExerciseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2E2E2E",
  },
  tplExerciseBadgeText: {
    color: "#CCCCCC",
    fontSize: 10,
    fontWeight: "800",
  },
  tplCardDescription: {
    color: "#999999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  tplCollapsedList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
    gap: 5,
  },
  tplMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tplMiniNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#201414",
    borderWidth: 1,
    borderColor: "#3A1818",
    alignItems: "center",
    justifyContent: "center",
  },
  tplMiniNumberText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  tplMiniName: {
    color: "#E0E0E0",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  tplMiniSpecs: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
  },
  tplMoreLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 6,
  },
  tplMoreLinkText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  tplExpandedDrawer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#222222",
    gap: 10,
  },
  tplDrawerWarmup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#1C1414",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    borderRadius: 10,
    padding: 10,
  },
  tplDrawerWarmupLabel: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2,
  },
  tplDrawerWarmupText: {
    color: "#CCCCCC",
    fontSize: 11,
    lineHeight: 16,
  },
  tplDrawerVideo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#282828",
    borderRadius: 10,
    padding: 10,
  },
  tplDrawerVideoTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  tplDrawerVideoSub: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  tplDrawerSectionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
  tplDrawerExerciseCard: {
    backgroundColor: "#191919",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    gap: 6,
  },
  tplDrawerExerciseTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tplDrawerNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#261515",
    borderWidth: 1,
    borderColor: "#4A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  tplDrawerNumText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  tplDrawerExName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  tplDrawerExGroup: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  tplExVideoBtn: {
    padding: 4,
  },
  tplDrawerPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  tplDrawerPill: {
    borderRadius: 6,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tplDrawerPillText: {
    color: "#CCCCCC",
    fontSize: 10,
    fontWeight: "800",
  },
  tplDrawerPillAccent: {
    borderRadius: 6,
    backgroundColor: "rgba(217,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.3)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tplDrawerPillAccentText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  tplDrawerExNote: {
    color: "#999999",
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
  },
  tplDrawerQuestions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    backgroundColor: "#161616",
    borderRadius: 8,
  },
  tplDrawerQuestionsText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  tplCardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
  },
  tplBtnPreview: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    paddingVertical: 8,
    borderRadius: 10,
  },
  tplBtnPreviewText: {
    color: "#E0E0E0",
    fontSize: 11,
    fontWeight: "800",
  },
  tplBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  tplBtnSecondaryText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "800",
  },
  tplBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#D90000",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tplBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  /* Catalog & Live Preview Styles */
  catalogPickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#201414",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  catalogPickerTriggerText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  catalogPickerBtnLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#201414",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  catalogPickerBtnLargeText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  livePreviewHero: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    gap: 8,
  },
  livePreviewBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePreviewFocusPill: {
    backgroundColor: "#2B1414",
    borderWidth: 1,
    borderColor: "#D90000",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  livePreviewFocusText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  livePreviewLevelPill: {
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  livePreviewLevelText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "800",
  },
  livePreviewDurationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  livePreviewDurationText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "800",
  },
  livePreviewTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  livePreviewSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  livePreviewMusclesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  livePreviewMuscleTag: {
    backgroundColor: "#222222",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  livePreviewMuscleTagText: {
    color: "#AAAAAA",
    fontSize: 10,
    fontWeight: "800",
  },
  livePreviewCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    gap: 6,
  },
  livePreviewCardWarmup: {
    backgroundColor: "#1B1313",
    borderColor: "#3A1A1A",
  },
  livePreviewWarmupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePreviewWarmupTitle: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  livePreviewCardTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },
  livePreviewCardBody: {
    color: "#CCCCCC",
    fontSize: 12,
    lineHeight: 17,
  },
  livePreviewVideoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#181414",
    borderWidth: 1,
    borderColor: "#3A1818",
    borderRadius: 14,
    padding: 12,
  },
  livePreviewVideoTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  livePreviewVideoSub: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  livePreviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  livePreviewSectionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  livePreviewSectionBadge: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
  },
  livePreviewExCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    gap: 8,
  },
  livePreviewExTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePreviewExNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#261515",
    borderWidth: 1,
    borderColor: "#4A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  livePreviewExNumberText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  livePreviewExName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  livePreviewExGroup: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  livePreviewExVideoBtn: {
    padding: 4,
  },
  livePreviewPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  livePreviewPill: {
    borderRadius: 6,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  livePreviewPillText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "800",
  },
  livePreviewPillAccent: {
    borderRadius: 6,
    backgroundColor: "rgba(217,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  livePreviewPillAccentText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  livePreviewNoteBox: {
    backgroundColor: "#111111",
    padding: 8,
    borderRadius: 8,
  },
  livePreviewNoteText: {
    color: "#AAAAAA",
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
  livePreviewCheckinCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 8,
  },
  livePreviewCheckinHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePreviewCheckinTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  livePreviewCheckinSub: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  livePreviewCheckinList: {
    gap: 6,
    marginTop: 4,
  },
  livePreviewCheckinItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePreviewCheckinItemText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },

  /* Catalog Sub-Modal Styles */
  catalogModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  catalogModalSheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 16,
    maxHeight: "85%",
  },
  catalogModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  catalogModalTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  catalogSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1C1C1C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  catalogSearchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  catalogCategoryRail: {
    gap: 6,
    paddingBottom: 10,
  },
  catalogCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  catalogCatChipActive: {
    backgroundColor: "#2B1414",
    borderColor: "#D90000",
  },
  catalogCatChipText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
  },
  catalogCatChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  catalogListScroll: {
    maxHeight: 380,
  },
  catalogItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 10,
    marginBottom: 8,
  },
  catalogItemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#221515",
    alignItems: "center",
    justifyContent: "center",
  },
  catalogItemName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  catalogItemSub: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  catalogEmptyBox: {
    padding: 24,
    alignItems: "center",
  },
  catalogEmptyText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
});
