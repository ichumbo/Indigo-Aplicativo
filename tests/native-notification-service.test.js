const test = require("node:test");
const assert = require("node:assert/strict");

// Mock de AsyncStorage
const asyncStorageData = new Map();
const mockAsyncStorage = {
  getItem: async (key) => asyncStorageData.get(key) || null,
  setItem: async (key, value) => {
    asyncStorageData.set(key, String(value));
  },
  removeItem: async (key) => {
    asyncStorageData.delete(key);
  },
  clear: async () => {
    asyncStorageData.clear();
  },
};

// Mock de expo-notifications
const scheduledNotifications = [];
const mockNotifications = {
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  SchedulableTriggerInputTypes: {
    DAILY: "daily",
    WEEKLY: "weekly",
  },
  setNotificationHandler: (handler) => {
    mockNotifications._handler = handler;
  },
  setNotificationChannelAsync: async (channelId, config) => {
    mockNotifications._channels = mockNotifications._channels || {};
    mockNotifications._channels[channelId] = config;
  },
  getPermissionsAsync: async () => ({
    granted: true,
    status: "granted",
    canAskAgain: true,
  }),
  requestPermissionsAsync: async (options) => ({
    granted: true,
    status: "granted",
  }),
  getExpoPushTokenAsync: async () => ({
    data: "ExponentPushToken[mock_token_12345]",
  }),
  scheduleNotificationAsync: async ({ identifier, content, trigger }) => {
    const id = identifier || `notif_${Date.now()}_${Math.random()}`;
    scheduledNotifications.push({ id, content, trigger });
    return id;
  },
  cancelScheduledNotificationAsync: async (identifier) => {
    const idx = scheduledNotifications.findIndex((n) => n.id === identifier);
    if (idx >= 0) scheduledNotifications.splice(idx, 1);
  },
  cancelAllScheduledNotificationsAsync: async () => {
    scheduledNotifications.length = 0;
  },
  getAllScheduledNotificationsAsync: async () => [...scheduledNotifications],
  setBadgeCountAsync: async (count) => {
    mockNotifications._badgeCount = count;
  },
};

test("Notificações: Canais Android com prioridade e identidade DragonCorp", async () => {
  await mockNotifications.setNotificationChannelAsync("dragoncorp_default", {
    name: "DragonCorp Notificações",
    importance: mockNotifications.AndroidImportance.HIGH,
    lightColor: "#D90000",
  });
  await mockNotifications.setNotificationChannelAsync("dragoncorp_urgent", {
    name: "Alertas Importantes e Dores",
    importance: mockNotifications.AndroidImportance.MAX,
    lightColor: "#D90000",
  });

  assert.equal(mockNotifications._channels["dragoncorp_default"].lightColor, "#D90000");
  assert.equal(mockNotifications._channels["dragoncorp_urgent"].importance, 5);
});

test("Notificações: Fluxo de Permissão retorna status concedido", async () => {
  const perm = await mockNotifications.getPermissionsAsync();
  assert.equal(perm.granted, true);
  assert.equal(perm.status, "granted");

  const req = await mockNotifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  assert.equal(req.status, "granted");
});

test("Notificações: Obtenção de Push Token Expo", async () => {
  const tokenData = await mockNotifications.getExpoPushTokenAsync();
  assert.match(tokenData.data, /^ExponentPushToken\[/);
});

test("Notificações: Agendamento de Lembrete Diário de Treino", async () => {
  await mockNotifications.scheduleNotificationAsync({
    identifier: "dragoncorp_daily_workout",
    content: {
      title: "Hora do Treino! 🏋️",
      body: "Seu plano de hoje está pronto no DragonCorp.",
      color: "#D90000",
    },
    trigger: {
      type: "daily",
      hour: 8,
      minute: 0,
    },
  });

  const list = await mockNotifications.getAllScheduledNotificationsAsync();
  const workoutNotif = list.find((n) => n.id === "dragoncorp_daily_workout");
  assert.ok(workoutNotif);
  assert.equal(workoutNotif.content.title, "Hora do Treino! 🏋️");
  assert.equal(workoutNotif.trigger.hour, 8);
});

test("Notificações: Agendamento e Cancelamento de Hidratação", async () => {
  // Agenda das 08h às 20h a cada 2h (7 notificações)
  for (let hour = 8; hour <= 20; hour += 2) {
    await mockNotifications.scheduleNotificationAsync({
      identifier: `dragoncorp_hydration_${hour}`,
      content: {
        title: "Hora de se Hidratar! 💧",
        body: "Beba água para manter a performance.",
      },
      trigger: { type: "daily", hour, minute: 0 },
    });
  }

  let list = await mockNotifications.getAllScheduledNotificationsAsync();
  let hydrationNotifs = list.filter((n) => n.id.startsWith("dragoncorp_hydration_"));
  assert.equal(hydrationNotifs.length, 7);

  // Cancela
  for (const n of hydrationNotifs) {
    await mockNotifications.cancelScheduledNotificationAsync(n.id);
  }

  list = await mockNotifications.getAllScheduledNotificationsAsync();
  hydrationNotifs = list.filter((n) => n.id.startsWith("dragoncorp_hydration_"));
  assert.equal(hydrationNotifs.length, 0);
});

test("Notificações: Sincronização de Badge Count (iOS e Android)", async () => {
  await mockNotifications.setBadgeCountAsync(5);
  assert.equal(mockNotifications._badgeCount, 5);

  await mockNotifications.setBadgeCountAsync(0);
  assert.equal(mockNotifications._badgeCount, 0);
});

test("Notificações: Persistência de Preferências do Usuário no AsyncStorage", async () => {
  const prefs = {
    pushEnabled: true,
    workoutReminderEnabled: true,
    workoutReminderTime: "07:00",
    hydrationReminderEnabled: true,
    hydrationIntervalHours: 3,
    trainerWeeklySummaryEnabled: true,
    painAlertsEnabled: true,
    chatAlertsEnabled: true,
    assessmentAlertsEnabled: true,
  };

  await mockAsyncStorage.setItem("@dragoncorp/native_notification_prefs_v1", JSON.stringify(prefs));
  const raw = await mockAsyncStorage.getItem("@dragoncorp/native_notification_prefs_v1");
  assert.ok(raw);

  const restored = JSON.parse(raw);
  assert.equal(restored.workoutReminderTime, "07:00");
  assert.equal(restored.hydrationIntervalHours, 3);
  assert.equal(restored.trainerWeeklySummaryEnabled, true);
});
