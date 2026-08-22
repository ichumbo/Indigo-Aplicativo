import AsyncStorage from "@react-native-async-storage/async-storage";

export interface HydrationLogEntry {
  id: string;
  amount: number; // in ml
  timestamp: number;
  timeFormatted: string;
  source?: "cup" | "bottle" | "shaker" | "custom";
}

export interface DailyHydrationRecord {
  date: string; // YYYY-MM-DD
  targetMl: number;
  consumedMl: number;
  logs: HydrationLogEntry[];
}

export interface HydrationCalculationParams {
  weightKg: number;
  activityMinutes?: number;
  activityIntensity?: "low" | "moderate" | "high";
  climate?: "cold" | "mild" | "hot";
}

export interface HydrationScheduleBlock {
  period: string;
  recommendedMl: number;
  suggestedTime: string;
  label: string;
}

const STORAGE_KEY_HYDRATION_RECORDS = "@indigo/hydration_records_v2";
const STORAGE_KEY_USER_GOAL = "@indigo/hydration_user_goal_v2";

/**
 * Motor Científico de Cálculo de Hidratação (Diretrizes ACSM / EFSA)
 * Base: 35ml por kg de peso corporal + compensação hídrica de treino e clima.
 */
export function calculatePersonalizedHydration(params: HydrationCalculationParams): {
  targetMl: number;
  baseMl: number;
  exerciseAddonMl: number;
  climateAddonMl: number;
  schedule: HydrationScheduleBlock[];
} {
  const baseMl = Math.round(params.weightKg * 35);

  let exerciseAddonMl = 0;
  if (params.activityMinutes && params.activityMinutes > 0) {
    const ratePerMinute =
      params.activityIntensity === "high"
        ? 12 // ~720ml/h
        : params.activityIntensity === "low"
        ? 6 // ~360ml/h
        : 9; // ~540ml/h
    exerciseAddonMl = Math.round(params.activityMinutes * ratePerMinute);
  }

  let climateAddonMl = 0;
  if (params.climate === "hot") {
    climateAddonMl = 400;
  } else if (params.climate === "cold") {
    climateAddonMl = -150;
  }

  const rawTotal = baseMl + exerciseAddonMl + climateAddonMl;
  // Arredonda para o múltiplo de 50ml mais próximo (mínimo 1500ml, máximo 5000ml)
  const targetMl = Math.min(5000, Math.max(1500, Math.round(rawTotal / 50) * 50));

  const schedule: HydrationScheduleBlock[] = [
    {
      period: "Ao acordar",
      suggestedTime: "07:00",
      recommendedMl: Math.round((targetMl * 0.15) / 50) * 50,
      label: "Despertar metabólico",
    },
    {
      period: "Manhã",
      suggestedTime: "10:00",
      recommendedMl: Math.round((targetMl * 0.25) / 50) * 50,
      label: "Foco e energia",
    },
    {
      period: "Treino / Tarde",
      suggestedTime: "15:00",
      recommendedMl: Math.round((targetMl * 0.35) / 50) * 50,
      label: "Performance e recuperação",
    },
    {
      period: "Noite",
      suggestedTime: "20:00",
      recommendedMl: Math.round((targetMl * 0.25) / 50) * 50,
      label: "Equilíbrio noturno",
    },
  ];

  return {
    targetMl,
    baseMl,
    exerciseAddonMl,
    climateAddonMl,
    schedule,
  };
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTimeFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Carrega os registros de um dia específico
 */
export async function getDailyHydrationRecord(dateStr?: string): Promise<DailyHydrationRecord> {
  const date = dateStr || getTodayDateString();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_HYDRATION_RECORDS);
    const recordsMap: Record<string, DailyHydrationRecord> = raw ? JSON.parse(raw) : {};

    const savedGoal = await AsyncStorage.getItem(STORAGE_KEY_USER_GOAL);
    const defaultTarget = savedGoal ? parseInt(savedGoal, 10) : 2000;

    if (recordsMap[date]) {
      return recordsMap[date];
    }

    // Retorna registro padrão inicial para o dia
    const initialRecord: DailyHydrationRecord = {
      date,
      targetMl: defaultTarget,
      consumedMl: 1200,
      logs: [
        { id: "1", amount: 300, timestamp: Date.now() - 3600000 * 4, timeFormatted: "08:30", source: "cup" },
        { id: "2", amount: 350, timestamp: Date.now() - 3600000 * 2.5, timeFormatted: "10:15", source: "bottle" },
        { id: "3", amount: 250, timestamp: Date.now() - 3600000 * 1, timeFormatted: "12:40", source: "cup" },
        { id: "4", amount: 300, timestamp: Date.now() - 1800000, timeFormatted: "14:10", source: "bottle" },
      ],
    };

    recordsMap[date] = initialRecord;
    await AsyncStorage.setItem(STORAGE_KEY_HYDRATION_RECORDS, JSON.stringify(recordsMap));
    return initialRecord;
  } catch {
    return {
      date,
      targetMl: 2000,
      consumedMl: 1200,
      logs: [],
    };
  }
}

