import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { useResponsiveLayout } from "@/constants/responsive";

const STORAGE_KEY = "@indigo/weight_progress_store/v2";

type WeightRecord = {
  id: string;
  date: string; // "DD/MM" or "YYYY-MM-DD"
  fullDate: string; // "29 Dez 2024"
  weight: number;
  note?: string;
};

type WeightGoalConfig = {
  startWeight: number;
  goalWeight: number;
  startDate: string;
};

const DEFAULT_GOAL: WeightGoalConfig = {
  startWeight: 78.0,
  goalWeight: 72.0,
  startDate: "15 Jan 2024",
};

const DEFAULT_RECORDS: WeightRecord[] = [
  { id: "1", date: "01/12", fullDate: "01 Dez 2024", weight: 75.2, note: "Pós-treino em jejum" },
  { id: "2", date: "08/12", fullDate: "08 Dez 2024", weight: 74.8, note: "Manhã" },
  { id: "3", date: "15/12", fullDate: "15 Dez 2024", weight: 74.5, note: "Após cardio" },
  { id: "4", date: "22/12", fullDate: "22 Dez 2024", weight: 74.1, note: "Em jejum" },
  { id: "5", date: "29/12", fullDate: "29 Dez 2024", weight: 73.8, note: "Avaliação semanal" },
];

const PERIOD_OPTIONS = ["Semanal", "Mensal", "Anual"];

