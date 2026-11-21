import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AerobicProtocolRecord,
  AerobicDayPrescription,
  DayOfWeek,
  saveAerobicProtocol,
  saveAerobicProtocolAsTemplate,
} from "@/services/aerobic-protocol-store";
import {
  AerobicBlockInput,
  AerobicPrescriptionMode,
  calculateSessionDuration,
} from "@/services/aerobic-protocol-ai-service";

interface AerobicProtocolEditorProps {
  initialProtocol: AerobicProtocolRecord;
  trainerId?: string;
  brandColor?: string;
  onClose: () => void;
  onSaved?: (protocol: AerobicProtocolRecord) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function AerobicProtocolEditor({
  initialProtocol,
  trainerId = "trainer",
  brandColor = "#D90000",
  onClose,
  onSaved,
}: AerobicProtocolEditorProps) {
  const [protocol, setProtocol] = useState<AerobicProtocolRecord>(initialProtocol);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    initialProtocol.daysPrescription[0]?.dayOfWeek || "Segunda"
  );
  const [saving, setSaving] = useState(false);

  // Dia ativo no editor
  const currentDayIndex = protocol.daysPrescription.findIndex(
    (d) => d.dayOfWeek === selectedDay
  );
  const currentDayPrescription: AerobicDayPrescription | undefined =
    protocol.daysPrescription[currentDayIndex];

  // Recalcula duração total do dia atual dinamicamente
  const sessionDuration = currentDayPrescription
    ? calculateSessionDuration(
        currentDayPrescription.blocks,
        currentDayPrescription.warmupMinutes || 0,
        currentDayPrescription.cooldownMinutes || 0
      )
    : { totalMinutes: 0, formattedDuration: "0 min", totalSeconds: 0 };

  const updateCurrentDay = (updated: Partial<AerobicDayPrescription>) => {
    if (currentDayIndex === -1) {
      // Cria novo dia se não existir
      const newDay: AerobicDayPrescription = {
        id: `day-${Date.now()}`,
        dayOfWeek: selectedDay,
        sessionTitle: `Treino de ${selectedDay}`,
        prescriptionMode: protocol.prescriptionMode,
        warmupMinutes: 5,
        warmupText: "5 min aquecimento progressivo",
        blocks: [],
        cooldownMinutes: 3,
        cooldownText: "3 min volta à calma",
        totalDurationMinutes: 8,
        ...updated,
      };
      setProtocol((prev) => ({
        ...prev,
        daysPrescription: [...prev.daysPrescription, newDay],
      }));
    } else {
      setProtocol((prev) => {
        const copy = [...prev.daysPrescription];
        const merged = { ...copy[currentDayIndex], ...updated };
        const dur = calculateSessionDuration(
          merged.blocks,
          merged.warmupMinutes,
          merged.cooldownMinutes
        );
        merged.totalDurationMinutes = dur.totalMinutes;
        copy[currentDayIndex] = merged;
        return { ...prev, daysPrescription: copy };
      });
    }
  };

  const handleAddBlock = (type: AerobicBlockInput["blockType"]) => {
    const newBlock: AerobicBlockInput = {
      id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      blockType: type,
      name:
        type === "interval"
          ? "Bloco Intervalado"
          : type === "continuous"
          ? "Bloco Contínuo"
          : "Descanso Interbloco",
      reps: type === "interval" ? 4 : 1,
      workDurationSeconds: type === "interval" ? 90 : 600,
      workSpeedKmh: 9.0,
      workHrBpmMin: 145,
      workHrBpmMax: 160,
      workRpe: 6,
      restDurationSeconds: type === "interval" ? 60 : 120,
      restSpeedKmh: 5.0,
      restType: "active",
      includeRestAfterLastRep: true,
      durationSeconds: type === "continuous" ? 600 : type === "interblock_rest" ? 120 : undefined,
    };

    const currentBlocks = currentDayPrescription ? [...currentDayPrescription.blocks] : [];
    updateCurrentDay({ blocks: [...currentBlocks, newBlock] });
  };

  const handleRemoveBlock = (blockIndex: number) => {
    if (!currentDayPrescription) return;
    const currentBlocks = [...currentDayPrescription.blocks];
    currentBlocks.splice(blockIndex, 1);
    updateCurrentDay({ blocks: currentBlocks });
  };

