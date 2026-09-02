import React, { useEffect, useState } from "react";
import { Dimensions, Image, StatusBar, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { getCurrentSession, getHomeRouteForRole } from "@/services/auth-store";
import { syncUserSubscriptionOnLaunch } from "@/services/subscription-service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Rota Inicial do Aplicativo
 * Apresenta fundo preto sólido (#000000) e exclusivamente a logo vermelha do DragonCorp
 * enquanto verifica a sessão do usuário de forma fluida e silenciosa.
 */
export default function Index() {
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAuthAndSubscription() {
      try {
        const session = await getCurrentSession();
        if (!mounted) return;

        if (!session || !session.user) {
          setTargetRoute("/login");
          return;
        }

        // Sincroniza assinatura nas lojas em segundo plano
        if (session.user.role === "TRAINER") {
          try {
            await syncUserSubscriptionOnLaunch(session.user.id);
          } catch {
            // Continua sem travar inicialização
          }
        }

        setTargetRoute(getHomeRouteForRole(session.user.role));
      } catch {
        if (mounted) {
          setTargetRoute("/login");
        }
      }
    }

    checkAuthAndSubscription();

    return () => {
      mounted = false;
    };
  }, []);

  if (!targetRoute) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Image
          source={require("@/assets/images/logo-principal.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <Redirect href={targetRoute as never} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: Math.min(SCREEN_WIDTH * 0.44, 180),
    height: Math.min(SCREEN_WIDTH * 0.44, 180),
  },
});
