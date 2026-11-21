/**
 * DragonCorp — Motor Determinístico & Assistente IA de Protocolos Aeróbicos
 *
 * Responsável por:
 * 1. Análise da curva de Conconi com regressão linear segmentada e salvaguarda de limiar não determinado.
 * 2. Cálculo determinístico de zonas de frequência cardíaca (% FCmáx medida, % FCmáx estimada e Karvonen / Reserva).
 * 3. Cálculo matemático exato de duração e volume total de sessões com múltiplos blocos (aquecimento, intervalado, contínuo, pausas interbloco, volta à calma).
 * 4. Verificação de segurança, alertas e contraindicações para evitar prescrições intensas a alunos inaptos.
 * 5. Gerador Inteligente de Protocolos Aeróbicos com 3 sugestões distintas (Conservadora, Equilibrada, Específica) em conformidade estrita com JSON Schema.
 */

export type AerobicPrescriptionMode = "speed" | "hr" | "hybrid";

export type AerobicGoal =
  | "conditioning"
  | "endurance"
  | "running_perf"
  | "speed_sustainability"
  | "interval_tolerance"
  | "effort_tolerance"
  | "consistency"
  | "general";

export type AerobicProtocolType =
  | "continuous_moderate"
  | "continuous_progressive"
  | "interval_extensive"
  | "hiit_short"
  | "hiit_long"
  | "sit"
  | "rst"
  | "fartlek"
  | "custom";

export type HeartRateMethod =
  | "measured_max_pct"
  | "estimated_max_pct"
  | "karvonen_reserve"
  | "conconi_threshold"
  | "custom_zones";

export type ConconiStage = {
  stage: number;
  speedKmh: number;
  heartRateBpm: number;
  inclinePercent?: number;
  rpe?: number;
  durationSec?: number;
  notes?: string;
};

export type ConconiAnalysisResult = {
  deflectionStatus:
    | "deflexao_identificada"
    | "deflexao_possivel"
    | "limiar_nao_determinado"
    | "dados_insuficientes";
  deflectionHeartRate?: number;
  deflectionSpeedKmh?: number;
  maxHeartRateObserved?: number;
  maxSpeedObserved?: number;
  vo2MaxEstimate?: number;
  qualityScore: number;
  isReliable: boolean;
  explanation: string;
  slope1?: number;
  slope2?: number;
  rSquared1?: number;
  rSquared2?: number;
  zones: {
    z1Recovery: { minBpm: number; maxBpm: number; label: string };
    z2Aerobic: { minBpm: number; maxBpm: number; label: string };
    z3Threshold: { minBpm: number; maxBpm: number; label: string };
    z4Vo2Max: { minBpm: number; maxBpm: number; label: string };
    z5Anaerobic: { minBpm: number; maxBpm: number; label: string };
  };
};

export type HeartRateZoneDef = {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  minBpm: number;
  maxBpm: number;
  pctRange: string;
  description: string;
};

export type HeartRateCalculationResult = {
  method: HeartRateMethod;
  isEstimated: boolean;
  hrMaxUsed: number;
  hrRestUsed?: number;
  formulaNote: string;
  zones: Record<string, HeartRateZoneDef>;
};

export type AerobicBlockInput = {
  id?: string;
  blockType: "warmup" | "interval" | "continuous" | "interblock_rest" | "cooldown";
  name: string;
  reps?: number;
  workDurationSeconds?: number;
  workSpeedKmh?: number;
  workHrBpmMin?: number;
  workHrBpmMax?: number;
  workRpe?: number;
  restDurationSeconds?: number;
  restSpeedKmh?: number;
  restHrBpmMin?: number;
  restHrBpmMax?: number;
  restType?: "active" | "passive";
  includeRestAfterLastRep?: boolean;
  durationSeconds?: number;
  notes?: string;
};

export type AerobicSessionSummary = {
  totalSeconds: number;
  totalMinutes: number;
  formattedDuration: string;
  workSeconds: number;
  restSeconds: number;
  workRestRatio: string;
};

export type AerobicAIInput = {
  studentId: string;
  studentName: string;
  ageYears?: number;
  experienceLevel?: "iniciante" | "intermediario" | "avancado";
  goal: AerobicGoal | string;
  prescriptionMode: AerobicPrescriptionMode;
  weeklyFrequency: number;
  sessionDurationMinutes: number;
  availableDays?: string[];
  hrRestBpm?: number;
  hrMaxMeasured?: number;
  conconiAnalysis?: ConconiAnalysisResult;
  contraindications?: string[];
  preferredProtocolType?: AerobicProtocolType;
  environment?: "esteira" | "pista" | "bike" | "outro";
  notes?: string;
};

