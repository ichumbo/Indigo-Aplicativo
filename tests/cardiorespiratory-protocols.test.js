const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const outDir = path.join(os.tmpdir(), "indigo-cardiorespiratory-tests");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", [
  "tsc",
  "services/cardiorespiratory-protocols.ts",
  "--target",
  "ES2020",
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--skipLibCheck",
  "--outDir",
  outDir,
], { cwd: root, stdio: "inherit" });

const compiledPath = [
  path.join(outDir, "cardiorespiratory-protocols.js"),
  path.join(outDir, "services", "cardiorespiratory-protocols.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled cardiorespiratory-protocols.js not found.");

const {
  CARDIO_PROTOCOL_CATALOG,
  CARDIO_PROTOCOL_CATEGORIES,
  calculateCardioProtocolSnapshot,
  createCardioExecution,
  generateCardioStages,
} = require(compiledPath);

const closeTo = (actual, expected, tolerance = 0.05) => {
  assert.equal(typeof actual, "number");
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
};

const externalExecution = (protocolId, external, overrides = {}) => ({
  ...createCardioExecution(protocolId, 0),
  status: "concluido",
  external,
  ...overrides,
});

const conconiExecution = (protocolId, heartRates, overrides = {}) => {
  const execution = createCardioExecution(protocolId, 0);
  execution.status = "concluido";
  execution.config = { ...execution.config, ...(overrides.config ?? {}) };
  execution.stages = generateCardioStages(protocolId, execution.config, heartRates.length).map((stage, index) => ({
    ...stage,
    heartRateEnd: heartRates[index],
  }));
  return { ...execution, ...overrides, config: execution.config, stages: execution.stages };
};

test("catálogo cardiorrespiratório cobre categorias, protocolos e versões", () => {
  assert.deepEqual(
    CARDIO_PROTOCOL_CATALOG.map((protocol) => protocol.id),
    [
      "cooper-12min",
      "run-2400m",
      "rockport-1mile",
      "six-minute-walk",
      "conconi-treadmill",
      "conconi-bike",
      "custom-cardio",
    ]
  );
  assert.deepEqual(
    CARDIO_PROTOCOL_CATEGORIES.map((category) => category.id),
    ["externos", "esteira", "bicicleta", "submaximos", "limiar", "personalizado"]
  );
  assert.ok(CARDIO_PROTOCOL_CATALOG.every((protocol) => protocol.version && protocol.formulaVersion && protocol.reference));
});

test("Cooper de 12 minutos estima VO2máx por distância", () => {
  const snapshot = calculateCardioProtocolSnapshot(externalExecution("cooper-12min", { distanceMeters: 2450 }));
  closeTo(snapshot.vo2MaxEstimate, 43.5);
  assert.equal(snapshot.primaryResult.label, "VO₂máx estimado");
});

test("corrida de 2.400 m estima VO2máx por tempo", () => {
  const snapshot = calculateCardioProtocolSnapshot(externalExecution("run-2400m", { timeMinutes: 12 }));
  closeTo(snapshot.vo2MaxEstimate, 43.8);
});

test("Rockport usa idade, sexo, peso e FC final", () => {
  const snapshot = calculateCardioProtocolSnapshot(
    externalExecution("rockport-1mile", { timeMinutes: 14, heartRateEnd: 150 }),
    { ageYears: 30, sex: "male", weightKg: 80 }
  );
  closeTo(snapshot.vo2MaxEstimate, 44.8);
});

test("Rockport valida dados contextuais necessários para a fórmula", () => {
  const snapshot = calculateCardioProtocolSnapshot(
    externalExecution("rockport-1mile", { timeMinutes: 14, heartRateEnd: 150 })
  );
  assert.equal(snapshot.validation.isSavable, false);
  assert.ok(snapshot.validation.errors.some((error) => error.includes("Peso")));
});

test("caminhada de 6 minutos registra capacidade sem converter automaticamente para VO2máx", () => {
  const snapshot = calculateCardioProtocolSnapshot(externalExecution("six-minute-walk", { distanceMeters: 620 }));
  assert.equal(snapshot.vo2MaxEstimate, undefined);
  assert.equal(snapshot.primaryResult.label, "Distância em 6 min");
  assert.equal(snapshot.primaryResult.value, 620);
});

test("geração de estágios Conconi em esteira mantém progressão de velocidade", () => {
  const execution = createCardioExecution("conconi-treadmill", 0);
  const stages = generateCardioStages("conconi-treadmill", execution.config, 4);
  assert.deepEqual(stages.map((stage) => stage.speedKmh), [8, 8.5, 9, 9.5]);
  assert.ok(stages.every((stage) => stage.inclinePercent === 1 && stage.valid === true));
});

test("Conconi em esteira identifica deflexão quando a curva sustenta a análise", () => {
  const execution = conconiExecution("conconi-treadmill", [118, 127, 136, 145, 154, 160, 164, 167, 169, 170]);
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.match(snapshot.conconi.status, /deflexao_(identificada|possivel)/);
  assert.equal(snapshot.primaryResult.type, "ponto_deflexao_fc");
  assert.notEqual(snapshot.primaryResult.unit, "ml/kg/min");
});

test("Conconi em bicicleta usa watts quando disponíveis", () => {
  const execution = conconiExecution("conconi-bike", [108, 118, 128, 138, 148, 154, 158, 161, 163, 164]);
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.match(snapshot.conconi.status, /deflexao_(identificada|possivel)/);
  assert.equal(snapshot.conconi.loadUnit, "w");
});

test("curva linear sem quebra retorna inconclusivo", () => {
  const execution = conconiExecution("conconi-treadmill", [120, 128, 136, 144, 152, 160, 168, 176]);
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.equal(snapshot.conconi.status, "inconclusivo");
  assert.equal(snapshot.primaryResult, undefined);
});

test("poucos estágios válidos retornam dados insuficientes", () => {
  const execution = conconiExecution("conconi-treadmill", [120, 130, 140, 150, 158]);
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.equal(snapshot.conconi.status, "dados_insuficientes");
  assert.ok(snapshot.validation.warnings.some((warning) => warning.includes("pelo menos 6 estágios")));
});

test("estágio inválido é preservado e excluído dos cálculos consolidados", () => {
  const execution = conconiExecution("conconi-treadmill", [118, 127, 136, 145, 154, 160, 230, 164, 167, 169, 170]);
  execution.stages[6].valid = false;
  execution.stages[6].invalidReason = "Perda de leitura cardíaca";
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.equal(snapshot.graphPoints.length, 10);
  assert.equal(snapshot.maxHeartRateObserved < 230, true);
  assert.equal(snapshot.stages[6].invalidReason, "Perda de leitura cardíaca");
});

test("teste interrompido não apresenta limiar como resultado válido", () => {
  const execution = conconiExecution("conconi-bike", [108, 118, 128, 138, 148, 154, 158, 161]);
  execution.status = "interrompido";
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.equal(snapshot.conconi.status, "teste_interrompido");
  assert.equal(snapshot.primaryResult, undefined);
  assert.ok(snapshot.validation.warnings.some((warning) => warning.includes("interrompido")));
});

test("recuperação calcula queda de FC em 1 minuto", () => {
  const execution = externalExecution("cooper-12min", { distanceMeters: 2400 });
  execution.recovery = { immediateBpm: 182, after1MinBpm: 154 };
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.equal(snapshot.recoveryDrop1Min, 28);
});

test("modo sensor sem amostras orienta entrada manual como alternativa", () => {
  const execution = conconiExecution("conconi-treadmill", [118, 127, 136, 145, 154, 160, 164, 167]);
  execution.config.heartRateCaptureMode = "sensor";
  execution.heartRateSamples = [];
  const snapshot = calculateCardioProtocolSnapshot(execution);
  assert.ok(snapshot.validation.warnings.some((warning) => warning.includes("Use entrada manual")));
});

test("comparação histórica exige mesmo protocolo, versão, ambiente e unidade", () => {
  const previous = calculateCardioProtocolSnapshot(externalExecution("cooper-12min", { distanceMeters: 2300 }));
  const current = calculateCardioProtocolSnapshot(externalExecution("six-minute-walk", { distanceMeters: 650 }), {}, previous);
  assert.equal(current.comparison.comparable, false);
  assert.match(current.comparison.message, /limitações/i);
});
