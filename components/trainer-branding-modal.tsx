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
import {
  generateBrandTokens,
  isValidHex,
  normalizeHex,
} from "@/services/color-contrast-utils";

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

  // Preview Mode Toggles
  const [previewThemeMode, setPreviewThemeMode] = useState<"dark" | "light">("dark");
  const [previewAudience, setPreviewAudience] = useState<"student" | "trainer">("student");

  const [saving, setSaving] = useState(false);

  // Derived Brand Tokens & Contrast
  const brandTokens = generateBrandTokens(primaryColor);

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
    const normalized = normalizeHex(hex);
    setPrimaryColor(normalized);
    setCustomHex(normalized);
  };

  const handleCustomHexChange = (text: string) => {
    setCustomHex(text);
    if (isValidHex(text)) {
      setPrimaryColor(normalizeHex(text));
    }
  };

  const handleApplySuggestedColor = () => {
    handleSelectColor(brandTokens.suggestedAccessibleHex);
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
    if (saving) return;

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
      Alert.alert("Sucesso", "Identidade visual da consultoria atualizada com sucesso!");
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
      "Deseja restaurar as cores e a logo padrão oficiais da DragonCorp?",
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
      <BrandLogo variant="full" theme={previewThemeMode} width={110} height={26} resizeMode="contain" />
    );
  };

  const isDarkPreview = previewThemeMode === "dark";
  const previewBgColor = isDarkPreview ? "#0F0F12" : "#F4F4F5";
  const previewCardBg = isDarkPreview ? "#18181D" : "#FFFFFF";
  const previewTextColor = isDarkPreview ? "#FFFFFF" : "#18181B";
  const previewTextMuted = isDarkPreview ? "#A1A1AA" : "#71717A";

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
                <Text style={styles.headerTitle}>Identidade da minha consultoria</Text>
                <Text style={styles.headerSubtitle}>
                  Personalize as cores, logo e nome da sua marca para seus alunos
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

            {/* Segmented Tab Switcher */}
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
                  Marca & Cores
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
                  {/* LIVE MOCKUP PREVIEW CARD */}
                  <View style={[styles.previewCard, { borderColor: brandTokens.brandPrimaryBorder }]}>
                    <View style={styles.previewTopRow}>
                      <View style={styles.previewBadge}>
                        <Ionicons name="eye-outline" size={13} color="#A0A0A5" />
                        <Text style={styles.previewEyebrow}>PRÉ-VISUALIZAÇÃO EM TEMPO REAL</Text>
                      </View>

                      {/* Preview Toggles */}
                      <View style={styles.previewTogglesRow}>
                        <TouchableOpacity
                          style={[styles.previewTogglePill, isDarkPreview && styles.previewTogglePillActive]}
                          onPress={() => setPreviewThemeMode(isDarkPreview ? "light" : "dark")}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isDarkPreview ? "moon" : "sunny"}
                            size={12}
                            color={isDarkPreview ? "#38BDF8" : "#F59E0B"}
                          />
                          <Text style={styles.previewToggleText}>{isDarkPreview ? "Dark" : "Light"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.previewTogglePill, previewAudience === "student" && styles.previewTogglePillActive]}
                          onPress={() => setPreviewAudience(previewAudience === "student" ? "trainer" : "student")}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={previewAudience === "student" ? "school-outline" : "fitness-outline"}
                            size={12}
                            color="#FFFFFF"
                          />
                          <Text style={styles.previewToggleText}>
                            {previewAudience === "student" ? "Aluno" : "Personal"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Simulated App Screen Frame */}
                    <View style={[styles.mockupScreen, { backgroundColor: previewBgColor }]}>
                      {/* Header */}
                      <View style={[styles.mockupHeader, { borderBottomColor: isDarkPreview ? "#202025" : "#E4E4E7" }]}>
                        {renderPreviewLogo()}
                        <View style={styles.mockupHeaderIcons}>
                          <View style={[styles.mockupBadge, { backgroundColor: primaryColor }]}>
                            <Text style={[styles.mockupBadgeText, { color: brandTokens.brandOnPrimary }]}>1</Text>
                          </View>
                          <View style={[styles.mockupAvatarSmall, { backgroundColor: isDarkPreview ? "#27272A" : "#E4E4E7" }]}>
                            <Ionicons name="person" size={12} color={previewTextMuted} />
                          </View>
                        </View>
                      </View>

                      {/* Body Content */}
                      <View style={styles.mockupBody}>
                        <Text style={[styles.mockupWelcomeText, { color: previewTextColor }]}>
                          {previewAudience === "student" ? "Olá, Atleta!" : "Painel da Consultoria"}
                        </Text>
                        <Text style={[styles.mockupConsultancyText, { color: primaryColor }]}>
                          {businessName || "DragonCorp"}
                        </Text>

                        {/* Interactive Card */}
                        <View style={[styles.mockupCard, { backgroundColor: previewCardBg, borderColor: brandTokens.brandPrimaryBorder }]}>
                          <View style={styles.mockupCardTop}>
                            <View style={[styles.mockupCardIcon, { backgroundColor: brandTokens.brandPrimarySoft }]}>
                              <Ionicons name="barbell" size={14} color={primaryColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.mockupCardTitle, { color: previewTextColor }]}>
                                {previewAudience === "student" ? "Treino A: Peito & Tríceps" : "4 Alunos Ativos"}
                              </Text>
                              <Text style={[styles.mockupCardSubtitle, { color: previewTextMuted }]}>
                                {tagline || "Alta Performance & Resultados"}
                              </Text>
                            </View>
                          </View>

                          {/* Progress Bar */}
                          <View style={[styles.mockupProgressTrack, { backgroundColor: isDarkPreview ? "#27272A" : "#E4E4E7" }]}>
                            <View style={[styles.mockupProgressFill, { backgroundColor: primaryColor, width: "75%" }]} />
                          </View>

                          {/* Primary Action Button */}
                          <TouchableOpacity
                            style={[styles.mockupButton, { backgroundColor: primaryColor }]}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.mockupButtonText, { color: brandTokens.brandOnPrimary }]}>
                              {previewAudience === "student" ? "Iniciar Treino do Dia" : "Prescrever Novo Treino"}
                            </Text>
                            <Ionicons name="arrow-forward" size={12} color={brandTokens.brandOnPrimary} />
                          </TouchableOpacity>
                        </View>

                        {/* Bottom Tab Simulation */}
                        <View style={[styles.mockupTabRow, { backgroundColor: previewCardBg, borderTopColor: isDarkPreview ? "#202025" : "#E4E4E7" }]}>
                          <View style={styles.mockupTabItem}>
                            <Ionicons name="home" size={14} color={primaryColor} />
                            <Text style={[styles.mockupTabText, { color: primaryColor, fontWeight: "700" }]}>Home</Text>
                          </View>
                          <View style={styles.mockupTabItem}>
                            <Ionicons name="fitness-outline" size={14} color={previewTextMuted} />
                            <Text style={[styles.mockupTabText, { color: previewTextMuted }]}>Treinos</Text>
                          </View>
                          <View style={styles.mockupTabItem}>
                            <Ionicons name="chatbubbles-outline" size={14} color={previewTextMuted} />
                            <Text style={[styles.mockupTabText, { color: previewTextMuted }]}>Chat</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* WCAG Contrast Health Check Badge */}
                    <View style={styles.contrastFeedbackBox}>
                      <View style={styles.contrastScoreRow}>
                        <Ionicons
                          name={brandTokens.isAccessibleOnDark ? "checkmark-circle" : "alert-circle"}
                          size={16}
                          color={brandTokens.isAccessibleOnDark ? "#10B981" : "#F59E0B"}
                        />
                        <Text style={styles.contrastScoreText}>
                          Contraste WCAG 2.1:{" "}
                          <Text style={{ fontWeight: "800", color: brandTokens.isAccessibleOnDark ? "#10B981" : "#F59E0B" }}>
                            {brandTokens.contrastOnDark}:1 (Dark) / {brandTokens.contrastOnLight}:1 (Light)
                          </Text>
                        </Text>
                      </View>
                      <Text style={styles.contrastSubtext}>
                        Texto de botões sobre a marca:{" "}
                        <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                          {brandTokens.brandOnPrimary === "#FFFFFF" ? "Branco (#FFFFFF)" : "Preto (#000000)"}
                        </Text>
                      </Text>

                      {!brandTokens.isAccessibleOnDark && (
                        <TouchableOpacity
                          style={styles.contrastSuggestButton}
                          onPress={handleApplySuggestedColor}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="color-wand-outline" size={13} color="#F59E0B" />
                          <Text style={styles.contrastSuggestText}>
                            Aplicar sugestão com contraste seguro ({brandTokens.suggestedAccessibleHex})
                          </Text>
                        </TouchableOpacity>
                      )}
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
                        placeholder="Ex: Consultoria Alpha, Studio Fit..."
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
                      <Text style={styles.fieldLabel}>Cor Principal da Marca</Text>
                      <Text style={[styles.activeColorTag, { color: primaryColor }]}>
                        {primaryColor.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.fieldHint}>
                      Esta cor substituirá o destaque da DragonCorp nos botões, abas e cards para seus alunos.
                    </Text>

                    {/* Presets Grid */}
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
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={generateBrandTokens(preset.hex).brandOnPrimary}
                              />
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
                      <Text style={styles.customHexLabel}>Código HEX Personalizado</Text>
                    </View>
                  </View>

                  {/* LOGOTIPO DA TELA DO ALUNO */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Logomarca da Consultoria</Text>
                    <Text style={styles.fieldHint}>
                      Selecione uma imagem da galeria (PNG, JPEG, WebP) ou use os modelos padrões.
                    </Text>

                    <View style={styles.logoPresetsColumn}>
                      {BRANDING_LOGO_PRESETS.map((preset) => {
                        const isSelected = logoPresetId === preset.id && !customLogoUrl;
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            style={[
                              styles.logoPresetCard,
                              isSelected && [
                                styles.logoPresetCardActive,
                                { borderColor: primaryColor },
                              ],
                            ]}
                            onPress={() => {
                              setLogoPresetId(preset.id);
                              setCustomLogoUrl("");
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.logoPresetIconBox}>
                              <BrandLogo
                                variant={preset.id === "symbol" ? "symbol" : "full"}
                                theme="dark"
                                width={22}
                                height={22}
                              />
                            </View>
                            <View style={styles.logoPresetInfo}>
                              <Text
                                style={[
                                  styles.logoPresetTitle,
                                  isSelected && { color: "#FFFFFF", fontWeight: "700" },
                                ]}
                              >
                                {preset.name}
                              </Text>
                              <Text style={styles.logoPresetDesc}>
                                {preset.id === "default"
                                  ? "Logotipo padrão oficial colorido"
                                  : preset.id === "white"
                                  ? "Versão minimalista monocromática"
                                  : "Ícone e brasão oficial"}
                              </Text>
                            </View>
                            <Ionicons
                              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                              size={20}
                              color={isSelected ? primaryColor : "#52525B"}
                            />
                          </TouchableOpacity>
                        );
                      })}

                      {!!customLogoUrl && (
                        <View
                          style={[
                            styles.logoPresetCard,
                            styles.logoPresetCardActive,
                            { borderColor: primaryColor },
                          ]}
                        >
                          <Image
                            source={{ uri: customLogoUrl }}
                            style={styles.customLogoThumb}
                            resizeMode="contain"
                          />
                          <View style={styles.logoPresetInfo}>
                            <Text
                              style={[
                                styles.logoPresetTitle,
                                { color: "#FFFFFF", fontWeight: "700" },
                              ]}
                            >
                              Logomarca Personalizada
                            </Text>
                            <Text style={styles.logoPresetDesc}>
                              Imagem carregada da galeria
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setCustomLogoUrl("")}
                            hitSlop={8}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.galleryButton}
                      onPress={handlePickLogoFromGallery}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.galleryButtonText}>
                        {customLogoUrl ? "Substituir Logo da Galeria" : "Escolher Logo da Galeria"}
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
                        <Ionicons name="camera" size={14} color={brandTokens.brandOnPrimary} />
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
                <Text style={styles.restoreButtonText}>Restaurar Padrão</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: primaryColor }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={brandTokens.brandOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={brandTokens.brandOnPrimary} />
                    <Text style={[styles.saveButtonText, { color: brandTokens.brandOnPrimary }]}>Salvar Identidade</Text>
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
    backgroundColor: "#18181D",
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: "#24242B",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "#24242C",
  },
  tabButtonText: {
    color: "#71717A",
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollBody: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },

  // PREVIEW CARD
  previewCard: {
    backgroundColor: "#15151A",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  previewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  previewEyebrow: {
    color: "#A0A0A5",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  previewTogglesRow: {
    flexDirection: "row",
    gap: 6,
  },
  previewTogglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1F1F26",
    borderWidth: 1,
    borderColor: "#2C2C36",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewTogglePillActive: {
    borderColor: "#3E3E4D",
    backgroundColor: "#282832",
  },
  previewToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D4D4D8",
  },

  // SIMULATED MOCKUP SCREEN
  mockupScreen: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A2A33",
  },
  mockupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  mockupHeaderIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mockupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mockupBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  mockupAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mockupSymbolLogo: {
    width: 24,
    height: 24,
  },
  mockupCustomLogo: {
    width: 90,
    height: 26,
  },
  mockupBody: {
    padding: 12,
  },
  mockupWelcomeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mockupConsultancyText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  mockupCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  mockupCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  mockupCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  mockupCardTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  mockupCardSubtitle: {
    fontSize: 10,
  },
  mockupProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 10,
  },
  mockupProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  mockupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  mockupButtonText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  mockupTabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderRadius: 8,
    marginTop: 2,
  },
  mockupTabItem: {
    alignItems: "center",
    gap: 2,
  },
  mockupTabText: {
    fontSize: 9,
  },

  // CONTRAST FEEDBACK
  contrastFeedbackBox: {
    marginTop: 12,
    backgroundColor: "#1C1C22",
    borderRadius: 10,
    padding: 10,
  },
  contrastScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  contrastScoreText: {
    color: "#D4D4D8",
    fontSize: 12,
  },
  contrastSubtext: {
    color: "#A1A1AA",
    fontSize: 11,
  },
  contrastSuggestButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  contrastSuggestText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },

  // FORM FIELDS
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeColorTag: {
    fontSize: 12,
    fontWeight: "800",
  },
  fieldHint: {
    fontSize: 11.5,
    color: "#71717A",
    marginBottom: 10,
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#282832",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    paddingVertical: 12,
  },

  // COLOR PALETTE
  colorPaletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleSelected: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.1 }],
  },
  customHexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customHexPreview: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3F3F46",
  },
  customHexInput: {
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#282832",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    width: 90,
    textAlign: "center",
  },
  customHexLabel: {
    fontSize: 12,
    color: "#71717A",
  },

  // LOGO PRESETS
  logoPresetsColumn: {
    gap: 8,
    marginBottom: 12,
  },
  logoPresetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#282832",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  logoPresetCardActive: {
    backgroundColor: "#1E1E26",
  },
  logoPresetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0D0D10",
    alignItems: "center",
    justifyContent: "center",
  },
  logoPresetInfo: {
    flex: 1,
  },
  logoPresetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4D4D8",
  },
  logoPresetDesc: {
    fontSize: 11,
    color: "#71717A",
    marginTop: 1,
  },
  customLogoThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202028",
    borderWidth: 1,
    borderColor: "#2E2E3B",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  galleryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // AVATAR
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#111114",
  },
  avatarSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarSectionSubtitle: {
    fontSize: 11.5,
    color: "#71717A",
    marginTop: 2,
    marginBottom: 12,
  },
  avatarPresetsRow: {
    flexDirection: "row",
    gap: 10,
  },
  avatarMiniPreset: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  avatarMiniPresetActive: {
    borderColor: "#FFFFFF",
  },

  // FOOTER
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1F1F26",
    gap: 12,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181D",
    borderWidth: 1,
    borderColor: "#2A2A34",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  restoreButtonText: {
    color: "#D4D4D8",
    fontSize: 13,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
