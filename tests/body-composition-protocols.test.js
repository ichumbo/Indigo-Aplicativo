const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const outDir = path.join(os.tmpdir(), "indigo-body-composition-tests");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", [
  "tsc",
  "services/body-composition-protocols.ts",
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
  path.join(outDir, "body-composition-protocols.js"),
  path.join(outDir, "services", "body-composition-protocols.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled body-composition-protocols.js not found.");

const {
  PROTOCOL_CATALOG,
  calculateCompositionProtocol,
  classifyAdultBmi,
  consolidateSkinfoldMeasurement,
  parseDecimalInput,
} = require(compiledPath);

const closeTo = (actual, expected, tolerance = 0.05) => {
  assert.equal(typeof actual, "number");
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
};

const siri = (density) => 495 / density - 450;
const measurement = (value) => ({
  attempts: [{ valueMm: value }, { valueMm: value }, { valueMm: value }],
});
const input = (protocolId, sex, fields, overrides = {}) => ({
  protocolId,
  sex,
  ageYears: overrides.ageYears ?? 30,
  weightKg: overrides.weightKg ?? 80,
  heightCm: overrides.heightCm ?? 180,
  targetBodyFatPercent: overrides.targetBodyFatPercent,
  measurements: {
    skinfolds: Object.fromEntries(Object.entries(fields.skinfolds ?? {}).map(([key, value]) => [key, measurement(value)])),
    girthsCm: fields.girthsCm,
    bioimpedance: fields.bioimpedance,
  },
});

test("catálogo expõe protocolos versionados", () => {
  assert.deepEqual(
    PROTOCOL_CATALOG.map((protocol) => protocol.id),
    ["jackson-pollock-3", "jackson-pollock-7", "guedes-3", "faulkner-4", "weltman-obesity", "bioimpedance"]
  );
  assert.ok(PROTOCOL_CATALOG.every((protocol) => protocol.version && protocol.formulaVersion && protocol.reference));
});

test("Jackson & Pollock 3 dobras masculino", () => {
  const sum = 10 + 20 + 15;
  const density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * 30;
  const result = calculateCompositionProtocol(input("jackson-pollock-3", "male", {
    skinfolds: { chest: 10, abdominal: 20, thigh: 15 },
  }));

  closeTo(result.intermediate.skinfoldSumMm, sum);
  closeTo(result.intermediate.bodyDensity, density, 0.00001);
  closeTo(result.results.bodyFatPercent, Math.round(siri(density) * 10) / 10);
});

test("Jackson & Pollock 3 dobras feminino usa pontos específicos", () => {
  const sum = 18 + 20 + 25;
  const density = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * 28;
  const result = calculateCompositionProtocol(input("jackson-pollock-3", "female", {
    skinfolds: { triceps: 18, suprailiac: 20, thigh: 25 },
  }, { ageYears: 28, weightKg: 62, heightCm: 166 }));

  assert.deepEqual(result.requiredFields.map((field) => field.id), ["triceps", "suprailiac", "thigh"]);
  closeTo(result.results.bodyFatPercent, Math.round(siri(density) * 10) / 10);
});

test("Jackson & Pollock 7 dobras masculino", () => {
  const values = { chest: 10, midaxillary: 12, triceps: 11, subscapular: 14, abdominal: 20, suprailiac: 13, thigh: 15 };
  const sum = Object.values(values).reduce((total, value) => total + value, 0);
  const density = 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * 35;
  const result = calculateCompositionProtocol(input("jackson-pollock-7", "male", { skinfolds: values }, { ageYears: 35 }));

  closeTo(result.intermediate.skinfoldSumMm, sum);
  closeTo(result.results.bodyFatPercent, Math.round(siri(density) * 10) / 10);
});

test("Jackson & Pollock 7 dobras feminino", () => {
  const values = { chest: 12, midaxillary: 14, triceps: 16, subscapular: 18, abdominal: 22, suprailiac: 20, thigh: 24 };
  const sum = Object.values(values).reduce((total, value) => total + value, 0);
  const density = 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * 32;
  const result = calculateCompositionProtocol(input("jackson-pollock-7", "female", { skinfolds: values }, { ageYears: 32, weightKg: 68, heightCm: 168 }));

  closeTo(result.results.bodyFatPercent, Math.round(siri(density) * 10) / 10);
});

test("Guedes masculino", () => {
  const sum = 12 + 14 + 18;
  const density = 1.17136 - 0.06706 * Math.log10(sum);
  const result = calculateCompositionProtocol(input("guedes-3", "male", {
    skinfolds: { triceps: 12, suprailiac: 14, abdominal: 18 },
  }, { ageYears: 24 }));

  assert.deepEqual(result.requiredFields.map((field) => field.id), ["triceps", "suprailiac", "abdominal"]);
  closeTo(result.results.bodyFatPercent, Math.round(siri(density) * 10) / 10);
});

test("Guedes feminino", () => {
  const sum = 18 + 16 + 24;
  const density = 1.1665 - 0.07063 * Math.log10(sum);
  const result = calculateCompositionProtocol(input("guedes-3", "female", {
    skinfolds: { subscapular: 18, suprailiac: 16, thigh: 24 },
  }, { ageYears: 22, weightKg: 60, heightCm: 164 }));

  assert.deepEqual(result.requiredFields.map((field) => field.id), ["subscapular", "suprailiac", "thigh"]);
  closeTo(result.results.bodyFatPercent, Math.round(siri(density) * 10) / 10);
});

