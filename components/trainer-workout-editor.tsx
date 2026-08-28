import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import {
  ExerciseItem,
  ExerciseCatalogPage,
  ExerciseSource,
  MUSCLE_GROUPS,
  getExerciseCatalogPage,
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
  normalizeText,
} from "@/services/exercise-store";
import { formatDateInput } from "@/services/student-profile-store";
import { shareWorkoutAsPdf } from "@/services/workout-pdf-service";
import { UserAvatar } from "@/components/user-avatar";

const UNASSIGNED_SECTION_ID = "__unassigned__";

type WorkoutRow =
  | { rowId: string; kind: "section"; section: WorkoutSectionHeader }
  | { rowId: string; kind: "exercise"; exercise: WorkoutExerciseItem }
  | { rowId: string; kind: "combined"; combinationId: string; label: string; exercises: WorkoutExerciseItem[] }
  | { rowId: string; kind: "empty"; sectionId: string };

export type WorkoutSetDetail = {
  id: string;
  setNumber: number;
  reps: string;
  load: string;
  restSeconds: number;
  notes?: string;
};

export type WorkoutExerciseItem = {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  observation?: string;
  cadence?: string;
  replicateToAll?: boolean;
  sets: WorkoutSetDetail[];
  sectionId?: string;
  combinationId?: string;
  combinationLabel?: string;
};

export type WorkoutSectionHeader = {
  id: string;
  title: string;
  order: number;
  icon?: string;
};

export type WorkoutGeneralInfo = {
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  releaseToStudent: boolean;
  notifyExpiration: boolean;
  splitByWeekDay: boolean;
  recommendedDays: string[];
  coverUrl?: string;
};

export function getSectionIcon(title?: string, explicitIcon?: string): keyof typeof Ionicons.glyphMap {
  if (explicitIcon && explicitIcon in Ionicons.glyphMap) {
    return explicitIcon as keyof typeof Ionicons.glyphMap;
  }
  const norm = (title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (norm.includes("aquec") || norm.includes("warm") || norm.includes("ativac")) return "flame";
  if (norm.includes("along") || norm.includes("flexib")) return "body";
  if (norm.includes("mobil") || norm.includes("articul")) return "repeat";
  if (norm.includes("peit") || norm.includes("chest") || norm.includes("supin")) return "shield";
  if (norm.includes("costa") || norm.includes("dorsal") || norm.includes("puxad") || norm.includes("remad") || norm.includes("lombar")) return "layers";
  if (norm.includes("pern") || norm.includes("quadric") || norm.includes("coxa") || norm.includes("leg") || norm.includes("squat") || norm.includes("agach") || norm.includes("panturr") || norm.includes("glut") || norm.includes("isquio") || norm.includes("inferior")) return "walk";
  if (norm.includes("ombr") || norm.includes("deltoid") || norm.includes("shoulder") || norm.includes("manguit") || norm.includes("trapez")) return "triangle";
  if (norm.includes("brac") || norm.includes("bicep") || norm.includes("tricep") || norm.includes("arm") || norm.includes("antibrac") || norm.includes("rosca")) return "flash";
  if (norm.includes("abdom") || norm.includes("core") || norm.includes("prancha") || norm.includes("abs") || norm.includes("obliqu")) return "fitness";
  if (norm.includes("cardio") || norm.includes("aerob") || norm.includes("corr") || norm.includes("bike") || norm.includes("esteira") || norm.includes("hiit") || norm.includes("remo")) return "pulse";
  if (norm.includes("combo") || norm.includes("super") || norm.includes("bi-set") || norm.includes("tri-set") || norm.includes("circuito")) return "link";
  if (norm.includes("final") || norm.includes("desaquec") || norm.includes("cool") || norm.includes("volta a calma")) return "snow";
  return "barbell";
}

export type TrainerWorkoutEditorProps = {
  visible: boolean;
  isEmbedded?: boolean;
  studentName: string;
  studentAvatar?: string;
  trainerId?: string;
  initialInfo?: Partial<WorkoutGeneralInfo>;
  initialExercises?: WorkoutExerciseItem[];
  initialSections?: WorkoutSectionHeader[];
  onClose: () => void;
  onSave: (data: {
    info: WorkoutGeneralInfo;
    exercises: WorkoutExerciseItem[];
    sections: WorkoutSectionHeader[];
  }) => void;
  onDuplicate?: () => void;
};

const DEFAULT_CADENCES = ["2-0-2-0", "3-0-1-0", "4-0-2-0", "4-1-2-1", "3-1-1-0", "Livre"];

export const SECTION_ICON_LIST: { id: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { id: "flame", label: "Aquecimento" },
  { id: "fitness", label: "Core / Abs" },
  { id: "shield", label: "Peitoral" },
  { id: "layers", label: "Costas" },
  { id: "walk", label: "Pernas" },
  { id: "triangle", label: "Ombros" },
  { id: "flash", label: "Braços" },
  { id: "pulse", label: "Cardio" },
  { id: "barbell", label: "Força" },
  { id: "body", label: "Alongamento" },
  { id: "repeat", label: "Mobilidade" },
  { id: "trophy", label: "Principal" },
  { id: "snow", label: "Recuperação" },
  { id: "link", label: "Super-série" },
];

export const SECTION_QUICK_PRESETS: { title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: "Aquecimento & Mobilidade", icon: "flame" },
  { title: "Core & Abdominais", icon: "fitness" },
  { title: "Peitoral & Tríceps", icon: "shield" },
  { title: "Costas & Bíceps", icon: "layers" },
  { title: "Pernas & Glúteos", icon: "walk" },
  { title: "Ombros & Trapézio", icon: "triangle" },
  { title: "Força Principal", icon: "barbell" },
  { title: "Cardio & HIIT", icon: "pulse" },
  { title: "Alongamento Final", icon: "body" },
];

export const WORKOUT_COVER_PRESETS = [
  {
    id: "chest-strength",
    label: "Força / Supino",
    url: "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "back-row",
    label: "Costas / Halteres",
    url: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "leg-squat",
    label: "Pernas / Agachamento",
    url: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "cardio-run",
    label: "Cardio / Corrida",
    url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "arms-biceps",
    label: "Braços / Bíceps",
    url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "core-abs",
    label: "Core / Abdômen",
    url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=60",
  },
];

