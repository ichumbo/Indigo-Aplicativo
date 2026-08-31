import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  TrainerAgendaEventTone,
  TrainerAgendaEventType,
  TrainerAgendaStoredEvent,
  listTrainerAgendaEvents,
  saveTrainerAgendaEvent,
} from "@/services/trainer-agenda-store";
import {
  TrainerHomeDashboard,
  TrainerHomeStudentSummary,
  getTrainerHomeDashboard,
} from "@/services/trainer-home-store";

type AgendaEventType = TrainerAgendaEventType;
type AgendaEventTone = TrainerAgendaEventTone;

type AgendaEvent = Omit<TrainerAgendaStoredEvent, "trainerId" | "createdAt" | "updatedAt"> & {
  id: string;
  source: "dashboard" | "manual";
};

type AgendaDraft = {
  type: AgendaEventType;
  title: string;
  studentId: string;
  date: string;
  time: string;
  duration: string;
};

type AgendaTypeOption = {
  value: AgendaEventType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultTitle: string;
  durationMinutes: number;
};

type CalendarCell = {
  date: Date;
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventCount: number;
  hasCriticalEvent: boolean;
};

const ACCENT = "#D90000";
const ACCENT_SOFT = "rgba(217, 0, 0, 0.1)";
const ACCENT_BORDER = "rgba(217, 0, 0, 0.28)";
const BACKGROUND = "#0f0f0f";
const CARD = "#1a1a1a";
const CARD_ELEVATED = "#202020";
const FIELD = "#242424";
const BORDER = "#2d2d2d";
const TEXT = "#ffffff";
const MUTED = "#9b9b9b";
const SUBTLE = "#6f6f6f";
const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const TYPE_OPTIONS: AgendaTypeOption[] = [
  {
    value: "session",
    label: "Treino",
    icon: "barbell-outline",
    defaultTitle: "Sessao de treino",
    durationMinutes: 60,
  },
  {
    value: "assessment",
    label: "Avaliacao",
    icon: "clipboard-outline",
    defaultTitle: "Avaliacao fisica",
    durationMinutes: 45,
  },
  {
    value: "expiration",
    label: "Vencimento",
    icon: "timer-outline",
    defaultTitle: "Vencimento de treino",
    durationMinutes: 15,
  },
  {
    value: "manual",
    label: "Outro",
    icon: "calendar-outline",
    defaultTitle: "Compromisso",
    durationMinutes: 30,
  },
];

function getEventBackgroundImage(type: AgendaEventType): string {
  switch (type) {
    case "session":
      return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop";
    case "assessment":
      return "https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=600&auto=format&fit=crop";
    case "expiration":
      return "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop";
    case "manual":
    default:
      return "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=600&auto=format&fit=crop";
  }
}

