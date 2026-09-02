import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getPasswordStrength,
  resetPasswordWithToken,
  validatePasswordResetToken,
} from "@/services/auth-store";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token || "");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [associatedEmail, setAssociatedEmail] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  useEffect(() => {
    if (params.token) {
      setToken(params.token);
      verifyToken(params.token);
    }
  }, [params.token]);

  async function verifyToken(t: string) {
    if (!t.trim()) return;
    setCheckingToken(true);
    setTokenError(null);
    try {
      const res = await validatePasswordResetToken(t.trim());
      setTokenValid(res.valid);
      if (res.valid && res.email) {
        setAssociatedEmail(res.email);
      } else {
        setTokenError(res.reason || "Link de redefinição inválido ou expirado.");
      }
    } catch (err: any) {
      setTokenValid(false);
      setTokenError(err?.message || "Não foi possível validar o link.");
    } finally {
      setCheckingToken(false);
    }
  }

  async function handleResetPassword() {
    if (!token.trim()) {
      Alert.alert("Atenção", "Informe o token de redefinição recebido por e-mail.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Senha muito curta", "A nova senha deve possuir no mínimo 8 caracteres.");
      return;
    }

    if (strength.label === "Muito Fraca") {
      Alert.alert(
        "Senha fraca",
        "Para sua segurança, inclua letras maiúsculas, números e caracteres especiais."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithToken(token.trim(), newPassword);
      setSuccess(true);
      Alert.alert("Sucesso", res.message, [
        {
          text: "Ir para o Login",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Erro ao redefinir", err?.message || "Não foi possível salvar a nova senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/login")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Voltar ao Login</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Ionicons name="lock-closed" size={32} color="#D90000" />
            </View>
            <Text style={styles.title}>Redefinir Senha</Text>
            <Text style={styles.subtitle}>
              Crie uma nova senha segura para acessar sua conta DragonCorp.
            </Text>
          </View>

          {associatedEmail && (
            <View style={styles.emailBadge}>
              <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
              <Text style={styles.emailBadgeText}>Conta: {associatedEmail}</Text>
            </View>
          )}

          {tokenError && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{tokenError}</Text>
            </View>
          )}

          <View style={styles.formCard}>
            {!params.token && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Token de Recuperação</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Cole o código recebido no e-mail"
                    placeholderTextColor="#6B7280"
                    value={token}
                    onChangeText={setToken}
                    onBlur={() => verifyToken(token)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {checkingToken && (
                    <ActivityIndicator size="small" color="#D90000" style={{ marginRight: 12 }} />
                  )}
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nova Senha</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo de 8 caracteres"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBackground}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: `${Math.min(strength.score, 100)}%`,
                          backgroundColor:
                            strength.score >= 80
                              ? "#10B981"
                              : strength.score >= 60
                              ? "#3B82F6"
                              : strength.score >= 40
                              ? "#F59E0B"
                              : "#EF4444",
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.strengthLabel,
                      {
                        color:
                          strength.score >= 80
                            ? "#10B981"
                            : strength.score >= 60
                            ? "#3B82F6"
                            : strength.score >= 40
                            ? "#F59E0B"
                            : "#EF4444",
                      },
                    ]}
                  >
                    Força da senha: {strength.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="checkmark-done-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repita a nova senha"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || success || (tokenValid === false)) && styles.submitButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={loading || success || tokenValid === false}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Salvar Nova Senha</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0A0C",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1F1A1C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9000033",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#17171C",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2D2D35",
  },
  emailBadgeText: {
    color: "#D1D5DB",
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "500",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B1113",
    borderWidth: 1,
    borderColor: "#EF444440",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  formCard: {
    backgroundColor: "#121216",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F1F26",
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D1D5DB",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A20",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D2D38",
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  eyeIcon: {
    padding: 12,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBarBackground: {
    height: 4,
    backgroundColor: "#272730",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
