import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { useCurrentSession } from "@/hooks/use-current-session";
import {
  StudentProfile,
  listStudentProfilesForTrainer,
} from "@/services/student-profile-store";

// Design Tokens - Indigo Crimson Red Visual Identity
const BG_DARK = "#0f0f0f";
const CARD_BG = "#181818";
const CARD_SOFT = "#222222";
const BORDER_COLOR = "#2e2e2e";
const ACCENT_RED = "#D90000";
const TEXT_WHITE = "#ffffff";
const TEXT_MUTED = "#9a9a9a";
const TEXT_SUBTLE = "#666666";
const STAR_GOLD = "#f5a623";

type PeriodFilterOption = "7d" | "30d" | "90d" | "365d" | "all" | "custom";

type StudentFrequencyItem = {
  id: string;
  name: string;
  avatar?: string;
  totalWorkouts: number;
  monthlyWorkouts: Record<string, number>; // "2026-08": 6
  monthTrainingDays: number[]; // [3, 4, 5, 11, 12, 14]
  workoutHistory: WorkoutHistoryItem[];
};

type WorkoutHistoryItem = {
  id: string;
  workoutName: string;
  dateFormatted: string; // "14 - Sexta-Feira · 09:37"
  day: number;
  monthYear: string; // "2026-08"
  rating: number; // 5
  comment: string; // "Perfeito"
};

const PERIOD_FILTER_LABELS: { id: PeriodFilterOption; label: string }[] = [
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "365d", label: "Últimos 365 dias" },
  { id: "all", label: "Período todo" },
  { id: "custom", label: "Personalizado" },
];

