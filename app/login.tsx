import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/brand-logo";
import {
  getCurrentSession,
  getHomeRouteForRole,
  signInWithCredentials,
} from "@/services/auth-store";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectedRef = useRef(false);

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

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage("Por favor, digite seu e-mail ou CPF.");
      return;
    }
    if (!senha.trim()) {
      setErrorMessage("Por favor, digite sua senha de acesso.");
      return;
    }

    setLoading(true);

    try {
      const session = await signInWithCredentials(email, senha);
      redirectedRef.current = true;
      router.replace(getHomeRouteForRole(session.user.role) as never);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "E-mail ou senha incorretos. Verifique suas credenciais.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const isSmallScreen = SCREEN_HEIGHT < 720;

  return (
    <SafeAreaView style={styles.rootContainer} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0E" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isSmallScreen && styles.scrollContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. HEADER INTEGRADO: LOGO ACIMA DO TÍTULO + SUBTÍTULO COMPACTO */}
          <View style={[styles.headerSection, isSmallScreen && styles.headerSectionCompact]}>
            <BrandLogo
              variant="full"
              theme="dark"
              width={142}
              height={32}
              style={styles.logo}
            />
            <Text style={[styles.title, isSmallScreen && { fontSize: 21 }]}>
              Acesse sua conta
            </Text>
            <Text style={[styles.subtitle, isSmallScreen && { fontSize: 12.5, lineHeight: 17 }]}>
              Entre para gerenciar seu plano e acessar todos os seus recursos.
            </Text>
          </View>

          {/* 2. ERROR ALERT BOX */}
          {errorMessage ? (
            <View style={styles.errorAlert}>
              <Ionicons
                name="alert-circle"
                size={16}
                color="#FF4D4D"
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <Text style={styles.errorAlertText}>{errorMessage}</Text>
              <TouchableOpacity
                onPress={() => setErrorMessage(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={15} color="#FF8080" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 3. FORM FIELDS */}
          <View style={[styles.form, isSmallScreen && { gap: 10 }]}>
            {/* E-mail / CPF Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                E-mail <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, isSmallScreen && { height: 44 }]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="#71717A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#52525B"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Senha Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Senha <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, isSmallScreen && { height: 44 }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#71717A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#52525B"
                  secureTextEntry={!mostrarSenha}
                  value={senha}
                  onChangeText={(t) => {
                    setSenha(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
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
                    name={mostrarSenha ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color="#71717A"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me Checkbox & Forgot Password Link */}
            <View style={styles.rememberForgotRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberMeText}>Lembrar de mim</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/forgot-password")}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotPasswordLink}>Esqueci minha senha</Text>
              </TouchableOpacity>
            </View>

            {/* Primary Entrar Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginButton,
                isSmallScreen && { height: 44 },
                pressed && styles.loginButtonPressed,
                loading && styles.loginButtonDisabled,
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.loginButtonText}>Entrando...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </Pressable>

            {/* Personal Trainer Registration CTA */}
            <View style={[styles.trainerCtaSection, isSmallScreen && { gap: 6 }]}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Trainer Registration Card */}
              <TouchableOpacity
                style={[
                  styles.trainerRegisterCard,
                  isSmallScreen && { paddingVertical: 8, paddingHorizontal: 10 },
                ]}
                onPress={() => router.push("/trainer-onboarding")}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.trainerIconWrap,
                    isSmallScreen && { width: 32, height: 32 },
                  ]}
                >
                  <Ionicons name="barbell" size={isSmallScreen ? 16 : 18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trainerCardTitle, isSmallScreen && { fontSize: 13 }]}>
                    Sou Personal Trainer
                  </Text>
                  <Text style={styles.trainerCardSubtitle} numberOfLines={1}>
                    Criar conta profissional e prescrever treinos
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#71717A" />
              </TouchableOpacity>

              {/* Footer question link */}
              <View style={styles.footerRegisterRow}>
                <Text style={styles.footerRegisterText}>É Personal Trainer? </Text>
                <TouchableOpacity onPress={() => router.push("/trainer-onboarding")}>
                  <Text style={styles.footerRegisterLink}>Criar conta de personal</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Legal Terms Footer */}
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>
                Ao continuar, você concorda com nossos{" "}
                <Text
                  style={styles.legalHighlight}
                  onPress={() => router.push("/terms-of-use")}
                >
                  Termos de Uso
                </Text>{" "}
                e{" "}
                <Text
                  style={styles.legalHighlight}
                  onPress={() => router.push("/privacy-policy")}
                >
                  Política de Privacidade
                </Text>
                .
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#0D0D0E",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  scrollContentCompact: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerSection: {
    marginBottom: 16,
    alignItems: "flex-start",
  },
  headerSectionCompact: {
    marginBottom: 12,
  },
  logo: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    color: "#9CA3AF",
    lineHeight: 18,
    marginTop: 0,
    marginBottom: 0,
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.12)",
    borderColor: "rgba(220, 38, 38, 0.35)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
    gap: 6,
  },
  errorAlertText: {
    flex: 1,
    color: "#F87171",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  form: {
    gap: 12,
  },
  fieldGroup: {
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4D4D8",
    letterSpacing: -0.1,
  },
  requiredStar: {
    color: "#D90000",
    fontWeight: "700",
  },
  inputBox: {
    height: 48,
    backgroundColor: "#141416",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242428",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    height: "100%",
  },
  passwordInput: {
    paddingRight: 30,
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    padding: 6,
  },
  rememberForgotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#3F3F46",
    backgroundColor: "#18181B",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  rememberMeText: {
    color: "#9CA3AF",
    fontSize: 12.5,
    fontWeight: "500",
  },
  forgotPasswordLink: {
    color: "#D90000",
    fontSize: 12.5,
    fontWeight: "600",
  },
  loginButton: {
    height: 48,
    backgroundColor: "#D90000",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loginButtonPressed: {
    backgroundColor: "#B30000",
  },
  loginButtonDisabled: {
    backgroundColor: "#8A0000",
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  trainerCtaSection: {
    marginTop: 4,
    gap: 8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#222226",
  },
  dividerText: {
    fontSize: 11.5,
    color: "#71717A",
    fontWeight: "500",
    textTransform: "lowercase",
  },
  trainerRegisterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141416",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242428",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  trainerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerCardTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  trainerCardSubtitle: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 1,
    lineHeight: 14,
  },
  footerRegisterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  footerRegisterText: {
    fontSize: 12.5,
    color: "#9CA3AF",
  },
  footerRegisterLink: {
    fontSize: 12.5,
    color: "#D90000",
    fontWeight: "700",
  },
  legalContainer: {
    marginTop: 4,
    alignItems: "center",
  },
  legalText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 15,
  },
  legalHighlight: {
    color: "#9CA3AF",
    textDecorationLine: "underline",
  },
});
