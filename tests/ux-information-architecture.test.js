const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();

test("Auditoria e Validação de UX & Arquitetura de Informação", async (t) => {
  await t.test("Componente OnboardingModal existe e está configurado", () => {
    const onboardingPath = path.join(root, "components", "OnboardingModal.tsx");
    assert.ok(fs.existsSync(onboardingPath), "OnboardingModal.tsx deve existir em components/");
    const content = fs.readFileSync(onboardingPath, "utf-8");
    assert.ok(content.includes("@dragoncorp/onboarding_completed_"), "Chave de persistência de onboarding presente");
    assert.ok(content.includes("TRAINER_STEPS"), "Etapas do Personal configuradas");
    assert.ok(content.includes("STUDENT_STEPS"), "Etapas do Aluno configuradas");
    assert.ok(content.includes("Pular"), "Opção de pular tutorial presente");
  });

  await t.test("Home do Aluno prioriza Treino de Hoje no topo e inclui Onboarding", () => {
    const studentHomePath = path.join(root, "app", "(tabs)", "student.tsx");
    const content = fs.readFileSync(studentHomePath, "utf-8");
    assert.ok(content.includes("heroWorkoutCard"), "Card Hero de Treino de Hoje configurado");
    assert.ok(content.includes("nextActionCard"), "Card de Próxima Ação contextual configurado");
    assert.ok(content.includes("OnboardingModal"), "Onboarding integrado na tela do aluno");
    assert.ok(content.includes("Continue registrando seus treinos para acompanhar sua evolução."), "Texto de evolução amigável presente");
  });

  await t.test("Home do Personal prioriza 4 Ações Rápidas, Alunos com atenção e Onboarding", () => {
    const trainerHomePath = path.join(root, "app", "(tabs)", "index.tsx");
    const content = fs.readFileSync(trainerHomePath, "utf-8");
    assert.ok(content.includes("primaryQuickActionsBlock"), "Bloco de Ações Rápidas prioritárias configurado");
    assert.ok(content.includes("Novo Aluno"), "Ação Novo Aluno presente");
    assert.ok(content.includes("Montar Treino"), "Ação Montar Treino presente");
    assert.ok(content.includes("Nova Avaliação"), "Ação Nova Avaliação presente");
    assert.ok(content.includes("Abrir Agenda"), "Ação Abrir Agenda presente");
    assert.ok(content.includes("attentionBlock"), "Bloco de Alunos que precisam de atenção configurado");
    assert.ok(content.includes("OnboardingModal"), "Onboarding integrado na tela do personal");
  });

  await t.test("Preservação integral: todas as rotas principais existem e são acessíveis", () => {
    const routesToCheck = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/student.tsx",
      "app/(tabs)/training.tsx",
      "app/(tabs)/feedbacks.tsx",
      "app/(tabs)/evolution.tsx",
      "app/(tabs)/messages.tsx",
      "app/(tabs)/profile.tsx",
      "app/training-details.tsx",
      "app/exercise-performance.tsx",
      "app/student-feedbacks.tsx",
      "app/student-assessments.tsx",
      "app/weight-progress.tsx",
      "app/hydration.tsx",
      "app/trainer-agenda.tsx",
      "app/trainer-reassessments.tsx",
      "app/assessment-editor.tsx",
      "app/assessment-detail.tsx",
      "app/assessment-compare.tsx",
      "app/notifications.tsx",
      "app/support.tsx",
      "app/subscription.tsx",
    ];

    for (const relPath of routesToCheck) {
      const fullPath = path.join(root, relPath);
      assert.ok(fs.existsSync(fullPath), `Rota essencial deve existir: ${relPath}`);
    }
  });

  await t.test("Hub do Aluno na visão do Personal mantém contexto e todas as ações", () => {
    const hubPath = path.join(root, "components", "trainer-student-hub-view.tsx");
    assert.ok(fs.existsSync(hubPath), "TrainerStudentHubView existe");
    const content = fs.readFileSync(hubPath, "utf-8");
    assert.ok(content.includes("onNavigateToDiet"), "Ação de Dieta preservada");
    assert.ok(content.includes("onNavigateToAnamnesis"), "Ação de Anamnese preservada");
    assert.ok(content.includes("onNavigateToAssessments"), "Ação de Avaliações preservada");
    assert.ok(content.includes("onNavigateToWorkouts"), "Ação de Treinos preservada");
    assert.ok(content.includes("onNavigateToLoads"), "Ação de Evolução de Cargas preservada");
  });
});