export default function WeightProgressScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();

  const [records, setRecords] = useState<WeightRecord[]>(DEFAULT_RECORDS);
  const [goalConfig, setGoalConfig] = useState<WeightGoalConfig>(DEFAULT_GOAL);
  const [selectedPeriod, setSelectedPeriod] = useState("Mensal");
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(records.length - 1);

  // Modal States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  // Form States for New Weight
  const [newWeight, setNewWeight] = useState("");
  const [newNote, setNewNote] = useState("");

  // Form States for Goal Config
  const [configForm, setConfigForm] = useState({
    startWeight: "78.0",
    goalWeight: "72.0",
    startDate: "15 Jan 2024",
  });

  // Load from Storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.records) setRecords(parsed.records);
          if (parsed.goalConfig) setGoalConfig(parsed.goalConfig);
        }
      } catch {
        // Fallback to default state
      }
    })();
  }, []);

  const saveState = async (newRecords: WeightRecord[], newGoal: WeightGoalConfig) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ records: newRecords, goalConfig: newGoal })
      );
    } catch {
      // Ignore
    }
  };

  // Calculations
  const currentWeight = records.length > 0 ? records[records.length - 1].weight : goalConfig.startWeight;
  const initialWeight = goalConfig.startWeight;
  const targetWeight = goalConfig.goalWeight;

  const totalToLose = Math.max(0.1, initialWeight - targetWeight);
  const totalLost = Math.max(0, initialWeight - currentWeight);
  const remainingWeight = Math.max(0, currentWeight - targetWeight);
  const progressPercentage = Math.min(100, Math.max(0, Math.round((totalLost / totalToLose) * 100)));

  // Handle Adding New Weigh-in
  const handleAddWeight = () => {
    const val = parseFloat(newWeight.replace(",", "."));
    if (isNaN(val) || val <= 30 || val >= 300) {
      Alert.alert("Valor inválido", "Informe um peso válido (ex: 74.2).");
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const newRec: WeightRecord = {
      id: `weight-${Date.now()}`,
      date: `${day}/${month}`,
      fullDate: `${day} ${monthsNames[now.getMonth()]} ${now.getFullYear()}`,
      weight: parseFloat(val.toFixed(1)),
      note: newNote.trim() || undefined,
    };

    const nextRecords = [...records, newRec];
    setRecords(nextRecords);
    setSelectedPointIndex(nextRecords.length - 1);
    setNewWeight("");
    setNewNote("");
    setAddModalVisible(false);
    void saveState(nextRecords, goalConfig);
  };

  // Handle Editing Goal Config
  const handleSaveGoalConfig = () => {
    const start = parseFloat(configForm.startWeight.replace(",", "."));
    const goal = parseFloat(configForm.goalWeight.replace(",", "."));

    if (isNaN(start) || isNaN(goal)) {
      Alert.alert("Erro", "Preencha os valores corretamente.");
      return;
    }

    const nextGoal: WeightGoalConfig = {
      startWeight: start,
      goalWeight: goal,
      startDate: configForm.startDate.trim() || goalConfig.startDate,
    };

    setGoalConfig(nextGoal);
    setConfigModalVisible(false);
    void saveState(records, nextGoal);
  };

  const handleDeleteRecord = (id: string) => {
    Alert.alert("Excluir Registro", "Deseja remover este registro de peso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          const next = records.filter((r) => r.id !== id);
          setRecords(next);
          setSelectedPointIndex(next.length ? next.length - 1 : null);
          void saveState(next, goalConfig);
        },
      },
    ]);
  };

  const chartData = useMemo(() => {
    if (!records.length) return [];
    if (selectedPeriod === "Semanal") return records.slice(-4);
    if (selectedPeriod === "Mensal") return records.slice(-6);
    return records;
  }, [records, selectedPeriod]);

  const selectedRecord = selectedPointIndex !== null && chartData[selectedPointIndex]
    ? chartData[selectedPointIndex]
    : chartData[chartData.length - 1];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* HEADER MINIMALISTA */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.topPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={styles.headerBackButton}
          activeOpacity={0.8}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={20} color="#D90000" />
        </TouchableOpacity>

        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Progresso de Peso</Text>
          <Text style={styles.headerSubtitle}>Acompanhamento de evolução</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setConfigForm({
              startWeight: String(goalConfig.startWeight),
              goalWeight: String(goalConfig.goalWeight),
              startDate: goalConfig.startDate,
            });
            setConfigModalVisible(true);
          }}
          style={styles.headerConfigButton}
          activeOpacity={0.8}
          accessibilityLabel="Configurar Meta"
        >
          <Ionicons name="options-outline" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding + 40,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* CARDS DE ESTATÍSTICA (KPI) - SEM QUEBRA DE LINHA */}
        <View style={styles.kpiRow}>
          {/* PESO ATUAL */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>PESO ATUAL</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValueNumber}>{currentWeight.toFixed(1)}</Text>
              <Text style={styles.kpiValueUnit}>kg</Text>
            </View>
            <View style={styles.kpiBadgeNeutral}>
              <Ionicons name="pulse" size={11} color="#888" />
              <Text style={styles.kpiBadgeNeutralText}>Registrado</Text>
            </View>
          </View>

          {/* META */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>META</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValueNumber}>{targetWeight.toFixed(1)}</Text>
              <Text style={styles.kpiValueUnit}>kg</Text>
            </View>
            <View style={styles.kpiBadgeRed}>
              <Ionicons name="flag" size={11} color="#D90000" />
              <Text style={styles.kpiBadgeRedText}>Alvo</Text>
            </View>
          </View>

          {/* ELIMINADOS */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ELIMINADOS</Text>
            <View style={styles.kpiValueRow}>
              <Text style={[styles.kpiValueNumber, styles.kpiValueGreen]}>
                -{totalLost.toFixed(1)}
              </Text>
              <Text style={[styles.kpiValueUnit, styles.kpiValueGreen]}>kg</Text>
            </View>
            <View style={styles.kpiBadgeGreen}>
              <Ionicons name="trending-down" size={11} color="#10b981" />
              <Text style={styles.kpiBadgeGreenText}>{progressPercentage}%</Text>
            </View>
          </View>
        </View>

        {/* PROGRESSO DA META - MINIMALISTA, SEM GRADIENTE */}
        <View style={styles.progressCardClean}>
          <View style={styles.progressCardTop}>
            <View style={styles.progressTitleGroup}>
              <View style={styles.targetIconBox}>
                <Ionicons name="flame" size={18} color="#D90000" />
              </View>
              <View>
                <Text style={styles.progressMainTitle}>Progresso da Meta</Text>
                <Text style={styles.progressSubtitle}>
                  Faltam <Text style={styles.whiteHighlight}>{remainingWeight.toFixed(1)} kg</Text> para atingir o objetivo
                </Text>
              </View>
            </View>

            <View style={styles.percentageBadge}>
              <Text style={styles.percentageBadgeText}>{progressPercentage}%</Text>
            </View>
          </View>

          {/* BARRA DE PROGRESSO SLIM */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(4, progressPercentage))}%` },
              ]}
            />
          </View>

          {/* MARCOS INÍCIO -> ATUAL -> META */}
          <View style={styles.milestonesRow}>
            <View style={styles.milestoneItem}>
              <View style={styles.milestoneDot} />
              <Text style={styles.milestoneLabel}>Início ({initialWeight.toFixed(1)}kg)</Text>
            </View>

            <View style={[styles.milestoneItem, { alignItems: "center" }]}>
              <View style={[styles.milestoneDot, styles.milestoneDotActive]} />
              <Text style={[styles.milestoneLabel, styles.milestoneLabelActive]}>
                Atual ({currentWeight.toFixed(1)}kg)
              </Text>
            </View>

            <View style={[styles.milestoneItem, { alignItems: "flex-end" }]}>
              <View style={[styles.milestoneDot, styles.milestoneDotGoal]} />
              <Text style={styles.milestoneLabel}>Meta ({targetWeight.toFixed(1)}kg)</Text>
            </View>
          </View>
        </View>

        {/* SELETOR DE PERÍODO */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Evolução no Tempo</Text>
          <View style={styles.periodPillContainer}>
            {PERIOD_OPTIONS.map((period) => {
              const active = selectedPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodPill, active && styles.periodPillActive]}
                  onPress={() => setSelectedPeriod(period)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>
                    {period}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* GRÁFICO MINIMALISTA SVG */}
        <View style={styles.chartWrapperCard}>
          {selectedRecord && (
            <View style={styles.chartSelectedInfo}>
              <View style={styles.chartSelectedLeft}>
                <Text style={styles.chartSelectedWeight}>{selectedRecord.weight.toFixed(1)} kg</Text>
                <Text style={styles.chartSelectedDate}>{selectedRecord.fullDate}</Text>
              </View>
              {selectedRecord.note ? (
                <View style={styles.chartSelectedNoteBadge}>
                  <Ionicons name="bookmark-outline" size={12} color="#D90000" />
                  <Text style={styles.chartSelectedNoteText} numberOfLines={1}>
                    {selectedRecord.note}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          <MinimalistSvgChart
            data={chartData}
            selectedIndex={selectedPointIndex}
            onSelectPoint={(idx) => setSelectedPointIndex(idx)}
            goalWeight={targetWeight}
          />
        </View>

        {/* HISTÓRICO DE PESAGENS DETALHADO */}
        <View style={styles.historySectionHeader}>
          <Text style={styles.sectionHeading}>Histórico de Pesagens</Text>
          <TouchableOpacity
            style={styles.addSmallButton}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addSmallButtonText}>Novo Registro</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyList}>
          {records
            .slice()
            .reverse()
            .map((item, index, arr) => {
              const prevItem = arr[index + 1];
              const diff = prevItem ? item.weight - prevItem.weight : 0;
              const isReduction = diff < 0;
              const isSame = diff === 0;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.historyItemCardClean,
                    isReduction && styles.historyItemCardSuccess,
                  ]}
                >
                  {/* Ícone de Evolução à Esquerda */}
                  <View
                    style={[
                      styles.historyIconBox,
                      isReduction
                        ? styles.historyIconBoxSuccess
                        : isSame
                        ? styles.historyIconBoxNeutral
                        : styles.historyIconBoxAlert,
                    ]}
                  >
                    <Ionicons
                      name={
                        isReduction
                          ? "trending-down"
                          : isSame
                          ? "remove"
                          : "trending-up"
                      }
                      size={15}
                      color={isReduction ? "#10b981" : isSame ? "#888" : "#ff4444"}
                    />
                  </View>

                  {/* Informações Principais */}
                  <View style={styles.historyInfoMain}>
                    <View style={styles.historyTopRow}>
                      <View style={styles.historyWeightGroup}>
                        <Text style={styles.historyWeightValLarge}>{item.weight.toFixed(1)}</Text>
                        <Text style={styles.historyWeightUnitText}>kg</Text>
                      </View>

                      {prevItem ? (
                        <View
                          style={[
                            styles.diffPillClean,
                            isReduction
                              ? styles.diffPillGreen
                              : isSame
                              ? styles.diffPillGray
                              : styles.diffPillRed,
                          ]}
                        >
                          <Ionicons
                            name={isReduction ? "arrow-down" : isSame ? "remove" : "arrow-up"}
                            size={10}
                            color={isReduction ? "#10b981" : isSame ? "#888" : "#ff4444"}
                          />
                          <Text
                            style={[
                              styles.diffPillLabel,
                              isReduction
                                ? styles.diffPillLabelGreen
                                : isSame
                                ? styles.diffPillLabelGray
                                : styles.diffPillLabelRed,
                            ]}
                          >
                            {Math.abs(diff).toFixed(1)} kg
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.diffPillGray}>
                          <Text style={styles.diffPillLabelGray}>Registro Inicial</Text>
                        </View>
                      )}
                    </View>

                    {/* Linha Inferior: Data e Nota */}
                    <View style={styles.historyMetaRow}>
                      <View style={styles.historyDateBlock}>
                        <Ionicons name="calendar-outline" size={11} color="#666" />
                        <Text style={styles.historyDateText}>{item.fullDate}</Text>
                      </View>

                      {item.note ? (
                        <View style={styles.historyNoteTag}>
                          <Ionicons name="pricetag-outline" size={10} color="#888" />
                          <Text style={styles.historyNoteTagText} numberOfLines={1}>
                            {item.note}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Botão de Excluir */}
                  <TouchableOpacity
                    onPress={() => handleDeleteRecord(item.id)}
                    style={styles.historyDeleteAction}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color="#555" />
                  </TouchableOpacity>
                </View>
              );
            })}
        </View>

        {/* DETALHES DA META */}
        <View style={styles.detailsCardClean}>
          <Text style={styles.detailsCardTitle}>Visão Geral da Meta</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailRowLeft}>
              <Ionicons name="scale-outline" size={16} color="#888" />
              <Text style={styles.detailRowLabel}>Peso Inicial</Text>
            </View>
            <Text style={styles.detailRowValue}>{goalConfig.startWeight.toFixed(1)} kg</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailRowLeft}>
              <Ionicons name="flag-outline" size={16} color="#888" />
              <Text style={styles.detailRowLabel}>Peso Objetivo</Text>
            </View>
            <Text style={[styles.detailRowValue, { color: "#D90000" }]}>
              {goalConfig.goalWeight.toFixed(1)} kg
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailRowLeft}>
              <Ionicons name="calendar-outline" size={16} color="#888" />
              <Text style={styles.detailRowLabel}>Início do Plano</Text>
            </View>
            <Text style={styles.detailRowValue}>{goalConfig.startDate}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailRowLeft}>
              <Ionicons name="sparkles-outline" size={16} color="#888" />
              <Text style={styles.detailRowLabel}>Total Eliminado</Text>
            </View>
            <Text style={[styles.detailRowValue, { color: "#10b981" }]}>
              -{totalLost.toFixed(1)} kg
            </Text>
          </View>
        </View>

        {/* BOTÃO PRINCIPAL INFERIOR */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.84}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.primaryActionButtonText}>Registrar Nova Pesagem</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL: REGISTRAR PESO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopHeader}>
              <View style={styles.modalTitleIconBox}>
                <Ionicons name="scale" size={18} color="#D90000" />
                <Text style={styles.modalHeaderTitle}>Nova Pesagem</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Insira o peso aferido na balança para atualizar seu gráfico e meta.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Peso Atual (kg)</Text>
              <TextInput
                style={styles.fieldInputBig}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="Ex: 73.5"
                placeholderTextColor="#555"
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Observação / Momento (Opcional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={newNote}
                onChangeText={setNewNote}
                placeholder="Ex: Em jejum pós-treino"
                placeholderTextColor="#555"
                maxLength={40}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddWeight}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitBtnText}>Salvar Registro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CONFIGURAR META */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={configModalVisible}
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopHeader}>
              <View style={styles.modalTitleIconBox}>
                <Ionicons name="options" size={18} color="#D90000" />
                <Text style={styles.modalHeaderTitle}>Ajustar Meta</Text>
              </View>
              <TouchableOpacity onPress={() => setConfigModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Defina os parâmetros iniciais e o peso alvo do seu plano.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Peso Inicial (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={configForm.startWeight}
                onChangeText={(text) => setConfigForm((prev) => ({ ...prev, startWeight: text }))}
                placeholder="78.0"
                placeholderTextColor="#555"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Peso Objetivo / Meta (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={configForm.goalWeight}
                onChangeText={(text) => setConfigForm((prev) => ({ ...prev, goalWeight: text }))}
                placeholder="72.0"
                placeholderTextColor="#555"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Data de Início</Text>
              <TextInput
                style={styles.fieldInput}
                value={configForm.startDate}
                onChangeText={(text) => setConfigForm((prev) => ({ ...prev, startDate: text }))}
                placeholder="15 Jan 2024"
                placeholderTextColor="#555"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfigModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveGoalConfig}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitBtnText}>Salvar Meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Gráfico Minimalista SVG feito sob medida:
 * Sem gradientes, linhas nítidas, pontos com feedback de toque e guia de meta sutil.
 */
function MinimalistSvgChart({
  data,
  selectedIndex,
  onSelectPoint,
  goalWeight,
}: {
  data: WeightRecord[];
  selectedIndex: number | null;
  onSelectPoint: (idx: number) => void;
  goalWeight: number;
}) {
  const chartHeight = 180;
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.min(screenWidth - 64, 460);
  const paddingX = 32;
  const paddingY = 24;

  if (data.length < 2) {
    return (
      <View style={styles.chartEmptyBox}>
        <Ionicons name="stats-chart-outline" size={32} color="#444" />
        <Text style={styles.chartEmptyText}>Adicione ao menos 2 registros para ver a curva.</Text>
      </View>
    );
  }

  const weights = data.map((d) => d.weight);
  const minVal = Math.min(...weights, goalWeight) - 0.6;
  const maxVal = Math.max(...weights) + 0.6;
  const valRange = maxVal - minVal || 1;

  const getX = (index: number) => {
    return paddingX + (index / (data.length - 1)) * (chartWidth - paddingX * 2);
  };

  const getY = (weight: number) => {
    const norm = (weight - minVal) / valRange;
    return chartHeight - paddingY - norm * (chartHeight - paddingY * 2);
  };

  // Construir caminho curvo SVG suave (Bezier)
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.weight) }));

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }

  const goalY = getY(goalWeight);

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Linhas guias horizontais sutis */}
        {[minVal + 0.6, (minVal + maxVal) / 2, maxVal - 0.6].map((gridVal, i) => {
          const y = getY(gridVal);
          return (
            <Line
              key={i}
              x1={paddingX}
              y1={y}
              x2={chartWidth - paddingX}
              y2={y}
              stroke="#222"
              strokeDasharray="4, 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Linha guia de Meta */}
        {goalY >= paddingY && goalY <= chartHeight - paddingY && (
          <>
            <Line
              x1={paddingX}
              y1={goalY}
              x2={chartWidth - paddingX}
              y2={goalY}
              stroke="#D9000044"
              strokeDasharray="2, 4"
              strokeWidth="1"
            />
            <SvgText
              x={chartWidth - paddingX}
              y={goalY - 4}
              fill="#D9000088"
              fontSize="9"
              fontWeight="bold"
              textAnchor="end"
            >
              META {goalWeight}kg
            </SvgText>
          </>
        )}

        {/* Linha principal sólida vermelha (sem gradiente) */}
        <Path d={pathD} stroke="#D90000" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Pontos de dados */}
        {points.map((pt, i) => {
          const isSelected = selectedIndex === i;
          return (
            <Circle
              key={`pt-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={isSelected ? 6 : 4}
              fill={isSelected ? "#D90000" : "#1a1a1a"}
              stroke={isSelected ? "#ffffff" : "#D90000"}
              strokeWidth={isSelected ? "2.5" : "2"}
            />
          );
        })}

        {/* Labels de data abaixo de cada ponto */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={chartHeight - 4}
              fill={selectedIndex === i ? "#ffffff" : "#666"}
              fontSize="10"
              fontWeight={selectedIndex === i ? "bold" : "500"}
              textAnchor="middle"
            >
              {d.date}
            </SvgText>
          );
        })}
      </Svg>

      {/* Áreas de toque invisíveis para selecionar pontos no gráfico */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: "row", paddingHorizontal: paddingX }]}>
        {data.map((_, i) => (
          <TouchableOpacity
            key={`touch-${i}`}
            style={{ flex: 1, height: chartHeight }}
            onPress={() => onSelectPoint(i)}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  header: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  headerBackButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: "#777",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  headerConfigButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    width: "100%",
    alignSelf: "center",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 90,
  },
  kpiLabel: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  kpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginVertical: 2,
  },
  kpiValueNumber: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  kpiValueUnit: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 2,
  },
  kpiValueGreen: {
    color: "#10b981",
  },
  kpiBadgeNeutral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiBadgeNeutralText: {
    color: "#888",
    fontSize: 9,
    fontWeight: "700",
  },
  kpiBadgeRed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiBadgeRedText: {
    color: "#D90000",
    fontSize: 9,
    fontWeight: "800",
  },
  kpiBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiBadgeGreenText: {
    color: "#10b981",
    fontSize: 9,
    fontWeight: "900",
  },
  progressCardClean: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 16,
    marginBottom: 18,
  },
  progressCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  targetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressMainTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  progressSubtitle: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
  },
  whiteHighlight: {
    color: "#fff",
    fontWeight: "800",
  },
  percentageBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentageBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#202020",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#D90000",
    borderRadius: 3,
  },
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneItem: {
    flexDirection: "column",
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#444",
    marginBottom: 3,
  },
  milestoneDotActive: {
    backgroundColor: "#D90000",
  },
  milestoneDotGoal: {
    backgroundColor: "#fff",
  },
  milestoneLabel: {
    color: "#666",
    fontSize: 10,
    fontWeight: "600",
  },
  milestoneLabelActive: {
    color: "#D90000",
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeading: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  periodPillContainer: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "#222",
  },
  periodPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  periodPillActive: {
    backgroundColor: "#D90000",
  },
  periodPillText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
  },
  periodPillTextActive: {
    color: "#fff",
  },
  chartWrapperCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242424",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  chartSelectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
    paddingBottom: 10,
  },
  chartSelectedLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  chartSelectedWeight: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  chartSelectedDate: {
    color: "#777",
    fontSize: 12,
    fontWeight: "600",
  },
  chartSelectedNoteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 160,
  },
  chartSelectedNoteText: {
    color: "#D90000",
    fontSize: 10,
    fontWeight: "800",
  },
  chartEmptyBox: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chartEmptyText: {
    color: "#666",
    fontSize: 12,
  },
  historySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  addSmallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addSmallButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  historyList: {
    gap: 8,
    marginBottom: 20,
  },
  historyItemCardClean: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  historyItemCardSuccess: {
    borderColor: "rgba(16, 185, 129, 0.18)",
  },
  historyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIconBoxSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  historyIconBoxNeutral: {
    backgroundColor: "#1c1c1c",
  },
  historyIconBoxAlert: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  historyInfoMain: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyWeightGroup: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  historyWeightValLarge: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  historyWeightUnitText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 3,
  },
  diffPillClean: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  diffPillGreen: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  diffPillRed: {
    backgroundColor: "rgba(255, 68, 68, 0.08)",
    borderColor: "rgba(255, 68, 68, 0.2)",
  },
  diffPillGray: {
    backgroundColor: "#1c1c1c",
    borderColor: "#282828",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  diffPillLabel: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  diffPillLabelGreen: {
    color: "#10b981",
  },
  diffPillLabelRed: {
    color: "#ff4444",
  },
  diffPillLabelGray: {
    color: "#777",
    fontSize: 10.5,
    fontWeight: "700",
  },
  historyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  historyDateBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyDateText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "600",
  },
  historyNoteTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#1b1b1b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 140,
  },
  historyNoteTagText: {
    color: "#999",
    fontSize: 10,
    fontWeight: "600",
  },
  historyDeleteAction: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#191919",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsCardClean: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 16,
    marginBottom: 20,
  },
  detailsCardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailRowLabel: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  detailRowValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#1e1e1e",
    marginVertical: 4,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D90000",
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryActionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#161616",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    padding: 20,
  },
  modalTopHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitleIconBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalHeaderTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDescription: {
    color: "#777",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  fieldInputBig: {
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D90000",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#222",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "800",
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalSubmitBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
});
