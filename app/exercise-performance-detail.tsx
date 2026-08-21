import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

import { useCurrentSession } from "@/hooks/use-current-session";
import { DEMO_STUDENT, TrainingFeedback, listFeedbacksForStudent } from "@/services/feedback-store";
import {
  ExercisePerformancePoint,
  ExercisePerformanceSummary,
  PERFORMANCE_METRIC_LABELS,
  PerformanceMetric,
  PerformancePeriodPreset,
  formatPerformanceDateTime,
  formatPerformanceValue,
  formatShortDate,
  getCompatibleMetrics,
} from "@/services/exercise-performance";
import {
  TrainingExecutedSet,
  correctTrainingExecutionSet,
  getExercisePerformanceSummary,
} from "@/services/training-plan-store";

// Design Tokens - DragonCorp Indigo Visual Identity
const BG_DARK = "#0f0f0f";
const CARD_BG = "#161616";
const CARD_SOFT = "#1c1c1c";
const BORDER_COLOR = "#262626";
const ACCENT_RED = "#D90000";
const ACCENT_ORANGE = "#ff5500";
const TEXT_WHITE = "#ffffff";
const TEXT_MUTED = "#8e8e8e";
const TEXT_SUBTLE = "#666666";
const GREEN_TEXT = "#2ecc71";
const GREEN_BG = "rgba(46, 204, 113, 0.14)";

type CorrectionTarget = {
  point: ExercisePerformancePoint;
  set: TrainingExecutedSet;
};

type CorrectionDraft = {
  reason: string;
  load: string;
  reps: string;
  effort: string;
  trainerNote: string;
  privateTrainerNote: string;
  invalid: boolean;
  invalidReason: string;
};

const DEFAULT_DRAFT: CorrectionDraft = {
  reason: "",
  load: "",
  reps: "",
  effort: "",
  trainerNote: "",
  privateTrainerNote: "",
  invalid: false,
  invalidReason: "",
};

