const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-trainer-creates-student-tests");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const tsconfigPath = path.join(outDir, "tsconfig.json");
fs.writeFileSync(
  tsconfigPath,
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        moduleResolution: "node",
        skipLibCheck: true,
        outDir,
        baseUrl: root,
        paths: {
          "@/*": ["./*"],
        },
      },
      files: [path.join(root, "services", "auth-store.ts")],
    },
    null,
    2
  )
);

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], {
  cwd: root,
  stdio: "pipe",
});

process.env.NODE_PATH = path.join(root, "node_modules");
Module._initPaths();

const memory = new Map();
const originalResolve = Module._resolveFilename;
fs.writeFileSync(path.join(outDir, "async-storage-mock.js"), `
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
global.__authStorage = memory;

const compiledPath = [
  path.join(outDir, "auth-store.js"),
  path.join(outDir, "services", "auth-store.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled auth-store.js not found.");

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "@react-native-async-storage/async-storage") {
    return path.join(outDir, "async-storage-mock.js");
  }
  if (request.startsWith("@/services/")) {
    const sub = request.replace("@/services/", "");
    return [
      path.join(outDir, `${sub}.js`),
      path.join(outDir, "services", `${sub}.js`),
    ].find((c) => fs.existsSync(c)) || originalResolve.call(this, request, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

const authStore = require(compiledPath);

test("Fluxo de Criação de Aluno pelo Personal Trainer no auth-store", async () => {
  await authStore.resetAuthStoreForTests();

  // 1. Personal Trainer faz login
  const trainerSession = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  assert.equal(trainerSession.user.role, "TRAINER");
  const trainerId = trainerSession.user.id;

  // 2. Personal cadastra aluno dentro do perfil com senha customizada ou padrão
  const studentResult = await authStore.createStudentUserByTrainer({
    trainerId,
    name: "Carlos Aluno Novo",
    email: "carlos.aluno@teste.com",
    phone: "(11) 97777-6666",
    cpf: "123.456.789-00",
    password: "MinhaSenha@2026",
  });

  assert.ok(studentResult.student, "Aluno deve ser criado com sucesso");
  assert.equal(studentResult.student.name, "Carlos Aluno Novo");
  assert.equal(studentResult.student.role, "STUDENT");
  assert.equal(studentResult.student.status, "ACTIVE");
  assert.equal(studentResult.tempPassword, "MinhaSenha@2026");

  // 3. A sessão do Personal Trainer NÃO foi deslogada
  const currentSession = await authStore.getCurrentSession();
  assert.ok(currentSession);
  assert.equal(currentSession.user.id, trainerId, "Sessão ativa deve permanecer a do Personal Trainer");

  // 4. O Aluno consegue autenticar com seu e-mail e a senha definida pelo personal
  const studentLogin = await authStore.signInWithCredentials("carlos.aluno@teste.com", "MinhaSenha@2026");
  assert.ok(studentLogin && studentLogin.user);
  assert.equal(studentLogin.user.role, "STUDENT");
  assert.equal(studentLogin.user.name, "Carlos Aluno Novo");

  // 5. O Aluno consegue autenticar também pelo CPF
  const studentCpfLogin = await authStore.signInWithCredentials("12345678900", "MinhaSenha@2026");
  assert.ok(studentCpfLogin && studentCpfLogin.user);
  assert.equal(studentCpfLogin.user.id, studentResult.student.id);

  // 6. Personal redefine a senha do aluno
  const resetRes = await authStore.resetStudentPasswordByTrainer(trainerId, studentResult.student.id, "NovaSenha@999");
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.newPassword, "NovaSenha@999");

  // 7. Aluno autentica com a nova senha redefinida
  const studentAfterReset = await authStore.signInWithCredentials("carlos.aluno@teste.com", "NovaSenha@999");
  assert.ok(studentAfterReset);
});

test("Tela de Login: Ausência de cadastro autônomo de aluno e presença de CTA para Personal", () => {
  const loginPath = path.resolve(root, "app/login.tsx");
  const content = fs.readFileSync(loginPath, "utf-8");

  // Não deve conter o botão ou modal de "Criar Conta de Aluno"
  assert.equal(content.includes("Criar Conta de Aluno"), false, "Tela de login não deve conter 'Criar Conta de Aluno'");
  assert.equal(content.includes("Tenho código de personal"), false, "Tela de login não deve conter checkbox de código");

  // Deve conter o CTA destacado de Personal Trainer e o informativo para alunos
  assert.ok(content.includes("Sou Personal Trainer"), "Deve conter botão para Personal Trainer");
  assert.ok(content.includes("trainer-onboarding"), "Deve direcionar para o onboarding de treinador");
  assert.ok(content.includes("Acesso para Alunos"), "Deve conter informativo esclarecendo o acesso para alunos");
});

test("Perfil do Professor: Suporte a credenciais e compartilhamento de acesso do aluno", () => {
  const profilePath = path.resolve(root, "app/(tabs)/profile.tsx");
  const content = fs.readFileSync(profilePath, "utf-8");

  assert.ok(content.includes("createStudentUserByTrainer"), "Perfil deve invocar criação de usuário do aluno");
  assert.ok(content.includes("StudentCreatedCredentialsModal"), "Deve exibir modal de credenciais do aluno");
  assert.ok(content.includes("handleShareStudentAccess"), "Deve conter ação para compartilhar acesso no WhatsApp");
  assert.ok(content.includes("handleResetStudentPassword"), "Deve conter ação para redefinir senha do aluno");
});
