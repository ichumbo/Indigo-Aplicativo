import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
    label: "Revisao",
    icon: "alert-circle-outline",
    defaultTitle: "Revisao de treino",
    durationMinutes: 30,
  },
  {
    value: "manual",
    label: "Outro",
    icon: "calendar-outline",
    defaultTitle: "Compromisso",
    durationMinutes: 30,
  },
];

export default function TrainerAgendaScreen() {
  const { session, loadingSession } = useCurrentSession();
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
      statusLabel: "Criado manualmente",
      tone: "default",
      createdAt: now,
      updatedAt: now,
    };

    setSavingEvent(true);
    try {
      await saveTrainerAgendaEvent(storedEvent);
      setManualEvents((current) => [mapStoredEventToAgendaEvent(storedEvent), ...current]);
      setSelectedDate(draft.date);
      setMonthCursor(startOfMonth(parsedDate));
      setEventModalVisible(false);
    } catch {
      Alert.alert("Nao foi possivel salvar", "Tente novamente em alguns instantes.");
    } finally {
      setSavingEvent(false);
    }
  };

  const openStudent = (studentId?: string) => {
    if (!studentId) return;
    router.push({ pathname: "/profile" as never, params: { studentId } });
  };

  if (loadingSession || (loading && !dashboard)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={ACCENT} />
        <Text style={styles.centerText}>Carregando agenda...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={30} color={TEXT} />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={40} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadDashboard()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={ACCENT} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={goBack} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow} numberOfLines={1}>Agenda do personal</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>Compromissos</Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={() => openEventModal()} accessibilityLabel="Novo compromisso">
            <Ionicons name="add" size={24} color={TEXT} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryEyebrow} numberOfLines={1}>Hoje</Text>
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {todayEvents.length} {todayEvents.length === 1 ? "compromisso" : "compromissos"}
              </Text>
              <Text style={styles.summarySubtitle} numberOfLines={1}>{formatLongDate(todayKey)}</Text>
            </View>
            <TouchableOpacity style={styles.summaryAction} onPress={goToday}>
              <Ionicons name="locate-outline" size={16} color={TEXT} />
              <Text style={styles.summaryActionText} numberOfLines={1}>Hoje</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryStats}>
            <MetricPill label="No mês" value={monthEvents.length} icon="calendar-outline" />
            <MetricPill label="Treinos" value={sessionCount} icon="barbell-outline" />
            <MetricPill label="Atenção" value={attentionCount} icon="alert-circle-outline" />
          </View>
        </View>

        <View style={styles.monthPanel}>
          <View style={styles.monthHeader}>
            <TouchableOpacity style={styles.monthButton} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={22} color={TEXT} />
            </TouchableOpacity>
          <View style={styles.monthTitleBlock}>
              <Text style={styles.monthTitle} numberOfLines={1}>{formatMonthLabel(monthCursor)}</Text>
              <Text style={styles.monthSubtitle}>
                {monthEvents.length ? `${monthEvents.length} no período` : "Sem eventos"}
              </Text>
            </View>
            <TouchableOpacity style={styles.monthButton} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={22} color={TEXT} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day) => (
              <Text key={day} style={styles.weekLabel}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => (
              <View key={cell.dateKey} style={styles.calendarCellOuter}>
                <TouchableOpacity
                  style={[
                    styles.calendarCell,
                    !cell.inMonth && styles.calendarCellMuted,
                    cell.isToday && styles.calendarCellToday,
                    cell.isSelected && styles.calendarCellSelected,
                  ]}
                  onPress={() => selectCalendarCell(cell)}
                >
                  <Text
                    style={[
                      styles.calendarDay,
                      !cell.inMonth && styles.calendarDayMuted,
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
            <TouchableOpacity style={styles.secondaryButton} onPress={() => openEventModal(selectedDate)}>
              <Ionicons name="add-circle-outline" size={17} color={TEXT} />
              <Text style={styles.secondaryButtonText} numberOfLines={1}>Adicionar compromisso</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle} numberOfLines={1}>Dia selecionado</Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1}>{selectedDateLabel}</Text>
          </View>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCount}>{selectedEvents.length}</Text>
          </View>
        </View>

        {selectedEvents.length ? (
          <View style={styles.eventList}>
            {selectedEvents.map((event) => (
              <AgendaEventCard key={event.id} event={event} onPress={() => openStudent(event.studentId)} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-clear-outline" size={30} color={ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum compromisso neste dia</Text>
            <Text style={styles.emptyText}>Use o botão de adicionar para registrar um treino, avaliação ou retorno.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => openEventModal(selectedDate)}>
              <Text style={styles.emptyButtonText}>Adicionar compromisso</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle} numberOfLines={1}>Próximos horários</Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1}>Agenda em sequência</Text>
          </View>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCount}>{upcomingEvents.length}</Text>
          </View>
        </View>

        {upcomingEvents.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingRail}>
            {upcomingEvents.map((event) => (
              <TouchableOpacity key={event.id} style={styles.upcomingCard} onPress={() => openStudent(event.studentId)}>
                <View style={styles.upcomingDateBlock}>
                  <Text style={styles.upcomingDate} numberOfLines={1}>{formatShortDay(event.startAt)}</Text>
                  <Text style={styles.upcomingTime} numberOfLines={1}>{formatTime(event.startAt)}</Text>
                </View>
                <View style={styles.upcomingBody}>
                  <View style={styles.upcomingMetaRow}>
                    <View style={[styles.upcomingToneDot, { backgroundColor: getToneColor(event.tone) }]} />
                    <Text style={styles.upcomingType} numberOfLines={1}>{getTypeOption(event.type).label}</Text>
                  </View>
                  <Text style={styles.upcomingTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.upcomingStudent} numberOfLines={1}>{event.studentName ?? "Sem aluno vinculado"}</Text>
                </View>
              </TouchableOpacity>
            ))}
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
      <Ionicons name={icon} size={16} color={TEXT} />
      <View style={styles.metricTextBlock}>
        <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

function AgendaEventCard({ event, onPress }: { event: AgendaEvent; onPress: () => void }) {
  const typeOption = getTypeOption(event.type);
  const toneColor = getToneColor(event.tone);
  const hasStudent = Boolean(event.studentId);

  return (
    <TouchableOpacity
      style={styles.eventCard}
      activeOpacity={hasStudent ? 0.75 : 1}
      onPress={hasStudent ? onPress : undefined}
    >
      <View style={styles.eventTimeBlock}>
        <Text style={styles.eventTimeStart} numberOfLines={1}>{formatTime(event.startAt)}</Text>
        <Text style={styles.eventTimeEnd} numberOfLines={1}>{event.endAt ? formatTime(event.endAt) : ""}</Text>
      </View>

      <View style={styles.eventDivider}>
        <View style={[styles.eventMarker, { backgroundColor: toneColor }]} />
        <View style={styles.eventDividerLine} />
      </View>

      <View style={styles.eventBody}>
        <View style={styles.eventTopLine}>
          <View style={styles.eventTypeBadge}>
            <View style={[styles.eventTypeDot, { backgroundColor: toneColor }]} />
            <Text style={styles.eventType} numberOfLines={1}>{typeOption.label}</Text>
          </View>
          {hasStudent ? <Ionicons name="chevron-forward" size={18} color={SUBTLE} /> : null}
        </View>
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.eventDetail} numberOfLines={2}>{event.detail}</Text>
        <View style={styles.eventFooter}>
          {event.studentAvatar ? (
            <Image source={{ uri: event.studentAvatar }} style={styles.eventAvatar} />
          ) : (
            <View style={styles.eventAvatarFallback}>
              <Ionicons name="person-outline" size={13} color={MUTED} />
            </View>
          )}
          <Text style={styles.eventStudent} numberOfLines={1}>{event.studentName ?? "Sem aluno vinculado"}</Text>
          <View style={styles.eventStatus}>
            <Text style={styles.eventStatusText} numberOfLines={1}>{event.statusLabel}</Text>
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>Agenda</Text>
              <Text style={styles.modalTitle}>Novo compromisso</Text>
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={22} color={TEXT} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <Text style={styles.inputLabel}>Tipo</Text>
            <View style={styles.typeGrid}>
              {TYPE_OPTIONS.map((option) => {
                const active = draft.type === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.typeOption, active && styles.typeOptionActive]}
                    onPress={() => onChangeType(option.value)}
                  >
                    <Ionicons name={option.icon} size={19} color={active ? TEXT : ACCENT} />
                    <Text style={[styles.typeOptionText, active && styles.typeOptionTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Titulo</Text>
            <TextInput
              value={draft.title}
              onChangeText={(title) => onChangeDraft({ ...draft, title })}
              placeholder="Nome do compromisso"
              placeholderTextColor={SUBTLE}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Aluno</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentRail}>
              <TouchableOpacity
                style={[styles.studentChip, !draft.studentId && styles.studentChipActive]}
                onPress={() => onChangeDraft({ ...draft, studentId: "" })}
              >
                <Text style={[styles.studentChipText, !draft.studentId && styles.studentChipTextActive]}>Sem aluno</Text>
              </TouchableOpacity>
              {students.map((student) => {
                const active = draft.studentId === student.id;
                return (
                  <TouchableOpacity
                    key={student.id}
                    style={[styles.studentChip, active && styles.studentChipActive]}
                    onPress={() => onChangeDraft({ ...draft, studentId: student.id })}
                  >
                    {student.avatar ? <Image source={{ uri: student.avatar }} style={styles.studentChipAvatar} /> : null}
                    <Text style={[styles.studentChipText, active && styles.studentChipTextActive]} numberOfLines={1}>
                      {student.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Data</Text>
                <TextInput
                  value={draft.date}
                  onChangeText={(date) => onChangeDraft({ ...draft, date })}
                  placeholder="2026-08-15"
                  placeholderTextColor={SUBTLE}
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
              <View style={styles.formFieldSmall}>
                <Text style={styles.inputLabel}>Hora</Text>
                <TextInput
                  value={draft.time}
                  onChangeText={(time) => onChangeDraft({ ...draft, time })}
                  placeholder="08:00"
                  placeholderTextColor={SUBTLE}
                  keyboardType="numbers-and-punctuation"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Duracao em minutos</Text>
            <TextInput
              value={draft.duration}
              onChangeText={(duration) => onChangeDraft({ ...draft, duration })}
              placeholder="60"
              placeholderTextColor={SUBTLE}
              keyboardType="number-pad"
              style={styles.input}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={onSave} disabled={saving}>
              <Ionicons name="checkmark" size={19} color={TEXT} />
              <Text style={styles.saveButtonText}>{saving ? "Salvando..." : "Salvar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    paddingVertical: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD_ELEVATED,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  headerEyebrow: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36,
    letterSpacing: 0,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  summaryCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: ACCENT,
    overflow: "hidden",
    marginBottom: 14,
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
    minHeight: 56,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
    backgroundColor: "#0f0f0fff",
  },
  metricTextBlock: {
    minWidth: 0,
  },
  metricValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  metricLabel: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
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
    gap: 10,
    paddingBottom: 8,
  },
  upcomingCard: {
    width: 236,
    minHeight: 104,
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  upcomingDateBlock: {
    width: 58,
    minHeight: 58,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD_ELEVATED,
    borderWidth: 1,
    borderColor: BORDER,
  },
  upcomingDate: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  upcomingTime: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  upcomingBody: {
    flex: 1,
    minWidth: 0,
  },
  upcomingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  upcomingToneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  upcomingType: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  upcomingTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  upcomingStudent: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 9,
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
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  modalSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalEyebrow: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modalTitle: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 2,
  },
  modalClose: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FIELD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalContent: {
    padding: 22,
    gap: 12,
  },
  inputLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  typeOption: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: FIELD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  typeOptionActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  typeOptionText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "900",
  },
  typeOptionTextActive: {
    color: TEXT,
  },
  input: {
    minHeight: 54,
    borderRadius: 17,
    paddingHorizontal: 16,
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
    backgroundColor: FIELD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  studentRail: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 4,
  },
  studentChip: {
    maxWidth: 210,
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: FIELD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  studentChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  studentChipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  studentChipText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "900",
  },
  studentChipTextActive: {
    color: TEXT,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formField: {
    flex: 1,
    gap: 8,
  },
  formFieldSmall: {
    width: 118,
    gap: 8,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 22,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FIELD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelButtonText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "900",
  },
  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
});
