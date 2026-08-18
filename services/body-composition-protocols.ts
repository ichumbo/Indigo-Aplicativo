export type CompositionSex = "male" | "female";

export type BodyCompositionProtocolId =
  | "jackson-pollock-3"
  | "jackson-pollock-7"
  | "guedes-3"
  | "faulkner-4"
  | "weltman-obesity"
  | "bioimpedance";

export type SkinfoldSite =
  | "chest"
  | "midaxillary"
  | "triceps"
  | "subscapular"
  | "abdominal"
  | "suprailiac"
  | "thigh";

export type GirthSite = "abdomenMeanCm";
export type BioimpedanceField =
  | "manufacturer"
  | "model"
  | "measuredAt"
  | "bodyFatPercent"
  | "fatMassKg"
  | "leanMassKg"
  | "muscleMassKg"
  | "totalBodyWaterLiters"
  | "visceralFat"
  | "boneMassKg"
  | "basalMetabolicRateKcal"
  | "metabolicAge"
  | "otherIndicators"
  | "preparationNotes";

export type ProtocolFieldId = SkinfoldSite | GirthSite | BioimpedanceField;

export type ProtocolFieldKind = "skinfold" | "girth" | "bioimpedance";
export type ProtocolResultKey =
  | "bodyFatPercent"
  | "bodyDensity"
  | "bmi"
  | "fatMassKg"
  | "leanMassKg"
  | "targetWeightKg"
  | "fatMassToChangeKg";

export type ProtocolFieldDefinition = {
  id: ProtocolFieldId;
  kind: ProtocolFieldKind;
  label: string;
  unit?: "mm" | "cm" | "kg" | "%" | "kcal" | "anos" | "L" | "texto" | "data";
  required: boolean;
  repeatable?: boolean;
  min?: number;
  max?: number;
  suspiciousMin?: number;
  suspiciousMax?: number;
  instruction: string;
};

export type ProtocolApplicability = {
  disabled: boolean;
  reasons: string[];
  warnings: string[];
};

export type ProtocolSexSpec = {
  fields: ProtocolFieldId[];
  ageRange?: { min: number; max: number };
  equation: string;
  notes?: string;
};

export type BodyCompositionProtocolDefinition = {
  id: BodyCompositionProtocolId;
  displayName: string;
  shortName: string;
  author: string;
  reference: string;
  referenceUrl?: string;
  version: string;
  formulaVersion: string;
  description: string;
  population: string;
  limitations: string[];
  sexes: CompositionSex[];
  measuresSummary: string;
  results: ProtocolResultKey[];
  conversion?: {
    id: "siri-1961";
    equation: string;
    reference: string;
    referenceUrl?: string;
  };
  sexSpecs: Partial<Record<CompositionSex, ProtocolSexSpec>>;
};

export type SkinfoldAttempt = {
  valueMm?: number;
  invalid?: boolean;
};

export type SkinfoldProtocolMeasurement = {
  attempts?: SkinfoldAttempt[];
  consolidatedMm?: number;
  notes?: string;
};

export type BioimpedanceMeasurement = {
  manufacturer?: string;
  model?: string;
  measuredAt?: string;
  bodyFatPercent?: number;
  fatMassKg?: number;
  leanMassKg?: number;
  muscleMassKg?: number;
  totalBodyWaterLiters?: number;
  visceralFat?: number;
  boneMassKg?: number;
  basalMetabolicRateKcal?: number;
  metabolicAge?: number;
  otherIndicators?: string;
  preparationNotes?: string;
};

export type CompositionProtocolMeasurements = {
  skinfolds?: Partial<Record<SkinfoldSite, SkinfoldProtocolMeasurement>>;
  girthsCm?: Partial<Record<GirthSite, number>>;
  bioimpedance?: BioimpedanceMeasurement;
};

export type CompositionProtocolInput = {
  protocolId?: BodyCompositionProtocolId;
  sex: CompositionSex;
  ageYears?: number;
  weightKg?: number;
  heightCm?: number;
  targetBodyFatPercent?: number;
  assessedAt?: string;
  measurements?: CompositionProtocolMeasurements;
};

export type ConsolidatedMeasurement = {
  fieldId: ProtocolFieldId;
  label: string;
  unit?: ProtocolFieldDefinition["unit"];
  value?: number | string;
  attempts?: SkinfoldAttempt[];
  consolidation?: "media-aritmetica" | "valor-consolidado" | "entrada-manual-equipamento";
  spread?: number;
  validAttempts?: number;
};

export type ProtocolValidation = {
  isCalculable: boolean;
  errors: string[];
  warnings: string[];
};

export type ProtocolIntermediateResults = {
  skinfoldSumMm?: number;
  bodyDensity?: number;
  densityConversion?: string;
  rawBodyFatPercent?: number;
  equationApplied?: string;
};

export type ProtocolDerivedResults = {
  bodyFatPercent?: number;
  bodyFatClassification?: string;
  bodyFatClassificationVersion?: string;
  bmi?: number;
  bmiClassification?: string;
  bmiClassificationVersion?: string;
  fatMassKg?: number;
  leanMassKg?: number;
  targetBodyFatPercent?: number;
  targetWeightKg?: number;
  targetFatMassKg?: number;
  fatMassToChangeKg?: number;
  differenceFromPrevious?: {
    comparable: boolean;
    message: string;
    previousProtocolId?: BodyCompositionProtocolId;
    previousBodyFatPercent?: number;
    bodyFatPercentDelta?: number;
    fatMassKgDelta?: number;
  };
};

