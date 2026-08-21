import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorPreset = {
  id: string;
  name: string;
  hex: string;
  accentHex: string;
};

export const BRANDING_COLOR_PRESETS: ColorPreset[] = [
  { id: "crimson", name: "Vermelho Dragon", hex: "#D90000", accentHex: "#ff4444" },
  { id: "electric-blue", name: "Azul Elétrico", hex: "#2563EB", accentHex: "#60a5fa" },
  { id: "emerald", name: "Verde Esmeralda", hex: "#10B981", accentHex: "#34d399" },
  { id: "amber", name: "Ouro / Âmbar", hex: "#F59E0B", accentHex: "#fbbf24" },
  { id: "purple", name: "Roxo Cyber", hex: "#8B5CF6", accentHex: "#a78bfa" },
  { id: "cyan", name: "Ciano Neon", hex: "#06B6D4", accentHex: "#38bdf8" },
  { id: "pink", name: "Rosa Intenso", hex: "#EC4899", accentHex: "#f472b6" },
  { id: "orange", name: "Laranja Sunset", hex: "#F97316", accentHex: "#fb923c" },
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
  updatedAt: string;
};

const BRANDING_STORAGE_KEY_PREFIX = "@indigo/trainer_branding_v1:";

export const DEFAULT_TRAINER_BRANDING: TrainerBranding = {
  trainerId: "trainer",
  displayName: "Personal Indigo",
  professionalId: "CREF 123456-G/SP",
  email: "treinador@indigo.app",
  phone: "(11) 98765-4321",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
  businessName: "DragonCorp",
  primaryColor: "#D90000",
  logoPresetId: "default",
  customLogoUrl: null,
  tagline: "Alta Performance & Consultoria",
  updatedAt: new Date().toISOString(),
};

export async function getTrainerBranding(trainerId = "trainer"): Promise<TrainerBranding> {
  try {
    const raw = await AsyncStorage.getItem(`${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`);
    if (!raw) return { ...DEFAULT_TRAINER_BRANDING, trainerId };
    const parsed = JSON.parse(raw) as Partial<TrainerBranding>;
    return {
      ...DEFAULT_TRAINER_BRANDING,
      ...parsed,
      trainerId,
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
  const next: TrainerBranding = {
    ...current,
    ...updates,
    trainerId,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    `${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`,
    JSON.stringify(next)
  );
  return next;
}

export async function resetTrainerBranding(trainerId = "trainer"): Promise<TrainerBranding> {
  const resetData: TrainerBranding = {
    ...DEFAULT_TRAINER_BRANDING,
    trainerId,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    `${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`,
    JSON.stringify(resetData)
  );
  return resetData;
}
