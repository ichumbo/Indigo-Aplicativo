import React from "react";
import {
  Image,
  ImageProps,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
} from "react-native";

export type BrandLogoVariant = "full" | "symbol";
export type BrandLogoTheme = "dark" | "light" | "red";

export interface BrandLogoProps extends Omit<ImageProps, "source"> {
  variant?: BrandLogoVariant;
  theme?: BrandLogoTheme;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * Retorna o asset correto da nova identidade visual DragonCorp
 * baseado no formato (símbolo vs logotipo completo) e na cor de fundo (escuro, claro ou vermelho).
 */
export function getBrandLogoSource(
  variant: BrandLogoVariant = "full",
  theme: BrandLogoTheme = "dark"
): ImageSourcePropType {
  if (variant === "symbol") {
    switch (theme) {
      case "red":
        return require("@/assets/images/logo-white.png");
      case "light":
        return require("@/assets/images/logo-principal.png");
      case "dark":
      default:
        return require("@/assets/images/logo-principal.png");
    }
  }

  // variant === "full" (Logotipo horizontal completo)
  switch (theme) {
    case "red":
      return require("@/assets/images/logotipo-white.png");
    case "light":
      return require("@/assets/images/logotipo-black.png");
    case "dark":
    default:
      return require("@/assets/images/logotipo-principal.png");
  }
}

/**
 * Componente oficial de exibição da Identidade Visual DragonCorp.
 * Suporta 3 variações de fundo (Dark, Light, Red) e 2 formatos (Full Logotipo ou Símbolo).
 */
export function BrandLogo({
  variant = "full",
  theme = "dark",
  width,
  height,
  style,
  resizeMode = "contain",
  ...rest
}: BrandLogoProps) {
  const source = getBrandLogoSource(variant, theme);

  const defaultDimensions =
    variant === "full"
      ? { width: width ?? 160, height: height ?? 44 }
      : { width: width ?? 44, height: height ?? 44 };

  return (
    <Image
      source={source}
      style={[styles.base, defaultDimensions, style]}
      resizeMode={resizeMode}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "center",
  },
});
