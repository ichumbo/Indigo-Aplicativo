const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-rbac-tests-" + Date.now());
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
      files: [
        path.join(root, "services", "auth-store.ts"),
        path.join(root, "services", "student-profile-store.ts"),
        path.join(root, "services", "training-plan-store.ts"),
      ],
    },
    null,
    2
  )
);

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], {
  cwd: root,
  stdio: "inherit",
});

process.env.NODE_PATH = path.join(root, "node_modules");
Module._initPaths();

const memory = new Map();
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "@react-native-async-storage/async-storage") {
    return path.join(outDir, "async-storage-mock.js");
  }
  if (request.startsWith("@/services/")) {
    const filename = `${request.replace("@/services/", "")}.js`;
    const candidate1 = path.join(outDir, filename);
    const candidate2 = path.join(outDir, "services", filename);
    if (fs.existsSync(candidate1)) return candidate1;
    if (fs.existsSync(candidate2)) return candidate2;
    return candidate1;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__authStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__authStorage.set(key, value); },
    removeItem: async (key) => { global.__authStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((key) => global.__authStorage.delete(key)); },
    clear: async () => { global.__authStorage.clear(); },
  },
};
`
);
global.__authStorage = memory;

function findCompiled(file) {
  const c1 = path.join(outDir, file);
  const c2 = path.join(outDir, "services", file);
  if (fs.existsSync(c1)) return c1;
  if (fs.existsSync(c2)) return c2;
  throw new Error(`Compiled file ${file} not found in ${outDir}`);
}

const authStore = require(findCompiled("auth-store.js"));
const studentProfileStore = require(findCompiled("student-profile-store.js"));
const trainingPlanStore = require(findCompiled("training-plan-store.js"));

test.beforeEach(async () => {
  global.__authStorage.clear();
  await authStore.resetAuthStoreForTests();
  await studentProfileStore.resetStudentProfileStoreForTests();
  await trainingPlanStore.resetTrainingPlanStoreForTests();
});

// ============================================================================
// 17 CENÁRIOS OBRIGATÓRIOS DE CONTROLE DE ACESSO, PERMISSÕES E PERFIS (SEÇÃO 14)
// ============================================================================

test("1. Aluno acessa somente suas próprias rotas", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  assert.equal(studentSession.user.role, "STUDENT");

  assert.equal(authStore.canAccessRoute(studentSession, "/student"), true);
  assert.equal(authStore.canAccessRoute(studentSession, "/training"), true);
  assert.equal(authStore.canAccessRoute(studentSession, "/evolution"), true);
  assert.equal(authStore.canAccessRoute(studentSession, "/messages"), true);
  assert.equal(authStore.canAccessRoute(studentSession, "/account-profile"), true);
  assert.equal(authStore.canAccessRoute(studentSession, "/profile"), true);
  assert.equal(authStore.canAccessRoute(studentSession, "/notifications"), true);
});

test("2. Aluno é bloqueado ao tentar acessar rota administrativa ou de personal", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");

  assert.equal(authStore.canAccessRoute(studentSession, "/admin"), false);
  assert.equal(authStore.canAccessRoute(studentSession, "/admin-dashboard"), false);
  assert.equal(authStore.canAccessRoute(studentSession, "/trainer-agenda"), false);
  assert.equal(authStore.canAccessRoute(studentSession, "/trainer-reassessments"), false);
  assert.equal(authStore.canAccessRoute(studentSession, "/trainer-workout-templates"), false);
  assert.equal(authStore.canAccessRoute(studentSession, "/subscription"), false);
  assert.equal(authStore.canAccessRoute(studentSession, "/trainer-onboarding"), false);
});

test("3. Aluno não visualiza opções de assinatura PRO, criação de treinos ou gestão de alunos", () => {
  assert.equal(authStore.hasRolePermission("STUDENT", "subscriptions.manage"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "subscriptions.view"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "training.create"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "training.edit"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "student.create"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "students.list"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "branding.manage"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "admin.tools.access"), false);
});

test("4. Aluno consegue atualizar seu nome e telefone", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  const studentId = studentSession.user.id;

  const updatedUser = await authStore.updateUserProfile(studentId, {
    name: "Carlos Eduardo Silva",
    phone: "(11) 98765-4321",
  });

  assert.ok(updatedUser);
  assert.equal(updatedUser.name, "Carlos Eduardo Silva");
  assert.equal(updatedUser.phone, "(11) 98765-4321");

  const refreshedSession = await authStore.getCurrentSession();
  assert.equal(refreshedSession?.user.name, "Carlos Eduardo Silva");
  assert.equal(refreshedSession?.user.phone, "(11) 98765-4321");
});

test("5. Aluno consegue fazer upload, alterar e remover foto de perfil (avatar)", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  const studentId = studentSession.user.id;

  // 1. Upload / salvar avatar
  const userWithPhoto = await authStore.updateUserProfile(studentId, {
    avatar: "file:///local/storage/avatar-carlos.jpg",
  });
  assert.equal(userWithPhoto?.avatar, "file:///local/storage/avatar-carlos.jpg");

  let session = await authStore.getCurrentSession();
  assert.equal(session?.user.avatar, "file:///local/storage/avatar-carlos.jpg");

  // 2. Remover foto
  const userWithoutPhoto = await authStore.updateUserProfile(studentId, {
    avatar: undefined,
  });
  assert.equal(userWithoutPhoto?.avatar, undefined);

  session = await authStore.getCurrentSession();
  assert.equal(session?.user.avatar, undefined);
});

test("6. Foto de perfil do aluno persiste após logout e novo login", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  const studentId = studentSession.user.id;

  await authStore.updateUserProfile(studentId, {
    avatar: "file:///data/user/0/app/avatar-persistent.png",
  });

  // Logout
  await authStore.signOut("Teste de persistência");
  const loggedOutSession = await authStore.getCurrentSession();
  assert.equal(loggedOutSession, null);

  // Novo login
  const newSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  assert.equal(newSession.user.avatar, "file:///data/user/0/app/avatar-persistent.png");
});

test("7. Aluno consegue alterar sua própria senha com validação da senha atual", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  const studentId = studentSession.user.id;

  // Tentativa com senha atual errada deve falhar
  await assert.rejects(
    async () => {
      await authStore.changeUserPassword(studentId, "senhaErrada123", "novaSenhaSegura456");
    },
    /Senha atual incorreta/i
  );

  // Tentativa com nova senha muito curta deve falhar
  await assert.rejects(
    async () => {
      await authStore.changeUserPassword(studentId, "123456", "123");
    },
    /pelo menos 6 caracteres/i
  );

  // Sucesso na alteração
  const result = await authStore.changeUserPassword(studentId, "123456", "novaSenhaSegura456");
  assert.equal(result.success, true);

  // Validação: login com senha antiga falha, com senha nova passa
  await assert.rejects(
    async () => {
      await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
    },
    /Credenciais invalidas/i
  );

  const loginWithNew = await authStore.signInWithCredentials("aluno@dragoncorp.app", "novaSenhaSegura456");
  assert.equal(loginWithNew.user.id, studentId);
});

test("8. Aluno NÃO consegue alterar campos administrativos (notas do personal, status da conta)", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  const studentId = studentSession.user.id;

  const profile = await studentProfileStore.getStudentProfile(studentId, studentId, "student");
  const originalNotes = profile.registration.administrativeNotes;

  // Aluno tenta alterar administrativeNotes no cadastro
  const updated = await studentProfileStore.saveStudentRegistration(
    studentId,
    {
      ...profile.registration,
      administrativeNotes: "Tentativa de injeção de nota administrativa pelo aluno",
    },
    studentId,
    "student"
  );

  assert.equal(updated.registration.administrativeNotes, originalNotes);

  // Aluno tenta alterar seu próprio status
  await assert.rejects(
    async () => {
      await studentProfileStore.updateStudentStatus(studentId, "encerrado", studentId, "student");
    },
    /permissão para alterar o status/i
  );
});

test("9. Aluno visualiza apenas treinos prescritos pelo seu personal", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  const studentId = studentSession.user.id;

  const trainerSession = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  const trainerId = trainerSession.user.id;

  const created = await trainingPlanStore.createTrainingSession(
    {
      planId: "plan-elite",
      name: "Treino A - Hipertrofia",
      objective: "Hipertrofia",
      muscleGroups: ["Peitoral", "Tríceps"],
      level: "intermediario",
      estimatedDurationMinutes: 60,
      recommendedDays: ["Segunda", "Quinta"],
      publishMode: "now",
      exercises: [
        {
          id: "ex-supino",
          name: "Supino Reto com Barra",
          type: "main",
          muscleGroup: "Peitoral",
          order: 1,
          plannedSets: 4,
          plannedReps: 10,
          plannedLoad: 70,
          loadUnit: "kg",
          unilateral: false,
          warmupSet: false,
          validSet: true,
        },
      ],
    },
    trainerId
  );

  assert.equal(trainingPlanStore.hasSessionPermission(created.session, studentId, "student"), true);

  const foreignSession = {
    ...created.session,
    id: "foreign-session-xyz",
    studentId: "other-student-999",
    trainerId: "other-trainer-888",
  };

  assert.equal(trainingPlanStore.hasSessionPermission(foreignSession, studentId, "student"), false);
});

test("10. Aluno não consegue editar estrutura de treinos (apenas registrar execução e cargas)", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  const studentId = studentSession.user.id;

  assert.equal(authStore.hasRolePermission("STUDENT", "training.create"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "training.edit"), false);
  assert.equal(authStore.hasRolePermission("STUDENT", "training.record_sets"), true);

  // Tentativa de criar sessão pelo aluno deve ser bloqueada
  await assert.rejects(
    async () => {
      await trainingPlanStore.createTrainingSession(
        {
          planId: "plan-elite",
          name: "Treino Não Autorizado",
          objective: "Teste",
          muscleGroups: ["Pernas"],
          level: "iniciante",
          estimatedDurationMinutes: 45,
          recommendedDays: ["Terça"],
        },
        studentId
      );
    },
    /permissao para criar sessoes/i
  );

  // Iniciar execução e salvar cargas é permitido ao aluno
  const execution = await trainingPlanStore.startTrainingExecution("session-elite-a", studentId);
  assert.ok(execution);

  const updatedExecution = await trainingPlanStore.saveTrainingExecutionSets(
    execution.id,
    [
      {
        exerciseId: "supino-reto",
        exerciseName: "Supino Reto com Barra",
        plannedSetIndex: 1,
        executedLoad: 80,
        loadUnit: "kg",
        executedReps: 10,
        completed: true,
        warmup: false,
        validForProgression: true,
      },
    ],
    studentId
  );

  assert.equal(updatedExecution.sets.length, 1);
  assert.equal(updatedExecution.sets[0].executedLoad, 80);
});

test("11. Aluno não consegue acessar dados de outros alunos (tentativa de IDOR)", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");

  const foreignStudentId = "student-vitima-idor";

  const authCheck = authStore.authorizeAccess({
    session: studentSession,
    permission: "student_profile.view",
    targetStudentId: foreignStudentId,
  });
  assert.equal(authCheck.allowed, false);

  await assert.rejects(
    async () => {
      await studentProfileStore.getStudentProfile(foreignStudentId, studentSession.user.id, "student");
    },
    /permissao para acessar este perfil|nao encontrado/i
  );
});

test("12. Personal visualiza apenas seus próprios alunos vinculados", async () => {
  const trainerSession = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  const trainerId = trainerSession.user.id;

  const profiles = await studentProfileStore.listStudentProfilesForTrainer(trainerId, trainerId, "trainer");
  assert.ok(profiles.length > 0);

  profiles.forEach((p) => {
    assert.equal(p.trainerId, trainerId);
  });
});

test("13. Personal não consegue acessar ou modificar alunos de outro personal", async () => {
  const trainerSessionA = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  const trainerIdA = trainerSessionA.user.id;

  const trainerIdB = "trainer-outro-concorrente";
  const studentOfB = await studentProfileStore.createStudentProfile(
    {
      trainerId: trainerIdB,
      fullName: "Aluno Exclusivo do Personal B",
      birthDate: "1995-05-15",
      gender: "female",
      mainGoal: "Condicionamento",
    },
    trainerIdB,
    "trainer"
  );

  await assert.rejects(
    async () => {
      await studentProfileStore.getStudentProfile(studentOfB.id, trainerIdA, "trainer");
    },
    /permissao para acessar este perfil/i
  );

  await assert.rejects(
    async () => {
      await studentProfileStore.saveStudentRegistration(
        studentOfB.id,
        {
          ...studentOfB.registration,
          fullName: "Nome Alterado Maliciosamente",
        },
        trainerIdA,
        "trainer"
      );
    },
    /permissao para acessar este perfil/i
  );
});

test("14. Personal consegue criar credenciais de acesso para novo aluno", async () => {
  const trainerSession = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  const trainerId = trainerSession.user.id;

  const result = await authStore.createStudentUserByTrainer({
    trainerId,
    name: "Mariana Souza",
    email: "mariana.souza@teste.com",
    password: "senhaSegura123",
    phone: "(11) 97777-6666",
  });

  assert.equal(result.created, true);
  assert.equal(result.student.name, "Mariana Souza");
  assert.equal(result.student.email, "mariana.souza@teste.com");
  assert.equal(result.student.role, "STUDENT");

  const newStudentSession = await authStore.signInWithCredentials("mariana.souza@teste.com", "senhaSegura123");
  assert.equal(newStudentSession.user.name, "Mariana Souza");
  assert.equal(newStudentSession.user.role, "STUDENT");
});

test("15. Personal consegue redefinir senha e revogar acesso de aluno vinculado", async () => {
  const trainerSession = await authStore.signInWithCredentials("treinador@dragoncorp.app", "123456");
  const trainerId = trainerSession.user.id;

  const studentAccount = await authStore.getAuthUserById("student-joao");
  assert.ok(studentAccount);

  const resetRes = await authStore.resetStudentPasswordByTrainer(trainerId, "student-joao", "tempPass999");
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.newPassword, "tempPass999");

  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "tempPass999");
  assert.equal(studentSession.user.id, "student-joao");

  const updatedProfile = await studentProfileStore.revokeStudentSessions("student-joao", trainerId);
  assert.ok(updatedProfile.access.sessionsRevokedAt);

  await assert.rejects(
    async () => {
      await authStore.resetStudentPasswordByTrainer("trainer-invasor", "student-joao", "hack123456");
    },
    /apenas|próprios alunos|vínculo ativo/i
  );
});

test("16. Personal tem acesso a todas as 9 seções da ficha do aluno", () => {
  const sections = authStore.getTrainerStudentFileSections();
  assert.equal(sections.length, 9);

  const sectionIds = sections.map((s) => s.id);
  assert.deepEqual(sectionIds, [
    "overview",
    "profile",
    "workouts",
    "assessments",
    "evolution",
    "protocols",
    "agenda",
    "history",
    "access",
  ]);

  sections.forEach((s) => {
    assert.ok(s.label && s.label.length > 0);
    assert.ok(s.icon && s.icon.length > 0);
  });
});

test("17. Logout revoga a sessão e bloqueia acesso a rotas protegidas", async () => {
  const studentSession = await authStore.signInWithCredentials("aluno@dragoncorp.app", "123456");
  assert.ok(studentSession);

  await authStore.signOut("Encerramento seguro de sessão");

  const current = await authStore.getCurrentSession();
  assert.equal(current, null);

  assert.equal(authStore.canAccessRoute(null, "/student"), false);
  assert.equal(authStore.canAccessRoute(null, "/training"), false);
  assert.equal(authStore.canAccessRoute(null, "/profile"), false);
  assert.equal(authStore.canAccessRoute(null, "/admin-dashboard"), false);

  assert.equal(authStore.canAccessRoute(null, "/login"), true);
  assert.equal(authStore.canAccessRoute(null, "/privacy-policy"), true);
  assert.equal(authStore.canAccessRoute(null, "/terms-of-use"), true);
});
