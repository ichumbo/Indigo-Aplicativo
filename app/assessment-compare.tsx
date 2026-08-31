import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  PERIMETER_LABELS,
  PHOTO_VIEWS,
  PerimeterKey,
  PhysicalAssessment,
  formatAssessmentDate,
  listAssessmentsForTrainer,
} from "@/services/assessment-store";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
const empty = "—";

export default function AssessmentCompareScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const [allAssessments, setAllAssessments] = useState<PhysicalAssessment[]>([]);
  const [studentAssessments, setStudentAssessments] = useState<PhysicalAssessment[]>([]);
  const [firstId, setFirstId] = useState<string | undefined>();
  const [secondId, setSecondId] = useState<string | undefined>();
  const [selectedView, setSelectedView] = useState(PHOTO_VIEWS[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  const loadAssessments = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const items = await listAssessmentsForTrainer(session.user.id);
      setAllAssessments(items);

      if (items.length === 0) {
        setStudentAssessments([]);
        setLoading(false);
        return;
      }

      // Identify the current assessment being inspected
      const current = params.id ? items.find((item) => item.id === params.id) || items[0] : items[0];
      const forStudent = items.filter((item) => item.studentId === current.studentId);
      setStudentAssessments(forStudent.length > 0 ? forStudent : [current]);

      // If we have at least 2 for this student, pick the previous and current
      if (forStudent.length >= 2) {
        const sorted = [...forStudent].sort(
          (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
        );
        const currentIndex = sorted.findIndex((a) => a.id === current.id);
        if (currentIndex > 0) {
          setFirstId(sorted[currentIndex - 1].id);
          setSecondId(sorted[currentIndex].id);
        } else {
          setFirstId(sorted[0].id);
          setSecondId(sorted[1].id);
        }
      } else if (forStudent.length === 1) {
        setFirstId(forStudent[0].id);
        setSecondId(forStudent[0].id);
      }

      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a comparação.");
    } finally {
      setLoading(false);
    }
  }, [params.id, session]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const baseAssessment = useMemo(() => {
    if (studentAssessments.length > 0) return studentAssessments[0];
    if (allAssessments.length > 0) return allAssessments[0];
    return null;
  }, [studentAssessments, allAssessments]);

  // Demo second assessment for preview if only 1 evaluation exists and user toggles demo mode
  const simulatedSecondAssessment = useMemo<PhysicalAssessment | null>(() => {
    if (!baseAssessment) return null;
    return {
      ...baseAssessment,
      id: "simulated-assessment-2",
      assessedAt: new Date(new Date(baseAssessment.assessedAt).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      type: "periodica",
      status: "concluida",
      composition: {
        ...baseAssessment.composition,
        weightKg: baseAssessment.composition.weightKg ? baseAssessment.composition.weightKg - 3.2 : 75.0,
        bodyFatPercent: baseAssessment.composition.bodyFatPercent ? Math.max(baseAssessment.composition.bodyFatPercent - 2.8, 8) : 13.5,
        leanMassKg: baseAssessment.composition.leanMassKg ? baseAssessment.composition.leanMassKg + 1.2 : 65.0,
        fatMassKg: baseAssessment.composition.fatMassKg ? Math.max(baseAssessment.composition.fatMassKg - 4.4, 4) : 10.0,
        bmi: baseAssessment.composition.bmi ? baseAssessment.composition.bmi - 1.1 : 23.1,
      },
      perimeters: {
        ...baseAssessment.perimeters,
        chest: { valueCm: (baseAssessment.perimeters.chest?.valueCm ?? 98) + 2.5 },
        waist: { valueCm: Math.max((baseAssessment.perimeters.waist?.valueCm ?? 84) - 4.0, 50) },
        abdomen: { valueCm: Math.max((baseAssessment.perimeters.abdomen?.valueCm ?? 88) - 5.5, 50) },
        hip: { valueCm: Math.max((baseAssessment.perimeters.hip?.valueCm ?? 100) - 2.0, 50) },
        rightArmRelaxed: { valueCm: (baseAssessment.perimeters.rightArmRelaxed?.valueCm ?? 35) + 1.5 },
        leftArmRelaxed: { valueCm: (baseAssessment.perimeters.leftArmRelaxed?.valueCm ?? 34.5) + 1.8 },
        rightThigh: { valueCm: (baseAssessment.perimeters.rightThigh?.valueCm ?? 56) + 2.0 },
        leftThigh: { valueCm: (baseAssessment.perimeters.leftThigh?.valueCm ?? 55.5) + 2.2 },
      },
    };
  }, [baseAssessment]);

  const first = useMemo(() => {
    return allAssessments.find((item) => item.id === firstId) || baseAssessment;
  }, [allAssessments, firstId, baseAssessment]);

  const second = useMemo(() => {
    if (demoMode && simulatedSecondAssessment) return simulatedSecondAssessment;
    return allAssessments.find((item) => item.id === secondId) || (studentAssessments.length > 1 ? studentAssessments[1] : baseAssessment);
  }, [allAssessments, secondId, studentAssessments, baseAssessment, demoMode, simulatedSecondAssessment]);

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" size="large" />
        <Text style={styles.centerText}>Carregando histórico de evolução...</Text>
      </View>
    );
  }

  if (error || !first) {
    return (
      <View style={styles.centerState}>
        <View style={styles.errorIconBox}>
          <Ionicons name="alert-circle-outline" size={32} color="#ff4444" />
        </View>
        <Text style={styles.centerTitle}>Nenhuma avaliação encontrada</Text>
        <Text style={styles.centerText}>{error || "Cadastre uma avaliação física para visualizar a comparação."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSingleAssessment = studentAssessments.length < 2 && !demoMode;

  const firstPhoto = first.photos.find((photo) => photo.view === selectedView);
  const secondPhoto = second?.photos.find((photo) => photo.view === selectedView);

  // Key perimeters to highlight
  const trunkPerimeters: { key: PerimeterKey; label: string; icon: IoniconName }[] = [
    { key: "chest", label: "Tórax", icon: "shirt-outline" },
    { key: "waist", label: "Cintura", icon: "resize-outline" },
    { key: "abdomen", label: "Abdômen", icon: "fitness-outline" },
    { key: "hip", label: "Quadril", icon: "body-outline" },
  ];

  const limbPerimeters: { key: PerimeterKey; label: string; icon: IoniconName }[] = [
    { key: "rightArmRelaxed", label: "Braço D (Relaxado)", icon: "body-outline" },
    { key: "leftArmRelaxed", label: "Braço E (Relaxado)", icon: "body-outline" },
    { key: "rightThigh", label: "Coxa D", icon: "walk-outline" },
    { key: "leftThigh", label: "Coxa E", icon: "walk-outline" },
    { key: "rightCalf", label: "Panturrilha D", icon: "footsteps-outline" },
    { key: "leftCalf", label: "Panturrilha E", icon: "footsteps-outline" },
  ];

  const daysBetween =
    first && second && first.id !== second.id
      ? Math.round(
          Math.abs(new Date(second.assessedAt).getTime() - new Date(first.assessedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.background, borderBottomColor: theme.divider }]}>
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
          <Text style={[styles.topBarTitle, { color: theme.text }]}>Comparar Evolução</Text>
          <Text style={[styles.topBarSubtitle, { color: theme.textSecondary }]}>{first.studentName}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.topBarBtn,
            { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
            demoMode && styles.topBarBtnActive,
          ]}
          onPress={() => setDemoMode(!demoMode)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Modo Demonstração"
        >
          <Ionicons name={demoMode ? "sparkles" : "sparkles-outline"} size={18} color={demoMode ? "#D90000" : theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* If student only has 1 assessment, display Baseline Info Banner */}
        {isSingleAssessment ? (
          <View style={styles.baselineBannerCard}>
            <View style={styles.baselineBannerHeader}>
              <View style={styles.baselineIconBox}>
                <Ionicons name="flag" size={20} color="#D90000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.baselineBannerTitle}>Primeira Avaliação • Marco Zero</Text>
                <Text style={styles.baselineBannerDesc}>
                  O aluno possui 1 avaliação cadastrada ({formatAssessmentDate(first.assessedAt)}). Abaixo estão os dados de referência inicial.
                </Text>
              </View>
            </View>

            <View style={styles.baselineActionsRow}>
              <TouchableOpacity
                style={styles.baselineActionPrimary}
                onPress={() =>
                  router.push({
                    pathname: "/assessment-editor" as never,
                    params: { studentId: first.studentId, type: "periodica" },
                  })
                }
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.baselineActionPrimaryText}>Criar Nova Reavaliação</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.baselineActionSecondary}
                onPress={() => setDemoMode(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles-outline" size={15} color="#D90000" />
                <Text style={styles.baselineActionSecondaryText}>Simular Evolução</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Date Selector Rail (when 2 or more assessments exist or in demo mode) */}
        {!isSingleAssessment && second ? (
          <View style={styles.selectorCard}>
            <View style={styles.selectorCardHeader}>
              <Ionicons name="calendar-outline" size={16} color="#D90000" />
              <Text style={styles.selectorCardTitle}>Período Comparado</Text>
              {typeof daysBetween === "number" && (
                <View style={styles.intervalBadge}>
                  <Text style={styles.intervalBadgeText}>{daysBetween} dias de intervalo</Text>
                </View>
              )}
            </View>

            <View style={styles.selectorRow}>
              <View style={styles.selectorCol}>
                <Text style={styles.selectorLabel}>1. Avaliação Inicial (Antes)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {studentAssessments.map((item) => (
                    <TouchableOpacity
                      key={`first-${item.id}`}
                      style={[styles.dateSelectChip, firstId === item.id && styles.dateSelectChipActive]}
                      onPress={() => setFirstId(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dateSelectChipText, firstId === item.id && styles.dateSelectChipTextActive]}>
                        {formatAssessmentDate(item.assessedAt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={[styles.selectorRow, { marginTop: 10 }]}>
              <View style={styles.selectorCol}>
                <Text style={styles.selectorLabel}>2. Reavaliação (Depois)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {demoMode ? (
                    <View style={[styles.dateSelectChip, styles.dateSelectChipActive]}>
                      <Text style={[styles.dateSelectChipText, styles.dateSelectChipTextActive]}>
                        Simulação (+90 dias)
                      </Text>
                    </View>
                  ) : (
                    studentAssessments.map((item) => (
                      <TouchableOpacity
                        key={`second-${item.id}`}
                        style={[styles.dateSelectChip, secondId === item.id && styles.dateSelectChipActive]}
                        onPress={() => setSecondId(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dateSelectChipText, secondId === item.id && styles.dateSelectChipTextActive]}>
                          {formatAssessmentDate(item.assessedAt)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        ) : null}

        {/* KPI Evolution Highlights (4 Cards) */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionBullet} />
          <Ionicons name="trending-up-outline" size={15} color="#D90000" />
          <Text style={styles.sectionHeaderTitle}>Principais Indicadores de Evolução</Text>
        </View>

        <View style={styles.kpiGrid}>
          <KpiCompareTile
            icon="scale-outline"
            label="Peso Corporal"
            before={first.composition.weightKg}
            after={second?.composition.weightKg}
            unit="kg"
            invertGoodDirection={true} // losing weight is typically marked as delta
          />
          <KpiCompareTile
            icon="flame-outline"
            label="% Gordura"
            before={first.composition.bodyFatPercent}
            after={second?.composition.bodyFatPercent}
            unit="%"
            invertGoodDirection={true} // reducing body fat is good
          />
          <KpiCompareTile
            icon="barbell-outline"
            label="Massa Magra"
            before={first.composition.leanMassKg}
            after={second?.composition.leanMassKg}
            unit="kg"
            invertGoodDirection={false} // gaining lean mass is good
          />
          <KpiCompareTile
            icon="speedometer-outline"
            label="IMC"
            before={first.composition.bmi}
            after={second?.composition.bmi}
            unit=""
            invertGoodDirection={true}
          />
        </View>

        {/* Visual Body Composition Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="pie-chart-outline" size={17} color="#D90000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Composição Corporal Detalhada</Text>
              <Text style={styles.cardSubtitle}>Comparativo de massa magra, gorda e índices</Text>
            </View>
          </View>

          <CompareRow
            label="Peso Total"
            before={first.composition.weightKg}
            after={second?.composition.weightKg}
            suffix="kg"
          />
          <CompareRow
            label="Percentual de Gordura (%G)"
            before={first.composition.bodyFatPercent}
            after={second?.composition.bodyFatPercent}
            suffix="%"
          />
          <CompareRow
            label="Massa Magra"
            before={first.composition.leanMassKg}
            after={second?.composition.leanMassKg}
            suffix="kg"
          />
          <CompareRow
            label="Massa Gorda"
            before={first.composition.fatMassKg}
            after={second?.composition.fatMassKg}
            suffix="kg"
          />
          <CompareRow
            label="Índice de Massa Corporal (IMC)"
            before={first.composition.bmi}
            after={second?.composition.bmi}
          />
        </View>

        {/* Perímetros do Tronco */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="body-outline" size={17} color="#D90000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Perímetros do Tronco</Text>
              <Text style={styles.cardSubtitle}>Circunferências centrais em cm</Text>
            </View>
          </View>

          {trunkPerimeters.map((item) => (
            <CompareRow
              key={item.key}
              label={item.label}
              icon={item.icon}
              before={first.perimeters[item.key]?.valueCm}
              after={second?.perimeters[item.key]?.valueCm}
              suffix="cm"
            />
          ))}
        </View>

        {/* Perímetros dos Membros Bilaterais */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="swap-horizontal-outline" size={17} color="#D90000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Membros Bilaterais</Text>
              <Text style={styles.cardSubtitle}>Braços, coxas e panturrilhas em cm</Text>
            </View>
          </View>

          {limbPerimeters.map((item) => (
            <CompareRow
              key={item.key}
              label={item.label}
              icon={item.icon}
              before={first.perimeters[item.key]?.valueCm}
              after={second?.perimeters[item.key]?.valueCm}
              suffix="cm"
            />
          ))}
        </View>

        {/* Fotos Padronizadas Lado a Lado */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="camera-outline" size={17} color="#D90000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Comparação Visual de Fotos</Text>
              <Text style={styles.cardSubtitle}>Registro fotográfico padronizado nos 4 planos</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewSelectScroll}>
            {PHOTO_VIEWS.map((view) => (
              <TouchableOpacity
                key={view.id}
                style={[styles.viewSelectChip, selectedView === view.id && styles.viewSelectChipActive]}
                onPress={() => setSelectedView(view.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewSelectChipText, selectedView === view.id && styles.viewSelectChipTextActive]}>
                  {view.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.photosDualContainer}>
            <View style={styles.photoDualColumn}>
              <View style={styles.photoDualLabelBox}>
                <Text style={styles.photoDualLabelText}>Antes • {formatAssessmentDate(first.assessedAt)}</Text>
              </View>
              <View style={styles.photoDualFrame}>
                {firstPhoto ? (
                  <Image source={{ uri: firstPhoto.uri }} style={styles.photoDualImage} resizeMode="cover" />
                ) : (
                  <View style={styles.photoPlaceholderBox}>
                    <Ionicons name="camera-outline" size={24} color="#444444" />
                    <Text style={styles.photoPlaceholderText}>Sem foto registrada</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.photoDualColumn}>
              <View style={styles.photoDualLabelBox}>
                <Text style={styles.photoDualLabelText}>
                  Depois • {second ? formatAssessmentDate(second.assessedAt) : "Pendente"}
                </Text>
              </View>
              <View style={styles.photoDualFrame}>
                {secondPhoto ? (
                  <Image source={{ uri: secondPhoto.uri }} style={styles.photoDualImage} resizeMode="cover" />
                ) : (
                  <View style={styles.photoPlaceholderBox}>
                    <Ionicons name="camera-outline" size={24} color="#444444" />
                    <Text style={styles.photoPlaceholderText}>
                      {second ? "Sem foto registrada" : "Aguardando reavaliação"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Clinical / Trainer Notes Comparison */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="document-text-outline" size={17} color="#D90000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Observações e Metas Definidas</Text>
            </View>
          </View>

          <View style={styles.notesDualBox}>
            <View style={styles.noteBlock}>
              <Text style={styles.noteBlockHeader}>Avaliação Anterior ({formatAssessmentDate(first.assessedAt)})</Text>
              <Text style={styles.noteBlockText}>
                {first.conclusion.trainerRecommendations || first.conclusion.definedGoals || first.conclusion.notes || "Sem observações registradas."}
              </Text>
            </View>

            {second && (
              <View style={[styles.noteBlock, { borderTopWidth: 1, borderTopColor: "#222222", paddingTop: 10 }]}>
                <Text style={styles.noteBlockHeader}>Reavaliação ({formatAssessmentDate(second.assessedAt)})</Text>
                <Text style={styles.noteBlockText}>
                  {second.conclusion.trainerRecommendations || second.conclusion.definedGoals || second.conclusion.notes || "Sem observações registradas."}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function KpiCompareTile({
  icon,
  label,
  before,
  after,
  unit,
  invertGoodDirection,
}: {
  icon: IoniconName;
  label: string;
  before?: number;
  after?: number;
  unit: string;
  invertGoodDirection?: boolean;
}) {
  const hasBoth = typeof before === "number" && typeof after === "number";
  const diff = hasBoth ? after! - before! : undefined;

  let deltaColor = "#888888";
  if (typeof diff === "number" && diff !== 0) {
    const isPositiveChange = invertGoodDirection ? diff < 0 : diff > 0;
    deltaColor = isPositiveChange ? "#10B981" : "#F59E0B";
  }

  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiIconBox}>
        <Ionicons name={icon} size={15} color="#D90000" />
      </View>
      <Text style={styles.kpiCardLabel}>{label}</Text>
      <Text style={styles.kpiCardCurrent}>
        {typeof after === "number" ? `${after}${unit ? ` ${unit}` : ""}` : typeof before === "number" ? `${before}${unit ? ` ${unit}` : ""}` : empty}
      </Text>

      {typeof diff === "number" ? (
        <View style={[styles.kpiDeltaBadge, { backgroundColor: `${deltaColor}18`, borderColor: `${deltaColor}35` }]}>
          <Ionicons
            name={diff > 0 ? "trending-up" : diff < 0 ? "trending-down" : "remove"}
            size={11}
            color={deltaColor}
          />
          <Text style={[styles.kpiDeltaText, { color: deltaColor }]}>
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)} {unit}
          </Text>
        </View>
      ) : (
        <Text style={styles.kpiBaselineText}>Ponto de Partida</Text>
      )}
    </View>
  );
}

function CompareRow({
  label,
  icon,
  before,
  after,
  suffix,
}: {
  label: string;
  icon?: IoniconName;
  before?: number;
  after?: number;
  suffix?: string;
}) {
  const hasBoth = typeof before === "number" && typeof after === "number";
  const diff = hasBoth ? after! - before! : undefined;

  return (
    <View style={styles.compareRowItem}>
      <View style={styles.compareRowLeft}>
        {icon && <Ionicons name={icon} size={14} color="#888888" />}
        <Text style={styles.compareRowLabel}>{label}</Text>
      </View>

      <View style={styles.compareRowValues}>
        <Text style={styles.compareValBefore}>
          {typeof before === "number" ? `${before}${suffix ? ` ${suffix}` : ""}` : empty}
        </Text>
        <Ionicons name="arrow-forward" size={11} color="#555555" />
        <Text style={styles.compareValAfter}>
          {typeof after === "number" ? `${after}${suffix ? ` ${suffix}` : ""}` : empty}
        </Text>
        <View style={styles.diffPill}>
          <Text
            style={[
              styles.diffPillText,
              typeof diff === "number" && diff > 0
                ? styles.diffPillPositive
                : typeof diff === "number" && diff < 0
                ? styles.diffPillNegative
                : null,
            ]}
          >
            {typeof diff === "number" ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}` : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: "#0a0a0a",
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
  topBarBtnActive: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.15)",
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  topBarSubtitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  baselineBannerCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
    padding: 14,
    marginBottom: 14,
  },
  baselineBannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  baselineIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  baselineBannerTitle: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
  },
  baselineBannerDesc: {
    color: "#999999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  baselineActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },
  baselineActionPrimary: {
    flex: 1,
    height: 40,
    backgroundColor: "#D90000",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  baselineActionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  baselineActionSecondary: {
    flex: 1,
    height: 40,
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  baselineActionSecondaryText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
  },
  selectorCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 14,
  },
  selectorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  selectorCardTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    flex: 1,
  },
  intervalBadge: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2e2e2e",
  },
  intervalBadgeText: {
    color: "#AAAAAA",
    fontSize: 10.5,
    fontWeight: "800",
  },
  selectorRow: {
    flexDirection: "row",
  },
  selectorCol: {
    flex: 1,
  },
  selectorLabel: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  chipsScroll: {
    flexDirection: "row",
    gap: 6,
  },
  dateSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#161616",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  dateSelectChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  dateSelectChipText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "800",
  },
  dateSelectChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionBullet: {
    width: 3,
    height: 14,
    backgroundColor: "#D90000",
    borderRadius: 2,
  },
  sectionHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    alignItems: "flex-start",
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  kpiCardLabel: {
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  kpiCardCurrent: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  kpiDeltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    marginTop: 6,
  },
  kpiDeltaText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  kpiBaselineText: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#777777",
    fontSize: 11.5,
    marginTop: 1,
  },
  compareRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  compareRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  compareRowLabel: {
    color: "#CCCCCC",
    fontSize: 12.5,
    fontWeight: "800",
  },
  compareRowValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compareValBefore: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "700",
  },
  compareValAfter: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "900",
  },
  diffPill: {
    minWidth: 42,
    alignItems: "flex-end",
  },
  diffPillText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "900",
  },
  diffPillPositive: {
    color: "#10B981",
  },
  diffPillNegative: {
    color: "#3B82F6",
  },
  viewSelectScroll: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  viewSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#161616",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
  },
  viewSelectChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  viewSelectChipText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "800",
  },
  viewSelectChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  photosDualContainer: {
    flexDirection: "row",
    gap: 10,
  },
  photoDualColumn: {
    flex: 1,
  },
  photoDualLabelBox: {
    marginBottom: 6,
  },
  photoDualLabelText: {
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "800",
  },
  photoDualFrame: {
    height: 160,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoDualImage: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholderBox: {
    alignItems: "center",
    gap: 4,
  },
  photoPlaceholderText: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  notesDualBox: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    gap: 8,
  },
  noteBlock: {
    gap: 3,
  },
  noteBlockHeader: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  noteBlockText: {
    color: "#CCCCCC",
    fontSize: 12,
    lineHeight: 17,
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
