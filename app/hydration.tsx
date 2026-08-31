import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

import ModernBottleVisualizer from "@/components/ModernBottleVisualizer";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  calculatePersonalizedHydration,
  DailyHydrationRecord,
  deleteWaterLog,
  getDailyHydrationRecord,
  getTodayDateString,
  recordWaterIntake,
  updateDailyHydrationGoal,
} from "@/services/hydration-service";

const METAS_RAPIDAS = [1500, 2000, 2500, 3000, 3500];

const QUICK_CUPS = [
  { amount: 200, label: "Copo", icon: "water-outline" as const, source: "cup" as const },
  { amount: 300, label: "Copo Cheio", icon: "water" as const, source: "cup" as const },
  { amount: 500, label: "Garrafinha", icon: "fitness-outline" as const, source: "bottle" as const },
  { amount: 750, label: "Shaker / Squeeze", icon: "flash-outline" as const, source: "shaker" as const },
];

export default function HydrationScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [showCalendar, setShowCalendar] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);

  const [customAmount, setCustomAmount] = useState("");
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [dayRecord, setDayRecord] = useState<DailyHydrationRecord>({
    date: todayStr,
    targetMl: 2000,
    consumedMl: 1200,
    logs: [],
  });

  // Calculadora personalizada
  const [calcWeight, setCalcWeight] = useState("75");
  const [calcActivity, setCalcActivity] = useState("60");
  const [calcIntensity, setCalcIntensity] = useState<"low" | "moderate" | "high">("moderate");

  useEffect(() => {
    void loadData(selectedDate);
  }, [selectedDate]);

  const loadData = async (date: string) => {
    const data = await getDailyHydrationRecord(date);
    setDayRecord(data);
  };

  const aguaBebida = dayRecord.consumedMl;
  const metaAgua = dayRecord.targetMl;
  const waterHistory = dayRecord.logs;

  const porcentagem = Math.min(100, Math.max(0, Math.round((aguaBebida / metaAgua) * 100)));
  const restante = Math.max(0, metaAgua - aguaBebida);
  const coposRestantes = Math.ceil(restante / 250);

  const calculatedPlan = useMemo(() => {
    const w = parseFloat(calcWeight) || 75;
    const a = parseInt(calcActivity, 10) || 0;
    return calculatePersonalizedHydration({
      weightKg: w,
      activityMinutes: a,
      activityIntensity: calcIntensity,
    });
  }, [calcWeight, calcActivity, calcIntensity]);

  const adicionarAgua = async (quantidade: number, source: "cup" | "bottle" | "shaker" | "custom" = "cup") => {
    if (quantidade <= 0) return;
    const updated = await recordWaterIntake(quantidade, source, selectedDate);
    setDayRecord(updated);
  };

  const handleCustomAdd = async () => {
    const val = parseInt(customAmount, 10);
    if (val > 0 && val <= 5000) {
      await adicionarAgua(val, "custom");
      setCustomAmount("");
      setShowCustomModal(false);
    } else {
      Alert.alert("Valor inválido", "Por favor, digite uma quantidade válida em ml (ex: 350).");
    }
  };

  const handleApplyCalculatedGoal = async () => {
    const updated = await updateDailyHydrationGoal(calculatedPlan.targetMl, selectedDate);
    setDayRecord(updated);
    setShowCalculatorModal(false);
  };

  const removerRegistro = async (id: string) => {
    const updated = await deleteWaterLog(id, selectedDate);
    setDayRecord(updated);
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
    const dayOfWeek = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - dayOfWeek);

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* HEADER SUPERIOR */}
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Hidratação</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Acompanhamento Diário</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowCalendar(!showCalendar)}
          style={[
            styles.calendarIconButton,
            { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
            showCalendar && styles.calendarIconButtonActive,
          ]}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Calendário"
        >
          <Ionicons
            name={showCalendar ? "calendar" : "calendar-outline"}
            size={20}
            color={showCalendar ? "#00A3FF" : theme.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CALENDÁRIO EXPANSÍVEL */}
        {showCalendar && (
          <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.calendarHeaderRow}>
              <Text style={[styles.calendarCardTitle, { color: theme.text }]}>Selecionar Data</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                style={[styles.calendarCloseBtn, { backgroundColor: theme.cardSecondary }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
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
                  selectedTextColor: "#ffffff",
                },
              }}
              theme={{
                backgroundColor: theme.card,
                calendarBackground: theme.card,
                textSectionTitleColor: theme.textSecondary,
                selectedDayBackgroundColor: "#00A3FF",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#00A3FF",
                dayTextColor: theme.text,
                textDisabledColor: theme.textMuted,
                dotColor: "#00A3FF",
                selectedDotColor: "#ffffff",
                arrowColor: "#00A3FF",
                monthTextColor: theme.text,
                indicatorColor: "#00A3FF",
                textDayFontWeight: "700",
                textMonthFontWeight: "900",
                textDayHeaderFontWeight: "700",
                textDayFontSize: 13,
                textMonthFontSize: 15,
                textDayHeaderFontSize: 11,
              }}
            />
          </View>
        )}

        {/* SELETOR DE DIAS DA SEMANA */}
        <View style={styles.weekSection}>
          <View style={styles.monthHeaderRow}>
            <Text style={[styles.monthTitleText, { color: theme.text }]}>{formatMonthTitle(selectedDate)}</Text>
            {selectedDate !== todayStr && (
              <TouchableOpacity
                onPress={() => setSelectedDate(todayStr)}
                style={styles.todayPill}
                activeOpacity={0.8}
              >
                <Text style={styles.todayPillText}>Hoje</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((item) => (
              <TouchableOpacity
                key={item.iso}
                style={[
                  styles.dayCard,
                  { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
                  item.isSelected && styles.dayCardSelected,
                  item.isToday && !item.isSelected && styles.dayCardToday,
                ]}
                onPress={() => setSelectedDate(item.iso)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    { color: theme.textSecondary },
                    item.isSelected && styles.dayNameTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.dayNumberText,
                    { color: theme.text },
                    item.isSelected && styles.dayNumberTextSelected,
                  ]}
                >
                  {item.number}
                </Text>
                {item.isToday && !item.isSelected && <View style={styles.todayDot} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* HERO CARD: GARRAFA ESPORTIVA REALISTA + MÉTRICAS */}
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.waterDropIconBox}>
                <Ionicons name="water" size={15} color="#00A3FF" />
              </View>
              <Text style={[styles.heroBadgeTitle, { color: theme.textSecondary }]}>
                Meta Diária: <Text style={[styles.whiteBold, { color: theme.text }]}>{metaAgua.toLocaleString("pt-BR")} ml</Text>
              </Text>
            </View>

            <View style={styles.progressPercentPill}>
              <Text style={styles.progressPercentText}>{porcentagem}%</Text>
            </View>
          </View>

          <View style={styles.heroContentRow}>
            {/* Garrafa Grande de Alta Precisão */}
            <View style={styles.bottleCenterWrap}>
              <ModernBottleVisualizer
                consumedMl={aguaBebida}
                targetMl={metaAgua}
                size="large"
              />
            </View>

            {/* Métricas e Estatísticas */}
            <View style={styles.metricsCol}>
              <View style={[styles.kpiContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>CONSUMIDO</Text>
                  <View style={styles.kpiValueRow}>
                    <Text style={[styles.kpiNumber, { color: theme.text }]}>{aguaBebida.toLocaleString("pt-BR")}</Text>
                    <Text style={[styles.kpiUnit, { color: theme.textSecondary }]}>ml</Text>
                  </View>
                </View>

                <View style={[styles.kpiDivider, { backgroundColor: theme.divider }]} />

                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>RESTANTE</Text>
                  <View style={styles.kpiValueRow}>
                    <Text style={[styles.kpiNumber, styles.kpiNumberCyan]}>
                      {restante.toLocaleString("pt-BR")}
                    </Text>
                    <Text style={[styles.kpiUnit, styles.kpiNumberCyan]}>ml</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.insightBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <Ionicons
                  name={porcentagem >= 100 ? "checkmark-circle" : "water-outline"}
                  size={14}
                  color={porcentagem >= 100 ? "#10b981" : "#00A3FF"}
                />
                <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                  {porcentagem >= 100
                    ? "Meta diária alcançada com sucesso!"
                    : `Restam aproximadamente ${coposRestantes} copo${coposRestantes > 1 ? "s" : ""} de 250ml.`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.calcTriggerBtn}
                onPress={() => setShowCalculatorModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calculator-outline" size={13} color="#00A3FF" />
                <Text style={styles.calcTriggerBtnText}>Calcular Meta Científica</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SEÇÃO 1: ADICIONAR ÁGUA (TILES MINIMALISTAS) */}
        <View style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionTitleRow}>
              <Ionicons name="add-circle-outline" size={16} color="#00A3FF" />
              <Text style={[styles.actionCardTitle, { color: theme.text }]}>Registro Rápido de Água</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowCustomModal(true)}
              style={[styles.customAddBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, borderWidth: 1 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={12} color="#00A3FF" />
              <Text style={styles.customAddBtnText}>Outro valor</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cupsGrid}>
            {QUICK_CUPS.map((copo) => (
              <TouchableOpacity
                key={copo.amount}
                style={[styles.cupActionBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
                onPress={() => adicionarAgua(copo.amount, copo.source)}
                activeOpacity={0.8}
              >
                <View style={[styles.cupIconCircle, { backgroundColor: theme.card }]}>
                  <Ionicons name={copo.icon} size={16} color="#00A3FF" />
                </View>
                <Text style={[styles.cupActionAmountText, { color: theme.text }]}>+{copo.amount} ml</Text>
                <Text style={[styles.cupActionLabelText, { color: theme.textSecondary }]}>{copo.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SEÇÃO 2: DEFINIR META DIÁRIA */}
        <View style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionTitleRow}>
              <Ionicons name="flag-outline" size={15} color="#D90000" />
              <Text style={[styles.actionCardTitle, { color: theme.text }]}>Meta Diária Manual</Text>
            </View>
            <Text style={[styles.currentGoalHint, { color: theme.textSecondary }]}>{metaAgua.toLocaleString("pt-BR")} ml/dia</Text>
          </View>

          <View style={styles.goalsRow}>
            {METAS_RAPIDAS.map((meta) => {
              const isActive = metaAgua === meta;
              return (
                <TouchableOpacity
                  key={meta}
                  style={[styles.goalPill, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }, isActive && styles.goalPillActive]}
                  onPress={() => updateDailyHydrationGoal(meta, selectedDate).then(setDayRecord)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.goalPillText, { color: theme.textSecondary }, isActive && styles.goalPillTextActive]}>
                    {(meta / 1000).toFixed(1)}L
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SEÇÃO 3: HISTÓRICO DE CONSUMO DO DIA */}
        <View style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionTitleRow}>
              <Ionicons name="time-outline" size={15} color="#888" />
              <Text style={[styles.actionCardTitle, { color: theme.text }]}>Registros de Hoje</Text>
            </View>
            <Text style={[styles.historyCountText, { color: theme.textSecondary }]}>{waterHistory.length} registro(s)</Text>
          </View>

          <View style={styles.historyList}>
            {waterHistory.length > 0 ? (
              waterHistory.map((item) => (
                <View key={item.id} style={styles.historyItemRow}>
                  <View style={styles.historyItemLeft}>
                    <View style={styles.historyItemIconBox}>
                      <Ionicons
                        name={
                          item.source === "bottle"
                            ? "fitness-outline"
                            : item.source === "shaker"
                            ? "flash-outline"
                            : "water"
                        }
                        size={13}
                        color="#00A3FF"
                      />
                    </View>
                    <View>
                      <Text style={styles.historyItemAmount}>+{item.amount} ml</Text>
                      <Text style={styles.historyItemTime}>{item.timeFormatted}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => removerRegistro(item.id)}
                    style={styles.historyDeleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#666" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistoryBox}>
                <Ionicons name="water-outline" size={24} color="#444" />
                <Text style={styles.emptyHistoryText}>Nenhum registro de água nesta data.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* MODAL: CALCULADORA DE HIDRATAÇÃO PERSONALIZADA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCalculatorModal}
        onRequestClose={() => setShowCalculatorModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Ionicons name="calculator" size={18} color="#00A3FF" />
                <Text style={styles.modalTitle}>Calculadora Científica</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCalculatorModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Cálculo baseado em diretrizes clínicas (35ml/kg + reposição de treino).
            </Text>

            {/* Input Peso */}
            <Text style={styles.inputFieldLabel}>Seu Peso Atual (kg)</Text>
            <View style={styles.calcInputRow}>
              <TextInput
                style={styles.modalTextInput}
                value={calcWeight}
                onChangeText={setCalcWeight}
                keyboardType="numeric"
              />
              <Text style={styles.customInputUnit}>kg</Text>
            </View>

            {/* Input Treino */}
            <Text style={styles.inputFieldLabel}>Tempo de Treino Diário (min)</Text>
            <View style={styles.calcInputRow}>
              <TextInput
                style={styles.modalTextInput}
                value={calcActivity}
                onChangeText={setCalcActivity}
                keyboardType="numeric"
              />
              <Text style={styles.customInputUnit}>min</Text>
            </View>

            {/* Intensidade */}
            <Text style={styles.inputFieldLabel}>Intensidade do Treino</Text>
            <View style={styles.intensityRow}>
              <TouchableOpacity
                style={[styles.intensityPill, calcIntensity === "low" && styles.intensityPillActive]}
                onPress={() => setCalcIntensity("low")}
              >
                <Text style={[styles.intensityText, calcIntensity === "low" && styles.intensityTextActive]}>
                  Leve
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.intensityPill, calcIntensity === "moderate" && styles.intensityPillActive]}
                onPress={() => setCalcIntensity("moderate")}
              >
                <Text style={[styles.intensityText, calcIntensity === "moderate" && styles.intensityTextActive]}>
                  Moderada
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.intensityPill, calcIntensity === "high" && styles.intensityPillActive]}
                onPress={() => setCalcIntensity("high")}
              >
                <Text style={[styles.intensityText, calcIntensity === "high" && styles.intensityTextActive]}>
                  Intensa
                </Text>
              </TouchableOpacity>
            </View>

            {/* Resultado do Cálculo */}
            <View style={styles.calcResultBox}>
              <Text style={styles.calcResultLabel}>META RECOMENDADA</Text>
              <Text style={styles.calcResultValue}>{calculatedPlan.targetMl} ml / dia</Text>
              <Text style={styles.calcResultSub}>
                Base: {calculatedPlan.baseMl}ml + Reposição: {calculatedPlan.exerciseAddonMl}ml
              </Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCalculatorModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleApplyCalculatedGoal}
                activeOpacity={0.84}
              >
                <Text style={styles.modalConfirmBtnText}>Aplicar Meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA VALOR PERSONALIZADO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCustomModal}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Ionicons name="water" size={18} color="#00A3FF" />
                <Text style={styles.modalTitle}>Quantidade Personalizada</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomModal(false);
                  setCustomAmount("");
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Informe o volume em mililitros (ml):</Text>

            <View style={styles.customInputRow}>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Ex: 350"
                placeholderTextColor="#555"
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="numeric"
                autoFocus
              />
              <Text style={styles.customInputUnit}>ml</Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowCustomModal(false);
                  setCustomAmount("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCustomAdd}
                activeOpacity={0.84}
              >
                <Text style={styles.modalConfirmBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  calendarIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarIconButtonActive: {
    borderColor: "#00A3FF",
    backgroundColor: "rgba(0, 163, 255, 0.12)",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  calendarCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calendarCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  calendarCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
  },
  weekSection: {
    gap: 8,
  },
  monthHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  monthTitleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  todayPill: {
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayPillText: {
    color: "#00A3FF",
    fontSize: 10,
    fontWeight: "800",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 8,
    alignItems: "center",
    position: "relative",
  },
  dayCardSelected: {
    backgroundColor: "#00A3FF",
    borderColor: "#00A3FF",
  },
  dayCardToday: {
    borderColor: "rgba(0, 163, 255, 0.4)",
    backgroundColor: "rgba(0, 163, 255, 0.06)",
  },
  dayNameText: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 3,
  },
  dayNameTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
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
    bottom: 3,
  },
  heroCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 16,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waterDropIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeTitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  whiteBold: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  progressPercentPill: {
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.25)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  progressPercentText: {
    color: "#00A3FF",
    fontSize: 12,
    fontWeight: "900",
  },
  heroContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  bottleCenterWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  metricsCol: {
    flex: 1,
  },
  kpiContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#202020",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  kpiBox: {
    flex: 1,
    alignItems: "center",
  },
  kpiLabel: {
    color: "#666666",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  kpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  kpiNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  kpiNumberCyan: {
    color: "#00A3FF",
  },
  kpiUnit: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#222222",
    marginHorizontal: 4,
  },
  insightBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#101010",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "600",
    lineHeight: 14,
  },
  calcTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(0, 163, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 163, 255, 0.2)",
    paddingVertical: 6,
    borderRadius: 8,
  },
  calcTriggerBtnText: {
    color: "#00A3FF",
    fontSize: 10.5,
    fontWeight: "800",
  },
  actionCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 16,
  },
  actionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCardTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  customAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 163, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customAddBtnText: {
    color: "#00A3FF",
    fontSize: 10.5,
    fontWeight: "800",
  },
  cupsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  cupActionBtn: {
    flex: 1,
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 12,
    alignItems: "center",
  },
  cupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 163, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  cupActionAmountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  cupActionLabelText: {
    color: "#666666",
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 2,
  },
  currentGoalHint: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  goalsRow: {
    flexDirection: "row",
    gap: 6,
  },
  goalPill: {
    flex: 1,
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 8,
    alignItems: "center",
  },
  goalPillActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  goalPillText: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "800",
  },
  goalPillTextActive: {
    color: "#FFFFFF",
  },
  historyCountText: {
    color: "#666666",
    fontSize: 11,
    fontWeight: "700",
  },
  historyList: {
    gap: 6,
  },
  historyItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  historyItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyItemIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(0, 163, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyItemAmount: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "900",
  },
  historyItemTime: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "600",
  },
  historyDeleteBtn: {
    padding: 4,
  },
  emptyHistoryBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 6,
  },
  emptyHistoryText: {
    color: "#555555",
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#262626",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitle: {
    color: "#888888",
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  inputFieldLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 6,
  },
  calcInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  intensityRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  intensityPill: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#242424",
    paddingVertical: 7,
    alignItems: "center",
  },
  intensityPillActive: {
    backgroundColor: "#00A3FF",
    borderColor: "#00A3FF",
  },
  intensityText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
  },
  intensityTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  calcResultBox: {
    backgroundColor: "#0d131a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2c3d",
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  calcResultLabel: {
    color: "#00A3FF",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  calcResultValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginVertical: 2,
  },
  calcResultSub: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "600",
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  modalTextInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    paddingVertical: 8,
  },
  customInputUnit: {
    color: "#777777",
    fontSize: 13,
    fontWeight: "800",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#202020",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "800",
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: "#00A3FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