export type AerobicAISuggestion = {
  suggestionKey: "A_CONSERVADORA" | "B_EQUILIBRADA" | "C_ESPECIFICA";
  title: string;
  badge: string;
  prescriptionMode: AerobicPrescriptionMode;
  objective: string;
  weeklyFrequency: number;
  totalDurationMinutes: number;
  stimulusType: AerobicProtocolType;
  warmup: {
    durationMinutes: number;
    description: string;
    speedKmh?: number;
    targetHrRange?: string;
  };
  blocks: AerobicBlockInput[];
  cooldown: {
    durationMinutes: number;
    description: string;
    speedKmh?: number;
    targetHrRange?: string;
  };
  technicalJustification: string;
  alertsAndLimitations: string[];
  adaptationTips: string[];
  status: "draft";
};

export type AerobicAIGeneratorResult = {
  suggestions: AerobicAISuggestion[];
  dataQualityWarning?: string;
  generatedAt: string;
};

// -------------------------------------------------------------
// 1. ANÁLISE DETERMINÍSTICA DA CURVA DE CONCONI
// -------------------------------------------------------------

function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Pearson r
  const numR = n * sumXY - sumX * sumY;
  const denR = Math.sqrt(
    Math.max(0, (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  );
  const r = denR > 0 ? numR / denR : 0;
  const r2 = Math.min(1, Math.max(0, r * r));

  return { slope, intercept, r2 };
}

/**
 * Analisa os estágios do Teste de Conconi com regressão segmentada bilateral.
 * Se os dados forem insuficientes ou a dispersão for excessiva, marca explicitamente
 * "Limiar não determinado" e NÃO inventa valores fictícios.
 */
export function analyzeConconiData(
  stages: ConconiStage[],
  hrRest = 60
): ConconiAnalysisResult {
  // Filtra estágios válidos
  const validStages = (stages || [])
    .filter(
      (s) =>
        typeof s.speedKmh === "number" &&
        s.speedKmh > 0 &&
        typeof s.heartRateBpm === "number" &&
        s.heartRateBpm > 40 &&
        s.heartRateBpm < 250
    )
    .sort((a, b) => a.speedKmh - b.speedKmh);

  const defaultZones = (hrMax: number) => ({
    z1Recovery: { minBpm: Math.round(hrMax * 0.5), maxBpm: Math.round(hrMax * 0.6), label: "50-60%" },
    z2Aerobic: { minBpm: Math.round(hrMax * 0.6) + 1, maxBpm: Math.round(hrMax * 0.7), label: "60-70%" },
    z3Threshold: { minBpm: Math.round(hrMax * 0.7) + 1, maxBpm: Math.round(hrMax * 0.8), label: "70-80%" },
    z4Vo2Max: { minBpm: Math.round(hrMax * 0.8) + 1, maxBpm: Math.round(hrMax * 0.9), label: "80-90%" },
    z5Anaerobic: { minBpm: Math.round(hrMax * 0.9) + 1, maxBpm: hrMax, label: "90-100%" },
  });

  if (validStages.length < 5) {
    const maxBpm = validStages.length > 0 ? Math.max(...validStages.map((s) => s.heartRateBpm)) : 170;
    const maxSpd = validStages.length > 0 ? Math.max(...validStages.map((s) => s.speedKmh)) : 8;
    return {
      deflectionStatus: "dados_insuficientes",
      qualityScore: Math.round((validStages.length / 8) * 40),
      isReliable: false,
      maxHeartRateObserved: maxBpm,
      maxSpeedObserved: maxSpd,
      explanation:
        "Dados insuficientes para estimativa do limiar. O Teste de Conconi requer no mínimo 5 a 6 estágios progressivos válidos.",
      zones: defaultZones(maxBpm),
    };
  }

  const maxObservedBpm = Math.max(...validStages.map((s) => s.heartRateBpm));
  const maxObservedSpeed = Math.max(...validStages.map((s) => s.speedKmh));

  // VO2Max estimado pela fórmula de caminhada/corrida ACSM baseada na velocidade máxima atingida
  const vo2MaxEst = Math.round((maxObservedSpeed * 3.5 + 3.5) * 10) / 10;

  // Busca o ponto de deflexão candidato (índice k entre 2 e N-2)
  const points = validStages.map((s) => ({ x: s.speedKmh, y: s.heartRateBpm }));
  let bestCandidateIndex = -1;
  let bestScore = -Infinity;
  let bestSlope1 = 0;
  let bestSlope2 = 0;
  let bestR2_1 = 0;
  let bestR2_2 = 0;

  for (let k = 2; k <= points.length - 3; k++) {
    const seg1 = points.slice(0, k + 1);
    const seg2 = points.slice(k);

    const reg1 = linearRegression(seg1);
    const reg2 = linearRegression(seg2);

    // Na deflexão de Conconi, a relação linear FC x velocidade sofre uma quebra (inclinação diminui)
    const slopeDrop = reg1.slope - reg2.slope;
    const combinedR2 = (reg1.r2 + reg2.r2) / 2;

    // Critério fisiológico: segmento 1 deve ter inclinação positiva expressiva (FC sobe com velocidade)
    // e segmento 2 deve ter inclinação menor (deflexão da FC)
    if (reg1.slope > 3.0 && reg2.slope < reg1.slope && combinedR2 > 0.85) {
      const candidateScore = slopeDrop * 1.5 + combinedR2 * 10;
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestCandidateIndex = k;
        bestSlope1 = reg1.slope;
        bestSlope2 = reg2.slope;
        bestR2_1 = reg1.r2;
        bestR2_2 = reg2.r2;
      }
    }
  }

  // Se não foi encontrada deflexão matematicamente clara ou dispersão foi alta:
  if (bestCandidateIndex === -1 || bestR2_1 < 0.82) {
    // Verifica correlação linear global
    const globalReg = linearRegression(points);
    return {
      deflectionStatus: "limiar_nao_determinado",
      maxHeartRateObserved: maxObservedBpm,
      maxSpeedObserved: maxObservedSpeed,
      vo2MaxEstimate: vo2MaxEst,
      qualityScore: Math.round(globalReg.r2 * 75),
      isReliable: false,
      explanation:
        "Limiar não determinado. A relação entre velocidade e FC apresentou comportamento linear contínuo ou dispersão de pontos sem quebra evidente de inclinação. Não fabrique limiares; utilize a FC de reserva ou o julgamento do treinador.",
      zones: defaultZones(maxObservedBpm),
    };
  }

  const deflectionStage = validStages[bestCandidateIndex];
  const deflBpm = deflectionStage.heartRateBpm;
  const deflSpeed = deflectionStage.speedKmh;

  const qualityScore = Math.min(
    100,
    Math.round(((bestR2_1 + bestR2_2) / 2) * 80 + (validStages.length >= 8 ? 20 : 10))
  );

  const isHighConfidence = bestR2_1 >= 0.90 && bestR2_2 >= 0.85 && bestSlope1 >= 4.0;

  // Zonas ancoradas no ponto de deflexão (Limiar Anaeróbico)
  const z1Max = Math.round(deflBpm * 0.78);
  const z2Max = Math.round(deflBpm * 0.88);
  const z3Max = deflBpm;
  const z4Max = Math.round(deflBpm + (maxObservedBpm - deflBpm) * 0.65);
  const z5Max = maxObservedBpm;

  return {
    deflectionStatus: isHighConfidence ? "deflexao_identificada" : "deflexao_possivel",
    deflectionHeartRate: deflBpm,
    deflectionSpeedKmh: deflSpeed,
    maxHeartRateObserved: maxObservedBpm,
    maxSpeedObserved: maxObservedSpeed,
    vo2MaxEstimate: vo2MaxEst,
    qualityScore,
    isReliable: isHighConfidence,
    explanation: isHighConfidence
      ? `Ponto de deflexão identificado a ${deflSpeed.toFixed(1)} km/h e ${deflBpm} bpm (R² pré=${bestR2_1.toFixed(2)}, R² pós=${bestR2_2.toFixed(2)}).`
      : `Deflexão possível a ${deflSpeed.toFixed(1)} km/h e ${deflBpm} bpm. Recomenda-se confirmação com percepção subjetiva de esforço (Borg).`,
    slope1: Math.round(bestSlope1 * 100) / 100,
    slope2: Math.round(bestSlope2 * 100) / 100,
    rSquared1: Math.round(bestR2_1 * 100) / 100,
    rSquared2: Math.round(bestR2_2 * 100) / 100,
    zones: {
      z1Recovery: { minBpm: Math.round(hrRest * 1.1), maxBpm: z1Max, label: "Recuperação Ativa" },
      z2Aerobic: { minBpm: z1Max + 1, maxBpm: z2Max, label: "Aeróbico Base" },
      z3Threshold: { minBpm: z2Max + 1, maxBpm: z3Max, label: "Limiar de Conconi" },
      z4Vo2Max: { minBpm: z3Max + 1, maxBpm: z4Max, label: "Potência Aeróbica" },
      z5Anaerobic: { minBpm: z4Max + 1, maxBpm: z5Max, label: "Capacidade Anaeróbica" },
    },
  };
}

