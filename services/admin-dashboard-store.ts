import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthUser, AppRole, AccountStatus } from "@/services/auth-store";
import { createWorkoutNotification, DEMO_STUDENT, DEMO_TRAINER } from "@/services/feedback-store";

export interface SystemAuditLog {
  id: string;
  action: string;
  actorName: string;
  actorRole: AppRole;
  target?: string;
  timestamp: string;
  details: string;
  level: "info" | "warning" | "alert" | "success";
}

export interface AppGlobalSettings {
  maintenanceMode: boolean;
  enableHydrationModule: boolean;
  enablePhotoAssessments: boolean;
  enableChatMessaging: boolean;
  enableAutoNotifications: boolean;
  allowPublicRegistration: boolean;
  maxActiveStudentsPerTrainer: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: AppRole;
  status: AccountStatus;
  planName?: string;
  workoutsCompleted: number;
  lastAccess: string;
  createdAt: string;
}

const STORAGE_KEY_ADMIN_SETTINGS = "@dragoncorp/admin_settings_v1";
const STORAGE_KEY_ADMIN_USERS = "@dragoncorp/admin_users_v1";
const STORAGE_KEY_ADMIN_AUDIT = "@dragoncorp/admin_audit_v1";

const DEFAULT_SETTINGS: AppGlobalSettings = {
  maintenanceMode: false,
  enableHydrationModule: true,
  enablePhotoAssessments: true,
  enableChatMessaging: true,
  enableAutoNotifications: true,
  allowPublicRegistration: true,
  maxActiveStudentsPerTrainer: 50,
};

const INITIAL_USERS: AdminUserListItem[] = [
  {
    id: DEMO_TRAINER.id,
    name: DEMO_TRAINER.name,
    email: "treinador@dragoncorp.app",
    phone: "(11) 90000-0000",
    avatar: "https://i.pravatar.cc/150?img=32",
    role: "TRAINER",
    status: "ACTIVE",
    planName: "Trainer Pro (Consultoria)",
    workoutsCompleted: 420,
    lastAccess: "Há 5 minutos",
    createdAt: "01/01/2025",
  },
  {
    id: DEMO_STUDENT.id,
    name: DEMO_STUDENT.name,
    email: "aluno@dragoncorp.app",
    phone: "(11) 98765-4321",
    avatar: DEMO_STUDENT.avatar,
    role: "STUDENT",
    status: "ACTIVE",
    planName: "Plano Trimestral VIP",
    workoutsCompleted: 38,
    lastAccess: "Hoje às 15:30",
    createdAt: "08/01/2025",
  },
  {
    id: "student-mariana-costa",
    name: "Mariana Costa",
    email: "mariana.costa@gmail.com",
    phone: "(11) 97777-6666",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    role: "STUDENT",
    status: "ACTIVE",
    planName: "Plano Semestral",
    workoutsCompleted: 74,
    lastAccess: "Ontem às 19:45",
    createdAt: "10/01/2025",
  },
  {
    id: "student-beatriz-lima",
    name: "Beatriz Lima",
    email: "beatriz.lima@outlook.com",
    phone: "(11) 98888-5555",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    role: "STUDENT",
    status: "BLOCKED",
    planName: "Plano Mensal",
    workoutsCompleted: 12,
    lastAccess: "Há 3 dias",
    createdAt: "12/01/2025",
  },
  {
    id: "trainer-felipe-rocha",
    name: "Felipe Rocha (CREF 654321-G/SP)",
    email: "felipe.personal@dragoncorp.app",
    phone: "(11) 99888-7766",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    role: "TRAINER",
    status: "ACTIVE",
    planName: "Trainer Starter",
    workoutsCompleted: 180,
    lastAccess: "Hoje às 11:20",
    createdAt: "15/01/2025",
  },
];

