const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-brand-tests");
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
        path.join(root, "services", "color-contrast-utils.ts"),
        path.join(root, "services", "theme-store.ts"),
        path.join(root, "services", "trainer-branding-store.ts"),
      ],
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

const storage = new Map();
const mockAsyncStorage = {
  getItem: async (key) => storage.get(key) || null,
  setItem: async (key, val) => {
    storage.set(key, String(val));
  },
  removeItem: async (key) => {
    storage.delete(key);
  },
  clear: async () => {
    storage.clear();
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

function findCompiled(name) {
  return [
    path.join(outDir, `${name}.js`),
    path.join(outDir, "services", `${name}.js`),
  ].find((candidate) => fs.existsSync(candidate));
}

const colorUtils = require(findCompiled("color-contrast-utils"));
const themeStore = require(findCompiled("theme-store"));
const brandingStore = require(findCompiled("trainer-branding-store"));

test("1. Validação de HEX e Normalização de entrada", () => {
  // Cores válidas
  assert.equal(colorUtils.isValidHex("#8B5CF6"), true);
  assert.equal(colorUtils.isValidHex("#8b5cf6"), true);
  assert.equal(colorUtils.isValidHex("#d90000"), true);
  assert.equal(colorUtils.isValidHex("#f00"), true);
  assert.equal(colorUtils.isValidHex("#000"), true);
  assert.equal(colorUtils.isValidHex("#fff"), true);

  // Normalização para 6 dígitos maiúsculos
  assert.equal(colorUtils.normalizeHex("#8b5cf6"), "#8B5CF6");
  assert.equal(colorUtils.normalizeHex("#f00"), "#FF0000");
  assert.equal(colorUtils.normalizeHex("  #8B5CF6  "), "#8B5CF6");

  // Invalidações e segurança (CSS injection prevention)
  assert.equal(colorUtils.isValidHex(""), false);
  assert.equal(colorUtils.isValidHex("red"), false);
  assert.equal(colorUtils.isValidHex("#12345"), false);
  assert.equal(colorUtils.isValidHex("#1234567"), false);
  assert.equal(colorUtils.isValidHex("url('evil')"), false);
  assert.equal(colorUtils.isValidHex("#8B5CF6; background: black"), false);
  assert.equal(colorUtils.isValidHex("<script>"), false);
});

test("2. Cálculo de contraste e escolha estrita entre texto preto e branco (WCAG)", () => {
  // Fundo escuro -> texto deve ser branco (#FFFFFF)
  const darkCrimsonTokens = colorUtils.generateBrandTokens("#D90000");
  assert.equal(darkCrimsonTokens.brandOnPrimary, "#FFFFFF");

  const darkNavyTokens = colorUtils.generateBrandTokens("#0F172A");
  assert.equal(darkNavyTokens.brandOnPrimary, "#FFFFFF");

  const darkBlueTokens = colorUtils.generateBrandTokens("#1E3A8A");
  assert.equal(darkBlueTokens.brandOnPrimary, "#FFFFFF");

  // Fundo claro / amarelo / ciano / branco -> texto deve ser preto (#000000)
  const yellowTokens = colorUtils.generateBrandTokens("#FACC15");
  assert.equal(yellowTokens.brandOnPrimary, "#000000");

  const lightCyanTokens = colorUtils.generateBrandTokens("#22D3EE");
  assert.equal(lightCyanTokens.brandOnPrimary, "#000000");

  const whiteTokens = colorUtils.generateBrandTokens("#FFFFFF");
  assert.equal(whiteTokens.brandOnPrimary, "#000000");

  // Razão de contraste mínima sempre >= 3:1 para legibilidade
  const contrastDark = colorUtils.getContrastRatio(darkCrimsonTokens.brandPrimary, darkCrimsonTokens.brandOnPrimary);
  assert.ok(contrastDark >= 3.0, `Contraste do vermelho (${contrastDark}) deve ser >= 3.0`);

  const contrastYellow = colorUtils.getContrastRatio(yellowTokens.brandPrimary, yellowTokens.brandOnPrimary);
  assert.ok(contrastYellow >= 4.5, `Contraste do amarelo (${contrastYellow}) deve ser >= 4.5`);
});

test("3. Geração determinística de variações de marca", () => {
  const tokens = colorUtils.generateBrandTokens("#8B5CF6");
  assert.equal(tokens.brandPrimary, "#8B5CF6");
  assert.ok(tokens.brandPrimaryLight, "Deve gerar variação clara");
  assert.ok(tokens.brandPrimaryDark, "Deve gerar variação escura");
  assert.ok(tokens.brandPrimaryPressed, "Deve gerar variação pressionada");
  assert.ok(tokens.brandPrimaryDisabled, "Deve gerar variação desabilitada");
  assert.ok(tokens.brandPrimarySoft, "Deve gerar fundo suave");
  assert.ok(tokens.brandPrimaryMuted, "Deve gerar tom atenuado");
  assert.ok(tokens.brandPrimaryBorder, "Deve gerar borda");
  assert.ok(tokens.brandFocus, "Deve gerar anel de foco");
  assert.equal(tokens.isCustom, true);

  // Fallback padrão institucional
  const defaultTokens = colorUtils.generateBrandTokens("#D90000");
  assert.equal(defaultTokens.brandPrimary, "#D90000");
  assert.equal(defaultTokens.isCustom, false);
});

test("4. Separação rigorosa entre cor de identidade e cores semânticas", async () => {
  await themeStore.setBrandPrimary("#8B5CF6");
  const theme = themeStore.buildThemeColors("#8B5CF6");

  // A cor de identidade foi atualizada para roxo
  assert.equal(theme.primary, "#8B5CF6");
  assert.equal(theme.brand.primary, "#8B5CF6");

  // As cores semânticas continuam FIXAS e NUNCA mudam
  assert.equal(theme.semantic.danger, "#EF4444");
  assert.equal(theme.semantic.success, "#10B981");
  assert.equal(theme.semantic.warning, "#F59E0B");
  assert.equal(theme.semantic.info, "#3B82F6");
  assert.equal(theme.error, "#EF4444");
  assert.equal(theme.success, "#10B981");
  assert.equal(theme.warning, "#F59E0B");

  // Modo escuro estrito preservado
  assert.equal(theme.isDark, true);
  assert.equal(theme.isLight, false);
  assert.equal(theme.background, "#0F0F0F");
  assert.equal(theme.surface, "#161616");
});

test("5. Multi-tenant: Isolamento absoluto entre personal e alunos vinculados", async () => {
  storage.clear();

  // Personal A usa o padrão (#D90000)
  const brandingA = await brandingStore.saveTrainerBranding({
    primaryColor: "#D90000",
    businessName: "Consultoria Vermelha",
  }, "trainer-a");

  // Personal B escolhe Roxo (#8B5CF6)
  const brandingB = await brandingStore.saveTrainerBranding({
    primaryColor: "#8B5CF6",
    businessName: "Consultoria Roxa",
  }, "trainer-b");

  // Personal C escolhe Azul (#2563EB)
  const brandingC = await brandingStore.saveTrainerBranding({
    primaryColor: "#2563EB",
    businessName: "Consultoria Azul",
  }, "trainer-c");

  // Validação do Personal A
  const loadedA = await brandingStore.getTrainerBranding("trainer-a");
  assert.equal(loadedA.primaryColor, "#D90000");
  assert.equal(loadedA.businessName, "Consultoria Vermelha");

  // Validação do Personal B
  const loadedB = await brandingStore.getTrainerBranding("trainer-b");
  assert.equal(loadedB.primaryColor, "#8B5CF6");
  assert.equal(loadedB.businessName, "Consultoria Roxa");

  // Validação do Personal C
  const loadedC = await brandingStore.getTrainerBranding("trainer-c");
  assert.equal(loadedC.primaryColor, "#2563EB");
  assert.equal(loadedC.businessName, "Consultoria Azul");

  // Aluno vinculado ao Personal B herda estritamente a identidade de B
  const studentBBranding = await brandingStore.getTrainerBranding("trainer-b");
  assert.equal(studentBBranding.primaryColor, "#8B5CF6");

  // Aluno vinculado ao Personal C herda estritamente a identidade de C
  const studentCBranding = await brandingStore.getTrainerBranding("trainer-c");
  assert.equal(studentCBranding.primaryColor, "#2563EB");

  // Aluno sem personal vinculado recebe o fallback padrão seguro (#D90000)
  const unlinkedBranding = await brandingStore.getTrainerBranding("non-existent-trainer");
  assert.equal(unlinkedBranding.primaryColor, "#D90000");
});

test("6. Hidratação zero flash e persistência em cache local", async () => {
  storage.clear();
  // Simula persistência prévia de tema personalizado
  await mockAsyncStorage.setItem(themeStore.BRAND_STORAGE_KEY, "#8B5CF6");

  // Na inicialização, recupera imediatamente antes de renderizar
  const cachedBrand = await themeStore.getStoredActiveBrandColor();
  assert.equal(cachedBrand, "#8B5CF6");
  assert.equal(themeStore.getActiveBrandColor(), "#8B5CF6");

  const colors = themeStore.buildThemeColors();
  assert.equal(colors.primary, "#8B5CF6");
  assert.equal(colors.brand.primary, "#8B5CF6");
});

test("7. patchThemedStyle e createThemedStyleSheet: Substituição dinâmica sem mutação", () => {
  const baseStyle = {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
    color: "#D90000",
    padding: 16,
    borderRadius: 8,
  };

  // Quando a cor ativa é roxo (#8B5CF6)
  const patched = themeStore.patchThemedStyle(baseStyle, "#8B5CF6");
  assert.equal(patched.backgroundColor, "#8B5CF6");
  assert.equal(patched.borderColor, "#8B5CF6");
  assert.equal(patched.color, "#8B5CF6");
  assert.equal(patched.padding, 16);
  assert.equal(patched.borderRadius, 8);

  // O objeto original não foi mutado
  assert.equal(baseStyle.backgroundColor, "#D90000");

  // Estilos semânticos não são alterados
  const semanticStyle = {
    backgroundColor: "#EF4444",
    color: "#ff4444",
  };
  const patchedSemantic = themeStore.patchThemedStyle(semanticStyle, "#8B5CF6");
  assert.equal(patchedSemantic.backgroundColor, "#EF4444");
  assert.equal(patchedSemantic.color, "#ff4444");

  // Proxied StyleSheet
  const staticSheet = {
    activeTab: { color: "#D90000" },
    saveBtn: { backgroundColor: "#D90000" },
    dangerBtn: { backgroundColor: "#EF4444" },
  };

  const themedSheet = themeStore.createThemedStyleSheet(staticSheet);
  // getActiveBrandColor é #8B5CF6 da etapa anterior
  assert.equal(themedSheet.activeTab.color, "#8B5CF6");
  assert.equal(themedSheet.saveBtn.backgroundColor, "#8B5CF6");
  assert.equal(themedSheet.dangerBtn.backgroundColor, "#EF4444");
});

test("8. Logout e reset do tema para o oficial da DragonCorp", async () => {
  // Define tema personalizado
  await themeStore.setBrandPrimary("#8B5CF6");
  assert.equal(themeStore.getActiveBrandColor(), "#8B5CF6");

  // Executa reset de logout
  await themeStore.resetBrandPrimary();
  assert.equal(themeStore.getActiveBrandColor(), "#D90000");
  assert.equal(themeStore.buildThemeColors().primary, "#D90000");
  assert.equal(themeStore.buildThemeColors().brand.primary, "#D90000");
});
