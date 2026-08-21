import * as SystemUI from 'expo-system-ui';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

const APP_BACKGROUND = '#0f0f0f';

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(APP_BACKGROUND).catch(() => undefined);
  }, []);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ contentStyle: styles.screen }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
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
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="blocked-details" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
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
