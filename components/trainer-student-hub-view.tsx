import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  StudentProfile,
  StudentRegistration,
  StudentStatus,
  calculateAge,
  formatDateInput,
} from "@/services/student-profile-store";

export type TrainerStudentHubViewProps = {
  profile: StudentProfile;
  saving?: boolean;
  onBack: () => void;
  onSaveRegistration: (draft: StudentRegistration, status: StudentStatus) => Promise<void>;
  onNavigateToDiet: () => void;
  onNavigateToAnamnesis: () => void;
  onNavigateToAssessments: () => void;
  onNavigateToWorkouts: () => void;
  onNavigateToLoads: () => void;
  onShareAccessLink: () => void;
  onDeleteStudent: () => void;
  children?: React.ReactNode;
};

export function TrainerStudentHubView({
  profile,
  saving = false,
  onBack,
  onSaveRegistration,
  onNavigateToDiet,
  onNavigateToAnamnesis,
  onNavigateToAssessments,
  onNavigateToWorkouts,
  onNavigateToLoads,
  onShareAccessLink,
  onDeleteStudent,
  children,
}: TrainerStudentHubViewProps) {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top + 6 : (Platform.OS === "ios" ? 48 : 16);

  const [fullName, setFullName] = useState(profile.registration.fullName || "");
  const [birthDate, setBirthDate] = useState(formatDateInput(profile.registration.birthDate || ""));
  const [age, setAge] = useState(
    profile.registration.birthDate
      ? String(calculateAge(profile.registration.birthDate) || "")
      : ""
  );
  const [gender, setGender] = useState<"male" | "female" | "not_informed">(
    profile.registration.gender || "male"
  );
  const [whatsapp, setWhatsapp] = useState(
    profile.registration.contact.whatsapp || profile.registration.contact.phone || ""
  );
  const [email, setEmail] = useState(profile.registration.contact.email || "");
  const [avatar, setAvatar] = useState(profile.registration.avatar || "");
  const [isActive, setIsActive] = useState(profile.status === "ativo");
  const [, setHasChanges] = useState(false);

  useEffect(() => {
    setFullName(profile.registration.fullName || "");
    setBirthDate(formatDateInput(profile.registration.birthDate || ""));
    setAge(
      profile.registration.birthDate
        ? String(calculateAge(profile.registration.birthDate) || "")
        : ""
    );
    setGender(profile.registration.gender || "male");
    setWhatsapp(profile.registration.contact.whatsapp || profile.registration.contact.phone || "");
    setEmail(profile.registration.contact.email || "");
    setAvatar(profile.registration.avatar || "");
    setIsActive(profile.status === "ativo");
    setHasChanges(false);
  }, [profile]);

  const handleBirthDateChange = (val: string) => {
    const formatted = formatDateInput(val);
    setBirthDate(formatted);
    setHasChanges(true);
    const calculated = calculateAge(formatted);
    if (calculated !== null && calculated > 0) {
      setAge(String(calculated));
    }
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão Necessária", "Permita acesso às fotos para alterar a imagem do aluno.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setAvatar(result.assets[0].uri);
        setHasChanges(true);
      }
    } catch (err) {
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Campo Obrigatório", "Informe o nome completo do aluno.");
      return;
    }

    const updatedDraft: StudentRegistration = {
      ...profile.registration,
      fullName: fullName.trim(),
      birthDate: birthDate.trim(),
      gender,
      avatar: avatar || undefined,
      contact: {
        ...profile.registration.contact,
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        phone: whatsapp.trim(),
      },
    };

    const updatedStatus: StudentStatus = isActive ? "ativo" : "inativo";
    await onSaveRegistration(updatedDraft, updatedStatus);
    setHasChanges(false);
  };

  const toggleGender = () => {
    setGender((prev) => (prev === "male" ? "female" : "male"));
    setHasChanges(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: topInset }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.8}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#D90000" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle} numberOfLines={1}>
          Perfil do Aluno
        </Text>

        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          hitSlop={8}
        >
          <Ionicons name="checkmark" size={20} color="#D90000" />
        </TouchableOpacity>
      </View>

      {/* FORM CARD: AVATAR & BASIC DETAILS */}
      <View style={styles.formCard}>
        {/* ROW 1: AVATAR (LEFT) + NOME & NASCIMENTO (RIGHT) */}
        <View style={styles.avatarFormRow}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={38} color="#555" />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.avatarRightFields}>
            {/* Nome Completo */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Nome Completo</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={15} color="#777777" />
                <TextInput
                  style={styles.inputBox}
                  value={fullName}
                  onChangeText={(val) => {
                    setFullName(val);
                    setHasChanges(true);
                  }}
                  placeholder="Nome do Aluno"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* Data de Nascimento */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Data de Nascimento</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={15} color="#777777" />
                <TextInput
                  style={styles.inputBox}
                  value={birthDate}
                  onChangeText={handleBirthDateChange}
                  placeholder="00/00/0000"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ROW 2: IDADE & SEXO (2 COLUMNS) */}
        <View style={styles.twoColRow}>
          <View style={styles.ageCol}>
            <Text style={styles.fieldLabel}>Idade</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="time-outline" size={15} color="#777777" />
              <TextInput
                style={styles.inputBox}
                value={age}
                onChangeText={(val) => {
                  setAge(val);
                  setHasChanges(true);
                }}
                placeholder="Ex: 30"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.genderCol}>
            <Text style={styles.fieldLabel}>Sexo</Text>
            <TouchableOpacity
              style={styles.genderSelector}
              onPress={toggleGender}
              activeOpacity={0.8}
            >
              <View style={styles.genderLeft}>
                <Ionicons name="male-female-outline" size={15} color="#777777" />
                <Text style={styles.genderText}>
                  {gender === "male" ? "Masculino" : gender === "female" ? "Feminino" : "Não informado"}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={16} color="#777777" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ROW 3: WHATSAPP */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>WhatsApp</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="logo-whatsapp" size={15} color="#4CAF50" />
            <TextInput
              style={styles.inputBox}
              value={whatsapp}
              onChangeText={(val) => {
                setWhatsapp(val);
                setHasChanges(true);
              }}
              placeholder="(11) 98765-4321"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* ROW 4: EMAIL */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={15} color="#777777" />
            <TextInput
              style={styles.inputBox}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                setHasChanges(true);
              }}
              placeholder="email@dominio.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* ROW 5: STATUS SWITCH */}
        <View style={styles.statusRow}>
          <View style={styles.statusLabelContainer}>
            <Text style={styles.statusLabel}>Status do Aluno:</Text>
            <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillInactive]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? "#22C55E" : "#888888" }]} />
              <Text style={[styles.statusPillText, { color: isActive ? "#FFFFFF" : "#888888" }]}>
                {isActive ? "Ativo" : "Inativo"}
              </Text>
            </View>
          </View>
          <Switch
            value={isActive}
            onValueChange={(val) => {
              setIsActive(val);
              setHasChanges(true);
            }}
            trackColor={{ false: "#262626", true: "#D90000" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 4-ICON QUICK NAVIGATION HUB (DIETA, ANAMNESE, AVALIAÇÕES, TREINOS) */}
      <View style={styles.hubGrid}>
        {/* Dieta */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToDiet}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconContainer}>
            <Ionicons name="restaurant-outline" size={20} color="#D90000" />
          </View>
          <Text style={styles.hubCardLabel}>Dieta</Text>
        </TouchableOpacity>

        {/* Anamnese */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToAnamnesis}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconContainer}>
            <Ionicons name="document-text-outline" size={20} color="#D90000" />
          </View>
          <Text style={styles.hubCardLabel}>Anamnese</Text>
        </TouchableOpacity>

        {/* Avaliações */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToAssessments}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconContainer}>
            <Ionicons name="flash-outline" size={20} color="#D90000" />
          </View>
          <Text style={styles.hubCardLabel}>Avaliações</Text>
        </TouchableOpacity>

        {/* Treinos */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToWorkouts}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconContainer}>
            <Ionicons name="barbell-outline" size={20} color="#D90000" />
          </View>
          <Text style={styles.hubCardLabel}>Treinos</Text>
        </TouchableOpacity>
      </View>

      {/* EVOLUÇÃO DE CARGAS ACTION BUTTON */}
      <TouchableOpacity
        style={styles.loadsEvolutionButton}
        onPress={onNavigateToLoads}
        activeOpacity={0.85}
      >
        <View style={styles.loadsIconContainer}>
          <Ionicons name="trending-up-outline" size={18} color="#D90000" />
        </View>
        <Text style={styles.loadsEvolutionText}>Evolução de Cargas</Text>
        <Ionicons name="chevron-forward" size={16} color="#666666" style={{ marginLeft: "auto" }} />
      </TouchableOpacity>

      {/* PRIMARY LINK DE ACESSO BUTTON */}
      <TouchableOpacity
        style={styles.primaryAccessLinkBtn}
        onPress={onShareAccessLink}
        activeOpacity={0.85}
      >
        <Ionicons name="share-social" size={18} color="#FFFFFF" />
        <Text style={styles.primaryAccessLinkText}>Link de Acesso</Text>
      </TouchableOpacity>

      {/* EXCLUIR ALUNO BUTTON */}
      <TouchableOpacity
        style={styles.deleteStudentBtn}
        onPress={onDeleteStudent}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={16} color="#E53935" />
        <Text style={styles.deleteStudentText}>Excluir aluno</Text>
      </TouchableOpacity>

      {/* ADDITIONAL ACCORDIONS / DETAILED SECTIONS */}
      {children && <View style={styles.accordionContainer}>{children}</View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },

  /* Top Bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: "#D90000",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Form Card */
  formCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 15,
    marginBottom: 16,
    gap: 12,
  },
  avatarFormRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatarContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#1C1C1C",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#D90000",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#141414",
  },
  avatarRightFields: {
    flex: 1,
    gap: 10,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  inputContainer: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    height: 42,
    gap: 8,
  },
  inputBox: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
    paddingVertical: 0,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  ageCol: {
    width: 90,
    gap: 4,
  },
  genderCol: {
    flex: 1,
    gap: 4,
  },
  genderSelector: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 11,
    height: 42,
  },
  genderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  genderText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#222222",
    marginTop: 4,
  },
  statusLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    color: "#888888",
    fontSize: 12.5,
    fontWeight: "700",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: "#142416",
    borderColor: "#1C4A22",
  },
  statusPillInactive: {
    backgroundColor: "#202020",
    borderColor: "#2E2E2E",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  /* 4-Icon Hub Grid */
  hubGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  hubCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  hubIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#282828",
    alignItems: "center",
    justifyContent: "center",
  },
  hubCardLabel: {
    color: "#D0D0D0",
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
  },

  /* Evolução de Cargas Button */
  loadsEvolutionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 12,
  },
  loadsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#282828",
    alignItems: "center",
    justifyContent: "center",
  },
  loadsEvolutionText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },

  /* Primary Access Link Button */
  primaryAccessLinkBtn: {
    backgroundColor: "#D90000",
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  primaryAccessLinkText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  /* Delete Student Button */
  deleteStudentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1C1414",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    borderRadius: 14,
    height: 44,
    marginBottom: 16,
  },
  deleteStudentText: {
    color: "#E53935",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Accordion Container */
  accordionContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#262626",
    paddingTop: 16,
  },
});
