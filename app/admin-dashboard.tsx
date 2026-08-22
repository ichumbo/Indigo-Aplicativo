import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useResponsiveLayout } from "@/constants/responsive";
import { useCurrentSession } from "@/hooks/use-current-session";
import {
  AdminUserListItem,
  AppGlobalSettings,
  broadcastAdminNotification,
  changeAdminUserRole,
  createAdminUser,
  getAdminAppMetrics,
  getAdminAppSettings,
  getAdminAuditLogs,
  getAdminUsersList,
  SystemAuditLog,
  toggleAdminUserStatus,
  updateAdminAppSettings,
} from "@/services/admin-dashboard-store";
import { AppRole, signOut } from "@/services/auth-store";
import { getWhatsAppUrl } from "@/services/student-profile-store";
import {
  listAllSubscriptions,
  updateSubscriptionAdminOverride,
  getSubscriptionConfig,
  updateSubscriptionConfig,
  SubscriptionRecord,
  SubscriptionSystemConfig,
} from "@/services/subscription-service";

type AdminTab = "metrics" | "users" | "subscriptions" | "settings" | "audit";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { session } = useCurrentSession();

  const [activeTab, setActiveTab] = useState<AdminTab>("metrics");

  // Dados
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [subFilter, setSubFilter] = useState<"all" | "free" | "pro" | "active" | "cancelled" | "expired">("all");
  const [subConfig, setSubConfig] = useState<SubscriptionSystemConfig | null>(null);
  const [subConfigModalVisible, setSubConfigModalVisible] = useState(false);
  const [configFreeLimit, setConfigFreeLimit] = useState("1");
  const [configAppleId, setConfigAppleId] = useState("personal_pro_monthly");
  const [configGoogleId, setConfigGoogleId] = useState("personal_pro_monthly");
  const [settings, setSettings] = useState<AppGlobalSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  // Filtros de Usuários
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "student" | "trainer" | "blocked">("all");

  // Modais
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("STUDENT");
  const [newUserPlan, setNewUserPlan] = useState("Plano Mensal VIP");
  const [creatingUser, setCreatingUser] = useState(false);

  // Broadcast Modal
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"ALL" | "STUDENTS" | "TRAINERS">("ALL");
  const [broadcasting, setBroadcasting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [m, u, s, a, subs, cfg] = await Promise.all([
        getAdminAppMetrics(),
        getAdminUsersList(),
        getAdminAppSettings(),
        getAdminAuditLogs(),
        listAllSubscriptions(subFilter),
        getSubscriptionConfig(),
      ]);
      setMetrics(m);
      setUsers(u);
      setSettings(s);
      setAuditLogs(a);
      setSubscriptions(subs);
      setSubConfig(cfg);
      setConfigFreeLimit(String(cfg.freeMaxStudents));
      setConfigAppleId(cfg.proProductIdApple);
      setConfigGoogleId(cfg.proProductIdGoogle);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subFilter]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Navegação de retorno segura
  const handleGoBack = useCallback(async () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (session?.user.role === "SUPER_ADMIN") {
        await signOut("Logout pelo painel admin.");
        router.replace("/login");
      } else if (session?.user.role === "TRAINER") {
        router.replace("/(tabs)/profile" as never);
      } else if (session?.user.role === "STUDENT") {
        router.replace("/student" as never);
      } else {
        router.replace("/(tabs)" as never);
      }
    }
  }, [router, session]);

  // Ações de Usuário
  const handleToggleStatus = async (user: AdminUserListItem) => {
    const action = user.status === "ACTIVE" ? "bloquear" : "desbloquear";
    Alert.alert(
      `Confirmar ${action}`,
      `Deseja ${action} o acesso de ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: user.status === "ACTIVE" ? "destructive" : "default",
          onPress: async () => {
            const updated = await toggleAdminUserStatus(user.id);
            setUsers(updated);
            const m = await getAdminAppMetrics();
            setMetrics(m);
          },
        },
      ]
    );
  };

  const handleChangeRole = (user: AdminUserListItem) => {
    Alert.alert(
      "Alterar Papel de Acesso",
      `Defina o novo nível de acesso para ${user.name}:`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Tornar Aluno",
          onPress: async () => {
            const updated = await changeAdminUserRole(user.id, "STUDENT");
            setUsers(updated);
          },
        },
        {
          text: "Tornar Personal",
          onPress: async () => {
            const updated = await changeAdminUserRole(user.id, "TRAINER");
            setUsers(updated);
          },
        },
      ]
    );
  };

  const handleCreateUserSubmit = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      Alert.alert("Campos obrigatórios", "Informe o nome e e-mail do usuário.");
      return;
    }

    setCreatingUser(true);
    try {
      const updated = await createAdminUser({
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        role: newUserRole,
        planName: newUserPlan,
      });

      setUsers(updated);
      setUserModalVisible(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPhone("");
      const m = await getAdminAppMetrics();
      setMetrics(m);
      Alert.alert("Sucesso", "Novo usuário cadastrado e liberado.");
    } catch {
      Alert.alert("Erro", "Não foi possível criar o usuário.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleBroadcastSubmit = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert("Campos obrigatórios", "Informe o título e a mensagem do comunicado.");
      return;
    }

    setBroadcasting(true);
    try {
      const res = await broadcastAdminNotification({
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        targetRole: broadcastTarget,
      });

      setBroadcastModalVisible(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      Alert.alert("Notificação Disparada", `Comunicado enviado para ${res.dispatchedCount} usuários.`);
      await loadDashboardData(true);
    } catch {
      Alert.alert("Erro", "Falha ao disparar comunicado.");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSaveSubConfig = async () => {
    try {
      const freeLimit = parseInt(configFreeLimit, 10) || 1;
      await updateSubscriptionConfig({
        freeMaxStudents: freeLimit,
        proProductIdApple: configAppleId.trim(),
        proProductIdGoogle: configGoogleId.trim(),
      });
      setSubConfigModalVisible(false);
      Alert.alert("Configuração Salva", "Limites e identificadores de produto atualizados.");
      void loadDashboardData(true);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar a configuração.");
    }
  };

  const handleSubOverride = (sub: SubscriptionRecord) => {
    Alert.alert(
      "Ajustar Assinatura",
      `Alterar plano/status para ${sub.userName || sub.userEmail}:`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: sub.plan === "FREE" ? "Liberar Plano Pro (Admin)" : "Reverter para Plano Free",
          onPress: async () => {
            const nextPlan = sub.plan === "FREE" ? "PRO" : "FREE";
            const nextStatus = sub.plan === "FREE" ? "active" : "free";
            await updateSubscriptionAdminOverride(sub.userId, {
              plan: nextPlan,
              status: nextStatus,
              provider: "admin",
            });
            Alert.alert("Sucesso", `Plano alterado para ${nextPlan}!`);
            void loadDashboardData(true);
          },
        },
      ]
    );
  };

  const handleToggleSetting = async (key: keyof AppGlobalSettings, value: boolean) => {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    await updateAdminAppSettings({ [key]: value });
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (userFilter === "student") return u.role === "STUDENT";
      if (userFilter === "trainer") return u.role === "TRAINER";
      if (userFilter === "blocked") return u.status === "BLOCKED";
      return true;
    });
  }, [users, searchQuery, userFilter]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" size="large" />
        <Text style={styles.centerText}>Carregando painel de administração...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* HEADER EXECUTIVO DE ALTO PADRÃO (SEM GRADIENTE) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name={session?.user.role === "SUPER_ADMIN" && !router.canGoBack() ? "log-out-outline" : "arrow-back"}
              size={17}
              color="#D90000"
            />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <View style={styles.adminStatusRow}>
              <View style={styles.liveStatusDot} />
              <Text style={styles.adminBadgeText}>MASTER CONTROL</Text>
              <Text style={styles.versionTag}>v2.4</Text>
            </View>
            <Text style={styles.headerTitle}>Gestão Global</Text>
          </View>

          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              onPress={() => setBroadcastModalVisible(true)}
              style={styles.headerActionBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="megaphone-outline" size={15} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => loadDashboardData(true)}
              style={styles.headerActionBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={15} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* TABS SEGMENTADAS EXECUTIVAS EM CARROSSEL ESPAÇOSO */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabRailScrollView}
          contentContainerStyle={styles.tabRailScrollContent}
        >
          <TouchableOpacity
            style={[styles.tabPill, activeTab === "metrics" && styles.tabPillActive]}
            onPress={() => setActiveTab("metrics")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === "metrics" ? "stats-chart" : "stats-chart-outline"}
              size={13}
              color={activeTab === "metrics" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.tabPillText, activeTab === "metrics" && styles.tabPillTextActive]}>
              Visão Geral
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === "users" && styles.tabPillActive]}
            onPress={() => setActiveTab("users")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === "users" ? "people" : "people-outline"}
              size={13}
              color={activeTab === "users" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.tabPillText, activeTab === "users" && styles.tabPillTextActive]}>
              Usuários
            </Text>
            <View style={[styles.tabPillBadge, activeTab === "users" && styles.tabPillBadgeActive]}>
              <Text style={[styles.tabPillBadgeText, activeTab === "users" && styles.tabPillBadgeTextActive]}>
                {users.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === "subscriptions" && styles.tabPillActive]}
            onPress={() => setActiveTab("subscriptions")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === "subscriptions" ? "card" : "card-outline"}
              size={13}
              color={activeTab === "subscriptions" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.tabPillText, activeTab === "subscriptions" && styles.tabPillTextActive]}>
              Assinaturas
            </Text>
            <View style={[styles.tabPillBadge, activeTab === "subscriptions" && styles.tabPillBadgeActive]}>
              <Text style={[styles.tabPillBadgeText, activeTab === "subscriptions" && styles.tabPillBadgeTextActive]}>
                {subscriptions.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === "settings" && styles.tabPillActive]}
            onPress={() => setActiveTab("settings")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === "settings" ? "settings" : "settings-outline"}
              size={13}
              color={activeTab === "settings" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.tabPillText, activeTab === "settings" && styles.tabPillTextActive]}>
              Sistema
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === "audit" && styles.tabPillActive]}
            onPress={() => setActiveTab("audit")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === "audit" ? "shield-checkmark" : "shield-checkmark-outline"}
              size={13}
              color={activeTab === "audit" ? "#FFFFFF" : "#777777"}
            />
            <Text style={[styles.tabPillText, activeTab === "audit" && styles.tabPillTextActive]}>
              Auditoria
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== TAB 1: VISÃO GERAL & KPIS ==================== */}
        {activeTab === "metrics" && (
          <View style={styles.tabSection}>
            {/* 4 HERO KPIS EXECUTIVOS */}
            <View style={styles.kpiGrid}>
              {/* KPI 1: Usuários */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <Text style={styles.kpiCardLabel}>ATLETAS & PERSONALS</Text>
                  <View style={styles.kpiIconBoxCyan}>
                    <Ionicons name="people" size={13} color="#00A3FF" />
                  </View>
                </View>
                <Text style={styles.kpiCardMainVal}>{metrics?.totalUsers || 0}</Text>
                <View style={styles.kpiBadgeRow}>
                  <View style={styles.kpiMiniBadge}>
                    <Text style={styles.kpiMiniBadgeText}>
                      {metrics?.totalStudents || 0} alunos • {metrics?.totalTrainers || 0} personals
                    </Text>
                  </View>
                </View>
              </View>

              {/* KPI 2: Treinos Concluídos */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <Text style={styles.kpiCardLabel}>TREINOS HOJE</Text>
                  <View style={styles.kpiIconBoxGreen}>
                    <Ionicons name="barbell" size={13} color="#10b981" />
                  </View>
                </View>
                <Text style={styles.kpiCardMainVal}>{metrics?.activeSessionsToday || 0}</Text>
                <View style={styles.kpiBadgeRow}>
                  <View style={styles.kpiPositiveBadge}>
                    <Text style={styles.kpiPositiveBadgeText}>↑ 18.4% vs ontem</Text>
                  </View>
                </View>
              </View>

              {/* KPI 3: Receita / MRR */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <Text style={styles.kpiCardLabel}>FATURAMENTO MRR</Text>
                  <View style={styles.kpiIconBoxRed}>
                    <Ionicons name="card-outline" size={13} color="#D90000" />
                  </View>
                </View>
                <Text style={styles.kpiCardMainVal}>
                  R$ {metrics?.monthlyRecurringRevenue?.toLocaleString("pt-BR")}
                </Text>
                <View style={styles.kpiBadgeRow}>
                  <View style={styles.kpiMiniBadge}>
                    <Text style={styles.kpiMiniBadgeText}>Retenção: {metrics?.retentionRate}</Text>
                  </View>
                </View>
              </View>

              {/* KPI 4: Uptime / Sistema */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <Text style={styles.kpiCardLabel}>ESTABILIDADE CLOUD</Text>
                  <View style={styles.kpiIconBoxGreen}>
                    <Ionicons name="pulse" size={13} color="#10b981" />
                  </View>
                </View>
                <Text style={styles.kpiCardMainVal}>{metrics?.systemUptime}</Text>
                <View style={styles.kpiBadgeRow}>
                  <View style={styles.kpiMiniBadge}>
                    <Text style={styles.kpiMiniBadgeText}>Latência: 42ms (0 falhas)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* CENTRO DE AÇÕES RÁPIDAS EXECUTIVAS */}
            <View style={styles.blockCard}>
              <View style={styles.blockCardHeader}>
                <Ionicons name="flash-outline" size={14} color="#D90000" />
                <Text style={styles.blockTitle}>Comandos Rápidos</Text>
              </View>

              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={styles.actionCardTile}
                  onPress={() => setBroadcastModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionTileIconBox}>
                    <Ionicons name="megaphone-outline" size={16} color="#D90000" />
                  </View>
                  <View style={styles.actionTileTextCol}>
                    <Text style={styles.actionTileTitle}>Comunicado Global</Text>
                    <Text style={styles.actionTileSub}>Disparo de aviso push</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#555" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCardTile}
                  onPress={() => setUserModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionTileIconBox}>
                    <Ionicons name="person-add-outline" size={16} color="#00A3FF" />
                  </View>
                  <View style={styles.actionTileTextCol}>
                    <Text style={styles.actionTileTitle}>Cadastrar Usuário</Text>
                    <Text style={styles.actionTileSub}>Criar aluno ou personal</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#555" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCardTile}
                  onPress={() => setActiveTab("settings")}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionTileIconBox}>
                    <Ionicons name="options-outline" size={16} color="#10b981" />
                  </View>
                  <View style={styles.actionTileTextCol}>
                    <Text style={styles.actionTileTitle}>Feature Flags</Text>
                    <Text style={styles.actionTileSub}>Ligar/desligar módulos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#555" />
                </TouchableOpacity>
              </View>
            </View>

            {/* CENTRAL DE PENDÊNCIAS E ALERTAS */}
            <View style={styles.blockCard}>
              <View style={styles.blockCardHeader}>
                <Ionicons name="alert-circle-outline" size={14} color="#eab308" />
                <Text style={styles.blockTitle}>Central de Pendências</Text>
              </View>

              <View style={styles.alertsContainer}>
                <View style={styles.alertCardItem}>
                  <View style={styles.alertCardLeft}>
                    <View style={styles.alertDotYellow} />
                    <View>
                      <Text style={styles.alertCardTitle}>{metrics?.pendingAnamnesesCount} Anamneses Pendentes</Text>
                      <Text style={styles.alertCardSub}>Alunos aguardando liberação clínica</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.alertResolveBtn}
                    onPress={() => setActiveTab("users")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.alertResolveBtnText}>Revisar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.alertCardItem}>
                  <View style={styles.alertCardLeft}>
                    <View style={styles.alertDotYellow} />
                    <View>
                      <Text style={styles.alertCardTitle}>{metrics?.pendingExpiringWorkouts} Ciclos Expirando</Text>
                      <Text style={styles.alertCardSub}>Fichas de treino com prazo &lt; 48h</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.alertResolveBtn}
                    onPress={() => setBroadcastModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.alertResolveBtnText}>Notificar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.alertCardItem}>
                  <View style={styles.alertCardLeft}>
                    <View style={styles.alertDotRed} />
                    <View>
                      <Text style={styles.alertCardTitle}>{metrics?.totalBlocked} Conta Bloqueada</Text>
                      <Text style={styles.alertCardSub}>Beatriz Lima (Inadimplência)</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.alertResolveBtn}
                    onPress={() => {
                      setUserFilter("blocked");
                      setActiveTab("users");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.alertResolveBtnText}>Gerenciar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ==================== TAB 2: GESTÃO DE USUÁRIOS ==================== */}
        {activeTab === "users" && (
          <View style={styles.tabSection}>
            {/* BARRA DE PESQUISA & NOVO USUÁRIO */}
            <View style={styles.userSearchHeader}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={15} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nome ou e-mail..."
                  placeholderTextColor="#555"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={15} color="#888" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.addUserBtn}
                onPress={() => setUserModalVisible(true)}
                activeOpacity={0.84}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* CHIPS DE FILTRO */}
            <View style={styles.userFilterRow}>
              <TouchableOpacity
                style={[styles.userFilterChip, userFilter === "all" && styles.userFilterChipActive]}
                onPress={() => setUserFilter("all")}
                activeOpacity={0.8}
              >
                <Text style={[styles.userFilterText, userFilter === "all" && styles.userFilterTextActive]}>
                  Todos ({users.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.userFilterChip, userFilter === "student" && styles.userFilterChipActive]}
                onPress={() => setUserFilter("student")}
                activeOpacity={0.8}
              >
                <Text style={[styles.userFilterText, userFilter === "student" && styles.userFilterTextActive]}>
                  Alunos ({users.filter((u) => u.role === "STUDENT").length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.userFilterChip, userFilter === "trainer" && styles.userFilterChipActive]}
                onPress={() => setUserFilter("trainer")}
                activeOpacity={0.8}
              >
                <Text style={[styles.userFilterText, userFilter === "trainer" && styles.userFilterTextActive]}>
                  Personals ({users.filter((u) => u.role === "TRAINER").length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.userFilterChip, userFilter === "blocked" && styles.userFilterChipActive]}
                onPress={() => setUserFilter("blocked")}
                activeOpacity={0.8}
              >
                <Text style={[styles.userFilterText, userFilter === "blocked" && styles.userFilterTextActive]}>
                  Bloqueados ({users.filter((u) => u.status === "BLOCKED").length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* LISTA DE USUÁRIOS */}
            <View style={styles.usersList}>
              {filteredUsers.map((user) => {
                const isBlocked = user.status === "BLOCKED";
                const isTrainer = user.role === "TRAINER";

                return (
                  <View
                    key={user.id}
                    style={[styles.userCard, isBlocked && styles.userCardBlocked]}
                  >
                    <Image
                      source={{ uri: user.avatar || "https://i.pravatar.cc/150?img=32" }}
                      style={styles.userAvatar}
                    />

                    <View style={styles.userInfoCol}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userNameText} numberOfLines={1}>
                          {user.name}
                        </Text>
                        <View
                          style={[
                            styles.rolePill,
                            isTrainer ? styles.rolePillTrainer : styles.rolePillStudent,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rolePillText,
                              isTrainer ? styles.rolePillTextTrainer : styles.rolePillTextStudent,
                            ]}
                          >
                            {isTrainer ? "Personal" : "Aluno"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.userEmailText}>{user.email}</Text>

                      <View style={styles.userMetaRow}>
                        <Text style={styles.userPlanText}>{user.planName}</Text>
                        <Text style={styles.metaBullet}>•</Text>
                        <Text style={styles.userLastSeen}>{user.lastAccess}</Text>
                      </View>
                    </View>

                    {/* AÇÕES POR USUÁRIO */}
                    <View style={styles.userActionsCol}>
                      {user.phone ? (
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => {
                            const url = getWhatsAppUrl(user.phone || "");
                            if (url) void Linking.openURL(url);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleChangeRole(user)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="repeat-outline" size={14} color="#888" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionIconBtn,
                          isBlocked && styles.actionIconBtnActiveAlert,
                        ]}
                        onPress={() => handleToggleStatus(user)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isBlocked ? "lock-closed" : "lock-open-outline"}
                          size={14}
                          color={isBlocked ? "#ff4444" : "#888"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ==================== TAB 3: ASSINATURAS & FREEMIUM ==================== */}
        {activeTab === "subscriptions" && (
          <View style={styles.tabSection}>
            <View style={styles.blockCard}>
              <View style={styles.userHeaderRow}>
                <View>
                  <Text style={styles.blockTitle}>Gestão de Assinaturas & Planos</Text>
                  <Text style={styles.blockSubtitle}>
                    Controle central de planos Free/Pro, limites e canais de cobrança.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.newUserButton}
                  onPress={() => setSubConfigModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="options-outline" size={14} color="#fff" />
                  <Text style={styles.newUserButtonText}>Configurar Planos</Text>
                </TouchableOpacity>
              </View>

              {/* FILTROS DE ASSINATURA */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterScrollContent}
              >
                {[
                  { id: "all", label: "Todos" },
                  { id: "free", label: "Free" },
                  { id: "pro", label: "Pro" },
                  { id: "active", label: "Ativos" },
                  { id: "cancelled", label: "Cancelados" },
                  { id: "expired", label: "Expirados" },
                ].map((f) => {
                  const active = subFilter === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setSubFilter(f.id as any)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* LISTA DE ASSINATURAS */}
              <View style={styles.usersList}>
                {subscriptions.map((sub) => {
                  const isPro = sub.plan === "PRO";
                  const isActive = sub.status === "active";
                  const isExpired = sub.status === "expired";

                  return (
                    <View key={sub.id} style={styles.userCard}>
                      <View style={styles.userCardLeft}>
                        <View style={[styles.userAvatarBox, isPro && { backgroundColor: "#D90000" }]}>
                          <Ionicons
                            name={isPro ? "star" : "person"}
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={styles.userInfoCol}>
                          <Text style={styles.userNameText}>{sub.userName || "Personal Trainer"}</Text>
                          <Text style={styles.userEmailText}>{sub.userEmail || "treinador@indigo.app"}</Text>
                          <View style={styles.userMetaRow}>
                            <View
                              style={[
                                styles.userRoleTag,
                                isPro ? styles.userRoleTrainerTag : styles.userRoleStudentTag,
                              ]}
                            >
                              <Text style={styles.userRoleTagText}>{sub.plan}</Text>
                            </View>
                            <View
                              style={[
                                styles.userPlanTag,
                                isActive ? { backgroundColor: "#112A1A" } : isExpired ? { backgroundColor: "#2A1111" } : { backgroundColor: "#222" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.userPlanTagText,
                                  isActive ? { color: "#00E676" } : isExpired ? { color: "#FF5252" } : { color: "#AAA" },
                                ]}
                              >
                                {sub.status.toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.userCreatedAtText}>
                              Loja: {sub.provider.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.userCardRight}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleSubOverride(sub)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="create-outline" size={15} color="#D90000" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ==================== TAB 4: SISTEMA & FEATURE FLAGS ==================== */}
        {activeTab === "settings" && settings && (
          <View style={styles.tabSection}>
            <View style={styles.blockCard}>
              <View style={styles.blockCardHeader}>
                <Ionicons name="toggle-outline" size={15} color="#D90000" />
                <Text style={styles.blockTitle}>Feature Flags do Aplicativo</Text>
              </View>
              <Text style={styles.blockSubtitle}>
                Ative ou desative módulos de forma instantânea para todos os alunos e personals.
              </Text>

              {/* Módulo de Hidratação */}
              <View style={styles.settingSwitchRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Módulo de Hidratação Diária</Text>
                  <Text style={styles.settingDesc}>Rastreamento de água inteligente e metas diárias.</Text>
                </View>
                <Switch
                  value={settings.enableHydrationModule}
                  onValueChange={(val) => handleToggleSetting("enableHydrationModule", val)}
                  trackColor={{ false: "#262626", true: "#D90000" }}
                  thumbColor="#fff"
                />
              </View>

              {/* Módulo de Avaliações */}
              <View style={styles.settingSwitchRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Avaliações Físicas & Fotos</Text>
                  <Text style={styles.settingDesc}>Comparativo de fotos e protocolos de dobras cutâneas.</Text>
                </View>
                <Switch
                  value={settings.enablePhotoAssessments}
                  onValueChange={(val) => handleToggleSetting("enablePhotoAssessments", val)}
                  trackColor={{ false: "#262626", true: "#D90000" }}
                  thumbColor="#fff"
                />
              </View>

              {/* Módulo de Chat */}
              <View style={styles.settingSwitchRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Chat & Mensagens Diretas</Text>
                  <Text style={styles.settingDesc}>Canal de comunicação instantâneo entre personal e aluno.</Text>
                </View>
                <Switch
                  value={settings.enableChatMessaging}
                  onValueChange={(val) => handleToggleSetting("enableChatMessaging", val)}
                  trackColor={{ false: "#262626", true: "#D90000" }}
                  thumbColor="#fff"
                />
              </View>

              {/* Notificações Automáticas */}
              <View style={styles.settingSwitchRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Lembretes Automáticos de Treino</Text>
                  <Text style={styles.settingDesc}>Disparo de notificações push e alertas de expiração.</Text>
                </View>
                <Switch
                  value={settings.enableAutoNotifications}
                  onValueChange={(val) => handleToggleSetting("enableAutoNotifications", val)}
                  trackColor={{ false: "#262626", true: "#D90000" }}
                  thumbColor="#fff"
                />
              </View>

              {/* Modo Manutenção */}
              <View style={[styles.settingSwitchRow, styles.settingSwitchRowAlert]}>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingLabel, styles.redHighlight]}>Modo Manutenção Geral</Text>
                  <Text style={styles.settingDesc}>Bloqueia novos acessos ao app temporariamente.</Text>
                </View>
                <Switch
                  value={settings.maintenanceMode}
                  onValueChange={(val) => handleToggleSetting("maintenanceMode", val)}
                  trackColor={{ false: "#262626", true: "#ff4444" }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* CARD DISPARO DE BROADCAST */}
            <View style={styles.blockCard}>
              <View style={styles.blockCardHeader}>
                <Ionicons name="megaphone-outline" size={15} color="#D90000" />
                <Text style={styles.blockTitle}>Comunicado Oficial em Massa</Text>
              </View>
              <Text style={styles.blockSubtitle}>
                Envie uma notificação push com anúncio oficial para todos os usuários cadastrados.
              </Text>

              <TouchableOpacity
                style={styles.broadcastButton}
                onPress={() => setBroadcastModalVisible(true)}
                activeOpacity={0.84}
              >
                <Ionicons name="paper-plane-outline" size={15} color="#fff" />
                <Text style={styles.broadcastButtonText}>Abrir Central de Disparo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== TAB 4: AUDITORIA & SEGURANÇA ==================== */}
        {activeTab === "audit" && (
          <View style={styles.tabSection}>
            <View style={styles.auditHeaderRow}>
              <Text style={styles.blockTitle}>Registro de Eventos de Segurança</Text>
              <Text style={styles.auditCountLabel}>{auditLogs.length} eventos</Text>
            </View>

            <View style={styles.auditLogsList}>
              {auditLogs.map((log) => {
                const isAlert = log.level === "alert";
                const isSuccess = log.level === "success";

                return (
                  <View key={log.id} style={styles.auditLogItem}>
                    <View style={styles.auditLogTop}>
                      <View
                        style={[
                          styles.auditLevelBadge,
                          isAlert
                            ? styles.auditLevelAlert
                            : isSuccess
                            ? styles.auditLevelSuccess
                            : styles.auditLevelInfo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.auditLevelText,
                            isAlert
                              ? styles.auditLevelTextAlert
                              : isSuccess
                              ? styles.auditLevelTextSuccess
                              : styles.auditLevelTextInfo,
                          ]}
                        >
                          {log.action}
                        </Text>
                      </View>

                      <Text style={styles.auditTimestamp}>{log.timestamp}</Text>
                    </View>

                    <Text style={styles.auditDetailsText}>{log.details}</Text>

                    <View style={styles.auditActorRow}>
                      <Ionicons name="person-circle-outline" size={12} color="#666" />
                      <Text style={styles.auditActorText}>
                        Executor: <Text style={styles.whiteHighlight}>{log.actorName}</Text>
                      </Text>
                      {log.target ? (
                        <>
                          <Text style={styles.metaBullet}>•</Text>
                          <Text style={styles.auditActorText}>Alvo: {log.target}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ==================== MODAL: CRIAR NOVO USUÁRIO ==================== */}
      <Modal
        visible={userModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUserModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleBlock}>
                <Ionicons name="person-add" size={17} color="#D90000" />
                <Text style={styles.modalTitle}>Cadastrar Novo Usuário</Text>
              </View>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputFieldLabel}>Nome Completo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Carlos Albuquerque"
              placeholderTextColor="#555"
              value={newUserName}
              onChangeText={setNewUserName}
            />

            <Text style={styles.inputFieldLabel}>E-mail de Acesso</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: carlos@indigo.app"
              placeholderTextColor="#555"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputFieldLabel}>Telefone / WhatsApp</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: (11) 98765-4321"
              placeholderTextColor="#555"
              value={newUserPhone}
              onChangeText={setNewUserPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputFieldLabel}>Nível de Acesso</Text>
            <View style={styles.roleSelectorRow}>
              <TouchableOpacity
                style={[styles.roleSelectBtn, newUserRole === "STUDENT" && styles.roleSelectBtnActive]}
                onPress={() => setNewUserRole("STUDENT")}
              >
                <Text style={[styles.roleSelectBtnText, newUserRole === "STUDENT" && styles.roleSelectBtnTextActive]}>
                  Aluno
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleSelectBtn, newUserRole === "TRAINER" && styles.roleSelectBtnActive]}
                onPress={() => setNewUserRole("TRAINER")}
              >
                <Text style={[styles.roleSelectBtnText, newUserRole === "TRAINER" && styles.roleSelectBtnTextActive]}>
                  Personal Trainer
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setUserModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateUserSubmit}
                disabled={creatingUser}
                activeOpacity={0.84}
              >
                {creatingUser ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Criar Conta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: DISPARO DE BROADCAST ==================== */}
      <Modal
        visible={broadcastModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBroadcastModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleBlock}>
                <Ionicons name="megaphone" size={17} color="#D90000" />
                <Text style={styles.modalTitle}>Disparo de Notificação</Text>
              </View>
              <TouchableOpacity onPress={() => setBroadcastModalVisible(false)}>
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputFieldLabel}>Destinatários</Text>
            <View style={styles.roleSelectorRow}>
              <TouchableOpacity
                style={[styles.roleSelectBtn, broadcastTarget === "ALL" && styles.roleSelectBtnActive]}
                onPress={() => setBroadcastTarget("ALL")}
              >
                <Text style={[styles.roleSelectBtnText, broadcastTarget === "ALL" && styles.roleSelectBtnTextActive]}>
                  Todos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleSelectBtn, broadcastTarget === "STUDENTS" && styles.roleSelectBtnActive]}
                onPress={() => setBroadcastTarget("STUDENTS")}
              >
                <Text style={[styles.roleSelectBtnText, broadcastTarget === "STUDENTS" && styles.roleSelectBtnTextActive]}>
                  Alunos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleSelectBtn, broadcastTarget === "TRAINERS" && styles.roleSelectBtnActive]}
                onPress={() => setBroadcastTarget("TRAINERS")}
              >
                <Text style={[styles.roleSelectBtnText, broadcastTarget === "TRAINERS" && styles.roleSelectBtnTextActive]}>
                  Personals
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputFieldLabel}>Título do Alerta</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Atualização Importante do Aplicativo"
              placeholderTextColor="#555"
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
            />

            <Text style={styles.inputFieldLabel}>Mensagem</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              placeholder="Digite o texto detalhado que chegará aos celulares..."
              placeholderTextColor="#555"
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBroadcastModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleBroadcastSubmit}
                disabled={broadcasting}
                activeOpacity={0.84}
              >
                {broadcasting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Disparar Agora</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: CONFIGURAÇÃO DE PLANOS FREEMIUM ==================== */}
      <Modal
        visible={subConfigModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Configuração Global de Planos</Text>
              <TouchableOpacity onPress={() => setSubConfigModalVisible(false)}>
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputFieldLabel}>Limite de Alunos no Plano Free</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 1"
              placeholderTextColor="#555"
              value={configFreeLimit}
              onChangeText={setConfigFreeLimit}
              keyboardType="numeric"
            />

            <Text style={styles.inputFieldLabel}>Product ID Apple (StoreKit)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="personal_pro_monthly"
              placeholderTextColor="#555"
              value={configAppleId}
              onChangeText={setConfigAppleId}
              autoCapitalize="none"
            />

            <Text style={styles.inputFieldLabel}>Product ID Google (Play Billing)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="personal_pro_monthly"
              placeholderTextColor="#555"
              value={configGoogleId}
              onChangeText={setConfigGoogleId}
              autoCapitalize="none"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSubConfigModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveSubConfig}
                activeOpacity={0.84}
              >
                <Text style={styles.modalConfirmBtnText}>Salvar Configuração</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  adminStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  adminBadgeText: {
    color: "#888888",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  versionTag: {
    color: "#555555",
    fontSize: 9,
    fontWeight: "800",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  tabRailScrollView: {
    marginTop: 8,
    marginHorizontal: -16,
  },
  tabRailScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tabPill: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#222222",
  },
  tabPillActive: {
    backgroundColor: "#1e1e1e",
    borderColor: "#383838",
  },
  tabPillText: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "800",
  },
  tabPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  tabPillBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#262626",
  },
  tabPillBadgeActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  tabPillBadgeText: {
    color: "#888888",
    fontSize: 9.5,
    fontWeight: "900",
  },
  tabPillBadgeTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  tabSection: {
    gap: 12,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "48.4%",
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 12,
    justifyContent: "space-between",
  },
  kpiCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  kpiCardLabel: {
    color: "#666666",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  kpiIconBoxCyan: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(0, 163, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIconBoxGreen: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIconBoxRed: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiCardMainVal: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  kpiBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  kpiMiniBadge: {
    backgroundColor: "#181818",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#222222",
  },
  kpiMiniBadgeText: {
    color: "#888888",
    fontSize: 9.5,
    fontWeight: "700",
  },
  kpiPositiveBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  kpiPositiveBadgeText: {
    color: "#10b981",
    fontSize: 9.5,
    fontWeight: "800",
  },
  blockCard: {
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 14,
  },
  blockCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  blockTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  blockSubtitle: {
    color: "#777777",
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  quickActionsGrid: {
    gap: 8,
  },
  actionCardTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 10,
  },
  actionTileIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTileTextCol: {
    flex: 1,
  },
  actionTileTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  actionTileSub: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "600",
  },
  alertsContainer: {
    gap: 8,
  },
  alertCardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  alertCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  alertDotYellow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#eab308",
  },
  alertDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ff4444",
  },
  alertCardTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  alertCardSub: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "600",
  },
  alertResolveBtn: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertResolveBtnText: {
    color: "#CCCCCC",
    fontSize: 10,
    fontWeight: "800",
  },
  userSearchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#121212",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#202020",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 12.5,
  },
  addUserBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  userFilterRow: {
    flexDirection: "row",
    gap: 6,
  },
  userFilterChip: {
    backgroundColor: "#121212",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#202020",
  },
  userFilterChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  userFilterText: {
    color: "#777",
    fontSize: 10,
    fontWeight: "700",
  },
  userFilterTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  usersList: {
    gap: 8,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 10,
    gap: 10,
  },
  userCardBlocked: {
    opacity: 0.65,
    borderColor: "rgba(255, 68, 68, 0.3)",
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  userInfoCol: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userNameText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  rolePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rolePillTrainer: {
    backgroundColor: "rgba(217, 0, 0, 0.12)",
  },
  rolePillStudent: {
    backgroundColor: "rgba(0, 163, 255, 0.12)",
  },
  rolePillText: {
    fontSize: 8,
    fontWeight: "900",
  },
  rolePillTextTrainer: {
    color: "#D90000",
  },
  rolePillTextStudent: {
    color: "#00A3FF",
  },
  userEmailText: {
    color: "#777",
    fontSize: 10.5,
    marginTop: 1,
  },
  userMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  userPlanText: {
    color: "#999",
    fontSize: 9.5,
    fontWeight: "700",
  },
  metaBullet: {
    color: "#444",
    fontSize: 9,
  },
  userLastSeen: {
    color: "#666",
    fontSize: 9.5,
  },
  userActionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBtnActiveAlert: {
    backgroundColor: "rgba(255, 68, 68, 0.15)",
    borderColor: "#ff4444",
  },
  settingSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  settingSwitchRowAlert: {
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "800",
  },
  settingDesc: {
    color: "#777",
    fontSize: 10.5,
    marginTop: 1,
  },
  broadcastButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D90000",
    borderRadius: 10,
    paddingVertical: 10,
  },
  broadcastButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  auditHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  auditCountLabel: {
    color: "#777",
    fontSize: 10.5,
    fontWeight: "700",
  },
  auditLogsList: {
    gap: 8,
  },
  auditLogItem: {
    backgroundColor: "#121212",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 10,
    gap: 4,
  },
  auditLogTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  auditLevelBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  auditLevelAlert: {
    backgroundColor: "rgba(255, 68, 68, 0.12)",
  },
  auditLevelSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  auditLevelInfo: {
    backgroundColor: "rgba(0, 163, 255, 0.12)",
  },
  auditLevelText: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  auditLevelTextAlert: {
    color: "#ff4444",
  },
  auditLevelTextSuccess: {
    color: "#10b981",
  },
  auditLevelTextInfo: {
    color: "#00A3FF",
  },
  auditTimestamp: {
    color: "#666",
    fontSize: 9.5,
    fontWeight: "600",
  },
  auditDetailsText: {
    color: "#ccc",
    fontSize: 11.5,
    lineHeight: 15,
  },
  auditActorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  auditActorText: {
    color: "#777",
    fontSize: 10,
  },
  whiteHighlight: {
    color: "#fff",
    fontWeight: "800",
  },
  redHighlight: {
    color: "#ff4444",
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#141414",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#262626",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  inputFieldLabel: {
    color: "#aaa",
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 3,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: "#fff",
    fontSize: 12.5,
  },
  modalInputMultiline: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  roleSelectorRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  roleSelectBtn: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 7,
    alignItems: "center",
  },
  roleSelectBtnActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  roleSelectBtnText: {
    color: "#777",
    fontSize: 10.5,
    fontWeight: "700",
  },
  roleSelectBtnTextActive: {
    color: "#fff",
    fontWeight: "800",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#888",
    fontSize: 11.5,
    fontWeight: "800",
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: "#D90000",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "900",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerText: {
    color: "#777",
    fontSize: 12.5,
    marginTop: 8,
  },
});
