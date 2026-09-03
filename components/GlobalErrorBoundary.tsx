import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log seguro do erro para auditoria interna
    console.error("[DragonCorp Boundary]", error.name, error.message, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning-outline" size={48} color="#D90000" />
            </View>

            <Text style={styles.title}>Ops! Algo deu errado</Text>
            <Text style={styles.subtitle}>
              O DragonCorp encontrou uma instabilidade inesperada. Seus dados e treinos permanecem salvos em segurança.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.devBox}>
                <Text style={styles.devErrorTitle}>{this.state.error.toString()}</Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.devStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleReset}
              activeOpacity={0.88}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Reiniciar Aplicativo</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0E",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#16161A",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#26262E",
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(217, 0, 0, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(217, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  devBox: {
    maxHeight: 140,
    width: "100%",
    backgroundColor: "#09090C",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
    fontFamily: "monospace",
    marginBottom: 6,
  },
  devStack: {
    fontSize: 10.5,
    color: "#6B7280",
    fontFamily: "monospace",
    lineHeight: 15,
  },
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D90000",
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#D90000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
