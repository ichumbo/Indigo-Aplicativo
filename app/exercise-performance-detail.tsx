import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

export default function ExercisePerformanceDetailScreen() {
  const params = useLocalSearchParams<{
    exerciseKey?: string;
    period?: PerformancePeriodPreset;
    customStart?: string;
    customEnd?: string;
  }>();
  const exerciseKey = params.exerciseKey ? decodeURIComponent(params.exerciseKey) : "";
  const period = params.period ?? "3m";
  const { session, loadingSession } = useCurrentSession();

  const [summary, setSummary] = useState<ExercisePerformanceSummary | null>(null);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [metric, setMetric] = useState<PerformanceMetric>("bestSet");
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<CorrectionTarget | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState<CorrectionDraft>(DEFAULT_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    if (!session) return;
    if (!exerciseKey) {
      setError("Exercicio nao informado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const isStudent = session.user.role === "STUDENT";
      const studentId = isStudent ? session.user.id : DEMO_STUDENT.id;
      const [{ summary: nextSummary }, feedbackItems] = await Promise.all([
        getExercisePerformanceSummary(
          exerciseKey,
          studentId,
          session.user.id,
          isStudent ? "student" : "trainer",
          period,
          params.customStart || undefined,
          params.customEnd || undefined
        ),
        listFeedbacksForStudent(studentId),
      ]);
      setSummary(nextSummary);
      setFeedbacks(feedbackItems.filter((feedback) => nextSummary.points.some((point) => point.executionId === feedback.executionId)));
      setSelectedPointId((current) => current ?? nextSummary.points[nextSummary.points.length - 1]?.id ?? null);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Nao foi possivel abrir o historico.");
    } finally {
      setLoading(false);
    }
  }, [exerciseKey, params.customEnd, params.customStart, period, session]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  useEffect(() => {
    if (!summary) return;
    const metrics = getCompatibleMetrics(summary);
    const nextMetric = metrics.includes(summary.preferredMetric) ? summary.preferredMetric : metrics[0] ?? summary.preferredMetric;
    setMetric(nextMetric);
  }, [summary]);

  const selectedPoint = useMemo(() => {
    if (!summary) return undefined;
    return summary.points.find((point) => point.id === selectedPointId) ?? summary.points[summary.points.length - 1];
  }, [selectedPointId, summary]);

  const metricOptions = summary ? getCompatibleMetrics(summary) : [];

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
      Alert.alert("Motivo obrigatorio", "Informe por que esta serie esta sendo corrigida.");
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
          setType: correctionDraft.invalid ? "invalid" : correctionTarget.set.setType ?? "working",
          invalidReason: correctionDraft.invalid ? correctionDraft.invalidReason.trim() || "Registro marcado como invalido." : "",
        },
      });
      setCorrectionTarget(null);
      await loadDetail();
    } catch (saveError) {
      Alert.alert("Nao foi possivel corrigir", saveError instanceof Error ? saveError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Abrindo historico...</Text>
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={42} color="#ff4444" />
        <Text style={styles.centerTitle}>Historico indisponivel</Text>
        <Text style={styles.centerText}>{error || "Nao foi possivel abrir este exercicio."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerKicker}>Evolucao por exercicio</Text>
            <Text style={styles.headerTitle}>{summary.exerciseName}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={loadDetail}>
            <Ionicons name="refresh-outline" size={21} color="#D90000" />
          </TouchableOpacity>
        </View>

        <View style={styles.identityCard}>
          <InfoLine icon="construct-outline" label="Equipamento" value={summary.equipmentName} />
          <InfoLine icon="body-outline" label="Grupo muscular" value={summary.muscleGroup} />
          <InfoLine icon="calendar-outline" label="Periodo" value={`${formatShortDate(summary.firstDate)} a ${formatShortDate(summary.lastDate)}`} />
          <InfoLine icon="layers-outline" label="Identidade" value={`${summary.loadUnit} • ${summary.side} • ${summary.equipmentType}`} />
          {summary.equipmentManufacturer || summary.equipmentModel ? (
            <InfoLine icon="barcode-outline" label="Modelo" value={`${summary.equipmentManufacturer ?? ""} ${summary.equipmentModel ?? ""}`.trim()} />
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Sessoes" value={String(summary.executionCount)} />
          <StatBox label="Series validas" value={String(summary.validSetCount)} />
          <StatBox label="Recordes" value={String(summary.newRecordCount)} />
          <StatBox label="Dor" value={summary.hasPain ? "Sim" : "Nao"} danger={summary.hasPain} />
        </View>

        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <View>
              <Text style={styles.trendLabel}>Tendencia</Text>
              <Text style={styles.trendTitle}>{summary.statusLabel}</Text>
            </View>
            <Text style={styles.trendValue}>{summary.variationLabel}</Text>
          </View>
          <Text style={styles.trendReason}>{summary.statusReason}</Text>
          {summary.explanation.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.reasonRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#D90000" />
              <Text style={styles.reasonText}>{item}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricScroll}>
          {metricOptions.length ? metricOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.metricChip, metric === option && styles.metricChipActive]}
              onPress={() => setMetric(option)}
            >
              <Text style={[styles.metricChipText, metric === option && styles.metricChipTextActive]}>
                {PERFORMANCE_METRIC_LABELS[option]}
              </Text>
            </TouchableOpacity>
          )) : (
            <View style={styles.metricChip}>
              <Text style={styles.metricChipText}>Dados insuficientes</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Grafico principal</Text>
            <Text style={styles.cardMeta}>{PERFORMANCE_METRIC_LABELS[metric]}</Text>
          </View>
          <PerformanceChart
            summary={summary}
            metric={metric}
            selectedPointId={selectedPoint?.id}
            onSelect={(point) => setSelectedPointId(point.id)}
          />
        </View>

        {selectedPoint ? (
          <PointCard point={selectedPoint} metric={metric} unit={summary.primaryMetricUnit} />
        ) : null}

        {summary.records.length ? (
          <View style={styles.cardBlock}>
            <Text style={styles.cardTitle}>Melhores marcas no periodo</Text>
            {summary.records.map((record) => (
              <View key={record.id} style={styles.recordRow}>
                <View style={styles.recordIcon}>
                  <Ionicons name="trophy-outline" size={16} color="#D90000" />
                </View>
                <View style={styles.recordTextBlock}>
                  <Text style={styles.recordTitle}>{record.label}</Text>
                  <Text style={styles.recordDetail}>
                    {formatPerformanceValue(record.value, record.metric, record.unit)} • {formatShortDate(record.date)}
                  </Text>
                  <Text style={styles.recordContext}>{record.context}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.cardBlock}>
          <Text style={styles.cardTitle}>Historico de execucoes</Text>
          {summary.points.length === 0 ? (
            <EmptyInline text="Sem execucao registrada para esta identidade de exercicio." />
          ) : (
            [...summary.points].reverse().map((point) => (
              <ExecutionBlock
                key={point.id}
                point={point}
                canCorrect={session?.user.role === "TRAINER"}
                onCorrection={(set) => openCorrection({ point, set })}
              />
            ))
          )}
        </View>

        <View style={styles.cardBlock}>
          <Text style={styles.cardTitle}>Feedbacks relacionados</Text>
          {feedbacks.length === 0 ? (
            <EmptyInline text="Nenhum feedback pos-treino associado a estas execucoes." />
          ) : (
            feedbacks.map((feedback) => (
              <View key={feedback.id} style={styles.feedbackRow}>
                <Ionicons name={feedback.hasPain ? "alert-circle-outline" : "chatbubble-outline"} size={17} color={feedback.hasPain ? "#ff4444" : "#D90000"} />
                <View style={styles.feedbackTextBlock}>
                  <Text style={styles.feedbackTitle}>
                    Nota {feedback.rating}/5 • {feedback.intensity}
                  </Text>
                  <Text style={styles.feedbackDetail}>{feedback.comment ?? "Sem comentario adicional."}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <CorrectionModal
        visible={Boolean(correctionTarget)}
        draft={correctionDraft}
        saving={saving}
        onChange={setCorrectionDraft}
        onClose={() => setCorrectionTarget(null)}
        onSave={saveCorrection}
      />
    </View>
  );
}

function PerformanceChart({
  summary,
  metric,
  selectedPointId,
  onSelect,
}: {
  summary: ExercisePerformanceSummary;
  metric: PerformanceMetric;
  selectedPointId?: string;
  onSelect: (point: ExercisePerformancePoint) => void;
}) {
  const points = summary.points.filter((point) => typeof point.values[metric] === "number");
  const values = points.map((point) => point.values[metric] as number);

  if (points.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="analytics-outline" size={24} color="#D90000" />
        <Text style={styles.chartEmptyTitle}>Grafico indisponivel</Text>
        <Text style={styles.chartEmptyText}>Sao necessarios pelo menos dois pontos numericos comparaveis.</Text>
      </View>
    );
  }

  const width = 320;
  const height = 190;
  const left = 36;
  const right = 18;
  const top = 18;
  const bottom = 36;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const coordinateFor = (value: number, index: number) => ({
    x: left + (chartWidth / Math.max(points.length - 1, 1)) * index,
    y: top + chartHeight - ((value - min) / range) * chartHeight,
  });
  const coordinates = values.map(coordinateFor);
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  return (
    <View style={styles.chartWrap} accessibilityLabel={`Grafico de ${PERFORMANCE_METRIC_LABELS[metric]}`}>
      <Svg width="100%" height={220} viewBox={`0 0 ${width} ${height + 20}`}>
        <Line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke="#333" strokeWidth={1} />
        <Line x1={left} y1={top + chartHeight} x2={left + chartWidth} y2={top + chartHeight} stroke="#333" strokeWidth={1} />
        <SvgText x={4} y={top + 4} fill="#888" fontSize={10} fontWeight="700">
          {formatPerformanceValue(max, metric, summary.primaryMetricUnit)}
        </SvgText>
        <SvgText x={4} y={top + chartHeight} fill="#888" fontSize={10} fontWeight="700">
          {formatPerformanceValue(min, metric, summary.primaryMetricUnit)}
        </SvgText>
        <Line x1={first.x} y1={first.y} x2={last.x} y2={last.y} stroke="rgba(217, 0, 0, 0.35)" strokeWidth={2} strokeDasharray="5 4" />
        <Path d={path} stroke="#D90000" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point, index) => {
          const source = points[index];
          const selected = source.id === selectedPointId;
          const isRecord = source.recordMetrics.includes(metric);
          return (
            <G key={source.id} onPress={() => onSelect(source)}>
              <Circle
                cx={point.x}
                cy={point.y}
                r={selected ? 7 : 5}
                fill={isRecord ? "#fff" : "#D90000"}
                stroke={source.hasPain ? "#ff4444" : "#D90000"}
                strokeWidth={selected || source.hasPain ? 3 : 1}
              />
            </G>
          );
        })}
        <SvgText x={left} y={height + 4} fill="#888" fontSize={10} fontWeight="700">
          {formatShortDate(points[0].date)}
        </SvgText>
        <SvgText x={left + chartWidth - 44} y={height + 4} fill="#888" fontSize={10} fontWeight="700">
          {formatShortDate(points[points.length - 1].date)}
        </SvgText>
      </Svg>
    </View>
  );
}

function PointCard({ point, metric, unit }: { point: ExercisePerformancePoint; metric: PerformanceMetric; unit: string }) {
  return (
    <View style={styles.pointCard}>
      <Text style={styles.cardTitle}>Ponto selecionado</Text>
      <InfoLine icon="time-outline" label="Data" value={formatPerformanceDateTime(point.finishedAt ?? point.date)} />
      <InfoLine icon="fitness-outline" label="Sessao" value={point.sessionName} />
      <InfoLine icon="analytics-outline" label={PERFORMANCE_METRIC_LABELS[metric]} value={formatPerformanceValue(point.values[metric], metric, unit)} />
      <InfoLine icon="barbell-outline" label="Melhor serie" value={point.bestSetLabel} />
      <InfoLine icon="layers-outline" label="Series" value={`${point.validSets.length} valida(s), ${point.warmupSets.length} aquecimento, ${point.invalidSets.length} fora do calculo`} />
      {point.hasPain ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="alert-circle-outline" size={16} color="#ff4444" />
          <Text style={styles.inlineWarningText}>Ha dor registrada nesta execucao.</Text>
        </View>
      ) : null}
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
    <View style={styles.executionBlock}>
      <View style={styles.executionHeader}>
        <View>
          <Text style={styles.executionTitle}>{formatPerformanceDateTime(point.finishedAt ?? point.date)}</Text>
          <Text style={styles.executionSub}>
            {point.sessionIdentifier ?? "Sessao"} • v{point.version}
          </Text>
        </View>
        {point.hasPain ? <Ionicons name="alert-circle-outline" size={20} color="#ff4444" /> : null}
      </View>

      {point.allSets.map((set) => (
        <View key={set.id} style={styles.setHistoryRow}>
          <View style={styles.setHistoryTop}>
            <Text style={styles.setHistoryTitle}>
              Serie {set.plannedSetIndex} • {getSetKindLabel(set)}
            </Text>
            {canCorrect ? (
              <TouchableOpacity onPress={() => onCorrection(set)}>
                <Text style={styles.correctText}>Corrigir</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.setHistoryDetail}>
            {formatSetMetrics(set)}
          </Text>
          {set.note || set.studentNote || set.trainerNote || (canCorrect && set.privateTrainerNote) ? (
            <View style={styles.noteBlock}>
              {set.studentNote || set.note ? <Text style={styles.noteText}>Aluno: {set.studentNote ?? set.note}</Text> : null}
              {set.trainerNote ? <Text style={styles.noteText}>Treinador: {set.trainerNote}</Text> : null}
              {canCorrect && set.privateTrainerNote ? <Text style={styles.privateNoteText}>Privado: {set.privateTrainerNote}</Text> : null}
            </View>
          ) : null}
          {set.pain ? (
            <View style={styles.painRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#ff4444" />
              <Text style={styles.painText}>
                Dor {set.pain.region} • {set.pain.level}/10{set.pain.moment ? ` • ${set.pain.moment}` : ""}
              </Text>
            </View>
          ) : null}
          {set.correctionAudit?.length ? (
            <Text style={styles.auditText}>
              Corrigida em {formatPerformanceDateTime(set.correctionAudit[0].createdAt)} • {set.correctionAudit[0].reason}
            </Text>
          ) : null}
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
            <Text style={styles.modalTitle}>Corrigir serie</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
          >
            <FormField label="Motivo da correcao" value={draft.reason} onChangeText={(reason) => onChange({ ...draft, reason })} />
            <View style={styles.formRow}>
              <FormField label="Carga" value={draft.load} keyboardType="numeric" onChangeText={(load) => onChange({ ...draft, load })} />
              <FormField label="Reps" value={draft.reps} keyboardType="numeric" onChangeText={(reps) => onChange({ ...draft, reps })} />
              <FormField label="RPE" value={draft.effort} keyboardType="numeric" onChangeText={(effort) => onChange({ ...draft, effort })} />
            </View>
            <FormField label="Observacao do treinador" value={draft.trainerNote} multiline onChangeText={(trainerNote) => onChange({ ...draft, trainerNote })} />
            <FormField label="Observacao privada" value={draft.privateTrainerNote} multiline onChangeText={(privateTrainerNote) => onChange({ ...draft, privateTrainerNote })} />

            <TouchableOpacity style={styles.invalidToggle} onPress={() => onChange({ ...draft, invalid: !draft.invalid })}>
              <Ionicons name={draft.invalid ? "checkbox" : "square-outline"} size={22} color="#D90000" />
              <View style={styles.invalidTextBlock}>
                <Text style={styles.invalidTitle}>Marcar fora dos calculos principais</Text>
                <Text style={styles.invalidHint}>O registro bruto continua no historico e na auditoria.</Text>
              </View>
            </TouchableOpacity>

            {draft.invalid ? (
              <FormField label="Motivo da invalidacao" value={draft.invalidReason} onChangeText={(invalidReason) => onChange({ ...draft, invalidReason })} />
            ) : null}
          </ScrollView>

          <TouchableOpacity style={styles.primaryWideButton} onPress={onSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryWideText}>Salvar correcao</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function InfoLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color="#D90000" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, danger && styles.statValueDanger]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
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
        placeholderTextColor="#666"
      />
    </View>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <View style={styles.emptyInline}>
      <Ionicons name="information-circle-outline" size={18} color="#D90000" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function formatSetMetrics(set: TrainingExecutedSet) {
  const values = [
    set.executedLoad !== undefined ? `${set.executedLoad} ${set.loadUnit}` : set.loadUnit === "none" ? "Sem carga registrada" : undefined,
    set.executedReps !== undefined ? `${set.executedReps} rep(s)` : undefined,
    set.durationSeconds !== undefined ? `${set.durationSeconds}s` : undefined,
    set.distanceMeters !== undefined ? `${set.distanceMeters}m` : undefined,
    set.effort !== undefined ? `RPE ${set.effort}/10` : undefined,
    set.actualRestSeconds !== undefined ? `descanso ${set.actualRestSeconds}s` : undefined,
  ].filter(Boolean);
  return values.length ? values.join(" • ") : "Dados insuficientes nesta serie";
}

function getSetKindLabel(set: TrainingExecutedSet) {
  if (set.invalidReason || set.setType === "invalid") return "invalida";
  if (set.warmup || set.setType === "warmup") return "aquecimento";
  if (set.setType === "approach") return "aproximacao";
  if (set.assisted || set.setType === "assisted") return "assistida";
  if (set.partial || set.setType === "partial") return "parcial";
  if (set.interrupted || set.setType === "interrupted") return "interrompida";
  return set.validForProgression ? "valida" : "fora do calculo";
}

function parseNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  scrollContent: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 120,
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
    fontWeight: "900",
    marginTop: 12,
  },
  centerText: {
    color: "#999",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
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
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerKicker: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 2,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
  },
  identityCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    gap: 9,
    marginBottom: 12,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 32,
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
    fontWeight: "800",
    flex: 0.8,
  },
  infoValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    flex: 1.1,
    textAlign: "right",
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    minHeight: 66,
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 10,
    justifyContent: "space-between",
  },
  statValue: {
    color: "#D90000",
    fontSize: 18,
    fontWeight: "900",
  },
  statValueDanger: {
    color: "#ff4444",
  },
  statLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 13,
  },
  trendCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 15,
    marginBottom: 12,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  trendLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
  },
  trendTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },
  trendValue: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    flex: 1,
  },
  trendReason: {
    color: "#ddd",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 5,
  },
  reasonText: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  metricScroll: {
    marginBottom: 12,
  },
  metricChip: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  metricChipActive: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.14)",
  },
  metricChipText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
  },
  metricChipTextActive: {
    color: "#D90000",
  },
  chartCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  cardMeta: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  chartWrap: {
    minHeight: 220,
  },
  chartEmpty: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  chartEmptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  chartEmptyText: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },
  pointCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    gap: 9,
    marginBottom: 12,
  },
  inlineWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.25)",
    borderRadius: 10,
    padding: 10,
  },
  inlineWarningText: {
    color: "#ff4444",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  cardBlock: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginBottom: 12,
  },
  recordRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
  },
  recordIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217, 0, 0, 0.1)",
  },
  recordTextBlock: {
    flex: 1,
  },
  recordTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  recordDetail: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },
  recordContext: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  executionBlock: {
    backgroundColor: "#242424",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginTop: 12,
  },
  executionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  executionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  executionSub: {
    color: "#999",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  setHistoryRow: {
    backgroundColor: "#1c1c1c",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#303030",
    padding: 10,
    marginTop: 8,
  },
  setHistoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  setHistoryTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    flex: 1,
  },
  correctText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  setHistoryDetail: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 5,
  },
  noteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: "#D90000",
    paddingLeft: 9,
    marginTop: 8,
    gap: 4,
  },
  noteText: {
    color: "#ddd",
    fontSize: 12,
    lineHeight: 17,
  },
  privateNoteText: {
    color: "#D90000",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  painRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  painText: {
    color: "#ff4444",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  auditText: {
    color: "#777",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  feedbackRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
  },
  feedbackTextBlock: {
    flex: 1,
  },
  feedbackTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  feedbackDetail: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  emptyInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  emptyText: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
    padding: 20,
  },
  correctionSheet: {
    maxHeight: "86%",
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
  },
  correctionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formField: {
    flex: 1,
    marginTop: 12,
  },
  formLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  formInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#242424",
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
  },
  formInputMultiline: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  invalidToggle: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#242424",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginTop: 12,
  },
  invalidTextBlock: {
    flex: 1,
  },
  invalidTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  invalidHint: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  primaryWideButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  primaryWideText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
});
