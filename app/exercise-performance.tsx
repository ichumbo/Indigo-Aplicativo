import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { DEMO_STUDENT } from "@/services/feedback-store";
import {
  ExercisePerformanceDashboard,
  ExercisePerformanceSummary,
  ExerciseTrendStatus,
  PerformancePeriodPreset,
  formatShortDate,
} from "@/services/exercise-performance";
import { getExercisePerformanceDashboard } from "@/services/training-plan-store";

// Design Tokens - DragonCorp Crimson Red Visual Identity
const BG_DARK = "#0f0f0f";
const CARD_BG = "#181818";
const CARD_SOFT = "#222222";
const BORDER_COLOR = "#2a2a2a";
const ACCENT_RED = "#D90000";
const TEXT_WHITE = "#ffffff";
const TEXT_MUTED = "#9a9a9a";
const TEXT_SUBTLE = "#666666";
const GREEN_TEXT = "#2ecc71";
const GREEN_BG = "#103322";
const GREY_BADGE_BG = "#262626";
const GREY_BADGE_TEXT = "#a0a0a0";
const RED_BADGE_BG = "#381515";
const RED_BADGE_TEXT = "#ff4d4d";

type PerformanceCardItem = {
  id: string;
  name: string;
  category: string;
  lastInfo: string; // Ex: "últ.: 35 × 8 a 10 · 13/08"
  status: "evolving" | "stable" | "declining" | "bodyweight";
  badgeLabel: string; // Ex: "+5 kg", "estável", "—", "-2 kg"
  trendType: "ascending" | "flat" | "descending" | "none";
};

const PERIOD_TABS: { id: PerformancePeriodPreset; label: string }[] = [
  { id: "4w", label: "4 sem" },
  { id: "3m", label: "3 meses" },
  { id: "6m", label: "6 meses" },
  { id: "all", label: "Tudo" },
];