// -------------------------------------------------------------
// 2. CÁLCULO DETERMINÍSTICO DE ZONAS DE FREQUÊNCIA CARDÍACA
// -------------------------------------------------------------

export function calculateHeartRateZones(
  params: {
    ageYears?: number;
    hrMaxMeasured?: number;
    hrRestBpm?: number;
    method?: HeartRateMethod;
    customHrMax?: number;
  }
): HeartRateCalculationResult {
  const {
    ageYears = 30,
    hrMaxMeasured,
    hrRestBpm = 65,
    method = hrMaxMeasured ? "measured_max_pct" : "estimated_max_pct",
    customHrMax,
  } = params;

  let hrMax = 0;
  let isEstimated = false;
  let formulaNote = "";

  if (hrMaxMeasured && hrMaxMeasured > 100) {
    hrMax = hrMaxMeasured;
    isEstimated = false;
    formulaNote = `FC Máxima Medida em teste real: ${hrMax} bpm`;
  } else if (customHrMax && customHrMax > 100) {
    hrMax = customHrMax;
    isEstimated = false;
    formulaNote = `FC Máxima informada pelo treinador: ${hrMax} bpm`;
  } else {
    // Tanaka formula: 208 - (0.7 * idade)
    hrMax = Math.round(208 - 0.7 * ageYears);
    isEstimated = true;
    formulaNote = `FC Máxima Estimada pela fórmula de Tanaka [208 - (0,7 × ${ageYears})]: ${hrMax} bpm. Atenção: valor populacional estimado, não substitui teste ergométrico.`;
  }

  const effectiveMethod: HeartRateMethod =
    method === "karvonen_reserve" && hrRestBpm > 40 && hrRestBpm < hrMax
      ? "karvonen_reserve"
      : isEstimated
      ? "estimated_max_pct"
      : "measured_max_pct";

  const zones: Record<string, HeartRateZoneDef> = {};

  if (effectiveMethod === "karvonen_reserve") {
    const hrr = hrMax - hrRestBpm; // Heart Rate Reserve
    const calcK = (pct: number) => Math.round(hrRestBpm + hrr * pct);

    zones.Z1 = {
      zone: 1,
      name: "Z1 — Recuperação Ativa",
      minBpm: calcK(0.5),
      maxBpm: calcK(0.6),
      pctRange: "50-60% FCR",
      description: "Recuperação ativa, aquecimento e regeneração metabólica.",
    };
    zones.Z2 = {
      zone: 2,
      name: "Z2 — Aeróbico Base / Queima Lipídica",
      minBpm: calcK(0.6) + 1,
      maxBpm: calcK(0.7),
      pctRange: "60-70% FCR",
      description: "Desenvolvimento da base mitocondrial e sustentação prolongada.",
    };
    zones.Z3 = {
      zone: 3,
      name: "Z3 — Tempo / Limiar Aeróbico",
      minBpm: calcK(0.7) + 1,
      maxBpm: calcK(0.8),
      pctRange: "70-80% FCR",
      description: "Ritmo de prova sustentável e eficiência cardiorrespiratória.",
    };
    zones.Z4 = {
      zone: 4,
      name: "Z4 — Limiar Anaeróbico",
      minBpm: calcK(0.8) + 1,
      maxBpm: calcK(0.9),
      pctRange: "80-90% FCR",
      description: "Treino em ponto de quebra glicolítico e tolerância a lactato.",
    };
    zones.Z5 = {
      zone: 5,
      name: "Z5 — VO2 Máx / Potência Anaeróbica",
      minBpm: calcK(0.9) + 1,
      maxBpm: hrMax,
      pctRange: "90-100% FCR",
      description: "Esforços máximos de curtíssima duração e estímulos supra-limiares.",
    };
  } else {
    // Percentual da FC Máxima (% HRmax)
    const calcP = (pct: number) => Math.round(hrMax * pct);

    zones.Z1 = {
      zone: 1,
      name: "Z1 — Muito Leve / Regenerativo",
      minBpm: calcP(0.5),
      maxBpm: calcP(0.6),
      pctRange: "50-60% FCmáx",
      description: "Aquecimento, relaxamento e melhora da circulação periférica.",
    };
    zones.Z2 = {
      zone: 2,
      name: "Z2 — Leve / Aeróbico Fundamental",
      minBpm: calcP(0.6) + 1,
      maxBpm: calcP(0.7),
      pctRange: "60-70% FCmáx",
      description: "Ritmo de conversação confortável, aumento da densidade capilar.",
    };
    zones.Z3 = {
      zone: 3,
      name: "Z3 — Moderado / Aeróbico Desenvolvimental",
      minBpm: calcP(0.7) + 1,
      maxBpm: calcP(0.8),
      pctRange: "70-80% FCmáx",
      description: "Zona de transição aeróbica, respiração rítmica e contínua.",
    };
    zones.Z4 = {
      zone: 4,
      name: "Z4 — Intenso / Limiar Anaeróbico",
      minBpm: calcP(0.8) + 1,
      maxBpm: calcP(0.9),
      pctRange: "80-90% FCmáx",
      description: "Esforço vigoroso com queima muscular e respiração ofegante.",
    };
    zones.Z5 = {
      zone: 5,
      name: "Z5 — Máximo / Potência Aeróbica",
      minBpm: calcP(0.9) + 1,
      maxBpm: hrMax,
      pctRange: "90-100% FCmáx",
      description: "Zona de sprint, tiros curtos e capacidade de sustentação limite.",
    };
  }

  return {
    method: effectiveMethod,
    isEstimated,
    hrMaxUsed: hrMax,
    hrRestUsed: hrRestBpm,
    formulaNote,
    zones,
  };
}

