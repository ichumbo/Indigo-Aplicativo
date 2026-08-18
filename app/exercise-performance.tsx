import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useCurrentSession } from "@/hooks/use-current-session";
import { DEMO_STUDENT } from "@/services/feedback-store";
import {
  ExercisePerformanceDashboard,
  ExercisePerformanceSummary,
  ExerciseTrendStatus,
  PERFORMANCE_METRIC_LABELS,
  PERFORMANCE_PERIOD_OPTIONS,
  PerformanceMetric,
  PerformancePeriodPreset,
  formatShortDate,
} from "@/services/exercise-performance";
import { useResponsiveLayout } from "@/constants/responsive";
import { getExercisePerformanceDashboard } from "@/services/training-plan-store";

type SortOption = "last" | "name" | "evolution" | "frequency" | "decline";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "last", label: "Ultima execucao" },
  { value: "name", label: "Nome" },
  { value: "evolution", label: "Maior evolucao" },
  { value: "frequency", label: "Frequencia" },
  { value: "decline", label: "Maior queda" },
];

export default function ExercisePerformanceScreen() {
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const [dashboard, setDashboard] = useState<ExercisePerformanceDashboard | null>(null);
  const [periodPreset, setPeriodPreset] = useState<PerformancePeriodPreset>("3m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [query, setQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | "">("");
  const [selectedTrend, setSelectedTrend] = useState<ExerciseTrendStatus | "">("");
  const [onlyPain, setOnlyPain] = useState(false);
  const [onlyRecords, setOnlyRecords] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("last");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [customVisible, setCustomVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (asRefresh = false, preset = periodPreset) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const isStudent = session.user.role === "STUDENT";
      const nextDashboard = await getExercisePerformanceDashboard(
        isStudent ? session.user.id : DEMO_STUDENT.id,
        session.user.id,
        isStudent ? "student" : "trainer",
        preset,
        customStart || undefined,
        customEnd || undefined
      );
      setDashboard(nextDashboard);
    } catch {
      setError("Nao foi possivel carregar a evolucao de desempenho.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customEnd, customStart, periodPreset, session]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const filteredSummaries = useMemo(() => {
    if (!dashboard) return [];
    const normalizedQuery = normalize(query);

    return dashboard.summaries
      .filter((summary) => {
        if (normalizedQuery && !normalize(`${summary.exerciseName} ${summary.equipmentName}`).includes(normalizedQuery)) return false;
        if (selectedSessionId && !summary.sessionIds.includes(selectedSessionId)) return false;
        if (selectedPlanId && summary.planId !== selectedPlanId) return false;
        if (selectedMuscleGroup && summary.muscleGroup !== selectedMuscleGroup) return false;
        if (selectedEquipment && summary.equipmentName !== selectedEquipment) return false;
        if (selectedMetric && !summary.metricsAvailable.includes(selectedMetric)) return false;
        if (selectedTrend && summary.status !== selectedTrend) return false;
        if (onlyPain && !summary.hasPain) return false;
        if (onlyRecords && summary.newRecordCount === 0) return false;
        return true;
      })
      .sort((first, second) => sortSummaries(first, second, sortBy));
  }, [
    dashboard,
    onlyPain,
    onlyRecords,
    query,
    selectedEquipment,
    selectedMetric,
    selectedMuscleGroup,
    selectedPlanId,
    selectedSessionId,
    selectedTrend,
    sortBy,
  ]);

  const clearFilters = () => {
    setQuery("");
    setSelectedSessionId("");
    setSelectedPlanId("");
    setSelectedMuscleGroup("");
    setSelectedEquipment("");
    setSelectedMetric("");
    setSelectedTrend("");
    setOnlyPain(false);
    setOnlyRecords(false);
    setSortBy("last");
  };

  const changePeriod = (preset: PerformancePeriodPreset) => {
    if (preset === "custom") {
      setCustomVisible(true);
      return;
    }
    setPeriodPreset(preset);
    loadDashboard(false, preset);
  };

  const applyCustomPeriod = () => {
    setPeriodPreset("custom");
    setCustomVisible(false);
    loadDashboard(false, "custom");
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/profile");
  };

  const activeFilters = [
    selectedSessionId,
    selectedPlanId,
    selectedMuscleGroup,
    selectedEquipment,
    selectedMetric,
    selectedTrend,
    onlyPain ? "pain" : "",
    onlyRecords ? "records" : "",
  ].filter(Boolean).length;

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando evolucao...</Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={42} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error || "Historico indisponivel."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadDashboard()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <FlatList
        style={styles.list}
        data={filteredSummaries}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: layout.topPadding,
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor="#D90000" />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity style={styles.iconButton} onPress={goBack}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerKicker}>Perfil do aluno</Text>
                <Text style={styles.headerTitle}>Evolucao de desempenho</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={() => setFiltersVisible(true)}>
                <Ionicons name="options-outline" size={21} color="#D90000" />
                {activeFilters > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilters}</Text></View> : null}
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
              {PERFORMANCE_PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.periodChip, periodPreset === option.value && styles.periodChipActive]}
                  onPress={() => changePeriod(option.value)}
                >
                  <Text style={[styles.periodChipText, periodPreset === option.value && styles.periodChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <PerformanceOverview
              dashboard={dashboard}
              filteredCount={filteredSummaries.length}
              activeFilters={activeFilters}
              selectedTrend={selectedTrend}
              onlyPain={onlyPain}
              onlyRecords={onlyRecords}
              onTrend={(trend) => setSelectedTrend((current) => current === trend ? "" : trend)}
              onPain={() => setOnlyPain((current) => !current)}
              onRecords={() => setOnlyRecords((current) => !current)}
              onOpenFilters={() => setFiltersVisible(true)}
            />

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#D90000" />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Pesquisar exercicio"
                  placeholderTextColor="#666"
                />
              </View>
              <TouchableOpacity style={styles.filterButton} onPress={() => setFiltersVisible(true)}>
                <Ionicons name="filter-outline" size={20} color="#D90000" />
              </TouchableOpacity>
            </View>

            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>{filteredSummaries.length} exercicio(s)</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearText}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ExerciseRow
            summary={item}
            periodPreset={periodPreset}
            customStart={customStart}
            customEnd={customEnd}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="bar-chart-outline" size={28} color="#D90000" />
            <Text style={styles.emptyTitle}>Sem resultados no periodo</Text>
            <Text style={styles.emptyText}>Ajuste os filtros ou selecione Tudo para consultar o historico completo.</Text>
          </View>
        }
      />

      <FiltersModal
        visible={filtersVisible}
        dashboard={dashboard}
        selectedSessionId={selectedSessionId}
        selectedPlanId={selectedPlanId}
        selectedMuscleGroup={selectedMuscleGroup}
        selectedEquipment={selectedEquipment}
        selectedMetric={selectedMetric}
        selectedTrend={selectedTrend}
        onlyPain={onlyPain}
        onlyRecords={onlyRecords}
        sortBy={sortBy}
        onClose={() => setFiltersVisible(false)}
        onClear={clearFilters}
        onSession={setSelectedSessionId}
        onPlan={setSelectedPlanId}
        onMuscle={setSelectedMuscleGroup}
        onEquipment={setSelectedEquipment}
        onMetric={setSelectedMetric}
        onTrend={setSelectedTrend}
        onPain={setOnlyPain}
        onRecords={setOnlyRecords}
        onSort={setSortBy}
      />

      <Modal visible={customVisible} transparent animationType="fade" onRequestClose={() => setCustomVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.customSheet}>
            <Text style={styles.modalTitle}>Periodo personalizado</Text>
            <FormInput label="Inicio" value={customStart} placeholder="AAAA-MM-DD" onChangeText={setCustomStart} />
            <FormInput label="Fim" value={customEnd} placeholder="AAAA-MM-DD" onChangeText={setCustomEnd} />
            <TouchableOpacity style={styles.primaryWideButton} onPress={applyCustomPeriod}>
              <Text style={styles.primaryWideText}>Aplicar periodo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryWideButton} onPress={() => setCustomVisible(false)}>
              <Text style={styles.secondaryWideText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ExerciseRow({
  summary,
  periodPreset,
  customStart,
  customEnd,
}: {
  summary: ExercisePerformanceSummary;
  periodPreset: PerformancePeriodPreset;
  customStart: string;
  customEnd: string;
}) {
  const openDetail = () => {
    router.push({
      pathname: "/exercise-performance-detail" as never,
      params: {
        exerciseKey: summary.id,
        period: periodPreset,
        customStart,
        customEnd,
      },
    });
  };

  return (
    <TouchableOpacity style={styles.exerciseCard} onPress={openDetail}>
      <View style={styles.exerciseTop}>
        <View style={styles.exerciseTitleBlock}>
          <Text style={styles.exerciseName}>{summary.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>
            {summary.equipmentName} • {summary.muscleGroup}
          </Text>
        </View>
        <View style={[styles.statusPill, getToneStyle(summary.statusTone)]}>
          <Text style={[styles.statusText, summary.statusTone === "danger" && styles.statusTextDanger]}>
            {summary.statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.exerciseMiddle}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>{summary.primaryMetricLabel}</Text>
          <Text style={styles.metricValue}>{summary.primaryMetricDisplay}</Text>
          <Text style={styles.metricSub}>{summary.variationLabel}</Text>
        </View>
        <MiniTrend summary={summary} />
      </View>

      <View style={styles.exerciseFooter}>
        <Text style={styles.footerText}>
          {summary.lastDate ? `Ultima ${formatShortDate(summary.lastDate)}` : "Sem execucao registrada"}
        </Text>
        <Text style={styles.footerText}>{summary.lastBestSetLabel}</Text>
      </View>

      <View style={styles.badgeRow}>
        {summary.hasPain ? <SmallBadge icon="alert-circle-outline" label="Dor" danger /> : null}
        {summary.hasObservation ? <SmallBadge icon="document-text-outline" label="Obs." /> : null}
        {summary.newRecordCount > 0 ? <SmallBadge icon="trophy-outline" label={`${summary.newRecordCount} recorde(s)`} /> : null}
        {summary.dataQuality === "insufficient" ? <SmallBadge icon="information-circle-outline" label="Dados insuficientes" /> : null}
      </View>
    </TouchableOpacity>
  );
}

function MiniTrend({ summary }: { summary: ExercisePerformanceSummary }) {
  const values = summary.points
    .slice(-8)
    .map((point) => point.values[summary.preferredMetric])
    .filter((value): value is number => typeof value === "number");
  const max = Math.max(...values, 1);

  if (values.length < 2) {
    return (
      <View style={styles.miniTrendEmpty}>
        <Text style={styles.miniTrendEmptyText}>Grafico apos 2 pontos</Text>
      </View>
    );
  }

  return (
    <View style={styles.miniTrend}>
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.miniBarWrap}>
          <View style={[styles.miniBar, { height: Math.max(8, Math.round((value / max) * 48)) }]} />
        </View>
      ))}
    </View>
  );
}

