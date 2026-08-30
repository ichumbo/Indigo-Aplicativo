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
} from "@/services/auth-store";
import { formatDateInput } from "@/services/student-profile-store";
import { getSubscriptionForUser } from "@/services/subscription-service";
import { PasswordStrengthMeter, evaluatePasswordStrength } from "@/components/password-strength-meter";
import { UserAvatar } from "@/components/user-avatar";
import { BrandLogo } from "@/components/brand-logo";
import { AnimatedBackgroundElements } from "@/components/AnimatedBackgroundElements";

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form Fields - Step 1: Dados Pessoais
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Form Fields - Step 2: Atuação Profissional
  const [cref, setCref] = useState("");
  const [crefState, setCrefState] = useState("SP");
  const [city, setCity] = useState("São Paulo");
  const [serviceType, setServiceType] = useState<"PRESENCIAL" | "ONLINE" | "HIBRIDO">("HIBRIDO");
  const [selectedDays, setSelectedDays] = useState<string[]>(["SEG", "TER", "QUA", "QUI", "SEX"]);
  const [selectedDuration, setSelectedDuration] = useState<string>("60 min");

  // Step 3: Aceite legal
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptVeracity, setAcceptVeracity] = useState(false);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Animações de Sucesso (Etapa 4)
  const successBadgeScale = useRef(new Animated.Value(0.4)).current;
  const successRingScale = useRef(new Animated.Value(0.8)).current;
  const successRingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [currentStep, fadeAnim, slideAnim]);

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

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleNextStep1 = () => {
    setErrorMessage("");

    if (!fullName.trim() || fullName.trim().length < 3) {
      return setErrorMessage("Informe seu nome completo (mínimo 3 caracteres).");
    }
    if (!isValidEmail(email)) {
      return setErrorMessage("Informe um endereço de e-mail válido.");
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

    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    setErrorMessage("");

    if (cref.trim() && !isValidCref(cref)) {
      return setErrorMessage("Informe um número de CREF válido (4 a 8 dígitos).");
    }

    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    setErrorMessage("");

    if (!acceptTerms || !acceptPrivacy || !acceptVeracity) {
      return setErrorMessage("Você deve aceitar os Termos de Uso, Política de Privacidade e declarar a veracidade das informações.");
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

      // Ativa Plano Free (1 aluno incluso)
      await getSubscriptionForUser(session.user.id, session.user.name, session.user.email);

      // Avança para a Etapa 4 de comemoração de sucesso
      setCurrentStep(4);

      Animated.parallel([
        Animated.spring(successBadgeScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.timing(successRingOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(successRingScale, { toValue: 1.3, friction: 4, tension: 40, useNativeDriver: true }),
      ]).start();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar cadastro.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* BACKGROUND GEOMÉTRICO ANIMADO EM MOVIMENTO CONTÍNUO */}
      <AnimatedBackgroundElements />

      {/* TOPO CENTRALIZADO COM IDENTIDADE DRAGONCORP */}
      <View style={styles.topHeaderContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (currentStep === 1) router.replace("/login");
              else if (currentStep === 2) setCurrentStep(1);
              else if (currentStep === 3) setCurrentStep(2);
              else router.replace("/(tabs)");
            }}
            activeOpacity={0.7}
            accessibilityLabel="Voltar"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.centerBrand}>
            <BrandLogo variant="full" theme="dark" width={136} height={32} resizeMode="contain" />
          </View>

          <View style={styles.headerRightSpacer} />
        </View>

        {/* BARRAS DE PROGRESSO SEGMENTADAS (3 SEGMENTOS MODERNOS) */}
        <View style={styles.segmentedProgressRow}>
          <View
            style={[
              styles.progressSegment,
              currentStep >= 1 ? styles.progressSegmentActive : styles.progressSegmentInactive,
            ]}
          />
          <View
            style={[
              styles.progressSegment,
              currentStep >= 2 ? styles.progressSegmentActive : styles.progressSegmentInactive,
            ]}
          />
          <View
            style={[
              styles.progressSegment,
              currentStep >= 3 ? styles.progressSegmentActive : styles.progressSegmentInactive,
            ]}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* ERROR BANNER */}
            {errorMessage.length > 0 && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#FF4D4D" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* ========================================================= */}
            {/* ETAPA 1: DADOS PESSOAIS                                   */}
            {/* ========================================================= */}
            {currentStep === 1 && (
              <>
                <Text style={styles.stepTitle}>Identificação Profissional</Text>
                <Text style={styles.stepSubtitle}>
                  Preencha seus dados para criar sua conta de personal trainer no DragonCorp.
                </Text>

                {/* AVATAR DO PERSONAL */}
                <View style={styles.avatarRow}>
                  <UserAvatar uri={avatarUri} size={64} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.avatarLabel}>Foto de Perfil (Opcional)</Text>
                    <Text style={styles.avatarSublabel}>
                      {avatarUri ? "Foto personalizada" : "Dragão Oficial DragonCorp como padrão"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                      <TouchableOpacity
                        style={styles.avatarBtn}
                        onPress={handlePickAvatar}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="image-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.avatarBtnText}>{avatarUri ? "Trocar" : "Escolher da galeria"}</Text>
                      </TouchableOpacity>
                      {avatarUri && (
                        <TouchableOpacity onPress={() => setAvatarUri(null)} style={{ paddingVertical: 4 }}>
                          <Text style={{ color: "#FF4D4D", fontSize: 12, fontWeight: "600" }}>Remover</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* NOME COMPLETO */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Nome Completo *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Carlos Eduardo Silva"
                      placeholderTextColor="#666"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* EMAIL */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>E-mail de Acesso *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="carlos.personal@exemplo.com"
                      placeholderTextColor="#666"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* CPF */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>CPF *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="card-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="000.000.000-00"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={cpf}
                      onChangeText={(t) => setCpf(formatCpf(t))}
                      maxLength={14}
                    />
                  </View>
                </View>

                {/* CELULAR */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Celular / WhatsApp *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="call-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="(11) 90000-0000"
                      placeholderTextColor="#666"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(t) => setPhone(formatPhone(t))}
                      maxLength={15}
                    />
                  </View>
                </View>

                {/* DATA DE NASCIMENTO */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Data de Nascimento (mínimo 18 anos) *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="calendar-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={birthDate}
                      onChangeText={(t) => setBirthDate(formatDateInput(t))}
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* SENHA */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Senha de Acesso (mínimo 8 caracteres) *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Crie sua senha segura"
                      placeholderTextColor="#666"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      maxLength={64}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* MEDIDOR DE FORÇA DE SENHA */}
                <PasswordStrengthMeter
                  password={password}
                  personalData={{ cpf, phone, email, name: fullName }}
                />

                {/* CONFIRMAR SENHA */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Confirmar Senha *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Repita sua senha"
                      placeholderTextColor="#666"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      maxLength={64}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleNextStep1}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>Avançar para Atuação Profissional</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </>
            )}

            {/* ========================================================= */}
            {/* ETAPA 2: ATUAÇÃO PROFISSIONAL                             */}
            {/* ========================================================= */}
            {currentStep === 2 && (
              <>
                <Text style={styles.stepTitle}>Atuação Profissional</Text>
                <Text style={styles.stepSubtitle}>
                  Configure suas credenciais profissionais e preferências de atendimento aos alunos.
                </Text>

                {/* CREF */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Número do CREF (Opcional)</Text>
                  <View style={styles.row}>
                    <View style={[styles.inputWrap, { flex: 1, marginRight: 10 }]}>
                      <Ionicons name="ribbon-outline" size={18} color="#D90000" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: 123456"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={cref}
                        onChangeText={setCref}
                        maxLength={8}
                      />
                    </View>
                    <View style={[styles.inputWrap, { width: 90 }]}>
                      <TextInput
                        style={[styles.input, { textAlign: "center" }]}
                        placeholder="UF"
                        placeholderTextColor="#666"
                        value={crefState}
                        onChangeText={(t) => setCrefState(t.toUpperCase().slice(0, 2))}
                        autoCapitalize="characters"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>

                {/* CIDADE */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Cidade Base</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="location-outline" size={18} color="#D90000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: São Paulo"
                      placeholderTextColor="#666"
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                </View>

                {/* TIPO DE CONSULTORIA */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Modelo de Atendimento Principal</Text>
                  <View style={styles.serviceTypeList}>
                    {[
                      { id: "HIBRIDO", title: "Híbrido", sub: "Presencial na academia e consultoria online integrada" },
                      { id: "PRESENCIAL", title: "Presencial Exclusivo", sub: "Atendimento presencial com fichas digitais" },
                      { id: "ONLINE", title: "Consultoria Online", sub: "Prescrição e acompanhamento 100% à distância" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.serviceTypeCardRow,
                          serviceType === item.id && styles.serviceTypeCardRowActive,
                        ]}
                        onPress={() => setServiceType(item.id as never)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.serviceTypeTextBlock}>
                          <Text
                            style={[
                              styles.serviceTypeTitle,
                              serviceType === item.id && styles.serviceTypeTitleActive,
                            ]}
                          >
                            {item.title}
                          </Text>
                          <Text style={styles.serviceTypeSublabel}>{item.sub}</Text>
                        </View>
                        <View
                          style={[
                            styles.serviceTypeRadio,
                            serviceType === item.id && styles.serviceTypeRadioActive,
                          ]}
                        >
                          {serviceType === item.id && <View style={styles.serviceTypeRadioDot} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* DIAS DE ATENDIMENTO */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Dias da Semana que Atende</Text>
                  <View style={styles.daysRow}>
                    {["SEG", "TER", "QUA", "QUI", "SEX", "SAB"].map((day) => {
                      const active = selectedDays.includes(day);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayPill, active && styles.dayPillActive]}
                          onPress={() => toggleDay(day)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleNextStep2}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>Avançar para Ativação do Plano</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </>
            )}

            {/* ========================================================= */}
            {/* ETAPA 3: ACEITE LEGAL & ATIVAÇÃO                          */}
            {/* ========================================================= */}
            {currentStep === 3 && (
              <>
                <Text style={styles.stepTitle}>Ativação & Termos de Uso</Text>
                <Text style={styles.stepSubtitle}>
                  Seu cadastro libera automaticamente o Plano FREE da DragonCorp para prescrever treinos completos.
                </Text>

                {/* CARTÃO CONSOLIDADO PLANO FREE */}
                <View style={styles.freePlanConsolidatedCard}>
                  <View style={styles.freePlanHeaderRow}>
                    <View style={styles.freePlanBadge}>
                      <Ionicons name="sparkles" size={13} color="#FF6666" style={{ marginRight: 4 }} />
                      <Text style={styles.freePlanBadgeText}>PLANO FREE INCLUSO</Text>
                    </View>
                    <View style={styles.freePlanStudentCap}>
                      <Text style={styles.freePlanStudentCapText}>1 Aluno Ativo Grátis</Text>
                    </View>
                  </View>
                  <Text style={styles.freePlanCardParagraph}>
                    Como Personal Trainer, você pode criar e prescrever treinos completos, avaliações físicas e acompanhar seu primeiro aluno sem nenhum custo.
                  </Text>
                </View>

                {/* ACEITES LEGAIS */}
                <TouchableOpacity
                  style={styles.checkboxRowItem}
                  onPress={() => setAcceptTerms(!acceptTerms)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={acceptTerms ? "checkbox" : "square-outline"}
                    size={20}
                    color="#D90000"
                  />
                  <Text style={styles.checkboxTextItem}>
                    Li e concordo com os <Text style={styles.linkUnderline} onPress={() => router.push("/terms-of-use")}>Termos de Uso</Text> *
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRowItem}
                  onPress={() => setAcceptPrivacy(!acceptPrivacy)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={acceptPrivacy ? "checkbox" : "square-outline"}
                    size={20}
                    color="#D90000"
                  />
                  <Text style={styles.checkboxTextItem}>
                    Li e aceito a <Text style={styles.linkUnderline} onPress={() => router.push("/privacy-policy")}>Política de Privacidade (LGPD)</Text> *
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRowItem}
                  onPress={() => setAcceptVeracity(!acceptVeracity)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={acceptVeracity ? "checkbox" : "square-outline"}
                    size={20}
                    color="#D90000"
                  />
                  <Text style={styles.checkboxTextItem}>
                    Declaro que as informações fornecidas são verdadeiras e estou apto a atuar profissionalmente. *
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleFinalSubmit}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-sharp" size={18} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryButtonText}>Concluir Cadastro e Ativar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ========================================================= */}
            {/* ETAPA 4: EFEITO DE CELEBRAÇÃO / SUCESSO AO CADASTRAR      */}
            {/* ========================================================= */}
            {currentStep === 4 && (
              <View style={styles.step4Card}>
                <Animated.View
                  style={[
                    styles.successBadgeOuter,
                    { transform: [{ scale: successBadgeScale }] },
                  ]}
                >
                  <View style={styles.successBadgeInner}>
                    <Ionicons name="checkmark-sharp" size={32} color="#FFFFFF" />
                  </View>
                </Animated.View>

                <Text style={styles.successTitle}>Conta Criada com Sucesso!</Text>
                <Text style={styles.successSubtitle}>
                  Bem-vindo à DragonCorp, <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{fullName}</Text>. Seu Plano Free já está ativo e você já pode prescrever treinos e cadastrar seu primeiro aluno!
                </Text>

                <View style={styles.freePlanConsolidatedCard}>
                  <View style={styles.featureHighlightsList}>
                    <View style={styles.featureItemRow}>
                      <View style={styles.featureItemIconBox}>
                        <Ionicons name="barbell-outline" size={16} color="#D90000" />
                      </View>
                      <View style={styles.featureItemTextCol}>
                        <Text style={styles.featureItemTitle}>Prescrição Completa</Text>
                        <Text style={styles.featureItemDesc}>Catálogo de exercícios e vídeos do YouTube</Text>
                      </View>
                    </View>

                    <View style={styles.featureItemRow}>
                      <View style={styles.featureItemIconBox}>
                        <Ionicons name="analytics-outline" size={16} color="#D90000" />
                      </View>
                      <View style={styles.featureItemTextCol}>
                        <Text style={styles.featureItemTitle}>Avaliações Físicas</Text>
                        <Text style={styles.featureItemDesc}>Dobras cutâneas, bioimpedância e relatórios em PDF</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.dashboardButton}
                  onPress={() => router.replace("/(tabs)")}
                  activeOpacity={0.88}
                >
                  <Text style={styles.dashboardButtonText}>Acessar Meu Painel</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
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
    backgroundColor: "#0F0F0F",
  },
  topHeaderContainer: {
    backgroundColor: "transparent",
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  centerBrand: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightSpacer: {
    width: 38,
    height: 38,
  },
  segmentedProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: "#D90000",
  },
  progressSegmentInactive: {
    backgroundColor: "#222222",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexGrow: 1,
  },
  stepContainer: {
    paddingBottom: 30,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 20,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    marginBottom: 18,
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarSublabel: {
    fontSize: 11,
    color: "#888",
  },
  avatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  avatarBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#CCCCCC",
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceTypeList: {
    gap: 10,
  },
  serviceTypeCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1.5,
    borderColor: "#242424",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  serviceTypeCardRowActive: {
    backgroundColor: "#1C1414",
    borderColor: "#D90000",
  },
  serviceTypeTextBlock: {
    flex: 1,
  },
  serviceTypeTitle: {
    fontSize: 14,
    color: "#BBBBBB",
    fontWeight: "700",
    marginBottom: 2,
  },
  serviceTypeTitleActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  serviceTypeSublabel: {
    fontSize: 11,
    color: "#777777",
    lineHeight: 15,
  },
  serviceTypeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#444444",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  serviceTypeRadioActive: {
    borderColor: "#D90000",
  },
  serviceTypeRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D90000",
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayPill: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  dayPillText: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "700",
  },
  dayPillTextActive: {
    color: "#FFFFFF",
  },
  freePlanConsolidatedCard: {
    width: "100%",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  freePlanHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  freePlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1111",
    borderWidth: 1,
    borderColor: "#3D1818",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freePlanBadgeText: {
    color: "#FF6666",
    fontSize: 11,
    fontWeight: "800",
  },
  freePlanStudentCap: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2C2C2C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freePlanStudentCapText: {
    color: "#AAAAAA",
    fontSize: 10,
    fontWeight: "700",
  },
  freePlanCardParagraph: {
    color: "#A0A0A0",
    fontSize: 12.5,
    lineHeight: 18,
  },
  checkboxRowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  checkboxTextItem: {
    color: "#888888",
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  linkUnderline: {
    color: "#D90000",
    fontWeight: "700",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    borderRadius: 12,
    height: 50,
    marginTop: 14,
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B1111",
    borderWidth: 1,
    borderColor: "#FF4D4D",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#FF9999",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  step4Card: {
    alignItems: "center",
    paddingVertical: 10,
  },
  successBadgeOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(217, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successBadgeInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  featureHighlightsList: {
    gap: 12,
  },
  featureItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureItemTextCol: {
    flex: 1,
  },
  featureItemTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  featureItemDesc: {
    color: "#777777",
    fontSize: 11,
    lineHeight: 15,
  },
  dashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    borderRadius: 12,
    height: 52,
    width: "100%",
  },
  dashboardButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
