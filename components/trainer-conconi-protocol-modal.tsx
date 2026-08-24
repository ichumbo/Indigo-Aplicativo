import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AerobicConconiProtocol,
  DayProtocolPrescription,
  DEFAULT_SAMPLE_CONCONI_PROTOCOL,
  saveConconiProtocol,
  shareConconiProtocolAsPdf,
} from "@/services/conconi-protocol-service";
import { TrainerHomeStudentSummary } from "@/services/trainer-home-store";

export type TrainerConconiProtocolModalProps = {
  visible: boolean;
  students?: TrainerHomeStudentSummary[];
  initialProtocol?: AerobicConconiProtocol;
  trainerId?: string;
  onClose: () => void;
  onSaved?: (protocol: AerobicConconiProtocol) => void;
};

export function TrainerConconiProtocolModal({
  visible,
  students = [],
  initialProtocol,
  trainerId = "trainer",
  onClose,
  onSaved,
}: TrainerConconiProtocolModalProps) {
  const [activeTab, setActiveTab] = useState<"protocol" | "conconi" | "preview">("protocol");
  const [selectedStudentId, setSelectedStudentId] = useState(
    initialProtocol?.studentId || (students[0]?.id ?? "student-1")
  );
  const [selectedStudentName, setSelectedStudentName] = useState(
    initialProtocol?.studentName || (students[0]?.name ?? "Charles Nóbrega")
  );

  const [title, setTitle] = useState(
    initialProtocol?.title || `Protocolo de treino aeróbico ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
  );
  const [warmupText, setWarmupText] = useState(
    initialProtocol?.warmupText || "5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)"
  );
  const [days, setDays] = useState<DayProtocolPrescription[]>(
    initialProtocol?.daysPrescription || DEFAULT_SAMPLE_CONCONI_PROTOCOL.daysPrescription
  );
  const [generalNotes, setGeneralNotes] = useState(
    initialProtocol?.generalNotes || "Mantenha hidratação constante durante todo o protocolo e relate qualquer desconforto respiratório ou articular."
  );

  const [deflectionHR, setDeflectionHR] = useState(
    String(initialProtocol?.conconiTestResult?.deflectionHeartRate || 156)
  );
  const [deflectionSpeed, setDeflectionSpeed] = useState(
    String(initialProtocol?.conconiTestResult?.deflectionSpeedKmh || 6.5)
  );
  const [maxHR, setMaxHR] = useState(
    String(initialProtocol?.conconiTestResult?.maxHeartRate || 172)
  );
  const [vo2Max, setVo2Max] = useState(
    String(initialProtocol?.conconiTestResult?.vo2MaxEstimate || 42.5)
  );

  const [saving, setSaving] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const handleStudentSelect = (std: TrainerHomeStudentSummary) => {
    setSelectedStudentId(std.id);
    setSelectedStudentName(std.name);
  };

  const handleAddDay = (dayName: DayProtocolPrescription["dayOfWeek"]) => {
    const newDay: DayProtocolPrescription = {
      id: `dp-${Date.now()}`,
      dayOfWeek: dayName,
      totalVolumeMinutes: 20,
      description: "4x 3 minutos ativos a 5.6 km/h e 2 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)",
    };
    setDays([...days, newDay]);
  };

  const handleUpdateDayText = (index: number, text: string) => {
    const updated = [...days];
    updated[index] = { ...updated[index], description: text };
    setDays(updated);
  };

  const handleRemoveDay = (index: number) => {
    setDays(days.filter((_, idx) => idx !== index));
  };

  const buildCurrentProtocol = (): AerobicConconiProtocol => {
    return {
      id: initialProtocol?.id || `conconi-${Date.now()}`,
      trainerId,
      studentId: selectedStudentId,
      studentName: selectedStudentName,
      protocolDate: initialProtocol?.protocolDate || new Date().toISOString().slice(0, 10),
      title: title.trim() || "Protocolo de treino aeróbico",
      warmupText: warmupText.trim() || "5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)",
      daysPrescription: days,
      generalNotes,
      conconiTestResult: {
        environment: "esteira",
        stages: initialProtocol?.conconiTestResult?.stages || DEFAULT_SAMPLE_CONCONI_PROTOCOL.conconiTestResult!.stages,
        deflectionHeartRate: parseFloat(deflectionHR) || 156,
        deflectionSpeedKmh: parseFloat(deflectionSpeed) || 6.5,
        maxHeartRate: parseFloat(maxHR) || 172,
        vo2MaxEstimate: parseFloat(vo2Max) || 42.5,
        zones: {
          z1Recovery: `< ${Math.round((parseFloat(deflectionHR) || 156) * 0.8)} bpm (Recuperação)`,
          z2Aerobic: `${Math.round((parseFloat(deflectionHR) || 156) * 0.81)} a ${Math.round((parseFloat(deflectionHR) || 156) * 0.92)} bpm (Aeróbio)`,
          z3Threshold: `${Math.round((parseFloat(deflectionHR) || 156) * 0.93)} a ${Math.round(parseFloat(deflectionHR) || 156)} bpm (Limiar)`,
          z4Vo2Max: `${(parseFloat(deflectionHR) || 156) + 1} a ${Math.round((parseFloat(maxHR) || 172) * 0.96)} bpm (VO2 Máx)`,
          z5Anaerobic: `> ${Math.round((parseFloat(maxHR) || 172) * 0.96)} bpm (Anaeróbio)`,
        },
      },
      createdAt: initialProtocol?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const proto = buildCurrentProtocol();
      await saveConconiProtocol(proto);
      Alert.alert("Sucesso", "Protocolo aeróbio salvo com sucesso!");
      if (onSaved) onSaved(proto);
      onClose();
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível salvar o protocolo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSharePdf = async () => {
    setSharingPdf(true);
    try {
      const proto = buildCurrentProtocol();
      await shareConconiProtocolAsPdf(proto, trainerId);
    } catch (err) {
      Alert.alert("Erro ao Gerar PDF", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setSharingPdf(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#D90000" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Teste Aeróbio (Conconi)</Text>

          <View style={styles.topActionsRight}>
            <TouchableOpacity
              style={styles.topBtn}
              onPress={handleSharePdf}
              disabled={sharingPdf}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={22} color="#D90000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-sharp" size={26} color="#D90000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* TABS SWITCHER */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "protocol" && styles.tabBtnActive]}
            onPress={() => setActiveTab("protocol")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={activeTab === "protocol" ? "#fff" : "#888"}
            />
            <Text style={[styles.tabBtnText, activeTab === "protocol" && styles.tabBtnTextActive]}>
              Protocolo Semanal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "conconi" && styles.tabBtnActive]}
            onPress={() => setActiveTab("conconi")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="analytics-outline"
              size={15}
              color={activeTab === "conconi" ? "#fff" : "#888"}
            />
            <Text style={[styles.tabBtnText, activeTab === "conconi" && styles.tabBtnTextActive]}>
              Laudo Conconi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "preview" && styles.tabBtnActive]}
            onPress={() => setActiveTab("preview")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="eye-outline"
              size={15}
              color={activeTab === "preview" ? "#fff" : "#888"}
            />
            <Text style={[styles.tabBtnText, activeTab === "preview" && styles.tabBtnTextActive]}>
              Prévia Aluno
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STUDENT SELECTOR ROW */}
          {students.length > 0 && (
            <View style={styles.studentSelectorBlock}>
              <Text style={styles.blockLabel}>Aluno selecionado:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {students.map((std) => {
                  const isSelected = std.id === selectedStudentId;
                  return (
                    <TouchableOpacity
                      key={std.id}
                      style={[styles.studentChip, isSelected && styles.studentChipActive]}
                      onPress={() => handleStudentSelect(std)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.studentChipText, isSelected && styles.studentChipTextActive]}>
                        {std.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* TAB 1: PROTOCOLO SEMANAL */}
          {activeTab === "protocol" && (
            <View style={styles.tabContent}>
              {/* Título do Protocolo */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Título do Protocolo</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex: Protocolo de treino aeróbico 24/08"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Aquecimento */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Aquecimento (Obrigatório)</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput, { borderColor: "#D90000" }]}
                  value={warmupText}
                  onChangeText={setWarmupText}
                  placeholder="Ex: 5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)"
                  placeholderTextColor="#666"
                  multiline
                />
              </View>

              {/* Dias Prescritos */}
              <View style={styles.daysHeaderRow}>
                <Text style={styles.fieldLabel}>Prescrição dos Dias da Semana</Text>
                <View style={styles.quickDayAddRow}>
                  {(["Segunda", "Quarta", "Sexta"] as const).map((dayName) => (
                    <TouchableOpacity
                      key={dayName}
                      style={styles.quickAddDayBtn}
                      onPress={() => handleAddDay(dayName)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAddDayBtnText}>+ {dayName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {days.map((day, idx) => (
                <View key={day.id || idx} style={styles.dayCard}>
                  <View style={styles.dayCardTop}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{day.dayOfWeek}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeDayBtn}
                      onPress={() => handleRemoveDay(idx)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ff5a5a" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.input, styles.dayTextInput]}
                    value={day.description}
                    onChangeText={(val) => handleUpdateDayText(idx, val)}
                    placeholder="Descrição da prescrição (séries ativas, pausas e velocidade)"
                    placeholderTextColor="#666"
                    multiline
                  />
                </View>
              ))}

              {/* PDF Share Banner Button */}
              <TouchableOpacity
                style={styles.sharePdfBanner}
                onPress={handleSharePdf}
                activeOpacity={0.85}
              >
                <View style={styles.sharePdfIconBox}>
                  <Ionicons name="document-text" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sharePdfTitle}>Mandar PDF Teste Aeróbio (Conconi)</Text>
                  <Text style={styles.sharePdfSub}>
                    Gera ficha executiva com sua foto, logo, cores e laudo de Conconi
                  </Text>
                </View>
                <Ionicons name="share-social-outline" size={22} color="#D90000" />
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: LAUDO CONCONI */}
          {activeTab === "conconi" && (
            <View style={styles.tabContent}>
              <View style={styles.conconiCard}>
                <View style={styles.conconiCardHeader}>
                  <Ionicons name="heart-circle-outline" size={24} color="#D90000" />
                  <Text style={styles.conconiCardTitle}>Parâmetros do Teste de Conconi</Text>
                </View>

                <View style={styles.twoColGrid}>
                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>FC no Limiar (bpm)</Text>
                    <TextInput
                      style={styles.input}
                      value={deflectionHR}
                      onChangeText={setDeflectionHR}
                      placeholder="156"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>Velocidade Limiar (km/h)</Text>
                    <TextInput
                      style={styles.input}
                      value={deflectionSpeed}
                      onChangeText={setDeflectionSpeed}
                      placeholder="6.5"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.twoColGrid}>
                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>FC Máxima (bpm)</Text>
                    <TextInput
                      style={styles.input}
                      value={maxHR}
                      onChangeText={setMaxHR}
                      placeholder="172"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>VO2 Máx (ml/kg/min)</Text>
                    <TextInput
                      style={styles.input}
                      value={vo2Max}
                      onChangeText={setVo2Max}
                      placeholder="42.5"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.zonesBox}>
                <Text style={styles.zonesBoxTitle}>Zonas de Frequência Cardíaca Calculadas</Text>
                <View style={styles.zoneRow}>
                  <Text style={[styles.zoneTag, { color: "#10B981" }]}>Z1 (Recuperação):</Text>
                  <Text style={styles.zoneVal}>&lt; {Math.round((parseFloat(deflectionHR) || 156) * 0.8)} bpm</Text>
                </View>
                <View style={styles.zoneRow}>
                  <Text style={[styles.zoneTag, { color: "#3B82F6" }]}>Z2 (Aeróbio Leve):</Text>
                  <Text style={styles.zoneVal}>{Math.round((parseFloat(deflectionHR) || 156) * 0.81)} a {Math.round((parseFloat(deflectionHR) || 156) * 0.92)} bpm</Text>
                </View>
                <View style={styles.zoneRow}>
                  <Text style={[styles.zoneTag, { color: "#F59E0B" }]}>Z3 (Limiar Anaeróbio):</Text>
                  <Text style={styles.zoneVal}>{Math.round((parseFloat(deflectionHR) || 156) * 0.93)} a {Math.round(parseFloat(deflectionHR) || 156)} bpm</Text>
                </View>
                <View style={styles.zoneRow}>
                  <Text style={[styles.zoneTag, { color: "#EA580C" }]}>Z4 (VO2 Máx):</Text>
                  <Text style={styles.zoneVal}>{(parseFloat(deflectionHR) || 156) + 1} a {Math.round((parseFloat(maxHR) || 172) * 0.96)} bpm</Text>
                </View>
                <View style={styles.zoneRow}>
                  <Text style={[styles.zoneTag, { color: "#EF4444" }]}>Z5 (Anaeróbio Alático):</Text>
                  <Text style={styles.zoneVal}>&gt; {Math.round((parseFloat(maxHR) || 172) * 0.96)} bpm</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: PRÉVIA ALUNO (IDENTICO AO PRINT) */}
          {activeTab === "preview" && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewMainTitle}>{title}</Text>

              {/* Aquecimento */}
              <View style={styles.previewWarmupPill}>
                <Text style={styles.previewWarmupText}>{warmupText}</Text>
              </View>

              {/* Dias Prescritos */}
              {days.map((day, idx) => (
                <View key={day.id || idx} style={styles.previewDayBlock}>
                  <Text style={styles.previewDayText}>
                    <Text style={styles.previewDayHighlight}>{day.dayOfWeek}</Text> - {day.description.replace(new RegExp(`^${day.dayOfWeek}\\s*-\\s*`, "i"), "")}
                  </Text>
                </View>
              ))}

              {/* Botão de Envio de PDF na Prévia */}
              <TouchableOpacity
                style={[styles.sharePdfBanner, { marginTop: 24 }]}
                onPress={handleSharePdf}
                activeOpacity={0.85}
              >
                <View style={styles.sharePdfIconBox}>
                  <Ionicons name="document-text" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sharePdfTitle}>Enviar Este Protocolo em PDF</Text>
                  <Text style={styles.sharePdfSub}>
                    Compartilhe direto via WhatsApp para {selectedStudentName}
                  </Text>
                </View>
                <Ionicons name="share-social-outline" size={22} color="#D90000" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: "#181818",
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  topBtn: {
    padding: 6,
  },
  topTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  topActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  /* Tab Switcher */
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#1C1C1C",
    padding: 6,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 12,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#D90000",
  },
  tabBtnText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },

  studentSelectorBlock: {
    marginBottom: 14,
  },
  blockLabel: {
    color: "#AAAAAA",
    fontSize: 12,
    fontWeight: "700",
  },
  studentChip: {
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  studentChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  studentChipText: {
    color: "#AAAAAA",
    fontSize: 12,
    fontWeight: "700",
  },
  studentChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  tabContent: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },

  daysHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  quickDayAddRow: {
    flexDirection: "row",
    gap: 6,
  },
  quickAddDayBtn: {
    backgroundColor: "#261919",
    borderWidth: 1,
    borderColor: "#4A2222",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickAddDayBtnText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "800",
  },

  dayCard: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#282828",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dayCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayBadge: {
    backgroundColor: "#2E1A1A",
    borderWidth: 1,
    borderColor: "#5A2828",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayBadgeText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "900",
  },
  removeDayBtn: {
    padding: 4,
  },
  dayTextInput: {
    minHeight: 56,
    textAlignVertical: "top",
    fontSize: 13,
  },

  /* Share PDF Banner */
  sharePdfBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1414",
    borderWidth: 1,
    borderColor: "#4A1A1A",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 10,
  },
  sharePdfIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  sharePdfTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  sharePdfSub: {
    color: "#AAAAAA",
    fontSize: 11,
    marginTop: 2,
  },

  /* Laudo Conconi */
  conconiCard: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  conconiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conconiCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  twoColGrid: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
    gap: 4,
  },

  zonesBox: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  zonesBoxTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  zoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  zoneTag: {
    fontSize: 12,
    fontWeight: "800",
  },
  zoneVal: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Prévia Aluno (Identico ao Print) */
  previewContainer: {
    backgroundColor: "#080808",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222222",
  },
  previewMainTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  previewWarmupPill: {
    backgroundColor: "#2C1216",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 20,
  },
  previewWarmupText: {
    color: "#FF4D6D",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  previewDayBlock: {
    marginBottom: 22,
  },
  previewDayText: {
    color: "#DDDDDD",
    fontSize: 14.5,
    fontWeight: "500",
    lineHeight: 22,
  },
  previewDayHighlight: {
    color: "#F59E0B",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
