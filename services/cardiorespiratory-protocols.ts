export type CardioProtocolCategory =
  | "externos"
  | "esteira"
  | "bicicleta"
  | "submaximos"
  | "limiar"
  | "personalizado";

export type CardioEnvironment = "externo" | "esteira" | "bicicleta" | "outro";
export type CardioEstimateType =
  | "vo2max"
  | "capacidade_cardiorrespiratoria"
  | "desempenho"
  | "recuperacao_fc"
  | "ponto_deflexao_fc"
  | "limiar_estimado"
  | "potencia"
  | "outro";

export type CardioProtocolId =
  | "cooper-12min"
  | "run-2400m"
  | "rockport-1mile"
  | "six-minute-walk"
  | "conconi-treadmill"
  | "conconi-bike"
  | "custom-cardio";

export type CardioSex = "male" | "female";
export type HeartRateCaptureMode = "manual" | "sensor";
export type CardioExecutionStatus = "rascunho" | "em_execucao" | "pausado" | "interrompido" | "concluido" | "invalido";
export type ConconiDetectionStatus =
  | "deflexao_identificada"
  | "deflexao_possivel"
  | "inconclusivo"
  | "dados_insuficientes"
  | "teste_invalido"
  | "teste_interrompido";

export type CardioFieldDefinition = {
  id: string;
  label: string;
  unit?: "m" | "km" | "min" | "seg" | "bpm" | "km/h" | "mph" | "w" | "rpm" | "%" | "C" | "texto";
  required?: boolean;
  min?: number;
  max?: number;
  help: string;
};

export type CardioProtocolDefinition = {
  id: CardioProtocolId;
  version: string;
  formulaVersion: string;
  name: string;
  category: CardioProtocolCategory;
  environment: CardioEnvironment;
  estimates: CardioEstimateType[];
  description: string;
  population: string;
  equipment: string[];
  contraindications: string[];
  fields: CardioFieldDefinition[];
  stageDefaults?: Partial<CardioTestConfig>;
  formula?: string;
  reference: string;
  referenceUrl?: string;
  limitations: string[];
};

export type CardioEquipment = {
  type?: "esteira" | "bicicleta" | "cinta_cardiaca" | "relogio" | "outro";
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  lastCalibrationAt?: string;
  notes?: string;
};

export type CardioTestConfig = {
  protocolName?: string;
  adapted?: boolean;
  speedUnit?: "kmh" | "mph";
  inclinePercent?: number;
  initialSpeedKmh?: number;
  speedIncrementKmh?: number;
  initialPowerWatts?: number;
  powerIncrementWatts?: number;
  initialResistanceLevel?: number;
  resistanceIncrement?: number;
  targetCadenceRpm?: number;
  stageDurationSec?: number;
  warmupMinutes?: number;
  heartRateCaptureMode?: HeartRateCaptureMode;
  heartRateMonitor?: string;
  treadmill?: CardioEquipment;
  bike?: CardioEquipment & {
    bikeType?: "vertical" | "horizontal" | "spinning" | "outro";
    resistanceSystem?: "watts" | "nivel" | "magnetica" | "friccao" | "outro";
    seatAdjustment?: string;
    handlebarAdjustment?: string;
  };
  customNotes?: string;
};

export type CardioStage = {
  id: string;
  stageNumber: number;
  startedAt?: string;
  durationSec?: number;
  speedKmh?: number;
  inclinePercent?: number;
  powerWatts?: number;
  resistanceLevel?: number;
  cadenceRpm?: number;
  heartRateAvg?: number;
  heartRateEnd?: number;
  heartRateMax?: number;
  rpe?: number;
  valid?: boolean;
  invalidReason?: string;
  notes?: string;
};

export type HeartRateSample = {
  timestamp: string;
  bpm: number;
  source: HeartRateCaptureMode;
  stageNumber?: number;
};

export type CardioRecovery = {
  immediateBpm?: number;
  after1MinBpm?: number;
  after2MinBpm?: number;
  after3MinBpm?: number;
  symptoms?: string;
  notes?: string;
};

