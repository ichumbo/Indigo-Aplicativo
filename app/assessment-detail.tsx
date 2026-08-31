import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  PERIMETER_LABELS,
  PHOTO_VIEWS,
  POSTURAL_REGION_LABELS,
  PhysicalAssessment,
  formatAssessmentDate,
  formatAssessmentDateTime,
  getAssessmentById,
  getAssessmentStatusLabel,
  getAssessmentSummary,
  getAssessmentTypeLabel,
  reopenAssessment,
} from "@/services/assessment-store";
import { exportAssessmentToPdf } from "@/services/assessment-pdf-service";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const empty = "—";
const display = (value?: string | number | boolean) => {
  if (value === undefined || value === null || value === "") return empty;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
};

export default function AssessmentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; role?: "student" | "trainer" }>();
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const role = session?.user.role === "STUDENT" ? "student" : "trainer";
  const userId = session?.user.id;
  const [assessment, setAssessment] = useState<PhysicalAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"todos" | "composicao" | "perimetros" | "cardio" | "funcional" | "anamnese" | "postura" | "conclusao">("todos");

  const loadAssessment = useCallback(async () => {
    if (!params.id || !userId) {
      setError("Avaliação não encontrada.");
      setLoading(false);
      return;
    }

    try {
      const item = await getAssessmentById(params.id, userId, role);
      setAssessment(item);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir esta avaliação.");
    } finally {
      setLoading(false);
    }
  }, [params.id, role, userId]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const summary = useMemo(() => (assessment ? getAssessmentSummary(assessment) : null), [assessment]);

  const handleReopen = async () => {
    if (!assessment || role !== "trainer") return;
    try {
      const updated = await reopenAssessment(assessment.id);
      router.replace({ pathname: "/assessment-editor" as never, params: { id: updated.id } });
    } catch {
      Alert.alert("Erro", "Não foi possível reabrir a avaliação.");
    }
  };

  const handleExportPdf = async () => {
    if (!assessment) return;
    setExportingPdf(true);
    try {
      await exportAssessmentToPdf(assessment, assessment.trainerId);
    } finally {
      setExportingPdf(false);
    }
  };

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" size="large" />
        <Text style={styles.centerText}>Carregando relatório detalhado...</Text>
      </View>
    );
  }

  if (error || !assessment || !summary) {
    return (
      <View style={styles.centerState}>
        <View style={styles.errorIconBox}>
          <Ionicons name="alert-circle-outline" size={32} color="#ff4444" />
        </View>
        <Text style={styles.centerTitle}>Não foi possível abrir</Text>
        <Text style={styles.centerText}>{error || "Avaliação não encontrada."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const comp = assessment.composition;
  const compSnapshot = comp.protocolSnapshot;
  const isCompleted = assessment.status === "concluida";

  const trunkPerimeters: { key: keyof typeof PERIMETER_LABELS; label: string; icon: IoniconName }[] = [
    { key: "neck", label: "Pescoço", icon: "body-outline" },
    { key: "shoulders", label: "Ombros", icon: "barbell-outline" },
    { key: "chest", label: "Tórax", icon: "shirt-outline" },
    { key: "waist", label: "Cintura", icon: "resize-outline" },
    { key: "abdomen", label: "Abdômen", icon: "fitness-outline" },
    { key: "hip", label: "Quadril", icon: "body-outline" },
  ];

  const limbPairs = [
    { rightKey: "rightArmRelaxed" as const, leftKey: "leftArmRelaxed" as const, label: "Braço relaxado", icon: "body-outline" as IoniconName },
    { rightKey: "rightArmFlexed" as const, leftKey: "leftArmFlexed" as const, label: "Braço contraído", icon: "barbell-outline" as IoniconName },
    { rightKey: "rightForearm" as const, leftKey: "leftForearm" as const, label: "Antebraço", icon: "hand-right-outline" as IoniconName },
    { rightKey: "rightThigh" as const, leftKey: "leftThigh" as const, label: "Coxa", icon: "walk-outline" as IoniconName },
    { rightKey: "rightCalf" as const, leftKey: "leftCalf" as const, label: "Panturrilha", icon: "footsteps-outline" as IoniconName },
  ];

  // BMI calculations
  const bmiVal = comp.bmi;
  const bmiClassification = compSnapshot?.results.bmiClassification || (bmiVal ? (bmiVal < 18.5 ? "Abaixo do peso" : bmiVal < 25 ? "Normal / Saudável" : bmiVal < 30 ? "Sobrepeso" : "Obesidade") : undefined);
  const bmiPercentOnGauge = bmiVal ? Math.min(Math.max(((bmiVal - 15) / 25) * 100, 0), 100) : null;

  // Body fat breakdown calculations
  const fatPct = comp.bodyFatPercent;
  const leanPct = fatPct !== undefined ? Math.max(100 - fatPct, 0) : undefined;
  const fatKg = comp.fatMassKg;
  const leanKg = comp.leanMassKg;

  const shouldShow = (section: typeof activeFilter) => activeFilter === "todos" || activeFilter === section;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* Top Bar Padronizada */}
      <View style={[styles.topBar, { borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          style={[styles.topBarBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.topBarTitleCenter}>
          <Text style={[styles.topBarTitle, { color: theme.text }]}>Relatório de Avaliação</Text>
          <View style={styles.statusIndicatorRow}>
            <View style={[styles.statusDot, isCompleted ? styles.statusDotComplete : styles.statusDotDraft]} />
            <Text style={[styles.topBarSubtitle, isCompleted ? styles.topBarSubtitleComplete : styles.topBarSubtitleDraft]}>
              {getAssessmentStatusLabel(assessment.status)} • {summary.progressPercent}%
            </Text>
          </View>
        </View>
        <View style={styles.topBarRightActions}>
          <TouchableOpacity
            style={[styles.topBarBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={handleExportPdf}
            activeOpacity={0.8}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color="#D90000" />
            ) : (
              <Ionicons name="document-text-outline" size={19} color={theme.text} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBarBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={() => router.push({ pathname: "/assessment-compare" as never, params: { id: assessment.id } })}
            activeOpacity={0.8}
          >
            <Ionicons name="git-compare-outline" size={19} color="#D90000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Student Profile & Executive Summary Card */}
        <View style={styles.studentHeroCard}>
          <View style={styles.studentHeroHeader}>
            {assessment.studentAvatar ? (
              <Image source={{ uri: assessment.studentAvatar }} style={styles.studentAvatarImg} />
            ) : (
              <View style={styles.studentAvatarFallback}>
                <Ionicons name="person" size={22} color="#D90000" />
              </View>
            )}
            <View style={styles.studentHeroInfo}>
              <Text style={styles.studentHeroName}>{assessment.studentName}</Text>
              <View style={styles.studentHeroBadgesRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{getAssessmentTypeLabel(assessment.type)}</Text>
                </View>
                <Text style={styles.studentHeroDate}>
                  {formatAssessmentDate(assessment.assessedAt)}
                </Text>
              </View>
              <Text style={styles.studentHeroTrainer} numberOfLines={1}>
                Avaliador: <Text style={styles.studentHeroTrainerName}>{assessment.trainerName}</Text>
              </Text>
            </View>
            <View style={[styles.progressRingBadge, isCompleted && styles.progressRingBadgeComplete]}>
              <Ionicons
                name={isCompleted ? "checkmark-circle" : "time-outline"}
                size={14}
                color={isCompleted ? "#10B981" : "#D90000"}
              />
              <Text style={[styles.progressRingText, isCompleted && styles.progressRingTextComplete]}>
                {summary.completedSteps}/{summary.totalSteps}
              </Text>
            </View>
          </View>

          {/* Quick Metrics KPI Strip */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiTile}>
              <View style={styles.kpiIconWrap}>
                <Ionicons name="scale-outline" size={15} color="#D90000" />
              </View>
              <Text style={styles.kpiLabel}>Peso</Text>
              <Text style={styles.kpiValue}>
                {comp.weightKg ? `${comp.weightKg} kg` : empty}
              </Text>
              <Text style={styles.kpiSub}>
                {comp.heightCm ? `${comp.heightCm} cm` : "Estatura"}
              </Text>
            </View>

            <View style={styles.kpiTile}>
              <View style={styles.kpiIconWrap}>
                <Ionicons name="flame-outline" size={15} color="#D90000" />
              </View>
              <Text style={styles.kpiLabel}>% Gordura</Text>
              <Text style={styles.kpiValue}>
                {fatPct !== undefined ? `${fatPct}%` : empty}
              </Text>
              <Text style={styles.kpiSub} numberOfLines={1}>
                {compSnapshot?.results.bodyFatClassification || "Composição"}
              </Text>
            </View>

            <View style={styles.kpiTile}>
              <View style={styles.kpiIconWrap}>
                <Ionicons name="barbell-outline" size={15} color="#D90000" />
              </View>
              <Text style={styles.kpiLabel}>Massa Magra</Text>
              <Text style={styles.kpiValue}>
                {leanKg !== undefined ? `${leanKg} kg` : empty}
              </Text>
              <Text style={styles.kpiSub}>
                {fatKg !== undefined ? `Gorda: ${fatKg}kg` : "Massa livre"}
              </Text>
            </View>

            <View style={styles.kpiTile}>
              <View style={styles.kpiIconWrap}>
                <Ionicons name="speedometer-outline" size={15} color="#D90000" />
              </View>
              <Text style={styles.kpiLabel}>IMC</Text>
              <Text style={styles.kpiValue}>
                {bmiVal !== undefined ? bmiVal.toFixed(1) : empty}
              </Text>
              <Text style={styles.kpiSub} numberOfLines={1}>
                {bmiClassification || "Índice massa"}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Filter Rail */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRail}
        >
          {[
            { id: "todos", label: "Todos", icon: "layers-outline" as IoniconName },
            { id: "composicao", label: "Composição", icon: "pie-chart-outline" as IoniconName },
            { id: "perimetros", label: "Perímetros", icon: "body-outline" as IoniconName },
            { id: "cardio", label: "Cardio", icon: "heart-outline" as IoniconName },
            { id: "funcional", label: "Funcional", icon: "fitness-outline" as IoniconName },
            { id: "postura", label: "Postura & Fotos", icon: "camera-outline" as IoniconName },
            { id: "anamnese", label: "Anamnese", icon: "medkit-outline" as IoniconName },
            { id: "conclusao", label: "Conclusão", icon: "document-text-outline" as IoniconName },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab.id as never)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={isActive ? "#FFFFFF" : "#888888"}
                />
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 1. Composição Corporal & Gráficos */}
        {shouldShow("composicao") && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportIconBox}>
                <Ionicons name="pie-chart-outline" size={17} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportCardTitle}>Composição Corporal</Text>
                <Text style={styles.reportCardSubtitle}>
                  {compSnapshot?.protocolName || comp.methodDetails || "Protocolo de bioimpedância / dobras"}
                </Text>
              </View>
            </View>

            {/* Gráfico Visual: Proporção Massa Magra vs Massa Gorda */}
            {fatPct !== undefined && leanPct !== undefined ? (
              <View style={styles.visualGraphContainer}>
                <View style={styles.visualGraphHeader}>
                  <Text style={styles.visualGraphTitle}>Distribuição da Massa Corporal</Text>
                  <Text style={styles.visualGraphTotal}>Total: {comp.weightKg || (leanKg && fatKg ? (leanKg + fatKg).toFixed(1) : "—")} kg</Text>
                </View>

                {/* Stacked Distribution Bar */}
                <View style={styles.stackedBarTrack}>
                  <View style={[styles.stackedBarLean, { flex: leanPct }]} />
                  <View style={[styles.stackedBarFat, { flex: fatPct }]} />
                </View>

                {/* Sub Cards Legenda */}
                <View style={styles.stackedLegendGrid}>
                  <View style={styles.stackedLegendCard}>
                    <View style={styles.legendDotLean} />
                    <View>
                      <Text style={styles.legendLabel}>Massa Magra</Text>
                      <Text style={styles.legendValue}>{leanKg ? `${leanKg} kg` : "—"} ({leanPct.toFixed(1)}%)</Text>
                    </View>
                  </View>

                  <View style={styles.stackedLegendCard}>
                    <View style={styles.legendDotFat} />
                    <View>
                      <Text style={styles.legendLabel}>Massa Gorda</Text>
                      <Text style={styles.legendValue}>{fatKg ? `${fatKg} kg` : "—"} ({fatPct.toFixed(1)}%)</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Gráfico Visual: Espectro & Ponteiro de IMC */}
            {bmiVal !== undefined && bmiPercentOnGauge !== null ? (
              <View style={styles.visualGraphContainer}>
                <View style={styles.visualGraphHeader}>
                  <Text style={styles.visualGraphTitle}>Índice de Massa Corporal (IMC)</Text>
                  <View style={styles.bmiResultBadge}>
                    <Text style={styles.bmiResultBadgeText}>{bmiVal.toFixed(1)} kg/m² • {bmiClassification}</Text>
                  </View>
                </View>

                {/* Multi-zone Color Gauge */}
                <View style={styles.bmiSpectrumTrack}>
                  <View style={[styles.bmiZone, styles.bmiZoneUnderweight]} />
                  <View style={[styles.bmiZone, styles.bmiZoneNormal]} />
                  <View style={[styles.bmiZone, styles.bmiZoneOverweight]} />
                  <View style={[styles.bmiZone, styles.bmiZoneObesity]} />
                </View>

                {/* Pointer Marker */}
                <View style={styles.bmiPointerRow}>
                  <View style={{ left: `${bmiPercentOnGauge}%`, transform: [{ translateX: -6 }] }}>
                    <Ionicons name="caret-up" size={14} color="#FFFFFF" />
                  </View>
                </View>

                {/* Zone Labels */}
                <View style={styles.bmiZoneLabelsRow}>
                  <Text style={styles.bmiZoneLabel}>Baixo (&lt;18.5)</Text>
                  <Text style={styles.bmiZoneLabel}>Saudável (18.5-25)</Text>
                  <Text style={styles.bmiZoneLabel}>Sobrepeso (25-30)</Text>
                  <Text style={styles.bmiZoneLabel}>Obesidade (&gt;30)</Text>
                </View>
              </View>
            ) : null}

            {/* Resumo de Metas & Parâmetros em Grade */}
            <View style={styles.metaDataGrid}>
              <View style={styles.metaDataTile}>
                <Text style={styles.metaDataLabel}>Gordura Ideal / Meta</Text>
                <Text style={styles.metaDataValue}>
                  {comp.targetBodyFatPercent ? `${comp.targetBodyFatPercent}%` : compSnapshot?.results.targetBodyFatPercent ? `${compSnapshot.results.targetBodyFatPercent}%` : empty}
                </Text>
              </View>

              <View style={styles.metaDataTile}>
                <Text style={styles.metaDataLabel}>Peso Alvo Estimado</Text>
                <Text style={styles.metaDataValue}>
                  {compSnapshot?.results.targetWeightKg ? `${compSnapshot.results.targetWeightKg} kg` : empty}
                </Text>
              </View>

              <View style={styles.metaDataTile}>
                <Text style={styles.metaDataLabel}>Taxa Metabólica Basal</Text>
                <Text style={styles.metaDataValue}>
                  {comp.basalMetabolicRateKcal ? `${comp.basalMetabolicRateKcal} kcal` : empty}
                </Text>
              </View>

              <View style={styles.metaDataTile}>
                <Text style={styles.metaDataLabel}>Soma das Dobras</Text>
                <Text style={styles.metaDataValue}>
                  {compSnapshot?.intermediate.skinfoldSumMm ? `${compSnapshot.intermediate.skinfoldSumMm} mm` : empty}
                </Text>
              </View>
            </View>

            {/* Detalhe da Equação Científica */}
            <View style={styles.scientificEquationBox}>
              <Ionicons name="calculator-outline" size={14} color="#D90000" />
              <View style={{ flex: 1 }}>
                <Text style={styles.scientificEquationTitle}>Fórmula e Referência</Text>
                <Text style={styles.scientificEquationText}>
                  {compSnapshot?.formulaReference || comp.methodDetails || "Protocolo com conversão científica padronizada."}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 2. Perímetros Corporais & Assimetrias Bilaterais */}
        {shouldShow("perimetros") && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportIconBox}>
                <Ionicons name="body-outline" size={17} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportCardTitle}>Perímetros & Assimetrias</Text>
                <Text style={styles.reportCardSubtitle}>Medidas antropométricas em centímetros (cm)</Text>
              </View>
            </View>

            {/* Tronco e Cabeça (Grid 2x3 de Tiles) */}
            <Text style={styles.subCardSectionTitle}>Tronco e Cabeça</Text>
            <View style={styles.perimeterTilesGrid}>
              {trunkPerimeters.map((item) => {
                const val = assessment.perimeters[item.key]?.valueCm;
                return (
                  <View key={item.key} style={styles.perimeterTile}>
                    <View style={styles.perimeterTileIcon}>
                      <Ionicons name={item.icon} size={14} color="#D90000" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perimeterTileLabel}>{item.label}</Text>
                      <Text style={styles.perimeterTileValue}>{val ? `${val} cm` : empty}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Membros Bilaterais com Barras de Comparação D vs E */}
            <Text style={[styles.subCardSectionTitle, { marginTop: 14 }]}>Membros Bilaterais & Assimetrias</Text>
            <View style={styles.bilateralList}>
              {limbPairs.map(({ rightKey, leftKey, label, icon }) => {
                const rightVal = assessment.perimeters[rightKey]?.valueCm;
                const leftVal = assessment.perimeters[leftKey]?.valueCm;
                const hasVals = rightVal !== undefined && leftVal !== undefined;
                const diff = hasVals ? Math.abs(rightVal - leftVal) : undefined;
                const maxVal = Math.max(rightVal ?? 0, leftVal ?? 0);
                const percent = diff !== undefined && maxVal > 0 ? (diff / maxVal) * 100 : undefined;

                return (
                  <View key={label} style={styles.bilateralCard}>
                    <View style={styles.bilateralHeader}>
                      <View style={styles.bilateralHeaderLeft}>
                        <Ionicons name={icon} size={14} color="#D90000" />
                        <Text style={styles.bilateralTitle}>{label}</Text>
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
                            size={11}
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
                            {diff === 0 ? "Simétrico" : `${diff.toFixed(1)} cm (${percent?.toFixed(1)}%)`}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.asymBadgeMuted}>
                          <Text style={styles.asymBadgeTextMuted}>Pendente</Text>
                        </View>
                      )}
                    </View>

                    {/* Dual Comparative Bar */}
                    <View style={styles.bilateralCompareRow}>
                      <View style={styles.bilateralSideCol}>
                        <Text style={styles.bilateralSideLabel}>Direito (D)</Text>
                        <Text style={styles.bilateralSideValue}>{rightVal !== undefined ? `${rightVal} cm` : empty}</Text>
                      </View>

                      {/* Mini visual track */}
                      <View style={styles.bilateralBarContainer}>
                        <View style={styles.bilateralTrack}>
                          <View
                            style={[
                              styles.bilateralBarFill,
                              { width: maxVal > 0 && rightVal ? `${(rightVal / (maxVal * 1.1)) * 100}%` : "0%" },
                            ]}
                          />
                        </View>
                        <View style={styles.bilateralTrack}>
                          <View
                            style={[
                              styles.bilateralBarFill,
                              { width: maxVal > 0 && leftVal ? `${(leftVal / (maxVal * 1.1)) * 100}%` : "0%" },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={[styles.bilateralSideCol, { alignItems: "flex-end" }]}>
                        <Text style={styles.bilateralSideLabel}>Esquerdo (E)</Text>
                        <Text style={styles.bilateralSideValue}>{leftVal !== undefined ? `${leftVal} cm` : empty}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 3. Avaliação Cardiorrespiratória */}
        {shouldShow("cardio") && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportIconBox}>
                <Ionicons name="heart-outline" size={17} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportCardTitle}>Avaliação Cardiorrespiratória</Text>
                <Text style={styles.reportCardSubtitle}>Capacidade aeróbia e limiares de esforço</Text>
              </View>
            </View>

            {assessment.cardioTests.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Ionicons name="pulse-outline" size={26} color="#555555" />
                <Text style={styles.emptyStateText}>Nenhum protocolo cardiorrespiratório registrado</Text>
              </View>
            ) : (
              assessment.cardioTests.map((test) => (
                <View key={test.id} style={styles.cardioItemCard}>
                  <View style={styles.cardioItemHeader}>
                    <Text style={styles.cardioItemTitle}>
                      {test.snapshot?.protocolName ?? test.config?.protocolName ?? test.protocolId}
                    </Text>
                    <View style={styles.cardioStatusBadge}>
                      <Text style={styles.cardioStatusBadgeText}>{display(test.status)}</Text>
                    </View>
                  </View>

                  {/* Primary VO2max / Deflection Highlight */}
                  <View style={styles.cardioKpiHighlight}>
                    <View style={styles.cardioKpiMain}>
                      <Text style={styles.cardioKpiLabel}>
                        {test.snapshot?.primaryResult?.label ?? "VO₂máx Estimado"}
                      </Text>
                      <Text style={styles.cardioKpiValue}>
                        {test.snapshot?.primaryResult?.value !== undefined
                          ? `${test.snapshot.primaryResult.value} ${test.snapshot.primaryResult.unit ?? ""}`
                          : test.snapshot?.vo2MaxEstimate
                          ? `${test.snapshot.vo2MaxEstimate} ml/kg/min`
                          : empty}
                      </Text>
                    </View>
                    {test.snapshot?.conconi?.heartRateBpm && (
                      <View style={styles.cardioDeflectionPill}>
                        <Ionicons name="pulse" size={13} color="#F59E0B" />
                        <Text style={styles.cardioDeflectionText}>
                          Limiar: {test.snapshot.conconi.heartRateBpm} bpm
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Detailed Specs */}
                  <View style={styles.cardioDetailsGrid}>
                    <View style={styles.cardioDetailRow}>
                      <Text style={styles.cardioDetailLabel}>Queda FC 1 min:</Text>
                      <Text style={styles.cardioDetailValue}>
                        {test.snapshot?.recoveryDrop1Min !== undefined ? `${test.snapshot.recoveryDrop1Min} bpm` : empty}
                      </Text>
                    </View>
                    <View style={styles.cardioDetailRow}>
                      <Text style={styles.cardioDetailLabel}>Referência:</Text>
                      <Text style={styles.cardioDetailValue} numberOfLines={1}>
                        {display(test.snapshot?.reference)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 4. Neuromotora & Testes Funcionais */}
        {shouldShow("funcional") && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportIconBox}>
                <Ionicons name="fitness-outline" size={17} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportCardTitle}>Neuromotora & Funcional</Text>
                <Text style={styles.reportCardSubtitle}>Bateria de testes de força, mobilidade e estabilidade</Text>
              </View>
            </View>

            {/* Triagem / Readiness Pill */}
            <View style={styles.readinessBanner}>
              <Ionicons
                name={
                  assessment.functionalScreening?.readinessStatus === "contraindicado" ||
                  assessment.functionalScreening?.readinessStatus === "encaminhamento_recomendado"
                    ? "alert-circle"
                    : "checkmark-circle"
                }
                size={16}
                color={
                  assessment.functionalScreening?.readinessStatus === "contraindicado" ||
                  assessment.functionalScreening?.readinessStatus === "encaminhamento_recomendado"
                    ? "#EF4444"
                    : "#10B981"
                }
              />
              <Text style={styles.readinessBannerText}>
                Triagem pré-esforço:{" "}
                <Text style={{ fontWeight: "900", color: "#FFFFFF" }}>
                  {display(assessment.functionalScreening?.readinessStatus || "Apto")}
                </Text>
              </Text>
            </View>

            {assessment.functionalTests.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Ionicons name="barbell-outline" size={26} color="#555555" />
                <Text style={styles.emptyStateText}>Nenhum teste funcional registrado</Text>
              </View>
            ) : (
              <View style={styles.functionalTestsList}>
                {assessment.functionalTests.map((test) => (
                  <View key={test.id} style={styles.functionalTestCard}>
                    <View style={styles.functionalTestHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.functionalTestName}>
                          {test.snapshot?.testName ?? test.customDefinition?.name ?? test.testId}
                        </Text>
                        <Text style={styles.functionalTestMeta}>
                          {test.side ? `Lado: ${test.side}` : "Bilateral"} • {display(test.snapshot?.interpretation || "Registrado")}
                        </Text>
                      </View>
                      <View style={styles.functionalScoreBadge}>
                        <Text style={styles.functionalScoreBadgeText}>
                          {test.snapshot?.primaryResult?.value !== undefined
                            ? `${test.snapshot.primaryResult.value} ${test.snapshot.primaryResult.unit ?? ""}`
                            : empty}
                        </Text>
                      </View>
                    </View>

                    {test.pain?.present ? (
                      <View style={styles.painAlertPill}>
                        <Ionicons name="warning-outline" size={12} color="#EF4444" />
                        <Text style={styles.painAlertText}>Relato de dor/desconforto durante execução</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 5. Fotos e Avaliação Postural */}
        {shouldShow("postura") && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportIconBox}>
                <Ionicons name="camera-outline" size={17} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportCardTitle}>Fotos & Análise Postural</Text>
                <Text style={styles.reportCardSubtitle}>Acompanhamento visual e marcações nos 4 planos</Text>
              </View>
            </View>

            <View style={styles.photosReportGrid}>
              {PHOTO_VIEWS.map((view) => {
                const photo = assessment.photos.find((item) => item.view === view.id);
                return (
                  <View key={view.id} style={styles.photoGridCard}>
                    <View style={styles.photoGridHeader}>
                      <Text style={styles.photoGridTitle}>{view.label}</Text>
                      {photo?.annotations.length ? (
                        <View style={styles.annotationCountPill}>
                          <Text style={styles.annotationCountText}>{photo.annotations.length} marcações</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.photoGridFrame}>
                      {photo ? (
                        <Image source={{ uri: photo.uri }} style={styles.photoGridImg} resizeMode="cover" />
                      ) : (
                        <View style={styles.photoGridPlaceholder}>
                          <Ionicons name="camera-outline" size={24} color="#444444" />
                          <Text style={styles.photoGridPlaceholderText}>Não registrada</Text>
                        </View>
                      )}
                    </View>

                    {photo?.annotations.length ? (
                      <View style={styles.photoAnnotationsBox}>
                        {photo.annotations.map((ann) => (
                          <Text key={ann.id} style={styles.annotationLine} numberOfLines={1}>
                            • {POSTURAL_REGION_LABELS[ann.region]}: {ann.note || "Marcação"}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 6. Anamnese & Hábitos */}
        {shouldShow("anamnese") && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportIconBox}>
                <Ionicons name="medkit-outline" size={17} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportCardTitle}>Anamnese & Saúde</Text>
                <Text style={styles.reportCardSubtitle}>Histórico clínico, hábitos e estilo de vida</Text>
              </View>
            </View>

            {/* 4 Lifestyle Tiles */}
            <View style={styles.lifestyleGrid}>
              <View style={styles.lifestyleTile}>
                <Ionicons name="moon-outline" size={15} color="#D90000" />
                <Text style={styles.lifestyleLabel}>Sono</Text>
                <Text style={styles.lifestyleValue}>{display(assessment.anamnesis.sleepQuality)}</Text>
              </View>
              <View style={styles.lifestyleTile}>
                <Ionicons name="pulse-outline" size={15} color="#D90000" />
                <Text style={styles.lifestyleLabel}>Estresse</Text>
                <Text style={styles.lifestyleValue}>{display(assessment.anamnesis.stressLevel)}</Text>
              </View>
              <View style={styles.lifestyleTile}>
                <Ionicons name="water-outline" size={15} color="#D90000" />
                <Text style={styles.lifestyleLabel}>Água</Text>
                <Text style={styles.lifestyleValue}>
                  {assessment.anamnesis.waterIntakeLiters ? `${assessment.anamnesis.waterIntakeLiters} L/dia` : empty}
                </Text>
              </View>
              <View style={styles.lifestyleTile}>
                <Ionicons name="wine-outline" size={15} color="#D90000" />
                <Text style={styles.lifestyleLabel}>Álcool</Text>
                <Text style={styles.lifestyleValue}>{display(assessment.anamnesis.alcoholUse)}</Text>
              </View>
            </View>

            {/* Medical Flags */}
            <View style={styles.clinicalNotesList}>
              <View style={styles.clinicalNoteRow}>
                <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                <Text style={styles.clinicalNoteLabel}>Dores Atuais:</Text>
                <Text style={styles.clinicalNoteValue}>{display(assessment.anamnesis.currentPainDetails || assessment.anamnesis.currentPain)}</Text>
              </View>
              <View style={styles.clinicalNoteRow}>
                <Ionicons name="bandage-outline" size={14} color="#888888" />
                <Text style={styles.clinicalNoteLabel}>Lesões Prévias:</Text>
                <Text style={styles.clinicalNoteValue}>{display(assessment.anamnesis.previousInjuriesDetails || assessment.anamnesis.previousInjuries)}</Text>
              </View>
              <View style={styles.clinicalNoteRow}>
                <Ionicons name="fitness-outline" size={14} color="#888888" />
                <Text style={styles.clinicalNoteLabel}>Medicamentos:</Text>
                <Text style={styles.clinicalNoteValue}>{display(assessment.anamnesis.medicationsDetails || assessment.anamnesis.medications)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 7. Conclusão & Prescrição */}
        {shouldShow("conclusao") && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportIconBox}>
                <Ionicons name="document-text-outline" size={17} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportCardTitle}>Conclusão & Prescrição</Text>
                <Text style={styles.reportCardSubtitle}>Direcionamento técnico e recomendações</Text>
              </View>
            </View>

            {assessment.conclusion.attentionPoints ? (
              <View style={styles.calloutCard}>
                <View style={styles.calloutHeader}>
                  <Ionicons name="alert-circle-outline" size={15} color="#F59E0B" />
                  <Text style={styles.calloutTitle}>Pontos de Atenção</Text>
                </View>
                <Text style={styles.calloutContent}>{assessment.conclusion.attentionPoints}</Text>
              </View>
            ) : null}

            {assessment.conclusion.definedGoals ? (
              <View style={styles.calloutCard}>
                <View style={styles.calloutHeader}>
                  <Ionicons name="flag-outline" size={15} color="#D90000" />
                  <Text style={styles.calloutTitle}>Objetivos Definidos</Text>
                </View>
                <Text style={styles.calloutContent}>{assessment.conclusion.definedGoals}</Text>
              </View>
            ) : null}

            {assessment.conclusion.trainerRecommendations ? (
              <View style={styles.calloutCard}>
                <View style={styles.calloutHeader}>
                  <Ionicons name="fitness-outline" size={15} color="#10B981" />
                  <Text style={styles.calloutTitle}>Recomendações do Personal</Text>
                </View>
                <Text style={styles.calloutContent}>{assessment.conclusion.trainerRecommendations}</Text>
              </View>
            ) : null}

            {assessment.conclusion.notes ? (
              <View style={styles.calloutCard}>
                <View style={styles.calloutHeader}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#888888" />
                  <Text style={styles.calloutTitle}>Observações Finais</Text>
                </View>
                <Text style={styles.calloutContent}>{assessment.conclusion.notes}</Text>
              </View>
            ) : null}

            <View style={styles.sharingStatusBanner}>
              <Ionicons
                name={assessment.conclusion.releaseToStudent ? "eye-outline" : "eye-off-outline"}
                size={15}
                color={assessment.conclusion.releaseToStudent ? "#10B981" : "#888888"}
              />
              <Text style={styles.sharingStatusText}>
                {assessment.conclusion.releaseToStudent
                  ? "Relatório liberado para visualização no perfil do aluno"
                  : "Relatório em modo rascunho interno do personal"}
              </Text>
            </View>
          </View>
        )}

        {/* Footer Actions */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleExportPdf}
            activeOpacity={0.85}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionButtonText}>Exportar Laudo em PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => router.push({ pathname: "/assessment-compare" as never, params: { id: assessment.id } })}
              activeOpacity={0.85}
            >
              <Ionicons name="git-compare-outline" size={16} color="#D90000" />
              <Text style={styles.secondaryActionButtonText}>Comparar Histórico</Text>
            </TouchableOpacity>

            {role === "trainer" && (
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={handleReopen}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.secondaryActionButtonText}>Reabrir Edição</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  topBarTitleCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  statusIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotComplete: {
    backgroundColor: "#10B981",
  },
  statusDotDraft: {
    backgroundColor: "#D90000",
  },
  topBarSubtitle: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  topBarSubtitleComplete: {
    color: "#10B981",
  },
  topBarSubtitleDraft: {
    color: "#D90000",
  },
  topBarRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  studentHeroCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 12,
  },
  studentHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  studentAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#D90000",
  },
  studentAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },
  studentHeroInfo: {
    flex: 1,
    minWidth: 0,
  },
  studentHeroName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  studentHeroBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  typeBadgeText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  studentHeroDate: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "700",
  },
  studentHeroTrainer: {
    color: "#777777",
    fontSize: 11,
    marginTop: 2,
  },
  studentHeroTrainerName: {
    color: "#BBBBBB",
    fontWeight: "800",
  },
  progressRingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#181818",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  progressRingBadgeComplete: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  progressRingText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  progressRingTextComplete: {
    color: "#10B981",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e1e1e",
  },
  kpiTile: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 9,
    alignItems: "center",
  },
  kpiIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  kpiLabel: {
    color: "#888888",
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  kpiValue: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    marginTop: 2,
  },
  kpiSub: {
    color: "#666666",
    fontSize: 9.5,
    marginTop: 1,
  },
  filterRail: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#121212",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  filterChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  reportCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 12,
  },
  reportCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  reportIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  reportCardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  reportCardSubtitle: {
    color: "#777777",
    fontSize: 11.5,
    marginTop: 1,
  },
  visualGraphContainer: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    marginBottom: 10,
  },
  visualGraphHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  visualGraphTitle: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "800",
  },
  visualGraphTotal: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  stackedBarTrack: {
    flexDirection: "row",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#222222",
    overflow: "hidden",
    marginBottom: 10,
  },
  stackedBarLean: {
    backgroundColor: "#D90000",
    height: "100%",
  },
  stackedBarFat: {
    backgroundColor: "#F59E0B",
    height: "100%",
  },
  stackedLegendGrid: {
    flexDirection: "row",
    gap: 10,
  },
  stackedLegendCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111111",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 8,
  },
  legendDotLean: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D90000",
  },
  legendDotFat: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  legendLabel: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
  },
  legendValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 1,
  },
  bmiResultBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  bmiResultBadgeText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "800",
  },
  bmiSpectrumTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    gap: 2,
    marginTop: 4,
  },
  bmiZone: {
    flex: 1,
    height: "100%",
  },
  bmiZoneUnderweight: {
    backgroundColor: "#3B82F6",
  },
  bmiZoneNormal: {
    backgroundColor: "#10B981",
  },
  bmiZoneOverweight: {
    backgroundColor: "#F59E0B",
  },
  bmiZoneObesity: {
    backgroundColor: "#EF4444",
  },
  bmiPointerRow: {
    height: 14,
    position: "relative",
  },
  bmiZoneLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  bmiZoneLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "600",
  },
  metaDataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  metaDataTile: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 9,
  },
  metaDataLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaDataValue: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    marginTop: 2,
  },
  scientificEquationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 10,
  },
  scientificEquationTitle: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scientificEquationText: {
    color: "#BBBBBB",
    fontSize: 11,
    marginTop: 1,
  },
  subCardSectionTitle: {
    color: "#CCCCCC",
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 8,
  },
  perimeterTilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  perimeterTile: {
    flexBasis: "31%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 8,
  },
  perimeterTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  perimeterTileLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
  },
  perimeterTileValue: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "900",
    marginTop: 1,
  },
  bilateralList: {
    gap: 8,
  },
  bilateralCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
  },
  bilateralHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bilateralHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bilateralTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  bilateralCompareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bilateralSideCol: {
    width: 80,
  },
  bilateralSideLabel: {
    color: "#777777",
    fontSize: 9.5,
    fontWeight: "700",
  },
  bilateralSideValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 1,
  },
  bilateralBarContainer: {
    flex: 1,
    gap: 3,
  },
  bilateralTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#222222",
    overflow: "hidden",
  },
  bilateralBarFill: {
    height: "100%",
    backgroundColor: "#D90000",
    borderRadius: 3,
  },
  asymBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
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
    backgroundColor: "#111111",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  asymBadgeText: {
    fontSize: 10.5,
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
    fontSize: 10,
    fontWeight: "700",
  },
  emptyStateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 6,
  },
  emptyStateText: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "700",
  },
  cardioItemCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    marginBottom: 8,
  },
  cardioItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardioItemTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  cardioStatusBadge: {
    backgroundColor: "#111111",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#282828",
  },
  cardioStatusBadgeText: {
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "700",
  },
  cardioKpiHighlight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111111",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  cardioKpiMain: {
    flex: 1,
  },
  cardioKpiLabel: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardioKpiValue: {
    color: "#D90000",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  cardioDeflectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  cardioDeflectionText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "800",
  },
  cardioDetailsGrid: {
    gap: 4,
  },
  cardioDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardioDetailLabel: {
    color: "#777777",
    fontSize: 11,
  },
  cardioDetailValue: {
    color: "#CCCCCC",
    fontSize: 11.5,
    fontWeight: "800",
  },
  readinessBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#161616",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 8,
    marginBottom: 10,
  },
  readinessBannerText: {
    color: "#AAAAAA",
    fontSize: 11.5,
  },
  functionalTestsList: {
    gap: 8,
  },
  functionalTestCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
  },
  functionalTestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  functionalTestName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  functionalTestMeta: {
    color: "#777777",
    fontSize: 10.5,
    marginTop: 2,
  },
  functionalScoreBadge: {
    backgroundColor: "#101010",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#282828",
  },
  functionalScoreBadgeText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  painAlertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },
  painAlertText: {
    color: "#EF4444",
    fontSize: 10.5,
    fontWeight: "700",
  },
  photosReportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoGridCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 8,
  },
  photoGridHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  photoGridTitle: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  annotationCountPill: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  annotationCountText: {
    color: "#D90000",
    fontSize: 9.5,
    fontWeight: "800",
  },
  photoGridFrame: {
    height: 120,
    borderRadius: 8,
    backgroundColor: "#101010",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoGridImg: {
    width: "100%",
    height: "100%",
  },
  photoGridPlaceholder: {
    alignItems: "center",
    gap: 4,
  },
  photoGridPlaceholderText: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "700",
  },
  photoAnnotationsBox: {
    marginTop: 6,
    gap: 2,
  },
  annotationLine: {
    color: "#888888",
    fontSize: 10,
  },
  lifestyleGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  lifestyleTile: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 8,
    alignItems: "center",
  },
  lifestyleLabel: {
    color: "#777777",
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 3,
  },
  lifestyleValue: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 1,
    textAlign: "center",
  },
  clinicalNotesList: {
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    gap: 6,
  },
  clinicalNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clinicalNoteLabel: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
    width: 100,
  },
  clinicalNoteValue: {
    color: "#CCCCCC",
    fontSize: 11.5,
    flex: 1,
  },
  calloutCard: {
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    marginBottom: 8,
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  calloutTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  calloutContent: {
    color: "#BBBBBB",
    fontSize: 12,
    lineHeight: 17,
  },
  sharingStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#101010",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  sharingStatusText: {
    color: "#888888",
    fontSize: 11,
    flex: 1,
  },
  footerActions: {
    gap: 10,
    marginTop: 6,
  },
  primaryActionButton: {
    height: 50,
    backgroundColor: "#D90000",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    height: 44,
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryActionButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  centerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  centerText: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  primaryButton: {
    height: 44,
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
});
