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
import Svg, { Circle, Path } from "react-native-svg";

interface DragonCorpSplashScreenProps {
  onFinish?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function DragonCorpSplashScreen({ onFinish }: DragonCorpSplashScreenProps) {
  // Animated Values
  // Logo starts with opacity 1 and scale 1.0 to match the exact native splash frame 0
  const masterOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1.0)).current;

  // Background fluid wave motion
  const waveTranslateX = useRef(new Animated.Value(-35)).current;
  const waveTranslateY = useRef(new Animated.Value(20)).current;
  const waveOpacity = useRef(new Animated.Value(0)).current;

  // Background counter-flow wave
  const wave2TranslateX = useRef(new Animated.Value(35)).current;
  const wave2Opacity = useRef(new Animated.Value(0)).current;

  // Background subtle pulse ring
  const pulseScale = useRef(new Animated.Value(0.75)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Surgimento suave das ondas fluidas vermelhas atrás da logo (0 - 600ms)
    const wavesEntrance = Animated.parallel([
      Animated.timing(waveOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(waveTranslateX, {
        toValue: 30,
        duration: 1200,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(waveTranslateY, {
        toValue: -15,
        duration: 1200,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(wave2Opacity, {
        toValue: 0.85,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(wave2TranslateX, {
        toValue: -25,
        duration: 1200,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
    ]);

    // 2. Micro-ativação da logo (scale 1.00 -> 0.97 -> 1.02 -> 1.00) e pulso de energia
    const logoMicroActivation = Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 0.97,
        duration: 250,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.02,
          duration: 350,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseOpacity, {
              toValue: 0.4,
              duration: 160,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1.4,
              duration: 480,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(logoScale, {
        toValue: 1.0,
        duration: 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    // 3. Transição suave final (fade out para o app aos ~1.4s)
    const fadeOutMaster = Animated.timing(masterOpacity, {
      toValue: 0,
      duration: 240,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });

    // Orquestração completa sincronizada (~1.5s no total)
    const masterSequence = Animated.sequence([
      Animated.parallel([
        wavesEntrance,
        Animated.sequence([
          Animated.delay(200),
          logoMicroActivation,
        ]),
      ]),
      Animated.delay(100),
      fadeOutMaster,
    ]);

    masterSequence.start(() => {
      onFinish?.();
    });

    return () => {
      masterSequence.stop();
    };
  }, [
    logoOpacity,
    logoScale,
    masterOpacity,
    onFinish,
    pulseOpacity,
    pulseScale,
    wave2Opacity,
    wave2TranslateX,
    waveOpacity,
    waveTranslateX,
    waveTranslateY,
  ]);

  return (
    <Animated.View style={[styles.container, { opacity: masterOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* =========================================================================
          CAMADA DE FUNDO: FORMAS FLUIDAS & LINHAS ABSTRATAS VERMELHAS (SEM GRADIENTE)
      ========================================================================= */}
      <Animated.View
        style={[
          styles.waveLayer,
          {
            opacity: waveOpacity,
            transform: [
              { translateX: waveTranslateX },
              { translateY: waveTranslateY },
            ],
          },
        ]}
      >
        <Svg
          width={SCREEN_WIDTH * 1.4}
          height={SCREEN_HEIGHT * 1.4}
          viewBox="0 0 500 800"
          style={styles.svgFull}
        >
          {/* Linha Curva 1: Rastro fluido superior */}
          <Path
            d="M -50,220 C 120,160 280,340 550,260"
            fill="none"
            stroke="#D90000"
            strokeWidth="2.2"
            strokeOpacity="0.28"
            strokeLinecap="round"
          />

          {/* Linha Curva 2: Onda de energia central cruzando atrás da logo */}
          <Path
            d="M -30,440 C 140,320 320,520 540,390"
            fill="none"
            stroke="#D90000"
            strokeWidth="3.0"
            strokeOpacity="0.35"
            strokeLinecap="round"
          />

          {/* Linha Curva 3: Arco fluido inferior sutil */}
          <Path
            d="M 20,620 C 180,480 340,680 560,560"
            fill="none"
            stroke="#D90000"
            strokeWidth="1.6"
            strokeOpacity="0.18"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Contra-fluxo secundário sutil */}
      <Animated.View
        style={[
          styles.waveLayer,
          {
            opacity: wave2Opacity,
            transform: [{ translateX: wave2TranslateX }],
          },
        ]}
      >
        <Svg
          width={SCREEN_WIDTH * 1.3}
          height={SCREEN_HEIGHT * 1.3}
          viewBox="0 0 500 800"
          style={styles.svgFull}
        >
          <Path
            d="M 520,310 C 380,430 200,280 -40,380"
            fill="none"
            stroke="#D90000"
            strokeWidth="1.8"
            strokeOpacity="0.22"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* =========================================================================
          CAMADA DE PULSO VISUAL SUTIL NO FUNDO (SEM GRADIENTE)
      ========================================================================= */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      >
        <Svg width={260} height={260} viewBox="0 0 260 260">
          <Circle
            cx={130}
            cy={130}
            r={110}
            fill="none"
            stroke="#D90000"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
        </Svg>
      </Animated.View>

      {/* =========================================================================
          LOGO DRAGONCORP CENTRALIZADA (100x100 - IDÊNTICA À NATIVE SPLASH FRAME 0)
      ========================================================================= */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("@/assets/images/logo-principal.png")}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityLabel="DragonCorp Logo"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  waveLayer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  svgFull: {
    position: "absolute",
  },
  pulseRing: {
    position: "absolute",
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 100,
    height: 100,
  },
});