function buildFallbackSummary(
  exerciseKey: string,
  params: {
    exerciseName?: string;
    exerciseCategory?: string;
    lastInfo?: string;
    badgeLabel?: string;
    status?: string;
  }
): ExercisePerformanceSummary {
  const name =
    params.exerciseName ||
    exerciseKey
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const category = params.exerciseCategory || "Membros Superiores";
  const badge = params.badgeLabel || "estável";
  const status =
    (params.status as ExercisePerformanceSummary["status"]) ||
    (badge.includes("+")
      ? "evolving"
      : badge.includes("-")
      ? "declining"
      : "stable");

  let currentLoad = 22.5;
  let startLoad = 20;
  if (params.lastInfo) {
    const match = params.lastInfo.match(/(\d+[.,]?\d*)\s*kg/i);
    if (match) {
      currentLoad = parseFloat(match[1].replace(",", "."));
    }
  }

  if (badge.includes("+")) {
    const diffMatch = badge.match(/\+?(\d+[.,]?\d*)/);
    const diff = diffMatch ? parseFloat(diffMatch[1].replace(",", ".")) : 2.5;
    startLoad = Math.max(currentLoad - diff, 5);
  } else if (badge.includes("-")) {
    const diffMatch = badge.match(/-?(\d+[.,]?\d*)/);
    const diff = diffMatch ? parseFloat(diffMatch[1].replace(",", ".")) : 2.5;
    startLoad = currentLoad + diff;
  } else {
    startLoad = currentLoad;
  }

  const isBodyweight = currentLoad === 0 || params.lastInfo?.includes("—");
  const loadUnit = isBodyweight ? "none" : "kg";

  // Gerar pontos históricos em ordem cronológica (mais antigo -> mais recente)
  const dates = ["2026-08-01", "2026-08-04", "2026-08-07", "2026-08-10"];
  const loadSteps = [
    startLoad,
    startLoad,
    status === "evolving" ? startLoad + (currentLoad - startLoad) * 0.6 : startLoad,
    currentLoad,
  ];

  const points: ExercisePerformancePoint[] = dates.map((d, index) => {
    const loadVal = loadSteps[index];
    const sets: TrainingExecutedSet[] = [1, 2, 3].map((setNum) => ({
      id: `set-${d}-${setNum}`,
      plannedSetIndex: setNum,
      executedLoad: isBodyweight ? undefined : loadVal,
      executedReps: 10 - setNum + 1,
      loadUnit: isBodyweight ? "none" : "kg",
      validForProgression: true,
      setType: "working",
      effort: 8 + setNum * 0.5,
    }));

    const dateFormatted = d.split("-").reverse().join("/");

    return {
      id: `pt-${d}`,
      executionId: `exec-${d}`,
      sessionId: "session-1",
      sessionName: "Treino Principal",
      date: `${d}T10:00:00.000Z`,
      status: "concluido",
      version: 1,
      exerciseId: exerciseKey,
      exerciseName: name,
      equipmentName: "Máquina",
      equipmentType: "Máquina",
      loadUnit: isBodyweight ? "none" : "kg",
      validSets: sets,
      warmupSets: [],
      invalidSets: [],
      allSets: sets,
      values: {
        bestSet: loadVal,
        load: loadVal,
        reps: 10,
        sets: 3,
        volume: loadVal * 27,
        estimated1rm: loadVal * 1.33,
        effort: 8.5,
      },
      bestSet: sets[0],
      bestSetLabel: isBodyweight
        ? "3 séries × 10 reps"
        : `${loadVal.toString().replace(".", ",")}kg × 8 a 10 • 3 séries`,
      volume: loadVal * 27,
      hasPain: false,
      hasObservation: false,
      hasPrivateTrainerNote: false,
      recordMetrics: index === 3 ? ["bestSet", "load"] : [],
    };
  });

  const variation = currentLoad - startLoad;
  const variationPercent =
    startLoad > 0 ? Math.round((variation / startLoad) * 100) : 0;
  const variationLabel = isBodyweight
    ? "Estável"
    : variation > 0
    ? `+${variation.toString().replace(".", ",")} kg (+${variationPercent}%)`
    : variation < 0
    ? `${variation.toString().replace(".", ",")} kg (${variationPercent}%)`
    : "Estável";

  return {
    id: exerciseKey,
    exerciseId: exerciseKey,
    exerciseName: name,
    muscleGroup: category,
    equipmentId: "equip-1",
    equipmentName: "Máquina",
    equipmentType: "Máquina",
    planId: "plan-1",
    planName: "Treino de Hipertrofia & Força",
    sessionIds: ["session-1"],
    sessionNames: ["Treino A"],
    unilateral: false,
    side: "bilateral",
    loadUnit: isBodyweight ? "none" : "kg",
    metricsAvailable: [
      "bestSet",
      "load",
      "reps",
      "sets",
      "volume",
      "estimated1rm",
      "effort",
    ],
    preferredMetric: "bestSet",
    firstDate: `${dates[0]}T10:00:00.000Z`,
    lastDate: `${dates[dates.length - 1]}T10:00:00.000Z`,
    executionCount: 4,
    validSetCount: 12,
    warmupSetCount: 0,
    invalidSetCount: 0,
    compatibleRecords: 4,
    status: status,
    statusLabel:
      status === "evolving"
        ? "Evolução Positiva"
        : status === "declining"
        ? "Queda de Carga"
        : "Carga Estável",
    statusTone:
      status === "evolving"
        ? "primary"
        : status === "declining"
        ? "danger"
        : "neutral",
    statusReason:
      status === "evolving"
        ? `Aumento progressivo de carga de ${startLoad.toString().replace(".", ",")}kg para ${currentLoad.toString().replace(".", ",")}kg mantendo a faixa alvo de repetições.`
        : "Manutenção sólida de volume e controle postural nas últimas 4 semanas.",
    explanation: [
      "Progressão consistente de carga com cadência controlada na fase excêntrica.",
      "Excelente adesão e intervalo de descanso cumprido.",
      "Nenhum relato de desconforto ou dor articular no período.",
    ],
    primaryMetricLabel: "Melhor série",
    primaryMetricValue: currentLoad,
    primaryMetricUnit: isBodyweight ? "reps" : "kg",
    primaryMetricDisplay: isBodyweight ? "Corporal" : `${currentLoad.toString().replace(".", ",")} kg`,
    previousMetricValue: startLoad,
    variationAbsolute: Math.abs(variation),
    variationPercent: Math.abs(variationPercent),
    variationLabel: variationLabel,
    lastBestSetLabel: isBodyweight
      ? "3 séries × 10 reps"
      : `${currentLoad.toString().replace(".", ",")}kg × 8 a 10 • 3 séries`,
    hasPain: false,
    hasObservation: false,
    hasPrivateTrainerNote: false,
    newRecordCount: status === "evolving" ? 1 : 0,
    records: [
      {
        id: "rec-1",
        metric: "load",
        label: "Recorde de carga",
        value: currentLoad,
        unit: isBodyweight ? "reps" : "kg",
        date: `${dates[dates.length - 1]}T10:00:00.000Z`,
        executionId: "exec-4",
        context: "Última sessão com controle total",
        calculationVersion: "v1",
      },
    ],
    points: points,
    allTimePoints: points,
    dataQuality: "compatible",
  };
}

