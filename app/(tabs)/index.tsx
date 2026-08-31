import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
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

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { signOut } from "@/services/auth-store";
import {
  STUDENT_STATUS_OPTIONS,
  StudentStatus,
  getWhatsAppUrl,
  updateStudentStatus,
} from "@/services/student-profile-store";
import {
  getSubscriptionForUser,
  validateStudentAdditionAllowed,
  SubscriptionRecord,
} from "@/services/subscription-service";
import { PaywallModal } from "@/components/PaywallModal";
import { AIAssistantModal } from "@/components/AIAssistantModal";
import { AppMiniMenu } from "@/components/AppMiniMenu";
import { TrainerConconiProtocolModal } from "@/components/trainer-conconi-protocol-modal";
import {
  STUDENT_FILTER_LABELS,
  STUDENT_SORT_LABELS,
  TrainerHomeDashboard,
  TrainerHomePending,
  TrainerHomeRoute,
  TrainerHomeShortcut,
  TrainerHomeShortcutId,
  TrainerHomeSort,
  TrainerHomeStudentFilter,
  TrainerHomeStudentSummary,
  TrainerHomeTodayIndicator,
  TrainerHomeTodayIndicatorId,
  getTrainerHomeDashboard,
  markTrainerHomePendingViewed,
  restoreTrainerHomeShortcutDefaults,
  restoreTrainerHomeTodayIndicatorDefaults,
  saveTrainerHomeShortcutIds,
  saveTrainerHomeTodayIndicatorIds,
  snoozeTrainerHomePending,
  sortTrainerHomeStudents,
  studentMatchesHomeFilter,
} from "@/services/trainer-home-store";

const PAGE_SIZE = 12;
const CARD_GRID_GAP = 10;
const SINGLE_COLUMN_BREAKPOINT = 360;
const SUMMARY_GRID_COLUMNS = 2;

