const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-auth-store-tests");
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
    baseUrl: root,
    paths: {
      "@/*": ["./*"],
    },
  },
  files: [path.join(root, "services", "auth-store.ts")],
}, null, 2));

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
    return path.join(outDir, `${request.replace("@/services/", "")}.js`);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

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

const {
  authorizeAccess,
  canAccessRoute,
  getHomeRouteForRole,
  getCurrentSession,
  hasRolePermission,
  normalizeRoutePath,
  resetAuthStoreForTests,
  signInWithCredentials,
  signOut,
} = require(compiledPath);

test("login unico direciona treinador e aluno para areas proprias", async () => {
  await resetAuthStoreForTests();
  const trainer = await signInWithCredentials("treinador@dragoncorp.app", "123456");
  assert.equal(trainer.user.role, "TRAINER");
  assert.equal(getHomeRouteForRole(trainer.user.role), "/(tabs)");

  await signOut();
  const student = await signInWithCredentials("aluno@dragoncorp.app", "123456");
  assert.equal(student.user.role, "STUDENT");
  assert.equal(getHomeRouteForRole(student.user.role), "/student");
});

test("sessao persistente e logout removem dados sensiveis locais", async () => {
  await resetAuthStoreForTests();
  const session = await signInWithCredentials("aluno@dragoncorp.app", "123456");
  assert.equal((await getCurrentSession()).user.id, session.user.id);

  await signOut();
  assert.equal(await getCurrentSession(), null);
});

test("matriz bloqueia aluno em rota administrativa e permite rotas do aluno", async () => {
  await resetAuthStoreForTests();
  const session = await signInWithCredentials("aluno@dragoncorp.app", "123456");

  assert.equal(canAccessRoute(session, "/admin"), false);
  assert.equal(normalizeRoutePath("/(tabs)/training"), "/training");
  assert.equal(canAccessRoute(session, "/student"), true);
  assert.equal(canAccessRoute(session, "/(tabs)/training"), true);
  assert.equal(canAccessRoute(session, "/training"), true);
});

test("aluno acessa apenas seus proprios dados", async () => {
  await resetAuthStoreForTests();
  const session = await signInWithCredentials("aluno@dragoncorp.app", "123456");

  assert.equal(hasRolePermission("STUDENT", "student_profile.edit"), false);
  assert.equal(authorizeAccess({
    session,
    permission: "training.view_released",
    targetStudentId: session.user.id,
  }).allowed, true);
  assert.equal(authorizeAccess({
    session,
    permission: "training.view_released",
    targetStudentId: "student-other",
  }).allowed, false);
});

test("treinador precisa de vinculo utilizavel para acessar aluno", async () => {
  await resetAuthStoreForTests();
  const session = await signInWithCredentials("treinador@dragoncorp.app", "123456");
  const relationships = [{
    id: "rel",
    trainerId: session.user.id,
    studentId: "student-linked",
    status: "ACTIVE",
  }];

  assert.equal(authorizeAccess({
    session,
    permission: "student_profile.view",
    targetStudentId: "student-linked",
  }, relationships).allowed, true);
  assert.equal(authorizeAccess({
    session,
    permission: "student_profile.view",
    targetStudentId: "student-other",
  }, relationships).allowed, false);
});
