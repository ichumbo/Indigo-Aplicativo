export type FunctionalTestCategory =
  | "flexibilidade"
  | "mobilidade"
  | "controle_motor"
  | "movimento_funcional"
  | "equilibrio"
  | "estabilidade"
  | "resistencia_muscular"
  | "forca"
  | "potencia"
  | "agilidade"
  | "idosos"
  | "equipamentos"
  | "personalizado";

export type FunctionalFieldKind = "number" | "text" | "boolean" | "choice";
export type FunctionalResultStrategy = "best" | "average" | "sum" | "manual" | "epley-1rm";
export type FunctionalSide = "direito" | "esquerdo" | "bilateral" | "nao_aplicavel";
export type FunctionalExecutionStatus = "rascunho" | "apto" | "adaptado" | "adiado" | "contraindicado" | "interrompido" | "concluido";

export type FunctionalTestFieldDefinition = {
  id: string;
  label: string;
  kind: FunctionalFieldKind;
  unit?: "cm" | "graus" | "seg" | "rep" | "kg" | "m" | "ms" | "w" | "pontos" | "texto";
  required?: boolean;
  bilateral?: boolean;
  attempts?: number;
  min?: number;
  max?: number;
  options?: string[];
  help: string;
};

export type FunctionalTestDefinition = {
  id: string;
  version: string;
  name: string;
  category: FunctionalTestCategory;
  objective: string;
  bodyRegion: string;
  indicatedFor: string;
  contraindications: string[];
  equipment: string[];
  preparation: string;
  startPosition: string;
  executionSteps: string[];
  attempts: number;
  restBetweenAttemptsSec?: number;
  resultStrategy: FunctionalResultStrategy;
  primaryFieldId: string;
  validityCriteria: string[];
  interruptionCriteria: string[];
  interpretation: string;
  reference: string;
  referenceUrl?: string;
  limitations: string[];
  fields: FunctionalTestFieldDefinition[];
  supportsMedia?: boolean;
  requiresConsentForMedia?: boolean;
  professionalRestriction?: "personal" | "habilitado";
};

export type FunctionalBatteryTemplate = {
  id: string;
  name: string;
  description: string;
  testIds: string[];
};

export type FunctionalAttempt = {
  value?: number;
  invalid?: boolean;
  note?: string;
};

export type FunctionalFieldResult = {
  value?: number | string | boolean;
  right?: FunctionalAttempt[];
  left?: FunctionalAttempt[];
  attempts?: FunctionalAttempt[];
  note?: string;
};

export type FunctionalEquipmentRecord = {
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  lastCalibrationAt?: string;
  settings?: string;
};

export type FunctionalTestExecution = {
  id: string;
  testId: string;
  testVersion: string;
  customDefinition?: FunctionalTestDefinition;
  required?: boolean;
  order: number;
  status: FunctionalExecutionStatus;
  adapted?: boolean;
  adaptationReason?: string;
  notPerformedReason?: string;
  interruptionReason?: string;
  side?: FunctionalSide;
  fields: Record<string, FunctionalFieldResult>;
  equipment?: FunctionalEquipmentRecord;
  pain?: {
    present?: boolean;
    location?: string;
    intensity?: number;
    notes?: string;
  };
  compensations?: string;
  professionalNotes?: string;
  media?: {
    photoUri?: string;
    videoUri?: string;
    consentTermVersion?: string;
  };
  snapshot?: FunctionalTestSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type FunctionalScreening = {
  readinessStatus?: "apto" | "adaptado" | "adiado" | "contraindicado" | "encaminhamento_recomendado";
  consentAccepted?: boolean;
  parqReviewed?: boolean;
  injuryHistoryReviewed?: boolean;
  surgeryHistoryReviewed?: boolean;
  currentPainReviewed?: boolean;
  medicalRestrictionsReviewed?: boolean;
  medicationUseReviewed?: boolean;
  cardiovascularSymptoms?: boolean;
  dizziness?: boolean;
  balanceLoss?: boolean;
  importantMovementLimitation?: boolean;
  medicalClearanceNeeded?: boolean;
  notes?: string;
};

export type FunctionalScreeningResult = {
  canProceed: boolean;
  status: FunctionalScreening["readinessStatus"];
  alerts: string[];
};

export type FunctionalTestSnapshot = {
  testId: string;
  testName: string;
  testVersion: string;
  category: FunctionalTestCategory;
  calculatedAt: string;
  status: FunctionalExecutionStatus;
  rawFields: Record<string, FunctionalFieldResult>;
  primaryResult?: {
    value?: number;
    unit?: FunctionalTestFieldDefinition["unit"];
    strategy: FunctionalResultStrategy;
    label: string;
  };
  asymmetry?: {
    fieldId: string;
    label: string;
    right?: number;
    left?: number;
    absoluteDifference?: number;
    percentDifference?: number;
    largerSide?: "direito" | "esquerdo" | "igual";
    formula: string;
  };
  estimatedOneRmKg?: number;
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
    percentDelta?: number;
  };
  attentionFlags: string[];
  interpretation: string;
  reference: string;
};

export const FUNCTIONAL_CATEGORIES: { id: FunctionalTestCategory; label: string }[] = [
  { id: "flexibilidade", label: "Flexibilidade" },
  { id: "mobilidade", label: "Mobilidade articular" },
  { id: "controle_motor", label: "Controle motor" },
  { id: "movimento_funcional", label: "Movimento funcional" },
  { id: "equilibrio", label: "Equilíbrio" },
  { id: "estabilidade", label: "Estabilidade" },
  { id: "resistencia_muscular", label: "Resistência muscular" },
  { id: "forca", label: "Força" },
  { id: "potencia", label: "Potência" },
  { id: "agilidade", label: "Velocidade e agilidade" },
  { id: "idosos", label: "Avaliações para idosos" },
  { id: "equipamentos", label: "Equipamentos" },
  { id: "personalizado", label: "Personalizados" },
];

