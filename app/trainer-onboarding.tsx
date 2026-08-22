import React, { useState } from "react";
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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { registerTrainerAccount } from "@/services/auth-store";
import { getSubscriptionForUser } from "@/services/subscription-service";

type OnboardingStep = 1 | 2 | 3 | 4;

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const SPECIALTY_OPTIONS = [
  "Hipertrofia & Musculação",
  "Emagrecimento & Definição",
  "Reabilitação & Postura",
  "Treinamento Funcional",
  "Performance Esportiva",
  "Saúde & Longevidade",
];

const SERVICE_TYPES: Array<{
  id: "in_person" | "online" | "both";
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "in_person",
    label: "Presencial",
    sublabel: "Aulas em academias, condomínios ou estúdios",
    icon: "walk-outline",
  },
  {
    id: "online",
    label: "Online",
    sublabel: "Consultoria e prescrição 100% à distância",
    icon: "globe-outline",
  },
  {
    id: "both",
    label: "Presencial + Online",
    sublabel: "Modelo híbrido (aulas presenciais e consultoria remota)",
    icon: "layers-outline",
  },
];

const DAYS_OF_WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DURATION_OPTIONS = [30, 45, 50, 60, 90];

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

function isValidCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean[10], 10);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function TrainerOnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ETAPA 1 - CONTA
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ETAPA 2 - PERFIL PROFISSIONAL
  const [cref, setCref] = useState("");
  const [crefState, setCrefState] = useState("SP");
  const [specialty, setSpecialty] = useState(SPECIALTY_OPTIONS[0]);
  const [city, setCity] = useState("");
  const [attendanceLocation, setAttendanceLocation] = useState("");
  const [instagram, setInstagram] = useState("");
  const [serviceType, setServiceType] = useState<"in_person" | "online" | "both">("both");

  // ETAPA 3 - CONFIGURAÇÃO PROFISSIONAL
  const [approximateStudents, setApproximateStudents] = useState("10");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Seg", "Ter", "Qua", "Qui", "Sex"]);
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("21:00");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(60);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["Hipertrofia", "Emagrecimento"]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      if (selectedGoals.length > 1) {
        setSelectedGoals(selectedGoals.filter((g) => g !== goal));
      }
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  // VALIDAÇÕES POR ETAPA
  const handleNextFromStep1 = () => {
    setErrorMessage("");
    if (!fullName.trim()) return setErrorMessage("Informe seu nome completo.");
    if (!isValidEmail(email)) return setErrorMessage("Informe um e-mail válido.");
    if (!isValidCpf(cpf)) return setErrorMessage("Informe um CPF válido (11 dígitos).");
    if (phone.replace(/\D/g, "").length < 10) return setErrorMessage("Informe um telefone válido.");
    if (!birthDate.trim()) return setErrorMessage("Informe sua data de nascimento.");
    if (password.length < 6) return setErrorMessage("A senha deve conter no mínimo 6 caracteres.");
    if (password !== confirmPassword) return setErrorMessage("As senhas não coincidem.");
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setErrorMessage("");
    if (!cref.trim()) return setErrorMessage("Informe o número do seu CREF.");
    if (!city.trim()) return setErrorMessage("Informe a sua cidade.");
    if (!attendanceLocation.trim()) return setErrorMessage("Informe o local principal de atendimento.");
    setStep(3);
  };

  const handleFinishOnboarding = async () => {
    setErrorMessage("");
    setLoading(true);

    try {
      const session = await registerTrainerAccount({
        name: fullName,
        email,
        cpf,
        phone,
        birthDate,
        cref,
        crefState,
        specialty,
        city,
        attendanceLocation,
        instagram,
        serviceType,
        approximateStudents: parseInt(approximateStudents, 10) || 0,
        workDays: selectedDays,
        startTime,
        endTime,
        sessionDurationMinutes,
        primaryGoals: selectedGoals,
      });

      // Inicializa Plano Free
      await getSubscriptionForUser(session.user.id, session.user.name, session.user.email);

      setStep(4);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao finalizar cadastro.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER & STEP PROGRESS */}
        <View style={styles.header}>
          {step < 4 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step > 1 && step < 4) setStep((s) => (s - 1) as OnboardingStep);
                else router.back();
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <View style={styles.headerCenter}>
            <Image
              source={require("@/assets/images/logotipo-principal.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.stepIndicator}>
              {step === 4 ? "CADASTRO CONCLUÍDO" : `Etapa ${step} de 3`}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* PROGRESS BAR */}
        {step < 4 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF4D4D" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* =========================================================================
              ETAPA 1 — CONTA
          ========================================================================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Crie sua conta profissional</Text>
              <Text style={styles.stepSubtitle}>
                Preencha seus dados de identificação para acessar a plataforma.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nome Completo *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Carlos Eduardo Silva"
                    placeholderTextColor="#555"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>E-mail Profissional *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="carlos@personal.com"
                    placeholderTextColor="#555"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>CPF *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="card-outline" size={18} color="#777" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="000.000.000-00"
                      placeholderTextColor="#555"
                      value={cpf}
                      onChangeText={(v) => setCpf(formatCpf(v))}
                      keyboardType="numeric"
                      maxLength={14}
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>WhatsApp / Tel *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="call-outline" size={18} color="#777" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="(11) 98888-8888"
                      placeholderTextColor="#555"
                      value={phone}
                      onChangeText={(v) => setPhone(formatPhone(v))}
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Data de Nascimento *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="calendar-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="AAAA-MM-DD (Ex: 1992-05-20)"
                    placeholderTextColor="#555"
                    value={birthDate}
                    onChangeText={setBirthDate}
                    maxLength={10}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Senha *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#555"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#777" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirmar Senha *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="checkmark-done-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Digite a mesma senha"
                    placeholderTextColor="#555"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextFromStep1}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Avançar para Perfil</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* =========================================================================
              ETAPA 2 — PERFIL PROFISSIONAL
          ========================================================================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Credenciais & Especialidades</Text>
              <Text style={styles.stepSubtitle}>
                Validação profissional para aumentar a autoridade com seus alunos.
              </Text>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 2, marginRight: 8 }]}>
                  <Text style={styles.label}>Número do CREF *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="ribbon-outline" size={18} color="#777" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 012345-G"
                      placeholderTextColor="#555"
                      value={cref}
                      onChangeText={setCref}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>UF CREF *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[styles.input, { textAlign: "center" }]}
                      value={crefState}
                      onChangeText={(v) => setCrefState(v.toUpperCase().slice(0, 2))}
                      maxLength={2}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Especialidade Principal *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {SPECIALTY_OPTIONS.map((item) => {
                    const active = specialty === item;
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setSpecialty(item)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tipo de Atendimento *</Text>
                <View style={styles.serviceTypeList}>
                  {SERVICE_TYPES.map((type) => {
                    const active = serviceType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[styles.serviceTypeCardRow, active && styles.serviceTypeCardRowActive]}
                        onPress={() => setServiceType(type.id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.serviceTypeIconFrame, active && styles.serviceTypeIconFrameActive]}>
                          <Ionicons name={type.icon} size={22} color={active ? "#D90000" : "#888888"} />
                        </View>
                        <View style={styles.serviceTypeTextBlock}>
                          <Text style={[styles.serviceTypeTitle, active && styles.serviceTypeTitleActive]}>
                            {type.label}
                          </Text>
                          <Text style={styles.serviceTypeSublabel}>
                            {type.sublabel}
                          </Text>
                        </View>
                        <View style={[styles.serviceTypeRadio, active && styles.serviceTypeRadioActive]}>
                          {active && <View style={styles.serviceTypeRadioDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Cidade de Atuação *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="location-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: São Paulo - SP"
                    placeholderTextColor="#555"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Local de Atendimento *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="fitness-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Academia Smart Fit / Studio Próprio / Condomínio"
                    placeholderTextColor="#555"
                    value={attendanceLocation}
                    onChangeText={setAttendanceLocation}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Instagram Profissional (Opcional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="logo-instagram" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="@seuperfil"
                    placeholderTextColor="#555"
                    value={instagram}
                    onChangeText={setInstagram}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextFromStep2}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Avançar para Configuração</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* =========================================================================
              ETAPA 3 — CONFIGURAÇÃO PROFISSIONAL
          ========================================================================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Estrutura de Consultoria</Text>
              <Text style={styles.stepSubtitle}>
                Configure como você atende seus alunos no dia a dia.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Quantidade Aproximada de Alunos Atuais</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="people-outline" size={18} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 12"
                    placeholderTextColor="#555"
                    value={approximateStudents}
                    onChangeText={setApproximateStudents}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Dias de Atendimento</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => {
                    const active = selectedDays.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayPill, active && styles.dayPillActive]}
                        onPress={() => toggleDay(day)}
                      >
                        <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Horário Inicial</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="time-outline" size={18} color="#777" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="06:00"
                      placeholderTextColor="#555"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Horário Final</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="time-outline" size={18} color="#777" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="22:00"
                      placeholderTextColor="#555"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Duração Padrão da Sessão de Treino</Text>
                <View style={styles.durationRow}>
                  {DURATION_OPTIONS.map((min) => {
                    const active = sessionDurationMinutes === min;
                    return (
                      <TouchableOpacity
                        key={min}
                        style={[styles.durationPill, active && styles.durationPillActive]}
                        onPress={() => setSessionDurationMinutes(min)}
                      >
                        <Text style={[styles.durationPillText, active && styles.durationPillTextActive]}>
                          {min} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Principais Objetivos dos Alunos</Text>
                <View style={styles.goalsWrap}>
                  {["Hipertrofia", "Emagrecimento", "Ganho de Força", "Saúde & Postura", "Condicionamento"].map((goal) => {
                    const active = selectedGoals.includes(goal);
                    return (
                      <TouchableOpacity
                        key={goal}
                        style={[styles.goalChip, active && styles.goalChipActive]}
                        onPress={() => toggleGoal(goal)}
                      >
                        <Ionicons
                          name={active ? "checkmark-circle" : "ellipse-outline"}
                          size={15}
                          color={active ? "#FFFFFF" : "#777"}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>{goal}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleFinishOnboarding}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Concluir Cadastro</Text>
                    <Ionicons name="checkmark-circle" size={19} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* =========================================================================
              ETAPA 4 — FINALIZAÇÃO & BOAS-VINDAS
          ========================================================================= */}
          {step === 4 && (
            <View style={styles.step4Card}>
              {/* BADGE HERO DE SUCESSO ELEGANTE */}
              <View style={styles.successBadgeOuter}>
                <View style={styles.successBadgeInner}>
                  <Ionicons name="checkmark-sharp" size={28} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.successTitle}>Seu perfil está pronto.</Text>
              <Text style={styles.successSubtitle}>
                Sua conta profissional foi configurada e seu painel de gestão já está liberado.
              </Text>

              {/* CARD CONSOLIDADO OBSIDIAN LUXE */}
              <View style={styles.freePlanConsolidatedCard}>
                <View style={styles.freePlanHeaderRow}>
                  <View style={styles.freePlanBadge}>
                    <Ionicons name="star" size={11} color="#FF6666" style={{ marginRight: 5 }} />
                    <Text style={styles.freePlanBadgeText}>PLANO GRATUITO ATIVO</Text>
                  </View>
                  <View style={styles.freePlanStudentCap}>
                    <Text style={styles.freePlanStudentCapText}>1 ALUNO INCLUSO</Text>
                  </View>
                </View>

                <Text style={styles.freePlanCardParagraph}>
                  Você pode cadastrar e prescrever para o seu primeiro aluno gratuitamente, com acesso a todos os recursos profissionais da plataforma.
                </Text>

                <View style={styles.cardInternalDivider} />

                <View style={styles.featureHighlightsList}>
                  <View style={styles.featureItemRow}>
                    <View style={styles.featureItemIconBox}>
                      <Ionicons name="person-outline" size={15} color="#D90000" />
                    </View>
                    <View style={styles.featureItemTextCol}>
                      <Text style={styles.featureItemTitle}>1 Aluno Ativo Incluso</Text>
                      <Text style={styles.featureItemDesc}>Sem limite de tempo ou expiração</Text>
                    </View>
                  </View>

                  <View style={styles.featureItemRow}>
                    <View style={styles.featureItemIconBox}>
                      <Ionicons name="clipboard-outline" size={15} color="#D90000" />
                    </View>
                    <View style={styles.featureItemTextCol}>
                      <Text style={styles.featureItemTitle}>Prescrição & Avaliações Físicas</Text>
                      <Text style={styles.featureItemDesc}>Protocolos antropométricos e de esforço</Text>
                    </View>
                  </View>

                  <View style={styles.featureItemRow}>
                    <View style={styles.featureItemIconBox}>
                      <Ionicons name="sparkles-outline" size={15} color="#D90000" />
                    </View>
                    <View style={styles.featureItemTextCol}>
                      <Text style={styles.featureItemTitle}>Assistente IA Integrado</Text>
                      <Text style={styles.featureItemDesc}>Montagem de treinos com Human-in-the-Loop</Text>
                    </View>
                  </View>

                  <View style={styles.featureItemRow}>
                    <View style={styles.featureItemIconBox}>
                      <Ionicons name="card-outline" size={15} color="#D90000" />
                    </View>
                    <View style={styles.featureItemTextCol}>
                      <Text style={styles.featureItemTitle}>Sem Cartão de Crédito</Text>
                      <Text style={styles.featureItemDesc}>Comece imediatamente sem compromisso</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* BOTÃO DE ENTRADA NO PAINEL */}
              <TouchableOpacity
                style={styles.dashboardButton}
                onPress={handleGoToDashboard}
                activeOpacity={0.84}
              >
                <Text style={styles.dashboardButtonText}>IR PARA MEU PAINEL</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 36,
  },
  headerCenter: {
    alignItems: "center",
  },
  logo: {
    width: 110,
    height: 24,
    marginBottom: 4,
  },
  stepIndicator: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: "#161616",
    width: "100%",
  },
  progressBarFill: {
    height: 3,
    backgroundColor: "#D90000",
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    paddingBottom: 30,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
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
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  chipsScroll: {
    flexDirection: "row",
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  chipText: {
    fontSize: 13,
    color: "#888888",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFFFFF",
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
    paddingVertical: 14,
  },
  serviceTypeCardRowActive: {
    backgroundColor: "#1C1414",
    borderColor: "#D90000",
  },
  serviceTypeIconFrame: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceTypeIconFrameActive: {
    backgroundColor: "rgba(217, 0, 0, 0.15)",
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D90000",
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayPill: {
    flex: 1,
    height: 44,
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
    fontSize: 13,
    fontWeight: "700",
  },
  dayPillTextActive: {
    color: "#FFFFFF",
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
  },
  durationPillActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  durationPillText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },
  durationPillTextActive: {
    color: "#FFF",
  },
  goalsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  goalChipActive: {
    backgroundColor: "#1F1111",
    borderColor: "#D90000",
  },
  goalChipText: {
    color: "#777",
    fontSize: 13,
    fontWeight: "600",
  },
  goalChipTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    borderRadius: 10,
    height: 50,
    marginTop: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B1111",
    borderWidth: 1,
    borderColor: "#FF4D4D",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#FF9999",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  // ETAPA 4 STYLES
  step4Card: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
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
    letterSpacing: -0.2,
  },
  successSubtitle: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  freePlanConsolidatedCard: {
    width: "100%",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  freePlanHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  freePlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1111",
    borderWidth: 1,
    borderColor: "#3D1818",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freePlanBadgeText: {
    color: "#FF6666",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  freePlanStudentCap: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2C2C2C",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freePlanStudentCapText: {
    color: "#AAAAAA",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  freePlanCardParagraph: {
    color: "#A0A0A0",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  cardInternalDivider: {
    height: 1,
    backgroundColor: "#202020",
    marginVertical: 14,
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
