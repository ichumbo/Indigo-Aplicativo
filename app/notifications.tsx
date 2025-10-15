import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Novo treino disponível",
      message: "Seu treino Elite para hoje está pronto!",
      time: "2 min atrás",
      read: false,
      type: "workout"
    },
    {
      id: 2,
      title: "Meta atingida",
      message: "Parabéns! Você completou 75% dos treinos desta semana.",
      time: "1 hora atrás",
      read: false,
      type: "achievement"
    },
    {
      id: 3,
      title: "Lembrete de treino",
      message: "Não esqueça do seu treino de Endurance às 18h.",
      time: "3 horas atrás",
      read: true,
      type: "reminder"
    },
    {
      id: 4,
      title: "Novo exercício adicionado",
      message: "Confira o novo exercício: Bulgarian Split Squat",
      time: "1 dia atrás",
      read: true,
      type: "update"
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "workout":
        return "barbell-outline";
      case "achievement":
        return "trophy-outline";
      case "reminder":
        return "time-outline";
      case "update":
        return "add-circle-outline";
      default:
        return "notifications-outline";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={20} color="#fab12f" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((notification) => (
          <TouchableOpacity 
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.read && styles.unreadCard
            ]}
          >
            {!notification.read && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NOVA</Text>
              </View>
            )}
            <View style={styles.notificationIcon}>
              <Ionicons 
                name={getNotificationIcon(notification.type) as any}
                size={20} 
                color="#fab12f" 
              />
            </View>
            
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                {notification.title}
              </Text>
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              <Text style={styles.notificationTime}>
                {notification.time}
              </Text>
            </View>


          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030303",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  markAllButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCard: {
    backgroundColor: "#111",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#fab12f",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(250, 177, 47, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationMessage: {
    color: "#888",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    color: "#666",
    fontSize: 12,
  },

  newBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ff4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});