// Mock realista completo baseado nas referências fornecidas
const DEFAULT_EXERCISES_PERFORMANCE: PerformanceCardItem[] = [
  {
    id: "pigeon-stretch",
    name: "Pigeon Strech",
    category: "Mobilidade",
    lastInfo: "últ.: — × 20 a 30 segundos cada lado · 13/08",
    status: "bodyweight",
    badgeLabel: "—",
    trendType: "none",
  },
  {
    id: "extensora-unilateral",
    name: "Cadeira Extensora Unilateral",
    category: "Membros Inferiores",
    lastInfo: "últ.: 35 × 8 a 10 · 13/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "leg-press",
    name: "Leg Press",
    category: "Membros Inferiores",
    lastInfo: "últ.: 60 × 8 a 10 · 13/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "mesa-flexora",
    name: "Mesa Flexora",
    category: "Membros Inferiores",
    lastInfo: "últ.: 25 × 8 a 10 · 13/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "cadeira-flexora",
    name: "Cadeira Flexora",
    category: "Membros Inferiores",
    lastInfo: "últ.: 60 × 8 a 10 · 13/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "panturrilha-pe",
    name: "Panturrilha em pé no aparelho",
    category: "Membros Inferiores",
    lastInfo: "últ.: 60 × 10 a 12 · 13/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "elevacao-pelvica",
    name: "Elevação Pélvica Máquina",
    category: "Glúteos",
    lastInfo: "últ.: 40 × 8 a 10 · 13/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "mobilidade-toracica",
    name: "Mobilidade Torácica No Banco",
    category: "Mobilidade",
    lastInfo: "últ.: — × 5 · 11/08",
    status: "bodyweight",
    badgeLabel: "—",
    trendType: "none",
  },
  {
    id: "pullover-maquina",
    name: "Pullover Máquina Pegada Supi...",
    category: "Costas",
    lastInfo: "últ.: 22,5kg × 8 a 10 · 11/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "biceps-banco-45",
    name: "Bíceps No Banco 45º",
    category: "Braços",
    lastInfo: "últ.: 12kg × 8 a 10 · 11/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "puxada-aberta",
    name: "Puxada Aberta Pulley",
    category: "Costas",
    lastInfo: "últ.: 50kg × 8 a 10 · 11/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "extensao-tronco",
    name: "Extensão De Tronco Banco Romano",
    category: "Costas",
    lastInfo: "últ.: — × 10 a 12 · 11/08",
    status: "bodyweight",
    badgeLabel: "—",
    trendType: "none",
  },
  {
    id: "remada-pronada",
    name: "Remada Pronada Máquina",
    category: "Costas",
    lastInfo: "últ.: 65kg × 8 a 10 · 11/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "crucifixo-inverso",
    name: "Crucifixo Inverso Máquina",
    category: "Ombros",
    lastInfo: "últ.: 37,5kg × 8 a 10 · 11/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "triceps-testa-corda",
    name: "Tríceps Testa Com Corda",
    category: "Braços",
    lastInfo: "últ.: 35kg × 8 a 10 · 10/08",
    status: "evolving",
    badgeLabel: "+5 kg",
    trendType: "ascending",
  },
  {
    id: "along-peitoral",
    name: "Alongamento Peitoral No Espaldar",
    category: "Mobilidade",
    lastInfo: "últ.: — × 20-30 segundos cada lado · 10/08",
    status: "bodyweight",
    badgeLabel: "—",
    trendType: "none",
  },
  {
    id: "voador-maquina",
    name: "Voador (Crucifixo na Máquina)",
    category: "Peito",
    lastInfo: "últ.: 40kg × 8 a 10 · 10/08",
    status: "stable",
    badgeLabel: "estável",
    trendType: "flat",
  },
  {
    id: "rotacao-externa-ombro",
    name: "Rotação Externa de Ombro na Polia (Manguito...)",
    category: "Ombros",
    lastInfo: "últ.: — × 12 a 15 cada lado · 10/08",
    status: "bodyweight",
    badgeLabel: "—",
    trendType: "none",
  },
  {
    id: "supino-inclinado-maquina",
    name: "Supino Inclinado na Máquina",
    category: "Peito",
    lastInfo: "últ.: 22,5kg × 8 a 10 · 10/08",
    status: "evolving",
    badgeLabel: "+2,5 kg",
    trendType: "ascending",
  },
  {
    id: "elevacao-lateral-pe",
    name: "Elevação Lateral Máquina Em Pé",
    category: "Ombros",
    lastInfo: "últ.: 30kg × 8 a 10 · 10/08",
    status: "evolving",
    badgeLabel: "+5 kg",
    trendType: "ascending",
  },
  {
    id: "crucifixo-peitoral-inferior",
    name: "Crucifixo Máquina Peitoral Infe...",
    category: "Peito",
    lastInfo: "últ.: 60kg × 8 a 10 · 10/08",
    status: "evolving",
    badgeLabel: "+10 kg",
    trendType: "ascending",
  },
  {
    id: "desenvolvimento-aberto",
    name: "Desenvolvimento Aberto Máquina",
    category: "Ombros",
    lastInfo: "últ.: 30kg × 8 a 10 · 10/08",
    status: "evolving",
    badgeLabel: "+5 kg",
    trendType: "ascending",
  },
];