export default function ExercisePerformanceDetailScreen() {
  const params = useLocalSearchParams<{
    exerciseKey?: string;
    exerciseName?: string;
    exerciseCategory?: string;
    lastInfo?: string;
    badgeLabel?: string;
    status?: string;
    studentName?: string;
    studentAvatar?: string;
    period?: PerformancePeriodPreset;
    customStart?: string;
    customEnd?: string;
  }>();

  const exerciseKey = params.exerciseKey ? decodeURIComponent(params.exerciseKey) : "";
  const period = params.period ?? "3m";
  const studentName = params.studentName || "Charles Nóbrega";
  const studentAvatar =
    params.studentAvatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  const { session, loadingSession } = useCurrentSession();

  const [summary, setSummary] = useState<ExercisePerformanceSummary | null>(null);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [metric, setMetric] = useState<PerformanceMetric>("bestSet");
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<CorrectionTarget | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState<CorrectionDraft>(DEFAULT_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      const isStudent = session.user.role === "STUDENT";
      const studentId = isStudent ? session.user.id : DEMO_STUDENT.id;
      let nextSummary: ExercisePerformanceSummary | null = null;
      let feedbackItems: TrainingFeedback[] = [];

      try {
        if (exerciseKey) {
          const result = await getExercisePerformanceSummary(
            exerciseKey,
            studentId,
            session.user.id,
            isStudent ? "student" : "trainer",
            period,
            params.customStart || undefined,
            params.customEnd || undefined
          );
          nextSummary = result.summary;
        }
      } catch {
        nextSummary = null;
      }

      if (!nextSummary) {
        nextSummary = buildFallbackSummary(exerciseKey || "supino-inclinado-maquina", {
          exerciseName: params.exerciseName,
          exerciseCategory: params.exerciseCategory,
          lastInfo: params.lastInfo,
          badgeLabel: params.badgeLabel,
          status: params.status,
        });
      }

      try {
        feedbackItems = await listFeedbacksForStudent(studentId);
      } catch {
        feedbackItems = [];
      }

      setSummary(nextSummary);
      setFeedbacks(
        feedbackItems.filter((fb) =>
          nextSummary!.points.some((p) => p.executionId === fb.executionId)
        )
      );
      setSelectedPointId(nextSummary.points[nextSummary.points.length - 1]?.id ?? null);
    } catch {
      const fallback = buildFallbackSummary(exerciseKey || "supino-inclinado-maquina", {
        exerciseName: params.exerciseName,
        exerciseCategory: params.exerciseCategory,
        lastInfo: params.lastInfo,
        badgeLabel: params.badgeLabel,
        status: params.status,
      });
      setSummary(fallback);
      setSelectedPointId(fallback.points[fallback.points.length - 1]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [exerciseKey, params.badgeLabel, params.customEnd, params.customStart, params.exerciseCategory, params.exerciseName, params.lastInfo, params.status, period, session]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  useEffect(() => {
    if (!summary) return;
    const metrics = getCompatibleMetrics(summary);
    const nextMetric = metrics.includes(summary.preferredMetric)
      ? summary.preferredMetric
      : metrics[0] ?? summary.preferredMetric;
    setMetric(nextMetric);
  }, [summary]);

  const selectedPoint = useMemo(() => {
    if (!summary) return undefined;
    return (
      summary.points.find((point) => point.id === selectedPointId) ??
      summary.points[summary.points.length - 1]
    );
  }, [selectedPointId, summary]);

  const openCorrection = (target: CorrectionTarget) => {
    if (session?.user.role !== "TRAINER") return;
    setCorrectionTarget(target);
    setCorrectionDraft({
      reason: "",
      load: target.set.executedLoad !== undefined ? String(target.set.executedLoad) : "",
      reps: target.set.executedReps !== undefined ? String(target.set.executedReps) : "",
      effort: target.set.effort !== undefined ? String(target.set.effort) : "",
      trainerNote: target.set.trainerNote ?? "",
      privateTrainerNote: target.set.privateTrainerNote ?? "",
      invalid: !target.set.validForProgression || Boolean(target.set.invalidReason),
      invalidReason: target.set.invalidReason ?? "",
    });
  };

  const saveCorrection = async () => {
    if (!correctionTarget || session?.user.role !== "TRAINER") return;
    if (!correctionDraft.reason.trim()) {
      Alert.alert("Motivo obrigatório", "Informe por que esta série está sendo corrigida.");
      return;
    }

    setSaving(true);
    try {
      await correctTrainingExecutionSet({
        executionId: correctionTarget.point.executionId,
        setId: correctionTarget.set.id,
        reason: correctionDraft.reason,
        actorId: session.user.id,
        actorRole: "trainer",
        patch: {
          executedLoad: parseNumber(correctionDraft.load),
          executedReps: parseNumber(correctionDraft.reps),
          effort: parseNumber(correctionDraft.effort),
          trainerNote: correctionDraft.trainerNote.trim(),
          privateTrainerNote: correctionDraft.privateTrainerNote.trim(),
          validForProgression: !correctionDraft.invalid,
          setType: correctionDraft.invalid
            ? "invalid"
            : correctionTarget.set.setType ?? "working",
          invalidReason: correctionDraft.invalid
            ? correctionDraft.invalidReason.trim() || "Registro marcado como inválido."
            : "",
        },
      });
      setCorrectionTarget(null);
      await loadDetail();
    } catch (saveError) {
      Alert.alert(
        "Não foi possível corrigir",
        saveError instanceof Error ? saveError.message : "Tente novamente."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={ACCENT_RED} size="large" />
        <Text style={styles.centerText}>Carregando diagnóstico de performance...</Text>
      </View>
    );
  }

  const activeSummary = summary || buildFallbackSummary(exerciseKey, params);
  const isEvolving = activeSummary.status === "evolving";
  const isDeclining = activeSummary.status === "declining";

  // Calcular valores iniciais e atuais para o cabeçalho (ex: "20 kg → 22,5 kg")
  const startLoadVal = activeSummary.previousMetricValue ?? activeSummary.primaryMetricValue ?? 20;
  const currentLoadVal = activeSummary.primaryMetricValue ?? 22.5;
  const isBodyweight = activeSummary.loadUnit === "none";

  const progressionHeader = isBodyweight
    ? "Exercício com Peso Corporal"
    : `${startLoadVal.toString().replace(".", ",")} kg → ${currentLoadVal.toString().replace(".", ",")} kg`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />

      {/* TOP BAR / CABEÇALHO */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={ACCENT_RED} />
        </TouchableOpacity>

        <View style={styles.studentHeaderInfo}>
          <Image source={{ uri: studentAvatar }} style={styles.studentAvatar} />
          <Text style={styles.studentNameTitle} numberOfLines={1}>
            {studentName}
          </Text>
        </View>

        <TouchableOpacity style={styles.reloadButton} onPress={loadDetail} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={20} color={ACCENT_RED} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO TITLE & PROGRESSION (ESTILO REFERÊNCIA IMAGEM 3) */}
        <View style={styles.heroSection}>
          <Text style={styles.exerciseMainTitle}>{activeSummary.exerciseName}</Text>
          <Text style={styles.exerciseSubTitle}>Últimas execuções do aluno</Text>

          <View style={styles.progressionRow}>
            <Text style={styles.progressionHeadline}>{progressionHeader}</Text>
            <View
              style={[
                styles.badgeStatus,
                isEvolving && styles.badgeEvolving,
                isDeclining && styles.badgeDeclining,
              ]}
            >
              <Text
                style={[
                  styles.badgeStatusText,
                  isEvolving && styles.badgeEvolvingText,
                  isDeclining && styles.badgeDecliningText,
                ]}
              >
                {activeSummary.variationLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* GRÁFICO DE EVOLUÇÃO (LINHA SVG VERMELHA/LARANJA - IMAGEM 3) */}
        <View style={styles.chartCard}>
          <PerformanceLineChart
            summary={activeSummary}
            selectedPointId={selectedPoint?.id}
            onSelect={(point) => setSelectedPointId(point.id)}
          />
        </View>

        {/* TABELA DE ÚLTIMAS EXECUÇÕES (ESTILO REFERÊNCIA IMAGEM 3) */}
        <View style={styles.tableCard}>
          <Text style={styles.tableCardTitle}>Histórico de Execuções</Text>
          <View style={styles.tableContainer}>
            {[...activeSummary.points].reverse().map((point, index) => {
              const formattedDate = formatTableDate(point.date);
              const isSelected = point.id === selectedPoint?.id;

              return (
                <TouchableOpacity
                  key={point.id || index}
                  style={[styles.tableRow, isSelected && styles.tableRowActive]}
                  onPress={() => setSelectedPointId(point.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tableDateCol}>
                    <Text style={[styles.tableDateText, isSelected && styles.tableDateTextActive]}>
                      {formattedDate}
                    </Text>
                  </View>
                  <View style={styles.tableDetailCol}>
                    <Text style={[styles.tableDetailText, isSelected && styles.tableDetailTextActive]}>
                      {point.bestSetLabel}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={isSelected ? ACCENT_RED : "#444"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* DIAGNÓSTICO DE PERFORMANCE */}
        <View style={styles.diagnosticCard}>
          <View style={styles.diagnosticHeader}>
            <View style={styles.diagnosticIconBubble}>
              <Ionicons name="analytics" size={18} color="#fff" />
            </View>
            <View style={styles.diagnosticHeaderTitleBlock}>
              <Text style={styles.diagnosticTitle}>Diagnóstico de Performance</Text>
              <Text style={styles.diagnosticSubtitle}>{activeSummary.statusLabel}</Text>
            </View>
            <View
              style={[
                styles.diagnosticStatusBadge,
                isEvolving && styles.badgeEvolving,
                isDeclining && styles.badgeDeclining,
              ]}
            >
              <Text
                style={[
                  styles.diagnosticStatusBadgeText,
                  isEvolving && styles.badgeEvolvingText,
                  isDeclining && styles.badgeDecliningText,
                ]}
              >
                {activeSummary.statusLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.diagnosticReasonText}>{activeSummary.statusReason}</Text>

          <View style={styles.diagnosticPointsList}>
            {activeSummary.explanation.map((item, idx) => (
              <View key={idx} style={styles.diagnosticBulletRow}>
                <Ionicons name="checkmark-circle" size={16} color={ACCENT_RED} />
                <Text style={styles.diagnosticBulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* DETALHAMENTO DA SESSÃO SELECIONADA */}
        {selectedPoint ? (
          <View style={styles.detailSectionCard}>
            <View style={styles.detailSectionHeader}>
              <Ionicons name="calendar-outline" size={16} color={ACCENT_RED} />
              <Text style={styles.detailSectionTitle}>
                Série detalhada • {formatTableDate(selectedPoint.date)}
              </Text>
            </View>

            <ExecutionBlock
              point={selectedPoint}
              canCorrect={session?.user.role === "TRAINER"}
              onCorrection={(set) => openCorrection({ point: selectedPoint, set })}
            />
          </View>
        ) : null}

        {/* FEEDBACKS DO ALUNO SE HOUVER */}
        {feedbacks.length > 0 && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackCardTitle}>Feedback do Aluno</Text>
            {feedbacks.map((fb) => (
              <View key={fb.id} style={styles.feedbackItem}>
                <Ionicons
                  name={fb.hasPain ? "alert-circle" : "chatbubble-ellipses"}
                  size={18}
                  color={fb.hasPain ? "#ff4444" : ACCENT_RED}
                />
                <View style={styles.feedbackTextCol}>
                  <Text style={styles.feedbackRatingText}>
                    Nota {fb.rating}/5 • {fb.intensity}
                  </Text>
                  <Text style={styles.feedbackCommentText}>
                    {fb.comment || "Sem comentários adicionais."}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL DE CORREÇÃO DO TREINADOR */}
      <CorrectionModal
        visible={Boolean(correctionTarget)}
        draft={correctionDraft}
        saving={saving}
        onChange={setCorrectionDraft}
        onClose={() => setCorrectionTarget(null)}
        onSave={saveCorrection}
      />
    </SafeAreaView>
  );
}

// GRÁFICO DE LINHA DE PERFORMANCE BASEADO NA REFERÊNCIA (IMAGEM 3)
function PerformanceLineChart({
  summary,
  selectedPointId,
  onSelect,
}: {
  summary: ExercisePerformanceSummary;
  selectedPointId?: string;
  onSelect: (point: ExercisePerformancePoint) => void;
}) {
  const points = summary.points;
  const values = points.map((p) => (typeof p.values.bestSet === "number" ? p.values.bestSet : 20));

  const width = 330;
  const height = 150;
  const paddingLeft = 32;
  const paddingRight = 32;
  const paddingTop = 20;
  const paddingBottom = 26;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const max = Math.max(...values, 10);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  const coordinates = values.map((val, idx) => ({
    x: paddingLeft + (chartWidth / Math.max(points.length - 1, 1)) * idx,
    y: paddingTop + chartHeight - ((val - min) / range) * chartHeight,
  }));

  const pathString = coordinates
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <View style={styles.chartWrapper}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* LINHAS DE GRADE HORIZONTAIS */}
        <Line
          x1={paddingLeft - 10}
          y1={paddingTop}
          x2={width - paddingRight + 10}
          y2={paddingTop}
          stroke="#262626"
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft - 10}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingRight + 10}
          y2={paddingTop + chartHeight / 2}
          stroke="#262626"
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft - 10}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight + 10}
          y2={paddingTop + chartHeight}
          stroke="#262626"
          strokeWidth={1}
        />

        {/* LINHA PRINCIPAL DA EVOLUÇÃO (LARANJA / VERMELHO INDIGO) */}
        <Path
          d={pathString}
          stroke={ACCENT_ORANGE}
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* PONTOS DE DADOS */}
        {coordinates.map((coord, idx) => {
          const pt = points[idx];
          const isSelected = pt.id === selectedPointId;

          return (
            <G key={pt.id || idx} onPress={() => onSelect(pt)}>
              {isSelected && (
                <Circle
                  cx={coord.x}
                  cy={coord.y}
                  r={9}
                  fill="rgba(255, 85, 0, 0.25)"
                />
              )}
              <Circle
                cx={coord.x}
                cy={coord.y}
                r={isSelected ? 6 : 5}
                fill={ACCENT_ORANGE}
                stroke={isSelected ? "#fff" : ACCENT_RED}
                strokeWidth={2}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function ExecutionBlock({
  point,
  canCorrect,
  onCorrection,
}: {
  point: ExercisePerformancePoint;
  canCorrect: boolean;
  onCorrection: (set: TrainingExecutedSet) => void;
}) {
  return (
    <View style={styles.executionBox}>
      {point.validSets.map((set, index) => (
        <View key={set.id || index} style={styles.setRowItem}>
          <View style={styles.setRowHeader}>
            <Text style={styles.setNumberText}>Série {set.plannedSetIndex || index + 1}</Text>
            {canCorrect && (
              <TouchableOpacity
                onPress={() => onCorrection(set)}
                style={styles.correctBadgeBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.correctBadgeBtnText}>Corrigir</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.setMetricsText}>
            {set.executedLoad !== undefined ? `${set.executedLoad} ${set.loadUnit}` : "Peso corporal"} •{" "}
            {set.executedReps !== undefined ? `${set.executedReps} reps` : "8-10 reps"}{" "}
            {set.effort ? `• RPE ${set.effort}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CorrectionModal({
  visible,
  draft,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  draft: CorrectionDraft;
  saving: boolean;
  onChange: (draft: CorrectionDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.correctionSheet}>
          <View style={styles.correctionHeader}>
            <Text style={styles.modalTitle}>Corrigir série do aluno</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FormField
              label="Motivo da correção *"
              value={draft.reason}
              onChangeText={(reason) => onChange({ ...draft, reason })}
              placeholder="Ex: Aluno anotou 20kg mas realizou com 22,5kg"
            />
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <FormField
                  label="Carga (kg)"
                  value={draft.load}
                  keyboardType="numeric"
                  onChangeText={(load) => onChange({ ...draft, load })}
                  placeholder="22.5"
                />
              </View>
              <View style={styles.formCol}>
                <FormField
                  label="Reps"
                  value={draft.reps}
                  keyboardType="numeric"
                  onChangeText={(reps) => onChange({ ...draft, reps })}
                  placeholder="10"
                />
              </View>
              <View style={styles.formCol}>
                <FormField
                  label="RPE (1-10)"
                  value={draft.effort}
                  keyboardType="numeric"
                  onChangeText={(effort) => onChange({ ...draft, effort })}
                  placeholder="8.5"
                />
              </View>
            </View>
            <FormField
              label="Observação do treinador"
              value={draft.trainerNote}
              multiline
              onChangeText={(trainerNote) => onChange({ ...draft, trainerNote })}
              placeholder="Orientação técnica para a próxima sessão..."
            />

            <TouchableOpacity
              style={styles.invalidToggle}
              onPress={() => onChange({ ...draft, invalid: !draft.invalid })}
              activeOpacity={0.8}
            >
              <Ionicons
                name={draft.invalid ? "checkbox" : "square-outline"}
                size={22}
                color={ACCENT_RED}
              />
              <View style={styles.invalidTextBlock}>
                <Text style={styles.invalidTitle}>Marcar fora dos cálculos principais</Text>
                <Text style={styles.invalidHint}>O registro continua visível na auditoria.</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={styles.primaryWideButton}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryWideText}>Salvar correção</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && styles.formInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#666"
      />
    </View>
  );
}

function formatTableDate(dateStr?: string) {
  if (!dateStr) return "10/08/2026";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  studentHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ACCENT_RED,
  },
  studentNameTitle: {
    color: ACCENT_RED,
    fontSize: 16,
    fontWeight: "900",
  },
  reloadButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 120,
  },
  heroSection: {
    marginBottom: 16,
  },
  exerciseMainTitle: {
    color: TEXT_WHITE,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  exerciseSubTitle: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  progressionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  progressionHeadline: {
    color: TEXT_WHITE,
    fontSize: 20,
    fontWeight: "900",
  },
  badgeStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#262626",
  },
  badgeEvolving: {
    backgroundColor: GREEN_BG,
  },
  badgeDeclining: {
    backgroundColor: "rgba(255, 68, 68, 0.16)",
  },
  badgeStatusText: {
    color: "#a0a0a0",
    fontSize: 13,
    fontWeight: "800",
  },
  badgeEvolvingText: {
    color: GREEN_TEXT,
  },
  badgeDecliningText: {
    color: "#ff4444",
  },
  chartCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  tableCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    marginBottom: 16,
  },
  tableCardTitle: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 12,
  },
  tableContainer: {
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  tableRowActive: {
    backgroundColor: "rgba(217, 0, 0, 0.08)",
  },
  tableDateCol: {
    width: 100,
  },
  tableDateText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
  },
  tableDateTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  tableDetailCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tableDetailText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  tableDetailTextActive: {
    color: ACCENT_RED,
    fontWeight: "900",
  },
  diagnosticCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    marginBottom: 16,
  },
  diagnosticHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  diagnosticIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: ACCENT_RED,
    alignItems: "center",
    justifyContent: "center",
  },
  diagnosticHeaderTitleBlock: {
    flex: 1,
  },
  diagnosticTitle: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "900",
  },
  diagnosticSubtitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  diagnosticStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#262626",
  },
  diagnosticStatusBadgeText: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "800",
  },
  diagnosticReasonText: {
    color: "#ddd",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    marginBottom: 12,
  },
  diagnosticPointsList: {
    gap: 8,
  },
  diagnosticBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  diagnosticBulletText: {
    color: "#aaa",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    fontWeight: "600",
  },
  detailSectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  detailSectionTitle: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "800",
  },
  executionBox: {
    gap: 8,
  },
  setRowItem: {
    backgroundColor: CARD_SOFT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
  },
  setRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  setNumberText: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: "800",
  },
  correctBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  correctBadgeBtnText: {
    color: ACCENT_RED,
    fontSize: 11,
    fontWeight: "800",
  },
  setMetricsText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
  },
  feedbackCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    marginBottom: 16,
  },
  feedbackCardTitle: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  feedbackTextCol: {
    flex: 1,
  },
  feedbackRatingText: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: "800",
  },
  feedbackCommentText: {
    color: "#aaa",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 18,
  },
  correctionSheet: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 18,
    maxHeight: "85%",
  },
  correctionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    color: TEXT_WHITE,
    fontSize: 17,
    fontWeight: "900",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CARD_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  formInput: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    color: TEXT_WHITE,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  formInputMultiline: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  formRow: {
    flexDirection: "row",
    gap: 8,
  },
  formCol: {
    flex: 1,
  },
  invalidToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD_SOFT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
    marginVertical: 10,
  },
  invalidTextBlock: {
    flex: 1,
  },
  invalidTitle: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: "800",
  },
  invalidHint: {
    color: "#777",
    fontSize: 11,
    marginTop: 2,
  },
  primaryWideButton: {
    backgroundColor: ACCENT_RED,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  primaryWideText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  centerState: {
    flex: 1,
    backgroundColor: BG_DARK,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
});
