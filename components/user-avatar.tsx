import React from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { getBrandLogoSource } from "@/components/brand-logo";

export interface UserAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  rounded?: "full" | "lg" | "md";
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  fallbackMode?: "initials" | "dragon" | "auto";
}

function getInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Componente oficial de Avatar de Usuário DragonCorp.
 * Se o usuário possuir foto (`uri`), exibe a imagem.
 * Se `uri` for nulo, indefinido ou vazio:
 * - Se `name` for fornecido e fallbackMode for "initials" ou "auto", exibe as iniciais do usuário.
 * - Caso contrário, renderiza o símbolo oficial do Dragão Vermelho.
 */
export function UserAvatar({
  uri,
  name,
  size = 48,
  rounded = "full",
  style,
  imageStyle,
  textStyle,
  accessibilityLabel = "Avatar do usuário",
  fallbackMode = "auto",
}: UserAvatarProps) {
  const borderRadius =
    rounded === "full" ? size / 2 : rounded === "lg" ? size * 0.25 : size * 0.15;

  const hasCustomPhoto = Boolean(
    uri && typeof uri === "string" && uri.trim().length > 0 && !uri.includes("pravatar.cc")
  );

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor: "#000000",
    borderWidth: 1.5,
    borderColor: "#222222",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  };

  if (hasCustomPhoto) {
    return (
      <View style={[containerStyle, style]} accessibilityLabel={accessibilityLabel}>
        <Image
          source={{ uri: uri as string }}
          style={[
            {
              width: size,
              height: size,
              borderRadius,
            },
            imageStyle,
          ]}
          resizeMode="cover"
        />
      </View>
    );
  }

  const initials = getInitials(name);
  if (initials && fallbackMode !== "dragon") {
    return (
      <View
        style={[
          containerStyle,
          {
            backgroundColor: "#1C1C1E",
            borderColor: "#D6282830",
          },
          style,
        ]}
        accessibilityLabel={accessibilityLabel}
      >
        <Text
          style={[
            {
              color: "#FFFFFF",
              fontSize: Math.round(size * 0.38),
              fontWeight: "700",
              letterSpacing: 0.5,
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {initials}
        </Text>
      </View>
    );
  }

  // Fallback Oficial: Símbolo do Dragão Vermelho sobre fundo preto
  const dragonSource = getBrandLogoSource("symbol", "dark");

  return (
    <View style={[containerStyle, style]} accessibilityLabel={accessibilityLabel}>
      <Image
        source={dragonSource}
        style={[
          {
            width: size * 0.75,
            height: size * 0.75,
          },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}
