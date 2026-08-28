import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  BRANDING_COLOR_PRESETS,
  BRANDING_LOGO_PRESETS,
  DEFAULT_TRAINER_BRANDING,
  TrainerBranding,
} from "@/services/trainer-branding-store";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
];

type Props = {
  visible: boolean;
  initialBranding: TrainerBranding;
  onClose: () => void;
  onSave: (updated: Partial<TrainerBranding>) => Promise<void>;
};

export function TrainerBrandingModal({
  visible,
  initialBranding,
  onClose,
  onSave,
}: Props) {
  const [tab, setTab] = useState<"personal" | "branding">("branding");

  // Personal form
  const [displayName, setDisplayName] = useState(initialBranding.displayName || "");
  const [professionalId, setProfessionalId] = useState(initialBranding.professionalId || "");
  const [email, setEmail] = useState(initialBranding.email || "");
  const [phone, setPhone] = useState(initialBranding.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(initialBranding.avatarUrl || "");

  // Branding form
  const [businessName, setBusinessName] = useState(initialBranding.businessName || "DragonCorp");
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor || "#D90000");
  const [customHex, setCustomHex] = useState(initialBranding.primaryColor || "#D90000");
  const [logoPresetId, setLogoPresetId] = useState(initialBranding.logoPresetId || "default");
  const [customLogoUrl, setCustomLogoUrl] = useState(initialBranding.customLogoUrl || "");
  const [tagline, setTagline] = useState(initialBranding.tagline || "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(initialBranding.displayName || "");
      setProfessionalId(initialBranding.professionalId || "");
      setEmail(initialBranding.email || "");
      setPhone(initialBranding.phone || "");
      setAvatarUrl(initialBranding.avatarUrl || "");
      setBusinessName(initialBranding.businessName || "DragonCorp");
      setPrimaryColor(initialBranding.primaryColor || "#D90000");
      setCustomHex(initialBranding.primaryColor || "#D90000");
      setLogoPresetId(initialBranding.logoPresetId || "default");
      setCustomLogoUrl(initialBranding.customLogoUrl || "");
      setTagline(initialBranding.tagline || "");
    }
  }, [visible, initialBranding]);

  const handleSelectColor = (hex: string) => {
    setPrimaryColor(hex);
    setCustomHex(hex);
  };

  const handleCustomHexChange = (text: string) => {
    setCustomHex(text);
    if (/^#[0-9A-Fa-f]{6}$/.test(text.trim())) {
      setPrimaryColor(text.trim());
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Campo obrigatório", "Por favor, informe seu nome.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        professionalId: professionalId.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        businessName: businessName.trim() || "DragonCorp",
        primaryColor: primaryColor.trim() || "#D90000",
        logoPresetId,
        customLogoUrl: customLogoUrl.trim() || null,
        tagline: tagline.trim(),
      });
      Alert.alert("Sucesso", "Perfil e identidade visual atualizados com sucesso!");
      onClose();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    Alert.alert(
      "Restaurar Padrão",
      "Deseja restaurar as cores e logo padrão da DragonCorp?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: () => {
            setPrimaryColor(DEFAULT_TRAINER_BRANDING.primaryColor);
            setCustomHex(DEFAULT_TRAINER_BRANDING.primaryColor);
            setLogoPresetId(DEFAULT_TRAINER_BRANDING.logoPresetId);
            setCustomLogoUrl("");
            setBusinessName(DEFAULT_TRAINER_BRANDING.businessName);
          },
        },
      ]
    );
  };

  // Preview logo source
  let previewLogoSource = require("@/assets/images/logotipo-principal.png");
  if (customLogoUrl.trim()) {
    previewLogoSource = { uri: customLogoUrl.trim() };
  } else if (logoPresetId === "white") {
    previewLogoSource = require("@/assets/images/logo-white.png");
  } else if (logoPresetId === "symbol") {
    previewLogoSource = require("@/assets/images/logo-principal.png");
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>Personalização & Perfil</Text>
                <Text style={styles.headerSubtitle}>
                  Configure sua marca e a experiência visual do seu aluno
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabButton, tab === "branding" && styles.tabButtonActive]}
                onPress={() => setTab("branding")}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={16}
                  color={tab === "branding" ? "#ffffff" : "#888888"}
                />
                <Text style={[styles.tabButtonText, tab === "branding" && styles.tabButtonTextActive]}>
                  Identidade do Aluno
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, tab === "personal" && styles.tabButtonActive]}
                onPress={() => setTab("personal")}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={tab === "personal" ? "#ffffff" : "#888888"}
                />
                <Text style={[styles.tabButtonText, tab === "personal" && styles.tabButtonTextActive]}>
                  Dados do Personal
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {tab === "branding" ? (
                <>
                  {/* Live Preview Card */}
                  <View style={styles.previewCard}>
                    <Text style={styles.previewEyebrow}>PRÉ-VISUALIZAÇÃO DA TELA DO ALUNO</Text>
                    <View style={styles.mockupHeader}>
                      <Image
                        source={previewLogoSource}
                        style={styles.mockupLogo}
                        resizeMode="contain"
                      />
                      <View style={styles.mockupHeaderIcons}>
                        <View style={[styles.mockupBadge, { backgroundColor: primaryColor }]}>
                          <Text style={styles.mockupBadgeText}>1</Text>
                        </View>
                        <View style={styles.mockupAvatarSmall} />
                      </View>
                    </View>

                    <View style={styles.mockupWelcome}>
                      <Text style={styles.mockupWelcomeText}>Bem-vindo, Aluno!</Text>
                      <Text style={[styles.mockupConsultancyText, { color: primaryColor }]}>
                        {businessName || "Sua Consultoria"}
                      </Text>
                    </View>

                    <View style={[styles.mockupCard, { borderColor: primaryColor }]}>
                      <View style={[styles.mockupProgressFill, { backgroundColor: primaryColor, width: "68%" }]} />
                      <Text style={styles.mockupCardText}>Check-in de Treino Disponível</Text>
                    </View>
                  </View>

                  {/* Business Name Input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Nome da Consultoria / Marca</Text>
                    <TextInput
                      style={styles.input}
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="Ex: DragonCorp, Studio João..."
                      placeholderTextColor="#555"
                    />
                  </View>

                  {/* Primary Color Selector */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Cor do Sistema do Aluno</Text>
                    <Text style={styles.fieldHint}>
                      Esta cor substituirá os destaques e botões na tela do seu aluno
                    </Text>
                    <View style={styles.colorPalette}>
                      {BRANDING_COLOR_PRESETS.map((preset) => {
                        const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            style={[
                              styles.colorCircle,
                              { backgroundColor: preset.hex },
                              isSelected && styles.colorCircleSelected,
                            ]}
                            onPress={() => handleSelectColor(preset.hex)}
                            activeOpacity={0.8}
                          >
                            {isSelected ? (
                              <Ionicons name="checkmark" size={16} color="#ffffff" />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Custom Hex Input */}
                    <View style={styles.customHexRow}>
                      <View style={[styles.customHexPreview, { backgroundColor: primaryColor }]} />
                      <TextInput
                        style={styles.customHexInput}
                        value={customHex}
                        onChangeText={handleCustomHexChange}
                        placeholder="#D90000"
                        placeholderTextColor="#666"
                        autoCapitalize="characters"
                        maxLength={7}
                      />
                      <Text style={styles.customHexLabel}>HEX personalizado</Text>
                    </View>
                  </View>

                  {/* Logo Selector */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Logo para a Tela do Aluno</Text>
                    <Text style={styles.fieldHint}>
                      Selecione um preset ou insira a URL da sua logo personalizada
                    </Text>

                    <View style={styles.logoPresetsRow}>
                      {BRANDING_LOGO_PRESETS.map((preset) => {
                        const isSelected = logoPresetId === preset.id && !customLogoUrl;
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            style={[
                              styles.logoPresetButton,
                              isSelected && [styles.logoPresetButtonActive, { borderColor: primaryColor }],
                            ]}
                            onPress={() => {
                              setLogoPresetId(preset.id);
                              setCustomLogoUrl("");
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="image-outline"
                              size={18}
                              color={isSelected ? primaryColor : "#888"}
                            />
                            <Text
                              style={[
                                styles.logoPresetText,
                                isSelected && { color: "#ffffff", fontWeight: "900" },
                              ]}
                              numberOfLines={1}
                            >
                              {preset.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.customUrlBox}>
                      <Text style={styles.customUrlLabel}>Ou cole a URL da sua logo (PNG/JPG):</Text>
                      <TextInput
                        style={styles.input}
                        value={customLogoUrl}
                        onChangeText={(text) => {
                          setCustomLogoUrl(text);
                          if (text.trim()) setLogoPresetId("");
                        }}
                        placeholder="https://sua-marca.com/logo.png"
                        placeholderTextColor="#555"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Personal Avatar Section */}
                  <View style={styles.avatarSection}>
                    <Image
                      source={{
                        uri:
                          avatarUrl ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
                      }}
                      style={[styles.avatarPreview, { borderColor: primaryColor }]}
                    />
                    <Text style={styles.avatarSectionTitle}>Foto do Perfil</Text>
                    <Text style={styles.avatarSectionSubtitle}>
                      Escolha uma foto ou insira a URL
                    </Text>

                    <View style={styles.avatarPresetsRow}>
                      {AVATAR_PRESETS.map((url, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setAvatarUrl(url)}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: url }}
                            style={[
                              styles.avatarMiniPreset,
                              avatarUrl === url && [styles.avatarMiniPresetActive, { borderColor: primaryColor }],
                            ]}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>URL da Foto de Perfil</Text>
                    <TextInput
                      style={styles.input}
                      value={avatarUrl}
                      onChangeText={setAvatarUrl}
                      placeholder="https://exemplo.com/foto.jpg"
                      placeholderTextColor="#555"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Nome Completo / Exibição</Text>
                    <TextInput
                      style={styles.input}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Personal DragonCorp"
                      placeholderTextColor="#555"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Registro Profissional (CREF)</Text>
                    <TextInput
                      style={styles.input}
                      value={professionalId}
                      onChangeText={setProfessionalId}
                      placeholder="CREF 123456-G/SP"
                      placeholderTextColor="#555"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="treinador@dragoncorp.app"
                      placeholderTextColor="#555"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>WhatsApp / Telefone</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="(11) 98765-4321"
                      placeholderTextColor="#555"
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestoreDefaults}
                disabled={saving}
              >
                <Text style={styles.restoreButtonText}>Padrão</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: primaryColor }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.84}
              >
                <Ionicons name="checkmark" size={18} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {saving ? "Salvando..." : "Salvar & Aplicar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "flex-end",
  },
  keyboardWrap: {
    width: "100%",
    maxHeight: "92%",
  },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#262626",
    paddingBottom: 24,
    maxHeight: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#181818",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#242424",
  },
  tabButtonActive: {
    backgroundColor: "#262626",
    borderColor: "#3a3a3a",
  },
  tabButtonText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "800",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  scrollBody: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: 20,
    gap: 18,
  },
  previewCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 10,
  },
  previewEyebrow: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  mockupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mockupLogo: {
    width: 110,
    height: 32,
  },
  mockupHeaderIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mockupBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mockupBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  mockupAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#333",
  },
  mockupWelcome: {
    marginTop: 4,
  },
  mockupWelcomeText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  mockupConsultancyText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  mockupCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    overflow: "hidden",
    position: "relative",
  },
  mockupProgressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.15,
  },
  mockupCardText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  fieldHint: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 14,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 6,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  customHexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  customHexPreview: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#444",
  },
  customHexInput: {
    width: 100,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  customHexLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  logoPresetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  logoPresetButton: {
    flex: 1,
    minWidth: "30%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 8,
  },
  logoPresetButtonActive: {
    backgroundColor: "rgba(217, 0, 0, 0.1)",
  },
  logoPresetText: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  customUrlBox: {
    marginTop: 10,
    gap: 6,
  },
  customUrlLabel: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "700",
  },
  avatarSection: {
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  avatarPreview: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    marginBottom: 4,
  },
  avatarSectionTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  avatarSectionSubtitle: {
    color: "#888888",
    fontSize: 11,
    fontWeight: "600",
  },
  avatarPresetsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  avatarMiniPreset: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#333",
  },
  avatarMiniPresetActive: {
    borderWidth: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },
  restoreButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#2d2d2d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
});
