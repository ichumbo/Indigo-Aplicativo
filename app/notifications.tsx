import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCurrentSession } from "@/hooks/use-current-session";
import {
  AppNotification,
  formatRelativeTime,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/feedback-store";

export default function NotificationsScreen() {
  const { session, loadingSession } = useCurrentSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(
    async (asRefresh = false) => {
      if (!session) return;
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        setNotifications(await listNotificationsForUser(session.user.id));
      } catch {
        setError("Não foi possível carregar as notificações.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session]
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
});
