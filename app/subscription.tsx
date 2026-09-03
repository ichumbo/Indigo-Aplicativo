import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  cancelSubscription,
  getStoreProducts,
  getSubscriptionForUser,
  purchaseSubscriptionFlow,
  restorePurchases,
  StoreProductInfo,
  SubscriptionRecord,
} from "@/services/subscription-service";
import {
  OFFICIAL_STORE_PRODUCTS,
  isSubscriptionStatusActive,
  resolveStoreProductId,
} from "@/services/subscription-store-config";

export default function SubscriptionScreen() {
  const router = useRouter();
  const { session } = useCurrentSession();
  const { theme, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [products, setProducts] = useState<StoreProductInfo[]>([]);

  const userId = session?.user?.id || "trainer-demo-id";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, prods] = await Promise.all([
        getSubscriptionForUser(userId, session?.user?.name, session?.user?.email),
        getStoreProducts(),
      ]);
      setSubscription(sub);
      setProducts(prods);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [userId, session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePurchase = async (productId: string, planName: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const selectedProduct = products.find((p) => p.productId === productId);
      const provider = Platform.OS === "ios" ? "apple" : "google";
      const resolvedSku = resolveStoreProductId(productId, provider);

      const result = await purchaseSubscriptionFlow({
        userId,
        productId: resolvedSku,
        offerToken: selectedProduct?.offerToken,
      });

      if (result.status === "CANCELLED") {
        // Usuário cancelou: não altera nada
        return;
      }

      if (result.status === "PENDING") {
        Alert.alert(
          "Pagamento em processamento",
          result.message || "Seu pagamento está sendo processado. O acesso será liberado após a confirmação."
        );
        return;
      }

      if (result.success && result.status === "PURCHASED") {
        if (result.subscription) {
          setSubscription(result.subscription);
        }
        Alert.alert(
          "Assinatura ativada com sucesso.",
          `Parabéns! Sua assinatura ${planName} está ativa. Agora você pode cadastrar alunos ilimitados e aproveitar todo o poder do app!`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível concluir sua assinatura. Tente novamente.";
      Alert.alert("Não foi possível concluir sua assinatura", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await restorePurchases(userId);
      if (res.restored && res.subscription) {
        setSubscription(res.subscription);
      }
      Alert.alert("Restauração de Compras", res.message);
    } catch {
      Alert.alert("Erro", "Não foi possível restaurar as compras.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManage = () => {
    Alert.alert(
      "Gerenciar Assinatura",
      Platform.OS === "ios"
        ? "Para gerenciar sua forma de pagamento ou plano, você será redirecionado para a App Store."
        : "Para gerenciar sua forma de pagamento ou plano, você será redirecionado para a Google Play.",
      [
        { text: "Fechar", style: "cancel" },
        {
          text: "Abrir Loja",
          onPress: () => {
            const url =
              Platform.OS === "ios"
                ? "https://apps.apple.com/account/subscriptions"
                : "https://play.google.com/store/account/subscriptions";
            Linking.openURL(url).catch(() => undefined);
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancelar Renovação",
      "Deseja cancelar a renovação automática da sua assinatura?\n\nSeus alunos, treinos e dados continuam 100% salvos e você terá acesso até o fim do período atual.",
      [
        { text: "Manter Plano", style: "cancel" },
        {
          text: "Confirmar Cancelamento",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await cancelSubscription(userId);
              setSubscription(updated);
              Alert.alert(
                "Renovação Cancelada",
                "Seu plano permanecerá ativo até a data de expiração sem cobranças futuras."
              );
            } catch {
              Alert.alert("Erro", "Não foi possível cancelar.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatExpiresDate = (dateStr: string | null) => {
    if (!dateStr) return "Sem vencimento (Plano Gratuito)";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isPro = subscription?.plan === "PRO";
  const isActive = subscription ? isSubscriptionStatusActive(subscription.status) : false;

  const annualProduct = products.find((p) => p.billingPeriod === "annual") || {
    productId: OFFICIAL_STORE_PRODUCTS.annual.id,
    title: OFFICIAL_STORE_PRODUCTS.annual.title,
    price: OFFICIAL_STORE_PRODUCTS.annual.referencePrice,
    currency: OFFICIAL_STORE_PRODUCTS.annual.currency,
    localizedPrice: OFFICIAL_STORE_PRODUCTS.annual.localizedPrice,
    billingPeriod: "annual" as const,
  };

  const monthlyProduct = products.find((p) => p.billingPeriod === "monthly") || {
    productId: OFFICIAL_STORE_PRODUCTS.monthly.id,
    title: OFFICIAL_STORE_PRODUCTS.monthly.title,
    price: OFFICIAL_STORE_PRODUCTS.monthly.referencePrice,
    currency: OFFICIAL_STORE_PRODUCTS.monthly.currency,
    localizedPrice: OFFICIAL_STORE_PRODUCTS.monthly.localizedPrice,
    billingPeriod: "monthly" as const,
  };

  const annualMonthlyEquivalent =
    annualProduct.price > 0
      ? (annualProduct.price / 12).toLocaleString("pt-BR", {
          style: "currency",
          currency: annualProduct.currency || "BRL",
        })
      : "R$ 16,65";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* CABEÇALHO */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Assinatura PRO</Text>

        <TouchableOpacity
          style={[styles.restoreHeaderButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={handleRestore}
          disabled={actionLoading}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Restaurar"
        >
          <Text style={[styles.restoreHeaderButtonText, { color: theme.textSecondary }]}>Restaurar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D90000" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO SECTION DE ALTO IMPACTO */}
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={13} color="#D90000" style={{ marginRight: 6 }} />
              <Text style={styles.heroBadgeText}>DRAGONCORP PRO ACCESS</Text>
            </View>

            <Text style={styles.heroTitle}>Escale sua Consultoria sem Limites</Text>
            <Text style={styles.heroSubtitle}>
              Desbloqueie ferramentas profissionais de alta performance, inteligência artificial integrada e liberte seu potencial.
            </Text>
          </View>

          {/* GRID DE RECURSOS EM DESTAQUE (2x2 OBSIDIAN CARDS) */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="people" size={18} color="#D90000" />
              </View>
              <Text style={styles.featureCardTitle}>Alunos Ilimitados</Text>
              <Text style={styles.featureCardDesc}>Cadastre e prescreva sem nenhuma trava de quantidade</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="flash" size={18} color="#D90000" />
              </View>
              <Text style={styles.featureCardTitle}>Assistente IA 24/7</Text>
              <Text style={styles.featureCardDesc}>Criação ágil de treinos e análises automáticas</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="analytics" size={18} color="#D90000" />
              </View>
              <Text style={styles.featureCardTitle}>Avaliações Físicas</Text>
              <Text style={styles.featureCardDesc}>Bioimpedância, dobras, postural e gráficos 1RM</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="color-palette" size={18} color="#D90000" />
              </View>
              <Text style={styles.featureCardTitle}>Marca Própria</Text>
              <Text style={styles.featureCardDesc}>Seu logo e identidade visual personalizada para o aluno</Text>
            </View>
          </View>

          {/* STATUS DO PLANO ATUAL */}
          <View style={styles.currentStatusCard}>
            <View style={styles.currentStatusLeft}>
              <Text style={styles.currentStatusLabel}>STATUS ATUAL</Text>
              <Text style={styles.currentStatusTitle}>
                {isPro ? "Plano PRO Ativo" : "Plano Gratuito (1 Aluno)"}
              </Text>
              <Text style={styles.currentStatusSub}>
                {isPro
                  ? `Vence em: ${formatExpiresDate(subscription?.expiresAt || null)}`
                  : "Limite de 1 aluno ativo atingido"}
              </Text>
            </View>

            <View
              style={[
                styles.statusTag,
                isPro ? styles.statusTagPro : styles.statusTagFree,
              ]}
            >
              <Text
                style={[
                  styles.statusTagText,
                  isPro ? styles.statusTagTextPro : styles.statusTagTextFree,
                ]}
              >
                {isPro ? "PRO" : "FREE"}
              </Text>
            </View>
          </View>

          {/* SELETOR DE PLANOS */}
          <Text style={styles.sectionHeaderTitle}>Escolha seu plano de assinatura</Text>

          {/* ================================================================
              PLANO ANUAL (MELHOR ESCOLHA - DESTAQUE PRINCIPAL)
          ================================================================ */}
          <View style={styles.annualCardContainer}>
            <View style={styles.bestChoicePill}>
              <Ionicons name="flame" size={12} color="#000000" style={{ marginRight: 4 }} />
              <Text style={styles.bestChoicePillText}>MELHOR ESCOLHA • 2 MESES GRÁTIS</Text>
            </View>

            <View style={styles.annualCard}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.planHeadline}>{annualProduct.title || "Plano Anual"}</Text>
                  <Text style={styles.planSubTag}>Economize com cobrança anual</Text>
                </View>

                <View style={styles.pricingStack}>
                  <Text style={styles.priceBig}>{annualMonthlyEquivalent}</Text>
                  <Text style={styles.pricePerMonth}>/mês</Text>
                </View>
              </View>

              <View style={styles.planBilledRow}>
                <Ionicons name="checkmark-circle" size={14} color="#D90000" style={{ marginRight: 6 }} />
                <Text style={styles.planBilledText}>
                  {annualProduct.localizedPrice} cobrados anualmente (12 meses de acesso)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => handlePurchase(annualProduct.productId, "Anual")}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionButtonText}>Assinar Plano Anual</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ================================================================
              PLANO MENSAL
          ================================================================ */}
          <View style={styles.monthlyCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.planHeadline}>{monthlyProduct.title || "Plano Mensal"}</Text>
                <Text style={styles.planSubTag}>Flexibilidade total</Text>
              </View>

              <View style={styles.pricingStack}>
                <Text style={styles.priceBig}>{monthlyProduct.localizedPrice}</Text>
              </View>
            </View>

            <View style={styles.planBilledRow}>
              <Ionicons name="shield-checkmark" size={14} color="#777777" style={{ marginRight: 6 }} />
              <Text style={styles.planBilledTextMuted}>
                Cobrança mensal com cancelamento a qualquer momento
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => handlePurchase(monthlyProduct.productId, "Mensal")}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryActionButtonText}>Assinar Plano Mensal</Text>
            </TouchableOpacity>
          </View>

          {/* BOTÕES DE GERENCIAMENTO (SE JÁ FOR PRO) */}
          {isPro && (
            <View style={styles.manageSection}>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManage}
                activeOpacity={0.8}
              >
                <Ionicons name="settings-outline" size={16} color="#AAAAAA" style={{ marginRight: 8 }} />
                <Text style={styles.manageButtonText}>Gerenciar Assinatura na Loja</Text>
              </TouchableOpacity>

              {isActive && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar Renovação Automática</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* RODAPÉ DE CONFIANÇA & DIRETRIZES */}
          <View style={styles.trustFooter}>
            <View style={styles.trustRow}>
              <Ionicons name="lock-closed" size={13} color="#777777" style={{ marginRight: 6 }} />
              <Text style={styles.trustText}>
                Pagamento 100% seguro via App Store / Google Play
              </Text>
            </View>
            <Text style={styles.disclaimerText}>
              A assinatura renova automaticamente, a menos que seja cancelada até 24 horas antes do final do ciclo. Seus dados e treinos permanecem seguros e preservados.
            </Text>

            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={() => router.push("/terms-of-use")}>
                <Text style={styles.legalLinkText}>Termos de Uso</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>•</Text>
              <TouchableOpacity onPress={() => router.push("/privacy-policy")}>
                <Text style={styles.legalLinkText}>Privacidade</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>•</Text>
              <TouchableOpacity onPress={handleRestore}>
                <Text style={styles.legalLinkText}>Restaurar Compras</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
    backgroundColor: "#0A0A0A",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  restoreHeaderButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreHeaderButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },

  // HERO SECTION
  heroSection: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  heroSubtitle: {
    color: "#888888",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 12,
  },

  // FEATURES GRID 2x2
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  featureCard: {
    width: "48.2%",
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 12,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureCardTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  featureCardDesc: {
    color: "#777777",
    fontSize: 11,
    lineHeight: 15,
  },

  // CURRENT STATUS CARD
  currentStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 14,
    marginBottom: 24,
  },
  currentStatusLeft: {
    flex: 1,
  },
  currentStatusLabel: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  currentStatusTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  currentStatusSub: {
    color: "#888888",
    fontSize: 12,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusTagPro: {
    backgroundColor: "#142618",
    borderWidth: 1,
    borderColor: "#1E5429",
  },
  statusTagFree: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2C2C2C",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  statusTagTextPro: {
    color: "#00E676",
  },
  statusTagTextFree: {
    color: "#AAAAAA",
  },

  // SECTION HEADER
  sectionHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
    letterSpacing: 0.1,
  },

  // PLANO ANUAL
  annualCardContainer: {
    position: "relative",
    paddingTop: 12,
    marginBottom: 16,
  },
  bestChoicePill: {
    position: "absolute",
    top: 0,
    left: 18,
    backgroundColor: "#D90000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  bestChoicePillText: {
    color: "#000000",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  annualCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1.6,
    borderColor: "#D90000",
    padding: 18,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  planHeadline: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  planSubTag: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  pricingStack: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceBig: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  pricePerMonth: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 3,
  },
  planBilledRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1C",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 16,
  },
  planBilledText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryActionButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#D90000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionButtonText: {
    color: "#000000",
    fontSize: 14.5,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  // PLANO MENSAL
  monthlyCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#242424",
    padding: 18,
    marginBottom: 20,
  },
  planBilledTextMuted: {
    color: "#888888",
    fontSize: 12,
  },
  secondaryActionButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  secondaryActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // GERENCIAR / CANCELAR
  manageSection: {
    marginTop: 10,
    marginBottom: 16,
    gap: 8,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#141414",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
  },
  manageButtonText: {
    color: "#AAAAAA",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#FF5252",
    fontSize: 12.5,
    fontWeight: "600",
  },

  // RODAPÉ
  trustFooter: {
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  trustText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
  },
  disclaimerText: {
    color: "#555555",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legalLinkText: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legalDot: {
    color: "#444444",
  },
});