const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: "audit-1",
    action: "ALTERAÇÃO DE PLANO",
    actorName: "Super Admin",
    actorRole: "SUPER_ADMIN",
    target: "Mariana Costa",
    timestamp: "Hoje às 14:15",
    details: "Renovação de plano semestral aprovada com sucesso.",
    level: "success",
  },
  {
    id: "audit-2",
    action: "BLOQUEIO PREVENTIVO",
    actorName: "Sistema Automático",
    actorRole: "SUPER_ADMIN",
    target: "Beatriz Lima",
    timestamp: "Ontem às 18:00",
    details: "Acesso suspenso por pendência financeira recorrente.",
    level: "alert",
  },
  {
    id: "audit-3",
    action: "DISPARO DE COMUNICADO",
    actorName: "Personal DragonCorp",
    actorRole: "TRAINER",
    target: "Todos os Alunos",
    timestamp: "21/08/2026 10:30",
    details: "Notificação oficial de atualização de treinos da semana.",
    level: "info",
  },
  {
    id: "audit-4",
    action: "BACKUP GERAL DE DADOS",
    actorName: "Rotina Cloud",
    actorRole: "SUPER_ADMIN",
    target: "Banco de Dados",
    timestamp: "21/08/2026 04:00",
    details: "Backup diário criptografado concluído sem falhas.",
    level: "success",
  },
];

/**
 * Retorna as métricas e KPIs consolidados do app
 */
export async function getAdminAppMetrics() {
  const users = await getAdminUsersList();
  const settings = await getAdminAppSettings();

  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const totalTrainers = users.filter((u) => u.role === "TRAINER").length;
  const totalBlocked = users.filter((u) => u.status === "BLOCKED").length;

  return {
    totalUsers: users.length,
    totalStudents,
    totalTrainers,
    totalBlocked,
    activeSessionsToday: 132,
    retentionRate: "94.2%",
    monthlyRecurringRevenue: 9480.0,
    averageRevenuePerUser: 189.6,
    pendingAnamnesesCount: 3,
    pendingExpiringWorkouts: 2,
    systemUptime: "99.98%",
    maintenanceMode: settings.maintenanceMode,
  };
}

/**
 * Retorna a lista de todos os usuários gerenciáveis
 */
export async function getAdminUsersList(): Promise<AdminUserListItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ADMIN_USERS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USERS;
  }
}

/**
 * Alterna status de um usuário (Bloquear / Desbloquear)
 */
export async function toggleAdminUserStatus(userId: string): Promise<AdminUserListItem[]> {
  const users = await getAdminUsersList();
  const updated = users.map((user) => {
    if (user.id === userId) {
      const nextStatus: AccountStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
      return { ...user, status: nextStatus };
    }
    return user;
  });

  await AsyncStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(updated));

  const target = updated.find((u) => u.id === userId);
  if (target) {
    await recordAdminAuditLog({
      action: target.status === "BLOCKED" ? "BLOQUEIO DE USUÁRIO" : "DESBLOQUEIO DE USUÁRIO",
      actorName: "Super Admin",
      actorRole: "SUPER_ADMIN",
      target: target.name,
      details: `Status do usuário alterado para ${target.status}.`,
      level: target.status === "BLOCKED" ? "alert" : "success",
    });
  }

  return updated;
}

/**
 * Alterna papel do usuário (Aluno <-> Treinador <-> Super Admin)
 */
export async function changeAdminUserRole(userId: string, newRole: AppRole): Promise<AdminUserListItem[]> {
  const users = await getAdminUsersList();
  const updated = users.map((user) => {
    if (user.id === userId) {
      return { ...user, role: newRole };
    }
    return user;
  });

  await AsyncStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(updated));

  const target = updated.find((u) => u.id === userId);
  if (target) {
    await recordAdminAuditLog({
      action: "ALTERAÇÃO DE PERMISSÃO",
      actorName: "Super Admin",
      actorRole: "SUPER_ADMIN",
      target: target.name,
      details: `Papel do usuário atualizado para ${newRole}.`,
      level: "warning",
    });
  }

  return updated;
}

