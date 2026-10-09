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
import { useTrainerBranding } from "@/hooks/use-trainer-branding";
import { StandardScreenHeader } from "@/components/StandardScreenHeader";
import { NotificationPermissionModal } from "@/components/NotificationPermissionModal";
import {
  AppNotification,
  formatRelativeTime,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  dismissNotification,
} from "@/services/feedback-store";
import { navigateNotificationDeepLink } from "@/services/notification-deep-link-handler";

const WORKOUT_TIME_PRESETS = ["06:00", "07:00", "08:00", "09:00", "18:00", "19:00", "20:00"];
const HYDRATION_INTERVAL_PRESETS = [
  { label: "A cada 1h", value: 1 },
  { label: "A cada 2h", value: 2 },
  { label: "A cada 3h", value: 3 },
  { label: "A cada 4h", value: 4 },
];

type FilterCategory = "all" | "unread" | "workout" | "assessment" | "pain" | "message" | "system";

const FILTER_TABS: { id: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "all", label: "Todas", icon: "layers-outline" },
  { id: "unread", label: "Não lidas", icon: "mail-unread-outline" },
  { id: "workout", label: "Treinos", icon: "barbell-outline" },
  { id: "assessment", label: "Avaliações", icon: "clipboard-outline" },
  { id: "pain", label: "Dores & Feedbacks", icon: "alert-circle-outline" },
  { id: "message", label: "Mensagens", icon: "chatbubbles-outline" },
  { id: "system", label: "Sistema", icon: "settings-outline" },
];

interface GroupedNotifications {
  title: string;
  data: AppNotification[];
}

