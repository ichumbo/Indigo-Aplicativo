import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
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
  buildLoadEvolutionInsights,
  calculateAdherence,
  listStudentProfilesForTrainer,
} from "@/services/student-profile-store";

// Design Tokens - DragonCorp Crimson Red Visual Identity
const BG_DARK = "#0f0f0f";
const CARD_BG = "#181818";
const CARD_SOFT = "#222222";
const BORDER_COLOR = "#2e2e2e";
const ACCENT_RED = "#D90000";
const TEXT_WHITE = "#ffffff";
const TEXT_MUTED = "#9a9a9a";
const TEXT_SUBTLE = "#666666";
const GREEN_ACCENT = "#2ecc71";

type SortOption = "evolution" | "gain" | "adherence" | "name";

type StudentRankItem = {
  id: string;
  name: string;
  avatar?: string;
  evolutionCount: number; // Ex: 5 ↑
  gainPercent: number;
  adherence: number;
  score: number;
  currentWorkoutName: string;
};

// Dados padrão de demonstração ricos caso o storage esteja vazio
const DEMO_RANKING_STUDENTS: StudentRankItem[] = [
  {
    id: "student-charles",
    name: "Charles Nóbrega",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    evolutionCount: 5,
    gainPercent: 18,
    adherence: 95,
    score: 96,
    currentWorkoutName: "Elite A - Hipertrofia & Força",
  },
  {
    id: "student-suzana",
    name: "Suzana Souza",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    evolutionCount: 3,
    gainPercent: 12,
    adherence: 88,
    score: 87,
    currentWorkoutName: "Programa Membros Inferiores",
  },
  {
    id: "student-tatiane",
    name: "Tatiane Câmara",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
    evolutionCount: 1,
    gainPercent: 7,
    adherence: 82,
    score: 78,
    currentWorkoutName: "Funcional & Mobilidade",
  },
  {
    id: "student-rafael",
    name: "Rafael Lima",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    evolutionCount: 4,
    gainPercent: 15,
    adherence: 92,
    score: 91,
    currentWorkoutName: "Cross Training Força",
  },
  {
    id: "student-camila",
    name: "Camila Duarte",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
    evolutionCount: 2,
    gainPercent: 9,
    adherence: 85,
    score: 82,
    currentWorkoutName: "Condicionamento & Glúteos",
  },
];