function PerformanceOverview({
  dashboard,
  filteredCount,
  activeFilters,
  selectedTrend,
  onlyPain,
  onlyRecords,
  onTrend,
  onPain,
  onRecords,
  onOpenFilters,
}: {
  dashboard: ExercisePerformanceDashboard;
  filteredCount: number;
  activeFilters: number;
  selectedTrend: ExerciseTrendStatus | "";
  onlyPain: boolean;
  onlyRecords: boolean;
  onTrend: (trend: ExerciseTrendStatus) => void;
  onPain: () => void;
  onRecords: () => void;
  onOpenFilters: () => void;
}) {
  const totals = dashboard.totals;
  const actionCount = totals.declining + totals.withPain + totals.insufficient + totals.notPerformed;

  return (
    <View style={styles.overviewPanel}>
      <View style={styles.overviewHeader}>
        <View style={styles.overviewHeaderTitle}>
          <View style={styles.overviewHeaderIcon}>
            <Ionicons name="analytics-outline" size={19} color="#D90000" />
          </View>
          <View style={styles.overviewHeaderText}>
            <Text style={styles.overviewTitle}>Painel de evolucao</Text>
            <Text style={styles.overviewSubtitle}>{filteredCount} exercicio(s) no recorte atual</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.overviewFilterButton} onPress={onOpenFilters}>
          <Ionicons name="options-outline" size={17} color="#D90000" />
          {activeFilters > 0 ? <Text style={styles.overviewFilterText}>{activeFilters}</Text> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.overviewTopGrid}>
        <View style={styles.overviewInfoCard}>
          <Text style={styles.overviewInfoLabel}>Periodo</Text>
          <Text style={styles.overviewInfoValue}>{dashboard.period.label}</Text>
          <Text style={styles.overviewInfoHint}>Historico analisado</Text>
        </View>

        <View style={styles.overviewInfoCard}>
          <View style={styles.consistencyRow}>
            <Text style={styles.overviewInfoLabel}>Consistencia</Text>
            <Text style={styles.overviewPercent}>{totals.consistencyPercent}%</Text>
          </View>
          <View style={styles.consistencyTrack}>
            <View style={[styles.consistencyFill, { width: `${Math.max(4, Math.min(100, totals.consistencyPercent))}%` }]} />
          </View>
          <Text style={styles.overviewInfoHint}>Registros comparaveis</Text>
        </View>
      </View>

      <View style={styles.actionSummary}>
        <View>
          <Text style={styles.actionSummaryTitle}>Indicadores acionaveis</Text>
          <Text style={styles.actionSummaryText}>
            {actionCount ? `${actionCount} ${actionCount === 1 ? "item pede" : "itens pedem"} revisao` : "Sem alertas relevantes no periodo"}
          </Text>
        </View>
      </View>

      <View style={styles.overviewActionGrid}>
        <OverviewMetricCard
          icon="trending-down-outline"
          label="Em queda"
          detail="Priorizar ajuste"
          value={totals.declining}
          danger
          active={selectedTrend === "declining"}
          onPress={() => onTrend("declining")}
        />
        <OverviewMetricCard
          icon="alert-circle-outline"
          label="Com dor"
          detail="Revisar seguranca"
          value={totals.withPain}
          danger
          active={onlyPain}
          onPress={onPain}
        />
        <OverviewMetricCard
          icon="trophy-outline"
          label="Recordes"
          detail="Evolucao recente"
          value={totals.newRecords}
          active={onlyRecords}
          onPress={onRecords}
        />
        <OverviewMetricCard
          icon="information-circle-outline"
          label="Insuficientes"
          detail="Faltam dados"
          value={totals.insufficient}
          active={selectedTrend === "insufficient"}
          onPress={() => onTrend("insufficient")}
        />
      </View>

      <View style={styles.overviewChipRow}>
        <OverviewMiniChip label="Evoluindo" value={totals.evolving} active={selectedTrend === "evolving"} onPress={() => onTrend("evolving")} />
        <OverviewMiniChip label="Estaveis" value={totals.stable} active={selectedTrend === "stable"} onPress={() => onTrend("stable")} />
        <OverviewMiniChip label="Retomando" value={totals.returning} active={selectedTrend === "returning"} onPress={() => onTrend("returning")} />
        <OverviewMiniChip label="Nao realizados" value={totals.notPerformed} active={selectedTrend === "not_recent"} onPress={() => onTrend("not_recent")} />
      </View>
    </View>
  );
}

