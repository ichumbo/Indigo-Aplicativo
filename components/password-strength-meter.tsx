import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type PasswordStrengthLevel = "none" | "weak" | "medium" | "strong";

export interface PasswordStrengthResult {
  score: number; // 0 a 100
  level: PasswordStrengthLevel;
  label: string;
  color: string;
  feedback: string;
  isValid: boolean;
}

export interface PasswordStrengthMeterProps {
  password: string;
  personalData?: {
    name?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  };
}

const COMMON_WEAK_PASSWORDS = [
  "123456",
  "12345678",
  "123456789",
  "password",
  "senha123",
  "dragoncorp",
  "dragon123",
  "qwerty",
  "admin123",
  "personal123",
  "treinador",
  "academia",
];

export function evaluatePasswordStrength(
  password: string,
  personalData?: {
    name?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  }
): PasswordStrengthResult {
  if (!password || password.length === 0) {
    return {
      score: 0,
      level: "none",
      label: "Não informada",
      color: "#6B7280",
      feedback: "Digite uma senha com no mínimo 8 caracteres.",
      isValid: false,
    };
  }

  const clean = password.trim().toLowerCase();

  // 1. Bloqueio de senhas comuns
  if (COMMON_WEAK_PASSWORDS.includes(clean)) {
    return {
      score: 15,
      level: "weak",
      label: "Senha muito fraca",
      color: "#EF4444",
      feedback: "Esta senha é muito comum e fácil de adivinhar.",
      isValid: false,
    };
  }

  // 2. Bloqueio de sequências simples ou repetições
  if (/^(\d)\1+$/.test(password) || /^([a-zA-Z])\1+$/.test(password)) {
    return {
      score: 20,
      level: "weak",
      label: "Senha fraca",
      color: "#EF4444",
      feedback: "Evite repetir o mesmo caractere várias vezes.",
      isValid: false,
    };
  }

  // 3. Bloqueio de dados pessoais óbvios
  if (personalData) {
    const cpfDigits = (personalData.cpf || "").replace(/\D/g, "");
    if (cpfDigits && cpfDigits.length >= 6 && clean.includes(cpfDigits.slice(0, 6))) {
      return {
        score: 20,
        level: "weak",
        label: "Senha fraca",
        color: "#EF4444",
        feedback: "Não utilize partes do seu CPF na senha.",
        isValid: false,
      };
    }

    const phoneDigits = (personalData.phone || "").replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length >= 6) {
      for (let i = 0; i <= phoneDigits.length - 6; i++) {
        const chunk = phoneDigits.slice(i, i + 6);
        if (clean.includes(chunk)) {
          return {
            score: 20,
            level: "weak",
            label: "Senha fraca",
            color: "#EF4444",
            feedback: "Não utilize seu número de telefone na senha.",
            isValid: false,
          };
        }
      }
    }

    if (personalData.name && personalData.name.length >= 3) {
      const firstName = personalData.name.trim().toLowerCase().split(" ")[0];
      if (firstName.length >= 3 && clean.includes(firstName)) {
        return {
          score: 20,
          level: "weak",
          label: "Senha fraca",
          color: "#EF4444",
          feedback: "Não utilize seu nome na senha.",
          isValid: false,
        };
      }
    }
  }

  // 4. Cálculo de Força
  let score = 0;

  // Comprimento
  if (password.length >= 8) score += 25;
  if (password.length >= 10) score += 15;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;

  // Variedade de Caracteres
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  // Classificação em 3 estados
  if (score < 45 || password.length < 8) {
    return {
      score: Math.min(score, 35),
      level: "weak",
      label: "Senha fraca",
      color: "#EF4444",
      feedback: "Mínimo 8 caracteres. Misture letras, números ou símbolos.",
      isValid: false,
    };
  }

  if (score < 75) {
    return {
      score,
      level: "medium",
      label: "Senha média",
      color: "#F59E0B",
      feedback: "Boa senha! Adicione mais caracteres para torná-la forte.",
      isValid: true,
    };
  }

  return {
    score: Math.min(score, 100),
    level: "strong",
    label: "Senha forte",
    color: "#10B981",
    feedback: "Excelente! Esta senha atende aos padrões de segurança recomendados.",
    isValid: true,
  };
}

export function PasswordStrengthMeter({ password, personalData }: PasswordStrengthMeterProps) {
  if (!password || password.length === 0) return null;

  const result = evaluatePasswordStrength(password, personalData);

  const getSegmentColor = (segmentIndex: number) => {
    if (result.level === "weak") {
      return segmentIndex === 1 ? result.color : "#2A2A2A";
    }
    if (result.level === "medium") {
      return segmentIndex <= 2 ? result.color : "#2A2A2A";
    }
    if (result.level === "strong") {
      return result.color;
    }
    return "#2A2A2A";
  };

  const getIconName = () => {
    switch (result.level) {
      case "weak":
        return "alert-circle";
      case "medium":
        return "checkmark-circle";
      case "strong":
        return "shield-checkmark";
      default:
        return "information-circle";
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra Segmentada em 3 Partes */}
      <View style={styles.segmentsRow}>
        <View style={[styles.segment, { backgroundColor: getSegmentColor(1) }]} />
        <View style={[styles.segment, { backgroundColor: getSegmentColor(2) }]} />
        <View style={[styles.segment, { backgroundColor: getSegmentColor(3) }]} />
      </View>

      {/* Rótulo e Feedback em Texto */}
      <View style={styles.feedbackRow}>
        <Ionicons name={getIconName()} size={14} color={result.color} style={styles.icon} />
        <Text style={[styles.label, { color: result.color }]}>{result.label}: </Text>
        <Text style={styles.feedbackText} numberOfLines={2}>
          {result.feedback}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 8,
    width: "100%",
  },
  segmentsRow: {
    flexDirection: "row",
    gap: 6,
    height: 4,
    width: "100%",
    marginBottom: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackText: {
    fontSize: 12,
    color: "#9CA3AF",
    flex: 1,
  },
});
