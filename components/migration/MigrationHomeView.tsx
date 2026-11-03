import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationSession } from "@/services/mobile-migration-store";

interface MigrationHomeViewProps {
  activeSession: MigrationSession | null;
  recentSessions: MigrationSession[];
  onStartNew: () => void;
  onResumeActive: () => void;
  onOpenHelp: () => void;
  onLoadDemo: () => void;
  onSelectSession: (session: MigrationSession) => void;
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

export const MigrationHomeView: React.FC<MigrationHomeViewProps> = ({
  activeSession,
  recentSessions,
  onStartNew,
  onResumeActive,
  onOpenHelp,
  onLoadDemo,
  onSelectSession,
  activeColor,
  theme,
}) => {
  const getOriginLabel = (origin: string) => {
    switch (origin) {
      case "mfit":
        return "MFIT Personal";
      case "avaliacao_pro":
        return "Avaliação Física PRO";
      case "spreadsheet":
        return "Planilha Excel/CSV";
      case "pdf":
        return "PDF / Documento";
      case "photos":
        return "Fotos de Fichas";
      default:
        return "Outro Aplicativo";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Concluída", color: "#10B981", icon: "checkmark-circle" as const };
      case "completed_with_issues":
        return { label: "Com pendências", color: "#F59E0B", icon: "alert-circle" as const };
      case "ready_for_review":
        return { label: "Aguardando revisão", color: activeColor, icon: "eye" as const };
      case "draft":
        return { label: "Rascunho", color: theme.textMuted, icon: "create-outline" as const };
      case "rolled_back":
        return { label: "Desfeita", color: "#EF4444", icon: "arrow-undo" as const };
      default:
        return { label: status, color: theme.textMuted, icon: "ellipse" as const };
    }
  };

  return (
    <View style={styles.container}>
      {/* Banner de Boas-vindas Limpo */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.heroIconBox, { backgroundColor: activeColor }]}>
          <Ionicons name="sparkles" size={26} color="#FFFFFF" />
        </View>

        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Importador Inteligente
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          Traga seus alunos, treinos e avaliações para o DragonCorp sem começar do zero.
        </Text>

        {/* Se houver sessão em andamento, dá destaque para continuar */}
        {activeSession && activeSession.status !== "completed" && activeSession.status !== "rolled_back" ? (
          <TouchableOpacity
            style={[styles.resumeActionBtn, { backgroundColor: activeColor }]}
            onPress={onResumeActive}
            activeOpacity={0.85}
          >
            <View style={styles.resumeBtnContent}>
              <Ionicons name="play-circle" size={20} color="#FFFFFF" />
              <View>
                <Text style={styles.resumeBtnTitle}>Continuar Importação em Andamento</Text>
                <Text style={styles.resumeBtnSub}>
                  Etapa {activeSession.currentStep} de 5 • {getOriginLabel(activeSession.origin)}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: activeColor }]}
            onPress={onStartNew}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Iniciar Nova Importação</Text>
          </TouchableOpacity>
        )}

        {/* Ações Secundárias */}
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={[styles.secondaryActionChip, { backgroundColor: theme.cardSecondary }]}
            onPress={onStartNew}
          >
            <Ionicons name="add" size={16} color={theme.text} />
            <Text style={[styles.secondaryActionText, { color: theme.text }]}>Nova</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionChip, { backgroundColor: theme.cardSecondary }]}
            onPress={onOpenHelp}
          >
            <Ionicons name="help-circle-outline" size={16} color={theme.text} />
            <Text style={[styles.secondaryActionText, { color: theme.text }]}>Como funciona</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionChip, { backgroundColor: theme.cardSecondary }]}
            onPress={onLoadDemo}
          >
            <Ionicons name="sparkles-outline" size={16} color={theme.text} />
            <Text style={[styles.secondaryActionText, { color: theme.text }]}>Demonstração</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Histórico de Migrações Recentes */}
      <View style={styles.recentSection}>
        <Text style={[styles.recentSectionTitle, { color: theme.text }]}>
          Migrações Recentes ({recentSessions.length})
        </Text>

        {recentSessions.length === 0 ? (
          <View style={[styles.emptyRecentBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Ionicons name="time-outline" size={24} color={theme.textMuted} />
            <Text style={[styles.emptyRecentText, { color: theme.textSecondary }]}>
              Nenhuma migração anterior registrada.
            </Text>
            <Text style={[styles.emptyRecentSub, { color: theme.textMuted }]}>
              Suas próximas migrações e relatórios aparecerão organizados aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentSessions.map((item) => {
              const badge = getStatusBadge(item.status);
              const totalItems = (item.students?.length || 0) + (item.workouts?.length || 0);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.recentCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => onSelectSession(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recentCardLeft}>
                    <View style={[styles.recentIconBox, { backgroundColor: theme.cardSecondary }]}>
                      <Ionicons
                        name={item.origin === "mfit" ? "barbell-outline" : "document-text-outline"}
                        size={18}
                        color={activeColor}
                      />
                    </View>
                    <View>
                      <Text style={[styles.recentOrigin, { color: theme.text }]}>
                        {getOriginLabel(item.origin)}
                      </Text>
                      <Text style={[styles.recentDate, { color: theme.textMuted }]}>
                        {new Date(item.createdAt).toLocaleDateString("pt-BR")} • {totalItems} registros
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recentCardRight}>
                    <View style={[styles.statusPill, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
                      <Ionicons name={badge.icon} size={12} color={badge.color} />
                      <Text style={[styles.statusPillText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    gap: 20,
  },
  heroCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
  },
  heroIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  primaryActionBtn: {
    height: 50,
    width: "100%",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  resumeActionBtn: {
    height: 56,
    width: "100%",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  resumeBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resumeBtnTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  resumeBtnSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11.5,
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  secondaryActionChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recentSection: {
    gap: 10,
  },
  recentSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyRecentBox: {
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyRecentText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyRecentSub: {
    fontSize: 12,
    textAlign: "center",
  },
  recentList: {
    gap: 8,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  recentCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  recentOrigin: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 2,
  },
  recentDate: {
    fontSize: 11.5,
  },
  recentCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

