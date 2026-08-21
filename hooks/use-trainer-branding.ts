import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ImageSourcePropType } from "react-native";

import { useCurrentSession } from "@/hooks/use-current-session";
import {
  DEFAULT_TRAINER_BRANDING,
  TrainerBranding,
  getTrainerBranding,
  saveTrainerBranding,
} from "@/services/trainer-branding-store";

export function useTrainerBranding() {
  const { session } = useCurrentSession();
  const [branding, setBranding] = useState<TrainerBranding>(DEFAULT_TRAINER_BRANDING);
  const [loading, setLoading] = useState(true);

  const trainerId =
    session?.user.role === "TRAINER"
      ? session.user.id
      : "trainer"; // For student, points to their trainer

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
    logoSource,
    businessName: branding.businessName || "DragonCorp",
    loading,
    refreshBranding: loadBranding,
    updateBranding,
  };
}
