import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

  const loadNotifications = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setNotifications(await listNotificationsForUser(session.user.id));
    } catch {
      setError("Nao foi possivel carregar as notificacoes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const markAllAsRead = async () => {
    if (!session) return;
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

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando notificacoes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notificacoes</Text>
          <Text style={styles.subtitle}>{notifications.filter((item) => !item.read).length} nao lida(s)</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={20} color="#D90000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor="#D90000" />}
      >
        {!!error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={34} color="#D90000" />
            <Text style={styles.emptyTitle}>Nenhuma notificacao</Text>
            <Text style={styles.emptyText}>Treinos, respostas e avisos aparecerao aqui.</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, !notification.read && styles.unreadCard]}
              onPress={() => handlePress(notification)}
            >
              <View style={styles.notificationIcon}>
                <Ionicons name="notifications-outline" size={20} color="#D90000" />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{formatRelativeTime(notification.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16 },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  title: { color: "#fff", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#888", fontSize: 12, fontWeight: "700", marginTop: 3 },
  content: { paddingHorizontal: 20, paddingBottom: 34 },
  notificationCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: "#D90000" },
  notificationIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  notificationContent: { flex: 1 },
  notificationTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  notificationMessage: { color: "#888", fontSize: 13, lineHeight: 19, marginTop: 5 },
  notificationTime: { color: "#666", fontSize: 11, marginTop: 8 },
  centerState: { flex: 1, backgroundColor: "#0f0f0fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  centerText: { color: "#888", marginTop: 10, textAlign: "center" },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ff4444",
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#fff", flex: 1, lineHeight: 19 },
  emptyCard: { backgroundColor: "#1c1c1c", borderRadius: 16, borderWidth: 1, borderColor: "#333", padding: 24, alignItems: "center" },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 10 },
  emptyText: { color: "#888", textAlign: "center", marginTop: 6, lineHeight: 20 },
});
