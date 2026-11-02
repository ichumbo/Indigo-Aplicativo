const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Central de Migração Assistida: Estrutura Arquitetural e Contratos Canônicos", async (t) => {
  const root = process.cwd();

  await t.test("1. Existência e integridade das migrations de staging e arquivos legados", () => {
    const migrationsDir = path.join(root, "web", "backend", "database", "migrations");
    const files = fs.readdirSync(migrationsDir);
    const migrationFile = files.find((f) => f.includes("create_migration_tables"));
    assert.ok(migrationFile, "Migration de tabelas de migração deve existir");

    const content = fs.readFileSync(path.join(migrationsDir, migrationFile), "utf-8");
    assert.ok(content.includes("migration_batches"), "Deve conter tabela migration_batches");
    assert.ok(content.includes("migration_items"), "Deve conter tabela migration_items");
    assert.ok(content.includes("legacy_imported_files"), "Deve conter tabela legacy_imported_files");
    assert.ok(content.includes("rollback_until"), "Deve conter campo rollback_until");
    assert.ok(content.includes("destination_id"), "Deve conter campo destination_id para reversão cirúrgica");
  });

  await t.test("2. Regra Inegociável: Homônimos não são mesclados automaticamente", () => {
    const servicePath = path.join(
      root,
      "web",
      "backend",
      "app",
      "Services",
      "Migration",
      "DuplicateReconciliationService.php"
    );
    assert.ok(fs.existsSync(servicePath), "DuplicateReconciliationService deve existir");

    const content = fs.readFileSync(servicePath, "utf-8");
    assert.ok(content.includes("'conflict'"), "Homônimo deve receber status conflict");
    assert.ok(
      content.includes("'create_new'"),
      "Decisão padrão sugerida para homônimo deve ser criar novo aluno"
    );
    assert.ok(
      content.includes("Homônimo detectado"),
      "Deve emitir alerta explícito de homônimo"
    );
  });

  await t.test("3. Regra Inegociável: Treinos importados entram como rascunho", () => {
    const executorPath = path.join(
      root,
      "web",
      "backend",
      "app",
      "Services",
      "Migration",
      "MigrationExecutorService.php"
    );
    const content = fs.readFileSync(executorPath, "utf-8");
    assert.ok(
      content.includes("'status' => 'rascunho'"),
      "Plano de treino deve ser criado como rascunho"
    );
    assert.ok(
      content.includes("'status' => 'draft'"),
      "Versão da sessão deve ser criada como draft"
    );
  });

  await t.test("4. Regra Inegociável: Alunos importados entram com convite pendente e sem senha direta", () => {
    const executorPath = path.join(
      root,
      "web",
      "backend",
      "app",
      "Services",
      "Migration",
      "MigrationExecutorService.php"
    );
    const content = fs.readFileSync(executorPath, "utf-8");
    assert.ok(
      content.includes("'invite_status' => 'pending'"),
      "Convite deve ser registrado como pending"
    );
    assert.ok(
      !content.includes("'password' =>"),
      "Não deve gerar senhas de texto puro para alunos importados"
    );
  });

  await t.test("5. Regra de Negócio: Bloqueio de limite Freemium antes da importação", () => {
    const executorPath = path.join(
      root,
      "web",
      "backend",
      "app",
      "Services",
      "Migration",
      "MigrationExecutorService.php"
    );
    const content = fs.readFileSync(executorPath, "utf-8");
    assert.ok(content.includes("checkPlanLimits"), "Deve existir método checkPlanLimits");
    assert.ok(content.includes("LIMIT_EXCEEDED") || content.includes("Limite do plano Free"), "Deve bloquear limite Free");
  });

  await t.test("6. Preservação de Arquivo Legado no perfil do aluno", () => {
    const componentPath = path.join(
      root,
      "web",
      "frontend",
      "src",
      "components",
      "students",
      "StudentLegacyFilesTab.tsx"
    );
    assert.ok(fs.existsSync(componentPath), "StudentLegacyFilesTab deve existir");

    const content = fs.readFileSync(componentPath, "utf-8");
    assert.ok(content.includes("Arquivos e Documentos Importados"), "Deve conter título da aba de arquivos legados");
    assert.ok(content.includes("downloadLegacyFile"), "Deve permitir download do arquivo original");
  });

  await t.test("7. Central de Migração no Frontend Web e Rotas", () => {
    const pagePath = path.join(root, "web", "frontend", "src", "pages", "MigrationPage.tsx");
    assert.ok(fs.existsSync(pagePath), "MigrationPage deve existir");

    const appPath = path.join(root, "web", "frontend", "src", "App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");
    assert.ok(appContent.includes("migracao"), "Rota migracao deve estar registrada no App.tsx");

    const sidebarPath = path.join(root, "web", "frontend", "src", "components", "layout", "Sidebar.tsx");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
    assert.ok(sidebarContent.includes("/migracao"), "Item de menu /migracao deve estar no Sidebar");
  });
});
