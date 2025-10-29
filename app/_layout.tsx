import { Stack } from 'expo-router';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="exercises" options={{ headerShown: false }} />
      <Stack.Screen name="hydration" options={{ headerShown: false }} />
      <Stack.Screen name="weight-progress" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="movement-details" options={{ headerShown: false }} />
      <Stack.Screen name="training-details" options={{ headerShown: false }} />
      <Stack.Screen name="admin-exercises" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="blocked-details" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}
