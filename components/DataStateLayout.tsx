import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/use-app-theme";

export type DataLoadingState = "initial" | "loading" | "success" | "empty" | "error";

export interface DataStateLayoutProps {
  state: DataLoadingState;
  hasData?: boolean;
  children: ReactNode;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  errorMessage?: string;
  onRetry?: () => void;
  skeletonComponent?: ReactNode;
}

export function DataStateLayout({
  state,
  hasData = false,
  children,
  loadingMessage = "Carregando informações...",
  emptyTitle = "Nenhum registro encontrado",
  emptyMessage = "Não há dados para exibir no momento.",
  emptyIcon = "file-tray-outline",
  emptyActionLabel,
  onEmptyAction,
  errorMessage = "Não foi possível carregar os dados.",
  onRetry,
  skeletonComponent,
}: DataStateLayoutProps) {
  const { theme } = useAppTheme();

  // Se estiver carregando mas JÁ POSSUI DADOS prévios em memória:
  // Renderiza os dados preservando a tela sem flicker (stale-while-revalidate)
  if (state === "loading" && hasData) {
    return (
      <View style={styles.flex}>
        <View style={styles.revalidatingBar}>
          <ActivityIndicator size="small" color="#D90000" style={{ marginRight: 8 }} />
          <Text style={styles.revalidatingText}>Atualizando...</Text>
        </View>
        {children}
      </View>
    );
  }

  // Estado Inicial ou Carregamento sem dados prévios
  if (state === "initial" || state === "loading") {
    if (skeletonComponent) {
      return <View style={styles.flex}>{skeletonComponent}</View>;
    }

    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#D90000" />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            {loadingMessage}
          </Text>
        </View>
      </View>
    );
  }

  // Estado de Erro
  if (state === "error") {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <View style={styles.stateCard}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          </View>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Falha ao carregar</Text>
          <Text style={[styles.stateSubtitle, { color: theme.textMuted }]}>
            {errorMessage}
          </Text>
          {onRetry && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Estado Vazio (Empty State)
  if (state === "empty") {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <View style={styles.stateCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name={emptyIcon} size={44} color="#D90000" />
          </View>
          <Text style={[styles.stateTitle, { color: theme.text }]}>{emptyTitle}</Text>
          <Text style={[styles.stateSubtitle, { color: theme.textMuted }]}>
            {emptyMessage}
          </Text>
          {emptyActionLabel && onEmptyAction && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEmptyAction}
              activeOpacity={0.85}
            >
              <Text style={styles.actionButtonText}>{emptyActionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Estado de Sucesso
  return <View style={styles.flex}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 13.5,
    marginTop: 14,
    fontWeight: "500",
  },
  revalidatingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    backgroundColor: "rgba(217, 0, 0, 0.08)",
  },
  revalidatingText: {
    fontSize: 11,
    color: "#D90000",
    fontWeight: "600",
  },
  stateCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#16161A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#26262E",
    padding: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(217, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  actionButton: {
    backgroundColor: "#D90000",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
});
