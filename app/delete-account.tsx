import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "@/components/brand-logo";
import { useCurrentSession } from "@/hooks/use-current-session";
import { deleteUserAccount, signInWithCredentials } from "@/services/auth-store";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { session } = useCurrentSession();

  const [email, setEmail] = useState(session?.user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleDelete = async () => {
    if (!email.trim()) {
      Alert.alert("Campo Obrigatório", "Informe seu e-mail cadastrado.");
      return;
    }

    if (!session && !password.trim()) {
      Alert.alert("Autenticação Necessária", "Informe sua senha atual para confirmar a titularidade da conta.");
      return;
    }

    if (confirmationPhrase.trim().toUpperCase() !== "EXCLUIR") {
      Alert.alert(
        "Confirmação Necessária",
        "Digite a palavra 'EXCLUIR' no campo de confirmação para autorizar a exclusão definitiva."
      );
      return;
    }

    Alert.alert(
      "Exclusão Definitiva e Irreversível",
      "Todos os seus dados (treinos, avaliações físicas, histórico, fotos e registros) serão apagados permanentemente. Deseja prosseguir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir Minha Conta",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              let userIdToDelete = session?.user?.id;

              // Se não estiver logado, valida a credencial primeiro
              if (!userIdToDelete) {
                const verified = await signInWithCredentials(email, password);
                userIdToDelete = verified.user.id;
              }

              const result = await deleteUserAccount(
                userIdToDelete,
                "Solicitação de exclusão definitiva via canal de privacidade/exclusão de conta."
              );

              setCompleted(true);
              Alert.alert(
                "Conta Excluída",
                result.message,
                [{ text: "OK", onPress: () => router.replace("/login") }]
              );
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Não foi possível excluir a conta.";
              Alert.alert("Falha na Exclusão", msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Exclusão de Conta</Text>
          <Text style={styles.headerSubtitle}>Diretrizes Apple, Google e LGPD</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* BRAND */}
          <View style={styles.brandContainer}>
            <BrandLogo variant="symbol" theme="dark" width={54} height={54} />
            <Text style={styles.brandTitle}>
              DRAGON<Text style={styles.brandRed}>CORP</Text>
            </Text>
          </View>

          {/* AVISO IMPORTANTE */}
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.warningTitle}>Atenção: Ação Definitiva e Irreversível</Text>
            </View>
            <Text style={styles.warningText}>
              Em conformidade com a LGPD (Lei nº 13.709/2018) e as diretrizes da App Store e Google
              Play, ao solicitar a exclusão da sua conta:
            </Text>

            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                • Todos os seus dados pessoais, perfil, CREF, CPF e contatos serão removidos permanentemente.
              </Text>
              <Text style={styles.bulletItem}>
                • Avaliações físicas, fotos corporais, anamneses e fichas de treinos serão eliminadas dos servidores.
              </Text>
              <Text style={styles.bulletItem}>
                • Sessões de acesso em todos os dispositivos serão canceladas imediatamente.
              </Text>
              <Text style={styles.bulletItem}>
                • Caso você possua assinatura ativa (Plano Pro), lembre-se de cancelar a renovação automática no console da App Store (iOS) ou Google Play (Android).
              </Text>
            </View>
          </View>

          {/* FORMULÁRIO DE EXCLUSÃO */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Confirmar Identidade para Exclusão</Text>

            <Text style={styles.inputLabel}>E-mail Cadastrado *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu.email@exemplo.com"
              placeholderTextColor="#555555"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!session}
            />

            {!session && (
              <>
                <Text style={styles.inputLabel}>Senha Atual *</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Sua senha de acesso"
                  placeholderTextColor="#555555"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}

            <Text style={styles.inputLabel}>
              Digite <Text style={styles.boldRed}>EXCLUIR</Text> para autorizar *
            </Text>
            <TextInput
              style={styles.input}
              value={confirmationPhrase}
              onChangeText={setConfirmationPhrase}
              placeholder="EXCLUIR"
              placeholderTextColor="#555555"
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.deleteButton, loading && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.deleteButtonText}>Excluir Minha Conta Definitivamente</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* CONTATO DO DPO / SUPORTE */}
          <View style={styles.supportCard}>
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <Text style={styles.supportText}>
              Dúvidas sobre seus dados ou LGPD? Entre em contato pelo e-mail:{" "}
              <Text style={styles.supportEmail}>suporte@dragoncorp.app</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    marginTop: 8,
  },
  brandRed: {
    color: "#D62828",
  },
  warningCard: {
    backgroundColor: "#200A0A",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },
  warningText: {
    fontSize: 12,
    color: "#D1D5DB",
    lineHeight: 18,
    marginBottom: 10,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 6,
  },
  boldRed: {
    color: "#EF4444",
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#282828",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 14,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B91C1C",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 14,
  },
  supportText: {
    fontSize: 12,
    color: "#888888",
    flex: 1,
    lineHeight: 16,
  },
  supportEmail: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