export type BodyCompositionProtocolSnapshot = {
  protocolId?: BodyCompositionProtocolId;
  protocolName?: string;
  protocolVersion?: string;
  formulaVersion?: string;
  formulaReference?: string;
  formulaReferenceUrl?: string;
  sex: CompositionSex;
  ageYears?: number;
  assessedAt?: string;
  calculatedAt: string;
  requiredFields: ProtocolFieldDefinition[];
  consolidatedMeasurements: ConsolidatedMeasurement[];
  intermediate: ProtocolIntermediateResults;
  results: ProtocolDerivedResults;
  validation: ProtocolValidation;
  details: string[];
};

export const SKINFOLD_SITE_LABELS: Record<SkinfoldSite, string> = {
  chest: "Peitoral",
  midaxillary: "Axilar média",
  triceps: "Tríceps",
  subscapular: "Subescapular",
  abdominal: "Abdominal",
  suprailiac: "Supra-ilíaca",
  thigh: "Coxa",
};

export const GIRTH_SITE_LABELS: Record<GirthSite, string> = {
  abdomenMeanCm: "Circunferência abdominal média",
};

const FIELD_LIBRARY: Record<ProtocolFieldId, Omit<ProtocolFieldDefinition, "required">> = {
  chest: {
    id: "chest",
    kind: "skinfold",
    label: SKINFOLD_SITE_LABELS.chest,
    unit: "mm",
    repeatable: true,
    min: 1,
    max: 100,
    suspiciousMax: 60,
    instruction: "Dobra diagonal no ponto peitoral usado pelo protocolo selecionado.",
  },
  midaxillary: {
    id: "midaxillary",
    kind: "skinfold",
    label: SKINFOLD_SITE_LABELS.midaxillary,
    unit: "mm",
    repeatable: true,
    min: 1,
    max: 100,
    suspiciousMax: 60,
    instruction: "Dobra vertical na linha axilar média, conforme padronização do protocolo de sete dobras.",
  },
  triceps: {
    id: "triceps",
    kind: "skinfold",
    label: SKINFOLD_SITE_LABELS.triceps,
    unit: "mm",
    repeatable: true,
    min: 1,
    max: 100,
    suspiciousMax: 60,
    instruction: "Dobra vertical no ponto médio entre acrômio e olécrano, face posterior do braço.",
  },
  subscapular: {
    id: "subscapular",
    kind: "skinfold",
    label: SKINFOLD_SITE_LABELS.subscapular,
    unit: "mm",
    repeatable: true,
    min: 1,
    max: 100,
    suspiciousMax: 60,
    instruction: "Dobra diagonal logo abaixo do ângulo inferior da escápula.",
  },
  abdominal: {
    id: "abdominal",
    kind: "skinfold",
    label: SKINFOLD_SITE_LABELS.abdominal,
    unit: "mm",
    repeatable: true,
    min: 1,
    max: 100,
    suspiciousMax: 70,
    instruction: "Dobra abdominal próxima ao umbigo, seguindo a referência do protocolo aplicado.",
  },
  suprailiac: {
    id: "suprailiac",
    kind: "skinfold",
    label: SKINFOLD_SITE_LABELS.suprailiac,
    unit: "mm",
    repeatable: true,
    min: 1,
    max: 100,
    suspiciousMax: 60,
    instruction: "Dobra oblíqua acima da crista ilíaca, na linha natural da pele.",
  },
  thigh: {
    id: "thigh",
    kind: "skinfold",
    label: SKINFOLD_SITE_LABELS.thigh,
    unit: "mm",
    repeatable: true,
    min: 1,
    max: 100,
    suspiciousMax: 70,
    instruction: "Dobra vertical na face anterior da coxa, no ponto médio entre prega inguinal e patela.",
  },
  abdomenMeanCm: {
    id: "abdomenMeanCm",
    kind: "girth",
    label: GIRTH_SITE_LABELS.abdomenMeanCm,
    unit: "cm",
    min: 40,
    max: 250,
    suspiciousMin: 55,
    suspiciousMax: 180,
    instruction: "Média de duas medidas abdominais em centímetros; usada por Weltman em população com obesidade.",
  },
  manufacturer: {
    id: "manufacturer",
    kind: "bioimpedance",
    label: "Fabricante",
    unit: "texto",
    instruction: "Nome do fabricante informado pelo equipamento de bioimpedância.",
  },
  model: {
    id: "model",
    kind: "bioimpedance",
    label: "Modelo",
    unit: "texto",
    instruction: "Modelo do equipamento de bioimpedância.",
  },
  measuredAt: {
    id: "measuredAt",
    kind: "bioimpedance",
    label: "Data e horário",
    unit: "data",
    instruction: "Data e horário da medição emitida pelo equipamento.",
  },
  bodyFatPercent: {
    id: "bodyFatPercent",
    kind: "bioimpedance",
    label: "Percentual de gordura",
    unit: "%",
    min: 1,
    max: 80,
    suspiciousMax: 65,
    instruction: "Resultado de percentual de gordura fornecido pelo equipamento.",
  },
  fatMassKg: {
    id: "fatMassKg",
    kind: "bioimpedance",
    label: "Massa de gordura",
    unit: "kg",
    min: 0,
    max: 250,
    instruction: "Massa de gordura fornecida pelo equipamento.",
  },
  leanMassKg: {
    id: "leanMassKg",
    kind: "bioimpedance",
    label: "Massa livre de gordura",
    unit: "kg",
    min: 0,
    max: 250,
    instruction: "Massa livre de gordura fornecida pelo equipamento.",
  },
  muscleMassKg: {
    id: "muscleMassKg",
    kind: "bioimpedance",
    label: "Massa muscular",
    unit: "kg",
    min: 0,
    max: 200,
    instruction: "Massa muscular indicada pelo equipamento, quando disponível.",
  },
  totalBodyWaterLiters: {
    id: "totalBodyWaterLiters",
    kind: "bioimpedance",
    label: "Água corporal",
    unit: "L",
    min: 0,
    max: 120,
    instruction: "Água corporal total indicada pelo equipamento, quando disponível.",
  },
  visceralFat: {
    id: "visceralFat",
    kind: "bioimpedance",
    label: "Gordura visceral",
    min: 0,
    max: 100,
    instruction: "Indicador de gordura visceral do equipamento; escala varia conforme fabricante.",
  },
  boneMassKg: {
    id: "boneMassKg",
    kind: "bioimpedance",
    label: "Massa óssea",
    unit: "kg",
    min: 0,
    max: 30,
    instruction: "Massa óssea estimada pelo equipamento, quando disponível.",
  },
  basalMetabolicRateKcal: {
    id: "basalMetabolicRateKcal",
    kind: "bioimpedance",
    label: "Taxa metabólica basal",
    unit: "kcal",
    min: 500,
    max: 5000,
    instruction: "Taxa metabólica basal estimada pelo equipamento.",
  },
  metabolicAge: {
    id: "metabolicAge",
    kind: "bioimpedance",
    label: "Idade metabólica",
    unit: "anos",
    min: 1,
    max: 120,
    instruction: "Idade metabólica informada pelo equipamento, quando disponível.",
  },
  otherIndicators: {
    id: "otherIndicators",
    kind: "bioimpedance",
    label: "Outros indicadores",
    unit: "texto",
    instruction: "Campos adicionais do relatório do equipamento.",
  },
  preparationNotes: {
    id: "preparationNotes",
    kind: "bioimpedance",
    label: "Observações sobre preparo",
    unit: "texto",
    instruction: "Jejum, hidratação, treino prévio, horário e outras condições do exame.",
  },
};

