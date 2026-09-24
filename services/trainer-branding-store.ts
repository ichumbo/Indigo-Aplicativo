import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BrandTokens,
  generateBrandTokens,
  isValidHex,
  normalizeHex,
} from "./color-contrast-utils";

export type ColorPreset = {
  id: string;
  name: string;
  hex: string;
  accentHex: string;
};

export const BRANDING_COLOR_PRESETS: ColorPreset[] = [
  { id: "crimson", name: "Vermelho Dragon", hex: "#D90000", accentHex: "#FF4444" },
  { id: "electric-blue", name: "Azul Elétrico", hex: "#2563EB", accentHex: "#60A5FA" },
  { id: "emerald", name: "Verde Esmeralda", hex: "#10B981", accentHex: "#34D399" },
  { id: "amber", name: "Ouro / Âmbar", hex: "#F59E0B", accentHex: "#FBBF24" },
  { id: "purple", name: "Roxo Cyber", hex: "#8B5CF6", accentHex: "#A78BFA" },
  { id: "cyan", name: "Ciano Neon", hex: "#06B6D4", accentHex: "#38BDF8" },
  { id: "pink", name: "Rosa Intenso", hex: "#EC4899", accentHex: "#F472B6" },
  { id: "orange", name: "Laranja Sunset", hex: "#F97316", accentHex: "#FB923C" },
];

export type LogoPreset = {
  id: string;
  name: string;
  uri?: string;
  presetKey?: "logo-principal" | "logotipo-principal" | "logo-white";
};

export const BRANDING_LOGO_PRESETS: LogoPreset[] = [
  { id: "default", name: "DragonCorp Principal", presetKey: "logotipo-principal" },
  { id: "white", name: "DragonCorp White", presetKey: "logo-white" },
  { id: "symbol", name: "DragonCorp Símbolo", presetKey: "logo-principal" },
];

export type TrainerBranding = {
  trainerId: string;
  displayName: string;
  professionalId: string; // CREF
  email: string;
  phone?: string;
  avatarUrl?: string;
  businessName: string;
  primaryColor: string;
  logoPresetId: string;
  customLogoUrl?: string | null;
  tagline?: string;
  themeVersion: number;
  isCustomBrandingEnabled: boolean;
  tokens: BrandTokens;
  updatedAt: string;
};

const BRANDING_STORAGE_KEY_PREFIX = "@dragoncorp/trainer_branding_v1:";

export const DEFAULT_TRAINER_BRANDING: TrainerBranding = {
  trainerId: "trainer",
  displayName: "Personal DragonCorp",
  professionalId: "CREF 123456-G/SP",
  email: "treinador@dragoncorp.app",
  phone: "(11) 98765-4321",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
  businessName: "DragonCorp",
  primaryColor: "#D90000",
  logoPresetId: "default",
  customLogoUrl: null,
  tagline: "Alta Performance & Consultoria",
  themeVersion: 1,
  isCustomBrandingEnabled: false,
  tokens: generateBrandTokens("#D90000"),
  updatedAt: new Date().toISOString(),
};

type BrandingListener = (branding: TrainerBranding) => void;
const brandingListeners = new Map<string, Set<BrandingListener>>();

export async function getTrainerBranding(trainerId = "trainer"): Promise<TrainerBranding> {
  try {
    const raw = await AsyncStorage.getItem(`${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`);
    if (!raw) return { ...DEFAULT_TRAINER_BRANDING, trainerId };
    const parsed = JSON.parse(raw) as Partial<TrainerBranding>;
    const primaryColor = isValidHex(parsed.primaryColor || "")
      ? normalizeHex(parsed.primaryColor!)
      : DEFAULT_TRAINER_BRANDING.primaryColor;

    return {
      ...DEFAULT_TRAINER_BRANDING,
      ...parsed,
      trainerId,
      primaryColor,
      tokens: generateBrandTokens(primaryColor),
    };
  } catch {
    return { ...DEFAULT_TRAINER_BRANDING, trainerId };
  }
}

export async function saveTrainerBranding(
  updates: Partial<TrainerBranding>,
  trainerId = "trainer"
): Promise<TrainerBranding> {
  const current = await getTrainerBranding(trainerId);
  const primaryColor = updates.primaryColor && isValidHex(updates.primaryColor)
    ? normalizeHex(updates.primaryColor)
    : current.primaryColor;

  const isCustomBrandingEnabled =
    primaryColor !== DEFAULT_TRAINER_BRANDING.primaryColor ||
    Boolean(updates.customLogoUrl) ||
    (updates.businessName !== undefined && updates.businessName !== "DragonCorp");

  const next: TrainerBranding = {
    ...current,
    ...updates,
    trainerId,
    primaryColor,
    isCustomBrandingEnabled,
    themeVersion: (current.themeVersion || 1) + 1,
    tokens: generateBrandTokens(primaryColor),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    `${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`,
    JSON.stringify(next)
  );

  // Notifica ouvintes reativos
  notifyBrandingListeners(trainerId, next);

  return next;
}

export async function resetTrainerBranding(trainerId = "trainer"): Promise<TrainerBranding> {
  const resetData: TrainerBranding = {
    ...DEFAULT_TRAINER_BRANDING,
    trainerId,
    themeVersion: 1,
    isCustomBrandingEnabled: false,
    tokens: generateBrandTokens(DEFAULT_TRAINER_BRANDING.primaryColor),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    `${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`,
    JSON.stringify(resetData)
  );

  notifyBrandingListeners(trainerId, resetData);
  return resetData;
}

export function subscribeTrainerBranding(
  trainerId: string,
  listener: BrandingListener
): () => void {
  if (!brandingListeners.has(trainerId)) {
    brandingListeners.set(trainerId, new Set());
  }
  const set = brandingListeners.get(trainerId)!;
  set.add(listener);

  return () => {
    set.delete(listener);
    if (set.size === 0) {
      brandingListeners.delete(trainerId);
    }
  };
}

function notifyBrandingListeners(trainerId: string, branding: TrainerBranding) {
  const set = brandingListeners.get(trainerId);
  if (set) {
    set.forEach((fn) => {
      try {
        fn(branding);
      } catch {
        // ignora erro em listener individual
      }
    });
  }
}
