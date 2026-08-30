import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { BrandLogo } from "@/components/brand-logo";
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
  const [tab, setTab] = useState<"branding" | "personal">("branding");

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

  const handlePickAvatarFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Precisamos de acesso às suas fotos para alterar sua foto de perfil."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  };

  const handlePickLogoFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Precisamos de acesso às suas fotos para carregar sua logomarca."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCustomLogoUrl(result.assets[0].uri);
        setLogoPresetId("");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível selecionar a logomarca.");
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
            setTagline(DEFAULT_TRAINER_BRANDING.tagline || "");
          },
        },
      ]
    );
  };

  // Preview logo rendering
  const renderPreviewLogo = () => {
    if (customLogoUrl.trim()) {
      return (
        <Image
          source={{ uri: customLogoUrl.trim() }}
          style={styles.mockupCustomLogo}
          resizeMode="contain"
        />
      );
    }
    if (logoPresetId === "white") {
      return (
        <Image
          source={require("@/assets/images/logo-white.png")}
          style={styles.mockupSymbolLogo}
          resizeMode="contain"
        />
      );
    }
    if (logoPresetId === "symbol") {
      return (
        <Image
          source={require("@/assets/images/logo-principal.png")}
          style={styles.mockupSymbolLogo}
          resizeMode="contain"
        />
      );
    }
    return (
      <BrandLogo variant="full" theme="dark" width={110} height={26} resizeMode="contain" />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheet}>
            {/* Sheet Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>Personalização & Perfil</Text>
                <Text style={styles.headerSubtitle}>
                  Identidade visual do aluno e dados do personal
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#A0A0A5" />
              </TouchableOpacity>
            </View>

            {/* Modern Segmented Tab Switcher */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabButton, tab === "branding" && styles.tabButtonActive]}
                onPress={() => setTab("branding")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={16}
                  color={tab === "branding" ? "#FFFFFF" : "#71717A"}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    tab === "branding" && styles.tabButtonTextActive,
                  ]}
                >
                  Identidade do Aluno
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, tab === "personal" && styles.tabButtonActive]}
                onPress={() => setTab("personal")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={tab === "personal" ? "#FFFFFF" : "#71717A"}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    tab === "personal" && styles.tabButtonTextActive,
                  ]}
                >
                  Dados do Personal
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {tab === "branding" ? (
                <>
                  {/* LIVE MOCKUP PREVIEW */}
                  <View style={[styles.previewCard, { borderColor: `${primaryColor}33` }]}>
                    <View style={styles.previewTopRow}>
                      <View style={styles.previewBadge}>
                        <Ionicons name="phone-portrait-outline" size={12} color="#A0A0A5" />
                        <Text style={styles.previewEyebrow}>PRÉ-VISUALIZAÇÃO DO ALUNO</Text>
                      </View>
                      <View style={[styles.liveDot, { backgroundColor: primaryColor }]} />
                    </View>

                    {/* Mini Smartphone Screen Frame */}
                    <View style={styles.mockupScreen}>
                      <View style={styles.mockupHeader}>
                        {renderPreviewLogo()}
                        <View style={styles.mockupHeaderIcons}>
                          <View style={[styles.mockupBadge, { backgroundColor: primaryColor }]}>
                            <Text style={styles.mockupBadgeText}>1</Text>
                          </View>
                          <View style={styles.mockupAvatarSmall}>
                            <Ionicons name="person" size={12} color="#888888" />
                          </View>
                        </View>
                      </View>

                      <View style={styles.mockupWelcome}>
                        <Text style={styles.mockupWelcomeText}>Bem-vindo, Aluno!</Text>
                        <Text style={[styles.mockupConsultancyText, { color: primaryColor }]}>
                          {businessName || "DragonCorp"}
                        </Text>
                      </View>

                      <View style={[styles.mockupCard, { borderColor: `${primaryColor}55` }]}>
                        <View
                          style={[
                            styles.mockupProgressFill,
                            { backgroundColor: primaryColor, width: "70%" },
                          ]}
                        />
                        <View style={styles.mockupCardContent}>
                          <Ionicons name="barbell" size={14} color={primaryColor} />
                          <Text style={styles.mockupCardText}>Check-in de Treino Disponível</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* NOME DA CONSULTORIA */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Nome da Consultoria / Marca</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="storefront-outline"
                        size={18}
                        color="#71717A"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={businessName}
                        onChangeText={setBusinessName}
                        placeholder="Ex: DragonCorp, Studio Fit..."
                        placeholderTextColor="#52525B"
                      />
                    </View>
                  </View>

                  {/* SLOGAN OU FRASE DE IMPACTO */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Slogan / Frase de Impacto (Opcional)</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="sparkles-outline"
                        size={18}
                        color="#71717A"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={tagline}
                        onChangeText={setTagline}
                        placeholder="Ex: Alta Performance & Resultados"
                        placeholderTextColor="#52525B"
                      />
                    </View>
                  </View>

                  {/* PALETA DE CORES */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>Cor de Destaque do Sistema</Text>
                      <Text style={[styles.activeColorTag, { color: primaryColor }]}>
                        {primaryColor.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.fieldHint}>
                      Esta cor personalizada será aplicada nos botões, badges e destaques do seu aluno.
                    </Text>

                    {/* Balanced 4x2 Grid */}
                    <View style={styles.colorPaletteGrid}>
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
                            {isSelected && (
                              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Custom Hex Row */}
                    <View style={styles.customHexRow}>
                      <View style={[styles.customHexPreview, { backgroundColor: primaryColor }]} />
                      <TextInput
                        style={styles.customHexInput}
                        value={customHex}
                        onChangeText={handleCustomHexChange}
                        placeholder="#D90000"
                        placeholderTextColor="#52525B"
                        autoCapitalize="characters"
                        maxLength={7}
                      />
                      <Text style={styles.customHexLabel}>Código HEX Manual</Text>
                    </View>
                  </View>

                  {/* LOGOTIPO DA TELA DO ALUNO */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Logotipo para a Tela do Aluno</Text>
                    <Text style={styles.fieldHint}>
                      Escolha o modelo oficial ou envie a imagem da sua própria logomarca.
                    </Text>

                    <View style={styles.logoPresetsRow}>
                      {BRANDING_LOGO_PRESETS.map((preset) => {
                        const isSelected = logoPresetId === preset.id && !customLogoUrl;
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            style={[
                              styles.logoPresetButton,
                              isSelected && [
                                styles.logoPresetButtonActive,
                                { borderColor: primaryColor },
                              ],
                            ]}
                            onPress={() => {
                              setLogoPresetId(preset.id);
                              setCustomLogoUrl("");
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="image-outline"
                              size={16}
                              color={isSelected ? primaryColor : "#71717A"}
                            />
                            <Text
                              style={[
                                styles.logoPresetText,
                                isSelected && { color: "#FFFFFF", fontWeight: "700" },
                              ]}
                              numberOfLines={1}
                            >
                              {preset.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      style={styles.galleryButton}
                      onPress={handlePickLogoFromGallery}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.galleryButtonText}>
                        {customLogoUrl ? "Alterar Logotipo da Galeria" : "Carregar Logotipo da Galeria"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* FOTO DE PERFIL DO PERSONAL */}
                  <View style={styles.avatarSection}>
                    <TouchableOpacity
                      style={styles.avatarWrapper}
                      onPress={handlePickAvatarFromGallery}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{
                          uri:
                            avatarUrl ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
                        }}
                        style={[styles.avatarPreview, { borderColor: primaryColor }]}
                      />
                      <View style={[styles.avatarBadge, { backgroundColor: primaryColor }]}>
                        <Ionicons name="camera" size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    <Text style={styles.avatarSectionTitle}>Foto Profissional</Text>
                    <Text style={styles.avatarSectionSubtitle}>
                      Toque na foto para escolher da galeria ou selecione um preset
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
                              avatarUrl === url && [
                                styles.avatarMiniPresetActive,
                                { borderColor: primaryColor },
                              ],
                            ]}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* NOME COMPLETO */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Nome Completo / Exibição</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#71717A"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Ex: Carlos Silva"
                        placeholderTextColor="#52525B"
                      />
                    </View>
                  </View>

                  {/* REGISTRO CREF */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Registro Profissional (CREF)</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="card-outline"
                        size={18}
                        color="#71717A"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={professionalId}
                        onChangeText={setProfessionalId}
                        placeholder="Ex: CREF 123456-G/SP"
                        placeholderTextColor="#52525B"
                      />
                    </View>
                  </View>

                  {/* EMAIL */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>E-mail de Contato</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="mail-outline"
                        size={18}
                        color="#71717A"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="personal@dragoncorp.app"
                        placeholderTextColor="#52525B"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* WHATSAPP / TELEFONE */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Celular / WhatsApp</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="logo-whatsapp"
                        size={18}
                        color="#71717A"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="(11) 99999-9999"
                        placeholderTextColor="#52525B"
                        keyboardType="phone-pad"
                      />
                    </View>
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
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color="#A0A0A5" />
                <Text style={styles.restoreButtonText}>Padrão</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: primaryColor }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Salvar & Aplicar</Text>
                  </>
                )}
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  keyboardWrap: {
    width: "100%",
    maxHeight: "92%",
  },
  sheet: {
    backgroundColor: "#111114",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#24242B",
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    maxHeight: "100%",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2E2E38",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: "#71717A",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1A1A20",
    borderWidth: 1,
    borderColor: "#282832",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 3,
    borderRadius: 12,
    backgroundColor: "#18181F",
    borderWidth: 1,
    borderColor: "#262630",
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: "#272733",
  },
  tabButtonText: {
    color: "#71717A",
    fontSize: 12,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollBody: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 16,
  },
  previewCard: {
    backgroundColor: "#0A0A0D",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  previewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  previewEyebrow: {
    color: "#71717A",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  mockupScreen: {
    backgroundColor: "#121216",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E26",
    padding: 12,
    gap: 10,
  },
  mockupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mockupCustomLogo: {
    width: 95,
    height: 24,
  },
  mockupSymbolLogo: {
    width: 24,
    height: 24,
  },
  mockupHeaderIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mockupBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  mockupBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  mockupAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1E1E26",
    alignItems: "center",
    justifyContent: "center",
  },
  mockupWelcome: {
    marginTop: 2,
  },
  mockupWelcomeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  mockupConsultancyText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  mockupCard: {
    backgroundColor: "#16161D",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    overflow: "hidden",
    position: "relative",
  },
  mockupProgressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.16,
  },
  mockupCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mockupCardText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    color: "#E4E4E7",
    fontSize: 13,
    fontWeight: "700",
  },
  activeColorTag: {
    fontSize: 11,
    fontWeight: "800",
  },
  fieldHint: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 15,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262630",
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "600",
  },
  colorPaletteGrid: {
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
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  customHexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  customHexPreview: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#33333F",
  },
  customHexInput: {
    width: 100,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#262630",
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "center",
  },
  customHexLabel: {
    color: "#71717A",
    fontSize: 11.5,
    fontWeight: "600",
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
    height: 38,
    borderRadius: 10,
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#262630",
    paddingHorizontal: 8,
  },
  logoPresetButtonActive: {
    backgroundColor: "rgba(217, 0, 0, 0.08)",
  },
  logoPresetText: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "600",
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1D1D26",
    borderWidth: 1,
    borderColor: "#2C2C3A",
    marginTop: 6,
  },
  galleryButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  avatarSection: {
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 4,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#111114",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  avatarSectionSubtitle: {
    color: "#71717A",
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
  },
  avatarPresetsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  avatarMiniPreset: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#282834",
  },
  avatarMiniPresetActive: {
    borderWidth: 2.5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E1E26",
  },
  restoreButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1A1A20",
    borderWidth: 1,
    borderColor: "#282834",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    color: "#A0A0A5",
    fontSize: 13,
    fontWeight: "700",
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
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