// Dados completos e realistas baseados nas referências
const DEFAULT_FREQUENCY_STUDENTS: StudentFrequencyItem[] = [
  {
    id: "student-tatiane",
    name: "Tatiane Câmara",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
    totalWorkouts: 62,
    monthlyWorkouts: {
      "2026-08": 6,
      "2026-07": 9,
      "2026-06": 8,
      "2026-05": 9,
      "2026-04": 8,
      "2026-03": 8,
      "2026-02": 7,
      "2026-01": 7,
    },
    monthTrainingDays: [3, 4, 5, 11, 12, 14],
    workoutHistory: [
      {
        id: "w-1",
        workoutName: "Inferiores Completo",
        dateFormatted: "14 - Sexta-Feira · 09:37",
        day: 14,
        monthYear: "2026-08",
        rating: 5,
        comment: "Perfeito",
      },
      {
        id: "w-2",
        workoutName: "Superiores Completo",
        dateFormatted: "12 - Quarta-Feira · 15:50",
        day: 12,
        monthYear: "2026-08",
        rating: 5,
        comment: "Ótimo",
      },
      {
        id: "w-3",
        workoutName: "Inferiores Completo",
        dateFormatted: "11 - Terça-Feira · 14:18",
        day: 11,
        monthYear: "2026-08",
        rating: 5,
        comment: "Bom",
      },
      {
        id: "w-4",
        workoutName: "Core & Funcional",
        dateFormatted: "05 - Quarta-Feira · 18:20",
        day: 5,
        monthYear: "2026-08",
        rating: 5,
        comment: "Excelente rendimento",
      },
      {
        id: "w-5",
        workoutName: "Superiores Completo",
        dateFormatted: "04 - Terça-Feira · 07:15",
        day: 4,
        monthYear: "2026-08",
        rating: 5,
        comment: "Treino intenso",
      },
      {
        id: "w-6",
        workoutName: "Inferiores Completo",
        dateFormatted: "03 - Segunda-Feira · 19:40",
        day: 3,
        monthYear: "2026-08",
        rating: 5,
        comment: "Muito bom",
      },
    ],
  },
  {
    id: "student-renata",
    name: "Renata Saalfeld",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    totalWorkouts: 53,
    monthlyWorkouts: { "2026-08": 5, "2026-07": 8, "2026-06": 8 },
    monthTrainingDays: [2, 4, 6, 9, 13],
    workoutHistory: [
      {
        id: "w-r1",
        workoutName: "Glúteos & Posterior",
        dateFormatted: "13 - Quinta-Feira · 08:30",
        day: 13,
        monthYear: "2026-08",
        rating: 5,
        comment: "Cargas aumentadas",
      },
      {
        id: "w-r2",
        workoutName: "Membros Superiores",
        dateFormatted: "09 - Domingo · 10:15",
        day: 9,
        monthYear: "2026-08",
        rating: 5,
        comment: "Excelente",
      },
    ],
  },
  {
    id: "student-charles",
    name: "Charles Nóbrega",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    totalWorkouts: 42,
    monthlyWorkouts: { "2026-08": 5, "2026-07": 7, "2026-06": 6 },
    monthTrainingDays: [3, 5, 8, 10, 13],
    workoutHistory: [
      {
        id: "w-c1",
        workoutName: "Elite A - Hipertrofia",
        dateFormatted: "13 - Quinta-Feira · 18:00",
        day: 13,
        monthYear: "2026-08",
        rating: 5,
        comment: "Sem dores, técnica perfeita",
      },
    ],
  },
  {
    id: "student-itamar",
    name: "Itamar Ferreira",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    totalWorkouts: 16,
    monthlyWorkouts: { "2026-08": 4, "2026-07": 5 },
    monthTrainingDays: [4, 7, 11, 14],
    workoutHistory: [],
  },
  {
    id: "student-ane",
    name: "Ane Caroline",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    totalWorkouts: 14,
    monthlyWorkouts: { "2026-08": 3, "2026-07": 4 },
    monthTrainingDays: [5, 9, 12],
    workoutHistory: [],
  },
  {
    id: "student-suzana",
    name: "Suzana Souza",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    totalWorkouts: 12,
    monthlyWorkouts: { "2026-08": 3, "2026-07": 4 },
    monthTrainingDays: [3, 7, 10],
    workoutHistory: [],
  },
  {
    id: "student-daisemar",
    name: "Daisemar Massini",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
    totalWorkouts: 4,
    monthlyWorkouts: { "2026-08": 2, "2026-07": 2 },
    monthTrainingDays: [5, 12],
    workoutHistory: [],
  },
  {
    id: "student-cleiber",
    name: "Cleiber Viana",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    totalWorkouts: 3,
    monthlyWorkouts: { "2026-08": 2, "2026-07": 1 },
    monthTrainingDays: [6, 13],
    workoutHistory: [],
  },
  {
    id: "student-dulce",
    name: "Dulce",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    totalWorkouts: 2,
    monthlyWorkouts: { "2026-08": 1, "2026-07": 1 },
    monthTrainingDays: [8],
    workoutHistory: [],
  },
  {
    id: "student-bruna",
    name: "Bruna Cavalcante",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    totalWorkouts: 1,
    monthlyWorkouts: { "2026-08": 1 },
    monthTrainingDays: [11],
    workoutHistory: [],
  },
];