/**
 * Adiciona um consumo de água
 */
export async function recordWaterIntake(
  amountMl: number,
  source: HydrationLogEntry["source"] = "cup",
  dateStr?: string
): Promise<DailyHydrationRecord> {
  const date = dateStr || getTodayDateString();
  const raw = await AsyncStorage.getItem(STORAGE_KEY_HYDRATION_RECORDS);
  const recordsMap: Record<string, DailyHydrationRecord> = raw ? JSON.parse(raw) : {};

  const current = recordsMap[date] || (await getDailyHydrationRecord(date));

  const now = Date.now();
  const newLog: HydrationLogEntry = {
    id: `water-${now}-${Math.random().toString(36).substr(2, 4)}`,
    amount: amountMl,
    timestamp: now,
    timeFormatted: formatTimeFromTimestamp(now),
    source,
  };

  const updated: DailyHydrationRecord = {
    ...current,
    consumedMl: current.consumedMl + amountMl,
    logs: [newLog, ...current.logs],
  };

  recordsMap[date] = updated;
  await AsyncStorage.setItem(STORAGE_KEY_HYDRATION_RECORDS, JSON.stringify(recordsMap));
  return updated;
}

/**
 * Remove um registro específico
 */
export async function deleteWaterLog(logId: string, dateStr?: string): Promise<DailyHydrationRecord> {
  const date = dateStr || getTodayDateString();
  const raw = await AsyncStorage.getItem(STORAGE_KEY_HYDRATION_RECORDS);
  const recordsMap: Record<string, DailyHydrationRecord> = raw ? JSON.parse(raw) : {};

  const current = recordsMap[date] || (await getDailyHydrationRecord(date));
  const target = current.logs.find((l) => l.id === logId);

  if (!target) return current;

  const updated: DailyHydrationRecord = {
    ...current,
    consumedMl: Math.max(0, current.consumedMl - target.amount),
    logs: current.logs.filter((l) => l.id !== logId),
  };

  recordsMap[date] = updated;
  await AsyncStorage.setItem(STORAGE_KEY_HYDRATION_RECORDS, JSON.stringify(recordsMap));
  return updated;
}

/**
 * Atualiza a meta diária
 */
export async function updateDailyHydrationGoal(targetMl: number, dateStr?: string): Promise<DailyHydrationRecord> {
  const date = dateStr || getTodayDateString();
  await AsyncStorage.setItem(STORAGE_KEY_USER_GOAL, String(targetMl));

  const raw = await AsyncStorage.getItem(STORAGE_KEY_HYDRATION_RECORDS);
  const recordsMap: Record<string, DailyHydrationRecord> = raw ? JSON.parse(raw) : {};

  const current = recordsMap[date] || (await getDailyHydrationRecord(date));
  const updated: DailyHydrationRecord = {
    ...current,
    targetMl,
  };

  recordsMap[date] = updated;
  await AsyncStorage.setItem(STORAGE_KEY_HYDRATION_RECORDS, JSON.stringify(recordsMap));
  return updated;
}
