import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { deleteUserAccount, signOut, updateUserProfile } from "@/services/auth-store";
import { getSubscriptionForUser, SubscriptionRecord } from "@/services/subscription-service";
import { UserAvatar } from "@/components/user-avatar";

export default function AccountProfileScreen() {
  const router = useRouter();
  const { session, refreshSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(translateYAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setPhone(session.user.phone || "");
      setCpf(session.user.cpf || "");
      setAvatar(session.user.avatar || null);

      if (session.user.role === "TRAINER") {
        void getSubscriptionForUser(session.user.id).then(setSubscription);
      }
    }
  }, [session?.user]);

  const handleSave = async () => {
    if (!session?.user) return;
    if (!name.trim()) {
      Alert.alert("Campo Obrigatório", "Informe seu nome completo.");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(session.user.id, {
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatar || undefined,
      });
      await refreshSession();
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar perfil.";
      Alert.alert("Erro", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair da Conta", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await signOut("Logout pelo perfil de conta.");
          router.replace("/login");
        },
      },
    ]);
  };

  const handlePickAvatar = async () => {
    Alert.alert(
      "Foto de Perfil",
      "Escolha uma opção:",
      [
        {
          text: "Escolher da Galeria",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permissão Necessária", "Permita acesso às fotos para alterar o avatar.");
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
              });
              if (!result.canceled && result.assets && result.assets[0]) {
                setAvatar(result.assets[0].uri);
              }
            } catch {
              Alert.alert("Erro", "Não foi possível carregar a imagem da galeria.");
            }
          },
        },
        avatar
          ? {
              text: "Remover Foto (Usar Dragão)",
              style: "destructive",
              onPress: () => setAvatar(null),
            }
          : { text: "Cancelar", style: "cancel" },
        { text: "Cancelar", style: "cancel" },
      ].filter(Boolean) as never
    );
  };

  const handleDeleteAccount = () => {
    if (!session?.user) return;

    Alert.alert(
      "Excluir Minha Conta Definitivamente",
      "Atenção: Todos os seus treinos, histórico de avaliações e dados pessoais serão permanentemente deletados dos nossos servidores conforme a LGPD. Esta ação é irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir Definitivamente",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const result = await deleteUserAccount(
                session.user.id,
                "Exclusão solicitada pelo titular na tela de perfil."
              );
              Alert.alert("Conta Excluída", result.message, [
                {
                  text: "OK",
                  onPress: () => router.replace("/login"),
                },
              ]);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Erro ao excluir conta.";
              Alert.alert("Falha", msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const role = session?.user.role;
  const isTrainer = role === "TRAINER";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Meu Perfil</Text>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: "rgba(239, 68, 68, 0.3)" }]}
          onPress={handleLogout}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Sair"
        >
          <Ionicons name="log-out-outline" size={19} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            }}
          >
            {/* PROFILE IDENTITY CARD */}
            <View style={[styles.identityCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.avatarWrap}>
                <UserAvatar uri={avatar} size={84} />
                <TouchableOpacity
                  style={[styles.cameraBadge, { borderColor: theme.card }]}
                  onPress={handlePickAvatar}
                  activeOpacity={0.8}
                  accessibilityLabel="Editar foto"
                >
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.profileNameText, { color: theme.text }]}>{name || "Usuário"}</Text>
              <Text style={[styles.profileEmailText, { color: theme.textSecondary }]}>{email || "usuario@dragoncorp.app"}</Text>

              <View style={styles.badgesRow}>
                <View style={styles.rolePill}>
                  <Ionicons
                    name={isTrainer ? "barbell-outline" : "person-outline"}
                    size={13}
                    color="#D62828"
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.rolePillText}>
                    {isTrainer ? "PERSONAL TRAINER" : "ALUNO"}
                  </Text>
                </View>

                {isTrainer && subscription && (
                  <View
                    style={[
                      styles.planPill,
                      subscription.plan === "PRO" ? styles.planPillPro : styles.planPillFree,
                    ]}
                  >
                    <Ionicons
                      name="sparkles"
                      size={11}
                      color={subscription.plan === "PRO" ? "#F59E0B" : "#10B981"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.planPillText,
                        subscription.plan === "PRO" ? { color: "#F59E0B" } : { color: "#10B981" },
                      ]}
                    >
                      {subscription.plan === "PRO" ? "PLANO PRO" : "PLANO FREE"}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* DADOS PESSOAIS FORM */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>Dados Cadastrais</Text>

              {/* Nome */}
              <View
                style={[
                  styles.pillInput,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                  focusedField === "name" && styles.pillInputFocused,
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: theme.cardSecondary }]}>
                  <Ionicons
                    name="person"
                    size={16}
                    color={focusedField === "name" ? "#D90000" : theme.textMuted}
                  />
                </View>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Nome Completo"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              {/* Telefone */}
              <View
                style={[
                  styles.pillInput,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                  focusedField === "phone" && styles.pillInputFocused,
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: theme.cardSecondary }]}>
                  <Ionicons
                    name="call"
                    size={16}
                    color={focusedField === "phone" ? "#D90000" : theme.textMuted}
                  />
                </View>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Telefone / WhatsApp"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* E-mail (Disabled) */}
              <View style={[styles.pillInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <View style={[styles.pillIconWrap, { backgroundColor: theme.cardSecondary }]}>
                  <Ionicons name="mail" size={16} color={theme.textMuted} />
                </View>
                <TextInput
                  style={[styles.textInput, { color: theme.textMuted }]}
                  value={email}
                  editable={false}
                  placeholder="E-mail principal"
                  placeholderTextColor={theme.textMuted}
                />
                <Ionicons name="lock-closed-outline" size={14} color={theme.textMuted} />
              </View>

              {/* CPF (Disabled) */}
              {cpf ? (
                <View style={[styles.pillInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                  <View style={[styles.pillIconWrap, { backgroundColor: theme.cardSecondary }]}>
                    <Ionicons name="card" size={16} color={theme.textMuted} />
                  </View>
                  <TextInput
                    style={[styles.textInput, { color: theme.textMuted }]}
                    value={cpf}
                    editable={false}
                    placeholder="CPF"
                    placeholderTextColor={theme.textMuted}
                  />
                  <Ionicons name="lock-closed-outline" size={14} color={theme.textMuted} />
                </View>
              ) : null}

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.primaryCtaButton, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryCtaText}>Salvar Alterações</Text>
                  </>
                )}
              </TouchableOpacity>

              {successMsg && (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.successBannerText}>Perfil atualizado com sucesso!</Text>
                </View>
              )}
            </View>

            {/* SEGURANÇA E PRIVACIDADE */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Segurança & Governança</Text>

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push("/privacy-policy")}
                activeOpacity={0.7}
              >
                <View style={styles.navRowIconBox}>
                  <Ionicons name="shield-checkmark-outline" size={17} color="#D62828" />
                </View>
                <View style={styles.navRowTextCol}>
                  <Text style={styles.navRowTitle}>Política de Privacidade</Text>
                  <Text style={styles.navRowSub}>Conformidade LGPD e proteção de dados</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#52525B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push("/terms-of-use")}
                activeOpacity={0.7}
              >
                <View style={styles.navRowIconBox}>
                  <Ionicons name="document-text-outline" size={17} color="#D62828" />
                </View>
                <View style={styles.navRowTextCol}>
                  <Text style={styles.navRowTitle}>Termos de Uso</Text>
                  <Text style={styles.navRowSub}>Diretrizes e licença de uso DragonCorp</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#52525B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push("/support" as never)}
                activeOpacity={0.7}
              >
                <View style={styles.navRowIconBox}>
                  <Ionicons name="help-circle-outline" size={17} color="#D62828" />
                </View>
                <View style={styles.navRowTextCol}>
                  <Text style={styles.navRowTitle}>Ajuda e Suporte</Text>
                  <Text style={styles.navRowSub}>Dúvidas frequentes, chamados e contato</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#52525B" />
              </TouchableOpacity>

              {isTrainer && (
                <TouchableOpacity
                  style={[styles.navRow, { borderBottomWidth: 0 }]}
                  onPress={() => router.push("/subscription")}
                  activeOpacity={0.7}
                >
                  <View style={styles.navRowIconBox}>
                    <Ionicons name="card-outline" size={17} color="#D62828" />
                  </View>
                  <View style={styles.navRowTextCol}>
                    <Text style={styles.navRowTitle}>Minha Assinatura</Text>
                    <Text style={styles.navRowSub}>Gerenciar plano Pro, recibos e alunos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#52525B" />
                </TouchableOpacity>
              )}
            </View>

            {/* DANGER ZONE (EXCLUSÃO DE CONTA) */}
            <View style={styles.dangerCard}>
              <View style={styles.dangerHeaderRow}>
                <Ionicons name="warning-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.dangerTitle}>Zona de Exclusão</Text>
              </View>
              <Text style={styles.dangerText}>
                Ao excluir sua conta, seus dados pessoais, histórico de treinos e avaliações serão permanentemente apagados dos servidores (LGPD / Diretriz Apple 5.1.1(v)).
              </Text>
              <TouchableOpacity
                style={[styles.dangerButton, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator color="#EF4444" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.dangerButtonText}>Excluir Minha Conta Definitivamente</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
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
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#141417",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  identityCard: {
    backgroundColor: "#101013",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#202025",
    padding: 22,
    alignItems: "center",
    marginBottom: 18,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D62828",
    borderWidth: 2,
    borderColor: "#101013",
    alignItems: "center",
    justifyContent: "center",
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  profileEmailText: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 14,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2B2B32",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  planPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  planPillFree: {
    backgroundColor: "#062013",
    borderColor: "#10B981",
  },
  planPillPro: {
    backgroundColor: "#201704",
    borderColor: "#F59E0B",
  },
  planPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sectionCard: {
    backgroundColor: "#101013",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#202025",
    padding: 18,
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  pillInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141418",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24242A",
    paddingHorizontal: 15,
    height: 48,
    marginBottom: 11,
  },
  pillInputFocused: {
    borderColor: "#D62828",
    backgroundColor: "#18181E",
  },
  pillInputDisabled: {
    backgroundColor: "#0D0D10",
    borderColor: "#1A1A20",
  },
  pillIconWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    paddingVertical: 0,
  },
  primaryCtaButton: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D62828",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#D62828",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  successBannerText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A20",
  },
  navRowIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#18181D",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  navRowTextCol: {
    flex: 1,
  },
  navRowTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  navRowSub: {
    fontSize: 11,
    color: "#71717A",
  },
  dangerCard: {
    backgroundColor: "#140707",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#381212",
    padding: 18,
    marginBottom: 10,
  },
  dangerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EF4444",
  },
  dangerText: {
    fontSize: 12,
    color: "#A1A1AA",
    lineHeight: 17,
    marginBottom: 14,
  },
  dangerButton: {
    flexDirection: "row",
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F0A0A",
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
});
