const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

test("Android Manifest & Configuração: Bloqueio de READ_MEDIA_IMAGES e READ_MEDIA_VIDEO", () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, "app.json"), "utf-8")).expo;
  const manifestContent = fs.readFileSync(
    path.join(rootDir, "android", "app", "src", "main", "AndroidManifest.xml"),
    "utf-8"
  );

  // 1. app.json blockedPermissions
  assert.ok(
    appJson.android.blockedPermissions.includes("android.permission.READ_MEDIA_IMAGES"),
    "READ_MEDIA_IMAGES deve estar listado em blockedPermissions no app.json"
  );
  assert.ok(
    appJson.android.blockedPermissions.includes("android.permission.READ_MEDIA_VIDEO"),
    "READ_MEDIA_VIDEO deve estar listado em blockedPermissions no app.json"
  );

  // 2. app.json permissions NÃO deve conter READ_MEDIA_IMAGES nem READ_MEDIA_VIDEO
  assert.ok(
    !appJson.android.permissions.includes("READ_MEDIA_IMAGES") &&
      !appJson.android.permissions.includes("android.permission.READ_MEDIA_IMAGES"),
    "READ_MEDIA_IMAGES não deve estar na lista de permissões do app.json"
  );
  assert.ok(
    !appJson.android.permissions.includes("READ_MEDIA_VIDEO") &&
      !appJson.android.permissions.includes("android.permission.READ_MEDIA_VIDEO"),
    "READ_MEDIA_VIDEO não deve estar na lista de permissões do app.json"
  );

  // 3. AndroidManifest.xml deve usar tools:node="remove" para READ_MEDIA_IMAGES e READ_MEDIA_VIDEO
  assert.match(
    manifestContent,
    /<uses-permission\s+android:name="android\.permission\.READ_MEDIA_IMAGES"\s+tools:node="remove"\s*\/>/,
    "AndroidManifest.xml deve conter tools:node='remove' para READ_MEDIA_IMAGES"
  );
  assert.match(
    manifestContent,
    /<uses-permission\s+android:name="android\.permission\.READ_MEDIA_VIDEO"\s+tools:node="remove"\s*\/>/,
    "AndroidManifest.xml deve conter tools:node='remove' para READ_MEDIA_VIDEO"
  );

  // 4. Manter compatibilidade com Android <= 32 (READ_EXTERNAL_STORAGE)
  assert.ok(
    appJson.android.permissions.includes("READ_EXTERNAL_STORAGE"),
    "READ_EXTERNAL_STORAGE deve ser mantida para compatibilidade com versões legadas do Android"
  );
  assert.match(
    manifestContent,
    /<uses-permission\s+android:name="android\.permission\.READ_EXTERNAL_STORAGE"\s*\/>/,
    "AndroidManifest.xml deve declarar READ_EXTERNAL_STORAGE"
  );

  // 5. Permissão de CAMERA mantida
  assert.ok(
    appJson.android.permissions.includes("CAMERA"),
    "Permissão de CAMERA deve ser mantida"
  );
  assert.match(
    manifestContent,
    /<uses-permission\s+android:name="android\.permission\.CAMERA"\s*\/>/,
    "AndroidManifest.xml deve declarar CAMERA"
  );

  // 6. iOS descrições de permissão intactas
  assert.ok(
    appJson.ios.infoPlist.NSCameraUsageDescription?.length > 0,
    "NSCameraUsageDescription deve ser preservada"
  );
  assert.ok(
    appJson.ios.infoPlist.NSPhotoLibraryUsageDescription?.length > 0,
    "NSPhotoLibraryUsageDescription deve ser preservada"
  );
});

test("Arquitetura de Seleção de Mídia: Ausência de requestMediaLibraryPermissionsAsync no fluxo Android", () => {
  const serviceFile = fs.readFileSync(
    path.join(rootDir, "services", "media-picker-service.ts"),
    "utf-8"
  );

  assert.ok(
    serviceFile.includes('if (Platform.OS === "ios")'),
    "media-picker-service deve isolar requestMediaLibraryPermissionsAsync apenas para iOS"
  );

  // Verifica que os componentes usam o media-picker-service
  const componentsToCheck = [
    path.join(rootDir, "components", "trainer-student-hub-view.tsx"),
    path.join(rootDir, "components", "trainer-branding-modal.tsx"),
    path.join(rootDir, "components", "trainer-workout-editor.tsx"),
    path.join(rootDir, "app", "account-profile.tsx"),
    path.join(rootDir, "app", "assessment-editor.tsx"),
    path.join(rootDir, "app", "exercises.tsx"),
    path.join(rootDir, "app", "import-workout.tsx"),
    path.join(rootDir, "app", "training-feedback.tsx"),
    path.join(rootDir, "app", "trainer-onboarding.tsx"),
    path.join(rootDir, "app", "(tabs)", "messages.tsx"),
  ];

  for (const compPath of componentsToCheck) {
    assert.ok(fs.existsSync(compPath), `Arquivo ${compPath} deve existir`);
    const content = fs.readFileSync(compPath, "utf-8");
    assert.ok(
      !content.includes("ImagePicker.requestMediaLibraryPermissionsAsync"),
      `Componente ${path.basename(compPath)} não deve chamar requestMediaLibraryPermissionsAsync diretamente`
    );
  }
});