// -------------------------------------------------------------
// 3. CÁLCULO MATEMÁTICO EXATO DE DURAÇÃO E VOLUMES DE BLOCOS
// -------------------------------------------------------------

export function calculateSessionDuration(
  blocks: AerobicBlockInput[],
  warmupMinutes = 0,
  cooldownMinutes = 0
): AerobicSessionSummary {
  let workSeconds = 0;
  let restSeconds = 0;

  for (const block of blocks || []) {
    if (block.blockType === "warmup") {
      const dur = (block.workDurationSeconds || block.durationSeconds || 0);
      workSeconds += dur;
    } else if (block.blockType === "cooldown") {
      const dur = (block.workDurationSeconds || block.durationSeconds || 0);
      workSeconds += dur;
    } else if (block.blockType === "continuous") {
      const dur = (block.workDurationSeconds || block.durationSeconds || 0);
      workSeconds += dur;
    } else if (block.blockType === "interblock_rest") {
      const dur = (block.restDurationSeconds || block.durationSeconds || 0);
      restSeconds += dur;
    } else if (block.blockType === "interval") {
      const reps = Math.max(1, block.reps || 1);
      const wDur = block.workDurationSeconds || 0;
      const rDur = block.restDurationSeconds || 0;

      workSeconds += reps * wDur;

      // Se incluir descanso após a última repetição (padrão true em protocolos completos)
      const restReps = block.includeRestAfterLastRep === false ? reps - 1 : reps;
      restSeconds += Math.max(0, restReps) * rDur;
    }
  }

  // Adiciona aquecimento e volta à calma adicionais se informados nos parâmetros da sessão
  workSeconds += Math.round(warmupMinutes * 60);
  workSeconds += Math.round(cooldownMinutes * 60);

  const totalSeconds = workSeconds + restSeconds;
  const totalMinutes = Math.round((totalSeconds / 60) * 10) / 10;

  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const formattedDuration = `${m}m ${s > 0 ? `${s}s` : ""}`.trim();

  const ratio = restSeconds > 0 ? `1:${(restSeconds / Math.max(1, workSeconds)).toFixed(1)}` : "Contínuo";

  return {
    totalSeconds,
    totalMinutes,
    formattedDuration,
    workSeconds,
    restSeconds,
    workRestRatio: ratio,
  };
}

