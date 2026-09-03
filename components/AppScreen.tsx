import React, { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useResponsiveLayout } from "@/constants/responsive";

export interface AppScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  edges?: Edge[];
  refreshControl?: React.ReactElement<RefreshControlProps>;
  backgroundColor?: string;
  statusBarStyle?: "light-content" | "dark-content";
  withHorizontalPadding?: boolean;
  withBottomPadding?: boolean;
}

export function AppScreen({
  children,
  style,
  contentContainerStyle,
  scrollable = false,
  keyboardAvoiding = false,
  edges = ["top", "left", "right"],
  refreshControl,
  backgroundColor,
  statusBarStyle,
  withHorizontalPadding = false,
  withBottomPadding = false,
}: AppScreenProps) {
  const { theme, isDark } = useAppTheme();
  const layout = useResponsiveLayout();

  const screenBg = backgroundColor || theme.background;
  const barStyle = statusBarStyle || (isDark ? "light-content" : "dark-content");

  const basePaddingStyle: ViewStyle = {
    paddingHorizontal: withHorizontalPadding ? layout.horizontalPadding : 0,
    paddingBottom: withBottomPadding ? layout.stackBottomPadding : 0,
  };

  const content = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        basePaddingStyle,
        styles.scrollContent,
        contentContainerStyle,
      ]}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, basePaddingStyle, style]}>{children}</View>
  );

  const wrappedContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: screenBg }]}
      edges={edges}
    >
      <StatusBar barStyle={barStyle} backgroundColor={screenBg} />
      {wrappedContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
