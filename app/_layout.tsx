import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { DragonCorpSplashScreen } from '@/components/DragonCorpSplashScreen';

// Mantém a splash nativa até que o bundle React Native esteja pronto
SplashScreen.preventAutoHideAsync().catch(() => undefined);

const APP_BACKGROUND = '#000000';

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(APP_BACKGROUND).catch(() => undefined);
    // Esconde a splash nativa para a animação fluida React Native assumir imediatamente
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: styles.screen,
          animation: 'slide_from_right',
          animationDuration: 260,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="exercises" options={{ headerShown: false }} />
        <Stack.Screen name="hydration" options={{ headerShown: false }} />
        <Stack.Screen name="weight-progress" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="training-feedback" options={{ headerShown: false }} />
        <Stack.Screen name="assessment-editor" options={{ headerShown: false }} />
        <Stack.Screen name="assessment-detail" options={{ headerShown: false }} />
        <Stack.Screen name="assessment-compare" options={{ headerShown: false }} />
        <Stack.Screen name="student-assessments" options={{ headerShown: false }} />
        <Stack.Screen name="feedback-detail" options={{ headerShown: false }} />
        <Stack.Screen name="student-feedbacks" options={{ headerShown: false }} />
        <Stack.Screen name="movement-details" options={{ headerShown: false }} />
        <Stack.Screen name="training-details" options={{ headerShown: false }} />
        <Stack.Screen name="exercise-performance" options={{ headerShown: false }} />
        <Stack.Screen name="exercise-performance-detail" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-agenda" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-reassessments" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-workout-templates" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-expirations" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-ranking-frequency" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-ranking-evolution" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-registration-link" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-my-exercises" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-feedback-hub" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-contacts" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-anamnesis" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-attention" options={{ headerShown: false }} />
        <Stack.Screen name="import-workout" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="blocked-details" options={{ headerShown: false }} />
        <Stack.Screen name="trainer-onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="account-profile" options={{ headerShown: false }} />
        <Stack.Screen name="generate-code" options={{ headerShown: false }} />
        <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>

      {/* TELA DE SPLASH ANIMADA DRAGONCORP (SEM TEXTO, SEM GRADIENTES, ULTRA ELEGANTE) */}
      {!splashFinished && (
        <DragonCorpSplashScreen onFinish={() => setSplashFinished(true)} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
  screen: {
    backgroundColor: APP_BACKGROUND,
  },
});
