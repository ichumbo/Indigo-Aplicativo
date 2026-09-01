import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCurrentSession } from "@/hooks/use-current-session";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationPermissionModal } from "@/components/NotificationPermissionModal";
import {
  AppNotification,
  formatRelativeTime,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/feedback-store";

const WORKOUT_TIME_PRESETS = ["06:00", "07:00", "08:00", "09:00", "18:00", "19:00", "20:00"];
const HYDRATION_INTERVAL_PRESETS = [
  { label: "A cada 1h", value: 1 },
  { label: "A cada 2h", value: 2 },
  { label: "A cada 3h", value: 3 },
  { label: "A cada 4h", value: 4 },
];

export default function NotificationsScreen() {
  const { session, loadingSession } = useCurrentSession();
  const {
    permissionStatus,
    isPermissionGranted,
    isPermissionDenied,
    preferences,
    askPermission,
    updatePreferences,
    sendTestNotification,
    openSystemSettings,
    syncBadge,
  } = useNotifications();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  const isTrainer = session?.user?.role === "TRAINER";

  const loadNotifications = useCallback(
    async (asRefresh = false) => {
      if (!session) return;
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const list = await listNotificationsForUser(session.user.id);
        setNotifications(list);
        const unread = list.filter((n) => !n.read).length;
        await syncBadge(unread);
      } catch {
        setError("Não foi possível carregar as notificações.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session, syncBadge]
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  useEffect(() => {
    void syncBadge(unreadCount);
  }, [unreadCount, syncBadge]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.read);
    }
    return notifications;
  }, [notifications, activeFilter]);

  const markAllAsRead = async () => {
    if (!session || unreadCount === 0) return;
    await markAllNotificationsRead(session.user.id);
    await loadNotifications(true);
  };

  const handlePress = async (notification: AppNotification) => {
    if (!session) return;
    await markNotificationRead(notification.id, session.user.id);

    if (notification.feedbackId) {
      router.push({
        pathname: "/feedback-detail" as never,
        params: {
          id: notification.feedbackId,
          role: session.user.role === "STUDENT" ? "student" : "trainer",
          notificationId: notification.id,
        },
      });
      return;
    }

    await loadNotifications(true);
  };

  const handleSendTest = async () => {
    setTestingNotification(true);
    try {
      const id = await sendTestNotification(
        "DragonCorp Notificações 🐉",
        "Teste de notificação para iOS e Android disparado com sucesso!"
      );
      if (id) {
        Alert.alert("Sucesso", "Notificação de teste enviada para o seu dispositivo.");
      } else if (isPermissionDenied) {
        setPermissionModalVisible(true);
      }
    } catch {
      Alert.alert("Aviso", "Não foi possível disparar a notificação. Verifique as permissões.");
    } finally {
      setTestingNotification(false);
    }
  };

  const getNotificationIcon = (title: string, message: string) => {
    const t = `${title} ${message}`.toLowerCase();
    if (t.includes("treino") || t.includes("exercício")) return "barbell-outline";
    if (t.includes("feedback") || t.includes("resposta") || t.includes("mensagem"))
      return "chatbubble-ellipses-outline";
    if (t.includes("avaliação") || t.includes("reavaliação") || t.includes("anamnese"))
      return "clipboard-outline";
    if (t.includes("pagamento") || t.includes("assinatura") || t.includes("plano"))
      return "card-outline";
    return "notifications-outline";
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <SafeAreaView style={styles.centerState} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <ActivityIndicator color="#D90000" size="large" />
        <Text style={styles.centerText}>Carregando notificações...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

      {/* TOP BAR PADRONIZADA DRAGONCORP */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Notificações</Text>
          <View style={styles.unreadMetaRow}>
            {unreadCount > 0 && <View style={styles.unreadDot} />}
            <Text style={styles.headerSubtitle}>
              {unreadCount === 0
                ? "Tudo lido"
                : `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Configurações de notificações"
          >
            <Ionicons name="options-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={markAllAsRead}
            activeOpacity={0.75}
            disabled={unreadCount === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Marcar todas como lidas"
          >
            <Ionicons
              name="checkmark-done"
              size={18}
              color={unreadCount > 0 ? "#D90000" : "#52525B"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* BANNER DE PERMISSÃO PENDENTE / NEGADA */}
      {!isPermissionGranted && (
        <TouchableOpacity
          style={[styles.permissionBanner, isPermissionDenied && styles.permissionBannerDenied]}
          onPress={() => setPermissionModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.permissionBannerIcon}>
            <Ionicons
              name={isPermissionDenied ? "alert-circle" : "notifications"}
              size={18}
              color="#D90000"
            />
          </View>
          <View style={styles.permissionBannerTextCol}>
            <Text style={styles.permissionBannerTitle}>
              {isPermissionDenied ? "Notificações desativadas" : "Ativar alertas no seu celular"}
            </Text>
            <Text style={styles.permissionBannerDesc}>
              {isPermissionDenied
                ? "Toque para abrir os Ajustes e liberar os lembretes de treinos e avisos."
                : "Receba lembretes de treino, hidratação e mensagens em tempo real."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#71717A" />
        </TouchableOpacity>
      )}

      {/* SEGMENTED FILTER TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeFilter === "all" && styles.tabButtonActive]}
          onPress={() => setActiveFilter("all")}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabButtonText, activeFilter === "all" && styles.tabButtonTextActive]}
          >
            Todas ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeFilter === "unread" && styles.tabButtonActive]}
          onPress={() => setActiveFilter("unread")}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabButtonText, activeFilter === "unread" && styles.tabButtonTextActive]}
          >
            Não Lidas ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor="#D90000"
          />
        }
      >
        {!!error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#FF4D4D" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={32} color="#D90000" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === "unread" ? "Nenhuma Pendente" : "Nenhuma Notificação"}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilter === "unread"
                ? "Você já leu todos os seus avisos e atualizações recentes."
                : "Você está 100% em dia! Novos treinos, feedbacks e alertas aparecerão aqui."}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => {
            const iconName = getNotificationIcon(notification.title, notification.message);
            const isUnread = !notification.read;

            return (
              <TouchableOpacity
                key={notification.id}
                style={[styles.notificationCard, isUnread && styles.unreadCard]}
                onPress={() => handlePress(notification)}
                activeOpacity={0.8}
              >
                <View style={[styles.notificationIconWrap, isUnread && styles.unreadIconWrap]}>
                  <Ionicons
                    name={iconName}
                    size={18}
                    color={isUnread ? "#D90000" : "#A0A0A5"}
                  />
                </View>

                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeaderRow}>
                    <Text
                      style={[styles.notificationTitle, isUnread && styles.unreadTitleText]}
                      numberOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    {isUnread && <View style={styles.cardUnreadBadge} />}
                  </View>

                  <Text style={styles.notificationMessage} numberOfLines={3}>
                    {notification.message}
                  </Text>

                  <View style={styles.notificationFooter}>
                    <Ionicons name="time-outline" size={12} color="#71717A" />
                    <Text style={styles.notificationTime}>
                      {formatRelativeTime(notification.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* MODAL DE PREFERÊNCIAS E AJUSTES DE NOTIFICAÇÃO */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSettingsModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.settingsModalCard}>
                <View style={styles.settingsModalHeader}>
                  <View>
                    <Text style={styles.settingsModalTitle}>Preferências de Alertas</Text>
                    <Text style={styles.settingsModalSubtitle}>Personalize seus lembretes e sons</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeModalBtn}
                    onPress={() => setSettingsModalVisible(false)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={20} color="#A1A1AA" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsScroll}>
                  {/* STATUS DA PERMISSÃO NATIVA */}
                  <View style={styles.prefSectionCard}>
                    <View style={styles.prefRow}>
                      <View style={styles.prefLabelCol}>
                        <Text style={styles.prefTitle}>Status no Aparelho</Text>
                        <Text style={styles.prefDesc}>
                          {isPermissionGranted
                            ? "Permissão concedida no sistema"
                            : isPermissionDenied
                            ? "Permissão bloqueada nos Ajustes"
                            : "Ainda não solicitada"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.statusBadge,
                          isPermissionGranted && styles.statusBadgeGranted,
                          isPermissionDenied && styles.statusBadgeDenied,
                        ]}
                        onPress={() => {
                          if (isPermissionDenied) openSystemSettings();
                          else void askPermission();
                        }}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isPermissionGranted && styles.statusBadgeTextGranted,
                          ]}
                        >
                          {isPermissionGranted ? "Ativo" : isPermissionDenied ? "Ajustes" : "Ativar"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* LEMBRETE DIÁRIO DE TREINO */}
                  <View style={styles.prefSectionCard}>
                    <View style={styles.prefRow}>
                      <View style={styles.prefLabelCol}>
                        <Text style={styles.prefTitle}>Lembrete Diário de Treino</Text>
                        <Text style={styles.prefDesc}>Notificação no horário programado</Text>
                      </View>
                      <Switch
                        value={preferences.workoutReminderEnabled}
                        onValueChange={(val) => {
                          void updatePreferences({ workoutReminderEnabled: val });
                        }}
                        trackColor={{ false: "#262626", true: "rgba(217, 0, 0, 0.4)" }}
                        thumbColor={preferences.workoutReminderEnabled ? "#D90000" : "#71717A"}
                      />
                    </View>

                    {preferences.workoutReminderEnabled && (
                      <View style={styles.presetRow}>
                        <Text style={styles.presetLabel}>Horário:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                          {WORKOUT_TIME_PRESETS.map((t) => {
                            const isSelected = preferences.workoutReminderTime === t;
                            return (
                              <TouchableOpacity
                                key={t}
                                style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                                onPress={() => {
                                  void updatePreferences({ workoutReminderTime: t });
                                }}
                              >
                                <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                                  {t}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* LEMBRETE DE HIDRATAÇÃO */}
                  <View style={styles.prefSectionCard}>
                    <View style={styles.prefRow}>
                      <View style={styles.prefLabelCol}>
                        <Text style={styles.prefTitle}>Lembrete de Hidratação 💧</Text>
                        <Text style={styles.prefDesc}>Alertas entre 08:00 e 20:00</Text>
                      </View>
                      <Switch
                        value={preferences.hydrationReminderEnabled}
                        onValueChange={(val) => {
                          void updatePreferences({ hydrationReminderEnabled: val });
                        }}
                        trackColor={{ false: "#262626", true: "rgba(59, 130, 246, 0.4)" }}
                        thumbColor={preferences.hydrationReminderEnabled ? "#3B82F6" : "#71717A"}
                      />
                    </View>

                    {preferences.hydrationReminderEnabled && (
                      <View style={styles.presetRow}>
                        <Text style={styles.presetLabel}>Frequência:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                          {HYDRATION_INTERVAL_PRESETS.map((preset) => {
                            const isSelected = preferences.hydrationIntervalHours === preset.value;
                            return (
                              <TouchableOpacity
                                key={preset.value}
                                style={[styles.timeChip, isSelected && styles.timeChipSelectedBlue]}
                                onPress={() => {
                                  void updatePreferences({ hydrationIntervalHours: preset.value });
                                }}
                              >
                                <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                                  {preset.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* PREFERÊNCIAS DO PERSONAL TRAINER */}
                  {isTrainer && (
                    <>
                      <View style={styles.prefSectionCard}>
                        <View style={styles.prefRow}>
                          <View style={styles.prefLabelCol}>
                            <Text style={styles.prefTitle}>Resumo Semanal da Consultoria</Text>
                            <Text style={styles.prefDesc}>Toda segunda-feira com estatísticas da semana</Text>
                          </View>
                          <Switch
                            value={preferences.trainerWeeklySummaryEnabled}
                            onValueChange={(val) => {
                              void updatePreferences({ trainerWeeklySummaryEnabled: val });
                            }}
                            trackColor={{ false: "#262626", true: "rgba(217, 0, 0, 0.4)" }}
                            thumbColor={preferences.trainerWeeklySummaryEnabled ? "#D90000" : "#71717A"}
                          />
                        </View>
                      </View>

                      <View style={styles.prefSectionCard}>
                        <View style={styles.prefRow}>
                          <View style={styles.prefLabelCol}>
                            <Text style={styles.prefTitle}>Alertas de Dor e Relatos</Text>
                            <Text style={styles.prefDesc}>Notificação imediata se o aluno relatar dor</Text>
                          </View>
                          <Switch
                            value={preferences.painAlertsEnabled}
                            onValueChange={(val) => {
                              void updatePreferences({ painAlertsEnabled: val });
                            }}
                            trackColor={{ false: "#262626", true: "rgba(217, 0, 0, 0.4)" }}
                            thumbColor={preferences.painAlertsEnabled ? "#D90000" : "#71717A"}
                          />
                        </View>
                      </View>
                    </>
                  )}

                  {/* TESTE DE NOTIFICAÇÃO */}
                  <TouchableOpacity
                    style={styles.testNotificationBtn}
                    onPress={handleSendTest}
                    disabled={testingNotification}
                    activeOpacity={0.85}
                  >
                    {testingNotification ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.testNotificationBtnText}>Enviar Notificação de Teste</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL DE SOLICITAÇÃO DE PERMISSÃO */}
      <NotificationPermissionModal
        visible={permissionModalVisible}
        onClose={() => setPermissionModalVisible(false)}
        onRequestPermission={askPermission}
        onOpenSettings={openSystemSettings}
        permissionStatus={permissionStatus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: "#0F0F0F",
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  unreadMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D90000",
  },
  headerSubtitle: {
    color: "#71717A",
    fontSize: 11.5,
    fontWeight: "600",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.25)",
  },
  permissionBannerDenied: {
    backgroundColor: "rgba(234, 179, 8, 0.08)",
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  permissionBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionBannerTextCol: {
    flex: 1,
  },
  permissionBannerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  permissionBannerDesc: {
    color: "#A1A1AA",
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    padding: 3,
    borderRadius: 12,
    backgroundColor: "#16161A",
    borderWidth: 1,
    borderColor: "#24242B",
    gap: 4,
  },
  tabButton: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#262630",
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  notificationCard: {
    backgroundColor: "#141416",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222228",
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  unreadCard: {
    borderColor: "rgba(217, 0, 0, 0.35)",
    backgroundColor: "#171416",
  },
  notificationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1D1D24",
    borderWidth: 1,
    borderColor: "#2B2B36",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadIconWrap: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  notificationTitle: {
    color: "#E4E4E7",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  unreadTitleText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  cardUnreadBadge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#D90000",
  },
  notificationMessage: {
    color: "#8E8E93",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  notificationTime: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "500",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerText: {
    color: "#8E8E93",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 77, 77, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 77, 77, 0.3)",
    padding: 12,
    marginBottom: 4,
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 12.5,
    flex: 1,
  },
  emptyCard: {
    backgroundColor: "#141416",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222228",
    padding: 28,
    alignItems: "center",
    marginTop: 16,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: "#71717A",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  settingsModalCard: {
    backgroundColor: "#161616",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 20,
    maxHeight: "85%",
  },
  settingsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  settingsModalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  settingsModalSubtitle: {
    color: "#71717A",
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  settingsScroll: {
    maxHeight: 460,
  },
  prefSectionCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2E",
    padding: 14,
    marginBottom: 12,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prefLabelCol: {
    flex: 1,
    marginRight: 12,
  },
  prefTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  prefDesc: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(217, 0, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
  },
  statusBadgeGranted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBadgeDenied: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  statusBadgeText: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgeTextGranted: {
    color: "#10B981",
  },
  presetRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2E",
    flexDirection: "row",
    alignItems: "center",
  },
  presetLabel: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  presetScroll: {
    flex: 1,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#26262A",
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#33333A",
  },
  timeChipSelected: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  timeChipSelectedBlue: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  timeChipText: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "600",
  },
  timeChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  testNotificationBtn: {
    height: 46,
    backgroundColor: "#D90000",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 20,
  },
  testNotificationBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
