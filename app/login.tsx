import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

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
              </View>

              {/* BOTÃO PRINCIPAL DE LOGIN */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  onPress={handleLogin}
                  disabled={loading}
                  onPressIn={() => {
                    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(buttonScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
                  }}
                  style={({ pressed, hovered }: any) => [
                    styles.loginButton,
                    hovered && !pressed && styles.loginButtonHovered,
                    pressed && styles.loginButtonPressed,
                    loading && styles.loginButtonLoading,
                  ]}
                >
                  {loading ? (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.loginButtonText}>Entrando...</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginButtonText}>Entrar</Text>
                  )}
                </Pressable>
              </Animated.View>

              {/* ESQUECI MINHA SENHA */}
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => router.push("/forgot-password")}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
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
  loginButton: {
    backgroundColor: "#D90000",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  loginButtonHovered: {
    backgroundColor: "#EB0000",
    shadowColor: "#FF2A2A",
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  loginButtonPressed: {
    backgroundColor: "#990000",
    shadowColor: "#D90000",
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  loginButtonLoading: {
    backgroundColor: "#8A0000",
    shadowOpacity: 0.2,
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
});
