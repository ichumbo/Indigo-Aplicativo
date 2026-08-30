import React, { useState, useRef, useEffect } from "react";
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(translateYAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

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

              if (!userIdToDelete) {
                const verified = await signInWithCredentials(email, password);
                userIdToDelete = verified.user.id;
              }

              const result = await deleteUserAccount(
                userIdToDelete,
                "Solicitação de exclusão definitiva via canal de privacidade/exclusão de conta."
              );

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="return-up-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Exclusão de Conta</Text>
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
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            }}
          >
            {/* BRAND SYMBOL */}
            <View style={styles.brandContainer}>
              <BrandLogo variant="symbol" theme="dark" width={48} height={48} />
              <Text style={styles.brandTitle}>
                DRAGON<Text style={styles.brandRed}>CORP</Text>
              </Text>
            </View>

            {/* AVISO IMPORTANTE */}
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning-outline" size={19} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.warningTitle}>Atenção: Ação Irreversível</Text>
              </View>
              <Text style={styles.warningText}>
                Em conformidade com a LGPD e as diretrizes da App Store e Google Play, ao solicitar a exclusão da sua conta:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Seus dados pessoais, perfil, CREF e contatos serão removidos permanentemente.</Text>
                <Text style={styles.bulletItem}>• Avaliações físicas, fotos, anamneses e fichas de treinos serão eliminadas dos servidores.</Text>
                <Text style={styles.bulletItem}>• Sessões de acesso em todos os dispositivos serão canceladas imediatamente.</Text>
              </View>
            </View>

            {/* FORMULÁRIO DE EXCLUSÃO */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Confirmar Identidade</Text>

              {/* E-mail */}
              <View
                style={[
                  styles.pillInput,
                  session ? styles.pillInputDisabled : (focusedField === "email" && styles.pillInputFocused),
                ]}
              >
                <View style={styles.pillIconWrap}>
                  <Ionicons name="mail" size={16} color={session ? "#52525B" : (focusedField === "email" ? "#D62828" : "#9CA3AF")} />
                </View>
                <TextInput
                  style={[styles.textInput, session && { color: "#71717A" }]}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Seu e-mail cadastrado"
                  placeholderTextColor="#52525B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!session}
                />
              </View>

              {/* Senha se não autenticado */}
              {!session && (
                <View
                  style={[
                    styles.pillInput,
                    focusedField === "password" && styles.pillInputFocused,
                  ]}
                >
                  <View style={styles.pillIconWrap}>
                    <Ionicons name="lock-closed" size={16} color={focusedField === "password" ? "#D62828" : "#9CA3AF"} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Sua senha atual *"
                    placeholderTextColor="#52525B"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Frase de Confirmação */}
              <Text style={styles.confirmInstruction}>
                Digite <Text style={styles.boldRed}>EXCLUIR</Text> abaixo para autorizar:
              </Text>
              <View
                style={[
                  styles.pillInput,
                  focusedField === "phrase" && styles.pillInputFocused,
                ]}
              >
                <View style={styles.pillIconWrap}>
                  <Ionicons name="alert" size={16} color="#EF4444" />
                </View>
                <TextInput
                  style={[styles.textInput, { fontWeight: "700", letterSpacing: 2 }]}
                  value={confirmationPhrase}
                  onChangeText={setConfirmationPhrase}
                  onFocus={() => setFocusedField("phrase")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="EXCLUIR"
                  placeholderTextColor="#52525B"
                  autoCapitalize="characters"
                />
              </View>

              {/* Botão de Exclusão */}
              <TouchableOpacity
                style={[styles.deleteButton, loading && { opacity: 0.6 }]}
                onPress={handleDelete}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteButtonText}>Excluir Minha Conta Definitivamente</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* SUPORTE DPO */}
            <View style={styles.supportRow}>
              <Ionicons name="mail-outline" size={16} color="#71717A" style={{ marginRight: 6 }} />
              <Text style={styles.supportText}>Dúvidas sobre privacidade: privacidade@dragoncorp.app</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#141417",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111114",
    borderWidth: 1,
    borderColor: "#1F1F24",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    marginTop: 8,
  },
  brandRed: {
    color: "#D62828",
  },
  warningCard: {
    backgroundColor: "#160808",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3D1414",
    padding: 18,
    marginBottom: 18,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EF4444",
  },
  warningText: {
    fontSize: 12,
    color: "#D1D5DB",
    lineHeight: 17,
    marginBottom: 10,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 11.5,
    color: "#9CA3AF",
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: "#101013",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#202025",
    padding: 18,
    marginBottom: 20,
  },
  formTitle: {
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
    marginBottom: 12,
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
  confirmInstruction: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  boldRed: {
    color: "#EF4444",
    fontWeight: "800",
  },
  deleteButton: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  supportText: {
    fontSize: 12,
    color: "#71717A",
  },
});