  const handleDuplicateBlock = (blockIndex: number) => {
    if (!currentDayPrescription) return;
    const currentBlocks = [...currentDayPrescription.blocks];
    const item = currentBlocks[blockIndex];
    const clone: AerobicBlockInput = {
      ...item,
      id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${item.name} (Cópia)`,
    };
    currentBlocks.splice(blockIndex + 1, 0, clone);
    updateCurrentDay({ blocks: currentBlocks });
  };

  const handleUpdateBlock = (blockIndex: number, fields: Partial<AerobicBlockInput>) => {
    if (!currentDayPrescription) return;
    const currentBlocks = [...currentDayPrescription.blocks];
    currentBlocks[blockIndex] = { ...currentBlocks[blockIndex], ...fields };
    updateCurrentDay({ blocks: currentBlocks });
  };

  const handleSaveProtocol = async (asApproved = false) => {
    setSaving(true);
    try {
      const toSave: AerobicProtocolRecord = {
        ...protocol,
        status: asApproved ? "approved" : protocol.status,
        approvedAt: asApproved ? new Date().toISOString() : protocol.approvedAt,
        updatedAt: new Date().toISOString(),
      };
      const saved = await saveAerobicProtocol(toSave);
      setSaving(false);
      Alert.alert(
        "Sucesso",
        asApproved
          ? "Protocolo aprovado e pronto para o aluno!"
          : "Protocolo salvo com sucesso!"
      );
      if (onSaved) onSaved(saved);
      onClose();
    } catch {
      setSaving(false);
      Alert.alert("Erro", "Não foi possível salvar o protocolo.");
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      await saveAerobicProtocolAsTemplate(protocol.id, trainerId, `[Modelo] ${protocol.title}`);
      Alert.alert("Sucesso", "Modelo salvo na biblioteca para reutilização futura!");
    } catch {
      Alert.alert("Erro", "Falha ao salvar modelo.");
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Editor Profissional de Blocos
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {protocol.studentName ? `Aluno: ${protocol.studentName}` : "Prescrição Aeróbica"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: brandColor }]}
          onPress={() => handleSaveProtocol(false)}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={18} color="#FFF" />
          <Text style={styles.saveBtnText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* PARÂMETROS GERAIS DO PROTOCOLO */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>INFORMAÇÕES DA PRESCRIÇÃO</Text>

          <Text style={styles.label}>Título do Protocolo</Text>
          <TextInput
            style={styles.input}
            value={protocol.title}
            onChangeText={(t) => setProtocol((p) => ({ ...p, title: t }))}
            placeholder="Ex: Treino de Limiar e Potência Aeróbica"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Objetivo Clínico / Esportivo</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={protocol.objective}
            onChangeText={(t) => setProtocol((p) => ({ ...p, objective: t }))}
            placeholder="Descreva o objetivo fisiológico deste ciclo..."
            placeholderTextColor="#666"
            multiline
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Modo de Prescrição</Text>
              <View style={styles.modePillContainer}>
                {(["speed", "hr", "hybrid"] as AerobicPrescriptionMode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.modePill,
                      protocol.prescriptionMode === m && {
                        backgroundColor: brandColor,
                        borderColor: brandColor,
                      },
                    ]}
                    onPress={() => setProtocol((p) => ({ ...p, prescriptionMode: m }))}
                  >
                    <Text
                      style={[
                        styles.modePillText,
                        protocol.prescriptionMode === m && styles.modePillTextActive,
                      ]}
                    >
                      {m === "speed" ? "Velocidade" : m === "hr" ? "Frequência" : "Híbrido"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.colSmall}>
              <Text style={styles.label}>Mesociclo</Text>
              <View style={styles.weeksRow}>
                {[2, 4, 6, 8].map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[
                      styles.weekPill,
                      protocol.mesocycleWeeks === w && {
                        backgroundColor: brandColor,
                        borderColor: brandColor,
                      },
                    ]}
                    onPress={() => setProtocol((p) => ({ ...p, mesocycleWeeks: w }))}
                  >
                    <Text
                      style={[
                        styles.weekPillText,
                        protocol.mesocycleWeeks === w && styles.weekPillTextActive,
                      ]}
                    >
                      {w} sem
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* SELETOR DE DIAS DA SEMANA */}
        <View style={styles.daySelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAYS_OF_WEEK.map((day) => {
              const hasConfig = protocol.daysPrescription.some((d) => d.dayOfWeek === day);
              const isSelected = selectedDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayTab,
                    isSelected && { borderColor: brandColor, backgroundColor: "#261313" },
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text
                    style={[
                      styles.dayTabText,
                      isSelected && { color: brandColor, fontWeight: "900" },
                    ]}
                  >
                    {day}
                  </Text>
                  {hasConfig && <View style={[styles.dayDot, { backgroundColor: brandColor }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* DETALHES DO DIA SELECIONADO */}
        {currentDayPrescription ? (
          <View style={styles.dayPrescriptionBox}>
            {/* BARRA DE VOLUME TOTAL DINÂMICO */}
            <View style={styles.volumeHeader}>
              <View>
                <Text style={styles.volumeTitle}>
                  {currentDayPrescription.sessionTitle || `Treino de ${selectedDay}`}
                </Text>
                <Text style={styles.volumeSub}>
                  Modo: {protocol.prescriptionMode.toUpperCase()} • {currentDayPrescription.blocks.length} blocos
                </Text>
              </View>
              <View style={[styles.durationBadge, { borderColor: brandColor }]}>
                <Ionicons name="time-outline" size={16} color={brandColor} />
                <Text style={[styles.durationBadgeText, { color: brandColor }]}>
                  {sessionDuration.formattedDuration}
                </Text>
              </View>
            </View>

            {/* AQUECIMENTO */}
            <View style={styles.stageCard}>
              <View style={styles.stageHeader}>
                <View style={styles.stageTitleRow}>
                  <Ionicons name="flame-outline" size={18} color="#F59E0B" />
                  <Text style={styles.stageTitle}>1. Aquecimento</Text>
                </View>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    value={String(currentDayPrescription.warmupMinutes || 5)}
                    onChangeText={(val) =>
                      updateCurrentDay({ warmupMinutes: Math.max(0, parseInt(val, 10) || 0) })
                    }
                  />
                  <Text style={styles.unitText}>min</Text>
                </View>
              </View>
              <TextInput
                style={styles.stageDescInput}
                value={currentDayPrescription.warmupText}
                onChangeText={(t) => updateCurrentDay({ warmupText: t })}
                placeholder="Ex: 5 minutos na esteira de 4 a 6 km/h progressivo"
                placeholderTextColor="#666"
              />
            </View>

            {/* LISTA DE BLOCOS DINÂMICOS */}
            {currentDayPrescription.blocks.map((block, idx) => {
              const isInterval = block.blockType === "interval";
              const isContinuous = block.blockType === "continuous";
              const isRest = block.blockType === "interblock_rest";

              return (
                <View key={block.id || idx} style={styles.blockItemCard}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockTitleBox}>
                      <Text style={styles.blockTypeBadge}>
                        {isInterval ? "INTERVALADO" : isContinuous ? "CONTÍNUO" : "DESCANSO"}
                      </Text>
                      <TextInput
                        style={styles.blockNameInput}
                        value={block.name}
                        onChangeText={(name) => handleUpdateBlock(idx, { name })}
                      />
                    </View>

                    <View style={styles.blockActionRow}>
                      <TouchableOpacity
                        onPress={() => handleDuplicateBlock(idx)}
                        style={styles.iconBtn}
                      >
                        <Ionicons name="copy-outline" size={18} color="#888" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveBlock(idx)}
                        style={styles.iconBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* FORMULÁRIO DO BLOCO INTERVALADO */}
                  {isInterval && (
                    <View style={styles.blockFormGrid}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Repetições (Tiros)</Text>
                        <TextInput
                          style={styles.gridInput}
                          keyboardType="numeric"
                          value={String(block.reps || 1)}
                          onChangeText={(v) =>
                            handleUpdateBlock(idx, { reps: Math.max(1, parseInt(v, 10) || 1) })
                          }
                        />
                      </View>

                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Duração do Tiro (s)</Text>
                        <TextInput
                          style={styles.gridInput}
                          keyboardType="numeric"
                          value={String(block.workDurationSeconds || 60)}
                          onChangeText={(v) =>
                            handleUpdateBlock(idx, { workDurationSeconds: parseInt(v, 10) || 0 })
                          }
                        />
                      </View>

                      {(protocol.prescriptionMode === "speed" ||
                        protocol.prescriptionMode === "hybrid") && (
                        <View style={styles.gridItem}>
                          <Text style={styles.gridLabel}>Velocidade Tiro (km/h)</Text>
                          <TextInput
                            style={styles.gridInput}
                            keyboardType="numeric"
                            value={String(block.workSpeedKmh || "")}
                            onChangeText={(v) =>
                              handleUpdateBlock(idx, { workSpeedKmh: parseFloat(v) || undefined })
                            }
                          />
                        </View>
                      )}

                      {(protocol.prescriptionMode === "hr" ||
                        protocol.prescriptionMode === "hybrid") && (
                        <View style={styles.gridItem}>
                          <Text style={styles.gridLabel}>FC Alvo (bpm)</Text>
                          <TextInput
                            style={styles.gridInput}
                            keyboardType="numeric"
                            placeholder="Min-Max"
                            placeholderTextColor="#666"
                            value={
                              block.workHrBpmMin
                                ? `${block.workHrBpmMin}-${block.workHrBpmMax || ""}`
                                : ""
                            }
                            onChangeText={(v) => {
                              const [min, max] = v.split("-").map((x) => parseInt(x.trim(), 10));
                              handleUpdateBlock(idx, {
                                workHrBpmMin: min || undefined,
                                workHrBpmMax: max || min || undefined,
                              });
                            }}
                          />
                        </View>
                      )}

                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Pausa Recuperação (s)</Text>
                        <TextInput
                          style={styles.gridInput}
                          keyboardType="numeric"
                          value={String(block.restDurationSeconds || 60)}
                          onChangeText={(v) =>
                            handleUpdateBlock(idx, { restDurationSeconds: parseInt(v, 10) || 0 })
                          }
                        />
                      </View>

                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Velocidade Pausa (km/h)</Text>
                        <TextInput
                          style={styles.gridInput}
                          keyboardType="numeric"
                          value={String(block.restSpeedKmh || "")}
                          onChangeText={(v) =>
                            handleUpdateBlock(idx, { restSpeedKmh: parseFloat(v) || undefined })
                          }
                        />
                      </View>
                    </View>
                  )}

                  {/* FORMULÁRIO DO BLOCO CONTÍNUO */}
                  {isContinuous && (
                    <View style={styles.blockFormGrid}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Duração (segundos)</Text>
                        <TextInput
                          style={styles.gridInput}
                          keyboardType="numeric"
                          value={String(block.workDurationSeconds || 600)}
                          onChangeText={(v) =>
                            handleUpdateBlock(idx, { workDurationSeconds: parseInt(v, 10) || 0 })
                          }
                        />
                      </View>

                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Velocidade Constante (km/h)</Text>
                        <TextInput
                          style={styles.gridInput}
                          keyboardType="numeric"
                          value={String(block.workSpeedKmh || "")}
                          onChangeText={(v) =>
                            handleUpdateBlock(idx, { workSpeedKmh: parseFloat(v) || undefined })
                          }
                        />
                      </View>
                    </View>
                  )}

                  {/* FORMULÁRIO DO DESCANSO INTERBLOCO */}
                  {isRest && (
                    <View style={styles.blockFormGrid}>
                      <View style={styles.gridItemFull}>
                        <Text style={styles.gridLabel}>Tempo de Descanso Interbloco (s)</Text>
                        <TextInput
                          style={styles.gridInput}
                          keyboardType="numeric"
                          value={String(block.restDurationSeconds || 120)}
                          onChangeText={(v) =>
                            handleUpdateBlock(idx, { restDurationSeconds: parseInt(v, 10) || 0 })
                          }
                        />
                      </View>
                    </View>
                  )}

                  {/* OBSERVAÇÃO DO BLOCO */}
                  <TextInput
                    style={styles.blockNotesInput}
                    value={block.notes}
                    onChangeText={(notes) => handleUpdateBlock(idx, { notes })}
                    placeholder="Instruções para o aluno nesta etapa..."
                    placeholderTextColor="#555"
                  />
                </View>
              );
            })}

            {/* BOTÕES DE ADICIONAR BLOCO */}
            <View style={styles.addBlockSection}>
              <Text style={styles.addBlockTitle}>Adicionar Novo Bloco:</Text>
              <View style={styles.addButtonsRow}>
                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: brandColor }]}
                  onPress={() => handleAddBlock("interval")}
                >
                  <Ionicons name="timer-outline" size={16} color={brandColor} />
                  <Text style={[styles.addBtnText, { color: brandColor }]}>+ Intervalado</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: "#3B82F6" }]}
                  onPress={() => handleAddBlock("continuous")}
                >
                  <Ionicons name="infinite-outline" size={16} color="#3B82F6" />
                  <Text style={[styles.addBtnText, { color: "#3B82F6" }]}>+ Contínuo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: "#10B981" }]}
                  onPress={() => handleAddBlock("interblock_rest")}
                >
                  <Ionicons name="pause-outline" size={16} color="#10B981" />
                  <Text style={[styles.addBtnText, { color: "#10B981" }]}>+ Pausa Interbloco</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* VOLTA À CALMA */}
            <View style={styles.stageCard}>
              <View style={styles.stageHeader}>
                <View style={styles.stageTitleRow}>
                  <Ionicons name="snow-outline" size={18} color="#60A5FA" />
                  <Text style={styles.stageTitle}>3. Volta à Calma</Text>
                </View>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    value={String(currentDayPrescription.cooldownMinutes || 3)}
                    onChangeText={(val) =>
                      updateCurrentDay({ cooldownMinutes: Math.max(0, parseInt(val, 10) || 0) })
                    }
                  />
                  <Text style={styles.unitText}>min</Text>
                </View>
              </View>
              <TextInput
                style={styles.stageDescInput}
                value={currentDayPrescription.cooldownText}
                onChangeText={(t) => updateCurrentDay({ cooldownText: t })}
                placeholder="Ex: 2 a 3 minutos a 3.5–4.0 km/h para desaceleração gradual"
                placeholderTextColor="#666"
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyDayBox}>
            <Ionicons name="calendar-outline" size={42} color="#666" />
            <Text style={styles.emptyDayTitle}>Nenhum treino prescrito para {selectedDay}</Text>
            <TouchableOpacity
              style={[styles.createDayBtn, { backgroundColor: brandColor }]}
              onPress={() => updateCurrentDay({ blocks: [] })}
            >
              <Text style={styles.createDayBtnText}>Prescrever Treino na {selectedDay}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BOTÕES DE FINALIZAÇÃO */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.footerBtnPrimary, { backgroundColor: brandColor }]}
            onPress={() => handleSaveProtocol(true)}
            disabled={saving}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#FFF" />
            <Text style={styles.footerBtnText}>Aprovar & Liberar para o Aluno</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerBtnSecondary}
            onPress={handleSaveAsTemplate}
          >
            <Ionicons name="bookmark-outline" size={18} color="#BBB" />
            <Text style={styles.footerBtnSecondaryText}>Salvar como Modelo Reutilizável</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 14,
    backgroundColor: "#161616",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  closeBtn: {
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
    fontSize: 12,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 10,
  },
  cardSectionTitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  label: {
    color: "#CCC",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  input: {
    backgroundColor: "#202020",
    color: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1.2,
  },
  colSmall: {
    flex: 0.8,
  },
  modePillContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#202020",
    alignItems: "center",
  },
  modePillText: {
    color: "#888",
    fontSize: 10.5,
    fontWeight: "700",
  },
  modePillTextActive: {
    color: "#FFF",
    fontWeight: "900",
  },
  weeksRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  weekPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#202020",
    alignItems: "center",
  },
  weekPillText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
  },
  weekPillTextActive: {
    color: "#FFF",
    fontWeight: "900",
  },
  daySelectorContainer: {
    marginVertical: 4,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 78,
  },
  dayTabText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
  },
  dayPrescriptionBox: {
    gap: 14,
  },
  volumeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#181818",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
  },
  volumeTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  volumeSub: {
    color: "#888",
    fontSize: 11.5,
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#221414",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationBadgeText: {
    fontSize: 13,
    fontWeight: "900",
  },
  stageCard: {
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#282828",
    gap: 8,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stageTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeInput: {
    backgroundColor: "#202020",
    color: "#FFF",
    width: 44,
    textAlign: "center",
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 13,
    fontWeight: "800",
  },
  unitText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  stageDescInput: {
    backgroundColor: "#202020",
    color: "#DDD",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  blockItemCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    gap: 10,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 8,
  },
  blockTitleBox: {
    flex: 1,
    gap: 4,
  },
  blockTypeBadge: {
    color: "#D90000",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  blockNameInput: {
    color: "#FFF",
    fontSize: 13.5,
    fontWeight: "800",
    padding: 0,
  },
  blockActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    padding: 4,
  },
  blockFormGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridItem: {
    width: "48%",
    backgroundColor: "#1c1c1c",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#282828",
  },
  gridItemFull: {
    width: "100%",
    backgroundColor: "#1c1c1c",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#282828",
  },
  gridLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  gridInput: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    padding: 0,
  },
  blockNotesInput: {
    backgroundColor: "#1c1c1c",
    color: "#BBB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11.5,
    borderWidth: 1,
    borderColor: "#282828",
  },
  addBlockSection: {
    backgroundColor: "#141414",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#222",
    gap: 8,
  },
  addBlockTitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  addButtonsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#1a1a1a",
  },
  addBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  emptyDayBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 12,
  },
  emptyDayTitle: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
  },
  createDayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createDayBtnText: {
    color: "#FFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  footerActions: {
    gap: 10,
    marginTop: 8,
  },
  footerBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  footerBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  footerBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  footerBtnSecondaryText: {
    color: "#BBB",
    fontSize: 13,
    fontWeight: "700",
  },
});
