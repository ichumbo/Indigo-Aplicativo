import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { useCurrentSession } from "@/hooks/use-current-session";
import { signOut, updateUserProfile } from "@/services/auth-store";
import { getSubscriptionForUser, SubscriptionRecord } from "@/services/subscription-service";

export default function AccountProfileScreen() {
  const router = useRouter();
  const { session, refreshSession } = useCurrentSession();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [avatar, setAvatar] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setPhone(session.user.phone || "");
      setCpf(session.user.cpf || "");
      setAvatar(session.user.avatar || "https://i.pravatar.cc/150?img=12");

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
        avatar,
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

  const handleChangeAvatar = () => {
    const randomImg = Math.floor(Math.random() * 70) + 1;
    const newAvatar = `https://i.pravatar.cc/150?img=${randomImg}`;
    setAvatar(newAvatar);
  };

  const role = session?.user.role;
  const isTrainer = role === "TRAINER";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

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
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
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

          {/* SEGURANÇA E CONTA */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Segurança & Privacidade</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("/privacy-policy")}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#D90000" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Política de Privacidade</Text>
                <Text style={styles.actionSubtitle}>Transparência e proteção de dados LGPD</Text>
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
                  <Ionicons name="card-outline" size={18} color="#D90000" />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Minha Assinatura</Text>
                  <Text style={styles.actionSubtitle}>Gerenciar plano Pro, recibos e renovação</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666666" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                Alert.alert(
                  "Desconectar Outros Dispositivos",
                  "Todas as outras sessões ativas no seu celular ou tablet foram encerradas com segurança."
                );
              }}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="phone-portrait-outline" size={18} color="#D90000" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Desconectar Outros Dispositivos</Text>
                <Text style={styles.actionSubtitle}>Encerrar acessos em navegadores e aparelhos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* EXCLUIR CONTA */}
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Zona de Exclusão</Text>
            <Text style={styles.dangerText}>
              Caso deseje encerrar definitivamente sua conta e remover todos os seus dados dos nossos
              servidores, esta ação é irreversível.
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  "Confirmar Exclusão de Conta",
                  "Atenção: Todos os seus treinos, histórico e dados pessoais serão permanentemente deletados. Deseja continuar?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Excluir Definitivamente",
                      style: "destructive",
                      onPress: async () => {
                        await signOut("Conta excluída.");
                        Alert.alert("Conta Excluída", "Sua conta foi removida com sucesso.");
                        router.replace("/login");
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#FF5252" style={{ marginRight: 6 }} />
              <Text style={styles.deleteButtonText}>Excluir Minha Conta</Text>
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
    backgroundColor: "#0D0D0D",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
    backgroundColor: "#0D0D0D",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: "#777777",
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#221111",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "#D90000",
    backgroundColor: "#222222",
  },
  editAvatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#D90000",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#141414",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  profileEmail: {
    color: "#888888",
    fontSize: 13,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222222",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  planBadgePro: {
    backgroundColor: "#D90000",
  },
  planBadgeFree: {
    backgroundColor: "#1F1A1A",
    borderWidth: 1,
    borderColor: "#442222",
  },
  planBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
  },
  inputLabel: {
    color: "#BBBBBB",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#1D1D1D",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: "#181818",
    color: "#777777",
    borderColor: "#222222",
  },
  inputHelper: {
    color: "#666666",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 4,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 18,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
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
    borderBottomColor: "#1C1C1C",
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
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
    backgroundColor: "#161010",
    borderWidth: 1,
    borderColor: "#331818",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  dangerTitle: {
    color: "#FF5252",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  dangerText: {
    color: "#886666",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2B1111",
    borderWidth: 1,
    borderColor: "#551A1A",
    paddingVertical: 12,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: "#FF5252",
    fontSize: 13,
    fontWeight: "700",
  },
});