/**
 * Cria um novo usuário diretamente no painel
 */
export async function createAdminUser(data: {
  name: string;
  email: string;
  phone?: string;
  role: AppRole;
  planName?: string;
}): Promise<AdminUserListItem[]> {
  const users = await getAdminUsersList();

  const newUser: AdminUserListItem = {
    id: `user-${Date.now()}`,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() || "(11) 99999-0000",
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(data.email)}`,
    role: data.role,
    status: "ACTIVE",
    planName: data.planName || (data.role === "TRAINER" ? "Trainer Pro" : "Plano Padrão"),
    workoutsCompleted: 0,
    lastAccess: "Novo registro",
    createdAt: new Date().toLocaleDateString("pt-BR"),
  };

  const updated = [newUser, ...users];
  await AsyncStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(updated));

  await recordAdminAuditLog({
    action: "CRIAÇÃO DE CONTA",
    actorName: "Super Admin",
    actorRole: "SUPER_ADMIN",
    target: newUser.name,
    details: `Conta ${newUser.role} criada com sucesso para ${newUser.email}.`,
    level: "success",
  });

  return updated;
}

/**
 * Configurações globais do app
 */
export async function getAdminAppSettings(): Promise<AppGlobalSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ADMIN_SETTINGS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY_ADMIN_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateAdminAppSettings(nextSettings: Partial<AppGlobalSettings>): Promise<AppGlobalSettings> {
  const current = await getAdminAppSettings();
  const updated = { ...current, ...nextSettings };
  await AsyncStorage.setItem(STORAGE_KEY_ADMIN_SETTINGS, JSON.stringify(updated));

  await recordAdminAuditLog({
    action: "CONFIGURAÇÕES DO SISTEMA",
    actorName: "Super Admin",
    actorRole: "SUPER_ADMIN",
    target: "Módulos Globais",
    details: "Parâmetros e feature flags do aplicativo atualizados.",
    level: "info",
  });

  return updated;
}

/**
 * Disparo de Notificação em Massa (Broadcast)
 */
export async function broadcastAdminNotification(params: {
  title: string;
  message: string;
  targetRole: "ALL" | "STUDENTS" | "TRAINERS";
}): Promise<{ dispatchedCount: number }> {
  const users = await getAdminUsersList();
  const targets = users.filter((u) => {
    if (params.targetRole === "ALL") return true;
    if (params.targetRole === "STUDENTS") return u.role === "STUDENT";
    if (params.targetRole === "TRAINERS") return u.role === "TRAINER";
    return true;
  });

  for (const user of targets) {
    try {
      await createWorkoutNotification({
        userId: user.id,
        audience: user.role === "TRAINER" ? "trainer" : "student",
        title: params.title,
        message: params.message,
        type: "update",
      });
    } catch {
      // Ignore individual failures
    }
  }

  await recordAdminAuditLog({
    action: "NOTIFICAÇÃO BROADCAST",
    actorName: "Super Admin",
    actorRole: "SUPER_ADMIN",
    target: `${targets.length} usuário(s) (${params.targetRole})`,
    details: `Comunicado '${params.title}' enviado com sucesso.`,
    level: "info",
  });

  return { dispatchedCount: targets.length };
}

/**
 * Logs de Auditoria
 */
export async function getAdminAuditLogs(): Promise<SystemAuditLog[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ADMIN_AUDIT);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY_ADMIN_AUDIT, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export async function recordAdminAuditLog(log: Omit<SystemAuditLog, "id" | "timestamp">) {
  const logs = await getAdminAuditLogs();
  const now = new Date();
  const timeFormatted = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`;

  const newLog: SystemAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    ...log,
    timestamp: `Hoje às ${timeFormatted} (${dateFormatted})`,
  };

  const updated = [newLog, ...logs].slice(0, 100);
  await AsyncStorage.setItem(STORAGE_KEY_ADMIN_AUDIT, JSON.stringify(updated));
}