export function TrainerWorkoutEditor({
  visible,
  isEmbedded = false,
  studentName,
  studentAvatar,
  trainerId,
  initialInfo,
  initialExercises,
  initialSections,
  onClose,
  onSave,
  onDuplicate,
}: TrainerWorkoutEditorProps) {
  // Navigation tabs: 'edit' | 'exercises' | 'volume' | 'student-preview'
  const [activeTab, setActiveTab] = useState<"edit" | "exercises" | "volume" | "student-preview">("exercises");

  // General Info State
  const [info, setInfo] = useState<WorkoutGeneralInfo>(() => ({
    name: initialInfo?.name || "Novo Treino",
    startDate: initialInfo?.startDate || new Date().toISOString().slice(0, 10),
    endDate:
      initialInfo?.endDate ||
      new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    notes: initialInfo?.notes || "",
    releaseToStudent: initialInfo?.releaseToStudent ?? false,
    notifyExpiration: initialInfo?.notifyExpiration ?? true,
    splitByWeekDay: initialInfo?.splitByWeekDay ?? false,
    recommendedDays: initialInfo?.recommendedDays || ["Segunda", "Quarta", "Sexta"],
  }));

  // Sections State (Cabeçalhos) - Começa 100% zerado para novos treinos
  const [sections, setSections] = useState<WorkoutSectionHeader[]>(() =>
    initialSections && initialSections.length > 0 ? initialSections : []
  );

  // Exercises State - Começa 100% zerado para novos treinos
  const [exercises, setExercises] = useState<WorkoutExerciseItem[]>(() =>
    initialExercises && initialExercises.length > 0 ? initialExercises : []
  );

  // Sincroniza o estado sempre que o editor abrir ou os dados do treino mudarem
  useEffect(() => {
    if (visible) {
      setInfo({
        name: initialInfo?.name || "Novo Treino",
        startDate: initialInfo?.startDate || new Date().toISOString().slice(0, 10),
        endDate:
          initialInfo?.endDate ||
          new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        notes: initialInfo?.notes || "",
        releaseToStudent: initialInfo?.releaseToStudent ?? false,
        notifyExpiration: initialInfo?.notifyExpiration ?? true,
        splitByWeekDay: initialInfo?.splitByWeekDay ?? false,
        recommendedDays: initialInfo?.recommendedDays || ["Segunda", "Quarta", "Sexta"],
      });
      setSections(initialSections || []);
      setExercises(initialExercises || []);
      setIsCombinationMode(false);
      setSelectedForCombine({});
    }
  }, [visible, initialInfo, initialSections, initialExercises]);

  // Combination Mode State
  const [isCombinationMode, setIsCombinationMode] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState<Record<string, boolean>>({});

  // Header Creation & Edit Modal State
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newHeaderTitle, setNewHeaderTitle] = useState("");
  const [newHeaderIcon, setNewHeaderIcon] = useState<keyof typeof Ionicons.glyphMap>("flame");

  // Exercise Detail / Edit Modal State (Screen 2: Cadastro Exercício)
  const [editingExercise, setEditingExercise] = useState<WorkoutExerciseItem | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showCadencePicker, setShowCadencePicker] = useState(false);

  // Catalog Picker Modal State (paginação real: cada página vem de getExerciseCatalogPage)
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearchInput, setCatalogSearchInput] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogSource, setCatalogSource] = useState<ExerciseSource>("system");
  const [catalogMuscleGroup, setCatalogMuscleGroup] = useState<string>("Todos");
  const [catalogItems, setCatalogItems] = useState<ExerciseItem[]>([]);
  const [catalogPageData, setCatalogPageData] = useState<ExerciseCatalogPage | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogMultiSelect, setCatalogMultiSelect] = useState(false);
  const [catalogSelectedIds, setCatalogSelectedIds] = useState<Record<string, boolean>>({});
  const catalogSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce de 300ms na busca do catálogo
  useEffect(() => {
    if (catalogSearchDebounceRef.current) clearTimeout(catalogSearchDebounceRef.current);
    catalogSearchDebounceRef.current = setTimeout(() => {
      setCatalogSearch(catalogSearchInput);
    }, 300);
    return () => {
      if (catalogSearchDebounceRef.current) clearTimeout(catalogSearchDebounceRef.current);
    };
  }, [catalogSearchInput]);

  const loadCatalogPage = useCallback(
    async (page: number, append: boolean) => {
      setCatalogLoading(true);
      try {
        const result = await getExerciseCatalogPage({
          page,
          limit: 20,
          search: catalogSearch,
          muscleGroup: catalogMuscleGroup,
          source: catalogSource,
          trainerId,
        });
        setCatalogItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setCatalogPageData(result);
      } finally {
        setCatalogLoading(false);
      }
    },
    [catalogSearch, catalogMuscleGroup, catalogSource, trainerId]
  );

  // Busca, grupo, aba (sistema/meus exercícios) ou abertura do modal sempre recomeça na página 1
  useEffect(() => {
    if (!showCatalogModal) return;
    setCatalogSelectedIds({});
    void loadCatalogPage(1, false);
  }, [showCatalogModal, catalogSearch, catalogMuscleGroup, catalogSource, loadCatalogPage]);

  const handleLoadMoreCatalog = () => {
    if (!catalogPageData || catalogLoading || catalogPageData.page >= catalogPageData.totalPages) return;
    void loadCatalogPage(catalogPageData.page + 1, true);
  };

  const catalogSelectedCount = Object.values(catalogSelectedIds).filter(Boolean).length;

  const toggleCatalogSelection = (id: string) => {
    setCatalogSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const confirmCatalogSelection = () => {
    const selected = catalogItems.filter((item) => catalogSelectedIds[item.id]);
    if (selected.length === 0) return;

    const existingIds = new Set(exercises.map((e) => e.id));
    const lastSectionId = sections[sections.length - 1]?.id;
    const newExercises: WorkoutExerciseItem[] = selected
      .filter((item) => !existingIds.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category || "Geral",
        muscleGroup: item.category || "Geral",
        videoUrl: item.videoUrl || "",
        thumbnailUrl: item ? getYoutubeThumbnailUrl(item.videoUrl || "") : undefined,
        observation: "",
        cadence: "3-0-1-0",
        sets: [
          { id: `s-${item.id}-1`, setNumber: 1, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
          { id: `s-${item.id}-2`, setNumber: 2, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
          { id: `s-${item.id}-3`, setNumber: 3, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
        ],
        sectionId: lastSectionId,
      }));

    setExercises([...exercises, ...newExercises]);
    setCatalogSelectedIds({});
    setCatalogMultiSelect(false);
    setShowCatalogModal(false);
  };

  const handlePickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão Necessária", "Permita acesso à galeria de fotos para escolher a imagem de capa do treino.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setInfo((prev) => ({ ...prev, coverUrl: result.assets[0].uri }));
      }
    } catch {
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  };

  const openCreateSectionModal = () => {
    setEditingSectionId(null);
    setNewHeaderTitle("");
    setNewHeaderIcon("flame");
    setShowHeaderModal(true);
  };

  const openEditSectionModal = (section: WorkoutSectionHeader) => {
    if (section.id === UNASSIGNED_SECTION_ID) {
      setEditingSectionId("convert-unassigned");
      setNewHeaderTitle("");
      setNewHeaderIcon("flame");
      setShowHeaderModal(true);
      return;
    }
    setEditingSectionId(section.id);
    setNewHeaderTitle(section.title);
    setNewHeaderIcon((section.icon as keyof typeof Ionicons.glyphMap) || getSectionIcon(section.title));
    setShowHeaderModal(true);
  };

  const handleSaveSection = () => {
    if (!newHeaderTitle.trim()) {
      Alert.alert("Título Obrigatório", "Informe o nome do cabeçalho de seção.");
      return;
    }
    if (editingSectionId === "convert-unassigned") {
      const newSecId = `sec-${Date.now()}`;
      const newSec: WorkoutSectionHeader = {
        id: newSecId,
        title: newHeaderTitle.trim(),
        icon: newHeaderIcon,
        order: sections.length,
      };
      setSections((prev) => [...prev, newSec]);
      setExercises((prev) =>
        prev.map((e) =>
          !e.sectionId || !sections.some((s) => s.id === e.sectionId)
            ? { ...e, sectionId: newSecId }
            : e
        )
      );
    } else if (editingSectionId) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === editingSectionId
            ? { ...s, title: newHeaderTitle.trim(), icon: newHeaderIcon }
            : s
        )
      );
    } else {
      const newSec: WorkoutSectionHeader = {
        id: `sec-${Date.now()}`,
        title: newHeaderTitle.trim(),
        icon: newHeaderIcon,
        order: sections.length,
      };
      setSections((prev) => [...prev, newSec]);
    }
    setEditingSectionId(null);
    setNewHeaderTitle("");
    setShowHeaderModal(false);
  };

  // Linhas arrastáveis: cabeçalhos de seção + exercícios combinados em uma única lista
  const workoutRows = useMemo<WorkoutRow[]>(() => {
    const buildRowsForExercises = (list: WorkoutExerciseItem[], sectionKey: string): WorkoutRow[] => {
      const result: WorkoutRow[] = [];
      const processedCombos = new Set<string>();

      for (let i = 0; i < list.length; i++) {
        const exercise = list[i];
        if (exercise.combinationId) {
          if (!processedCombos.has(exercise.combinationId)) {
            processedCombos.add(exercise.combinationId);
            // Pegar apenas exercícios DESTA SEÇÃO com esse combinationId
            const comboExercises = list.filter((e) => e.combinationId === exercise.combinationId);
            if (comboExercises.length >= 2) {
              const uniqueIds = comboExercises.map((e) => e.id).join("-");
              result.push({
                rowId: `combined-${sectionKey}-${exercise.combinationId}-${uniqueIds}`,
                kind: "combined",
                combinationId: exercise.combinationId,
                label:
                  exercise.combinationLabel ||
                  (comboExercises.length === 2 ? "Bi-set" : comboExercises.length === 3 ? "Tri-set" : "Super-série"),
                exercises: comboExercises,
              });
            } else {
              // Se tiver só 1 exercício nesta seção com esse combinationId, renderiza como exercício individual (evita Bi-set de 1 exercício e evita duplicidade de chaves)
              result.push({
                rowId: `exercise-${sectionKey}-${exercise.id}`,
                kind: "exercise",
                exercise,
              });
            }
          }
        } else {
          result.push({
            rowId: `exercise-${sectionKey}-${exercise.id}`,
            kind: "exercise",
            exercise,
          });
        }
      }
      return result;
    };

    const out: WorkoutRow[] = [];

    sections.forEach((section) => {
      out.push({ rowId: `section-${section.id}`, kind: "section", section });
      const sectionExercises = exercises.filter((e) => e.sectionId === section.id);
      if (sectionExercises.length === 0) {
        out.push({ rowId: `empty-${section.id}`, kind: "empty", sectionId: section.id });
      } else {
        out.push(...buildRowsForExercises(sectionExercises, section.id));
      }
    });

    const unassigned = exercises.filter(
      (e) => !e.sectionId || !sections.some((s) => s.id === e.sectionId)
    );
    if (unassigned.length > 0) {
      out.push({
        rowId: `section-${UNASSIGNED_SECTION_ID}`,
        kind: "section",
        section: { id: UNASSIGNED_SECTION_ID, title: "Outros Exercícios", order: sections.length },
      });
      out.push(...buildRowsForExercises(unassigned, UNASSIGNED_SECTION_ID));
    }

    return out;
  }, [sections, exercises]);

  const handleWorkoutRowsReorder = (data: WorkoutRow[]) => {
    // Localizamos o primeiro ID de seção válido para evitar que exercícios no topo percam a seção
    const firstValidSection = data.find(
      (row) => row.kind === "section" && row.section.id !== UNASSIGNED_SECTION_ID
    );
    const defaultSectionId = firstValidSection?.kind === "section" ? firstValidSection.section.id : undefined;

    const newSections: WorkoutSectionHeader[] = [];
    const newExercises: WorkoutExerciseItem[] = [];
    let currentSectionId: string | undefined = defaultSectionId;

    data.forEach((row) => {
      if (row.kind === "section") {
        if (row.section.id !== UNASSIGNED_SECTION_ID) {
          newSections.push({ ...row.section, order: newSections.length });
        }
        currentSectionId = row.section.id === UNASSIGNED_SECTION_ID ? undefined : row.section.id;
      } else if (row.kind === "exercise") {
        newExercises.push({ ...row.exercise, sectionId: currentSectionId });
      } else if (row.kind === "combined") {
        row.exercises.forEach((ex) => {
          newExercises.push({ ...ex, sectionId: currentSectionId });
        });
      }
    });

    setSections(newSections);
    setExercises(newExercises);
  };

  const editSectionTitle = (secId: string, newTitle: string) => {
    setSections(sections.map((s) => (s.id === secId ? { ...s, title: newTitle } : s)));
  };

  const deleteSection = (secId: string) => {
    if (secId === UNASSIGNED_SECTION_ID) {
      const unassignedExs = exercises.filter(
        (e) => !e.sectionId || !sections.some((s) => s.id === e.sectionId)
      );
      if (unassignedExs.length === 0) return;
      Alert.alert(
        "Excluir Exercícios",
        `Deseja remover os ${unassignedExs.length} exercício(s) deste bloco?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: () => {
              const unassignedIds = new Set(unassignedExs.map((e) => e.id));
              setExercises(exercises.filter((e) => !unassignedIds.has(e.id)));
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      "Excluir Bloco",
      "Deseja remover este cabeçalho de bloco? Os exercícios serão mantidos na lista.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            setSections(sections.filter((s) => s.id !== secId));
            setExercises(
              exercises.map((e) => (e.sectionId === secId ? { ...e, sectionId: undefined } : e))
            );
          },
        },
      ]
    );
  };

  const deleteSelectedExercises = () => {
    const selectedIds = Object.keys(selectedForCombine).filter((id) => selectedForCombine[id]);
    if (selectedIds.length === 0) {
      Alert.alert("Nenhum Selecionado", "Marque ao menos um exercício para excluir.");
      return;
    }
    Alert.alert(
      "Excluir Exercícios",
      `Deseja realmente remover os ${selectedIds.length} exercício(s) selecionados?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            setExercises(exercises.filter((e) => !selectedIds.includes(e.id)));
            setSelectedForCombine({});
            setIsCombinationMode(false);
          },
        },
      ]
    );
  };

  const deleteSingleExercise = (exerciseId: string, exerciseName?: string) => {
    Alert.alert(
      "Excluir Exercício",
      `Deseja realmente remover "${exerciseName || "este exercício"}" do treino?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
            if (editingExercise && editingExercise.id === exerciseId) {
              setShowExerciseForm(false);
              setEditingExercise(null);
            }
          },
        },
      ]
    );
  };

  // Handlers for Combination Mode
  const toggleSelectCombine = (exerciseId: string) => {
    setSelectedForCombine((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const applyCombination = () => {
    const selectedIds = Object.keys(selectedForCombine).filter((id) => selectedForCombine[id]);
    if (selectedIds.length < 2) {
      Alert.alert("Seleção Insuficiente", "Selecione ao menos 2 exercícios para combinar em Bi-set ou Super-série.");
      return;
    }

    const combinationId = `comb-${Date.now()}`;
    const label = selectedIds.length === 2 ? "Bi-set" : selectedIds.length === 3 ? "Tri-set" : "Super-série";

    // Encontra a seção do primeiro exercício selecionado para que todos fiquem juntos na mesma seção
    const firstSelected = exercises.find((e) => selectedIds.includes(e.id));
    const targetSectionId = firstSelected?.sectionId;

    setExercises(
      exercises.map((ex) => {
        if (selectedIds.includes(ex.id)) {
          return {
            ...ex,
            sectionId: targetSectionId,
            combinationId,
            combinationLabel: label,
          };
        }
        return ex;
      })
    );

    setSelectedForCombine({});
    setIsCombinationMode(false);
    Alert.alert("Exercícios Combinados", `${selectedIds.length} exercícios agrupados em ${label}!`);
  };

  const uncombineExercises = (combinationId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.combinationId === combinationId) {
          const { combinationId: _c, combinationLabel: _l, ...rest } = ex;
          return rest as WorkoutExerciseItem;
        }
        return ex;
      })
    );
  };

  // Exercise Editing & Sets Management (Screen 2)
  const openExerciseEditor = (exercise: WorkoutExerciseItem) => {
    setEditingExercise(JSON.parse(JSON.stringify(exercise)));
    setShowExerciseForm(true);
  };

  const openNewExerciseEditor = (catalogItem?: ExerciseItem) => {
    const newEx: WorkoutExerciseItem = {
      id: `ex-${Date.now()}`,
      name: catalogItem?.name || "",
      category: catalogItem?.category || "Geral",
      muscleGroup: catalogItem?.category || "Peitoral",
      videoUrl: catalogItem?.videoUrl || "",
      thumbnailUrl: catalogItem ? getYoutubeThumbnailUrl(catalogItem.videoUrl || "") : undefined,
      observation: "",
      cadence: "3-0-1-0",
      replicateToAll: false,
      sets: [
        { id: `s-${Date.now()}-1`, setNumber: 1, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
        { id: `s-${Date.now()}-2`, setNumber: 2, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
        { id: `s-${Date.now()}-3`, setNumber: 3, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
      ],
      sectionId: sections[sections.length - 1]?.id,
    };
    setEditingExercise(newEx);
    setShowCatalogModal(false);
    setShowExerciseForm(true);
  };

  const saveEditingExercise = () => {
    if (!editingExercise) return;
    if (!editingExercise.name.trim()) {
      Alert.alert("Nome Obrigatório", "Informe o nome do exercício.");
      return;
    }

    const existingIdx = exercises.findIndex((e) => e.id === editingExercise.id);
    let updatedList: WorkoutExerciseItem[];

    if (existingIdx >= 0) {
      updatedList = [...exercises];
      updatedList[existingIdx] = editingExercise;
    } else {
      updatedList = [...exercises, editingExercise];
    }

    // If "Replicar séries para todos exercícios" is checked
    if (editingExercise.replicateToAll) {
      updatedList = updatedList.map((e) => ({
        ...e,
        sets: editingExercise.sets.map((s, idx) => ({
          ...s,
          id: `s-rep-${e.id}-${idx}`,
        })),
        cadence: editingExercise.cadence,
      }));
    }

    setExercises(updatedList);
    setShowExerciseForm(false);
    setEditingExercise(null);
  };

  const addSetToEditingExercise = () => {
    if (!editingExercise) return;
    const lastSet = editingExercise.sets[editingExercise.sets.length - 1];
    const nextSetNumber = editingExercise.sets.length + 1;
    const newSet: WorkoutSetDetail = {
      id: `s-${Date.now()}-${nextSetNumber}`,
      setNumber: nextSetNumber,
      reps: lastSet?.reps || "10 a 12",
      load: lastSet?.load || "20 kg",
      restSeconds: lastSet?.restSeconds || 60,
      notes: "",
    };
    setEditingExercise({
      ...editingExercise,
      sets: [...editingExercise.sets, newSet],
    });
  };

  const removeSetFromEditingExercise = (index: number) => {
    if (!editingExercise) return;
    if (editingExercise.sets.length <= 1) {
      Alert.alert("Aviso", "O exercício precisa ter ao menos 1 série.");
      return;
    }
    const filtered = editingExercise.sets.filter((_, idx) => idx !== index);
    const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    setEditingExercise({
      ...editingExercise,
      sets: renumbered,
    });
  };

  const updateSetField = (
    index: number,
    field: keyof WorkoutSetDetail,
    value: string | number
  ) => {
    if (!editingExercise) return;
    const updated = [...editingExercise.sets];
    updated[index] = { ...updated[index], [field]: value };
    setEditingExercise({ ...editingExercise, sets: updated });
  };

  // Safe Video Opener
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

  // Volume Calculation Analytics
  const volumeStats = useMemo(() => {
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const estimatedMinutes =
      exercises.length === 0
        ? 0
        : exercises.reduce((acc, ex) => {
            const exRest = ex.sets.reduce((rAcc, s) => rAcc + (s.restSeconds || 60), 0);
            const exExecTime = ex.sets.length * 45;
            return acc + (exRest + exExecTime) / 60;
          }, 5);

    const muscleMap: Record<string, number> = {};
    const exercisesByMuscle: Record<string, string[]> = {};
    exercises.forEach((ex) => {
      const group = ex.muscleGroup || "Geral";
      muscleMap[group] = (muscleMap[group] || 0) + ex.sets.length;
      if (!exercisesByMuscle[group]) exercisesByMuscle[group] = [];
      if (!exercisesByMuscle[group].includes(ex.name)) {
        exercisesByMuscle[group].push(ex.name);
      }
    });

    return {
      totalExercises: exercises.length,
      totalSets,
      estimatedMinutes: Math.round(estimatedMinutes),
      muscleMap,
      exercisesByMuscle,
    };
  }, [exercises]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await shareWorkoutAsPdf({
        studentName,
        studentAvatar,
        workoutInfo: info,
        exercises,
        sections,
      });
    } catch (err) {
      Alert.alert("Erro ao Gerar PDF", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleGlobalSave = () => {
    if (!info.name.trim()) {
      Alert.alert("Nome Obrigatório", "Informe o nome do treino.");
      return;
    }
    onSave({ info, exercises, sections });
    onClose();
  };

  const renderWorkoutRow = ({ item, drag, isActive }: RenderItemParams<WorkoutRow>) => {
    if (item.kind === "empty") {
      return (
        <ScaleDecorator activeScale={1.02}>
          <View style={styles.emptySectionBox}>
            <Text style={styles.emptySectionText}>Nenhum exercício neste bloco.</Text>
          </View>
        </ScaleDecorator>
      );
    }

    if (item.kind === "section") {
      const isUnassigned = item.section.id === UNASSIGNED_SECTION_ID;
      const sectionExCount = exercises.filter((e) =>
        isUnassigned
          ? !e.sectionId || !sections.some((s) => s.id === e.sectionId)
          : e.sectionId === item.section.id
      ).length;

      return (
        <ScaleDecorator activeScale={1.03}>
          <View
            style={[
              styles.sectionHeaderBarRed,
              isActive && styles.rowDragActive,
            ]}
          >
            {!isUnassigned && !isCombinationMode && (
              <TouchableOpacity
                onPressIn={drag}
                hitSlop={10}
                style={styles.sectionDragHandleBtn}
              >
                <Ionicons name="reorder-two-outline" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {!isUnassigned && <View style={styles.sectionDividerLine} />}

            <View style={styles.sectionPillIconBox}>
              <Ionicons
                name={isUnassigned ? "barbell" : getSectionIcon(item.section.title, item.section.icon)}
                size={14}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.sectionHeaderBarRedTitle} numberOfLines={1}>
              {item.section.title}
            </Text>

            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountPillText}>
                {sectionExCount}
              </Text>
            </View>

            {!isCombinationMode && (
              <View style={styles.sectionHeaderActions}>
                <TouchableOpacity
                  onPress={() => openEditSectionModal(item.section)}
                  hitSlop={8}
                  style={styles.sectionActionBtn}
                >
                  <Ionicons name="pencil" size={13} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteSection(item.section.id)}
                  hitSlop={8}
                  style={styles.sectionActionBtn}
                >
                  <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScaleDecorator>
      );
    }

    if (item.kind === "combined") {
      const isAnySelected = item.exercises.some((e) => selectedForCombine[e.id]);
      return (
        <ScaleDecorator activeScale={1.03}>
          <View
            style={[
              styles.combinedCardWrapper,
              isAnySelected && styles.exerciseCardRowSelected,
              isActive && styles.rowDragActive,
            ]}
          >
            {/* COMBINED CARD TOP BAR */}
            <View style={styles.combinedCardHeader}>
              <View style={styles.combinedBadgeRow}>
                <View style={styles.combinedIconBox}>
                  <Ionicons name="link" size={13} color="#D90000" />
                </View>
                <View style={styles.combinedTitleBlock}>
                  <Text style={styles.combinedBadgeText}>{item.label}</Text>
                  <Text style={styles.combinedCountSub} numberOfLines={1}>
                    {item.exercises.length} {item.exercises.length === 1 ? "exercício" : "exercícios"} sem pausa
                  </Text>
                </View>
              </View>

              <View style={styles.combinedHeaderRight}>
                <TouchableOpacity
                  style={styles.uncombineActionBtn}
                  onPress={() => uncombineExercises(item.combinationId)}
                  activeOpacity={0.8}
                  hitSlop={6}
                >
                  <Ionicons name="unlink-outline" size={12} color="#D90000" />
                  <Text style={styles.uncombineActionBtnText}>Descombinar</Text>
                </TouchableOpacity>

                {!isCombinationMode && (
                  <TouchableOpacity
                    onPressIn={drag}
                    hitSlop={12}
                    style={styles.dragHandleBtn}
                  >
                    <Ionicons name="reorder-two-outline" size={20} color="#888888" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* COMBINED EXERCISES LIST */}
            <View style={styles.combinedExercisesBody}>
              {item.exercises.map((comboEx, exIndex) => {
                const isSelected = !!selectedForCombine[comboEx.id];
                return (
                  <React.Fragment key={`combo-item-${item.combinationId}-${comboEx.id}`}>
                    {exIndex > 0 && (
                      <View style={styles.combinedConnectorRow}>
                        <View style={styles.combinedConnectorLine} />
                        <View style={styles.combinedPlusBadge}>
                          <Ionicons name="add" size={11} color="#D90000" />
                        </View>
                        <View style={styles.combinedConnectorLine} />
                      </View>
                    )}

                    <View style={styles.combinedExerciseRowItem}>
                      {isCombinationMode && (
                        <TouchableOpacity
                          style={styles.combineCheckboxBox}
                          onPress={() => toggleSelectCombine(comboEx.id)}
                        >
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={20}
                            color={isSelected ? "#D90000" : "#666"}
                          />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.exerciseCardTouchArea}
                        onPress={() => {
                          if (isCombinationMode) {
                            toggleSelectCombine(comboEx.id);
                          } else {
                            openExerciseEditor(comboEx);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{
                            uri:
                              comboEx.thumbnailUrl ||
                              (comboEx.videoUrl ? getYoutubeThumbnailUrl(comboEx.videoUrl) : undefined) ||
                              "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200",
                          }}
                          style={styles.exerciseCardThumb}
                        />

                        <View style={styles.exerciseCardDetails}>
                          <View style={styles.exerciseTitleRow}>
                            <Text style={styles.exerciseCardName} numberOfLines={1}>
                              {comboEx.name}
                            </Text>
                          </View>
                          <Text style={styles.exerciseCardSpecs}>
                            {comboEx.sets.length} {comboEx.sets.length === 1 ? "Série" : "Séries"} • Rep: {comboEx.sets[0]?.reps || "10 a 12"} • Descanso: {comboEx.sets[0]?.restSeconds || 60}s
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.combinedRowActionsRight}>
                        {!isCombinationMode && (
                          <TouchableOpacity
                            style={styles.combinedRowTrashBtn}
                            onPress={() => deleteSingleExercise(comboEx.id, comboEx.name)}
                            activeOpacity={0.7}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={15} color="#ff5a5a" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.combinedRowEditBtn}
                          onPress={() => openExerciseEditor(comboEx)}
                          activeOpacity={0.8}
                          hitSlop={6}
                        >
                          <Ionicons name="chevron-forward" size={15} color="#666666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </ScaleDecorator>
      );
    }

    const ex = item.exercise;
    const isSelected = !!selectedForCombine[ex.id];

    return (
      <ScaleDecorator activeScale={1.03}>
        <View
          style={[
            styles.exerciseCardRow,
            isSelected && styles.exerciseCardRowSelected,
            isActive && styles.rowDragActive,
          ]}
        >
          {isCombinationMode && (
            <TouchableOpacity
              style={styles.combineCheckboxBox}
              onPress={() => toggleSelectCombine(ex.id)}
            >
              <Ionicons
                name={isSelected ? "checkbox" : "square-outline"}
                size={22}
                color={isSelected ? "#D90000" : "#666"}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.exerciseCardTouchArea}
            onPress={() => {
              if (isCombinationMode) {
                toggleSelectCombine(ex.id);
              } else {
                openExerciseEditor(ex);
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.exerciseCardThumbWrap}>
              <Image
                source={{
                  uri:
                    ex.thumbnailUrl ||
                    (ex.videoUrl ? getYoutubeThumbnailUrl(ex.videoUrl) : undefined) ||
                    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200",
                }}
                style={styles.exerciseCardThumb}
              />
              <View style={styles.exercisePlayOverlayIconBox}>
                <Ionicons name="play" size={10} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.exerciseCardDetails}>
              <View style={styles.exerciseTitleRow}>
                <Text style={styles.exerciseCardName} numberOfLines={1}>
                  {ex.name}
                </Text>
                {ex.combinationLabel && (
                  <View style={styles.combinationTag}>
                    <Text style={styles.combinationTagText}>{ex.combinationLabel}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.exerciseCardSpecs}>
                {ex.sets.length} {ex.sets.length === 1 ? "Série" : "Séries"} • Rep: {ex.sets[0]?.reps || "10 a 12"} • Descanso: {ex.sets[0]?.restSeconds || 60}s
              </Text>
            </View>
          </TouchableOpacity>

          {!isCombinationMode && (
            <View style={styles.exerciseRightActionBox}>
              <TouchableOpacity
                style={styles.exerciseTrashBtn}
                onPress={() => deleteSingleExercise(ex.id, ex.name)}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={17} color="#ff5a5a" />
              </TouchableOpacity>
              <TouchableOpacity
                onPressIn={drag}
                hitSlop={12}
                style={styles.dragHandleBtn}
              >
                <Ionicons name="reorder-two-outline" size={22} color="#888888" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  const editorContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.rootContainer}
    >
      {/* TOP BAR COM VOLTAR, TÍTULO EDITAR TREINO E AÇÕES DE PDF/SALVAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topRoundBtn} onPress={onClose} activeOpacity={0.75} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#D90000" />
        </TouchableOpacity>

        <Text style={styles.topHeaderTitle}>Editar Treino</Text>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.topRoundBtn} onPress={handleExportPdf} activeOpacity={0.75} hitSlop={6}>
            <Ionicons name="document-text-outline" size={20} color="#D90000" />
          </TouchableOpacity>
          {onDuplicate && (
            <TouchableOpacity style={styles.topRoundBtn} onPress={onDuplicate} activeOpacity={0.75} hitSlop={6}>
              <Ionicons name="copy-outline" size={18} color="#D90000" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.topRoundBtn} onPress={handleGlobalSave} activeOpacity={0.75} hitSlop={6}>
            <Ionicons name="checkmark-sharp" size={22} color="#D90000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* HERO CARD COM DADOS DO ALUNO, TREINO E ESTATÍSTICAS */}
      <View style={styles.heroCard}>
        <View style={styles.heroCardHeaderRow}>
          {!!info.coverUrl && (
            <View style={styles.heroCoverThumbWrap}>
              <Image source={{ uri: info.coverUrl }} style={styles.heroCoverThumb} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroStudentLabel}>ALUNO: {studentName.toUpperCase()}</Text>
            <Text style={styles.heroWorkoutTitle} numberOfLines={1}>
              {info.name}
            </Text>
            <Text style={styles.heroWorkoutSubtitle}>
              {exercises.length} {exercises.length === 1 ? "exercício" : "exercícios"} na prescrição • ~{volumeStats.estimatedMinutes} min
            </Text>
          </View>

          <TouchableOpacity style={styles.heroSaveBtn} onPress={handleGlobalSave} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.heroSaveBtnText}>Salvar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <View style={styles.heroStatValueRow}>
              <Ionicons name="barbell" size={16} color="#FFFFFF" />
              <Text style={styles.heroStatNumber}>{exercises.length}</Text>
            </View>
            <Text style={styles.heroStatLabel}>EXERCÍCIOS</Text>
          </View>

          <View style={styles.heroStatItem}>
            <View style={styles.heroStatValueRow}>
              <Ionicons name="time-outline" size={16} color="#FFFFFF" />
              <Text style={styles.heroStatNumber}>{volumeStats.estimatedMinutes}m</Text>
            </View>
            <Text style={styles.heroStatLabel}>DURAÇÃO</Text>
          </View>

          <View style={styles.heroStatItem}>
            <View style={styles.heroStatValueRow}>
              <Ionicons name="layers-outline" size={16} color="#FFFFFF" />
              <Text style={styles.heroStatNumber}>{volumeStats.totalSets}</Text>
            </View>
            <Text style={styles.heroStatLabel}>SÉRIES</Text>
          </View>
        </View>
      </View>

      {/* ABAS SUPERIORES DE NAVEGAÇÃO */}
      <View style={styles.topTabsBar}>
        <TouchableOpacity
          style={[styles.topTabItem, activeTab === "exercises" && styles.topTabItemActive]}
          onPress={() => setActiveTab("exercises")}
          activeOpacity={0.8}
        >
          <View style={styles.topTabContent}>
            <Ionicons
              name="barbell"
              size={16}
              color={activeTab === "exercises" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.topTabText, activeTab === "exercises" && styles.topTabTextActive]}>
              Exercícios
            </Text>
          </View>
          {activeTab === "exercises" && <View style={styles.topTabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabItem, activeTab === "edit" && styles.topTabItemActive]}
          onPress={() => setActiveTab("edit")}
          activeOpacity={0.8}
        >
          <View style={styles.topTabContent}>
            <Ionicons
              name="options-outline"
              size={16}
              color={activeTab === "edit" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.topTabText, activeTab === "edit" && styles.topTabTextActive]}>
              Geral
            </Text>
          </View>
          {activeTab === "edit" && <View style={styles.topTabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabItem, activeTab === "volume" && styles.topTabItemActive]}
          onPress={() => setActiveTab("volume")}
          activeOpacity={0.8}
        >
          <View style={styles.topTabContent}>
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === "volume" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.topTabText, activeTab === "volume" && styles.topTabTextActive]}>
              Volume
            </Text>
          </View>
          {activeTab === "volume" && <View style={styles.topTabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabItem, activeTab === "student-preview" && styles.topTabItemActive]}
          onPress={() => setActiveTab("student-preview")}
          activeOpacity={0.8}
        >
          <View style={styles.topTabContent}>
            <Ionicons
              name="eye-outline"
              size={16}
              color={activeTab === "student-preview" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.topTabText, activeTab === "student-preview" && styles.topTabTextActive]}>
              Prévia
            </Text>
          </View>
          {activeTab === "student-preview" && <View style={styles.topTabActiveIndicator} />}
        </TouchableOpacity>
      </View>

      {/* BODY CONTENT BY ACTIVE TAB */}
      {activeTab === "exercises" ? (
        <View style={styles.exercisesTabWrap}>
          {/* Combinar / Excluir Mode Action Bar */}
          {isCombinationMode && (
            <View style={styles.combinationActiveBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.combinationBannerTitle}>
                  {Object.keys(selectedForCombine).filter((k) => selectedForCombine[k]).length} selecionado(s)
                </Text>
                <Text style={styles.combinationBannerSub}>
                  Marque as caixas para combinar em Bi-set ou excluir em lote.
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  style={styles.combineActionBtn}
                  onPress={applyCombination}
                  activeOpacity={0.85}
                >
                  <Ionicons name="link" size={13} color="#fff" />
                  <Text style={styles.combineActionBtnText}>Combinar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteSelectedActionBtn}
                  onPress={deleteSelectedExercises}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash" size={13} color="#fff" />
                  <Text style={styles.deleteSelectedActionBtnText}>Excluir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelCombineActionBtn}
                  onPress={() => {
                    setSelectedForCombine({});
                    setIsCombinationMode(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Actions Rail (Bloco, Combinar, Adicionar) */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionBlockBtn}
              onPress={openCreateSectionModal}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionBlockBtnText}>Bloco</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBlockBtn,
                isCombinationMode && styles.actionBlockBtnActive,
              ]}
              onPress={() => setIsCombinationMode(!isCombinationMode)}
              activeOpacity={0.8}
            >
              <Ionicons name="link-outline" size={16} color={isCombinationMode ? "#D90000" : "#FFFFFF"} />
              <Text style={[styles.actionBlockBtnText, isCombinationMode && { color: "#D90000" }]}>
                {isCombinationMode ? "Fechar" : "Combinar"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionAddPrimaryBtn}
              onPress={() => setShowCatalogModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.actionAddPrimaryBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {/* Lista arrastável: cabeçalhos + exercícios em uma única lista reordenável */}
          <DraggableFlatList
            data={workoutRows}
            keyExtractor={(row) => row.rowId}
            renderItem={renderWorkoutRow}
            onDragEnd={({ data }) => handleWorkoutRowsReorder(data)}
            containerStyle={styles.bodyScroll}
            contentContainerStyle={styles.workoutListBodyContent}
            showsVerticalScrollIndicator={false}
            activationDistance={12}
            ListEmptyComponent={
              <View style={styles.emptyWorkoutBox}>
                <View style={styles.emptyWorkoutIconCircle}>
                  <Ionicons name="barbell-outline" size={32} color="#D90000" />
                </View>
                <Text style={styles.emptyWorkoutTitle}>Nenhum Exercício Adicionado</Text>
                <Text style={styles.emptyWorkoutSubtitle}>
                  Este treino está 100% limpo. Use os botões acima para adicionar exercícios ou criar blocos.
                </Text>
                <TouchableOpacity
                  style={styles.emptyWorkoutAddBtn}
                  onPress={() => setShowCatalogModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyWorkoutAddBtnText}>Adicionar Exercício</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      ) : (
      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TAB 1: EDITAR (GERAL DO TREINO) - SCREEN 1 */}
        {activeTab === "edit" && (
          <View style={styles.tabSection}>
            {/* CAPA / THUMBNAIL DO TREINO */}
            <View style={styles.coverSectionWrap}>
              <View style={styles.coverSectionHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="image-outline" size={16} color="#D90000" />
                  <Text style={styles.coverSectionTitle}>Imagem de Capa do Treino</Text>
                </View>
                {!!info.coverUrl && (
                  <TouchableOpacity
                    onPress={() => setInfo((prev) => ({ ...prev, coverUrl: undefined }))}
                    hitSlop={8}
                    style={styles.coverRemoveBtn}
                  >
                    <Ionicons name="trash-outline" size={13} color="#ff5a5a" />
                    <Text style={styles.coverRemoveBtnText}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>

              {info.coverUrl ? (
                <TouchableOpacity
                  style={styles.coverPreviewCard}
                  onPress={handlePickCoverImage}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: info.coverUrl }} style={styles.coverPreviewImage} />
                  <View style={styles.coverOverlayGradient}>
                    <View style={styles.coverChangePill}>
                      <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.coverChangePillText}>Alterar Imagem da Galeria</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.coverUploadCard}
                  onPress={handlePickCoverImage}
                  activeOpacity={0.8}
                >
                  <View style={styles.coverUploadIconBox}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#D90000" />
                  </View>
                  <Text style={styles.coverUploadTitle}>Escolher Foto da Galeria</Text>
                  <Text style={styles.coverUploadSub}>
                    Toque para adicionar uma foto de capa personalizada (16:9)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Presets Rápidos de Fotos */}
              <View style={{ marginTop: 6 }}>
                <Text style={styles.coverPresetsLabel}>OU ESCOLHA UMA FOTO PRONTA:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.coverPresetsRail}
                >
                  {WORKOUT_COVER_PRESETS.map((preset) => {
                    const isSelected = info.coverUrl === preset.url;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.coverPresetCard,
                          isSelected && styles.coverPresetCardSelected,
                        ]}
                        onPress={() => setInfo((prev) => ({ ...prev, coverUrl: preset.url }))}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: preset.url }} style={styles.coverPresetImage} />
                        {isSelected && (
                          <View style={styles.coverPresetCheckBadge}>
                            <Ionicons name="checkmark-circle" size={18} color="#D90000" />
                          </View>
                        )}
                        <Text style={styles.coverPresetLabel} numberOfLines={1}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.mainTitleInput}
                value={info.name}
                onChangeText={(val) => setInfo({ ...info, name: val })}
                placeholder="Nome do Treino"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.colHalf}>
                <View style={styles.inputCard}>
                  <Text style={styles.fieldSmallLabel}>Início</Text>
                  <TextInput
                    style={styles.fieldSmallInput}
                    value={info.startDate}
                    onChangeText={(val) => setInfo({ ...info, startDate: formatDateInput(val) })}
                    placeholder="00/00/0000"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
              <View style={styles.colHalf}>
                <View style={styles.inputCard}>
                  <Text style={styles.fieldSmallLabel}>Término</Text>
                  <TextInput
                    style={styles.fieldSmallInput}
                    value={info.endDate}
                    onChangeText={(val) => setInfo({ ...info, endDate: formatDateInput(val) })}
                    placeholder="00/00/0000"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.inputCard, { minHeight: 90 }]}>
              <TextInput
                style={styles.notesTextarea}
                value={info.notes}
                onChangeText={(val) => setInfo({ ...info, notes: val })}
                placeholder="Digite aqui a observação..."
                placeholderTextColor="#666"
                multiline
              />
            </View>

            {/* Toggles & Student View Link */}
            <View style={styles.togglesContainer}>
              <TouchableOpacity
                style={styles.toggleRowItem}
                onPress={() => setInfo({ ...info, releaseToStudent: !info.releaseToStudent })}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={info.releaseToStudent ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={info.releaseToStudent ? "#D90000" : "#666"}
                />
                <Text style={styles.toggleRowText}>Liberar para Aluno</Text>
              </TouchableOpacity>

              <View style={styles.toggleRowWithLink}>
                <TouchableOpacity
                  style={styles.toggleRowItem}
                  onPress={() => setInfo({ ...info, notifyExpiration: !info.notifyExpiration })}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={info.notifyExpiration ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={info.notifyExpiration ? "#D90000" : "#666"}
                  />
                  <Text style={styles.toggleRowText}>Notificar Vencimento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.studentViewLink}
                  onPress={() => setActiveTab("student-preview")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={18} color="#D90000" />
                  <Text style={styles.studentViewLinkText}>Visão do aluno</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Split by Week Day Card */}
            <View style={styles.weekSplitCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekSplitTitle}>Dividir por dia da semana?</Text>
                <Text style={styles.weekSplitSub}>Mostra o &quot;treino de hoje&quot; pro aluno</Text>
              </View>
              <Switch
                value={info.splitByWeekDay}
                onValueChange={(val) => setInfo({ ...info, splitByWeekDay: val })}
                trackColor={{ false: "#333", true: "#D90000" }}
                thumbColor="#fff"
              />
            </View>

            {/* PDF Share Banner */}
            <TouchableOpacity
              style={styles.pdfShareBanner}
              onPress={handleExportPdf}
              activeOpacity={0.85}
            >
              <View style={styles.pdfShareIconBox}>
                <Ionicons name="document-text" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfShareTitle}>Mandar Treino em PDF para o Aluno</Text>
                <Text style={styles.pdfShareSub}>
                  Gera ficha formatada com sua foto, logo e cores personalizadas
                </Text>
              </View>
              <Ionicons name="share-social-outline" size={20} color="#D90000" />
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: VOLUME (ANÁLISE DO TREINO) */}
        {activeTab === "volume" && (
          <View style={styles.tabSection}>
            {exercises.length === 0 ? (
              <View style={styles.emptyVolumeBox}>
                <View style={styles.emptyVolumeIconCircle}>
                  <Ionicons name="pie-chart-outline" size={32} color="#D90000" />
                </View>
                <Text style={styles.emptyVolumeTitle}>Sem Dados de Volume</Text>
                <Text style={styles.emptyVolumeSub}>
                  Adicione exercícios na aba &quot;Exercícios&quot; para visualizar os gráficos de distribuição muscular e séries.
                </Text>
              </View>
            ) : (
              <>
                {/* 3 Metric Cards with Icons */}
                <View style={styles.volumeOverviewCard}>
                  <View style={styles.volumeStatPill}>
                    <View style={styles.volumeStatIconBox}>
                      <Ionicons name="barbell" size={16} color="#D90000" />
                    </View>
                    <Text style={styles.volumeStatValue}>{volumeStats.totalExercises}</Text>
                    <Text style={styles.volumeStatLabel}>EXERCÍCIOS</Text>
                  </View>
                  <View style={styles.volumeStatPill}>
                    <View style={styles.volumeStatIconBox}>
                      <Ionicons name="layers" size={16} color="#D90000" />
                    </View>
                    <Text style={styles.volumeStatValue}>{volumeStats.totalSets}</Text>
                    <Text style={styles.volumeStatLabel}>TOTAL SÉRIES</Text>
                  </View>
                  <View style={styles.volumeStatPill}>
                    <View style={styles.volumeStatIconBox}>
                      <Ionicons name="time" size={16} color="#D90000" />
                    </View>
                    <Text style={styles.volumeStatValue}>{volumeStats.estimatedMinutes}m</Text>
                    <Text style={styles.volumeStatLabel}>DURAÇÃO</Text>
                  </View>
                </View>

                {/* Section Title with Badge */}
                <View style={styles.volumeSectionHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="analytics" size={18} color="#D90000" />
                    <Text style={styles.volumeSectionTitle}>Séries por Grupo Muscular</Text>
                  </View>
                  <View style={styles.volumeGroupsBadge}>
                    <Text style={styles.volumeGroupsBadgeText}>
                      {Object.keys(volumeStats.muscleMap).length} grupos
                    </Text>
                  </View>
                </View>

                {/* Multi-segment distribution visual bar */}
                <View style={styles.volumeStackedBarWrap}>
                  <View style={styles.volumeStackedBar}>
                    {Object.entries(volumeStats.muscleMap).map(([group, count], idx) => {
                      const percent = (count / Math.max(volumeStats.totalSets, 1)) * 100;
                      const colors = ["#D90000", "#FF4444", "#B30000", "#FF6B6B", "#8C0000", "#FF8E8E"];
                      const segmentColor = colors[idx % colors.length];
                      return (
                        <View
                          key={group}
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            backgroundColor: segmentColor,
                          }}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Individual Muscle Group Breakdown Cards */}
                <View style={{ gap: 10 }}>
                  {Object.entries(volumeStats.muscleMap)
                    .sort(([, a], [, b]) => b - a)
                    .map(([group, count]) => {
                      const percent = Math.round((count / Math.max(volumeStats.totalSets, 1)) * 100);
                      const exList = volumeStats.exercisesByMuscle[group] || [];
                      return (
                        <View key={group} style={styles.volumeMuscleCard}>
                          <View style={styles.volumeMuscleCardHeader}>
                            <View style={styles.volumeMuscleLeft}>
                              <View style={styles.volumeMuscleIconBox}>
                                <Ionicons
                                  name={getSectionIcon(group)}
                                  size={15}
                                  color="#D90000"
                                />
                              </View>
                              <Text style={styles.volumeMuscleName}>{group}</Text>
                            </View>

                            <View style={styles.volumeMuscleBadges}>
                              <View style={styles.volumeSetsBadge}>
                                <Text style={styles.volumeSetsBadgeText}>{count} séries</Text>
                              </View>
                              <View style={styles.volumePercentBadge}>
                                <Text style={styles.volumePercentBadgeText}>{percent}%</Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.volumeProgressBar}>
                            <View
                              style={[
                                styles.volumeProgressFill,
                                { width: `${Math.min(percent, 100)}%` },
                              ]}
                            />
                          </View>

                          {exList.length > 0 && (
                            <Text style={styles.volumeMuscleExercisesText} numberOfLines={1}>
                              {exList.join(" • ")}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                </View>

                {/* Coach / Intensity Insight Card */}
                <View style={styles.volumeInsightCard}>
                  <View style={styles.volumeInsightHeader}>
                    <Ionicons name="bulb-outline" size={18} color="#D90000" />
                    <Text style={styles.volumeInsightTitle}>Análise do Estímulo</Text>
                  </View>
                  <Text style={styles.volumeInsightText}>
                    {volumeStats.totalSets < 10
                      ? "Volume leve a moderado. Ideal para treinos de adaptação, regenerativos ou ativações funcionais."
                      : volumeStats.totalSets <= 22
                      ? "Volume hipertrófico ótimo (10 a 22 séries). Proporciona sinalização de ganho de massa magra e força com excelente recuperação."
                      : "Volume de alta densidade (> 22 séries). Certifique-se de programar dias adequados de descanso para recuperação neuromuscular."}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* TAB 4: VISÃO DO ALUNO (SCREEN 5) */}
        {activeTab === "student-preview" && (
          <View style={styles.studentPreviewContainer}>
            <View style={styles.studentPreviewHeader}>
              <UserAvatar
                uri={studentAvatar}
                size={48}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.studentPreviewTrainerName}>Personal DragonCorp</Text>
                <Text style={styles.studentPreviewSub} numberOfLines={1}>
                  {info.name} • Última sessão
                </Text>
              </View>
            </View>

            <View style={styles.studentPreviewBadgeRow}>
              <View style={styles.studentPreviewStatusBadge}>
                <Text style={styles.studentPreviewStatusBadgeText}>Liberado</Text>
              </View>
              <Text style={styles.studentPreviewMetaText}>
                {exercises.length} exercício(s) • {volumeStats.estimatedMinutes} min • 0% feito
              </Text>
            </View>

            <TouchableOpacity style={styles.studentStartBtn} activeOpacity={0.85}>
              <Text style={styles.studentStartBtnText}>Começar Sessão</Text>
            </TouchableOpacity>

            <View style={styles.coachCardContainer}>
              <View style={styles.coachCardHeader}>
                <Ionicons name="clipboard-outline" size={20} color="#D90000" />
                <Text style={styles.coachCardTitle}>Coach Instructions - Elite</Text>
              </View>
              <Text style={styles.coachCardBody}>{info.notes}</Text>
              <View style={styles.coachValidityPill}>
                <Ionicons name="bulb-outline" size={14} color="#D90000" />
                <Text style={styles.coachValidityText}>Validade até {info.endDate}</Text>
              </View>
            </View>

            {/* PDF Share Banner in Preview */}
            <TouchableOpacity
              style={styles.pdfShareBanner}
              onPress={handleExportPdf}
              activeOpacity={0.85}
            >
              <View style={styles.pdfShareIconBox}>
                <Ionicons name="document-text" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfShareTitle}>Compartilhar PDF Oficial</Text>
                <Text style={styles.pdfShareSub}>
                  Enviar via WhatsApp, E-mail ou salvar para impressão
                </Text>
              </View>
              <Ionicons name="share-social-outline" size={20} color="#D90000" />
            </TouchableOpacity>

            <Text style={styles.studentExercisesTitle}>Exercícios da Sessão</Text>
            {(() => {
              const renderPreviewCard = (ex: WorkoutExerciseItem) => (
                <View key={ex.id} style={styles.studentExerciseCard}>
                  <View style={styles.studentExTopRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <Ionicons name="barbell" size={18} color="#D90000" />
                      <Text style={styles.studentExName}>{ex.name}</Text>
                      {ex.combinationLabel && (
                        <View style={styles.previewComboBadge}>
                          <Text style={styles.previewComboBadgeText}>{ex.combinationLabel}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.studentCheckboxSquare} />
                  </View>

                  <Text style={styles.studentExSpecs}>
                    {ex.sets.length} série(s) x {ex.sets[0]?.reps || "10 a 12"} • {ex.sets[0]?.load || "20 kg"}
                  </Text>
                  {!!ex.observation && (
                    <Text style={styles.studentExObs}>{ex.observation}</Text>
                  )}
                </View>
              );

              if (exercises.length === 0) {
                return (
                  <View style={styles.emptySectionBox}>
                    <Text style={styles.emptySectionText}>Nenhum exercício na prescrição.</Text>
                  </View>
                );
              }

              if (sections.length > 0) {
                return (
                  <View style={{ gap: 10 }}>
                    {sections.map((sec) => {
                      const secExercises = exercises.filter((e) => e.sectionId === sec.id);
                      if (secExercises.length === 0) return null;
                      return (
                        <View key={sec.id} style={styles.studentSectionBlock}>
                          <View style={styles.studentSectionHeader}>
                            <View style={styles.studentSectionHeaderLeft}>
                              <View style={styles.studentSectionAccentPill} />
                              <View style={styles.studentSectionIconBox}>
                                <Ionicons
                                  name={getSectionIcon(sec.title, sec.icon)}
                                  size={13}
                                  color="#D90000"
                                />
                              </View>
                              <Text style={styles.studentSectionTitle} numberOfLines={1}>
                                {sec.title}
                              </Text>
                            </View>
                            <View style={styles.studentSectionCountBadge}>
                              <Text style={styles.studentSectionCountBadgeText}>
                                {secExercises.length}
                              </Text>
                            </View>
                          </View>

                          <View style={{ gap: 8 }}>
                            {secExercises.map(renderPreviewCard)}
                          </View>
                        </View>
                      );
                    })}

                    {/* Exercícios sem seção ou fora das seções */}
                    {(() => {
                      const unassigned = exercises.filter(
                        (e) => !e.sectionId || !sections.some((s) => s.id === e.sectionId)
                      );
                      if (unassigned.length === 0) return null;
                      return (
                        <View style={styles.studentSectionBlock}>
                          <View style={styles.studentSectionHeader}>
                            <View style={styles.studentSectionHeaderLeft}>
                              <View style={styles.studentSectionAccentPill} />
                              <View style={styles.studentSectionIconBox}>
                                <Ionicons name="barbell" size={13} color="#D90000" />
                              </View>
                              <Text style={styles.studentSectionTitle} numberOfLines={1}>
                                Outros Exercícios
                              </Text>
                            </View>
                            <View style={styles.studentSectionCountBadge}>
                              <Text style={styles.studentSectionCountBadgeText}>
                                {unassigned.length}
                              </Text>
                            </View>
                          </View>

                          <View style={{ gap: 8 }}>
                            {unassigned.map(renderPreviewCard)}
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                );
              }

              return (
                <View style={{ gap: 8 }}>
                  {exercises.map(renderPreviewCard)}
                </View>
              );
            })()}
          </View>
        )}
      </ScrollView>
      )}

      {/* MODAL 1: CADASTRO / EDIÇÃO DO EXERCÍCIO (SCREEN 2) */}
      <Modal
        visible={showExerciseForm && editingExercise !== null}
        animationType="slide"
        onRequestClose={() => setShowExerciseForm(false)}
      >
        {editingExercise && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.rootContainer}
          >
            {/* Exercise Edit Header */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={() => setShowExerciseForm(false)}
                activeOpacity={0.75}
              >
                <Ionicons name="arrow-back" size={22} color="#D90000" />
              </TouchableOpacity>

              <Text style={styles.exerciseFormHeaderTitle}>Cadastro Exercício</Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity
                  style={styles.topBarBtn}
                  onPress={() => deleteSingleExercise(editingExercise.id, editingExercise.name)}
                  activeOpacity={0.75}
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff5a5a" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.topBarBtn}
                  onPress={saveEditingExercise}
                  activeOpacity={0.75}
                  hitSlop={6}
                >
                  <Ionicons name="checkmark-sharp" size={24} color="#D90000" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Cadência Button */}
              <TouchableOpacity
                style={styles.cadenceTopBtn}
                onPress={() => setShowCadencePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="speedometer-outline" size={16} color="#D90000" />
                <Text style={styles.cadenceTopBtnText}>
                  {editingExercise.cadence
                    ? `Cadência: ${editingExercise.cadence}`
                    : "Adicionar Cadência"}
                </Text>
              </TouchableOpacity>

              {/* Exercise Title Input */}
              <View style={styles.exerciseTitleInputRow}>
                <TextInput
                  style={styles.exerciseTitleInput}
                  value={editingExercise.name}
                  onChangeText={(val) =>
                    setEditingExercise({ ...editingExercise, name: val })
                  }
                  placeholder="Nome do Exercício"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  onPress={() => setShowCatalogModal(true)}
                  style={styles.exerciseTitleEditIcon}
                >
                  <Ionicons name="pencil" size={18} color="#D90000" />
                </TouchableOpacity>
              </View>

              {/* Video Preview Banner */}
              {editingExercise.videoUrl ? (
                <TouchableOpacity
                  style={styles.videoBannerCard}
                  onPress={() => openVideo(editingExercise.videoUrl)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{
                      uri:
                        editingExercise.thumbnailUrl ||
                        getYoutubeThumbnailUrl(editingExercise.videoUrl) ||
                        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500",
                    }}
                    style={styles.videoBannerImage}
                  />
                  <View style={styles.videoPlayOverlay}>
                    <View style={styles.videoPlayBtnSquare}>
                      <Ionicons name="play" size={28} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.videoEmptyCard}
                  onPress={() => setShowCatalogModal(true)}
                >
                  <Ionicons name="videocam-outline" size={24} color="#D90000" />
                  <Text style={styles.videoEmptyText}>
                    Toque para vincular um vídeo do Catálogo
                  </Text>
                </TouchableOpacity>
              )}

              {/* Observation Textarea */}
              <View style={[styles.inputCard, { minHeight: 80, marginTop: 14 }]}>
                <TextInput
                  style={styles.notesTextarea}
                  value={editingExercise.observation}
                  onChangeText={(val) =>
                    setEditingExercise({ ...editingExercise, observation: val })
                  }
                  placeholder="Digite sua observação aqui..."
                  placeholderTextColor="#666"
                  multiline
                />
              </View>

              {/* Replicar Séries Toggle */}
              <TouchableOpacity
                style={styles.replicateRow}
                onPress={() =>
                  setEditingExercise({
                    ...editingExercise,
                    replicateToAll: !editingExercise.replicateToAll,
                  })
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name={editingExercise.replicateToAll ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={editingExercise.replicateToAll ? "#D90000" : "#666"}
                />
                <Text style={styles.replicateRowText}>
                  Replicar séries para todos exercícios
                </Text>
              </TouchableOpacity>

              {/* Section SÉRIES Header with + */}
              <View style={styles.seriesHeaderRow}>
                <Text style={styles.seriesHeaderTitle}>SÉRIES</Text>
                <TouchableOpacity
                  style={styles.addSeriesBtn}
                  onPress={addSetToEditingExercise}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color="#D90000" />
                </TouchableOpacity>
              </View>

              {/* Columns Header */}
              <View style={styles.seriesColumnsHeader}>
                <Text style={[styles.seriesColumnLabel, { width: 34 }]}></Text>
                <Text style={[styles.seriesColumnLabel, { flex: 1 }]}>Repetição</Text>
                <Text style={[styles.seriesColumnLabel, { flex: 1 }]}>Carga</Text>
                <Text style={[styles.seriesColumnLabel, { flex: 1 }]}>Intervalo</Text>
                <Text style={[styles.seriesColumnLabel, { width: 60 }]}></Text>
              </View>

              {/* Series Rows */}
              {editingExercise.sets.map((s, index) => (
                <View key={s.id || index} style={styles.seriesRowCard}>
                  <Text style={styles.seriesNumberText}>{index + 1}ª</Text>

                  <View style={styles.seriesInputBox}>
                    <TextInput
                      style={styles.seriesInputText}
                      value={s.reps}
                      onChangeText={(val) => updateSetField(index, "reps", val)}
                      placeholder="10 a 12"
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.seriesInputBox}>
                    <TextInput
                      style={styles.seriesInputText}
                      value={s.load}
                      onChangeText={(val) => updateSetField(index, "load", val)}
                      placeholder="20 kg"
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.seriesInputBox}>
                    <TextInput
                      style={styles.seriesInputText}
                      value={String(s.restSeconds || 60)}
                      onChangeText={(val) =>
                        updateSetField(index, "restSeconds", parseInt(val, 10) || 60)
                      }
                      placeholder="60"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.seriesActionsCol}>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Observação", s.notes || "Sem observação definida.")
                      }
                      hitSlop={6}
                    >
                      <Ionicons name="create-outline" size={16} color="#888" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeSetFromEditingExercise(index)}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ff5a5a" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Botão de Excluir Exercício no Rodapé */}
              <TouchableOpacity
                style={styles.deleteExerciseFooterBtn}
                onPress={() => deleteSingleExercise(editingExercise.id, editingExercise.name)}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={18} color="#ff5a5a" />
                <Text style={styles.deleteExerciseFooterBtnText}>Excluir este Exercício do Treino</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* MODAL 2: ADICIONAR / EDITAR CABEÇALHO (SECTION) COM SELEÇÃO DE ÍCONE */}
      <Modal
        visible={showHeaderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.dialogOverlay}
        >
          <View style={styles.sectionDialogBox}>
            <View style={styles.sectionDialogHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.sectionDialogIconBox}>
                  <Ionicons name={newHeaderIcon} size={18} color="#D90000" />
                </View>
                <Text style={styles.dialogTitle}>
                  {editingSectionId ? "Editar Cabeçalho" : "Novo Cabeçalho de Seção"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHeaderModal(false)}
                hitSlop={8}
                style={styles.dialogCloseBtn}
              >
                <Ionicons name="close" size={18} color="#888888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.dialogSubtitle}>
              Organize o treino em grupos musculares ou fases (ex: Aquecimento, Core, Força).
            </Text>

            {/* Input de Nome do Cabeçalho */}
            <View style={styles.sectionInputRow}>
              <Ionicons name={newHeaderIcon} size={18} color="#D90000" style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.sectionDialogInput}
                value={newHeaderTitle}
                onChangeText={(text) => {
                  setNewHeaderTitle(text);
                  if (!editingSectionId) {
                    const autoIcon = getSectionIcon(text);
                    if (autoIcon !== "barbell") {
                      setNewHeaderIcon(autoIcon);
                    }
                  }
                }}
                placeholder="Ex: Peitoral & Tríceps / Core"
                placeholderTextColor="#666"
                autoFocus
              />
              {newHeaderTitle.length > 0 && (
                <TouchableOpacity onPress={() => setNewHeaderTitle("")} style={{ padding: 8 }}>
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Sugestões Rápidas (Presets) */}
            <Text style={styles.sectionDialogLabel}>SUGESTÕES RÁPIDAS:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionPresetsRail}
            >
              {SECTION_QUICK_PRESETS.map((preset) => {
                const isSelected = newHeaderTitle === preset.title && newHeaderIcon === preset.icon;
                return (
                  <TouchableOpacity
                    key={preset.title}
                    style={[
                      styles.sectionPresetChip,
                      isSelected && styles.sectionPresetChipActive,
                    ]}
                    onPress={() => {
                      setNewHeaderTitle(preset.title);
                      setNewHeaderIcon(preset.icon);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={preset.icon}
                      size={13}
                      color={isSelected ? "#FFFFFF" : "#D90000"}
                    />
                    <Text
                      style={[
                        styles.sectionPresetChipText,
                        isSelected && styles.sectionPresetChipTextActive,
                      ]}
                    >
                      {preset.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Seletor de Ícones */}
            <Text style={styles.sectionDialogLabel}>SELECIONE O ÍCONE DO BLOCO:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionIconsGrid}
            >
              {SECTION_ICON_LIST.map((item) => {
                const isSelected = newHeaderIcon === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.sectionIconBtn,
                      isSelected && styles.sectionIconBtnActive,
                    ]}
                    onPress={() => setNewHeaderIcon(item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.id}
                      size={18}
                      color={isSelected ? "#FFFFFF" : "#888888"}
                    />
                    <Text
                      style={[
                        styles.sectionIconLabel,
                        isSelected && styles.sectionIconLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Prévia ao vivo do cabeçalho */}
            <View style={styles.sectionPreviewBox}>
              <Text style={styles.sectionPreviewLabel}>PRÉVIA NO TREINO:</Text>
              <View style={styles.sectionHeaderBarRed}>
                <View style={styles.sectionDragHandleBtn}>
                  <Ionicons name="reorder-two-outline" size={17} color="#FFFFFF" />
                </View>
                <View style={styles.sectionDividerLine} />
                <View style={styles.sectionPillIconBox}>
                  <Ionicons name={newHeaderIcon} size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.sectionHeaderBarRedTitle} numberOfLines={1}>
                  {newHeaderTitle.trim() || "Nome do Bloco"}
                </Text>
                <View style={styles.sectionCountPill}>
                  <Text style={styles.sectionCountPillText}>0</Text>
                </View>
                <View style={styles.sectionHeaderActions}>
                  <View style={styles.sectionActionBtn}>
                    <Ionicons name="pencil" size={13} color="#FFFFFF" />
                  </View>
                  <View style={styles.sectionActionBtn}>
                    <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>

            {/* Botões de Ação */}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => {
                  setNewHeaderTitle("");
                  setEditingSectionId(null);
                  setShowHeaderModal(false);
                }}
              >
                <Text style={styles.dialogCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleSaveSection}>
                <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                <Text style={styles.dialogConfirmBtnText}>
                  {editingSectionId ? "Salvar Alterações" : "Criar Bloco"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: SELETOR DE CADÊNCIA */}
      <Modal
        visible={showCadencePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCadencePicker(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Selecionar Cadência</Text>
            <Text style={styles.dialogSubtitle}>
              Tempo sob tensão (Excêntrica - Isometria - Concêntrica - Pausa)
            </Text>
            <View style={styles.cadenceChipsGrid}>
              {DEFAULT_CADENCES.map((cad) => (
                <TouchableOpacity
                  key={cad}
                  style={styles.cadenceChip}
                  onPress={() => {
                    if (editingExercise) {
                      setEditingExercise({ ...editingExercise, cadence: cad });
                    }
                    setShowCadencePicker(false);
                  }}
                >
                  <Text style={styles.cadenceChipText}>{cad}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.dialogCancelBtn, { marginTop: 14 }]}
              onPress={() => setShowCadencePicker(false)}
            >
              <Text style={styles.dialogCancelBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: CATÁLOGO DE EXERCÍCIOS PARA ADIÇÃO */}
      <Modal
        visible={showCatalogModal}
        animationType="slide"
        onRequestClose={() => setShowCatalogModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.rootContainer}
        >
          {/* TOP BAR DO CATÁLOGO */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topRoundBtn}
              onPress={() => setShowCatalogModal(false)}
              activeOpacity={0.75}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color="#D90000" />
            </TouchableOpacity>

            <Text style={styles.topHeaderTitle}>Catálogo de Exercícios</Text>

            <TouchableOpacity
              style={[
                styles.topRoundBtn,
                catalogMultiSelect && { backgroundColor: "#D90000", borderColor: "#D90000" },
              ]}
              onPress={() => setCatalogMultiSelect((v) => !v)}
              activeOpacity={0.75}
              hitSlop={6}
            >
              <Ionicons
                name={catalogMultiSelect ? "checkbox" : "checkbox-outline"}
                size={20}
                color={catalogMultiSelect ? "#FFFFFF" : "#D90000"}
              />
            </TouchableOpacity>
          </View>

          {/* SOURCE TABS (SISTEMA / MEUS EXERCÍCIOS) */}
          <View style={styles.catalogSourceTabs}>
            <TouchableOpacity
              style={[
                styles.catalogSourceTab,
                catalogSource === "system" && styles.catalogSourceTabActive,
              ]}
              onPress={() => setCatalogSource("system")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="grid-outline"
                size={14}
                color={catalogSource === "system" ? "#FFFFFF" : "#888888"}
              />
              <Text
                style={[
                  styles.catalogSourceTabText,
                  catalogSource === "system" && styles.catalogSourceTabTextActive,
                ]}
              >
                Exercícios do Sistema
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.catalogSourceTab,
                catalogSource === "custom" && styles.catalogSourceTabActive,
              ]}
              onPress={() => setCatalogSource("custom")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={14}
                color={catalogSource === "custom" ? "#FFFFFF" : "#888888"}
              />
              <Text
                style={[
                  styles.catalogSourceTabText,
                  catalogSource === "custom" && styles.catalogSourceTabTextActive,
                ]}
              >
                Meus Exercícios
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR COM ÍCONE E LIMPEZA */}
          <View style={styles.catalogSearchBox}>
            <Ionicons name="search" size={18} color="#888888" />
            <TextInput
              style={styles.catalogSearchInput}
              value={catalogSearchInput}
              onChangeText={setCatalogSearchInput}
              placeholder="Pesquisar exercício..."
              placeholderTextColor="#666666"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!catalogSearchInput && (
              <TouchableOpacity
                onPress={() => setCatalogSearchInput("")}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={18} color="#888888" />
              </TouchableOpacity>
            )}
          </View>

          {/* CHIPS DE GRUPOS MUSCULARES */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catalogGroupFilterRow}
            contentContainerStyle={styles.catalogGroupFilterContent}
          >
            {MUSCLE_GROUPS.map((group) => {
              const isActive = catalogMuscleGroup === group;
              return (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.catalogGroupChip,
                    isActive && styles.catalogGroupChipActive,
                  ]}
                  onPress={() => setCatalogMuscleGroup(group)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.catalogGroupChipText,
                      isActive && styles.catalogGroupChipTextActive,
                    ]}
                  >
                    {group}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {catalogSource === "custom" && (
              <TouchableOpacity
                style={styles.createCustomExerciseBtn}
                onPress={() => openNewExerciseEditor()}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={20} color="#D90000" />
                <Text style={styles.createCustomExerciseText}>
                  + Criar Exercício Personalizado do Zero
                </Text>
              </TouchableOpacity>
            )}

            {catalogLoading && catalogItems.length === 0 && (
              <View style={styles.catalogEmptyState}>
                <ActivityIndicator color="#D90000" />
                <Text style={styles.catalogEmptyText}>Carregando exercícios...</Text>
              </View>
            )}

            {!catalogLoading && catalogItems.length === 0 && (
              <View style={styles.catalogEmptyState}>
                <Ionicons name="search-outline" size={32} color="#444" />
                <Text style={styles.catalogEmptyText}>
                  {catalogSearch
                    ? `Nenhum resultado para "${catalogSearch}".`
                    : catalogSource === "custom"
                    ? "Você ainda não tem exercícios personalizados."
                    : "Nenhum exercício encontrado."}
                </Text>
              </View>
            )}

            {catalogItems.map((item) => {
              const isSelected = !!catalogSelectedIds[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.catalogItemCard, isSelected && styles.catalogItemCardSelected]}
                  onPress={() =>
                    catalogMultiSelect ? toggleCatalogSelection(item.id) : openNewExerciseEditor(item)
                  }
                  activeOpacity={0.8}
                >
                  {catalogMultiSelect && (
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={22}
                      color={isSelected ? "#D90000" : "#666"}
                    />
                  )}
                  <Image
                    source={{
                      uri:
                        getYoutubeThumbnailUrl(item.videoUrl || "") ||
                        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200",
                    }}
                    style={styles.catalogItemThumb}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogItemName}>{item.name}</Text>
                    <Text style={styles.catalogItemCategory}>
                      {item.category}
                      {item.muscleGroups?.length ? ` • ${item.muscleGroups.join(", ")}` : ""}
                    </Text>
                    {!!item.videoUrl && (
                      <View style={styles.catalogVideoTag}>
                        <Ionicons name="play-circle-outline" size={11} color="#D90000" />
                        <Text style={styles.catalogVideoTagText}>Com vídeo</Text>
                      </View>
                    )}
                  </View>
                  {!catalogMultiSelect && <Ionicons name="add-circle" size={22} color="#D90000" />}
                </TouchableOpacity>
              );
            })}

            {catalogPageData && catalogPageData.page < catalogPageData.totalPages && (
              <TouchableOpacity
                style={styles.catalogLoadMoreBtn}
                onPress={handleLoadMoreCatalog}
                disabled={catalogLoading}
                activeOpacity={0.8}
              >
                {catalogLoading ? (
                  <ActivityIndicator color="#D90000" size="small" />
                ) : (
                  <Text style={styles.catalogLoadMoreText}>Carregar mais</Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {catalogMultiSelect && (
            <View style={styles.catalogSelectionBar}>
              <Text style={styles.catalogSelectionText}>
                {catalogSelectedCount === 0
                  ? "Nenhum exercício selecionado"
                  : `${catalogSelectedCount} exercício(s) selecionado(s)`}
              </Text>
              <TouchableOpacity
                style={[
                  styles.catalogConfirmBtn,
                  catalogSelectedCount === 0 && styles.catalogConfirmBtnDisabled,
                ]}
                onPress={confirmCatalogSelection}
                disabled={catalogSelectedCount === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.catalogConfirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );

  if (isEmbedded) {
    return editorContent;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {editorContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingBottom: 10,
    backgroundColor: "#0F0F0F",
  },
  topRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topHeaderTitle: {
    color: "#D90000",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  heroCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  heroCoverThumbWrap: {
    width: 46,
    height: 46,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333333",
    marginRight: 4,
  },
  heroCoverThumb: {
    width: "100%",
    height: "100%",
  },
  heroStudentLabel: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroWorkoutTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  heroWorkoutSubtitle: {
    color: "#888888",
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 3,
  },
  heroSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D90000",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#D90000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  heroSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroStatItem: {
    flex: 1,
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "#888888",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 3,
  },
  topTabsBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
    marginHorizontal: 10,
    marginBottom: 12,
  },
  topTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    position: "relative",
  },
  topTabItemActive: {},
  topTabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topTabText: {
    color: "#777777",
    fontSize: 13,
    fontWeight: "700",
  },
  topTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  topTabActiveIndicator: {
    position: "absolute",
    bottom: -1,
    width: "60%",
    height: 2.5,
    backgroundColor: "#D90000",
    borderRadius: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  actionBlockBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBlockBtnActive: {
    borderColor: "#D90000",
    backgroundColor: "#201010",
  },
  actionBlockBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  actionAddPrimaryBtn: {
    flex: 1.1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D90000",
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#D90000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  actionAddPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 12,
    paddingBottom: 40,
  },
  workoutListBodyContent: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 40,
  },
  tabSection: {
    gap: 12,
  },

  /* Form Fields */
  inputCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mainTitleInput: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  fieldSmallLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 2,
  },
  fieldSmallInput: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  notesTextarea: {
    color: "#CCCCCC",
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: "top",
  },

  /* Toggles */
  togglesContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  toggleRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleRowText: {
    color: "#CCCCCC",
    fontSize: 13,
    fontWeight: "700",
  },
  toggleRowWithLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentViewLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  studentViewLinkText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Week Split */
  weekSplitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3A1A1A",
    padding: 14,
    marginTop: 6,
  },
  weekSplitTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  weekSplitSub: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  /* Exercises Section */
  exerciseTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  exerciseTopAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#303030",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exerciseTopActionActive: {
    backgroundColor: "#D90000",
    borderColor: "#B30000",
  },
  exerciseTopActionText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  exerciseAddPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D90000",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exerciseAddPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  combinationActiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1414",
    borderWidth: 1,
    borderColor: "#4A1818",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  combinationBannerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  combinationBannerSub: {
    color: "#AAAAAA",
    fontSize: 11,
    marginTop: 2,
  },
  combineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E88E5",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  combineActionBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  deleteSelectedActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  deleteSelectedActionBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  cancelCombineActionBtn: {
    backgroundColor: "#333333",
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  finishCombineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E88E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  finishCombineBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222222",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  sectionIndicatorBar: {
    width: 4,
    height: 16,
    backgroundColor: "#D90000",
    borderRadius: 2,
    marginRight: 8,
  },
  sectionHeaderBarTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionDeleteBtn: {
    padding: 4,
  },
  combineCheckboxBox: {
    paddingRight: 4,
  },
  exerciseCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  exerciseCardRowSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#111C28",
  },
  combineCheckbox: {
    paddingRight: 2,
  },
  exerciseCardThumbWrap: {
    position: "relative",
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  exerciseCardThumb: {
    width: "100%",
    height: "100%",
  },
  exercisePlayOverlayIconBox: {
    position: "absolute",
    bottom: 3,
    left: 3,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 4,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCardDetails: {
    flex: 1,
    minWidth: 0,
  },
  exerciseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exerciseCardName: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  combinationTag: {
    backgroundColor: "#1E88E5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  combinationTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  exerciseCardSpecs: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  exerciseCardTouchArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exerciseRightActionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exerciseTrashBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  combinedRowActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  combinedRowTrashBtn: {
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandleBtn: {
    padding: 6,
    marginLeft: 2,
  },
  deleteExerciseFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 90, 90, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 90, 90, 0.25)",
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  deleteExerciseFooterBtnText: {
    color: "#ff5a5a",
    fontSize: 13,
    fontWeight: "800",
  },
  rowDragActive: {
    opacity: 0.98,
    borderColor: "#D90000",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 30,
    zIndex: 99999,
    transform: [{ scale: 1.03 }],
  },
  sectionHeaderBarRed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D90000",
    borderRadius: 9,
    paddingVertical: 5.5,
    paddingHorizontal: 10,
    marginVertical: 4,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionDragHandleBtn: {
    paddingRight: 2,
    paddingVertical: 1,
  },
  sectionDividerLine: {
    width: 1.5,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginRight: 2,
    borderRadius: 1,
  },
  sectionPillIconBox: {
    marginRight: 2,
  },
  sectionHeaderBarRedTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
    letterSpacing: 0.2,
  },
  sectionCountPill: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 2,
  },
  sectionCountPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  sectionActionBtn: {
    padding: 4,
    marginLeft: 2,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 6,
  },
  exercisesTabWrap: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 0,
  },
  emptySectionBox: {
    padding: 12,
    alignItems: "center",
  },
  emptySectionText: {
    color: "#666",
    fontSize: 11,
  },
  emptyWorkoutBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242424",
    marginTop: 16,
    gap: 10,
  },
  emptyWorkoutIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#201212",
    borderWidth: 1,
    borderColor: "#3A1818",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyWorkoutTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyWorkoutSubtitle: {
    color: "#888888",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyWorkoutAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D90000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: "#D90000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyWorkoutAddBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  /* Volume Tab */
  emptyVolumeBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242424",
    gap: 10,
  },
  emptyVolumeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#201212",
    borderWidth: 1,
    borderColor: "#3A1818",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyVolumeTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyVolumeSub: {
    color: "#888888",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  volumeOverviewCard: {
    flexDirection: "row",
    gap: 8,
  },
  volumeStatPill: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  volumeStatIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  volumeStatValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  volumeStatLabel: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  volumeSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 8,
  },
  volumeSectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  volumeGroupsBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  volumeGroupsBadgeText: {
    color: "#D90000",
    fontSize: 10.5,
    fontWeight: "800",
  },
  volumeStackedBarWrap: {
    marginBottom: 12,
  },
  volumeStackedBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#202020",
    overflow: "hidden",
    flexDirection: "row",
  },
  volumeMuscleCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 13,
    gap: 8,
  },
  volumeMuscleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  volumeMuscleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  volumeMuscleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  volumeMuscleName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  volumeMuscleBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  volumeSetsBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  volumeSetsBadgeText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  volumePercentBadge: {
    backgroundColor: "#222222",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  volumePercentBadgeText: {
    color: "#AAAAAA",
    fontSize: 11,
    fontWeight: "800",
  },
  volumeProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#222222",
    overflow: "hidden",
  },
  volumeProgressFill: {
    height: "100%",
    backgroundColor: "#D90000",
    borderRadius: 3,
  },
  volumeMuscleExercisesText: {
    color: "#777777",
    fontSize: 11,
    marginTop: 2,
  },
  volumeInsightCard: {
    backgroundColor: "#191212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#351818",
    padding: 14,
    marginTop: 10,
    gap: 6,
  },
  volumeInsightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  volumeInsightTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  volumeInsightText: {
    color: "#CCCCCC",
    fontSize: 11.5,
    lineHeight: 17,
  },

  /* Student Preview Tab (Screen 5) */
  studentPreviewContainer: {
    gap: 12,
  },
  studentPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  studentPreviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  studentPreviewTrainerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  studentPreviewSub: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "600",
  },
  studentPreviewBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studentPreviewStatusBadge: {
    backgroundColor: "#2A1414",
    borderWidth: 1,
    borderColor: "#D90000",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studentPreviewStatusBadgeText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  studentPreviewMetaText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  studentStartBtn: {
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  studentStartBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  coachCardContainer: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 8,
  },
  coachCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coachCardTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  coachCardBody: {
    color: "#CCCCCC",
    fontSize: 12,
    lineHeight: 17,
  },
  coachValidityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1F1414",
    borderWidth: 1,
    borderColor: "#3A1818",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  coachValidityText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  studentExercisesTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 4,
  },
  studentSectionBlock: {
    marginBottom: 6,
  },
  studentSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  studentSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  studentSectionAccentPill: {
    width: 3.5,
    height: 14,
    backgroundColor: "#D90000",
    borderRadius: 2,
  },
  studentSectionIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  studentSectionTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.1,
    flex: 1,
  },
  studentSectionCountBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  studentSectionCountBadgeText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "800",
  },
  previewComboBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  previewComboBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
  },
  studentExerciseCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 6,
  },
  studentExTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentExName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  studentCheckboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#D90000",
  },
  studentExSpecs: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
  },
  studentExObs: {
    color: "#888888",
    fontSize: 11,
    lineHeight: 16,
  },

  /* Exercise Detail / Form (Screen 2) */
  exerciseFormHeaderTitle: {
    color: "#D90000",
    fontSize: 16,
    fontWeight: "900",
  },
  cadenceTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#222222",
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  cadenceTopBtnText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  exerciseTitleInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#202020",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    minHeight: 46,
  },
  exerciseTitleInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  exerciseTitleEditIcon: {
    padding: 4,
  },
  videoBannerCard: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    height: 160,
    backgroundColor: "#000",
    position: "relative",
  },
  videoBannerImage: {
    width: "100%",
    height: "100%",
  },
  videoPlayOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayBtnSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  videoEmptyCard: {
    marginTop: 12,
    height: 100,
    borderRadius: 14,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoEmptyText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  replicateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  replicateRowText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "700",
  },
  seriesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 6,
  },
  seriesHeaderTitle: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  addSeriesBtn: {
    padding: 4,
  },
  seriesColumnsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  seriesColumnLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  seriesRowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  seriesNumberText: {
    width: 24,
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  seriesInputBox: {
    flex: 1,
    backgroundColor: "#202020",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 6,
    height: 38,
    justifyContent: "center",
  },
  seriesInputText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  seriesActionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 50,
    justifyContent: "center",
  },

  /* Dialog Overlay (Headers / Cadence) */
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  sectionDialogBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 16,
    gap: 10,
  },
  sectionDialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionDialogIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#201212",
    borderWidth: 1,
    borderColor: "#3A1818",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
  },
  sectionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingHorizontal: 8,
    height: 44,
  },
  sectionDialogInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  sectionDialogLabel: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionPresetsRail: {
    gap: 6,
    paddingVertical: 2,
  },
  sectionPresetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  sectionPresetChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  sectionPresetChipText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionPresetChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  sectionIconsGrid: {
    gap: 6,
    paddingVertical: 2,
  },
  sectionIconBtn: {
    width: 60,
    height: 52,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 2,
  },
  sectionIconBtnActive: {
    backgroundColor: "#241212",
    borderColor: "#D90000",
    borderWidth: 1.5,
  },
  sectionIconLabel: {
    color: "#777777",
    fontSize: 8.5,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionIconLabelActive: {
    color: "#D90000",
    fontWeight: "900",
  },
  sectionPreviewBox: {
    backgroundColor: "#111111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 8,
    marginTop: 2,
  },
  sectionPreviewLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  coverSectionWrap: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  coverSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverSectionTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  coverRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 90, 90, 0.12)",
  },
  coverRemoveBtnText: {
    color: "#ff5a5a",
    fontSize: 11,
    fontWeight: "800",
  },
  coverPreviewCard: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#333333",
  },
  coverPreviewImage: {
    width: "100%",
    height: "100%",
  },
  coverOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverChangePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coverChangePillText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  coverUploadCard: {
    width: "100%",
    height: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#333333",
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 4,
  },
  coverUploadIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  coverUploadTitle: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "900",
  },
  coverUploadSub: {
    color: "#777777",
    fontSize: 10.5,
    textAlign: "center",
  },
  coverPresetsLabel: {
    color: "#777777",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  coverPresetsRail: {
    gap: 8,
    paddingVertical: 2,
  },
  coverPresetCard: {
    width: 90,
    height: 62,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#161616",
  },
  coverPresetCardSelected: {
    borderColor: "#D90000",
    borderWidth: 2,
  },
  coverPresetImage: {
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  coverPresetCheckBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  coverPresetLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "800",
    paddingHorizontal: 4,
    paddingVertical: 2,
    textAlign: "center",
  },
  dialogBox: {
    width: "100%",
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    padding: 16,
  },
  dialogTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  dialogSubtitle: {
    color: "#888888",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  dialogInput: {
    backgroundColor: "#121212",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
    height: 42,
    marginTop: 12,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogCancelBtnText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  dialogConfirmBtn: {
    backgroundColor: "#D90000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  cadenceChipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  cadenceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
  },
  cadenceChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Catalog */
  catalogSourceTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 4,
    gap: 6,
  },
  catalogSourceTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  catalogSourceTabActive: {
    backgroundColor: "#D90000",
    shadowColor: "#D90000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  catalogSourceTabText: {
    color: "#888888",
    fontSize: 12.5,
    fontWeight: "700",
  },
  catalogSourceTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  catalogSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  catalogSearchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "600",
    paddingVertical: 0,
  },
  catalogGroupFilterRow: {
    marginBottom: 14,
    flexGrow: 0,
  },
  catalogGroupFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  catalogGroupChip: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catalogGroupChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
    shadowColor: "#D90000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  catalogGroupChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  catalogGroupChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  catalogEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  catalogEmptyText: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  catalogVideoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  catalogVideoTagText: {
    color: "#D90000",
    fontSize: 10.5,
    fontWeight: "800",
  },
  catalogLoadMoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 24,
  },
  catalogLoadMoreText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "800",
  },
  catalogSelectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#141414",
    borderTopWidth: 1,
    borderTopColor: "#242424",
  },
  catalogSelectionText: {
    color: "#CCCCCC",
    fontSize: 13,
    fontWeight: "700",
  },
  catalogConfirmBtn: {
    backgroundColor: "#D90000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#D90000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  catalogConfirmBtnDisabled: {
    opacity: 0.4,
  },
  catalogConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  catalogItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    marginBottom: 8,
  },
  catalogItemThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#222",
  },
  catalogItemName: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  catalogItemCategory: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  catalogItemCardSelected: {
    borderColor: "#D90000",
    backgroundColor: "#1C1010",
  },
  createCustomExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D90000",
    borderStyle: "dashed",
    paddingVertical: 14,
    marginBottom: 14,
  },
  createCustomExerciseText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "800",
  },

  /* PDF Share Banner */
  pdfShareBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1414",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginTop: 6,
  },
  pdfShareIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfShareTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  pdfShareSub: {
    color: "#999999",
    fontSize: 11,
    marginTop: 2,
  },

  /* Combined Cards */
  combinedCardWrapper: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2E1A1A",
    marginBottom: 10,
    overflow: "hidden",
  },
  combinedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#201212",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2E1A1A",
  },
  combinedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  combinedIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#331414",
    alignItems: "center",
    justifyContent: "center",
  },
  combinedTitleBlock: {
    flex: 1,
  },
  combinedBadgeText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  combinedCountSub: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  combinedHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uncombineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2E1414",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4A1C1C",
  },
  uncombineActionBtnText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  combinedExercisesBody: {
    padding: 10,
    gap: 8,
  },
  combinedExerciseRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 10,
  },
  combinedConnectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    gap: 8,
  },
  combinedConnectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#331E1E",
  },
  combinedPlusBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2E1414",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D90000",
  },
  combinedRowEditBtn: {
    padding: 6,
  },
});
