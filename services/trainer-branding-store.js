"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TRAINER_BRANDING = exports.BRANDING_LOGO_PRESETS = exports.BRANDING_COLOR_PRESETS = void 0;
exports.getTrainerBranding = getTrainerBranding;
exports.saveTrainerBranding = saveTrainerBranding;
exports.resetTrainerBranding = resetTrainerBranding;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
exports.BRANDING_COLOR_PRESETS = [
    { id: "crimson", name: "Vermelho Dragon", hex: "#D90000", accentHex: "#ff4444" },
    { id: "electric-blue", name: "Azul Elétrico", hex: "#2563EB", accentHex: "#60a5fa" },
    { id: "emerald", name: "Verde Esmeralda", hex: "#10B981", accentHex: "#34d399" },
    { id: "amber", name: "Ouro / Âmbar", hex: "#F59E0B", accentHex: "#fbbf24" },
    { id: "purple", name: "Roxo Cyber", hex: "#8B5CF6", accentHex: "#a78bfa" },
    { id: "cyan", name: "Ciano Neon", hex: "#06B6D4", accentHex: "#38bdf8" },
    { id: "pink", name: "Rosa Intenso", hex: "#EC4899", accentHex: "#f472b6" },
    { id: "orange", name: "Laranja Sunset", hex: "#F97316", accentHex: "#fb923c" },
];
exports.BRANDING_LOGO_PRESETS = [
    { id: "default", name: "DragonCorp Principal", presetKey: "logotipo-principal" },
    { id: "white", name: "DragonCorp White", presetKey: "logo-white" },
    { id: "symbol", name: "DragonCorp Símbolo", presetKey: "logo-principal" },
];
const BRANDING_STORAGE_KEY_PREFIX = "@dragoncorp/trainer_branding_v1:";
exports.DEFAULT_TRAINER_BRANDING = {
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
    updatedAt: new Date().toISOString(),
};
async function getTrainerBranding(trainerId = "trainer") {
    try {
        const raw = await async_storage_1.default.getItem(`${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`);
        if (!raw)
            return { ...exports.DEFAULT_TRAINER_BRANDING, trainerId };
        const parsed = JSON.parse(raw);
        return {
            ...exports.DEFAULT_TRAINER_BRANDING,
            ...parsed,
            trainerId,
        };
    }
    catch {
        return { ...exports.DEFAULT_TRAINER_BRANDING, trainerId };
    }
}
async function saveTrainerBranding(updates, trainerId = "trainer") {
    const current = await getTrainerBranding(trainerId);
    const next = {
        ...current,
        ...updates,
        trainerId,
        updatedAt: new Date().toISOString(),
    };
    await async_storage_1.default.setItem(`${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`, JSON.stringify(next));
    return next;
}
async function resetTrainerBranding(trainerId = "trainer") {
    const resetData = {
        ...exports.DEFAULT_TRAINER_BRANDING,
        trainerId,
        updatedAt: new Date().toISOString(),
    };
    await async_storage_1.default.setItem(`${BRANDING_STORAGE_KEY_PREFIX}${trainerId}`, JSON.stringify(resetData));
    return resetData;
}
