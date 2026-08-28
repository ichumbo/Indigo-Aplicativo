import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/brand-logo";
import {
  getCurrentSession,
  getHomeRouteForRole,
  signInWithCredentials,
  sendPhoneVerificationCode,
  verifyPhoneCodeAndSignIn,
  signInWithGoogle,
  signInWithApple,
  linkOAuthAccount,
} from "@/services/auth-store";

export default function LoginScreen() {
  const router = useRouter();
  const [emailOrCpf, setEmailOrCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal de Login por Celular / SMS OTP
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Modal de Vinculação de Conta OAuth
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [pendingOAuthData, setPendingOAuthData] = useState<{
    provider: "google" | "apple";
    subject: string;
    email: string;
  } | null>(null);
  const [linkPassword, setLinkPassword] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const redirectedRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then((session) => {
        if (!mounted || !session || redirectedRef.current) return;
        redirectedRef.current = true;
        router.replace(getHomeRouteForRole(session.user.role) as never);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [router]);

  // Contagem regressiva do SMS
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // 1. LOGIN COM E-MAIL / CPF E SENHA
  const handleEmailPasswordLogin = async () => {
    if (!emailOrCpf.trim()) {
      return setErrorMessage("Informe seu e-mail ou CPF cadastrado.");
    }
    if (!password.trim()) {
      return setErrorMessage("Informe sua senha de acesso.");
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const session = await signInWithCredentials(emailOrCpf, password);
      redirectedRef.current = true;
      router.replace(getHomeRouteForRole(session.user.role) as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Credenciais inválidas.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. ENVIO DE SMS
  const handleSendPhoneCode = async () => {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 10) {
      Alert.alert("Telefone inválido", "Informe um número de celular com DDD válido.");
      return;
    }

    setOtpLoading(true);
    try {
      const result = await sendPhoneVerificationCode(phoneInput);
      setOtpSent(true);
      setCountdown(result.cooldownSeconds);
      Alert.alert("Código Enviado", `Código SMS de 6 dígitos enviado para ${result.formattedPhone}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível enviar o código SMS.";
      Alert.alert("Erro no envio", msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. VERIFICAÇÃO DO CÓDIGO SMS
  const handleVerifyPhoneCode = async () => {
    if (otpCode.trim().length < 6) {
      Alert.alert("Código incompleto", "Digite os 6 dígitos recebidos por SMS.");
      return;
    }

    setOtpLoading(true);
    try {
      const session = await verifyPhoneCodeAndSignIn(phoneInput, otpCode);
      setPhoneModalVisible(false);
      redirectedRef.current = true;
      router.replace(getHomeRouteForRole(session.user.role) as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código SMS incorreto.";
      Alert.alert("Falha na autenticação", msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // 4. GOOGLE SIGN-IN
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const simulatedGoogleSub = `google_sub_${Date.now()}`;
      const simulatedEmail = emailOrCpf.includes("@") ? emailOrCpf.trim() : "treinador@dragoncorp.app";

      const result = await signInWithGoogle(
        "simulated_google_token",
        simulatedGoogleSub,
        simulatedEmail,
        "Personal Google"
      );

      if (result.requiresAccountLink && result.existingEmail) {
        setPendingOAuthData({
          provider: "google",
          subject: simulatedGoogleSub,
          email: result.existingEmail,
        });
        setLinkModalVisible(true);
        return;
      }

      if (result.session) {
        redirectedRef.current = true;
        router.replace(getHomeRouteForRole(result.session.user.role) as never);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar com o Google.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 5. APPLE SIGN-IN
  const handleAppleLogin = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const simulatedAppleSub = `apple_sub_${Date.now()}`;
      const simulatedEmail = emailOrCpf.includes("@") ? emailOrCpf.trim() : undefined;

      const result = await signInWithApple(
        "simulated_apple_token",
        simulatedAppleSub,
        simulatedEmail,
        "Personal Apple"
      );

      if (result.requiresAccountLink && result.existingEmail) {
        setPendingOAuthData({
          provider: "apple",
          subject: simulatedAppleSub,
          email: result.existingEmail,
        });
        setLinkModalVisible(true);
        return;
      }

      if (result.session) {
        redirectedRef.current = true;
        router.replace(getHomeRouteForRole(result.session.user.role) as never);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar com a Apple.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 6. CONFIRMAÇÃO DE VINCULAÇÃO SEGURA
  const handleConfirmAccountLink = async () => {
    if (!pendingOAuthData || !linkPassword.trim()) {
      Alert.alert("Atenção", "Digite sua senha atual para confirmar a posse da conta.");
      return;
    }

    setLoading(true);
    try {
      const session = await signInWithCredentials(pendingOAuthData.email, linkPassword);
      await linkOAuthAccount(
        session.user.id,
        pendingOAuthData.provider,
        pendingOAuthData.subject,
        pendingOAuthData.email
      );

      setLinkModalVisible(false);
      setPendingOAuthData(null);
      Alert.alert("Conta Vinculada", `Login com ${pendingOAuthData.provider === "google" ? "Google" : "Apple"} ativado com sucesso.`);

      redirectedRef.current = true;
      router.replace(getHomeRouteForRole(session.user.role) as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Senha incorreta.";
      Alert.alert("Falha na confirmação", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.contentWrapper,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Top Back Curved Icon & Brand */}
            <View style={styles.topNavRow}>
              <TouchableOpacity
                style={styles.backIconButton}
                onPress={() => router.replace("/")}
                activeOpacity={0.7}
                accessibilityLabel="Voltar"
              >
                <Ionicons name="return-up-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <BrandLogo variant="symbol" theme="dark" width={38} height={38} />
            </View>

            {/* Title & Subtitle */}
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>Welcome Back, Personal!</Text>
              <Text style={styles.subTitle}>Sua plataforma de alta performance DragonCorp.</Text>
            </View>

            {/* Error Message */}
            {errorMessage.length > 0 && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorCardText}>{errorMessage}</Text>
              </View>
            )}

            {/* Pill Inputs Container */}
            <View style={styles.formContainer}>
              {/* E-mail ou CPF Pill Input */}
              <View style={styles.pillInputWrapper}>
                <View style={styles.pillIconCircle}>
                  <Ionicons name="mail" size={18} color="#D62828" />
                </View>
                <TextInput
                  style={styles.pillTextInput}
                  placeholder="Seu E-mail ou CPF"
                  placeholderTextColor="#6B7280"
                  value={emailOrCpf}
                  onChangeText={setEmailOrCpf}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Pill Input */}
              <View style={styles.pillInputWrapper}>
                <View style={styles.pillIconCircle}>
                  <Ionicons name="lock-closed" size={18} color="#D62828" />
                </View>
                <TextInput
                  style={styles.pillTextInput}
                  placeholder="Sua Senha"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Remember Me & Forgot Password Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.customCheckbox, rememberMe && styles.customCheckboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.rememberText}>Lembrar de mim</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/forgot-password")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordLink}>Esqueci minha senha?</Text>
                </TouchableOpacity>
              </View>

              {/* Big Rounded Pill Login CTA Button */}
              <TouchableOpacity
                style={[styles.primaryPillButton, loading && styles.buttonDisabled]}
                onPress={handleEmailPasswordLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryPillButtonText}>Entrar</Text>
                )}
              </TouchableOpacity>

              {/* Divider '──── or ────' */}
              <View style={styles.orDividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Circular Buttons */}
              <View style={styles.socialButtonsRow}>
                {/* Google Button */}
                <TouchableOpacity
                  style={styles.circularSocialButton}
                  onPress={handleGoogleLogin}
                  activeOpacity={0.8}
                  accessibilityLabel="Entrar com Google"
                >
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                </TouchableOpacity>

                {/* Apple Button */}
                <TouchableOpacity
                  style={styles.circularSocialButton}
                  onPress={handleAppleLogin}
                  activeOpacity={0.8}
                  accessibilityLabel="Entrar com Apple"
                >
                  <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Phone SMS Button */}
                <TouchableOpacity
                  style={styles.circularSocialButton}
                  onPress={() => {
                    setPhoneModalVisible(true);
                    setOtpSent(false);
                    setOtpCode("");
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel="Entrar com SMS"
                >
                  <Ionicons name="chatbox-ellipses" size={22} color="#D62828" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Switch Link: Don't have an Account yet? Sign Up */}
            <View style={styles.bottomFooterRow}>
              <Text style={styles.bottomFooterText}>Não tem uma conta ainda? </Text>
              <TouchableOpacity
                onPress={() => router.push("/trainer-onboarding")}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomFooterLink}>Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========================================================= */}
      {/* MODAL: LOGIN POR SMS OTP                                 */}
      {/* ========================================================= */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Entrar com Celular</Text>
              <TouchableOpacity onPress={() => setPhoneModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {!otpSent ? (
              <>
                <Text style={styles.modalDescription}>
                  Informe seu número de celular com DDD para receber o código SMS de verificação.
                </Text>

                <View style={styles.pillInputWrapper}>
                  <View style={styles.pillIconCircle}>
                    <Ionicons name="call" size={18} color="#D62828" />
                  </View>
                  <TextInput
                    style={styles.pillTextInput}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                    value={phoneInput}
                    onChangeText={(t) => setPhoneInput(formatPhone(t))}
                    maxLength={15}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryPillButton}
                  onPress={handleSendPhoneCode}
                  disabled={otpLoading}
                  activeOpacity={0.85}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryPillButtonText}>Enviar Código SMS</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  Digite o código de 6 dígitos enviado por SMS para {phoneInput}.
                </Text>

                <View style={styles.pillInputWrapper}>
                  <View style={styles.pillIconCircle}>
                    <Ionicons name="key" size={18} color="#D62828" />
                  </View>
                  <TextInput
                    style={[styles.pillTextInput, { textAlign: "center", letterSpacing: 6, fontWeight: "800", fontSize: 18 }]}
                    placeholder="000000"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryPillButton}
                  onPress={handleVerifyPhoneCode}
                  disabled={otpLoading}
                  activeOpacity={0.85}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryPillButtonText}>Confirmar e Entrar</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendCenterRow}>
                  {countdown > 0 ? (
                    <Text style={styles.resendCountdownText}>Reenviar código em {countdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendPhoneCode} disabled={otpLoading}>
                      <Text style={styles.resendActionLink}>Reenviar Código SMS</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: VINCULAÇÃO SEGURA OAUTH                            */}
      {/* ========================================================= */}
      <Modal
        visible={linkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Vincular Conta</Text>
              <TouchableOpacity onPress={() => setLinkModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Já existe uma conta com o e-mail <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{pendingOAuthData?.email}</Text>. Para vincular seu acesso com {pendingOAuthData?.provider === "google" ? "Google" : "Apple"}, informe sua senha atual:
            </Text>

            <View style={styles.pillInputWrapper}>
              <View style={styles.pillIconCircle}>
                <Ionicons name="lock-closed" size={18} color="#D62828" />
              </View>
              <TextInput
                style={styles.pillTextInput}
                placeholder="Sua senha atual"
                placeholderTextColor="#6B7280"
                secureTextEntry
                value={linkPassword}
                onChangeText={setLinkPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryPillButton}
              onPress={handleConfirmAccountLink}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryPillButtonText}>Confirmar e Vincular</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    justifyContent: "space-between",
  },
  contentWrapper: {
    width: "100%",
  },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#161618",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSection: {
    marginBottom: 28,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#220808",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  errorCardText: {
    fontSize: 13,
    color: "#EF4444",
    flex: 1,
    fontWeight: "600",
  },
  formContainer: {
    width: "100%",
  },
  pillInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181B",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#27272A",
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
  },
  pillIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pillTextInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeIconButton: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#52525B",
    backgroundColor: "#18181B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  customCheckboxChecked: {
    backgroundColor: "#D62828",
    borderColor: "#D62828",
  },
  rememberText: {
    fontSize: 13,
    color: "#D1D5DB",
    fontWeight: "500",
  },
  forgotPasswordLink: {
    fontSize: 13,
    color: "#D62828",
    fontWeight: "700",
  },
  primaryPillButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#D62828",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D62828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryPillButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#27272A",
  },
  dividerLabel: {
    fontSize: 13,
    color: "#71717A",
    marginHorizontal: 14,
    textTransform: "lowercase",
  },
  socialButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  circularSocialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  bottomFooterText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  bottomFooterLink: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D62828",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#121214",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 22,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalDescription: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 19,
    marginBottom: 16,
  },
  resendCenterRow: {
    alignItems: "center",
    marginTop: 14,
  },
  resendCountdownText: {
    fontSize: 12,
    color: "#71717A",
  },
  resendActionLink: {
    fontSize: 13,
    color: "#D62828",
    fontWeight: "700",
  },
});