const SIRI_CONVERSION = {
  id: "siri-1961" as const,
  equation: "%G = (495 / densidade corporal) - 450",
  reference: "Siri WE. Body composition from fluid spaces and density: analysis of methods. 1961.",
  referenceUrl: "https://www.ncbi.nlm.nih.gov/books/NBK235961/",
};

export const PROTOCOL_CATALOG: BodyCompositionProtocolDefinition[] = [
  {
    id: "jackson-pollock-3",
    displayName: "Jackson & Pollock — 3 dobras",
    shortName: "JP 3 dobras",
    author: "Jackson, Pollock; Jackson, Pollock & Ward",
    reference:
      "Jackson AS, Pollock ML. Generalized equations for predicting body density of men. Br J Nutr. 1978; Jackson AS, Pollock ML, Ward A. Generalized equations for predicting body density of women. Med Sci Sports Exerc. 1980.",
    referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/718832/",
    version: "1978-1980.jp3.v1",
    formulaVersion: "jp3-sex-specific-density-siri.v1",
    description: "Estima densidade corporal por três dobras específicas por sexo e converte para percentual de gordura.",
    population: "Homens 18-61 anos; mulheres 18-55 anos, conforme equações generalizadas originais.",
    limitations: [
      "Não usa os mesmos pontos anatômicos para homens e mulheres.",
      "Acurácia depende de técnica e adipômetro; não é diagnóstico médico.",
    ],
    sexes: ["male", "female"],
    measuresSummary: "3 dobras cutâneas + idade",
    results: ["bodyDensity", "bodyFatPercent", "bmi", "fatMassKg", "leanMassKg"],
    conversion: SIRI_CONVERSION,
    sexSpecs: {
      male: {
        fields: ["chest", "abdominal", "thigh"],
        ageRange: { min: 18, max: 61 },
        equation: "D = 1.10938 - 0.0008267*S + 0.0000016*S² - 0.0002574*idade",
      },
      female: {
        fields: ["triceps", "suprailiac", "thigh"],
        ageRange: { min: 18, max: 55 },
        equation: "D = 1.0994921 - 0.0009929*S + 0.0000023*S² - 0.0001392*idade",
      },
    },
  },
  {
    id: "jackson-pollock-7",
    displayName: "Jackson & Pollock — 7 dobras",
    shortName: "JP 7 dobras",
    author: "Jackson, Pollock; Jackson, Pollock & Ward",
    reference:
      "Jackson AS, Pollock ML. Br J Nutr. 1978; Jackson AS, Pollock ML, Ward A. Med Sci Sports Exerc. 1980.",
    referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/718832/",
    version: "1978-1980.jp7.v1",
    formulaVersion: "jp7-sex-specific-density-siri.v1",
    description: "Estima densidade corporal com sete dobras e idade, usando coeficientes separados por sexo.",
    population: "Homens 18-61 anos; mulheres 18-55 anos.",
    limitations: [
      "Mais completo que a versão de 3 dobras, mas ainda dependente da técnica de medida.",
      "Não deve ser comparado diretamente com protocolos de perímetros ou bioimpedância.",
    ],
    sexes: ["male", "female"],
    measuresSummary: "7 dobras cutâneas + idade",
    results: ["bodyDensity", "bodyFatPercent", "bmi", "fatMassKg", "leanMassKg"],
    conversion: SIRI_CONVERSION,
    sexSpecs: {
      male: {
        fields: ["chest", "midaxillary", "triceps", "subscapular", "abdominal", "suprailiac", "thigh"],
        ageRange: { min: 18, max: 61 },
        equation: "D = 1.112 - 0.00043499*S + 0.00000055*S² - 0.00028826*idade",
      },
      female: {
        fields: ["chest", "midaxillary", "triceps", "subscapular", "abdominal", "suprailiac", "thigh"],
        ageRange: { min: 18, max: 55 },
        equation: "D = 1.097 - 0.00046971*S + 0.00000056*S² - 0.00012828*idade",
      },
    },
  },
  {
    id: "guedes-3",
    displayName: "Guedes — 3 dobras",
    shortName: "Guedes",
    author: "Guedes",
    reference:
      "Guedes DP. Estudo da gordura corporal através da mensuração dos valores de densidade corporal e espessura de dobras cutâneas em universitários. Dissertação, UFSM, 1985.",
    referenceUrl: "https://search.r-project.org/CRAN/refmans/bodycomp/html/Guedes.3sites.html",
    version: "1985.guedes3.v1",
    formulaVersion: "guedes3-sex-specific-density-siri.v1",
    description: "Equação brasileira de três dobras para universitários, com pontos diferentes por sexo.",
    population: "Universitários brasileiros, homens e mulheres de 18 a 30 anos.",
    limitations: [
      "População original restrita a universitários jovens.",
      "Não extrapolar para idosos, adolescentes, gestantes ou atletas sem critério profissional.",
    ],
    sexes: ["male", "female"],
    measuresSummary: "3 dobras cutâneas + conversão Siri",
    results: ["bodyDensity", "bodyFatPercent", "bmi", "fatMassKg", "leanMassKg"],
    conversion: SIRI_CONVERSION,
    sexSpecs: {
      male: {
        fields: ["triceps", "suprailiac", "abdominal"],
        ageRange: { min: 18, max: 30 },
        equation: "D = 1.17136 - 0.06706*log10(TR + SI + AB)",
      },
      female: {
        fields: ["subscapular", "suprailiac", "thigh"],
        ageRange: { min: 18, max: 30 },
        equation: "D = 1.16650 - 0.07063*log10(SB + SI + CX)",
      },
    },
  },
  {
    id: "faulkner-4",
    displayName: "Faulkner — 4 dobras",
    shortName: "Faulkner",
    author: "Faulkner",
    reference: "Faulkner JA. Physiology of swimming and diving. 1968; equação difundida em atletas aquáticos.",
    referenceUrl: "https://revistas.rcaap.pt/motricidade/article/download/15557/15229/75206",
    version: "1968.faulkner4.v1",
    formulaVersion: "faulkner4-direct-body-fat.v1",
    description: "Calcula diretamente o percentual de gordura a partir da soma de quatro dobras.",
    population: "Protocolo usado historicamente em atletas aquáticos e populações esportivas.",
    limitations: [
      "Não calcula densidade corporal.",
      "Não possui versão masculina/feminina separada nesta equação implementada.",
    ],
    sexes: ["male", "female"],
    measuresSummary: "4 dobras cutâneas",
    results: ["bodyFatPercent", "bmi", "fatMassKg", "leanMassKg"],
    sexSpecs: {
      male: {
        fields: ["triceps", "subscapular", "suprailiac", "abdominal"],
        equation: "%G = 5.783 + 0.153*(TR + SB + SI + AB)",
      },
      female: {
        fields: ["triceps", "subscapular", "suprailiac", "abdominal"],
        equation: "%G = 5.783 + 0.153*(TR + SB + SI + AB)",
      },
    },
  },
  {
    id: "weltman-obesity",
    displayName: "Weltman — população com obesidade",
    shortName: "Weltman",
    author: "Weltman, Seip, Tran; Weltman, Levine, Seip, Tran",
    reference:
      "Weltman A, Seip RL, Tran ZV. Practical assessment of body composition in adult obese males. Human Biology. 1987; Weltman A, Levine S, Seip RL, Tran ZV. Accurate assessment of body composition in obese females. Am J Clin Nutr. 1988.",
    referenceUrl: "https://digitalcommons.wayne.edu/humbiol/vol59/iss3/12/",
    version: "1987-1988.weltman-obesity.v1",
    formulaVersion: "weltman-obesity-sex-specific-direct-body-fat.v1",
    description: "Usa circunferência abdominal média, peso e, para mulheres, altura. Não usa dobras cutâneas.",
    population: "Adultos com obesidade; homens no estudo de 1987 e mulheres com percentual de gordura elevado no estudo de 1988.",
    limitations: [
      "Estimativa de campo para população com obesidade; não representa diagnóstico.",
      "Não deve ser usada como equivalente direto a protocolos de dobras ou bioimpedância.",
    ],
    sexes: ["male", "female"],
    measuresSummary: "Circunferência abdominal média + peso; mulheres também usam altura",
    results: ["bodyFatPercent", "bmi", "fatMassKg", "leanMassKg"],
    sexSpecs: {
      male: {
        fields: ["abdomenMeanCm"],
        equation: "%G = 0.31457*abdomeMedio(cm) - 0.10969*peso(kg) + 10.8336",
      },
      female: {
        fields: ["abdomenMeanCm"],
        equation: "%G = 0.11077*abdomeMedio(cm) - 0.17666*altura(cm) + 0.14354*peso(kg) + 51.03301",
      },
    },
  },
  {
    id: "bioimpedance",
    displayName: "Bioimpedância",
    shortName: "Bioimpedância",
    author: "Equipamento de bioimpedância",
    reference:
      "Resultados dependem do fabricante/modelo e algoritmo proprietário do equipamento; o app não reproduz fórmula genérica.",
    version: "manual-device-entry.v1",
    formulaVersion: "transparent-derived-values.v1",
    description: "Entrada manual dos dados fornecidos pelo equipamento, com derivações matemáticas transparentes.",
    population: "Conforme manual e algoritmo do equipamento usado.",
    limitations: [
      "Não há fórmula genérica implementada pelo app.",
      "Hidratação, treino prévio, horário e preparo podem alterar resultados.",
    ],
    sexes: ["male", "female"],
    measuresSummary: "Dados do equipamento",
    results: ["bodyFatPercent", "bmi", "fatMassKg", "leanMassKg"],
    sexSpecs: {
      male: {
        fields: [
          "manufacturer",
          "model",
          "measuredAt",
          "bodyFatPercent",
          "fatMassKg",
          "leanMassKg",
          "muscleMassKg",
          "totalBodyWaterLiters",
          "visceralFat",
          "boneMassKg",
          "basalMetabolicRateKcal",
          "metabolicAge",
          "otherIndicators",
          "preparationNotes",
        ],
        equation: "Sem fórmula proprietária; %G informado pelo equipamento. Massa gorda/magra derivada só quando ausente.",
      },
      female: {
        fields: [
          "manufacturer",
          "model",
          "measuredAt",
          "bodyFatPercent",
          "fatMassKg",
          "leanMassKg",
          "muscleMassKg",
          "totalBodyWaterLiters",
          "visceralFat",
          "boneMassKg",
          "basalMetabolicRateKcal",
          "metabolicAge",
          "otherIndicators",
          "preparationNotes",
        ],
        equation: "Sem fórmula proprietária; %G informado pelo equipamento. Massa gorda/magra derivada só quando ausente.",
      },
    },
  },
];

