import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BrandLogo } from "@/components/brand-logo";
import { AnimatedBackgroundElements } from "@/components/AnimatedBackgroundElements";
import { isValidEmail, requestPasswordReset } from "@/services/auth-store";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(25)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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

  const handleSendEmail = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      return;
    }

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setEmailSent(true);
    } catch (err: any) {
      Alert.alert("Atenção", err?.message || "Não foi possível solicitar a redefinição de senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

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
              <BrandLogo variant="full" theme="dark" width={180} height={44} style={styles.logo} />
              <Text style={styles.title}>Esqueceu sua</Text>
              <Text style={styles.subtitle}>Senha?</Text>
              <Text style={styles.info}>
                {emailSent
                  ? `Enviamos um link de recuperação para ${email}. Verifique sua caixa de entrada e spam.`
                  : "Digite seu email e enviaremos um link para redefinir sua senha"}
              </Text>
            </Animated.View>

            {!emailSent ? (
              <Animated.View
                style={[
                  styles.form,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: formAnim }],
                  },
                ]}
              >
                <View style={styles.inputContainer}>
                  <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#D90000"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Digite seu email"
                      placeholderTextColor="#888"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[styles.sendButton, (loading || !email) && styles.sendButtonDisabled]}
                    onPress={handleSendEmail}
                    disabled={loading || !email}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.sendButtonText}>Enviar Link</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#D90000" />
                </View>
                <Text style={[styles.subtitle, { textAlign: "center", marginBottom: 20 }]}>
                  Enviamos as instruções para o seu e-mail. Verifique sua caixa de entrada e spam.
                </Text>
                <TouchableOpacity
                  style={[styles.sendButton, { marginBottom: 12 }]}
                  onPress={() => router.push("/reset-password" as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sendButtonText}>Digitar Código / Nova Senha</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={handleBackToLogin}
                  activeOpacity={0.85}
                >
                  <Text style={styles.backToLoginText}>Voltar ao Login</Text>
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
    paddingVertical: 20,
  },
  content: {
    width: "100%",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 24,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  header: {
    marginBottom: 36,
    alignItems: "flex-start",
  },
  logo: {
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  title: {
    color: "#ECEDEE",
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: "#D90000",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
  },
  info: {
    color: "#8a8a8a",
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputWrapper: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    minHeight: 56,
    backgroundColor: "#1c1c1c",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputFocused: {
    borderColor: "#D90000",
    shadowColor: "#D90000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#ECEDEE",
    fontSize: 15,
    paddingVertical: 14,
  },
  sendButton: {
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
  sendButtonDisabled: {
    backgroundColor: "#555",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  successContainer: {
    alignItems: "center",
    gap: 28,
  },
  successIcon: {
    marginBottom: 8,
  },
  backToLoginButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#D90000",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backToLoginText: {
    color: "#D90000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