export default function TrainerRankingEvolutionScreen() {
  const { session, loadingSession } = useCurrentSession();
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("evolution");
  const [showFilterModal, setShowFilterModal] = useState(false);

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
      console.error("Erro ao carregar ranking de evolução:", error);
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

  // Combina perfis reais com os dados padrão caso a lista seja muito curta
  const rankingList = useMemo(() => {
    const fromProfiles: StudentRankItem[] = profiles.map((profile) => {
      const insights = buildLoadEvolutionInsights(profile);
      const evolvingCount = insights.filter((i) => (i.progressPercent ?? 0) > 0).length;
      const progressSum = insights.reduce((acc, i) => acc + (i.progressPercent ?? 0), 0);
      const avgGain = insights.length > 0 ? Math.round(progressSum / insights.length) : 0;
      const adherence = calculateAdherence(profile.frequency);

      return {
        id: profile.id,
        name: profile.registration.fullName,
        avatar: profile.registration.avatar,
        evolutionCount: Math.max(evolvingCount, 1),
        gainPercent: avgGain,
        adherence,
        score: Math.round(avgGain * 0.5 + adherence * 0.5),
        currentWorkoutName: profile.followUp.currentWorkoutName,
      };
    });

    // Se tiver menos de 3 perfis reais, mescla com os demos para enriquecer a experiência
    const combined = fromProfiles.length >= 3 ? fromProfiles : [...fromProfiles, ...DEMO_RANKING_STUDENTS.filter(
      (d) => !fromProfiles.some((p) => p.name.toLowerCase() === d.name.toLowerCase())
    )];

    // Filtragem por busca
    const filtered = combined.filter((item) =>
      !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    // Ordenação
    return filtered.sort((a, b) => {
      if (sortBy === "evolution") return b.evolutionCount - a.evolutionCount;
      if (sortBy === "gain") return b.gainPercent - a.gainPercent;
      if (sortBy === "adherence") return b.adherence - a.adherence;
      return a.name.localeCompare(b.name);
    });
  }, [profiles, searchQuery, sortBy]);

  const handleOpenStudent = (student: StudentRankItem) => {
    router.push({
      pathname: "/exercise-performance",
      params: {
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatar,
      },
    });
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />
        <ActivityIndicator size="large" color={ACCENT_RED} />
        <Text style={styles.loadingText}>Carregando ranking de evolução...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />

      {/* TOP BAR / CABEÇALHO */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT_RED} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>Ranking de Evolução</Text>

        <TouchableOpacity style={styles.filterIconButton} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={20} color={ACCENT_RED} />
        </TouchableOpacity>
      </View>

      {/* LISTA DE ALUNOS RANQUEADOS */}
      <FlatList
        data={rankingList}
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
                styles.studentCard,
                isFirst && styles.studentCardFirst,
                isSecond && styles.studentCardSecond,
                isThird && styles.studentCardThird,
              ]}
              onPress={() => handleOpenStudent(item)}
              activeOpacity={0.75}
            >
              {/* POSIÇÃO ORDINAL COM BADGE ESTILIZADA */}
              <View
                style={[
                  styles.rankBadge,
                  isFirst && styles.rankBadgeFirst,
                  isSecond && styles.rankBadgeSecond,
                  isThird && styles.rankBadgeThird,
                ]}
              >
                <Text
                  style={[
                    styles.rankText,
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
                  styles.avatarImage,
                  isFirst && styles.avatarImageFirst,
                ]}
              />

              {/* NOME E SUBTÍTULO */}
              <View style={styles.studentInfo}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.studentSubtext} numberOfLines={1}>
                  {item.currentWorkoutName || `+${item.gainPercent}% ganho de carga`}
                </Text>
              </View>

              {/* INDICADOR DE EVOLUÇÃO (EX: 5 ↑) */}
              <View style={styles.evolutionTag}>
                <Text style={styles.evolutionNumber}>{item.evolutionCount}</Text>
                <Ionicons name="arrow-up" size={13} color={GREEN_ACCENT} style={styles.arrowIcon} />
              </View>

              {/* CHEVRON > */}
              <Ionicons name="chevron-forward" size={16} color={ACCENT_RED} style={styles.chevron} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={48} color={TEXT_SUBTLE} />
            <Text style={styles.emptyTitle}>Nenhum aluno encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Os alunos com registros de evolução de carga aparecerão aqui.
            </Text>
          </View>
        }
      />

      {/* MODAL DE ORDENAÇÃO / FILTRO */}
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
          <View style={styles.modalFilterSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalFilterHeader}>
              <View style={styles.modalFilterTitleRow}>
                <Ionicons name="filter" size={18} color={ACCENT_RED} />
                <Text style={styles.modalFilterTitle}>Ordenar Ranking</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptionsList}>
              {[
                { id: "evolution", label: "Mais exercícios em evolução (padrão)" },
                { id: "gain", label: "Maior % de ganho médio" },
                { id: "adherence", label: "Maior aderência aos treinos" },
                { id: "name", label: "Nome do aluno (A - Z)" },
              ].map((option) => {
                const isSelected = sortBy === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.filterOptionItem, isSelected && styles.filterOptionItemSelected]}
                    onPress={() => {
                      setSortBy(option.id as SortOption);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        isSelected && styles.filterOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={ACCENT_RED} />}
                  </TouchableOpacity>
                );
              })}
            </View>
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
  filterIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },

  // LISTA
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // CARD DE ALUNO
  studentCard: {
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
  studentCardFirst: {
    borderColor: "rgba(217, 0, 0, 0.4)",
    backgroundColor: "#181414",
  },
  studentCardSecond: {
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  studentCardThird: {
    borderColor: "rgba(230, 126, 34, 0.22)",
  },
  rankBadge: {
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
  rankText: {
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
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD_SOFT,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
  },
  avatarImageFirst: {
    borderColor: ACCENT_RED,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  studentName: {
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
  evolutionTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 204, 113, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 2,
    marginRight: 6,
  },
  evolutionNumber: {
    color: GREEN_ACCENT,
    fontSize: 14,
    fontWeight: "900",
  },
  arrowIcon: {
    marginLeft: 1,
  },
  chevron: {
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

  // MODAL FILTRO
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalFilterSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalFilterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalFilterTitle: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  filterOptionsList: {
    marginTop: 8,
  },
  filterOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#252525",
  },
  filterOptionItemSelected: {
    borderBottomColor: ACCENT_RED,
  },
  filterOptionText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
  filterOptionTextSelected: {
    color: ACCENT_RED,
    fontWeight: "800",
  },
});
