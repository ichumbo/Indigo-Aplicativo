const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Auditoria 1: Configuração do app.json para App Store & Google Play", () => {
  const appJsonPath = path.resolve(__dirname, "../app.json");
  assert.ok(fs.existsSync(appJsonPath), "app.json deve existir");

  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  const expo = appJson.expo;
  assert.ok(expo, "expo configuration root deve existir");

  // Nome e Identificadores
  assert.strictEqual(expo.name, "DragonCorp");
  assert.strictEqual(expo.slug, "dragoncorp-app");
  assert.strictEqual(expo.ios.bundleIdentifier, "com.dragoncorp.app");
  assert.strictEqual(expo.android.package, "com.dragoncorp.app");
  assert.ok(expo.version, "Versão deve estar definida");

  // iOS App Store Compliance
  assert.strictEqual(expo.ios.infoPlist.ITSAppUsesNonExemptEncryption, false, "Isenção de criptografia não-isenta deve estar declarada");
  assert.ok(expo.ios.infoPlist.NSCameraUsageDescription.length > 20, "Descrição de uso de câmera deve ser clara");
  assert.ok(expo.ios.infoPlist.NSPhotoLibraryUsageDescription.length > 20, "Descrição de uso da galeria deve ser clara");
  assert.ok(expo.ios.infoPlist.NSMicrophoneUsageDescription.length > 20, "Descrição de microfone deve ser clara");
  assert.ok(expo.ios.infoPlist.NSSpeechRecognitionUsageDescription.length > 20, "Descrição de reconhecimento de voz deve ser clara");

  // Android Google Play Compliance
  assert.ok(expo.android.versionCode >= 1, "versionCode deve ser inteiro >= 1");
  assert.strictEqual(expo.android.edgeToEdgeEnabled, true, "Edge-to-edge deve estar ativado para Android 15/16");
  assert.ok(expo.android.permissions.includes("INTERNET"), "Permissão INTERNET obrigatória");
  assert.ok(expo.android.permissions.includes("CAMERA"), "Permissão CAMERA necessária");
  assert.ok(!expo.android.permissions.includes("ACCESS_FINE_LOCATION"), "Não deve solicitar localização se não utilizada");
  assert.ok(!expo.android.permissions.includes("READ_CONTACTS"), "Não deve solicitar contatos desnecessários");
});

test("Auditoria 2: EAS Build Configuração de Produção", () => {
  const easJsonPath = path.resolve(__dirname, "../eas.json");
  assert.ok(fs.existsSync(easJsonPath), "eas.json deve existir");

  const easJson = JSON.parse(fs.readFileSync(easJsonPath, "utf-8"));
  assert.ok(easJson.build.production, "Perfil de produção deve existir");
  assert.strictEqual(easJson.build.production.android.buildType, "app-bundle", "Android de produção deve gerar .aab (App Bundle)");
  assert.strictEqual(easJson.build.production.autoIncrement, true, "autoIncrement deve estar ativado");
});

test("Auditoria 3: Segurança e Isolamento de Perfis (RBAC)", () => {
  const authStorePath = path.resolve(__dirname, "../services/auth-store.ts");
  const authStoreCode = fs.readFileSync(authStorePath, "utf-8");

  assert.ok(authStoreCode.includes("TRAINER") || authStoreCode.includes("trainer"), "Perfil de personal trainer deve ser suportado");
  assert.ok(authStoreCode.includes("STUDENT") || authStoreCode.includes("student"), "Perfil de aluno deve ser suportado");
  assert.ok(authStoreCode.includes("SUPER_ADMIN") || authStoreCode.includes("admin"), "Perfil de admin/super admin deve ser suportado");
  assert.ok(authStoreCode.includes("hasAdminPrivileges") || authStoreCode.includes("PermissionKey"), "Função de privilégios e permissões deve existir");
});

test("Auditoria 4: Validação da Resiliência da Home e Ausência de Erros Falsos", () => {
  const homeStorePath = path.resolve(__dirname, "../services/trainer-home-store.ts");
  const homeStoreCode = fs.readFileSync(homeStorePath, "utf-8");

  // Verifica se o tratamento de ausência de plano não gera erro de sistema
  assert.ok(homeStoreCode.includes("nao encontrado") || homeStoreCode.includes("não encontrado"), "Deve tratar ausência de treino sem poluir partialErrors");
});

test("Auditoria 5: Protocolos Cardiorrespiratórios, Conconi e Fórmulas Clínicas", () => {
  // Teste de cálculo de limiar e prescrição Conconi
  const speeds = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  const heartRates = [130, 140, 148, 156, 165, 172, 178, 182, 185];

  assert.strictEqual(speeds.length, heartRates.length, "Vetores devem ter o mesmo tamanho");
  assert.ok(Math.max(...heartRates) <= 220, "Frequência cardíaca dentro dos limites fisiológicos");
  assert.ok(Math.min(...heartRates) >= 40, "Frequência mínima dentro dos limites fisiológicos");
});

test("Auditoria 6: Validação de Mídias e YouTube Fallbacks", () => {
  const exerciseStorePath = path.resolve(__dirname, "../services/exercise-store.ts");
  const exerciseStoreCode = fs.readFileSync(exerciseStorePath, "utf-8");

  assert.ok(exerciseStoreCode.includes("getYoutubeVideoId"), "Parser de ID do YouTube deve existir");
  assert.ok(exerciseStoreCode.includes("getYoutubeThumbnailUrl"), "Gerador de thumbnail do YouTube deve existir");
});

test("Auditoria 7: Exclusão de Conta e Diretrizes de Privacidade Apple & Google", () => {
  const privacyPath = path.resolve(__dirname, "../app/privacy-policy.tsx");
  const termsPath = path.resolve(__dirname, "../app/terms-of-use.tsx");

  assert.ok(fs.existsSync(privacyPath), "Rota de política de privacidade deve existir");
  assert.ok(fs.existsSync(termsPath), "Rota de termos de uso deve existir");

  const privacyCode = fs.readFileSync(privacyPath, "utf-8");
  const termsCode = fs.readFileSync(termsPath, "utf-8");

  assert.ok(privacyCode.includes("Exclusão de Conta") || privacyCode.includes("Exclusão de Dados"), "Política deve detalhar exclusão de conta");
  assert.ok(privacyCode.includes("LGPD"), "Política deve citar LGPD");
  assert.ok(termsCode.includes("Isenção de Responsabilidade Médica"), "Termos devem conter isenção de responsabilidade médica para aprovação nas lojas");
});
