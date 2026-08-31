import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useAppTheme } from "@/hooks/use-app-theme";

interface ModernBottleVisualizerProps {
  consumedMl: number;
  targetMl: number;
  size?: "compact" | "large";
}

export default function ModernBottleVisualizer({
  consumedMl,
  targetMl,
  size = "compact",
}: ModernBottleVisualizerProps) {
  const { theme, isDark } = useAppTheme();
  const isLarge = size === "large";

  const safeTarget = targetMl > 0 ? targetMl : 2000;
  const percentage = Math.min(100, Math.max(0, Math.round((consumedMl / safeTarget) * 100)));

  // Animação de preenchimento fluido com mola
  const fillHeight = useSharedValue(percentage);
  // Animação de oscilação contínua da onda da água
  const waveOffset = useSharedValue(0);

  useEffect(() => {
    fillHeight.value = withSpring(percentage, {
      damping: 18,
      stiffness: 120,
    });
  }, [percentage, fillHeight]);

  useEffect(() => {
    waveOffset.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(0, { duration: 1800 })
      ),
      -1,
      true
    );
  }, [waveOffset]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    height: `${Math.min(100, Math.max(percentage > 0 ? 5 : 0, fillHeight.value))}%`,
  }));

  const bottleWidth = isLarge ? 84 : 64;
  const bottleHeight = isLarge ? 160 : 130;

  return (
    <View style={[styles.container, { width: bottleWidth }]}>
      {/* 1. TAMPA ERGONÔMICA ESPORTIVA COM BICO E TRAVA */}
      <View style={styles.capAssembly}>
        {/* Bico de sucção esportivo */}
        <View style={[styles.spoutTip, isLarge && styles.spoutTipLarge]} />

        {/* Corpo da tampa com trava metálica */}
        <View
          style={[
            styles.capBody,
            { backgroundColor: theme.bottleCap, borderColor: theme.bottleCapBorder },
            isLarge && styles.capBodyLarge,
          ]}
        >
          <View style={styles.capLockBand} />
        </View>

        {/* Anel de vedação do gargalo */}
        <View
          style={[
            styles.neckRing,
            { backgroundColor: theme.bottleCap, borderColor: theme.bottleCapBorder },
            isLarge && styles.neckRingLarge,
          ]}
        />
      </View>

      {/* 2. CORPO PRINCIPAL DA GARRAFA */}
      <View
        style={[
          styles.bottleBody,
          {
            width: bottleWidth,
            height: bottleHeight,
            borderRadius: isLarge ? 20 : 16,
            backgroundColor: theme.bottleBody,
            borderColor: theme.bottleBorder,
          },
        ]}
      >
        {/* Marcadores volumétricos gravados a laser */}
        <View style={styles.ticksContainer}>
          <View style={[styles.tickRow, { bottom: "85%" }]}>
            <View style={styles.tickLineMajor} />
            <Text style={[styles.tickText, { color: theme.bottleTicks }]}>{safeTarget}ml</Text>
          </View>
          <View style={[styles.tickRow, { bottom: "60%" }]}>
            <View style={[styles.tickLine, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(15, 23, 42, 0.2)" }]} />
            <Text style={[styles.tickText, { color: theme.bottleTicks }]}>{Math.round(safeTarget * 0.75)}ml</Text>
          </View>
          <View style={[styles.tickRow, { bottom: "40%" }]}>
            <View style={[styles.tickLine, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(15, 23, 42, 0.2)" }]} />
            <Text style={[styles.tickText, { color: theme.bottleTicks }]}>{Math.round(safeTarget * 0.5)}ml</Text>
          </View>
          <View style={[styles.tickRow, { bottom: "20%" }]}>
            <View style={[styles.tickLine, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(15, 23, 42, 0.2)" }]} />
            <Text style={[styles.tickText, { color: theme.bottleTicks }]}>{Math.round(safeTarget * 0.25)}ml</Text>
          </View>
        </View>

        {/* Brilho e reflexo vertical de vidro */}
        <View style={[styles.glassReflection, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.6)" }]} />

        {/* 3. LÍQUIDO ANIMADO (AZUL ÍNDIGO PURO SEM GRADIENTES) */}
        <Animated.View style={[styles.fluidContainer, animatedFillStyle]}>
          {/* Superfície / Menisco da Água */}
          <View style={styles.meniscusSurface}>
            <Svg width="100%" height={6} viewBox="0 0 100 6" preserveAspectRatio="none">
              <Path
                d="M0 3 Q 25 0, 50 3 T 100 3 L 100 6 L 0 6 Z"
                fill="#38BDF8"
              />
            </Svg>
          </View>

          {/* Massa líquida sólida azul */}
          <View style={styles.fluidMass} />

          {/* Micro bolhas estilizadas no líquido */}
          <View style={[styles.microBubble, { bottom: 15, left: 12, width: 4, height: 4 }]} />
          <View style={[styles.microBubble, { bottom: 35, right: 14, width: 3, height: 3 }]} />
          <View style={[styles.microBubble, { bottom: 55, left: 20, width: 5, height: 5 }]} />
        </Animated.View>

        {/* Cinta de aderência esportiva central sutil */}
        <View style={styles.gripBeltBand} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  capAssembly: {
    alignItems: "center",
    marginBottom: 2,
  },
  spoutTip: {
    width: 14,
    height: 5,
    backgroundColor: "#00A3FF",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  spoutTipLarge: {
    width: 18,
    height: 7,
  },
  capBody: {
    width: 32,
    height: 10,
    backgroundColor: "#1c2430",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2d3d52",
    justifyContent: "center",
    alignItems: "center",
  },
  capBodyLarge: {
    width: 42,
    height: 13,
  },
  capLockBand: {
    width: "80%",
    height: 2,
    backgroundColor: "#00A3FF",
    borderRadius: 1,
  },
  neckRing: {
    width: 24,
    height: 4,
    backgroundColor: "#161d26",
    borderWidth: 1,
    borderColor: "#243040",
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  neckRingLarge: {
    width: 30,
    height: 5,
  },
  bottleBody: {
    backgroundColor: "#0c1219",
    borderWidth: 1.5,
    borderColor: "#1e2c3d",
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
  },
  ticksContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    pointerEvents: "none",
  },
  tickRow: {
    position: "absolute",
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tickLineMajor: {
    width: 8,
    height: 1.5,
    backgroundColor: "#38BDF8",
    opacity: 0.6,
  },
  tickLine: {
    width: 5,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  tickText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  glassReflection: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 4,
    width: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 2,
    zIndex: 15,
  },
  gripBeltBand: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    height: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(0, 163, 255, 0.03)",
    zIndex: 12,
    pointerEvents: "none",
  },
  fluidContainer: {
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  meniscusSurface: {
    width: "100%",
    height: 6,
    zIndex: 8,
  },
  fluidMass: {
    flex: 1,
    backgroundColor: "#0284C7",
    minHeight: 4,
  },
  microBubble: {
    position: "absolute",
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    zIndex: 9,
  },
});