export default function ExercisePerformanceScreen() {
  const params = useLocalSearchParams<{
    studentId?: string;
    studentName?: string;
    studentAvatar?: string;
  }>();

  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const studentName = params.studentName || "Charles Nóbrega";
  const studentAvatar =
    params.studentAvatar ||
    session?.user.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  const [periodPreset, setPeriodPreset] = useState<PerformancePeriodPreset>("3m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "evolving" | "stable" | "declining">("all");

  const [dashboard, setDashboard] = useState<ExercisePerformanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de Calendário (Screenshot 4)
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedRangeStart, setSelectedRangeStart] = useState<string>("2026-08-01");
  const [selectedRangeEnd, setSelectedRangeEnd] = useState<string>("2026-08-31");

  const loadDashboard = useCallback(
    async (asRefresh = false, preset = periodPreset) => {
      if (!session) return;
      if (asRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const isStudent = session.user.role === "STUDENT";
        const targetId = params.studentId || (isStudent ? session.user.id : DEMO_STUDENT.id);
        const nextDashboard = await getExercisePerformanceDashboard(
          targetId,
          session.user.id,
          isStudent ? "student" : "trainer",
          preset,
          customStart || undefined,
          customEnd || undefined
        );
        setDashboard(nextDashboard);
      } catch (error) {
        console.warn("Usando catálogo de demonstração para exibição de performance:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [customEnd, customStart, params.studentId, periodPreset, session]
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  // Transforma summaries reais em lista de cards ou usa mock enriquecido
  const exerciseList = useMemo(() => {
    if (dashboard && dashboard.summaries.length > 0) {
      return dashboard.summaries.map((s): PerformanceCardItem => {
        let status: PerformanceCardItem["status"] = "stable";
        let badgeLabel = "estável";
        let trendType: PerformanceCardItem["trendType"] = "flat";

        if (s.status === "evolving") {
          status = "evolving";
          trendType = "ascending";
          badgeLabel = s.variationAbsolute ? `+${s.variationAbsolute} kg` : "+5 kg";
        } else if (s.status === "declining") {
          status = "declining";
          trendType = "descending";
          badgeLabel = s.variationAbsolute ? `${s.variationAbsolute} kg` : "queda";
        } else if (s.loadUnit === "none" || !s.primaryMetricValue) {
          status = "bodyweight";
          badgeLabel = "—";
          trendType = "none";
        }

        return {
          id: s.id,
          name: s.exerciseName,
          category: s.muscleGroup,
          lastInfo: s.lastBestSetLabel || (s.lastDate ? `últ.: ${formatShortDate(s.lastDate)}` : "últ.: sem registro"),
          status,
          badgeLabel,
          trendType,
        };
      });
    }

    return DEFAULT_EXERCISES_PERFORMANCE;
  }, [dashboard]);

  // Contagens para os KPIs
  const evolvingCount = useMemo(() => exerciseList.filter((e) => e.status === "evolving").length, [exerciseList]);
  const stableCount = useMemo(() => exerciseList.filter((e) => e.status === "stable" || e.status === "bodyweight").length, [exerciseList]);
  const decliningCount = useMemo(() => exerciseList.filter((e) => e.status === "declining").length, [exerciseList]);

  // Filtragem por busca e por status clicado no KPI
  const filteredExercises = useMemo(() => {
    return exerciseList.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!item.name.toLowerCase().includes(query) && !item.category.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (statusFilter === "evolving" && item.status !== "evolving") return false;
      if (statusFilter === "stable" && item.status !== "stable" && item.status !== "bodyweight") return false;
      if (statusFilter === "declining" && item.status !== "declining") return false;

      return true;
    });
  }, [exerciseList, searchQuery, statusFilter]);

  const handleSelectPeriod = (preset: PerformancePeriodPreset) => {
    setPeriodPreset(preset);
    setCustomStart("");
    setCustomEnd("");
    loadDashboard(false, preset);
  };

  const handleApplyCalendarInterval = () => {
    setCustomStart(selectedRangeStart);
    setCustomEnd(selectedRangeEnd);
    setPeriodPreset("custom");
    setShowCalendarModal(false);
    loadDashboard(false, "custom");
  };

  const handleOpenExerciseDetail = (exercise: PerformanceCardItem) => {
    router.push({
      pathname: "/exercise-performance-detail",
      params: {
        exerciseKey: exercise.id,
        exerciseName: exercise.name,
        exerciseCategory: exercise.category,
        lastInfo: exercise.lastInfo,
        badgeLabel: exercise.badgeLabel,
        status: exercise.status,
        studentName,
        studentAvatar,
        period: periodPreset,
        customStart,
        customEnd,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* TOP BAR / CABEÇALHO */}
      <View style={[styles.topBar, { borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        {/* ALUNO: AVATAR + NOME */}
        <View style={styles.studentHeaderInfo}>
          <Image source={{ uri: studentAvatar }} style={styles.studentAvatar} />
          <Text style={[styles.studentNameTitle, { color: theme.text }]} numberOfLines={1}>
            {studentName}
          </Text>
        </View>

        {/* BOTÃO FILTRO / CALENDÁRIO */}
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => setShowCalendarModal(true)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="filter" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor={ACCENT_RED}
          />
        }
        ListHeaderComponent={
          <View>
            {/* TÍTULO DE SEÇÃO */}
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Evolução de Cargas</Text>

            {/* ABAS DE PERÍODO (4 SEM | 3 MESES | 6 MESES | TUDO) */}
            <View style={[styles.periodTabsContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
              {PERIOD_TABS.map((tab) => {
                const isActive = periodPreset === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.periodTab, isActive && styles.periodTabActive]}
                    onPress={() => handleSelectPeriod(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodTabText, { color: theme.textSecondary }, isActive && styles.periodTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* BANNER DE KPIS (EM EVOLUÇÃO | ESTÁVEIS | EM QUEDA) */}
            <View style={[styles.kpiBanner, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={[styles.kpiColumn, statusFilter === "evolving" && styles.kpiColumnActive]}
                onPress={() => setStatusFilter((prev) => (prev === "evolving" ? "all" : "evolving"))}
                activeOpacity={0.75}
              >
                <View style={styles.kpiTitleRow}>
                  <View style={[styles.kpiDot, { backgroundColor: "#2ecc71" }]} />
                  <Text style={[styles.kpiNumber, { color: theme.text }]}>{evolvingCount}</Text>
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>EM EVOLUÇÃO</Text>
              </TouchableOpacity>

              <View style={[styles.kpiDivider, { backgroundColor: theme.divider }]} />

              <TouchableOpacity
                style={[styles.kpiColumn, statusFilter === "stable" && styles.kpiColumnActive]}
                onPress={() => setStatusFilter((prev) => (prev === "stable" ? "all" : "stable"))}
                activeOpacity={0.75}
              >
                <View style={styles.kpiTitleRow}>
                  <View style={[styles.kpiDot, { backgroundColor: "#9a9a9a" }]} />
                  <Text style={[styles.kpiNumber, { color: theme.text }]}>{stableCount}</Text>
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>ESTÁVEIS</Text>
              </TouchableOpacity>

              <View style={[styles.kpiDivider, { backgroundColor: theme.divider }]} />

              <TouchableOpacity
                style={[styles.kpiColumn, statusFilter === "declining" && styles.kpiColumnActive]}
                onPress={() => setStatusFilter((prev) => (prev === "declining" ? "all" : "declining"))}
                activeOpacity={0.75}
              >
                <View style={styles.kpiTitleRow}>
                  <View style={[styles.kpiDot, { backgroundColor: "#ff4d4d" }]} />
                  <Text style={[styles.kpiNumber, { color: theme.text }]}>{decliningCount}</Text>
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>EM QUEDA</Text>
              </TouchableOpacity>
            </View>

            {/* CAMPO DE BUSCA */}
            <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar exercício"
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              style={[styles.exerciseCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => handleOpenExerciseDetail(item)}
              activeOpacity={0.75}
            >
              {/* LADO ESQUERDO: NOME E ÚLTIMA EXECUÇÃO */}
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.exerciseLastInfo, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.lastInfo}
                </Text>
              </View>

              {/* LADO DIREITO: SPARKLINE + BADGE */}
              <View style={styles.exerciseRightAction}>
                {/* SPARKLINE GRÁFICO SVG */}
                {item.trendType === "ascending" && (
                  <View style={styles.sparklineWrap}>
                    <Svg width={56} height={20}>
                      {/* Linha ascendente com pontos */}
                      <Path
                        d="M 4 16 L 20 16 L 36 10 L 50 4"
                        stroke={ACCENT_RED}
                        strokeWidth={2.2}
                        fill="none"
                      />
                      <Circle cx={4} cy={16} r={2} fill={ACCENT_RED} />
                      <Circle cx={20} cy={16} r={2} fill={ACCENT_RED} />
                      <Circle cx={36} cy={10} r={2} fill={ACCENT_RED} />
                      <Circle cx={50} cy={4} r={2.5} fill={ACCENT_RED} />
                    </Svg>
                  </View>
                )}

                {item.trendType === "flat" && (
                  <View style={styles.sparklineWrap}>
                    <Svg width={56} height={20}>
                      {/* Linha plana com pontos */}
                      <Line x1={4} y1={10} x2={50} y2={10} stroke={ACCENT_RED} strokeWidth={2.2} />
                      <Circle cx={4} cy={10} r={2} fill={ACCENT_RED} />
                      <Circle cx={18} cy={10} r={2} fill={ACCENT_RED} />
                      <Circle cx={34} cy={10} r={2} fill={ACCENT_RED} />
                      <Circle cx={50} cy={10} r={2.5} fill={ACCENT_RED} />
                    </Svg>
                  </View>
                )}

                {/* BADGE DE STATUS */}
                <View
                  style={[
                    styles.statusBadge,
                    item.status === "evolving" && { backgroundColor: theme.badgeSuccess },
                    item.status === "stable" && { backgroundColor: theme.badgeNeutral, borderColor: theme.badgeNeutralBorder, borderWidth: 1 },
                    item.status === "bodyweight" && { backgroundColor: theme.badgeNeutral, borderColor: theme.badgeNeutralBorder, borderWidth: 1 },
                    item.status === "declining" && { backgroundColor: theme.badgeError },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.status === "evolving" && { color: theme.badgeSuccessText, fontWeight: "800" },
                      item.status === "stable" && { color: theme.badgeNeutralText, fontWeight: "700" },
                      item.status === "bodyweight" && { color: theme.badgeNeutralText, fontWeight: "800" },
                      item.status === "declining" && { color: theme.badgeErrorText, fontWeight: "800" },
                    ]}
                  >
                    {item.badgeLabel}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={44} color={TEXT_SUBTLE} />
            <Text style={styles.emptyTitle}>Nenhum exercício encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Tente buscar por outro nome ou remover o filtro de período.
            </Text>
          </View>
        }
      />

      {/* MODAL: SELECIONE O INTERVALO (SCREENSHOT 4) */}
      <Modal
        visible={showCalendarModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <SafeAreaView style={[styles.calendarModalContainer, { backgroundColor: theme.background }]}>
          {/* CABEÇALHO DO INTERVALO */}
          <View style={[styles.topBar, { borderBottomColor: theme.divider }]}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
              onPress={() => setShowCalendarModal(false)}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </TouchableOpacity>

            <Text style={[styles.calendarModalTitle, { color: theme.text }]}>Selecione o Intervalo</Text>

            <TouchableOpacity
              style={[styles.calendarApplyButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
              onPress={handleApplyCalendarInterval}
            >
              <Ionicons name="checkmark" size={22} color="#D90000" />
            </TouchableOpacity>
          </View>

          {/* CALENDÁRIO COM MESES ROLÁVEIS */}
          <ScrollView style={styles.calendarScrollView} showsVerticalScrollIndicator={false}>
            {/* MÊS 1: AGOSTO 2026 */}
            <View style={styles.monthSection}>
              <Text style={styles.monthName}>agosto de 2026</Text>
              <View style={styles.weekDaysHeader}>
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, idx) => (
                  <Text key={idx} style={styles.weekDayText}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {/* Espaços vazios para alinhamento */}
                <View style={styles.dayCellEmpty} />
                <View style={styles.dayCellEmpty} />
                <View style={styles.dayCellEmpty} />
                <View style={styles.dayCellEmpty} />
                <View style={styles.dayCellEmpty} />
                <View style={styles.dayCellEmpty} />
                <TouchableOpacity style={styles.dayCell}>
                  <Text style={styles.dayCellText}>1</Text>
                </TouchableOpacity>

                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map(
                  (day) => {
                    const isRangeStart = day === 1;
                    const isRangeEnd = day === 31;
                    const inRange = day >= 1 && day <= 31;

                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayCell,
                          inRange && styles.dayCellInRange,
                          (isRangeStart || isRangeEnd) && styles.dayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            inRange && styles.dayCellTextInRange,
                            (isRangeStart || isRangeEnd) && styles.dayCellTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>

            {/* MÊS 2: SETEMBRO 2026 */}
            <View style={styles.monthSection}>
              <Text style={styles.monthName}>setembro de 2026</Text>
              <View style={styles.weekDaysHeader}>
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, idx) => (
                  <Text key={idx} style={styles.weekDayText}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                <View style={styles.dayCellEmpty} />
                <View style={styles.dayCellEmpty} />
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map(
                  (day) => (
                    <TouchableOpacity key={day} style={styles.dayCell}>
                      <Text style={styles.dayCellText}>{day}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* BOTÃO DE CONFIRMAR */}
            <TouchableOpacity
              style={styles.applyRangeWideButton}
              onPress={handleApplyCalendarInterval}
            >
              <Text style={styles.applyRangeWideButtonText}>Aplicar Intervalo Selecionado</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },

  // TOP BAR
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  studentHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 8,
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CARD_SOFT,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  studentNameTitle: {
    color: ACCENT_RED,
    fontSize: 16,
    fontWeight: "800",
  },

  // LIST CONTENT
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // TÍTULO DA SEÇÃO
  sectionHeading: {
    color: TEXT_WHITE,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // ABAS DE PERÍODO
  periodTabsContainer: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 12,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  periodTabActive: {
    backgroundColor: ACCENT_RED,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  periodTabTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },

  // BANNER DE KPIS
  kpiBanner: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 12,
    marginBottom: 12,
  },
  kpiColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    borderRadius: 8,
  },
  kpiColumnActive: {
    backgroundColor: "#201212",
  },
  kpiTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kpiDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  kpiNumber: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  kpiLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
    letterSpacing: 0.2,
  },
  kpiDivider: {
    width: 1,
    height: "70%",
    backgroundColor: BORDER_COLOR,
    alignSelf: "center",
  },

  // CAMPO DE BUSCA
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    height: 42,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT_WHITE,
    fontSize: 14,
    paddingVertical: 0,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },

  // CARD DE EXERCÍCIO
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 10,
  },
  exerciseName: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseLastInfo: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
  exerciseRightAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparklineWrap: {
    width: 56,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeEvolving: {
    backgroundColor: GREEN_BG,
  },
  statusBadgeStable: {
    backgroundColor: GREY_BADGE_BG,
  },
  statusBadgeBodyweight: {
    backgroundColor: GREY_BADGE_BG,
  },
  statusBadgeDeclining: {
    backgroundColor: RED_BADGE_BG,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgeTextEvolving: {
    color: GREEN_TEXT,
    fontWeight: "800",
  },
  statusBadgeTextStable: {
    color: GREY_BADGE_TEXT,
  },
  statusBadgeTextBodyweight: {
    color: GREY_BADGE_TEXT,
    fontWeight: "800",
  },
  statusBadgeTextDeclining: {
    color: RED_BADGE_TEXT,
  },

  // ESTADO VAZIO
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  // MODAL DE CALENDÁRIO
  calendarModalContainer: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  calendarModalTitle: {
    color: ACCENT_RED,
    fontSize: 17,
    fontWeight: "800",
  },
  calendarApplyButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  monthSection: {
    marginBottom: 32,
  },
  monthName: {
    color: TEXT_WHITE,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 16,
  },
  weekDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  weekDayText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "700",
    width: 38,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    borderRadius: 19,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 4,
  },
  dayCellText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "600",
  },
  dayCellInRange: {
    backgroundColor: "#2e1212",
    borderRadius: 6,
  },
  dayCellTextInRange: {
    color: "#ff8888",
  },
  dayCellSelected: {
    backgroundColor: ACCENT_RED,
    borderRadius: 19,
  },
  dayCellTextSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
  applyRangeWideButton: {
    backgroundColor: ACCENT_RED,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  applyRangeWideButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
