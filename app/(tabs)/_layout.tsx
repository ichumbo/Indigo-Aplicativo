import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppRole,
  canAccessRoute,
  getDefaultPathForRole,
  getHomeRouteForRole,
  logDeniedRoute,
} from '@/services/auth-store';
import { useResponsiveLayout } from '@/constants/responsive';
import { getUnreadFeedbackCount, getUnreadNotificationCount } from '@/services/feedback-store';
import { useCurrentSession } from '@/hooks/use-current-session';

// 🎨 Tema centralizado
const theme = {
  colors: {
    active: '#D90000',
    inactive: '#666666',
    appBackground: '#0f0f0f',
    background: '#1b1b1bff',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  sizes: {
    tabHeight: 64,
    tabRadius: 18,
    iconSize: 22,
  },
};

type TabItem = {
  name: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  badge?: number;
};



export default function TabsContainer() {
  const [feedbackBadge, setFeedbackBadge] = useState(0);
  const [messageBadge, setMessageBadge] = useState(0);
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const pathname = usePathname();
  const sessionUserId = session?.user.id;
  const role = session?.user.role;
  const routeAllowed = session ? canAccessRoute(session, pathname) : false;

  useEffect(() => {
    if (!sessionUserId || !role) return;

    let mounted = true;

    const loadBadge = () => {
      const badgePromise =
        role === "TRAINER"
          ? getUnreadFeedbackCount(sessionUserId)
          : getUnreadNotificationCount(sessionUserId);

      badgePromise
        .then((count) => {
          if (!mounted) return;
          if (role === "TRAINER") {
            setFeedbackBadge((current) => (current === count ? current : count));
          } else {
            setMessageBadge((current) => (current === count ? current : count));
          }
        })
        .catch(() => {
          if (!mounted) return;
          if (role === "TRAINER") {
            setFeedbackBadge((current) => (current === 0 ? current : 0));
          } else {
            setMessageBadge((current) => (current === 0 ? current : 0));
          }
        });
    };

    loadBadge();

    return () => {
      mounted = false;
    };
  }, [pathname, role, sessionUserId]);

  useEffect(() => {
    if (session && !routeAllowed) {
      void logDeniedRoute(pathname, session);
    }
  }, [pathname, routeAllowed, session]);

  if (loadingSession) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando sessao...</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!routeAllowed) {
    return <Redirect href={getHomeRouteForRole(session.user.role) as never} />;
  }

  const currentRole = session.user.role;
  const tabBarWidth = Math.min(
    Math.max(0, layout.width - layout.tabBarHorizontalMargin * 2),
    layout.contentMaxWidth
  );
  const trainerOnlyHref = currentRole === "TRAINER" ? undefined : null;
  const studentOnlyHref = currentRole === "STUDENT" ? undefined : null;
  const showBackButton = shouldShowTabBackButton(pathname, currentRole, typeof params.studentId === "string");

  const handleBack = () => {
    if (currentRole === "TRAINER" && pathname === "/profile" && typeof params.studentId === "string") {
      router.replace({ pathname: "/profile" as never, params: {} });
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(getDefaultPathForRole(currentRole) as never);
  };

  return (
    <View style={styles.tabsShell}>
      <Tabs
        backBehavior="history"
        initialRouteName={currentRole === "STUDENT" ? "student" : "index"}
        tabBar={(props) => (
          <AppTabBar
            {...props}
            role={currentRole}
            bottom={layout.tabBarBottom}
            feedbackBadge={feedbackBadge}
            messageBadge={messageBadge}
            isCompact={layout.isCompact}
            barWidth={tabBarWidth}
            tabBarHeight={layout.tabBarHeight}
          />
        )}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.colors.appBackground,
          },
          tabBarActiveTintColor: '#D90000',
          tabBarInactiveTintColor: theme.colors.inactive,
          tabBarHideOnKeyboard: true,
          tabBarAllowFontScaling: false,
        }}
      >
        {/* 🏠 Home */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            href: trainerOnlyHref,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={theme.sizes.iconSize} color={color} />
            ),
          }}
        />

      <Tabs.Screen
        name="student"
        options={{
          title: 'Home',
          href: studentOnlyHref,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 💪 Training */}
      <Tabs.Screen
        name="training"
        options={{
          title: 'Treinos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'fitness' : 'fitness-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* ⏱️ Timer */}
      <Tabs.Screen
        name="timer"
        options={{
          title: 'Timer',
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stopwatch' : 'stopwatch-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 🛡️ Admin */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Alunos',
          href: trainerOnlyHref,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 📋 Avaliações */}
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Avaliações',
          tabBarLabel: 'Aval.',
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 💬 Feedbacks */}
      <Tabs.Screen
        name="feedbacks"
        options={{
          title: 'Feedbacks',
          tabBarLabel: 'Feedback',
          href: trainerOnlyHref,
          tabBarBadge: feedbackBadge > 0 ? feedbackBadge : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#D90000',
            color: '#fff',
            fontWeight: '800',
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="evolution"
        options={{
          title: 'Evolução',
          tabBarLabel: 'Evolução',
          href: studentOnlyHref,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensagens',
          tabBarLabel: 'Mensagens',
          href: studentOnlyHref,
          tabBarBadge: messageBadge > 0 ? messageBadge : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#D90000',
            color: '#fff',
            fontWeight: '800',
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 👤 Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      </Tabs>

      {showBackButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          onPress={handleBack}
          style={[styles.globalBackButton, { left: layout.horizontalPadding, top: Math.max(insets.top + 10, 42) }]}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function AppTabBar({
  state,
  navigation,
  role,
  bottom,
  feedbackBadge,
  messageBadge,
  isCompact,
  barWidth,
  tabBarHeight,
}: BottomTabBarProps & {
  role: AppRole;
  bottom: number;
  feedbackBadge: number;
  messageBadge: number;
  isCompact: boolean;
  barWidth: number;
  tabBarHeight: number;
}) {
  const router = useRouter();
  const items = getTabItems(role, feedbackBadge, messageBadge);
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View collapsable={false} style={styles.customTabBarLayer}>
      <View
        collapsable={false}
        style={[
          styles.customTabBar,
          isCompact && styles.customTabBarCompact,
          {
            bottom,
            left: "50%",
            width: barWidth,
            height: tabBarHeight,
            transform: [{ translateX: -barWidth / 2 }],
          },
        ]}
      >
        {items.map((item) => {
          const route = state.routes.find((currentRoute) => currentRoute.name === item.name);
          const focused = activeRouteName === item.name;
          const color = focused ? theme.colors.active : theme.colors.inactive;

          if (!route) return null;

          const navigateToTab = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (role === "TRAINER" && item.name === "profile" && !event.defaultPrevented) {
              router.replace("/profile" as never);
              return;
            }

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={item.label}
              hitSlop={8}
              onPress={navigateToTab}
              style={[styles.customTabItem, isCompact && styles.customTabItemCompact]}
            >
              <View style={[styles.customTabIconWrap, isCompact && styles.customTabIconWrapCompact]}>
                <Ionicons name={focused ? item.activeIcon : item.inactiveIcon} size={isCompact ? 20 : theme.sizes.iconSize} color={color} />
                {item.badge && item.badge > 0 ? (
                  <View style={styles.customTabBadge}>
                    <Text style={styles.customTabBadgeText}>{item.badge > 9 ? "9+" : item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.customTabLabel, isCompact && styles.customTabLabelCompact, { color }]} numberOfLines={1} adjustsFontSizeToFit>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getTabItems(role: AppRole, feedbackBadge: number, messageBadge: number): TabItem[] {
  if (role === "STUDENT") {
    return [
      { name: "student", label: "Home", activeIcon: "home", inactiveIcon: "home-outline" },
      { name: "training", label: "Treinos", activeIcon: "fitness", inactiveIcon: "fitness-outline" },
      { name: "evolution", label: "Evolução", activeIcon: "analytics", inactiveIcon: "analytics-outline" },
      { name: "messages", label: "Mensagens", activeIcon: "chatbubbles", inactiveIcon: "chatbubbles-outline", badge: messageBadge },
      { name: "profile", label: "Perfil", activeIcon: "person", inactiveIcon: "person-outline" },
    ];
  }

  return [
    { name: "index", label: "Home", activeIcon: "home", inactiveIcon: "home-outline" },
    { name: "training", label: "Treinos", activeIcon: "fitness", inactiveIcon: "fitness-outline" },
    { name: "admin", label: "Alunos", activeIcon: "people", inactiveIcon: "people-outline" },
    { name: "feedbacks", label: "Feedback", activeIcon: "chatbubbles", inactiveIcon: "chatbubbles-outline", badge: feedbackBadge },
    { name: "profile", label: "Perfil", activeIcon: "person", inactiveIcon: "person-outline" },
  ];
}

function shouldShowTabBackButton(pathname: string, role: AppRole, hasStudentProfileParam: boolean) {
  if (role === "TRAINER" && pathname === "/profile" && hasStudentProfileParam) return true;

  const trainerTabRoutes = new Set(["/", "/training", "/admin", "/feedbacks", "/profile"]);
  const studentTabRoutes = new Set(["/student", "/training", "/evolution", "/messages", "/profile"]);
  const tabRoutes = role === "STUDENT" ? studentTabRoutes : trainerTabRoutes;

  return !tabRoutes.has(pathname);
}

const styles = StyleSheet.create({
  tabsShell: {
    flex: 1,
    backgroundColor: theme.colors.appBackground,
  },
  globalBackButton: {
    position: 'absolute',
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2f2f2f',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    zIndex: 10001,
  },
  customTabBarLayer: {
    ...StyleSheet.absoluteFillObject,
    elevation: 10000,
    pointerEvents: 'box-none',
    zIndex: 10000,
  },
  customTabBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: '#ffffff1c',
    borderRadius: theme.sizes.tabRadius,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 999,
    pointerEvents: 'auto',
    zIndex: 999,
  },
  customTabBarCompact: {
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  customTabItem: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  customTabItemCompact: {
    height: 50,
  },
  customTabIconWrap: {
    width: 30,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTabIconWrapCompact: {
    width: 28,
  },
  customTabLabel: {
    maxWidth: '100%',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    letterSpacing: 0,
    includeFontPadding: false,
    marginTop: 1,
  },
  customTabLabelCompact: {
    fontSize: 9,
    lineHeight: 12,
  },
  customTabBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.active,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  customTabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.appBackground,
    padding: 24,
  },
  centerText: {
    color: '#999',
    fontSize: 14,
    marginTop: 10,
  },
});
