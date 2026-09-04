/**
 * DragonCorp Central Sync Service
 * Conecta o aplicativo Mobile ao Backend Central Laravel (Web + Mobile).
 * Resiliente a offline: mantém AsyncStorage como persistência local e sincroniza
 * automaticamente via API REST (/api/v1/sync).
 */

export interface SyncConfig {
  baseUrl: string;
  authToken?: string;
}

const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api/v1';

export async function pullLatestDataFromBackend(options?: {
  studentId?: string;
  trainerId?: string;
  baseUrl?: string;
}) {
  const base = options?.baseUrl || DEFAULT_API_BASE;
  const params = new URLSearchParams();
  if (options?.studentId) params.append('studentId', options.studentId);
  if (options?.trainerId) params.append('trainerId', options.trainerId);

  try {
    const url = `${base}/sync/pull?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao sincronizar com backend central.`);
    }
    const data = await res.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Backend central inacessível (modo offline mantido)',
    };
  }
}

export async function pushMobileExecutionsToBackend(
  executedSets: Array<{
    id?: string;
    studentId: string;
    trainerId?: string;
    workoutId?: string;
    workoutName?: string;
    exerciseId: string;
    exerciseName: string;
    executedLoad: number;
    executedReps: number;
    loadUnit?: string;
    effort?: number;
    pain?: { region: string; level: number };
    note?: string;
  }>,
  options?: { baseUrl?: string }
) {
  const base = options?.baseUrl || DEFAULT_API_BASE;

  try {
    const res = await fetch(`${base}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ executedSets }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Falha ao sincronizar execuções com backend',
    };
  }
}

export async function pushFeedbackToBackend(
  feedback: {
    id?: string;
    studentId: string;
    studentName: string;
    trainerId?: string;
    workoutId?: string;
    workoutName: string;
    durationMinutes: number;
    rating: number;
    comment?: string;
    intensity: string;
    hasPain: boolean;
    painRegion?: string;
    painLevel?: number;
  },
  options?: { baseUrl?: string }
) {
  const base = options?.baseUrl || DEFAULT_API_BASE;

  try {
    const res = await fetch(`${base}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ feedbacks: [feedback] }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return { success: true, data: await res.json() };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Falha ao sincronizar feedback com backend',
    };
  }
}
