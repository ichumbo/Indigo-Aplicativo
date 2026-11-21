import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTrainerBranding } from "@/hooks/use-trainer-branding";
import {
  AerobicAssessmentRecord,
  AerobicProtocolRecord,
  AerobicOverviewStats,
  getAerobicOverviewStats,
  listAerobicAssessments,
  listAerobicProtocols,
  saveAerobicAssessment,
  saveAerobicProtocol,
  duplicateAerobicProtocol,
  deleteAerobicProtocol,
  approveAerobicProtocol,
  assignAerobicProtocolToStudent,
  SAMPLE_AEROBIC_ASSESSMENT,
  SAMPLE_AEROBIC_PROTOCOL,
} from "@/services/aerobic-protocol-store";
import {
  AerobicPrescriptionMode,
  AerobicGoal,
  AerobicProtocolType,
  ConconiStage,
  ConconiAnalysisResult,
  analyzeConconiData,
  calculateHeartRateZones,
  generateAerobicProtocolsAI,
  AerobicAISuggestion,
} from "@/services/aerobic-protocol-ai-service";
import { AerobicProtocolEditor } from "@/components/aerobic-protocol-editor";
import { AerobicExecutionRunner } from "@/components/aerobic-execution-runner";
import { listStudentProfilesForTrainer, StudentProfile } from "@/services/student-profile-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TabKey = "overview" | "tests" | "generator" | "protocols" | "assigned" | "evolution";