const REQUIRED_BIO_FIELDS = new Set<ProtocolFieldId>(["bodyFatPercent"]);
const SKINFOLD_REMEASURE_TOLERANCE_MM = 2;
const BMI_CLASSIFICATION_VERSION = "cdc-adult-bmi-categories-2024.v1";
const BODY_FAT_CLASSIFICATION_VERSION = "not-configured.v1";

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getProtocol(protocolId?: BodyCompositionProtocolId) {
  return PROTOCOL_CATALOG.find((protocol) => protocol.id === protocolId);
}

export function getProtocolDefinition(protocolId?: BodyCompositionProtocolId) {
  return getProtocol(protocolId);
}

export function getProtocolFields(protocolId: BodyCompositionProtocolId | undefined, sex: CompositionSex) {
  const protocol = getProtocol(protocolId);
  if (!protocol) return [];
  const spec = protocol.sexSpecs[sex];
  if (!spec) return [];

  return spec.fields.map((id) => ({
    ...FIELD_LIBRARY[id],
    required: protocol.id === "bioimpedance" ? REQUIRED_BIO_FIELDS.has(id) : true,
  }));
}

export function parseDecimalInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function classifyAdultBmi(bmi?: number, ageYears?: number) {
  if (typeof bmi !== "number") return undefined;
  if (typeof ageYears === "number" && ageYears < 20) return "Tabela adulta não aplicada";
  if (bmi < 18.5) return "Baixo peso";
  if (bmi < 25) return "Eutrofia";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidade classe I";
  if (bmi < 40) return "Obesidade classe II";
  return "Obesidade classe III";
}

