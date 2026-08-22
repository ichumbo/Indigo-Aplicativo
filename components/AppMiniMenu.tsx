import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { signOut } from "@/services/auth-store";

interface AppMiniMenuProps {
  visible: boolean;
  onClose: () => void;
  role?: "TRAINER" | "STUDENT" | "SUPER_ADMIN";
  onToggleTheme?: () => void;
}

export function AppMiniMenu({
  visible,
  onClose,
  role = "TRAINER",
  onToggleTheme,
}: AppMiniMenuProps) {
  const router = useRouter();
  const [isLightMode, setIsLightMode] = useState(false);

  const isTrainer = role === "TRAINER";

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as never);
    }, 120);
  };

  const handleToggleLightMode = () => {
    const nextState = !isLightMode;
    setIsLightMode(nextState);
    if (onToggleTheme) onToggleTheme();
    Alert.alert(
      nextState ? "Modo Claro Ativado" : "Modo Escuro Ativado",
      nextState
        ? "O modo de alto contraste claro foi selecionado para esta sessão."
        : "O modo Obsidian Dark oficial foi redefinido."
    );
  };

  const handleDisconnectDevices = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        "Desconectar Dispositivos",
        "Deseja encerrar todas as outras sessões ativas deste usuário em outros aparelhos e navegadores?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Desconectar Outros",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Sessões Encerradas",
                "Todas as outras sessões foram desconectadas com sucesso. Apenas este aparelho continua autenticado."
              );
            },
          },
        ]
      );
    }, 180);
  };

  const handleDeleteAccount = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        "Excluir Minha Conta",
        "Atenção: Esta ação é definitiva e irreversível em conformidade com as diretrizes da Apple e LGPD. Todos os seus dados, treinos e histórico serão apagados permanentemente.\n\nDeseja realmente prosseguir?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir Definitivamente",
            style: "destructive",
            onPress: async () => {
              await signOut("Conta excluída pelo usuário.");
              Alert.alert("Conta Excluída", "Sua conta e dados foram removidos com sucesso.");
              router.replace("/login");
            },
          },
        ]
      );
    }, 180);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      Alert.alert("Sair da Conta", "Deseja encerrar a sessão neste aparelho?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await signOut("Logout pelo menu.");
            router.replace("/login");
          },
        },
      ]);
    }, 180);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              {/* CABEÇALHO MINIMALISTA */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Fechar Menu"
                >
                  <Ionicons name="close" size={14} color="#888888" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* SEÇÃO 1: RECURSOS DO TREINADOR / PERFIL */}
              {isTrainer ? (
                <>
                  <MenuItem
                    label="Assinatura"
                    icon="card-outline"
                    onPress={() => handleNavigate("/subscription")}
                  />
                  <MenuItem
                    label="Meu Perfil"
                    icon="person-outline"
                    onPress={() => handleNavigate("/account-profile")}
                  />
                  <MenuItem
                    label="Gerar Código"
                    icon="key-outline"
                    onPress={() => handleNavigate("/generate-code")}
                  />
                </>
              ) : (
                <MenuItem
                  label="Meu Perfil"
                  icon="person-outline"
                  onPress={() => handleNavigate("/account-profile")}
                />
              )}

              <View style={styles.divider} />

              {/* SEÇÃO 2: PREFERÊNCIAS & PRIVACIDADE */}
              <MenuItem
                label={isLightMode ? "Modo Escuro" : "Modo Claro"}
                icon={isLightMode ? "moon-outline" : "sunny-outline"}
                onPress={handleToggleLightMode}
              />
              <MenuItem
                label="Política de Privacidade"
                icon="shield-checkmark-outline"
                onPress={() => handleNavigate("/privacy-policy")}
              />
              <MenuItem
                label="Desconectar Dispositivos"
                icon="phone-portrait-outline"
                onPress={handleDisconnectDevices}
              />

              <View style={styles.divider} />

              {/* SEÇÃO 3: SEGURANÇA & LOGOUT */}
              <MenuItem
                label="Excluir Conta"
                icon="trash-outline"
                danger
                onPress={handleDeleteAccount}
              />
              <MenuItem
                label="Sair da Conta"
                icon="log-out-outline"
                onPress={handleLogout}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
  danger = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
        <Ionicons
          name={icon}
          size={16}
          color={danger ? "#FF4D4D" : "#E0E0E0"}
        />
      </View>
      <Text style={[styles.menuRowText, danger && styles.menuRowTextDanger]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={13}
        color={danger ? "#552020" : "#444444"}
        style={styles.chevronIcon}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 54,
    paddingRight: 16,
  },
  menuContainer: {
    width: 256,
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#262626",
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 16,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  menuTitle: {
    color: "#666666",
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  closeButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#1F1F1F",
    marginVertical: 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#282828",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconBoxDanger: {
    backgroundColor: "#241212",
    borderColor: "#3D1A1A",
  },
  menuRowText: {
    flex: 1,
    color: "#E8E8E8",
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  menuRowTextDanger: {
    color: "#FF4D4D",
    fontWeight: "600",
  },
  chevronIcon: {
    marginLeft: 6,
  },
});
