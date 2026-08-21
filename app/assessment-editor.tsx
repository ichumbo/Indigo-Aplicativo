import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { type ComponentProps, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ASSESSMENT_STEPS,
  AssessmentPhoto,
  AssessmentStepId,
  BodyComposition,
  CardioTest,
  FunctionalTest,
  PERIMETER_LABELS,
  PHOTO_VIEWS,
  POSTURAL_REGION_LABELS,
  PerimeterKey,
  PhysicalAssessment,
  PosturalRegion,
  SKINFOLD_LABELS,
  SkinfoldPoint,
  acceptPhotoConsent,
  addAssessmentPhoto,
  addPosturalAnnotation,
  completeAssessment,
  createAssessmentDraft,
  formatAssessmentDate,
  getAssessmentById,
  getAssessmentStatusLabel,
  getAssessmentSummary,
  getAssessmentTypeLabel,
  getAge,
  listAssessmentsForTrainer,
  normalizeDecimal,
  removeAssessmentPhoto,
  removePosturalAnnotation,
  saveAssessment,
  softDeleteAssessment,
} from "@/services/assessment-store";
import { useCurrentSession } from "@/hooks/use-current-session";
import {
  PROTOCOL_CATALOG,
  calculateCompositionProtocol,
  getProtocolApplicability,
  getProtocolFields,
  type BioimpedanceField,
  type BodyCompositionProtocolId,
  type CompositionProtocolMeasurements,
  type GirthSite,
  type ProtocolFieldDefinition,
  type SkinfoldSite,
} from "@/services/body-composition-protocols";
import {
  CARDIO_PROTOCOL_CATALOG,
  CARDIO_PROTOCOL_CATEGORIES,
  calculateCardioProtocolSnapshot,
  createCardioExecution,
  generateCardioStages,
  getCardioProtocolDefinition,
  type CardioExternalResults,
  type CardioProtocolCategory,
  type CardioProtocolId,
  type CardioStage,
  type CardioTestConfig,
} from "@/services/cardiorespiratory-protocols";
import {
  FUNCTIONAL_BATTERY_TEMPLATES,
  FUNCTIONAL_CATEGORIES,
  FUNCTIONAL_TEST_CATALOG,
  buildFunctionalBatteryFromTemplate,
  calculateFunctionalTestSnapshot,
  createCustomFunctionalDefinition,
  createCustomFunctionalExecution,
  createFunctionalExecution,
  getFunctionalTestDefinition,
  validateFunctionalScreening,
  type FunctionalFieldResult,
  type FunctionalTestCategory,
  type FunctionalTestFieldDefinition,
} from "@/services/functional-test-catalog";

type SavingStatus = "idle" | "saving" | "saved" | "error";

const yesNoOptions = [
  { label: "Não", value: false },
  { label: "Sim", value: true },
];

const textOrEmpty = (value?: string | number) => (value === undefined || value === null ? "" : String(value));

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const sectionPresentation: Record<
  AssessmentStepId,
  {
    title: string;
    subtitle: string;
    icon: IoniconName;
  }
> = {
  general: {
    title: "Dados gerais",
    subtitle: "Aluno, data, objetivo e experiência",
    icon: "person-circle-outline",
  },
  anamnesis: {
    title: "Anamnese",
    subtitle: "Histórico, rotina e restrições",
    icon: "medkit-outline",
  },
  composition: {
    title: "Composição corporal",
    subtitle: "Peso, altura, IMC e gordura corporal",
    icon: "body-outline",
  },
  perimeters: {
    title: "Perímetros",
    subtitle: "Medidas corporais e assimetrias",
    icon: "resize-outline",
  },
  skinfolds: {
    title: "Dobras cutâneas",
    subtitle: "Protocolos Jackson & Pollock",
    icon: "analytics-outline",
  },
  cardio: {
    title: "VO2Max",
    subtitle: "Cardiorrespiratório, limiar e recuperação",
    icon: "pulse-outline",
  },
  functional: {
    title: "Neuromotores",
    subtitle: "Testes funcionais e dor",
    icon: "walk-outline",
  },
  photos: {
    title: "Fotos e postura",
    subtitle: "Registros padronizados e avaliação postural",
    icon: "camera-outline",
  },
  conclusion: {
    title: "Conclusão",
    subtitle: "Recomendações e liberação ao aluno",
    icon: "document-text-outline",
  },
};