export function getProtocolApplicability(
  protocolId: BodyCompositionProtocolId,
  input: Pick<CompositionProtocolInput, "sex" | "ageYears" | "weightKg" | "heightCm">
): ProtocolApplicability {
  const protocol = getProtocol(protocolId);
  if (!protocol) return { disabled: true, reasons: ["Protocolo não encontrado."], warnings: [] };

  const reasons: string[] = [];
  const warnings: string[] = [];
  const spec = protocol.sexSpecs[input.sex];
  const bmi = input.weightKg && input.heightCm ? input.weightKg / (input.heightCm / 100) ** 2 : undefined;

  if (!spec || !protocol.sexes.includes(input.sex)) {
    reasons.push("Sexo biológico não contemplado pela equação selecionada.");
  }

  if (spec?.ageRange && typeof input.ageYears === "number") {
    if (input.ageYears < spec.ageRange.min || input.ageYears > spec.ageRange.max) {
      warnings.push(`Idade fora da faixa validada (${spec.ageRange.min}-${spec.ageRange.max} anos).`);
    }
  }

  if (spec?.ageRange && typeof input.ageYears !== "number") {
    warnings.push("Idade não informada; a aplicabilidade da faixa etária não pôde ser conferida.");
  }

  if (protocolId === "weltman-obesity") {
    if (typeof bmi === "number" && bmi < 30) {
      warnings.push("Weltman foi desenvolvido para população com obesidade; o IMC atual não sugere obesidade.");
    }
    if (typeof bmi !== "number") {
      warnings.push("Informe peso e altura para conferir aplicabilidade à população com obesidade.");
    }
  }

  return {
    disabled: reasons.length > 0,
    reasons,
    warnings,
  };
}

