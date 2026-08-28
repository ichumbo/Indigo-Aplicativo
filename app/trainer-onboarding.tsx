import React, { useState, useRef } from "react";
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
  Animated,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  createPersonalTrainer,
  calculateTrainerAge,
  isValidCpf,
  isValidEmail,
  isValidCref,
  signInWithGoogle,
  signInWithApple,
} from "@/services/auth-store";
import { formatDateInput } from "@/services/student-profile-store";
import { getSubscriptionForUser } from "@/services/subscription-service";
import { PasswordStrengthMeter, evaluatePasswordStrength } from "@/components/password-strength-meter";
import { UserAvatar } from "@/components/user-avatar";
import { BrandLogo } from "@/components/brand-logo";

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

function formatCpf(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export default function TrainerOnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Professional
  const [cref, setCref] = useState("");
  const [crefState, setCrefState] = useState("SP");
  const [city, setCity] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Legal Acceptance
  const [acceptLegal, setAcceptLegal] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Permita acesso às fotos para escolher sua foto de perfil.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar a imagem da galeria.");
    }
  };

  const handleCreateAccount = async () => {
    setErrorMessage("");

    if (!fullName.trim() || fullName.trim().length < 3) {
      return setErrorMessage("Informe seu nome completo (mínimo 3 caracteres).");
    }
    if (!isValidEmail(email)) {
      return setErrorMessage("Informe um e-mail válido.");
    }
    if (!isValidCpf(cpf)) {
      return setErrorMessage("Informe um CPF válido (11 dígitos).");
    }
    if (phone.replace(/\D/g, "").length < 10) {
      return setErrorMessage("Informe um número de celular/WhatsApp com DDD.");
    }
    if (!birthDate.trim()) {
      return setErrorMessage("Informe sua data de nascimento.");
    }
    const age = calculateTrainerAge(birthDate);
    if (age === null || age < 18) {
      return setErrorMessage("O Personal Trainer deve possuir pelo menos 18 anos de idade.");
    }

    const strength = evaluatePasswordStrength(password, { cpf, phone, email, name: fullName });
    if (!strength.isValid || password.length < 8) {
      return setErrorMessage("A senha deve ser pelo menos média ou forte (mínimo 8 caracteres).");
    }
    if (password !== confirmPassword) {
      return setErrorMessage("As senhas digitadas não coincidem.");
    }
    if (cref.trim() && !isValidCref(cref)) {
      return setErrorMessage("Informe um número de CREF válido (4 a 8 dígitos).");
    }
    if (!acceptLegal) {
      return setErrorMessage("Você deve aceitar os Termos de Uso e a Política de Privacidade para criar a conta.");
    }

    setLoading(true);

    try {
      const { session } = await createPersonalTrainer({
        name: fullName,
        email,
        cpf,
        phone,
        birthDate,
        cref: cref.trim() || "123456",
        crefState,
        specialties: ["Musculação", "Condicionamento Físico"],
        city: city.trim() || "São Paulo",
        avatar: avatarUri || undefined,
        acceptTerms: true,
        acceptPrivacy: true,
        acceptVeracityDeclaration: true,
      });

      // Ativa Plano Free
      await getSubscriptionForUser(session.user.id, session.user.name, session.user.email);

      setStep(3); // Sucesso
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta de personal.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle(
        "simulated_google_token",
        `google_${Date.now()}`,
        email.includes("@") ? email : `user.${Date.now()}@gmail.com`,
        fullName || "Personal Trainer"
      );
      if (result.session) {
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível cadastrar com o Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    setLoading(true);
    try {
      const result = await signInWithApple(
        "simulated_apple_token",
        `apple_${Date.now()}`,
        email.includes("@") ? email : undefined,
        fullName || "Personal Trainer"
      );
      if (result.session) {
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível cadastrar com a Apple.");
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
            {/* Top Navigation Row */}
            <View style={styles.topNavRow}>
              <TouchableOpacity
                style={styles.backIconButton}
                onPress={() => router.replace("/login")}
                activeOpacity={0.7}
                accessibilityLabel="Voltar ao login"
              >
                <Ionicons name="return-up-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <BrandLogo variant="symbol" theme="dark" width={38} height={38} />
            </View>

            {step !== 3 ? (
              <>
                {/* Title & Subtitle */}
                <View style={styles.headerSection}>
                  <Text style={styles.mainTitle}>Create Your Account</Text>
                  <Text style={styles.subTitle}>Construa sua jornada de alta performance!</Text>
                </View>

                {/* Error Banner */}
                {errorMessage.length > 0 && (
                  <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.errorCardText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Avatar Picker (Opcional com Dragão Padrão) */}
                <View style={styles.avatarSectionPill}>
                  <UserAvatar uri={avatarUri} size={64} />
                  <View style={styles.avatarActionInfo}>
                    <Text style={styles.avatarActionTitle}>Foto de Perfil (Opcional)</Text>
                    <Text style={styles.avatarActionDesc}>
                      {avatarUri ? "Foto personalizada" : "Símbolo oficial do dragão como padrão"}
                    </Text>
                    <View style={styles.avatarButtonsRow}>
                      <TouchableOpacity
                        style={styles.avatarPillBtn}
                        onPress={handlePickAvatar}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="image" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.avatarPillBtnText}>
                          {avatarUri ? "Trocar" : "Escolher da galeria"}
                        </Text>
                      </TouchableOpacity>
                      {avatarUri && (
                        <TouchableOpacity
                          style={styles.avatarRemoveBtn}
                          onPress={() => setAvatarUri(null)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.avatarRemoveBtnText}>Remover</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* Form Inputs (Pill-shaped) */}
                <View style={styles.formContainer}>
                  {/* Your Name */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="person" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Nome Completo *"
                      placeholderTextColor="#6B7280"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Your Email */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="mail" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Seu E-mail *"
                      placeholderTextColor="#6B7280"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* CPF */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="card" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="CPF (000.000.000-00) *"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={cpf}
                      onChangeText={(t) => setCpf(formatCpf(t))}
                      maxLength={14}
                    />
                  </View>

                  {/* Celular / WhatsApp */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="call" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Celular com DDD (00) 00000-0000 *"
                      placeholderTextColor="#6B7280"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(t) => setPhone(formatPhone(t))}
                      maxLength={15}
                    />
                  </View>

                  {/* Data de Nascimento */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="calendar" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Data de Nascimento (DD/MM/AAAA) *"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={birthDate}
                      onChangeText={(t) => setBirthDate(formatDateInput(t))}
                      maxLength={10}
                    />
                  </View>

                  {/* CREF (Opcional para Personal) */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="ribbon" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Número do CREF (Ex: 123456)"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={cref}
                      onChangeText={setCref}
                      maxLength={8}
                    />
                  </View>

                  {/* Your Password */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="lock-closed" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Sua Senha (mínimo 8 caracteres) *"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      maxLength={64}
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

                  {/* Password Strength Meter */}
                  <PasswordStrengthMeter
                    password={password}
                    personalData={{ cpf, phone, email, name: fullName }}
                  />

                  {/* Confirm Password */}
                  <View style={styles.pillInputWrapper}>
                    <View style={styles.pillIconCircle}>
                      <Ionicons name="lock-closed" size={18} color="#D62828" />
                    </View>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Confirmar Senha *"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      maxLength={64}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIconButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Terms & Privacy Checkbox */}
                  <TouchableOpacity
                    style={styles.legalCheckboxRow}
                    onPress={() => setAcceptLegal(!acceptLegal)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.customCheckbox, acceptLegal && styles.customCheckboxChecked]}>
                      {acceptLegal && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.legalCheckboxText}>
                      Li e aceito os <Text style={styles.legalAccentLink} onPress={() => router.push("/terms-of-use")}>Termos de Uso</Text> & <Text style={styles.legalAccentLink} onPress={() => router.push("/privacy-policy")}>Política de Privacidade</Text> *
                    </Text>
                  </TouchableOpacity>

                  {/* Big Rounded Pill Sign Up CTA Button */}
                  <TouchableOpacity
                    style={[styles.primaryPillButton, loading && styles.buttonDisabled]}
                    onPress={handleCreateAccount}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryPillButtonText}>Sign Up</Text>
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
                      onPress={handleGoogleSignup}
                      activeOpacity={0.8}
                      accessibilityLabel="Cadastrar com Google"
                    >
                      <Ionicons name="logo-google" size={22} color="#EA4335" />
                    </TouchableOpacity>

                    {/* Apple Button */}
                    <TouchableOpacity
                      style={styles.circularSocialButton}
                      onPress={handleAppleSignup}
                      activeOpacity={0.8}
                      accessibilityLabel="Cadastrar com Apple"
                    >
                      <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Bottom Switch Link: Already have an Account? Sign In */}
                <View style={styles.bottomFooterRow}>
                  <Text style={styles.bottomFooterText}>Already have an Account? </Text>
                  <TouchableOpacity
                    onPress={() => router.replace("/login")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bottomFooterLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Success Card */
              <View style={styles.successWrapperCard}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-sharp" size={42} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Conta Criada com Sucesso!</Text>
                <Text style={styles.successSubtitle}>
                  Bem-vindo à plataforma DragonCorp. Seu plano Free foi ativado e seu acesso profissional está pronto.
                </Text>
                <TouchableOpacity
                  style={styles.primaryPillButton}
                  onPress={() => router.replace("/(tabs)")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryPillButtonText}>Acessar Meu Painel</Text>
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
    marginBottom: 24,
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
    marginBottom: 20,
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
    marginBottom: 16,
  },
  errorCardText: {
    fontSize: 13,
    color: "#EF4444",
    flex: 1,
    fontWeight: "600",
  },
  avatarSectionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141416",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 12,
    marginBottom: 16,
  },
  avatarActionInfo: {
    marginLeft: 14,
    flex: 1,
  },
  avatarActionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarActionDesc: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  avatarButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27272A",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  avatarPillBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarRemoveBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  avatarRemoveBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
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
    marginBottom: 12,
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
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeIconButton: {
    padding: 6,
  },
  legalCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
    paddingHorizontal: 4,
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
    marginRight: 10,
  },
  customCheckboxChecked: {
    backgroundColor: "#D62828",
    borderColor: "#D62828",
  },
  legalCheckboxText: {
    fontSize: 12,
    color: "#9CA3AF",
    flex: 1,
    lineHeight: 18,
  },
  legalAccentLink: {
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
    marginTop: 6,
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
    marginVertical: 20,
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
    marginTop: 26,
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
  successWrapperCard: {
    backgroundColor: "#121214",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#062817",
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
});
