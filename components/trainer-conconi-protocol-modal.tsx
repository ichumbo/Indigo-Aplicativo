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
  Image,
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
          <TouchableOpacity style={styles.topRoundBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#D90000" />
          </TouchableOpacity>

          <View style={styles.topTitleBlock}>
            <Text style={styles.topTitleMain}>Teste Aeróbio Conconi</Text>
            <Text style={styles.topSubtitle}>Prescrição & Protocolo Semanal</Text>
          </View>

          <View style={styles.topActionsRight}>
            <TouchableOpacity
              style={styles.topRoundBtn}
              onPress={handleSharePdf}
              disabled={sharingPdf}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color="#D90000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topRoundBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-sharp" size={20} color="#D90000" />
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
              size={13}
              color={activeTab === "protocol" ? "#FFFFFF" : "#888888"}
            />
            <Text
              style={[styles.tabBtnText, activeTab === "protocol" && styles.tabBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Protocolo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "conconi" && styles.tabBtnActive]}
            onPress={() => setActiveTab("conconi")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="analytics-outline"
              size={13}
              color={activeTab === "conconi" ? "#FFFFFF" : "#888888"}
            />
            <Text
              style={[styles.tabBtnText, activeTab === "conconi" && styles.tabBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
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
              size={13}
              color={activeTab === "preview" ? "#FFFFFF" : "#888888"}
            />
            <Text
              style={[styles.tabBtnText, activeTab === "preview" && styles.tabBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
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
          {/* STUDENT SELECTOR CAROUSEL WITH PHOTOS */}
          {students.length > 0 && (
            <View style={styles.studentSelectorBlock}>
              <View style={styles.studentSelectorHeader}>
                <Ionicons name="people-outline" size={14} color="#D90000" />
                <Text style={styles.blockLabel}>Aluno selecionado:</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentCardsScroll}
              >
                {students.map((std) => {
                  const isSelected = std.id === selectedStudentId;
                  return (
                    <TouchableOpacity
                      key={std.id}
                      style={[
                        styles.studentCard,
                        isSelected && styles.studentCardActive,
                      ]}
                      onPress={() => handleStudentSelect(std)}
                      activeOpacity={0.8}
                    >
                      {std.avatar ? (
                        <Image
                          source={{ uri: std.avatar }}
                          style={[
                            styles.studentAvatarImg,
                            isSelected && styles.studentAvatarImgActive,
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.studentAvatarPlaceholder,
                            isSelected && styles.studentAvatarPlaceholderActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.studentAvatarInitials,
                              isSelected && styles.studentAvatarInitialsActive,
                            ]}
                          >
                            {getInitials(std.name)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.studentInfoBlock}>
                        <Text
                          style={[
                            styles.studentCardName,
                            isSelected && styles.studentCardNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {std.name}
                        </Text>
                        <Text
                          style={[
                            styles.studentCardSub,
                            isSelected && styles.studentCardSubActive,
                          ]}
                          numberOfLines={1}
                        >
                          {std.objective || std.statusLabel || "Aluno Ativo"}
                        </Text>
                      </View>

                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={17} color="#D90000" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* TAB 1: PROTOCOLO SEMANAL */}
          {activeTab === "protocol" && (
            <View style={styles.tabContent}>
              {/* CARD: IDENTIFICAÇÃO DO PROTOCOLO */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.iconCircleSmall}>
                    <Ionicons name="document-text-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.sectionCardTitle}>Identificação do Protocolo</Text>
                </View>

                {/* Título do Protocolo */}
                <View style={styles.fieldGroup}>
                  <View style={styles.inputWithIconHeader}>
                    <Ionicons name="pencil-outline" size={13} color="#D90000" />
                    <Text style={styles.fieldLabel}>Título da Prescrição</Text>
                  </View>
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
                  <View style={styles.inputWithIconHeader}>
                    <Ionicons name="flame-outline" size={13} color="#D90000" />
                    <Text style={styles.fieldLabel}>Aquecimento (Obrigatório)</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.multilineInput, { borderColor: "rgba(217, 0, 0, 0.4)" }]}
                    value={warmupText}
                    onChangeText={setWarmupText}
                    placeholder="Ex: 5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)"
                    placeholderTextColor="#666"
                    multiline
                  />
                </View>
              </View>

              {/* CARD: PRESCRIÇÃO DOS DIAS DA SEMANA */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.iconCircleSmall}>
                    <Ionicons name="calendar-outline" size={16} color="#D90000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionCardTitle}>Prescrição dos Dias da Semana</Text>
                    <Text style={styles.sectionCardSub}>Adicione e configure a rotina de cada dia</Text>
                  </View>
                </View>

                {/* Quick Add Scroll */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickDayAddScroll}
                >
                  {(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const).map(
                    (dayName) => (
                      <TouchableOpacity
                        key={dayName}
                        style={styles.quickAddDayChip}
                        onPress={() => handleAddDay(dayName)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle-outline" size={13} color="#D90000" />
                        <Text style={styles.quickAddDayChipText}>{dayName}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                {/* Lista de Dias Prescritos */}
                <View style={styles.daysCardsContainer}>
                  {days.length === 0 ? (
                    <View style={styles.emptyDaysState}>
                      <Ionicons name="calendar-outline" size={26} color="#555555" />
                      <Text style={styles.emptyDaysText}>Nenhum dia prescrito ainda</Text>
                      <Text style={styles.emptyDaysSub}>Toque nos botões acima para adicionar dias</Text>
                    </View>
                  ) : (
                    days.map((day, idx) => (
                      <View key={day.id || idx} style={styles.dayCard}>
                        <View style={styles.dayCardTop}>
                          <View style={styles.dayBadge}>
                            <Ionicons name="calendar-sharp" size={12} color="#F59E0B" />
                            <Text style={styles.dayBadgeText}>{day.dayOfWeek}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeDayBtn}
                            onPress={() => handleRemoveDay(idx)}
                            activeOpacity={0.7}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={15} color="#ff5a5a" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.inputWithIconHeader}>
                          <Ionicons name="fitness-outline" size={12} color="#D90000" />
                          <Text style={styles.fieldSubLabel}>Descrição da Sessão (séries, ritmo e velocidade)</Text>
                        </View>

                        <TextInput
                          style={[styles.input, styles.dayTextInput]}
                          value={day.description}
                          onChangeText={(val) => handleUpdateDayText(idx, val)}
                          placeholder="Ex: 4x 3 min ativos a 5.6 km/h com 2 min pausa ativa a 3.0 km/h."
                          placeholderTextColor="#666"
                          multiline
                        />
                      </View>
                    ))
                  )}
                </View>
              </View>

              {/* CARD: OBSERVAÇÕES E RECOMENDAÇÕES */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.iconCircleSmall}>
                    <Ionicons name="information-circle-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.sectionCardTitle}>Recomendações e Orientações Gerais</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={generalNotes}
                  onChangeText={setGeneralNotes}
                  placeholder="Orientações sobre hidratação, intensidade, monitoramento cardíaco..."
                  placeholderTextColor="#666"
                  multiline
                />
              </View>

              {/* PDF Share Banner Button */}
              <TouchableOpacity
                style={styles.sharePdfBanner}
                onPress={handleSharePdf}
                activeOpacity={0.85}
              >
                <View style={styles.sharePdfIconBox}>
                  <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sharePdfTitle}>Mandar PDF Teste Aeróbio (Conconi)</Text>
                  <Text style={styles.sharePdfSub}>
                    Gera ficha executiva com sua foto, logo, cores e laudo de Conconi
                  </Text>
                </View>
                <Ionicons name="share-social-outline" size={20} color="#D90000" />
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: LAUDO CONCONI */}
          {activeTab === "conconi" && (
            <View style={styles.tabContent}>
              <View style={styles.conconiCard}>
                <View style={styles.conconiCardHeader}>
                  <View style={styles.iconCircleSmall}>
                    <Ionicons name="pulse-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.conconiCardTitle}>Parâmetros do Teste de Conconi</Text>
                </View>

                <View style={styles.twoColGrid}>
                  <View style={styles.col}>
                    <View style={styles.inputWithIconHeader}>
                      <Ionicons name="heart-outline" size={13} color="#D90000" />
                      <Text style={styles.fieldLabel}>FC Limiar (bpm)</Text>
                    </View>
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
                    <View style={styles.inputWithIconHeader}>
                      <Ionicons name="speedometer-outline" size={13} color="#D90000" />
                      <Text style={styles.fieldLabel}>Velocidade Limiar (km/h)</Text>
                    </View>
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
                    <View style={styles.inputWithIconHeader}>
                      <Ionicons name="flame-outline" size={13} color="#D90000" />
                      <Text style={styles.fieldLabel}>FC Máxima (bpm)</Text>
                    </View>
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
                    <View style={styles.inputWithIconHeader}>
                      <Ionicons name="fitness-outline" size={13} color="#D90000" />
                      <Text style={styles.fieldLabel}>VO₂ Máx (ml/kg/min)</Text>
                    </View>
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
                <View style={styles.conconiCardHeader}>
                  <View style={styles.iconCircleSmall}>
                    <Ionicons name="bar-chart-outline" size={16} color="#D90000" />
                  </View>
                  <Text style={styles.zonesBoxTitle}>Zonas de Frequência Cardíaca Calculadas</Text>
                </View>

                {[
                  {
                    zone: "Z1 (Recuperação)",
                    range: `< ${Math.round((parseFloat(deflectionHR) || 156) * 0.8)} bpm`,
                    desc: "Regenerativo & Aquecimento",
                    color: "#10B981",
                    icon: "battery-charging-outline" as const,
                  },
                  {
                    zone: "Z2 (Aeróbio Leve)",
                    range: `${Math.round((parseFloat(deflectionHR) || 156) * 0.81)} a ${Math.round((parseFloat(deflectionHR) || 156) * 0.92)} bpm`,
                    desc: "Queima de gordura & Base aeróbia",
                    color: "#3B82F6",
                    icon: "walk-outline" as const,
                  },
                  {
                    zone: "Z3 (Limiar Anaeróbio)",
                    range: `${Math.round((parseFloat(deflectionHR) || 156) * 0.93)} a ${Math.round(parseFloat(deflectionHR) || 156)} bpm`,
                    desc: "Ritmo de prova & Resistência específica",
                    color: "#F59E0B",
                    icon: "bicycle-outline" as const,
                  },
                  {
                    zone: "Z4 (VO₂ Máx)",
                    range: `${(parseFloat(deflectionHR) || 156) + 1} a ${Math.round((parseFloat(maxHR) || 172) * 0.96)} bpm`,
                    desc: "Tiro curto & Alta intensidade aeróbia",
                    color: "#EA580C",
                    icon: "speedometer-outline" as const,
                  },
                  {
                    zone: "Z5 (Anaeróbio Alático)",
                    range: `> ${Math.round((parseFloat(maxHR) || 172) * 0.96)} bpm`,
                    desc: "Esforço máximo & Sprint anaeróbio",
                    color: "#EF4444",
                    icon: "flash-outline" as const,
                  },
                ].map((item) => (
                  <View key={item.zone} style={styles.zoneCard}>
                    <View style={styles.zoneCardHeader}>
                      <View style={styles.zoneNameRow}>
                        <View style={[styles.zoneColorDot, { backgroundColor: item.color }]} />
                        <Ionicons name={item.icon} size={14} color={item.color} />
                        <Text style={[styles.zoneTag, { color: item.color }]}>{item.zone}</Text>
                      </View>
                      <View style={[styles.zoneBpmBadge, { backgroundColor: `${item.color}18`, borderColor: `${item.color}40` }]}>
                        <Text style={[styles.zoneBpmText, { color: item.color }]}>{item.range}</Text>
                      </View>
                    </View>
                    <Text style={styles.zoneDescText}>{item.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 3: PRÉVIA ALUNO */}
          {activeTab === "preview" && (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeaderRow}>
                <Ionicons name="calendar-outline" size={20} color="#D90000" />
                <Text style={styles.previewMainTitle} numberOfLines={2}>
                  {title}
                </Text>
              </View>

              {/* Aquecimento */}
              <View style={styles.previewWarmupCard}>
                <View style={styles.previewWarmupHeader}>
                  <Ionicons name="flame-outline" size={15} color="#D90000" />
                  <Text style={styles.previewWarmupTitle}>Aquecimento Sugerido</Text>
                </View>
                <Text style={styles.previewWarmupText}>{warmupText}</Text>
              </View>

              {/* Dias Prescritos */}
              <View style={styles.previewDaysList}>
                {days.map((day, idx) => (
                  <View key={day.id || idx} style={styles.previewDayCard}>
                    <View style={styles.previewDayCardHeader}>
                      <View style={styles.previewDayBadge}>
                        <Ionicons name="calendar-sharp" size={11} color="#FFAA00" />
                        <Text style={styles.previewDayBadgeText}>{day.dayOfWeek}</Text>
                      </View>
                      <View style={styles.previewVolumeBadge}>
                        <Ionicons name="time-outline" size={11} color="#888888" />
                        <Text style={styles.previewVolumeText}>{day.totalVolumeMinutes || 20} min</Text>
                      </View>
                    </View>
                    <Text style={styles.previewDayDescription}>
                      {day.description.replace(new RegExp(`^${day.dayOfWeek}\\s*-\\s*`, "i"), "")}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Botão de Envio de PDF na Prévia */}
              <TouchableOpacity
                style={[styles.sharePdfBanner, { marginTop: 20 }]}
                onPress={handleSharePdf}
                activeOpacity={0.85}
              >
                <View style={styles.sharePdfIconBox}>
                  <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sharePdfTitle}>Enviar Este Protocolo em PDF</Text>
                  <Text style={styles.sharePdfSub}>
                    Compartilhe direto via WhatsApp para {selectedStudentName}
                  </Text>
                </View>
                <Ionicons name="share-social-outline" size={20} color="#D90000" />
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 18,
    paddingBottom: 14,
    backgroundColor: "#101010",
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  topRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleBlock: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  topTitleMain: {
    color: "#D90000",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  topSubtitle: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
    textAlign: "center",
  },
  topActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  /* Tab Switcher */
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#111111",
    padding: 3,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: "#D90000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  studentSelectorBlock: {
    marginBottom: 16,
    gap: 8,
  },
  studentSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  blockLabel: {
    color: "#AAAAAA",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  studentCardsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 170,
  },
  studentCardActive: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderColor: "#D90000",
  },
  studentAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#333333",
  },
  studentAvatarImgActive: {
    borderColor: "#D90000",
    borderWidth: 1.5,
  },
  studentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarPlaceholderActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  studentAvatarInitials: {
    color: "#AAAAAA",
    fontSize: 12.5,
    fontWeight: "900",
  },
  studentAvatarInitialsActive: {
    color: "#FFFFFF",
  },
  studentInfoBlock: {
    flex: 1,
  },
  studentCardName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  studentCardNameActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  studentCardSub: {
    color: "#777777",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 1,
  },
  studentCardSubActive: {
    color: "#FFAAAA",
  },

  tabContent: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  sectionCardSub: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },

  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "800",
  },
  fieldSubLabel: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },

  daysSectionHeader: {
    gap: 6,
    marginTop: 4,
  },
  daysSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  daysSectionSub: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "600",
  },
  quickDayAddScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  quickAddDayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#282828",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
  },
  quickAddDayChipText: {
    color: "#DDDDDD",
    fontSize: 11.5,
    fontWeight: "800",
  },

  daysCardsContainer: {
    gap: 10,
    marginTop: 4,
  },
  emptyDaysState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 4,
    backgroundColor: "#101010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    borderStyle: "dashed",
  },
  emptyDaysText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  emptyDaysSub: {
    color: "#555555",
    fontSize: 11,
    fontWeight: "600",
  },

  dayCard: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#242424",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#201710",
    borderWidth: 1,
    borderColor: "#442e18",
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
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255, 90, 90, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayTextInput: {
    minHeight: 56,
    textAlignVertical: "top",
    fontSize: 13,
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },

  /* Share PDF Banner */
  sharePdfBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 6,
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
    fontSize: 13.5,
    fontWeight: "900",
  },
  sharePdfSub: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },

  /* Laudo Conconi */
  iconCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  conconiCard: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
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
  inputWithIconHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },

  zonesBox: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  zonesBoxTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  zoneCard: {
    backgroundColor: "#101010",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 10,
    gap: 4,
  },
  zoneCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoneNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  zoneColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneTag: {
    fontSize: 12,
    fontWeight: "800",
  },
  zoneBpmBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  zoneBpmText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  zoneDescText: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 14,
  },

  /* Prévia Aluno */
  previewContainer: {
    backgroundColor: "#101010",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  previewMainTitle: {
    color: "#FFFFFF",
    fontSize: 16.5,
    fontWeight: "900",
    flex: 1,
  },
  previewWarmupCard: {
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  previewWarmupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewWarmupTitle: {
    color: "#D90000",
    fontSize: 11.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  previewWarmupText: {
    color: "#EEEEEE",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  previewDaysList: {
    gap: 10,
  },
  previewDayCard: {
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    gap: 6,
  },
  previewDayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewDayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#201710",
    borderWidth: 1,
    borderColor: "#442e18",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewDayBadgeText: {
    color: "#F59E0B",
    fontSize: 11.5,
    fontWeight: "900",
  },
  previewVolumeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewVolumeText: {
    color: "#AAAAAA",
    fontSize: 11,
    fontWeight: "700",
  },
  previewDayDescription: {
    color: "#DDDDDD",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
});