export function consolidateSkinfoldMeasurement(measurement?: SkinfoldProtocolMeasurement) {
  const attempts = measurement?.attempts?.slice(0, 3) ?? [];
  const valid = attempts
    .filter((attempt) => !attempt.invalid && typeof attempt.valueMm === "number" && Number.isFinite(attempt.valueMm))
    .map((attempt) => attempt.valueMm as number);

  if (typeof measurement?.consolidatedMm === "number" && Number.isFinite(measurement.consolidatedMm)) {
    const spread = valid.length >= 2 ? Math.max(...valid) - Math.min(...valid) : undefined;
    return {
      value: measurement.consolidatedMm,
      spread,
      validAttempts: valid.length,
      consolidation: "valor-consolidado" as const,
    };
  }

  if (valid.length === 0) return undefined;

  const spread = valid.length >= 2 ? Math.max(...valid) - Math.min(...valid) : undefined;
  return {
    value: round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 1),
    spread,
    validAttempts: valid.length,
    consolidation: "media-aritmetica" as const,
  };
}

function siriFromDensity(density: number) {
  return 495 / density - 450;
}

function getNumberField(input: CompositionProtocolInput, field: ProtocolFieldDefinition) {
  if (field.kind === "skinfold") {
    return consolidateSkinfoldMeasurement(input.measurements?.skinfolds?.[field.id as SkinfoldSite])?.value;
  }
  if (field.kind === "girth") {
    return input.measurements?.girthsCm?.[field.id as GirthSite];
  }
  if (field.kind === "bioimpedance") {
    const value = input.measurements?.bioimpedance?.[field.id as BioimpedanceField];
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

function validateNumericField(field: ProtocolFieldDefinition, value: unknown, errors: string[], warnings: string[]) {
  if (typeof value !== "number") {
    if (field.required) errors.push(`${field.label} é obrigatório.`);
    return;
  }

  if (!Number.isFinite(value)) {
    errors.push(`${field.label} inválido.`);
    return;
  }

  if (typeof field.min === "number" && value < field.min) errors.push(`${field.label} abaixo do limite mínimo (${field.min}).`);
  if (typeof field.max === "number" && value > field.max) errors.push(`${field.label} acima do limite máximo (${field.max}).`);
  if (typeof field.suspiciousMin === "number" && value < field.suspiciousMin) {
    warnings.push(`${field.label} parece baixo; confira a medida.`);
  }
  if (typeof field.suspiciousMax === "number" && value > field.suspiciousMax) {
    warnings.push(`${field.label} parece alto; confira a medida.`);
  }
}

function validateBase(input: CompositionProtocolInput, errors: string[], warnings: string[]) {
  if (input.protocolId !== "bioimpedance" && !input.ageYears) errors.push("Idade na data da avaliação é obrigatória para este protocolo.");
  if (!input.weightKg) errors.push("Peso é obrigatório.");
  if (!input.heightCm) errors.push("Altura é obrigatória.");

  if (typeof input.weightKg === "number") {
    if (input.weightKg <= 0) errors.push("Peso deve ser maior que zero.");
    if (input.weightKg < 25 || input.weightKg > 350) warnings.push("Peso fora da faixa usual; confira o valor.");
  }

  if (typeof input.heightCm === "number") {
    if (input.heightCm <= 0) errors.push("Altura deve ser maior que zero.");
    if (input.heightCm < 90 || input.heightCm > 230) warnings.push("Altura fora da faixa usual; confira o valor.");
  }

  if (typeof input.targetBodyFatPercent === "number") {
    if (input.targetBodyFatPercent <= 0 || input.targetBodyFatPercent >= 80) {
      warnings.push("Meta de gordura fora da faixa plausível; confira o valor.");
    }
  }
}

function getConsolidatedMeasurements(input: CompositionProtocolInput, fields: ProtocolFieldDefinition[]) {
  return fields.map<ConsolidatedMeasurement>((field) => {
    if (field.kind === "skinfold") {
      const measurement = input.measurements?.skinfolds?.[field.id as SkinfoldSite];
      const consolidated = consolidateSkinfoldMeasurement(measurement);
      return {
        fieldId: field.id,
        label: field.label,
        unit: field.unit,
        value: consolidated?.value,
        attempts: measurement?.attempts,
        consolidation: consolidated?.consolidation,
        spread: consolidated?.spread,
        validAttempts: consolidated?.validAttempts,
      };
    }

    if (field.kind === "girth") {
      return {
        fieldId: field.id,
        label: field.label,
        unit: field.unit,
        value: input.measurements?.girthsCm?.[field.id as GirthSite],
      };
    }

    const bioValue = input.measurements?.bioimpedance?.[field.id as BioimpedanceField];
    return {
      fieldId: field.id,
      label: field.label,
      unit: field.unit,
      value: bioValue,
      consolidation: field.id === "bodyFatPercent" ? "entrada-manual-equipamento" : undefined,
    };
  });
}

function comparePrevious(
  current: ProtocolDerivedResults,
  previous?: BodyCompositionProtocolSnapshot,
  protocolId?: BodyCompositionProtocolId
): ProtocolDerivedResults["differenceFromPrevious"] {
  if (!previous?.results.bodyFatPercent || !current.bodyFatPercent) return undefined;
  if (previous.protocolId !== protocolId) {
    return {
      comparable: false,
      message: `Avaliação anterior usa ${previous.protocolName ?? "outro protocolo"}; métodos não são diretamente equivalentes.`,
      previousProtocolId: previous.protocolId,
      previousBodyFatPercent: previous.results.bodyFatPercent,
    };
  }

  return {
    comparable: true,
    message: "Comparação direta: mesmo protocolo e versão salvos.",
    previousProtocolId: previous.protocolId,
    previousBodyFatPercent: previous.results.bodyFatPercent,
    bodyFatPercentDelta: round(current.bodyFatPercent - previous.results.bodyFatPercent, 1),
    fatMassKgDelta:
      typeof current.fatMassKg === "number" && typeof previous.results.fatMassKg === "number"
        ? round(current.fatMassKg - previous.results.fatMassKg, 1)
        : undefined,
  };
}

export function calculateCompositionProtocol(
  input: CompositionProtocolInput,
  previous?: BodyCompositionProtocolSnapshot
): BodyCompositionProtocolSnapshot {
  const protocol = getProtocol(input.protocolId);
  const fields = input.protocolId ? getProtocolFields(input.protocolId, input.sex) : [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const intermediate: ProtocolIntermediateResults = {};
  const details: string[] = [];
  let rawBodyFatPercent: number | undefined;

  if (!protocol || !input.protocolId) {
    return {
      sex: input.sex,
      ageYears: input.ageYears,
      assessedAt: input.assessedAt,
      calculatedAt: new Date().toISOString(),
      requiredFields: [],
      consolidatedMeasurements: [],
      intermediate,
      results: {},
      validation: { isCalculable: false, errors: ["Selecione um protocolo de composição corporal."], warnings },
      details,
    };
  }

  validateBase(input, errors, warnings);
  const applicability = getProtocolApplicability(protocol.id, input);
  warnings.push(...applicability.warnings);
  errors.push(...applicability.reasons);

  fields.forEach((field) => {
    if (field.kind === "bioimpedance" && !field.required) return;
    const value = getNumberField(input, field);
    validateNumericField(field, value, errors, warnings);
  });

  getConsolidatedMeasurements(input, fields).forEach((measurement) => {
    if (typeof measurement.spread === "number" && measurement.spread > SKINFOLD_REMEASURE_TOLERANCE_MM) {
      warnings.push(`${measurement.label}: diferença entre aferições acima de ${SKINFOLD_REMEASURE_TOLERANCE_MM} mm; repetir ou justificar.`);
    }
  });

  const spec = protocol.sexSpecs[input.sex];
  if (!spec) errors.push("Protocolo sem equação para o sexo informado.");
  intermediate.equationApplied = spec?.equation;

  if (errors.length === 0 && spec) {
    if (["jackson-pollock-3", "jackson-pollock-7", "guedes-3", "faulkner-4"].includes(protocol.id)) {
      const sum = spec.fields.reduce((total, fieldId) => total + (getNumberField(input, FIELD_LIBRARY[fieldId] as ProtocolFieldDefinition) ?? 0), 0);
      intermediate.skinfoldSumMm = round(sum, 1);
      details.push(`Soma das dobras consideradas: ${intermediate.skinfoldSumMm} mm.`);

      if (protocol.id === "jackson-pollock-3" && input.sex === "male") {
        intermediate.bodyDensity = 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * (input.ageYears ?? 0);
        rawBodyFatPercent = siriFromDensity(intermediate.bodyDensity);
      }
      if (protocol.id === "jackson-pollock-3" && input.sex === "female") {
        intermediate.bodyDensity = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * (input.ageYears ?? 0);
        rawBodyFatPercent = siriFromDensity(intermediate.bodyDensity);
      }
      if (protocol.id === "jackson-pollock-7" && input.sex === "male") {
        intermediate.bodyDensity = 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * (input.ageYears ?? 0);
        rawBodyFatPercent = siriFromDensity(intermediate.bodyDensity);
      }
      if (protocol.id === "jackson-pollock-7" && input.sex === "female") {
        intermediate.bodyDensity = 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * (input.ageYears ?? 0);
        rawBodyFatPercent = siriFromDensity(intermediate.bodyDensity);
      }
      if (protocol.id === "guedes-3" && input.sex === "male") {
        intermediate.bodyDensity = 1.17136 - 0.06706 * Math.log10(sum);
        rawBodyFatPercent = siriFromDensity(intermediate.bodyDensity);
      }
      if (protocol.id === "guedes-3" && input.sex === "female") {
        intermediate.bodyDensity = 1.1665 - 0.07063 * Math.log10(sum);
        rawBodyFatPercent = siriFromDensity(intermediate.bodyDensity);
      }
      if (protocol.id === "faulkner-4") {
        rawBodyFatPercent = 5.783 + 0.153 * sum;
      }
      if (typeof intermediate.bodyDensity === "number") {
        intermediate.bodyDensity = round(intermediate.bodyDensity, 5);
        intermediate.densityConversion = protocol.conversion?.equation;
        details.push(`Densidade corporal: ${intermediate.bodyDensity}. Conversão: ${protocol.conversion?.equation}.`);
      }
    }

    if (protocol.id === "weltman-obesity") {
      const abdomenMeanCm = input.measurements?.girthsCm?.abdomenMeanCm ?? 0;
      if (input.sex === "male") {
        rawBodyFatPercent = 0.31457 * abdomenMeanCm - 0.10969 * (input.weightKg ?? 0) + 10.8336;
      } else {
        rawBodyFatPercent = 0.11077 * abdomenMeanCm - 0.17666 * (input.heightCm ?? 0) + 0.14354 * (input.weightKg ?? 0) + 51.03301;
      }
      details.push("Weltman usa circunferência abdominal média; não utiliza dobras cutâneas.");
    }

    if (protocol.id === "bioimpedance") {
      rawBodyFatPercent = input.measurements?.bioimpedance?.bodyFatPercent;
      details.push("Bioimpedância: percentual informado pelo equipamento; o app calcula apenas derivações transparentes.");
    }
  }

  intermediate.rawBodyFatPercent = typeof rawBodyFatPercent === "number" ? rawBodyFatPercent : undefined;

  if (typeof rawBodyFatPercent === "number" && (rawBodyFatPercent <= 0 || rawBodyFatPercent >= 80)) {
    warnings.push("Percentual de gordura calculado fora da faixa plausível; confira protocolo e medidas.");
  }

  const bodyFatPercent = typeof rawBodyFatPercent === "number" ? round(rawBodyFatPercent, 1) : undefined;
  const heightM = input.heightCm ? input.heightCm / 100 : undefined;
  const bmi = input.weightKg && heightM ? round(input.weightKg / (heightM * heightM), 1) : undefined;
  const bmiClassification = classifyAdultBmi(bmi, input.ageYears);

  const bioFatMass = input.measurements?.bioimpedance?.fatMassKg;
  const bioLeanMass = input.measurements?.bioimpedance?.leanMassKg;
  const fatMassKg =
    typeof bioFatMass === "number"
      ? round(bioFatMass, 1)
      : input.weightKg && typeof bodyFatPercent === "number"
        ? round(input.weightKg * bodyFatPercent / 100, 1)
        : undefined;
  const leanMassKg =
    typeof bioLeanMass === "number"
      ? round(bioLeanMass, 1)
      : input.weightKg && typeof fatMassKg === "number"
        ? round(input.weightKg - fatMassKg, 1)
        : undefined;
  const targetDecimal =
    typeof input.targetBodyFatPercent === "number" && input.targetBodyFatPercent > 0 && input.targetBodyFatPercent < 80
      ? input.targetBodyFatPercent / 100
      : undefined;
  const targetWeightKg = typeof leanMassKg === "number" && targetDecimal ? round(leanMassKg / (1 - targetDecimal), 1) : undefined;
  const targetFatMassKg = typeof targetWeightKg === "number" && typeof leanMassKg === "number" ? round(targetWeightKg - leanMassKg, 1) : undefined;
  const fatMassToChangeKg =
    typeof targetFatMassKg === "number" && typeof fatMassKg === "number" ? round(targetFatMassKg - fatMassKg, 1) : undefined;

  const results: ProtocolDerivedResults = {
    bodyFatPercent,
    bodyFatClassification: "Classificação de gordura não configurada",
    bodyFatClassificationVersion: BODY_FAT_CLASSIFICATION_VERSION,
    bmi,
    bmiClassification,
    bmiClassificationVersion: bmiClassification ? BMI_CLASSIFICATION_VERSION : undefined,
    fatMassKg,
    leanMassKg,
    targetBodyFatPercent: input.targetBodyFatPercent,
    targetWeightKg,
    targetFatMassKg,
    fatMassToChangeKg,
  };
  results.differenceFromPrevious = comparePrevious(results, previous, protocol.id);

  if (targetWeightKg) {
    details.push("Peso-alvo estimado preserva massa livre de gordura como hipótese matemática; não é prescrição.");
  }

  return {
    protocolId: protocol.id,
    protocolName: protocol.displayName,
    protocolVersion: protocol.version,
    formulaVersion: protocol.formulaVersion,
    formulaReference: protocol.reference,
    formulaReferenceUrl: protocol.referenceUrl,
    sex: input.sex,
    ageYears: input.ageYears,
    assessedAt: input.assessedAt,
    calculatedAt: new Date().toISOString(),
    requiredFields: fields,
    consolidatedMeasurements: getConsolidatedMeasurements(input, fields),
    intermediate,
    results,
    validation: { isCalculable: errors.length === 0 && typeof bodyFatPercent === "number", errors, warnings },
    details,
  };
}
