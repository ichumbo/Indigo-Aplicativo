const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-prepub-tests");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const tsconfigPath = path.join(outDir, "tsconfig.json");
fs.writeFileSync(tsconfigPath, JSON.stringify({
  compilerOptions: {
    target: "ES2020",
    module: "commonjs",
    moduleResolution: "node",
    skipLibCheck: true,
    outDir,
    rootDir: root,
    baseUrl: root,
    paths: {
      "@/*": ["./*"],
    },
  },
  files: [
    path.join(root, "services", "auth-store.ts"),
    path.join(root, "services", "minor-consent-service.ts"),
    path.join(root, "services", "cref-verification-service.ts"),
    path.join(root, "services", "support-service.ts"),
    path.join(root, "services", "data-export-service.ts"),
  ],
}, null, 2));

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], {
  cwd: root,
  stdio: "inherit",
});

const memory = new Map();
const mockAsyncStorage = {
  getItem: async (key) => memory.get(key) ?? null,
  setItem: async (key, val) => {
    memory.set(key, String(val));
  },
  removeItem: async (key) => {
    memory.delete(key);
  },
  clear: async () => {
    memory.clear();
  },
};
mockAsyncStorage.default = mockAsyncStorage;

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "@react-native-async-storage/async-storage") {
    return "__mock_async_storage__";
  }
  if (request.startsWith("@/")) {
    const rel = request.replace(/^@\//, "");
    const candidateJs = path.join(outDir, `${rel}.js`);
    if (fs.existsSync(candidateJs)) return candidateJs;
    return path.join(outDir, rel);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

require.cache["__mock_async_storage__"] = {
  id: "__mock_async_storage__",
  filename: "__mock_async_storage__",
  loaded: true,
  exports: mockAsyncStorage,
};

const {
  isStudentMinor,
  validateGuardianData,
  saveGuardianConsent,
  getGuardianConsent,
  revokeGuardianConsent,
} = require(path.join(outDir, "services", "minor-consent-service.js"));

const {
  isCrefStatusActiveAndVerified,
  getCrefStatusPresentation,
} = require(path.join(outDir, "services", "cref-verification-service.js"));

const {
  generateProtocolNumber,
  FAQ_CATALOG,
  createSupportTicket,
  getUserSupportTickets,
} = require(path.join(outDir, "services", "support-service.js"));

test("FASE 3 — Idade Mínima e Menores: Cálculo de Idade e Detecção de Menor", () => {
  const refDate = new Date("2026-08-28T12:00:00Z");

  // Aluno com 18 anos exatos
  const adult18 = isStudentMinor("2008-08-28", refDate);
  assert.strictEqual(adult18.isMinor, false, "Completou 18 anos hoje não é menor");
  assert.strictEqual(adult18.age, 18);

  // Aluno com 17 anos e 364 dias
  const minor17 = isStudentMinor("2008-08-29", refDate);
  assert.strictEqual(minor17.isMinor, true, "17 anos e 364 dias deve ser considerado menor de idade");
  assert.strictEqual(minor17.age, 17);

  // Aluno com 14 anos
  const minor14 = isStudentMinor("15/05/2012", refDate);
  assert.strictEqual(minor14.isMinor, true);
  assert.strictEqual(minor14.age, 14);

  // Formato compacto YYYYMMDD
  const minorCompact = isStudentMinor("20100101", refDate);
  assert.strictEqual(minorCompact.isMinor, true);
  assert.strictEqual(minorCompact.age, 16);
});

test("FASE 3 — Validação de Dados Obrigatórios do Responsável Legal", () => {
  const valid = validateGuardianData({
    guardianName: "Roberto Carlos Silva",
    guardianRelationship: "pai",
    guardianCpf: "111.444.777-35",
    guardianPhone: "(11) 98888-7777",
    guardianEmail: "roberto.responsavel@exemplo.com",
  });
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.errors.length, 0);

  const invalid = validateGuardianData({
    guardianName: "Al",
    guardianRelationship: "pai",
    guardianCpf: "00000000000",
    guardianPhone: "",
  });
  assert.strictEqual(invalid.valid, false);
  assert.ok(invalid.errors.length >= 3);
});

test("FASE 3 — Registro e Revogação de Consentimento de Menor", async () => {
  const consent = await saveGuardianConsent({
    studentId: "student_minor_01",
    studentName: "Guilherme Santos",
    studentBirthDate: "2010-03-10",
    studentAge: 16,
    guardianName: "Mariana Santos",
    guardianRelationship: "mae",
    guardianCpf: "111.444.777-35",
    guardianPhone: "(11) 99999-8888",
    guardianEmail: "mariana@exemplo.com",
    verifiedContact: true,
    consentDocumentVersion: "1.0",
    consentedAt: new Date().toISOString(),
    allowPhysicalAssessments: true,
    allowProgressPhotos: false,
    allowDietaryTracking: true,
    recordedByTrainerId: "trainer_01",
  });

  assert.strictEqual(consent.isRevoked, false);
  assert.strictEqual(consent.allowPhysicalAssessments, true);
  assert.strictEqual(consent.allowProgressPhotos, false);

  const fetched = await getGuardianConsent("student_minor_01");
  assert.ok(fetched);
  assert.strictEqual(fetched.guardianName, "Mariana Santos");

  const revoked = await revokeGuardianConsent("student_minor_01", "mariana@exemplo.com", "Solicitação do responsável legal.");
  assert.strictEqual(revoked.isRevoked, true);
  assert.strictEqual(revoked.revocationReason, "Solicitação do responsável legal.");
});

test("FASE 5 — Verificação de CREF: Máquina de Estados e Apresentação", () => {
  assert.strictEqual(isCrefStatusActiveAndVerified("verified_manual"), true);
  assert.strictEqual(isCrefStatusActiveAndVerified("verified_integration"), true);

  assert.strictEqual(isCrefStatusActiveAndVerified("not_provided"), false);
  assert.strictEqual(isCrefStatusActiveAndVerified("unverified"), false);
  assert.strictEqual(isCrefStatusActiveAndVerified("pending_review"), false);
  assert.strictEqual(isCrefStatusActiveAndVerified("rejected"), false);
  assert.strictEqual(isCrefStatusActiveAndVerified("expired"), false);
  assert.strictEqual(isCrefStatusActiveAndVerified("suspended"), false);
  assert.strictEqual(isCrefStatusActiveAndVerified("update_required"), false);

  const manualPres = getCrefStatusPresentation("verified_manual");
  assert.strictEqual(manualPres.showVerifiedBadge, true);
  assert.strictEqual(manualPres.color, "#10B981");

  const pendingPres = getCrefStatusPresentation("pending_review");
  assert.strictEqual(pendingPres.showVerifiedBadge, false);
  assert.strictEqual(pendingPres.color, "#F59E0B");

  const rejectedPres = getCrefStatusPresentation("rejected");
  assert.strictEqual(rejectedPres.showVerifiedBadge, false);
  assert.strictEqual(rejectedPres.color, "#EF4444");
});

test("FASE 9 — Central de Suporte: Protocolos, FAQs e Abertura de Tickets", async () => {
  const protocol = generateProtocolNumber();
  assert.ok(/^DGC-\d{8}-\d{4}$/.test(protocol), "Protocolo deve seguir padrão DGC-YYYYMMDD-XXXX");

  assert.ok(FAQ_CATALOG.length >= 4, "Catálogo de FAQs deve conter tópicos fundamentais");
  const categories = FAQ_CATALOG.map((f) => f.category);
  assert.ok(categories.includes("assinatura"));
  assert.ok(categories.includes("privacidade"));
  assert.ok(categories.includes("avaliacao"));

  const ticket = await createSupportTicket({
    userId: "user_test_100",
    userName: "João da Silva",
    userEmail: "joao@exemplo.com",
    category: "assinatura",
    subject: "Dúvida sobre renovação do plano",
    description: "Gostaria de confirmar quando ocorre a renovação da assinatura anual.",
  });

  assert.ok(ticket.id.startsWith("ticket_"));
  assert.ok(ticket.protocolNumber.startsWith("DGC-"));
  assert.strictEqual(ticket.status, "aberto");

  const userTickets = await getUserSupportTickets("user_test_100");
  assert.strictEqual(userTickets.length, 1);
  assert.strictEqual(userTickets[0].subject, "Dúvida sobre renovação do plano");
});

test("FASE 10 — Páginas Públicas Estáticas: Existência e Conformidade de Diretrizes", () => {
  const publicDir = path.resolve(__dirname, "../public");

  const privacyHtml = fs.readFileSync(path.join(publicDir, "privacy-policy.html"), "utf-8");
  assert.ok(privacyHtml.includes("LGPD"), "Política de privacidade deve citar LGPD");
  assert.ok(privacyHtml.includes("privacidade@dragoncorp.app"), "Deve conter e-mail oficial do DPO");

  const termsHtml = fs.readFileSync(path.join(publicDir, "terms-of-use.html"), "utf-8");
  assert.ok(termsHtml.includes("AVISO IMPORTANTE DE SAÚDE"), "Termos devem conter aviso de saúde");
  assert.ok(termsHtml.includes("SAMU (192)"), "Termos devem conter emergência");

  const supportHtml = fs.readFileSync(path.join(publicDir, "support.html"), "utf-8");
  assert.ok(supportHtml.includes("suporte@dragoncorp.app"), "Suporte deve conter e-mail de atendimento");

  const deletionHtml = fs.readFileSync(path.join(publicDir, "account-deletion.html"), "utf-8");
  assert.ok(deletionHtml.includes("Solicitação de Exclusão Definitiva"), "Deve conter formulário público de exclusão");

  const healthHtml = fs.readFileSync(path.join(publicDir, "health-disclaimer.html"), "utf-8");
  assert.ok(healthHtml.includes("não constituem diagnóstico médico"), "Disclaimer de saúde deve declarar ausência de diagnóstico");
});
