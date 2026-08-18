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

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import {
  AppNotification,
  formatRelativeTime,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/feedback-store";

export default function MessagesScreen() {
  const layout = useResponsiveLayout();
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
      const items = await listNotificationsForUser(session.user.id);
      setNotifications(items);
    } catch {
      setError("Nao foi possivel carregar suas mensagens.");
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
        <Text style={styles.centerText}>Carregando mensagens...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={40} color="#ff4444" />
        <Text style={styles.centerTitle}>Falha ao carregar</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadNotifications()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View
        style={[
          styles.header,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.topPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
      >
        <View>
          <Text style={styles.title}>Mensagens</Text>
          <Text style={styles.subtitle}>Avisos, respostas e lembretes</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={20} color="#D90000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.tabBarContentPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor="#D90000" />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubbles-outline" size={36} color="#D90000" />
            <Text style={styles.centerTitle}>Nenhuma mensagem</Text>
            <Text style={styles.centerText}>Suas respostas e avisos aparecem aqui.</Text>
          </View>
        ) : null}

        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[styles.messageCard, !notification.read && styles.messageCardUnread]}
            onPress={() => handlePress(notification)}
          >
            <View style={styles.iconBox}>
              <Ionicons name={getNotificationIcon(notification.type)} size={20} color="#D90000" />
            </View>
            <View style={styles.messageTextBlock}>
              <Text style={styles.messageTitle}>{notification.title}</Text>
              <Text style={styles.messageText}>{notification.message}</Text>
              <Text style={styles.messageTime}>{formatRelativeTime(notification.createdAt)}</Text>
            </View>
            {!notification.read ? <View style={styles.unreadDot} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "feedback-response") return "chatbubble-ellipses-outline";
  if (type === "feedback-received") return "chatbubbles-outline";
  if (type === "workout") return "barbell-outline";
  if (type === "achievement") return "trophy-outline";
  if (type === "reminder") return "time-outline";
  return "notifications-outline";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  header: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: "#888",
    fontSize: 13,
    marginTop: 3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    alignSelf: "center",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },
  centerText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    marginBottom: 10,
    position: "relative",
  },
  messageCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#D90000",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  messageTextBlock: {
    flex: 1,
  },
  messageTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  messageText: {
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  messageTime: {
    color: "#666",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D90000",
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 22,
    alignItems: "center",
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: "#D90000",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
});