const GENERAL_INTERRUPTION = [
  "Dor aguda",
  "Tontura",
  "Falta de ar desproporcional",
  "Dor ou pressão no peito",
  "Perda importante de equilíbrio",
  "Mal-estar",
  "Alteração neurológica percebida",
  "Incapacidade de executar com segurança",
  "Pedido do aluno para parar",
];

const bilateralNumber = (
  id: string,
  label: string,
  unit: FunctionalTestFieldDefinition["unit"],
  help: string,
  min?: number,
  max?: number
): FunctionalTestFieldDefinition => ({
  id,
  label,
  kind: "number",
  unit,
  required: true,
  bilateral: true,
  attempts: 3,
  min,
  max,
  help,
});

const numberField = (
  id: string,
  label: string,
  unit: FunctionalTestFieldDefinition["unit"],
  help: string,
  min?: number,
  max?: number,
  attempts = 3
): FunctionalTestFieldDefinition => ({
  id,
  label,
  kind: "number",
  unit,
  required: true,
  attempts,
  min,
  max,
  help,
});

const observationFields: FunctionalTestFieldDefinition[] = [
  {
    id: "validExecution",
    label: "Execução válida",
    kind: "boolean",
    required: true,
    help: "Marque se a tentativa respeitou os critérios de validade.",
  },
  {
    id: "movementQuality",
    label: "Qualidade da execução",
    kind: "choice",
    options: ["boa", "regular", "requer_atencao"],
    help: "Registro observacional, sem diagnóstico.",
  },
  {
    id: "observedCompensations",
    label: "Compensações observadas",
    kind: "text",
    help: "Descreva padrões observados sem inferir lesão ou diagnóstico.",
  },
];

