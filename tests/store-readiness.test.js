const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

test("Conformidade Apple & Google: Validação do app.json", () => {
  const appJsonPath = path.join(rootDir, "app.json");
  assert.ok(fs.existsSync(appJsonPath), "app.json deve existir");
  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf-8")).expo;

  // Identificadores Oficiais
  assert.equal(appConfig.name, "DragonCorp");
  assert.equal(appConfig.scheme, "dragoncorp");
  assert.equal(appConfig.version, "1.0.0");

  // iOS App Store Compliance
  assert.ok(appConfig.ios, "Configuração iOS deve existir");
  assert.equal(appConfig.ios.bundleIdentifier, "com.dragoncorp.app");
  assert.equal(appConfig.ios.supportsTablet, true);
  assert.equal(appConfig.ios.infoPlist.ITSAppUsesNonExemptEncryption, false);
  assert.ok(
    appConfig.ios.infoPlist.NSCameraUsageDescription?.length > 10,
    "NSCameraUsageDescription deve ser descritiva e clara"
  );
  assert.ok(
    appConfig.ios.infoPlist.NSPhotoLibraryUsageDescription?.length > 10,
    "NSPhotoLibraryUsageDescription deve ser descritiva e clara"
  );

  // Android Google Play Compliance
  assert.ok(appConfig.android, "Configuração Android deve existir");
  assert.equal(appConfig.android.package, "com.dragoncorp.app");
  assert.ok(appConfig.android.versionCode >= 1);
  assert.ok(appConfig.android.adaptiveIcon?.foregroundImage, "Adaptive icon foreground deve existir");
  assert.equal(appConfig.android.adaptiveIcon?.backgroundColor, "#000000");

  // iOS Privacy Manifest
  assert.ok(appConfig.ios.privacyManifests, "iOS privacyManifests deve estar configurado");
  assert.equal(appConfig.ios.privacyManifests.NSPrivacyTracking, false);
  assert.ok(appConfig.ios.privacyManifests.NSPrivacyAccessedAPITypes.length >= 4, "Deve declarar Required Reason APIs");

  const perms = appConfig.android.permissions || [];
  assert.ok(perms.includes("INTERNET"), "Deve declarar permissão INTERNET");
  assert.ok(perms.includes("CAMERA"), "Deve declarar permissão CAMERA");
  assert.ok(perms.includes("READ_MEDIA_IMAGES"), "Deve declarar permissão READ_MEDIA_IMAGES (Android 13+)");
  assert.ok(perms.includes("POST_NOTIFICATIONS"), "Deve declarar permissão POST_NOTIFICATIONS (Android 13+)");
});

test("Conformidade EAS Build: Perfis para Play Store (AAB) e App Store (IPA)", () => {
  const easJsonPath = path.join(rootDir, "eas.json");
  assert.ok(fs.existsSync(easJsonPath), "eas.json deve existir");
  const easConfig = JSON.parse(fs.readFileSync(easJsonPath, "utf-8"));

  assert.ok(easConfig.build.production, "Perfil production deve existir");
  assert.equal(easConfig.build.production.autoIncrement, true);
  assert.equal(easConfig.build.production.android.buildType, "app-bundle", "Google Play exige AAB (.aab)");
  assert.equal(easConfig.build.production.ios.simulator, false, "iOS production não deve ser simulator");
});

test("Conformidade de Diretrizes Legais: Rotas e Assets Obrigatórios", () => {
  // Rotas Legais
  const termsPath = path.join(rootDir, "app", "terms-of-use.tsx");
  const privacyPath = path.join(rootDir, "app", "privacy-policy.tsx");
  const subscriptionPath = path.join(rootDir, "app", "subscription.tsx");
  const accountProfilePath = path.join(rootDir, "app", "account-profile.tsx");
  const deleteAccountPath = path.join(rootDir, "app", "delete-account.tsx");

  assert.ok(fs.existsSync(termsPath), "Rota /terms-of-use (EULA) deve existir");
  assert.ok(fs.existsSync(privacyPath), "Rota /privacy-policy deve existir");
  assert.ok(fs.existsSync(subscriptionPath), "Rota /subscription deve existir");
  assert.ok(fs.existsSync(accountProfilePath), "Rota /account-profile deve existir");
  assert.ok(fs.existsSync(deleteAccountPath), "Rota /delete-account deve existir (App Store 5.1.1(v) / Google Play)");

  // Conteúdo dos Termos e Privacidade
  const termsContent = fs.readFileSync(termsPath, "utf-8");
  const privacyContent = fs.readFileSync(privacyPath, "utf-8");
  const subscriptionContent = fs.readFileSync(subscriptionPath, "utf-8");

  assert.ok(termsContent.includes("DragonCorp"), "Termos devem referenciar DragonCorp");
  assert.ok(termsContent.includes("Guideline 3.1.2"), "Termos devem atender Guideline 3.1.2");
  assert.ok(privacyContent.includes("DragonCorp"), "Privacidade deve referenciar DragonCorp");
  assert.ok(privacyContent.includes("LGPD"), "Privacidade deve referenciar LGPD");

  // Assinatura com links legais e restauração
  assert.ok(subscriptionContent.includes("/terms-of-use"), "Tela de assinatura deve linkar Termos de Uso");
  assert.ok(subscriptionContent.includes("/privacy-policy"), "Tela de assinatura deve linkar Privacidade");
  assert.ok(subscriptionContent.includes("handleRestore"), "Tela de assinatura deve ter botão Restaurar");

  // Assets essenciais
  const iconPath = path.join(rootDir, "assets", "images", "icon.png");
  const adaptiveForeground = path.join(rootDir, "assets", "images", "android-icon-foreground.png");
  const logoPrincipal = path.join(rootDir, "assets", "images", "logo-principal.png");

  assert.ok(fs.existsSync(iconPath), "assets/images/icon.png deve existir");
  assert.ok(fs.existsSync(adaptiveForeground), "assets/images/android-icon-foreground.png deve existir");
  assert.ok(fs.existsSync(logoPrincipal), "assets/images/logo-principal.png deve existir");
});
