import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/use-app-theme";
import { NotificationPermissionStatus } from "@/services/native-notification-service";

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<boolean>;
  onOpenSettings: () => void;
  permissionStatus: NotificationPermissionStatus;
}

export function NotificationPermissionModal({
  visible,
  onClose,
  onRequestPermission,
  onOpenSettings,
  permissionStatus,
}: NotificationPermissionModalProps) {
  const { theme } = useAppTheme();
  const isDenied = permissionStatus === "denied";

  const handlePrimaryAction = async () => {
    if (isDenied) {
      onOpenSettings();
      onClose();
    } else {
      const granted = await onRequestPermission();
      if (granted) {
        onClose();
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {/* ÍCONE DE DESTAQUE */}
              <View style={styles.iconCircle}>
                <Ionicons name="notifications" size={32} color="#D90000" />
              </View>

              {/* TÍTULO E SUBTÍTULO */}
              <Text style={[styles.title, { color: theme.text }]}>
                {isDenied ? "Ativar Notificações nos Ajustes" : "Fique por dentro de tudo"}
              </Text>

              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {isDenied
                  ? "As notificações estão desativadas no seu aparelho. Para receber alertas de treinos, mensagens e hidratação, ative-as nas configurações do sistema."
                  : "Receba alertas essenciais para maximizar seus resultados e não perder nenhum detalhe importante do seu acompanhamento."}
              </Text>

              {/* ITENS DE BENEFÍCIOS */}
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIconBox}>
                    <Ionicons name="barbell" size={16} color="#D90000" />
                  </View>
                  <View style={styles.benefitTextCol}>
                    <Text style={[styles.benefitTitle, { color: theme.text }]}>Lembretes de Treino</Text>
                    <Text style={[styles.benefitDesc, { color: theme.textMuted }]}>
                      Horários programados e treinos liberados
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIconBox}>
                    <Ionicons name="water" size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.benefitTextCol}>
                    <Text style={[styles.benefitTitle, { color: theme.text }]}>Meta de Hidratação</Text>
                    <Text style={[styles.benefitDesc, { color: theme.textMuted }]}>
                      Alertas distribuídos para bater sua meta diária
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIconBox}>
                    <Ionicons name="chatbubbles" size={16} color="#10B981" />
                  </View>
                  <View style={styles.benefitTextCol}>
                    <Text style={[styles.benefitTitle, { color: theme.text }]}>Mensagens e Feedbacks</Text>
                    <Text style={[styles.benefitDesc, { color: theme.textMuted }]}>
                      Orientações ao vivo e alertas de dor
                    </Text>
                  </View>
                </View>
              </View>

              {/* BOTÕES DE AÇÃO */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePrimaryAction}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>
                  {isDenied
                    ? Platform.OS === "ios"
                      ? "Abrir Ajustes do iPhone"
                      : "Abrir Configurações do Android"
                    : "Permitir Notificações"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.textMuted }]}>
                  {isDenied ? "Fechar" : "Agora não"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  benefitsList: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  benefitDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  primaryButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#D90000",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