test("Faulkner 4 dobras calcula percentual direto", () => {
  const sum = 12 + 14 + 16 + 18;
  const expected = 5.783 + 0.153 * sum;
  const result = calculateCompositionProtocol(input("faulkner-4", "male", {
    skinfolds: { triceps: 12, subscapular: 14, suprailiac: 16, abdominal: 18 },
  }));

  assert.equal(result.intermediate.bodyDensity, undefined);
  closeTo(result.results.bodyFatPercent, Math.round(expected * 10) / 10);
});

test("Weltman masculino não usa dobras cutâneas", () => {
  const expected = 0.31457 * 110 - 0.10969 * 100 + 10.8336;
  const result = calculateCompositionProtocol(input("weltman-obesity", "male", {
    girthsCm: { abdomenMeanCm: 110 },
  }, { weightKg: 100, heightCm: 175, ageYears: 45 }));

  assert.deepEqual(result.requiredFields.map((field) => field.id), ["abdomenMeanCm"]);
  closeTo(result.results.bodyFatPercent, Math.round(expected * 10) / 10);
});

test("Weltman feminino usa abdome, altura e peso", () => {
  const expected = 0.11077 * 115 - 0.17666 * 165 + 0.14354 * 98 + 51.03301;
  const result = calculateCompositionProtocol(input("weltman-obesity", "female", {
    girthsCm: { abdomenMeanCm: 115 },
  }, { weightKg: 98, heightCm: 165, ageYears: 42 }));

  closeTo(result.results.bodyFatPercent, Math.round(expected * 10) / 10);
});

test("Bioimpedância aceita resultado real do equipamento e deriva massas quando necessário", () => {
  const result = calculateCompositionProtocol(input("bioimpedance", "female", {
    bioimpedance: {
      manufacturer: "InBody",
      model: "770",
      bodyFatPercent: 28.4,
      muscleMassKg: 24.2,
    },
  }, { weightKg: 70, heightCm: 170 }));

  closeTo(result.results.bodyFatPercent, 28.4);
  closeTo(result.results.fatMassKg, 19.9);
  closeTo(result.results.leanMassKg, 50.1);
});

test("IMC, massas e peso-alvo usam fórmulas derivadas transparentes", () => {
  const result = calculateCompositionProtocol(input("faulkner-4", "male", {
    skinfolds: { triceps: 10, subscapular: 10, suprailiac: 10, abdominal: 10 },
  }, { weightKg: 80, heightCm: 180, targetBodyFatPercent: 12 }));

  closeTo(result.results.bmi, 24.7);
  assert.equal(classifyAdultBmi(result.results.bmi, 30), "Eutrofia");
  closeTo(result.results.fatMassKg, 9.5);
  closeTo(result.results.leanMassKg, 70.5);
  closeTo(result.results.targetWeightKg, 80.1);
});

test("consolidação preserva aferições e alerta variação acima da tolerância", () => {
  const consolidated = consolidateSkinfoldMeasurement({
    attempts: [{ valueMm: 10 }, { valueMm: 13 }, { valueMm: 11, invalid: true }],
  });
  assert.equal(consolidated.value, 11.5);
  assert.equal(consolidated.spread, 3);

  const result = calculateCompositionProtocol(input("guedes-3", "male", {
    skinfolds: {
      triceps: 12,
      suprailiac: 14,
      abdominal: 18,
    },
  }));
  assert.equal(result.consolidatedMeasurements[0].attempts.length, 3);
});

test("valida campos ausentes e valores inválidos", () => {
  const missing = calculateCompositionProtocol({ protocolId: "jackson-pollock-3", sex: "male", ageYears: 30, measurements: {} });
  assert.equal(missing.validation.isCalculable, false);
  assert.ok(missing.validation.errors.some((error) => error.includes("Peso")));
  assert.ok(missing.validation.errors.some((error) => error.includes("Peitoral")));

  const invalid = calculateCompositionProtocol(input("jackson-pollock-3", "male", {
    skinfolds: { chest: -1, abdominal: 20, thigh: 15 },
  }));
  assert.equal(invalid.validation.isCalculable, false);
});

test("aceita vírgula e ponto decimal", () => {
  assert.equal(parseDecimalInput("12,5"), 12.5);
  assert.equal(parseDecimalInput("12.5"), 12.5);
  assert.equal(parseDecimalInput(""), undefined);
});

test("comparação sinaliza troca de protocolo e compara quando equivalente", () => {
  const previous = calculateCompositionProtocol(input("faulkner-4", "male", {
    skinfolds: { triceps: 10, subscapular: 10, suprailiac: 10, abdominal: 10 },
  }));
  const same = calculateCompositionProtocol(input("faulkner-4", "male", {
    skinfolds: { triceps: 12, subscapular: 12, suprailiac: 12, abdominal: 12 },
  }), previous);
  assert.equal(same.results.differenceFromPrevious.comparable, true);

  const different = calculateCompositionProtocol(input("weltman-obesity", "male", {
    girthsCm: { abdomenMeanCm: 110 },
  }, { weightKg: 100, heightCm: 175 }), previous);
  assert.equal(different.results.differenceFromPrevious.comparable, false);
});
