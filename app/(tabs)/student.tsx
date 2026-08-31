import WaterCard from "@/components/WaterCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useTrainerBranding } from "@/hooks/use-trainer-branding";
import { useAppTheme } from "@/hooks/use-app-theme";
import { AppMiniMenu } from "@/components/AppMiniMenu";
import { UserAvatar } from "@/components/user-avatar";
import {
  StudentHomeDashboard,
  getStudentHomeDashboard,
} from "@/services/student-home-store";
import { getActiveVersion, getStudentSessionAccess } from "@/services/training-plan-store";
import {
  AerobicConconiProtocol,
  getActiveConconiProtocolForStudent,
} from "@/services/conconi-protocol-service";
import { StudentConconiProtocolModal } from "@/components/student-conconi-protocol-modal";

function formatBrDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const clean = dateStr.trim();
  if (clean.length === 10 && clean.includes("-")) {
    const [y, m, d] = clean.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return dateStr;
}

const WEEK_DAYS = ["Seg", "Ter", "Hoje", "Qui", "Sex", "Sáb", "Dom"];
const WATER_GOAL_ML = 2000;

export default function StudentHomeScreen() {
  const { session, loadingSession } = useCurrentSession();
  const { logoSource, primaryColor, businessName } = useTrainerBranding();
  const { theme, isDark } = useAppTheme();
  const layout = useResponsiveLayout();
  const [dashboard, setDashboard] = useState<StudentHomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [treinoConfirmado, setTreinoConfirmado] = useState(false);
  const [aguaBebida, setAguaBebida] = useState(1200);
  const [menuVisible, setMenuVisible] = useState(false);
  const [conconiProtocol, setConconiProtocol] = useState<AerobicConconiProtocol | null>(null);
  const [loadingProtocol, setLoadingProtocol] = useState(true);
  const [protocolError, setProtocolError] = useState("");
  const [protocolModalVisible, setProtocolModalVisible] = useState(false);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const checkinStorageKey = useMemo(() => {
    const studentId = session?.user.id || "demo-student";
    return `@dragoncorp/student_daily_checkin:${studentId}:${todayKey}`;
  }, [session?.user.id, todayKey]);

  const loadDashboard = useCallback(async (asRefresh = false) => {
    if (!session) return;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setDashboard(await getStudentHomeDashboard(session.user.id));
      const storedCheckin = await AsyncStorage.getItem(checkinStorageKey);
      if (storedCheckin) {
        setTreinoConfirmado(true);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar sua area.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    try {
      setLoadingProtocol(true);
      setProtocolError("");
      const proto = await getActiveConconiProtocolForStudent(
        session.user.id,
        session.user.trainerId || "trainer"
      );
      setConconiProtocol(proto);
    } catch {
      setProtocolError("Não foi possível carregar o protocolo.");
    } finally {
      setLoadingProtocol(false);
    }
  }, [checkinStorageKey, session]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const firstName = useMemo(() => {
    const fullName = dashboard?.profile.registration.fullName || session?.user.name || "Aluno";
    return fullName.trim().split(/\s+/)[0] || "Aluno";
  }, [dashboard?.profile.registration.fullName, session?.user.name]);

  if (loadingSession || (loading && !refreshing)) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando sua area...</Text>
      </View>
    );
  }

  if (error || !dashboard || !session) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={42} color="#ff4444" />
        <Text style={styles.centerTitle}>Nao foi possivel carregar</Text>
        <Text style={styles.centerText}>{error || "Sessao indisponivel."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadDashboard()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const todaySession = dashboard.todaySession;
  const todayVersion = todaySession ? getActiveVersion(todaySession) : undefined;
  const todayAccess = todaySession ? getStudentSessionAccess(todaySession) : undefined;
  const unreadNotifications = dashboard.notifications.filter((notification) => !notification.read).length;
  const weeklyGoal = dashboard.profile.followUp.plannedTrainingFrequency || dashboard.training.plan.frequencyPerWeek || 0;
  const weeklyDone = dashboard.profile.followUp.completedTrainingFrequency;
  const weeklyPercent = weeklyGoal > 0 ? Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100)) : dashboard.weeklyProgressPercent;
  const checkedDays = Math.min(WEEK_DAYS.length, Math.max(0, weeklyDone));
  const exerciseCount = todayVersion?.exercises.length ?? 0;
  const avatar = session?.user?.avatar || dashboard.profile.registration.avatar || undefined;
  const progressCardPercent = 59;
  const bottomPadding = layout.tabBarContentPadding;

  const openTraining = () => {
    if (!todaySession || !todayAccess?.canStart) {
      Alert.alert("Treino indisponivel", todayAccess?.reason ?? "Nao ha treino liberado para iniciar agora.");
      return;
    }

    router.push({
      pathname: "/training-details" as never,
      params: { sessionId: todaySession.id },
    });
  };

  const confirmTraining = async () => {
    if (treinoConfirmado) {
      Alert.alert(
        "Treino já confirmado",
        "Você já confirmou seu treino de hoje! O próximo check-in estará liberado amanhã."
      );
      return;
    }

    if (!todaySession || !todayAccess?.canStart) {
      Alert.alert("Treino indisponivel", todayAccess?.reason ?? "Nao ha treino liberado para confirmar agora.");
      return;
    }

    setTreinoConfirmado(true);
    try {
      await AsyncStorage.setItem(
        checkinStorageKey,
        JSON.stringify({
          confirmedAt: new Date().toISOString(),
          sessionId: todaySession.id,
          date: todayKey,
        })
      );
    } catch (e) {
      console.warn("Erro ao salvar check-in:", e);
    }
    Alert.alert("Treino confirmado!", "Parabéns pelo treino de hoje! Seu check-in foi registrado com sucesso.");
  };

  return (
    <View style={[styles.container, { paddingHorizontal: layout.horizontalPadding, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: layout.topPadding,
            paddingBottom: bottomPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor="#D90000" />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.notificationButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
                onPress={() => router.push("/notifications" as never)}
                activeOpacity={0.82}
              >
                <Ionicons name="notifications-outline" size={20} color={primaryColor} />
                {unreadNotifications > 0 ? (
                  <View style={[styles.notificationBadge, { backgroundColor: primaryColor }]}>
                    <Text style={styles.notificationBadgeText}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notificationButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
                onPress={() => setMenuVisible(true)}
                activeOpacity={0.82}
                accessibilityLabel="Abrir Menu"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={primaryColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/profile" as never)} activeOpacity={0.82}>
                <UserAvatar uri={avatar} size={40} style={{ borderColor: primaryColor }} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.welcomeSection}>
            <View style={styles.welcomeTitleRow}>
              <Text style={[styles.welcome, { color: theme.text }]}>Bem-vindo,</Text>
              <Text style={[styles.name, { color: primaryColor }]}>{firstName}!</Text>
            </View>
            {businessName ? (
              <Text style={[styles.consultancySubtitle, { color: primaryColor }]}>
                {businessName}
              </Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.progressContainer}
          onPress={() => router.push("/weight-progress" as never)}
          activeOpacity={0.86}
        >
          <View style={styles.progressCard}>
            <View style={styles.progressContent}>
              <View style={styles.progressLeft}>
                <Text style={styles.progressTitle}>Progresso de Peso</Text>
                <Text style={styles.progressSubtitle}>Mais detalhes</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${progressCardPercent}%` }]} />
                </View>
              </View>
            </View>
          </View>
          <Image source={require("@/assets/images/person.png")} style={styles.personImage} resizeMode="contain" />
        </TouchableOpacity>

        <View style={[styles.checkinCardContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.weekContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            {WEEK_DAYS.map((day, index) => {
              const checked = index < checkedDays;
              const today = day === "Hoje";

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                    today && [styles.dayButtonToday, { borderColor: primaryColor, backgroundColor: isDark ? "rgba(217, 0, 0, 0.15)" : "rgba(217, 0, 0, 0.08)" }],
                    checked && [styles.dayButtonChecked, { backgroundColor: isDark ? "rgba(217, 0, 0, 0.15)" : "rgba(217, 0, 0, 0.08)", borderColor: primaryColor }],
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: theme.textSecondary },
                      today && { color: primaryColor, fontWeight: "900" },
                      checked && { color: primaryColor, fontWeight: "900" },
                    ]}
                  >
                    {day}
                  </Text>
                  {checked ? <Ionicons name="checkmark" size={14} color={primaryColor} style={styles.checkIcon} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.checkinContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Text style={[styles.checkinTitle, { color: theme.text }]}>Confirme seu treino de hoje</Text>
            <Text style={[styles.checkinSubtitle, { color: theme.textSecondary }]}>
              {treinoConfirmado ? "Treino confirmado para hoje" : "Você pode fazer um novo check-in amanhã"}
            </Text>

            <TouchableOpacity
              style={[
                styles.gymCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                treinoConfirmado && [
                  styles.gymCardConfirmed,
                  { borderColor: primaryColor, backgroundColor: isDark ? "rgba(217, 0, 0, 0.12)" : "rgba(217, 0, 0, 0.06)" },
                ],
              ]}
              onPress={confirmTraining}
              disabled={treinoConfirmado}
              activeOpacity={treinoConfirmado ? 1 : 0.86}
            >
              <Ionicons
                name={treinoConfirmado ? "checkmark-circle" : "add-circle-outline"}
                size={24}
                color={primaryColor}
              />
              <View style={styles.gymInfo}>
                <Text style={[styles.gymName, { color: theme.text }]}>
                  {treinoConfirmado ? "Treino confirmado!" : "Confirmar treino"}
                </Text>
                <Text style={[styles.gymSubtitle, { color: theme.textSecondary }]}>
                  {treinoConfirmado ? "Parabéns! Check-in concluído hoje" : "Toque para confirmar"}
                </Text>
              </View>
              {treinoConfirmado ? (
                <View
                  style={[
                    styles.confirmedBadge,
                    { backgroundColor: `${primaryColor}22`, borderColor: `${primaryColor}55` },
                  ]}
                >
                  <Text style={[styles.confirmedBadgeText, { color: primaryColor }]}>
                    Confirmado
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.planilhaCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={openTraining} activeOpacity={0.86}>
          <View style={styles.planilhaLeft}>
            <View style={[styles.planilhaIconContainer, { backgroundColor: theme.cardSecondary }]}>
              <Ionicons name="document-text" size={24} color="#D90000" />
            </View>
            <View style={styles.planilhaInfo}>
              <Text style={[styles.planilhaTitle, { color: theme.text }]}>Planilha de Treino</Text>
              <View style={styles.planilhaStats}>
                <View style={styles.statItem}>
                  <Ionicons name="barbell-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.statText, { color: theme.textSecondary }]}>
                    {exerciseCount} {exerciseCount === 1 ? "exercicio" : "exercicios"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </View>
        </TouchableOpacity>

        {/* CARD DO PROTOCOLO AERÓBIO ATRIBUÍDO */}
        {loadingProtocol ? (
          <View style={[styles.protocolSkeletonCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <ActivityIndicator size="small" color="#D90000" />
            <Text style={[styles.protocolSkeletonText, { color: theme.textSecondary }]}>Carregando protocolo aeróbio...</Text>
          </View>
        ) : protocolError ? (
          <View style={[styles.protocolCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.protocolCardTop}>
              <View style={[styles.protocolIconContainer, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="alert-circle-outline" size={22} color="#ff4444" />
              </View>
              <View style={styles.protocolInfo}>
                <Text style={[styles.protocolTitle, { color: theme.text }]}>Protocolo aeróbio</Text>
                <Text style={[styles.protocolDate, { color: "#ff4444" }]}>{protocolError}</Text>
              </View>
              <TouchableOpacity
                style={[styles.protocolRetryBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
                onPress={() => loadDashboard()}
              >
                <Text style={[styles.protocolRetryText, { color: theme.text }]}>Tentar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : conconiProtocol ? (
          <TouchableOpacity
            style={[styles.protocolCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => setProtocolModalVisible(true)}
            activeOpacity={0.86}
          >
            <View style={styles.protocolCardTop}>
              <View style={[styles.protocolIconContainer, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons name="speedometer-outline" size={24} color="#D90000" />
              </View>
              <View style={styles.protocolInfo}>
                <View style={styles.protocolTitleRow}>
                  <Text style={[styles.protocolTitle, { color: theme.text }]}>Protocolo aeróbio</Text>
                  <View style={styles.protocolStatusBadge}>
                    <Text style={styles.protocolStatusBadgeText}>Ativo</Text>
                  </View>
                </View>
                <Text style={[styles.protocolDate, { color: theme.textSecondary }]}>
                  Início: {formatBrDate(conconiProtocol.protocolDate)}
                </Text>
              </View>
            </View>

            {/* OBSERVAÇÃO DO PERSONAL (2 SEMANAS / 2 VEZES CADA TREINO) */}
            <View
              style={[
                styles.protocolNotesBox,
                {
                  backgroundColor: isDark ? "rgba(217, 0, 0, 0.08)" : "rgba(217, 0, 0, 0.04)",
                  borderColor: isDark ? "rgba(217, 0, 0, 0.2)" : "rgba(217, 0, 0, 0.12)",
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={16} color="#D90000" style={{ marginTop: 1 }} />
              <Text style={[styles.protocolNotesText, { color: theme.textSecondary }]}>
                {conconiProtocol.generalNotes?.trim() || "O protocolo será atualizado a cada duas semanas, desde que cada treino seja realizado duas vezes."}
              </Text>
            </View>

            <View style={[styles.protocolActionRow, { borderTopColor: theme.divider }]}>
              <Text style={styles.protocolActionText}>Ver protocolo</Text>
              <Ionicons name="chevron-forward" size={14} color="#D90000" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.protocolCardEmpty, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.protocolIconContainerEmpty, { backgroundColor: theme.cardSecondary }]}>
              <Ionicons name="speedometer-outline" size={20} color={theme.textMuted} />
            </View>
            <View style={styles.protocolInfo}>
              <Text style={[styles.protocolTitle, { color: theme.text }]}>Protocolo aeróbio</Text>
              <Text style={[styles.protocolEmptyText, { color: theme.textSecondary }]}>
                Nenhum protocolo aeróbio foi atribuído no momento.
              </Text>
            </View>
          </View>
        )}

        <WaterCard
          aguaBebida={aguaBebida}
          metaAgua={WATER_GOAL_ML}
          setAguaBebida={setAguaBebida}
          onPress={() => router.push("/hydration" as never)}
        />

        <View style={[styles.trackingSection, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.trackingHeader}>
            <View>
              <Text style={[styles.trackingKicker, { color: theme.textSecondary }]}>Evoluções & Acompanhamento</Text>
              <Text style={[styles.trackingTitle, { color: theme.text }]}>Minhas Evoluções</Text>
            </View>
            <View style={styles.trackingPercentPill}>
              <Text style={styles.trackingPercentText}>{weeklyPercent}%</Text>
            </View>
          </View>

          <View style={[styles.trackingProgressTrack, { backgroundColor: theme.inputBorder }]}>
            <View style={[styles.trackingProgressFill, { width: `${weeklyPercent}%` }]} />
          </View>

          <Text style={[styles.trackingSubtitle, { color: theme.textSecondary }]}>
            {weeklyDone} de {weeklyGoal || "-"} treinos no período · {dashboard.profile.frequency.periodLabel}
          </Text>

          <View style={styles.trackingGrid}>
            <TrackingCard
              icon="trending-up-outline"
              title="Evolução de Cargas"
              detail="Cargas, repetições e recordes nos exercícios"
              value="Ver gráficos"
              onPress={() => router.push("/exercise-performance" as never)}
            />
            <TrackingCard
              icon="body-outline"
              title="Evolução Corporal"
              detail="Cadastre peso, fotos e medidas corporais"
              value="Registrar"
              onPress={() => router.push("/weight-progress" as never)}
            />
            <TrackingCard
              icon="chatbubble-ellipses-outline"
              title="Feedbacks de Treino"
              detail={dashboard.recentTrainerResponse ? "Resposta do treinador recebida" : "Envie seu relato e percepção de esforço"}
              value={dashboard.pendingFeedbackCount > 0 ? `${dashboard.pendingFeedbackCount} pendente` : "Relatar"}
              onPress={() => router.push("/student-feedbacks" as never)}
            />
            <TrackingCard
              icon="clipboard-outline"
              title="Avaliações Físicas"
              detail={dashboard.nextAssessmentDays === null ? "Histórico de avaliações do personal" : `Próxima em ${dashboard.nextAssessmentDays} dias`}
              value={dashboard.nextAssessment ? "Ativa" : "--"}
              onPress={() => router.push("/student-assessments" as never)}
            />
          </View>
        </View>
      </ScrollView>

      <AppMiniMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role="STUDENT"
      />

      <StudentConconiProtocolModal
        visible={protocolModalVisible}
        protocol={conconiProtocol}
        onClose={() => setProtocolModalVisible(false)}
      />
    </View>
  );
}

function TrackingCard({
  icon,
  title,
  detail,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  value: string;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
      style={[styles.trackingCard, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={[styles.trackingIconContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Ionicons name={icon} size={18} color="#D90000" />
      </View>
      <View style={styles.trackingCardText}>
        <Text style={[styles.trackingCardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.trackingCardDetail, { color: theme.textSecondary }]}>{detail}</Text>
      </View>
      <Text style={styles.trackingCardValue}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f0f0f",
    padding: 24,
  },
  centerTitle: {
    color: "#fff",
    fontSize: 20,
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
  header: {
    marginBottom: 4,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 140,
    height: 42,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2f2f2f",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#D90000",
  },
  welcomeSection: {
    marginBottom: 10,
  },
  welcomeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  welcome: {
    color: "#ECEDEE",
    fontSize: 25,
    fontWeight: "700",
  },
  name: {
    color: "#D90000",
    fontSize: 30,
    fontWeight: "700",
  },
  consultancySubtitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  progressContainer: {
    position: "relative",
    marginTop: 20,
  },
  progressCard: {
    minHeight: 116,
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#D90000",
    overflow: "hidden",
  },
  progressContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLeft: {
    width: "63%",
    paddingRight: 20,
  },
  progressTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    width: "88%",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  progressBarFill: {
    height: "100%",
    maxWidth: "100%",
    backgroundColor: "#000",
    borderRadius: 4,
  },
  personImage: {
    width: 135,
    height: 135,
    position: "absolute",
    right: 8,
    bottom: -6,
    zIndex: 10,
    elevation: 10,
  },
  checkinCardContainer: {
    marginTop: 10,
    gap: 12,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  dayButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 42,
    flex: 1,
  },
  dayButtonChecked: {
  },
  dayButtonToday: {
  },
  dayText: {
    fontWeight: "700",
    fontSize: 13,
  },
  dayTextChecked: {
    color: "#D90000",
  },
  dayTextToday: {
    color: "#D90000",
  },
  checkIcon: {
    marginTop: 2,
  },
  checkinContainer: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  checkinTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  checkinSubtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  gymCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  gymCardConfirmed: {
    borderWidth: 2,
    borderColor: "#D90000",
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontWeight: "700",
    fontSize: 14,
  },
  gymSubtitle: {
    fontSize: 12,
  },
  confirmedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  planilhaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  planilhaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  planilhaIconContainer: {
    padding: 12,
    borderRadius: 15,
    marginRight: 15,
  },
  planilhaInfo: {
    flex: 1,
  },
  planilhaTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  planilhaStats: {
    flexDirection: "row",
    gap: 15,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
  },
  arrowContainer: {
    backgroundColor: "#D90000",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  trackingSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginTop: 10,
  },
  trackingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  trackingKicker: {
    color: "#D90000",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  trackingTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  trackingPercentPill: {
    minWidth: 54,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  trackingPercentText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  trackingProgressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 13,
  },
  trackingProgressFill: {
    height: "100%",
    maxWidth: "100%",
    borderRadius: 4,
    backgroundColor: "#D90000",
  },
  trackingSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 9,
    lineHeight: 17,
  },
  trackingGrid: {
    gap: 10,
    marginTop: 14,
  },
  trackingCard: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
  },
  trackingIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trackingCardText: {
    flex: 1,
    minWidth: 0,
  },
  trackingCardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  trackingCardDetail: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  trackingCardValue: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "900",
  },
  /* Protocolo Aeróbio Card */
  protocolCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  protocolCardEmpty: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  protocolIconContainerEmpty: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  protocolEmptyText: {
    fontSize: 12,
    marginTop: 2,
  },
  protocolSkeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 10,
    gap: 10,
  },
  protocolSkeletonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  protocolCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  protocolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  protocolInfo: {
    flex: 1,
  },
  protocolTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  protocolTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  protocolDate: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  protocolStatusBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  protocolStatusBadgeText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },
  protocolNotesBox: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
    alignItems: "flex-start",
  },
  protocolNotesText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  protocolActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  protocolActionText: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "800",
  },
  protocolRetryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  protocolRetryText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
