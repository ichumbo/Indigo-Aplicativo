import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useCurrentSession } from "@/hooks/use-current-session";
import { deleteUserAccount, signOut, updateUserProfile } from "@/services/auth-store";
import { getSubscriptionForUser, SubscriptionRecord } from "@/services/subscription-service";
import { UserAvatar } from "@/components/user-avatar";

export default function AccountProfileScreen() {
  const router = useRouter();
  const { session, refreshSession } = useCurrentSession();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setPhone(session.user.phone || "");
      setCpf(session.user.cpf || "");
      setAvatar(session.user.avatar || null);

      if (session.user.role === "TRAINER") {
        void getSubscriptionForUser(session.user.id).then(setSubscription);
      }
    }
  }, [session]);

  const handleSave = async () => {
    if (!session?.user) return;
    if (!name.trim()) {
      Alert.alert("Campo obrigatório", "Por favor, informe seu nome completo.");
      return;
    }

    setSaving(true);
    setSuccessMsg(false);

    try {
      await updateUserProfile(session.user.id, {
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatar || undefined,
      });
      await refreshSession();

      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      Alert.alert("Sucesso", "Dados do seu perfil foram atualizados com sucesso.");
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair da Conta", "Deseja realmente desconectar deste aparelho?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await signOut("Logout pelo perfil.");
          router.replace("/login");
        },
      },
    ]);
  };

  const handleChangeAvatar = async () => {
    Alert.alert(
      "Foto de Perfil",
      "Escolha uma ação para sua foto de perfil:",
      [
        {
          text: "Escolher da Galeria",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permissão necessária", "Permita acesso às fotos para escolher sua imagem de perfil.");
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
              });
              if (!result.canceled && result.assets && result.assets[0]) {
                setAvatar(result.assets[0].uri);
              }
            } catch {
              Alert.alert("Erro", "Não foi possível carregar a imagem da galeria.");
            }
          },
        },
        avatar
          ? {
              text: "Remover Foto (Usar Dragão)",
              style: "destructive",
              onPress: () => setAvatar(null),
            }
          : { text: "Cancelar", style: "cancel" },
        { text: "Cancelar", style: "cancel" },
      ].filter(Boolean) as never
    );
  };

  const handleDeleteAccount = () => {
    if (!session?.user) return;

    Alert.alert(
      "Excluir Minha Conta Definitivamente",
      "Atenção: Todos os seus treinos, histórico de avaliações e dados pessoais serão permanentemente deletados dos nossos servidores conforme a LGPD. Esta ação é irreversível.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir Definitivamente",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const result = await deleteUserAccount(
                session.user.id,
                "Exclusão solicitada pelo titular na tela de perfil."
              );
              Alert.alert("Conta Excluída", result.message, [
                {
                  text: "OK",
                  onPress: () => router.replace("/login"),
                },
              ]);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Erro ao excluir conta.";
              Alert.alert("Falha", msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const role = session?.user.role;
  const isTrainer = role === "TRAINER";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <Text style={styles.headerSubtitle}>Gerencie suas informações de conta</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#FF5252" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CARTÃO DE IDENTIDADE */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <UserAvatar uri={avatar} size={88} />
              <TouchableOpacity
                style={styles.editAvatarBadge}
                onPress={handleChangeAvatar}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileName}>{name || "Usuário"}</Text>
            <Text style={styles.profileEmail}>{email || "usuario@dragoncorp.app"}</Text>

            <View style={styles.badgesRow}>
              <View style={styles.roleBadge}>
                <Ionicons
                  name={isTrainer ? "barbell" : "person"}
                  size={12}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.roleBadgeText}>
                  {isTrainer ? "PERSONAL TRAINER" : "ALUNO"}
                </Text>
              </View>

              {isTrainer && subscription && (
                <View
                  style={[
                    styles.planBadge,
                    subscription.plan === "PRO" ? styles.planBadgePro : styles.planBadgeFree,
                  ]}
                >
                  <Text style={styles.planBadgeText}>
                    {subscription.plan === "PRO" ? "PLANO PRO" : "PLANO FREE"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* FORMULÁRIO DE DADOS PESSOAIS */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>

            <Text style={styles.inputLabel}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome completo"
              placeholderTextColor="#555555"
            />

            <Text style={styles.inputLabel}>E-mail Cadastrado</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              placeholder="seu.email@exemplo.com"
              placeholderTextColor="#555555"
            />
            <Text style={styles.inputHelper}>O e-mail principal é utilizado para login e segurança.</Text>

            <Text style={styles.inputLabel}>Telefone / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 98765-4321"
              placeholderTextColor="#555555"
              keyboardType="phone-pad"
            />

            {cpf ? (
              <>
                <Text style={styles.inputLabel}>CPF</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={cpf}
                  editable={false}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#555555"
                />
              </>
            ) : null}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.84}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                </>
              )}
            </TouchableOpacity>

            {successMsg && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#00E676" />
                <Text style={styles.successText}>Alterações salvas com sucesso!</Text>
              </View>
            )}
          </View>

          {/* SEGURANÇA E PRIVACIDADE */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Segurança & Privacidade</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("/privacy-policy")}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#D62828" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Política de Privacidade</Text>
                <Text style={styles.actionSubtitle}>Transparência e proteção de dados LGPD</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("/terms-of-use")}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="document-text-outline" size={18} color="#D62828" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Termos de Uso</Text>
                <Text style={styles.actionSubtitle}>Regras de utilização do DragonCorp</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666666" />
            </TouchableOpacity>

            {isTrainer && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push("/subscription")}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons name="card-outline" size={18} color="#D62828" />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Minha Assinatura</Text>
                  <Text style={styles.actionSubtitle}>Gerenciar plano Pro, recibos e renovação</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666666" />
              </TouchableOpacity>
            )}
          </View>

          {/* EXCLUIR CONTA */}
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Zona de Exclusão de Conta</Text>
            <Text style={styles.dangerText}>
              Caso deseje encerrar definitivamente sua conta e remover todos os seus dados e treinos dos nossos
              servidores, esta ação é irreversível conforme a LGPD e Diretrizes das Lojas.
            </Text>
            <TouchableOpacity
              style={[styles.deleteButton, deleting && { opacity: 0.6 }]}
              onPress={handleDeleteAccount}
              disabled={deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator color="#FF5252" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#FF5252" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteButtonText}>Excluir Minha Conta Permanentemente</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1D0B0B",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  profileCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#D62828",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  profileEmail: {
    color: "#888888",
    fontSize: 13,
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: "#CCCCCC",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  planBadgePro: {
    backgroundColor: "#200A0A",
    borderWidth: 1,
    borderColor: "#D62828",
  },
  planBadgeFree: {
    backgroundColor: "#161616",
  },
  planBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
  },
  inputLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#252525",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: "#141414",
    color: "#777777",
  },
  inputHelper: {
    color: "#666666",
    fontSize: 11,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D62828",
    paddingVertical: 13,
    borderRadius: 8,
    marginTop: 18,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D2214",
    borderWidth: 1,
    borderColor: "#154425",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  successText: {
    color: "#00E676",
    fontSize: 12,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1F0A0A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  actionSubtitle: {
    color: "#777777",
    fontSize: 11,
    marginTop: 1,
  },
  dangerCard: {
    backgroundColor: "#160A0A",
    borderWidth: 1,
    borderColor: "#331515",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  dangerTitle: {
    color: "#FF5252",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  dangerText: {
    color: "#997777",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2B0E0E",
    borderWidth: 1,
    borderColor: "#551A1A",
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#FF5252",
    fontSize: 13,
    fontWeight: "700",
  },
});