export default function TrainerAgendaScreen() {
  const { session, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const todayKey = useMemo(() => getDateKey(new Date()), []);
  const [dashboard, setDashboard] = useState<TrainerHomeDashboard | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [manualEvents, setManualEvents] = useState<AgendaEvent[]>([]);
  const [draft, setDraft] = useState<AgendaDraft>(() => createAgendaDraft(todayKey, "session"));
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (asRefresh = false) => {
    if (!session) {
      setLoading(false);
      return;
    }

    if (session.user.role !== "TRAINER") {
      setError("Agenda disponivel para profissionais.");
      setLoading(false);
      return;
    }

    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [nextDashboard, storedEvents] = await Promise.all([
        getTrainerHomeDashboard(session.user.id),
        listTrainerAgendaEvents(session.user.id),
      ]);
      setDashboard(nextDashboard);
      setManualEvents(storedEvents.map(mapStoredEventToAgendaEvent));
    } catch {
      setError("Nao foi possivel carregar a agenda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const dashboardEvents = useMemo(() => (dashboard ? buildDashboardAgendaEvents(dashboard) : []), [dashboard]);
  const events = useMemo(
    () => [...dashboardEvents, ...manualEvents].sort(sortAgendaEvents),
    [dashboardEvents, manualEvents]
  );
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const calendarCells = useMemo(
    () => buildCalendarCells(monthCursor, eventsByDate, selectedDate, todayKey),
    [eventsByDate, monthCursor, selectedDate, todayKey]
  );
  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const todayEvents = eventsByDate[todayKey] ?? [];
  const monthEvents = useMemo(
    () => events.filter((event) => isDateKeyInMonth(getDateKey(new Date(event.startAt)), monthCursor)),
    [events, monthCursor]
  );
  const upcomingEvents = useMemo(
    () => events.filter((event) => getStartOfDay(new Date(event.startAt)).getTime() >= getStartOfDay(new Date()).getTime()).slice(0, 6),
    [events]
  );
  
  const selectedDateLabel = formatLongDate(selectedDate);
  const students = dashboard?.students ?? [];
  const sessionCount = monthEvents.filter((event) => event.type === "session").length;
  const attentionCount = monthEvents.filter((event) => event.tone !== "default").length;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/profile" as never);
  };

  const goToday = () => {
    const today = new Date();
    setSelectedDate(todayKey);
    setMonthCursor(startOfMonth(today));
  };

  const shiftMonth = (direction: -1 | 1) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const selectCalendarCell = (cell: CalendarCell) => {
    setSelectedDate(cell.dateKey);
    if (!cell.inMonth) setMonthCursor(startOfMonth(cell.date));
  };

  const openEventModal = (dateKey = selectedDate) => {
    setDraft(createAgendaDraft(dateKey, "session", students[0]?.id));
    setEventModalVisible(true);
  };

  const updateDraftType = (type: AgendaEventType) => {
    const option = getTypeOption(type);
    setDraft((current) => ({
      ...current,
      type,
      title: current.title === getTypeOption(current.type).defaultTitle ? option.defaultTitle : current.title,
      duration: String(option.durationMinutes),
    }));
  };

  const saveManualEvent = async () => {
    if (!session) return;

    const parsedDate = parseDateKey(draft.date);
    if (!parsedDate) {
      Alert.alert("Data invalida", "Use o formato AAAA-MM-DD.");
      return;
    }

    if (!isValidTime(draft.time)) {
      Alert.alert("Horario invalido", "Use o formato HH:MM.");
      return;
    }

    const duration = Number.parseInt(draft.duration, 10);
    if (!Number.isFinite(duration) || duration < 10) {
      Alert.alert("Duracao invalida", "Informe a duracao em minutos.");
      return;
    }

    const startAt = combineDateAndTime(draft.date, draft.time);
    const endAt = new Date(startAt.getTime() + duration * 60_000);
    const selectedStudent = students.find((student) => student.id === draft.studentId);
    const typeOption = getTypeOption(draft.type);
    const title = draft.title.trim() || typeOption.defaultTitle;
    const now = new Date().toISOString();
    const storedEvent: TrainerAgendaStoredEvent = {
      id: `manual:${Date.now()}`,
      trainerId: session.user.id,
      type: draft.type,
      title,
      detail: selectedStudent ? `Compromisso vinculado ao aluno` : "Compromisso avulso da agenda",
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      studentId: selectedStudent?.id,
      studentName: selectedStudent?.name,
      studentAvatar: selectedStudent?.avatar,
      tone: draft.type === "session" ? "default" : "attention",
      statusLabel: "Agendado",
      createdAt: now,
      updatedAt: now,
    };

    setSavingEvent(true);
    try {
      await saveTrainerAgendaEvent(storedEvent);
      setManualEvents((current) => [mapStoredEventToAgendaEvent(storedEvent), ...current]);
      setEventModalVisible(false);
    } catch {
      Alert.alert("Falha ao salvar", "Nao foi possivel registrar o compromisso.");
    } finally {
      setSavingEvent(false);
    }
  };

  const openStudent = (studentId?: string) => {
    if (!studentId) return;
    router.push({
      pathname: "/profile" as never,
      params: { studentId },
    });
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={[styles.centerState, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={ACCENT} size="large" />
        <Text style={[styles.centerText, { color: theme.textSecondary }]}>Carregando agenda...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerState, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={goBack}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={40} color="#ff4444" />
        <Text style={[styles.centerTitle, { color: theme.text }]}>Falha ao carregar</Text>
        <Text style={[styles.centerText, { color: theme.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadDashboard()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={ACCENT} />}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={goBack}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.screenTitle, { color: theme.text }]} numberOfLines={1}>
            Agenda do Personal
          </Text>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerActionButton, { backgroundColor: theme.cardSecondary }]}
              onPress={() => openEventModal()}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Novo compromisso"
            >
              <Ionicons name="add" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: ACCENT }]}>
          <Image
            source={require("@/assets/images/logo-white.png")}
            style={styles.heroWatermark}
            resizeMode="contain"
          />
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryEyebrow} numberOfLines={1}>Hoje</Text>
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {todayEvents.length} {todayEvents.length === 1 ? "compromisso" : "compromissos"}
              </Text>
              <Text style={styles.summarySubtitle} numberOfLines={1}>{formatLongDate(todayKey)}</Text>
            </View>
            <TouchableOpacity style={styles.summaryAction} onPress={goToday}>
              <Ionicons name="locate-outline" size={16} color="#FFFFFF" />
              <Text style={styles.summaryActionText} numberOfLines={1}>Hoje</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryStats}>
            <MetricPill label="No mês" value={monthEvents.length} icon="calendar-outline" />
            <MetricPill label="Treinos" value={sessionCount} icon="barbell-outline" />
            <MetricPill label="Atenção" value={attentionCount} icon="alert-circle-outline" />
          </View>
        </View>

        <View style={[styles.monthPanel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.monthHeader}>
            <TouchableOpacity style={[styles.monthButton, { backgroundColor: theme.cardSecondary }]} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.monthTitleBlock}>
              <Text style={[styles.monthTitle, { color: theme.text }]} numberOfLines={1}>{formatMonthLabel(monthCursor)}</Text>
              <Text style={[styles.monthSubtitle, { color: theme.textSecondary }]}>
                {monthEvents.length ? `${monthEvents.length} no período` : "Sem eventos"}
              </Text>
            </View>
            <TouchableOpacity style={[styles.monthButton, { backgroundColor: theme.cardSecondary }]} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day) => (
              <Text key={day} style={[styles.weekLabel, { color: theme.textSecondary }]}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => (
              <View key={cell.dateKey} style={styles.calendarCellOuter}>
                <TouchableOpacity
                  style={[
                    styles.calendarCell,
                    { backgroundColor: theme.cardSecondary },
                    !cell.inMonth && styles.calendarCellMuted,
                    cell.isToday && styles.calendarCellToday,
                    cell.isSelected && styles.calendarCellSelected,
                  ]}
                  onPress={() => selectCalendarCell(cell)}
                >
                  <Text
                    style={[
                      styles.calendarDay,
                      { color: theme.text },
                      !cell.inMonth && [styles.calendarDayMuted, { color: theme.textMuted }],
                      cell.isSelected && styles.calendarDaySelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {cell.eventCount ? (
                    <View style={styles.calendarDots}>
                      <View style={[styles.calendarDot, cell.hasCriticalEvent && styles.calendarDotCritical]} />
                      {cell.eventCount > 1 ? (
                        <Text style={[styles.calendarCount, cell.isSelected && styles.calendarCountSelected]}>
                          {cell.eventCount}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.monthFooter}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
              onPress={() => openEventModal(selectedDate)}
            >
              <Ionicons name="add-circle-outline" size={17} color={theme.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.text }]} numberOfLines={1}>Adicionar compromisso</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={1}>Dia selecionado</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{selectedDateLabel}</Text>
          </View>
          <View style={[styles.sectionCountBadge, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Text style={[styles.sectionCount, { color: theme.text }]}>{selectedEvents.length}</Text>
          </View>
        </View>

        {selectedEvents.length ? (
          <View style={styles.eventList}>
            {selectedEvents.map((event) => (
              <AgendaEventCard key={event.id} event={event} onPress={() => openStudent(event.studentId)} />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.cardSecondary }]}>
              <Ionicons name="calendar-clear-outline" size={30} color={ACCENT} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum compromisso neste dia</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Use o botão de adicionar para registrar um treino, avaliação ou retorno.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => openEventModal(selectedDate)}>
              <Text style={styles.emptyButtonText}>Adicionar compromisso</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={1}>Próximos horários</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>Agenda em sequência</Text>
          </View>
          <View style={[styles.sectionCountBadge, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Text style={[styles.sectionCount, { color: theme.text }]}>{upcomingEvents.length}</Text>
          </View>
        </View>

        {upcomingEvents.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingRail}>
            {upcomingEvents.map((event) => {
              const typeOption = getTypeOption(event.type);
              const toneColor = getToneColor(event.tone);
              const bgUri = getEventBackgroundImage(event.type);

              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.upcomingCard}
                  onPress={() => openStudent(event.studentId)}
                  activeOpacity={event.studentId ? 0.78 : 1}
                >
                  <ImageBackground
                    source={{ uri: bgUri }}
                    style={styles.upcomingCardBg}
                    imageStyle={styles.upcomingCardBgImage}
                  >
                    <View style={styles.upcomingCardOverlay}>
                      <View style={styles.upcomingTopRow}>
                        <View style={styles.upcomingDateBadge}>
                          <Ionicons name="time-outline" size={11} color="#fff" />
                          <Text style={styles.upcomingDateBadgeText}>
                            {formatShortDay(event.startAt)} • {formatTime(event.startAt)}
                          </Text>
                        </View>

                        <View style={styles.upcomingTypeBadge}>
                          <View style={[styles.upcomingToneDot, { backgroundColor: toneColor }]} />
                          <Text style={styles.upcomingTypeText} numberOfLines={1}>
                            {typeOption.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.upcomingTitle} numberOfLines={2}>
                        {event.title}
                      </Text>

                      <View style={styles.upcomingStudentRow}>
                        {event.studentAvatar ? (
                          <Image source={{ uri: event.studentAvatar }} style={styles.upcomingStudentAvatar} />
                        ) : (
                          <View style={styles.upcomingStudentAvatarFallback}>
                            <Ionicons name="person" size={11} color="#888" />
                          </View>
                        )}
                        <Text style={styles.upcomingStudentName} numberOfLines={1}>
                          {event.studentName ?? "Sem aluno vinculado"}
                        </Text>
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.compactEmpty}>
            <Ionicons name="checkmark-circle-outline" size={22} color={ACCENT} />
            <Text style={styles.compactEmptyText}>Nenhum proximo compromisso encontrado.</Text>
          </View>
        )}
      </ScrollView>

      <NewEventModal
        visible={eventModalVisible}
        draft={draft}
        students={students}
        onClose={() => setEventModalVisible(false)}
        onSave={saveManualEvent}
        onChangeDraft={setDraft}
        onChangeType={updateDraftType}
        saving={savingEvent}
      />
    </View>
  );
}

function MetricPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.metricPill}>
      <View style={styles.metricTopRow}>
        <Ionicons name={icon} size={15} color="rgba(255, 255, 255, 0.85)" />
        <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      </View>
      <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </View>
  );
}

function AgendaEventCard({ event, onPress }: { event: AgendaEvent; onPress: () => void }) {
  const { theme } = useAppTheme();
  const typeOption = getTypeOption(event.type);
  const toneColor = getToneColor(event.tone);
  const hasStudent = Boolean(event.studentId);

  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      activeOpacity={hasStudent ? 0.75 : 1}
      onPress={hasStudent ? onPress : undefined}
    >
      <View style={styles.eventTimeBlock}>
        <Text style={[styles.eventTimeStart, { color: theme.text }]} numberOfLines={1}>{formatTime(event.startAt)}</Text>
        <Text style={[styles.eventTimeEnd, { color: theme.textSecondary }]} numberOfLines={1}>{event.endAt ? formatTime(event.endAt) : ""}</Text>
      </View>

      <View style={styles.eventDivider}>
        <View style={[styles.eventMarker, { backgroundColor: toneColor }]} />
        <View style={[styles.eventDividerLine, { backgroundColor: theme.divider }]} />
      </View>

      <View style={styles.eventBody}>
        <View style={styles.eventTopLine}>
          <View style={[styles.eventTypeBadge, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <View style={[styles.eventTypeDot, { backgroundColor: toneColor }]} />
            <Text style={[styles.eventType, { color: theme.textSecondary }]} numberOfLines={1}>{typeOption.label}</Text>
          </View>
          {hasStudent ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
        </View>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.eventDetail, { color: theme.textSecondary }]} numberOfLines={2}>{event.detail}</Text>
        <View style={styles.eventFooter}>
          {event.studentAvatar ? (
            <Image source={{ uri: event.studentAvatar }} style={styles.eventAvatar} />
          ) : (
            <View style={[styles.eventAvatarFallback, { backgroundColor: theme.cardSecondary }]}>
              <Ionicons name="person-outline" size={13} color={theme.textMuted} />
            </View>
          )}
          <Text style={[styles.eventStudent, { color: theme.textSecondary }]} numberOfLines={1}>{event.studentName ?? "Sem aluno vinculado"}</Text>
          <View style={[styles.eventStatus, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Text style={[styles.eventStatusText, { color: theme.text }]} numberOfLines={1}>{event.statusLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NewEventModal({
  visible,
  draft,
  students,
  onClose,
  onSave,
  onChangeDraft,
  onChangeType,
  saving,
}: {
  visible: boolean;
  draft: AgendaDraft;
  students: TrainerHomeStudentSummary[];
  onClose: () => void;
  onSave: () => void;
  onChangeDraft: (draft: AgendaDraft) => void;
  onChangeType: (type: AgendaEventType) => void;
  saving: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.cardBorder }]} />

          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Novo compromisso</Text>
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: theme.cardSecondary }]}
              onPress={onClose}
              hitSlop={6}
            >
              <Ionicons name="close" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.modalContent}
          >
            {/* Tipo */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>TIPO</Text>
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map((option) => {
                  const active = draft.type === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.typeOption,
                        { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                        active && styles.typeOptionActive,
                      ]}
                      onPress={() => onChangeType(option.value)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={option.icon}
                        size={15}
                        color={active ? "#fff" : theme.textMuted}
                      />
                      <Text
                        style={[
                          styles.typeOptionText,
                          { color: theme.textSecondary },
                          active && styles.typeOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Título */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>TÍTULO</Text>
              <TextInput
                value={draft.title}
                onChangeText={(title) => onChangeDraft({ ...draft, title })}
                placeholder="Nome do compromisso"
                placeholderTextColor={theme.placeholder}
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
              />
            </View>

            {/* Aluno */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ALUNO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentRail}>
                <TouchableOpacity
                  style={[
                    styles.studentChip,
                    { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                    !draft.studentId && styles.studentChipActive,
                  ]}
                  onPress={() => onChangeDraft({ ...draft, studentId: "" })}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.studentChipText,
                      { color: theme.textSecondary },
                      !draft.studentId && styles.studentChipTextActive,
                    ]}
                  >
                    Sem aluno
                  </Text>
                </TouchableOpacity>
                {students.map((student) => {
                  const active = draft.studentId === student.id;
                  return (
                    <TouchableOpacity
                      key={student.id}
                      style={[
                        styles.studentChip,
                        { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                        active && styles.studentChipActive,
                      ]}
                      onPress={() => onChangeDraft({ ...draft, studentId: student.id })}
                      activeOpacity={0.75}
                    >
                      {student.avatar ? (
                        <Image source={{ uri: student.avatar }} style={styles.studentChipAvatar} />
                      ) : null}
                      <Text
                        style={[
                          styles.studentChipText,
                          { color: theme.textSecondary },
                          active && styles.studentChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {student.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Data, Hora e Duração em uma única linha */}
            <View style={styles.formRow}>
              <View style={styles.formColDate}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DATA</Text>
                <TextInput
                  value={draft.date}
                  onChangeText={(date) => onChangeDraft({ ...draft, date })}
                  placeholder="2026-08-15"
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                  style={[styles.inputCompact, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                />
              </View>
              <View style={styles.formColTime}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>HORA</Text>
                <TextInput
                  value={draft.time}
                  onChangeText={(time) => onChangeDraft({ ...draft, time })}
                  placeholder="08:00"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.inputCompact, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                />
              </View>
              <View style={styles.formColDuration}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DURAÇÃO</Text>
                <TextInput
                  value={draft.duration}
                  onChangeText={(duration) => onChangeDraft({ ...draft, duration })}
                  placeholder="60 min"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="number-pad"
                  style={[styles.inputCompact, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={saving}
              activeOpacity={0.82}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveButtonText}>{saving ? "Salvando..." : "Salvar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createAgendaDraft(dateKey: string, type: AgendaEventType, studentId = ""): AgendaDraft {
  const option = getTypeOption(type);
  return {
    type,
    title: option.defaultTitle,
    studentId,
    date: dateKey,
    time: "08:00",
    duration: String(option.durationMinutes),
  };
}

function buildDashboardAgendaEvents(dashboard: TrainerHomeDashboard): AgendaEvent[] {
  return dashboard.students.flatMap((student) => {
    const events: AgendaEvent[] = [];
    const sessionDate = parseDate(student.nextSessionAt);
    const assessmentDate = parseDate(student.nextAssessmentAt);
    const expirationDate = parseDate(student.workoutExpirationAt);

    if (sessionDate) {
      events.push({
        id: `${student.id}:session:${student.nextSessionAt}`,
        type: "session",
        title: student.currentWorkoutName || "Sessao de treino",
        detail: student.objective ? `Objetivo: ${student.objective}` : "Sessao prevista no acompanhamento.",
        startAt: sessionDate.toISOString(),
        endAt: addMinutes(sessionDate, 60).toISOString(),
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatar,
        statusLabel: student.nextSessionLabel,
        tone: student.hasAbsentRecently ? "attention" : "default",
        source: "dashboard",
      });
    }

    if (assessmentDate) {
      events.push({
        id: `${student.id}:assessment:${student.nextAssessmentAt}`,
        type: "assessment",
        title: "Reavaliacao do aluno",
        detail: "Revisar medidas, fotos e progresso antes do atendimento.",
        startAt: assessmentDate.toISOString(),
        endAt: addMinutes(assessmentDate, 45).toISOString(),
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatar,
        statusLabel: student.nextAssessmentLabel,
        tone: student.hasReassessmentPending ? "attention" : "default",
        source: "dashboard",
      });
    }

    if (expirationDate && student.hasWorkoutExpiring) {
      events.push({
        id: `${student.id}:expiration:${student.workoutExpirationAt}`,
        type: "expiration",
        title: "Treino proximo do vencimento",
        detail: student.currentWorkoutName,
        startAt: expirationDate.toISOString(),
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatar,
        statusLabel: student.workoutExpirationLabel,
        tone: "danger",
        source: "dashboard",
      });
    }

    return events;
  });
}

function mapStoredEventToAgendaEvent(event: TrainerAgendaStoredEvent): AgendaEvent {
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    detail: event.detail,
    startAt: event.startAt,
    endAt: event.endAt,
    studentId: event.studentId,
    studentName: event.studentName,
    studentAvatar: event.studentAvatar,
    statusLabel: event.statusLabel,
    tone: event.tone,
    source: "manual",
  };
}

function buildCalendarCells(
  monthCursor: Date,
  eventsByDate: Record<string, AgendaEvent[]>,
  selectedDate: string,
  todayKey: string
): CalendarCell[] {
  const firstDay = startOfMonth(monthCursor);
  const firstVisibleDay = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay.getFullYear(), firstVisibleDay.getMonth(), firstVisibleDay.getDate() + index);
    const dateKey = getDateKey(date);
    const dayEvents = eventsByDate[dateKey] ?? [];
    return {
      date,
      dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === monthCursor.getMonth(),
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDate,
      eventCount: dayEvents.length,
      hasCriticalEvent: dayEvents.some((event) => event.tone !== "default"),
    };
  });
}

function groupEventsByDate(events: AgendaEvent[]) {
  return events.reduce<Record<string, AgendaEvent[]>>((acc, event) => {
    const dateKey = getDateKey(new Date(event.startAt));
    acc[dateKey] = [...(acc[dateKey] ?? []), event].sort(sortAgendaEvents);
    return acc;
  }, {});
}

function sortAgendaEvents(first: AgendaEvent, second: AgendaEvent) {
  return new Date(first.startAt).getTime() - new Date(second.startAt).getTime();
}

function getTypeOption(type: AgendaEventType) {
  return TYPE_OPTIONS.find((option) => option.value === type) ?? TYPE_OPTIONS[0];
}

function getToneColor(tone: AgendaEventTone) {
  if (tone === "danger") return "#ff2d2d";
  if (tone === "attention") return "#ff5757";
  return ACCENT;
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) || getDateKey(date) !== value ? null : date;
}

function combineDateAndTime(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00`);
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKeyInMonth(dateKey: string, monthCursor: Date) {
  const date = parseDateKey(dateKey);
  if (!date) return false;
  return date.getFullYear() === monthCursor.getFullYear() && date.getMonth() === monthCursor.getMonth();
}

function formatMonthLabel(date: Date) {
  return capitalizeFirst(date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
}

function formatLongDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return capitalizeFirst(date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }));
}

function formatShortDay(value: string) {
  const date = new Date(value);
  return date
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(" de ", " ")
    .replace(".", "");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function capitalizeFirst(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 38,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
    backgroundColor: BACKGROUND,
  },
  centerTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  centerText: {
    color: MUTED,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  primaryButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 10,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    textAlign: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: ACCENT,
    overflow: "hidden",
    marginBottom: 14,
    position: "relative",
  },
  heroWatermark: {
    position: "absolute",
    right: -12,
    top: -12,
    width: 120,
    height: 120,
    opacity: 0.1,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryEyebrow: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: 0,
  },
  summarySubtitle: {
    color: "rgba(255, 255, 255, 0.74)",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  summaryAction: {
    minHeight: 36,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(15, 15, 15, 0.32)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    flexShrink: 0,
  },
  summaryActionText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },
  summaryStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  metricPill: {
    flex: 1,
    minHeight: 62,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 2,
  },
  metricValue: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  metricLabel: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  monthPanel: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 22,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FIELD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  monthTitleBlock: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  monthTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
  },
  monthSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekLabel: {
    width: "14.2857%",
    textAlign: "center",
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCellOuter: {
    width: "14.2857%",
    padding: 2,
  },
  calendarCell: {
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  calendarCellMuted: {
    opacity: 0.32,
  },
  calendarCellToday: {
    borderColor: ACCENT_BORDER,
    backgroundColor: ACCENT_SOFT,
  },
  calendarCellSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  calendarDay: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  calendarDayMuted: {
    color: SUBTLE,
  },
  calendarDaySelected: {
    color: TEXT,
  },
  calendarDots: {
    position: "absolute",
    bottom: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  calendarDotCritical: {
    backgroundColor: "#ff5757",
  },
  calendarCount: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "900",
  },
  calendarCountSelected: {
    color: TEXT,
  },
  monthFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
  },
  secondaryButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  sectionCountBadge: {
    minWidth: 34,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: CARD_ELEVATED,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionCount: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  eventList: {
    gap: 10,
    marginBottom: 28,
  },
  eventCard: {
    minHeight: 108,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  eventTimeBlock: {
    width: 54,
    paddingTop: 2,
  },
  eventTimeStart: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  eventTimeEnd: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  eventDivider: {
    width: 12,
    alignSelf: "stretch",
    alignItems: "center",
  },
  eventDividerLine: {
    width: 1,
    flex: 1,
    backgroundColor: BORDER,
    marginTop: 6,
  },
  eventMarker: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  eventBody: {
    flex: 1,
    minWidth: 0,
  },
  eventTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  eventTypeBadge: {
    minHeight: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: CARD_ELEVATED,
    maxWidth: 120,
  },
  eventTypeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  eventType: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  eventTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 7,
  },
  eventDetail: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
  },
  eventAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  eventAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FIELD,
  },
  eventStudent: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  eventStatus: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: CARD_ELEVATED,
    borderWidth: 1,
    borderColor: BORDER,
    maxWidth: 116,
  },
  eventStatusText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
  },
  emptyCard: {
    alignItems: "center",
    padding: 22,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 28,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT_SOFT,
    marginBottom: 16,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
  emptyButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
    marginTop: 18,
  },
  emptyButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  upcomingRail: {
    gap: 12,
    paddingBottom: 8,
  },
  upcomingCard: {
    width: 250,
    minHeight: 128,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  upcomingCardBg: {
    width: "100%",
    height: "100%",
  },
  upcomingCardBgImage: {
    borderRadius: 15,
    opacity: 0.35,
  },
  upcomingCardOverlay: {
    flex: 1,
    padding: 13,
    justifyContent: "space-between",
    backgroundColor: "rgba(10, 10, 10, 0.76)",
  },
  upcomingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  upcomingDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  upcomingDateBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  upcomingTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  upcomingToneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  upcomingTypeText: {
    color: "#e2e2e2",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  upcomingTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
    marginVertical: 4,
  },
  upcomingStudentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
  },
  upcomingStudentAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "#222",
  },
  upcomingStudentAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingStudentName: {
    color: "#cfcfcf",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  compactEmpty: {
    minHeight: 58,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  compactEmptyText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  modalSheet: {
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    paddingTop: 10,
    overflow: "hidden",
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333333",
    alignSelf: "center",
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#202020",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  inputLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: "row",
    gap: 6,
  },
  typeOption: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 6,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#282828",
  },
  typeOptionActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  typeOptionText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  typeOptionTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  input: {
    minHeight: 42,
    borderRadius: 9,
    paddingHorizontal: 12,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#282828",
  },
  inputCompact: {
    minHeight: 42,
    borderRadius: 9,
    paddingHorizontal: 10,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#282828",
  },
  studentRail: {
    gap: 6,
    paddingBottom: 2,
  },
  studentChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#282828",
  },
  studentChipActive: {
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    borderColor: "#D90000",
  },
  studentChipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  studentChipText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  studentChipTextActive: {
    color: "#ff4d4d",
    fontWeight: "800",
  },
  formRow: {
    flexDirection: "row",
    gap: 8,
  },
  formColDate: {
    flex: 1.3,
    gap: 6,
  },
  formColTime: {
    flex: 0.9,
    gap: 6,
  },
  formColDuration: {
    flex: 0.9,
    gap: 6,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#202020",
  },
  cancelButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#282828",
  },
  cancelButtonText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D90000",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
