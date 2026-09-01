const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-theme-tests");
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
      files: [path.join(root, "services", "theme-store.ts")],
    },
    null,
    2
  )
);

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsc", "-p", tsconfigPath],
  {
    cwd: root,
    stdio: "inherit",
  }
);

const compiledPath = [
  path.join(outDir, "theme-store.js"),
  path.join(outDir, "services", "theme-store.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled theme-store.js not found.");

const storage = new Map();
const mockAsyncStorage = {
  getItem: async (key) => storage.get(key) || null,
  setItem: async (key, val) => {
    storage.set(key, String(val));
  },
  removeItem: async (key) => {
    storage.delete(key);
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@react-native-async-storage/async-storage") {
    return {
      default: mockAsyncStorage,
      ...mockAsyncStorage,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const themeStore = require(compiledPath);

test("theme-store: opera exclusivamente em modo escuro com tokens semânticos completos", async () => {
  storage.clear();
  const colors = themeStore.getThemeColors("dark");
  assert.equal(colors.isDark, true);
  assert.equal(colors.isLight, false);
  assert.equal(colors.background, "#0F0F0F");
  assert.equal(colors.surface, "#161616");
  assert.equal(colors.card, "#161616");
  assert.equal(colors.text, "#FFFFFF");
  assert.equal(colors.textPrimary, "#FFFFFF");
  assert.equal(colors.textSecondary, "#A1A1AA");
  assert.equal(colors.primary, "#D90000");
  assert.equal(colors.border, "#262626");
  assert.equal(colors.divider, "#222222");
  assert.equal(colors.skeleton, "#262626");
  assert.equal(colors.statusBarStyle, "light-content");
});

test("theme-store: retorna tema escuro mesmo se solicitado light", async () => {
  const colors = themeStore.getThemeColors("light");
  assert.equal(colors.isDark, true);
  assert.equal(colors.isLight, false);
  assert.equal(colors.background, "#0F0F0F");
  assert.equal(colors.surface, "#161616");
  assert.equal(colors.card, "#161616");
  assert.equal(colors.text, "#FFFFFF");
  assert.equal(colors.statusBarStyle, "light-content");
});

test("theme-store: resolve sempre para modo dark", () => {
  assert.equal(themeStore.resolveThemeMode("system", "dark"), "dark");
  assert.equal(themeStore.resolveThemeMode("system", "light"), "dark");
  assert.equal(themeStore.resolveThemeMode("system", null), "dark");
  assert.equal(themeStore.resolveThemeMode("light", "dark"), "dark");
  assert.equal(themeStore.resolveThemeMode("dark", "light"), "dark");
});

test("theme-store: mantém fixo o modo escuro nas chamadas de persistência", async () => {
  storage.clear();
  await themeStore.setThemeMode("light");
  const stored = await themeStore.getStoredThemeMode();
  assert.equal(stored, "dark");
  assert.equal(themeStore.getCurrentThemeMode(), "dark");
  assert.equal(themeStore.getCurrentThemePreference(), "dark");

  const toggled = await themeStore.toggleThemeMode();
  assert.equal(toggled, "dark");
  assert.equal(themeStore.getCurrentThemeMode(), "dark");
});

test("theme-store: notifica assinantes com modo dark", async () => {
  let notifiedMode = null;
  let notifiedPref = null;
  const unsubscribe = themeStore.subscribeThemeMode((mode, pref) => {
    notifiedMode = mode;
    notifiedPref = pref;
  });

  await themeStore.setThemeMode("light");
  assert.equal(notifiedMode, "dark");
  assert.equal(notifiedPref, "dark");

  unsubscribe();
});