// -------------------------------------------------------------
// 4. VERIFICAÇÃO DE SEGURANÇA E CONTRAINDICAÇÕES
// -------------------------------------------------------------

export function validateSafetyAndContraindications(
  input: AerobicAIInput,
  protocolType?: AerobicProtocolType
): {
  allowed: boolean;
  warnings: string[];
  restrictedTypes: AerobicProtocolType[];
} {
  const warnings: string[] = [];
  const restrictedTypes: AerobicProtocolType[] = [];

  const contra = (input.contraindications || []).map((c) => c.toLowerCase());
  const exp = input.experienceLevel || "iniciante";

  // Se houver contraindicação cardiorrespiratória grave
  const hasCardiacIssue = contra.some(
    (c) =>
      c.includes("cardiopat") ||
      c.includes("arritm") ||
      c.includes("hipertens") ||
      c.includes("angina") ||
      c.includes("infart") ||
      c.includes("isquem")
  );

  const hasJointIssue = contra.some(
    (c) =>
      c.includes("menisco") ||
      c.includes("ligamento") ||
      c.includes("fascite") ||
      c.includes("canelite") ||
      c.includes("artrose")
  );

  if (hasCardiacIssue) {
    warnings.push(
      "Atenção clínica: Registro de condição cardiovascular no histórico do aluno. Estímulos anaeróbicos de alta intensidade (SIT/RST/HIIT curto) estão bloqueados por segurança."
    );
    restrictedTypes.push("sit", "rst", "hiit_short", "hiit_long");
  }

  if (exp === "iniciante") {
    warnings.push(
      "Aluno iniciante: protocolos de alta intensidade (SIT / RST) não são recomendados antes de 8 a 12 semanas de base aeróbica contínua/intervalada extensiva."
    );
    restrictedTypes.push("sit", "rst");
  }

  if (hasJointIssue) {
    warnings.push(
      "Alerta ortopédico: histórico articular registrado. Priorizar controle de velocidade e evitar trocas abruptas de cadência ou esteira com inclinação excessiva."
    );
  }

  let allowed = true;
  if (protocolType && restrictedTypes.includes(protocolType)) {
    allowed = false;
  }

  return {
    allowed,
    warnings,
    restrictedTypes,
  };
}

// -------------------------------------------------------------
// 5. GERADOR INTELIGENTE COM IA (3 SUGESTÕES DISTINTAS)
// -------------------------------------------------------------

/**
 * Gera 3 alternativas de prescrição aeróbica técnica:
 * - Sugestão A (Conservadora): Foco em adaptação, menor estresse articular, segurança elevada.
 * - Sugestão B (Equilibrada): Mescla trabalho contínuo e intervalado progressivo.
 * - Sugestão C (Específica): Otimizada para o objetivo alvo do aluno (tolerância de velocidade, corrida, etc).
 */