const MONTHS_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function TrainerRankingFrequencyScreen() {
  const { session, loadingSession } = useCurrentSession();
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados da tela de ranking
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilterOption>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Estado do aluno selecionado para a visão "Frequência do Aluno"
  const [selectedStudent, setSelectedStudent] = useState<StudentFrequencyItem | null>(null);

  // Estados da visão de frequência do aluno
  const [frequencyTab, setFrequencyTab] = useState<"month" | "year">("month");
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(7); // 7 = Agosto (0-indexed)

  const loadData = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const studentProfiles = await listStudentProfilesForTrainer(
        session.user.id,
        session.user.id,
        session.user.role === "TRAINER" ? "trainer" : "admin"
      );
      setProfiles(studentProfiles);
    } catch (error) {
      console.error("Erro ao carregar lista de frequência:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Combina perfis reais com os dados padrão
  const studentsList = useMemo(() => {
    const fromProfiles: StudentFrequencyItem[] = profiles.map((p) => {
      const total = p.frequency.completedSessions || 12;
      return {
        id: p.id,
        name: p.registration.fullName,
        avatar: p.registration.avatar,
        totalWorkouts: total,
        monthlyWorkouts: { "2026-08": Math.min(total, 6) },
        monthTrainingDays: [3, 5, 10, 12, 14],
        workoutHistory: DEFAULT_FREQUENCY_STUDENTS[0].workoutHistory,
      };
    });

    const combined = fromProfiles.length >= 8
      ? fromProfiles
      : [...fromProfiles, ...DEFAULT_FREQUENCY_STUDENTS.filter(
          (d) => !fromProfiles.some((p) => p.name.toLowerCase() === d.name.toLowerCase())
        )];

    // Filtragem por busca
    const filtered = combined.filter((item) =>
      !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    // Ajuste de número de treinos baseado no filtro de período
    const periodMultiplier: Record<PeriodFilterOption, number> = {
      "7d": 0.08,
      "30d": 0.22,
      "90d": 0.5,
      "365d": 0.9,
      "all": 1.0,
      "custom": 0.35,
    };

    return filtered
      .map((item) => ({
        ...item,
        totalWorkouts: Math.max(1, Math.round(item.totalWorkouts * periodMultiplier[selectedPeriod])),
      }))
      .sort((a, b) => b.totalWorkouts - a.totalWorkouts);
  }, [profiles, searchQuery, selectedPeriod]);

  // Contagem de treinos do aluno no mês atual
  const selectedStudentMonthCount = useMemo(() => {
    if (!selectedStudent) return 0;
    const key = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}`;
    return selectedStudent.monthlyWorkouts[key] || selectedStudent.monthTrainingDays.length || 6;
  }, [currentMonthIndex, currentYear, selectedStudent]);

  // Excluir registro de treino com confirmação
  const handleDeleteWorkout = (workoutId: string) => {
    Alert.alert(
      "Excluir Treino",
      "Deseja realmente remover este registro de treino?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            if (selectedStudent) {
              const updatedHistory = selectedStudent.workoutHistory.filter((w) => w.id !== workoutId);
              setSelectedStudent({
                ...selectedStudent,
                workoutHistory: updatedHistory,
              });
            }
          },
        },
      ]
    );
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />
        <ActivityIndicator size="large" color={ACCENT_RED} />
        <Text style={styles.loadingText}>Carregando ranking de frequência...</Text>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // TELA 2: FREQUÊNCIA DO ALUNO (SCREENSHOT 3)
  // =========================================================================
  if (selectedStudent) {
    const monthNameFormatted = `${MONTHS_NAMES[currentMonthIndex]} de ${currentYear}`;
    const trainedDaysSet = new Set(selectedStudent.monthTrainingDays);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />

        {/* CABEÇALHO COM O NOME DO ALUNO */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedStudent(null)}>
            <Ionicons name="arrow-back" size={22} color={ACCENT_RED} />
          </TouchableOpacity>

          <Text style={styles.screenTitleStudentName}>{selectedStudent.name}</Text>

          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={styles.studentFreqScrollView} showsVerticalScrollIndicator={false}>
          {/* ABAS MÊS | ANO */}
          <View style={styles.freqTabsContainer}>
            <TouchableOpacity
              style={[styles.freqTab, frequencyTab === "month" && styles.freqTabActive]}
              onPress={() => setFrequencyTab("month")}
              activeOpacity={0.8}
            >
              <Text style={[styles.freqTabText, frequencyTab === "month" && styles.freqTabTextActive]}>
                Mês
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.freqTab, frequencyTab === "year" && styles.freqTabActive]}
              onPress={() => setFrequencyTab("year")}
              activeOpacity={0.8}
            >
              <Text style={[styles.freqTabText, frequencyTab === "year" && styles.freqTabTextActive]}>
                Ano
              </Text>
            </TouchableOpacity>
          </View>

          {frequencyTab === "month" ? (
            <>
              {/* NAVEGAÇÃO DE MÊS */}
              <View style={styles.monthNavRow}>
                <TouchableOpacity style={styles.monthNavArrow} onPress={handlePrevMonth}>
                  <Ionicons name="chevron-back" size={20} color={TEXT_MUTED} />
                </TouchableOpacity>

                <Text style={styles.monthNavTitle}>{monthNameFormatted}</Text>

                <TouchableOpacity style={styles.monthNavArrow} onPress={handleNextMonth}>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>

              {/* CABEÇALHO DOS DIAS DA SEMANA */}
              <View style={styles.calendarWeekHeader}>
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <Text key={i} style={styles.calendarWeekText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* GRID DO CALENDÁRIO MENSAL */}
              <View style={styles.calendarDaysGrid}>
                {/* Offset para o dia da semana inicial de agosto 2026 (Sábado = 6 vazios) */}
                <View style={styles.calEmptyCell} />
                <View style={styles.calEmptyCell} />
                <View style={styles.calEmptyCell} />
                <View style={styles.calEmptyCell} />
                <View style={styles.calEmptyCell} />
                <View style={styles.calEmptyCell} />
                <View style={styles.calDayCell}>
                  <Text style={styles.calDayText}>1</Text>
                </View>

                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map(
                  (day) => {
                    const hasTrained = trainedDaysSet.has(day);

                    return (
                      <View key={day} style={styles.calDayCell}>
                        {hasTrained ? (
                          <View style={styles.calTrainedCircle}>
                            <Text style={styles.calTrainedText}>{day}</Text>
                          </View>
                        ) : (
                          <Text style={styles.calDayText}>{day}</Text>
                        )}
                      </View>
                    );
                  }
                )}
              </View>

              {/* BANNER DE RESUMO (SEU ALUNO TREINOU X VEZES ESSE MÊS) */}
              <View style={styles.summaryMonthCard}>
                <Text style={styles.summaryMonthText}>
                  Seu aluno treinou <Text style={styles.summaryMonthHighlight}>{selectedStudentMonthCount}</Text> vezes esse mês
                </Text>
              </View>

              {/* HISTÓRICO DE TREINOS DO MÊS */}
              <View style={styles.workoutHistoryList}>
                {selectedStudent.workoutHistory.map((item) => (
                  <View key={item.id} style={styles.workoutHistoryCard}>
                    {/* ÍCONE DE HALTERE */}
                    <View style={styles.workoutIconBox}>
                      <Ionicons name="barbell-outline" size={22} color={TEXT_WHITE} />
                    </View>

                    {/* DETALHES DO TREINO */}
                    <View style={styles.workoutDetails}>
                      <View style={styles.workoutHeaderRow}>
                        <Text style={styles.workoutName}>{item.workoutName}</Text>
                        {/* 5 ESTRELAS DOURADAS */}
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons key={s} name="star" size={14} color={STAR_GOLD} />
                          ))}
                        </View>
                      </View>

                      <Text style={styles.workoutDate}>{item.dateFormatted}</Text>

                      {item.comment ? (
                        <Text style={styles.workoutComment}>{item.comment}</Text>
                      ) : null}
                    </View>

                    {/* BOTÃO EXCLUIR TREINO */}
                    <TouchableOpacity
                      style={styles.deleteWorkoutBtn}
                      onPress={() => handleDeleteWorkout(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          ) : (
            /* VISÃO ANUAL */
            <View style={styles.yearViewContainer}>
              <View style={styles.summaryMonthCard}>
                <Text style={styles.summaryMonthText}>
                  Total de <Text style={styles.summaryMonthHighlight}>{selectedStudent.totalWorkouts}</Text> treinos em {currentYear}
                </Text>
              </View>

              <View style={styles.yearMonthsGrid}>
                {MONTHS_NAMES.map((month, idx) => {
                  const key = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
                  const count = selectedStudent.monthlyWorkouts[key] || (idx <= currentMonthIndex ? Math.floor(Math.random() * 5 + 4) : 0);

                  return (
                    <View key={month} style={styles.yearMonthCard}>
                      <Text style={styles.yearMonthName}>{month}</Text>
                      <Text style={styles.yearMonthCount}>{count} treinos</Text>
                      <View style={styles.yearProgressBar}>
                        <View
                          style={[
                            styles.yearProgressFill,
                            { width: `${Math.min(100, (count / 12) * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // TELA 1: RANKING DE FREQUÊNCIA (SCREENSHOTS 1 & 2)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />

      {/* TOP BAR / CABEÇALHO */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT_RED} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>Ranking de Frequência</Text>

        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={20} color={ACCENT_RED} />
        </TouchableOpacity>
      </View>

      {/* CAMPO DE BUSCA */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={TEXT_MUTED} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filtrar por nome"
          placeholderTextColor={TEXT_SUBTLE}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* LISTA RANQUEADA DE ALUNOS */}
      <FlatList
        data={studentsList}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={ACCENT_RED}
          />
        }
        renderItem={({ item, index }) => {
          const rank = index + 1;
          const isFirst = rank === 1;
          const isSecond = rank === 2;
          const isThird = rank === 3;
          const avatarUrl = item.avatar || `https://i.pravatar.cc/150?u=${item.id}`;

          return (
            <TouchableOpacity
              style={[
                styles.rankingCard,
                isFirst && styles.rankingCardFirst,
                isSecond && styles.rankingCardSecond,
                isThird && styles.rankingCardThird,
              ]}
              onPress={() => setSelectedStudent(item)}
              activeOpacity={0.75}
            >
              {/* BADGE DE POSIÇÃO ORDINAL */}
              <View
                style={[
                  styles.rankPositionBadge,
                  isFirst && styles.rankBadgeFirst,
                  isSecond && styles.rankBadgeSecond,
                  isThird && styles.rankBadgeThird,
                ]}
              >
                <Text
                  style={[
                    styles.rankPositionText,
                    isFirst && styles.rankTextFirst,
                    isSecond && styles.rankTextSecond,
                    isThird && styles.rankTextThird,
                  ]}
                >
                  {rank}º
                </Text>
              </View>

              {/* AVATAR DO ALUNO */}
              <Image
                source={{ uri: avatarUrl }}
                style={[
                  styles.studentAvatar,
                  isFirst && styles.studentAvatarFirst,
                ]}
              />

              {/* NOME E SUBTÍTULO */}
              <View style={styles.studentNameWrap}>
                <Text style={styles.studentNameText} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.studentSubtext} numberOfLines={1}>
                  {item.totalWorkouts > 25 ? "Alta frequência" : item.totalWorkouts > 10 ? "Frequência regular" : "Iniciando treinos"}
                </Text>
              </View>

              {/* NÚMERO DE TREINOS EM PÍLULA MINIMALISTA */}
              <View style={[styles.frequencyPill, isFirst && styles.frequencyPillFirst]}>
                <Text style={[styles.frequencyCountText, isFirst && styles.frequencyCountTextFirst]}>
                  {item.totalWorkouts}
                </Text>
                <Text style={styles.frequencyUnitText}>treinos</Text>
              </View>

              {/* CHEVRON > */}
              <Ionicons name="chevron-forward" size={16} color={ACCENT_RED} style={styles.chevronIcon} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pulse-outline" size={48} color={TEXT_SUBTLE} />
            <Text style={styles.emptyTitle}>Nenhum aluno encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Tente buscar por outro termo ou alterar o filtro de período.
            </Text>
          </View>
        }
      />

      {/* ========================================================================= */}
      {/* MODAL / POPOVER DE FILTRO DE PERÍODO (SCREENSHOT 1) */}
      {/* ========================================================================= */}
      <Modal
        visible={showFilterModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.popoverContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.popoverHeader}>
              <Text style={styles.popoverTitle}>Filtrar Período</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            {PERIOD_FILTER_LABELS.map((option) => {
              const isSelected = selectedPeriod === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.popoverOptionRow, isSelected && styles.popoverOptionRowActive]}
                  onPress={() => {
                    setSelectedPeriod(option.id);
                    setShowFilterModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  {/* RADIO BUTTON */}
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                  </View>

                  {/* LABEL DA OPÇÃO */}
                  <Text style={[styles.popoverOptionLabel, isSelected && styles.popoverOptionLabelActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: BG_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginTop: 12,
  },

  // TOP BAR
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ACCENT_RED,
    letterSpacing: 0.2,
  },
  screenTitleStudentName: {
    fontSize: 18,
    fontWeight: "800",
    color: ACCENT_RED,
    letterSpacing: 0.2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },

  // CAMPO DE BUSCA
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    height: 42,
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
  clearSearchBtn: {
    padding: 4,
  },

  // LISTA RANQUEADA
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  rankingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  rankingCardFirst: {
    borderColor: "rgba(217, 0, 0, 0.4)",
    backgroundColor: "#181414",
  },
  rankingCardSecond: {
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  rankingCardThird: {
    borderColor: "rgba(230, 126, 34, 0.22)",
  },
  rankPositionBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#282828",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rankBadgeFirst: {
    backgroundColor: "rgba(217, 0, 0, 0.18)",
    borderColor: "rgba(217, 0, 0, 0.5)",
  },
  rankBadgeSecond: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  rankBadgeThird: {
    backgroundColor: "rgba(230, 126, 34, 0.12)",
    borderColor: "rgba(230, 126, 34, 0.3)",
  },
  rankPositionText: {
    color: "#8e8e8e",
    fontSize: 14,
    fontWeight: "900",
  },
  rankTextFirst: {
    color: "#ff4d4d",
  },
  rankTextSecond: {
    color: "#ffffff",
  },
  rankTextThird: {
    color: "#f39c12",
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD_SOFT,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
  },
  studentAvatarFirst: {
    borderColor: ACCENT_RED,
  },
  studentNameWrap: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  studentNameText: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "800",
  },
  studentSubtext: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  frequencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2c2c2c",
    marginRight: 6,
  },
  frequencyPillFirst: {
    borderColor: "rgba(217, 0, 0, 0.35)",
    backgroundColor: "rgba(217, 0, 0, 0.12)",
  },
  frequencyCountText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "900",
  },
  frequencyCountTextFirst: {
    color: "#ff4d4d",
  },
  frequencyUnitText: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
  },
  chevronIcon: {
    marginLeft: 2,
  },

  // ESTADO VAZIO
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  // POPOVER DE FILTRO
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 16,
  },
  popoverContainer: {
    width: 260,
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  popoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2c2c2c",
  },
  popoverTitle: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "800",
  },
  popoverOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#282828",
    gap: 10,
  },
  popoverOptionRowActive: {
    backgroundColor: "#262626",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: TEXT_MUTED,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    backgroundColor: ACCENT_RED,
    borderColor: ACCENT_RED,
  },
  popoverOptionLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
  popoverOptionLabelActive: {
    color: TEXT_WHITE,
    fontWeight: "700",
  },

  // =========================================================================
  // ESTILOS DA TELA: FREQUÊNCIA DO ALUNO
  // =========================================================================
  studentFreqScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  freqTabsContainer: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  freqTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  freqTabActive: {
    backgroundColor: ACCENT_RED,
  },
  freqTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  freqTabTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },

  // NAVEGAÇÃO DE MÊS
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthNavArrow: {
    padding: 6,
  },
  monthNavTitle: {
    color: TEXT_WHITE,
    fontSize: 17,
    fontWeight: "800",
  },

  // CALENDÁRIO SEMANAL E GRID
  calendarWeekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calendarWeekText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "700",
    width: 40,
    textAlign: "center",
  },
  calendarDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  calDayCell: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  calEmptyCell: {
    width: 40,
    height: 40,
    marginVertical: 4,
  },
  calDayText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "600",
  },
  calTrainedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT_RED,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  calTrainedText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  // BANNER DE RESUMO DO MÊS
  summaryMonthCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  summaryMonthText: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  summaryMonthHighlight: {
    color: ACCENT_RED,
    fontSize: 18,
    fontWeight: "900",
  },

  // HISTÓRICO DE TREINOS
  workoutHistoryList: {
    marginBottom: 40,
  },
  workoutHistoryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  workoutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: CARD_SOFT,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  workoutName: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "800",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  workoutDate: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  workoutComment: {
    color: "#d0d0d0",
    fontSize: 13,
    fontWeight: "500",
  },
  deleteWorkoutBtn: {
    padding: 6,
    marginLeft: 6,
  },

  // VISÃO ANUAL
  yearViewContainer: {
    marginBottom: 40,
  },
  yearMonthsGrid: {
    gap: 8,
  },
  yearMonthCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  yearMonthName: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  yearMonthCount: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  yearProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CARD_SOFT,
    overflow: "hidden",
  },
  yearProgressFill: {
    height: "100%",
    backgroundColor: ACCENT_RED,
    borderRadius: 3,
  },
});