export type CardioExternalResults = {
  distanceMeters?: number;
  timeMinutes?: number;
  heartRateRest?: number;
  heartRateStart?: number;
  heartRateEnd?: number;
  heartRateRecovery1Min?: number;
  rpeFinal?: number;
  temperatureC?: number;
  terrain?: string;
  locationConditions?: string;
  interruptionReason?: string;
  notes?: string;
};

export type CardioTestExecution = {
  id: string;
  protocolId: CardioProtocolId;
  protocolVersion: string;
  status: CardioExecutionStatus;
  order: number;
  config: CardioTestConfig;
  external?: CardioExternalResults;
  stages: CardioStage[];
  heartRateSamples: HeartRateSample[];
  recovery?: CardioRecovery;
  professionalReview?: {
    accepted?: boolean;
    manualDeflectionStageId?: string;
    notes?: string;
  };
  snapshot?: CardioProtocolSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type RegressionLine = {
  slope: number;
  intercept: number;
  r2: number;
  sse: number;
};

export type ConconiDetection = {
  status: ConconiDetectionStatus;
  stageId?: string;
  stageNumber?: number;
  heartRateBpm?: number;
  loadValue?: number;
  loadUnit?: "km/h" | "w" | "nivel";
  quality: "alta" | "moderada" | "baixa" | "insuficiente";
  method: string;
  singleLineR2?: number;
  piecewiseR2?: number;
  improvementRatio?: number;
  slopeBefore?: number;
  slopeAfter?: number;
  message: string;
};

export type CardioProtocolSnapshot = {
  protocolId: CardioProtocolId;
  protocolName: string;
  protocolVersion: string;
  formulaVersion: string;
  environment: CardioEnvironment;
  estimates: CardioEstimateType[];
  calculatedAt: string;
  status: CardioExecutionStatus;
  config: CardioTestConfig;
  external?: CardioExternalResults;
  stages: CardioStage[];
  heartRateSamples: HeartRateSample[];
  recovery?: CardioRecovery;
  graphPoints: { x: number; y: number; stageNumber: number; valid: boolean; label: string }[];
  primaryResult?: {
    label: string;
    value?: number;
    unit?: string;
    type: CardioEstimateType;
  };
  vo2MaxEstimate?: number;
  conconi?: ConconiDetection;
  recoveryDrop1Min?: number;
  maxHeartRateObserved?: number;
  maxLoadObserved?: number;
  durationTotalSec?: number;
  validation: {
    isSavable: boolean;
    errors: string[];
    warnings: string[];
  };
  comparison?: {
    comparable: boolean;
    message: string;
    previousValue?: number;
    delta?: number;
  };
  reference: string;
  limitations: string[];
};

export const CARDIO_PROTOCOL_CATEGORIES: { id: CardioProtocolCategory; label: string }[] = [
  { id: "externos", label: "Testes externos" },
  { id: "esteira", label: "Esteira" },
  { id: "bicicleta", label: "Bicicleta ergométrica" },
  { id: "submaximos", label: "Testes submáximos" },
  { id: "limiar", label: "Testes de limiar" },
  { id: "personalizado", label: "Personalizados" },
];

const GENERAL_INTERRUPTION = [
  "Pedido do aluno",
  "Dor ou pressão no peito",
  "Tontura ou quase desmaio",
  "Palidez ou cianose",
  "Falta de ar desproporcional",
  "Perda de coordenação",
  "Dor musculoesquelética aguda",
  "Falha no equipamento",
  "Perda da leitura cardíaca quando essencial",
  "Incapacidade de manter velocidade ou cadência",
  "Decisão do profissional",
];

export const CARDIO_PROTOCOL_CATALOG: CardioProtocolDefinition[] = [
  {
    id: "cooper-12min",
    version: "cooper-1968-12min.v1",
    formulaVersion: "cooper-distance-vo2max.v1",
    name: "Cooper de 12 minutos",
    category: "externos",
    environment: "externo",
    estimates: ["vo2max", "desempenho"],
    description: "Teste externo de 12 minutos; estima VO₂máx a partir da distância percorrida.",
    population: "Adultos aptos a corrida/caminhada intensa em ambiente seguro.",
    equipment: ["Pista/terreno medido", "Cronômetro", "Monitor cardíaco opcional"],
    contraindications: GENERAL_INTERRUPTION,
    fields: [
      { id: "distanceMeters", label: "Distância percorrida", unit: "m", required: true, min: 100, max: 6000, help: "Distância total em 12 minutos." },
      { id: "heartRateEnd", label: "FC final", unit: "bpm", min: 40, max: 240, help: "Frequência cardíaca ao fim do teste." },
      { id: "rpeFinal", label: "PSE final", min: 0, max: 10, help: "Percepção subjetiva de esforço." },
    ],
    formula: "VO₂máx = (distância em metros - 504,9) / 44,73",
    reference: "Cooper KH. A means of assessing maximal oxygen intake. JAMA. 1968.",
    referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/5694049/",
    limitations: ["Estimativa indireta; depende de ritmo, terreno, clima e motivação."],
  },
  {
    id: "run-2400m",
    version: "cooper-1-5-mile.v1",
    formulaVersion: "cooper-2400m-time-vo2max.v1",
    name: "Corrida de 2.400 m",
    category: "externos",
    environment: "externo",
    estimates: ["vo2max", "desempenho"],
    description: "Teste de tempo para aproximadamente 1,5 milha/2,4 km; estima VO₂máx por tempo total.",
    population: "Adultos aptos a corrida intensa.",
    equipment: ["Percurso medido", "Cronômetro"],
    contraindications: GENERAL_INTERRUPTION,
    fields: [
      { id: "timeMinutes", label: "Tempo total", unit: "min", required: true, min: 4, max: 40, help: "Tempo para completar 2.400 m." },
      { id: "heartRateEnd", label: "FC final", unit: "bpm", min: 40, max: 240, help: "Frequência cardíaca final." },
    ],
    formula: "VO₂máx = 483 / tempo(min) + 3,5",
    reference: "ACSM's Guidelines for Exercise Testing and Prescription; equação de corrida de 1,5 milha.",
    referenceUrl: "https://www.topendsports.com/testing/tests/2-4-km-run.htm",
    limitations: ["Sensível à estratégia de ritmo e não deve ser aplicado sem triagem."],
  },
  {
    id: "rockport-1mile",
    version: "rockport-1mile-kline-1987.v1",
    formulaVersion: "rockport-vo2max-kline.v1",
    name: "Caminhada de 1 milha / 1.600 m",
    category: "externos",
    environment: "externo",
    estimates: ["vo2max", "capacidade_cardiorrespiratoria"],
    description: "Caminhada rápida de 1 milha com FC final, idade, sexo e peso.",
    population: "Adultos aptos a caminhada rápida.",
    equipment: ["Percurso medido", "Cronômetro", "Monitor cardíaco"],
    contraindications: GENERAL_INTERRUPTION,
    fields: [
      { id: "timeMinutes", label: "Tempo total", unit: "min", required: true, min: 6, max: 30, help: "Tempo para completar 1 milha." },
      { id: "heartRateEnd", label: "FC final", unit: "bpm", required: true, min: 40, max: 240, help: "FC ao final da caminhada." },
    ],
    formula:
      "VO₂máx = 132,853 - 0,0769*peso(lb) - 0,3877*idade + 6,315*sexoMasculino - 3,2649*tempo(min) - 0,1565*FCfinal",
    reference: "Kline GM et al. Estimation of VO2max from a one-mile track walk, gender, age, and body weight. Med Sci Sports Exerc. 1987.",
    referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/3600239/",
    limitations: ["Estimativa indireta; exige FC final confiável."],
  },
  {
    id: "six-minute-walk",
    version: "ats-6mwt-2002.v1",
    formulaVersion: "distance-only.v1",
    name: "Caminhada de 6 minutos",
    category: "externos",
    environment: "externo",
    estimates: ["capacidade_cardiorrespiratoria", "desempenho"],
    description: "Registra distância caminhada em 6 minutos. O app não converte automaticamente para VO₂máx.",
    population: "Público apropriado para caminhada submáxima com supervisão.",
    equipment: ["Corredor/percurso medido", "Cronômetro"],
    contraindications: GENERAL_INTERRUPTION,
    fields: [
      { id: "distanceMeters", label: "Distância", unit: "m", required: true, min: 10, max: 1200, help: "Distância total em 6 minutos." },
      { id: "heartRateEnd", label: "FC final", unit: "bpm", min: 40, max: 240, help: "FC ao fim do teste." },
    ],
    reference: "ATS Committee on Proficiency Standards. ATS statement: guidelines for the six-minute walk test. Am J Respir Crit Care Med. 2002.",
    referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/12091180/",
    limitations: ["Resultado bruto de capacidade funcional; interpretação depende da população."],
  },
  {
    id: "conconi-treadmill",
    version: "conconi-treadmill-incremental.v1",
    formulaVersion: "piecewise-linear-hrdp.v1",
    name: "Conconi em esteira",
    category: "esteira",
    environment: "esteira",
    estimates: ["ponto_deflexao_fc", "limiar_estimado", "desempenho"],
    description: "Teste incremental em esteira para estimar ponto de deflexão da frequência cardíaca. Não mede VO₂máx diretamente.",
    population: "Alunos aptos a teste incremental com monitoramento e supervisão.",
    equipment: ["Esteira", "Monitor cardíaco", "Cronômetro"],
    contraindications: GENERAL_INTERRUPTION,
    fields: [],
    stageDefaults: {
      speedUnit: "kmh",
      inclinePercent: 1,
      initialSpeedKmh: 8,
      speedIncrementKmh: 0.5,
      stageDurationSec: 60,
      warmupMinutes: 8,
      heartRateCaptureMode: "manual",
    },
    formula: "Detecção local por regressão linear segmentada FC x velocidade; só aceita deflexão com melhora e queda de inclinação suficientes.",
    reference: "Conconi F et al. Determination of the anaerobic threshold by a noninvasive field test in runners. J Appl Physiol. 1982.",
    referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/7085420/",
    limitations: [
      "Indireto; a deflexão pode não aparecer.",
      "Não substitui ergoespirometria ou lactato.",
      "A confiabilidade do HRDP possui limitações documentadas.",
    ],
  },
  {
    id: "conconi-bike",
    version: "conconi-bike-incremental.v1",
    formulaVersion: "piecewise-linear-hrdp.v1",
    name: "Conconi em bicicleta ergométrica",
    category: "bicicleta",
    environment: "bicicleta",
    estimates: ["ponto_deflexao_fc", "limiar_estimado", "potencia"],
    description: "Adaptação incremental para bicicleta; relaciona FC com potência real ou escala do equipamento.",
    population: "Alunos aptos a teste incremental em bicicleta ergométrica.",
    equipment: ["Bicicleta ergométrica", "Monitor cardíaco"],
    contraindications: GENERAL_INTERRUPTION,
    fields: [],
    stageDefaults: {
      initialPowerWatts: 80,
      powerIncrementWatts: 20,
      targetCadenceRpm: 80,
      stageDurationSec: 60,
      warmupMinutes: 8,
      heartRateCaptureMode: "manual",
    },
    formula: "Detecção local por regressão linear segmentada FC x watts; quando não houver watts, usa escala do próprio equipamento e limita comparação.",
    reference: "Conconi F et al. J Appl Physiol. 1982; revisão de HRDP: Bodner ME, Rhodes EC. Sports Med. 2000.",
    referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/10907756/",
    limitations: [
      "Watts reais não são equivalentes a nível genérico de resistência.",
      "Comparações devem preservar equipamento, progressão e unidade.",
    ],
  },
  {
    id: "custom-cardio",
    version: "custom-cardio.v1",
    formulaVersion: "manual-result.v1",
    name: "Protocolo cardiorrespiratório personalizado",
    category: "personalizado",
    environment: "outro",
    estimates: ["outro"],
    description: "Protocolo definido pelo profissional. Não recebe classificação científica automática.",
    population: "Definida pelo profissional.",
    equipment: [],
    contraindications: GENERAL_INTERRUPTION,
    fields: [
      { id: "distanceMeters", label: "Distância", unit: "m", min: 0, max: 100000, help: "Resultado bruto opcional." },
      { id: "timeMinutes", label: "Tempo", unit: "min", min: 0, max: 300, help: "Resultado bruto opcional." },
    ],
    reference: "Protocolo personalizado; referência opcional do profissional.",
    limitations: ["Sem classificação ou fórmula automática validada pelo app."],
  },
];

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getCardioProtocolDefinition(protocolId?: CardioProtocolId) {
  return CARDIO_PROTOCOL_CATALOG.find((protocol) => protocol.id === protocolId);
}

export function createCardioExecution(protocolId: CardioProtocolId, order: number): CardioTestExecution {
  const protocol = getCardioProtocolDefinition(protocolId);
  if (!protocol) throw new Error("Protocolo cardiorrespiratório não encontrado.");
  const now = new Date().toISOString();
  return {
    id: createId("cardio"),
    protocolId,
    protocolVersion: protocol.version,
    status: "rascunho",
    order,
    config: {
      protocolName: protocol.name,
      ...(protocol.stageDefaults ?? {}),
    },
    external: {},
    stages: [],
    heartRateSamples: [],
    recovery: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function parseCardioDecimal(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function generateCardioStages(protocolId: CardioProtocolId, config: CardioTestConfig, count: number) {
  const stages: CardioStage[] = [];
  for (let index = 0; index < count; index += 1) {
    stages.push({
      id: createId("stage"),
      stageNumber: index + 1,
      durationSec: config.stageDurationSec ?? 60,
      inclinePercent: protocolId === "conconi-treadmill" ? config.inclinePercent ?? 1 : undefined,
      speedKmh:
        protocolId === "conconi-treadmill"
          ? round((config.initialSpeedKmh ?? 8) + index * (config.speedIncrementKmh ?? 0.5), 2)
          : undefined,
      powerWatts:
        protocolId === "conconi-bike" && typeof config.initialPowerWatts === "number"
          ? round(config.initialPowerWatts + index * (config.powerIncrementWatts ?? 20), 1)
          : undefined,
      resistanceLevel:
        protocolId === "conconi-bike" && typeof config.initialPowerWatts !== "number" && typeof config.initialResistanceLevel === "number"
          ? round(config.initialResistanceLevel + index * (config.resistanceIncrement ?? 1), 1)
          : undefined,
      cadenceRpm: protocolId === "conconi-bike" ? config.targetCadenceRpm : undefined,
      valid: true,
    });
  }
  return stages;
}

function linearRegression(points: { x: number; y: number }[]): RegressionLine {
  const n = points.length;
  const sumX = points.reduce((sum, point) => sum + point.x, 0);
  const sumY = points.reduce((sum, point) => sum + point.y, 0);
  const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0);
  const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0);
  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const sse = points.reduce((sum, point) => {
    const predicted = slope * point.x + intercept;
    return sum + (point.y - predicted) ** 2;
  }, 0);
  const sst = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  return {
    slope,
    intercept,
    sse,
    r2: sst === 0 ? 1 : 1 - sse / sst,
  };
}

function getStageLoad(protocol: CardioProtocolDefinition, stage: CardioStage) {
  if (protocol.environment === "esteira") return { value: stage.speedKmh, unit: "km/h" as const };
  if (protocol.environment === "bicicleta") {
    if (typeof stage.powerWatts === "number") return { value: stage.powerWatts, unit: "w" as const };
    return { value: stage.resistanceLevel, unit: "nivel" as const };
  }
  return { value: undefined, unit: "km/h" as const };
}

export function detectConconiDeflection(protocol: CardioProtocolDefinition, stages: CardioStage[], status: CardioExecutionStatus): ConconiDetection {
  if (status === "interrompido") {
    return {
      status: "teste_interrompido",
      quality: "insuficiente",
      method: "regressao-linear-segmentada.v1",
      message: "Teste interrompido; não apresentar limiar como resultado válido.",
    };
  }

  const points = stages
    .filter((stage) => stage.valid !== false)
    .map((stage) => {
      const load = getStageLoad(protocol, stage);
      const heartRate = stage.heartRateEnd ?? stage.heartRateAvg;
      return typeof load.value === "number" && typeof heartRate === "number"
        ? { stage, x: load.value, y: heartRate, unit: load.unit }
        : undefined;
    })
    .filter((point): point is { stage: CardioStage; x: number; y: number; unit: "km/h" | "w" | "nivel" } => !!point)
    .sort((a, b) => a.stage.stageNumber - b.stage.stageNumber);

  if (points.length < 6) {
    return {
      status: "dados_insuficientes",
      quality: "insuficiente",
      method: "regressao-linear-segmentada.v1",
      message: "São necessários pelo menos 6 estágios válidos com carga e frequência cardíaca.",
    };
  }

  const single = linearRegression(points.map(({ x, y }) => ({ x, y })));
  let best:
    | {
        index: number;
        sse: number;
        before: RegressionLine;
        after: RegressionLine;
      }
    | undefined;

  for (let index = 2; index <= points.length - 3; index += 1) {
    const before = linearRegression(points.slice(0, index + 1).map(({ x, y }) => ({ x, y })));
    const after = linearRegression(points.slice(index).map(({ x, y }) => ({ x, y })));
    const sse = before.sse + after.sse;
    if (!best || sse < best.sse) best = { index, sse, before, after };
  }

  if (!best || single.sse <= 0) {
    return {
      status: "inconclusivo",
      quality: "baixa",
      method: "regressao-linear-segmentada.v1",
      singleLineR2: round(single.r2, 3),
      message: "Não foi possível identificar um ponto de deflexão confiável neste teste.",
    };
  }

  const improvementRatio = (single.sse - best.sse) / single.sse;
  const slopeDrop = best.before.slope > 0 ? (best.before.slope - best.after.slope) / best.before.slope : 0;
  const totalSst = points.reduce((sum, point) => sum + (point.y - points.reduce((inner, p) => inner + p.y, 0) / points.length) ** 2, 0);
  const piecewiseR2 = totalSst === 0 ? 1 : 1 - best.sse / totalSst;
  const selected = points[best.index];

  let detectionStatus: ConconiDetectionStatus = "inconclusivo";
  let quality: ConconiDetection["quality"] = "baixa";
  if (improvementRatio >= 0.35 && slopeDrop >= 0.15 && best.after.slope > -3) {
    detectionStatus = "deflexao_identificada";
    quality = "alta";
  } else if (improvementRatio >= 0.2 && slopeDrop >= 0.08) {
    detectionStatus = "deflexao_possivel";
    quality = "moderada";
  }

  return {
    status: detectionStatus,
    stageId: detectionStatus === "inconclusivo" ? undefined : selected.stage.id,
    stageNumber: detectionStatus === "inconclusivo" ? undefined : selected.stage.stageNumber,
    heartRateBpm: detectionStatus === "inconclusivo" ? undefined : selected.y,
    loadValue: detectionStatus === "inconclusivo" ? undefined : selected.x,
    loadUnit: selected.unit,
    quality,
    method:
      "Regressão linear segmentada: compara uma reta única com duas retas e exige melhora de ajuste e redução de inclinação para aceitar deflexão.",
    singleLineR2: round(single.r2, 3),
    piecewiseR2: round(piecewiseR2, 3),
    improvementRatio: round(improvementRatio, 3),
    slopeBefore: round(best.before.slope, 3),
    slopeAfter: round(best.after.slope, 3),
    message:
      detectionStatus === "inconclusivo"
        ? "Não foi possível identificar um ponto de deflexão confiável neste teste."
        : detectionStatus === "deflexao_possivel"
          ? "Deflexão possível. Recomenda-se revisão profissional antes de usar para zonas."
          : "Deflexão identificada pelo método automático, com revisão profissional recomendada.",
  };
}

function calculateExternalVo2(
  execution: CardioTestExecution,
  ageYears?: number,
  sex?: CardioSex,
  weightKg?: number
) {
  const external = execution.external ?? {};
  if (execution.protocolId === "cooper-12min" && typeof external.distanceMeters === "number") {
    return round((external.distanceMeters - 504.9) / 44.73, 1);
  }
  if (execution.protocolId === "run-2400m" && typeof external.timeMinutes === "number" && external.timeMinutes > 0) {
    return round(483 / external.timeMinutes + 3.5, 1);
  }
  if (
    execution.protocolId === "rockport-1mile" &&
    typeof external.timeMinutes === "number" &&
    typeof external.heartRateEnd === "number" &&
    typeof ageYears === "number" &&
    sex &&
    typeof weightKg === "number"
  ) {
    const weightLb = weightKg * 2.20462;
    const sexFactor = sex === "male" ? 1 : 0;
    return round(
      132.853 -
        0.0769 * weightLb -
        0.3877 * ageYears +
        6.315 * sexFactor -
        3.2649 * external.timeMinutes -
        0.1565 * external.heartRateEnd,
      1
    );
  }
  return undefined;
}

function validateExternal(protocol: CardioProtocolDefinition, execution: CardioTestExecution, errors: string[], warnings: string[]) {
  const external = execution.external ?? {};
  protocol.fields.forEach((field) => {
    const value = external[field.id as keyof CardioExternalResults];
    if (field.required && typeof value !== "number") errors.push(`${field.label} é obrigatório.`);
    if (typeof value === "number") {
      if (typeof field.min === "number" && value < field.min) errors.push(`${field.label} abaixo do limite mínimo.`);
      if (typeof field.max === "number" && value > field.max) warnings.push(`${field.label} fora da faixa esperada; confira.`);
    }
  });
}

function comparePrevious(current: CardioProtocolSnapshot, previous?: CardioProtocolSnapshot): CardioProtocolSnapshot["comparison"] {
  if (!previous) return undefined;
  const currentValue = current.primaryResult?.value;
  const previousValue = previous.primaryResult?.value;
  if (typeof currentValue !== "number" || typeof previousValue !== "number") return undefined;

  const compatible =
    current.protocolId === previous.protocolId &&
    current.protocolVersion === previous.protocolVersion &&
    current.environment === previous.environment &&
    current.primaryResult?.unit === previous.primaryResult?.unit;

  if (!compatible) {
    return {
      comparable: false,
      message: "Protocolos, ambientes ou unidades diferentes; comparação possui limitações.",
      previousValue,
    };
  }

  return {
    comparable: true,
    message: "Comparação direta com mesmo protocolo, versão, ambiente e unidade.",
    previousValue,
    delta: round(currentValue - previousValue, 1),
  };
}

export function calculateCardioProtocolSnapshot(
  execution: CardioTestExecution,
  context: { ageYears?: number; sex?: CardioSex; weightKg?: number } = {},
  previous?: CardioProtocolSnapshot
): CardioProtocolSnapshot {
  const protocol = getCardioProtocolDefinition(execution.protocolId);
  if (!protocol) throw new Error("Protocolo cardiorrespiratório não encontrado.");

  const errors: string[] = [];
  const warnings: string[] = [];
  const validStages = execution.stages.filter((stage) => stage.valid !== false);
  const maxHeartRateObserved = Math.max(
    0,
    ...validStages
      .flatMap((stage) => [stage.heartRateMax, stage.heartRateEnd, stage.heartRateAvg])
      .filter((value): value is number => typeof value === "number")
  );
  const maxLoadObserved = Math.max(
    0,
    ...validStages
      .map((stage) => getStageLoad(protocol, stage).value)
      .filter((value): value is number => typeof value === "number")
  );
  const durationTotalSec = validStages.reduce((sum, stage) => sum + (stage.durationSec ?? 0), 0);

  if (execution.status === "interrompido") warnings.push("Teste interrompido: salvar como incompleto e não apresentar como resultado válido.");
  if (execution.config.heartRateCaptureMode === "sensor" && execution.heartRateSamples.length === 0) {
    warnings.push("Modo sensor selecionado, mas sem amostras registradas. Use entrada manual como alternativa.");
  }

  let vo2MaxEstimate: number | undefined;
  let conconi: ConconiDetection | undefined;
  let primaryResult: CardioProtocolSnapshot["primaryResult"];
  const graphPoints = validStages
    .map((stage) => {
      const load = getStageLoad(protocol, stage);
      const hr = stage.heartRateEnd ?? stage.heartRateAvg;
      return typeof load.value === "number" && typeof hr === "number"
        ? {
            x: load.value,
            y: hr,
            stageNumber: stage.stageNumber,
            valid: stage.valid !== false,
            label: `Estágio ${stage.stageNumber}`,
          }
        : undefined;
    })
    .filter((point): point is { x: number; y: number; stageNumber: number; valid: boolean; label: string } => !!point);

  if (protocol.environment === "externo" || execution.protocolId === "custom-cardio") {
    validateExternal(protocol, execution, errors, warnings);
    if (
      execution.protocolId === "rockport-1mile" &&
      typeof execution.external?.timeMinutes === "number" &&
      typeof execution.external?.heartRateEnd === "number"
    ) {
      if (typeof context.ageYears !== "number") errors.push("Idade do aluno é obrigatória para calcular Rockport.");
      if (typeof context.weightKg !== "number") errors.push("Peso do aluno é obrigatório para calcular Rockport.");
      if (!context.sex) errors.push("Sexo biológico é obrigatório para calcular Rockport.");
    }
    vo2MaxEstimate = calculateExternalVo2(execution, context.ageYears, context.sex, context.weightKg);
    if (typeof vo2MaxEstimate === "number") {
      primaryResult = { label: "VO₂máx estimado", value: vo2MaxEstimate, unit: "ml/kg/min", type: "vo2max" };
    } else if (execution.protocolId === "six-minute-walk" && typeof execution.external?.distanceMeters === "number") {
      primaryResult = { label: "Distância em 6 min", value: execution.external.distanceMeters, unit: "m", type: "capacidade_cardiorrespiratoria" };
    } else if (typeof execution.external?.distanceMeters === "number") {
      primaryResult = { label: "Distância", value: execution.external.distanceMeters, unit: "m", type: "desempenho" };
    } else if (typeof execution.external?.timeMinutes === "number") {
      primaryResult = { label: "Tempo", value: execution.external.timeMinutes, unit: "min", type: "desempenho" };
    }
  }

  if (execution.protocolId === "conconi-treadmill" || execution.protocolId === "conconi-bike") {
    if (validStages.length < 6) warnings.push("Conconi requer pelo menos 6 estágios válidos para análise automática.");
    conconi = detectConconiDeflection(protocol, execution.stages, execution.status);
    if (conconi.status === "deflexao_identificada" || conconi.status === "deflexao_possivel") {
      primaryResult = {
        label: protocol.environment === "esteira" ? "Velocidade no ponto de deflexão" : conconi.loadUnit === "w" ? "Potência no ponto de deflexão" : "Carga no ponto de deflexão",
        value: conconi.loadValue,
        unit: conconi.loadUnit,
        type: "ponto_deflexao_fc",
      };
    }
  }

  const recoveryDrop1Min =
    typeof execution.recovery?.immediateBpm === "number" && typeof execution.recovery?.after1MinBpm === "number"
      ? round(execution.recovery.immediateBpm - execution.recovery.after1MinBpm, 1)
      : undefined;

  const snapshot: CardioProtocolSnapshot = {
    protocolId: protocol.id,
    protocolName: protocol.name,
    protocolVersion: protocol.version,
    formulaVersion: protocol.formulaVersion,
    environment: protocol.environment,
    estimates: protocol.estimates,
    calculatedAt: new Date().toISOString(),
    status: execution.status,
    config: execution.config,
    external: execution.external,
    stages: execution.stages,
    heartRateSamples: execution.heartRateSamples,
    recovery: execution.recovery,
    graphPoints,
    primaryResult,
    vo2MaxEstimate,
    conconi,
    recoveryDrop1Min,
    maxHeartRateObserved: maxHeartRateObserved || undefined,
    maxLoadObserved: maxLoadObserved || undefined,
    durationTotalSec,
    validation: {
      isSavable: errors.length === 0,
      errors,
      warnings,
    },
    reference: protocol.reference,
    limitations: protocol.limitations,
  };

  snapshot.comparison = comparePrevious(snapshot, previous);
  return snapshot;
}
