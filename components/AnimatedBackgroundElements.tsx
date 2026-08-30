import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated } from "react-native";

export function AnimatedBackgroundElements() {
  const circleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(circleAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [circleAnim]);

  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.backgroundElements,
          {
            pointerEvents: "none",
            transform: [
              {
                rotate: circleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.circle1,
            {
              transform: [
                {
                  scale: circleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.2, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle2,
            {
              transform: [
                {
                  translateY: circleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle3,
            {
              opacity: circleAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.06, 0.14, 0.06],
              }),
            },
          ]}
        />
        <View style={styles.wave} />
        <View style={styles.triangle} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundElements: {
    position: "absolute",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  circle1: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#D90000",
    opacity: 0.07,
    pointerEvents: "none",
  },
  circle2: {
    position: "absolute",
    top: "60%",
    left: -40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#D90000",
    opacity: 0.09,
    pointerEvents: "none",
  },
  circle3: {
    position: "absolute",
    bottom: "20%",
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D90000",
    opacity: 0.07,
    pointerEvents: "none",
  },
  wave: {
    position: "absolute",
    bottom: -20,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: "#D90000",
    opacity: 0.04,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    pointerEvents: "none",
  },
  triangle: {
    position: "absolute",
    top: "30%",
    right: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 26,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#D90000",
    opacity: 0.05,
    pointerEvents: "none",
  },
});
