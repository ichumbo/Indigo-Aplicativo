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
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  StudentProfile,
  StudentRegistration,
  StudentStatus,
  calculateAge,
  getWhatsAppUrl,
  formatPhoneInput,
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
  const [fullName, setFullName] = useState(profile.registration.fullName || "");
  const [birthDate, setBirthDate] = useState(profile.registration.birthDate || "");
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
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFullName(profile.registration.fullName || "");
    setBirthDate(profile.registration.birthDate || "");
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
    setBirthDate(val);
    setHasChanges(true);
    const calculated = calculateAge(val);
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
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#D90000" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Aluno</Text>

        <TouchableOpacity
          style={styles.saveTopBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="checkmark-sharp" size={26} color="#D90000" />
        </TouchableOpacity>
      </View>

      {/* FORM CARD: AVATAR & BASIC DETAILS */}
      <View style={styles.formCard}>
        {/* ROW 1: AVATAR (LEFT) + NOME & NASCIMENTO (RIGHT) */}
        <View style={styles.avatarFormRow}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={54} color="#555" />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.avatarRightFields}>
            {/* Nome Completo */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Nome Completo</Text>
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

            {/* Data de Nascimento */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Data de Nascimento</Text>
              <TextInput
                style={styles.inputBox}
                value={birthDate}
                onChangeText={handleBirthDateChange}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#666"
              />
            </View>
          </View>
        </View>

        {/* ROW 2: IDADE & SEXO (2 COLUMNS) */}
        <View style={styles.twoColRow}>
          <View style={styles.ageCol}>
            <Text style={styles.fieldLabel}>Idade</Text>
            <TextInput
              style={styles.inputBox}
              value={age}
              onChangeText={(val) => {
                setAge(val);
                setHasChanges(true);
              }}
              placeholder="Ex: 36"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.genderCol}>
            <Text style={styles.fieldLabel}>Sexo</Text>
            <TouchableOpacity
              style={styles.genderSelector}
              onPress={toggleGender}
              activeOpacity={0.8}
            >
              <Text style={styles.genderText}>
                {gender === "male" ? "Masculino" : gender === "female" ? "Feminino" : "Não informado"}
              </Text>
              <Ionicons name="swap-horizontal" size={16} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ROW 3: WHATSAPP */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>WhatsApp</Text>
          <TextInput
            style={styles.inputBox}
            value={whatsapp}
            onChangeText={(val) => {
              setWhatsapp(val);
              setHasChanges(true);
            }}
            placeholder="Ex: 21979127906"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
          />
        </View>

        {/* ROW 4: EMAIL */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Email</Text>
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

        {/* ROW 5: STATUS SWITCH */}
        <View style={styles.statusRow}>
          <Switch
            value={isActive}
            onValueChange={(val) => {
              setIsActive(val);
              setHasChanges(true);
            }}
            trackColor={{ false: "#333333", true: "#D90000" }}
            thumbColor="#FFFFFF"
          />
          <Text style={styles.statusLabel}>
            Status: <Text style={{ color: isActive ? "#FFFFFF" : "#888888", fontWeight: "900" }}>{isActive ? "Ativo" : "Inativo"}</Text>
          </Text>
        </View>
      </View>

      {/* 4-ICON QUICK NAVIGATION HUB */}
      <View style={styles.hubGrid}>
        {/* Dieta */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToDiet}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconCircle}>
            <Ionicons name="restaurant" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.hubCardLabel}>Dieta</Text>
        </TouchableOpacity>

        {/* Anamnese */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToAnamnesis}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconCircle}>
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.hubCardLabel}>Anamnese</Text>
        </TouchableOpacity>

        {/* Avaliações */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToAssessments}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconCircle}>
            <Ionicons name="flash" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.hubCardLabel}>Avaliações</Text>
        </TouchableOpacity>

        {/* Treinos */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onNavigateToWorkouts}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconCircle}>
            <Ionicons name="barbell" size={20} color="#FFFFFF" />
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
        <Ionicons name="trending-up-outline" size={22} color="#D90000" />
        <Text style={styles.loadsEvolutionText}>Evolução de Cargas</Text>
      </TouchableOpacity>

      {/* PRIMARY LINK DE ACESSO BUTTON */}
      <TouchableOpacity
        style={styles.primaryAccessLinkBtn}
        onPress={onShareAccessLink}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryAccessLinkText}>Link de Acesso</Text>
      </TouchableOpacity>

      {/* EXCLUIR ALUNO BUTTON */}
      <TouchableOpacity
        style={styles.deleteStudentBtn}
        onPress={onDeleteStudent}
        activeOpacity={0.7}
      >
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
    backgroundColor: "#161616",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 40,
  },

  /* Top Bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    color: "#D90000",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  saveTopBtn: {
    padding: 6,
  },

  /* Form Card */
  formCard: {
    marginBottom: 16,
  },
  avatarFormRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2C2C2C",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#333333",
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
    bottom: 4,
    right: 4,
    backgroundColor: "#D90000",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#161616",
  },
  avatarRightFields: {
    flex: 1,
    gap: 8,
  },
  fieldBlock: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  inputBox: {
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "#3D3D3D",
    borderRadius: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    height: 42,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  ageCol: {
    width: 80,
  },
  genderCol: {
    flex: 1,
  },
  genderSelector: {
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "#3D3D3D",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 42,
  },
  genderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  statusLabel: {
    color: "#CCCCCC",
    fontSize: 15,
    fontWeight: "800",
  },

  /* 4-Icon Hub Grid */
  hubGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  hubCard: {
    flex: 1,
    backgroundColor: "#221919",
    borderWidth: 1,
    borderColor: "#3D2222",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  hubIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  hubCardLabel: {
    color: "#CCCCCC",
    fontSize: 11,
    fontWeight: "800",
  },

  /* Evolução de Cargas Button */
  loadsEvolutionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#221919",
    borderWidth: 1,
    borderColor: "#3D2222",
    borderRadius: 14,
    height: 46,
    marginBottom: 18,
  },
  loadsEvolutionText: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  /* Primary Access Link Button */
  primaryAccessLinkBtn: {
    backgroundColor: "#D90000",
    borderRadius: 24,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  primaryAccessLinkText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  /* Delete Student Button */
  deleteStudentBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
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