function groupNotificationsByDate(items: AppNotification[]): GroupedNotifications[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const today: AppNotification[] = [];
  const yesterday: AppNotification[] = [];
  const thisWeek: AppNotification[] = [];
  const older: AppNotification[] = [];

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (isNaN(t) || t >= startOfToday) {
      today.push(item);
    } else if (t >= startOfYesterday) {
      yesterday.push(item);
    } else if (t >= startOfWeek) {
      thisWeek.push(item);
    } else {
      older.push(item);
    }
  }

  const groups: GroupedNotifications[] = [];
  if (today.length > 0) groups.push({ title: "Hoje", data: today });
  if (yesterday.length > 0) groups.push({ title: "Ontem", data: yesterday });
  if (thisWeek.length > 0) groups.push({ title: "Esta semana", data: thisWeek });
  if (older.length > 0) groups.push({ title: "Anteriores", data: older });

  return groups;
}

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
  const { primaryColor } = useTrainerBranding();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  const isTrainer = session?.user?.role === "TRAINER";
  const brandColor = primaryColor || "#D90000";

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
    return notifications.filter((item) => {
      if (activeFilter === "unread") return !item.read;
      if (activeFilter === "workout") return item.category === "workout";
      if (activeFilter === "assessment") return item.category === "assessment";
      if (activeFilter === "pain") {
        return (
          item.category === "pain" ||
          item.category === "pain_report" ||
          item.category === "feedback" ||
          item.category === "readiness" ||
          item.highlightPain === true ||
          item.type === "pain_alert" ||
          item.type === "feedback-received" ||
          item.type === "feedback-response"
        );
      }
      if (activeFilter === "message") return item.category === "message";
      if (activeFilter === "system") {
        return (
          item.category === "subscription" ||
          item.category === "system" ||
          item.category === "appointment" ||
          item.category === "achievement" ||
          item.category === "hydration" ||
          item.type === "system"
        );
      }
      return true;
    });
  }, [notifications, activeFilter]);

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  );

  const markAllAsRead = async () => {
    if (!session || unreadCount === 0) return;
    await markAllNotificationsRead(session.user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await syncBadge(0);
  };

  const handlePress = async (notification: AppNotification) => {
    if (!session) return;
    await markNotificationRead(notification.id, session.user.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );

    if (notification.deepLink) {
      const navigated = navigateNotificationDeepLink(notification.deepLink, {
        isAuthenticated: true,
        userId: session.user.id,
        role: session.user.role as "TRAINER" | "STUDENT" | "ADMIN",
      });
      if (navigated) return;
    }

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

  const handleDismiss = async (notificationId: string) => {
    if (!session) return;
    await dismissNotification(notificationId, session.user.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
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

  const getNotificationIconDetails = (notification: AppNotification) => {
    const isPain =
      notification.highlightPain ||
      notification.category === "pain" ||
      notification.category === "pain_report" ||
      notification.type === "pain_alert";

    if (isPain) {
      return { icon: "alert-circle" as keyof typeof Ionicons.glyphMap, color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)" };
    }
    if (notification.category === "workout" || notification.type === "workout") {
      return { icon: "barbell-outline" as keyof typeof Ionicons.glyphMap, color: "#3B82F6", bg: "rgba(59, 130, 246, 0.15)" };
    }
    if (notification.category === "assessment") {
      return { icon: "clipboard-outline" as keyof typeof Ionicons.glyphMap, color: "#10B981", bg: "rgba(16, 185, 129, 0.15)" };
    }
    if (notification.category === "feedback") {
      return { icon: "chatbubble-ellipses-outline" as keyof typeof Ionicons.glyphMap, color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.15)" };
    }
    if (notification.category === "message") {
      return { icon: "mail-outline" as keyof typeof Ionicons.glyphMap, color: "#06B6D4", bg: "rgba(6, 182, 212, 0.15)" };
    }
    if (notification.category === "subscription") {
      return { icon: "card-outline" as keyof typeof Ionicons.glyphMap, color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" };
    }
    if (notification.category === "hydration") {
      return { icon: "water-outline" as keyof typeof Ionicons.glyphMap, color: "#38BDF8", bg: "rgba(56, 189, 248, 0.15)" };
    }
    if (notification.category === "readiness") {
      return { icon: "pulse-outline" as keyof typeof Ionicons.glyphMap, color: "#EC4899", bg: "rgba(236, 72, 153, 0.15)" };
    }
    return { icon: "notifications-outline" as keyof typeof Ionicons.glyphMap, color: "#A0A0A5", bg: "#1D1D24" };
  };

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <ActivityIndicator color={brandColor} size="large" />
        <Text style={styles.centerText}>Carregando notificações...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

      {/* CABEÇALHO PADRONIZADO */}
      <StandardScreenHeader
        title="Notificações"
        subtitle={
          unreadCount === 0
            ? "Tudo lido"
            : `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`
        }
        onBack={() => router.back()}
        actions={[
          {
            icon: "options-outline",
            onPress: () => setSettingsModalVisible(true),
            accessibilityLabel: "Configurações de notificações",
          },
          {
            icon: "checkmark-done",
            onPress: markAllAsRead,
            disabled: unreadCount === 0,
            color: unreadCount > 0 ? brandColor : "#52525B",
            accessibilityLabel: "Marcar todas como lidas",
          },
        ]}
      />

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
              color="#EF4444"
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

      {/* CHIPS DE FILTRO HORIZONTAIS */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab.id;
            const count =
              tab.id === "all"
                ? notifications.length
                : tab.id === "unread"
                ? unreadCount
                : undefined;

            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterChip,
                  isSelected && {
                    backgroundColor: `${brandColor}22`,
                    borderColor: brandColor,
                  },
                ]}
                onPress={() => setActiveFilter(tab.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isSelected ? brandColor : "#A1A1AA"}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && { color: "#FFFFFF", fontWeight: "700" },
                  ]}
                >
                  {tab.label}
                  {typeof count === "number" ? ` (${count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor={brandColor}
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
              <Ionicons name="notifications-off-outline" size={32} color={brandColor} />
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
          groupedNotifications.map((group) => (
            <View key={group.title} style={styles.dateGroup}>
              <Text style={styles.dateGroupTitle}>{group.title.toUpperCase()}</Text>

              {group.data.map((notification) => {
                const iconDetails = getNotificationIconDetails(notification);
                const isUnread = !notification.read;
                const isCritical =
                  notification.priority === "critical" || notification.highlightPain;
                const isHigh = notification.priority === "high";

                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[styles.notificationCard, isUnread && styles.unreadCard]}
                    onPress={() => handlePress(notification)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.notificationIconWrap,
                        { backgroundColor: iconDetails.bg, borderColor: `${iconDetails.color}40` },
                      ]}
                    >
                      <Ionicons
                        name={iconDetails.icon}
                        size={18}
                        color={iconDetails.color}
                      />
                    </View>

                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeaderRow}>
                        <View style={styles.titleContainer}>
                          <Text
                            style={[
                              styles.notificationTitle,
                              isUnread && styles.unreadTitleText,
                            ]}
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>
                          {isUnread && <View style={styles.cardUnreadBadge} />}
                        </View>

                        <View style={styles.headerRightActionsWrap}>
                          {isCritical && (
                            <View style={styles.priorityCriticalBadge}>
                              <Text style={styles.priorityCriticalText}>Crítica</Text>
                            </View>
                          )}
                          {!isCritical && isHigh && (
                            <View style={styles.priorityHighBadge}>
                              <Text style={styles.priorityHighText}>Alta</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => handleDismiss(notification.id)}
                            hitSlop={8}
                            style={styles.dismissBtn}
                            accessibilityLabel="Dispensar notificação"
                          >
                            <Ionicons name="close" size={16} color="#71717A" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={styles.notificationMessage} numberOfLines={3}>
                        {notification.message}
                      </Text>

                      <View style={styles.notificationFooter}>
                        <Ionicons name="time-outline" size={12} color="#71717A" />
                        <Text style={styles.notificationTime}>
                          {formatRelativeTime(notification.createdAt)}
                        </Text>
                        {notification.category && (
                          <Text style={styles.categoryBadgeText}>
                            • {notification.category}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
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
                        trackColor={{ false: "#262626", true: `${brandColor}66` }}
                        thumbColor={preferences.workoutReminderEnabled ? brandColor : "#71717A"}
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
                                style={[
                                  styles.timeChip,
                                  isSelected && { backgroundColor: brandColor, borderColor: brandColor },
                                ]}
                                onPress={() => {
                                  void updatePreferences({ workoutReminderTime: t });
                                }}
                              >
                                <Text
                                  style={[
                                    styles.timeChipText,
                                    isSelected && styles.timeChipTextSelected,
                                  ]}
                                >
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
                        <Text style={styles.prefDesc}>Alertas periódicos entre 08:00 e 20:00 (opt-in)</Text>
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
                            trackColor={{ false: "#262626", true: `${brandColor}66` }}
                            thumbColor={preferences.trainerWeeklySummaryEnabled ? brandColor : "#71717A"}
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
                            trackColor={{ false: "#262626", true: "rgba(239, 68, 68, 0.4)" }}
                            thumbColor={preferences.painAlertsEnabled ? "#EF4444" : "#71717A"}
                          />
                        </View>
                      </View>
                    </>
                  )}

                  {/* TESTE DE NOTIFICAÇÃO */}
                  <TouchableOpacity
                    style={[styles.testNotificationBtn, { backgroundColor: brandColor }]}
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
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  permissionBannerDenied: {
    backgroundColor: "rgba(234, 179, 8, 0.08)",
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  permissionBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
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
  filtersWrapper: {
    marginVertical: 6,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#16161A",
    borderWidth: 1,
    borderColor: "#27272F",
  },
  filterChipText: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  dateGroup: {
    gap: 8,
  },
  dateGroupTitle: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
    paddingLeft: 4,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationTitle: {
    color: "#E4E4E7",
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  unreadTitleText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  cardUnreadBadge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
  },
  headerRightActionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priorityCriticalBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityCriticalText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "700",
  },
  priorityHighBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityHighText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "700",
  },
  dismissBtn: {
    padding: 2,
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
  categoryBadgeText: {
    color: "#52525B",
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
