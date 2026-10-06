import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useTrainerBranding } from "@/hooks/use-trainer-branding";

export interface ScreenHeaderAction {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  isPrimary?: boolean;
  color?: string;
  badge?: number;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export interface StandardScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  actions?: ScreenHeaderAction[];
  rightElement?: React.ReactNode;
  brandColor?: string;
  style?: StyleProp<ViewStyle>;
  titleAlign?: "left" | "center";
}

/**
 * StandardScreenHeader
 * Cabeçalho unificado e padronizado para todas as telas do DragonCorp.
 * Garante safe area dinâmica consistente (iOS Dynamic Island / Notch / Android)
 * e botões circulares padronizados (38x38px).
 */
export function StandardScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  backAccessibilityLabel = "Voltar",
  actions = [],
  rightElement,
  brandColor: brandColorProp,
  style,
  titleAlign = "left",
}: StandardScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { primaryColor } = useTrainerBranding();

  const effectiveBrandColor = brandColorProp || primaryColor || "#D90000";
  const safeTopPadding = Math.max(12, insets.top + (Platform.OS === "ios" ? 8 : 10));

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const renderRightActions = () => {
    if (rightElement) return rightElement;
    if (!actions || actions.length === 0) {
      return titleAlign === "center" ? <View style={styles.actionPlaceholder} /> : null;
    }

    return (
      <View style={styles.actionsRightRow}>
        {actions.map((act, index) => {
          const isPrimary = Boolean(act.isPrimary);
          return (
            <TouchableOpacity
              key={`hdr-action-${index}`}
              style={[
                styles.roundBtn,
                Boolean(act.label) && styles.roundBtnWithText,
                isPrimary
                  ? {
                      backgroundColor: effectiveBrandColor,
                      borderColor: effectiveBrandColor,
                    }
                  : {
                      backgroundColor: theme.cardSecondary,
                      borderColor: theme.cardBorder,
                    },
                act.disabled && styles.btnDisabled,
              ]}
              onPress={act.onPress}
              disabled={act.disabled}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              accessibilityLabel={act.accessibilityLabel || act.label}
            >
              {act.icon ? (
                <Ionicons
                  name={act.icon}
                  size={18}
                  color={isPrimary ? "#FFFFFF" : act.color || theme.text}
                />
              ) : null}
              {act.label ? (
                <Text
                  style={[
                    styles.textBtnLabel,
                    { color: isPrimary ? "#FFFFFF" : act.color || theme.text },
                  ]}
                >
                  {act.label}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (titleAlign === "center") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            paddingTop: safeTopPadding,
          },
          style,
        ]}
      >
        <View style={styles.centerModeSide}>
          {showBack ? (
            <TouchableOpacity
              style={[
                styles.roundBtn,
                { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
              ]}
              onPress={handleBack}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={backAccessibilityLabel}
            >
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.actionPlaceholder} />
          )}
        </View>

        <View style={styles.centerModeTitleBlock}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.centerModeSide}>{renderRightActions()}</View>
      </View>
    );
  }

  // Layout "left" (padrão DragonCorp — igual a Editar Treino no print do usuário)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: safeTopPadding,
        },
        style,
      ]}
    >
      <View style={styles.leftGroup}>
        {showBack && (
          <TouchableOpacity
            style={[
              styles.roundBtn,
              { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder },
            ]}
            onPress={handleBack}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={backAccessibilityLabel}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>
        )}

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {renderRightActions()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  titleBlock: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  roundBtnWithText: {
    width: undefined,
    paddingHorizontal: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  textBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionsRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionPlaceholder: {
    width: 38,
    height: 38,
  },
  centerModeSide: {
    width: 80,
    alignItems: "flex-start",
  },
  centerModeTitleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
