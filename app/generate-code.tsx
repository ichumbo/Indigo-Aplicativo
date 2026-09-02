import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCurrentSession } from "@/hooks/use-current-session";
import {
  generateTrainerInviteCode,
  getTrainerPermanentCode,
  listTrainerInviteCodes,
  TrainerInviteCodeRecord,
} from "@/services/auth-store";

export default function GenerateCodeScreen() {
  const router = useRouter();
  const { session } = useCurrentSession();

  const [permanentCode, setPermanentCode] = useState<string>("DRG-PRO-REV");
  const [activeCodes, setActiveCodes] = useState<TrainerInviteCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadCodes();
  }, [session?.user?.id]);

  async function loadCodes() {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const perm = await getTrainerPermanentCode(session.user.id);
      setPermanentCode(perm);

      const list = await listTrainerInviteCodes(session.user.id);
      setActiveCodes(list);
    } catch {
      // Falha graciosa
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateNew = async () => {
    if (!session?.user?.id) return;
    setGenerating(true);
    try {
      const { code, record } = await generateTrainerInviteCode(session.user.id, 24);
      setActiveCodes((prev) => [record, ...prev]);
      Alert.alert(
        "Código Gerado!",
        `O código dinâmico ${code} é válido por 24 horas e está pronto para ser enviado.`
      );
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Não foi possível gerar novo código.");
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async (code: string, isPermanent = false) => {
    const trainerName = session?.user.name || "Seu Personal Trainer";
    const text = isPermanent
      ? `Olá! Seu Personal Trainer ${trainerName} convidou você para o DragonCorp App.\n\nBaixe o aplicativo e utilize meu Código Permanente de Personal no cadastro:\n*${code}*\n\nSeus treinos e avaliações já estão prontos para você!`
      : `Olá! Seu Personal Trainer ${trainerName} convidou você para o DragonCorp App.\n\nBaixe o aplicativo e utilize o código de convite rápido:\n*${code}* (válido por 24h)\n\nSeus treinos e avaliações já estão disponíveis!`;

    try {
      await Share.share({
        message: text,
        title: "Convite DragonCorp Personal",
      });
    } catch {
      // Ignore
    }
  };

  const handleWhatsApp = async (code: string, isPermanent = false) => {
    const trainerName = session?.user.name || "Seu Personal Trainer";
    const text = encodeURIComponent(
      isPermanent
        ? `Olá! Seu Personal Trainer ${trainerName} convidou você para o DragonCorp App.\n\nBaixe o aplicativo e utilize meu Código Permanente de Personal no cadastro:\n*${code}*\n\nSeus treinos e avaliações já estão prontos!`
        : `Olá! Seu Personal Trainer ${trainerName} convidou você para o DragonCorp App.\n\nBaixe o aplicativo e utilize o código de convite rápido:\n*${code}*\n\nSeus treinos e avaliações já estão disponíveis!`
    );
    const url = `whatsapp://send?text=${text}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      await handleShare(code, isPermanent);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Vínculo com Alunos</Text>
          <Text style={styles.headerSubtitle}>Códigos oficiais de acesso e cadastro</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD DO CÓDIGO PERMANENTE DO PERSONAL */}
        <View style={styles.permanentCard}>
          <View style={styles.permanentCardTop}>
            <View style={styles.permanentBadgeIcon}>
              <Ionicons name="shield-checkmark" size={20} color="#D90000" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.permanentLabel}>Seu Código Permanente de Personal</Text>
              <Text style={styles.permanentSub}>Os alunos podem digitar este código a qualquer momento</Text>
            </View>
          </View>

          <View style={styles.permanentCodeRow}>
            <Text style={styles.permanentCodeText}>{permanentCode}</Text>
          </View>

          <View style={styles.codeActionsRow}>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => handleShare(permanentCode, true)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnSecondaryText}>Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => handleWhatsApp(permanentCode, true)}
              activeOpacity={0.84}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnPrimaryText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CARD DE GERAR CÓDIGO DINÂMICO 24H */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Ionicons name="flash-outline" size={28} color="#D90000" />
          </View>
          <Text style={styles.heroTitle}>Convites Rápidos (24h)</Text>
          <Text style={styles.heroSubtitle}>
            Gere links e códigos temporários de uso único para novos alunos que você está integrando hoje.
          </Text>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateNew}
            disabled={generating}
            activeOpacity={0.84}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.generateButtonText}>Gerar Novo Convite Rápido</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* LISTA DE CÓDIGOS RECENTES */}
        <Text style={styles.sectionHeader}>Convites Rápidos Gerados</Text>

        {loading ? (
          <ActivityIndicator color="#D90000" style={{ marginVertical: 20 }} />
        ) : activeCodes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="key-outline" size={32} color="#4B5563" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>Nenhum convite rápido ativo no momento.</Text>
          </View>
        ) : (
          <View style={styles.codeList}>
            {activeCodes.map((item) => {
              const isActive = item.status === "active";
              const isUsed = item.status === "used";

              return (
                <View key={item.id} style={styles.codeCard}>
                  <View style={styles.codeCardTop}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{item.code}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        isActive
                          ? styles.statusPillActive
                          : isUsed
                          ? styles.statusPillUsed
                          : styles.statusPillExpired,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isActive
                            ? styles.statusPillTextActive
                            : isUsed
                            ? styles.statusPillTextUsed
                            : styles.statusPillTextExpired,
                        ]}
                      >
                        {isActive ? "DISPONÍVEL" : isUsed ? "VINCULADO" : "EXPIRADO"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.codeDetailsRow}>
                    <Ionicons name="time-outline" size={13} color="#777777" />
                    <Text style={styles.codeTimeText}>
                      {isUsed
                        ? `Utilizado por ${item.usedByStudentName || "Aluno"}`
                        : isActive
                        ? "Válido por 24h"
                        : "Expirado"}
                    </Text>
                  </View>

                  {isActive && (
                    <View style={styles.codeActionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtnSecondary}
                        onPress={() => handleShare(item.code, false)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="share-social-outline"
                          size={15}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.actionBtnSecondaryText}>Compartilhar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => handleWhatsApp(item.code, false)}
                        activeOpacity={0.84}
                      >
                        <Ionicons
                          name="logo-whatsapp"
                          size={15}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.actionBtnPrimaryText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* DICA DE USO */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={20} color="#D90000" />
          <Text style={styles.tipText}>
            Quando o aluno digitar seu código permanente ou um convite rápido no cadastro, o vínculo é
            efetuado instantaneamente e você já pode prescrever treinos e avaliações.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1C1C1E",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#777777",
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  permanentCard: {
    backgroundColor: "#16161B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9000040",
    padding: 18,
    marginBottom: 20,
  },
  permanentCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  permanentBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2B1113",
    alignItems: "center",
    justifyContent: "center",
  },
  permanentLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  permanentSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  permanentCodeRow: {
    backgroundColor: "#0A0A0C",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D2D38",
    marginVertical: 10,
  },
  permanentCodeText: {
    color: "#D90000",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 3,
  },
  heroCard: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#241010",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "#999999",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  generateButton: {
    backgroundColor: "#D90000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 10,
    width: "100%",
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeader: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#202020",
    marginBottom: 16,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
  },
  codeList: {
    gap: 12,
    marginBottom: 20,
  },
  codeCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 16,
  },
  codeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  codeBadge: {
    backgroundColor: "#202020",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  codeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: "rgba(25, 135, 84, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(25, 135, 84, 0.35)",
  },
  statusPillUsed: {
    backgroundColor: "rgba(13, 110, 253, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(13, 110, 253, 0.35)",
  },
  statusPillExpired: {
    backgroundColor: "rgba(108, 117, 125, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(108, 117, 125, 0.35)",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusPillTextActive: {
    color: "#20C997",
  },
  statusPillTextUsed: {
    color: "#6EA8FE",
  },
  statusPillTextExpired: {
    color: "#ADB5BD",
  },
  codeDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  codeTimeText: {
    color: "#777777",
    fontSize: 12,
    marginLeft: 5,
  },
  codeActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242424",
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionBtnSecondaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1A1313",
    borderWidth: 1,
    borderColor: "#331818",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  tipText: {
    flex: 1,
    color: "#A08080",
    fontSize: 12,
    lineHeight: 18,
  },
});