export const FUNCTIONAL_TEST_CATALOG: FunctionalTestDefinition[] = [
  {
    id: "wells-sit-and-reach",
    version: "wells-sit-and-reach.v1",
    name: "Sentar e alcançar - Banco de Wells",
    category: "flexibilidade",
    objective: "Registrar alcance anterior como indicador de flexibilidade de cadeia posterior.",
    bodyRegion: "Cadeia posterior",
    indicatedFor: "Adultos aptos para flexão anterior sentada.",
    contraindications: ["Dor lombar aguda", "Irritação neural importante", "Restrição médica para flexão de tronco"],
    equipment: ["Banco de Wells ou caixa com régua"],
    preparation: "Aquecimento leve e demonstração do movimento.",
    startPosition: "Sentado, joelhos estendidos, pés apoiados no banco.",
    executionSteps: ["Inspirar", "Inclinar o tronco à frente de forma controlada", "Alcançar o maior ponto sem impulso", "Registrar a distância"],
    attempts: 3,
    restBetweenAttemptsSec: 30,
    resultStrategy: "best",
    primaryFieldId: "reachCm",
    validityCriteria: ["Joelhos mantidos estendidos", "Sem impulso brusco", "Medida sustentada brevemente"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Resultado bruto e evolução individual; aplicar tabelas normativas somente quando configuradas.",
    reference: "Canadian Society for Exercise Physiology. Canadian Physical Activity, Fitness & Lifestyle Approach (CPAFLA).",
    limitations: ["Influenciado por antropometria e familiarização."],
    fields: [numberField("reachCm", "Alcance", "cm", "Maior distância alcançada na escala do banco.", -30, 80)],
  },
  {
    id: "active-straight-leg-raise",
    version: "active-straight-leg-raise.v1",
    name: "Elevação ativa da perna estendida",
    category: "flexibilidade",
    objective: "Registrar amplitude ativa de flexão de quadril com joelho estendido.",
    bodyRegion: "Quadril e cadeia posterior",
    indicatedFor: "Adultos sem contraindicação para elevação ativa de membro inferior.",
    contraindications: ["Dor aguda irradiada", "Restrição médica de quadril ou coluna"],
    equipment: ["Goniômetro, inclinômetro ou app de medida angular"],
    preparation: "Explicar que compensações de pelve devem ser evitadas.",
    startPosition: "Decúbito dorsal, perna contralateral estendida.",
    executionSteps: ["Elevar a perna mantendo joelho estendido", "Evitar compensação pélvica", "Registrar ângulo por lado"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "angleDeg",
    validityCriteria: ["Joelho avaliado mantido estendido", "Pelve controlada", "Sem dor aguda"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Registrar amplitude e assimetria observada; não diagnostica encurtamento isoladamente.",
    reference: "Kendall FP et al. Muscles: Testing and Function with Posture and Pain. 5th ed.",
    limitations: ["Pode variar conforme técnica de mensuração e controle pélvico."],
    fields: [bilateralNumber("angleDeg", "Ângulo", "graus", "Ângulo de elevação ativa por lado.", 0, 140), ...observationFields],
  },
  {
    id: "shoulder-flexibility",
    version: "shoulder-flexibility.v1",
    name: "Flexibilidade de ombros",
    category: "flexibilidade",
    objective: "Registrar alcance ou distância entre mãos no teste de ombros.",
    bodyRegion: "Ombros",
    indicatedFor: "Alunos sem dor aguda no ombro.",
    contraindications: ["Dor aguda no ombro", "Luxação recente", "Restrição médica de membros superiores"],
    equipment: ["Fita métrica"],
    preparation: "Demonstrar movimento bilateral e orientar amplitude confortável.",
    startPosition: "Em pé, uma mão por cima e outra por baixo atrás do tronco.",
    executionSteps: ["Aproximar as mãos sem puxar", "Registrar distância ou sobreposição", "Repetir invertendo os lados"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "distanceCm",
    validityCriteria: ["Sem dor aguda", "Sem forçar articulação", "Medida registrada consistentemente"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Distância maior pode indicar limitação observada; interpretação depende do contexto.",
    reference: "American College of Sports Medicine. ACSM's Guidelines for Exercise Testing and Prescription.",
    limitations: ["Não isola uma articulação específica."],
    fields: [bilateralNumber("distanceCm", "Distância entre mãos", "cm", "Distância ou sobreposição registrada por lado.", -20, 60), ...observationFields],
  },
  {
    id: "ankle-dorsiflexion-wall",
    version: "ankle-dorsiflexion-wall.v1",
    name: "Dorsiflexão de tornozelo na parede",
    category: "mobilidade",
    objective: "Medir mobilidade funcional de dorsiflexão em cadeia fechada.",
    bodyRegion: "Tornozelo",
    indicatedFor: "Alunos que conseguem assumir posição de avanço com segurança.",
    contraindications: ["Dor aguda no tornozelo ou joelho", "Restrição de apoio"],
    equipment: ["Fita métrica", "Parede"],
    preparation: "Pé alinhado à parede; calcanhar deve permanecer em contato com o solo.",
    startPosition: "Meio ajoelhado ou em pé, pé avaliado apontado para a parede.",
    executionSteps: ["Avançar o joelho até tocar a parede", "Manter calcanhar no chão", "Registrar maior distância do hálux à parede"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "distanceCm",
    validityCriteria: ["Calcanhar no solo", "Joelho alinhado", "Sem dor aguda"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Comparar lados como assimetria observada, sem diagnóstico isolado.",
    reference: "Bennell KL et al. Intra-rater and inter-rater reliability of a weight-bearing lunge measure of ankle dorsiflexion. Aust J Physiother. 1998.",
    limitations: ["Distância depende do tamanho do pé se não houver padronização."],
    fields: [bilateralNumber("distanceCm", "Distância hálux-parede", "cm", "Maior distância mantendo calcanhar no solo.", 0, 30), ...observationFields],
  },
  {
    id: "thoracic-rotation-quadruped",
    version: "thoracic-rotation-quadruped.v1",
    name: "Rotação torácica em quatro apoios",
    category: "mobilidade",
    objective: "Observar e medir rotação torácica em posição estável.",
    bodyRegion: "Coluna torácica",
    indicatedFor: "Adultos aptos para apoio em quatro pontos.",
    contraindications: ["Dor aguda em ombro, punho ou coluna", "Restrição para apoio no solo"],
    equipment: ["Inclinômetro ou avaliação observacional padronizada"],
    preparation: "Orientar pelve estável e rotação controlada.",
    startPosition: "Quatro apoios, uma mão na nuca.",
    executionSteps: ["Rotacionar o tronco abrindo o cotovelo", "Evitar deslocamento excessivo da pelve", "Registrar lado"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "angleDeg",
    validityCriteria: ["Sem dor aguda", "Pelve controlada", "Movimento ativo"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Registrar amplitude e qualidade; não diagnostica alteração estrutural.",
    reference: "Cook G. Movement: Functional Movement Systems. On Target Publications.",
    limitations: ["Medida angular depende do instrumento e do ponto de referência."],
    fields: [bilateralNumber("angleDeg", "Rotação", "graus", "Ângulo de rotação por lado.", 0, 120), ...observationFields],
  },
  {
    id: "overhead-squat",
    version: "overhead-squat.v1",
    name: "Agachamento com braços elevados",
    category: "movimento_funcional",
    objective: "Observar padrão global de agachamento, controle e compensações.",
    bodyRegion: "Corpo inteiro",
    indicatedFor: "Alunos aptos para agachamento sem carga.",
    contraindications: ["Dor aguda", "Restrição médica para agachar", "Incapacidade de executar com segurança"],
    equipment: ["Bastão opcional"],
    preparation: "Demonstrar amplitude confortável e critério de interrupção.",
    startPosition: "Em pé, pés alinhados, braços elevados.",
    executionSteps: ["Executar agachamento controlado", "Manter tronco e alinhamento observáveis", "Registrar compensações sem diagnóstico"],
    attempts: 3,
    resultStrategy: "manual",
    primaryFieldId: "validReps",
    validityCriteria: ["Movimento controlado", "Sem dor aguda", "Execução observável"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Checklist observacional para guiar prescrição; não identifica lesão específica.",
    reference: "National Academy of Sports Medicine. Essentials of Corrective Exercise Training.",
    limitations: ["Checklist depende da experiência do avaliador."],
    fields: [numberField("validReps", "Repetições válidas", "rep", "Número de repetições com execução válida.", 0, 20, 1), ...observationFields],
  },
  {
    id: "single-leg-squat",
    version: "single-leg-squat.v1",
    name: "Agachamento unipodal",
    category: "controle_motor",
    objective: "Observar controle unilateral, alinhamento e equilíbrio.",
    bodyRegion: "Quadril, joelho e tornozelo",
    indicatedFor: "Alunos com controle suficiente para apoio unilateral.",
    contraindications: ["Dor aguda", "Instabilidade importante", "Restrição médica de membro inferior"],
    equipment: ["Caixa ou referência visual opcional"],
    preparation: "Definir amplitude-alvo segura e demonstrar movimento.",
    startPosition: "Apoio unipodal, tronco alinhado.",
    executionSteps: ["Flexionar quadril e joelho de forma controlada", "Retornar sem perder equilíbrio", "Registrar lados"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "validReps",
    validityCriteria: ["Apoio mantido", "Sem dor aguda", "Controle mínimo para repetir"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Registrar compensações e assimetrias observadas; não inferir lesão.",
    reference: "Crossley KM et al. Performance on the single-leg squat task indicates hip abductor muscle function. Am J Sports Med. 2011.",
    limitations: ["Influenciado por força, mobilidade, familiarização e equilíbrio."],
    fields: [bilateralNumber("validReps", "Repetições válidas", "rep", "Repetições válidas por lado.", 0, 20), ...observationFields],
  },
  {
    id: "single-leg-stance",
    version: "single-leg-stance.v1",
    name: "Apoio unipodal",
    category: "equilibrio",
    objective: "Registrar tempo de equilíbrio estático em apoio unilateral.",
    bodyRegion: "Equilíbrio global",
    indicatedFor: "Alunos aptos para apoio unipodal com segurança.",
    contraindications: ["Tontura atual", "Alto risco de queda sem suporte", "Dor aguda em apoio"],
    equipment: ["Cronômetro"],
    preparation: "Avaliador próximo para segurança.",
    startPosition: "Em pé, apoio unipodal, braços conforme padronização escolhida.",
    executionSteps: ["Iniciar cronômetro ao retirar o pé", "Parar ao tocar o chão ou perder equilíbrio", "Registrar tempo por lado"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "timeSec",
    validityCriteria: ["Sem apoio externo não previsto", "Ambiente seguro", "Critério de parada respeitado"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Tempo bruto e assimetria observada; critérios normativos devem ser configurados por população.",
    reference: "Springer BA et al. Normative values for the unipedal stance test with eyes open and closed. J Geriatr Phys Ther. 2007.",
    limitations: ["Influenciado por superfície, calçado e visão."],
    fields: [
      bilateralNumber("timeSec", "Tempo", "seg", "Maior tempo mantido por lado.", 0, 180),
      bilateralNumber("floorTouches", "Toques no chão", "rep", "Número de toques ou apoios por lado.", 0, 20),
      ...observationFields,
    ],
  },
  {
    id: "plank",
    version: "plank.v1",
    name: "Prancha",
    category: "estabilidade",
    objective: "Registrar resistência isométrica de tronco.",
    bodyRegion: "Core",
    indicatedFor: "Alunos aptos para apoio em antebraços ou mãos.",
    contraindications: ["Dor aguda em ombro, punho ou lombar", "Restrição para isometria"],
    equipment: ["Cronômetro"],
    preparation: "Definir posição, alinhamento e critério de parada.",
    startPosition: "Prancha em antebraços ou mãos, conforme adaptação registrada.",
    executionSteps: ["Iniciar cronômetro na posição", "Manter alinhamento", "Parar ao perder técnica ou por solicitação"],
    attempts: 2,
    resultStrategy: "best",
    primaryFieldId: "timeSec",
    validityCriteria: ["Alinhamento mantido", "Respiração preservada", "Sem dor aguda"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Resultado bruto de resistência; não diagnostica estabilidade clínica.",
    reference: "ACSM's Guidelines for Exercise Testing and Prescription.",
    limitations: ["Técnica e instrução afetam fortemente o resultado."],
    fields: [numberField("timeSec", "Tempo", "seg", "Maior tempo mantido com técnica válida.", 0, 600, 2), ...observationFields],
  },
  {
    id: "push-up",
    version: "push-up.v1",
    name: "Flexão de braços",
    category: "resistencia_muscular",
    objective: "Registrar repetições válidas de flexão no protocolo selecionado.",
    bodyRegion: "Membros superiores e tronco",
    indicatedFor: "Alunos aptos para flexão ou variação adaptada.",
    contraindications: ["Dor aguda em ombro, cotovelo ou punho", "Restrição para apoio"],
    equipment: ["Cronômetro opcional"],
    preparation: "Definir variante e amplitude mínima antes de iniciar.",
    startPosition: "Prancha alta ou variação adaptada.",
    executionSteps: ["Executar repetições controladas", "Contabilizar apenas válidas", "Encerrar ao perder técnica"],
    attempts: 1,
    resultStrategy: "best",
    primaryFieldId: "validReps",
    validityCriteria: ["Amplitude mínima definida", "Tronco controlado", "Sem dor aguda"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Resultado bruto; classificações dependem de tabela normativa configurada.",
    reference: "ACSM's Guidelines for Exercise Testing and Prescription.",
    limitations: ["Variações de técnica mudam comparabilidade."],
    fields: [numberField("validReps", "Repetições válidas", "rep", "Repetições válidas até encerramento.", 0, 200, 1), ...observationFields],
  },
  {
    id: "estimated-1rm",
    version: "estimated-1rm-epley.v1",
    name: "Estimativa de 1RM - Epley",
    category: "forca",
    objective: "Estimar 1RM a partir de teste submáximo com carga padronizada.",
    bodyRegion: "Conforme exercício selecionado",
    indicatedFor: "Alunos experientes e aptos para teste submáximo de força.",
    contraindications: ["Dor aguda", "Técnica insegura", "Restrição médica para carga", "Sintomas cardiovasculares sem liberação"],
    equipment: ["Equipamento de força registrado"],
    preparation: "Aquecimento progressivo, técnica validada e carga submáxima apropriada.",
    startPosition: "Conforme exercício e equipamento registrados.",
    executionSteps: ["Registrar exercício e equipamento", "Executar repetições válidas com carga", "Aplicar fórmula Epley se reps forem adequadas"],
    attempts: 1,
    resultStrategy: "epley-1rm",
    primaryFieldId: "loadKg",
    validityCriteria: ["Técnica válida", "Carga e repetições registradas", "Teste submáximo seguro"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Estimativa de força, não teste direto máximo; usar com cautela.",
    reference: "Epley B. Boyd Epley Workout. Body Enterprises. Fórmula: 1RM = carga x (1 + reps/30).",
    referenceUrl: "https://www.vcalc.com/wiki/epley-formula-1-rep-max",
    limitations: ["Estimativa perde precisão com muitas repetições e varia por exercício/equipamento."],
    fields: [
      numberField("loadKg", "Carga", "kg", "Carga utilizada no teste submáximo.", 0, 500, 1),
      numberField("validReps", "Repetições válidas", "rep", "Repetições válidas com a carga registrada.", 1, 30, 1),
      { id: "exercise", label: "Exercício", kind: "text", required: true, help: "Exercício avaliado, por exemplo supino, agachamento ou remada." },
      ...observationFields,
    ],
  },
  {
    id: "vertical-jump",
    version: "vertical-jump.v1",
    name: "Salto vertical",
    category: "potencia",
    objective: "Registrar altura de salto como indicador de potência de membros inferiores.",
    bodyRegion: "Membros inferiores",
    indicatedFor: "Alunos aptos para saltar e aterrissar com segurança.",
    contraindications: ["Dor aguda", "Restrição para impacto", "Incapacidade de aterrissar com segurança"],
    equipment: ["Fita métrica, tapete de salto, plataforma ou app/sensor compatível"],
    preparation: "Definir técnica e superfície; aquecimento apropriado.",
    startPosition: "Em pé, conforme variante escolhida.",
    executionSteps: ["Executar salto conforme protocolo", "Registrar altura", "Descartar tentativa inválida"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "heightCm",
    validityCriteria: ["Aterrissagem segura", "Sem passo extra", "Equipamento configurado"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Resultado bruto comparável apenas com mesmo protocolo/equipamento.",
    reference: "Markovic G et al. Reliability and factorial validity of squat and countermovement jump tests. J Strength Cond Res. 2004.",
    limitations: ["Equipamento e técnica alteram comparabilidade."],
    fields: [numberField("heightCm", "Altura do salto", "cm", "Altura registrada por tentativa.", 0, 120), ...observationFields],
  },
  {
    id: "t-test-agility",
    version: "t-test-agility.v1",
    name: "Teste T de agilidade",
    category: "agilidade",
    objective: "Registrar tempo em mudança de direção padronizada.",
    bodyRegion: "Corpo inteiro",
    indicatedFor: "Alunos aptos para aceleração, desaceleração e mudança de direção.",
    contraindications: ["Dor aguda", "Restrição para corrida", "Risco aumentado em mudança de direção"],
    equipment: ["Cones", "Cronômetro ou fotocélula"],
    preparation: "Montar percurso padronizado e superfície segura.",
    startPosition: "Em pé na linha de partida.",
    executionSteps: ["Executar percurso definido", "Registrar tempo", "Descartar tentativa com erro de percurso"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "timeSec",
    validityCriteria: ["Percurso correto", "Sem escorregão ou erro", "Mesmo equipamento para comparações"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Resultado bruto; comparar somente mesma distância/superfície/equipamento.",
    reference: "Pauole K et al. Reliability and validity of the T-test as a measure of agility. J Strength Cond Res. 2000.",
    limitations: ["Superfície e técnica de cronometragem alteram resultado."],
    fields: [numberField("timeSec", "Tempo", "seg", "Menor tempo válido.", 0, 60), ...observationFields],
  },
  {
    id: "timed-up-and-go",
    version: "timed-up-and-go.v1",
    name: "Timed Up and Go",
    category: "idosos",
    objective: "Registrar tempo para levantar, caminhar, retornar e sentar.",
    bodyRegion: "Mobilidade funcional",
    indicatedFor: "Público apropriado, especialmente idosos, quando seguro.",
    contraindications: ["Tontura atual", "Incapacidade de caminhar com segurança", "Dor aguda"],
    equipment: ["Cadeira", "Cronômetro", "Marcação de distância"],
    preparation: "Garantir ambiente livre de obstáculos e apoio próximo se necessário.",
    startPosition: "Sentado em cadeira padronizada.",
    executionSteps: ["Levantar", "Caminhar até marca", "Retornar", "Sentar", "Registrar tempo"],
    attempts: 2,
    resultStrategy: "best",
    primaryFieldId: "timeSec",
    validityCriteria: ["Percurso seguro", "Critério de partida/parada padronizado"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Triagem funcional; não diagnostica queda ou condição clínica.",
    reference: "CDC STEADI. Timed Up and Go Test.",
    referenceUrl: "https://www.cdc.gov/steadi/hcp/clinical-resources/index.html",
    limitations: ["Critérios devem ser interpretados conforme população e contexto clínico."],
    fields: [numberField("timeSec", "Tempo", "seg", "Menor tempo válido.", 0, 120), ...observationFields],
  },
  {
    id: "chair-stand-30s",
    version: "chair-stand-30s.v1",
    name: "Sentar e levantar em 30 segundos",
    category: "idosos",
    objective: "Registrar repetições de sentar e levantar em 30 segundos.",
    bodyRegion: "Membros inferiores",
    indicatedFor: "Público apropriado, especialmente idosos, quando seguro.",
    contraindications: ["Dor aguda", "Tontura", "Restrição para levantar da cadeira repetidamente"],
    equipment: ["Cadeira", "Cronômetro"],
    preparation: "Cadeira estável; explicar critério de repetição válida.",
    startPosition: "Sentado, pés apoiados.",
    executionSteps: ["Iniciar cronômetro", "Contar repetições completas", "Interromper se houver alerta"],
    attempts: 1,
    resultStrategy: "best",
    primaryFieldId: "validReps",
    validityCriteria: ["Extensão em pé suficiente", "Contato sentado completo", "Sem uso de apoio se não previsto"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Resultado bruto; aplicar normas apenas quando tabela versionada existir.",
    reference: "CDC STEADI. 30-Second Chair Stand Test.",
    referenceUrl: "https://www.cdc.gov/steadi/hcp/clinical-resources/index.html",
    limitations: ["Altura da cadeira e uso de braços afetam comparabilidade."],
    fields: [numberField("validReps", "Repetições válidas", "rep", "Repetições completas em 30 segundos.", 0, 60, 1), ...observationFields],
  },
  {
    id: "four-stage-balance",
    version: "four-stage-balance.v1",
    name: "Teste de equilíbrio em quatro estágios",
    category: "idosos",
    objective: "Registrar tempo mantido em posições progressivamente desafiadoras.",
    bodyRegion: "Equilíbrio estático",
    indicatedFor: "Público apropriado, especialmente idosos, com supervisão próxima.",
    contraindications: ["Alto risco de queda sem suporte", "Tontura atual", "Dor aguda em apoio"],
    equipment: ["Cronômetro"],
    preparation: "Avaliador ao lado, pronto para assistência.",
    startPosition: "Em pé, posições progressivas conforme instrução.",
    executionSteps: ["Demonstrar posição", "Cronometrar até limite definido", "Avançar somente se seguro"],
    attempts: 1,
    resultStrategy: "manual",
    primaryFieldId: "maxStage",
    validityCriteria: ["Ambiente seguro", "Assistência próxima", "Critério de interrupção respeitado"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Triagem de equilíbrio; não substitui avaliação clínica.",
    reference: "CDC STEADI. 4-Stage Balance Test.",
    referenceUrl: "https://www.cdc.gov/steadi/hcp/clinical-resources/index.html",
    limitations: ["Aplicabilidade depende de segurança e população."],
    fields: [
      numberField("maxStage", "Maior estágio mantido", "pontos", "Maior estágio mantido com segurança.", 0, 4, 1),
      numberField("timeSec", "Tempo no último estágio", "seg", "Tempo mantido no último estágio.", 0, 60, 1),
      ...observationFields,
    ],
  },
  {
    id: "handgrip-dynamometry",
    version: "handgrip-dynamometry.v1",
    name: "Dinamometria de preensão manual",
    category: "equipamentos",
    objective: "Registrar força de preensão com dinamômetro.",
    bodyRegion: "Mão e antebraço",
    indicatedFor: "Alunos aptos para preensão máxima segura.",
    contraindications: ["Dor aguda em mão, punho ou cotovelo", "Cirurgia recente sem liberação"],
    equipment: ["Dinamômetro de preensão"],
    preparation: "Registrar modelo, posição e ajuste do dinamômetro.",
    startPosition: "Conforme protocolo do equipamento utilizado.",
    executionSteps: ["Ajustar equipamento", "Executar tentativa máxima segura", "Registrar por lado"],
    attempts: 3,
    resultStrategy: "best",
    primaryFieldId: "forceKg",
    validityCriteria: ["Mesmo equipamento e configuração", "Sem dor aguda", "Tentativa completa"],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Resultado instrumental bruto; comparar apenas mesmo equipamento/configuração.",
    reference: "Roberts HC et al. A review of the measurement of grip strength in clinical and epidemiological studies. Age Ageing. 2011.",
    limitations: ["Modelo, ajuste e posição alteram o resultado."],
    fields: [bilateralNumber("forceKg", "Força de preensão", "kg", "Maior força registrada por lado.", 0, 150), ...observationFields],
  },
];

export const FUNCTIONAL_BATTERY_TEMPLATES: FunctionalBatteryTemplate[] = [
  {
    id: "geral",
    name: "Avaliação geral",
    description: "Bateria inicial ampla sem diagnósticos automáticos.",
    testIds: ["wells-sit-and-reach", "ankle-dorsiflexion-wall", "overhead-squat", "single-leg-stance", "push-up", "plank"],
  },
  {
    id: "mobilidade",
    name: "Mobilidade",
    description: "Foco em amplitude e comparação bilateral.",
    testIds: ["active-straight-leg-raise", "ankle-dorsiflexion-wall", "thoracic-rotation-quadruped", "shoulder-flexibility"],
  },
  {
    id: "forca-resistencia",
    name: "Força e resistência",
    description: "Testes de repetições, isometria e estimativa submáxima.",
    testIds: ["push-up", "plank", "estimated-1rm", "handgrip-dynamometry"],
  },
  {
    id: "idosos",
    name: "Idosos",
    description: "Triagem funcional apropriada quando segura.",
    testIds: ["timed-up-and-go", "chair-stand-30s", "four-stage-balance", "functional-reach"],
  },
  {
    id: "equilibrio",
    name: "Equilíbrio",
    description: "Equilíbrio estático e alcance funcional.",
    testIds: ["single-leg-stance", "four-stage-balance", "functional-reach"],
  },
  {
    id: "potencia-agilidade",
    name: "Potência e agilidade",
    description: "Somente para alunos aptos a impacto e mudanças de direção.",
    testIds: ["vertical-jump", "t-test-agility"],
  },
];

FUNCTIONAL_TEST_CATALOG.push({
  id: "functional-reach",
  version: "functional-reach.v1",
  name: "Teste de alcance funcional",
  category: "equilibrio",
  objective: "Registrar distância máxima de alcance anterior com base fixa.",
  bodyRegion: "Equilíbrio dinâmico",
  indicatedFor: "Adultos e idosos quando seguro.",
  contraindications: ["Tontura atual", "Risco de queda sem assistência", "Dor aguda"],
  equipment: ["Fita métrica ou régua fixada"],
  preparation: "Avaliador próximo para prevenir queda.",
  startPosition: "Em pé, braço elevado à frente, pés fixos.",
  executionSteps: ["Registrar posição inicial", "Alcançar à frente sem mover os pés", "Registrar diferença entre inicial e final"],
  attempts: 3,
  resultStrategy: "best",
  primaryFieldId: "reachCm",
  validityCriteria: ["Pés não se deslocam", "Sem perda de equilíbrio", "Alcance controlado"],
  interruptionCriteria: GENERAL_INTERRUPTION,
  interpretation: "Mede limite funcional de alcance; não diagnostica condição clínica.",
  reference: "Duncan PW, Weiner DK, Chandler J, Studenski S. Functional reach: a new clinical measure of balance. J Gerontol. 1990;45(6):M192-M197.",
  referenceUrl: "https://pubmed.ncbi.nlm.nih.gov/2229941/",
  limitations: ["Influenciado por estatura, estratégia motora e medo de queda."],
  fields: [numberField("reachCm", "Alcance", "cm", "Diferença entre posição inicial e alcance máximo.", 0, 80), ...observationFields],
});

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getFunctionalTestDefinition(testId?: string, customDefinition?: FunctionalTestDefinition) {
  if (customDefinition) return customDefinition;
  return FUNCTIONAL_TEST_CATALOG.find((test) => test.id === testId);
}

export function createFunctionalExecution(testId: string, order: number, required = false): FunctionalTestExecution {
  const definition = getFunctionalTestDefinition(testId);
  if (!definition) throw new Error("Teste funcional não encontrado.");
  const now = new Date().toISOString();
  return {
    id: createId("functional"),
    testId: definition.id,
    testVersion: definition.version,
    required,
    order,
    status: "rascunho",
    side: "nao_aplicavel",
    fields: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function createCustomFunctionalDefinition(input: {
  name: string;
  category: FunctionalTestCategory;
  objective?: string;
  bodyRegion?: string;
  unit?: FunctionalTestFieldDefinition["unit"];
  instructions?: string;
}) {
  const safeName = input.name.trim() || "Teste personalizado";
  const id = `custom-${safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  return {
    id,
    version: "custom.v1",
    name: safeName,
    category: input.category,
    objective: input.objective || "Teste personalizado definido pelo profissional.",
    bodyRegion: input.bodyRegion || "Não informado",
    indicatedFor: "Definido pelo profissional.",
    contraindications: ["Critérios definidos pelo profissional", ...GENERAL_INTERRUPTION],
    equipment: [],
    preparation: input.instructions || "Preparação definida pelo profissional.",
    startPosition: "Definida pelo profissional.",
    executionSteps: [input.instructions || "Executar conforme descrição profissional."],
    attempts: 3,
    resultStrategy: "best" as const,
    primaryFieldId: "result",
    validityCriteria: ["Critérios definidos pelo profissional."],
    interruptionCriteria: GENERAL_INTERRUPTION,
    interpretation: "Teste personalizado sem classificação científica automática.",
    reference: "Referência opcional do profissional.",
    limitations: ["Não possui validação científica automática no app."],
    fields: [numberField("result", "Resultado", input.unit, "Resultado bruto do teste personalizado.")],
    professionalRestriction: "personal" as const,
  };
}

export function createCustomFunctionalExecution(definition: FunctionalTestDefinition, order: number): FunctionalTestExecution {
  const now = new Date().toISOString();
  return {
    id: createId("functional"),
    testId: definition.id,
    testVersion: definition.version,
    customDefinition: definition,
    order,
    status: "rascunho",
    side: "nao_aplicavel",
    fields: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function validateFunctionalScreening(screening?: FunctionalScreening): FunctionalScreeningResult {
  const alerts: string[] = [];
  if (!screening?.consentAccepted) alerts.push("Consentimento do aluno não registrado.");
  if (!screening?.parqReviewed) alerts.push("Questionário de prontidão não revisado.");
  if (screening?.cardiovascularSymptoms) alerts.push("Sintomas cardiovasculares relatados: não recomendar continuidade automática.");
  if (screening?.dizziness) alerts.push("Tontura relatada: adiar ou encaminhar conforme avaliação profissional.");
  if (screening?.balanceLoss) alerts.push("Perda de equilíbrio relatada: adaptar, adiar ou encaminhar.");
  if (screening?.importantMovementLimitation) alerts.push("Limitação importante de movimento registrada.");
  if (screening?.medicalClearanceNeeded) alerts.push("Liberação médica indicada antes de testes exigentes.");

  const status = screening?.readinessStatus;
  const blocked = status === "adiado" || status === "contraindicado" || status === "encaminhamento_recomendado";
  return {
    canProceed: alerts.length === 0 && !blocked && status === "apto",
    status,
    alerts,
  };
}

function validAttemptValues(attempts?: FunctionalAttempt[]) {
  return (attempts ?? [])
    .filter((attempt) => !attempt.invalid && typeof attempt.value === "number" && Number.isFinite(attempt.value))
    .map((attempt) => attempt.value as number);
}

function consolidate(attempts: FunctionalAttempt[] | undefined, strategy: FunctionalResultStrategy) {
  const values = validAttemptValues(attempts);
  if (values.length === 0) return undefined;
  if (strategy === "average") return round(values.reduce((sum, value) => sum + value, 0) / values.length, 1);
  if (strategy === "sum") return round(values.reduce((sum, value) => sum + value, 0), 1);
  if (strategy === "best" || strategy === "manual" || strategy === "epley-1rm") return round(Math.max(...values), 1);
  return round(values[0], 1);
}

function getPrimaryField(definition: FunctionalTestDefinition) {
  return definition.fields.find((field) => field.id === definition.primaryFieldId);
}

function getPrimaryResult(definition: FunctionalTestDefinition, execution: FunctionalTestExecution) {
  const primaryField = getPrimaryField(definition);
  if (!primaryField) return undefined;
  const result = execution.fields[primaryField.id];

  if (primaryField.bilateral) {
    const right = consolidate(result?.right, definition.resultStrategy);
    const left = consolidate(result?.left, definition.resultStrategy);
    if (typeof right === "number" && typeof left === "number") return round((right + left) / 2, 1);
    return right ?? left;
  }

  if (result?.attempts?.length) return consolidate(result.attempts, definition.resultStrategy);
  return typeof result?.value === "number" ? result.value : undefined;
}

function calculateAsymmetry(definition: FunctionalTestDefinition, execution: FunctionalTestExecution) {
  const field = definition.fields.find((item) => item.bilateral);
  if (!field) return undefined;
  const result = execution.fields[field.id];
  const right = consolidate(result?.right, definition.resultStrategy);
  const left = consolidate(result?.left, definition.resultStrategy);
  if (typeof right !== "number" || typeof left !== "number") return undefined;

  const absoluteDifference = round(Math.abs(right - left), 1);
  const denominator = Math.max(Math.abs(right), Math.abs(left));
  return {
    fieldId: field.id,
    label: field.label,
    right,
    left,
    absoluteDifference,
    percentDifference: denominator > 0 ? round((absoluteDifference / denominator) * 100, 1) : undefined,
    largerSide: right > left ? "direito" as const : left > right ? "esquerdo" as const : "igual" as const,
    formula: "diferença absoluta = |direito - esquerdo|; diferença percentual = diferença / maior valor x 100",
  };
}

function calculateEpleyOneRm(execution: FunctionalTestExecution) {
  const load = execution.fields.loadKg?.attempts?.[0]?.value ?? execution.fields.loadKg?.value;
  const reps = execution.fields.validReps?.attempts?.[0]?.value ?? execution.fields.validReps?.value;
  if (typeof load !== "number" || typeof reps !== "number" || reps <= 0) return undefined;
  return round(load * (1 + reps / 30), 1);
}

function comparePrevious(
  current: FunctionalTestSnapshot,
  previous?: FunctionalTestSnapshot
): FunctionalTestSnapshot["comparison"] {
  if (!previous || previous.testId !== current.testId || previous.testVersion !== current.testVersion) {
    return previous
      ? {
          comparable: false,
          message: "Teste, versão ou protocolo diferente; comparação possui limitações.",
          previousValue: previous.primaryResult?.value,
        }
      : undefined;
  }

  const currentValue = current.primaryResult?.value;
  const previousValue = previous.primaryResult?.value;
  if (typeof currentValue !== "number" || typeof previousValue !== "number") return undefined;
  const delta = round(currentValue - previousValue, 1);
  return {
    comparable: true,
    message: "Comparação direta com mesmo teste e versão.",
    previousValue,
    delta,
    percentDelta: previousValue !== 0 ? round((delta / Math.abs(previousValue)) * 100, 1) : undefined,
  };
}

export function calculateFunctionalTestSnapshot(
  execution: FunctionalTestExecution,
  previous?: FunctionalTestSnapshot
): FunctionalTestSnapshot {
  const definition = getFunctionalTestDefinition(execution.testId, execution.customDefinition);
  if (!definition) throw new Error("Teste funcional não encontrado.");

  const errors: string[] = [];
  const warnings: string[] = [];
  const attentionFlags: string[] = [];

  if (execution.status === "contraindicado" || execution.status === "adiado") {
    warnings.push("Teste não executado por segurança ou decisão profissional.");
  }
  if (execution.status === "interrompido") {
    attentionFlags.push(`Teste interrompido: ${execution.interruptionReason || "motivo não informado"}.`);
  }
  if (execution.pain?.present) {
    attentionFlags.push(`Desconforto relatado${execution.pain.location ? ` em ${execution.pain.location}` : ""}.`);
  }

  definition.fields.forEach((field) => {
    const result = execution.fields[field.id];
    if (!field.required || execution.status === "adiado" || execution.status === "contraindicado") return;

    if (field.bilateral) {
      if (validAttemptValues(result?.right).length === 0) errors.push(`${field.label} direito é obrigatório.`);
      if (validAttemptValues(result?.left).length === 0) errors.push(`${field.label} esquerdo é obrigatório.`);
      return;
    }

    if (field.kind === "number" && validAttemptValues(result?.attempts).length === 0 && typeof result?.value !== "number") {
      errors.push(`${field.label} é obrigatório.`);
    }
    if (field.kind === "text" && !String(result?.value ?? "").trim()) errors.push(`${field.label} é obrigatório.`);
    if (field.kind === "boolean" && typeof result?.value !== "boolean") warnings.push(`${field.label} não foi marcado.`);
  });

  Object.entries(execution.fields).forEach(([fieldId, result]) => {
    const field = definition.fields.find((item) => item.id === fieldId);
    if (!field) return;
    const values = [...validAttemptValues(result.attempts), ...validAttemptValues(result.right), ...validAttemptValues(result.left)];
    values.forEach((value) => {
      if (typeof field.min === "number" && value < field.min) errors.push(`${field.label} abaixo do limite mínimo.`);
      if (typeof field.max === "number" && value > field.max) warnings.push(`${field.label} acima da faixa esperada; confira a medida.`);
    });
  });

  const primaryField = getPrimaryField(definition);
  const primaryValue = getPrimaryResult(definition, execution);
  const snapshot: FunctionalTestSnapshot = {
    testId: definition.id,
    testName: definition.name,
    testVersion: definition.version,
    category: definition.category,
    calculatedAt: new Date().toISOString(),
    status: execution.status,
    rawFields: execution.fields,
    primaryResult: primaryField
      ? {
          value: primaryValue,
          unit: primaryField.unit,
          strategy: definition.resultStrategy,
          label: primaryField.label,
        }
      : undefined,
    asymmetry: calculateAsymmetry(definition, execution),
    estimatedOneRmKg: definition.resultStrategy === "epley-1rm" ? calculateEpleyOneRm(execution) : undefined,
    validation: {
      isSavable: errors.length === 0,
      errors,
      warnings,
    },
    attentionFlags,
    interpretation: definition.interpretation,
    reference: definition.reference,
  };

  snapshot.comparison = comparePrevious(snapshot, previous);
  return snapshot;
}

export function buildFunctionalBatteryFromTemplate(templateId: string, currentCount = 0) {
  const template = FUNCTIONAL_BATTERY_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error("Modelo de bateria não encontrado.");
  return template.testIds.map((testId, index) => createFunctionalExecution(testId, currentCount + index));
}
