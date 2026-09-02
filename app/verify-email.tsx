import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getCurrentSession,
  getHomeRouteForRole,
  sendEmailVerification,
  verifyEmailWithToken,
  AuthUser,
} from "@/services/auth-store";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    loadUser();
    if (params.token) {
      executeVerification(params.token);
    }
  }, [params.token]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function loadUser() {
    const session = await getCurrentSession();
    if (session?.user) {
      setCurrentUser(session.user);
    }
  }

  async function executeVerification(tokenStr: string) {
    setStatus("verifying");
    setErrorMessage(null);
    try {
      const res = await verifyEmailWithToken(tokenStr);
      setCurrentUser(res.user);
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "Não foi possível confirmar seu e-mail.");
    }
  }

  async function handleResendEmail() {
    if (!currentUser) {
      Alert.alert("Atenção", "Faça login para reenviar o e-mail de confirmação.");
      router.replace("/login");
      return;
    }

    if (cooldown > 0) return;

    setResending(true);
    try {
      const res = await sendEmailVerification(currentUser.id);
      setCooldown(res.cooldownSeconds || 60);
      Alert.alert("E-mail enviado", res.message);
    } catch (err: any) {
      Alert.alert("Falha no reenvio", err?.message || "Tente novamente mais tarde.");
    } finally {
      setResending(false);
    }
  }

  function handleContinue() {
    if (currentUser) {
      const home = getHomeRouteForRole(currentUser.role);
      router.replace(home as any);
    } else {
      router.replace("/login");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/login")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        {status === "verifying" && (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#D90000" style={{ marginBottom: 20 }} />
            <Text style={styles.title}>Confirmando seu e-mail...</Text>
            <Text style={styles.subtitle}>
              Estamos validando seu link de confirmação no servidor.
            </Text>
          </View>
        )}

        {status === "success" && (
          <View style={styles.card}>
            <View style={[styles.iconBadge, { borderColor: "#10B98140", backgroundColor: "#064E3B20" }]}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.title}>E-mail Confirmado!</Text>
            <Text style={styles.subtitle}>
              Sua conta DragonCorp está verificada. Todas as funcionalidades foram liberadas.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Acessar o Aplicativo</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "error" && (
          <View style={styles.card}>
            <View style={[styles.iconBadge, { borderColor: "#EF444440", backgroundColor: "#7F1D1D20" }]}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.title}>Falha na Confirmação</Text>
            <Text style={[styles.subtitle, { color: "#FCA5A5" }]}>
              {errorMessage || "O link é inválido ou já expirou."}
            </Text>

            {currentUser && !currentUser.isEmailVerified && (
              <TouchableOpacity
                style={[styles.primaryButton, (resending || cooldown > 0) && styles.buttonDisabled]}
                onPress={handleResendEmail}
                disabled={resending || cooldown > 0}
                activeOpacity={0.8}
              >
                {resending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {cooldown > 0 ? `Aguarde ${cooldown}s` : "Reenviar e-mail de confirmação"}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace("/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Ir para o Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "idle" && (
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <Ionicons name="mail" size={42} color="#D90000" />
            </View>
            <Text style={styles.title}>Confirme seu E-mail</Text>
            <Text style={styles.subtitle}>
              {currentUser?.email
                ? `Enviamos um link de confirmação para ${currentUser.email}. Toque no link recebido para ativar todos os recursos.`
                : "Acesse o link enviado para sua caixa de entrada para confirmar seu e-mail DragonCorp."}
            </Text>

            {currentUser && !currentUser.isEmailVerified && (
              <TouchableOpacity
                style={[styles.primaryButton, (resending || cooldown > 0) && styles.buttonDisabled]}
                onPress={handleResendEmail}
                disabled={resending || cooldown > 0}
                activeOpacity={0.8}
              >
                {resending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar e-mail de confirmação"}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0A0C",
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#121216",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F1F26",
    padding: 28,
    alignItems: "center",
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1F1A1C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9000033",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  secondaryButtonText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
});