export default function AerobicProtocolsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const { primaryColor } = useTrainerBranding();
  const brandColor = primaryColor || theme.primary || "#D90000";

  const params = useLocalSearchParams<{ tab?: TabKey; studentId?: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>(params.tab || "overview");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<AerobicOverviewStats | null>(null);
  const [assessments, setAssessments] = useState<AerobicAssessmentRecord[]>([]);
  const [protocols, setProtocols] = useState<AerobicProtocolRecord[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);

  // Editor Modal
  const [editingProtocol, setEditingProtocol] = useState<AerobicProtocolRecord | null>(null);

  // Runner Modal (Aluno)
  const [runningProtocol, setRunningProtocol] = useState<AerobicProtocolRecord | null>(null);

  // --- ESTADO DO GERADOR COM IA (WIZARD 5 ETAPAS) ---
  const [genStep, setGenStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [genStudentId, setGenStudentId] = useState(params.studentId || "student-1");
  const [genStudentName, setGenStudentName] = useState("Charles Nóbrega");
  const [genMode, setGenMode] = useState<AerobicPrescriptionMode>("hybrid");
  const [genGoal, setGenGoal] = useState<AerobicGoal>("speed_sustainability");
  const [genFrequency, setGenFrequency] = useState(3);
  const [genDuration, setGenDuration] = useState(30);
  const [genSuggestions, setGenSuggestions] = useState<AerobicAISuggestion[]>([]);
  const [genSelectedSuggestion, setGenSelectedSuggestion] = useState<AerobicAISuggestion | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // --- ESTADO DO TESTE DE CONCONI ---
  const [testStages, setTestStages] = useState<ConconiStage[]>([
    { stage: 1, speedKmh: 5.0, heartRateBpm: 110, inclinePercent: 1 },
    { stage: 2, speedKmh: 6.0, heartRateBpm: 122, inclinePercent: 1 },
    { stage: 3, speedKmh: 7.0, heartRateBpm: 135, inclinePercent: 1 },
    { stage: 4, speedKmh: 8.0, heartRateBpm: 148, inclinePercent: 1 },
    { stage: 5, speedKmh: 9.0, heartRateBpm: 158, inclinePercent: 1 },
    { stage: 6, speedKmh: 10.0, heartRateBpm: 165, inclinePercent: 1 },
    { stage: 7, speedKmh: 11.0, heartRateBpm: 172, inclinePercent: 1 },
    { stage: 8, speedKmh: 12.0, heartRateBpm: 175, inclinePercent: 1 },
  ]);
  const [testAnalysis, setTestAnalysis] = useState<ConconiAnalysisResult | null>(null);
  const [stageSpeedInput, setStageSpeedInput] = useState("13.0");
  const [stageHrInput, setStageHrInput] = useState("178");

  const trainerId = session?.user.id || "trainer";
  const userRole = session?.user.role || "trainer";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, assessList, protoList, stdList] = await Promise.all([
        getAerobicOverviewStats(trainerId),
        listAerobicAssessments(trainerId),
        listAerobicProtocols(trainerId),
        listStudentProfilesForTrainer(trainerId),
      ]);
      setStats(statsData);
      setAssessments(assessList);
      setProtocols(protoList);
      setStudents(stdList);

      if (stdList.length > 0 && !params.studentId) {
        setGenStudentId(stdList[0].id);
        setGenStudentName(stdList[0].registration.fullName);
      }
    } catch {
      // Ignora erro
    } finally {
      setLoading(false);
    }
  }, [trainerId, params.studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Executa análise da curva de Conconi
  useEffect(() => {
    if (testStages.length >= 4) {
      const res = analyzeConconiData(testStages);
      setTestAnalysis(res);
    }
  }, [testStages]);

  const handleAddStage = () => {
    const spd = parseFloat(stageSpeedInput);
    const hr = parseInt(stageHrInput, 10);
    if (!spd || !hr) {
      Alert.alert("Erro", "Informe valores válidos de velocidade e FC.");
      return;
    }
    const newStage: ConconiStage = {
      stage: testStages.length + 1,
      speedKmh: spd,
      heartRateBpm: hr,
      inclinePercent: 1,
    };
    setTestStages([...testStages, newStage]);
    setStageSpeedInput((spd + 0.5).toFixed(1));
    setStageHrInput(String(hr + 3));
  };

  const handleSaveAssessment = async () => {
    if (!testAnalysis) return;
    try {
      const record: AerobicAssessmentRecord = {
        id: `assess-${Date.now()}`,
        trainerId,
        studentId: genStudentId,
        studentName: genStudentName,
        assessmentDate: new Date().toISOString().slice(0, 10),
        environment: "esteira",
        protocolName: "conconi",
        stages: testStages,
        analysis: testAnalysis,
        status: "concluido",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveAerobicAssessment(record);
      Alert.alert("Sucesso", "Avaliação e teste de Conconi salvos com sucesso!");
      loadData();
      setActiveTab("overview");
    } catch {
      Alert.alert("Erro", "Falha ao salvar avaliação.");
    }
  };

  const handleRunAIGenerator = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      const aiInput = {
        studentId: genStudentId,
        studentName: genStudentName,
        goal: genGoal,
        prescriptionMode: genMode,
        weeklyFrequency: genFrequency,
        sessionDurationMinutes: genDuration,
        conconiAnalysis: testAnalysis || SAMPLE_AEROBIC_ASSESSMENT.analysis,
      };

      const result = generateAerobicProtocolsAI(aiInput);
      setGenSuggestions(result.suggestions);
      setGenSelectedSuggestion(result.suggestions[1] || result.suggestions[0]);
      setIsGeneratingAI(false);
      setGenStep(4);
    }, 600);
  };

  const handleUseSuggestionInEditor = (sug: AerobicAISuggestion) => {
    const newProto: AerobicProtocolRecord = {
      id: `proto-${Date.now()}`,
      trainerId,
      studentId: genStudentId,
      studentName: genStudentName,
      title: sug.title,
      objective: sug.objective,
      prescriptionMode: sug.prescriptionMode,
      mesocycleWeeks: 4,
      version: 1,
      status: "draft",
      aiMetadata: {
        suggestionKey: sug.suggestionKey,
        justification: sug.technicalJustification,
        generatedAt: new Date().toISOString(),
      },
      daysPrescription: [
        {
          id: `dp-${Date.now()}-1`,
          dayOfWeek: "Segunda",
          sessionTitle: "Treino Principal A",
          prescriptionMode: sug.prescriptionMode,
          warmupMinutes: sug.warmup.durationMinutes,
          warmupText: sug.warmup.description,
          blocks: sug.blocks,
          cooldownMinutes: sug.cooldown.durationMinutes,
          cooldownText: sug.cooldown.description,
          totalDurationMinutes: sug.totalDurationMinutes,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingProtocol(newProto);
  };

  return (
    <View style={styles.container}>
      {/* HEADER PRINCIPAL */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 48 : 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Protocolos Aeróbicos & IA</Text>
          <Text style={styles.headerSub}>DragonCorp Performance Engine</Text>
        </View>
        <TouchableOpacity
          style={[styles.aiShortcutBtn, { backgroundColor: brandColor }]}
          onPress={() => {
            setActiveTab("generator");
            setGenStep(1);
          }}
        >
          <Ionicons name="sparkles" size={16} color="#FFF" />
          <Text style={styles.aiShortcutText}>Gerar com IA</Text>
        </TouchableOpacity>
      </View>

      {/* TABS DE NAVEGAÇÃO HORIZONTAL */}
      <View style={styles.navTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabsScroll}>
          {[
            { key: "overview", label: "Visão Geral", icon: "grid-outline" },
            { key: "tests", label: "Testes & Conconi", icon: "pulse-outline" },
            { key: "generator", label: "Gerador com IA", icon: "sparkles-outline" },
            { key: "protocols", label: "Meus Protocolos", icon: "fitness-outline" },
            { key: "assigned", label: "Atribuídos", icon: "people-outline" },
            { key: "evolution", label: "Evolução", icon: "trending-up-outline" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.navTab,
                  isActive && { borderColor: brandColor, backgroundColor: "#201414" },
                ]}
                onPress={() => setActiveTab(tab.key as TabKey)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? brandColor : "#888"}
                />
                <Text
                  style={[
                    styles.navTabText,
                    isActive && { color: brandColor, fontWeight: "900" },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTEÚDO DAS ABAS */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={brandColor} />
          <Text style={styles.loadingText}>Carregando protocolos aeróbicos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.mainScroll}>
          {/* ABA 1: VISÃO GERAL */}
          {activeTab === "overview" && (
            <View style={styles.tabContent}>
              {/* CARDS DE ESTATÍSTICAS */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{stats?.evaluatedStudentsCount || 0}</Text>
                  <Text style={styles.statLabel}>Alunos Avaliados</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={[styles.statNum, { color: brandColor }]}>
                    {stats?.activeProtocolsCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Protocolos Ativos</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{stats?.scheduledSessionsCount || 0}</Text>
                  <Text style={styles.statLabel}>Sessões Agendadas</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={[styles.statNum, { color: (stats?.needsReviewCount || 0) > 0 ? "#F59E0B" : "#10B981" }]}>
                    {stats?.needsReviewCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Revisões Pendentes</Text>
                </View>
              </View>

              {/* ATALHOS RÁPIDOS */}
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={[styles.quickActionBtn, { borderColor: brandColor }]}
                  onPress={() => setActiveTab("tests")}
                >
                  <Ionicons name="add-circle-outline" size={20} color={brandColor} />
                  <Text style={[styles.quickActionText, { color: brandColor }]}>Nova Avaliação</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: brandColor, borderColor: brandColor }]}
                  onPress={() => {
                    setActiveTab("generator");
                    setGenStep(1);
                  }}
                >
                  <Ionicons name="sparkles" size={18} color="#FFF" />
                  <Text style={[styles.quickActionText, { color: "#FFF" }]}>Gerar com IA</Text>
                </TouchableOpacity>
              </View>

              {/* AVALIAÇÕES RECENTES */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Avaliações Aeróbicas Recentes</Text>
                  <TouchableOpacity onPress={() => setActiveTab("tests")}>
                    <Text style={[styles.seeAllText, { color: brandColor }]}>Ver todas</Text>
                  </TouchableOpacity>
                </View>

                {assessments.slice(0, 3).map((a) => (
                  <View key={a.id} style={styles.itemRow}>
                    <View style={styles.itemIconBox}>
                      <Ionicons name="pulse" size={18} color={brandColor} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{a.studentName}</Text>
                      <Text style={styles.itemSub}>
                        {a.assessmentDate} • {a.analysis.deflectionSpeedKmh ? `${a.analysis.deflectionSpeedKmh} km/h` : "Sem deflexão"} • {a.analysis.deflectionHeartRate ? `${a.analysis.deflectionHeartRate} bpm` : "FC não det."}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        a.analysis.isReliable
                          ? { backgroundColor: "#13251a", borderColor: "#22543d" }
                          : { backgroundColor: "#2b2212", borderColor: "#744210" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          a.analysis.isReliable ? { color: "#48bb78" } : { color: "#ecc94b" },
                        ]}
                      >
                        {a.analysis.isReliable ? "Confiável" : "Revisar"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* PROTOCOLOS ATIVOS */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Protocolos Atribuídos aos Alunos</Text>
                  <TouchableOpacity onPress={() => setActiveTab("assigned")}>
                    <Text style={[styles.seeAllText, { color: brandColor }]}>Ver todos</Text>
                  </TouchableOpacity>
                </View>

                {protocols.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.protocolCard}
                    onPress={() => setEditingProtocol(p)}
                  >
                    <View style={styles.protocolCardHeader}>
                      <View>
                        <Text style={styles.protocolCardTitle}>{p.title}</Text>
                        <Text style={styles.protocolCardSub}>
                          Aluno: {p.studentName} • {p.daysPrescription.length} sessões/sem
                        </Text>
                      </View>
                      <View style={[styles.modeTag, { borderColor: brandColor }]}>
                        <Text style={[styles.modeTagText, { color: brandColor }]}>
                          {p.prescriptionMode.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.protocolObjective} numberOfLines={2}>
                      {p.objective}
                    </Text>

                    <View style={styles.protocolCardFooter}>
                      <Text style={styles.mesocycleText}>
                        Ciclo: {p.mesocycleWeeks} semanas
                      </Text>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.actionBtnSmall}
                          onPress={() => setEditingProtocol(p)}
                        >
                          <Ionicons name="create-outline" size={16} color="#FFF" />
                          <Text style={styles.actionBtnSmallText}>Editar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ABA 2: TESTES AERÓBICOS & CONCONI */}
          {activeTab === "tests" && (
            <View style={styles.tabContent}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Execução do Teste de Conconi</Text>
                <Text style={styles.sectionDesc}>
                  Registre os estágios incrementais de velocidade e FC. O algoritmo calculará a regressão bilateral e indicará se houve ponto de deflexão ou se o limiar não foi determinado.
                </Text>

                {/* ADICIONAR ESTÁGIO */}
                <View style={styles.stageInputRow}>
                  <View style={styles.stageInputCol}>
                    <Text style={styles.inputMiniLabel}>Velocidade (km/h)</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="numeric"
                      value={stageSpeedInput}
                      onChangeText={setStageSpeedInput}
                    />
                  </View>

                  <View style={styles.stageInputCol}>
                    <Text style={styles.inputMiniLabel}>Frequência (bpm)</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="numeric"
                      value={stageHrInput}
                      onChangeText={setStageHrInput}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.addStageBtn, { backgroundColor: brandColor }]}
                    onPress={handleAddStage}
                  >
                    <Ionicons name="add" size={18} color="#FFF" />
                    <Text style={styles.addStageBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>

                {/* TABELA DE ESTÁGIOS */}
                <View style={styles.stagesTable}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.th, { width: 50 }]}>Etapa</Text>
                    <Text style={styles.th}>Velocidade</Text>
                    <Text style={styles.th}>FC (bpm)</Text>
                    <Text style={[styles.th, { width: 40 }]}>Ação</Text>
                  </View>

                  {testStages.map((s, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.td, { width: 50 }]}>#{s.stage}</Text>
                      <Text style={styles.td}>{s.speedKmh.toFixed(1)} km/h</Text>
                      <Text style={[styles.td, { color: brandColor, fontWeight: "800" }]}>
                        {s.heartRateBpm} bpm
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const copy = [...testStages];
                          copy.splice(idx, 1);
                          setTestStages(copy);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* LAUDO DA ANÁLISE AUTOMÁTICA */}
                {testAnalysis && (
                  <View style={styles.analysisResultCard}>
                    <View style={styles.analysisHeader}>
                      <Ionicons
                        name={
                          testAnalysis.deflectionStatus === "deflexao_identificada"
                            ? "checkmark-circle"
                            : "alert-circle"
                        }
                        size={22}
                        color={
                          testAnalysis.deflectionStatus === "deflexao_identificada"
                            ? "#10B981"
                            : "#F59E0B"
                        }
                      />
                      <Text style={styles.analysisStatusTitle}>
                        {testAnalysis.deflectionStatus === "deflexao_identificada"
                          ? "Ponto de Deflexão Identificado"
                          : testAnalysis.deflectionStatus === "deflexao_possivel"
                          ? "Deflexão Possível (Requer Confirmação)"
                          : "Limiar Não Determinado"}
                      </Text>
                    </View>

                    <Text style={styles.analysisExplanation}>{testAnalysis.explanation}</Text>

                    <View style={styles.analysisMetricsGrid}>
                      <View style={styles.analysisMetricItem}>
                        <Text style={styles.analysisMetricLabel}>FC no Limiar</Text>
                        <Text style={[styles.analysisMetricVal, { color: brandColor }]}>
                          {testAnalysis.deflectionHeartRate ? `${testAnalysis.deflectionHeartRate} bpm` : "—"}
                        </Text>
                      </View>

                      <View style={styles.analysisMetricItem}>
                        <Text style={styles.analysisMetricLabel}>Velocidade Limiar</Text>
                        <Text style={[styles.analysisMetricVal, { color: brandColor }]}>
                          {testAnalysis.deflectionSpeedKmh ? `${testAnalysis.deflectionSpeedKmh} km/h` : "—"}
                        </Text>
                      </View>

                      <View style={styles.analysisMetricItem}>
                        <Text style={styles.analysisMetricLabel}>FC Máxima Observada</Text>
                        <Text style={styles.analysisMetricVal}>
                          {testAnalysis.maxHeartRateObserved} bpm
                        </Text>
                      </View>

                      <View style={styles.analysisMetricItem}>
                        <Text style={styles.analysisMetricLabel}>VO2 Máx Estimado</Text>
                        <Text style={styles.analysisMetricVal}>
                          {testAnalysis.vo2MaxEstimate || 42} ml/kg/min
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.saveAssessmentBtn, { backgroundColor: brandColor }]}
                      onPress={handleSaveAssessment}
                    >
                      <Ionicons name="save-outline" size={18} color="#FFF" />
                      <Text style={styles.saveAssessmentBtnText}>Salvar Avaliação Aeróbica</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ABA 3: GERADOR COM IA (WIZARD 5 ETAPAS) */}
          {activeTab === "generator" && (
            <View style={styles.tabContent}>
              <View style={styles.wizardHeader}>
                <Text style={styles.wizardStepText}>Etapa {genStep} de 5</Text>
                <Text style={styles.wizardTitle}>
                  {genStep === 1
                    ? "Aluno & Avaliação"
                    : genStep === 2
                    ? "Modo de Prescrição"
                    : genStep === 3
                    ? "Objetivo & Parâmetros"
                    : genStep === 4
                    ? "Sugestões Geradas pela IA"
                    : "Edição e Aprovação"}
                </Text>
              </View>

              {/* ETAPA 1: ALUNO */}
              {genStep === 1 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Selecione o Aluno para a Prescrição</Text>
                  {students.map((std) => (
                    <TouchableOpacity
                      key={std.id}
                      style={[
                        styles.studentSelectPill,
                        genStudentId === std.id && { borderColor: brandColor, backgroundColor: "#201414" },
                      ]}
                      onPress={() => {
                        setGenStudentId(std.id);
                        setGenStudentName(std.registration.fullName);
                      }}
                    >
                      <Text
                        style={[
                          styles.studentSelectText,
                          genStudentId === std.id && { color: brandColor, fontWeight: "900" },
                        ]}
                      >
                        {std.registration.fullName}
                      </Text>
                      {genStudentId === std.id && (
                        <Ionicons name="checkmark-circle" size={18} color={brandColor} />
                      )}
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[styles.nextStepBtn, { backgroundColor: brandColor }]}
                    onPress={() => setGenStep(2)}
                  >
                    <Text style={styles.nextStepBtnText}>Avançar para Modo de Prescrição →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ETAPA 2: MODO DE PRESCRIÇÃO */}
              {genStep === 2 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Como deseja prescrever o treino?</Text>
                  <Text style={styles.sectionDesc}>
                    Escolha entre prescrição orientada por ritmo, frequência cardíaca ou monitoramento híbrido.
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.modeOptionCard,
                      genMode === "speed" && { borderColor: brandColor, backgroundColor: "#201414" },
                    ]}
                    onPress={() => setGenMode("speed")}
                  >
                    <Ionicons name="speedometer-outline" size={24} color={brandColor} />
                    <View style={styles.modeOptionInfo}>
                      <Text style={styles.modeOptionTitle}>Opção 1 — Por Velocidade (km/h)</Text>
                      <Text style={styles.modeOptionDesc}>
                        Intervalos e ritmos contínuos definidos em km/h com base na velocidade do teste e tolerância.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeOptionCard,
                      genMode === "hr" && { borderColor: brandColor, backgroundColor: "#201414" },
                    ]}
                    onPress={() => setGenMode("hr")}
                  >
                    <Ionicons name="heart-outline" size={24} color="#EF4444" />
                    <View style={styles.modeOptionInfo}>
                      <Text style={styles.modeOptionTitle}>Opção 2 — Por Frequência Cardíaca (bpm)</Text>
                      <Text style={styles.modeOptionDesc}>
                        Zonas-alvo calculadas por Karvonen ou % FCmáx. Respeita a latência cardíaca em tiros curtos.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeOptionCard,
                      genMode === "hybrid" && { borderColor: brandColor, backgroundColor: "#201414" },
                    ]}
                    onPress={() => setGenMode("hybrid")}
                  >
                    <Ionicons name="git-merge-outline" size={24} color="#F59E0B" />
                    <View style={styles.modeOptionInfo}>
                      <Text style={styles.modeOptionTitle}>Opção 3 — Modo Híbrido (Recomendado)</Text>
                      <Text style={styles.modeOptionDesc}>
                        Velocidade como guia operacional e frequência cardíaca + Borg (RPE) para monitorar a intensidade real.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.wizardBtnRow}>
                    <TouchableOpacity style={styles.prevStepBtn} onPress={() => setGenStep(1)}>
                      <Text style={styles.prevStepBtnText}>← Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextStepBtn, { backgroundColor: brandColor, flex: 1 }]}
                      onPress={() => setGenStep(3)}
                    >
                      <Text style={styles.nextStepBtnText}>Avançar para Objetivos →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ETAPA 3: OBJETIVO E PARÂMETROS */}
              {genStep === 3 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Objetivo e Parâmetros da Sessão</Text>

                  <Text style={styles.inputMiniLabel}>Objetivo do Ciclo:</Text>
                  <View style={styles.goalPillsGrid}>
                    {[
                      { key: "speed_sustainability", label: "Sustentação de Velocidade" },
                      { key: "conditioning", label: "Condicionamento Geral" },
                      { key: "endurance", label: "Resistência Aeróbica" },
                      { key: "interval_tolerance", label: "Tolerância a Tiros" },
                      { key: "running_perf", label: "Performance em Corrida" },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.key}
                        style={[
                          styles.goalPill,
                          genGoal === g.key && { borderColor: brandColor, backgroundColor: "#201414" },
                        ]}
                        onPress={() => setGenGoal(g.key as AerobicGoal)}
                      >
                        <Text
                          style={[
                            styles.goalPillText,
                            genGoal === g.key && { color: brandColor, fontWeight: "900" },
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.paramRow}>
                    <View style={styles.paramCol}>
                      <Text style={styles.inputMiniLabel}>Frequência Semanal:</Text>
                      <View style={styles.freqRow}>
                        {[2, 3, 4, 5].map((f) => (
                          <TouchableOpacity
                            key={f}
                            style={[
                              styles.freqPill,
                              genFrequency === f && { backgroundColor: brandColor },
                            ]}
                            onPress={() => setGenFrequency(f)}
                          >
                            <Text
                              style={[
                                styles.freqPillText,
                                genFrequency === f && { color: "#FFF", fontWeight: "900" },
                              ]}
                            >
                              {f}x
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.paramCol}>
                      <Text style={styles.inputMiniLabel}>Duração por Treino:</Text>
                      <View style={styles.freqRow}>
                        {[20, 30, 40, 50].map((d) => (
                          <TouchableOpacity
                            key={d}
                            style={[
                              styles.freqPill,
                              genDuration === d && { backgroundColor: brandColor },
                            ]}
                            onPress={() => setGenDuration(d)}
                          >
                            <Text
                              style={[
                                styles.freqPillText,
                                genDuration === d && { color: "#FFF", fontWeight: "900" },
                              ]}
                            >
                              {d}m
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.generateAIBtn, { backgroundColor: brandColor }]}
                    onPress={handleRunAIGenerator}
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={20} color="#FFF" />
                        <Text style={styles.generateAIBtnText}>Gerar 3 Protocolos com IA</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ETAPA 4: SUGESTÕES A, B e C */}
              {genStep === 4 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>
                    Selecione uma das 3 alternativas geradas:
                  </Text>

                  {genSuggestions.map((sug) => {
                    const isSelected = genSelectedSuggestion?.suggestionKey === sug.suggestionKey;
                    return (
                      <TouchableOpacity
                        key={sug.suggestionKey}
                        style={[
                          styles.suggestionCard,
                          isSelected && { borderColor: brandColor, backgroundColor: "#1e1313" },
                        ]}
                        onPress={() => setGenSelectedSuggestion(sug)}
                      >
                        <View style={styles.suggestionTopRow}>
                          <View style={[styles.badgeBox, { backgroundColor: brandColor }]}>
                            <Text style={styles.badgeBoxText}>{sug.badge}</Text>
                          </View>
                          <Text style={styles.suggestionDuration}>
                            ⏱️ {sug.totalDurationMinutes} min
                          </Text>
                        </View>

                        <Text style={styles.sugTitle}>{sug.title}</Text>
                        <Text style={styles.sugObjective}>{sug.objective}</Text>

                        {/* JUSTIFICATIVA */}
                        <View style={styles.justificationBox}>
                          <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                          <Text style={styles.justificationText}>{sug.technicalJustification}</Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.useSuggestionBtn, { backgroundColor: brandColor }]}
                          onPress={() => handleUseSuggestionInEditor(sug)}
                        >
                          <Ionicons name="create-outline" size={16} color="#FFF" />
                          <Text style={styles.useSuggestionBtnText}>
                            Editar no Editor Profissional
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ABA 4: MEUS PROTOCOLOS */}
          {activeTab === "protocols" && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Modelos & Biblioteca</Text>
                <TouchableOpacity
                  style={[styles.createProtocolBtn, { backgroundColor: brandColor }]}
                  onPress={() => {
                    const emptyProto: AerobicProtocolRecord = {
                      id: `proto-${Date.now()}`,
                      trainerId,
                      studentId: genStudentId,
                      studentName: genStudentName,
                      title: "Novo Protocolo Personalizado",
                      objective: "Prescrição individualizada",
                      prescriptionMode: "speed",
                      mesocycleWeeks: 4,
                      version: 1,
                      status: "draft",
                      daysPrescription: [SAMPLE_AEROBIC_PROTOCOL.daysPrescription[0]],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    setEditingProtocol(emptyProto);
                  }}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.createProtocolBtnText}>Novo Manual</Text>
                </TouchableOpacity>
              </View>

              {protocols.map((p) => (
                <View key={p.id} style={styles.protocolCard}>
                  <View style={styles.protocolCardHeader}>
                    <Text style={styles.protocolCardTitle}>{p.title}</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        await duplicateAerobicProtocol(p.id, trainerId);
                        loadData();
                      }}
                    >
                      <Ionicons name="copy-outline" size={18} color="#888" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.protocolObjective}>{p.objective}</Text>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => setEditingProtocol(p)}
                    >
                      <Text style={styles.actionBtnSmallText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: brandColor }]}
                      onPress={async () => {
                        await approveAerobicProtocol(p.id, trainerId);
                        Alert.alert("Sucesso", "Protocolo aprovado para envio!");
                        loadData();
                      }}
                    >
                      <Text style={styles.actionBtnSmallText}>Aprovar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ABA 5: ATRIBUÍDOS */}
          {activeTab === "assigned" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Protocolos Atribuídos a Alunos</Text>
              {protocols
                .filter((p) => p.status === "assigned" || p.status === "approved")
                .map((p) => (
                  <View key={p.id} style={styles.protocolCard}>
                    <View style={styles.protocolCardHeader}>
                      <View>
                        <Text style={styles.protocolCardTitle}>{p.title}</Text>
                        <Text style={styles.protocolCardSub}>Aluno: {p.studentName}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: "#13251a", borderColor: "#22543d" }]}>
                        <Text style={[styles.statusBadgeText, { color: "#48bb78" }]}>Ativo</Text>
                      </View>
                    </View>
                    <Text style={styles.protocolObjective}>{p.objective}</Text>

                    <TouchableOpacity
                      style={[styles.testExecutionBtn, { borderColor: brandColor }]}
                      onPress={() => setRunningProtocol(p)}
                    >
                      <Ionicons name="play" size={16} color={brandColor} />
                      <Text style={[styles.testExecutionBtnText, { color: brandColor }]}>
                        Simular Execução do Aluno
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}

          {/* ABA 6: EVOLUÇÃO */}
          {activeTab === "evolution" && (
            <View style={styles.tabContent}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Evolução Longitudinal de Velocidade & Limiar</Text>
                <Text style={styles.sectionDesc}>
                  Acompanhamento das avaliações e execuções registradas ao longo dos mesociclos.
                </Text>

                <View style={styles.evolutionCard}>
                  <View style={styles.evolutionMetricRow}>
                    <View>
                      <Text style={styles.evolutionLabel}>Velocidade de Limiar (Conconi)</Text>
                      <Text style={[styles.evolutionVal, { color: brandColor }]}>8.0 → 9.5 km/h</Text>
                    </View>
                    <View style={styles.evolutionDeltaBadge}>
                      <Ionicons name="arrow-up" size={14} color="#10B981" />
                      <Text style={styles.evolutionDeltaText}>+18.7%</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.evolutionCard}>
                  <View style={styles.evolutionMetricRow}>
                    <View>
                      <Text style={styles.evolutionLabel}>Adesão às Sessões Aeróbicas</Text>
                      <Text style={styles.evolutionVal}>92% de conclusão</Text>
                    </View>
                    <View style={styles.evolutionDeltaBadge}>
                      <Ionicons name="checkmark" size={14} color="#10B981" />
                      <Text style={styles.evolutionDeltaText}>Excelente</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL EDITOR DE PROTOCOLOS */}
      {editingProtocol && (
        <AerobicProtocolEditor
          initialProtocol={editingProtocol}
          trainerId={trainerId}
          brandColor={brandColor}
          onClose={() => setEditingProtocol(null)}
          onSaved={() => {
            setEditingProtocol(null);
            loadData();
          }}
        />
      )}

      {/* MODAL RUNNER DE EXECUÇÃO */}
      {runningProtocol && (
        <AerobicExecutionRunner
          visible={Boolean(runningProtocol)}
          protocol={runningProtocol}
          dayPrescription={runningProtocol.daysPrescription[0]}
          studentId={runningProtocol.studentId}
          brandColor={brandColor}
          onClose={() => setRunningProtocol(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#161616",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  backBtn: {
    padding: 6,
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
  },
  headerSub: {
    color: "#888",
    fontSize: 11.5,
  },
  aiShortcutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  aiShortcutText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  navTabsContainer: {
    backgroundColor: "#161616",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  navTabsScroll: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  navTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: "#181818",
  },
  navTabText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#888",
    fontSize: 13,
  },
  mainScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#161616",
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 14.5,
    fontWeight: "900",
  },
  sectionDesc: {
    color: "#888",
    fontSize: 12,
    lineHeight: 18,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    gap: 12,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#201414",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  itemSub: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  protocolCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 10,
  },
  protocolCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  protocolCardTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  protocolCardSub: {
    color: "#888",
    fontSize: 11.5,
    marginTop: 2,
  },
  modeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  modeTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  protocolObjective: {
    color: "#BBB",
    fontSize: 12,
    lineHeight: 17,
  },
  protocolCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 10,
  },
  mesocycleText: {
    color: "#777",
    fontSize: 11,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnSmallText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  stageInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  stageInputCol: {
    flex: 1,
  },
  inputMiniLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  miniInput: {
    backgroundColor: "#202020",
    color: "#FFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: "800",
  },
  addStageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
  },
  addStageBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  stagesTable: {
    backgroundColor: "#181818",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#202020",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  th: {
    flex: 1,
    color: "#888",
    fontSize: 10.5,
    fontWeight: "800",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#222",
    alignItems: "center",
  },
  td: {
    flex: 1,
    color: "#DDD",
    fontSize: 12,
  },
  analysisResultCard: {
    backgroundColor: "#1a1616",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#3a2222",
    gap: 10,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  analysisStatusTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  analysisExplanation: {
    color: "#BBB",
    fontSize: 12,
    lineHeight: 17,
  },
  analysisMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  analysisMetricItem: {
    width: "48%",
    backgroundColor: "#201a1a",
    padding: 10,
    borderRadius: 6,
  },
  analysisMetricLabel: {
    color: "#888",
    fontSize: 10,
  },
  analysisMetricVal: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  saveAssessmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  saveAssessmentBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  wizardHeader: {
    marginBottom: 4,
  },
  wizardStepText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  wizardTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  studentSelectPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#181818",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#282828",
  },
  studentSelectText: {
    color: "#DDD",
    fontSize: 13,
    fontWeight: "700",
  },
  nextStepBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  nextStepBtnText: {
    color: "#FFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  modeOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#181818",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#282828",
  },
  modeOptionInfo: {
    flex: 1,
    gap: 2,
  },
  modeOptionTitle: {
    color: "#FFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  modeOptionDesc: {
    color: "#888",
    fontSize: 11.5,
    lineHeight: 16,
  },
  wizardBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  prevStepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  prevStepBtnText: {
    color: "#CCC",
    fontSize: 13,
    fontWeight: "700",
  },
  goalPillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  goalPill: {
    backgroundColor: "#181818",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#282828",
  },
  goalPillText: {
    color: "#888",
    fontSize: 11.5,
    fontWeight: "700",
  },
  paramRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 4,
  },
  paramCol: {
    flex: 1,
  },
  freqRow: {
    flexDirection: "row",
    gap: 6,
  },
  freqPill: {
    flex: 1,
    backgroundColor: "#202020",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  freqPillText: {
    color: "#888",
    fontSize: 11.5,
    fontWeight: "700",
  },
  generateAIBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  generateAIBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  suggestionsContainer: {
    gap: 14,
  },
  suggestionsTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  suggestionCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#282828",
    gap: 8,
  },
  suggestionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBoxText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
  },
  suggestionDuration: {
    color: "#AAA",
    fontSize: 12,
    fontWeight: "700",
  },
  sugTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  sugObjective: {
    color: "#BBB",
    fontSize: 12,
  },
  justificationBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#1c1810",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#382d18",
  },
  justificationText: {
    color: "#d9a74a",
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
  },
  useSuggestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  useSuggestionBtnText: {
    color: "#FFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  createProtocolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createProtocolBtnText: {
    color: "#FFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  testExecutionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  testExecutionBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  evolutionCard: {
    backgroundColor: "#181818",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#282828",
  },
  evolutionMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  evolutionLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  evolutionVal: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  evolutionDeltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#13251a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  evolutionDeltaText: {
    color: "#48bb78",
    fontSize: 11.5,
    fontWeight: "800",
  },
});
