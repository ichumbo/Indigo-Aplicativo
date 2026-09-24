import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";

import { useCurrentSession } from "@/hooks/use-current-session";
import {
  DEFAULT_TRAINER_BRANDING,
  TrainerBranding,
  getTrainerBranding,
  resetTrainerBranding,
  saveTrainerBranding,
  subscribeTrainerBranding,
} from "@/services/trainer-branding-store";

export function useTrainerBranding() {
  const { session } = useCurrentSession();
  const [branding, setBranding] = useState<TrainerBranding>(DEFAULT_TRAINER_BRANDING);
  const [loading, setLoading] = useState(true);

  const trainerId =
    session?.user.role === "TRAINER"
      ? session.user.id
      : session?.user.trainerId || "trainer"; // For student, points to their linked trainer

  const loadBranding = useCallback(async () => {
    try {
      const data = await getTrainerBranding(trainerId);
      setBranding(data);
    } catch {
      setBranding(DEFAULT_TRAINER_BRANDING);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    loadBranding();
    const unsubscribe = subscribeTrainerBranding(trainerId, (next) => {
      setBranding(next);
    });
    return unsubscribe;
  }, [trainerId, loadBranding]);

  useFocusEffect(
    useCallback(() => {
      loadBranding();
    }, [loadBranding])
  );

  const updateBranding = useCallback(
    async (updates: Partial<TrainerBranding>) => {
      const updated = await saveTrainerBranding(updates, trainerId);
      setBranding(updated);
      return updated;
    },
    [trainerId]
  );

  const restoreDefaultBranding = useCallback(async () => {
    const restored = await resetTrainerBranding(trainerId);
    setBranding(restored);
    return restored;
  }, [trainerId]);

  // Determine logo source
  let logoSource: ImageSourcePropType = require("@/assets/images/logotipo-principal.png");
  if (branding.customLogoUrl) {
    logoSource = { uri: branding.customLogoUrl };
  } else if (branding.logoPresetId === "white") {
    logoSource = require("@/assets/images/logo-white.png");
  } else if (branding.logoPresetId === "symbol") {
    logoSource = require("@/assets/images/logo-principal.png");
  }

  return {
    branding,
    primaryColor: branding.primaryColor || "#D90000",
    tokens: branding.tokens,
    brandOnPrimary: branding.tokens?.brandOnPrimary || "#FFFFFF",
    logoSource,
    businessName: branding.businessName || "DragonCorp",
    loading,
    refreshBranding: loadBranding,
    updateBranding,
    restoreDefaultBranding,
  };
}
