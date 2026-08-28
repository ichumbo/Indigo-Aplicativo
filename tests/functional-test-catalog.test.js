const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const outDir = path.join(os.tmpdir(), "dragoncorp-functional-tests");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", [
  "tsc",
  "services/functional-test-catalog.ts",
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
  path.join(outDir, "functional-test-catalog.js"),
  path.join(outDir, "services", "functional-test-catalog.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled functional-test-catalog.js not found.");

const {
  FUNCTIONAL_TEST_CATALOG,
  buildFunctionalBatteryFromTemplate,
  calculateFunctionalTestSnapshot,
  createCustomFunctionalDefinition,
  createCustomFunctionalExecution,
  createFunctionalExecution,
  validateFunctionalScreening,
} = require(compiledPath);

const attempt = (value, invalid = false) => ({ value, invalid });

test("catálogo cobre categorias profissionais e é versionado", () => {
  const categories = new Set(FUNCTIONAL_TEST_CATALOG.map((item) => item.category));
  ["flexibilidade", "mobilidade", "controle_motor", "movimento_funcional", "equilibrio", "estabilidade", "resistencia_muscular", "forca", "potencia", "agilidade", "idosos", "equipamentos"].forEach((category) => {
    assert.equal(categories.has(category), true);
  });
  assert.ok(FUNCTIONAL_TEST_CATALOG.every((item) => item.version && item.reference && item.interpretation));
});

test("seleção de bateria gera execuções ordenadas", () => {
  const battery = buildFunctionalBatteryFromTemplate("geral", 2);
  assert.equal(battery.length > 1, true);
  assert.equal(battery[0].order, 2);
  assert.equal(battery[0].status, "rascunho");
});

test("cadastro de teste personalizado não recebe classificação científica automática", () => {
  const definition = createCustomFunctionalDefinition({ name: "Teste próprio", category: "personalizado", unit: "cm" });
  const execution = createCustomFunctionalExecution(definition, 0);
  execution.status = "concluido";
  execution.fields.result = { attempts: [attempt(12), attempt(15), attempt(14)] };
  const snapshot = calculateFunctionalTestSnapshot(execution);

  assert.equal(snapshot.testName, "Teste próprio");
  assert.equal(snapshot.primaryResult.value, 15);
  assert.match(snapshot.interpretation, /sem classificação científica/i);
});

test("testes bilaterais calculam assimetria sem diagnóstico", () => {
  const execution = createFunctionalExecution("ankle-dorsiflexion-wall", 0);
  execution.status = "concluido";
  execution.fields.distanceCm = {
    right: [attempt(12), attempt(13), attempt(12.5)],
    left: [attempt(9), attempt(10), attempt(9.5)],
  };
  execution.fields.validExecution = { value: true };
  const snapshot = calculateFunctionalTestSnapshot(execution);

  assert.equal(snapshot.asymmetry.absoluteDifference, 3);
  assert.equal(snapshot.asymmetry.largerSide, "direito");
  assert.match(snapshot.asymmetry.formula, /diferença absoluta/i);
  assert.doesNotMatch(snapshot.interpretation, /diagnóstico positivo|lesão detectada/i);
});

test("tentativas inválidas são preservadas e ignoradas no melhor resultado", () => {
  const execution = createFunctionalExecution("vertical-jump", 0);
  execution.status = "concluido";
  execution.fields.heightCm = { attempts: [attempt(40), attempt(52, true), attempt(45)] };
  execution.fields.validExecution = { value: true };
  const snapshot = calculateFunctionalTestSnapshot(execution);

  assert.equal(snapshot.primaryResult.value, 45);
  assert.equal(snapshot.rawFields.heightCm.attempts[1].invalid, true);
});

test("estimativa de 1RM usa Epley e mantém referência", () => {
  const execution = createFunctionalExecution("estimated-1rm", 0);
  execution.status = "concluido";
  execution.fields.loadKg = { attempts: [attempt(100)] };
  execution.fields.validReps = { attempts: [attempt(6)] };
  execution.fields.exercise = { value: "Supino" };
  execution.fields.validExecution = { value: true };
  const snapshot = calculateFunctionalTestSnapshot(execution);

  assert.equal(snapshot.estimatedOneRmKg, 120);
  assert.match(snapshot.reference, /Epley/i);
});

test("triagem bloqueia continuidade automática com sinal de alerta", () => {
  const result = validateFunctionalScreening({
    readinessStatus: "apto",
    consentAccepted: true,
    parqReviewed: true,
    cardiovascularSymptoms: true,
  });
  assert.equal(result.canProceed, false);
  assert.ok(result.alerts.some((alert) => alert.includes("cardiovasculares")));
});

test("interrupção por dor gera sinal de atenção", () => {
  const execution = createFunctionalExecution("plank", 0);
  execution.status = "interrompido";
  execution.interruptionReason = "Dor aguda";
  execution.pain = { present: true, location: "lombar" };
  execution.fields.timeSec = { attempts: [attempt(20)] };
  execution.fields.validExecution = { value: false };
  const snapshot = calculateFunctionalTestSnapshot(execution);

  assert.ok(snapshot.attentionFlags.some((flag) => flag.includes("interrompido")));
  assert.ok(snapshot.attentionFlags.some((flag) => flag.includes("Desconforto")));
});

test("teste incompleto não é salvável", () => {
  const execution = createFunctionalExecution("push-up", 0);
  execution.status = "concluido";
  const snapshot = calculateFunctionalTestSnapshot(execution);
  assert.equal(snapshot.validation.isSavable, false);
  assert.ok(snapshot.validation.errors.some((error) => error.includes("Repetições válidas")));
});

test("comparação histórica só é direta com mesmo teste e versão", () => {
  const previous = createFunctionalExecution("push-up", 0);
  previous.status = "concluido";
  previous.fields.validReps = { attempts: [attempt(20)] };
  previous.fields.validExecution = { value: true };
  const previousSnapshot = calculateFunctionalTestSnapshot(previous);

  const current = createFunctionalExecution("push-up", 0);
  current.status = "concluido";
  current.fields.validReps = { attempts: [attempt(25)] };
  current.fields.validExecution = { value: true };
  const currentSnapshot = calculateFunctionalTestSnapshot(current, previousSnapshot);

  assert.equal(currentSnapshot.comparison.comparable, true);
  assert.equal(currentSnapshot.comparison.delta, 5);

  const different = createFunctionalExecution("plank", 0);
  different.status = "concluido";
  different.fields.timeSec = { attempts: [attempt(40)] };
  different.fields.validExecution = { value: true };
  const differentSnapshot = calculateFunctionalTestSnapshot(different, previousSnapshot);
  assert.equal(differentSnapshot.comparison.comparable, false);
});

test("equipamento fica preservado na execução", () => {
  const execution = createFunctionalExecution("handgrip-dynamometry", 0);
  execution.equipment = { type: "dinamômetro", manufacturer: "Jamar", model: "Plus+", serialNumber: "abc" };
  assert.equal(execution.equipment.model, "Plus+");
});
