const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const rootDir = path.resolve(__dirname, "..");

test("iOS Icon Compliance: Arquivo e Configuração Expo", () => {
  const appJsonPath = path.join(rootDir, "app.json");
  assert.ok(fs.existsSync(appJsonPath), "app.json deve existir");

  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf-8")).expo;
  assert.ok(appConfig.ios, "app.json deve conter chave 'ios'");
  assert.equal(
    appConfig.ios.icon,
    "./assets/images/ios-icon.png",
    "expo.ios.icon deve apontar para ./assets/images/ios-icon.png"
  );
  assert.equal(appConfig.ios.bundleIdentifier, "com.dragoncorp.app");

  const iconRelativePath = appConfig.ios.icon.replace("./", "");
  const iconAbsolutePath = path.join(rootDir, iconRelativePath);
  assert.ok(fs.existsSync(iconAbsolutePath), `Ícone iOS deve existir no caminho: ${iconAbsolutePath}`);
});

test("iOS Icon Compliance: Especificações Técnicas Apple (1024x1024, PNG, Opaco, Sem Alfa)", () => {
  const iconPath = path.join(rootDir, "assets", "images", "ios-icon.png");
  assert.ok(fs.existsSync(iconPath), "assets/images/ios-icon.png deve existir");

  const buffer = fs.readFileSync(iconPath);

  // Validação da assinatura PNG (89 50 4E 47 0D 0A 1A 0A)
  const pngSignature = buffer.subarray(0, 8);
  const expectedSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(pngSignature.equals(expectedSig), "O arquivo deve ser um PNG válido com cabeçalho padrão");

  // Validação IHDR: Tipo de cor PNG (RGB = 2, sem canal alfa nativo)
  const colorType = buffer.readUInt8(25);
  assert.equal(colorType, 2, "O PNG deve ser do tipo Truecolor RGB (Color Type 2, sem canal alfa)");

  // Decodificação dos pixels
  const png = PNG.sync.read(buffer);

  // Resolução exata de 1024 x 1024 pixels
  assert.equal(png.width, 1024, "A largura do ícone deve ser exatamente 1024 pixels");
  assert.equal(png.height, 1024, "A altura do ícone deve ser exatamente 1024 pixels");
  assert.equal(png.width / png.height, 1, "A proporção do ícone deve ser estritamente 1:1");

  // Ausência de qualquer transparência em todos os 1.048.576 pixels
  let transparentPixelCount = 0;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] !== 255) {
      transparentPixelCount++;
    }
  }
  assert.equal(transparentPixelCount, 0, "O ícone iOS não pode conter pixels transparentes ou semitransparentes");

  // Cantos não arredondados manualmente (devem ser opacos e na cor da marca DragonCorp #FF0303)
  const cornerIndices = [
    { name: "Top-Left (0,0)", idx: 0 },
    { name: "Top-Right (1023,0)", idx: 1023 * 4 },
    { name: "Bottom-Left (0,1023)", idx: 1023 * 1024 * 4 },
    { name: "Bottom-Right (1023,1023)", idx: (1023 * 1024 + 1023) * 4 },
  ];

  for (const corner of cornerIndices) {
    const r = png.data[corner.idx];
    const g = png.data[corner.idx + 1];
    const b = png.data[corner.idx + 2];
    const a = png.data[corner.idx + 3];

    assert.equal(a, 255, `Canto ${corner.name} deve ser 100% opaco (alfa = 255)`);
    assert.equal(r, 255, `Canto ${corner.name} deve ter canal vermelho 255 (#FF0303)`);
    assert.equal(g, 3, `Canto ${corner.name} deve ter canal verde 3 (#FF0303)`);
    assert.equal(b, 3, `Canto ${corner.name} deve ter canal azul 3 (#FF0303)`);
  }
});

test("iOS Icon Compliance: EAS Build Produção para App Store", () => {
  const easJsonPath = path.join(rootDir, "eas.json");
  const easConfig = JSON.parse(fs.readFileSync(easJsonPath, "utf-8"));

  assert.ok(easConfig.build.production, "Perfil production deve existir no eas.json");
  assert.equal(easConfig.build.production.autoIncrement, true, "autoIncrement deve estar ativado para builds da App Store");
  assert.equal(easConfig.build.production.ios.simulator, false, "iOS production deve ser para dispositivo/App Store (simulator: false)");
});
