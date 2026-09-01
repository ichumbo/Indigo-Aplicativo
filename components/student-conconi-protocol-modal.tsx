import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AerobicConconiProtocol,
  shareConconiProtocolAsPdf,
} from "@/services/conconi-protocol-service";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useResponsiveLayout } from "@/constants/responsive";

export type StudentConconiProtocolModalProps = {
  visible: boolean;
  protocol: AerobicConconiProtocol | null;
  onClose: () => void;
};

function formatBrDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const clean = dateStr.trim();
  if (clean.length === 10 && clean.includes("-")) {
    const [y, m, d] = clean.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return dateStr;
}

export function StudentConconiProtocolModal({
  visible,
  protocol,
  onClose,
}: StudentConconiProtocolModalProps) {
  const { theme, isDark } = useAppTheme();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === "ios" ? 48 : 16);
  const [sharingPdf, setSharingPdf] = useState(false);

  if (!protocol) return null;

  const handleSharePdf = async () => {
    setSharingPdf(true);
    try {
      await shareConconiProtocolAsPdf(protocol, protocol.trainerId || "trainer");
    } catch (err) {
      Alert.alert("Erro ao Gerar PDF", err instanceof Error ? err.message : "Não foi possível gerar o PDF.");
    } finally {
      setSharingPdf(false);
    }
  };

  const testResult = protocol.conconiTestResult;
  const observationText =
    protocol.generalNotes?.trim() ||
    "O protocolo será atualizado a cada duas semanas, desde que cada treino seja realizado duas vezes.";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View
        style={[styles.container, { backgroundColor: theme.background, paddingTop: topInset }]}
      >
        {/* TOP BAR */}
        <View style={[styles.topBar, { borderBottomColor: theme.divider }]}>
          <TouchableOpacity
            style={[styles.topRoundBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={onClose}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fechar"
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.topTitleBlock}>
            <Text style={[styles.topTitleMain, { color: theme.text }]} numberOfLines={1}>
              {protocol.title || "Protocolo Aeróbio"}
            </Text>
            <Text style={[styles.topSubtitle, { color: theme.textSecondary }]}>
              Início: {formatBrDate(protocol.protocolDate)}
            </Text>
          </View>

          <View style={styles.topActionsRight}>
            <TouchableOpacity
              style={[styles.topRoundBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
              onPress={handleSharePdf}
              disabled={sharingPdf}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Compartilhar PDF"
            >
              {sharingPdf ? (
                <ActivityIndicator size="small" color="#D90000" />
              ) : (
                <Ionicons name="document-text-outline" size={18} color={theme.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: layout.horizontalPadding,
              maxWidth: layout.contentMaxWidth,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO BANNER DO PROTOCOLO */}
          <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroIconBox, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="speedometer-outline" size={22} color="#D90000" />
              </View>
              <View style={styles.heroTitleBox}>
                <Text style={[styles.heroTitle, { color: theme.text }]}>
                  {protocol.title || "Protocolo Aeróbio"}
                </Text>
                <Text style={[styles.heroDate, { color: theme.textSecondary }]}>
                  Início em {formatBrDate(protocol.protocolDate)}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Ativo</Text>
              </View>
            </View>

            {/* OBSERVAÇÃO DE ACOMPANHAMENTO */}
            <View
              style={[
                styles.notesContainer,
                {
                  backgroundColor: isDark ? "rgba(217, 0, 0, 0.08)" : "rgba(217, 0, 0, 0.04)",
                  borderColor: isDark ? "rgba(217, 0, 0, 0.25)" : "rgba(217, 0, 0, 0.15)",
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={18} color="#D90000" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.notesLabel, { color: "#D90000" }]}>Observação do Personal</Text>
                <Text style={[styles.notesBody, { color: theme.text }]}>{observationText}</Text>
              </View>
            </View>
          </View>

          {/* ORIENTAÇÕES DE AQUECIMENTO */}
          {!!protocol.warmupText && (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="flame-outline" size={16} color="#D90000" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Aquecimento Recomendado</Text>
              </View>
              <Text style={[styles.sectionBodyText, { color: theme.textSecondary }]}>
                {protocol.warmupText}
              </Text>
            </View>
          )}

          {/* PARÂMETROS FISIOLÓGICOS CONCONI (SE HOUVER) */}
          {testResult && (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="pulse-outline" size={16} color="#D90000" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Zonas e Parâmetros (Conconi)</Text>
              </View>

              <View style={styles.kpiGrid}>
                <View style={[styles.kpiBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>FC LIMIAR</Text>
                  <Text style={[styles.kpiValue, { color: "#D90000" }]}>
                    {testResult.deflectionHeartRate || 156} <Text style={styles.kpiUnit}>bpm</Text>
                  </Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>VEL. LIMIAR</Text>
                  <Text style={[styles.kpiValue, { color: "#D90000" }]}>
                    {testResult.deflectionSpeedKmh || 6.5} <Text style={styles.kpiUnit}>km/h</Text>
                  </Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>FC MÁXIMA</Text>
                  <Text style={[styles.kpiValue, { color: theme.text }]}>
                    {testResult.maxHeartRate || 172} <Text style={styles.kpiUnit}>bpm</Text>
                  </Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>VO₂ MÁX</Text>
                  <Text style={[styles.kpiValue, { color: theme.text }]}>
                    {testResult.vo2MaxEstimate || 42.5} <Text style={styles.kpiUnit}>ml/kg</Text>
                  </Text>
                </View>
              </View>

              {/* ZONAS DE INTENSIDADE */}
              {testResult.zones && (
                <View style={styles.zonesContainer}>
                  <View style={[styles.zoneRow, { borderLeftColor: "#10B981" }]}>
                    <Text style={[styles.zoneName, { color: "#10B981" }]}>Z1 (Recuperação):</Text>
                    <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>{testResult.zones.z1Recovery}</Text>
                  </View>
                  <View style={[styles.zoneRow, { borderLeftColor: "#3B82F6" }]}>
                    <Text style={[styles.zoneName, { color: "#3B82F6" }]}>Z2 (Aeróbio):</Text>
                    <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>{testResult.zones.z2Aerobic}</Text>
                  </View>
                  <View style={[styles.zoneRow, { borderLeftColor: "#F59E0B" }]}>
                    <Text style={[styles.zoneName, { color: "#F59E0B" }]}>Z3 (Limiar):</Text>
                    <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>{testResult.zones.z3Threshold}</Text>
                  </View>
                  <View style={[styles.zoneRow, { borderLeftColor: "#EA580C" }]}>
                    <Text style={[styles.zoneName, { color: "#EA580C" }]}>Z4 (VO₂ Máx):</Text>
                    <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>{testResult.zones.z4Vo2Max}</Text>
                  </View>
                  <View style={[styles.zoneRow, { borderLeftColor: "#EF4444" }]}>
                    <Text style={[styles.zoneName, { color: "#EF4444" }]}>Z5 (Anaeróbio):</Text>
                    <Text style={[styles.zoneDesc, { color: theme.textSecondary }]}>{testResult.zones.z5Anaerobic}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* PRESCRIÇÃO SEMANAL DIA A DIA */}
          <View style={styles.daysSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={16} color="#D90000" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Divisão & Prescrição Semanal</Text>
            </View>

            {protocol.daysPrescription?.map((dp, idx) => (
              <View
                key={dp.id || String(idx)}
                style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={styles.dayCardTop}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>{dp.dayOfWeek}</Text>
                  </View>
                  <View style={[styles.volumeBadge, { backgroundColor: theme.cardSecondary }]}>
                    <Ionicons name="time-outline" size={12} color="#D90000" />
                    <Text style={[styles.volumeBadgeText, { color: theme.text }]}>
                      {dp.totalVolumeMinutes} min
                    </Text>
                  </View>
                </View>

                <Text style={[styles.dayDescription, { color: theme.text }]}>{dp.description}</Text>

                {/* Tag de detalhes técnicos da série */}
                <View style={styles.techTagsRow}>
                  {dp.intervalsCount ? (
                    <View style={[styles.techTag, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                      <Text style={[styles.techTagText, { color: theme.textSecondary }]}>
                        {dp.intervalsCount} séries de {dp.activeDurationMinutes}min @ {dp.activeSpeedKmh}km/h
                      </Text>
                    </View>
                  ) : null}
                  {dp.pauseDurationMinutes ? (
                    <View style={[styles.techTag, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                      <Text style={[styles.techTagText, { color: theme.textSecondary }]}>
                        Pausa: {dp.pauseDurationMinutes}min @ {dp.pauseSpeedKmh}km/h
                      </Text>
                    </View>
                  ) : null}
                  {dp.continuousMinutes ? (
                    <View style={[styles.techTag, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                      <Text style={[styles.techTagText, { color: theme.textSecondary }]}>
                        Contínuo: {dp.continuousMinutes}min @ {dp.continuousSpeedKmh}km/h
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {/* BOTÃO EXPORTAR PDF */}
          <TouchableOpacity
            style={styles.pdfExportBtn}
            onPress={handleSharePdf}
            disabled={sharingPdf}
            activeOpacity={0.84}
          >
            {sharingPdf ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.pdfExportBtnText}>Baixar / Compartilhar Laudo PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  topTitleBlock: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  topTitleMain: {
    fontSize: 16,
    fontWeight: "800",
  },
  topSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  topActionsRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    paddingTop: 16,
    alignSelf: "center",
    width: "100%",
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroTitleBox: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  heroDate: {
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  activeBadgeText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },
  notesContainer: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  notesBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionBodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  kpiBox: {
    flex: 1,
    minWidth: "45%",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  kpiUnit: {
    fontSize: 11,
    fontWeight: "500",
  },
  zonesContainer: {
    gap: 6,
    marginTop: 4,
  },
  zoneRow: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 2,
  },
  zoneName: {
    fontSize: 12,
    fontWeight: "700",
  },
  zoneDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  daysSection: {
    marginBottom: 20,
  },
  dayCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  dayCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayBadge: {
    backgroundColor: "#D90000",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dayBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  volumeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  volumeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dayDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  techTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  techTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  techTagText: {
    fontSize: 11,
  },
  pdfExportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  pdfExportBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
