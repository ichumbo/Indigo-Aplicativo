import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

interface DragonCorpSplashScreenProps {
  onFinish?: () => void;
}

/**
 * Splash Screen Minimalista Oficial DragonCorp
 * Fundo vermelho (#FF0303) e exclusivamente a logo preta do dragão centralizada
 * Sem textos, sem "Carregando...", sem spinners, sem barras e sem ondas extras
 */
export function DragonCorpSplashScreen({ onFinish }: DragonCorpSplashScreenProps) {
  const { width } = useWindowDimensions();
  const masterOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;

  const logoSize = Math.min(width * 0.48, 200);

  useEffect(() => {
    // Animação fluida e suave: fade in + scale suave -> pausa -> fade out suave
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.0,
          duration: 550,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(800),
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
      <StatusBar barStyle="light-content" backgroundColor="#FF0303" />

      {/* CENTRO: EXCLUSIVAMENTE A LOGO PRETA DO DRAGONCORP */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FF0303",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
});

