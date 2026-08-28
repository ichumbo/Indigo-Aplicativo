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
        <TouchableOpacity style={styles.backButton} onPress={() => (showSectionForm ? setShowSectionForm(false) : router.back())} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#D90000" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>{showSectionForm ? activeStepPresentation.title : "Cadastro da Avaliação"}</Text>
          <Text style={styles.headerSubtitle}>
            {showSectionForm ? "Cadastro da Avaliação" : getAssessmentStatusLabel(assessment.status)} •{" "}
            {savingStatus === "saving" ? "Salvando..." : savingStatus === "saved" ? "Salvo" : "Autosave"}
          </Text>
        </View>
        <TouchableOpacity style={styles.confirmIconButton} onPress={() => persist({}, "Rascunho salvo manualmente.")} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={22} color="#D90000" />
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
                      <Ionicons name={presentation.icon} size={22} color={complete ? "#0f0f0f" : "#D90000"} />
                    </View>
                    <View style={styles.sectionRowText}>
                      <Text style={styles.sectionRowTitle}>{presentation.title}</Text>
                      <Text style={styles.sectionRowSubtitle}>{presentation.subtitle}</Text>
                    </View>
                    <View style={styles.sectionRowRight}>
                      <Text style={[styles.sectionStateText, complete && styles.sectionStateTextComplete]}>{stateLabel}</Text>
                      <Ionicons name={complete ? "checkmark-circle" : "chevron-forward"} size={20} color={complete ? "#D90000" : "#555"} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Atalho rápido entre etapas */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionTabsRail}
            >
              {ASSESSMENT_STEPS.map((step) => {
                const isCurrent = step.id === activeStep;
                const isStepDone = assessment.steps[step.id]?.complete;
                const stepPres = sectionPresentation[step.id];
                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[styles.sectionTabChip, isCurrent && styles.sectionTabChipActive]}
                    onPress={() => setActiveStep(step.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={stepPres.icon}
                      size={14}
                      color={isCurrent ? "#000000" : isStepDone ? "#10B981" : "#999999"}
                    />
                    <Text style={[styles.sectionTabChipText, isCurrent && styles.sectionTabChipTextActive]}>
                      {stepPres.title}
                    </Text>
                    {isStepDone && !isCurrent && (
                      <View style={styles.tabDoneDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sectionDetailHeader}>
              <TouchableOpacity
                style={styles.sectionBackButton}
                onPress={() => setShowSectionForm(false)}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={15} color="#D90000" />
                <Text style={styles.sectionBackText}>Voltar ao menu</Text>
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
  const setNextDateDays = (days: number) => {
    const base = new Date(assessment.assessedAt || new Date());
    base.setDate(base.getDate() + days);
    updateRoot("nextAssessmentAt", base.toISOString());
  };

  const FREQUENCIES = [2, 3, 4, 5, 6];

  return (
    <StepCard
      title="Informações gerais"
      note="Defina os parâmetros do aluno, tipo da avaliação, objetivos e planejamento de retorno."
      icon="person-circle-outline"
    >
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

      {/* Agendamento & Retorno */}
      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="calendar-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Agendamento & Retorno</Text>
        </View>
      </View>

      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <DateField
            label="Data da avaliação"
            isoValue={assessment.assessedAt}
            onChangeIso={(value) => updateRoot("assessedAt", value, "Data da avaliação alterada.")}
            icon="calendar-outline"
          />
        </View>
        <View style={styles.columnHalf}>
          <DateField
            label="Próxima reavaliação"
            isoValue={assessment.nextAssessmentAt}
            onChangeIso={(value) => updateRoot("nextAssessmentAt", value, "Próxima reavaliação alterada.")}
            icon="refresh-outline"
          />
        </View>
      </View>

      <View style={styles.datePresetsContainer}>
        <View style={styles.datePresetsHeader}>
          <Ionicons name="time-outline" size={13} color="#D90000" />
          <Text style={styles.datePresetsLabel}>Atalhos rápidos para retorno:</Text>
        </View>
        <View style={styles.datePresetsGrid}>
          {[
            { label: "+30 dias", days: 30 },
            { label: "+60 dias", days: 60 },
            { label: "+90 dias (Padrão)", days: 90 },
            { label: "+120 dias", days: 120 },
          ].map((preset) => (
            <TouchableOpacity
              key={preset.days}
              style={styles.datePresetChip}
              onPress={() => setNextDateDays(preset.days)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={11} color="#D90000" />
              <Text style={styles.datePresetChipText} numberOfLines={1}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Objetivos do Aluno */}
      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="flag-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Objetivos do Aluno</Text>
        </View>
      </View>

      <TextArea
        label="Objetivo principal"
        value={assessment.general.mainGoal}
        placeholder="Ex.: Hipertrofia com foco em dorsais e redução de percentual de gordura..."
        onChangeText={(value) => updateRoot("general", { ...assessment.general, mainGoal: value })}
        suggestionChips={[
          "Hipertrofia muscular",
          "Emagrecimento & queima",
          "Condicionamento físico",
          "Ganho de força & potência",
          "Reabilitação / Postura",
          "Aumento de massa magra",
        ]}
        icon="trophy-outline"
      />
      <TextArea
        label="Objetivos secundários"
        value={assessment.general.secondaryGoals}
        placeholder="Ex.: Melhorar flexibilidade, qualidade do sono e disposição..."
        onChangeText={(value) => updateRoot("general", { ...assessment.general, secondaryGoals: value })}
        suggestionChips={[
          "Mobilidade articular",
          "Mais disposição diária",
          "Alívio e prevenção de dores",
          "Qualidade do sono",
          "Melhora do VO2máx",
        ]}
        icon="heart-outline"
      />

      {/* Perfil & Rotina */}
      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="briefcase-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Perfil & Rotina</Text>
        </View>
      </View>

      <Segmented
        label="Nível de experiência"
        value={assessment.general.experienceLevel}
        options={[
          ["iniciante", "Iniciante"],
          ["intermediario", "Intermediário"],
          ["avancado", "Avançado"],
        ]}
        onChange={(value) => updateRoot("general", { ...assessment.general, experienceLevel: value as never })}
        icon="barbell-outline"
      />

      {/* Frequência Semanal em Chips */}
      <View style={styles.fieldBlock}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name="fitness-outline" size={14} color="#D90000" />
          <Text style={styles.fieldLabel}>Frequência semanal de treino</Text>
        </View>
        <View style={styles.frequencyChipsRow}>
          {FREQUENCIES.map((freq) => {
            const isSelected = assessment.general.weeklyTrainingFrequency === freq;
            return (
              <TouchableOpacity
                key={freq}
                style={[styles.frequencyChip, isSelected && styles.frequencyChipActive]}
                onPress={() => updateRoot("general", { ...assessment.general, weeklyTrainingFrequency: freq })}
                activeOpacity={0.8}
              >
                <Text style={[styles.frequencyChipNumber, isSelected && styles.frequencyChipNumberActive]}>
                  {freq}x
                </Text>
                <Text style={[styles.frequencyChipSub, isSelected && styles.frequencyChipSubActive]}>
                  dias/sem
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Field
        label="Profissão / Ocupação"
        value={assessment.general.profession}
        placeholder="Ex.: Engenheiro, Advogado, Estudante..."
        onChangeText={(value) => updateRoot("general", { ...assessment.general, profession: value })}
        icon="briefcase-outline"
      />
      <TextArea
        label="Rotina diária e horários"
        value={assessment.general.dailyRoutine}
        placeholder="Ex.: Trabalho sentado 8h/dia, treina pela manhã em jejum, sono regular..."
        onChangeText={(value) => updateRoot("general", { ...assessment.general, dailyRoutine: value })}
        suggestionChips={[
          "Trabalho sedentário / PC",
          "Rotina ativa / em pé",
          "Treina pela manhã",
          "Treina à noite",
          "Viagens frequentes",
        ]}
        icon="time-outline"
      />
    </StepCard>
  );
}

function renderAnamnesisStep(
  assessment: PhysicalAssessment,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void
) {
  const update = (patch: Partial<PhysicalAssessment["anamnesis"]>) =>
    updateRoot("anamnesis", { ...assessment.anamnesis, ...patch });

  const WATER_PRESETS = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0];

  return (
    <StepCard
      title="Anamnese & histórico de saúde"
      note="Registro clínico informativo. Marque as condições e toque nas opções rápidas para detalhar."
      icon="medkit-outline"
    >
      {/* Hábitos & Estilo de Vida */}
      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="heart-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Hábitos & Estilo de Vida</Text>
        </View>
      </View>

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
        icon="moon-outline"
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
        icon="pulse-outline"
      />

      {/* Consumo de água com Stepper/Chips */}
      <View style={styles.fieldBlock}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name="water-outline" size={14} color="#D90000" />
          <Text style={styles.fieldLabel}>Consumo de água (Litros/dia)</Text>
        </View>
        <View style={styles.waterChipsRow}>
          {WATER_PRESETS.map((liters) => {
            const isSelected = assessment.anamnesis.waterIntakeLiters === liters;
            return (
              <TouchableOpacity
                key={liters}
                style={[styles.waterChip, isSelected && styles.waterChipActive]}
                onPress={() => update({ waterIntakeLiters: liters })}
                activeOpacity={0.8}
              >
                <Ionicons name="water-outline" size={12} color={isSelected ? "#FFFFFF" : "#777777"} />
                <Text style={[styles.waterChipText, isSelected && styles.waterChipTextActive]}>
                  {liters.toFixed(1)} L
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TextArea
        label="Alimentação e suplementação"
        value={assessment.anamnesis.nutritionNotes}
        placeholder="Ex.: Acompanhamento nutricional ativo, uso de creatina e whey, boa ingestão hídrica..."
        onChangeText={(value) => update({ nutritionNotes: value })}
        suggestionChips={[
          "Segue plano com nutricionista",
          "Alimentação equilibrada sem plano",
          "Uso de Creatina + Whey Protein",
          "Baixa ingestão proteica / vegetal",
          "Jejum intermitente",
        ]}
        icon="restaurant-outline"
      />

      <BooleanGroup
        label="Tabagismo"
        description="Fumante ativo ou histórico recente de cigarro/vape"
        value={assessment.anamnesis.smoker}
        onChange={(value) => update({ smoker: value })}
      />

      <Segmented
        label="Consumo de álcool"
        value={assessment.anamnesis.alcoholUse}
        options={[
          ["nao", "Não"],
          ["ocasional", "Ocasional"],
          ["frequente", "Frequente"],
        ]}
        onChange={(value) => update({ alcoholUse: value as never })}
        icon="wine-outline"
      />

      <ConditionalField
        label="Outras atividades físicas"
        description="Prática paralela de outros esportes ou treinos"
        value={assessment.anamnesis.otherActivities}
        details={assessment.anamnesis.otherActivitiesDetails}
        suggestionChips={["Corrida de rua", "Futebol", "Natação", "Ciclismo", "Beach Tennis", "Crossfit", "Pilates", "Lutas"]}
        onToggle={(value) => update({ otherActivities: value })}
        onDetails={(value) => update({ otherActivitiesDetails: value })}
      />

      <TextArea
        label="Histórico esportivo prévio"
        value={assessment.anamnesis.sportsHistory}
        placeholder="Ex.: Musculação por 3 anos, histórico de natação competitiva na juventude..."
        onChangeText={(value) => update({ sportsHistory: value })}
        suggestionChips={[
          "Musculação prévia (+2 anos)",
          "Ex-atleta / histórico competitivo",
          "Praticou esportes coletivos",
          "Iniciante sem histórico anterior",
        ]}
        icon="trophy-outline"
      />

      {/* Saúde & Condições Médicas */}
      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="medkit-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Saúde & Condições Médicas</Text>
        </View>
      </View>

      <ConditionalField
        label="Doenças diagnosticadas"
        description="Hipertensão, diabetes, asma, cardiopatias, tireoide, etc."
        value={assessment.anamnesis.diagnosedDiseases}
        details={assessment.anamnesis.diagnosedDiseasesDetails}
        suggestionChips={["Hipertensão arterial", "Diabetes tipo 2", "Asma / Bronquite", "Hipotireoidismo", "Cardiopatia leve", "Colesterol alto"]}
        onToggle={(value) => update({ diagnosedDiseases: value })}
        onDetails={(value) => update({ diagnosedDiseasesDetails: value })}
      />

      <ConditionalField
        label="Cirurgias prévias"
        description="Cirurgias ortopédicas ou procedimentos gerais"
        value={assessment.anamnesis.surgeries}
        details={assessment.anamnesis.surgeriesDetails}
        suggestionChips={["Artroscopia de joelho", "Artroscopia de ombro", "Cirurgia na coluna", "Bariátrica", "Hérnia inguinal", "Cesárea"]}
        onToggle={(value) => update({ surgeries: value })}
        onDetails={(value) => update({ surgeriesDetails: value })}
      />

      <ConditionalField
        label="Lesões anteriores"
        description="Entorses, distensões, hérnias de disco ou fraturas"
        value={assessment.anamnesis.previousInjuries}
        details={assessment.anamnesis.previousInjuriesDetails}
        suggestionChips={["Hérnia de disco lombar", "Ruptura de LCA joelho", "Tendinite no ombro", "Entorse de tornozelo", "Epicondilite", "Condromalácia patelar"]}
        onToggle={(value) => update({ previousInjuries: value })}
        onDetails={(value) => update({ previousInjuriesDetails: value })}
      />

      <ConditionalField
        label="Dores atuais"
        description="Desconfortos em ombro, joelho, coluna ou punho"
        value={assessment.anamnesis.currentPain}
        details={assessment.anamnesis.currentPainDetails}
        suggestionChips={["Dor na lombar", "Joelho direito", "Joelho esquerdo", "Ombro direito", "Ombro esquerdo", "Cervical", "Punho"]}
        onToggle={(value) => update({ currentPain: value })}
        onDetails={(value) => update({ currentPainDetails: value })}
      />

      <ConditionalField
        label="Uso contínuo de medicamentos"
        description="Medicamentos que influenciem frequência cardíaca ou pressão"
        value={assessment.anamnesis.medications}
        details={assessment.anamnesis.medicationsDetails}
        suggestionChips={["Anti-hipertensivo", "Insulina / Hipoglicemiante", "Betabloqueador", "Levotiroxina", "Termogênico"]}
        onToggle={(value) => update({ medications: value })}
        onDetails={(value) => update({ medicationsDetails: value })}
      />

      <TextArea
        label="Limitações articulares ou de amplitude"
        value={assessment.anamnesis.limitations}
        placeholder="Ex.: Encurtamento de posteriores, pouca dorsiflexão de tornozelo..."
        onChangeText={(value) => update({ limitations: value })}
        suggestionChips={[
          "Encurtamento de cadeia posterior",
          "Pouca mobilidade de tornozelo",
          "Impacto no ombro na elevação",
          "Dificuldade de agachamento profundo",
        ]}
        icon="hand-left-outline"
      />

      <ConditionalField
        label="Restrições médicas informadas"
        description="Recomendações expressas por médico ou fisioterapeuta"
        value={assessment.anamnesis.medicalRestrictions}
        details={assessment.anamnesis.medicalRestrictionsDetails}
        suggestionChips={["Evitar impacto no joelho", "Sem carga axial pesada na coluna", "Limitar elevação acima de 90°", "Manter FC moderada"]}
        onToggle={(value) => update({ medicalRestrictions: value })}
        onDetails={(value) => update({ medicalRestrictionsDetails: value })}
      />

      <BooleanGroup
        label="Necessidade de liberação médica"
        description="Exige apresentação de atestado médico antes de progressão de carga"
        value={assessment.anamnesis.needsMedicalClearance}
        onChange={(value) => update({ needsMedicalClearance: value })}
      />

      <TextArea
        label="Observações gerais da anamnese"
        value={assessment.anamnesis.notes}
        placeholder="Anotações adicionais do personal..."
        onChangeText={(value) => update({ notes: value })}
        suggestionChips={[
          "Aluno liberado para treinos com foco adaptativo",
          "Atenção redobrada na postura inicial",
          "Apresentou atestado médico recente",
        ]}
        icon="document-text-outline"
      />
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
        note="Escolha o método da avaliação. O cálculo técnico e a fórmula permanecem salvos no relatório."
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

            const getProtocolMeta = () => {
              switch (protocol.id) {
                case "jackson-pollock-3":
                  return { tag: "3 Dobras", icon: "cut-outline" as IoniconName, title: "Pollock 3D", sub: "3 dobras cutâneas + idade" };
                case "jackson-pollock-7":
                  return { tag: "7 Dobras", icon: "cut-outline" as IoniconName, title: "Pollock 7D", sub: "7 dobras cutâneas + idade" };
                case "guedes-3":
                  return { tag: "3 Dobras", icon: "calculator-outline" as IoniconName, title: "Guedes 3D", sub: "Equação brasileira (Siri)" };
                case "faulkner-4":
                  return { tag: "4 Dobras", icon: "cut-outline" as IoniconName, title: "Faulkner 4D", sub: "4 dobras clássico" };
                case "weltman-obesity":
                  return { tag: "Perímetros", icon: "body-outline" as IoniconName, title: "Weltman", sub: "Circunferência + peso" };
                case "bioimpedance":
                  return { tag: "Balança", icon: "fitness-outline" as IoniconName, title: "Bioimpedância", sub: "Dados do equipamento" };
                default:
                  return { tag: "Geral", icon: "clipboard-outline" as IoniconName, title: protocol.shortName, sub: protocol.measuresSummary };
              }
            };

            const meta = getProtocolMeta();
            const statusText = disabled ? applicability.reasons[0] : applicability.warnings[0] ?? meta.sub;

            return (
              <TouchableOpacity
                key={protocol.id}
                style={[
                  styles.protocolChoiceCard,
                  selected && styles.protocolChoiceCardSelected,
                  disabled && styles.protocolChoiceCardDisabled,
                ]}
                activeOpacity={0.82}
                disabled={disabled}
                onPress={() => selectProtocol(protocol.id)}
              >
                <View style={styles.protocolCardTopRow}>
                  <View
                    style={[
                      styles.protocolIconBox,
                      selected && styles.protocolIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name={selected ? "checkmark" : meta.icon}
                      size={14}
                      color={selected ? "#FFFFFF" : "#888888"}
                    />
                  </View>

                  <View
                    style={[
                      styles.protocolTagBadge,
                      selected && styles.protocolTagBadgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.protocolTagBadgeText,
                        selected && styles.protocolTagBadgeTextSelected,
                      ]}
                    >
                      {meta.tag}
                    </Text>
                  </View>
                </View>

                <View style={styles.protocolCardBottom}>
                  <Text
                    style={[
                      styles.protocolChoiceName,
                      selected && styles.protocolChoiceNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {meta.title}
                  </Text>
                  <Text
                    style={[
                      styles.protocolChoiceDesc,
                      disabled && styles.disabledText,
                      selected && styles.protocolChoiceDescSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {statusText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedProtocol && (
          <View style={styles.protocolInfoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#D90000" />
            <Text style={styles.warningText}>
              {selectedProtocol.displayName}: {selectedProtocol.description}
            </Text>
          </View>
        )}
      </CompositionSection>

      <CompositionSection title="Medidas básicas" note={previousContext}>
        <View style={styles.twoColumnGrid}>
          <View style={styles.twoColumnRow}>
            <View style={styles.columnHalf}>
              <ComparisonNumericField
                label="Peso corporal"
                suffix="kg"
                value={assessment.composition.weightKg}
                previousValue={previousComposition?.weightKg}
                onChangeNumber={(value) => updateComposition({ weightKg: value })}
              />
            </View>
            <View style={styles.columnHalf}>
              <ComparisonNumericField
                label="Estatura / Altura"
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
                label="Meta de gordura"
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
  const trunkPairs: [PerimeterKey, PerimeterKey, string, string, IoniconName, IoniconName][] = [
    ["neck", "shoulders", "Pescoço", "Ombros", "body-outline", "barbell-outline"],
    ["chest", "waist", "Tórax", "Cintura", "shirt-outline", "resize-outline"],
    ["abdomen", "hip", "Abdômen", "Quadril", "fitness-outline", "body-outline"],
  ];

  const limbPairs: [PerimeterKey, PerimeterKey, string, IoniconName][] = [
    ["rightArmRelaxed", "leftArmRelaxed", "Braço relaxado", "body-outline"],
    ["rightArmFlexed", "leftArmFlexed", "Braço contraído", "barbell-outline"],
    ["rightForearm", "leftForearm", "Antebraço", "hand-right-outline"],
    ["rightThigh", "leftThigh", "Coxa", "walk-outline"],
    ["rightCalf", "leftCalf", "Panturrilha", "footsteps-outline"],
  ];

  const renderPerimeterCell = (key: PerimeterKey, customLabel?: string, icon?: IoniconName) => {
    const previous = previousAssessment?.perimeters[key]?.valueCm;
    const current = assessment.perimeters[key]?.valueCm;
    const diff = previous && current ? current - previous : undefined;
    return (
      <View key={key} style={styles.columnHalf}>
        <NumericField
          label={customLabel || PERIMETER_LABELS[key]}
          suffix="cm"
          value={current}
          placeholder="0"
          onChangeNumber={(value) => updatePerimeter(key, value)}
          icon={icon}
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
    <StepCard
      title="Perímetros corporais"
      note="Use centímetros (cm). Medidas organizadas em pares com comparativo de assimetria instantâneo."
      icon="body-outline"
    >
      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="body-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Tronco e cabeça</Text>
        </View>
      </View>
      <View style={styles.twoColumnGrid}>
        {trunkPairs.map(([keyA, keyB, labelA, labelB, iconA, iconB], idx) => (
          <View key={idx} style={styles.twoColumnRow}>
            {renderPerimeterCell(keyA, labelA, iconA)}
            {renderPerimeterCell(keyB, labelB, iconB)}
          </View>
        ))}
      </View>

      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="swap-horizontal-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Membros Bilaterais (Direito / Esquerdo)</Text>
        </View>
      </View>

      <View style={styles.limbPairsGrid}>
        {limbPairs.map(([rightKey, leftKey, label, icon]) => {
          const rightValue = assessment.perimeters[rightKey]?.valueCm;
          const leftValue = assessment.perimeters[leftKey]?.valueCm;
          const diff = rightValue !== undefined && leftValue !== undefined ? Math.abs(rightValue - leftValue) : undefined;
          const percent = diff !== undefined && Math.max(rightValue ?? 0, leftValue ?? 0) > 0
            ? (diff / Math.max(rightValue ?? 0, leftValue ?? 0)) * 100
            : undefined;

          return (
            <View key={label} style={styles.limbPairCard}>
              <View style={styles.limbPairHeader}>
                <View style={styles.limbPairHeaderLeft}>
                  <Ionicons name={icon} size={15} color="#D90000" />
                  <Text style={styles.limbPairTitle}>{label}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.replicateButton, rightValue === undefined && styles.replicateButtonDisabled]}
                  onPress={() => {
                    if (rightValue !== undefined) {
                      updatePerimeter(leftKey, rightValue);
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={rightValue === undefined}
                >
                  <Ionicons name="swap-horizontal" size={12} color={rightValue !== undefined ? "#D90000" : "#555555"} />
                  <Text style={[styles.replicateButtonText, rightValue === undefined && styles.replicateButtonTextDisabled]}>
                    Replicar D → E
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.twoColumnRow}>
                {renderPerimeterCell(rightKey, "Lado Direito", "arrow-forward-outline")}
                {renderPerimeterCell(leftKey, "Lado Esquerdo", "arrow-back-outline")}
              </View>

              {typeof diff === "number" && (
                <View style={styles.asymmetryPillRow}>
                  <View style={[styles.asymmetryPill, diff > 1.5 ? styles.asymmetryPillAlert : styles.asymmetryPillOk]}>
                    <Ionicons
                      name={diff > 1.5 ? "alert-circle" : "checkmark-circle"}
                      size={12}
                      color={diff > 1.5 ? "#FFAA00" : "#10B981"}
                    />
                    <Text style={[styles.asymmetryPillText, diff > 1.5 ? styles.asymmetryPillTextAlert : styles.asymmetryPillTextOk]}>
                      Assimetria: {diff.toFixed(1)} cm ({percent?.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="git-compare-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Resumo de assimetrias</Text>
        </View>
      </View>

      <View style={styles.asymmetrySummaryCard}>
        {limbPairs.map(([right, left, label, icon]) => {
          const rightValue = assessment.perimeters[right]?.valueCm;
          const leftValue = assessment.perimeters[left]?.valueCm;
          const hasValues = rightValue !== undefined && leftValue !== undefined;
          const diff = hasValues ? Math.abs(rightValue - leftValue) : undefined;
          const percent = diff !== undefined && Math.max(rightValue ?? 0, leftValue ?? 0) > 0
            ? (diff / Math.max(rightValue ?? 0, leftValue ?? 0)) * 100
            : undefined;

          return (
            <View key={label} style={styles.asymResultRow}>
              <View style={styles.asymLabelRow}>
                <Ionicons name={icon} size={14} color="#888888" />
                <Text style={styles.asymLabelText}>{label}</Text>
              </View>
              {typeof diff === "number" ? (
                <View
                  style={[
                    styles.asymBadge,
                    diff === 0
                      ? styles.asymBadgeSimetric
                      : diff > 1.5
                      ? styles.asymBadgeWarning
                      : styles.asymBadgeMild,
                  ]}
                >
                  <Ionicons
                    name={diff === 0 ? "checkmark-circle" : diff > 1.5 ? "alert-circle" : "checkmark-circle-outline"}
                    size={12}
                    color={diff === 0 ? "#10B981" : diff > 1.5 ? "#F59E0B" : "#3B82F6"}
                  />
                  <Text
                    style={[
                      styles.asymBadgeText,
                      diff === 0
                        ? styles.asymBadgeTextSimetric
                        : diff > 1.5
                        ? styles.asymBadgeTextWarning
                        : styles.asymBadgeTextMild,
                    ]}
                  >
                    {diff === 0 ? "Simétrico (0 cm)" : `${diff.toFixed(1)} cm • ${percent?.toFixed(1)}%`}
                  </Text>
                </View>
              ) : (
                <View style={styles.asymBadgeMuted}>
                  <Text style={styles.asymBadgeTextMuted}>Não informado</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </StepCard>
  );
}

function renderSkinfoldsStep(
  assessment: PhysicalAssessment,
  updateRoot: <K extends keyof PhysicalAssessment>(key: K, value: PhysicalAssessment[K], details?: string) => void,
  updateSkinfold: (point: SkinfoldPoint, index: number, value?: number, invalid?: boolean) => void
) {
  return (
    <StepCard
      title="Dobras cutâneas"
      note="Protocolos de Jackson & Pollock (3 ou 7 dobras) com conversão Siri. Registre até 3 tentativas por ponto."
      icon="cut-outline"
    >
      <Segmented
        label="Protocolo de dobras"
        value={assessment.skinfolds.protocol}
        options={[
          ["jackson-pollock-3", "JP 3 dobras"],
          ["jackson-pollock-7", "JP 7 dobras"],
        ]}
        onChange={(value) => updateRoot("skinfolds", { ...assessment.skinfolds, protocol: value as never })}
      />

      <View style={styles.skinfoldsGrid}>
        {(Object.keys(SKINFOLD_LABELS) as SkinfoldPoint[]).map((point) => {
          const measurement = assessment.skinfolds.points[point] ?? { attempts: [{}, {}, {}] };
          const validAttempts = (measurement.attempts ?? [])
            .filter((a) => !a.invalid && typeof a.valueMm === "number")
            .map((a) => a.valueMm as number);
          const medianOrAvg =
            validAttempts.length > 0
              ? (validAttempts.reduce((acc, v) => acc + v, 0) / validAttempts.length).toFixed(1)
              : undefined;

          return (
            <View key={point} style={styles.skinfoldCard}>
              <View style={styles.skinfoldCardHeader}>
                <Text style={styles.skinfoldTitle}>{SKINFOLD_LABELS[point]}</Text>
                {medianOrAvg ? (
                  <View style={styles.skinfoldMedianBadge}>
                    <Text style={styles.skinfoldMedianText}>Média: {medianOrAvg} mm</Text>
                  </View>
                ) : (
                  <Text style={styles.skinfoldPendingText}>Pendente</Text>
                )}
              </View>

              <View style={styles.skinfoldAttemptsRow}>
                {[0, 1, 2].map((index) => {
                  const attempt = measurement.attempts[index];
                  const isInvalid = attempt?.invalid;
                  return (
                    <View key={index} style={styles.skinfoldAttemptCol}>
                      <View style={styles.skinfoldAttemptHeader}>
                        <Text style={styles.skinfoldAttemptIndex}>{`${index + 1}ª tentativa`}</Text>
                        <TouchableOpacity
                          style={[styles.miniInvalidBtn, isInvalid && styles.miniInvalidBtnActive]}
                          onPress={() => updateSkinfold(point, index, attempt?.valueMm, !isInvalid)}
                          activeOpacity={0.8}
                          hitSlop={6}
                        >
                          <Ionicons
                            name={isInvalid ? "close-circle" : "checkmark-circle-outline"}
                            size={13}
                            color={isInvalid ? "#FF5555" : "#666666"}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.skinfoldInputWrap, isInvalid && styles.skinfoldInputWrapInvalid]}>
                        <TextInput
                          style={[styles.skinfoldInput, isInvalid && styles.skinfoldInputInvalid]}
                          value={textOrEmpty(attempt?.valueMm)}
                          onChangeText={(text) =>
                            updateSkinfold(point, index, text.trim() ? normalizeDecimal(text) : undefined)
                          }
                          placeholder="0"
                          placeholderTextColor="#555"
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.skinfoldSuffix}>mm</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      <Calculated label="Gordura corporal calculada" value={assessment.skinfolds.resultBodyFatPercent} suffix="%" />
      <Text style={styles.helperText}>{assessment.skinfolds.formulaReference ?? "Fórmula aplicada conforme sexo e protocolo."}</Text>
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
      icon="heart-outline"
    >
      <View style={styles.protocolInfoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#D90000" />
        <Text style={styles.warningText}>
          Nem todo protocolo estima VO₂máx. Conconi registra ponto de deflexão da FC/limiar estimado e pode ficar inconclusivo quando os dados não sustentam a análise.
        </Text>
      </View>

      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="apps-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Catálogo de protocolos</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterRail}
      >
        <TouchableOpacity
          style={[styles.categoryFilterChip, cardioCategoryFilter === "todos" && styles.categoryFilterChipActive]}
          onPress={() => setCardioCategoryFilter("todos")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="layers-outline"
            size={12}
            color={cardioCategoryFilter === "todos" ? "#FFFFFF" : "#888888"}
          />
          <Text style={[styles.categoryFilterChipText, cardioCategoryFilter === "todos" && styles.categoryFilterChipTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        {CARDIO_PROTOCOL_CATEGORIES.map((category) => {
          const isActive = cardioCategoryFilter === category.id;
          const getCatIcon = (id: string): IoniconName => {
            switch (id) {
              case "testes_externos": return "navigate-outline";
              case "esteira": return "walk-outline";
              case "bicicleta": return "bicycle-outline";
              case "limiar_conconi": return "pulse-outline";
              default: return "fitness-outline";
            }
          };
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryFilterChip, isActive && styles.categoryFilterChipActive]}
              onPress={() => setCardioCategoryFilter(category.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={getCatIcon(category.id)}
                size={12}
                color={isActive ? "#FFFFFF" : "#888888"}
              />
              <Text style={[styles.categoryFilterChipText, isActive && styles.categoryFilterChipTextActive]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.protocolList}>
        {catalogItems.map((protocol) => (
          <TouchableOpacity
            key={protocol.id}
            style={styles.protocolCatalogCard}
            activeOpacity={0.85}
            onPress={() => addCardioTest(protocol.id)}
          >
            <View style={styles.protocolCatalogHeader}>
              <View style={styles.protocolCatalogIconBox}>
                <Ionicons name={getCardioProtocolIcon(protocol.id)} size={18} color="#D90000" />
              </View>
              <View style={styles.protocolCatalogInfo}>
                <Text style={styles.protocolCatalogTitle}>{protocol.name}</Text>
                <View style={styles.protocolCategoryPill}>
                  <Text style={styles.protocolCategoryPillText}>
                    {CARDIO_PROTOCOL_CATEGORIES.find((c) => c.id === protocol.category)?.label || "Cardio"}
                  </Text>
                </View>
              </View>
              <View style={styles.protocolAddButton}>
                <Ionicons name="add" size={15} color="#FFFFFF" />
                <Text style={styles.protocolAddButtonText}>Adicionar</Text>
              </View>
            </View>
            <Text style={styles.protocolCatalogDesc}>{protocol.description}</Text>
            <View style={styles.protocolEstimatesRow}>
              <Ionicons name="analytics-outline" size={12} color="#D90000" />
              <Text style={styles.protocolEstimatesLabel}>Estima:</Text>
              <Text style={styles.protocolEstimatesText}>
                {formatCardioEstimates(protocol.estimates).join(" • ")}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="fitness-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Protocolos adicionados ({selectedTests.length})</Text>
        </View>
      </View>

      {selectedTests.length === 0 ? (
        <View style={styles.emptyProtocolsState}>
          <Ionicons name="pulse-outline" size={26} color="#555555" />
          <Text style={styles.emptyProtocolsText}>Nenhum protocolo cardiorrespiratório adicionado</Text>
          <Text style={styles.emptyProtocolsSub}>Toque em "Adicionar" em um dos testes do catálogo acima</Text>
        </View>
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
        <TouchableOpacity
          style={styles.cardHeaderTrashBtn}
          onPress={() => updateRoot("cardioTests", assessment.cardioTests.filter((item) => item.id !== test.id))}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.protocolGuideBox}>
        <View style={styles.protocolGuideRow}>
          <Ionicons name="people-outline" size={14} color="#D90000" />
          <Text style={styles.protocolGuideText}>{definition.population}</Text>
        </View>
        <View style={styles.protocolGuideRow}>
          <Ionicons name="hardware-chip-outline" size={14} color="#888888" />
          <Text style={styles.protocolGuideText}>Equipamento: {definition.equipment.join(", ") || "definido pelo profissional"}</Text>
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name="pulse-outline" size={14} color="#D90000" />
          <Text style={styles.fieldLabel}>Status do teste</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipsRail}
        >
          {[
            { id: "rascunho", label: "Rascunho", color: "#888888" },
            { id: "em_execucao", label: "Em execução", color: "#3B82F6" },
            { id: "pausado", label: "Pausado", color: "#F59E0B" },
            { id: "interrompido", label: "Interrompido", color: "#EF4444" },
            { id: "concluido", label: "Concluído", color: "#10B981" },
            { id: "invalido", label: "Inválido", color: "#6B7280" },
          ].map((st) => {
            const isSelected = test.status === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[
                  styles.statusChip,
                  isSelected && {
                    borderColor: st.color,
                    backgroundColor: `${st.color}22`,
                  },
                ]}
                onPress={() => updateCardioTest(test.id, { status: st.id as CardioTest["status"] })}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.readinessDot,
                    { backgroundColor: st.color },
                    isSelected && styles.readinessDotSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    isSelected && { color: "#ffffff", fontWeight: "900" },
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
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
    <View style={{ gap: 10, marginTop: 10 }}>
      <View style={styles.sectionDividerLeft}>
        <View style={styles.subsectionBullet} />
        <Ionicons name="speedometer-outline" size={14} color="#D90000" />
        <Text style={styles.subsectionTitle}>Resultado Bruto do Teste</Text>
      </View>

      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <NumericField
            label="Distância"
            suffix="m"
            value={external.distanceMeters}
            onChangeNumber={(value) => updateExternal({ distanceMeters: value })}
            icon="navigate-outline"
          />
        </View>
        <View style={styles.columnHalf}>
          <NumericField
            label="Tempo total"
            suffix="min"
            value={external.timeMinutes}
            onChangeNumber={(value) => updateExternal({ timeMinutes: value })}
            icon="time-outline"
          />
        </View>
      </View>

      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <NumericField
            label="FC repouso"
            suffix="bpm"
            value={external.heartRateRest}
            onChangeNumber={(value) => updateExternal({ heartRateRest: value })}
            icon="heart-outline"
          />
        </View>
        <View style={styles.columnHalf}>
          <NumericField
            label="FC inicial"
            suffix="bpm"
            value={external.heartRateStart}
            onChangeNumber={(value) => updateExternal({ heartRateStart: value })}
            icon="pulse-outline"
          />
        </View>
      </View>

      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <NumericField
            label="FC final"
            suffix="bpm"
            value={external.heartRateEnd}
            onChangeNumber={(value) => updateExternal({ heartRateEnd: value })}
            icon="flame-outline"
          />
        </View>
        <View style={styles.columnHalf}>
          <NumericField
            label="FC recup. 1 min"
            suffix="bpm"
            value={external.heartRateRecovery1Min}
            onChangeNumber={(value) => updateExternal({ heartRateRecovery1Min: value })}
            icon="refresh-outline"
          />
        </View>
      </View>

      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <NumericField
            label="PSE final"
            suffix="/10"
            value={external.rpeFinal}
            onChangeNumber={(value) => updateExternal({ rpeFinal: value })}
            icon="bar-chart-outline"
          />
        </View>
        <View style={styles.columnHalf}>
          <NumericField
            label="Temperatura"
            suffix="°C"
            value={external.temperatureC}
            onChangeNumber={(value) => updateExternal({ temperatureC: value })}
            icon="thermometer-outline"
          />
        </View>
      </View>

      <Field
        label="Tipo de terreno"
        value={external.terrain}
        placeholder="Ex: Pista sintética, asfalto plano..."
        onChangeText={(value) => updateExternal({ terrain: value })}
        icon="map-outline"
      />

      <TextArea
        label="Condições climáticas e do local"
        value={external.locationConditions}
        placeholder="Vento, umidade, piso molhado..."
        onChangeText={(value) => updateExternal({ locationConditions: value })}
      />

      {test.status === "interrompido" && (
        <TextArea
          label="Motivo da interrupção"
          value={external.interruptionReason}
          onChangeText={(value) => updateExternal({ interruptionReason: value })}
        />
      )}

      <TextArea
        label="Observações do teste externo"
        value={external.notes}
        onChangeText={(value) => updateExternal({ notes: value })}
      />
    </View>
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

  const handleMarkAllReviewed = () => {
    updateRoot(
      "functionalScreening",
      {
        ...screening,
        consentAccepted: true,
        parqReviewed: true,
        injuryHistoryReviewed: true,
        currentPainReviewed: true,
        readinessStatus: screening.readinessStatus || "apto",
      },
      "Triagem funcional aprovada e revisada."
    );
  };

  const READINESS_OPTIONS = [
    { id: "apto", label: "Apto", color: "#10B981" },
    { id: "adaptado", label: "Adaptado", color: "#3B82F6" },
    { id: "adiado", label: "Adiado", color: "#F59E0B" },
    { id: "contraindicado", label: "Contraindicado", color: "#EF4444" },
    { id: "encaminhamento_recomendado", label: "Encaminhar", color: "#8B5CF6" },
  ];

  return (
    <StepCard
      title="Testes neuromusculares e funcionais"
      note="Resultados são registros profissionais de movimento e aptidão funcional. Ao surgir sinal de alerta, interrompa e registre."
      icon="fitness-outline"
    >
      <View style={styles.protocolInfoBox}>
        <Ionicons name="shield-checkmark-outline" size={19} color="#D90000" />
        <Text style={styles.warningText}>
          Use termos como limitação observada, assimetria identificada e desconforto relatado.
        </Text>
      </View>

      <View style={styles.sectionDividerRowWithAction}>
        <Text style={styles.subsectionTitle} numberOfLines={1}>
          Triagem antes dos testes
        </Text>
        <TouchableOpacity
          style={styles.quickActionPill}
          onPress={handleMarkAllReviewed}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done" size={13} color="#D90000" />
          <Text style={styles.quickActionPillText}>Prontos (Sim)</Text>
        </TouchableOpacity>
      </View>

      {/* Status de Prontidão como Chips Estilizados */}
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Status de prontidão</Text>
        <View style={styles.readinessChipsRow}>
          {READINESS_OPTIONS.map((opt) => {
            const isSelected = screening.readinessStatus === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.readinessChip,
                  isSelected && { borderColor: opt.color, backgroundColor: `${opt.color}22` },
                ]}
                onPress={() =>
                  updateRoot(
                    "functionalScreening",
                    { ...screening, readinessStatus: opt.id as never },
                    "Triagem funcional atualizada."
                  )
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.readinessDot,
                    { backgroundColor: opt.color },
                    isSelected && styles.readinessDotSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.readinessChipText,
                    isSelected && { color: "#FFFFFF", fontWeight: "900" },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Checklist Interativo de Triagem */}
      <View style={styles.screeningChecklistCard}>
        <BooleanGroup
          label="Consentimento do aluno registrado"
          description="Aluno concordou com a realização dos testes"
          value={screening.consentAccepted}
          onChange={(value) => updateRoot("functionalScreening", { ...screening, consentAccepted: value }, "Triagem funcional atualizada.")}
        />
        <BooleanGroup
          label="Questionário de prontidão revisado"
          description="PAR-Q e condições prévias verificadas"
          value={screening.parqReviewed}
          onChange={(value) => updateRoot("functionalScreening", { ...screening, parqReviewed: value }, "Triagem funcional atualizada.")}
        />
        <BooleanGroup
          label="Histórico de lesões revisado"
          description="Lesões articulares, musculares ou cirurgias prévias"
          value={screening.injuryHistoryReviewed}
          onChange={(value) => updateRoot("functionalScreening", { ...screening, injuryHistoryReviewed: value }, "Triagem funcional atualizada.")}
        />
        <BooleanGroup
          label="Dores atuais revisadas"
          description="Sem relato de dores agudas impeditivas no momento"
          value={screening.currentPainReviewed}
          onChange={(value) => updateRoot("functionalScreening", { ...screening, currentPainReviewed: value }, "Triagem funcional atualizada.")}
        />
        <BooleanGroup
          label="Sintomas cardiovasculares"
          description="Palpitações, falta de ar desproporcional ou aperto"
          value={screening.cardiovascularSymptoms}
          onChange={(value) => updateRoot("functionalScreening", { ...screening, cardiovascularSymptoms: value }, "Triagem funcional atualizada.")}
        />
        <BooleanGroup
          label="Tontura ou perda de equilíbrio"
          description="Episódios recentes durante ou após esforço"
          value={screening.dizziness || screening.balanceLoss}
          onChange={(value) => updateRoot("functionalScreening", { ...screening, dizziness: value, balanceLoss: value }, "Triagem funcional atualizada.")}
        />
        <BooleanGroup
          label="Liberação médica necessária"
          description="Requer encaminhamento ou laudo médico"
          value={screening.medicalClearanceNeeded}
          onChange={(value) => updateRoot("functionalScreening", { ...screening, medicalClearanceNeeded: value }, "Triagem funcional atualizada.")}
        />
      </View>

      <TextArea
        label="Observações da triagem"
        value={screening.notes}
        placeholder="Adicione observações importantes da triagem..."
        onChangeText={(value) => updateRoot("functionalScreening", { ...screening, notes: value }, "Triagem funcional atualizada.")}
        suggestionChips={["Sem restrições aparentes", "Atenção ao joelho direito", "Mobilidade de tornozelo reduzida", "Apto para esforço moderado"]}
      />

      {screeningResult.alerts.length > 0 && (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={18} color="#f4c542" />
          <Text style={styles.warningText}>{screeningResult.alerts.join(" ")}</Text>
        </View>
      )}

      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="albums-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Modelos de bateria rápida</Text>
        </View>
      </View>
      <View style={styles.protocolList}>
        {FUNCTIONAL_BATTERY_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.protocolCatalogCard}
            onPress={() => addFunctionalBatteryTemplate(template.id)}
            activeOpacity={0.85}
          >
            <View style={styles.protocolCatalogHeader}>
              <View style={styles.protocolCatalogIconBox}>
                <Ionicons name="albums-outline" size={18} color="#D90000" />
              </View>
              <View style={styles.protocolCatalogInfo}>
                <Text style={styles.protocolCatalogTitle}>{template.name}</Text>
                <View style={styles.protocolCategoryPill}>
                  <Text style={styles.protocolCategoryPillText}>
                    {template.testIds.length} testes sugeridos
                  </Text>
                </View>
              </View>
              <View style={styles.protocolAddButton}>
                <Ionicons name="add" size={15} color="#FFFFFF" />
                <Text style={styles.protocolAddButtonText}>Carregar</Text>
              </View>
            </View>
            <Text style={styles.protocolCatalogDesc}>{template.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="apps-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Catálogo de testes individuais</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterRail}
      >
        <TouchableOpacity
          style={[styles.categoryFilterChip, functionalCategoryFilter === "todos" && styles.categoryFilterChipActive]}
          onPress={() => setFunctionalCategoryFilter("todos")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="layers-outline"
            size={12}
            color={functionalCategoryFilter === "todos" ? "#FFFFFF" : "#888888"}
          />
          <Text style={[styles.categoryFilterChipText, functionalCategoryFilter === "todos" && styles.categoryFilterChipTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        {FUNCTIONAL_CATEGORIES.map((category) => {
          const isActive = functionalCategoryFilter === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryFilterChip, isActive && styles.categoryFilterChipActive]}
              onPress={() => setFunctionalCategoryFilter(category.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="fitness-outline"
                size={12}
                color={isActive ? "#FFFFFF" : "#888888"}
              />
              <Text style={[styles.categoryFilterChipText, isActive && styles.categoryFilterChipTextActive]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.protocolList}>
        {catalogItems.map((definition) => {
          const added = selectedIds.has(definition.id);
          return (
            <TouchableOpacity
              key={definition.id}
              style={[styles.protocolCatalogCard, added && styles.protocolCatalogCardAdded]}
              disabled={added}
              activeOpacity={0.85}
              onPress={() => addFunctionalTest(definition.id)}
            >
              <View style={styles.protocolCatalogHeader}>
                <View style={[styles.protocolCatalogIconBox, added && styles.protocolCatalogIconBoxAdded]}>
                  <Ionicons
                    name={added ? "checkmark-circle" : "barbell-outline"}
                    size={18}
                    color={added ? "#10B981" : "#D90000"}
                  />
                </View>
                <View style={styles.protocolCatalogInfo}>
                  <Text style={styles.protocolCatalogTitle}>{definition.name}</Text>
                  <View style={styles.protocolCategoryPill}>
                    <Text style={styles.protocolCategoryPillText}>
                      {definition.category} • {definition.equipment.join(", ") || "Livre / Sem equipamento"}
                    </Text>
                  </View>
                </View>
                {added ? (
                  <View style={styles.protocolAddedBadge}>
                    <Ionicons name="checkmark" size={13} color="#10B981" />
                    <Text style={styles.protocolAddedBadgeText}>Adicionado</Text>
                  </View>
                ) : (
                  <View style={styles.protocolAddButton}>
                    <Ionicons name="add" size={15} color="#FFFFFF" />
                    <Text style={styles.protocolAddButtonText}>Adicionar</Text>
                  </View>
                )}
              </View>

              <Text style={styles.protocolCatalogDesc}>{definition.objective}</Text>

              {definition.executionSteps[0] ? (
                <View style={styles.protocolEstimatesRow}>
                  <Ionicons name="information-circle-outline" size={12} color="#D90000" />
                  <Text style={styles.protocolEstimatesLabel}>Execução:</Text>
                  <Text style={styles.protocolEstimatesText} numberOfLines={1}>
                    {definition.executionSteps[0]}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.secondaryFullButton} onPress={addCustomFunctionalTest} activeOpacity={0.85}>
        <Ionicons name="construct-outline" size={18} color="#D90000" />
        <Text style={styles.secondaryButtonText}>Adicionar teste personalizado</Text>
      </TouchableOpacity>

      <View style={styles.sectionDividerRow}>
        <View style={styles.sectionDividerLeft}>
          <View style={styles.subsectionBullet} />
          <Ionicons name="body-outline" size={14} color="#D90000" />
          <Text style={styles.subsectionTitle}>Bateria selecionada ({selectedTests.length})</Text>
        </View>
      </View>
      {selectedTests.length === 0 ? (
        <View style={styles.emptyProtocolsState}>
          <Ionicons name="fitness-outline" size={26} color="#555555" />
          <Text style={styles.emptyProtocolsText}>Nenhum teste neuromotor adicionado</Text>
          <Text style={styles.emptyProtocolsSub}>Selecione um modelo rápido ou adicione testes do catálogo</Text>
        </View>
      ) : (
        selectedTests.map((test, index) =>
          renderFunctionalExecutionCard(test, index, assessment, updateFunctionalTest, updateRoot)
        )
      )}
    </StepCard>
  );
}

function getChoiceOptionLabel(option: string): string {
  const map: Record<string, string> = {
    boa: "Boa",
    regular: "Regular",
    requer_atencao: "Requer atenção",
    excelente: "Excelente",
    ruim: "Ruim",
    sim: "Sim",
    nao: "Não",
    leve: "Leve",
    moderada: "Moderada",
    severa: "Severa",
    apto: "Apto",
    inapto: "Inapto",
  };
  return map[option] || option.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
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

  // Separa campos de medida técnica dos campos observacionais
  const isObservationField = (f: FunctionalTestFieldDefinition) =>
    f.id === "validExecution" || f.id === "movementQuality" || f.id === "observedCompensations";

  const measurementFields = definition.fields.filter((f) => !isObservationField(f));
  const qualityField = definition.fields.find((f) => f.id === "movementQuality");

  const validExecValue = typeof test.fields.validExecution?.value === "boolean" ? test.fields.validExecution.value : true;
  const movementQualityValue = typeof test.fields.movementQuality?.value === "string" ? test.fields.movementQuality.value : undefined;

  return (
    <View key={test.id} style={styles.innerCard}>
      {/* Header do Teste */}
      <View style={styles.functionalHeader}>
        <View style={styles.sectionIconBubble}>
          <Ionicons name="body-outline" size={20} color="#D90000" />
        </View>
        <View style={styles.protocolTextBlock}>
          <Text style={styles.sectionTitle}>{index + 1}. {definition.name}</Text>
          <Text style={styles.mutedText}>{definition.category} • versão {definition.version}</Text>
        </View>
        <TouchableOpacity
          style={styles.cardHeaderTrashBtn}
          onPress={() => updateRoot("functionalTests", assessment.functionalTests.filter((item) => item.id !== test.id))}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#ff4444" />
        </TouchableOpacity>
      </View>

      {/* Guia Rápido do Teste */}
      <View style={styles.protocolGuideBox}>
        <View style={styles.protocolGuideRow}>
          <Ionicons name="information-circle-outline" size={14} color="#D90000" />
          <Text style={styles.protocolGuideText}>{definition.objective}</Text>
        </View>
        {definition.preparation ? (
          <View style={styles.protocolGuideRow}>
            <Ionicons name="fitness-outline" size={14} color="#888888" />
            <Text style={styles.protocolGuideText}>Prep: {definition.preparation}</Text>
          </View>
        ) : null}
        {definition.interruptionCriteria.length > 0 ? (
          <View style={styles.protocolGuideRow}>
            <Ionicons name="warning-outline" size={14} color="#FFAA00" />
            <Text style={[styles.protocolGuideText, { color: "#FFAA00" }]}>
              Alerta: {definition.interruptionCriteria.slice(0, 4).join(", ")}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Status do Teste */}
      <View style={styles.fieldBlock}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name="pulse-outline" size={14} color="#D90000" />
          <Text style={styles.fieldLabel}>Status do teste</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipsRail}
        >
          {[
            { id: "rascunho", label: "Rascunho", color: "#888888" },
            { id: "apto", label: "Apto", color: "#10B981" },
            { id: "adaptado", label: "Adaptado", color: "#3B82F6" },
            { id: "concluido", label: "Concluído", color: "#10B981" },
            { id: "adiado", label: "Adiado", color: "#F59E0B" },
            { id: "contraindicado", label: "Contraindicado", color: "#EF4444" },
            { id: "interrompido", label: "Interrompido", color: "#EF4444" },
          ].map((st) => {
            const isSelected = test.status === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[
                  styles.statusChip,
                  isSelected && {
                    borderColor: st.color,
                    backgroundColor: `${st.color}22`,
                  },
                ]}
                onPress={() => updateFunctionalTest(test.id, { status: st.id as never })}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.readinessDot,
                    { backgroundColor: st.color },
                    isSelected && styles.readinessDotSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    isSelected && { color: "#ffffff", fontWeight: "900" },
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <BooleanGroup
            label="Obrigatório"
            description="Exigido na bateria"
            value={test.required}
            onChange={(value) => updateFunctionalTest(test.id, { required: value })}
          />
        </View>
        <View style={styles.columnHalf}>
          <BooleanGroup
            label="Adaptado"
            description="Execução modificada"
            value={test.adapted}
            onChange={(value) => updateFunctionalTest(test.id, { adapted: value })}
          />
        </View>
      </View>

      {test.adapted && (
        <TextArea
          label="Motivo da adaptação"
          value={test.adaptationReason}
          onChangeText={(value) => updateFunctionalTest(test.id, { adaptationReason: value })}
        />
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

      {/* Equipamento */}
      <View style={styles.sectionDividerLeft}>
        <View style={styles.subsectionBullet} />
        <Ionicons name="hardware-chip-outline" size={14} color="#D90000" />
        <Text style={styles.subsectionTitle}>Equipamento Utilizado</Text>
      </View>
      <View style={styles.twoColumnRow}>
        <View style={styles.columnHalf}>
          <Field
            label="Tipo de equipamento"
            value={test.equipment?.type}
            placeholder="Ex: Goniômetro..."
            onChangeText={(value) => updateFunctionalTest(test.id, { equipment: { ...(test.equipment ?? {}), type: value } })}
          />
        </View>
        <View style={styles.columnHalf}>
          <Field
            label="Fabricante / modelo"
            value={[test.equipment?.manufacturer, test.equipment?.model].filter(Boolean).join(" / ")}
            placeholder="Ex: Carci / Digital"
            onChangeText={(value) => updateFunctionalTest(test.id, { equipment: { ...(test.equipment ?? {}), model: value } })}
          />
        </View>
      </View>

      {/* Medidas Técnicas / Tentativas */}
      {measurementFields.length > 0 && (
        <>
          <View style={styles.sectionDividerLeft}>
            <View style={styles.subsectionBullet} />
            <Ionicons name="resize-outline" size={14} color="#D90000" />
            <Text style={styles.subsectionTitle}>Medidas e Tentativas</Text>
          </View>
          {measurementFields.map((field) => renderFunctionalExecutionField(field, test.fields[field.id], updateField))}
        </>
      )}

      {/* Card de Observação e Critérios de Execução */}
      <View style={styles.functionalCriteriaCard}>
        <View style={styles.functionalCriteriaHeader}>
          <Ionicons name="eye-outline" size={14} color="#D90000" />
          <Text style={styles.functionalCriteriaTitle}>Critérios de Execução & Observação</Text>
        </View>

        <View style={styles.twoColumnRow}>
          <View style={styles.columnHalf}>
            <TouchableOpacity
              style={[styles.criteriaPillBtn, validExecValue && styles.criteriaPillBtnSuccess]}
              onPress={() => updateField("validExecution", { value: !validExecValue })}
              activeOpacity={0.8}
            >
              <Ionicons
                name={validExecValue ? "checkmark-circle" : "close-circle-outline"}
                size={16}
                color={validExecValue ? "#10B981" : "#777777"}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.criteriaPillLabel}>Execução</Text>
                <Text style={[styles.criteriaPillValue, validExecValue && { color: "#10B981" }]}>
                  {validExecValue ? "Válida" : "Inválida"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.columnHalf}>
            <TouchableOpacity
              style={[styles.criteriaPillBtn, test.pain?.present && styles.criteriaPillBtnAlert]}
              onPress={() => updateFunctionalTest(test.id, { pain: { ...(test.pain ?? {}), present: !test.pain?.present } })}
              activeOpacity={0.8}
            >
              <Ionicons
                name={test.pain?.present ? "alert-circle" : "shield-checkmark-outline"}
                size={16}
                color={test.pain?.present ? "#FF5555" : "#777777"}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.criteriaPillLabel}>Desconforto / Dor</Text>
                <Text style={[styles.criteriaPillValue, test.pain?.present && { color: "#FF5555" }]}>
                  {test.pain?.present ? "Relatou dor" : "Sem dor"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {test.pain?.present && (
          <Field
            label="Detalhes da dor relatada"
            value={test.pain?.notes}
            placeholder="Localização e intensidade (0 a 10)..."
            onChangeText={(value) => updateFunctionalTest(test.id, { pain: { ...(test.pain ?? {}), notes: value } })}
            icon="alert-circle-outline"
          />
        )}

        {qualityField && (
          <Segmented
            label="Qualidade do movimento"
            value={movementQualityValue}
            options={(qualityField.options ?? ["boa", "regular", "requer_atencao"]).map((opt) => [
              opt,
              getChoiceOptionLabel(opt),
            ])}
            onChange={(value) => updateField("movementQuality", { value })}
          />
        )}
      </View>

      {/* Compensações & Comentários */}
      <TextArea
        label="Compensações observadas"
        value={test.compensations || (typeof test.fields.observedCompensations?.value === "string" ? test.fields.observedCompensations.value : "")}
        placeholder="Descreva padrões observados (ex: valgo dinâmico, inclinação de tronco)..."
        onChangeText={(value) => {
          updateFunctionalTest(test.id, { compensations: value });
          updateField("observedCompensations", { value });
        }}
        suggestionChips={["Valgo dinâmico", "Inclinação de tronco", "Pelve desalinhada", "Mobilidade de tornozelo", "Sem compensações"]}
      />

      <TextArea
        label="Comentários profissionais"
        value={test.professionalNotes}
        placeholder="Observações adicionais do personal..."
        onChangeText={(value) => updateFunctionalTest(test.id, { professionalNotes: value })}
        suggestionChips={["Movimento dentro do esperado", "Sem restrições para progressão", "Atenção no aquecimento específico"]}
      />

      {/* Resumo Calculado */}
      <View style={styles.calculationDetails}>
        <View style={styles.measureHeaderRow}>
          <Ionicons name="analytics-outline" size={15} color="#D90000" />
          <Text style={styles.sectionTitle}>Resumo do Teste</Text>
        </View>

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

        {snapshot.validation.errors.length > 0 && (
          <View style={styles.functionalValidationBox}>
            <Ionicons name="information-circle-outline" size={15} color="#FF6666" />
            <View style={{ flex: 1, gap: 2 }}>
              {snapshot.validation.errors.map((validationError) => (
                <Text key={validationError} style={styles.functionalValidationErrorText}>{validationError}</Text>
              ))}
            </View>
          </View>
        )}

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
        options={(field.options ?? []).map((option) => [option, getChoiceOptionLabel(option)])}
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
        <View style={styles.measureHeaderRow}>
          <Ionicons name="body-outline" size={15} color="#D90000" />
          <Text style={styles.measureHeaderTitle}>{field.label}</Text>
        </View>
        {field.help ? <Text style={styles.measureTip}>{field.help}</Text> : null}

        <View style={styles.bilateralColumnsContainer}>
          {(["right", "left"] as const).map((side) => {
            const attempts = result?.[side] ?? [];
            return (
              <View key={`${field.id}-${side}`} style={styles.bilateralAttemptCard}>
                <View style={styles.bilateralSideHeader}>
                  <View style={[styles.bilateralSideBadge, side === "right" ? styles.bilateralRightBadge : styles.bilateralLeftBadge]}>
                    <Text style={styles.bilateralSideBadgeText}>{side === "right" ? "Lado Direito" : "Lado Esquerdo"}</Text>
                  </View>
                </View>

                <View style={styles.functionalAttemptsGrid}>
                  {Array.from({ length: attemptsCount }).map((_, index) => {
                    const attempt = attempts[index] ?? {};
                    const isInvalid = attempt.invalid;
                    return (
                      <View key={`${field.id}-${side}-${index}`} style={styles.functionalAttemptCol}>
                        <View style={styles.functionalAttemptHeader}>
                          <Text style={styles.functionalAttemptLabel}>{index + 1}ª</Text>
                          {attemptsCount > 1 && (
                            <TouchableOpacity
                              style={[styles.miniInvalidBtn, isInvalid && styles.miniInvalidBtnActive]}
                              onPress={() => {
                                const nextAttempts = [...attempts];
                                nextAttempts[index] = { ...attempt, invalid: !attempt.invalid };
                                updateField(field.id, { [side]: nextAttempts });
                              }}
                              activeOpacity={0.8}
                              hitSlop={6}
                            >
                              <Ionicons
                                name={isInvalid ? "close-circle" : "checkmark-circle-outline"}
                                size={13}
                                color={isInvalid ? "#FF5555" : "#666666"}
                              />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={[styles.functionalInputWrap, isInvalid && styles.functionalInputWrapInvalid]}>
                          <TextInput
                            style={[styles.functionalInput, isInvalid && styles.functionalInputInvalid]}
                            value={textOrEmpty(attempt.value)}
                            onChangeText={(text) => {
                              const nextAttempts = [...attempts];
                              nextAttempts[index] = {
                                ...attempt,
                                value: text.trim() ? normalizeDecimal(text) : undefined,
                              };
                              updateField(field.id, { [side]: nextAttempts });
                            }}
                            placeholder="0"
                            placeholderTextColor="#555"
                            keyboardType="decimal-pad"
                          />
                          {field.unit ? <Text style={styles.functionalSuffix}>{field.unit}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const attempts = result?.attempts ?? [];
  return (
    <View key={field.id} style={styles.measureBlock}>
      <View style={styles.measureHeaderRow}>
        <Ionicons name="fitness-outline" size={15} color="#D90000" />
        <Text style={styles.measureHeaderTitle}>{field.label}</Text>
      </View>
      {field.help ? <Text style={styles.measureTip}>{field.help}</Text> : null}

      <View style={styles.functionalAttemptsGrid}>
        {Array.from({ length: attemptsCount }).map((_, index) => {
          const attempt = attempts[index] ?? {};
          const isInvalid = attempt.invalid;
          return (
            <View key={`${field.id}-${index}`} style={styles.functionalAttemptCol}>
              <View style={styles.functionalAttemptHeader}>
                <Text style={styles.functionalAttemptLabel}>{index + 1}ª tentativa</Text>
                {attemptsCount > 1 && (
                  <TouchableOpacity
                    style={[styles.miniInvalidBtn, isInvalid && styles.miniInvalidBtnActive]}
                    onPress={() => {
                      const nextAttempts = [...attempts];
                      nextAttempts[index] = { ...attempt, invalid: !attempt.invalid };
                      updateField(field.id, { attempts: nextAttempts });
                    }}
                    activeOpacity={0.8}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={isInvalid ? "close-circle" : "checkmark-circle-outline"}
                      size={13}
                      color={isInvalid ? "#FF5555" : "#666666"}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.functionalInputWrap, isInvalid && styles.functionalInputWrapInvalid]}>
                <TextInput
                  style={[styles.functionalInput, isInvalid && styles.functionalInputInvalid]}
                  value={textOrEmpty(attempt.value)}
                  onChangeText={(text) => {
                    const nextAttempts = [...attempts];
                    nextAttempts[index] = {
                      ...attempt,
                      value: text.trim() ? normalizeDecimal(text) : undefined,
                    };
                    updateField(field.id, { attempts: nextAttempts });
                  }}
                  placeholder="0"
                  placeholderTextColor="#555"
                  keyboardType="decimal-pad"
                />
                {field.unit ? <Text style={styles.functionalSuffix}>{field.unit}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
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
    <StepCard
      title="Fotos e avaliação postural"
      note="Registre fotos padronizadas nos 4 planos (Frontal, Posterior, Lateral Direita e Esquerda) para acompanhamento e marcações posturais."
      icon="camera-outline"
    >
      {/* Consentimento em Card Elegante */}
      {!assessment.photoConsent?.accepted ? (
        <View style={styles.consentBarCard}>
          <View style={styles.consentBarHeader}>
            <View style={styles.consentIconBox}>
              <Ionicons name="document-lock-outline" size={18} color="#D90000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentBarTitle}>Consentimento de imagem</Text>
              <Text style={styles.consentBarSubtitle}>
                Autoriza armazenamento e comparação para uso do aluno e personal.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.consentActionBtn}
              onPress={handleAcceptConsent}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
              <Text style={styles.consentActionBtnText}>Registrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.consentApprovedBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.consentApprovedText}>
            Consentimento registrado em {formatAssessmentDate(assessment.photoConsent.acceptedAt)}.
          </Text>
        </View>
      )}

      {/* Grid 2x2 de Fotos */}
      <View style={styles.photosGrid}>
        {views.map((view) => {
          const photo = assessment.photos.find((item) => item.view === view.id);
          return (
            <View key={view.id} style={styles.photoViewCard}>
              <View style={styles.photoViewHeader}>
                <Text style={styles.photoViewTitle}>{view.label}</Text>
                {photo && (
                  <TouchableOpacity
                    style={styles.photoDeleteMiniBtn}
                    onPress={async () => {
                      const updated = await removePhoto(assessment.id, photo.id);
                      setAssessment(updated);
                    }}
                    hitSlop={6}
                  >
                    <Ionicons name="trash-outline" size={14} color="#FF5555" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.photoViewFrame}>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.photoViewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.photoWireframePlaceholder}>
                    <View style={styles.wireframeBodyOutline}>
                      <View style={styles.wireframeHead} />
                      <View style={styles.wireframeTorso} />
                    </View>
                    <Text style={styles.wireframeInstruction} numberOfLines={2}>
                      {view.instruction}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.photoActionButtonsRow}>
                <TouchableOpacity
                  style={styles.photoPickBtn}
                  onPress={() => handlePickPhoto(view.id, "camera")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                  <Text style={styles.photoPickBtnText}>Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoPickBtn}
                  onPress={() => handlePickPhoto(view.id, "library")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images" size={14} color="#D90000" />
                  <Text style={styles.photoPickBtnText}>Galeria</Text>
                </TouchableOpacity>
              </View>

              {photo && (
                <View style={styles.annotationBlock}>
                  <Text style={styles.annotationBlockTitle}>Marcação Postural</Text>
                  <Segmented
                    label="Tipo"
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
                  <TextInput
                    style={[styles.input, { minHeight: 40, marginTop: 4 }]}
                    value={annotationDraft.photoId === photo.id ? annotationDraft.note : ""}
                    onChangeText={(value) => setAnnotationDraft((draft) => ({ ...draft, photoId: photo.id, note: value }))}
                    placeholder="Observação da marcação..."
                    placeholderTextColor="#555"
                  />
                  <TouchableOpacity
                    style={[styles.secondaryFullButton, { marginTop: 6, minHeight: 36 }]}
                    onPress={() => handleAddAnnotation(photo.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={16} color="#D90000" />
                    <Text style={styles.secondaryButtonText}>Adicionar marcação</Text>
                  </TouchableOpacity>

                  {photo.annotations.map((annotation) => (
                    <View key={annotation.id} style={styles.annotationItem}>
                      <Text style={styles.annotationText}>
                        {annotation.type === "line" ? "Linha" : "Ponto"} • {POSTURAL_REGION_LABELS[annotation.region]} •{" "}
                        {annotation.note || "Sem observação"}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveAnnotation(photo.id, annotation.id)}>
                        <Ionicons name="close" size={16} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
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
    <StepCard
      title="Observações e conclusão"
      note="O relatório consolidado fica disponível no app para o aluno e pode ser exportado em PDF."
      icon="document-text-outline"
    >
      <TextArea
        label="Pontos de atenção"
        value={assessment.conclusion.attentionPoints}
        placeholder="Ex.: assimetria em membros inferiores, limitação na mobilidade de ombro..."
        onChangeText={(value) => update({ attentionPoints: value })}
        suggestionChips={[
          "Assimetria em membros inferiores",
          "Limitação de mobilidade escapular",
          "Desvio postural leve",
          "Desconforto em lombar",
        ]}
        icon="alert-circle-outline"
      />

      <TextArea
        label="Objetivos definidos"
        value={assessment.conclusion.definedGoals}
        placeholder="Ex.: hipertrofia de membros superiores, redução de 3% de gordura corporal..."
        onChangeText={(value) => update({ definedGoals: value })}
        suggestionChips={[
          "Hipertrofia com progressão",
          "Emagrecimento & redução de %G",
          "Ganho de força submáxima",
          "Melhora da capacidade cardiorrespiratória",
          "Correção postural",
        ]}
        icon="flag-outline"
      />

      <TextArea
        label="Recomendações do personal"
        value={assessment.conclusion.trainerRecommendations}
        placeholder="Ex.: frequência de 4x na semana, aquecimento com mobilidade articular..."
        onChangeText={(value) => update({ trainerRecommendations: value })}
        suggestionChips={[
          "Frequência semanal de 4x",
          "Aquecimento com foco em mobilidade",
          "Aumentar consumo hídrico diário",
          "Progressão gradual de cargas a cada 2 semanas",
        ]}
        icon="fitness-outline"
      />

      <TextArea
        label="Observações finais"
        value={assessment.conclusion.notes}
        placeholder="Ex.: excelente aderência e motivação inicial, reavaliação agendada..."
        onChangeText={(value) => update({ notes: value })}
        suggestionChips={[
          "Excelente evolução e aderência",
          "Reavaliação sugerida em 90 dias",
          "Acompanhamento quinzenal de cargas",
        ]}
        icon="chatbubble-ellipses-outline"
      />

      <View style={styles.conclusionSwitchesCard}>
        <BooleanGroup
          label="Liberar relatório para o aluno"
          description="Permite que o aluno visualize a avaliação completa no perfil dele"
          value={assessment.conclusion.releaseToStudent}
          onChange={(value) => update({ releaseToStudent: value })}
        />
        <BooleanGroup
          label="Marcar como compartilhado no app"
          description="Indica que a avaliação já foi apresentada ao aluno"
          value={assessment.conclusion.reportSharedWithStudent}
          onChange={(value) => update({ reportSharedWithStudent: value })}
        />
      </View>
    </StepCard>
  );
}

function StepCard({
  title,
  note,
  children,
  icon,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  icon?: IoniconName;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.stepCardHeader}>
        {icon && (
          <View style={styles.stepCardIconBox}>
            <Ionicons name={icon} size={18} color="#D90000" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {!!note && <Text style={styles.noteText}>{note}</Text>}
        </View>
      </View>
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

function formatDateToBr(isoString?: string): string {
  if (!isoString) return "";
  try {
    const raw = isoString.slice(0, 10);
    const parts = raw.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // fallback
  }
  return isoString || "";
}

function applyDateMaskBr(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBrDateToIso(brDateString: string): string | null {
  const cleaned = brDateString.trim();
  const match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const d = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return null;
}

function DateField({
  label,
  isoValue,
  onChangeIso,
  icon,
}: {
  label: string;
  isoValue?: string;
  onChangeIso: (iso: string) => void;
  icon?: IoniconName;
}) {
  const formatted = useMemo(() => formatDateToBr(isoValue), [isoValue]);
  const [text, setText] = useState(formatted);

  useEffect(() => {
    setText(formatDateToBr(isoValue));
  }, [isoValue]);

  const handleChange = (input: string) => {
    const masked = applyDateMaskBr(input);
    setText(masked);
    if (masked.length === 10) {
      const iso = parseBrDateToIso(masked);
      if (iso) {
        onChangeIso(iso);
      }
    }
  };

  return (
    <Field
      label={label}
      value={text}
      onChangeText={handleChange}
      placeholder="DD/MM/AAAA"
      icon={icon}
    />
  );
}

function Field({
  label,
  value,
  placeholder = "Não informado",
  onChangeText,
  icon,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  icon?: IoniconName;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWithIconRow}>
        {icon && (
          <View style={styles.inputLeadingIcon}>
            <Ionicons name={icon} size={15} color="#D90000" />
          </View>
        )}
        <TextInput
          style={[styles.input, icon ? styles.inputWithLeadingIcon : null]}
          value={value ?? ""}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#555"
        />
      </View>
    </View>
  );
}

function ComparisonNumericField({
  label,
  value,
  suffix,
  placeholder = "0",
  previousValue,
  onChangeNumber,
}: {
  label: string;
  value?: number;
  suffix?: string;
  placeholder?: string;
  previousValue?: number;
  onChangeNumber: (value?: number) => void;
}) {
  const hasPrev = typeof previousValue === "number";
  const diff = hasPrev && typeof value === "number" ? value - previousValue : undefined;

  return (
    <View style={styles.cleanFieldCard}>
      <View style={styles.cleanFieldHeader}>
        <Text style={styles.cleanFieldLabel}>{label}</Text>
        {hasPrev && (
          <View style={styles.cleanPrevBadge}>
            <Text style={styles.cleanPrevText}>
              Ant: {previousValue}{suffix ? ` ${suffix}` : ""}
              {typeof diff === "number" && diff !== 0 ? ` (${diff > 0 ? "+" : ""}${diff.toFixed(1)})` : ""}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cleanInputRow}>
        <TextInput
          style={styles.cleanInput}
          value={textOrEmpty(value)}
          onChangeText={(text) => onChangeNumber(text.trim() ? normalizeDecimal(text) : undefined)}
          placeholder={placeholder}
          placeholderTextColor="#555"
          keyboardType="decimal-pad"
        />
        {!!suffix && (
          <View style={styles.cleanSuffixBadge}>
            <Text style={styles.cleanSuffixText}>{suffix}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function NumericField({
  label,
  value,
  suffix,
  placeholder = "0",
  onChangeNumber,
  icon,
}: {
  label: string;
  value?: number;
  suffix?: string;
  placeholder?: string;
  onChangeNumber: (value?: number) => void;
  icon?: IoniconName;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldLabelRow}>
        {icon && <Ionicons name={icon} size={14} color="#D90000" />}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.numericRow}>
        <TextInput
          style={styles.numericInput}
          value={textOrEmpty(value)}
          onChangeText={(text) => onChangeNumber(text.trim() ? normalizeDecimal(text) : undefined)}
          placeholder={placeholder}
          placeholderTextColor="#555"
          keyboardType="decimal-pad"
        />
        {!!suffix && (
          <View style={styles.suffixBadge}>
            <Text style={styles.suffixText}>{suffix}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function TextArea({
  label,
  value,
  placeholder = "Digite aqui...",
  onChangeText,
  suggestionChips,
  icon,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  suggestionChips?: string[];
  icon?: IoniconName;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldLabelRow}>
        {icon && <Ionicons name={icon} size={14} color="#D90000" />}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={value ?? ""}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#555"
        multiline
        textAlignVertical="top"
      />
      {suggestionChips && suggestionChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionChipsRail}
        >
          {suggestionChips.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.suggestionChip}
              onPress={() => {
                const current = (value || "").trim();
                const cleanChip = chip.replace(/^\+\s*/, "");
                const next = current ? `${current}\n• ${cleanChip}` : `• ${cleanChip}`;
                onChangeText(next);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={11} color="#D90000" />
              <Text style={styles.suggestionChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value?: string;
  options: [string, string][];
  onChange: (value: string) => void;
  icon?: IoniconName;
}) {
  const isGrid = options.length > 4;

  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldLabelRow}>
        {icon && <Ionicons name={icon} size={14} color="#D90000" />}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
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

function BooleanGroup({
  label,
  value,
  description,
  onChange,
}: {
  label: string;
  value?: boolean;
  description?: string;
  onChange: (value: boolean) => void;
}) {
  const isYes = value === true;
  return (
    <TouchableOpacity
      style={[styles.booleanRowCard, isYes && styles.booleanRowCardActive]}
      onPress={() => onChange(!isYes)}
      activeOpacity={0.8}
    >
      <View style={styles.booleanTextWrap}>
        <Text style={[styles.booleanLabel, isYes && styles.booleanLabelActive]}>{label}</Text>
        {!!description && <Text style={styles.booleanDescription}>{description}</Text>}
      </View>
      <View style={[styles.booleanTogglePill, isYes ? styles.booleanPillYes : styles.booleanPillNo]}>
        <Ionicons
          name={isYes ? "checkmark" : "close"}
          size={13}
          color={isYes ? "#FFFFFF" : "#777777"}
        />
        <Text style={[styles.booleanToggleText, isYes && styles.booleanToggleTextYes]}>
          {isYes ? "Sim" : "Não"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ConditionalField({
  label,
  value,
  details,
  description,
  suggestionChips,
  onToggle,
  onDetails,
}: {
  label: string;
  value?: boolean;
  details?: string;
  description?: string;
  suggestionChips?: string[];
  onToggle: (value: boolean) => void;
  onDetails: (value: string) => void;
}) {
  const isYes = value === true;
  return (
    <View style={[styles.conditionalContainer, isYes && styles.conditionalContainerActive]}>
      <TouchableOpacity
        style={styles.conditionalHeaderRow}
        onPress={() => onToggle(!isYes)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkboxSquare, isYes && styles.checkboxSquareActive]}>
          {isYes && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
        </View>
        <View style={styles.conditionalTextWrap}>
          <Text style={[styles.conditionalLabel, isYes && styles.conditionalLabelActive]}>{label}</Text>
          {!!description && <Text style={styles.conditionalDescription}>{description}</Text>}
        </View>
        <View style={[styles.booleanTogglePill, isYes ? styles.booleanPillYes : styles.booleanPillNo]}>
          <Ionicons
            name={isYes ? "checkmark" : "close"}
            size={12}
            color={isYes ? "#FFFFFF" : "#777777"}
          />
          <Text style={[styles.booleanToggleText, isYes && styles.booleanToggleTextYes]}>
            {isYes ? "Sim" : "Não"}
          </Text>
        </View>
      </TouchableOpacity>
      {isYes && (
        <View style={styles.conditionalDetailsWrap}>
          <TextInput
            style={[styles.input, styles.textArea, styles.conditionalInput]}
            value={details ?? ""}
            onChangeText={onDetails}
            placeholder={`Descreva os detalhes de: ${label.toLowerCase()}...`}
            placeholderTextColor="#555"
            multiline
            textAlignVertical="top"
          />
          {suggestionChips && suggestionChips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionChipsRail}
            >
              {suggestionChips.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionChip}
                  onPress={() => {
                    const current = (details || "").trim();
                    const cleanChip = chip.replace(/^\+\s*/, "");
                    const next = current ? `${current}, ${cleanChip}` : cleanChip;
                    onDetails(next);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={11} color="#D90000" />
                  <Text style={styles.suggestionChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
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
    backgroundColor: "#000000",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#D90000",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  confirmIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D90000",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#333333",
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
  sectionTabsRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionTabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#282828",
    paddingHorizontal: 12,
  },
  sectionTabChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  sectionTabChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTabChipTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  tabDoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
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
  card: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    marginBottom: 14,
  },
  stepCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  stepCardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  noteText: {
    color: "#888888",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionDividerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subsectionBullet: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#D90000",
  },
  sectionDividerRowWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 22,
    marginBottom: 14,
  },
  subsectionTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  quickActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  quickActionPillText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  twoColumnGrid: {
    gap: 8,
    width: "100%",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
  },
  columnHalf: {
    flex: 1,
  },
  fieldBlock: {
    marginTop: 14,
    marginBottom: 10,
  },
  fieldLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#101010",
    color: "#ffffff",
    paddingHorizontal: 13,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 84,
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
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  suffixBadge: {
    backgroundColor: "#1c1c1c",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#2e2e2e",
  },
  suffixText: {
    color: "#aaaaaa",
    fontSize: 11,
    fontWeight: "800",
  },
  suggestionChipsRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingRight: 16,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionChipText: {
    color: "#cccccc",
    fontSize: 11.5,
    fontWeight: "700",
  },
  segmentedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
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
    paddingVertical: 6,
  },
  segmentItemGrid: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  segmentItemActive: {
    backgroundColor: "#D90000",
  },
  segmentItemText: {
    color: "#888888",
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "center",
  },
  segmentItemTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  booleanRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  booleanRowCardActive: {
    borderColor: "rgba(217, 0, 0, 0.4)",
    backgroundColor: "rgba(217, 0, 0, 0.06)",
  },
  booleanTextWrap: {
    flex: 1,
  },
  booleanLabel: {
    color: "#eeeeee",
    fontSize: 13,
    fontWeight: "800",
  },
  booleanLabelActive: {
    color: "#ffffff",
  },
  booleanDescription: {
    color: "#777777",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  booleanTogglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 30,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  booleanPillYes: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  booleanPillNo: {
    backgroundColor: "#161616",
    borderColor: "#2e2e2e",
  },
  booleanToggleText: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "800",
  },
  booleanToggleTextYes: {
    color: "#ffffff",
    fontWeight: "900",
  },
  conditionalContainer: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    marginTop: 8,
    overflow: "hidden",
  },
  conditionalContainerActive: {
    borderColor: "rgba(217, 0, 0, 0.4)",
    backgroundColor: "rgba(217, 0, 0, 0.05)",
  },
  conditionalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSquareActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  conditionalTextWrap: {
    flex: 1,
  },
  conditionalLabel: {
    color: "#eeeeee",
    fontSize: 13,
    fontWeight: "800",
  },
  conditionalLabelActive: {
    color: "#ffffff",
  },
  conditionalDescription: {
    color: "#777777",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  conditionalDetailsWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  conditionalInput: {
    backgroundColor: "#0d0d0d",
    borderColor: "#282828",
    minHeight: 64,
  },
  limbPairsGrid: {
    gap: 10,
  },
  limbPairCard: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
  },
  limbPairHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  limbPairHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  limbPairTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  replicateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
    paddingHorizontal: 8,
  },
  replicateButtonDisabled: {
    backgroundColor: "#161616",
    borderColor: "#262626",
    opacity: 0.5,
  },
  replicateButtonText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  replicateButtonTextDisabled: {
    color: "#555555",
  },
  asymmetryPillRow: {
    marginTop: 8,
  },
  asymmetryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  asymmetryPillOk: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  asymmetryPillAlert: {
    backgroundColor: "rgba(255, 170, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 170, 0, 0.3)",
  },
  asymmetryPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  asymmetryPillTextOk: {
    color: "#10B981",
  },
  asymmetryPillTextAlert: {
    color: "#FFAA00",
  },
  asymmetrySummaryCard: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    gap: 8,
  },
  asymResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  asymLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  asymLabelText: {
    color: "#DDDDDD",
    fontSize: 13,
    fontWeight: "800",
  },
  asymBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  asymBadgeSimetric: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  asymBadgeMild: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  asymBadgeWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  asymBadgeMuted: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#161616",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#282828",
  },
  asymBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  asymBadgeTextSimetric: {
    color: "#10B981",
  },
  asymBadgeTextMild: {
    color: "#3B82F6",
  },
  asymBadgeTextWarning: {
    color: "#F59E0B",
  },
  asymBadgeTextMuted: {
    color: "#666666",
    fontSize: 11,
    fontWeight: "700",
  },
  skinfoldsGrid: {
    gap: 10,
    marginTop: 10,
  },
  skinfoldCard: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
  },
  skinfoldCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  skinfoldTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  skinfoldMedianBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  skinfoldMedianText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  skinfoldPendingText: {
    color: "#555555",
    fontSize: 11,
    fontWeight: "700",
  },
  skinfoldAttemptsRow: {
    flexDirection: "row",
    gap: 6,
  },
  skinfoldAttemptCol: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 6,
  },
  skinfoldAttemptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  skinfoldAttemptIndex: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
  },
  miniInvalidBtn: {
    padding: 2,
  },
  miniInvalidBtnActive: {
    opacity: 1,
  },
  skinfoldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    height: 36,
    paddingHorizontal: 6,
  },
  skinfoldInputWrapInvalid: {
    borderColor: "#552222",
    backgroundColor: "#180808",
  },
  skinfoldInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    paddingVertical: 0,
  },
  skinfoldInputInvalid: {
    color: "#774444",
    textDecorationLine: "line-through",
  },
  skinfoldSuffix: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "800",
  },
  readinessChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  readinessChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#121212",
    paddingHorizontal: 12,
  },
  readinessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readinessDotSelected: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  readinessChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  screeningChecklistCard: {
    marginTop: 10,
    gap: 6,
  },
  consentBarCard: {
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  consentBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  consentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  consentBarTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  consentBarSubtitle: {
    color: "#aaaaaa",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  consentActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
  },
  consentActionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  consentApprovedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  consentApprovedText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "800",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoViewCard: {
    flexBasis: "48.5%",
    flexGrow: 1,
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
  },
  photoViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  photoViewTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  photoDeleteMiniBtn: {
    padding: 2,
  },
  photoViewFrame: {
    height: 140,
    borderRadius: 10,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#222222",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoViewImage: {
    width: "100%",
    height: "100%",
  },
  photoWireframePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  wireframeBodyOutline: {
    alignItems: "center",
    marginBottom: 6,
  },
  wireframeHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#D90000",
    opacity: 0.7,
    marginBottom: 2,
  },
  wireframeTorso: {
    width: 22,
    height: 36,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D90000",
    opacity: 0.7,
  },
  wireframeInstruction: {
    color: "#666666",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },
  photoActionButtonsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  photoPickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  photoPickBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  annotationBlock: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#222222",
    paddingTop: 8,
  },
  annotationBlockTitle: {
    color: "#aaaaaa",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
  },
  annotationItem: {
    borderRadius: 8,
    backgroundColor: "#161616",
    padding: 8,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  annotationText: {
    color: "#dddddd",
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  conclusionSwitchesCard: {
    marginTop: 10,
    gap: 6,
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
    color: "#888888",
    fontSize: 13,
    fontWeight: "800",
  },
  resultValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
    flexShrink: 1,
  },
  helperText: {
    color: "#666666",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
  protocolCatalogCard: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 13,
    gap: 8,
  },
  protocolCatalogCardAdded: {
    borderColor: "rgba(16, 185, 129, 0.4)",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  protocolCatalogHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  protocolCatalogIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  protocolCatalogIconBoxAdded: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  protocolCatalogInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  protocolCatalogTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  protocolCategoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "#181818",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#282828",
  },
  protocolCategoryPillText: {
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "700",
  },
  protocolAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  protocolAddButtonText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "900",
  },
  protocolAddedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  protocolAddedBadgeText: {
    color: "#10B981",
    fontSize: 11.5,
    fontWeight: "900",
  },
  protocolCatalogDesc: {
    color: "#999999",
    fontSize: 12,
    lineHeight: 17,
  },
  protocolEstimatesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#141414",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#222222",
  },
  protocolEstimatesLabel: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },
  protocolEstimatesText: {
    color: "#BBBBBB",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  emptyProtocolsState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 6,
  },
  emptyProtocolsText: {
    color: "#CCCCCC",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyProtocolsSub: {
    color: "#666666",
    fontSize: 11.5,
    textAlign: "center",
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
    backgroundColor: "rgba(217, 0, 0, 0.12)",
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
    alignItems: "center",
    gap: 10,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
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
  protocolChoiceCard: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: "#121212",
    padding: 12,
    justifyContent: "space-between",
  },
  protocolChoiceCardSelected: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.08)",
  },
  protocolChoiceCardDisabled: {
    opacity: 0.4,
  },
  protocolCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  protocolIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  protocolIconBoxSelected: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  protocolTagBadge: {
    backgroundColor: "#181818",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#282828",
  },
  protocolTagBadgeSelected: {
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  protocolTagBadgeText: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
  },
  protocolTagBadgeTextSelected: {
    color: "#D90000",
  },
  protocolCardBottom: {
    gap: 3,
  },
  protocolChoiceName: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  protocolChoiceNameActive: {
    color: "#FFFFFF",
  },
  protocolChoiceDesc: {
    color: "#777777",
    fontSize: 10.5,
    fontWeight: "600",
    lineHeight: 14,
  },
  protocolChoiceDescSelected: {
    color: "#AAAAAA",
  },
  measureBlock: {
    marginTop: 12,
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
  categoryFilterRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingRight: 12,
    marginBottom: 12,
  },
  categoryFilterChip: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#121212",
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
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
  navigationRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    marginTop: 10,
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
    color: "#000000",
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
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
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#ffffff",
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
  mutedText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
  },
  compactBaseGrid: {
    gap: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  fieldPrevious: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  innerCard: {
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    marginTop: 10,
  },
  functionalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  stageCard: {
    backgroundColor: "#121212",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    marginTop: 8,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  compactAttemptGrid: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
  },
  compactAttemptCell: {
    flex: 1,
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 6,
    alignItems: "center",
  },
  compactAttemptLabel: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
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
    height: 34,
    paddingHorizontal: 4,
    width: "100%",
  },
  compactAttemptInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 0,
  },
  compactAttemptSuffix: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
    marginRight: 2,
  },
  protocolChoiceTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  datePresetsContainer: {
    backgroundColor: "#121212",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
    gap: 10,
  },
  datePresetsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  datePresetsLabel: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  datePresetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  datePresetChip: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#181818",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#282828",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  datePresetChipText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },
  inputWithIconRow: {
    position: "relative",
    justifyContent: "center",
  },
  inputLeadingIcon: {
    position: "absolute",
    left: 12,
    zIndex: 2,
  },
  inputWithLeadingIcon: {
    paddingLeft: 34,
  },
  frequencyChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  frequencyChip: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  frequencyChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  frequencyChipNumber: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  frequencyChipNumberActive: {
    color: "#FFFFFF",
  },
  frequencyChipSub: {
    color: "#777777",
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 1,
  },
  frequencyChipSubActive: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  waterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  waterChip: {
    flex: 1,
    minWidth: 48,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  waterChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  waterChipText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
  },
  waterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  cleanFieldCard: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    marginBottom: 8,
  },
  cleanFieldHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 4,
    flexWrap: "wrap",
  },
  cleanFieldLabel: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "800",
    flexShrink: 1,
    lineHeight: 16,
  },
  cleanPrevBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  cleanPrevText: {
    color: "#D90000",
    fontSize: 9.5,
    fontWeight: "800",
  },
  cleanInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    height: 40,
    paddingHorizontal: 10,
  },
  cleanInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    paddingVertical: 0,
  },
  cleanSuffixBadge: {
    backgroundColor: "#222222",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cleanSuffixText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
  },
  measureHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  measureHeaderTitle: {
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: "900",
  },
  bilateralColumnsContainer: {
    gap: 10,
    marginTop: 4,
  },
  bilateralAttemptCard: {
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 10,
    gap: 8,
  },
  bilateralSideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bilateralSideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  bilateralRightBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  bilateralLeftBadge: {
    backgroundColor: "#181818",
    borderColor: "#2c2c2c",
  },
  bilateralSideBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  functionalAttemptsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  functionalAttemptCol: {
    flex: 1,
    gap: 4,
  },
  functionalAttemptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  functionalAttemptLabel: {
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "800",
  },
  functionalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 8,
    height: 38,
  },
  functionalInputWrapInvalid: {
    borderColor: "rgba(255, 85, 85, 0.35)",
    backgroundColor: "rgba(255, 85, 85, 0.06)",
  },
  functionalInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 0,
  },
  functionalInputInvalid: {
    color: "#FF7777",
    textDecorationLine: "line-through",
  },
  functionalSuffix: {
    color: "#777777",
    fontSize: 10.5,
    fontWeight: "700",
  },
  functionalCriteriaCard: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  functionalCriteriaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  functionalCriteriaTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  criteriaPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#282828",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  criteriaPillBtnSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  criteriaPillBtnAlert: {
    backgroundColor: "rgba(255, 85, 85, 0.08)",
    borderColor: "rgba(255, 85, 85, 0.3)",
  },
  criteriaPillLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
  },
  criteriaPillValue: {
    color: "#dddddd",
    fontSize: 12,
    fontWeight: "800",
  },
  functionalValidationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255, 85, 85, 0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 85, 85, 0.25)",
    padding: 10,
    marginTop: 6,
  },
  functionalValidationErrorText: {
    color: "#FF8888",
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 16,
  },
  cardHeaderTrashBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  protocolGuideBox: {
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    padding: 10,
    gap: 6,
  },
  protocolGuideRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  protocolGuideText: {
    color: "#aaaaaa",
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  statusChipsRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#141414",
  },
  statusChipText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "700",
  },
});
