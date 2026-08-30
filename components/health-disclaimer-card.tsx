import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type HealthDisclaimerContext =
  | "body_composition"
  | "cardiorespiratory"
  | "anamnesis"
  | "general_assessment"
  | "hydration";

interface HealthDisclaimerCardProps {
  context: HealthDisclaimerContext;
  protocolName?: string;
  evaluatorName?: string;
  date?: string;
  limitations?: string;
  compact?: boolean;
}

export function HealthDisclaimerCard({
  context,
  protocolName,
  evaluatorName,
  date,
  limitations,
  compact = false,
}: HealthDisclaimerCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  const getContextInfo = () => {
    switch (context) {
      case "body_composition":
        return {
          title: "Acompanhamento Físico • Estimativa de Composição Corporal",
          body: "Os percentuais de gordura e massa magra são estimativas estatísticas baseadas em dobras cutâneas ou bioimpedância. Não constituem laudo médico ou diagnóstico nutricional definitivo.",
          icon: "analytics-outline" as const,
        };
      case "cardiorespiratory":
        return {
          title: "Capacidade Cardiorrespiratória • Parâmetro Funcional",
          body: "Os testes de VO₂Max e limiares (Conconi, Cooper, Rockport) indicam condicionamento aeróbico para prescrição de treino. Indivíduos com histórico cardíaco, tonturas ou dores torácicas devem realizar teste ergométrico hospitalar com médico cardiologista.",
          icon: "heart-outline" as const,
        };
      case "anamnesis":
        return {
          title: "Triagem Pré-Participação e Histórico de Saúde",
          body: "Este questionário tem finalidade exclusiva de mapeamento de limitações biomecânicas e hábitos para prática segura de exercícios físicos. Em caso de sintomas agudos, procure atendimento médico imediatamente.",
          icon: "clipboard-outline" as const,
        };
      case "hydration":
        return {
          title: "Metas Hídricas • Diretrizes Orientativas",
          body: "Os volumes calculados baseiam-se em referências médias para adultos ativos. Portadores de cardiopatias ou nefropatias devem seguir a recomendação hídrica prescrita por seu médico assistente.",
          icon: "water-outline" as const,
        };
      case "general_assessment":
      default:
        return {
          title: "Aviso de Saúde e Limitações Metodológicas",
          body: "As métricas e avaliações físicas fornecidas auxiliam no acompanhamento esportivo e não substituem exames clínicos ou parecer médico individualizado. Em emergências, acione o SAMU (192).",
          icon: "shield-checkmark-outline" as const,
        };
    }
  };

  const info = getContextInfo();

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={styles.iconCircle}>
          <Ionicons name={info.icon} size={16} color="#60A5FA" />
        </View>
        <Text style={styles.cardTitle}>{info.title}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9CA3AF"
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.bodyText}>{info.body}</Text>

          {/* METADADOS METODOLÓGICOS */}
          {(protocolName || evaluatorName || date || limitations) && (
            <View style={styles.metaBox}>
              {protocolName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Protocolo:</Text>
                  <Text style={styles.metaValue}>{protocolName}</Text>
                </View>
              )}
              {evaluatorName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Avaliador Responsável:</Text>
                  <Text style={styles.metaValue}>{evaluatorName}</Text>
                </View>
              )}
              {date && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Data do Registro:</Text>
                  <Text style={styles.metaValue}>{date}</Text>
                </View>
              )}
              {limitations && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Limitações:</Text>
                  <Text style={styles.metaValue}>{limitations}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.emergencyRow}>
            <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
            <Text style={styles.emergencyText}>
              Decisões médicas e diagnósticos devem ser conduzidos exclusivamente por profissionais habilitados de medicina.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#111318",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E2430",
    padding: 12,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
  },
  cardBody: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1A202C",
    paddingTop: 8,
  },
  bodyText: {
    fontSize: 11.5,
    color: "#94A3B8",
    lineHeight: 16,
    marginBottom: 8,
  },
  metaBox: {
    backgroundColor: "#0D1117",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1A2230",
    padding: 8,
    marginBottom: 8,
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 10.5,
    color: "#CBD5E1",
    fontWeight: "700",
  },
  emergencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  emergencyText: {
    flex: 1,
    fontSize: 10,
    color: "#64748B",
    lineHeight: 13,
  },
});
