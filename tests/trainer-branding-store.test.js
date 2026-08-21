const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "indigo-branding-tests");
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
      files: [path.join(root, "services", "trainer-branding-store.ts")],
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
  path.join(outDir, "trainer-branding-store.js"),
  path.join(outDir, "services", "trainer-branding-store.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath) throw new Error("Compiled trainer-branding-store.js not found.");

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

const store = require(compiledPath);

test("branding: retorna valores padroes quando nao ha dados salvos", async () => {
  storage.clear();
  const branding = await store.getTrainerBranding("trainer-1");
  assert.equal(branding.trainerId, "trainer-1");
  assert.equal(branding.primaryColor, "#D90000");
  assert.equal(branding.businessName, "DragonCorp");
  assert.equal(branding.displayName, "Personal Indigo");
});

test("branding: salva e recupera customizacao de cor e logo do personal", async () => {
  storage.clear();
  const saved = await store.saveTrainerBranding(
    {
      displayName: "João Treinador",
      primaryColor: "#2563EB",
      businessName: "Consultoria Elite",
      customLogoUrl: "https://minhaempresa.com/logo.png",
      logoPresetId: "custom",
    },
    "trainer-1"
  );

  assert.equal(saved.displayName, "João Treinador");
  assert.equal(saved.primaryColor, "#2563EB");
  assert.equal(saved.businessName, "Consultoria Elite");
  assert.equal(saved.customLogoUrl, "https://minhaempresa.com/logo.png");

  const retrieved = await store.getTrainerBranding("trainer-1");
  assert.equal(retrieved.primaryColor, "#2563EB");
  assert.equal(retrieved.businessName, "Consultoria Elite");
});

test("branding: restaura padrao com sucesso", async () => {
  storage.clear();
  await store.saveTrainerBranding(
    {
      primaryColor: "#10B981",
      businessName: "Studio Fit",
    },
    "trainer-1"
  );

  const reset = await store.resetTrainerBranding("trainer-1");
  assert.equal(reset.primaryColor, "#D90000");
  assert.equal(reset.businessName, "DragonCorp");
});
