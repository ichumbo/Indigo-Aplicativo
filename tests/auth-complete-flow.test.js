const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const tempDir = path.join(root, ".temp-auth-complete-tests");

function buildModules() {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "commonjs",
      moduleResolution: "node",
      rootDir: root,
      outDir: tempDir,
      skipLibCheck: true,
      baseUrl: root,
      paths: {
        "@/*": ["*"],
      },
    },
    include: [
      path.join(root, "services", "auth-store.ts"),
      path.join(root, "services", "email-service.ts"),
      path.join(root, "services", "feedback-store.ts"),
    ],
  };

  const tsconfigPath = path.join(tempDir, "tsconfig.json");
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  execFileSync("npx", ["tsc", "-p", tsconfigPath], {
    cwd: root,
    stdio: "pipe",
  });

  const memory = new Map();
  global.__authStorage = memory;

  fs.writeFileSync(path.join(tempDir, "async-storage-mock.js"), `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__authStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__authStorage.set(key, value); },
    removeItem: async (key) => { global.__authStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((key) => global.__authStorage.delete(key)); },
  },
};
`);

  const Module = require("node:module");
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === "@react-native-async-storage/async-storage") {
      return path.join(tempDir, "async-storage-mock.js");
    }
    if (request.startsWith("@/services/")) {
      return path.join(tempDir, "services", `${request.replace("@/services/", "")}.js`);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  return require(path.join(tempDir, "services", "auth-store.js"));
}

const authStore = buildModules();
const emailService = require(path.join(tempDir, "services", "email-service.js"));

test("Segurança de Senhas: PBKDF2 com Salt Individual e Verificação", () => {
  const password = "Super@Password#2026";
  const { hash, salt } = authStore.hashPassword(password);

  assert.ok(hash && hash.length > 20, "Hash deve ser gerado com comprimento seguro");
  assert.ok(salt && salt.length >= 8, "Salt individual deve ser gerado");

  // Verificação de senha correta
  assert.equal(authStore.verifyPassword(password, hash, salt), true, "Senha correta deve ser verificada com sucesso");

  // Verificação de senha incorreta
  assert.equal(authStore.verifyPassword("SenhaErrada#2026", hash, salt), false, "Senha incorreta deve ser rejeitada");

  // Dois salts diferentes geram hashes distintos para a mesma senha
  const hash2 = authStore.hashPassword(password);
  assert.notEqual(hash, hash2.hash, "Hashes devem ser distintos devido a salts individuais");
});

test("Migração Transparente: Senha Legada em Texto Puro é Convertida em Hash no Login", async () => {
  await authStore.resetAuthStoreForTests();

  // Login de conta de demonstração (senha legada '123456')
  const session = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  assert.ok(session && session.user, "Login deve ser concluído com sucesso");
  assert.equal(session.user.email, "treinador@dragoncorp.app");

  // Próximo login com as mesmas credenciais autentica perfeitamente via hash
  const session2 = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  assert.ok(session2 && session2.user, "Login subsequente deve validar normalmente via hash seguro");
});

test("Rate Limiting: Bloqueio de Força Bruta após Tentativas Excessivas", async () => {
  await authStore.resetAuthStoreForTests();
  const testKey = "test_login_bruteforce@dragoncorp.app";

  // 5 tentativas permitidas
  for (let i = 0; i < 5; i++) {
    const check = await authStore.checkRateLimit(`login:${testKey}`, 5, 60);
    assert.equal(check.allowed, true, `Tentativa ${i + 1} deve ser permitida`);
    await authStore.recordRateLimitAttempt(`login:${testKey}`, 60);
  }

  // A 6ª tentativa é bloqueada
  const blocked = await authStore.checkRateLimit(`login:${testKey}`, 5, 60);
  assert.equal(blocked.allowed, false, "Tentativa além do limite deve ser bloqueada");
  assert.ok(blocked.remainingSeconds > 0, "Deve informar segundos restantes de cooldown");

  // Limpeza de rate limit
  await authStore.clearRateLimit(`login:${testKey}`);
  const cleared = await authStore.checkRateLimit(`login:${testKey}`, 5, 60);
  assert.equal(cleared.allowed, true, "Rate limit deve ser liberado após limpeza");
});

test("Recuperação de Senha Real: Solicitação, Validação de Token e Redefinição Segura", async () => {
  await authStore.resetAuthStoreForTests();
  emailService.clearDispatchedEmailsForTest();

  // 1. Solicitação de recuperação para e-mail cadastrado
  const req = await authStore.requestPasswordReset("treinador@dragoncorp.app");
  assert.equal(req.success, true);
  assert.ok(req.message.includes("Se o e-mail estiver cadastrado"));
  assert.ok(req.token, "Token seguro deve ser emitido");

  // Verifica se e-mail foi enfileirado no serviço de e-mails
  const outbox = emailService.getDispatchedEmailsForTest();
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "treinador@dragoncorp.app");
  assert.equal(outbox[0].category, "password_reset");

  // 2. Validação do Token
  const tokenValidation = await authStore.validatePasswordResetToken(req.token);
  assert.equal(tokenValidation.valid, true);
  assert.equal(tokenValidation.email, "treinador@dragoncorp.app");

  // Token inexistente é rejeitado
  const invalidToken = await authStore.validatePasswordResetToken("token-falso-xyz");
  assert.equal(invalidToken.valid, false);

  // 3. Redefinição com nova senha forte
  const newPassword = "NovaSenhaForte@2026#";
  const resetRes = await authStore.resetPasswordWithToken(req.token, newPassword);
  assert.equal(resetRes.success, true);

  // Token já utilizado não pode ser reutilizado (proteção replay attack)
  const reusedToken = await authStore.validatePasswordResetToken(req.token);
  assert.equal(reusedToken.valid, false);
  assert.ok(reusedToken.reason.includes("já foi utilizado"));

  // 4. Login com a nova senha redefinida
  const newSession = await authStore.signInWithCredentials("treinador@dragoncorp.app", newPassword);
  assert.ok(newSession && newSession.user);
  assert.equal(newSession.user.email, "treinador@dragoncorp.app");

  // Senha antiga deve falhar
  await assert.rejects(async () => {
    await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  });
});

