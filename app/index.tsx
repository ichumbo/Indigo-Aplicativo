import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getCurrentSession, getHomeRouteForRole } from "@/services/auth-store";

export default function Index() {
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then((session) => {
        if (!mounted) return;
        setTargetRoute(session ? getHomeRouteForRole(session.user.role) : "/login");
      })
      .catch(() => {
        if (mounted) setTargetRoute("/login");
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!targetRoute) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Carregando sessao...</Text>
      </View>
    );
  }

  return <Redirect href={targetRoute as never} />;
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f0f0f",
    padding: 24,
  },
  centerText: {
    color: "#999",
    fontSize: 14,
    marginTop: 10,
  },
});
