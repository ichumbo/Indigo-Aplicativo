import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MigrationConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  summary: {
    currentStudentCount: number;
    studentsToCreateCount: number;
    studentsToLinkCount: number;
    workoutsCount: number;
    exercisesTotalCount: number;
    assessmentsCount: number;
    mediaCount: number;
    pendingIssuesCount: number;
    limitExceeded: boolean;
    maxAllowed: number;
    subStatus: {
      isPro: boolean;
    };
  } | null;
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

export const MigrationConfirmModal: React.FC<MigrationConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isSaving,
  summary,
  activeColor,
  theme,
}) => {
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);

  if (!summary) return null;

  const canProceed = hasConfirmedCheckbox && !isSaving && !summary.limitExceeded;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color={activeColor} />
              <Text style={[styles.title, { color: theme.text }]}>Confirmar Importação</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} disabled={isSaving}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.leadText, { color: theme.textSecondary }]}>
              Você está prestes a importar os seguintes dados para a sua conta no DragonCorp:
            </Text>

            {/* Itens do Resumo */}
            <View style={[styles.summaryBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
              {summary.studentsToCreateCount > 0 && (
                <View style={styles.itemRow}>
                  <Ionicons name="person-add" size={16} color={activeColor} />
                  <Text style={[styles.itemText, { color: theme.text }]}>
                    <Text style={{ fontWeight: "700" }}>{summary.studentsToCreateCount}</Text> novos alunos serão criados
                  </Text>
                </View>
              )}

              {summary.studentsToLinkCount > 0 && (
                <View style={styles.itemRow}>
                  <Ionicons name="link" size={16} color={activeColor} />
                  <Text style={[styles.itemText, { color: theme.text }]}>
                    <Text style={{ fontWeight: "700" }}>{summary.studentsToLinkCount}</Text> alunos existentes serão vinculados
                  </Text>
                </View>
              )}

              <View style={styles.itemRow}>
                <Ionicons name="document-text" size={16} color={activeColor} />
                <Text style={[styles.itemText, { color: theme.text }]}>
                  <Text style={{ fontWeight: "700" }}>{summary.workoutsCount}</Text> treinos ({summary.exercisesTotalCount} exercícios) como <Text style={{ fontWeight: "700", color: "#F59E0B" }}>RASCUNHO</Text>
                </Text>
              </View>

              {summary.assessmentsCount > 0 && (
                <View style={styles.itemRow}>
                  <Ionicons name="clipboard" size={16} color={activeColor} />
                  <Text style={[styles.itemText, { color: theme.text }]}>
                    <Text style={{ fontWeight: "700" }}>{summary.assessmentsCount}</Text> avaliações físicas com histórico preservado
                  </Text>
                </View>
              )}

              {summary.mediaCount > 0 && (
                <View style={styles.itemRow}>
                  <Ionicons name="images" size={16} color={activeColor} />
                  <Text style={[styles.itemText, { color: theme.text }]}>
                    <Text style={{ fontWeight: "700" }}>{summary.mediaCount}</Text> imagens e vídeos associados
                  </Text>
                </View>
              )}

              {summary.pendingIssuesCount > 0 && (
                <View style={styles.itemRow}>
                  <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                  <Text style={[styles.itemText, { color: theme.text }]}>
                    <Text style={{ fontWeight: "700" }}>{summary.pendingIssuesCount}</Text> itens permanecerão pendentes de revisão
                  </Text>
                </View>
              )}
            </View>

            {/* Verificação do Limite do Plano */}
            {summary.limitExceeded ? (
              <View style={[styles.alertBox, { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#EF4444" }]}>
                <Ionicons name="warning" size={20} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: "#EF4444" }]}>Limite de Alunos do Plano Free</Text>
                  <Text style={[styles.alertDesc, { color: theme.textSecondary }]}>
                    Seu plano atual permite até {summary.maxAllowed} aluno(s). Criar {summary.studentsToCreateCount} novo(s) aluno(s) ultrapassa esse limite. Faça upgrade para o plano PRO para alunos ilimitados ou vincule a alunos existentes.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.guaranteeBox, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="lock-closed-outline" size={16} color="#10B981" />
                <Text style={[styles.guaranteeText, { color: theme.textSecondary }]}>
                  Segurança: Nenhum treino é publicado aos alunos e nenhum convite de login é disparado sem seu consentimento. Reversão (rollback) disponível por 30 dias.
                </Text>
              </View>
            )}

            {/* Checkbox Obrigatório */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setHasConfirmedCheckbox(!hasConfirmedCheckbox)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={hasConfirmedCheckbox ? "checkbox" : "square-outline"}
                size={22}
                color={hasConfirmedCheckbox ? activeColor : theme.textMuted}
              />
              <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                Revisei os dados e confirmo esta importação para o DragonCorp.
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Botão de Ação */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: canProceed ? activeColor : theme.cardSecondary },
              !canProceed && styles.confirmBtnDisabled,
            ]}
            onPress={onConfirm}
            disabled={!canProceed}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color={canProceed ? "#FFFFFF" : theme.textMuted} />
                <Text style={[styles.confirmBtnText, { color: canProceed ? "#FFFFFF" : theme.textMuted }]}>
                  Importar Dados com Segurança
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    marginBottom: 16,
  },
  leadText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemText: {
    fontSize: 13,
    flex: 1,
  },
  alertBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  guaranteeText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  checkboxLabel: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
    fontWeight: "600",
  },
  confirmBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

