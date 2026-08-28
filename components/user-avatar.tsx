import React from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { getBrandLogoSource } from "@/components/brand-logo";

export interface UserAvatarProps {
  uri?: string | null;
  size?: number;
  rounded?: "full" | "lg" | "md";
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

/**
 * Componente oficial de Avatar de Usuário DragonCorp.
 * Se o usuário possuir foto (`uri`), exibe a imagem.
 * Se `uri` for nulo, indefinido ou vazio, renderiza o símbolo oficial do Dragão Vermelho
 * sobre o fundo preto sólido com proporção 1:1.
 */
export function UserAvatar({
  uri,
  size = 48,
  rounded = "full",
  style,
  imageStyle,
  accessibilityLabel = "Avatar do usuário",
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

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
});
