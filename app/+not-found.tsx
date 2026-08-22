import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useCurrentSession } from "@/hooks/use-current-session";
import { getHomeRouteForRole } from "@/services/auth-store";

export default function NotFoundScreen() {
  const router = useRouter();
  const { session } = useCurrentSession();

  const handleGoHome = () => {
    if (session) {
      const homeRoute = getHomeRouteForRole(session.user.role);
      router.replace(homeRoute as never);
    } else {
      router.replace("/login");
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      handleGoHome();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

        <View style={styles.content}>
          {/* ÍCONE 404 DE ALTO PADRÃO */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackdrop}>
              <Ionicons name="compass-outline" size={44} color="#D90000" />
            </View>
            <View style={styles.errorPill}>
              <Text style={styles.errorPillText}>ERRO 404</Text>
            </View>
          </View>

          {/* TEXTOS PRINCIPAIS */}
          <Text style={styles.title}>Página Não Encontrada</Text>
          <Text style={styles.subtitle}>
            O recurso ou tela que você tentou acessar não existe, foi movido ou você não possui permissão para visualizá-lo.
          </Text>

          {/* CARD DE DETALHES TÉCNICOS */}
          <View style={styles.infoCard}>
            <Ionicons name="shield-alert-outline" size={18} color="#888" />
            <Text style={styles.infoText}>
              Verifique a rota digitada ou use os botões abaixo para retornar em segurança ao aplicativo.
            </Text>
          </View>

          {/* BOTÕES DE AÇÃO */}
          <View style={styles.actionsGroup}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoHome}
              activeOpacity={0.84}
            >
              <Ionicons name="home-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Ir para o Início</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleGoBack}
              activeOpacity={0.84}
            >
              <Ionicons name="arrow-back-outline" size={18} color="#aaa" />
              <Text style={styles.secondaryButtonText}>Voltar à Tela Anterior</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  iconBackdrop: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(217, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorPill: {
    position: "absolute",
    bottom: -8,
    backgroundColor: "#D90000",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  errorPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 8,
    marginTop: 10,
  },
  subtitle: {
    color: "#888888",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 14,
    marginBottom: 28,
  },
  infoText: {
    flex: 1,
    color: "#777777",
    fontSize: 12,
    lineHeight: 17,
  },
  actionsGroup: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D90000",
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#141414",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#262626",
  },
  secondaryButtonText: {
    color: "#AAAAAA",
    fontSize: 14,
    fontWeight: "800",
  },
});