export default function AssessmentEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const [assessment, setAssessment] = useState<PhysicalAssessment | null>(null);
  const [previousAssessment, setPreviousAssessment] = useState<PhysicalAssessment | null>(null);
  const [activeStep, setActiveStep] = useState<AssessmentStepId>("general");
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [cardioCategoryFilter, setCardioCategoryFilter] = useState<CardioProtocolCategory | "todos">("todos");
  const [functionalCategoryFilter, setFunctionalCategoryFilter] = useState<FunctionalTestCategory | "todos">("todos");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<SavingStatus>("idle");
  const [error, setError] = useState("");
  const [annotationDraft, setAnnotationDraft] = useState<{
    photoId?: string;
    region: PosturalRegion;
    type: "point" | "line";
    note: string;
  }>({
    region: "ombros",
    type: "point",
    note: "",
  });

  const loadAssessment = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");

    try {
      if (session.user.role !== "TRAINER") {
        throw new Error("Somente o treinador pode editar avaliacoes.");
      }

      const current = params.id
        ? await getAssessmentById(params.id, session.user.id, "trainer")
        : await createAssessmentDraft({ trainerId: session.user.id, trainerName: session.user.name });
      setAssessment(current);

      const all = await listAssessmentsForTrainer(session.user.id);
      const previous = all.find(
        (item) =>
          item.id !== current.id &&
          item.studentId === current.studentId &&
          item.status === "concluida" &&
          new Date(item.assessedAt).getTime() <= new Date(current.assessedAt).getTime()
      );
      setPreviousAssessment(previous ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir a avaliação.");
    } finally {
      setLoading(false);
    }
  }, [params.id, session]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const summary = useMemo(() => (assessment ? getAssessmentSummary(assessment) : null), [assessment]);

  const persist = async (patch: Partial<PhysicalAssessment>, details?: string) => {
    if (!assessment || !session || session.user.role !== "TRAINER") return;

    setSavingStatus("saving");

    try {
      const updated = await saveAssessment(assessment.id, patch, session.user.id, "trainer", details);
      setAssessment(updated);
      setSavingStatus("saved");
    } catch (saveError) {
      setSavingStatus("error");
      Alert.alert("Erro ao salvar", saveError instanceof Error ? saveError.message : "Não foi possível salvar.");
    }
  };

  const updateRoot = <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => {
    persist({ [key]: value } as Partial<PhysicalAssessment>, details);
  };

  const updateComposition = (patch: Partial<BodyComposition>, manualField?: keyof BodyComposition) => {
    if (!assessment) return;
    const manuallyEditedFields = manualField
      ? Array.from(new Set([...(assessment.composition.manuallyEditedFields ?? []), String(manualField)]))
      : assessment.composition.manuallyEditedFields;

    persist(
      {
        composition: {
          ...assessment.composition,
          ...patch,
          manuallyEditedFields,
        },
      },
      "Composição corporal atualizada."
    );
  };

  const updatePerimeter = (key: PerimeterKey, value?: number, notes?: string) => {
    if (!assessment) return;
    persist(
      {
        perimeters: {
          ...assessment.perimeters,
          [key]: {
            ...assessment.perimeters[key],
            valueCm: value,
            notes: notes ?? assessment.perimeters[key]?.notes,
          },
        },
      },
      "Perímetros atualizados."
    );
  };

  const updateSkinfold = (point: SkinfoldPoint, index: number, value?: number, invalid?: boolean) => {
    if (!assessment) return;
    const current = assessment.skinfolds.points[point] ?? { attempts: [{}, {}, {}] };
    const attempts = [...current.attempts];
    attempts[index] = { ...attempts[index], valueMm: value, invalid: invalid ?? attempts[index]?.invalid };

    persist(
      {
        skinfolds: {
          ...assessment.skinfolds,
          points: {
            ...assessment.skinfolds.points,
            [point]: { ...current, attempts },
          },
        },
      },
      "Dobras cutâneas atualizadas."
    );
  };

  const addCardioTest = (protocolId: CardioProtocolId) => {
    if (!assessment) return;
    const test = createCardioExecution(protocolId, assessment.cardioTests.length);
    updateRoot("cardioTests", [...assessment.cardioTests, test], "Teste cardiorrespiratório adicionado.");
  };

  const updateCardioTest = (id: string, patch: Partial<CardioTest>) => {
    if (!assessment) return;
    updateRoot(
      "cardioTests",
      assessment.cardioTests.map((test) => (test.id === id ? { ...test, ...patch } : test)),
      "Teste cardiorrespiratório atualizado."
    );
  };

  const addFunctionalTest = (testId: string) => {
    if (!assessment) return;
    if (assessment.functionalTests.some((test) => test.testId === testId)) return;
    const test = createFunctionalExecution(testId, assessment.functionalTests.length);
    updateRoot("functionalTests", [...assessment.functionalTests, test], "Teste funcional adicionado.");
  };

  const updateFunctionalTest = (id: string, patch: Partial<FunctionalTest>) => {
    if (!assessment) return;
    updateRoot(
      "functionalTests",
      assessment.functionalTests.map((test) => (test.id === id ? { ...test, ...patch } : test)),
      "Teste funcional atualizado."
    );
  };

  const addFunctionalBatteryTemplate = (templateId: string) => {
    if (!assessment) return;
    try {
      const existing = new Set(assessment.functionalTests.map((test) => test.testId));
      const additions = buildFunctionalBatteryFromTemplate(templateId, assessment.functionalTests.length).filter(
        (test) => !existing.has(test.testId)
      );
      updateRoot("functionalTests", [...assessment.functionalTests, ...additions], "Bateria funcional adicionada.");
    } catch (batteryError) {
      Alert.alert("Bateria indisponível", batteryError instanceof Error ? batteryError.message : "Não foi possível montar a bateria.");
    }
  };

  const addCustomFunctionalTest = () => {
    if (!assessment) return;
    const definition = createCustomFunctionalDefinition({
      name: `Teste personalizado ${assessment.functionalTests.length + 1}`,
      category: "personalizado",
      unit: "rep",
      instructions: "Configure o teste personalizado e registre o resultado bruto.",
    });
    const execution = createCustomFunctionalExecution(definition, assessment.functionalTests.length);
    updateRoot("functionalTests", [...assessment.functionalTests, execution], "Teste personalizado adicionado.");
  };

  const handleAcceptConsent = async () => {
    if (!assessment) return;
    try {
      const updated = await acceptPhotoConsent(assessment.id);
      setAssessment(updated);
      setSavingStatus("saved");
    } catch (consentError) {
      Alert.alert("Erro", consentError instanceof Error ? consentError.message : "Não foi possível registrar o consentimento.");
    }
  };

  const handlePickPhoto = async (view: AssessmentPhoto["view"], source: "camera" | "library") => {
    if (!assessment) return;
    if (!assessment.photoConsent?.accepted) {
      Alert.alert("Consentimento necessário", "Registre o consentimento antes de capturar ou anexar fotos.");
      return;
    }

    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync(false);

      if (!permission.granted) {
        Alert.alert("Permissão negada", "A permissão de câmera ou galeria foi negada pelo sistema.");
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.85,
              base64: false,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.85,
              base64: false,
              allowsEditing: false,
            });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const { updated } = await addAssessmentPhoto(assessment.id, {
        view,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
      setAssessment(updated);
      setSavingStatus("saved");
    } catch (photoError) {
      Alert.alert("Falha na foto", photoError instanceof Error ? photoError.message : "Não foi possível salvar a foto.");
    }
  };

  const handleAddAnnotation = async (photoId: string) => {
    if (!assessment) return;
    try {
      const { updated } = await addPosturalAnnotation(assessment.id, photoId, {
        type: annotationDraft.type,
        region: annotationDraft.region,
        side: "bilateral",
        x1: 0.5,
        y1: 0.5,
        x2: annotationDraft.type === "line" ? 0.5 : undefined,
        y2: annotationDraft.type === "line" ? 0.9 : undefined,
        note: annotationDraft.note.trim() || undefined,
      });
      setAssessment(updated);
      setAnnotationDraft((value) => ({ ...value, note: "", photoId }));
    } catch (annotationError) {
      Alert.alert("Falha ao marcar", annotationError instanceof Error ? annotationError.message : "Não foi possível salvar a marcação.");
    }
  };

  const handleRemoveAnnotation = async (photoId: string, annotationId: string) => {
    if (!assessment) return;
    const updated = await removePosturalAnnotation(assessment.id, photoId, annotationId);
    setAssessment(updated);
  };

  const handleComplete = async () => {
    if (!assessment) return;

    Alert.alert("Concluir avaliação", "Deseja concluir esta avaliação e preservar o histórico?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Concluir",
        onPress: async () => {
          try {
            const updated = await completeAssessment(assessment.id);
            setAssessment(updated);
            router.replace({ pathname: "/assessment-detail" as never, params: { id: updated.id, role: "trainer" } });
          } catch (completeError) {
            Alert.alert(
              "Pendências obrigatórias",
              completeError instanceof Error ? completeError.message : "Revise as etapas obrigatórias."
            );
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!assessment) return;
    Alert.alert("Excluir avaliação", "Esta ação remove o rascunho do histórico principal. Deseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await softDeleteAssessment(assessment.id);
            router.replace("/assessments" as never);
          } catch (deleteError) {
            Alert.alert("Não foi possível excluir", deleteError instanceof Error ? deleteError.message : "Tente novamente.");
          }
        },
      },
    ]);
  };

  const activeStepIndex = ASSESSMENT_STEPS.findIndex((step) => step.id === activeStep);
  const activeStepDefinition = ASSESSMENT_STEPS[activeStepIndex] ?? ASSESSMENT_STEPS[0];
  const activeStepPresentation = sectionPresentation[activeStepDefinition.id];

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Abrindo avaliação...</Text>
      </View>
    );
  }

  if (error || !assessment || !summary) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={40} color="#ff4444" />
        <Text style={styles.centerTitle}>Não foi possível abrir</Text>
        <Text style={styles.centerText}>{error || "Avaliação não encontrada."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (showSectionForm ? setShowSectionForm(false) : router.back())}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>{showSectionForm ? activeStepPresentation.title : "Cadastro da Avaliação"}</Text>
          <Text style={styles.headerSubtitle}>
            {showSectionForm ? "Cadastro da Avaliação" : getAssessmentStatusLabel(assessment.status)} •{" "}
            {savingStatus === "saving" ? "Salvando..." : savingStatus === "saved" ? "Salvo" : "Autosave"}
          </Text>
        </View>
        <TouchableOpacity style={styles.confirmIconButton} onPress={() => persist({}, "Rascunho salvo manualmente.")}>
          <Ionicons name="checkmark" size={26} color="#D90000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.registrationPanel}>
          <View style={styles.registrationTopRow}>
            {assessment.studentAvatar ? (
              <Image source={{ uri: assessment.studentAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={22} color="#D90000" />
              </View>
            )}
            <View style={styles.studentInfoBlock}>
              <Text style={styles.studentNameText} numberOfLines={1}>
                {assessment.studentName}
              </Text>
              <Text style={styles.trainerNameText} numberOfLines={1}>
                {assessment.trainerName}
              </Text>
            </View>
            <View style={styles.registrationPills}>
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>
                  {getAssessmentTypeLabel(assessment.type)}
                </Text>
              </View>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>
                  {summary.progressPercent}%
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.registrationMetaRow}>
            <View style={styles.dateTag}>
              <Ionicons name="calendar-outline" size={13} color="#888" />
              <Text style={styles.dateTagText}>
                {formatAssessmentDate(assessment.assessedAt)}
              </Text>
            </View>
            <Text style={styles.progressSummaryText}>
              {summary.completedSteps}/{ASSESSMENT_STEPS.length} etapas concluídas
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${summary.progressPercent}%` }]} />
          </View>
        </View>

        {!showSectionForm ? (
          <>
            <TouchableOpacity style={styles.deleteStrip} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={17} color="#ff5a5a" />
              <Text style={styles.deleteStripText}>Apagar avaliação</Text>
            </TouchableOpacity>

            <View style={styles.sectionListCard}>
              {ASSESSMENT_STEPS.map((step, index) => {
                const state = assessment.steps[step.id];
                const presentation = sectionPresentation[step.id];
                const complete = state.complete;
                const stateLabel = complete
                  ? "Completa"
                  : state.pending.length > 0
                    ? `${state.pending.length} pendência${state.pending.length > 1 ? "s" : ""}`
                    : step.required
                      ? "Obrigatória"
                      : "Opcional";

                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[styles.sectionRow, index === ASSESSMENT_STEPS.length - 1 && styles.sectionRowLast]}
                    activeOpacity={0.82}
                    onPress={() => {
                      setActiveStep(step.id);
                      setShowSectionForm(true);
                    }}
                  >
                    <View style={[styles.sectionIconBubble, complete && styles.sectionIconBubbleComplete]}>
                      <Ionicons name={presentation.icon} size={24} color={complete ? "#0f0f0f" : "#D90000"} />
                    </View>
                    <View style={styles.sectionRowText}>
                      <Text style={styles.sectionRowTitle}>{presentation.title}</Text>
                      <Text style={styles.sectionRowSubtitle}>{presentation.subtitle}</Text>
                    </View>
                    <View style={styles.sectionRowRight}>
                      <Text style={[styles.sectionStateText, complete && styles.sectionStateTextComplete]}>{stateLabel}</Text>
                      <Ionicons name={complete ? "checkmark-circle" : "chevron-forward"} size={22} color={complete ? "#D90000" : "#555"} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionDetailHeader}>
              <TouchableOpacity
                style={styles.sectionBackButton}
                onPress={() => setShowSectionForm(false)}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={15} color="#D90000" />
                <Text style={styles.sectionBackText}>Voltar às etapas</Text>
              </TouchableOpacity>
              <View style={styles.sectionDetailTitleRow}>
                <View style={styles.sectionIconBubble}>
                  <Ionicons name={activeStepPresentation.icon} size={18} color="#D90000" />
                </View>
                <View style={styles.sectionDetailTitleBlock}>
                  <Text style={styles.sectionDetailTitle}>{activeStepPresentation.title}</Text>
                  <Text style={styles.sectionDetailSubtitle}>{activeStepPresentation.subtitle}</Text>
                </View>
              </View>
            </View>

            {activeStep === "general" && renderGeneralStep(assessment, updateRoot)}
            {activeStep === "anamnesis" && renderAnamnesisStep(assessment, updateRoot)}
            {activeStep === "composition" && renderCompositionStep(assessment, previousAssessment, updateComposition)}
            {activeStep === "perimeters" && renderPerimetersStep(assessment, previousAssessment, updatePerimeter)}
            {activeStep === "skinfolds" && renderSkinfoldsStep(assessment, updateRoot, updateSkinfold)}
            {activeStep === "cardio" &&
              renderCardioStep(
                assessment,
                addCardioTest,
                updateCardioTest,
                updateRoot,
                cardioCategoryFilter,
                setCardioCategoryFilter
              )}
            {activeStep === "functional" &&
              renderFunctionalStep(
                assessment,
                addFunctionalTest,
                addFunctionalBatteryTemplate,
                addCustomFunctionalTest,
                updateFunctionalTest,
                updateRoot,
                functionalCategoryFilter,
                setFunctionalCategoryFilter
              )}
            {activeStep === "photos" &&
              renderPhotosStep(
                assessment,
                handleAcceptConsent,
                handlePickPhoto,
                handleRemoveAnnotation,
                handleAddAnnotation,
                removeAssessmentPhoto,
                annotationDraft,
                setAnnotationDraft,
                setAssessment
              )}
            {activeStep === "conclusion" && renderConclusionStep(assessment, updateRoot)}

            <View style={styles.navigationRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, activeStepIndex === 0 && styles.disabledButton]}
                disabled={activeStepIndex === 0}
                onPress={() => setActiveStep(ASSESSMENT_STEPS[Math.max(0, activeStepIndex - 1)].id)}
              >
                <Ionicons name="chevron-back" size={18} color="#D90000" />
                <Text style={styles.secondaryButtonText}>Anterior</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, activeStepIndex === ASSESSMENT_STEPS.length - 1 && styles.disabledButton]}
                disabled={activeStepIndex === ASSESSMENT_STEPS.length - 1}
                onPress={() => setActiveStep(ASSESSMENT_STEPS[Math.min(ASSESSMENT_STEPS.length - 1, activeStepIndex + 1)].id)}
              >
                <Text style={styles.secondaryButtonText}>Próxima</Text>
                <Ionicons name="chevron-forward" size={18} color="#D90000" />
              </TouchableOpacity>
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.secondaryFullButton} onPress={() => persist({}, "Rascunho salvo manualmente.")}>
                <Ionicons name="save-outline" size={18} color="#D90000" />
                <Text style={styles.secondaryButtonText}>Salvar rascunho</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
                <Text style={styles.primaryButtonText}>Concluir avaliação</Text>
                <Ionicons name="checkmark" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function renderGeneralStep(
  assessment: PhysicalAssessment,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void
) {
  return (
    <StepCard title="Informações gerais" note="A próxima avaliação foi sugerida automaticamente para três meses depois.">
      <Segmented
        label="Tipo da avaliação"
        value={assessment.type}
        options={[
          ["inicial", "Inicial"],
          ["periodica", "Periódica"],
          ["retorno", "Retorno"],
          ["final", "Final"],
        ]}
        onChange={(value) => updateRoot("type", value as PhysicalAssessment["type"])}
      />
      <Segmented
        label="Sexo biológico para protocolos"
        value={assessment.sex}
        options={[
          ["male", "Masculino"],
          ["female", "Feminino"],
        ]}
        onChange={(value) => updateRoot("sex", value as PhysicalAssessment["sex"])}
      />
      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <Field label="Data da avaliação" value={assessment.assessedAt.slice(0, 10)} onChangeText={(value) => updateRoot("assessedAt", new Date(value).toISOString())} />
        </View>
        <View style={styles.columnHalf}>
          <Field label="Próxima avaliação" value={assessment.nextAssessmentAt.slice(0, 10)} onChangeText={(value) => updateRoot("nextAssessmentAt", new Date(value).toISOString())} />
        </View>
      </View>
      <Field
        label="Objetivo principal"
        value={assessment.general.mainGoal}
        onChangeText={(value) => updateRoot("general", { ...assessment.general, mainGoal: value })}
      />
      <TextArea
        label="Objetivos secundários"
        value={assessment.general.secondaryGoals}
        onChangeText={(value) => updateRoot("general", { ...assessment.general, secondaryGoals: value })}
      />
      <Segmented
        label="Nível de experiência"
        value={assessment.general.experienceLevel}
        options={[
          ["iniciante", "Iniciante"],
          ["intermediario", "Intermediário"],
          ["avancado", "Avançado"],
        ]}
        onChange={(value) => updateRoot("general", { ...assessment.general, experienceLevel: value as never })}
      />
      <NumericField
        label="Frequência semanal de treino"
        suffix="x/semana"
        value={assessment.general.weeklyTrainingFrequency}
        onChangeNumber={(value) => updateRoot("general", { ...assessment.general, weeklyTrainingFrequency: value })}
      />
      <Field label="Profissão" value={assessment.general.profession} onChangeText={(value) => updateRoot("general", { ...assessment.general, profession: value })} />
      <TextArea label="Rotina diária" value={assessment.general.dailyRoutine} onChangeText={(value) => updateRoot("general", { ...assessment.general, dailyRoutine: value })} />
    </StepCard>
  );
}

function renderAnamnesisStep(
  assessment: PhysicalAssessment,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void
) {
  const update = (patch: Partial<PhysicalAssessment["anamnesis"]>) =>
    updateRoot("anamnesis", { ...assessment.anamnesis, ...patch });

  return (
    <StepCard title="Anamnese" note="Registro informativo. O app não emite diagnóstico médico.">
      <Segmented
        label="Qualidade do sono"
        value={assessment.anamnesis.sleepQuality}
        options={[
          ["ruim", "Ruim"],
          ["regular", "Regular"],
          ["boa", "Boa"],
          ["excelente", "Excelente"],
        ]}
        onChange={(value) => update({ sleepQuality: value as never })}
      />
      <Segmented
        label="Nível de estresse"
        value={assessment.anamnesis.stressLevel}
        options={[
          ["baixo", "Baixo"],
          ["moderado", "Moderado"],
          ["alto", "Alto"],
        ]}
        onChange={(value) => update({ stressLevel: value as never })}
      />
      <NumericField label="Consumo de água" suffix="L/dia" value={assessment.anamnesis.waterIntakeLiters} onChangeNumber={(value) => update({ waterIntakeLiters: value })} />
      <TextArea label="Alimentação" value={assessment.anamnesis.nutritionNotes} onChangeText={(value) => update({ nutritionNotes: value })} />
      <BooleanGroup label="Tabagismo" value={assessment.anamnesis.smoker} onChange={(value) => update({ smoker: value })} />
      <Segmented
        label="Consumo de álcool"
        value={assessment.anamnesis.alcoholUse}
        options={[
          ["nao", "Não"],
          ["ocasional", "Ocasional"],
          ["frequente", "Frequente"],
        ]}
        onChange={(value) => update({ alcoholUse: value as never })}
      />
      <BooleanGroup label="Outras atividades físicas" value={assessment.anamnesis.otherActivities} onChange={(value) => update({ otherActivities: value })} />
      {assessment.anamnesis.otherActivities && <TextArea label="Quais atividades?" value={assessment.anamnesis.otherActivitiesDetails} onChangeText={(value) => update({ otherActivitiesDetails: value })} />}
      <TextArea label="Histórico esportivo" value={assessment.anamnesis.sportsHistory} onChangeText={(value) => update({ sportsHistory: value })} />
      <ConditionalField label="Doenças diagnosticadas" value={assessment.anamnesis.diagnosedDiseases} details={assessment.anamnesis.diagnosedDiseasesDetails} onToggle={(value) => update({ diagnosedDiseases: value })} onDetails={(value) => update({ diagnosedDiseasesDetails: value })} />
      <ConditionalField label="Cirurgias" value={assessment.anamnesis.surgeries} details={assessment.anamnesis.surgeriesDetails} onToggle={(value) => update({ surgeries: value })} onDetails={(value) => update({ surgeriesDetails: value })} />
      <ConditionalField label="Lesões anteriores" value={assessment.anamnesis.previousInjuries} details={assessment.anamnesis.previousInjuriesDetails} onToggle={(value) => update({ previousInjuries: value })} onDetails={(value) => update({ previousInjuriesDetails: value })} />
      <ConditionalField label="Dores atuais" value={assessment.anamnesis.currentPain} details={assessment.anamnesis.currentPainDetails} onToggle={(value) => update({ currentPain: value })} onDetails={(value) => update({ currentPainDetails: value })} />
      <ConditionalField label="Medicamentos" value={assessment.anamnesis.medications} details={assessment.anamnesis.medicationsDetails} onToggle={(value) => update({ medications: value })} onDetails={(value) => update({ medicationsDetails: value })} />
      <TextArea label="Limitações" value={assessment.anamnesis.limitations} onChangeText={(value) => update({ limitations: value })} />
      <ConditionalField label="Restrições médicas" value={assessment.anamnesis.medicalRestrictions} details={assessment.anamnesis.medicalRestrictionsDetails} onToggle={(value) => update({ medicalRestrictions: value })} onDetails={(value) => update({ medicalRestrictionsDetails: value })} />
      <BooleanGroup label="Indica necessidade de liberação médica" value={assessment.anamnesis.needsMedicalClearance} onChange={(value) => update({ needsMedicalClearance: value })} />
      <TextArea label="Observações" value={assessment.anamnesis.notes} onChangeText={(value) => update({ notes: value })} />
    </StepCard>
  );
}

function renderCompositionStep(
  assessment: PhysicalAssessment,
  previousAssessment: PhysicalAssessment | null,
  updateComposition: (patch: Partial<BodyComposition>, manualField?: keyof BodyComposition) => void
) {
  const age = getAge(assessment.birthDate, new Date(assessment.assessedAt));
  const measurements = assessment.composition.protocolMeasurements ?? {};
  const selectedProtocolId = assessment.composition.protocolId;
  const selectedProtocol = PROTOCOL_CATALOG.find((protocol) => protocol.id === selectedProtocolId);
  const selectedFields = selectedProtocolId ? getProtocolFields(selectedProtocolId, assessment.sex) : [];
  const displaySnapshot = calculateCompositionProtocol(
    {
      protocolId: selectedProtocolId,
      sex: assessment.sex,
      ageYears: age,
      weightKg: assessment.composition.weightKg,
      heightCm: assessment.composition.heightCm,
      targetBodyFatPercent: assessment.composition.targetBodyFatPercent,
      assessedAt: assessment.assessedAt,
      measurements,
    },
    previousAssessment?.composition.protocolSnapshot
  );

  const updateMeasurements = (patch: CompositionProtocolMeasurements) => {
    updateComposition({
      protocolMeasurements: {
        ...measurements,
        ...patch,
        skinfolds: {
          ...(measurements.skinfolds ?? {}),
          ...(patch.skinfolds ?? {}),
        },
        girthsCm: {
          ...(measurements.girthsCm ?? {}),
          ...(patch.girthsCm ?? {}),
        },
        bioimpedance: {
          ...(measurements.bioimpedance ?? {}),
          ...(patch.bioimpedance ?? {}),
        },
      },
    });
  };

  const selectProtocol = (protocolId: BodyCompositionProtocolId) => {
    const nextProtocol = PROTOCOL_CATALOG.find((protocol) => protocol.id === protocolId);
    const nextMethod = protocolId === "bioimpedance" ? "bioimpedancia" : "dobras";
    const apply = () => updateComposition({ protocolId, method: nextMethod, methodDetails: nextProtocol?.reference });

    if (assessment.composition.protocolId && assessment.composition.protocolId !== protocolId && assessment.composition.bodyFatPercent) {
      Alert.alert(
        "Trocar protocolo",
        "Os dados compatíveis serão preservados, mas o resultado calculado será substituído pelo novo protocolo.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Trocar", onPress: apply },
        ]
      );
      return;
    }

    apply();
  };

  const fieldSectionTitle =
    selectedProtocolId === "bioimpedance"
      ? "Dados da bioimpedância"
      : selectedFields.some((field) => field.kind === "skinfold")
        ? "Dobras cutâneas (em mm)"
        : "Medidas do protocolo";
  const previousComposition = previousAssessment?.composition;
  const previousContext = previousAssessment
    ? `Anterior: ${formatAssessmentDate(previousAssessment.assessedAt)}`
    : "Sem avaliação anterior";

  return (
    <>
      <CompositionSection
        title="Selecione o protocolo"
        note="Escolha o método da avaliação. O cálculo técnico continua salvo junto com a versão da fórmula."
      >
        <View style={styles.protocolChoiceGrid}>
          {PROTOCOL_CATALOG.map((protocol) => {
            const selected = protocol.id === selectedProtocolId;
            const applicability = getProtocolApplicability(protocol.id, {
              sex: assessment.sex,
              ageYears: age,
              weightKg: assessment.composition.weightKg,
              heightCm: assessment.composition.heightCm,
            });
            const disabled = applicability.disabled;
            const statusText = disabled ? applicability.reasons[0] : applicability.warnings[0] ?? protocol.measuresSummary;

            return (
              <TouchableOpacity
                key={protocol.id}
                style={[styles.protocolChoice, selected && styles.protocolChoiceSelected, disabled && styles.protocolChoiceDisabled]}
                activeOpacity={0.82}
                disabled={disabled}
                onPress={() => selectProtocol(protocol.id)}
              >
                <View style={[styles.protocolChoiceDot, selected && styles.protocolChoiceDotSelected]}>
                  {selected && <Ionicons name="checkmark" size={13} color="#000" />}
                </View>
                <View style={styles.protocolTextBlock}>
                  <Text style={styles.protocolChoiceText}>{protocol.shortName}</Text>
                  <Text style={[styles.protocolChoiceSubtext, disabled && styles.disabledText]} numberOfLines={2}>
                    {statusText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedProtocol && (
          <View style={styles.protocolInfoBox}>
            <Ionicons name="information-circle-outline" size={19} color="#D90000" />
            <Text style={styles.warningText}>
              {selectedProtocol.displayName}. {selectedProtocol.description}
            </Text>
          </View>
        )}
      </CompositionSection>

      <CompositionSection title="Medidas" note={previousContext}>
        <View style={styles.twoColumnGrid}>
          <View style={styles.twoColumnRow}>
            <View style={styles.columnHalf}>
              <ComparisonNumericField
                label="Peso"
                suffix="kg"
                value={assessment.composition.weightKg}
                previousValue={previousComposition?.weightKg}
                onChangeNumber={(value) => updateComposition({ weightKg: value })}
              />
            </View>
            <View style={styles.columnHalf}>
              <ComparisonNumericField
                label="Altura"
                suffix="cm"
                value={assessment.composition.heightCm}
                previousValue={previousComposition?.heightCm}
                onChangeNumber={(value) => updateComposition({ heightCm: value })}
              />
            </View>
          </View>
          <View style={styles.twoColumnRow}>
            <View style={styles.columnHalf}>
              <ComparisonNumericField
                label="Meta gordura"
                suffix="%"
                value={assessment.composition.targetBodyFatPercent}
                previousValue={previousComposition?.targetBodyFatPercent}
                onChangeNumber={(value) => updateComposition({ targetBodyFatPercent: value })}
              />
            </View>
            <View style={styles.columnHalf} />
          </View>
        </View>
      </CompositionSection>

      {selectedProtocol && (
        <CompositionSection title={fieldSectionTitle} note={selectedProtocol.measuresSummary}>
          {selectedFields.map((field) =>
            renderProtocolField(field, measurements, updateMeasurements, previousComposition?.protocolMeasurements)
          )}
          {displaySnapshot.validation.errors.length > 0 && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#ff5a5a" />
              <Text style={styles.errorText}>{displaySnapshot.validation.errors.join(" ")}</Text>
            </View>
          )}
          {displaySnapshot.validation.warnings.length > 0 && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#f4c542" />
              <Text style={styles.warningText}>{displaySnapshot.validation.warnings.join(" ")}</Text>
            </View>
          )}
        </CompositionSection>
      )}

      {selectedProtocol && (
        <>
          <CompositionSection title="Resultados">
            <View style={styles.twoColumnGrid}>
              <View style={styles.twoColumnRow}>
                <ResultTile label="Gordura ideal" value={formatResult(displaySnapshot.results.targetBodyFatPercent, "%")} />
                <ResultTile label="Gordura atual" value={formatResult(displaySnapshot.results.bodyFatPercent, "%")} />
              </View>
              <View style={styles.twoColumnRow}>
                <ResultTile label="Peso gordo" value={formatResult(displaySnapshot.results.fatMassKg, "kg")} />
                <ResultTile label="Peso ideal" value={formatResult(displaySnapshot.results.targetWeightKg, "kg")} />
              </View>
              <View style={styles.twoColumnRow}>
                <ResultTile label="Peso magro" value={formatResult(displaySnapshot.results.leanMassKg, "kg")} />
                <ResultTile label="IMC" value={formatResult(displaySnapshot.results.bmi, "kg/m²")} />
              </View>
            </View>
            <ResultLine label="Classificação IMC" value={displaySnapshot.results.bmiClassification ?? "Não informado"} />
            <ResultLine label="Classificação gordura" value={displaySnapshot.results.bodyFatClassification ?? "Não informado"} />
            <ResultLine label="Diferença para meta" value={formatSignedResult(displaySnapshot.results.fatMassToChangeKg, "kg de gordura")} />

            {!!displaySnapshot.results.differenceFromPrevious && (
              <View style={styles.previousBox}>
                <Text style={styles.sectionTitle}>Avaliação anterior</Text>
                <Text style={styles.mutedText}>{displaySnapshot.results.differenceFromPrevious.message}</Text>
                <ResultLine label="Gordura anterior" value={formatResult(displaySnapshot.results.differenceFromPrevious.previousBodyFatPercent, "%")} />
                {displaySnapshot.results.differenceFromPrevious.comparable && (
                  <>
                    <ResultLine label="Diferença gordura" value={formatSignedResult(displaySnapshot.results.differenceFromPrevious.bodyFatPercentDelta, "p.p.")} />
                    <ResultLine label="Diferença massa gordura" value={formatSignedResult(displaySnapshot.results.differenceFromPrevious.fatMassKgDelta, "kg")} />
                  </>
                )}
              </View>
            )}
          </CompositionSection>

          <CompositionSection title="Detalhes do cálculo">
            <View style={styles.calculationDetails}>
              <Text style={styles.helperText}>Protocolo: {displaySnapshot.protocolName ?? "Não selecionado"}</Text>
              <Text style={styles.helperText}>Versão: {displaySnapshot.protocolVersion ?? "Não informado"}</Text>
              <Text style={styles.helperText}>Fórmula: {displaySnapshot.intermediate.equationApplied ?? selectedProtocol.sexSpecs[assessment.sex]?.equation}</Text>
              <Text style={styles.helperText}>Referência: {displaySnapshot.formulaReference ?? selectedProtocol.reference}</Text>
              {typeof displaySnapshot.intermediate.skinfoldSumMm === "number" && (
                <Text style={styles.helperText}>Soma das dobras: {displaySnapshot.intermediate.skinfoldSumMm} mm</Text>
              )}
              {typeof displaySnapshot.intermediate.bodyDensity === "number" && (
                <Text style={styles.helperText}>Densidade corporal: {displaySnapshot.intermediate.bodyDensity}</Text>
              )}
              {typeof displaySnapshot.intermediate.rawBodyFatPercent === "number" && (
                <Text style={styles.helperText}>Resultado bruto: {displaySnapshot.intermediate.rawBodyFatPercent.toFixed(4)}%</Text>
              )}
              {displaySnapshot.details.map((detail) => (
                <Text key={detail} style={styles.helperText}>{detail}</Text>
              ))}
            </View>
          </CompositionSection>
        </>
      )}
    </>
  );
}

function renderProtocolField(
  field: ProtocolFieldDefinition,
  measurements: CompositionProtocolMeasurements,
  updateMeasurements: (patch: CompositionProtocolMeasurements) => void,
  previousMeasurements?: CompositionProtocolMeasurements
) {
  const previousValue = formatPreviousProtocolValue(field, previousMeasurements);

  if (field.kind === "skinfold") {
    const site = field.id as SkinfoldSite;
    const current = measurements.skinfolds?.[site] ?? { attempts: [{}, {}, {}] };
    const attempts = [0, 1, 2].map((index) => current.attempts?.[index] ?? {});

    const updateAttempt = (index: number, patch: { valueMm?: number; invalid?: boolean }) => {
      const nextAttempts = [...attempts];
      nextAttempts[index] = { ...nextAttempts[index], ...patch };
      updateMeasurements({
        skinfolds: {
          [site]: {
            ...current,
            attempts: nextAttempts,
          },
        },
      });
    };

    return (
      <View key={field.id} style={styles.measureBlock}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <Text style={styles.measureTip}>Como medir: {field.instruction}</Text>
        {!!previousValue && <Text style={styles.fieldPrevious}>Anterior: {previousValue}</Text>}
        <View style={styles.compactAttemptGrid}>
          {attempts.map((attempt, index) => (
            <View key={`${field.id}-${index}`} style={styles.compactAttemptCell}>
              <Text style={styles.compactAttemptLabel}>{`${index + 1}ª medida`}</Text>
              <View style={styles.compactAttemptInputRow}>
                <TextInput
                  style={styles.compactAttemptInput}
                  value={textOrEmpty(attempt.valueMm)}
                  onChangeText={(text) =>
                    updateAttempt(index, { valueMm: text.trim() ? normalizeDecimal(text) : undefined })
                  }
                  placeholder="0"
                  placeholderTextColor="#555"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.compactAttemptSuffix}>mm</Text>
              </View>
              <TouchableOpacity
                style={[styles.invalidButton, attempt.invalid && styles.invalidButtonActive]}
                onPress={() => updateAttempt(index, { invalid: !attempt.invalid })}
                activeOpacity={0.8}
              >
                <Text style={[styles.invalidText, attempt.invalid && styles.invalidTextActive]}>Inválida</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <NumericField
          label="Valor consolidado opcional"
          suffix="mm"
          value={current.consolidatedMm}
          onChangeNumber={(value) =>
            updateMeasurements({
              skinfolds: {
                [site]: {
                  ...current,
                  consolidatedMm: value,
                },
              },
            })
          }
        />
      </View>
    );
  }

  if (field.kind === "girth") {
    const site = field.id as GirthSite;
    return (
      <View key={field.id} style={styles.measureBlock}>
        <NumericField
          label={field.label}
          suffix={field.unit}
          value={measurements.girthsCm?.[site]}
          onChangeNumber={(value) =>
            updateMeasurements({
              girthsCm: {
                [site]: value,
              },
            })
          }
        />
        {!!previousValue && <Text style={styles.fieldPrevious}>Anterior: {previousValue}</Text>}
        <Text style={styles.measureTip}>Como medir: {field.instruction}</Text>
      </View>
    );
  }

  const bioField = field.id as BioimpedanceField;
  const value = measurements.bioimpedance?.[bioField];
  const updateBio = (nextValue: string | number | undefined) =>
    updateMeasurements({
      bioimpedance: {
        [bioField]: nextValue,
      },
    });

  if (field.unit === "texto" || field.unit === "data") {
    return (
      <View key={field.id}>
        <Field
          label={field.label}
          value={typeof value === "string" ? value : undefined}
          onChangeText={updateBio}
        />
        {!!previousValue && <Text style={styles.fieldPrevious}>Anterior: {previousValue}</Text>}
      </View>
    );
  }

  return (
    <View key={field.id}>
      <NumericField
        label={field.label}
        suffix={field.unit}
        value={typeof value === "number" ? value : undefined}
        onChangeNumber={updateBio}
      />
      {!!previousValue && <Text style={styles.fieldPrevious}>Anterior: {previousValue}</Text>}
    </View>
  );
}

function formatPreviousProtocolValue(
  field: ProtocolFieldDefinition,
  previousMeasurements?: CompositionProtocolMeasurements
) {
  if (!previousMeasurements) return undefined;

  if (field.kind === "skinfold") {
    const previous = previousMeasurements.skinfolds?.[field.id as SkinfoldSite];
    if (!previous) return undefined;
    if (typeof previous.consolidatedMm === "number") return `${previous.consolidatedMm} mm`;

    const values = (previous.attempts ?? [])
      .filter((attempt) => !attempt.invalid && typeof attempt.valueMm === "number")
      .map((attempt) => attempt.valueMm as number);
    if (!values.length) return undefined;

    const average = values.reduce((total, value) => total + value, 0) / values.length;
    return `${Math.round(average * 10) / 10} mm`;
  }

  if (field.kind === "girth") {
    const previous = previousMeasurements.girthsCm?.[field.id as GirthSite];
    return typeof previous === "number" ? `${previous} ${field.unit}` : undefined;
  }

  const previous = previousMeasurements.bioimpedance?.[field.id as BioimpedanceField];
  if (previous === undefined || previous === null || previous === "") return undefined;
  const unit = field.unit === "texto" || field.unit === "data" ? "" : ` ${field.unit}`;
  return `${previous}${typeof previous === "number" ? unit : ""}`;
}

function formatResult(value?: number, suffix?: string) {
  return typeof value === "number" ? `${value}${suffix ? ` ${suffix}` : ""}` : "Não calculável";
}

function formatSignedResult(value?: number, suffix?: string) {
  if (typeof value !== "number") return "Não calculável";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}${suffix ? ` ${suffix}` : ""}`;
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultTile}>
      <Text style={styles.resultTileLabel}>{label}</Text>
      <Text style={styles.resultTileValue}>{value}</Text>
    </View>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultLine}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

