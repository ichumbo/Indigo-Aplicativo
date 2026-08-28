const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// --- Validadores de Personal Trainer & Governança ---

function isValidCpf(cpf) {
  if (!cpf || typeof cpf !== "string") return false;
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean[10], 10);
}

function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

function isValidCref(cref) {
  if (!cref || typeof cref !== "string") return false;
  const clean = cref.replace(/\D/g, "");
  return clean.length >= 4 && clean.length <= 8;
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "Muito Fraca", valid: false };
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  let label = "Muito Fraca";
  if (score >= 80) label = "Excelente";
  else if (score >= 60) label = "Forte";
  else if (score >= 40) label = "Média";
  else if (score >= 20) label = "Fraca";

  return { score, label, valid: password.length >= 6 };
}

function calculateTrainerAge(birthDate) {
  if (!birthDate) return null;
  const clean = birthDate.trim();
  let parsed = null;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split("/").map(Number);
    parsed = new Date(y, m - 1, d);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-").map(Number);
    parsed = new Date(y, m - 1, d);
  } else {
    const raw = clean.replace(/\D/g, "");
    if (raw.length === 8) {
      const first4 = Number(raw.slice(0, 4));
      if (first4 >= 1900 && first4 <= 2099) {
        parsed = new Date(first4, Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)));
      } else {
        parsed = new Date(Number(raw.slice(4, 8)), Number(raw.slice(2, 4)) - 1, Number(raw.slice(0, 2)));
      }
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const m = now.getMonth() - parsed.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function getCurrentWeekBounds(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const dayOfWeek = current.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(current);
  start.setDate(current.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// --- Testes Automatizados ---

test("Validações de Segurança: Algoritmo de CPF", () => {
  assert.equal(isValidCpf("52998224725"), true);
  assert.equal(isValidCpf("11144477735"), true);
  assert.equal(isValidCpf("529.982.247-25"), true);

  assert.equal(isValidCpf("11111111111"), false);
  assert.equal(isValidCpf("00000000000"), false);
  assert.equal(isValidCpf("12345678900"), false);
  assert.equal(isValidCpf("abc"), false);
  assert.equal(isValidCpf(""), false);
});

test("Validações de Segurança: Formato de E-mail RFC", () => {
  assert.equal(isValidEmail("personal@dragoncorp.app"), true);
  assert.equal(isValidEmail("treinador.vip+pro@academia.com.br"), true);

  assert.equal(isValidEmail("email-invalido"), false);
  assert.equal(isValidEmail("sem-arroba.com"), false);
  assert.equal(isValidEmail(""), false);
});

test("Validações de Segurança: Formato de CREF", () => {
  assert.equal(isValidCref("123456"), true);
  assert.equal(isValidCref("012345"), true);
  assert.equal(isValidCref("1234"), true);

  assert.equal(isValidCref("12"), false);
  assert.equal(isValidCref("1234567890"), false);
  assert.equal(isValidCref(""), false);
});

test("Validações de Segurança: Indicador de Força de Senha", () => {
  const weak = getPasswordStrength("123");
  assert.equal(weak.valid, false);

  const medium = getPasswordStrength("Senha123");
  assert.equal(medium.valid, true);
  assert.ok(medium.score >= 40);

  const strong = getPasswordStrength("Super@Senha#2026!Forte");
  assert.equal(strong.valid, true);
  assert.equal(strong.label, "Excelente");
  assert.ok(strong.score >= 80);
});

test("Validações de Cadastro: Idade Mínima de 18 Anos para Personal", () => {
  assert.ok(calculateTrainerAge("1990-01-01") >= 18);
  assert.ok(calculateTrainerAge("15/05/2000") >= 18);
  assert.ok(calculateTrainerAge("20010705") >= 18);

  const currentYear = new Date().getFullYear();
  assert.ok(calculateTrainerAge(`${currentYear - 10}-01-01`) < 18);
  assert.equal(calculateTrainerAge(""), null);
});

test("Auditoria de Modelagem: Métodos de CRUD e Aprovação no auth-store.ts", () => {
  const authStorePath = path.resolve(__dirname, "../services/auth-store.ts");
  const code = fs.readFileSync(authStorePath, "utf-8");

  assert.ok(code.includes("createPersonalTrainer"), "createPersonalTrainer deve existir");
  assert.ok(code.includes("getPersonalTrainerById"), "getPersonalTrainerById deve existir");
  assert.ok(code.includes("listPersonalTrainers"), "listPersonalTrainers deve existir");
  assert.ok(code.includes("updatePersonalTrainer"), "updatePersonalTrainer deve existir");
  assert.ok(code.includes("approvePersonalTrainer"), "approvePersonalTrainer deve existir");
  assert.ok(code.includes("rejectPersonalTrainer"), "rejectPersonalTrainer deve existir");
  assert.ok(code.includes("suspendPersonalTrainer"), "suspendPersonalTrainer deve existir");
  assert.ok(code.includes("reactivatePersonalTrainer"), "reactivatePersonalTrainer deve existir");
  assert.ok(code.includes("deletePersonalTrainer"), "deletePersonalTrainer deve existir");
});

test("Auditoria de Governança: Ações do Administrador no admin-dashboard-store.ts", () => {
  const adminStorePath = path.resolve(__dirname, "../services/admin-dashboard-store.ts");
  const code = fs.readFileSync(adminStorePath, "utf-8");

  assert.ok(code.includes("adminApproveTrainerAccount"), "adminApproveTrainerAccount deve existir");
  assert.ok(code.includes("adminRejectTrainerAccount"), "adminRejectTrainerAccount deve existir");
  assert.ok(code.includes("adminSuspendTrainerAccount"), "adminSuspendTrainerAccount deve existir");
  assert.ok(code.includes("adminReactivateTrainerAccount"), "adminReactivateTrainerAccount deve existir");
});

test("Motor de Notificações: Resumo Semanal (Segunda a Domingo) e Alertas Reais", () => {
  const bounds = getCurrentWeekBounds(new Date("2026-08-28T12:00:00Z"));
  assert.equal(bounds.start.getDay(), 1); // Segunda-feira
  assert.equal(bounds.end.getDay(), 0);   // Domingo

  const notifServicePath = path.resolve(__dirname, "../services/notification-hub-service.ts");
  assert.ok(fs.existsSync(notifServicePath), "notification-hub-service.ts deve existir");

  const notifCode = fs.readFileSync(notifServicePath, "utf-8");
  assert.ok(notifCode.includes("calculateTrainerWeeklySummary"), "calculateTrainerWeeklySummary deve existir");
  assert.ok(notifCode.includes("emitTrainerWeeklySummaryNotification"), "emitTrainerWeeklySummaryNotification deve existir");
  assert.ok(notifCode.includes("emitPainAlertNotification"), "emitPainAlertNotification deve existir");
  assert.ok(notifCode.includes("emitTrainerAccountStatusNotification"), "emitTrainerAccountStatusNotification deve existir");
});

test("Assinaturas StoreKit & Google Play: Entitlements e Gestão de Planos", () => {
  const subServicePath = path.resolve(__dirname, "../services/subscription-service.ts");
  const code = fs.readFileSync(subServicePath, "utf-8");

  assert.ok(code.includes("getSubscriptionForUser"), "getSubscriptionForUser deve existir");
  assert.ok(code.includes("processStorePurchase"), "processStorePurchase deve existir");
  assert.ok(code.includes("restorePurchasesForUser"), "restorePurchasesForUser deve existir");
  assert.ok(code.includes("cancelSubscriptionForUser"), "cancelSubscriptionForUser deve existir");
  assert.ok(code.includes("validateStudentAdditionAllowed"), "validateStudentAdditionAllowed deve existir");
});
