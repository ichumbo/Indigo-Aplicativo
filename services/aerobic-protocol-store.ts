/**
 * DragonCorp — Módulo de Protocolos Aeróbicos, Avaliações e Execuções
 *
 * Persistência local segura, RBAC, auditoria, versionamento e compatibilidade total.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AerobicPrescriptionMode,
  AerobicBlockInput,
  ConconiStage,
  ConconiAnalysisResult,
  calculateSessionDuration,
} from "./aerobic-protocol-ai-service";
import {
  AerobicConconiProtocol,
  DayProtocolPrescription,
  listConconiProtocols,
  saveConconiProtocol,
} from "./conconi-protocol-service";

export type DayOfWeek =
  | "Segunda"
  | "Terça"
  | "Quarta"
  | "Quinta"
  | "Sexta"
  | "Sábado"
  | "Domingo";

export type AerobicAssessmentRecord = {
  id: string;
  trainerId: string;
  studentId: string;
  studentName: string;
  studentAge?: number;
  assessmentDate: string;
  environment: "esteira" | "pista" | "bike" | "outro";
  protocolName: "conconi" | "cooper" | "personalizado";
  equipment?: string;
  stages: ConconiStage[];
  hrRestBpm?: number;
  hrMaxMeasured?: number;
  analysis: ConconiAnalysisResult;
  intercurrences?: string;
  status: "concluido" | "interrompido";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AerobicDayPrescription = {
  id: string;
  dayOfWeek: DayOfWeek;
  sessionTitle: string;
  prescriptionMode: AerobicPrescriptionMode;
  warmupMinutes: number;
  warmupText?: string;
  blocks: AerobicBlockInput[];
  cooldownMinutes: number;
  cooldownText?: string;
  totalDurationMinutes: number;
  notes?: string;
};

export type AerobicProtocolRecord = {
  id: string;
  trainerId: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  title: string;
  objective: string;
  prescriptionMode: AerobicPrescriptionMode;
  daysPrescription: AerobicDayPrescription[];
  mesocycleWeeks: number; // 2, 4, 6 ou 8 semanas
  aiMetadata?: {
    suggestionKey?: string;
    justification?: string;
    generatedAt?: string;
    wasEdited?: boolean;
  };
  isTemplate?: boolean;
  isFavorite?: boolean;
  version: number;
  status: "draft" | "approved" | "assigned" | "archived";
  assignedAt?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AerobicExecutionRecord = {
  id: string;
  protocolId: string;
  studentId: string;
  trainerId: string;
  dayOfWeek: DayOfWeek;
  executedAt: string;
  scheduledDate?: string;
  durationMinutes: number;
  actualSpeeds: number[];
  actualBpmAvg?: number;
  actualBpmMax?: number;
  rpeScore: number; // 1-10 ou Borg
  completionStatus: "completed" | "partial" | "interrupted";
  interruptionReason?: string;
  notes?: string;
};

export type AerobicOverviewStats = {
  evaluatedStudentsCount: number;
  recentTestsCount: number;
  activeProtocolsCount: number;
  scheduledSessionsCount: number;
  needsReviewCount: number;
  recentTests: AerobicAssessmentRecord[];
  activeProtocols: AerobicProtocolRecord[];
};

const STORAGE_ASSESSMENTS_KEY = "@dragoncorp/aerobic_assessments_v2:";
const STORAGE_PROTOCOLS_KEY = "@dragoncorp/aerobic_protocols_v2:";
const STORAGE_EXECUTIONS_KEY = "@dragoncorp/aerobic_executions_v2:";
const STORAGE_TEMPLATES_KEY = "@dragoncorp/aerobic_templates_v2:";

// Dados de Exemplo para Inicialização
export const SAMPLE_AEROBIC_ASSESSMENT: AerobicAssessmentRecord = {
  id: "aerobic-assess-sample-1",
  trainerId: "trainer",
  studentId: "student-1",
  studentName: "Charles Nóbrega",
  studentAge: 32,
  assessmentDate: new Date().toISOString().slice(0, 10),
  environment: "esteira",
  protocolName: "conconi",
  equipment: "Esteira Movement RT 250 Pro",
  stages: [
    { stage: 1, speedKmh: 4.0, heartRateBpm: 108, inclinePercent: 1, rpe: 2 },
    { stage: 2, speedKmh: 5.0, heartRateBpm: 120, inclinePercent: 1, rpe: 3 },
    { stage: 3, speedKmh: 6.0, heartRateBpm: 134, inclinePercent: 1, rpe: 4 },
    { stage: 4, speedKmh: 7.0, heartRateBpm: 146, inclinePercent: 1, rpe: 5 },
    { stage: 5, speedKmh: 8.0, heartRateBpm: 156, inclinePercent: 1, rpe: 6 },
    { stage: 6, speedKmh: 9.0, heartRateBpm: 164, inclinePercent: 1, rpe: 7 },
    { stage: 7, speedKmh: 10.0, heartRateBpm: 170, inclinePercent: 1, rpe: 8 },
    { stage: 8, speedKmh: 11.0, heartRateBpm: 174, inclinePercent: 1, rpe: 9 },
  ],
  hrRestBpm: 62,
  hrMaxMeasured: 176,
  analysis: {
    deflectionStatus: "deflexao_identificada",
    deflectionHeartRate: 156,
    deflectionSpeedKmh: 8.0,
    maxHeartRateObserved: 176,
    maxSpeedObserved: 11.0,
    vo2MaxEstimate: 42.0,
    qualityScore: 92,
    isReliable: true,
    explanation: "Ponto de deflexão identificado com alta correlação a 8.0 km/h e 156 bpm.",
    zones: {
      z1Recovery: { minBpm: 105, maxBpm: 122, label: "Recuperação Ativa" },
      z2Aerobic: { minBpm: 123, maxBpm: 137, label: "Aeróbico Base" },
      z3Threshold: { minBpm: 138, maxBpm: 156, label: "Limiar de Conconi" },
      z4Vo2Max: { minBpm: 157, maxBpm: 169, label: "Potência Aeróbica" },
      z5Anaerobic: { minBpm: 170, maxBpm: 176, label: "Capacidade Anaeróbica" },
    },
  },
  status: "concluido",
  notes: "Excelente resposta cardiorrespiratória e estabilização de cadência.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const SAMPLE_AEROBIC_PROTOCOL: AerobicProtocolRecord = {
  id: "aerobic-proto-sample-1",
  trainerId: "trainer",
  studentId: "student-1",
  studentName: "Charles Nóbrega",
  title: "PROTOCOLO AERÓBIO DE BASE & LIMIAR",
  objective: "Aprimorar velocidade no limiar anaeróbico e capacidade de recuperação pós-esforço.",
  prescriptionMode: "hybrid",
  mesocycleWeeks: 4,
  version: 1,
  status: "assigned",
  assignedAt: new Date().toISOString(),
  approvedAt: new Date().toISOString(),
  daysPrescription: [
    {
      id: "dp-seg",
      dayOfWeek: "Segunda",
      sessionTitle: "Intervalado de Limiar + Contínuo",
      prescriptionMode: "hybrid",
      warmupMinutes: 5,
      warmupText: "5 min caminhada progressiva (4.5 a 6.0 km/h).",
      blocks: [
        {
          id: "blk-seg-1",
          blockType: "interval",
          name: "Bloco 1 — Intervalado",
          reps: 3,
          workDurationSeconds: 120, // 2 min
          workSpeedKmh: 10.5,
          workHrBpmMin: 156,
          workHrBpmMax: 166,
          workRpe: 7,
          restDurationSeconds: 60, // 1 min
          restSpeedKmh: 5.0,
          restHrBpmMin: 110,
          restHrBpmMax: 130,
          restType: "active",
          includeRestAfterLastRep: true,
          notes: "3 repetições de 2 minutos ativos a 10,5 km/h e 1 minuto de recuperação a 5,0 km/h.",
        },
        {
          id: "blk-seg-rest",
          blockType: "interblock_rest",
          name: "Descanso entre blocos",
          restDurationSeconds: 120,
          durationSeconds: 120,
          restType: "active",
          notes: "2 minutos de caminhada leve de recuperação.",
        },
        {
          id: "blk-seg-2",
          blockType: "continuous",
          name: "Bloco 2 — Contínuo Sub-Limiar",
          workDurationSeconds: 540, // 9 min
          durationSeconds: 540,
          workSpeedKmh: 9.5,
          workHrBpmMin: 145,
          workHrBpmMax: 155,
          workRpe: 6,
          notes: "9 minutos contínuos a 9,5 km/h em ritmo Z2/Z3 estável.",
        },
      ],
      cooldownMinutes: 3,
      cooldownText: "2 a 3 minutos a 3.5–4.0 km/h.",
      totalDurationMinutes: 28, // 5 + 9 + 2 + 9 + 3 = 28
      notes: "Sessão mista para consolidar remoção de metabólitos.",
    },
    {
      id: "dp-qua",
      dayOfWeek: "Quarta",
      sessionTitle: "Intervalado Extensivo (7 Tiros)",
      prescriptionMode: "speed",
      warmupMinutes: 5,
      warmupText: "5 min aquecimento esteira.",
      blocks: [
        {
          id: "blk-qua-1",
          blockType: "interval",
          name: "Bloco Intervalado Principal",
          reps: 7,
          workDurationSeconds: 60, // 1 min
          workSpeedKmh: 11.5,
          workRpe: 8,
          restDurationSeconds: 120, // 2 min
          restSpeedKmh: 5.5,
          restType: "active",
          includeRestAfterLastRep: true,
          notes: "7 repetições de 1 min ativo a 11,5 km/h e 2 min recuperação a 5,5 km/h.",
        },
      ],
      cooldownMinutes: 3,
      cooldownText: "3 min desaceleração a 4.0 km/h.",
      totalDurationMinutes: 29, // 5 + 21 + 3 = 29
      notes: "Total de 21 minutos no bloco intervalado considerando as 7 pausas.",
    },
    {
      id: "dp-sex",
      dayOfWeek: "Sexta",
      sessionTitle: "HIIT Curto + Contínuo",
      prescriptionMode: "hybrid",
      warmupMinutes: 5,
      warmupText: "5 min aquecimento esteira.",
      blocks: [
        {
          id: "blk-sex-1",
          blockType: "interval",
          name: "Bloco 1 — HIIT Curto",
          reps: 5,
          workDurationSeconds: 30, // 30s
          workSpeedKmh: 12.0,
          workHrBpmMin: 165,
          workHrBpmMax: 175,
          workRpe: 8,
          restDurationSeconds: 30, // 30s
          restSpeedKmh: 6.0,
          restType: "active",
          includeRestAfterLastRep: true,
          notes: "5 repetições de 30s ativos a 12 km/h e 30s recuperação a 6 km/h.",
        },
        {
          id: "blk-sex-rest",
          blockType: "interblock_rest",
          name: "Descanso entre blocos",
          restDurationSeconds: 120,
          durationSeconds: 120,
          restType: "active",
          notes: "2 minutos de pausa ativa.",
        },
        {
          id: "blk-sex-2",
          blockType: "continuous",
          name: "Bloco 2 — Contínuo",
          workDurationSeconds: 600, // 10 min
          durationSeconds: 600,
          workSpeedKmh: 9.5,
          workHrBpmMin: 145,
          workHrBpmMax: 155,
          workRpe: 6,
          notes: "10 minutos a 9,5 km/h.",
        },
      ],
      cooldownMinutes: 3,
      cooldownText: "2 a 3 min a 3.5–4.0 km/h.",
      totalDurationMinutes: 25, // 5 + 5 + 2 + 10 + 3 = 25
      notes: "Sessão de velocidade e potência aeróbica.",
    },
  ],
  notes: "Protocolo atualizado a cada 2 a 4 semanas com reavaliação de velocidade.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// -------------------------------------------------------------
// 1. AVALIAÇÕES AERÓBICAS (CRUD & PERSISTÊNCIA)
// -------------------------------------------------------------

export async function listAerobicAssessments(
  trainerId = "trainer",
  studentId?: string
): Promise<AerobicAssessmentRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_ASSESSMENTS_KEY}${trainerId}`);
    if (!raw) {
      if (trainerId === "trainer" || trainerId === "demo-trainer") {
        return studentId
          ? [SAMPLE_AEROBIC_ASSESSMENT].filter((a) => a.studentId === studentId)
          : [SAMPLE_AEROBIC_ASSESSMENT];
      }
      return [];
    }
    const list: AerobicAssessmentRecord[] = JSON.parse(raw);
    if (studentId) {
      return list.filter((a) => a.studentId === studentId);
    }
    return list;
  } catch {
    return [];
  }
}

export async function getAerobicAssessmentById(
  id: string,
  trainerId = "trainer"
): Promise<AerobicAssessmentRecord | null> {
  const list = await listAerobicAssessments(trainerId);
  return list.find((a) => a.id === id) || null;
}

export async function saveAerobicAssessment(
  record: AerobicAssessmentRecord
): Promise<AerobicAssessmentRecord> {
  const list = await listAerobicAssessments(record.trainerId);
  const filtered = list.filter((a) => a.id !== record.id);
  const updated: AerobicAssessmentRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };
  const newList = [updated, ...filtered];
  await AsyncStorage.setItem(
    `${STORAGE_ASSESSMENTS_KEY}${record.trainerId}`,
    JSON.stringify(newList)
  );
  return updated;
}

export async function deleteAerobicAssessment(
  id: string,
  trainerId = "trainer"
): Promise<void> {
  const list = await listAerobicAssessments(trainerId);
  const updated = list.filter((a) => a.id !== id);
  await AsyncStorage.setItem(
    `${STORAGE_ASSESSMENTS_KEY}${trainerId}`,
    JSON.stringify(updated)
  );
}

// -------------------------------------------------------------
// 2. PROTOCOLOS AERÓBICOS (CRUD, VERSIONAMENTO & ATRIBUIÇÃO)
// -------------------------------------------------------------

export async function listAerobicProtocols(
  trainerId = "trainer",
  studentId?: string
): Promise<AerobicProtocolRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PROTOCOLS_KEY}${trainerId}`);
    let list: AerobicProtocolRecord[] = [];
    if (raw) {
      list = JSON.parse(raw);
    } else if (trainerId === "trainer" || trainerId === "demo-trainer") {
      list = [SAMPLE_AEROBIC_PROTOCOL];
    }

    if (studentId) {
      return list.filter((p) => p.studentId === studentId);
    }
    return list;
  } catch {
    return [];
  }
}

export async function getAerobicProtocolById(
  id: string,
  trainerId = "trainer"
): Promise<AerobicProtocolRecord | null> {
  const list = await listAerobicProtocols(trainerId);
  return list.find((p) => p.id === id) || null;
}

export async function saveAerobicProtocol(
  record: AerobicProtocolRecord
): Promise<AerobicProtocolRecord> {
  const list = await listAerobicProtocols(record.trainerId);
  const filtered = list.filter((p) => p.id !== record.id);
  const updated: AerobicProtocolRecord = {
    ...record,
    version: record.version || 1,
    updatedAt: new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };

  const newList = [updated, ...filtered];
  await AsyncStorage.setItem(
    `${STORAGE_PROTOCOLS_KEY}${record.trainerId}`,
    JSON.stringify(newList)
  );

  // Sincroniza com a entidade legada AerobicConconiProtocol para interoperabilidade total
  try {
    const legacyDays: DayProtocolPrescription[] = updated.daysPrescription.map((d) => {
      const isInterval = d.blocks.some((b) => b.blockType === "interval");
      const intervalBlock = d.blocks.find((b) => b.blockType === "interval");
      const contBlock = d.blocks.find((b) => b.blockType === "continuous");

      return {
        id: d.id,
        dayOfWeek: d.dayOfWeek,
        intervalsCount: intervalBlock?.reps,
        activeDurationMinutes: intervalBlock?.workDurationSeconds ? Math.round(intervalBlock.workDurationSeconds / 60) : undefined,
        activeSpeedKmh: intervalBlock?.workSpeedKmh,
        pauseDurationMinutes: intervalBlock?.restDurationSeconds ? Math.round(intervalBlock.restDurationSeconds / 60) : undefined,
        pauseSpeedKmh: intervalBlock?.restSpeedKmh,
        continuousMinutes: contBlock?.workDurationSeconds ? Math.round(contBlock.workDurationSeconds / 60) : undefined,
        continuousSpeedKmh: contBlock?.workSpeedKmh,
        totalVolumeMinutes: d.totalDurationMinutes,
        description: `${d.sessionTitle} — ${d.blocks.map((b) => b.name).join(" + ")}`,
      };
    });

    const legacyProto: AerobicConconiProtocol = {
      id: updated.id,
      trainerId: updated.trainerId,
      studentId: updated.studentId,
      studentName: updated.studentName,
      studentAvatar: updated.studentAvatar,
      protocolDate: updated.createdAt.slice(0, 10),
      title: updated.title,
      warmupText: updated.daysPrescription[0]?.warmupText || "5 minutos de aquecimento progressivo na esteira",
      daysPrescription: legacyDays,
      generalNotes: updated.notes,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
    await saveConconiProtocol(legacyProto);
  } catch {
    // Sincronização legada opcional
  }

  return updated;
}

export async function deleteAerobicProtocol(
  id: string,
  trainerId = "trainer"
): Promise<void> {
  const list = await listAerobicProtocols(trainerId);
  const updated = list.filter((p) => p.id !== id);
  await AsyncStorage.setItem(
    `${STORAGE_PROTOCOLS_KEY}${trainerId}`,
    JSON.stringify(updated)
  );
}

export async function approveAerobicProtocol(
  id: string,
  trainerId = "trainer"
): Promise<AerobicProtocolRecord | null> {
  const protocol = await getAerobicProtocolById(id, trainerId);
  if (!protocol) return null;

  const approved: AerobicProtocolRecord = {
    ...protocol,
    status: "approved",
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await saveAerobicProtocol(approved);
}

export async function assignAerobicProtocolToStudent(
  protocolId: string,
  studentId: string,
  trainerId = "trainer"
): Promise<AerobicProtocolRecord | null> {
  const protocol = await getAerobicProtocolById(protocolId, trainerId);
  if (!protocol) return null;

  const assigned: AerobicProtocolRecord = {
    ...protocol,
    studentId,
    status: "assigned",
    assignedAt: new Date().toISOString(),
    approvedAt: protocol.approvedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await saveAerobicProtocol(assigned);
}

export async function duplicateAerobicProtocol(
  protocolId: string,
  trainerId = "trainer",
  targetStudentId?: string,
  targetStudentName?: string
): Promise<AerobicProtocolRecord | null> {
  const original = await getAerobicProtocolById(protocolId, trainerId);
  if (!original) return null;

  const clone: AerobicProtocolRecord = {
    ...original,
    id: `aerobic-proto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    studentId: targetStudentId || original.studentId,
    studentName: targetStudentName || original.studentName,
    title: `${original.title} (Cópia)`,
    status: "draft",
    assignedAt: undefined,
    approvedAt: undefined,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await saveAerobicProtocol(clone);
}

// -------------------------------------------------------------
// 3. MODELOS / TEMPLATES REUTILIZÁVEIS
// -------------------------------------------------------------

export async function listAerobicTemplates(
  trainerId = "trainer"
): Promise<AerobicProtocolRecord[]> {
  const list = await listAerobicProtocols(trainerId);
  return list.filter((p) => p.isTemplate);
}

export async function saveAerobicProtocolAsTemplate(
  protocolId: string,
  trainerId = "trainer",
  templateTitle?: string
): Promise<AerobicProtocolRecord | null> {
  const original = await getAerobicProtocolById(protocolId, trainerId);
  if (!original) return null;

  const template: AerobicProtocolRecord = {
    ...original,
    id: `template-${Date.now()}`,
    title: templateTitle || `[Modelo] ${original.title}`,
    isTemplate: true,
    status: "approved",
    studentId: "",
    studentName: "Modelo Geral",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await saveAerobicProtocol(template);
}

export async function toggleFavoriteTemplate(
  protocolId: string,
  trainerId = "trainer"
): Promise<AerobicProtocolRecord | null> {
  const protocol = await getAerobicProtocolById(protocolId, trainerId);
  if (!protocol) return null;

  const updated: AerobicProtocolRecord = {
    ...protocol,
    isFavorite: !protocol.isFavorite,
    updatedAt: new Date().toISOString(),
  };

  return await saveAerobicProtocol(updated);
}

// -------------------------------------------------------------
// 4. EXECUÇÃO DE TREINO PELO ALUNO ("Meus Treinos Aeróbicos")
// -------------------------------------------------------------

export async function getStudentActiveAerobicProtocols(
  studentId: string
): Promise<AerobicProtocolRecord[]> {
  try {
    // Aluno visualiza apenas protocolos liberados e atribuídos a ele (status === "assigned" ou "approved")
    const all = await listAerobicProtocols("trainer", studentId);
    return all.filter((p) => p.status === "assigned" || p.status === "approved");
  } catch {
    return [];
  }
}

export async function recordAerobicExecution(
  execution: AerobicExecutionRecord
): Promise<AerobicExecutionRecord> {
  const key = `${STORAGE_EXECUTIONS_KEY}${execution.studentId}`;
  const raw = await AsyncStorage.getItem(key);
  const list: AerobicExecutionRecord[] = raw ? JSON.parse(raw) : [];

  const record: AerobicExecutionRecord = {
    ...execution,
    id: execution.id || `exec-${Date.now()}`,
    executedAt: execution.executedAt || new Date().toISOString(),
  };

  const updatedList = [record, ...list];
  await AsyncStorage.setItem(key, JSON.stringify(updatedList));
  return record;
}

export async function listAerobicExecutions(
  studentId: string,
  protocolId?: string
): Promise<AerobicExecutionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_EXECUTIONS_KEY}${studentId}`);
    if (!raw) return [];
    const list: AerobicExecutionRecord[] = JSON.parse(raw);
    if (protocolId) {
      return list.filter((e) => e.protocolId === protocolId);
    }
    return list;
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// 5. VISÃO GERAL & GESTÃO DO PERSONAL (ESTATÍSTICAS)
// -------------------------------------------------------------

export async function getAerobicOverviewStats(
  trainerId = "trainer"
): Promise<AerobicOverviewStats> {
  const assessments = await listAerobicAssessments(trainerId);
  const protocols = await listAerobicProtocols(trainerId);

  const evaluatedStudents = new Set(assessments.map((a) => a.studentId));
  const activeProtocols = protocols.filter((p) => p.status === "assigned");

  let scheduledSessionsCount = 0;
  for (const p of activeProtocols) {
    scheduledSessionsCount += p.daysPrescription.length;
  }

  // Testes que precisam de revisão (mais de 4 semanas ou qualidade duvidosa)
  const now = new Date().getTime();
  const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
  const needsReview = assessments.filter((a) => {
    const assessDate = new Date(a.assessmentDate).getTime();
    const isOld = now - assessDate > fourWeeksMs;
    const isLowQuality = !a.analysis.isReliable;
    return isOld || isLowQuality;
  });

  return {
    evaluatedStudentsCount: evaluatedStudents.size,
    recentTestsCount: assessments.length,
    activeProtocolsCount: activeProtocols.length,
    scheduledSessionsCount,
    needsReviewCount: needsReview.length,
    recentTests: assessments.slice(0, 5),
    activeProtocols: activeProtocols.slice(0, 5),
  };
}