function renderPerimetersStep(
  assessment: PhysicalAssessment,
  previousAssessment: PhysicalAssessment | null,
  updatePerimeter: (key: PerimeterKey, value?: number, notes?: string) => void
) {
  const trunkPairs: [PerimeterKey, PerimeterKey][] = [
    ["neck", "shoulders"],
    ["chest", "waist"],
    ["abdomen", "hip"],
  ];

  const limbPairs: [PerimeterKey, PerimeterKey, string][] = [
    ["rightArmRelaxed", "leftArmRelaxed", "Braço relaxado"],
    ["rightArmFlexed", "leftArmFlexed", "Braço contraído"],
    ["rightForearm", "leftForearm", "Antebraço"],
    ["rightThigh", "leftThigh", "Coxa"],
    ["rightCalf", "leftCalf", "Panturrilha"],
  ];

  const renderPerimeterCell = (key: PerimeterKey) => {
    const previous = previousAssessment?.perimeters[key]?.valueCm;
    const current = assessment.perimeters[key]?.valueCm;
    const diff = previous && current ? current - previous : undefined;
    return (
      <View key={key} style={styles.columnHalf}>
        <NumericField
          label={PERIMETER_LABELS[key]}
          suffix="cm"
          value={current}
          onChangeNumber={(value) => updatePerimeter(key, value)}
        />
        {!!previous && (
          <Text style={styles.helperText}>
            Ant: {previous} cm
            {typeof diff === "number" ? ` (${diff > 0 ? "+" : ""}${diff.toFixed(1)})` : ""}
          </Text>
        )}
      </View>
    );
  };

  return (
    <StepCard title="Perímetros corporais" note="Use centímetros. Medidas organizadas em pares para fácil comparação.">
      <Text style={styles.subsectionTitle}>Tronco e cabeça</Text>
      <View style={styles.twoColumnGrid}>
        {trunkPairs.map(([keyA, keyB], idx) => (
          <View key={idx} style={styles.twoColumnRow}>
            {renderPerimeterCell(keyA)}
            {renderPerimeterCell(keyB)}
          </View>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Membros (Direito / Esquerdo)</Text>
      <View style={styles.twoColumnGrid}>
        {limbPairs.map(([rightKey, leftKey], idx) => (
          <View key={idx} style={styles.twoColumnRow}>
            {renderPerimeterCell(rightKey)}
            {renderPerimeterCell(leftKey)}
          </View>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Comparação e assimetrias (D/E)</Text>
      {limbPairs.map(([right, left, label]) => {
        const rightValue = assessment.perimeters[right]?.valueCm;
        const leftValue = assessment.perimeters[left]?.valueCm;
        const diff = rightValue && leftValue ? Math.abs(rightValue - leftValue) : undefined;
        const percent = diff && Math.max(rightValue ?? 0, leftValue ?? 0) ? (diff / Math.max(rightValue ?? 0, leftValue ?? 0)) * 100 : undefined;
        return (
          <View key={label} style={styles.resultRow}>
            <Text style={styles.resultLabel}>{label}</Text>
            <Text style={styles.resultValue}>
              {typeof diff === "number" ? `${diff.toFixed(1)} cm • ${percent?.toFixed(1)}%` : "Não informado"}
            </Text>
          </View>
        );
      })}
    </StepCard>
  );
}

function renderSkinfoldsStep(
  assessment: PhysicalAssessment,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void,
  updateSkinfold: (point: SkinfoldPoint, index: number, value?: number, invalid?: boolean) => void
) {
  return (
    <StepCard title="Dobras cutâneas" note="Protocolos reconhecidos: Jackson & Pollock com conversão Siri. Fórmula aplicada aparece abaixo do resultado.">
      <Segmented
        label="Protocolo"
        value={assessment.skinfolds.protocol}
        options={[
          ["jackson-pollock-3", "JP 3 dobras"],
          ["jackson-pollock-7", "JP 7 dobras"],
        ]}
        onChange={(value) => updateRoot("skinfolds", { ...assessment.skinfolds, protocol: value as never })}
      />
      {(Object.keys(SKINFOLD_LABELS) as SkinfoldPoint[]).map((point) => {
        const measurement = assessment.skinfolds.points[point] ?? { attempts: [{}, {}, {}] };
        return (
          <View key={point} style={styles.measureBlock}>
            <Text style={styles.fieldLabel}>{SKINFOLD_LABELS[point]}</Text>
            <View style={styles.compactAttemptGrid}>
              {[0, 1, 2].map((index) => (
                <View key={index} style={styles.compactAttemptCell}>
                  <Text style={styles.compactAttemptLabel}>{`${index + 1}ª medida`}</Text>
                  <View style={styles.compactAttemptInputRow}>
                    <TextInput
                      style={styles.compactAttemptInput}
                      value={textOrEmpty(measurement.attempts[index]?.valueMm)}
                      onChangeText={(text) =>
                        updateSkinfold(point, index, text.trim() ? normalizeDecimal(text) : undefined)
                      }
                      placeholder="0"
                      placeholderTextColor="#555"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.compactAttemptSuffix}>mm</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.invalidButton, measurement.attempts[index]?.invalid && styles.invalidButtonActive]}
                    onPress={() => updateSkinfold(point, index, measurement.attempts[index]?.valueMm, !measurement.attempts[index]?.invalid)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.invalidText, measurement.attempts[index]?.invalid && styles.invalidTextActive]}>Inválida</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        );
      })}
      <Calculated label="Resultado calculado" value={assessment.skinfolds.resultBodyFatPercent} suffix="%" />
      <Text style={styles.helperText}>{assessment.skinfolds.formulaReference ?? "Fórmula: Não informado"}</Text>
    </StepCard>
  );
}

function renderCardioStep(
  assessment: PhysicalAssessment,
  addCardioTest: (protocolId: CardioProtocolId) => void,
  updateCardioTest: (id: string, patch: Partial<CardioTest>) => void,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void,
  cardioCategoryFilter: CardioProtocolCategory | "todos",
  setCardioCategoryFilter: (value: CardioProtocolCategory | "todos") => void
) {
  const catalogItems = CARDIO_PROTOCOL_CATALOG.filter((protocol) =>
    cardioCategoryFilter === "todos" ? true : protocol.category === cardioCategoryFilter
  );
  const selectedTests = [...assessment.cardioTests].sort((a, b) => a.order - b.order);

  return (
    <StepCard
      title="Avaliação cardiorrespiratória"
      note="Registre protocolos externos, submáximos, esteira, bicicleta e limiar. O app não emite diagnóstico nem simula teste médico de esforço."
    >
      <View style={styles.protocolInfoBox}>
        <Ionicons name="information-circle-outline" size={19} color="#D90000" />
        <Text style={styles.warningText}>
          Nem todo protocolo estima VO₂máx. Conconi registra ponto de deflexão da FC/limiar estimado e pode ficar inconclusivo quando os dados não sustentam a análise.
        </Text>
      </View>

      <Text style={styles.subsectionTitle}>Catálogo de protocolos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterRail}
      >
        <TouchableOpacity
          style={[styles.categoryFilterChip, cardioCategoryFilter === "todos" && styles.categoryFilterChipActive]}
          onPress={() => setCardioCategoryFilter("todos")}
        >
          <Text style={[styles.categoryFilterChipText, cardioCategoryFilter === "todos" && styles.categoryFilterChipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {CARDIO_PROTOCOL_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryFilterChip, cardioCategoryFilter === category.id && styles.categoryFilterChipActive]}
            onPress={() => setCardioCategoryFilter(category.id)}
          >
            <Text style={[styles.categoryFilterChipText, cardioCategoryFilter === category.id && styles.categoryFilterChipTextActive]}>{category.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.protocolList}>
        {catalogItems.map((protocol) => (
          <TouchableOpacity key={protocol.id} style={styles.protocolOption} activeOpacity={0.82} onPress={() => addCardioTest(protocol.id)}>
            <View style={styles.protocolOptionHeader}>
              <View style={styles.sectionIconBubble}>
                <Ionicons name={getCardioProtocolIcon(protocol.id)} size={20} color="#D90000" />
              </View>
              <View style={styles.protocolTextBlock}>
                <Text style={styles.protocolName}>{protocol.name}</Text>
                <Text style={styles.protocolMeta}>{CARDIO_PROTOCOL_CATEGORIES.find((category) => category.id === protocol.category)?.label} • versão {protocol.version}</Text>
              </View>
              <Ionicons name="add" size={22} color="#D90000" />
            </View>
            <Text style={styles.protocolDescription}>{protocol.description}</Text>
            <Text style={styles.protocolLink}>Estima: {formatCardioEstimates(protocol.estimates).join(", ")}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Protocolos adicionados</Text>
      {selectedTests.length === 0 ? (
        <Text style={styles.helperText}>Selecione um protocolo do catálogo para começar o registro.</Text>
      ) : (
        selectedTests.map((test, index) =>
          renderCardioExecutionCard(test, index, assessment, updateCardioTest, updateRoot)
        )
      )}
    </StepCard>
  );
}

function renderCardioExecutionCard(
  test: CardioTest,
  index: number,
  assessment: PhysicalAssessment,
  updateCardioTest: (id: string, patch: Partial<CardioTest>) => void,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void
) {
  const definition = getCardioProtocolDefinition(test.protocolId);
  if (!definition) return null;
  const age = getAge(assessment.birthDate, new Date(assessment.assessedAt));
  const snapshot = calculateCardioProtocolSnapshot(test, {
    ageYears: age,
    sex: assessment.sex,
    weightKg: assessment.composition.weightKg,
  });
  const isConconi = test.protocolId === "conconi-treadmill" || test.protocolId === "conconi-bike";

  const updateConfig = (patch: CardioTestConfig) =>
    updateCardioTest(test.id, {
      config: {
        ...test.config,
        ...patch,
        treadmill: {
          ...(test.config.treadmill ?? {}),
          ...(patch.treadmill ?? {}),
        },
        bike: {
          ...(test.config.bike ?? {}),
          ...(patch.bike ?? {}),
        },
      },
    });

  const updateExternal = (patch: CardioExternalResults) =>
    updateCardioTest(test.id, {
      external: {
        ...(test.external ?? {}),
        ...patch,
      },
    });

  const updateRecovery = (patch: NonNullable<CardioTest["recovery"]>) =>
    updateCardioTest(test.id, {
      recovery: {
        ...(test.recovery ?? {}),
        ...patch,
      },
    });

  const updateStage = (stageId: string, patch: Partial<CardioStage>) =>
    updateCardioTest(test.id, {
      stages: test.stages.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)),
    });

  return (
    <View key={test.id} style={styles.innerCard}>
      <View style={styles.functionalHeader}>
        <View style={styles.sectionIconBubble}>
          <Ionicons name={getCardioProtocolIcon(test.protocolId)} size={20} color="#D90000" />
        </View>
        <View style={styles.protocolTextBlock}>
          <Text style={styles.sectionTitle}>{index + 1}. {definition.name}</Text>
          <Text style={styles.mutedText}>{CARDIO_PROTOCOL_CATEGORIES.find((category) => category.id === definition.category)?.label} • {definition.formulaVersion}</Text>
        </View>
      </View>

      <Text style={styles.helperText}>{definition.population}</Text>
      <Text style={styles.helperText}>Equipamento: {definition.equipment.join(", ") || "definido pelo profissional"}</Text>

      <Segmented
        label="Status do teste"
        value={test.status}
        options={[
          ["rascunho", "Rascunho"],
          ["em_execucao", "Em execução"],
          ["pausado", "Pausado"],
          ["interrompido", "Interrompido"],
          ["concluido", "Concluído"],
          ["invalido", "Inválido"],
        ]}
        onChange={(value) => updateCardioTest(test.id, { status: value as CardioTest["status"] })}
      />
      <Field
        label="Nome interno do protocolo"
        value={test.config.protocolName}
        onChangeText={(value) => updateConfig({ protocolName: value })}
      />

      {definition.environment === "externo" || test.protocolId === "custom-cardio" ? (
        renderCardioExternalFields(test, updateExternal)
      ) : (
        <>
          {renderConconiConfig(test, updateConfig)}
          <TouchableOpacity
            style={styles.secondaryFullButton}
            onPress={() =>
              updateCardioTest(test.id, {
                stages: generateCardioStages(test.protocolId, test.config, Math.max(test.stages.length, 10)),
              })
            }
          >
            <Ionicons name="list-outline" size={18} color="#D90000" />
            <Text style={styles.secondaryButtonText}>Gerar estágios incrementais</Text>
          </TouchableOpacity>
          {renderCardioStages(test, updateStage)}
        </>
      )}

      <Text style={styles.subsectionTitle}>Recuperação e encerramento</Text>
      <View style={styles.compactBaseGrid}>
        <NumericField label="FC imediata" suffix="bpm" value={test.recovery?.immediateBpm} onChangeNumber={(value) => updateRecovery({ immediateBpm: value })} />
        <NumericField label="FC após 1 min" suffix="bpm" value={test.recovery?.after1MinBpm} onChangeNumber={(value) => updateRecovery({ after1MinBpm: value })} />
        <NumericField label="FC após 2 min" suffix="bpm" value={test.recovery?.after2MinBpm} onChangeNumber={(value) => updateRecovery({ after2MinBpm: value })} />
        <NumericField label="FC após 3 min" suffix="bpm" value={test.recovery?.after3MinBpm} onChangeNumber={(value) => updateRecovery({ after3MinBpm: value })} />
      </View>
      <TextArea label="Sintomas relatados" value={test.recovery?.symptoms} onChangeText={(value) => updateRecovery({ symptoms: value })} />
      <TextArea label="Observações do teste" value={test.config.customNotes} onChangeText={(value) => updateConfig({ customNotes: value })} />

      <View style={styles.calculationDetails}>
        <Text style={styles.sectionTitle}>Resumo calculado</Text>
        <ResultLine label={snapshot.primaryResult?.label ?? "Resultado principal"} value={formatResult(snapshot.primaryResult?.value, snapshot.primaryResult?.unit)} />
        {typeof snapshot.vo2MaxEstimate === "number" && (
          <ResultLine label="VO₂máx estimado" value={formatResult(snapshot.vo2MaxEstimate, "ml/kg/min")} />
        )}
        {snapshot.conconi && (
          <>
            <ResultLine label="Status Conconi" value={formatConconiStatus(snapshot.conconi.status)} />
            <ResultLine label="FC no ponto" value={formatResult(snapshot.conconi.heartRateBpm, "bpm")} />
            <Text style={styles.helperText}>{snapshot.conconi.message}</Text>
          </>
        )}
        <ResultLine label="Maior FC observada" value={formatResult(snapshot.maxHeartRateObserved, "bpm")} />
        <ResultLine label="Queda FC 1 min" value={formatResult(snapshot.recoveryDrop1Min, "bpm")} />
        {isConconi && renderCardioGraph(snapshot.graphPoints, snapshot.conconi?.stageNumber)}
        {snapshot.validation.errors.map((validationError) => (
          <Text key={validationError} style={styles.errorText}>{validationError}</Text>
        ))}
        {snapshot.validation.warnings.map((warning) => (
          <Text key={warning} style={styles.warningText}>{warning}</Text>
        ))}
        <Text style={styles.helperText}>Referência: {snapshot.reference}</Text>
        {snapshot.limitations.map((limitation) => (
          <Text key={limitation} style={styles.helperText}>{limitation}</Text>
        ))}
      </View>

      <TouchableOpacity
        style={styles.removeInlineButton}
        onPress={() => updateRoot("cardioTests", assessment.cardioTests.filter((item) => item.id !== test.id))}
      >
        <Ionicons name="trash-outline" size={16} color="#ff4444" />
        <Text style={styles.removeInlineText}>Remover protocolo</Text>
      </TouchableOpacity>
    </View>
  );
}

function renderCardioExternalFields(test: CardioTest, updateExternal: (patch: CardioExternalResults) => void) {
  const external = test.external ?? {};
  return (
    <>
      <Text style={styles.subsectionTitle}>Resultado bruto</Text>
      <NumericField label="Distância" suffix="m" value={external.distanceMeters} onChangeNumber={(value) => updateExternal({ distanceMeters: value })} />
      <NumericField label="Tempo total" suffix="min" value={external.timeMinutes} onChangeNumber={(value) => updateExternal({ timeMinutes: value })} />
      <NumericField label="FC repouso" suffix="bpm" value={external.heartRateRest} onChangeNumber={(value) => updateExternal({ heartRateRest: value })} />
      <NumericField label="FC inicial" suffix="bpm" value={external.heartRateStart} onChangeNumber={(value) => updateExternal({ heartRateStart: value })} />
      <NumericField label="FC final" suffix="bpm" value={external.heartRateEnd} onChangeNumber={(value) => updateExternal({ heartRateEnd: value })} />
      <NumericField label="FC recuperação 1 min" suffix="bpm" value={external.heartRateRecovery1Min} onChangeNumber={(value) => updateExternal({ heartRateRecovery1Min: value })} />
      <NumericField label="PSE final" suffix="/10" value={external.rpeFinal} onChangeNumber={(value) => updateExternal({ rpeFinal: value })} />
      <NumericField label="Temperatura" suffix="C" value={external.temperatureC} onChangeNumber={(value) => updateExternal({ temperatureC: value })} />
      <Field label="Terreno" value={external.terrain} onChangeText={(value) => updateExternal({ terrain: value })} />
      <TextArea label="Condições do local" value={external.locationConditions} onChangeText={(value) => updateExternal({ locationConditions: value })} />
      {test.status === "interrompido" && (
        <TextArea label="Motivo da interrupção" value={external.interruptionReason} onChangeText={(value) => updateExternal({ interruptionReason: value })} />
      )}
      <TextArea label="Observações externas" value={external.notes} onChangeText={(value) => updateExternal({ notes: value })} />
    </>
  );
}

function renderConconiConfig(test: CardioTest, updateConfig: (patch: CardioTestConfig) => void) {
  const isTreadmill = test.protocolId === "conconi-treadmill";
  return (
    <>
      <Text style={styles.subsectionTitle}>Configuração do protocolo</Text>
      <Segmented
        label="Entrada da frequência cardíaca"
        value={test.config.heartRateCaptureMode}
        options={[
          ["manual", "Manual"],
          ["sensor", "Sensor"],
        ]}
        onChange={(value) => updateConfig({ heartRateCaptureMode: value as CardioTestConfig["heartRateCaptureMode"] })}
      />
      <Field label="Monitor de FC" value={test.config.heartRateMonitor} onChangeText={(value) => updateConfig({ heartRateMonitor: value })} />
      <NumericField label="Aquecimento" suffix="min" value={test.config.warmupMinutes} onChangeNumber={(value) => updateConfig({ warmupMinutes: value })} />
      <NumericField label="Duração do estágio" suffix="seg" value={test.config.stageDurationSec} onChangeNumber={(value) => updateConfig({ stageDurationSec: value })} />

      {isTreadmill ? (
        <>
          <Field
            label="Esteira - fabricante/modelo"
            value={[test.config.treadmill?.manufacturer, test.config.treadmill?.model].filter(Boolean).join(" / ")}
            onChangeText={(value) => updateConfig({ treadmill: { model: value } })}
          />
          <NumericField label="Velocidade inicial" suffix="km/h" value={test.config.initialSpeedKmh} onChangeNumber={(value) => updateConfig({ initialSpeedKmh: value })} />
          <NumericField label="Incremento por estágio" suffix="km/h" value={test.config.speedIncrementKmh} onChangeNumber={(value) => updateConfig({ speedIncrementKmh: value })} />
          <NumericField label="Inclinação" suffix="%" value={test.config.inclinePercent} onChangeNumber={(value) => updateConfig({ inclinePercent: value })} />
        </>
      ) : (
        <>
          <Field
            label="Bicicleta - fabricante/modelo"
            value={[test.config.bike?.manufacturer, test.config.bike?.model].filter(Boolean).join(" / ")}
            onChangeText={(value) => updateConfig({ bike: { model: value } })}
          />
          <Segmented
            label="Sistema de carga"
            value={test.config.bike?.resistanceSystem}
            options={[
              ["watts", "Watts"],
              ["nivel", "Nível"],
              ["magnetica", "Magnética"],
              ["friccao", "Fricção"],
              ["outro", "Outro"],
            ]}
            onChange={(value) => updateConfig({ bike: { resistanceSystem: value as NonNullable<CardioTestConfig["bike"]>["resistanceSystem"] } })}
          />
          <NumericField label="Potência inicial" suffix="W" value={test.config.initialPowerWatts} onChangeNumber={(value) => updateConfig({ initialPowerWatts: value })} />
          <NumericField label="Incremento de potência" suffix="W" value={test.config.powerIncrementWatts} onChangeNumber={(value) => updateConfig({ powerIncrementWatts: value })} />
          <NumericField label="Nível inicial" value={test.config.initialResistanceLevel} onChangeNumber={(value) => updateConfig({ initialResistanceLevel: value })} />
          <NumericField label="Incremento de nível" value={test.config.resistanceIncrement} onChangeNumber={(value) => updateConfig({ resistanceIncrement: value })} />
          <NumericField label="Cadência alvo" suffix="rpm" value={test.config.targetCadenceRpm} onChangeNumber={(value) => updateConfig({ targetCadenceRpm: value })} />
        </>
      )}
    </>
  );
}

function renderCardioStages(test: CardioTest, updateStage: (stageId: string, patch: Partial<CardioStage>) => void) {
  return (
    <>
      <Text style={styles.subsectionTitle}>Estágios e frequência cardíaca</Text>
      {test.stages.length === 0 ? (
        <Text style={styles.helperText}>Gere estágios incrementais ou registre a execução manualmente.</Text>
      ) : (
        test.stages.map((stage) => (
          <View key={stage.id} style={styles.stageCard}>
            <View style={styles.stageHeader}>
              <Text style={styles.sectionTitle}>Estágio {stage.stageNumber}</Text>
              <TouchableOpacity
                style={[styles.invalidButton, stage.valid === false && styles.invalidButtonActive]}
                onPress={() => updateStage(stage.id, { valid: stage.valid === false ? true : false })}
              >
                <Text style={[styles.invalidText, stage.valid === false && styles.invalidTextActive]}>
                  {stage.valid === false ? "Inválido" : "Válido"}
                </Text>
              </TouchableOpacity>
            </View>
            <NumericField label="Duração" suffix="seg" value={stage.durationSec} onChangeNumber={(value) => updateStage(stage.id, { durationSec: value })} />
            {test.protocolId === "conconi-treadmill" ? (
              <>
                <NumericField label="Velocidade" suffix="km/h" value={stage.speedKmh} onChangeNumber={(value) => updateStage(stage.id, { speedKmh: value })} />
                <NumericField label="Inclinação" suffix="%" value={stage.inclinePercent} onChangeNumber={(value) => updateStage(stage.id, { inclinePercent: value })} />
              </>
            ) : (
              <>
                <NumericField label="Potência" suffix="W" value={stage.powerWatts} onChangeNumber={(value) => updateStage(stage.id, { powerWatts: value })} />
                <NumericField label="Nível de resistência" value={stage.resistanceLevel} onChangeNumber={(value) => updateStage(stage.id, { resistanceLevel: value })} />
                <NumericField label="Cadência" suffix="rpm" value={stage.cadenceRpm} onChangeNumber={(value) => updateStage(stage.id, { cadenceRpm: value })} />
              </>
            )}
            <NumericField label="FC média" suffix="bpm" value={stage.heartRateAvg} onChangeNumber={(value) => updateStage(stage.id, { heartRateAvg: value })} />
            <NumericField label="FC final" suffix="bpm" value={stage.heartRateEnd} onChangeNumber={(value) => updateStage(stage.id, { heartRateEnd: value })} />
            <NumericField label="FC máxima" suffix="bpm" value={stage.heartRateMax} onChangeNumber={(value) => updateStage(stage.id, { heartRateMax: value })} />
            <NumericField label="PSE" suffix="/10" value={stage.rpe} onChangeNumber={(value) => updateStage(stage.id, { rpe: value })} />
            {stage.valid === false && (
              <Field label="Motivo da invalidação" value={stage.invalidReason} onChangeText={(value) => updateStage(stage.id, { invalidReason: value })} />
            )}
            <TextArea label="Observações do estágio" value={stage.notes} onChangeText={(value) => updateStage(stage.id, { notes: value })} />
          </View>
        ))
      )}
    </>
  );
}

function renderCardioGraph(
  points: { x: number; y: number; stageNumber: number; valid: boolean; label: string }[],
  deflectionStageNumber?: number
) {
  if (points.length === 0) return <Text style={styles.helperText}>Gráfico disponível após registrar carga e FC por estágio.</Text>;
  const maxHr = Math.max(...points.map((point) => point.y));
  const minHr = Math.min(...points.map((point) => point.y));
  const span = Math.max(1, maxHr - minHr);

  return (
    <View style={styles.cardioGraph}>
      <Text style={styles.subsectionTitle}>Curva FC x carga</Text>
      {points.map((point) => {
        const width = 16 + ((point.y - minHr) / span) * 84;
        const isDeflection = point.stageNumber === deflectionStageNumber;
        return (
          <View key={`${point.stageNumber}-${point.x}`} style={styles.cardioGraphRow}>
            <Text style={styles.cardioGraphLabel}>E{point.stageNumber} • {point.x}</Text>
            <View style={styles.cardioGraphTrack}>
              <View style={[styles.cardioGraphBar, { width: `${width}%` }, isDeflection && styles.cardioGraphBarDeflection]} />
            </View>
            <Text style={styles.cardioGraphValue}>{point.y} bpm</Text>
          </View>
        );
      })}
    </View>
  );
}

function getCardioProtocolIcon(protocolId: CardioProtocolId): IoniconName {
  if (protocolId === "conconi-treadmill") return "speedometer-outline";
  if (protocolId === "conconi-bike") return "bicycle-outline";
  if (protocolId === "six-minute-walk") return "walk-outline";
  if (protocolId === "custom-cardio") return "construct-outline";
  return "pulse-outline";
}

function formatCardioEstimates(estimates: string[]) {
  const labels: Record<string, string> = {
    vo2max: "VO₂máx estimado",
    capacidade_cardiorrespiratoria: "capacidade",
    desempenho: "desempenho",
    recuperacao_fc: "recuperação FC",
    ponto_deflexao_fc: "ponto de deflexão FC",
    limiar_estimado: "limiar estimado",
    potencia: "potência",
    outro: "resultado manual",
  };
  return estimates.map((estimate) => labels[estimate] ?? estimate);
}

function formatConconiStatus(status: string) {
  const labels: Record<string, string> = {
    deflexao_identificada: "Deflexão identificada",
    deflexao_possivel: "Deflexão possível",
    inconclusivo: "Inconclusivo",
    dados_insuficientes: "Dados insuficientes",
    teste_invalido: "Teste inválido",
    teste_interrompido: "Teste interrompido",
  };
  return labels[status] ?? status;
}

function renderFunctionalStep(
  assessment: PhysicalAssessment,
  addFunctionalTest: (testId: string) => void,
  addFunctionalBatteryTemplate: (templateId: string) => void,
  addCustomFunctionalTest: () => void,
  updateFunctionalTest: (id: string, patch: Partial<FunctionalTest>) => void,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void,
  functionalCategoryFilter: FunctionalTestCategory | "todos",
  setFunctionalCategoryFilter: (value: FunctionalTestCategory | "todos") => void
) {
  const screening = assessment.functionalScreening ?? {};
  const screeningResult = validateFunctionalScreening(screening);
  const selectedIds = new Set(assessment.functionalTests.map((test) => test.testId));
  const catalogItems = FUNCTIONAL_TEST_CATALOG.filter((test) =>
    functionalCategoryFilter === "todos" ? true : test.category === functionalCategoryFilter
  );
  const selectedTests = [...assessment.functionalTests].sort((a, b) => a.order - b.order);

  return (
    <StepCard
      title="Testes neuromusculares e funcionais"
      note="Resultados são registros profissionais de movimento, não diagnósticos. Testes clínicos especiais não são liberados como testes comuns."
    >
      <View style={styles.protocolInfoBox}>
        <Ionicons name="shield-checkmark-outline" size={19} color="#D90000" />
        <Text style={styles.warningText}>
          Use termos como limitação observada, assimetria identificada e desconforto relatado. Ao surgir sinal de alerta, interrompa e registre.
        </Text>
      </View>

      <Text style={styles.subsectionTitle}>Triagem antes dos testes</Text>
      <Segmented
        label="Status de prontidão"
        value={screening.readinessStatus}
        options={[
          ["apto", "Apto"],
          ["adaptado", "Adaptado"],
          ["adiado", "Adiado"],
          ["contraindicado", "Contraindicado"],
          ["encaminhamento_recomendado", "Encaminhar"],
        ]}
        onChange={(value) =>
          updateRoot("functionalScreening", { ...screening, readinessStatus: value as never }, "Triagem funcional atualizada.")
        }
      />
      <BooleanGroup
        label="Consentimento do aluno registrado"
        value={screening.consentAccepted}
        onChange={(value) => updateRoot("functionalScreening", { ...screening, consentAccepted: value }, "Triagem funcional atualizada.")}
      />
      <BooleanGroup
        label="Questionário de prontidão revisado"
        value={screening.parqReviewed}
        onChange={(value) => updateRoot("functionalScreening", { ...screening, parqReviewed: value }, "Triagem funcional atualizada.")}
      />
      <BooleanGroup
        label="Histórico de lesões revisado"
        value={screening.injuryHistoryReviewed}
        onChange={(value) => updateRoot("functionalScreening", { ...screening, injuryHistoryReviewed: value }, "Triagem funcional atualizada.")}
      />
      <BooleanGroup
        label="Dores atuais revisadas"
        value={screening.currentPainReviewed}
        onChange={(value) => updateRoot("functionalScreening", { ...screening, currentPainReviewed: value }, "Triagem funcional atualizada.")}
      />
      <BooleanGroup
        label="Sintomas cardiovasculares"
        value={screening.cardiovascularSymptoms}
        onChange={(value) => updateRoot("functionalScreening", { ...screening, cardiovascularSymptoms: value }, "Triagem funcional atualizada.")}
      />
      <BooleanGroup
        label="Tontura ou perda de equilíbrio"
        value={screening.dizziness || screening.balanceLoss}
        onChange={(value) => updateRoot("functionalScreening", { ...screening, dizziness: value, balanceLoss: value }, "Triagem funcional atualizada.")}
      />
      <BooleanGroup
        label="Liberação médica necessária"
        value={screening.medicalClearanceNeeded}
        onChange={(value) => updateRoot("functionalScreening", { ...screening, medicalClearanceNeeded: value }, "Triagem funcional atualizada.")}
      />
      <TextArea
        label="Observações da triagem"
        value={screening.notes}
        onChangeText={(value) => updateRoot("functionalScreening", { ...screening, notes: value }, "Triagem funcional atualizada.")}
      />

      {screeningResult.alerts.length > 0 && (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={18} color="#f4c542" />
          <Text style={styles.warningText}>{screeningResult.alerts.join(" ")}</Text>
        </View>
      )}

      <Text style={styles.subsectionTitle}>Modelos de bateria</Text>
      <View style={styles.protocolList}>
        {FUNCTIONAL_BATTERY_TEMPLATES.map((template) => (
          <TouchableOpacity key={template.id} style={styles.protocolOption} onPress={() => addFunctionalBatteryTemplate(template.id)}>
            <View style={styles.protocolOptionHeader}>
              <View style={styles.sectionIconBubble}>
                <Ionicons name="albums-outline" size={20} color="#D90000" />
              </View>
              <View style={styles.protocolTextBlock}>
                <Text style={styles.protocolName}>{template.name}</Text>
                <Text style={styles.protocolMeta}>{template.testIds.length} testes sugeridos</Text>
              </View>
              <Ionicons name="add" size={22} color="#D90000" />
            </View>
            <Text style={styles.protocolDescription}>{template.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Catálogo de testes</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterRail}
      >
        <TouchableOpacity
          style={[styles.categoryFilterChip, functionalCategoryFilter === "todos" && styles.categoryFilterChipActive]}
          onPress={() => setFunctionalCategoryFilter("todos")}
        >
          <Text style={[styles.categoryFilterChipText, functionalCategoryFilter === "todos" && styles.categoryFilterChipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {FUNCTIONAL_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryFilterChip, functionalCategoryFilter === category.id && styles.categoryFilterChipActive]}
            onPress={() => setFunctionalCategoryFilter(category.id)}
          >
            <Text style={[styles.categoryFilterChipText, functionalCategoryFilter === category.id && styles.categoryFilterChipTextActive]}>{category.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.protocolList}>
        {catalogItems.map((definition) => {
          const added = selectedIds.has(definition.id);
          return (
            <TouchableOpacity
              key={definition.id}
              style={[styles.protocolOption, added && styles.protocolOptionSelected]}
              disabled={added}
              onPress={() => addFunctionalTest(definition.id)}
            >
              <View style={styles.protocolOptionHeader}>
                <View style={[styles.protocolDot, added && styles.protocolDotSelected]}>
                  {added && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <View style={styles.protocolTextBlock}>
                  <Text style={styles.protocolName}>{definition.name}</Text>
                  <Text style={styles.protocolMeta}>{definition.category} • {definition.equipment.join(", ") || "sem equipamento"}</Text>
                </View>
              </View>
              <Text style={styles.protocolDescription}>{definition.objective}</Text>
              <Text style={styles.protocolLink}>Como executar: {definition.executionSteps[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.secondaryFullButton} onPress={addCustomFunctionalTest}>
        <Ionicons name="construct-outline" size={18} color="#D90000" />
        <Text style={styles.secondaryButtonText}>Adicionar teste personalizado</Text>
      </TouchableOpacity>

      <Text style={styles.subsectionTitle}>Bateria selecionada</Text>
      {selectedTests.length === 0 ? (
        <Text style={styles.helperText}>Selecione um modelo ou adicione testes do catálogo.</Text>
      ) : (
        selectedTests.map((test, index) =>
          renderFunctionalExecutionCard(test, index, assessment, updateFunctionalTest, updateRoot)
        )
      )}
    </StepCard>
  );
}

function renderFunctionalExecutionCard(
  test: FunctionalTest,
  index: number,
  assessment: PhysicalAssessment,
  updateFunctionalTest: (id: string, patch: Partial<FunctionalTest>) => void,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void
) {
  const definition = getFunctionalTestDefinition(test.testId, test.customDefinition);
  if (!definition) return null;
  const snapshot = calculateFunctionalTestSnapshot(test);
  const updateField = (fieldId: string, next: FunctionalFieldResult) => {
    updateFunctionalTest(test.id, {
      fields: {
        ...test.fields,
        [fieldId]: {
          ...(test.fields[fieldId] ?? {}),
          ...next,
        },
      },
    });
  };

  return (
    <View key={test.id} style={styles.innerCard}>
      <View style={styles.functionalHeader}>
        <View style={styles.sectionIconBubble}>
          <Ionicons name="body-outline" size={20} color="#D90000" />
        </View>
        <View style={styles.protocolTextBlock}>
          <Text style={styles.sectionTitle}>{index + 1}. {definition.name}</Text>
          <Text style={styles.mutedText}>{definition.category} • versão {definition.version}</Text>
        </View>
      </View>

      <Text style={styles.helperText}>{definition.objective}</Text>
      <Text style={styles.helperText}>Preparação: {definition.preparation}</Text>
      <Text style={styles.helperText}>Interromper se houver: {definition.interruptionCriteria.slice(0, 5).join(", ")}.</Text>

      <Segmented
        label="Status do teste"
        value={test.status}
        options={[
          ["rascunho", "Rascunho"],
          ["apto", "Apto"],
          ["adaptado", "Adaptado"],
          ["adiado", "Adiado"],
          ["contraindicado", "Contraindicado"],
          ["interrompido", "Interrompido"],
          ["concluido", "Concluído"],
        ]}
        onChange={(value) => updateFunctionalTest(test.id, { status: value as never })}
      />
      <BooleanGroup label="Obrigatório na bateria" value={test.required} onChange={(value) => updateFunctionalTest(test.id, { required: value })} />
      <BooleanGroup label="Teste adaptado" value={test.adapted} onChange={(value) => updateFunctionalTest(test.id, { adapted: value })} />
      {test.adapted && (
        <TextArea label="Motivo da adaptação" value={test.adaptationReason} onChangeText={(value) => updateFunctionalTest(test.id, { adaptationReason: value })} />
      )}
      {(test.status === "adiado" || test.status === "contraindicado" || test.status === "interrompido") && (
        <TextArea
          label="Motivo"
          value={test.interruptionReason || test.notPerformedReason}
          onChangeText={(value) =>
            updateFunctionalTest(test.id, {
              interruptionReason: test.status === "interrompido" ? value : test.interruptionReason,
              notPerformedReason: test.status !== "interrompido" ? value : test.notPerformedReason,
            })
          }
        />
      )}

      <Text style={styles.subsectionTitle}>Equipamento</Text>
      <Field
        label="Tipo de equipamento"
        value={test.equipment?.type}
        onChangeText={(value) => updateFunctionalTest(test.id, { equipment: { ...(test.equipment ?? {}), type: value } })}
      />
      <Field
        label="Fabricante/modelo"
        value={[test.equipment?.manufacturer, test.equipment?.model].filter(Boolean).join(" / ")}
        onChangeText={(value) => updateFunctionalTest(test.id, { equipment: { ...(test.equipment ?? {}), model: value } })}
      />

      <Text style={styles.subsectionTitle}>Resultados</Text>
      {definition.fields.map((field) => renderFunctionalExecutionField(field, test.fields[field.id], updateField))}

      <ConditionalField
        label="Dor ou desconforto"
        value={test.pain?.present}
        details={test.pain?.notes}
        onToggle={(value) => updateFunctionalTest(test.id, { pain: { ...(test.pain ?? {}), present: value } })}
        onDetails={(value) => updateFunctionalTest(test.id, { pain: { ...(test.pain ?? {}), notes: value } })}
      />
      <TextArea label="Compensações observadas" value={test.compensations} onChangeText={(value) => updateFunctionalTest(test.id, { compensations: value })} />
      <TextArea label="Comentários profissionais" value={test.professionalNotes} onChangeText={(value) => updateFunctionalTest(test.id, { professionalNotes: value })} />

      <View style={styles.calculationDetails}>
        <Text style={styles.sectionTitle}>Resumo calculado</Text>
        <ResultLine label="Resultado principal" value={formatResult(snapshot.primaryResult?.value, snapshot.primaryResult?.unit)} />
        {!!snapshot.estimatedOneRmKg && <ResultLine label="1RM estimado" value={formatResult(snapshot.estimatedOneRmKg, "kg")} />}
        {!!snapshot.asymmetry && (
          <>
            <ResultLine label="Assimetria absoluta" value={formatResult(snapshot.asymmetry.absoluteDifference, snapshot.primaryResult?.unit)} />
            <ResultLine label="Assimetria percentual" value={formatResult(snapshot.asymmetry.percentDifference, "%")} />
            <Text style={styles.helperText}>{snapshot.asymmetry.formula}</Text>
          </>
        )}
        {snapshot.attentionFlags.map((flag) => (
          <Text key={flag} style={styles.warningText}>{flag}</Text>
        ))}
        {snapshot.validation.errors.map((validationError) => (
          <Text key={validationError} style={styles.errorText}>{validationError}</Text>
        ))}
        <Text style={styles.helperText}>Interpretação: {snapshot.interpretation}</Text>
        <Text style={styles.helperText}>Referência: {snapshot.reference}</Text>
      </View>

      <TouchableOpacity
        style={styles.removeInlineButton}
        onPress={() => updateRoot("functionalTests", assessment.functionalTests.filter((item) => item.id !== test.id))}
      >
        <Ionicons name="trash-outline" size={16} color="#ff4444" />
        <Text style={styles.removeInlineText}>Remover teste</Text>
      </TouchableOpacity>
    </View>
  );
}

function renderFunctionalExecutionField(
  field: FunctionalTestFieldDefinition,
  result: FunctionalFieldResult | undefined,
  updateField: (fieldId: string, next: FunctionalFieldResult) => void
) {
  if (field.kind === "boolean") {
    return (
      <BooleanGroup
        key={field.id}
        label={field.label}
        value={typeof result?.value === "boolean" ? result.value : undefined}
        onChange={(value) => updateField(field.id, { value })}
      />
    );
  }

  if (field.kind === "choice") {
    return (
      <Segmented
        key={field.id}
        label={field.label}
        value={typeof result?.value === "string" ? result.value : undefined}
        options={(field.options ?? []).map((option) => [option, option])}
        onChange={(value) => updateField(field.id, { value })}
      />
    );
  }

  if (field.kind === "text") {
    return (
      <Field
        key={field.id}
        label={field.label}
        value={typeof result?.value === "string" ? result.value : undefined}
        onChangeText={(value) => updateField(field.id, { value })}
      />
    );
  }

  const attemptsCount = field.attempts ?? 1;
  if (field.bilateral) {
    return (
      <View key={field.id} style={styles.measureBlock}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <Text style={styles.measureTip}>{field.help}</Text>
        {(["right", "left"] as const).map((side) => (
          <View key={`${field.id}-${side}`} style={styles.attemptBox}>
            <Text style={styles.subsectionTitle}>{side === "right" ? "Direito" : "Esquerdo"}</Text>
            {Array.from({ length: attemptsCount }).map((_, index) => {
              const attempts = result?.[side] ?? [];
              const attempt = attempts[index] ?? {};
              return (
                <View key={`${field.id}-${side}-${index}`}>
                  <NumericField
                    label={`Tentativa ${index + 1}`}
                    suffix={field.unit}
                    value={attempt.value}
                    onChangeNumber={(value) => {
                      const nextAttempts = [...attempts];
                      nextAttempts[index] = { ...attempt, value };
                      updateField(field.id, { [side]: nextAttempts });
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.invalidButton, attempt.invalid && styles.invalidButtonActive]}
                    onPress={() => {
                      const nextAttempts = [...attempts];
                      nextAttempts[index] = { ...attempt, invalid: !attempt.invalid };
                      updateField(field.id, { [side]: nextAttempts });
                    }}
                  >
                    <Text style={[styles.invalidText, attempt.invalid && styles.invalidTextActive]}>Tentativa inválida</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  const attempts = result?.attempts ?? [];
  return (
    <View key={field.id} style={styles.measureBlock}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <Text style={styles.measureTip}>{field.help}</Text>
      {Array.from({ length: attemptsCount }).map((_, index) => {
        const attempt = attempts[index] ?? {};
        return (
          <View key={`${field.id}-${index}`}>
            <NumericField
              label={`Tentativa ${index + 1}`}
              suffix={field.unit}
              value={attempt.value}
              onChangeNumber={(value) => {
                const nextAttempts = [...attempts];
                nextAttempts[index] = { ...attempt, value };
                updateField(field.id, { attempts: nextAttempts });
              }}
            />
            {attemptsCount > 1 && (
              <TouchableOpacity
                style={[styles.invalidButton, attempt.invalid && styles.invalidButtonActive]}
                onPress={() => {
                  const nextAttempts = [...attempts];
                  nextAttempts[index] = { ...attempt, invalid: !attempt.invalid };
                  updateField(field.id, { attempts: nextAttempts });
                }}
              >
                <Text style={[styles.invalidText, attempt.invalid && styles.invalidTextActive]}>Tentativa inválida</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

function renderPhotosStep(
  assessment: PhysicalAssessment,
  handleAcceptConsent: () => void,
  handlePickPhoto: (view: AssessmentPhoto["view"], source: "camera" | "library") => void,
  handleRemoveAnnotation: (photoId: string, annotationId: string) => void,
  handleAddAnnotation: (photoId: string) => void,
  removePhoto: (assessmentId: string, photoId: string) => Promise<PhysicalAssessment>,
  annotationDraft: { photoId?: string; region: PosturalRegion; type: "point" | "line"; note: string },
  setAnnotationDraft: React.Dispatch<React.SetStateAction<{ photoId?: string; region: PosturalRegion; type: "point" | "line"; note: string }>>,
  setAssessment: React.Dispatch<React.SetStateAction<PhysicalAssessment | null>>
) {
  const views = [...PHOTO_VIEWS, { id: "adicional" as const, label: "Adicional", instruction: "Foto adicional cadastrada pelo personal." }];

  return (
    <StepCard title="Fotos e Postura" note="As fotos originais são preservadas. Marcações e observações ficam salvas como dados separados.">
      <View style={styles.warningBox}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#D90000" />
        <Text style={styles.warningText}>
          Fotos corporais são dados sensíveis. Não use para marketing, exportação ou compartilhamento externo sem consentimento separado.
        </Text>
      </View>

      {!assessment.photoConsent?.accepted ? (
        <View style={styles.consentBox}>
          <Text style={styles.sectionTitle}>Consentimento de fotos</Text>
          <Text style={styles.mutedText}>
            Autoriza captura, armazenamento local, uso profissional, comparação de evolução e visualização pelo aluno dentro do app.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAcceptConsent}>
            <Text style={styles.primaryButtonText}>Registrar consentimento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.helperText}>Consentimento registrado em {formatAssessmentDate(assessment.photoConsent.acceptedAt)}.</Text>
      )}

      {views.map((view) => {
        const photo = assessment.photos.find((item) => item.view === view.id);
        return (
          <View key={view.id} style={styles.photoCard}>
            <View style={styles.photoHeader}>
              <View>
                <Text style={styles.sectionTitle}>{view.label}</Text>
                <Text style={styles.mutedText}>{view.instruction}</Text>
              </View>
              {photo && (
                <TouchableOpacity
                  style={styles.smallDangerButton}
                  onPress={async () => {
                    const updated = await removePhoto(assessment.id, photo.id);
                    setAssessment(updated);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff4444" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.captureGuide}>
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <>
                  <View style={styles.silhouette} />
                  <View style={styles.verticalGuide} />
                  <Text style={styles.guideText}>Vertical • corpo inteiro • fundo limpo • iluminação uniforme</Text>
                </>
              )}
            </View>

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => handlePickPhoto(view.id, "camera")}>
                <Ionicons name="camera-outline" size={18} color="#D90000" />
                <Text style={styles.secondaryButtonText}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => handlePickPhoto(view.id, "library")}>
                <Ionicons name="images-outline" size={18} color="#D90000" />
                <Text style={styles.secondaryButtonText}>Galeria</Text>
              </TouchableOpacity>
            </View>

            {photo && (
              <View style={styles.annotationBlock}>
                <Text style={styles.subsectionTitle}>Observações posturais</Text>
                <Segmented
                  label="Tipo de marcação"
                  value={annotationDraft.photoId === photo.id ? annotationDraft.type : "point"}
                  options={[
                    ["point", "Ponto"],
                    ["line", "Linha"],
                  ]}
                  onChange={(value) => setAnnotationDraft((draft) => ({ ...draft, photoId: photo.id, type: value as "point" | "line" }))}
                />
                <Segmented
                  label="Região"
                  value={annotationDraft.photoId === photo.id ? annotationDraft.region : "ombros"}
                  options={(Object.keys(POSTURAL_REGION_LABELS) as PosturalRegion[]).map((region) => [region, POSTURAL_REGION_LABELS[region]])}
                  onChange={(value) => setAnnotationDraft((draft) => ({ ...draft, photoId: photo.id, region: value as PosturalRegion }))}
                />
                <TextArea
                  label="Observação da marcação"
                  value={annotationDraft.photoId === photo.id ? annotationDraft.note : ""}
                  onChangeText={(value) => setAnnotationDraft((draft) => ({ ...draft, photoId: photo.id, note: value }))}
                />
                <TouchableOpacity style={styles.secondaryFullButton} onPress={() => handleAddAnnotation(photo.id)}>
                  <Ionicons name="add" size={18} color="#D90000" />
                  <Text style={styles.secondaryButtonText}>Adicionar marcação</Text>
                </TouchableOpacity>

                {photo.annotations.map((annotation) => (
                  <View key={annotation.id} style={styles.annotationItem}>
                    <Text style={styles.annotationText}>
                      {annotation.type === "line" ? "Linha" : "Ponto"} • {POSTURAL_REGION_LABELS[annotation.region]} •{" "}
                      {annotation.note || "Sem observação"}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveAnnotation(photo.id, annotation.id)}>
                      <Ionicons name="close" size={18} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </StepCard>
  );
}

function renderConclusionStep(
  assessment: PhysicalAssessment,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void
) {
  const update = (patch: Partial<PhysicalAssessment["conclusion"]>) =>
    updateRoot("conclusion", { ...assessment.conclusion, ...patch });

  return (
    <StepCard title="Observações e conclusão" note="O relatório fica disponível dentro do app após concluir e liberar para o aluno.">
      <TextArea label="Pontos de atenção" value={assessment.conclusion.attentionPoints} onChangeText={(value) => update({ attentionPoints: value })} />
      <TextArea label="Objetivos definidos" value={assessment.conclusion.definedGoals} onChangeText={(value) => update({ definedGoals: value })} />
      <TextArea label="Recomendações do personal" value={assessment.conclusion.trainerRecommendations} onChangeText={(value) => update({ trainerRecommendations: value })} />
      <TextArea label="Observações finais" value={assessment.conclusion.notes} onChangeText={(value) => update({ notes: value })} />
      <BooleanGroup label="Liberar relatório para o aluno" value={assessment.conclusion.releaseToStudent} onChange={(value) => update({ releaseToStudent: value })} />
      <BooleanGroup label="Marcar como compartilhado no app" value={assessment.conclusion.reportSharedWithStudent} onChange={(value) => update({ reportSharedWithStudent: value })} />
    </StepCard>
  );
}

function StepCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!note && <Text style={styles.noteText}>{note}</Text>}
      {children}
    </View>
  );
}

function CompositionSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.compositionSection}>
      <View style={styles.compositionSectionHeader}>
        <View style={styles.compositionSectionTitleRow}>
          <View style={styles.sectionTitleBullet} />
          <Text style={styles.compositionSectionTitle}>{title}</Text>
        </View>
        {!!note && <Text style={styles.compositionSectionNote}>{note}</Text>}
      </View>
      <View style={styles.compositionSectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChangeText }: { label: string; value?: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value ?? ""}
        onChangeText={onChangeText}
        placeholder="Não informado"
        placeholderTextColor="#666"
      />
    </View>
  );
}

function ComparisonNumericField({
  label,
  value,
  suffix,
  previousValue,
  onChangeNumber,
}: {
  label: string;
  value?: number;
  suffix?: string;
  previousValue?: number;
  onChangeNumber: (value?: number) => void;
}) {
  const previousText = typeof previousValue === "number" ? `${previousValue}${suffix ? ` ${suffix}` : ""}` : "Sem registro";

  return (
    <View style={styles.compareFieldRow}>
      <View style={styles.compareFieldMain}>
        <Text style={styles.compareLabel}>{label}</Text>
        <View style={styles.compareInputWrap}>
          <TextInput
            style={styles.compareInput}
            value={textOrEmpty(value)}
            onChangeText={(text) => onChangeNumber(text.trim() ? normalizeDecimal(text) : undefined)}
            placeholder="0"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
          />
          {!!suffix && <Text style={styles.suffixText}>{suffix}</Text>}
        </View>
      </View>
      <View style={styles.previousValueBox}>
        <Text style={styles.previousLabel}>Anterior</Text>
        <Text style={styles.previousValue} numberOfLines={1}>{previousText}</Text>
      </View>
    </View>
  );
}

function NumericField({
  label,
  value,
  suffix,
  onChangeNumber,
}: {
  label: string;
  value?: number;
  suffix?: string;
  onChangeNumber: (value?: number) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.numericRow}>
        <TextInput
          style={styles.numericInput}
          value={textOrEmpty(value)}
          onChangeText={(text) => onChangeNumber(text.trim() ? normalizeDecimal(text) : undefined)}
          placeholder="Não informado"
          placeholderTextColor="#666"
          keyboardType="decimal-pad"
        />
        {!!suffix && <Text style={styles.suffixText}>{suffix}</Text>}
      </View>
    </View>
  );
}

function TextArea({ label, value, onChangeText }: { label: string; value?: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={value ?? ""}
        onChangeText={onChangeText}
        placeholder="Não informado"
        placeholderTextColor="#666"
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  const isGrid = options.length > 4;

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.segmentedContainer, isGrid && styles.segmentedGrid]}>
        {options.map(([optionValue, optionLabel]) => {
          const active = value === optionValue;
          return (
            <TouchableOpacity
              key={optionValue}
              style={[
                styles.segmentItem,
                isGrid && styles.segmentItemGrid,
                active && styles.segmentItemActive,
              ]}
              onPress={() => onChange(optionValue)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.segmentItemText,
                  active && styles.segmentItemTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {optionLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function BooleanGroup({ label, value, onChange }: { label: string; value?: boolean; onChange: (value: boolean) => void }) {
  return (
    <Segmented
      label={label}
      value={typeof value === "boolean" ? String(value) : undefined}
      options={yesNoOptions.map((item) => [String(item.value), item.label])}
      onChange={(next) => onChange(next === "true")}
    />
  );
}

function ConditionalField({
  label,
  value,
  details,
  onToggle,
  onDetails,
}: {
  label: string;
  value?: boolean;
  details?: string;
  onToggle: (value: boolean) => void;
  onDetails: (value: string) => void;
}) {
  return (
    <View>
      <BooleanGroup label={label} value={value} onChange={onToggle} />
      {value && <TextArea label={`Detalhes - ${label}`} value={details} onChangeText={onDetails} />}
    </View>
  );
}

function Calculated({ label, value, suffix }: { label: string; value?: number; suffix?: string }) {
  return (
    <View style={styles.resultRow}>
      <View>
        <Text style={styles.resultLabel}>{label}</Text>
        <Text style={styles.helperText}>Calculado automaticamente</Text>
      </View>
      <Text style={styles.resultValue}>{typeof value === "number" ? `${value}${suffix ? ` ${suffix}` : ""}` : "Não informado"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#D90000",
    fontWeight: "800",
    marginTop: 3,
  },
  confirmIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  registrationPanel: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  registrationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "rgba(217, 0, 0, 0.6)",
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  studentInfoBlock: {
    flex: 1,
    minWidth: 0,
  },
  studentNameText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  trainerNameText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  registrationPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  registrationMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  dateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTagText: {
    color: "#aaaaaa",
    fontSize: 12,
    fontWeight: "700",
  },
  progressSummaryText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
  },
  typePill: {
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    backgroundColor: "#101010",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  typePillText: {
    color: "#aaaaaa",
    fontSize: 11,
    fontWeight: "800",
  },
  progressBadge: {
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.4)",
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  progressBadgeText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  statusBadge: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    color: "#D90000",
    fontWeight: "900",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#202020",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D90000",
  },
  compactBaseGrid: {
    gap: 8,
  },
  compositionSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#161616",
    padding: 16,
    marginBottom: 14,
  },
  compositionSectionHeader: {
    marginBottom: 12,
  },
  compositionSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitleBullet: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#D90000",
  },
  compositionSectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  compositionSectionNote: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 4,
  },
  compositionSectionBody: {
    gap: 10,
  },
  protocolChoiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  protocolChoice: {
    flexBasis: "48.5%",
    flexGrow: 1,
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#101010",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  protocolChoiceSelected: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.12)",
  },
  protocolChoiceDisabled: {
    opacity: 0.42,
  },
  protocolChoiceDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },
  protocolChoiceDotSelected: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  protocolChoiceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  protocolChoiceSubtext: {
    color: "#858585",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 3,
  },
  compareFieldRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 10,
  },
  compareFieldMain: {
    flex: 1,
    minWidth: 0,
  },
  compareLabel: {
    color: "#f5f5f5",
    fontWeight: "800",
    marginBottom: 7,
  },
  compareInputWrap: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    backgroundColor: "#101010",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  compareInput: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  previousValueBox: {
    width: 108,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2f2f2f",
    backgroundColor: "#111",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  previousLabel: {
    color: "#777",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  previousValue: {
    color: "#ddd",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },
  protocolList: {
    gap: 10,
  },
  protocolOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#101010",
    padding: 12,
  },
  protocolOptionSelected: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0,0.12)",
  },
  protocolOptionDisabled: {
    opacity: 0.45,
  },
  protocolOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  protocolDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  protocolDotSelected: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  protocolTextBlock: {
    flex: 1,
  },
  protocolName: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  protocolMeta: {
    color: "#888",
    fontWeight: "700",
    marginTop: 3,
  },
  protocolDescription: {
    color: "#aaa",
    lineHeight: 18,
    marginTop: 9,
  },
  protocolLink: {
    color: "#D90000",
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 8,
  },
  protocolInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(217, 0, 0,0.10)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0,0.22)",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  disabledText: {
    color: "#777",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,90,90,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.22)",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: "#ff8b8b",
    flex: 1,
    lineHeight: 19,
  },
  resultGrid: {
    gap: 8,
  },
  twoColumnGrid: {
    gap: 8,
    width: "100%",
  },
  resultTile: {
    flex: 1,
    minHeight: 74,
    borderRadius: 12,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    justifyContent: "space-between",
  },
  resultTileLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  resultTileValue: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 6,
  },
  resultLine: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2b2b2b",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  previousBox: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginTop: 12,
  },
  calculationDetails: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginTop: 12,
  },
  measureTip: {
    color: "#777",
    lineHeight: 18,
    marginBottom: 8,
  },
  deleteStrip: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,90,90,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  deleteStripText: {
    color: "#ff5a5a",
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 12,
  },
  sectionListCard: {
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2b2b2b",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  sectionRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2b2b2b",
  },
  sectionRowLast: {
    borderBottomWidth: 0,
  },
  sectionIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(217, 0, 0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconBubbleComplete: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  sectionRowText: {
    flex: 1,
    minWidth: 0,
  },
  sectionRowTitle: {
    color: "#f4f4f4",
    fontSize: 16,
    fontWeight: "800",
  },
  sectionRowSubtitle: {
    color: "#777",
    marginTop: 4,
    lineHeight: 18,
  },
  sectionRowRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  sectionStateText: {
    color: "#666",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionStateTextComplete: {
    color: "#D90000",
  },
  sectionDetailHeader: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  sectionBackButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  sectionBackText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionDetailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionDetailTitleBlock: {
    flex: 1,
  },
  sectionDetailTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  sectionDetailSubtitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  stepWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  stepChip: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  stepChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  stepChipComplete: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  stepChipText: {
    color: "#888",
    fontWeight: "800",
    fontSize: 12,
  },
  stepChipTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  subsectionTitle: {
    color: "#fff",
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 8,
  },
  noteText: {
    color: "#888",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  fieldBlock: {
    marginTop: 12,
  },
  fieldLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#101010",
    color: "#fff",
    paddingHorizontal: 13,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
    lineHeight: 20,
  },
  numericRow: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#101010",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  numericInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  suffixText: {
    color: "#888",
    fontWeight: "800",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },
  columnHalf: {
    flex: 1,
  },
  segmentedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 3,
    gap: 4,
  },
  segmentedGrid: {
    flexWrap: "wrap",
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  segmentItemGrid: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  segmentItemActive: {
    backgroundColor: "#D90000",
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentItemText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  segmentItemTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  categoryFilterRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingRight: 10,
  },
  categoryFilterChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#121212",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryFilterChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  categoryFilterChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  categoryFilterChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#101010",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  chipText: {
    color: "#888",
    fontWeight: "800",
  },
  chipTextActive: {
    color: "#fff",
  },
  resultRow: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#101010",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultLabel: {
    color: "#888",
    fontWeight: "800",
  },
  resultValue: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "right",
    flexShrink: 1,
  },
  helperText: {
    color: "#666",
    lineHeight: 18,
    marginTop: 4,
  },
  measureBlock: {
    marginTop: 12,
  },
  fieldPrevious: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  compactAttemptGrid: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
  },
  compactAttemptCell: {
    flex: 1,
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 8,
    alignItems: "center",
  },
  compactAttemptLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  compactAttemptInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161616",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    height: 38,
    paddingHorizontal: 4,
    width: "100%",
  },
  compactAttemptInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 0,
  },
  compactAttemptSuffix: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
    marginRight: 2,
  },
  attemptRow: {
    gap: 8,
  },
  attemptBox: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  invalidButton: {
    alignSelf: "stretch",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  invalidButtonActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  invalidText: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "800",
  },
  invalidTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  innerCard: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginTop: 10,
  },
  stageCard: {
    backgroundColor: "#151515",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    padding: 10,
    marginTop: 10,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  cardioGraph: {
    borderRadius: 12,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#2b2b2b",
    padding: 10,
    marginTop: 12,
  },
  cardioGraphRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardioGraphLabel: {
    width: 58,
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
  },
  cardioGraphTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#252525",
    overflow: "hidden",
  },
  cardioGraphBar: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#D90000",
  },
  cardioGraphBarDeflection: {
    backgroundColor: "#f4c542",
  },
  cardioGraphValue: {
    width: 58,
    color: "#ddd",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "right",
  },
  functionalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  removeInlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  removeInlineText: {
    color: "#ff4444",
    fontWeight: "800",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    color: "#ddd",
    flex: 1,
    lineHeight: 19,
  },
  consentBox: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  photoCard: {
    backgroundColor: "#101010",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  photoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  smallDangerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  captureGuide: {
    marginTop: 12,
    minHeight: 260,
    borderRadius: 14,
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPreview: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  silhouette: {
    width: 96,
    height: 210,
    borderWidth: 2,
    borderColor: "#D90000",
    borderRadius: 48,
    opacity: 0.6,
  },
  verticalGuide: {
    position: "absolute",
    top: 18,
    bottom: 18,
    width: 1,
    backgroundColor: "#D90000",
    opacity: 0.45,
  },
  guideText: {
    color: "#888",
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 14,
    lineHeight: 19,
  },
  photoActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  annotationBlock: {
    marginTop: 12,
  },
  annotationItem: {
    borderRadius: 12,
    backgroundColor: "#1c1c1c",
    padding: 10,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  annotationText: {
    color: "#ddd",
    flex: 1,
    lineHeight: 18,
  },
  navigationRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  footerActions: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    flex: 1,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    flex: 1,
  },
  secondaryFullButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 92,
    paddingRight: 20,
  },
  menuModal: {
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    minWidth: 210,
    padding: 8,
  },
  menuAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  deleteText: {
    color: "#ff4444",
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
    textAlign: "center",
    marginTop: 10,
  },
  centerText: {
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
