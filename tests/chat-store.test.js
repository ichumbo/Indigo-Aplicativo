const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "indigo-chat-store-tests");
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
        path.join(root, "services", "feedback-store.ts"),
        path.join(root, "services", "chat-store.ts"),
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
    const filename = request.replace("@/services/", "");
    const candidates = [
      path.join(outDir, `${filename}.js`),
      path.join(outDir, "services", `${filename}.js`),
    ];
    const found = candidates.find((c) => fs.existsSync(c));
    if (found) return found;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__chatStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__chatStorage.set(key, value); },
    removeItem: async (key) => { global.__chatStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((key) => global.__chatStorage.delete(key)); },
  },
};
`
);
global.__chatStorage = memory;

const compiledPath = [
  path.join(outDir, "chat-store.js"),
  path.join(outDir, "services", "chat-store.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled chat-store.js not found.");

const {
  getOrCreateConversation,
  listMessages,
  listConversationsForTrainer,
  sendChatMessage,
  markConversationAsRead,
  getUnreadChatCountForUser,
  sendTrainerAnnouncement,
  resetChatStoreForTests,
  getConversationId,
} = require(compiledPath);

test("chat-store: getOrCreateConversation and listMessages", async () => {
  await resetChatStoreForTests();

  const conv = await getOrCreateConversation("trainer-1", "student-1", "Personal Teste", "Aluno Teste");
  assert.ok(conv);
  assert.equal(conv.id, getConversationId("trainer-1", "student-1"));

  const messages = await listMessages(conv.id);
  assert.ok(Array.isArray(messages));
});

test("chat-store: student sends message to trainer", async () => {
  await resetChatStoreForTests();

  const studentMsg = await sendChatMessage({
    senderId: "student-joao",
    senderName: "Joao Silva",
    senderRole: "STUDENT",
    receiverId: "trainer-main",
    receiverName: "Personal Indigo",
    receiverRole: "TRAINER",
    text: "Professor, posso trocar o exercício de agachamento?",
    tag: "duvida",
  });

  assert.equal(studentMsg.text, "Professor, posso trocar o exercício de agachamento?");
  assert.equal(studentMsg.tag, "duvida");
  assert.equal(studentMsg.senderRole, "STUDENT");

  const unreadForTrainer = await getUnreadChatCountForUser("trainer-main", "TRAINER");
  assert.ok(unreadForTrainer >= 1);
});

test("chat-store: trainer replies and marks conversation as read", async () => {
  await resetChatStoreForTests();

  const convId = getConversationId("trainer-main", "student-joao");

  await sendChatMessage({
    conversationId: convId,
    senderId: "student-joao",
    senderName: "Joao Silva",
    senderRole: "STUDENT",
    receiverId: "trainer-main",
    receiverName: "Personal Indigo",
    receiverRole: "TRAINER",
    text: "Ola personal!",
  });

  await markConversationAsRead(convId, "trainer-main");

  const trainerMsg = await sendChatMessage({
    conversationId: convId,
    senderId: "trainer-main",
    senderName: "Personal Indigo",
    senderRole: "TRAINER",
    receiverId: "student-joao",
    receiverName: "Joao Silva",
    receiverRole: "STUDENT",
    text: "Ola Joao! Claro, pode sim.",
    tag: "ajuste",
  });

  assert.equal(trainerMsg.senderRole, "TRAINER");
  assert.equal(trainerMsg.text, "Ola Joao! Claro, pode sim.");

  const unreadForStudent = await getUnreadChatCountForUser("student-joao", "STUDENT");
  assert.ok(unreadForStudent >= 1);

  await markConversationAsRead(convId, "student-joao");
  const unreadAfter = await getUnreadChatCountForUser("student-joao", "STUDENT");
  assert.equal(unreadAfter, 0);
});

test("chat-store: trainer sends announcement", async () => {
  await resetChatStoreForTests();

  await sendTrainerAnnouncement({
    trainerId: "trainer-main",
    trainerName: "Personal Indigo",
    studentId: "student-joao",
    studentName: "Joao Silva",
    title: "Novo Ciclo de Treino Liberado",
    message: "Seu novo treino de hipertrofia já está ativo no app!",
  });

  const convId = getConversationId("trainer-main", "student-joao");
  const msgs = await listMessages(convId);
  const last = msgs[msgs.length - 1];

  assert.ok(last.text.includes("Novo Ciclo de Treino Liberado"));
});
