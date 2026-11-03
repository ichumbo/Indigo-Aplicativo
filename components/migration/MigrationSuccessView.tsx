import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationSession, rollbackMigration } from "@/services/mobile-migration-store";
import { router } from "expo-router";

interface MigrationSuccessViewProps {
  session: MigrationSession;
  trainerId: string;
  onStartNew: () => void;
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

export const MigrationSuccessView: React.FC<MigrationSuccessViewProps> = ({
  session,
  trainerId,
  onStartNew,
  activeColor,
  theme,
}) => {
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isRolledBack, setIsRolledBack] = useState(session.status === "rolled_back");

  const handleRollback = () => {
    Alert.alert(
      "Desfazer Importação",
      "Tem certeza que deseja reverter esta migração? Os treinos e registros criados a partir deste lote serão removidos com segurança.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Desfazer",
          style: "destructive",
          onPress: async () => {
            setIsRollingBack(true);
            const res = await rollbackMigration(session.id, trainerId);
            setIsRollingBack(false);
            if (res.success) {
              setIsRolledBack(true);
              Alert.alert("Sucesso", res.message);
            } else {
              Alert.alert("Erro", res.message);
            }
          },
        },
      ]
    );
  };

  const entityCount = session.importedEntityIds;

  return (
    <View style={styles.container}>
      <View style={[styles.successCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isRolledBack ? "#EF4444" : "#10B981" },
          ]}
        >
          <Ionicons
            name={isRolledBack ? "refresh-outline" : "checkmark-done"}
            size={36}
            color="#FFFFFF"
          />
        </View>

        <Text style={[styles.mainTitle, { color: theme.text }]}>
          {isRolledBack ? "Migração Desfeita" : "Migração Concluída com Sucesso!"}
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isRolledBack
            ? "Os registros deste lote foram revertidos com segurança. Nada permanece pendente."
            : "Seus dados foram convertidos para o modelo canônico do DragonCorp e organizados para seu uso."}
        </Text>

        {/* Resumo das Entidades Criadas */}
        {!isRolledBack && (
          <View style={[styles.entitiesBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <View style={styles.entityRow}>
              <Ionicons name="people" size={16} color={activeColor} />
              <Text style={[styles.entityText, { color: theme.text }]}>
                {entityCount?.studentIds.length || session.students.length} aluno(s) processados
              </Text>
            </View>

            <View style={styles.entityRow}>
              <Ionicons name="barbell" size={16} color={activeColor} />
              <Text style={[styles.entityText, { color: theme.text }]}>
                {entityCount?.sessionIds.length || session.workouts.length} treino(s) salvos como rascunho
              </Text>
            </View>

            {session.assessments.length > 0 && (
              <View style={styles.entityRow}>
                <Ionicons name="clipboard" size={16} color={activeColor} />
                <Text style={[styles.entityText, { color: theme.text }]}>
                  {entityCount?.assessmentIds.length || session.assessments.length} avaliação(ões) física(s) registrada(s)
                </Text>
              </View>
            )}

            <View style={styles.guaranteeRow}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={[styles.guaranteeText, { color: theme.textMuted }]}>
                Nenhum treino foi publicado aos alunos. Você pode revisá-los individualmente na aba Treinos.
              </Text>
            </View>
          </View>
        )}

        {/* Ações pós-migração */}
        <View style={styles.actionsList}>
          {!isRolledBack && (
            <>
              <TouchableOpacity
                style={[styles.primaryNavBtn, { backgroundColor: activeColor }]}
                onPress={() => router.replace("/training")}
                activeOpacity={0.85}
              >
                <Ionicons name="barbell-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryNavBtnText}>Ver Treinos Importados</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryNavBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
                onPress={() => router.replace("/admin" as never)}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={18} color={theme.text} />
                <Text style={[styles.secondaryNavBtnText, { color: theme.text }]}>Ver Meus Alunos</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.secondaryNavBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={onStartNew}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.text} />
            <Text style={[styles.secondaryNavBtnText, { color: theme.text }]}>Iniciar Nova Migração</Text>
          </TouchableOpacity>

          {!isRolledBack && (
            <TouchableOpacity
              style={styles.rollbackBtn}
              onPress={handleRollback}
              disabled={isRollingBack}
              activeOpacity={0.7}
            >
              {isRollingBack ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="arrow-undo-outline" size={15} color="#EF4444" />
                  <Text style={styles.rollbackBtnText}>Desfazer esta importação (Rollback)</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
  },
  successCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  entitiesBox: {
    width: "100%",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  entityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  guaranteeText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  actionsList: {
    width: "100%",
    gap: 10,
  },
  primaryNavBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryNavBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryNavBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryNavBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  rollbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  rollbackBtnText: {
    color: "#EF4444",
    fontSize: 12.5,
    fontWeight: "600",
  },
});