function OverviewMetricCard({
  icon,
  label,
  detail,
  value,
  danger,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  value: number;
  danger?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.overviewMetricCard, danger && styles.overviewMetricCardDanger, active && styles.overviewMetricCardActive]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={[styles.overviewMetricIcon, danger && styles.overviewMetricIconDanger]}>
        <Ionicons name={icon} size={17} color={danger ? "#ff4444" : "#D90000"} />
      </View>
      <Text style={[styles.overviewMetricValue, danger && styles.overviewMetricValueDanger]}>{value}</Text>
      <Text style={styles.overviewMetricLabel}>{label}</Text>
      <Text style={styles.overviewMetricDetail}>{detail}</Text>
    </TouchableOpacity>
  );
}

function OverviewMiniChip({ label, value, active, onPress }: { label: string; value: number; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.overviewMiniChip, active && styles.overviewMiniChipActive]} onPress={onPress} activeOpacity={0.86}>
      <Text style={[styles.overviewMiniValue, active && styles.overviewMiniValueActive]}>{value}</Text>
      <Text style={[styles.overviewMiniLabel, active && styles.overviewMiniLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SmallBadge({ icon, label, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean }) {
  return (
    <View style={[styles.smallBadge, danger && styles.smallBadgeDanger]}>
      <Ionicons name={icon} size={13} color={danger ? "#ff4444" : "#D90000"} />
      <Text style={[styles.smallBadgeText, danger && styles.smallBadgeTextDanger]}>{label}</Text>
    </View>
  );
}

function FiltersModal({
  visible,
  dashboard,
  selectedSessionId,
  selectedPlanId,
  selectedMuscleGroup,
  selectedEquipment,
  selectedMetric,
  selectedTrend,
  onlyPain,
  onlyRecords,
  sortBy,
  onClose,
  onClear,
  onSession,
  onPlan,
  onMuscle,
  onEquipment,
  onMetric,
  onTrend,
  onPain,
  onRecords,
  onSort,
}: {
  visible: boolean;
  dashboard: ExercisePerformanceDashboard;
  selectedSessionId: string;
  selectedPlanId: string;
  selectedMuscleGroup: string;
  selectedEquipment: string;
  selectedMetric: PerformanceMetric | "";
  selectedTrend: ExerciseTrendStatus | "";
  onlyPain: boolean;
  onlyRecords: boolean;
  sortBy: SortOption;
  onClose: () => void;
  onClear: () => void;
  onSession: (value: string) => void;
  onPlan: (value: string) => void;
  onMuscle: (value: string) => void;
  onEquipment: (value: string) => void;
  onMetric: (value: PerformanceMetric | "") => void;
  onTrend: (value: ExerciseTrendStatus | "") => void;
  onPain: (value: boolean) => void;
  onRecords: (value: boolean) => void;
  onSort: (value: SortOption) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterSheet}>
          <View style={styles.filterHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <FilterGroup title="Sessao">
              <FilterChip label="Todas" active={!selectedSessionId} onPress={() => onSession("")} />
              {dashboard.filters.sessions.map((session) => (
                <FilterChip key={session.id} label={session.name} active={selectedSessionId === session.id} onPress={() => onSession(session.id)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Plano">
              <FilterChip label="Todos" active={!selectedPlanId} onPress={() => onPlan("")} />
              {dashboard.filters.plans.map((plan) => (
                <FilterChip key={plan.id} label={plan.name} active={selectedPlanId === plan.id} onPress={() => onPlan(plan.id)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Grupo muscular">
              <FilterChip label="Todos" active={!selectedMuscleGroup} onPress={() => onMuscle("")} />
              {dashboard.filters.muscleGroups.map((group) => (
                <FilterChip key={group} label={group} active={selectedMuscleGroup === group} onPress={() => onMuscle(group)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Equipamento">
              <FilterChip label="Todos" active={!selectedEquipment} onPress={() => onEquipment("")} />
              {dashboard.filters.equipments.map((equipment) => (
                <FilterChip key={equipment} label={equipment} active={selectedEquipment === equipment} onPress={() => onEquipment(equipment)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Tipo de metrica">
              <FilterChip label="Todas" active={!selectedMetric} onPress={() => onMetric("")} />
              {dashboard.filters.metrics.map((metric) => (
                <FilterChip
                  key={metric}
                  label={PERFORMANCE_METRIC_LABELS[metric]}
                  active={selectedMetric === metric}
                  onPress={() => onMetric(metric)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Tendencia">
              <FilterChip label="Todas" active={!selectedTrend} onPress={() => onTrend("")} />
              {dashboard.filters.trends.map((trend) => (
                <FilterChip key={trend} label={trendLabel(trend)} active={selectedTrend === trend} onPress={() => onTrend(trend)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Marcadores">
              <FilterChip label="Com dor" active={onlyPain} onPress={() => onPain(!onlyPain)} />
              <FilterChip label="Com recorde" active={onlyRecords} onPress={() => onRecords(!onlyRecords)} />
            </FilterGroup>

            <FilterGroup title="Ordenar por">
              {SORT_OPTIONS.map((option) => (
                <FilterChip key={option.value} label={option.label} active={sortBy === option.value} onPress={() => onSort(option.value)} />
              ))}
            </FilterGroup>
          </ScrollView>
          <TouchableOpacity style={styles.secondaryWideButton} onPress={onClear}>
            <Text style={styles.secondaryWideText}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupTitle}>{title}</Text>
      <View style={styles.filterWrap}>{children}</View>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FormInput({ label, value, placeholder, onChangeText }: { label: string; value: string; placeholder: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput style={styles.formInput} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#666" />
    </View>
  );
}

function sortSummaries(first: ExercisePerformanceSummary, second: ExercisePerformanceSummary, sortBy: SortOption) {
  if (sortBy === "name") return first.exerciseName.localeCompare(second.exerciseName);
  if (sortBy === "evolution") return (second.variationPercent ?? -999) - (first.variationPercent ?? -999);
  if (sortBy === "frequency") return second.executionCount - first.executionCount;
  if (sortBy === "decline") return (first.variationPercent ?? 999) - (second.variationPercent ?? 999);
  return new Date(second.lastDate ?? 0).getTime() - new Date(first.lastDate ?? 0).getTime();
}

function trendLabel(status: ExerciseTrendStatus) {
  const labels: Record<ExerciseTrendStatus, string> = {
    evolving: "Evoluindo",
    stable: "Estavel",
    declining: "Em queda",
    returning: "Retomando",
    new: "Novo",
    insufficient: "Insuficiente",
    not_recent: "Sem execucao recente",
    unavailable: "Indisponivel",
  };
  return labels[status];
}

function getToneStyle(tone: ExercisePerformanceSummary["statusTone"]) {
  if (tone === "danger") return styles.statusDanger;
  if (tone === "warning") return styles.statusWarning;
  if (tone === "primary") return styles.statusPrimary;
  return styles.statusNeutral;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  list: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  listContent: {
    width: "100%",
    alignSelf: "center",
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
    marginBottom: 18,
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
    position: "relative",
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
  filterBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  periodScroll: {
    marginBottom: 12,
  },
  periodChip: {
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  periodChipActive: {
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderColor: "#D90000",
  },
  periodChipText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
  },
  periodChipTextActive: {
    color: "#D90000",
  },
  overviewPanel: {
    backgroundColor: "#151515",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#292929",
    padding: 14,
    marginBottom: 14,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  overviewHeaderTitle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  overviewHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  overviewHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  overviewTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  overviewSubtitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  overviewFilterButton: {
    minWidth: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 9,
  },
  overviewFilterText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  overviewTopGrid: {
    flexDirection: "row",
    gap: 10,
  },
  overviewInfoCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 14,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    justifyContent: "space-between",
  },
  overviewInfoLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "900",
  },
  overviewInfoValue: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  overviewInfoHint: {
    color: "#777",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
  consistencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  overviewPercent: {
    color: "#D90000",
    fontSize: 21,
    fontWeight: "900",
  },
  consistencyTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#292929",
    overflow: "hidden",
    marginTop: 12,
  },
  consistencyFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#D90000",
  },
  actionSummary: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  actionSummaryTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  actionSummaryText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  overviewActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  overviewMetricCard: {
    width: "48.5%",
    minHeight: 128,
    borderRadius: 14,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    justifyContent: "space-between",
  },
  overviewMetricCardActive: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.12)",
  },
  overviewMetricCardDanger: {
    borderColor: "rgba(255, 68, 68, 0.24)",
  },
  overviewMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  overviewMetricIconDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.12)",
  },
  overviewMetricValue: {
    color: "#D90000",
    fontSize: 24,
    fontWeight: "900",
  },
  overviewMetricValueDanger: {
    color: "#ff4444",
  },
  overviewMetricLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  overviewMetricDetail: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  overviewChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  overviewMiniChip: {
    minHeight: 36,
    borderRadius: 11,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#242424",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  overviewMiniChipActive: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.12)",
  },
  overviewMiniValue: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  overviewMiniValueActive: {
    color: "#fff",
  },
  overviewMiniLabel: {
    color: "#999",
    fontSize: 11,
    fontWeight: "900",
  },
  overviewMiniLabelActive: {
    color: "#fff",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#1c1c1c",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  clearText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  exerciseCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 15,
    marginBottom: 12,
  },
  exerciseTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  exerciseTitleBlock: {
    flex: 1,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  exerciseMeta: {
    color: "#999",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
    lineHeight: 17,
  },
  statusPill: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    maxWidth: 124,
  },
  statusPrimary: {
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderColor: "rgba(217, 0, 0, 0.35)",
  },
  statusNeutral: {
    backgroundColor: "#242424",
    borderColor: "#333",
  },
  statusWarning: {
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderColor: "#D90000",
  },
  statusDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.12)",
    borderColor: "rgba(255, 68, 68, 0.35)",
  },
  statusText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  statusTextDanger: {
    color: "#ff4444",
  },
  exerciseMiddle: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    marginTop: 14,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  metricValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  metricSub: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  miniTrend: {
    width: 96,
    height: 58,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 4,
  },
  miniBarWrap: {
    width: 7,
    height: 52,
    justifyContent: "flex-end",
  },
  miniBar: {
    width: 7,
    borderRadius: 4,
    backgroundColor: "#D90000",
  },
  miniTrendEmpty: {
    width: 96,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  miniTrendEmptyText: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  exerciseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
  },
  footerText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  smallBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 9,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.22)",
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  smallBadgeDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderColor: "rgba(255, 68, 68, 0.25)",
  },
  smallBadgeText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  smallBadgeTextDanger: {
    color: "#ff4444",
  },
  emptyCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    padding: 22,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#999",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
    padding: 20,
  },
  filterSheet: {
    maxHeight: "86%",
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
  },
  customSheet: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
  },
  filterHeader: {
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
  filterGroup: {
    marginTop: 14,
  },
  filterGroupTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#242424",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.14)",
  },
  filterChipText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: "#D90000",
  },
  formField: {
    marginTop: 14,
  },
  formLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  formInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#242424",
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
  },
  primaryWideButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryWideText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryWideButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryWideText: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "900",
  },
});
