import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import {
  getStoreProducts,
  purchaseProduct,
  restorePurchases,
  StoreProductInfo,
} from "@/services/subscription-service";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

const PRO_BENEFITS = [
  { id: "students", title: "Alunos ilimitados", desc: "Cadastre e gerencie sem limite de alunos" },
  { id: "workouts", title: "Treinos ilimitados", desc: "Prescrição completa com histórico e versionamento" },
  { id: "assessments", title: "Avaliações e evolução", desc: "Dobras cutâneas, VO2max e bioimpedância" },
  { id: "ai", title: "Assistente IA completo", desc: "Montagem de treinos e resumos automáticos" },
];

export function PaywallModal({
  visible,
  onClose,
  userId,
  onSuccess,
  title = "Limite de Alunos Atingido",
  subtitle = "O plano gratuito permite gerenciar 1 aluno ativo. Para adicionar mais alunos e desbloquear ferramentas ilimitadas, faça o upgrade para o Plano Pro.",
}: PaywallModalProps) {
  const router = useRouter();
  const [products, setProducts] = useState<StoreProductInfo[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("personal_pro_annual");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (visible) {
      void loadProducts();
    }
  }, [visible]);

  const loadProducts = async () => {
    try {
      const prods = await getStoreProducts();
      setProducts(prods);
    } catch {
      // Fallback
      setProducts([
        {
          productId: "personal_pro_annual",
          title: "Anual",
          description: "Acesso ilimitado o ano inteiro",
          price: 199.9,
          currency: "BRL",
          localizedPrice: "R$ 199,90",
          billingPeriod: "annual",
        },
        {
          productId: "personal_pro_monthly",
          title: "Mensal",
          description: "Acesso ilimitado mensal",
          price: 19.9,
          currency: "BRL",
          localizedPrice: "R$ 19,90/mês",
          billingPeriod: "monthly",
        },
      ]);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const provider = Platform.OS === "ios" ? "apple" : "google";
      await purchaseProduct(userId, selectedProductId, provider);
      Alert.alert(
        "Plano Ativado com Sucesso!",
        "Agora você tem alunos e treinos ilimitados na sua consultoria.",
        [
          {
            text: "OK",
            onPress: () => {
              onClose();
              onSuccess?.();
            },
          },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar assinatura.";
      Alert.alert("Erro na Compra", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await restorePurchases(userId);
      Alert.alert("Restauração de Compras", res.message, [
        {
          text: "OK",
          onPress: () => {
            if (res.restored) {
              onClose();
              onSuccess?.();
            }
          },
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível restaurar compras.";
      Alert.alert("Erro", msg);
    } finally {
      setRestoring(false);
    }
  };

  const annualProduct = products.find((p) => p.billingPeriod === "annual") || {
    productId: "personal_pro_annual",
    title: "Anual",
    localizedPrice: "R$ 199,90",
  };

  const monthlyProduct = products.find((p) => p.billingPeriod === "monthly") || {
    productId: "personal_pro_monthly",
    title: "Mensal",
    localizedPrice: "R$ 19,90/mês",
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropDismiss} />
        </TouchableWithoutFeedback>

        <View style={styles.container}>
          {/* HEADER COM BOTÃO DE FECHAR */}
          <View style={styles.header}>
            <View style={styles.headerIndicator} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* HERO SECTION */}
            <View style={styles.heroSection}>
              <View style={styles.proTag}>
                <Image
                  source={require("@/assets/images/logo-white.png")}
                  style={styles.proTagLogo}
                  resizeMode="contain"
                />
                <Text style={styles.proTagText}>DRAGONCORP PRO</Text>
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {/* SELEÇÃO DO PLANO ANUAL */}
            <TouchableOpacity
              style={[
                styles.planOptionCard,
                selectedProductId === "personal_pro_annual" && styles.planOptionCardSelected,
              ]}
              onPress={() => setSelectedProductId("personal_pro_annual")}
              activeOpacity={0.85}
            >
              <View style={styles.bestChoiceBadge}>
                <Text style={styles.bestChoiceBadgeText}>Melhor escolha</Text>
              </View>

              <View style={styles.planCardTop}>
                <View style={styles.radioRow}>
                  <View
                    style={[
                      styles.radioButton,
                      selectedProductId === "personal_pro_annual" && styles.radioButtonActive,
                    ]}
                  >
                    {selectedProductId === "personal_pro_annual" && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.planCardName}>Anual</Text>
                </View>
                <Text style={styles.planCardPrice}>{annualProduct.localizedPrice}</Text>
              </View>

              <View style={styles.giftOfferRow}>
                <Ionicons name="gift" size={15} color="#D90000" style={{ marginRight: 6 }} />
                <Text style={styles.giftOfferText}>
                  Ganhe 2 meses grátis (pague 10, use 12)
                </Text>
              </View>

              <Text style={styles.planCardSubtext}>
                Acesso ilimitado o ano inteiro, sem renovação mensal
              </Text>
            </TouchableOpacity>

            {/* SELEÇÃO DO PLANO MENSAL */}
            <TouchableOpacity
              style={[
                styles.planOptionCard,
                selectedProductId === "personal_pro_monthly" && styles.planOptionCardSelected,
              ]}
              onPress={() => setSelectedProductId("personal_pro_monthly")}
              activeOpacity={0.85}
            >
              <View style={styles.planCardTop}>
                <View style={styles.radioRow}>
                  <View
                    style={[
                      styles.radioButton,
                      selectedProductId === "personal_pro_monthly" && styles.radioButtonActive,
                    ]}
                  >
                    {selectedProductId === "personal_pro_monthly" && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.planCardName}>Mensal</Text>
                </View>
                <Text style={styles.planCardPrice}>{monthlyProduct.localizedPrice}</Text>
              </View>

              <Text style={styles.planCardSubtext}>
                Cobrança mensal recorrente com cancelamento a qualquer momento
              </Text>
            </TouchableOpacity>

            {/* BENEFÍCIOS */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Tudo o que está incluso no Pro:</Text>
              {PRO_BENEFITS.map((item) => (
                <View key={item.id} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#D90000" style={{ marginRight: 8, marginTop: 1 }} />
                  <View style={styles.benefitTextWrap}>
                    <Text style={styles.benefitItemTitle}>{item.title}</Text>
                    <Text style={styles.benefitItemDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* BOTÕES DE AÇÃO */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSubscribe}
                disabled={loading || restoring}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {selectedProductId === "personal_pro_annual" ? "Assinar Anual" : "Assinar Mensal"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  onClose();
                  setTimeout(() => router.push("/subscription"), 150);
                }}
                disabled={loading || restoring}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Ver detalhes dos planos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={loading || restoring}
                activeOpacity={0.8}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="#888888" />
                ) : (
                  <Text style={styles.restoreButtonText}>Restaurar compras</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.termsFooter}>
              A assinatura será cobrada na sua conta da App Store ou Google Play e renovada automaticamente até o cancelamento nas configurações da respectiva loja.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "flex-end",
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: "#0F0F0F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    maxHeight: "92%",
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
    position: "relative",
    minHeight: 36,
  },
  headerIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333333",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 20,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 18,
  },
  proTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D90000",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 10,
    gap: 6,
  },
  proTagLogo: {
    width: 16,
    height: 16,
  },
  proTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },

  // CARD DE OPÇÃO DE PLANO
  planOptionCard: {
    backgroundColor: "#161616",
    borderWidth: 1.5,
    borderColor: "#262626",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    position: "relative",
  },
  planOptionCardSelected: {
    borderColor: "#D90000",
    backgroundColor: "#1A1414",
  },
  bestChoiceBadge: {
    position: "absolute",
    top: -10,
    left: 16,
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestChoiceBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    marginTop: 2,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#555555",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioButtonActive: {
    borderColor: "#D90000",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D90000",
  },
  planCardName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  planCardPrice: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  giftOfferRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginLeft: 28,
  },
  giftOfferText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "700",
  },
  planCardSubtext: {
    color: "#888888",
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 28,
  },

  // BENEFÍCIOS
  benefitsContainer: {
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 14,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  benefitIconWrap: {
    marginRight: 10,
    marginTop: 1,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  benefitItemDesc: {
    fontSize: 11,
    color: "#777777",
  },

  // AÇÕES
  actionsContainer: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2C2C2C",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#CCCCCC",
    fontSize: 13,
    fontWeight: "600",
  },
  restoreButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  restoreButtonText: {
    color: "#777777",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  termsFooter: {
    fontSize: 11,
    color: "#555555",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 16,
    paddingHorizontal: 8,
  },
});