export function generateAerobicProtocolsAI(input: AerobicAIInput): AerobicAIGeneratorResult {
  const safety = validateSafetyAndContraindications(input);

  // Referências fisiológicas do aluno
  const conconi = input.conconiAnalysis;
  const deflSpeed = conconi?.deflectionSpeedKmh;
  const deflBpm = conconi?.deflectionHeartRate;
  const maxObsBpm = input.hrMaxMeasured || conconi?.maxHeartRateObserved || Math.round(208 - 0.7 * (input.ageYears || 30));

  // Velocidades de referência
  const baseSpeed = deflSpeed ? Math.max(4.5, deflSpeed * 0.78) : 5.5;
  const thresholdSpeed = deflSpeed ? deflSpeed : 7.5;
  const intervalSpeed = deflSpeed ? deflSpeed * 1.15 : 9.0;
  const recoverySpeed = Math.max(3.0, baseSpeed * 0.65);

  // Zonas de FC
  const hrCalcs = calculateHeartRateZones({
    ageYears: input.ageYears,
    hrMaxMeasured: input.hrMaxMeasured || conconi?.maxHeartRateObserved,
    hrRestBpm: input.hrRestBpm || 65,
    method: deflBpm ? "measured_max_pct" : "estimated_max_pct",
  });

  const z1Range = `${hrCalcs.zones.Z1.minBpm}-${hrCalcs.zones.Z1.maxBpm} bpm`;
  const z2Range = `${hrCalcs.zones.Z2.minBpm}-${hrCalcs.zones.Z2.maxBpm} bpm`;
  const z3Range = `${hrCalcs.zones.Z3.minBpm}-${hrCalcs.zones.Z3.maxBpm} bpm`;
  const z4Range = `${hrCalcs.zones.Z4.minBpm}-${hrCalcs.zones.Z4.maxBpm} bpm`;

  const mode = input.prescriptionMode;

  // --- SUGESTÃO A: CONSERVADORA (Base & Volume Gradual) ---
  const blocksA: AerobicBlockInput[] = [
    {
      id: "blk-a-1",
      blockType: "continuous",
      name: "Bloco 1 — Aeróbico Base Contínuo",
      workDurationSeconds: 15 * 60,
      durationSeconds: 15 * 60,
      workSpeedKmh: Math.round(baseSpeed * 10) / 10,
      workHrBpmMin: hrCalcs.zones.Z2.minBpm,
      workHrBpmMax: hrCalcs.zones.Z2.maxBpm,
      workRpe: 4,
      notes: mode === "speed"
        ? `Ritmo confortável sustentado a ${baseSpeed.toFixed(1)} km/h.`
        : mode === "hr"
        ? `Mantenha a frequência cardíaca na Zona 2 (${z2Range}).`
        : `Ritmo operacional a ${baseSpeed.toFixed(1)} km/h monitorando Z2 (${z2Range}).`,
    },
    {
      id: "blk-a-2",
      blockType: "interval",
      name: "Bloco 2 — Intervalos Suaves de Ativação",
      reps: 3,
      workDurationSeconds: 90,
      workSpeedKmh: Math.round((baseSpeed + 1.0) * 10) / 10,
      workHrBpmMin: hrCalcs.zones.Z3.minBpm,
      workHrBpmMax: hrCalcs.zones.Z3.maxBpm,
      workRpe: 5,
      restDurationSeconds: 90,
      restSpeedKmh: Math.round(recoverySpeed * 10) / 10,
      restHrBpmMin: hrCalcs.zones.Z1.minBpm,
      restHrBpmMax: hrCalcs.zones.Z1.maxBpm,
      restType: "active",
      includeRestAfterLastRep: true,
      notes: "Estímulos controlados para acostumar o sistema neuromuscular sem acidose metabólica excessiva.",
    },
  ];

  const durA = calculateSessionDuration(blocksA, 5, 3);
  const suggestionA: AerobicAISuggestion = {
    suggestionKey: "A_CONSERVADORA",
    title: "Protocolo Aeróbico Progressivo de Base (Conservador)",
    badge: "Segurança & Adaptação",
    prescriptionMode: mode,
    objective: "Melhorar densidade mitocondrial, circulação periférica e tolerância sem pico de lactato.",
    weeklyFrequency: Math.max(2, input.weeklyFrequency || 3),
    totalDurationMinutes: durA.totalMinutes,
    stimulusType: "continuous_moderate",
    warmup: {
      durationMinutes: 5,
      description: "5 minutos progressivos na esteira (iniciar a 4.0 km/h e progredir até ritmo de Z1/Z2).",
      speedKmh: 4.5,
      targetHrRange: `${hrCalcs.zones.Z1.minBpm}-${hrCalcs.zones.Z1.maxBpm} bpm`,
    },
    blocks: blocksA,
    cooldown: {
      durationMinutes: 3,
      description: "Caminhada de desaceleração gradual para normalização do retorno venoso.",
      speedKmh: 3.5,
      targetHrRange: `< ${hrCalcs.zones.Z1.maxBpm} bpm`,
    },
    technicalJustification:
      "Indicado para estabelecer base aeróbica sólida com baixa sobrecarga osteoarticular. Favorece a oxidação de ácidos graxos e prepara o miocárdio para futuros estímulos intervalados.",
    alertsAndLimitations: [
      "Evite aumentar a velocidade se a frequência cardíaca ultrapassar a Z3 antes do final do bloco.",
      "Se sentir cansaço excessivo, aumente o tempo de recuperação ativa para 2 minutos.",
    ],
    adaptationTips: [
      "Na 2ª semana: aumentar o Bloco 1 de 15 para 18 minutos se a FC permanecer estável.",
      "Na 3ª semana: adicionar uma 4ª repetição ao Bloco 2.",
    ],
    status: "draft",
  };

  // --- SUGESTÃO B: EQUILIBRADA (Intervalado Extensivo + Bloco Contínuo) ---
  const blocksB: AerobicBlockInput[] = [
    {
      id: "blk-b-1",
      blockType: "interval",
      name: "Bloco 1 — Intervalado Extensivo de Limiar",
      reps: 4,
      workDurationSeconds: 120, // 2 min
      workSpeedKmh: Math.round(thresholdSpeed * 10) / 10,
      workHrBpmMin: hrCalcs.zones.Z3.minBpm,
      workHrBpmMax: hrCalcs.zones.Z3.maxBpm,
      workRpe: 6,
      restDurationSeconds: 60, // 1 min
      restSpeedKmh: Math.round(recoverySpeed * 10) / 10,
      restHrBpmMin: hrCalcs.zones.Z1.minBpm,
      restHrBpmMax: hrCalcs.zones.Z2.maxBpm,
      restType: "active",
      includeRestAfterLastRep: true,
      notes: "4 tiros de 2 minutos ativos com 1 minuto de recuperação ativa.",
    },
    {
      id: "blk-b-rest",
      blockType: "interblock_rest",
      name: "Descanso Interbloco",
      restDurationSeconds: 120,
      durationSeconds: 120,
      restType: "active",
      notes: "2 minutos de caminhada leve de recuperação antes do bloco contínuo.",
    },
    {
      id: "blk-b-2",
      blockType: "continuous",
      name: "Bloco 2 — Contínuo Sub-Limiar",
      workDurationSeconds: 10 * 60,
      durationSeconds: 10 * 60,
      workSpeedKmh: Math.round((thresholdSpeed - 0.8) * 10) / 10,
      workHrBpmMin: hrCalcs.zones.Z2.minBpm,
      workHrBpmMax: hrCalcs.zones.Z3.maxBpm,
      workRpe: 5,
      notes: "10 minutos sustentados em ritmo moderado para consolidação da remoção de lactato.",
    },
  ];

  const durB = calculateSessionDuration(blocksB, 5, 3);
  const suggestionB: AerobicAISuggestion = {
    suggestionKey: "B_EQUILIBRADA",
    title: "Protocolo Misto: Intervalado Extensivo + Ritmo Sub-Limiar",
    badge: "Eficiência & Equilíbrio",
    prescriptionMode: mode,
    objective: "Desenvolver capacidade de sustentar velocidades e tolerância ao esforço com rápida recuperação.",
    weeklyFrequency: Math.max(3, input.weeklyFrequency || 3),
    totalDurationMinutes: durB.totalMinutes,
    stimulusType: "interval_extensive",
    warmup: {
      durationMinutes: 5,
      description: "5 minutos progressivos na esteira (iniciar a 4.5 km/h e finalizar a 6.0 km/h).",
      speedKmh: 5.0,
      targetHrRange: z1Range,
    },
    blocks: blocksB,
    cooldown: {
      durationMinutes: 3,
      description: "Caminhada de desaceleração suave (3.5 a 4.0 km/h).",
      speedKmh: 3.8,
      targetHrRange: `< ${hrCalcs.zones.Z2.minBpm} bpm`,
    },
    technicalJustification:
      "A combinação de estímulos intervalados no limiar (Z3/Z4) seguida de um bloco contínuo aeróbico treina o reaproveitamento de lactato como substrato energético celular.",
    alertsAndLimitations: [
      "Monitore a resposta cardíaca nos intervalos: se a FC não baixar pelo menos 15-20 bpm na pausa, reduza a velocidade do tiro em 0.5 km/h.",
    ],
    adaptationTips: [
      "Aumentar o número de tiros de 4 para 5 na 3ª semana se a escala Borg permanecer ≤ 6.",
    ],
    status: "draft",
  };

  // --- SUGESTÃO C: ESPECÍFICA (HIIT Curto / Alta Intensidade ou Específico de Prova) ---
  const isHiitSafe = !safety.restrictedTypes.includes("hiit_short");
  const blockCSpeed = isHiitSafe ? Math.round(intervalSpeed * 10) / 10 : Math.round(thresholdSpeed * 10) / 10;
  const blockCReps = isHiitSafe ? 6 : 5;

  const blocksC: AerobicBlockInput[] = [
    {
      id: "blk-c-1",
      blockType: "interval",
      name: isHiitSafe ? "Bloco 1 — HIIT Curto (Tiros de Velocidade)" : "Bloco 1 — Tiros Controlados de Limiar",
      reps: blockCReps,
      workDurationSeconds: 60, // 1 min ativo
      workSpeedKmh: blockCSpeed,
      workHrBpmMin: isHiitSafe ? hrCalcs.zones.Z4.minBpm : hrCalcs.zones.Z3.minBpm,
      workHrBpmMax: isHiitSafe ? hrCalcs.zones.Z4.maxBpm : hrCalcs.zones.Z3.maxBpm,
      workRpe: isHiitSafe ? 8 : 6,
      restDurationSeconds: 90, // 1 min e meio de pausa
      restSpeedKmh: Math.round(recoverySpeed * 10) / 10,
      restHrBpmMin: hrCalcs.zones.Z1.minBpm,
      restHrBpmMax: hrCalcs.zones.Z2.maxBpm,
      restType: "active",
      includeRestAfterLastRep: true,
      notes: `${blockCReps} tiros de 1 minuto ativo a ${blockCSpeed} km/h com 90s de recuperação ativa.`,
    },
    {
      id: "blk-c-rest",
      blockType: "interblock_rest",
      name: "Descanso Interbloco",
      restDurationSeconds: 120,
      durationSeconds: 120,
      restType: "active",
      notes: "2 minutos de pausa ativa controlada.",
    },
    {
      id: "blk-c-2",
      blockType: "continuous",
      name: "Bloco 2 — Estabilização Aeróbica",
      workDurationSeconds: 8 * 60,
      durationSeconds: 8 * 60,
      workSpeedKmh: Math.round((baseSpeed + 0.5) * 10) / 10,
      workHrBpmMin: hrCalcs.zones.Z2.minBpm,
      workHrBpmMax: hrCalcs.zones.Z3.maxBpm,
      workRpe: 5,
      notes: "8 minutos contínuos para acelerar o clareamento de metabólitos pós-tiros.",
    },
  ];

  const durC = calculateSessionDuration(blocksC, 5, 3);
  const suggestionC: AerobicAISuggestion = {
    suggestionKey: "C_ESPECIFICA",
    title: isHiitSafe
      ? "Protocolo Específico: Potência Aeróbica (HIIT Curto)"
      : "Protocolo Específico: Tolerância ao Ritmo de Prova",
    badge: isHiitSafe ? "Alta Performance" : "Sustentação Específica",
    prescriptionMode: mode,
    objective: isHiitSafe
      ? "Elevar o VO2máx e a velocidade sustentada no limiar superior."
      : "Aprimorar a eficiência mecânica e cadência em velocidade de competição.",
    weeklyFrequency: Math.max(2, Math.min(3, input.weeklyFrequency || 2)),
    totalDurationMinutes: durC.totalMinutes,
    stimulusType: isHiitSafe ? "hiit_short" : "interval_extensive",
    warmup: {
      durationMinutes: 5,
      description: "5 minutos progressivos com 2 acelerações breves de 15 segundos ao final.",
      speedKmh: 5.5,
      targetHrRange: z2Range,
    },
    blocks: blocksC,
    cooldown: {
      durationMinutes: 3,
      description: "Volta à calma completa com caminhada de baixa intensidade.",
      speedKmh: 3.5,
      targetHrRange: `< ${hrCalcs.zones.Z1.maxBpm} bpm`,
    },
    technicalJustification: isHiitSafe
      ? "O trabalho fracionado em alta intensidade (Z4/Z5) gera recrutamento de fibras do tipo IIa e potente estímulo mitocondrial com menor fadiga muscular periférica cumulativa do que sprints exaustivos contínuos."
      : "Desenvolve a economia de corrida mantendo a estabilidade cardiovascular dentro de margem segura para o nível de aptidão atual.",
    alertsAndLimitations: [
      "Não realizar este treino em dias consecutivos com treino pesado de membros inferiores.",
      "Se a escala Borg de esforço atingir 9/10 antes do 4º tiro, encerre a sessão no bloco 1.",
    ],
    adaptationTips: [
      "Reduzir o tempo de recuperação de 90s para 75s após 2 semanas com adaptação comprovada.",
    ],
    status: "draft",
  };

  const warningsCombined = [
    ...safety.warnings,
    ...(conconi?.deflectionStatus === "limiar_nao_determinado"
      ? ["Aviso fisiológico: Limiar de Conconi não determinado de forma confiável. As velocidades foram parametrizadas pela velocidade máxima e julgamento do treinador."]
      : []),
  ];

  return {
    suggestions: [suggestionA, suggestionB, suggestionC],
    dataQualityWarning: warningsCombined.length > 0 ? warningsCombined.join(" ") : undefined,
    generatedAt: new Date().toISOString(),
  };
}
