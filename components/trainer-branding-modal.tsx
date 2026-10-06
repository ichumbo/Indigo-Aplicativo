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
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
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

  // Preview Mode Toggle (aluno vs personal)
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

  // Render logo inside preview
  const renderPreviewLogo = () => {
    if (customLogoUrl.trim()) {
      return (
        <Image
          source={{ uri: customLogoUrl.trim() }}
          style={styles.previewCustomLogo}
          resizeMode="contain"
        />
      );
    }
    if (logoPresetId === "white") {
      return (
        <Image
          source={require("@/assets/images/logo-white.png")}
          style={styles.previewPresetLogo}
          resizeMode="contain"
        />
      );
    }
    if (logoPresetId === "symbol") {
      return (
        <Image
          source={require("@/assets/images/logo-principal.png")}
          style={styles.previewPresetLogo}
          resizeMode="contain"
        />
      );
    }
    return (
      <BrandLogo variant="full" theme="dark" width={100} height={24} resizeMode="contain" />
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
                <Text style={styles.headerTitle}>Identidade da consultoria</Text>
                <Text style={styles.headerSubtitle}>
                  Personalize as cores, logo e nome para seus alunos
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={18} color="#A1A1AA" />
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
                  size={15}
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
                  size={15}
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
              bounces={true}
            >
              {tab === "branding" ? (
                <>
                  {/* COMPACT HERO LIVE PREVIEW CARD */}
                  <View style={[styles.previewCard, { borderColor: brandTokens.brandPrimaryBorder }]}>
                    <View style={styles.previewHeaderRow}>
                      <View style={styles.previewBadge}>
                        <View style={[styles.previewStatusDot, { backgroundColor: primaryColor }]} />
                        <Text style={styles.previewEyebrow}>Pré-visualização</Text>
                      </View>

                      {/* Compact Audience Pill Toggle */}
                      <TouchableOpacity
                        style={styles.previewTogglePill}
                        onPress={() => setPreviewAudience(previewAudience === "student" ? "trainer" : "student")}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={previewAudience === "student" ? "school-outline" : "fitness-outline"}
                          size={12}
                          color="#FFFFFF"
                        />
                        <Text style={styles.previewToggleText}>
                          {previewAudience === "student" ? "Visão Aluno" : "Visão Personal"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Compact Interactive Demonstration Card */}
                    <View style={styles.previewDemoBox}>
                      <View style={styles.previewDemoTop}>
                        <View style={styles.previewLogoWrap}>
                          {renderPreviewLogo()}
                        </View>
                        <View style={[styles.previewPillTag, { backgroundColor: brandTokens.brandPrimarySoft }]}>
                          <Text style={[styles.previewPillTagText, { color: primaryColor }]}>
                            {previewAudience === "student" ? "Treino Ativo" : "Consultoria PRO"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.previewDemoInfo}>
                        <Text style={styles.previewBusinessName} numberOfLines={1}>
                          {businessName || "DragonCorp"}
                        </Text>
                        <Text style={styles.previewTagline} numberOfLines={1}>
                          {tagline || "Alta Performance & Consultoria"}
                        </Text>
                      </View>

                      {/* Sample Interactive Button in Brand Color */}
                      <View style={styles.previewDemoActionRow}>
                        <View style={[styles.previewSampleBtn, { backgroundColor: primaryColor }]}>
                          <Text style={[styles.previewSampleBtnText, { color: brandTokens.brandOnPrimary }]}>
                            {previewAudience === "student" ? "Iniciar Treino do Dia" : "Criar Novo Treino"}
                          </Text>
                          <Ionicons name="arrow-forward" size={13} color={brandTokens.brandOnPrimary} />
                        </View>
                      </View>
                    </View>

                    {/* WCAG Contrast Status Strip */}
                    <View style={styles.contrastStrip}>
                      <View style={styles.contrastScoreBlock}>
                        <Ionicons
                          name={brandTokens.isAccessibleOnDark ? "checkmark-circle" : "alert-circle"}
                          size={15}
                          color={brandTokens.isAccessibleOnDark ? "#10B981" : "#F59E0B"}
                        />
                        <Text style={styles.contrastScoreLabel}>
                          Contraste:{" "}
                          <Text style={{ fontWeight: "700", color: brandTokens.isAccessibleOnDark ? "#10B981" : "#F59E0B" }}>
                            {brandTokens.contrastOnDark}:1
                          </Text>
                          {" • "}
                          Texto:{" "}
                          <Text style={{ fontWeight: "600", color: "#FFFFFF" }}>
                            {brandTokens.brandOnPrimary === "#FFFFFF" ? "Branco" : "Preto"}
                          </Text>
                        </Text>
                      </View>

                      {!brandTokens.isAccessibleOnDark && (
                        <TouchableOpacity
                          style={styles.contrastFixBtn}
                          onPress={handleApplySuggestedColor}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="sparkles" size={12} color="#F59E0B" />
                          <Text style={styles.contrastFixText}>
                            Ajustar tom ({brandTokens.suggestedAccessibleHex})
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
                        size={17}
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
                        size={17}
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
                      <View style={styles.activeColorBadge}>
                        <View style={[styles.activeColorDot, { backgroundColor: primaryColor }]} />
                        <Text style={[styles.activeColorTag, { color: primaryColor }]}>
                          {primaryColor.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.fieldHint}>
                      Esta cor substituirá o destaque oficial nos botões, abas e cartões de treino dos seus alunos.
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
                            accessibilityLabel={preset.name}
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

                  {/* LOGOTIPO DA CONSULTORIA */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Logomarca da Consultoria</Text>
                    <Text style={styles.fieldHint}>
                      Escolha uma versão oficial ou carregue sua própria logomarca da galeria.
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
                            style={{ padding: 6 }}
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
                      <Ionicons name="cloud-upload-outline" size={17} color="#FFFFFF" />
                      <Text style={styles.galleryButtonText}>
                        {customLogoUrl ? "Substituir Imagem da Galeria" : "Carregar Logomarca da Galeria"}
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
                        <Ionicons name="camera" size={13} color={brandTokens.brandOnPrimary} />
                      </View>
                    </TouchableOpacity>

                    <Text style={styles.avatarSectionTitle}>Foto do Perfil</Text>
                    <Text style={styles.avatarSectionSubtitle}>
                      Toque na foto para escolher da galeria ou selecione abaixo
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
                        size={17}
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
                        size={17}
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
                        size={17}
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
                        size={17}
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

            {/* Fixed Footer Buttons */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestoreDefaults}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={15} color="#A1A1AA" />
                <Text style={styles.restoreButtonText}>Restaurar</Text>
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
                    <Ionicons name="checkmark-circle-outline" size={17} color={brandTokens.brandOnPrimary} />
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
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  keyboardWrap: {
    width: "100%",
    height: "92%",
  },
  sheet: {
    flex: 1,
    backgroundColor: "#111114",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#24242B",
    overflow: "hidden",
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
    paddingBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: "#71717A",
    fontSize: 11.5,
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
    marginBottom: 10,
    backgroundColor: "#16161B",
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: "#24242B",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "#23232B",
  },
  tabButtonText: {
    color: "#71717A",
    fontSize: 12.5,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },

  // HERO PREVIEW CARD
  previewCard: {
    backgroundColor: "#15151A",
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 16,
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  previewEyebrow: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "700",
  },
  previewTogglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1E1E26",
    borderWidth: 1,
    borderColor: "#2D2D38",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  previewToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D4D4D8",
  },
  previewDemoBox: {
    backgroundColor: "#0F0F12",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222228",
    padding: 12,
  },
  previewDemoTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previewLogoWrap: {
    minHeight: 24,
    justifyContent: "center",
  },
  previewPresetLogo: {
    width: 22,
    height: 22,
  },
  previewCustomLogo: {
    width: 80,
    height: 24,
  },
  previewPillTag: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  previewPillTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  previewDemoInfo: {
    marginBottom: 10,
  },
  previewBusinessName: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  previewTagline: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  previewDemoActionRow: {
    marginTop: 2,
  },
  previewSampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  previewSampleBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  contrastStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E1E24",
    flexWrap: "wrap",
    gap: 6,
  },
  contrastScoreBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  contrastScoreLabel: {
    color: "#A1A1AA",
    fontSize: 11,
  },
  contrastFixBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.28)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  contrastFixText: {
    color: "#F59E0B",
    fontSize: 10.5,
    fontWeight: "700",
  },

  // FORM FIELDS
  fieldGroup: {
    marginBottom: 16,
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
  activeColorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeColorTag: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  fieldHint: {
    fontSize: 11,
    color: "#71717A",
    marginBottom: 9,
    lineHeight: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#26262F",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    paddingVertical: 10,
  },

  // COLOR PALETTE
  colorPaletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
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
    transform: [{ scale: 1.08 }],
  },
  customHexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customHexPreview: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3F3F46",
  },
  customHexInput: {
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#26262F",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    width: 88,
    textAlign: "center",
  },
  customHexLabel: {
    fontSize: 11.5,
    color: "#71717A",
  },

  // LOGO PRESETS
  logoPresetsColumn: {
    gap: 8,
    marginBottom: 10,
  },
  logoPresetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161B",
    borderWidth: 1,
    borderColor: "#26262F",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  logoPresetCardActive: {
    backgroundColor: "#1C1C24",
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
    backgroundColor: "#1E1E26",
    borderWidth: 1,
    borderColor: "#2C2C38",
    borderRadius: 12,
    paddingVertical: 11,
    gap: 7,
  },
  galleryButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // AVATAR
  avatarSection: {
    alignItems: "center",
    marginBottom: 18,
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
    fontSize: 11,
    color: "#71717A",
    marginTop: 2,
    marginBottom: 12,
  },
  avatarPresetsRow: {
    flexDirection: "row",
    gap: 10,
  },
  avatarMiniPreset: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderTopColor: "#1E1E26",
    backgroundColor: "#111114",
    gap: 10,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181D",
    borderWidth: 1,
    borderColor: "#282832",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 11,
    gap: 5,
  },
  restoreButtonText: {
    color: "#A1A1AA",
    fontSize: 12.5,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 11,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
