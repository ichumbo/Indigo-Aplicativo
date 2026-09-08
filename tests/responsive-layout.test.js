const test = require("node:test");
const assert = require("node:assert/strict");

const fs = require("node:fs");
const path = require("node:path");

// Funções utilitárias de layout responsivo espelhadas de constants/responsive.ts
const APP_MAX_CONTENT_WIDTH = 720;
const TAB_BAR_HEIGHT = 64;
const MIN_TAB_BAR_BOTTOM = 12;
const TAB_BAR_CONTENT_GAP = 24;

function getResponsiveHorizontalPadding(width) {
  if (width <= 340) return 12;
  if (width <= 390) return 16;
  if (width >= 768) return 24;
  return 20;
}

function calculateResponsiveMetrics(width, height, insets = { top: 0, bottom: 0 }) {
  const isCompact = width < 380;
  const isTablet = width >= 768;
  const horizontalPadding = getResponsiveHorizontalPadding(width);
  const tabBarHeight = isCompact ? 62 : TAB_BAR_HEIGHT;
  const tabBarBottom = Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM);

  return {
    width,
    height,
    isCompact,
    isTablet,
    horizontalPadding,
    contentMaxWidth: APP_MAX_CONTENT_WIDTH,
    topPadding: Math.max(48, insets.top + 18),
    safeHeaderTop: Math.max(12, insets.top + 8),
    stackBottomPadding: Math.max(32, insets.bottom + 24),
    tabBarBottom,
    tabBarHeight,
    tabBarHorizontalMargin: isCompact ? 10 : 18,
    tabBarContentPadding: tabBarBottom + tabBarHeight + TAB_BAR_CONTENT_GAP,
  };
}

test("Responsividade: Telas Compactas (≤ 375px)", () => {
  const se1stGen = calculateResponsiveMetrics(320, 568, { top: 20, bottom: 0 });
  assert.equal(se1stGen.isCompact, true);
  assert.equal(se1stGen.isTablet, false);
  assert.equal(se1stGen.horizontalPadding, 12);
  assert.equal(se1stGen.tabBarHeight, 62);
  assert.equal(se1stGen.tabBarHorizontalMargin, 10);
  assert.ok(se1stGen.tabBarContentPadding >= 98);

  const se2ndGen = calculateResponsiveMetrics(375, 667, { top: 20, bottom: 0 });
  assert.equal(se2ndGen.isCompact, true);
  assert.equal(se2ndGen.horizontalPadding, 16);
});

test("Responsividade: Telas Padrão (390px – 430px)", () => {
  const iphone14 = calculateResponsiveMetrics(390, 844, { top: 47, bottom: 34 });
  assert.equal(iphone14.isCompact, false);
  assert.equal(iphone14.isTablet, false);
  assert.equal(iphone14.horizontalPadding, 16);
  assert.equal(iphone14.tabBarHeight, 64);
  assert.equal(iphone14.tabBarBottom, 34);
  assert.equal(iphone14.tabBarContentPadding, 34 + 64 + 24); // 122px

  const iphone15ProMax = calculateResponsiveMetrics(430, 932, { top: 59, bottom: 34 });
  assert.equal(iphone15ProMax.isCompact, false);
  assert.equal(iphone15ProMax.horizontalPadding, 20);
});

test("Responsividade: Tablets e iPads (≥ 768px)", () => {
  const ipad = calculateResponsiveMetrics(768, 1024, { top: 24, bottom: 20 });
  assert.equal(ipad.isTablet, true);
  assert.equal(ipad.isCompact, false);
  assert.equal(ipad.horizontalPadding, 24);
  assert.equal(ipad.contentMaxWidth, 720);

  const ipadPro = calculateResponsiveMetrics(1024, 1366, { top: 24, bottom: 20 });
  assert.equal(ipadPro.isTablet, true);
  assert.equal(ipadPro.horizontalPadding, 24);
  assert.equal(ipadPro.contentMaxWidth, 720);
});

test("Responsividade: Dimensionamento Dinâmico de Componentes Circulares & Grids", () => {
  // Timer circular em tela pequena (320px)
  const widthCompact = 320;
  const paddingCompact = getResponsiveHorizontalPadding(widthCompact);
  const timerDiameterCompact = Math.min(widthCompact - (paddingCompact * 2) - 24, 290);
  assert.ok(timerDiameterCompact <= 272, "Timer deve caber confortavelmente em 320px");
  assert.ok(timerDiameterCompact > 200, "Timer deve manter tamanho legível");

  // Timer circular em tela grande (430px)
  const widthLarge = 430;
  const paddingLarge = getResponsiveHorizontalPadding(widthLarge);
  const timerDiameterLarge = Math.min(widthLarge - (paddingLarge * 2) - 24, 290);
  assert.equal(timerDiameterLarge, 290, "Timer atinge o limite ótimo de 290px em telas largas");
});

test("Responsividade: safeHeaderTop em todas as variantes de aparelhos", () => {
  // iPhone com Dynamic Island (iPhone 14 Pro, 15, 16) - inset top 59px
  const dynamicIsland = calculateResponsiveMetrics(393, 852, { top: 59, bottom: 34 });
  assert.equal(dynamicIsland.safeHeaderTop, 59 + 8); // 67px

  // iPhone com Notch tradicional (iPhone X até 14) - inset top 47px
  const notch = calculateResponsiveMetrics(390, 844, { top: 47, bottom: 34 });
  assert.equal(notch.safeHeaderTop, 47 + 8); // 55px

  // iPhone SE / Aparelhos sem notch - inset top 20px
  const se = calculateResponsiveMetrics(375, 667, { top: 20, bottom: 0 });
  assert.equal(se.safeHeaderTop, 20 + 8); // 28px

  // Android com barra de status padrão (24-32px)
  const android = calculateResponsiveMetrics(412, 915, { top: 28, bottom: 16 });
  assert.equal(android.safeHeaderTop, 28 + 8); // 36px

  // Sem insets (fallback web / telas cheias)
  const zeroInset = calculateResponsiveMetrics(400, 800, { top: 0, bottom: 0 });
  assert.equal(zeroInset.safeHeaderTop, 12);
});

test("Auditoria Estática de Código: Ausência de paddingTop: 52 estático em arquivos de tela", () => {
  const rootDir = path.resolve(__dirname, "..");
  const appDir = path.join(rootDir, "app");
  const componentsDir = path.join(rootDir, "components");

  function scanDir(dir) {
    let matches = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        matches = matches.concat(scanDir(fullPath));
      } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("paddingTop: 52")) {
          matches.push(fullPath);
        }
      }
    }
    return matches;
  }

  const appViolations = scanDir(appDir);
  const componentViolations = scanDir(componentsDir);
  const totalViolations = [...appViolations, ...componentViolations];

  assert.deepEqual(
    totalViolations,
    [],
    `Nenhuma tela ou componente deve conter hardcoded paddingTop: 52. Encontrados: ${totalViolations.join(", ")}`
  );
});

test("Auditoria de Componente: trainer-profile-tool-screen sem duplo topPadding", () => {
  const componentPath = path.resolve(__dirname, "../components/trainer-profile-tool-screen.tsx");
  const content = fs.readFileSync(componentPath, "utf-8");

  // Não deve usar layout.topPadding no ScrollView dentro do SafeAreaView
  assert.ok(
    !content.includes("paddingTop: layout.topPadding"),
    "trainer-profile-tool-screen não deve somar layout.topPadding dentro de SafeAreaView (evita buraco de ~140px)"
  );
});

