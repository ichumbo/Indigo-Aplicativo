import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/brand-logo";
import { useCurrentSession } from "@/hooks/use-current-session";
import {
  FAQ_CATALOG,
  SupportCategory,
  SupportTicket,
  createSupportTicket,
  getUserSupportTickets,
} from "@/services/support-service";

const CATEGORIES: { id: SupportCategory; label: string }[] = [
  { id: "acesso", label: "Acesso e Login" },
  { id: "assinatura", label: "Assinatura e Planos" },
  { id: "aluno", label: "Gestão de Alunos" },
  { id: "treino", label: "Prescrição de Treinos" },
  { id: "avaliacao", label: "Avaliações Físicas" },
  { id: "problema_tecnico", label: "Problema Técnico / Bug" },
  { id: "privacidade", label: "Privacidade e LGPD" },
  { id: "outro", label: "Outro Assunto" },
];

export default function SupportScreen() {
  const router = useRouter();
  const { session } = useCurrentSession();

  const [activeTab, setActiveTab] = useState<"faq" | "ticket" | "my_tickets">("faq");
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory>("acesso");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      getUserSupportTickets(session.user.id).then(setTickets);
    }
  }, [session?.user?.id, activeTab]);

  const handleSubmitTicket = async () => {
    if (!subject.trim() || subject.trim().length < 4) {
      Alert.alert("Campo Obrigatório", "Informe um assunto para o chamado.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert("Campo Obrigatório", "Descreva detalhadamente seu problema ou dúvida.");
      return;
    }

    setLoading(true);
    try {
      const ticket = await createSupportTicket({
        userId: session?.user?.id || "anonymous_user",
        userName: session?.user?.name || "Usuário DragonCorp",
        userEmail: session?.user?.email || "contato@dragoncorp.app",
        category: selectedCategory,
        subject,
        description,
      });

      Alert.alert(
        "Chamado Aberto com Sucesso",
        `Seu protocolo é ${ticket.protocolNumber}. Responderemos em até 24 horas úteis no seu e-mail cadastrado.`,
        [{ text: "OK", onPress: () => {
          setSubject("");
          setDescription("");
          setActiveTab("my_tickets");
        }}]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar chamado.";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <BrandLogo variant="symbol" theme="dark" width={30} height={30} />

        <View style={{ width: 38 }} />
      </View>

      {/* SEGMENTED TABS */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "faq" && styles.tabBtnActive]}
          onPress={() => setActiveTab("faq")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "faq" && styles.tabTextActive]}>Dúvidas (FAQ)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ticket" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ticket")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "ticket" && styles.tabTextActive]}>Novo Chamado</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "my_tickets" && styles.tabBtnActive]}
          onPress={() => setActiveTab("my_tickets")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "my_tickets" && styles.tabTextActive]}>
            Meus Chamados ({tickets.length})
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TAB 1: FAQ */}
          {activeTab === "faq" && (
            <View>
              <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>
              <Text style={styles.sectionSubtitle}>Encontre respostas rápidas para as principais dúvidas de uso.</Text>

              {FAQ_CATALOG.map((faq, index) => {
                const isExpanded = expandedFaqIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.faqCard}
                    onPress={() => setExpandedFaqIndex(isExpanded ? null : index)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.faqHeader}>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#9CA3AF"
                      />
                    </View>
                    {isExpanded && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.directSupportBox}>
                <Ionicons name="mail-outline" size={20} color="#D90000" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.directSupportTitle}>Precisa de suporte personalizado?</Text>
                  <Text style={styles.directSupportSub}>Escreva para suporte@dragoncorp.app</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: NOVO CHAMADO */}
          {activeTab === "ticket" && (
            <View>
              <Text style={styles.sectionTitle}>Abrir Chamado de Suporte</Text>
              <Text style={styles.sectionSubtitle}>
                Descreva seu problema. Nossa equipe técnica responderá no seu e-mail.
              </Text>

              {/* CATEGORIA */}
              <Text style={styles.fieldLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ASSUNTO */}
              <Text style={styles.fieldLabel}>Assunto *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Dúvida sobre sincronização de treinos"
                placeholderTextColor="#666666"
                value={subject}
                onChangeText={setSubject}
              />

              {/* DESCRIÇÃO */}
              <Text style={styles.fieldLabel}>Descrição Detalhada *</Text>
              <TextInput
                style={[styles.textInput, { height: 110, textAlignVertical: "top" }]}
                placeholder="Informe o que aconteceu, passos para reproduzir ou a sua dúvida..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.safetyTip}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                <Text style={styles.safetyTipText}>
                  Aviso de Segurança: Nunca envie senhas ou dados bancários em chamados de suporte.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmitTicket}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Enviar Chamado</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: MEUS CHAMADOS */}
          {activeTab === "my_tickets" && (
            <View>
              <Text style={styles.sectionTitle}>Histórico de Atendimento</Text>
              <Text style={styles.sectionSubtitle}>Acompanhe o andamento dos seus chamados.</Text>

              {tickets.length === 0 ? (
                <View style={styles.emptyTickets}>
                  <Ionicons name="chatbubbles-outline" size={36} color="#555" />
                  <Text style={styles.emptyText}>Você não possui chamados abertos no momento.</Text>
                </View>
              ) : (
                tickets.map((t) => (
                  <View key={t.id} style={styles.ticketCard}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketProtocol}>{t.protocolNumber}</Text>
                      <View style={styles.ticketStatusBadge}>
                        <Text style={styles.ticketStatusText}>{t.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.ticketSubject}>{t.subject}</Text>
                    <Text style={styles.ticketDesc}>{t.description}</Text>
                    <Text style={styles.ticketDate}>Aberto em {new Date(t.createdAt).toLocaleDateString("pt-BR")}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#15151A",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#151518",
    borderWidth: 1,
    borderColor: "#26262E",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#15151A",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#121216",
    borderWidth: 1,
    borderColor: "#202028",
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888888",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#888888",
    lineHeight: 18,
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: "#101014",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E26",
    padding: 14,
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 12.5,
    color: "#9CA3AF",
    lineHeight: 18,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1A1A22",
    paddingTop: 8,
  },
  directSupportBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#140A0A",
    borderWidth: 1,
    borderColor: "#2E1414",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  directSupportTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  directSupportSub: {
    fontSize: 12,
    color: "#FF8888",
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#CCCCCC",
    marginBottom: 6,
    marginTop: 10,
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#121216",
    borderWidth: 1,
    borderColor: "#22222A",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "rgba(217, 0, 0, 0.2)",
    borderColor: "#D90000",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: "#121216",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#22222A",
    color: "#FFFFFF",
    fontSize: 13.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  safetyTip: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  safetyTipText: {
    fontSize: 11,
    color: "#71717A",
    flex: 1,
  },
  submitBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyTickets: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#666",
    fontSize: 13,
    marginTop: 10,
  },
  ticketCard: {
    backgroundColor: "#101014",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E26",
    padding: 14,
    marginBottom: 10,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ticketProtocol: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D90000",
    letterSpacing: 0.5,
  },
  ticketStatusBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ticketStatusText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "800",
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  ticketDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 16,
    marginBottom: 8,
  },
  ticketDate: {
    fontSize: 10.5,
    color: "#555",
  },
});
