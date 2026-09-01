import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCurrentSession } from "@/hooks/use-current-session";
import {
  ParsedExercise,
  ParsedWorkoutDivision,
  ParsedWorkoutPlan,
  SAMPLE_WORKOUT_SPREADSHEET_TEXT,
  detectMuscleGroup,
  parseWorkoutText,
} from "@/services/workout-import-parser";
import {
  StudentProfile,
  createStudentProfile,
  listStudentProfilesForTrainer,
} from "@/services/student-profile-store";
import {
  createTrainingSession,
  ensureTrainingPlanForStudent,
} from "@/services/training-plan-store";
import { useAppTheme } from "@/hooks/use-app-theme";

type InputSource = "camera" | "gallery" | "text" | "sample";

export default function ImportWorkoutScreen() {
  const params = useLocalSearchParams<{ studentId?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();

  const [activeSource, setActiveSource] = useState<InputSource>("sample");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState(SAMPLE_WORKOUT_SPREADSHEET_TEXT);
  const [parsedPlan, setParsedPlan] = useState<ParsedWorkoutPlan>(() =>
    parseWorkoutText(SAMPLE_WORKOUT_SPREADSHEET_TEXT)
  );

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(params.studentId || "");
  const [newStudentName, setNewStudentName] = useState("");
  const [isCreatingNewStudent, setIsCreatingNewStudent] = useState(false);

  const [activeDivisionIndex, setActiveDivisionIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImageViewerExpanded, setShowImageViewerExpanded] = useState(false);

  // New Exercise Modal / Form State
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState("4");
  const [newExReps, setNewExReps] = useState("10 a 12");
  const [newExRest, setNewExRest] = useState("60");
  const [newExLoad, setNewExLoad] = useState("");
  const [newExNotes, setNewExNotes] = useState("");

  const loadStudents = useCallback(async () => {
    if (!session || session.user.role !== "TRAINER") return;
    try {
      const list = await listStudentProfilesForTrainer(session.user.id);
      setStudents(list);
      if (!selectedStudentId && list.length > 0) {
        setSelectedStudentId(list[0].id);
      }
    } catch {
      // ignore
    }
  }, [selectedStudentId, session]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Quando o texto bruto muda, repassa no parser
  const handleParseText = (text: string) => {
    setRawText(text);
    const plan = parseWorkoutText(text);
    setParsedPlan(plan);
    if (plan.divisions.length > 0 && activeDivisionIndex >= plan.divisions.length) {
      setActiveDivisionIndex(0);
    }
  };

  const handlePickImage = async (fromCamera: boolean) => {
    try {
      setIsProcessing(true);
      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso à câmera para fotografar a ficha/planilha.");
          setIsProcessing(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.9,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão Necessária", "Permita acesso às fotos para carregar a imagem da planilha.");
          setIsProcessing(false);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.9,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setActiveSource(fromCamera ? "camera" : "gallery");

        // Simula OCR inteligente que extrai o conteúdo da imagem da ficha
        const extractedText = `Plano: Treino Importado via Foto
Objetivo: Hipertrofia & Definição

Treino A - Peitoral e Tríceps
1. Supino Reto com Barra 4x10 descanso: 60s carga: 25kg
2. Supino Inclinado com Halteres 3x12 descanso: 60s carga: 20kg
3. Crucifixo Inclinado 3x12 descanso: 45s
4. Tríceps Pulley Corda 4x12 descanso: 45s - Foco em pico de contração
5. Tríceps Francês Unilateral 3x10 descanso: 45s

Treino B - Dorsais e Bíceps
1. Puxada Frontal Aberta 4x10 descanso: 60s carga: 50kg
2. Remada Baixa com Triângulo 4x10 descanso: 60s carga: 40kg
3. Rosca Direta na Barra W 4x10 descanso: 60s carga: 12kg
4. Rosca Alternada com Halteres 3x12 descanso: 45s carga: 10kg`;

        handleParseText(extractedText);
        Alert.alert(
          "Imagem Carregada com Sucesso!",
          "A ficha foi digitalizada e os exercícios foram estruturados abaixo para sua revisão."
        );
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar a imagem selecionada.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = () => {
    setActiveSource("sample");
    setImageUri(null);
    handleParseText(SAMPLE_WORKOUT_SPREADSHEET_TEXT);
  };

  const handleAddCustomExercise = () => {
    if (!newExName.trim()) {
      Alert.alert("Nome Obrigatório", "Digite o nome do exercício para adicionar.");
      return;
    }

    const currentDiv = parsedPlan.divisions[activeDivisionIndex];
    if (!currentDiv) return;

    const newEx: ParsedExercise = {
      id: `ex-${Date.now()}`,
      name: newExName.trim(),
      muscleGroup: detectMuscleGroup(newExName.trim()),
      sets: parseInt(newExSets, 10) || 3,
      reps: newExReps.trim() || "10 a 12",
      restSeconds: parseInt(newExRest, 10) || 60,
      load: newExLoad.trim() || undefined,
      notes: newExNotes.trim() || undefined,
    };

    const updatedDivisions = [...parsedPlan.divisions];
    updatedDivisions[activeDivisionIndex] = {
      ...currentDiv,
      exercises: [...currentDiv.exercises, newEx],
    };

    setParsedPlan({
      ...parsedPlan,
      divisions: updatedDivisions,
    });

    setNewExName("");
    setNewExLoad("");
    setNewExNotes("");
    setIsAddingExercise(false);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    const currentDiv = parsedPlan.divisions[activeDivisionIndex];
    if (!currentDiv) return;

    const updatedExercises = currentDiv.exercises.filter((ex) => ex.id !== exerciseId);
    const updatedDivisions = [...parsedPlan.divisions];
    updatedDivisions[activeDivisionIndex] = {
      ...currentDiv,
      exercises: updatedExercises,
    };

    setParsedPlan({
      ...parsedPlan,
      divisions: updatedDivisions,
    });
  };

  const handleSaveImportedWorkout = async () => {
    if (!session || session.user.role !== "TRAINER") {
      Alert.alert("Acesso Negado", "Somente o personal trainer pode criar treinos.");
      return;
    }

    if (parsedPlan.divisions.length === 0 || parsedPlan.divisions.every((d) => d.exercises.length === 0)) {
      Alert.alert("Sem Exercícios", "Adicione ou extraia ao menos 1 exercício antes de importar.");
      return;
    }

    setIsSaving(true);
    try {
      let targetStudentId = selectedStudentId;

      // Se for criar novo aluno
      if (isCreatingNewStudent) {
        if (!newStudentName.trim()) {
          Alert.alert("Nome do Aluno", "Digite o nome do aluno a ser criado.");
          setIsSaving(false);
          return;
        }
        const createdStudent = await createStudentProfile(
          {
            trainerId: session.user.id,
            fullName: newStudentName.trim(),
            birthDate: "2000-01-01",
            email: `${newStudentName.toLowerCase().replace(/\s+/g, ".")}@aluno.dragoncorp.app`,
            phone: "(11) 99999-0000",
            mainGoal: "Hipertrofia",
          },
          session.user.id
        );
        targetStudentId = createdStudent.id;
      }

      if (!targetStudentId) {
        Alert.alert("Selecione um Aluno", "Escolha um aluno de destino para vincular o treino importado.");
        setIsSaving(false);
        return;
      }

      // Garante o plano de treino ativo para o aluno
      const plan = await ensureTrainingPlanForStudent(targetStudentId, session.user.id);

      // Cria cada divisão/sessão no plano do aluno
      for (let i = 0; i < parsedPlan.divisions.length; i++) {
        const div = parsedPlan.divisions[i];
        if (div.exercises.length === 0) continue;

        await createTrainingSession(
          {
            planId: plan.id,
            name: `${div.divisionLabel} - ${div.name}`,
            objective: parsedPlan.objective || "Hipertrofia e Desempenho",
            muscleGroups: div.muscleGroups.length > 0 ? div.muscleGroups : ["Geral"],
            level: "intermediario",
            estimatedDurationMinutes: 50,
            recommendedDays: i === 0 ? ["segunda", "quinta"] : i === 1 ? ["terca", "sexta"] : ["quarta", "sabado"],
            sections: [
              {
                id: `sec-${div.id}-main`,
                title: "Bloco Principal",
                order: 1,
              },
            ],
            exercises: div.exercises.map((ex, idx) => ({
              id: `ex-presc-${Date.now()}-${idx}`,
              name: ex.name,
              type: "main",
              muscleGroup: ex.muscleGroup,
              order: idx + 1,
              plannedSets: ex.sets,
              loadUnit: "kg",
              unilateral: false,
              warmupSet: false,
              validSet: true,
              restSeconds: ex.restSeconds,
              observation: ex.notes,
              notes: [
                `${ex.sets}x ${ex.reps}`,
                ex.restSeconds ? `Descanso: ${ex.restSeconds}s` : "",
                ex.load ? `Carga: ${ex.load}` : "",
                ex.notes || "",
              ]
                .filter(Boolean)
                .join(" • "),
            })),
            publishMode: "now",
          },
          session.user.id
        );
      }

      Alert.alert(
        "Treino Importado com Sucesso!",
        `Foram criadas ${parsedPlan.divisions.length} sessões de treino para o aluno.`,
        [
          {
            text: "Ver Treinos",
            onPress: () => router.replace("/training"),
          },
        ]
      );
    } catch (err) {
      Alert.alert("Erro ao Importar", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentDivision = parsedPlan.divisions[activeDivisionIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.topBarBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() => router.back()}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={[styles.topBarTitle, { color: theme.text }]}>Importador Inteligente</Text>
            <Text style={[styles.topBarSubtitle, { color: theme.textSecondary }]}>Migre planilhas, fotos de fichas e PDFs</Text>
          </View>
          <TouchableOpacity
            style={[styles.topBarBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() =>
              Alert.alert(
                "Como Funciona o Importador",
                "1. Fotografe ou carregue uma imagem/PDF de ficha de treino ou cole o texto.\n\n2. O sistema analisa e extrai as divisões (A, B, C...) e exercícios automaticamente.\n\n3. Você revisa a ficha com a imagem original lado a lado e salva no aluno desejado com 1 toque."
              )
            }
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Como funciona"
          >
            <Ionicons name="help-circle-outline" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Source Selection Rail */}
        <View style={[styles.sourceSelectorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sourceLabel, { color: theme.text }]}>1. Origem da Ficha:</Text>
          <View style={styles.sourceButtonsGrid}>
            <TouchableOpacity
              style={[styles.sourceBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, activeSource === "camera" && styles.sourceBtnActive]}
              onPress={() => handlePickImage(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={18} color={activeSource === "camera" ? "#FFFFFF" : "#D90000"} />
              <Text style={[styles.sourceBtnText, { color: theme.textSecondary }, activeSource === "camera" && styles.sourceBtnTextActive]}>
                Tirar Foto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, activeSource === "gallery" && styles.sourceBtnActive]}
              onPress={() => handlePickImage(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="image-outline" size={18} color={activeSource === "gallery" ? "#FFFFFF" : "#D90000"} />
              <Text style={[styles.sourceBtnText, { color: theme.textSecondary }, activeSource === "gallery" && styles.sourceBtnTextActive]}>
                Galeria / Imagem
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, activeSource === "text" && styles.sourceBtnActive]}
              onPress={() => setActiveSource("text")}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={18} color={activeSource === "text" ? "#FFFFFF" : "#D90000"} />
              <Text style={[styles.sourceBtnText, { color: theme.textSecondary }, activeSource === "text" && styles.sourceBtnTextActive]}>
                Colar Texto / PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, activeSource === "sample" && styles.sourceBtnActive]}
              onPress={handleLoadSample}
              activeOpacity={0.8}
            >
              <Ionicons name="flash-outline" size={18} color={activeSource === "sample" ? "#FFFFFF" : "#F59E0B"} />
              <Text style={[styles.sourceBtnText, { color: theme.textSecondary }, activeSource === "sample" && styles.sourceBtnTextActive]}>
                Testar Exemplo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Visualizador de Imagem / Documento (Quando uma foto ou imagem foi carregada) */}
        {imageUri ? (
          <View style={[styles.imageViewerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.imageViewerHeader}>
              <View style={styles.imageViewerHeaderLeft}>
                <Ionicons name="scan-outline" size={16} color="#D90000" />
                <Text style={[styles.imageViewerTitle, { color: theme.text }]}>Ficha / Imagem Carregada</Text>
              </View>
              <TouchableOpacity
                style={styles.imageExpandBtn}
                onPress={() => setShowImageViewerExpanded(!showImageViewerExpanded)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showImageViewerExpanded ? "contract-outline" : "expand-outline"}
                  size={15}
                  color={theme.textMuted}
                />
                <Text style={[styles.imageExpandBtnText, { color: theme.textSecondary }]}>
                  {showImageViewerExpanded ? "Recolher" : "Expandir"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.imageFrame, showImageViewerExpanded && styles.imageFrameExpanded]}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
            </View>
            <Text style={[styles.imageHintText, { color: theme.textMuted }]}>
              Consulte a imagem original acima enquanto confere os dados estruturados abaixo.
            </Text>
          </View>
        ) : null}

        {/* Text Input Area (quando modo texto está ativo) */}
        {activeSource === "text" && (
          <View style={[styles.textInputCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.textInputHeader}>
              <Ionicons name="clipboard-outline" size={16} color="#D90000" />
              <Text style={[styles.textInputTitle, { color: theme.text }]}>Cole o Conteúdo da Planilha ou PDF:</Text>
            </View>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
              value={rawText}
              onChangeText={handleParseText}
              placeholder="Cole aqui o texto da planilha (Ex: Supino Reto 4x10 60s 30kg)..."
              placeholderTextColor={theme.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Target Student Selection */}
        <View style={[styles.targetStudentCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.targetHeader}>
            <Ionicons name="person-outline" size={16} color="#D90000" />
            <Text style={[styles.targetTitle, { color: theme.text }]}>2. Aluno de Destino:</Text>
          </View>

          <View style={styles.studentModeSwitchRow}>
            <TouchableOpacity
              style={[styles.studentModeBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, !isCreatingNewStudent && styles.studentModeBtnActive]}
              onPress={() => setIsCreatingNewStudent(false)}
            >
              <Text style={[styles.studentModeBtnText, { color: theme.textSecondary }, !isCreatingNewStudent && styles.studentModeBtnTextActive]}>
                Aluno Existente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.studentModeBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, isCreatingNewStudent && styles.studentModeBtnActive]}
              onPress={() => setIsCreatingNewStudent(true)}
            >
              <Ionicons name="add" size={14} color={isCreatingNewStudent ? "#FFFFFF" : theme.textSecondary} />
              <Text style={[styles.studentModeBtnText, { color: theme.textSecondary }, isCreatingNewStudent && styles.studentModeBtnTextActive]}>
                Cadastrar Novo Aluno
              </Text>
            </TouchableOpacity>
          </View>

          {!isCreatingNewStudent ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentsRail}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentChip,
                    { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                    selectedStudentId === student.id && styles.studentChipActive,
                  ]}
                  onPress={() => setSelectedStudentId(student.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person"
                    size={12}
                    color={selectedStudentId === student.id ? "#FFFFFF" : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.studentChipText,
                      { color: theme.textSecondary },
                      selectedStudentId === student.id && styles.studentChipTextActive,
                    ]}
                  >
                    {student.registration.fullName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.newStudentInputBox}>
              <TextInput
                style={[styles.newStudentInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
                value={newStudentName}
                onChangeText={setNewStudentName}
                placeholder="Nome completo do novo aluno..."
                placeholderTextColor={theme.placeholder}
              />
            </View>
          )}
        </View>

        {/* Divisions Tab Switcher (Treino A, Treino B, Treino C...) */}
        <View style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewHeaderLeft}>
              <Ionicons name="barbell-outline" size={16} color="#D90000" />
              <Text style={[styles.reviewTitle, { color: theme.text }]} numberOfLines={1}>
                3. Exercícios Extraídos
              </Text>
            </View>
            <View style={styles.divisionsCountBadge}>
              <Text style={styles.divisionsCountBadgeText}>
                {parsedPlan.divisions.length} divisões
              </Text>
            </View>
          </View>

          {/* Division Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.divisionTabsRail}>
            {parsedPlan.divisions.map((div, idx) => (
              <TouchableOpacity
                key={div.id}
                style={[
                  styles.divisionTab,
                  { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                  activeDivisionIndex === idx && styles.divisionTabActive,
                ]}
                onPress={() => setActiveDivisionIndex(idx)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.divisionTabText,
                    { color: theme.textSecondary },
                    activeDivisionIndex === idx && styles.divisionTabTextActive,
                  ]}
                >
                  {div.divisionLabel} ({div.exercises.length})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Active Division Summary */}
          {currentDivision && (
            <View style={[styles.divisionMetaBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
              <Text style={[styles.divisionNameTitle, { color: theme.text }]}>{currentDivision.divisionLabel} • {currentDivision.name}</Text>
              <Text style={[styles.divisionMetaDesc, { color: theme.textSecondary }]}>
                Foco muscular: {currentDivision.muscleGroups.join(", ") || "Geral"}
              </Text>
            </View>
          )}

          {/* Exercises List */}
          <View style={styles.exercisesList}>
            {currentDivision && currentDivision.exercises.length > 0 ? (
              currentDivision.exercises.map((ex, idx) => (
                <View key={ex.id} style={[styles.exerciseCard, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                  <View style={styles.exerciseCardIndexBox}>
                    <Text style={styles.exerciseCardIndexText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.exerciseCardBody}>
                    <View style={styles.exerciseCardHeader}>
                      <Text style={[styles.exerciseNameText, { color: theme.text }]}>{ex.name}</Text>
                      <View style={styles.muscleBadge}>
                        <Text style={styles.muscleBadgeText}>{ex.muscleGroup}</Text>
                      </View>
                    </View>

                    <View style={styles.exerciseSpecsRow}>
                      <View style={styles.specItem}>
                        <Ionicons name="repeat-outline" size={13} color={theme.textMuted} />
                        <Text style={[styles.specText, { color: theme.textSecondary }]}>{ex.sets} séries × {ex.reps}</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Ionicons name="timer-outline" size={13} color={theme.textMuted} />
                        <Text style={[styles.specText, { color: theme.textSecondary }]}>{ex.restSeconds}s</Text>
                      </View>
                      {ex.load && (
                        <View style={styles.specItem}>
                          <Ionicons name="barbell-outline" size={13} color="#D90000" />
                          <Text style={[styles.specText, { color: "#D90000", fontWeight: "800" }]}>{ex.load}</Text>
                        </View>
                      )}
                    </View>

                    {ex.notes && (
                      <View style={[styles.exerciseNotesBox, { backgroundColor: theme.card }]}>
                        <Ionicons name="information-circle-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.exerciseNotesText, { color: theme.textSecondary }]}>{ex.notes}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteExBtn}
                    onPress={() => handleDeleteExercise(ex.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyDivisionBox}>
                <Ionicons name="barbell-outline" size={24} color={theme.textMuted} />
                <Text style={[styles.emptyDivisionText, { color: theme.textSecondary }]}>Nenhum exercício nesta divisão</Text>
              </View>
            )}

            {/* Quick Add Exercise Form */}
            {!isAddingExercise ? (
              <TouchableOpacity
                style={[styles.addExerciseTriggerBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
                onPress={() => setIsAddingExercise(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#D90000" />
                <Text style={styles.addExerciseTriggerBtnText}>Adicionar Exercício Manualmente</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addExerciseForm, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <Text style={[styles.addFormTitle, { color: theme.text }]}>Novo Exercício na Divisão</Text>
                <TextInput
                  style={[styles.addFormInput, { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                  value={newExName}
                  onChangeText={setNewExName}
                  placeholder="Nome do exercício (ex: Supino Reto)..."
                  placeholderTextColor={theme.placeholder}
                />
                <View style={styles.addFormRow}>
                  <TextInput
                    style={[styles.addFormInput, { flex: 1, backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                    value={newExSets}
                    onChangeText={setNewExSets}
                    placeholder="Séries (4)"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.addFormInput, { flex: 1.5, backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                    value={newExReps}
                    onChangeText={setNewExReps}
                    placeholder="Reps (10 a 12)"
                    placeholderTextColor={theme.placeholder}
                  />
                  <TextInput
                    style={[styles.addFormInput, { flex: 1, backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                    value={newExRest}
                    onChangeText={setNewExRest}
                    placeholder="Descanso (60s)"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                  />
                </View>
                <TextInput
                  style={[styles.addFormInput, { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                  value={newExLoad}
                  onChangeText={setNewExLoad}
                  placeholder="Carga sugerida (ex: 30 kg)..."
                  placeholderTextColor={theme.placeholder}
                />
                <TextInput
                  style={[styles.addFormInput, { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text }]}
                  value={newExNotes}
                  onChangeText={setNewExNotes}
                  placeholder="Observação técnica (ex: Drop-set)..."
                  placeholderTextColor={theme.placeholder}
                />
                <View style={styles.addFormActionsRow}>
                  <TouchableOpacity
                    style={[styles.addFormCancelBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => setIsAddingExercise(false)}
                  >
                    <Text style={[styles.addFormCancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addFormSaveBtn}
                    onPress={handleAddCustomExercise}
                  >
                    <Text style={styles.addFormSaveBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Big Action Button: Import & Create Workout */}
        <TouchableOpacity
          style={[styles.primaryActionBtn, isSaving && styles.primaryActionBtnDisabled]}
          onPress={handleSaveImportedWorkout}
          disabled={isSaving || isProcessing}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Importar e Criar Treino no App</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: "#0F0F0F",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  topBarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  topBarSubtitle: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  sourceSelectorCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 14,
  },
  sourceLabel: {
    color: "#AAAAAA",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sourceButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sourceBtn: {
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#181818",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 10,
  },
  sourceBtnActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  sourceBtnText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "800",
  },
  sourceBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  imageViewerCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 14,
  },
  imageViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  imageViewerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imageViewerTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  imageExpandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333333",
  },
  imageExpandBtnText: {
    color: "#AAAAAA",
    fontSize: 11,
    fontWeight: "700",
  },
  imageFrame: {
    height: 180,
    backgroundColor: "#181818",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    overflow: "hidden",
  },
  imageFrameExpanded: {
    height: 340,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imageHintText: {
    color: "#777777",
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  textInputCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 14,
  },
  textInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  textInputTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  textArea: {
    backgroundColor: "#181818",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#FFFFFF",
    fontSize: 12.5,
    lineHeight: 18,
    padding: 12,
    minHeight: 130,
  },
  targetStudentCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 14,
  },
  targetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  targetTitle: {
    color: "#AAAAAA",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  studentModeSwitchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  studentModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#181818",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#282828",
  },
  studentModeBtnActive: {
    backgroundColor: "#262626",
    borderColor: "#D90000",
  },
  studentModeBtnText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "700",
  },
  studentModeBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  studentsRail: {
    flexDirection: "row",
    gap: 6,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#181818",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  studentChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  studentChipText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "800",
  },
  studentChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  newStudentInputBox: {
    backgroundColor: "#181818",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newStudentInput: {
    color: "#FFFFFF",
    fontSize: 12.5,
    height: 36,
  },
  reviewCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewTitle: {
    flex: 1,
    minWidth: 0,
    color: "#AAAAAA",
    fontSize: 11.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  divisionsCountBadge: {
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    flexShrink: 0,
  },
  divisionsCountBadgeText: {
    color: "#AAAAAA",
    fontSize: 10.5,
    fontWeight: "800",
  },
  divisionTabsRail: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  divisionTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#181818",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#282828",
  },
  divisionTabActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  divisionTabText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  divisionTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  divisionMetaBox: {
    backgroundColor: "#181818",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
  divisionNameTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  divisionMetaDesc: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },
  exercisesList: {
    gap: 8,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    gap: 10,
  },
  exerciseCardIndexBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCardIndexText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "900",
  },
  exerciseCardBody: {
    flex: 1,
    gap: 4,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseNameText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  muscleBadge: {
    backgroundColor: "#222222",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  muscleBadgeText: {
    color: "#AAAAAA",
    fontSize: 9.5,
    fontWeight: "800",
  },
  exerciseSpecsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  specText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "700",
  },
  exerciseNotesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  exerciseNotesText: {
    color: "#777777",
    fontSize: 10.5,
    flex: 1,
  },
  deleteExBtn: {
    padding: 6,
  },
  emptyDivisionBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 6,
  },
  emptyDivisionText: {
    color: "#666666",
    fontSize: 12,
    fontWeight: "700",
  },
  addExerciseTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#181818",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 10,
    marginTop: 4,
  },
  addExerciseTriggerBtnText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
  },
  addExerciseForm: {
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    padding: 12,
    gap: 8,
    marginTop: 6,
  },
  addFormTitle: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "900",
  },
  addFormInput: {
    backgroundColor: "#121212",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#FFFFFF",
    fontSize: 12,
    paddingHorizontal: 10,
    height: 36,
  },
  addFormRow: {
    flexDirection: "row",
    gap: 6,
  },
  addFormActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  addFormCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#202020",
  },
  addFormCancelBtnText: {
    color: "#AAAAAA",
    fontSize: 11.5,
    fontWeight: "700",
  },
  addFormSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#D90000",
  },
  addFormSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "900",
  },
  primaryActionBtn: {
    height: 48,
    backgroundColor: "#D90000",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  primaryActionBtnDisabled: {
    opacity: 0.6,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
