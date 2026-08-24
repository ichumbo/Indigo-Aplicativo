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
import * as WebBrowser from "expo-web-browser";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
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
import { shareWorkoutAsPdf } from "@/services/workout-pdf-service";

const UNASSIGNED_SECTION_ID = "__unassigned__";

type WorkoutRow =
  | { rowId: string; kind: "section"; section: WorkoutSectionHeader }
  | { rowId: string; kind: "exercise"; exercise: WorkoutExerciseItem }
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
};

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
  const [info, setInfo] = useState<WorkoutGeneralInfo>({
    name: initialInfo?.name || "Treino A - Peitoral e Tríceps",
    startDate: initialInfo?.startDate || new Date().toISOString().slice(0, 10),
    endDate:
      initialInfo?.endDate ||
      new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    notes: initialInfo?.notes || "Priorize técnica e controle excêntrico em cada série.",
    releaseToStudent: initialInfo?.releaseToStudent ?? true,
    notifyExpiration: initialInfo?.notifyExpiration ?? true,
    splitByWeekDay: initialInfo?.splitByWeekDay ?? false,
    recommendedDays: initialInfo?.recommendedDays || ["Segunda", "Quarta", "Sexta"],
  });

  // Sections State (Cabeçalhos)
  const [sections, setSections] = useState<WorkoutSectionHeader[]>(
    initialSections && initialSections.length > 0
      ? initialSections
      : [
          { id: "sec-1", title: "Aquecimento & Mobilidade", order: 0 },
          { id: "sec-2", title: "Core & Abdominais", order: 1 },
          { id: "sec-3", title: "Força Principal", order: 2 },
        ]
  );

  // Exercises State
  const [exercises, setExercises] = useState<WorkoutExerciseItem[]>(
    initialExercises && initialExercises.length > 0
      ? initialExercises
      : [
          {
            id: "ex-1",
            name: "Abdominal abre e fecha com elástico",
            category: "Core",
            muscleGroup: "Abdômen",
            videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
            thumbnailUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300",
            observation: "Manter abdômen contraído e pernas estendidas.",
            cadence: "3-0-1-0",
            sectionId: "sec-2",
            sets: [
              { id: "s-1", setNumber: 1, reps: "10 a 12", load: "20 kg", restSeconds: 90 },
              { id: "s-2", setNumber: 2, reps: "10 a 12", load: "20 kg", restSeconds: 90 },
              { id: "s-3", setNumber: 3, reps: "10 a 12", load: "20 kg", restSeconds: 90 },
            ],
          },
          {
            id: "ex-2",
            name: "Abdominal Bicicleta",
            category: "Core",
            muscleGroup: "Abdômen",
            videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
            thumbnailUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300",
            observation: "Giro de tronco controlado sem puxar o pescoço.",
            cadence: "2-0-2-0",
            sectionId: "sec-2",
            sets: [
              { id: "s-4", setNumber: 1, reps: "10 a 12", load: "Corporal", restSeconds: 90 },
              { id: "s-5", setNumber: 2, reps: "10 a 12", load: "Corporal", restSeconds: 90 },
              { id: "s-6", setNumber: 3, reps: "10 a 12", load: "Corporal", restSeconds: 90 },
            ],
          },
          {
            id: "ex-3",
            name: "Supino Reto com Barra",
            category: "Peitoral",
            muscleGroup: "Peitoral",
            videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
            thumbnailUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300",
            observation: "Manter escápulas aduzidas e descida controlada até o peito.",
            cadence: "3-0-1-0",
            sectionId: "sec-3",
            sets: [
              { id: "s-7", setNumber: 1, reps: "8 a 10", load: "70 kg", restSeconds: 90 },
              { id: "s-8", setNumber: 2, reps: "8 a 10", load: "75 kg", restSeconds: 90 },
              { id: "s-9", setNumber: 3, reps: "6 a 8", load: "80 kg", restSeconds: 120 },
              { id: "s-10", setNumber: 4, reps: "6 a 8", load: "80 kg", restSeconds: 120 },
            ],
          },
        ]
  );

  // Combination Mode State
  const [isCombinationMode, setIsCombinationMode] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState<Record<string, boolean>>({});

  // Header Creation Modal State
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [newHeaderTitle, setNewHeaderTitle] = useState("");

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

  const handleAddSection = () => {
    if (!newHeaderTitle.trim()) {
      Alert.alert("Título Obrigatório", "Informe o nome do cabeçalho de seção.");
      return;
    }
    const newSec: WorkoutSectionHeader = {
      id: `sec-${Date.now()}`,
      title: newHeaderTitle.trim(),
      order: sections.length,
    };
    setSections([...sections, newSec]);
    setNewHeaderTitle("");
    setShowHeaderModal(false);
  };

  // Linhas arrastáveis: cabeçalhos de seção + exercícios combinados em uma única lista
  const workoutRows = useMemo<WorkoutRow[]>(() => {
    const out: WorkoutRow[] = [];

    sections.forEach((section) => {
      out.push({ rowId: `section-${section.id}`, kind: "section", section });
      const sectionExercises = exercises.filter((e) => e.sectionId === section.id);
      if (sectionExercises.length === 0) {
        out.push({ rowId: `empty-${section.id}`, kind: "empty", sectionId: section.id });
      } else {
        sectionExercises.forEach((exercise) =>
          out.push({ rowId: `exercise-${exercise.id}`, kind: "exercise", exercise })
        );
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
      unassigned.forEach((exercise) =>
        out.push({ rowId: `exercise-${exercise.id}`, kind: "exercise", exercise })
      );
    }

    return out;
  }, [sections, exercises]);

  const handleWorkoutRowsReorder = (data: WorkoutRow[]) => {
    const newSections: WorkoutSectionHeader[] = [];
    const newExercises: WorkoutExerciseItem[] = [];
    let currentSectionId: string | undefined;

    data.forEach((row) => {
      if (row.kind === "section") {
        if (row.section.id !== UNASSIGNED_SECTION_ID) {
          newSections.push({ ...row.section, order: newSections.length });
        }
        currentSectionId = row.section.id === UNASSIGNED_SECTION_ID ? undefined : row.section.id;
      } else if (row.kind === "exercise") {
        newExercises.push({ ...row.exercise, sectionId: currentSectionId });
      }
    });

    setSections(newSections);
    setExercises(newExercises);
  };

  const editSectionTitle = (secId: string, newTitle: string) => {
    setSections(sections.map((s) => (s.id === secId ? { ...s, title: newTitle } : s)));
  };

  const deleteSection = (secId: string) => {
    setSections(sections.filter((s) => s.id !== secId));
    setExercises(
      exercises.map((e) => (e.sectionId === secId ? { ...e, sectionId: undefined } : e))
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

    setExercises(
      exercises.map((ex) => {
        if (selectedIds.includes(ex.id)) {
          return {
            ...ex,
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
    const estimatedMinutes = exercises.reduce((acc, ex) => {
      const exRest = ex.sets.reduce((rAcc, s) => rAcc + (s.restSeconds || 60), 0);
      const exExecTime = ex.sets.length * 45;
      return acc + (exRest + exExecTime) / 60;
    }, 5);

    const muscleMap: Record<string, number> = {};
    exercises.forEach((ex) => {
      const group = ex.muscleGroup || "Geral";
      muscleMap[group] = (muscleMap[group] || 0) + ex.sets.length;
    });

    return {
      totalExercises: exercises.length,
      totalSets,
      estimatedMinutes: Math.round(estimatedMinutes),
      muscleMap,
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
        <View style={styles.emptySectionBox}>
          <Text style={styles.emptySectionText}>Nenhum exercício neste bloco.</Text>
        </View>
      );
    }

    if (item.kind === "section") {
      const isUnassigned = item.section.id === UNASSIGNED_SECTION_ID;
      return (
        <View style={[styles.sectionHeaderBar, isActive && styles.rowDragActive]}>
          {!isUnassigned && !isCombinationMode && (
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={180}
              hitSlop={8}
              style={styles.dragHandleBtn}
            >
              <Ionicons name="reorder-three" size={20} color="#666" />
            </TouchableOpacity>
          )}
          <View style={styles.sectionIndicatorBar} />
          <Text style={styles.sectionHeaderBarTitle}>{item.section.title}</Text>

          {!isUnassigned && (
            <View style={styles.sectionHeaderActions}>
              <TouchableOpacity
                onPress={() => deleteSection(item.section.id)}
                hitSlop={8}
                style={styles.sectionDeleteBtn}
              >
                <Ionicons name="close" size={16} color="#777" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    const ex = item.exercise;
    const isSelected = !!selectedForCombine[ex.id];

    return (
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
          <Image
            source={{
              uri:
                ex.thumbnailUrl ||
                (ex.videoUrl ? getYoutubeThumbnailUrl(ex.videoUrl) : undefined) ||
                "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200",
            }}
            style={styles.exerciseCardThumb}
          />

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
              {ex.sets.length} Séries | Rep: {ex.sets[0]?.reps || "10 a 12"} | Intervalo: {ex.sets[0]?.restSeconds || 60}s
            </Text>
          </View>
        </TouchableOpacity>

        {!isCombinationMode && (
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={180}
            hitSlop={8}
            style={styles.dragHandleBtn}
          >
            <Ionicons name="reorder-three" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const editorContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.rootContainer}
    >
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={onClose} activeOpacity={0.75} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#D90000" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Image
            source={{ uri: studentAvatar || "https://i.pravatar.cc/150?img=11" }}
            style={styles.topAvatar}
          />
          <Text style={styles.topStudentName} numberOfLines={1}>
            {studentName}
          </Text>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.topBarBtn} onPress={handleExportPdf} activeOpacity={0.75} hitSlop={6}>
            <Ionicons name="document-text-outline" size={20} color="#D90000" />
          </TouchableOpacity>
          {onDuplicate && (
            <TouchableOpacity style={styles.topBarBtn} onPress={onDuplicate} activeOpacity={0.75} hitSlop={6}>
              <Ionicons name="copy-outline" size={20} color="#D90000" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.topBarBtn} onPress={handleGlobalSave} activeOpacity={0.75} hitSlop={6}>
            <Ionicons name="checkmark-sharp" size={24} color="#D90000" />
          </TouchableOpacity>
        </View>
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

          {/* Quick Actions Rail */}
          <View style={styles.exerciseTopBar}>
            <TouchableOpacity
              style={styles.exerciseTopAction}
              onPress={() => setShowHeaderModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-outline" size={16} color="#D90000" />
              <Text style={styles.exerciseTopActionText}>+ Cabeçalho</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.exerciseTopAction,
                isCombinationMode && styles.exerciseTopActionActive,
              ]}
              onPress={() => setIsCombinationMode(!isCombinationMode)}
              activeOpacity={0.8}
            >
              <Ionicons name="git-compare-outline" size={16} color={isCombinationMode ? "#fff" : "#D90000"} />
              <Text style={[styles.exerciseTopActionText, isCombinationMode && { color: "#fff" }]}>
                {isCombinationMode ? "Fechar Combinar" : "Combinar"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exerciseAddPrimaryBtn}
              onPress={() => setShowCatalogModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.exerciseAddPrimaryBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {/* Lista arrastável: cabeçalhos + exercícios em uma única lista reordenável */}
          <DraggableFlatList
            data={workoutRows}
            keyExtractor={(row) => row.rowId}
            renderItem={renderWorkoutRow}
            onDragEnd={({ data }) => handleWorkoutRowsReorder(data)}
            containerStyle={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            activationDistance={12}
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
                    onChangeText={(val) => setInfo({ ...info, startDate: val })}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
              <View style={styles.colHalf}>
                <View style={styles.inputCard}>
                  <Text style={styles.fieldSmallLabel}>Término</Text>
                  <TextInput
                    style={styles.fieldSmallInput}
                    value={info.endDate}
                    onChangeText={(val) => setInfo({ ...info, endDate: val })}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#666"
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
                <Text style={styles.weekSplitSub}>Mostra o "treino de hoje" pro aluno</Text>
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
            <View style={styles.volumeOverviewCard}>
              <View style={styles.volumeStatPill}>
                <Text style={styles.volumeStatValue}>{volumeStats.totalExercises}</Text>
                <Text style={styles.volumeStatLabel}>EXERCÍCIOS</Text>
              </View>
              <View style={styles.volumeStatPill}>
                <Text style={styles.volumeStatValue}>{volumeStats.totalSets}</Text>
                <Text style={styles.volumeStatLabel}>TOTAL SÉRIES</Text>
              </View>
              <View style={styles.volumeStatPill}>
                <Text style={styles.volumeStatValue}>{volumeStats.estimatedMinutes}m</Text>
                <Text style={styles.volumeStatLabel}>DURAÇÃO ESTIMADA</Text>
              </View>
            </View>

            <Text style={styles.volumeSectionTitle}>Séries por Grupo Muscular</Text>
            <View style={styles.volumeBreakdownCard}>
              {Object.entries(volumeStats.muscleMap).map(([group, count]) => {
                const percent = Math.round((count / Math.max(volumeStats.totalSets, 1)) * 100);
                return (
                  <View key={group} style={styles.volumeMuscleRow}>
                    <View style={styles.volumeMuscleInfo}>
                      <Text style={styles.volumeMuscleName}>{group}</Text>
                      <Text style={styles.volumeMuscleCount}>{count} séries ({percent}%)</Text>
                    </View>
                    <View style={styles.volumeProgressBar}>
                      <View
                        style={[
                          styles.volumeProgressFill,
                          { width: `${Math.min(percent, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 4: VISÃO DO ALUNO (SCREEN 5) */}
        {activeTab === "student-preview" && (
          <View style={styles.studentPreviewContainer}>
            <View style={styles.studentPreviewHeader}>
              <Image
                source={{ uri: studentAvatar || "https://i.pravatar.cc/150?img=32" }}
                style={styles.studentPreviewAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.studentPreviewTrainerName}>Personal Indigo</Text>
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
            {exercises.map((ex) => (
              <View key={ex.id} style={styles.studentExerciseCard}>
                <View style={styles.studentExTopRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons name="barbell" size={18} color="#D90000" />
                    <Text style={styles.studentExName}>{ex.name}</Text>
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
            ))}
          </View>
        )}
      </ScrollView>
      )}

      {/* BOTTOM TOOLBAR / TABS (SCREEN 1, 3, 4) */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity
          style={styles.toolTabBtn}
          onPress={() => setActiveTab("edit")}
          activeOpacity={0.75}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={activeTab === "edit" ? "#D90000" : "#777"}
          />
          <Text style={[styles.toolTabText, activeTab === "edit" && styles.toolTabTextActive]}>
            Editar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolTabBtn}
          onPress={() => setActiveTab("exercises")}
          activeOpacity={0.75}
        >
          <Ionicons
            name="fitness-outline"
            size={20}
            color={activeTab === "exercises" ? "#D90000" : "#777"}
          />
          <Text style={[styles.toolTabText, activeTab === "exercises" && styles.toolTabTextActive]}>
            Exercícios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolTabBtn}
          onPress={() => {
            setActiveTab("exercises");
            setShowHeaderModal(true);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="folder-outline" size={20} color="#777" />
          <Text style={styles.toolTabText}>Cabeçalho</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolTabBtn}
          onPress={() => {
            setActiveTab("exercises");
            setIsCombinationMode(!isCombinationMode);
          }}
          activeOpacity={0.75}
        >
          <Ionicons
            name="git-compare-outline"
            size={20}
            color={isCombinationMode ? "#D90000" : "#777"}
          />
          <Text style={[styles.toolTabText, isCombinationMode && styles.toolTabTextActive]}>
            Combinar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolTabBtn}
          onPress={() => setActiveTab("volume")}
          activeOpacity={0.75}
        >
          <Ionicons
            name="pie-chart-outline"
            size={20}
            color={activeTab === "volume" ? "#D90000" : "#777"}
          />
          <Text style={[styles.toolTabText, activeTab === "volume" && styles.toolTabTextActive]}>
            Volume
          </Text>
        </TouchableOpacity>
      </View>

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

              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={saveEditingExercise}
                activeOpacity={0.75}
              >
                <Ionicons name="checkmark-sharp" size={24} color="#D90000" />
              </TouchableOpacity>
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
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* MODAL 2: ADICIONAR CABEÇALHO (SECTION) */}
      <Modal
        visible={showHeaderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Novo Cabeçalho de Seção</Text>
            <Text style={styles.dialogSubtitle}>
              Crie um divisor para organizar o treino (ex: Core, Aquecimento, Super-série).
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={newHeaderTitle}
              onChangeText={setNewHeaderTitle}
              placeholder="Ex: Core / Peitoral / Aquecimento"
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => {
                  setNewHeaderTitle("");
                  setShowHeaderModal(false);
                }}
              >
                <Text style={styles.dialogCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleAddSection}>
                <Text style={styles.dialogConfirmBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topBarBtn}
              onPress={() => setShowCatalogModal(false)}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={22} color="#D90000" />
            </TouchableOpacity>
            <Text style={styles.exerciseFormHeaderTitle}>Catálogo de Exercícios</Text>
            <TouchableOpacity
              style={styles.topBarBtn}
              onPress={() => setCatalogMultiSelect((v) => !v)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={catalogMultiSelect ? "checkbox" : "checkbox-outline"}
                size={22}
                color="#D90000"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.catalogSourceTabs}>
            <TouchableOpacity
              style={[styles.catalogSourceTab, catalogSource === "system" && styles.catalogSourceTabActive]}
              onPress={() => setCatalogSource("system")}
            >
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
              style={[styles.catalogSourceTab, catalogSource === "custom" && styles.catalogSourceTabActive]}
              onPress={() => setCatalogSource("custom")}
            >
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

          <View style={styles.catalogSearchBox}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              style={styles.catalogSearchInput}
              value={catalogSearchInput}
              onChangeText={setCatalogSearchInput}
              placeholder="Pesquisar exercício..."
              placeholderTextColor="#666"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catalogGroupFilterRow}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {MUSCLE_GROUPS.map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  styles.catalogGroupChip,
                  catalogMuscleGroup === group && styles.catalogGroupChipActive,
                ]}
                onPress={() => setCatalogMuscleGroup(group)}
              >
                <Text
                  style={[
                    styles.catalogGroupChipText,
                    catalogMuscleGroup === group && styles.catalogGroupChipTextActive,
                  ]}
                >
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
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
    backgroundColor: "#121212",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: "#161616",
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  topBarBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginLeft: 6,
  },
  topAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#222",
  },
  topStudentName: {
    color: "#D90000",
    fontSize: 15,
    fontWeight: "900",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
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

  /* Bottom Tool / Tab Bar */
  bottomToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#161616",
    borderTopWidth: 1,
    borderTopColor: "#222222",
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
  },
  toolTabBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 60,
  },
  toolTabText: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
  },
  toolTabTextActive: {
    color: "#D90000",
    fontWeight: "900",
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
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  exerciseCardRowSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#111C28",
  },
  combineCheckbox: {
    paddingRight: 2,
  },
  exerciseCardThumb: {
    width: 50,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#222",
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
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
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
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  exerciseCardTouchArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dragHandleBtn: {
    padding: 6,
    marginLeft: 2,
  },
  rowDragActive: {
    opacity: 0.9,
    borderColor: "#D90000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  exercisesTabWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptySectionBox: {
    padding: 12,
    alignItems: "center",
  },
  emptySectionText: {
    color: "#666",
    fontSize: 11,
  },

  /* Volume Tab */
  volumeOverviewCard: {
    flexDirection: "row",
    gap: 8,
  },
  volumeStatPill: {
    flex: 1,
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  volumeStatValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  volumeStatLabel: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  volumeSectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
  },
  volumeBreakdownCard: {
    backgroundColor: "#181818",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 12,
  },
  volumeMuscleRow: {
    gap: 4,
  },
  volumeMuscleInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  volumeMuscleName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  volumeMuscleCount: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  volumeProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#262626",
    overflow: "hidden",
  },
  volumeProgressFill: {
    height: "100%",
    backgroundColor: "#D90000",
    borderRadius: 3,
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
    padding: 20,
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
  catalogSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 10,
    height: 40,
  },
  catalogSearchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  catalogSourceTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 3,
  },
  catalogSourceTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  catalogSourceTabActive: {
    backgroundColor: "#D90000",
  },
  catalogSourceTabText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
  },
  catalogSourceTabTextActive: {
    color: "#fff",
  },
  catalogGroupFilterRow: {
    marginBottom: 10,
    flexGrow: 0,
  },
  catalogGroupChip: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  catalogGroupChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  catalogGroupChipText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  catalogGroupChipTextActive: {
    color: "#fff",
  },
  catalogEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  catalogEmptyText: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
  },
  catalogVideoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  catalogVideoTagText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "700",
  },
  catalogLoadMoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 20,
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
    paddingVertical: 12,
    backgroundColor: "#161616",
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  catalogSelectionText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "700",
  },
  catalogConfirmBtn: {
    backgroundColor: "#D90000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  catalogConfirmBtnDisabled: {
    opacity: 0.4,
  },
  catalogConfirmBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  catalogItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    marginBottom: 8,
  },
  catalogItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  catalogItemName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  catalogItemCategory: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
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
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D90000",
    borderStyle: "dashed",
    paddingVertical: 12,
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
});
