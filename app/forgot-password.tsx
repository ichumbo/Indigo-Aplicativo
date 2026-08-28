import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/brand-logo";
import { isValidEmail } from "@/services/auth-store";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

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

  const handleSendEmail = async () => {
    setErrorMessage("");

    if (!email.trim()) {
      return setErrorMessage("Informe o e-mail cadastrado.");
    }
    if (!isValidEmail(email)) {
      return setErrorMessage("Informe um endereço de e-mail válido.");
    }

    setLoading(true);

    try {
      // Simula envio de e-mail de recuperação seguro
      await new Promise((resolve) => setTimeout(resolve, 900));
      setEmailSent(true);
    } catch {
      setErrorMessage("Não foi possível enviar o e-mail de recuperação.");
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
                onPress={() => router.back()}
                activeOpacity={0.7}
                accessibilityLabel="Voltar"
              >
                <Ionicons name="return-up-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <BrandLogo variant="symbol" theme="dark" width={38} height={38} />
            </View>

            {/* Title & Subtitle */}
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>Recuperar Senha</Text>
              <Text style={styles.subTitle}>
                {emailSent
                  ? `Enviamos as instruções de redefinição para ${email}. Verifique sua caixa de entrada e spam.`
                  : "Digite seu e-mail cadastrado para receber o link de redefinição segura de senha."}
              </Text>
            </View>

            {/* Error Banner */}
            {errorMessage.length > 0 && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorCardText}>{errorMessage}</Text>
              </View>
            )}

            {!emailSent ? (
              <View style={styles.formContainer}>
                {/* Email Pill Input */}
                <View style={styles.pillInputWrapper}>
                  <View style={styles.pillIconCircle}>
                    <Ionicons name="mail" size={18} color="#D62828" />
                  </View>
                  <TextInput
                    style={styles.pillTextInput}
                    placeholder="Seu E-mail Cadastrado"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Big Pill Button */}
                <TouchableOpacity
                  style={[styles.primaryPillButton, loading && styles.buttonDisabled]}
                  onPress={handleSendEmail}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryPillButtonText}>Enviar Link de Recuperação</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="mail-open" size={36} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>E-mail Enviado!</Text>
                <Text style={styles.successDesc}>
                  Siga as instruções enviadas para criar uma nova senha de acesso à sua conta.
                </Text>

                <TouchableOpacity
                  style={styles.primaryPillButton}
                  onPress={() => router.replace("/login")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryPillButtonText}>Voltar ao Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Link to Login */}
            {!emailSent && (
              <View style={styles.bottomFooterRow}>
                <Text style={styles.bottomFooterText}>Lembrou da senha? </Text>
                <TouchableOpacity
                  onPress={() => router.replace("/login")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomFooterLink}>Entrar</Text>
                </TouchableOpacity>
              </View>
            )}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
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
    marginBottom: 20,
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
    marginTop: 8,
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
  successCard: {
    backgroundColor: "#121214",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 24,
    alignItems: "center",
    marginTop: 8,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#062817",
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
});