export default function HomeScreen() {
  const layout = useResponsiveLayout();
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const [dashboard, setDashboard] = useState<TrainerHomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<TrainerHomeStudentFilter[]>(["all"]);
  const [sortBy, setSortBy] = useState<TrainerHomeSort>("priority");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAllShortcuts, setShowAllShortcuts] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [summaryEditorVisible, setSummaryEditorVisible] = useState(false);
  const [shortcutEditorVisible, setShortcutEditorVisible] = useState(false);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(false);
  const [registrationVisible, setRegistrationVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<TrainerHomeStudentSummary | null>(null);
  const [statusModalStudent, setStatusModalStudent] = useState<TrainerHomeStudentSummary | null>(null);
  const [conconiModalVisible, setConconiModalVisible] = useState(false);

  const loadDashboard = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [nextDashboard, sub] = await Promise.all([
        getTrainerHomeDashboard(session.user.id),
        getSubscriptionForUser(session.user.id, session.user.name, session.user.email),
      ]);
      setDashboard(nextDashboard);
      setSubscription(sub);
      setActiveFilters((current) => current.length ? current : [nextDashboard.preferences.savedStudentFilter ?? "all"]);
      setSortBy((current) => current ?? nextDashboard.preferences.savedSort ?? "priority");
    } catch {
      setError("Nao foi possivel carregar a central do treinador.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 220);
    return () => clearTimeout(timeout);
  }, [query]);

  const filteredStudents = useMemo(() => {
    if (!dashboard) return [];
    const search = normalizeSearch(debouncedQuery);
    const normalizedFilters = activeFilters.includes("all") ? ["all"] as TrainerHomeStudentFilter[] : activeFilters;
    const matched = dashboard.students.filter((student) => {
      if (search && !student.searchText.includes(search)) return false;
      return normalizedFilters.every((filter) => studentMatchesHomeFilter(student, filter));
    });

    return sortTrainerHomeStudents(matched, sortBy);
  }, [activeFilters, dashboard, debouncedQuery, sortBy]);

  const visibleStudents = filteredStudents.slice(0, visibleCount);
  const displayedShortcuts = dashboard
    ? showAllShortcuts
      ? dashboard.shortcuts
      : dashboard.shortcuts.slice(0, 8)
    : [];
  const summaryRows = useMemo(
    () => getGridRows(dashboard?.today ?? [], SUMMARY_GRID_COLUMNS),
    [dashboard?.today],
  );
  const pageShellWidth = Math.min(layout.width, layout.contentMaxWidth);
  const pageInnerWidth = Math.max(0, pageShellWidth - layout.horizontalPadding * 2);
  const gridColumns = layout.width < SINGLE_COLUMN_BREAKPOINT ? 1 : 2;
  const cardSizing = useMemo(() => {
    return {
      shortcutCard: { width: getGridItemWidth(pageInnerWidth, gridColumns, CARD_GRID_GAP) },
    };
  }, [gridColumns, pageInnerWidth]);

  const setSingleFilter = (filter: TrainerHomeStudentFilter) => {
    setActiveFilters([filter]);
    setVisibleCount(PAGE_SIZE);
  };

  const toggleFilter = (filter: TrainerHomeStudentFilter) => {
    setActiveFilters((current) => {
      if (filter === "all") return ["all"];
      const withoutAll = current.filter((item) => item !== "all");
      const next = withoutAll.includes(filter)
        ? withoutAll.filter((item) => item !== filter)
        : [...withoutAll, filter];
      return next.length ? next : ["all"];
    });
    setVisibleCount(PAGE_SIZE);
  };

  const clearFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setActiveFilters(["all"]);
    setSortBy("priority");
    setVisibleCount(PAGE_SIZE);
  };

  const navigateToRoute = (route: TrainerHomeRoute, studentId?: string) => {
    if (route === "/profile" && studentId) {
      router.push({ pathname: "/profile" as never, params: { studentId } });
      return;
    }
    router.push(route as never);
  };

  const handleShortcut = (shortcut: TrainerHomeShortcut) => {
    if (shortcut.id === "agenda") {
      router.push("/trainer-agenda" as never);
      return;
    }
    if (shortcut.action === "route" && shortcut.route) {
      navigateToRoute(shortcut.route);
      return;
    }
    if (shortcut.action === "filter" && shortcut.filter) {
      setSingleFilter(shortcut.filter);
      return;
    }
    if (shortcut.modal === "agenda") router.push("/trainer-agenda" as never);
    if (shortcut.modal === "registration") {
      if (!session) return;
      void (async () => {
        const canAdd = await validateStudentAdditionAllowed(session.user.id, dashboard?.students.length || 0);
        if (!canAdd.allowed) {
          setPaywallVisible(true);
          return;
        }
        setRegistrationVisible(true);
      })();
    }
  };

  const handleIndicator = (indicator: TrainerHomeTodayIndicator) => {
    if (indicator.id === "appointments") {
      router.push("/trainer-agenda" as never);
      return;
    }
    if (indicator.action === "route" && indicator.route) {
      navigateToRoute(indicator.route);
      return;
    }
    if (indicator.action === "filter" && indicator.filter) {
      setSingleFilter(indicator.filter);
      return;
    }
    if (indicator.modal === "agenda") {
      router.push("/trainer-agenda" as never);
      return;
    }
  };

  const handlePendingAction = (pending: TrainerHomePending) => {
    navigateToRoute(pending.route, pending.studentId);
  };

  const markPendingViewed = async (pending: TrainerHomePending) => {
    if (!session) return;
    setSaving(true);
    try {
      await markTrainerHomePendingViewed(pending.id, session.user.id);
      await loadDashboard(true);
    } finally {
      setSaving(false);
    }
  };

  const snoozePending = async (pending: TrainerHomePending) => {
    if (!session) return;
    setSaving(true);
    try {
      await snoozeTrainerHomePending(pending.id, 3, session.user.id);
      await loadDashboard(true);
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = async (student: TrainerHomeStudentSummary) => {
    const url = getWhatsAppUrl(student.whatsapp ?? student.phone);
    if (!url) {
      Alert.alert("WhatsApp invalido", "Revise o telefone do aluno antes de iniciar contato.");
      return;
    }

    Alert.alert("Abrir WhatsApp", `Iniciar conversa com ${student.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Abrir",
        onPress: async () => {
          const supported = await Linking.canOpenURL(url);
          if (!supported) {
            Alert.alert("Nao foi possivel abrir", "Verifique se ha navegador ou WhatsApp disponivel.");
            return;
          }
          await Linking.openURL(url);
        },
      },
    ]);
  };

  const confirmStatusChange = (student: TrainerHomeStudentSummary, status: StudentStatus) => {
    if (student.status === status) return;
    const nextLabel = STUDENT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
    Alert.alert(
      "Alterar status",
      `Alterar ${student.name} para ${nextLabel}? O historico de avaliacoes, treinos e feedbacks sera preservado.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            void saveStatus(student, status);
          },
        },
      ]
    );
  };

  const saveStatus = async (student: TrainerHomeStudentSummary, status: StudentStatus) => {
    if (!session) return;
    setSaving(true);
    try {
      await updateStudentStatus(student.id, status, session.user.id, "trainer");
      setStatusModalStudent(null);
      setSelectedStudent(null);
      await loadDashboard(true);
    } catch (statusError) {
      Alert.alert("Nao foi possivel alterar", statusError instanceof Error ? statusError.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const saveShortcuts = async (shortcutIds: TrainerHomeShortcutId[]) => {
    if (!session) return;
    setSaving(true);
    try {
      await saveTrainerHomeShortcutIds(shortcutIds, session.user.id);
      await loadDashboard(true);
    } finally {
      setSaving(false);
    }
  };

  const restoreShortcuts = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await restoreTrainerHomeShortcutDefaults(session.user.id);
      await loadDashboard(true);
    } finally {
      setSaving(false);
    }
  };

  const saveTodayIndicators = async (todayIndicatorIds: TrainerHomeTodayIndicatorId[]) => {
    if (!session) return;
    setSaving(true);
    try {
      await saveTrainerHomeTodayIndicatorIds(todayIndicatorIds, session.user.id);
      await loadDashboard(true);
    } finally {
      setSaving(false);
    }
  };

  const restoreTodayIndicators = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await restoreTrainerHomeTodayIndicatorDefaults(session.user.id);
      await loadDashboard(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login" as never);
  };

  if (loadingSession || !session || (loading && !refreshing)) {
    return <HomeLoading />;
  }

  if (error || !dashboard) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={42} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error || "Central indisponivel."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadDashboard()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      <FlatList
        style={[styles.list, { backgroundColor: theme.background }]}
        data={visibleStudents}
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
            <Header
              dashboard={dashboard}
              subscription={subscription}
              onNotifications={() => navigateToRoute("/notifications")}
              onProfile={() => navigateToRoute("/profile")}
              onAccount={() => setAccountMenuVisible(true)}
              onSubscribe={() => setPaywallVisible(true)}
              compact={layout.isCompact}
            />

            {dashboard.partialErrors.length ? (
              <View style={styles.partialError}>
                <Ionicons name="warning-outline" size={16} color="#D90000" />
                <Text style={styles.partialErrorText}>Alguns dados nao carregaram, mas a lista de alunos segue disponivel.</Text>
              </View>
            ) : null}

            <View style={[styles.summaryPanel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleBlock}>
                  <Text style={[styles.summaryTitle, { color: theme.text }, layout.isCompact && styles.summaryTitleCompact]}>
                    Resumo do dia
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Personalizar resumo"
                  style={[
                    styles.summaryConfigButton,
                    { backgroundColor: isDark ? "rgba(217, 0, 0, 0.1)" : "rgba(217, 0, 0, 0.08)", borderColor: "rgba(217, 0, 0, 0.35)" },
                    layout.isCompact && styles.summaryConfigButtonCompact,
                  ]}
                  onPress={() => setSummaryEditorVisible(true)}
                >
                  <Ionicons name="options-outline" size={layout.isCompact ? 19 : 17} color="#D90000" />
                  {layout.isCompact ? null : <Text style={styles.summaryConfigText}>Personalizar</Text>}
                </TouchableOpacity>
              </View>

              {dashboard.today.length ? (
                <View style={styles.summaryGrid}>
                  {summaryRows.map((row, rowIndex) => (
                    <View key={`summary-row-${rowIndex}`} style={styles.summaryGridRow}>
                      {row.map((indicator, colIndex) => (
                        <TodayCard
                          key={indicator.id}
                          indicator={indicator}
                          onPress={() => handleIndicator(indicator)}
                          cardStyle={styles.summaryGridCard}
                          compact={layout.isCompact}
                          isFirst={rowIndex === 0 && colIndex === 0}
                        />
                      ))}
                      {row.length < SUMMARY_GRID_COLUMNS ? (
                        <View style={styles.summaryGridSpacer} />
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={styles.summaryEmpty} onPress={() => setSummaryEditorVisible(true)}>
                  <Ionicons name="grid-outline" size={24} color="#D90000" />
                  <Text style={styles.summaryEmptyTitle}>Nenhum indicador ativo</Text>
                  <Text style={styles.summaryEmptyText}>Escolha quais cards devem aparecer nesta area.</Text>
                </TouchableOpacity>
              )}
            </View>

            <PendingSection
              pendings={dashboard.pendings}
              saving={saving}
              onOpen={handlePendingAction}
              onView={markPendingViewed}
              onSnooze={snoozePending}
            />

            {/* HERO BANNER: TESTE AERÓBIO (CONCONI) & PROTOCOLO */}
            <TouchableOpacity
              style={[styles.conconiHeroBanner, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => setConconiModalVisible(true)}
              activeOpacity={0.82}
            >
              <View style={[styles.conconiHeroIconBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <Ionicons name="pulse" size={20} color="#D90000" />
              </View>
              <View style={styles.conconiHeroTextBox}>
                <Text style={[styles.conconiHeroTitle, { color: theme.text }]}>Teste Aeróbio (Conconi)</Text>
                <Text style={[styles.conconiHeroSubtitle, { color: theme.textSecondary }]}>
                  Prescrição semanal e laudo em PDF com FC/Velocidade
                </Text>
              </View>
              <View style={[styles.conconiHeroArrowBox, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="chevron-forward" size={16} color="#D90000" />
              </View>
            </TouchableOpacity>

            <View style={styles.quickHeader}>
              <SectionHeader title="Acessos rapidos" detail={showAllShortcuts ? "Todos os atalhos" : "Principais"} compact />
              <TouchableOpacity style={styles.textButton} onPress={() => setShortcutEditorVisible(true)}>
                <Ionicons name="settings-outline" size={15} color="#D90000" />
                <Text style={styles.textButtonLabel}>Personalizar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.shortcutGrid}>
              {displayedShortcuts.map((shortcut) => (
                <ShortcutCard
                  key={shortcut.id}
                  shortcut={shortcut}
                  onPress={() => handleShortcut(shortcut)}
                  cardStyle={cardSizing.shortcutCard}
                />
              ))}
              {dashboard.shortcuts.length > 8 ? (
                <TouchableOpacity
                  style={[styles.shortcutCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }, cardSizing.shortcutCard]}
                  onPress={() => setShowAllShortcuts((value) => !value)}
                >
                  <View style={[styles.shortcutIcon, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                    <Ionicons name={showAllShortcuts ? "chevron-up" : "grid-outline"} size={20} color="#D90000" />
                  </View>
                  <Text style={[styles.shortcutTitle, { color: theme.text }]} numberOfLines={2}>{showAllShortcuts ? "Ver menos" : "Ver todos"}</Text>
                  <Text style={[styles.shortcutDetail, { color: theme.textSecondary }]} numberOfLines={2}>{dashboard.shortcuts.length} atalhos</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <SectionHeader title="Alunos" detail={`${filteredStudents.length}/${dashboard.students.length}`} />
            <View style={[styles.searchBox, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
              <Ionicons name="search-outline" size={18} color="#D90000" />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Buscar por nome, contato, objetivo ou observacao"
                placeholderTextColor={theme.textMuted}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterBar}>
              <TouchableOpacity style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => setFiltersVisible(true)}>
                <Ionicons name="options-outline" size={18} color="#D90000" />
                <Text style={[styles.filterButtonText, { color: theme.text }]}>
                  {activeFilters.includes("all") ? "Todos" : `${activeFilters.length} filtro(s)`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={clearFilters}>
                <Ionicons name="refresh-outline" size={18} color="#D90000" />
                <Text style={[styles.filterButtonText, { color: theme.text }]}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <StudentCard
            student={item}
            onOpen={() => navigateToRoute("/profile", item.id)}
            onWhatsApp={() => openWhatsApp(item)}
            onMenu={() => setSelectedStudent(item)}
          />
        )}
        ListEmptyComponent={<EmptyCard icon="search-outline" title="Nenhum aluno encontrado" detail="Revise a busca ou limpe os filtros aplicados." />}
        ListFooterComponent={
          filteredStudents.length > visibleStudents.length ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setVisibleCount((value) => value + PAGE_SIZE)}
              activeOpacity={0.84}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.loadMoreText}>Carregar mais alunos</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <AppMiniMenu
        visible={accountMenuVisible}
        onClose={() => setAccountMenuVisible(false)}
        role="TRAINER"
      />

      <FiltersModal
        visible={filtersVisible}
        dashboard={dashboard}
        activeFilters={activeFilters}
        sortBy={sortBy}
        onToggleFilter={toggleFilter}
        onSort={setSortBy}
        onClear={clearFilters}
        onClose={() => setFiltersVisible(false)}
      />

      <TodayIndicatorEditor
        visible={summaryEditorVisible}
        dashboard={dashboard}
        saving={saving}
        onClose={() => setSummaryEditorVisible(false)}
        onSave={saveTodayIndicators}
        onRestore={restoreTodayIndicators}
      />

      <ShortcutEditor
        visible={shortcutEditorVisible}
        dashboard={dashboard}
        saving={saving}
        onClose={() => setShortcutEditorVisible(false)}
        onSave={saveShortcuts}
        onRestore={restoreShortcuts}
      />

      <AgendaModal
        visible={agendaVisible}
        dashboard={dashboard}
        onClose={() => setAgendaVisible(false)}
        onOpenStudent={(studentId) => {
          setAgendaVisible(false);
          navigateToRoute("/profile", studentId);
        }}
      />

      <RegistrationModal
        visible={registrationVisible}
        onClose={() => setRegistrationVisible(false)}
        onProfile={() => {
          setRegistrationVisible(false);
          navigateToRoute("/profile");
        }}
        onNotifications={() => {
          setRegistrationVisible(false);
          navigateToRoute("/notifications");
        }}
      />

      <StudentActionMenu
        visible={Boolean(selectedStudent)}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onProfile={() => selectedStudent && navigateToRoute("/profile", selectedStudent.id)}
        onWhatsApp={() => selectedStudent && openWhatsApp(selectedStudent)}
        onTraining={() => navigateToRoute("/training", selectedStudent?.id)}
        onAssessment={() => navigateToRoute("/assessment-editor", selectedStudent?.id)}
        onFeedback={() => navigateToRoute("/student-feedbacks", selectedStudent?.id)}
        onEvolution={() => navigateToRoute("/exercise-performance", selectedStudent?.id)}
        onStatus={() => {
          setStatusModalStudent(selectedStudent);
          setSelectedStudent(null);
        }}
      />

      <TrainerConconiProtocolModal
        visible={conconiModalVisible}
        students={dashboard?.students}
        trainerId={session?.user.id}
        onClose={() => setConconiModalVisible(false)}
      />

      <StatusModal
        visible={Boolean(statusModalStudent)}
        student={statusModalStudent}
        saving={saving}
        onClose={() => setStatusModalStudent(null)}
        onChange={confirmStatusChange}
      />

      {/* FLOATING AI ASSISTANT BUTTON (ICON ONLY, NON-ROUND, ABOVE TABBAR) */}
      <TouchableOpacity
        style={[
          styles.floatingAiBtn,
          { bottom: layout.tabBarBottom + layout.tabBarHeight + 14 },
        ]}
        onPress={() => setAiModalVisible(true)}
        activeOpacity={0.84}
        accessibilityLabel="Assistente IA"
      >
        <Ionicons name="sparkles" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        userId={session.user.id}
        onSuccess={() => loadDashboard(true)}
      />

      <AIAssistantModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        trainerId={session.user.id}
        onStudentCreated={() => loadDashboard(true)}
      />
    </View>
  );
}

function Header({
  dashboard,
  subscription,
  onNotifications,
  onProfile,
  onAccount,
  onSubscribe,
  compact,
}: {
  dashboard: TrainerHomeDashboard;
  subscription: SubscriptionRecord | null;
  onNotifications: () => void;
  onProfile: () => void;
  onAccount: () => void;
  onSubscribe: () => void;
  compact: boolean;
}) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={[styles.headerTop, compact && styles.headerTopCompact]}>
        <TouchableOpacity style={[styles.trainerBlock, compact && styles.trainerBlockCompact]} onPress={onProfile}>
          <Image source={{ uri: dashboard.trainer.avatar }} style={[styles.trainerAvatar, compact && styles.trainerAvatarCompact]} />
          <View style={styles.trainerTextBlock}>
            <Text
              style={[styles.trainerName, compact && styles.trainerNameCompact]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {dashboard.trainer.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <TouchableOpacity
                style={[
                  styles.planPill,
                  subscription?.plan === "PRO" ? styles.planPillPro : styles.planPillFree,
                ]}
                onPress={onSubscribe}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={subscription?.plan === "PRO" ? "star" : "ribbon-outline"}
                  size={10}
                  color={subscription?.plan === "PRO" ? "#FFFFFF" : "#D90000"}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.planPillText,
                    subscription?.plan === "PRO" ? styles.planPillTextPro : styles.planPillTextFree,
                  ]}
                >
                  {subscription?.plan === "PRO"
                    ? "PRO"
                    : `FREE • ${dashboard.students.length}/1`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
        <View style={[styles.headerActions, compact && styles.headerActionsCompact]}>
          <TouchableOpacity style={[styles.headerIconButton, compact && styles.headerIconButtonCompact]} onPress={onNotifications}>
            <Ionicons name="notifications-outline" size={compact ? 18 : 20} color="#fff" />
            {dashboard.unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{dashboard.unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconButton, compact && styles.headerIconButtonCompact]} onPress={onAccount}>
            <Ionicons name="ellipsis-horizontal" size={compact ? 19 : 21} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SectionHeader({ title, detail, compact }: { title: string; detail: string; compact?: boolean }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.sectionHeader, compact && styles.sectionHeaderCompact]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.sectionDetail, { color: theme.textSecondary }]}>{detail}</Text>
    </View>
  );
}

function TodayCard({
  indicator,
  onPress,
  cardStyle,
  compact,
  isFirst,
}: {
  indicator: TrainerHomeTodayIndicator;
  onPress: () => void;
  cardStyle: StyleProp<ViewStyle>;
  compact: boolean;
  isFirst?: boolean;
}) {
  const { theme, isDark } = useAppTheme();
  const active = indicator.value > 0;

  return (
    <TouchableOpacity
      style={[
        styles.todayCard,
        {
          backgroundColor: isFirst ? "#D90000" : theme.card,
          borderColor: isFirst ? "rgba(255, 255, 255, 0.2)" : theme.cardBorder,
        },
        cardStyle,
        compact && styles.todayCardCompact,
        active && !isFirst && { borderColor: "rgba(217, 0, 0, 0.55)", backgroundColor: isDark ? "#241717" : "#FFF5F5" },
        isFirst && styles.todayCardFirst,
      ]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View style={styles.todayTopRow}>
        <View
          style={[
            styles.todayIcon,
            {
              backgroundColor: isFirst
                ? "rgba(0,0,0,0.18)"
                : isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(217,0,0,0.08)",
            },
            isFirst ? styles.todayIconFirst : active && styles.todayIconActive,
          ]}
        >
          <Ionicons
            name={indicator.icon as keyof typeof Ionicons.glyphMap}
            size={19}
            color={isFirst ? "#ffffff" : "#D90000"}
          />
        </View>
      </View>
      <View style={styles.todayContentBlock}>
        <Text
          style={[
            styles.todayValue,
            { color: isFirst ? "#ffffff" : active ? "#D90000" : theme.text },
            isFirst && styles.todayValueFirst,
          ]}
        >
          {indicator.value}
        </Text>
        <Text
          style={[
            styles.todayLabel,
            { color: isFirst ? "#ffffff" : theme.textSecondary },
            isFirst && styles.todayLabelFirst,
          ]}
          numberOfLines={2}
        >
          {indicator.label}
        </Text>
      </View>
      <View style={styles.todayFooter}>
        <Text
          style={[
            styles.todayActionLabel,
            { color: isFirst ? "#ffffff" : active ? "#D90000" : theme.textSecondary },
            isFirst && styles.todayActionLabelFirst,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {getTodayActionLabel(indicator)}
        </Text>
        <Ionicons name="chevron-forward" size={15} color={isFirst ? "#ffffff" : "#D90000"} />
      </View>
    </TouchableOpacity>
  );
}

function getTodayActionLabel(indicator: TrainerHomeTodayIndicator) {
  if (indicator.modal === "agenda") return "Abrir agenda";
  if (indicator.route) return "Abrir area";
  if (indicator.filter) return "Filtrar alunos";
  return "Ver detalhes";
}

function PendingSection({
  pendings,
  saving,
  onOpen,
  onView,
  onSnooze,
}: {
  pendings: TrainerHomePending[];
  saving: boolean;
  onOpen: (pending: TrainerHomePending) => void;
  onView: (pending: TrainerHomePending) => void;
  onSnooze: (pending: TrainerHomePending) => void;
}) {
  const { theme, isDark } = useAppTheme();
  const visiblePendings = pendings.slice(0, 3);
  const urgentCount = pendings.filter((pending) => pending.priority === "critical" || pending.priority === "expired").length;
  const newCount = pendings.filter((pending) => !pending.viewed).length;
  const hiddenCount = pendings.length - visiblePendings.length;
  const newLabel = newCount === 1 ? "1 item novo para revisar" : `${newCount} itens novos para revisar`;
  const urgentLabel = urgentCount === 1 ? "1 prioridade alta" : `${urgentCount} prioridades altas`;

  return (
    <View style={[styles.pendingSection, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <TouchableOpacity
        style={styles.pendingSectionHeader}
        onPress={() => router.push("/trainer-attention" as never)}
        activeOpacity={0.8}
      >
        <View style={styles.pendingSectionTitleRow}>
          <View style={[styles.pendingSectionIcon, { backgroundColor: isDark ? "rgba(217, 0, 0, 0.16)" : "rgba(217, 0, 0, 0.08)", borderColor: "rgba(217, 0, 0, 0.3)" }]}>
            <Ionicons name="alert-circle-outline" size={19} color="#D90000" />
          </View>
          <View style={styles.pendingSectionTitleBlock}>
            <Text style={[styles.pendingSectionTitle, { color: theme.text }]}>Atenção necessária</Text>
            <Text style={[styles.pendingSectionSubtitle, { color: theme.textSecondary }]}>
              {newCount ? newLabel : "Sem novos alertas na fila"}
            </Text>
          </View>
        </View>
        <View style={[styles.pendingCountBadge, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
          <Text style={[styles.pendingCountValue, { color: theme.text }]}>{pendings.length}</Text>
          <Text style={[styles.pendingCountLabel, { color: theme.textMuted }]}>na fila</Text>
        </View>
      </TouchableOpacity>

      {urgentCount ? (
        <View style={[styles.pendingUrgentStrip, { backgroundColor: isDark ? "rgba(255, 68, 68, 0.12)" : "rgba(255, 68, 68, 0.08)", borderColor: "rgba(255, 68, 68, 0.3)" }]}>
          <Ionicons name="warning-outline" size={15} color="#D90000" />
          <Text style={[styles.pendingUrgentText, { color: "#D90000" }]}>{urgentLabel}</Text>
        </View>
      ) : null}

      {visiblePendings.length ? (
        <View style={styles.pendingList}>
          {visiblePendings.map((pending, index) => (
            <PendingCard
              key={pending.id}
              pending={pending}
              saving={saving}
              last={index === visiblePendings.length - 1}
              onOpen={() => onOpen(pending)}
              onView={() => onView(pending)}
              onSnooze={() => onSnooze(pending)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.pendingEmptyState}>
          <Ionicons name="checkmark-circle-outline" size={26} color="#D90000" />
          <Text style={[styles.pendingEmptyTitle, { color: theme.text }]}>Sem pendências críticas</Text>
          <Text style={[styles.pendingEmptyText, { color: theme.textSecondary }]}>A central será atualizada quando houver nova ação para revisar.</Text>
        </View>
      )}

      {hiddenCount > 0 ? (
        <TouchableOpacity
          style={[styles.pendingMoreRow, { borderTopColor: theme.divider }]}
          onPress={() => router.push("/trainer-attention" as never)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pendingMoreText, { color: theme.textSecondary }]}>+{hiddenCount} {hiddenCount === 1 ? "item" : "itens"} em espera</Text>
          <Ionicons name="chevron-forward" size={14} color="#D90000" />
        </TouchableOpacity>
      ) : pendings.length > 0 ? (
        <TouchableOpacity
          style={[styles.pendingMoreRow, { borderTopColor: theme.divider }]}
          onPress={() => router.push("/trainer-attention" as never)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pendingMoreText, { color: theme.textSecondary }]}>Ver todos os {pendings.length} itens de atenção</Text>
          <Ionicons name="chevron-forward" size={14} color="#D90000" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PendingCard({
  pending,
  saving,
  last,
  onOpen,
  onView,
  onSnooze,
}: {
  pending: TrainerHomePending;
  saving: boolean;
  last?: boolean;
  onOpen: () => void;
  onView: () => void;
  onSnooze: () => void;
}) {
  const { theme, isDark } = useAppTheme();
  return (
    <View style={[styles.pendingCard, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, pending.viewed && styles.pendingCardViewed, last && styles.pendingCardLast]}>
      <TouchableOpacity style={styles.pendingMain} onPress={onOpen} activeOpacity={0.84}>
        <View style={styles.pendingAvatarWrap}>
          {pending.studentAvatar ? (
            <Image source={{ uri: pending.studentAvatar }} style={styles.pendingAvatar} />
          ) : (
            <Text style={[styles.pendingAvatarText, { color: theme.text }]}>{getInitials(pending.studentName)}</Text>
          )}
          <View style={[styles.pendingPriorityDot, priorityStyle(pending.priority)]} />
        </View>
        <View style={styles.pendingTextBlock}>
          <View style={styles.pendingTop}>
            <Text style={[styles.pendingStudent, { color: theme.text }]} numberOfLines={1}>{pending.studentName}</Text>
            <View style={[styles.pendingPriorityPill, priorityChipStyle(pending.priority)]}>
              <Text style={[styles.pendingPriorityText, priorityTextStyle(pending.priority)]} numberOfLines={1}>
                {pending.priorityLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.pendingTitle, { color: theme.text }]} numberOfLines={2}>{pending.title}</Text>
          <View style={styles.pendingMetaRow}>
            <Ionicons name={getPendingTypeIcon(pending)} size={13} color={theme.textMuted} />
            <Text style={[styles.pendingDetail, { color: theme.textSecondary }]} numberOfLines={2}>{pending.type} • {pending.detail}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
      </TouchableOpacity>
      <View style={styles.pendingActions}>
        <TouchableOpacity
          style={[styles.pendingActionButton, styles.pendingActionButtonPrimary]}
          onPress={onOpen}
          accessibilityLabel={pending.actionLabel}
          activeOpacity={0.86}
        >
          <Ionicons name={getPendingActionIcon(pending)} size={14} color="#fff" />
          <Text style={styles.pendingActionButtonTextPrimary}>Abrir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pendingActionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={onView}
          disabled={saving}
          accessibilityLabel={pending.viewed ? "Visto" : "Marcar visto"}
          activeOpacity={0.86}
        >
          <Ionicons name={pending.viewed ? "checkmark-done" : "eye-outline"} size={14} color="#D90000" />
          <Text style={[styles.pendingActionButtonText, { color: theme.text }]}>Visto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pendingActionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={onSnooze}
          disabled={saving}
          accessibilityLabel="Adiar"
          activeOpacity={0.86}
        >
          <Ionicons name="time-outline" size={14} color="#D90000" />
          <Text style={[styles.pendingActionButtonText, { color: theme.text }]}>Adiar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getPendingActionIcon(pending: TrainerHomePending): keyof typeof Ionicons.glyphMap {
  if (pending.filter === "pain") return "shield-checkmark-outline";
  if (pending.route === "/student-feedbacks") return "chatbubble-ellipses-outline";
  if (pending.route === "/training") return "fitness-outline";
  if (pending.route === "/student-assessments") return "clipboard-outline";
  if (pending.route === "/profile") return "person-outline";
  return "open-outline";
}

function getPendingTypeIcon(pending: TrainerHomePending): keyof typeof Ionicons.glyphMap {
  if (pending.filter === "pain") return "shield-checkmark-outline";
  if (pending.type.toLowerCase().includes("treino")) return "fitness-outline";
  if (pending.type.toLowerCase().includes("anamnese")) return "document-text-outline";
  if (pending.type.toLowerCase().includes("document")) return "folder-open-outline";
  if (pending.type.toLowerCase().includes("feedback")) return "chatbubble-ellipses-outline";
  return "flag-outline";
}

function ShortcutCard({
  shortcut,
  onPress,
  cardStyle,
}: {
  shortcut: TrainerHomeShortcut;
  onPress: () => void;
  cardStyle: StyleProp<ViewStyle>;
}) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
      style={[styles.shortcutCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }, cardStyle]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
        <Ionicons name={shortcut.icon as keyof typeof Ionicons.glyphMap} size={20} color="#D90000" />
        {shortcut.badge ? (
          <View style={styles.shortcutBadge}>
            <Text style={styles.shortcutBadgeText}>{shortcut.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.shortcutTitle, { color: theme.text }]} numberOfLines={2}>{shortcut.label}</Text>
      <Text style={[styles.shortcutDetail, { color: theme.textSecondary }]} numberOfLines={2}>{shortcut.detail}</Text>
    </TouchableOpacity>
  );
}

function StudentCard({
  student,
  onOpen,
  onWhatsApp,
  onMenu,
}: {
  student: TrainerHomeStudentSummary;
  onOpen: () => void;
  onWhatsApp: () => void;
  onMenu: () => void;
}) {
  const { theme, isDark } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  const badges: { label: string; danger?: boolean }[] = [];
  if (student.hasPain) badges.push({ label: "Dor", danger: true });
  if (student.pendingCount > 0) badges.push({ label: `${student.pendingCount} pendência(s)`, danger: true });
  if (student.hasFeedbackPending) badges.push({ label: "Feedback" });
  if (student.hasAnamnesisPending) badges.push({ label: "Anamnese" });

  return (
    <View style={[styles.studentCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {/* Topo: Avatar, Nome, Status e Objetivo */}
      <TouchableOpacity style={styles.studentTop} onPress={onOpen} activeOpacity={0.78}>
        {student.avatar ? (
          <Image source={{ uri: student.avatar }} style={styles.studentAvatar} />
        ) : (
          <View style={[styles.studentAvatarFallback, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Ionicons name="person-outline" size={20} color={theme.textMuted} />
          </View>
        )}
        <View style={styles.studentInfo}>
          <View style={styles.studentNameRow}>
            <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={1}>{student.name}</Text>
            <View style={[styles.statusPill, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
              <Text style={[styles.statusPillText, { color: theme.textSecondary }]}>{student.statusLabel}</Text>
            </View>
          </View>
          <Text style={[styles.studentGoal, { color: theme.textSecondary }]} numberOfLines={1}>
            {student.objective || "Sem objetivo informado"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Linha de Tags e Botões de Ação */}
      <View style={styles.studentControlRow}>
        <View style={styles.badgesWrapper}>
          {badges.length > 0 ? (
            badges.map((badge, idx) => (
              <View
                key={idx}
                style={[styles.badgePill, badge.danger && styles.badgePillDanger]}
              >
                <Text
                  style={[styles.badgePillText, badge.danger && styles.badgePillTextDanger]}
                  numberOfLines={1}
                >
                  {badge.label}
                </Text>
              </View>
            ))
          ) : (
            <View style={[styles.badgePillNeutral, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
              <Text style={[styles.badgePillNeutralText, { color: theme.textSecondary }]}>Em dia</Text>
            </View>
          )}
        </View>

        <View style={styles.studentActionGroup}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={onWhatsApp}
            hitSlop={4}
            accessibilityLabel="WhatsApp"
          >
            <Ionicons name="logo-whatsapp" size={16} color="#D90000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={onMenu}
            hitSlop={4}
            accessibilityLabel="Opções do aluno"
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
              expanded && styles.actionBtnActive,
            ]}
            onPress={() => setExpanded((prev) => !prev)}
            hitSlop={4}
            accessibilityLabel={expanded ? "Ocultar detalhes" : "Ver detalhes"}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={17}
              color={expanded ? "#D90000" : theme.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Seção Expandida */}
      {expanded ? (
        <View style={[styles.expandedSection, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
          <View style={[styles.expandedDivider, { backgroundColor: theme.divider }]} />

          {/* Grid 2x2 de métricas */}
          <View style={styles.metricGrid}>
            <View style={[styles.metricTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.metricTileHeader}>
                <Ionicons name="pulse-outline" size={13} color="#D90000" />
                <Text style={[styles.metricTileLabel, { color: theme.textSecondary }]}>Última atividade</Text>
              </View>
              <Text style={[styles.metricTileValue, { color: theme.text }]} numberOfLines={1}>
                {student.lastActivityLabel || "Sem registro"}
              </Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.metricTileHeader}>
                <Ionicons name="fitness-outline" size={13} color="#D90000" />
                <Text style={[styles.metricTileLabel, { color: theme.textSecondary }]}>Treino</Text>
              </View>
              <Text style={[styles.metricTileValue, { color: theme.text }]} numberOfLines={1}>
                {student.currentWorkoutName || "Sem treino ativo"}
              </Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.metricTileHeader}>
                <Ionicons name="time-outline" size={13} color="#D90000" />
                <Text style={[styles.metricTileLabel, { color: theme.textSecondary }]}>Vencimento</Text>
              </View>
              <Text style={[styles.metricTileValue, { color: theme.text }]} numberOfLines={1}>
                {student.workoutExpirationLabel || "Sem validade"}
              </Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.metricTileHeader}>
                <Ionicons name="clipboard-outline" size={13} color="#D90000" />
                <Text style={[styles.metricTileLabel, { color: theme.textSecondary }]}>Avaliação</Text>
              </View>
              <Text style={[styles.metricTileValue, { color: theme.text }]} numberOfLines={1}>
                {student.nextAssessmentLabel || "Não agendada"}
              </Text>
            </View>
          </View>

          {/* Próxima Ação */}
          {student.nextAction ? (
            <View style={[styles.nextActionContainer, { backgroundColor: isDark ? "rgba(217, 0, 0, 0.12)" : "rgba(217, 0, 0, 0.06)", borderColor: "rgba(217, 0, 0, 0.25)" }]}>
              <Ionicons name="alert-circle-outline" size={15} color="#D90000" />
              <View style={styles.nextActionTextWrap}>
                <Text style={[styles.nextActionTitle, { color: "#D90000" }]}>Próxima ação recomendada</Text>
                <Text style={[styles.nextActionText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {student.nextAction}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Botão Abrir Perfil */}
          <TouchableOpacity style={[styles.profileOpenButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={onOpen} activeOpacity={0.82}>
            <Text style={[styles.profileOpenText, { color: theme.text }]}>Abrir perfil completo</Text>
            <Ionicons name="arrow-forward" size={15} color="#D90000" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function InfoMini({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoMini}>
      <Ionicons name={icon} size={13} color="#D90000" />
      <View style={styles.infoMiniText}>
        <Text style={styles.infoMiniLabel}>{label}</Text>
        <Text style={styles.infoMiniValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function MiniBadge({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <View style={[styles.miniBadge, danger && styles.miniBadgeDanger]}>
      <Text style={[styles.miniBadgeText, danger && styles.miniBadgeTextDanger]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function EmptyCard({ icon, title, detail }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Ionicons name={icon} size={26} color="#D90000" />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyDetail, { color: theme.textSecondary }]}>{detail}</Text>
    </View>
  );
}

function FiltersModal({
  visible,
  dashboard,
  activeFilters,
  sortBy,
  onToggleFilter,
  onSort,
  onClear,
  onClose,
}: {
  visible: boolean;
  dashboard: TrainerHomeDashboard;
  activeFilters: TrainerHomeStudentFilter[];
  sortBy: TrainerHomeSort;
  onToggleFilter: (filter: TrainerHomeStudentFilter) => void;
  onSort: (sort: TrainerHomeSort) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { theme } = useAppTheme();
  const filters = Object.keys(STUDENT_FILTER_LABELS) as TrainerHomeStudentFilter[];
  const sorts = Object.keys(STUDENT_SORT_LABELS) as TrainerHomeSort[];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Filtros de alunos</Text>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.cardSecondary }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>Filtros combinados</Text>
            <View style={styles.chipWrap}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                    activeFilters.includes(filter) && styles.filterChipActive,
                  ]}
                  onPress={() => onToggleFilter(filter)}
                >
                  <Text style={[styles.filterChipText, { color: theme.text }, activeFilters.includes(filter) && styles.filterChipTextActive]}>
                    {STUDENT_FILTER_LABELS[filter]} ({dashboard.filterCounts[filter] ?? 0})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>Ordenacao</Text>
            <View style={styles.chipWrap}>
              {sorts.map((sort) => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.filterChip,
                    { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                    sortBy === sort && styles.filterChipActive,
                  ]}
                  onPress={() => onSort(sort)}
                >
                  <Text style={[styles.filterChipText, { color: theme.text }, sortBy === sort && styles.filterChipTextActive]}>
                    {STUDENT_SORT_LABELS[sort]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={[styles.outlineWideButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]} onPress={onClear}>
            <Text style={[styles.outlineWideText, { color: theme.text }]}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TodayIndicatorEditor({
  visible,
  dashboard,
  saving,
  onClose,
  onSave,
  onRestore,
}: {
  visible: boolean;
  dashboard: TrainerHomeDashboard;
  saving: boolean;
  onClose: () => void;
  onSave: (todayIndicatorIds: TrainerHomeTodayIndicatorId[]) => void;
  onRestore: () => void;
}) {
  const [draft, setDraft] = useState<TrainerHomeTodayIndicatorId[]>(dashboard.preferences.todayIndicatorIds);

  useEffect(() => {
    if (visible) setDraft(dashboard.preferences.todayIndicatorIds);
  }, [dashboard.preferences.todayIndicatorIds, visible]);

  const move = (id: TrainerHomeTodayIndicatorId, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const toggle = (id: TrainerHomeTodayIndicatorId) => {
    setDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const orderedCatalog = [
    ...draft
      .map((id) => dashboard.todayCatalog.find((indicator) => indicator.id === id))
      .filter((indicator): indicator is TrainerHomeTodayIndicator => Boolean(indicator)),
    ...dashboard.todayCatalog.filter((indicator) => !draft.includes(indicator.id)),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleBlock}>
              <Text style={styles.sheetTitle}>Personalizar resumo</Text>
              <Text style={styles.sheetSubtitle}>{draft.length} indicador(es) aparecendo na home</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetSectionTitle}>Cards do Resumo do dia</Text>
            {orderedCatalog.map((indicator) => {
              const active = draft.includes(indicator.id);
              return (
                <View key={indicator.id} style={[styles.indicatorEditRow, active && styles.indicatorEditRowActive]}>
                  <TouchableOpacity style={styles.indicatorEditMain} onPress={() => toggle(indicator.id)} activeOpacity={0.84}>
                    <Ionicons name={active ? "checkbox" : "square-outline"} size={21} color="#D90000" />
                    <View style={styles.indicatorEditIcon}>
                      <Ionicons name={indicator.icon as keyof typeof Ionicons.glyphMap} size={17} color="#D90000" />
                    </View>
                    <View style={styles.indicatorEditTextBlock}>
                      <Text style={styles.indicatorEditTitle}>{indicator.label}</Text>
                      <Text style={styles.indicatorEditDetail}>{indicator.detail}</Text>
                    </View>
                    <Text style={styles.indicatorEditValue}>{indicator.value}</Text>
                  </TouchableOpacity>
                  {active ? (
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity style={styles.reorderButton} onPress={() => move(indicator.id, -1)}>
                        <Ionicons name="chevron-up" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.reorderButton} onPress={() => move(indicator.id, 1)}>
                        <Ionicons name="chevron-down" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.primaryWideButton} onPress={() => onSave(draft)} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryWideText}>Salvar resumo</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineWideButton} onPress={onRestore} disabled={saving}>
            <Text style={styles.outlineWideText}>Restaurar padrao</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ShortcutEditor({
  visible,
  dashboard,
  saving,
  onClose,
  onSave,
  onRestore,
}: {
  visible: boolean;
  dashboard: TrainerHomeDashboard;
  saving: boolean;
  onClose: () => void;
  onSave: (shortcutIds: TrainerHomeShortcutId[]) => void;
  onRestore: () => void;
}) {
  const [draft, setDraft] = useState<TrainerHomeShortcutId[]>(dashboard.preferences.shortcutIds);

  useEffect(() => {
    if (visible) setDraft(dashboard.preferences.shortcutIds);
  }, [dashboard.preferences.shortcutIds, visible]);

  const move = (id: TrainerHomeShortcutId, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const toggle = (id: TrainerHomeShortcutId) => {
    setDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Personalizar atalhos</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetSectionTitle}>Ativos e disponiveis</Text>
            {dashboard.shortcutCatalog.map((shortcut) => {
              const active = draft.includes(shortcut.id);
              return (
                <View key={shortcut.id} style={styles.shortcutEditRow}>
                  <TouchableOpacity style={styles.shortcutEditMain} onPress={() => toggle(shortcut.id)}>
                    <Ionicons name={active ? "checkbox" : "square-outline"} size={21} color="#D90000" />
                    <View style={styles.shortcutEditTextBlock}>
                      <Text style={styles.shortcutEditTitle}>{shortcut.label}</Text>
                      <Text style={styles.shortcutEditDetail}>{shortcut.detail}</Text>
                    </View>
                  </TouchableOpacity>
                  {active ? (
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity style={styles.reorderButton} onPress={() => move(shortcut.id, -1)}>
                        <Ionicons name="chevron-up" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.reorderButton} onPress={() => move(shortcut.id, 1)}>
                        <Ionicons name="chevron-down" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.primaryWideButton} onPress={() => onSave(draft)} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryWideText}>Salvar atalhos</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineWideButton} onPress={onRestore} disabled={saving}>
            <Text style={styles.outlineWideText}>Restaurar padrao</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AgendaModal({
  visible,
  dashboard,
  onClose,
  onOpenStudent,
}: {
  visible: boolean;
  dashboard: TrainerHomeDashboard;
  onClose: () => void;
  onOpenStudent: (studentId: string) => void;
}) {
  const agendaItems = dashboard.students
    .filter((student) => student.nextSessionLabel === "Hoje" || student.nextAssessmentLabel === "Hoje")
    .map((student) => ({
      id: student.id,
      student,
      label: student.nextAssessmentLabel === "Hoje" ? "Avaliacao" : "Atendimento",
      detail: student.nextAssessmentLabel === "Hoje" ? "Reavaliacao prevista para hoje" : "Sessao prevista para hoje",
    }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Agenda de hoje</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {agendaItems.length ? agendaItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.agendaRow} onPress={() => onOpenStudent(item.student.id)}>
              <View style={styles.agendaIcon}>
                <Ionicons name={item.label === "Avaliacao" ? "clipboard-outline" : "fitness-outline"} size={18} color="#D90000" />
              </View>
              <View style={styles.agendaTextBlock}>
                <Text style={styles.agendaTitle}>{item.student.name}</Text>
                <Text style={styles.agendaDetail}>{item.label} • {item.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          )) : (
            <EmptyCard icon="calendar-outline" title="Sem agenda hoje" detail="Nao ha atendimento ou avaliacao marcada para hoje nos registros atuais." />
          )}
        </View>
      </View>
    </Modal>
  );
}

function RegistrationModal({
  visible,
  onClose,
  onProfile,
  onNotifications,
}: {
  visible: boolean;
  onClose: () => void;
  onProfile: () => void;
  onNotifications: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Cadastro e convites</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <ActionRow icon="person-outline" title="Abrir cadastro do aluno" detail="Editar dados cadastrais e acesso" onPress={onProfile} />
          <ActionRow icon="document-text-outline" title="Convites de anamnese" detail="Gerar, reenviar ou revogar pelo perfil" onPress={onProfile} />
          <ActionRow icon="notifications-outline" title="Pendencias de convite" detail="Ver notificacoes relacionadas" onPress={onNotifications} />
        </View>
      </View>
    </Modal>
  );
}

function StudentActionMenu({
  visible,
  student,
  onClose,
  onProfile,
  onWhatsApp,
  onTraining,
  onAssessment,
  onFeedback,
  onEvolution,
  onStatus,
}: {
  visible: boolean;
  student: TrainerHomeStudentSummary | null;
  onClose: () => void;
  onProfile: () => void;
  onWhatsApp: () => void;
  onTraining: () => void;
  onAssessment: () => void;
  onFeedback: () => void;
  onEvolution: () => void;
  onStatus: () => void;
}) {
  if (!student) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{student.name}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <ActionRow icon="person-outline" title="Abrir perfil" detail="Dados, anamnese e historico" onPress={onProfile} />
          <ActionRow icon="logo-whatsapp" title="WhatsApp" detail="Validar numero e iniciar conversa" onPress={onWhatsApp} />
          <ActionRow icon="fitness-outline" title="Treino" detail="Criar ou revisar sessao atual" onPress={onTraining} />
          <ActionRow icon="clipboard-outline" title="Criar avaliacao" detail="Abrir editor de avaliacao" onPress={onAssessment} />
          <ActionRow icon="chatbubbles-outline" title="Feedbacks" detail="Abrir devolutivas do aluno" onPress={onFeedback} />
          <ActionRow icon="analytics-outline" title="Evolucao" detail="Desempenho por exercicio" onPress={onEvolution} />
          <ActionRow icon="swap-horizontal-outline" title="Alterar status" detail="Requer confirmacao" onPress={onStatus} />
        </View>
      </View>
    </Modal>
  );
}

function StatusModal({
  visible,
  student,
  saving,
  onClose,
  onChange,
}: {
  visible: boolean;
  student: TrainerHomeStudentSummary | null;
  saving: boolean;
  onClose: () => void;
  onChange: (student: TrainerHomeStudentSummary, status: StudentStatus) => void;
}) {
  const { theme } = useAppTheme();
  if (!student) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Status do aluno</Text>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.cardSecondary }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.statusHelp, { color: theme.textSecondary }]}>A mudanca preserva historico e atualiza os filtros da central.</Text>
          {STUDENT_STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusOption,
                { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                student.status === option.value && styles.statusOptionActive,
              ]}
              onPress={() => onChange(student, option.value)}
              disabled={saving}
            >
              <Ionicons name={student.status === option.value ? "radio-button-on" : "radio-button-off"} size={19} color="#D90000" />
              <Text style={[styles.statusOptionText, { color: theme.text }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function AccountMenu({
  visible,
  onClose,
  onProfile,
  onNotifications,
  onLogout,
}: {
  visible: boolean;
  onClose: () => void;
  onProfile: () => void;
  onNotifications: () => void;
  onLogout: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Conta</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <ActionRow icon="person-circle-outline" title="Perfil do treinador" detail="Dados profissionais e conta" onPress={onProfile} />
          <ActionRow icon="notifications-outline" title="Notificacoes" detail="Alertas e atualizacoes" onPress={onNotifications} />
          <ActionRow
            icon="log-out-outline"
            title="Sair"
            detail="Encerrar sessao neste aparelho"
            danger
            onPress={onLogout}
          />
        </View>
      </View>
    </Modal>
  );
}

function ActionRow({
  icon,
  title,
  detail,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? "#ff4444" : "#D90000"} />
      </View>
      <View style={styles.actionTextBlock}>
        <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#666" />
    </TouchableOpacity>
  );
}

function HomeLoading() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color="#D90000" />
      <Text style={styles.centerText}>Carregando central do treinador...</Text>
    </View>
  );
}

function priorityStyle(priority: TrainerHomePending["priority"]) {
  if (priority === "critical") return styles.priorityCritical;
  if (priority === "expired") return styles.priorityExpired;
  if (priority === "soon") return styles.prioritySoon;
  if (priority === "recent") return styles.priorityRecent;
  return styles.priorityAdmin;
}

function priorityChipStyle(priority: TrainerHomePending["priority"]) {
  if (priority === "critical" || priority === "expired") return styles.priorityChipDanger;
  if (priority === "admin") return styles.priorityChipNeutral;
  return styles.priorityChipDefault;
}

function priorityTextStyle(priority: TrainerHomePending["priority"]) {
  if (priority === "critical" || priority === "expired") return styles.priorityTextDanger;
  if (priority === "admin") return styles.priorityTextNeutral;
  return styles.priorityTextDefault;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function getGridItemWidth(containerWidth: number, columns: number, gap: number) {
  if (columns <= 1) return Math.floor(containerWidth);
  const availableWidth = containerWidth - gap * (columns - 1);
  return Math.floor(availableWidth / columns);
}

function getGridRows<T>(items: T[], columns: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
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
    textAlign: "center",
    lineHeight: 20,
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
    backgroundColor: "#D90000",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 14,
    marginBottom: 14,
  },
  headerCompact: {
    padding: 12,
    borderRadius: 15,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTopCompact: {
    gap: 8,
  },
  trainerBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  trainerBlockCompact: {
    gap: 9,
  },
  trainerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#fff",
  },
  trainerAvatarCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  trainerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  trainerName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  trainerNameCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  trainerMeta: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },
  trainerMetaCompact: {
    fontSize: 11,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionsCompact: {
    gap: 6,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerIconButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 11,
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0f0f0fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  partialError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  partialErrorText: {
    color: "#ddd",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionHeaderCompact: {
    marginTop: 0,
    marginBottom: 0,
    flex: 1,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionDetail: {
    color: "#666",
    fontSize: 12,
    fontWeight: "800",
  },
  summaryPanel: {
    backgroundColor: "#151515",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#292929",
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  summaryTitleBlock: {
    flex: 1,
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  summaryTitleCompact: {
    fontSize: 20,
    lineHeight: 25,
  },
  summaryConfigButton: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.35)",
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  summaryConfigButtonCompact: {
    width: 38,
    paddingHorizontal: 0,
  },
  summaryConfigText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  summaryGrid: {
    flexDirection: "column",
    gap: 10,
  },
  summaryGridRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  summaryGridCard: {
    flex: 1,
    minWidth: 0,
  },
  summaryGridSpacer: {
    flex: 1,
    minWidth: 0,
  },
  summaryEmpty: {
    minHeight: 132,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  summaryEmptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  summaryEmptyText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },
  todayCard: {
    minHeight: 136,
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 13,
    justifyContent: "space-between",
  },
  todayCardCompact: {
    minHeight: 128,
    padding: 12,
  },
  todayCardActive: {
    borderColor: "rgba(217, 0, 0, 0.55)",
    backgroundColor: "#241717",
  },
  todayCardFirst: {
    backgroundColor: "#D90000",
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  todayTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  todayIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  todayIconActive: {
    backgroundColor: "rgba(217, 0, 0, 0.18)",
  },
  todayIconFirst: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  todayStatusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#242424",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  todayStatusPillActive: {
    borderColor: "rgba(217, 0, 0, 0.4)",
    backgroundColor: "rgba(217, 0, 0, 0.14)",
  },
  todayStatusPillFirst: {
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  todayStatusText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "900",
  },
  todayStatusTextActive: {
    color: "#D90000",
  },
  todayStatusTextFirst: {
    color: "#ffffff",
  },
  todayContentBlock: {
    marginVertical: 4,
  },
  todayValue: {
    color: "#D90000",
    fontSize: 28,
    fontWeight: "900",
  },
  todayValueFirst: {
    color: "#ffffff",
  },
  todayLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 2,
  },
  todayLabelFirst: {
    color: "#ffffff",
  },
  todayDetail: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 3,
  },
  todayFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
  },
  todayActionLabel: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
    flex: 1,
    minWidth: 0,
  },
  todayActionLabelFirst: {
    color: "#ffffff",
  },
  pendingSection: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  pendingSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pendingSectionTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
  },
  pendingSectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingSectionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  pendingSectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
  },
  pendingSectionSubtitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  pendingCountBadge: {
    minWidth: 52,
    borderRadius: 12,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignItems: "center",
  },
  pendingCountValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  pendingCountLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 1,
  },
  pendingUrgentStrip: {
    minHeight: 32,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  pendingUrgentText: {
    color: "#ff7777",
    fontSize: 11,
    fontWeight: "900",
  },
  pendingList: {
    marginTop: 10,
    gap: 8,
  },
  pendingCard: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 10,
  },
  pendingCardViewed: {
    opacity: 0.68,
  },
  pendingCardLast: {
    borderBottomWidth: 1,
  },
  pendingMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  pendingAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#2d2d2d",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  pendingAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  pendingAvatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  pendingPriorityDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#101010",
    backgroundColor: "#D90000",
  },
  priorityCritical: {
    backgroundColor: "#ff4444",
  },
  priorityExpired: {
    backgroundColor: "#ff4444",
  },
  prioritySoon: {
    backgroundColor: "#D90000",
  },
  priorityRecent: {
    backgroundColor: "#D90000",
  },
  priorityAdmin: {
    backgroundColor: "#666",
  },
  priorityChipDefault: {
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderColor: "rgba(217, 0, 0, 0.24)",
  },
  priorityChipDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.12)",
    borderColor: "rgba(255, 68, 68, 0.28)",
  },
  priorityChipNeutral: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "#343434",
  },
  priorityTextDefault: {
    color: "#D90000",
  },
  priorityTextDanger: {
    color: "#ff6b6b",
  },
  priorityTextNeutral: {
    color: "#aaa",
  },
  pendingTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  pendingTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  pendingStudent: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  pendingPriorityPill: {
    maxWidth: "46%",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  pendingPriorityText: {
    fontSize: 9,
    fontWeight: "900",
  },
  pendingTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 4,
  },
  pendingMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 4,
  },
  pendingDetail: {
    color: "#999",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    flex: 1,
  },
  pendingActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginLeft: 47,
    marginTop: 9,
  },
  pendingActionButton: {
    minHeight: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.26)",
    backgroundColor: "#151515",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  pendingActionButtonPrimary: {
    borderColor: "#D90000",
    backgroundColor: "#D90000",
  },
  pendingActionButtonText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "900",
  },
  pendingActionButtonTextPrimary: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  pendingEmptyState: {
    minHeight: 118,
    borderRadius: 12,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    marginTop: 12,
  },
  pendingEmptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  pendingEmptyText: {
    color: "#888",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  pendingMoreRow: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#242424",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  pendingMoreText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  quickHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  textButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  textButtonLabel: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
  },
  shortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  shortcutCard: {
    width: "48.5%",
    minHeight: 116,
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 13,
  },
  shortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  shortcutBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  shortcutBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  shortcutTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  shortcutDetail: {
    color: "#888",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    fontWeight: "700",
  },
  searchBox: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  filterBar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1c1c1c",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  filterButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  studentCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 13,
    marginBottom: 10,
  },
  studentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#2e2e2e",
    backgroundColor: "#222",
  },
  studentAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#2e2e2e",
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  studentName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  statusPill: {
    borderRadius: 6,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.28)",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "800",
  },
  studentGoal: {
    color: "#888888",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: "600",
  },
  studentControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  badgesWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    alignItems: "center",
  },
  badgePill: {
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePillDanger: {
    backgroundColor: "rgba(217, 0, 0, 0.14)",
    borderColor: "rgba(217, 0, 0, 0.35)",
  },
  badgePillText: {
    color: "#b0b0b0",
    fontSize: 10,
    fontWeight: "700",
  },
  badgePillTextDanger: {
    color: "#ff4d4d",
  },
  badgePillNeutral: {
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePillNeutralText: {
    color: "#777",
    fontSize: 10,
    fontWeight: "700",
  },
  studentActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#2d2d2d",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnActive: {
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    borderColor: "#D90000",
  },
  expandedSection: {
    marginTop: 10,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: "#222222",
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  metricTile: {
    width: "48.5%",
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 10,
  },
  metricTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metricTileLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
    flex: 1,
  },
  metricTileValue: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  nextActionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 10,
    marginTop: 8,
  },
  nextActionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  nextActionTitle: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
  },
  nextActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  profileOpenButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#202020",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    paddingVertical: 10,
    marginTop: 10,
  },
  profileOpenText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  nextActionRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  nextActionLabel: {
    color: "#7f7f7f",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  nextAction: {
    flex: 1,
    color: "#d8d8d8",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  loadMoreButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loadMoreText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    padding: 18,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyDetail: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
    padding: 20,
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sheetTitleBlock: {
    flex: 1,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
  },
  sheetSubtitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSectionTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 8,
  },
  chipWrap: {
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
  outlineWideButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  outlineWideText: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "900",
  },
  primaryWideButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryWideText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  indicatorEditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 13,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    padding: 10,
    marginBottom: 8,
  },
  indicatorEditRowActive: {
    borderColor: "rgba(217, 0, 0, 0.42)",
    backgroundColor: "rgba(217, 0, 0, 0.08)",
  },
  indicatorEditMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  indicatorEditIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorEditTextBlock: {
    flex: 1,
  },
  indicatorEditTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  indicatorEditDetail: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  indicatorEditValue: {
    minWidth: 28,
    color: "#D90000",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "right",
  },
  shortcutEditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 12,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    padding: 10,
    marginBottom: 8,
  },
  shortcutEditMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shortcutEditTextBlock: {
    flex: 1,
  },
  shortcutEditTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  shortcutEditDetail: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  reorderButtons: {
    flexDirection: "row",
    gap: 6,
  },
  reorderButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#242424",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginBottom: 8,
  },
  agendaIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  agendaTextBlock: {
    flex: 1,
  },
  agendaTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  agendaDetail: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  actionRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    padding: 10,
    marginBottom: 8,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  actionTitleDanger: {
    color: "#ff4444",
  },
  actionDetail: {
    color: "#888",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  statusHelp: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  statusOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statusOptionActive: {
    borderColor: "#D90000",
    backgroundColor: "rgba(217, 0, 0, 0.14)",
  },
  statusOptionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  planPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planPillPro: {
    backgroundColor: "#D90000",
  },
  planPillFree: {
    backgroundColor: "#1C1414",
    borderWidth: 1,
    borderColor: "#4A1818",
  },
  planPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  planPillTextPro: {
    color: "#FFFFFF",
  },
  planPillTextFree: {
    color: "#FF9999",
  },
  floatingAiBtn: {
    position: "absolute",
    right: 18,
    bottom: 110,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    borderWidth: 1,
    borderColor: "#FF2B2B",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 9999,
  },

  /* Conconi Hero Banner */
  conconiHeroBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  conconiHeroIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  conconiHeroTextBox: {
    flex: 1,
  },
  conconiHeroTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  conconiHeroSubtitle: {
    color: "#888888",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  conconiHeroArrowBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  infoMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoMiniText: {
    flexShrink: 1,
  },
  infoMiniLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoMiniValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  miniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#1c1c1c",
  },
  miniBadgeDanger: {
    backgroundColor: "rgba(217, 0, 0, 0.16)",
  },
  miniBadgeText: {
    color: "#999999",
    fontSize: 10,
    fontWeight: "800",
  },
  miniBadgeTextDanger: {
    color: "#ff4d4d",
  },
});