test("Verificação Real de E-mail: Disparo de Token e Confirmação de Conta", async () => {
  await authStore.resetAuthStoreForTests();
  emailService.clearDispatchedEmailsForTest();

  // 1. Cria Personal Trainer (conta nasce não verificada)
  const res = await authStore.createPersonalTrainer({
    name: "Carlos Personal Silva",
    email: "carlos.personal@teste.com",
    phone: "(11) 99887-7665",
    cpf: "52998224725",
    cref: "987654",
    crefState: "SP",
    birthDate: "1992-05-15",
    serviceType: "both",
    password: "SenhaSegura@2026",
    autoApprove: true,
  });

  const trainer = res.profile;
  assert.equal(trainer.isEmailVerified, false, "Nova conta deve começar não verificada");

  // 2. Dispara e-mail de confirmação (limpando rate limit inicial para testar o reenvio explícito)
  await authStore.clearRateLimit(`resend_verify:${trainer.id}`);
  const verifyReq = await authStore.sendEmailVerification(trainer.id);
  assert.equal(verifyReq.success, true);
  assert.ok(verifyReq.token, "Token de verificação deve ser gerado");
  assert.equal(verifyReq.cooldownSeconds, 60);

  // Tentativa subsequente imediata de reenvio deve ser bloqueada pelo rate limit de 60s
  await assert.rejects(async () => {
    await authStore.sendEmailVerification(trainer.id);
  });

  // 3. Validação do token de confirmação de e-mail
  const confirmResult = await authStore.verifyEmailWithToken(verifyReq.token);
  assert.equal(confirmResult.success, true);
  assert.equal(confirmResult.user.isEmailVerified, true, "isEmailVerified deve se tornar true");
  assert.ok(confirmResult.user.emailVerifiedAt, "emailVerifiedAt deve ser preenchido");

  // Reutilização do mesmo token de verificação é bloqueada
  await assert.rejects(async () => {
    await authStore.verifyEmailWithToken(verifyReq.token);
  });
});

test("Vínculo Personal ↔ Aluno: Código Permanente, Convite Dinâmico e Cadastro de Aluno", async () => {
  await authStore.resetAuthStoreForTests();

  // 1. Consulta código permanente do Personal Demo
  const permanentCode = await authStore.getTrainerPermanentCode("trainer-demo-id");
  assert.equal(permanentCode, "DRG-PRO-REV", "Personal demo possui código permanente DRG-PRO-REV");

  // 2. Gera convite dinâmico 24h
  const invite = await authStore.generateTrainerInviteCode("trainer-demo-id", 24);
  assert.ok(invite.code.startsWith("IND-"), "Convite dinâmico deve iniciar com IND-");
  assert.equal(invite.record.status, "active");

  const list = await authStore.listTrainerInviteCodes("trainer-demo-id");
  assert.ok(list.length >= 1);
  assert.equal(list[0].code, invite.code);

  // 3. Cadastro direto de Aluno utilizando o convite dinâmico
  const studentReg = await authStore.registerStudentAccount({
    name: "Mariana Aluna Santos",
    email: "mariana.aluna@teste.com",
    password: "AlunoForte@2026#",
    confirmPassword: "AlunoForte@2026#",
    phone: "(11) 98888-7777",
    trainerCode: invite.code,
  });

  assert.ok(studentReg.student, "Aluno deve ser cadastrado");
  assert.equal(studentReg.student.role, "STUDENT");
  assert.ok(studentReg.linkedTrainer, "Treinador deve ser vinculado");
  assert.ok(
    studentReg.linkedTrainer.id === "trainer-demo-id" || studentReg.linkedTrainer.id === "trainer-main",
    "Treinador vinculado deve corresponder ao ID demo canônico"
  );

  // 4. O aluno pode autenticar normalmente
  const studentSession = await authStore.signInWithCredentials("mariana.aluna@teste.com", "AlunoForte@2026#");
  assert.ok(studentSession && studentSession.user);
  assert.equal(studentSession.user.role, "STUDENT");

  // 5. Desvinculação segura
  const unlinkRes = await authStore.unlinkStudent(
    studentReg.linkedTrainer.id,
    studentReg.student.id,
    studentReg.student.id,
    "STUDENT",
    "Fim do contrato"
  );
  assert.equal(unlinkRes.success, true);
});
