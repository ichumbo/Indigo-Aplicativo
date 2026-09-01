import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleLogoSvg } from "@/components/google-logo-svg";
import { AnimatedBackgroundElements } from "@/components/AnimatedBackgroundElements";
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
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [temPersonal, setTemPersonal] = useState(false);
  const [codigoPersonal, setCodigoPersonal] = useState("");
  const [loading, setLoading] = useState(false);

  // Modais de SMS e OAuth Link
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [pendingOAuthData, setPendingOAuthData] = useState<{
    provider: "google" | "apple";
    subject: string;
    email: string;
  } | null>(null);
  const [linkPassword, setLinkPassword] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const googleScale = useRef(new Animated.Value(1)).current;
  const appleScale = useRef(new Animated.Value(1)).current;
  const smsScale = useRef(new Animated.Value(1)).current;
  const redirectedRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoAnim, formAnim]);

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

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Campo Obrigatório", "Por favor, digite seu e-mail ou CPF.");
      return;
    }
    if (!senha.trim()) {
      Alert.alert("Campo Obrigatório", "Por favor, digite sua senha de acesso.");
      return;
    }

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setLoading(true);

    try {
      const session = await signInWithCredentials(email, senha);
      redirectedRef.current = true;
      router.replace(getHomeRouteForRole(session.user.role) as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "E-mail ou senha incorretos.";
      Alert.alert("Falha no Login", msg);
    } finally {
      setLoading(false);
    }
  };

  // Envio de SMS
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

  // Validação SMS
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

  // Google Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const simulatedGoogleSub = `google_sub_${Date.now()}`;
      const simulatedEmail = email.includes("@") ? email.trim() : "treinador@dragoncorp.app";

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
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  // Apple Login
  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const simulatedAppleSub = `apple_sub_${Date.now()}`;
      const simulatedEmail = email.includes("@") ? email.trim() : undefined;

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
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  // Confirmação de Vinculação
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* BACKGROUND GEOMÉTRICO ANIMADO EM MOVIMENTO CONTÍNUO */}
      <AnimatedBackgroundElements />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
            {/* CABEÇALHO COM LOGO CENTRALIZADA */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: logoAnim,
                  transform: [
                    {
                      translateY: logoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <BrandLogo variant="full" theme="dark" width={230} height={56} style={styles.logo} />
            </Animated.View>

            {/* FORMULÁRIO */}
            <View style={styles.form}>
              {/* E-MAIL / CPF */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#D90000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Digite seu email ou CPF"
                    placeholderTextColor="#777"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* SENHA */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#D90000" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#777"
                    secureTextEntry={!mostrarSenha}
                    value={senha}
                    onChangeText={setSenha}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setMostrarSenha(!mostrarSenha)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={mostrarSenha ? "eye-off" : "eye"}
                      size={20}
                      color="#D90000"
                    />
                  </TouchableOpacity>
                </View>

                {/* CÓDIGO DE PERSONAL OPCIONAL */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setTemPersonal(!temPersonal)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={temPersonal ? "checkbox" : "square-outline"}
                    size={20}
                    color="#D90000"
                  />
                  <Text style={styles.checkboxText}>Tenho código de personal</Text>
                </TouchableOpacity>

                {temPersonal && (
                  <View style={[styles.inputWrapper, { marginTop: 8 }]}>
                    <Ionicons name="person-outline" size={20} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Código do Personal"
                      placeholderTextColor="#777"
                      value={codigoPersonal}
                      onChangeText={setCodigoPersonal}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                  </View>
                )}
              </View>

              {/* BOTÃO PRINCIPAL DE LOGIN */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Entrar</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* ESQUECI MINHA SENHA */}
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => router.push("/forgot-password")}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              {/* DIVISOR SOCIAL */}
              <View style={styles.socialDividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou entre com</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* BOTÕES SOCIAIS E SMS REFINADOS */}
              <View style={styles.socialButtonsRow}>
                <Animated.View style={{ transform: [{ scale: googleScale }] }}>
                  <TouchableOpacity
                    style={styles.socialCircleBtn}
                    onPress={handleGoogleLogin}
                    onPressIn={() => Animated.spring(googleScale, { toValue: 0.92, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(googleScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                    activeOpacity={0.85}
                    accessibilityLabel="Entrar com Google"
                  >
                    <GoogleLogoSvg size={24} />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: appleScale }] }}>
                  <TouchableOpacity
                    style={styles.socialCircleBtn}
                    onPress={handleAppleLogin}
                    onPressIn={() => Animated.spring(appleScale, { toValue: 0.92, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(appleScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                    activeOpacity={0.85}
                    accessibilityLabel="Entrar com Apple"
                  >
                    <Ionicons name="logo-apple" size={26} color="#FFFFFF" />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: smsScale }] }}>
                  <TouchableOpacity
                    style={styles.socialCircleBtn}
                    onPress={() => {
                      setPhoneModalVisible(true);
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    onPressIn={() => Animated.spring(smsScale, { toValue: 0.92, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(smsScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                    activeOpacity={0.85}
                    accessibilityLabel="Entrar com SMS"
                  >
                    <Ionicons name="chatbox-ellipses" size={24} color="#D90000" />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* BOTÃO DE CADASTRO */}
              <TouchableOpacity
                style={[styles.registerCtaButton, { marginTop: 6 }]}
                onPress={() => router.push("/trainer-onboarding")}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={16} color="#D90000" style={{ marginRight: 8 }} />
                <Text style={styles.registerCtaText}>
                  Novo por aqui? Cadastre-se como Personal
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL: SMS OTP */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entrar com Celular</Text>
              <TouchableOpacity onPress={() => setPhoneModalVisible(false)}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {!otpSent ? (
              <>
                <Text style={styles.modalSubText}>
                  Informe seu número de celular com DDD para receber o código SMS de verificação.
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#D90000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor="#888"
                    keyboardType="phone-pad"
                    value={phoneInput}
                    onChangeText={(t) => setPhoneInput(formatPhone(t))}
                    maxLength={15}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, { marginTop: 16 }]}
                  onPress={handleSendPhoneCode}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Enviar Código SMS</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalSubText}>
                  Digite o código de 6 dígitos enviado por SMS para {phoneInput}.
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color="#D90000" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { textAlign: "center", letterSpacing: 6, fontWeight: "700", fontSize: 18 }]}
                    placeholder="000000"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, { marginTop: 16 }]}
                  onPress={handleVerifyPhoneCode}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Confirmar e Entrar</Text>
                  )}
                </TouchableOpacity>

                <View style={{ alignItems: "center", marginTop: 14 }}>
                  {countdown > 0 ? (
                    <Text style={{ fontSize: 12, color: "#666" }}>Reenviar em {countdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendPhoneCode} disabled={otpLoading}>
                      <Text style={{ fontSize: 13, color: "#D90000", fontWeight: "700" }}>Reenviar Código SMS</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: VINCULAR CONTA OAUTH */}
      <Modal
        visible={linkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Conta</Text>
              <TouchableOpacity onPress={() => setLinkModalVisible(false)}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubText}>
              Existe uma conta com o e-mail <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{pendingOAuthData?.email}</Text>. Digite sua senha para vincular ao {pendingOAuthData?.provider === "google" ? "Google" : "Apple"}:
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#D90000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Sua senha atual"
                placeholderTextColor="#888"
                secureTextEntry
                value={linkPassword}
                onChangeText={setLinkPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, { marginTop: 16 }]}
              onPress={handleConfirmAccountLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Confirmar e Vincular</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  content: {
    width: "100%",
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    alignSelf: "center",
  },
  form: {
    gap: 13,
  },
  inputContainer: {
    gap: 6,
  },
  inputWrapper: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    position: "relative",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    height: "100%",
  },
  passwordInput: {
    paddingRight: 36,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    padding: 6,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#161616",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#262626",
  },
  checkboxText: {
    color: "#AAAAAA",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  loginButton: {
    backgroundColor: "#D90000",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: "#555",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  forgotText: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "600",
  },
  socialDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#222228",
  },
  dividerText: {
    fontSize: 12.5,
    color: "#777777",
    marginHorizontal: 12,
    fontWeight: "600",
  },
  socialButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  socialCircleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#16161A",
    borderWidth: 1.5,
    borderColor: "#2E2E36",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  registerCtaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#282828",
  },
  registerCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#141414",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 22,
  },
  modalHeader: {
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
  modalSubText: {
    fontSize: 13,
    color: "#888888",
    lineHeight: 19,
    marginBottom: 16,
  },
});
