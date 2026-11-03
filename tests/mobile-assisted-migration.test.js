const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Importador Inteligente Mobile: Arquitetura Guiada em 5 Etapas & Regras Inegociáveis", async (t) => {
  const root = process.cwd();

  await t.test("1. Existência e integridade do store mobile de migração", () => {
    const storePath = path.join(root, "services", "mobile-migration-store.ts");
    assert.ok(fs.existsSync(storePath), "services/mobile-migration-store.ts deve existir");

    const content = fs.readFileSync(storePath, "utf-8");
    assert.ok(content.includes("export type MigrationOrigin"), "Deve exportar MigrationOrigin");
    assert.ok(content.includes("export type MigrationStep"), "Deve exportar MigrationStep");
    assert.ok(content.includes("createNewMigrationSession"), "Deve exportar createNewMigrationSession");
    assert.ok(content.includes("createDemoMigrationSession"), "Deve exportar createDemoMigrationSession");
    assert.ok(content.includes("analyzeMigrationSession"), "Deve exportar analyzeMigrationSession");
    assert.ok(content.includes("calculatePreImportSummary"), "Deve exportar calculatePreImportSummary");
    assert.ok(content.includes("executeMigrationImport"), "Deve exportar executeMigrationImport");
    assert.ok(content.includes("rollbackMigration"), "Deve exportar rollbackMigration");
  });

  await t.test("2. Regra Inegociável: Treinos criados estritamente como RASCUNHO (publishMode: draft)", () => {
    const storePath = path.join(root, "services", "mobile-migration-store.ts");
    const content = fs.readFileSync(storePath, "utf-8");

    assert.ok(
      content.includes('publishMode: "draft"'),
      "Treinos importados pela migração mobile devem ser criados estritamente com publishMode: draft"
    );
  });

  await t.test("3. Regra Inegociável: Identificação de homônimos e duplicidades sem mesclagem silenciosa", () => {
    const storePath = path.join(root, "services", "mobile-migration-store.ts");
    const content = fs.readFileSync(storePath, "utf-8");

    assert.ok(content.includes("duplicateWithStudentId"), "Deve rastrear id do aluno duplicado");
    assert.ok(content.includes("duplicateConfidence"), "Deve registrar confiança da duplicidade");
    assert.ok(content.includes("isDuplicate"), "Deve sinalizar booleano de duplicidade");
    assert.ok(content.includes("link_existing"), "Deve permitir opção de vincular a existente com confirmação");
    assert.ok(content.includes("create_new"), "Deve permitir criar novo aluno separado com confirmação");
  });

  await t.test("4. Regra Inegociável: Rollback cirúrgico garantido por 30 dias", () => {
    const storePath = path.join(root, "services", "mobile-migration-store.ts");
    const content = fs.readFileSync(storePath, "utf-8");

    assert.ok(content.includes("rollbackUntil"), "Sessão deve registrar rollbackUntil");
    assert.ok(content.includes("importedEntityIds"), "Sessão deve auditar importedEntityIds");
    assert.ok(content.includes("rolled_back"), "Status rolled_back deve ser suportado");
    assert.ok(content.includes("rollbackMigration"), "Função rollbackMigration deve existir");
  });

  await t.test("5. Regra Inegociável: Auditoria de limites de plano Free vs PRO no resumo pré-importação", () => {
    const storePath = path.join(root, "services", "mobile-migration-store.ts");
    const content = fs.readFileSync(storePath, "utf-8");

    assert.ok(content.includes("getEntitlementsForUser"), "Deve consultar status da assinatura/entitlements");
    assert.ok(content.includes("limitExceeded"), "Deve calcular se o limite de alunos é excedido");
    assert.ok(content.includes("maxStudentsAllowed"), "Deve respeitar limite máximo de alunos do plano");
  });

  await t.test("6. Componente Stepper: Indicador compacto com 5 etapas", () => {
    const stepperPath = path.join(root, "components", "migration", "MigrationStepper.tsx");
    assert.ok(fs.existsSync(stepperPath), "MigrationStepper.tsx deve existir");

    const content = fs.readFileSync(stepperPath, "utf-8");
    assert.ok(content.includes("Etapa"), "Deve exibir texto de etapa");
    assert.ok(content.includes("Origem"), "Deve conter etapa Origem");
    assert.ok(content.includes("Arquivos"), "Deve conter etapa Arquivos");
    assert.ok(content.includes("Análise"), "Deve conter etapa Análise");
    assert.ok(content.includes("Revisão"), "Deve conter etapa Revisão");
    assert.ok(content.includes("Concluir"), "Deve conter etapa Concluir");
  });

  await t.test("7. Componente Origem: Seleção de MFIT, Avaliação Física PRO, planilhas e PDFs", () => {
    const originPath = path.join(root, "components", "migration", "MigrationOriginSelector.tsx");
    assert.ok(fs.existsSync(originPath), "MigrationOriginSelector.tsx deve existir");

    const content = fs.readFileSync(originPath, "utf-8");
    assert.ok(content.includes("MFIT Personal"), "Deve conter opção MFIT");
    assert.ok(content.includes("Avaliação Física PRO"), "Deve conter opção Avaliação Física PRO");
    assert.ok(content.includes("Planilha Excel ou CSV"), "Deve conter opção Planilha");
    assert.ok(content.includes("PDF ou Ficha Digital"), "Deve conter opção PDF");
    assert.ok(content.includes("Fotos de Fichas"), "Deve conter opção Fotos");
    assert.ok(content.includes("DATA_TYPES"), "Deve conter lista de tipos de dados selecionáveis");
  });

  await t.test("8. Componente Ajuda Específica: Modal contextual sem pedir senhas de terceiros", () => {
    const helpPath = path.join(root, "components", "migration", "MigrationHelpModal.tsx");
    assert.ok(fs.existsSync(helpPath), "MigrationHelpModal.tsx deve existir");

    const content = fs.readFileSync(helpPath, "utf-8");
    assert.ok(content.includes("Como exportar dados do MFIT"), "Deve orientar exportação do MFIT");
    assert.ok(content.includes("Nunca solicitamos nem armazene sua senha"), "Deve alertar sobre não pedir senhas");
    assert.ok(content.includes("Segurança garantida"), "Deve conter garantia de conformidade");
  });

  await t.test("9. Componente Arquivos: Ação principal destacada e atalhos secundários", () => {
    const filesPath = path.join(root, "components", "migration", "MigrationFilesManager.tsx");
    assert.ok(fs.existsSync(filesPath), "MigrationFilesManager.tsx deve existir");

    const content = fs.readFileSync(filesPath, "utf-8");
    assert.ok(content.includes("Selecionar Arquivos"), "Deve conter ação principal Selecionar Arquivos");
    assert.ok(content.includes("captureImageFromCamera"), "Deve suportar câmera");
    assert.ok(content.includes("pickImageFromGallery"), "Deve suportar galeria");
    assert.ok(content.includes("pickVideoFromGallery"), "Deve suportar vídeo");
    assert.ok(content.includes("logo-youtube"), "Deve suportar vídeos do YouTube");
    assert.ok(content.includes("Ver uma demonstração"), "Ação de demonstração deve ser discreta e identificada");
  });

  await t.test("10. Componente Análise: Progresso real e resumo de itens encontrados", () => {
    const analyzingPath = path.join(root, "components", "migration", "MigrationAnalyzingView.tsx");
    assert.ok(fs.existsSync(analyzingPath), "MigrationAnalyzingView.tsx deve existir");

    const content = fs.readFileSync(analyzingPath, "utf-8");
    assert.ok(content.includes("Analisando seus arquivos"), "Deve exibir feedback visual de análise");
    assert.ok(content.includes("progressBarFill"), "Deve ter barra de progresso");
    assert.ok(content.includes("Revisar Resultados"), "Deve ter botão de ação para avançar à revisão");
    assert.ok(content.includes("Pendências"), "Deve exibir contador de pendências");
  });

  await t.test("11. Componente Revisão: Abas organizadas com contadores e edição rápida", () => {
    const reviewPath = path.join(root, "components", "migration", "MigrationReviewTabs.tsx");
    assert.ok(fs.existsSync(reviewPath), "MigrationReviewTabs.tsx deve existir");

    const content = fs.readFileSync(reviewPath, "utf-8");
    assert.ok(content.includes("Alunos"), "Aba Alunos deve existir");
    assert.ok(content.includes("Treinos"), "Aba Treinos deve existir");
    assert.ok(content.includes("Avaliações"), "Aba Avaliações deve existir");
    assert.ok(content.includes("Mídias"), "Aba Mídias deve existir");
    assert.ok(content.includes("Pendências"), "Aba Pendências deve existir");
    assert.ok(content.includes("Vincular Aluno"), "Deve suportar vincular a aluno existente com busca");
    assert.ok(content.includes("+ Cadastrar Aluno"), "Deve suportar cadastrar novo aluno inline");
    assert.ok(content.includes("Editar Exercício"), "Deve suportar edição rápida de exercício");
  });

  await t.test("12. Componente Confirmação: Checkbox obrigatório e garantia pré-gravação", () => {
    const confirmPath = path.join(root, "components", "migration", "MigrationConfirmModal.tsx");
    assert.ok(fs.existsSync(confirmPath), "MigrationConfirmModal.tsx deve existir");

    const content = fs.readFileSync(confirmPath, "utf-8");
    assert.ok(
      content.includes("Revisei os dados e confirmo esta importação"),
      "Deve exigir checkbox obrigatório de revisão"
    );
    assert.ok(
      content.includes("Importar Dados com Segurança"),
      "Deve ter botão de confirmação de gravação"
    );
    assert.ok(content.includes("limitExceeded"), "Deve checar se excede limite de alunos do plano");
  });

  await t.test("13. Componente Conclusão: Relatório e ações pós-importação", () => {
    const successPath = path.join(root, "components", "migration", "MigrationSuccessView.tsx");
    assert.ok(fs.existsSync(successPath), "MigrationSuccessView.tsx deve existir");

    const content = fs.readFileSync(successPath, "utf-8");
    assert.ok(content.includes("Migração Concluída com Sucesso!"), "Deve exibir título de sucesso");
    assert.ok(content.includes("Ver Treinos Importados"), "Deve permitir navegar para treinos");
    assert.ok(content.includes("Ver Meus Alunos"), "Deve permitir navegar para alunos");
    assert.ok(content.includes("Desfazer esta importação (Rollback)"), "Deve oferecer botão de rollback cirúrgico");
  });

  await t.test("14. Componente Barra Fixa Inferior: Botões Voltar e Continuar com Safe Area", () => {
    const barPath = path.join(root, "components", "migration", "MigrationBottomBar.tsx");
    assert.ok(fs.existsSync(barPath), "MigrationBottomBar.tsx deve existir");

    const content = fs.readFileSync(barPath, "utf-8");
    assert.ok(content.includes("useSafeAreaInsets"), "Deve respeitar Safe Area");
    assert.ok(content.includes("Voltar"), "Deve ter botão Voltar");
    assert.ok(content.includes("canProceed"), "Deve validar se pode prosseguir");
  });

  await t.test("15. Tela Principal (app/import-workout.tsx): Visão inicial limpa e orquestração do Wizard", () => {
    const screenPath = path.join(root, "app", "import-workout.tsx");
    assert.ok(fs.existsSync(screenPath), "app/import-workout.tsx deve existir");

    const content = fs.readFileSync(screenPath, "utf-8");
    assert.ok(content.includes("MigrationHomeView"), "Deve renderizar MigrationHomeView no modo home");
    assert.ok(content.includes("MigrationStepper"), "Deve renderizar MigrationStepper");
    assert.ok(content.includes("MigrationOriginSelector"), "Deve renderizar MigrationOriginSelector na etapa 1");
    assert.ok(content.includes("MigrationFilesManager"), "Deve renderizar MigrationFilesManager na etapa 2");
    assert.ok(content.includes("MigrationAnalyzingView"), "Deve renderizar MigrationAnalyzingView na etapa 3");
    assert.ok(content.includes("MigrationReviewTabs"), "Deve renderizar MigrationReviewTabs na etapa 4");
    assert.ok(content.includes("MigrationSuccessView"), "Deve renderizar MigrationSuccessView na etapa 5");
    assert.ok(content.includes("MigrationBottomBar"), "Deve ter barra inferior fixa");
  });
});
