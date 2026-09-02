import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

interface DragonCorpSplashScreenProps {
  onFinish?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Splash Screen Minimalista Oficial DragonCorp
 * Fundo preto sólido (#000000) e exclusivamente a logo vermelha do dragão centralizada
 * Sem textos, sem "Carregando...", sem spinners, sem barras e sem ondas extras
 */
export function DragonCorpSplashScreen({ onFinish }: DragonCorpSplashScreenProps) {
  const masterOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1.0)).current;

  useEffect(() => {
    // Micro-animação sutil e premium da logo vermelha (1.00 -> 1.03 -> 1.00)
    const animation = Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1.03,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1.0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(masterOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(() => {
      onFinish?.();
    });

    return () => {
      animation.stop();
    };
  }, [onFinish, logoScale, logoOpacity, masterOpacity]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: masterOpacity,
        },
      ]}
      pointerEvents="none"
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* CENTRO: EXCLUSIVAMENTE A LOGO VERMELHA DO DRAGONCORP */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Image
            source={require("@/assets/images/logo-principal.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  logoImage: {
    width: Math.min(SCREEN_WIDTH * 0.44, 180),
    height: Math.min(SCREEN_WIDTH * 0.44, 180),
  },
});
