import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface LoadingScreenProps {
  onFinish?: () => void;
}

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const dot1Anim = useRef(new Animated.Value(0.4)).current;
  const dot2Anim = useRef(new Animated.Value(0.4)).current;
  const dot3Anim = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animações de entrada combinadas
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de pulso contínua
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Animação de rotação contínua
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Animação dos pontos
    const dotsAnimation = Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Anim, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseAnimation.start();
    rotateAnimation.start();
    dotsAnimation.start();

    // Animação da progress bar com callback de finalização
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      // Animações de saída combinadas
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish?.();
      });
    });

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
      dotsAnimation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.backgroundElements,
        {
          transform: [{
            rotate: rotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            })
          }]
        }
      ]}>
        <Animated.View style={[
          styles.circle1,
          {
            transform: [{
              scale: pulseAnim.interpolate({
                inputRange: [0.8, 1.1],
                outputRange: [1, 1.2],
              })
            }]
          }
        ]} />
        <Animated.View style={[
          styles.circle2,
          {
            transform: [{
              translateY: pulseAnim.interpolate({
                inputRange: [0.8, 1.1],
                outputRange: [0, -20],
              })
            }]
          }
        ]} />
        <Animated.View style={[
          styles.circle3,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0.8, 1.1],
              outputRange: [0.06, 0.12],
            })
          }
        ]} />
        <View style={styles.wave} />
        <View style={styles.triangle} />
      </Animated.View>
      
      <Animated.View style={[
        styles.content, 
        { 
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ]
        }
      ]}>
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Image
              source={require('@/assets/images/logo-name-white.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Carregando...</Text>
          <Text style={styles.subtitle}>Preparando sua experiência</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>

        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
          <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
          <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D90000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    opacity: 0.05,
  },
  circle2: {
    position: 'absolute',
    top: '60%',
    left: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    opacity: 0.08,
  },
  circle3: {
    position: 'absolute',
    bottom: '20%',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    opacity: 0.06,
  },
  wave: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#fff',
    opacity: 0.03,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  triangle: {
    position: 'absolute',
    top: '30%',
    right: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    opacity: 0.04,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 48,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ffffffff',
    fontSize: 16,
    fontWeight: '400',
  },
  progressContainer: {
    width: 200,
    marginBottom: 30,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#ffe5e5ff',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
