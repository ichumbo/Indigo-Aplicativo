import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

interface WaterRecord {
  consumed: number;
  history: number[];
}

export default function HydrationScreen() {
  const router = useRouter();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [metaAgua, setMetaAgua] = useState(2000);
  const metas = [1500, 2000, 2500, 3000];
  const copos = [250, 300, 500, 750];

  const [waterData, setWaterData] = useState<Record<string, WaterRecord>>({
    [todayStr]: { consumed: 1200, history: [300, 250, 350, 300] },
    "2024-09-25": { consumed: 800, history: [250, 250, 300] },
    "2024-09-26": { consumed: 1200, history: [250, 300, 350, 300] },
    "2024-09-27": { consumed: 1500, history: [500, 500, 500] },
  });

  const currentDayData = waterData[selectedDate] || { consumed: 0, history: [] };
  const aguaBebida = currentDayData.consumed;
  const waterHistory = currentDayData.history;

  const porcentagem = Math.min(100, Math.max(0, Math.round((aguaBebida / metaAgua) * 100)));
  const restante = Math.max(0, metaAgua - aguaBebida);

  const adicionarAgua = (quantidade: number) => {
    if (quantidade <= 0) return;
    setWaterData((prev) => {
      const cur = prev[selectedDate] || { consumed: 0, history: [] };
      const newConsumed = cur.consumed + quantidade;
      const newHistory = [quantidade, ...cur.history];

      return {
        ...prev,
        [selectedDate]: {
          consumed: newConsumed,
          history: newHistory,
        },
      };
    });
  };

  const handleCustomAdd = () => {
    const val = parseInt(customAmount, 10);
    if (val > 0) {
      adicionarAgua(val);
      setCustomAmount("");
      setShowCustomModal(false);
    } else {
      Alert.alert("Valor inválido", "Por favor, digite uma quantidade em ml.");
    }
  };

  const removerUltimo = () => {
    if (!waterHistory.length) {
      Alert.alert("Sem registros", "Nenhum registro para remover neste dia.");
      return;
    }
    const lastAmount = waterHistory[0];
    setWaterData((prev) => {
      const cur = prev[selectedDate] || { consumed: 0, history: [] };
      const newConsumed = Math.max(0, cur.consumed - lastAmount);
      const newHistory = cur.history.slice(1);

      return {
        ...prev,
        [selectedDate]: {
          consumed: newConsumed,
          history: newHistory,
        },
      };
    });
  };

  const formatMonthTitle = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // 7 dias ao redor da data selecionada
  const weekDays = useMemo(() => {
    const base = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = base.getDay(); // 0 = Dom
    const start = new Date(base);
    start.setDate(base.getDate() - dayOfWeek); // Começa no domingo

    const days = [];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        name: dayNames[i],
        number: d.getDate(),
        iso,
        isToday: iso === todayStr,
        isSelected: iso === selectedDate,
      });
    }
    return days;
  }, [selectedDate, todayStr]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header Superior */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Hidratação</Text>
          <Text style={styles.headerSubtitle}>Acompanhamento Diário</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowCalendar(!showCalendar)}
          style={[styles.calendarIconButton, showCalendar && styles.calendarIconButtonActive]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showCalendar ? "calendar" : "calendar-outline"}
            size={18}
            color={showCalendar ? "#00A3FF" : "#FFFFFF"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendário Expansível */}
        {showCalendar && (
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeaderRow}>
              <Text style={styles.calendarCardTitle}>Selecione o Dia</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                style={styles.calendarCloseBtn}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#00A3FF",
                  selectedTextColor: "#FFFFFF",
                },
              }}
              theme={{
                backgroundColor: "#161616",
                calendarBackground: "#161616",
                textSectionTitleColor: "#888888",
                selectedDayBackgroundColor: "#00A3FF",
                selectedDayTextColor: "#FFFFFF",
                todayTextColor: "#00A3FF",
                dayTextColor: "#FFFFFF",
                textDisabledColor: "#444444",
                dotColor: "#00A3FF",
                selectedDotColor: "#FFFFFF",
                arrowColor: "#00A3FF",
                monthTextColor: "#FFFFFF",
                indicatorColor: "#00A3FF",
                textDayFontWeight: "700",
                textMonthFontWeight: "800",
                textDayHeaderFontWeight: "700",
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
        )}

        {/* Barra Seletora de Dias da Semana */}
        <View style={styles.weekSection}>
          <View style={styles.monthHeaderRow}>
            <Text style={styles.monthTitleText}>{formatMonthTitle(selectedDate)}</Text>
            {selectedDate !== todayStr && (
              <TouchableOpacity
                onPress={() => setSelectedDate(todayStr)}
                style={styles.todayPill}
                activeOpacity={0.8}
              >
                <Text style={styles.todayPillText}>Ir para Hoje</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((item) => (
              <TouchableOpacity
                key={item.iso}
                style={[
                  styles.dayCard,
                  item.isSelected && styles.dayCardSelected,
                  item.isToday && !item.isSelected && styles.dayCardToday,
                ]}
                onPress={() => setSelectedDate(item.iso)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    item.isSelected && styles.dayNameTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.dayNumberText,
                    item.isSelected && styles.dayNumberTextSelected,
                  ]}
                >
                  {item.number}
                </Text>
                {item.isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* HERO CARD: Garrafa Minimalista + Painel de Progresso */}
        <View style={styles.heroCard}>
          {/* Header do Hero */}
          <View style={styles.heroHeader}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.waterDropIconBox}>
                <Ionicons name="water" size={16} color="#00A3FF" />
              </View>
              <Text style={styles.heroBadgeTitle}>Meta Diária: {metaAgua.toLocaleString("pt-BR")}ml</Text>
            </View>

            <View style={styles.progressPercentPill}>
              <Text style={styles.progressPercentText}>{porcentagem}%</Text>
            </View>
          </View>

          {/* Conteúdo Principal (Garrafa + Métricas) */}
          <View style={styles.heroContentRow}>
            {/* Garrafa Minimalista */}
            <View style={styles.bottleContainer}>
              <View style={styles.bottleCap} />
              <View style={styles.bottleNeck} />
              <View style={styles.bottleBody}>
                {/* Preenchimento Sólido de Água */}
                <View
                  style={[
                    styles.waterFill,
                    { height: `${Math.min(100, porcentagem)}%` },
                  ]}
                />

                {/* Linha da Superfície da Água */}
                {porcentagem > 0 && porcentagem < 100 && (
                  <View
                    style={[
                      styles.waterSurfaceLine,
                      { bottom: `${porcentagem}%` },
                    ]}
                  />
                )}

                {/* Marcadores de Nível */}
                <View style={[styles.bottleTick, { bottom: "75%" }]} />
                <View style={[styles.bottleTick, { bottom: "50%" }]} />
                <View style={[styles.bottleTick, { bottom: "25%" }]} />

                {/* Reflexo Flat Minimalista */}
                <View style={styles.glassReflection} />
              </View>
            </View>

            {/* Painel Lateral de Métricas e Histórico */}
            <View style={styles.metricsCol}>
              {/* Bloco de Métricas */}
              <View style={styles.metricsPanel}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValueText}>{aguaBebida.toLocaleString("pt-BR")}</Text>
                  <Text style={styles.metricLabelText}>ml bebidos</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={[styles.metricValueText, styles.metricValueHighlight]}>
                    {restante.toLocaleString("pt-BR")}
                  </Text>
                  <Text style={styles.metricLabelText}>ml restantes</Text>
                </View>
              </View>

              {/* Histórico Recente do Dia */}
              <View style={styles.recentLogsSection}>
                <View style={styles.recentLogsHeader}>
                  <Text style={styles.recentLogsTitle}>HISTÓRICO RECENTE</Text>
                  {waterHistory.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowHistoryModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.seeAllText}>Ver todos ({waterHistory.length})</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.recentLogsRow}>
                  {waterHistory.length > 0 ? (
                    waterHistory.slice(0, 3).map((amount, idx) => (
                      <View key={idx} style={styles.recentLogChip}>
                        <Ionicons name="water" size={13} color="#00A3FF" />
                        <Text style={styles.recentLogChipText}>+{amount}ml</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyRecentBox}>
                      <Text style={styles.emptyRecentText}>Nenhum registro hoje</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SEÇÃO 1: ADICIONAR ÁGUA RÁPIDO */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionTitleRow}>
              <View style={styles.actionIconBoxBlue}>
                <Ionicons name="add-circle" size={18} color="#00A3FF" />
              </View>
              <Text style={styles.actionCardTitle}>Adicionar Água</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowCustomModal(true)}
              style={styles.customAddBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={14} color="#00A3FF" />
              <Text style={styles.customAddBtnText}>Outro valor</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cupsGrid}>
            {copos.map((quantidade) => (
              <TouchableOpacity
                key={quantidade}
                style={styles.cupActionBtn}
                onPress={() => adicionarAgua(quantidade)}
                activeOpacity={0.75}
              >
                <View style={styles.cupIconCircle}>
                  <Ionicons name="water" size={18} color="#00A3FF" />
                </View>
                <Text style={styles.cupActionAmountText}>+{quantidade}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SEÇÃO 2: DEFINIR META DIÁRIA */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionTitleRow}>
              <View style={styles.actionIconBoxRed}>
                <Ionicons name="flag" size={16} color="#D90000" />
              </View>
              <Text style={styles.actionCardTitle}>Meta Diária</Text>
            </View>
            <Text style={styles.currentGoalHint}>{metaAgua.toLocaleString("pt-BR")}ml / dia</Text>
          </View>

          <View style={styles.goalsRow}>
            {metas.map((meta) => {
              const isActive = metaAgua === meta;
              return (
                <TouchableOpacity
                  key={meta}
                  style={[styles.goalPill, isActive && styles.goalPillActive]}
                  onPress={() => setMetaAgua(meta)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.goalPillText, isActive && styles.goalPillTextActive]}>
                    {meta.toLocaleString("pt-BR")}ml
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SEÇÃO 3: DESFAZER / REMOVER ÚLTIMO REGISTRO */}
        {waterHistory.length > 0 && (
          <TouchableOpacity
            style={styles.undoCard}
            onPress={removerUltimo}
            activeOpacity={0.8}
          >
            <View style={styles.undoLeft}>
              <View style={styles.undoIconBox}>
                <Ionicons name="arrow-undo-outline" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.undoTitle}>Desfazer último registro</Text>
                <Text style={styles.undoSubtitle}>Remover +{waterHistory[0]}ml do total de hoje</Text>
              </View>
            </View>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL PARA VALOR PERSONALIZADO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCustomModal}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderIconBox}>
                <Ionicons name="water" size={20} color="#00A3FF" />
              </View>
              <Text style={styles.modalHeaderTitle}>Adicionar Quantidade</Text>
            </View>

            <Text style={styles.modalInputLabel}>Digite a quantidade em ml:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 400"
              placeholderTextColor="#666666"
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCustomModal(false);
                  setCustomAmount("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCustomAdd}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE HISTÓRICO COMPLETO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showHistoryModal}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderIconBox}>
                <Ionicons name="list" size={20} color="#00A3FF" />
              </View>
              <Text style={styles.modalHeaderTitle}>Histórico do Dia</Text>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={styles.modalCloseIconBtn}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyListScroll}>
              {waterHistory.map((amount, idx) => (
                <View key={idx} style={styles.historyListItem}>
                  <View style={styles.historyItemLeft}>
                    <View style={styles.historyItemIconBox}>
                      <Ionicons name="water" size={16} color="#00A3FF" />
                    </View>
                    <Text style={styles.historyItemAmountText}>+{amount} ml</Text>
                  </View>
                  <Text style={styles.historyItemTimeText}>Registro #{waterHistory.length - idx}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setShowHistoryModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#777777",
    marginTop: 1,
  },
  calendarIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarIconButtonActive: {
    borderColor: "rgba(0, 163, 255, 0.4)",
    backgroundColor: "rgba(0, 163, 255, 0.12)",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  calendarCard: {
    backgroundColor: "#161616",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarCardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  calendarCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  weekSection: {
    gap: 10,
  },
  monthHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  monthTitleText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  todayPill: {
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayPillText: {
    color: "#00A3FF",
    fontSize: 11,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayCard: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 10,
    alignItems: "center",
    position: "relative",
  },
  dayCardSelected: {
    backgroundColor: "#00A3FF",
    borderColor: "#00A3FF",
  },
  dayCardToday: {
    borderColor: "rgba(0, 163, 255, 0.4)",
    backgroundColor: "rgba(0, 163, 255, 0.08)",
  },
  dayNameText: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  dayNameTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayNumberText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  dayNumberTextSelected: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00A3FF",
    position: "absolute",
    bottom: 4,
  },
  heroCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 18,
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waterDropIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  progressPercentPill: {
    backgroundColor: "rgba(0, 163, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.35)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  progressPercentText: {
    color: "#00A3FF",
    fontSize: 14,
    fontWeight: "900",
  },
  heroContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  bottleContainer: {
    alignItems: "center",
    width: 80,
  },
  bottleCap: {
    width: 28,
    height: 8,
    backgroundColor: "#00A3FF",
    borderRadius: 3,
    marginBottom: 2,
  },
  bottleNeck: {
    width: 32,
    height: 8,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(0, 163, 255, 0.4)",
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginBottom: 2,
  },
  bottleBody: {
    width: 80,
    height: 160,
    backgroundColor: "#0C121C",
    borderWidth: 2,
    borderColor: "#00A3FF",
    borderRadius: 24,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
  },
  waterFill: {
    width: "100%",
    backgroundColor: "#00A3FF",
    position: "absolute",
    bottom: 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  waterSurfaceLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#FFFFFF",
    opacity: 0.7,
  },
  bottleTick: {
    position: "absolute",
    right: 0,
    width: 10,
    height: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  glassReflection: {
    position: "absolute",
    left: 6,
    top: 10,
    bottom: 10,
    width: 4,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 2,
  },
  metricsCol: {
    flex: 1,
    gap: 12,
  },
  metricsPanel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricValueText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  metricValueHighlight: {
    color: "#00A3FF",
  },
  metricLabelText: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#262626",
    marginHorizontal: 4,
  },
  recentLogsSection: {
    backgroundColor: "#111111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 12,
    gap: 8,
  },
  recentLogsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recentLogsTitle: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  seeAllText: {
    color: "#00A3FF",
    fontSize: 11,
    fontWeight: "700",
  },
  recentLogsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  recentLogChip: {
    backgroundColor: "#1C1C1C",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  recentLogChipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyRecentBox: {
    paddingVertical: 4,
  },
  emptyRecentText: {
    color: "#555555",
    fontSize: 11,
    fontWeight: "600",
  },
  actionCard: {
    backgroundColor: "#161616",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    gap: 14,
  },
  actionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconBoxBlue: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBoxRed: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  customAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  customAddBtnText: {
    color: "#00A3FF",
    fontSize: 12,
    fontWeight: "700",
  },
  currentGoalHint: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  cupsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  cupActionBtn: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  cupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0, 163, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cupActionAmountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  goalsRow: {
    flexDirection: "row",
    gap: 8,
  },
  goalPill: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    paddingVertical: 10,
    alignItems: "center",
  },
  goalPillActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  goalPillText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  goalPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  undoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    padding: 14,
  },
  undoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  undoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  undoTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  undoSubtitle: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  modalHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0, 163, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
  },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  modalInputLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#222222",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#AAAAAA",
    fontSize: 14,
    fontWeight: "700",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "#00A3FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  historyListScroll: {
    maxHeight: 280,
    marginVertical: 10,
  },
  historyListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  historyItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyItemIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyItemAmountText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  historyItemTimeText: {
    color: "#666666",
    fontSize: 11,
    fontWeight: "600",
  },
  modalDoneButton: {
    backgroundColor: "#222222",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalDoneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
