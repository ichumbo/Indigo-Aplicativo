import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useCurrentSession } from "@/hooks/use-current-session";

interface InviteCodeItem {
  id: string;
  code: string;
  createdAt: string;
  expiresIn: string;
  status: "active" | "used" | "expired";
  studentName?: string;
}

export default function GenerateCodeScreen() {
  const router = useRouter();
  const { session } = useCurrentSession();

  const [activeCodes, setActiveCodes] = useState<InviteCodeItem[]>([
    {
      id: "code-1",
      code: "IND-849201",
      createdAt: "Hoje, 10:30",
      expiresIn: "Válido por 24 horas",
      status: "active",
    },
    {
      id: "code-2",
      code: "IND-391054",
      createdAt: "Ontem, 16:45",
      expiresIn: "Utilizado",
      status: "used",
      studentName: "Lucas Mendonça",
    },
  ]);

  const [generating, setGenerating] = useState(false);

  const handleGenerateNew = () => {
    setGenerating(true);
    setTimeout(() => {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const newCodeStr = `IND-${randomNum}`;
      const newCode: InviteCodeItem = {
        id: `code-${Date.now()}`,
        code: newCodeStr,
        createdAt: "Agora mesmo",
        expiresIn: "Válido por 24 horas",
        status: "active",
      };

      setActiveCodes((prev) => [newCode, ...prev]);
      setGenerating(false);
      Alert.alert("Código Gerado!", `O código ${newCodeStr} está pronto para envio ao aluno.`);
    }, 400);
  };

  const handleShare = async (code: string) => {
    const trainerName = session?.user.name || "Seu Personal Trainer";
    const text = `Olá! Seu Personal Trainer ${trainerName} convidou você para o DragonCorp App.\n\nBaixe o aplicativo e utilize o código de acesso:\n*${code}*\n\nSeus treinos e avaliações já estão prontos para você!`;

    try {
      await Share.share({
        message: text,
        title: "Convite DragonCorp Personal",
      });
    } catch {
      // Ignore
    }
  };

  const handleWhatsApp = async (code: string) => {
    const trainerName = session?.user.name || "Seu Personal Trainer";
    const text = encodeURIComponent(
      `Olá! Seu Personal Trainer ${trainerName} convidou você para o DragonCorp App.\n\nBaixe o aplicativo e utilize o código de acesso:\n*${code}*\n\nSeus treinos e avaliações já estão disponíveis!`
    );
    const url = `whatsapp://send?text=${text}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      await handleShare(code);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerTitle}>Gerar Código de Vínculo</Text>
          <Text style={styles.headerSubtitle}>Acesso rápido para seus alunos</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD PRINCIPAL DE GERAR CÓDIGO */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Ionicons name="code-slash" size={28} color="#D90000" />
          </View>
          <Text style={styles.heroTitle}>Conecte seus Alunos</Text>
          <Text style={styles.heroSubtitle}>
            Gere um código exclusivo de 6 dígitos para o aluno digitar ao abrir o app e vincular
            diretamente à sua consultoria.
          </Text>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateNew}
            disabled={generating}
            activeOpacity={0.84}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.generateButtonText}>
              {generating ? "Gerando Código..." : "Gerar Novo Código de Acesso"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE CÓDIGOS RECENTES */}
        <Text style={styles.sectionHeader}>Códigos de Acesso Recentes</Text>

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
                    {item.createdAt} • {item.studentName ? `Aluno: ${item.studentName}` : item.expiresIn}
                  </Text>
                </View>

                {isActive && (
                  <View style={styles.codeActionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => handleShare(item.code)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-social-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnSecondaryText}>Compartilhar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => handleWhatsApp(item.code)}
                      activeOpacity={0.84}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnPrimaryText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* DICA DE USO */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={20} color="#D90000" />
          <Text style={styles.tipText}>
            Cada código é de uso único e expira automaticamente após 24 horas caso não seja
            utilizado pelo aluno.
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
    backgroundColor: "#0D0D0D",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: "#777777",
    fontSize: 11,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "#888888",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 18,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
    width: "100%",
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeader: {
    color: "#BBBBBB",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  codeList: {
    gap: 12,
    marginBottom: 20,
  },
  codeCard: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 16,
  },
  codeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  codeBadge: {
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: "#0F2818",
    borderWidth: 1,
    borderColor: "#1E5430",
  },
  statusPillUsed: {
    backgroundColor: "#1C1C1C",
  },
  statusPillExpired: {
    backgroundColor: "#2B1111",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  statusPillTextActive: {
    color: "#00E676",
  },
  statusPillTextUsed: {
    color: "#888888",
  },
  statusPillTextExpired: {
    color: "#FF5252",
  },
  codeDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  codeTimeText: {
    color: "#777777",
    fontSize: 12,
  },
  codeActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#333333",
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionBtnSecondaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 12,
    fontWeight: "700",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  tipText: {
    flex: 1,
    color: "#888888",
    fontSize: 12,
    lineHeight: 18,
  },
});
