import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationSession } from "@/services/mobile-migration-store";

interface MigrationAnalyzingViewProps {
  session: MigrationSession;
  isAnalyzing: boolean;
  currentStage: string;
  progressPercent: number;
  onCancel: () => void;
  onProceedToReview: () => void;
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

export const MigrationAnalyzingView: React.FC<MigrationAnalyzingViewProps> = ({
  session,
  isAnalyzing,
  currentStage,
  progressPercent,
  onCancel,
  onProceedToReview,
  activeColor,
  theme,
}) => {
  const totalExercises = session.workouts.reduce((acc, w) => acc + w.exercises.length, 0);
  const issuesCount = session.issues.length;

  return (
    <View style={styles.container}>
      {isAnalyzing ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ActivityIndicator size="large" color={activeColor} style={{ marginBottom: 16 }} />

          <Text style={[styles.analyzingTitle, { color: theme.text }]}>
            Analisando seus arquivos
          </Text>
          <Text style={[styles.analyzingStage, { color: activeColor }]}>
            {currentStage || "Lendo conteúdo e preparando dados..."}
          </Text>

          {/* Barra de Progresso Real */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.cardSecondary }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(5, progressPercent)}%`, backgroundColor: activeColor },
              ]}
            />
          </View>

          <Text style={[styles.progressPercentText, { color: theme.textMuted }]}>
            {progressPercent}% concluído
          </Text>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>
              Cancelar Análise
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.successIconCircle, { backgroundColor: activeColor }]}>
              <Ionicons name="checkmark-done" size={28} color="#FFFFFF" />
            </View>

            <Text style={[styles.resultTitle, { color: theme.text }]}>
              Análise Concluída com Sucesso!
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.textSecondary }]}>
              Identificamos os seguintes dados prontos para a sua revisão assistida:
            </Text>

            {/* Grid de Resultados Encontrados */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiItem, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="people" size={20} color={activeColor} />
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{session.students.length}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Alunos</Text>
              </View>

              <View style={[styles.kpiItem, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="barbell" size={20} color={activeColor} />
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{session.workouts.length}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Treinos</Text>
              </View>

              <View style={[styles.kpiItem, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="list" size={20} color={activeColor} />
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{totalExercises}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Exercícios</Text>
              </View>

              <View style={[styles.kpiItem, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="clipboard" size={20} color={activeColor} />
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{session.assessments.length}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Avaliações</Text>
              </View>

              <View style={[styles.kpiItem, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="image" size={20} color={activeColor} />
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{session.media.length}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Mídias / Vídeos</Text>
              </View>

              <View style={[styles.kpiItem, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons
                  name={issuesCount > 0 ? "alert-circle" : "checkmark-circle"}
                  size={20}
                  color={issuesCount > 0 ? "#F59E0B" : "#10B981"}
                />
                <Text style={[styles.kpiNumber, { color: issuesCount > 0 ? "#F59E0B" : "#10B981" }]}>
                  {issuesCount}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Pendências</Text>
              </View>
            </View>

            {issuesCount > 0 && (
              <View style={[styles.warningBox, { backgroundColor: theme.cardSecondary, borderColor: "#F59E0B" }]}>
                <Ionicons name="information-circle" size={18} color="#F59E0B" />
                <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                  Existem {issuesCount} itens que requerem sua atenção ou confirmação antes de gravar no DragonCorp.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.reviewActionBtn, { backgroundColor: activeColor }]}
              onPress={onProceedToReview}
              activeOpacity={0.85}
            >
              <Text style={styles.reviewActionBtnText}>Revisar Resultados</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  analyzingTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  analyzingStage: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  progressBarBg: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 12,
    marginBottom: 24,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  resultContainer: {
    gap: 16,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  resultSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
    marginBottom: 18,
  },
  kpiItem: {
    width: "31%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: "800",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    width: "100%",
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  reviewActionBtn: {
    height: 50,
    width: "100%",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  reviewActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

