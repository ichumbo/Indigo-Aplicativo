import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationDataType, MigrationOrigin } from "@/services/mobile-migration-store";

interface MigrationOriginSelectorProps {
  selectedOrigin: MigrationOrigin;
  onSelectOrigin: (origin: MigrationOrigin) => void;
  selectedDataTypes: MigrationDataType[];
  onToggleDataType: (type: MigrationDataType) => void;
  onOpenHelp: (origin: MigrationOrigin) => void;
  activeColor: string;
  theme: {
    card: string;
    cardSecondary: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
  };
}

interface OriginOption {
  id: MigrationOrigin;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  supportedTypes: string;
}

const ORIGINS: OriginOption[] = [
  {
    id: "mfit",
    title: "MFIT Personal",
    subtitle: "Importe alunos, treinos, avaliações e arquivos exportados.",
    icon: "barbell-outline",
    supportedTypes: "Alunos, Treinos, Fotos, Documentos",
  },
  {
    id: "avaliacao_pro",
    title: "Avaliação Física PRO",
    subtitle: "Importe relatórios de composição corporal, dobras e perímetros.",
    icon: "fitness-outline",
    supportedTypes: "Avaliações, Medidas, Fotos",
  },
  {
    id: "spreadsheet",
    title: "Planilha Excel ou CSV",
    subtitle: "Importe tabelas estruturadas de alunos, exercícios e séries.",
    icon: "grid-outline",
    supportedTypes: "Alunos, Treinos, Medidas",
  },
  {
    id: "pdf",
    title: "PDF ou Ficha Digital",
    subtitle: "Extração assistida de fichas de treino, anamneses e relatórios.",
    icon: "document-text-outline",
    supportedTypes: "Treinos, Anamneses, Relatórios",
  },
  {
    id: "photos",
    title: "Fotos de Fichas",
    subtitle: "Digitalize fichas de papel ou quadros fotografados pelo celular.",
    icon: "camera-outline",
    supportedTypes: "Fichas, Exercícios, Séries",
  },
  {
    id: "other",
    title: "Outro Aplicativo",
    subtitle: "Traga dados de outros sistemas via arquivos ou modelos padrão.",
    icon: "layers-outline",
    supportedTypes: "Dados Canônicos DragonCorp",
  },
];

const DATA_TYPES: { id: MigrationDataType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "students", label: "Alunos", icon: "people-outline" },
  { id: "workouts", label: "Treinos", icon: "barbell-outline" },
  { id: "assessments", label: "Avaliações", icon: "clipboard-outline" },
  { id: "anamnesis", label: "Anamneses", icon: "medkit-outline" },
  { id: "measurements", label: "Medidas", icon: "body-outline" },
  { id: "photos", label: "Fotos", icon: "image-outline" },
  { id: "videos", label: "Vídeos", icon: "videocam-outline" },
  { id: "documents", label: "Documentos", icon: "document-attach-outline" },
  { id: "history", label: "Histórico", icon: "time-outline" },
];

export const MigrationOriginSelector: React.FC<MigrationOriginSelectorProps> = ({
  selectedOrigin,
  onSelectOrigin,
  selectedDataTypes,
  onToggleDataType,
  onOpenHelp,
  activeColor,
  theme,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Escolha de Origem */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          1. De onde você está trazendo seus dados?
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Selecione a plataforma anterior ou o formato do seu material.
        </Text>
      </View>

      <View style={styles.originsGrid}>
        {ORIGINS.map((item) => {
          const isSelected = selectedOrigin === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.originCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isSelected ? activeColor : theme.cardBorder,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => onSelectOrigin(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isSelected ? activeColor : theme.cardSecondary,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isSelected ? "#FFFFFF" : activeColor}
                  />
                </View>

                {isSelected ? (
                  <View style={[styles.selectedCheck, { backgroundColor: activeColor }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>

              <Text style={[styles.originTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.originSubtitle, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.subtitle}
              </Text>

              <View style={[styles.typesBadge, { backgroundColor: theme.cardSecondary }]}>
                <Text style={[styles.typesBadgeText, { color: theme.textMuted }]}>
                  {item.supportedTypes}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Botão de Ajuda para a origem selecionada */}
      {(selectedOrigin === "mfit" || selectedOrigin === "avaliacao_pro" || selectedOrigin === "spreadsheet") && (
        <TouchableOpacity
          style={[styles.helpTriggerBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => onOpenHelp(selectedOrigin)}
          activeOpacity={0.8}
        >
          <View style={styles.helpTriggerLeft}>
            <Ionicons name="information-circle-outline" size={18} color={activeColor} />
            <Text style={[styles.helpTriggerText, { color: theme.text }]}>
              Como preparar e exportar seus arquivos do {selectedOrigin === "mfit" ? "MFIT" : selectedOrigin === "avaliacao_pro" ? "Avaliação Física PRO" : "Excel"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      )}

      {/* 2. Escolha do que importar */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          2. O que você deseja importar?
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Marque os tipos de registros que deseja trazer para o DragonCorp.
        </Text>
      </View>

      <View style={styles.dataTypesContainer}>
        {DATA_TYPES.map((type) => {
          const isChecked = selectedDataTypes.includes(type.id);

          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.dataTypeChip,
                {
                  backgroundColor: isChecked ? theme.cardSecondary : theme.card,
                  borderColor: isChecked ? activeColor : theme.cardBorder,
                },
              ]}
              onPress={() => onToggleDataType(type.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isChecked ? "checkbox" : "square-outline"}
                size={16}
                color={isChecked ? activeColor : theme.textMuted}
              />
              <Text
                style={[
                  styles.dataTypeLabel,
                  { color: isChecked ? theme.text : theme.textSecondary },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  originsGrid: {
    gap: 12,
  },
  originCard: {
    borderRadius: 14,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  originTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  originSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 10,
  },
  typesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  typesBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  helpTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
  },
  helpTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  helpTriggerText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  dataTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dataTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dataTypeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});

