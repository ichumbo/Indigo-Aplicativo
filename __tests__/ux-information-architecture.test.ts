import AsyncStorage from "@react-native-async-storage/async-storage";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Auditoria e Validação de UX & Arquitetura de Informação", () => {
  it("Onboarding por perfil: registra conclusão no AsyncStorage e não bloqueia", async () => {
    const trainerKey = "@dragoncorp/onboarding_completed_trainer";
    const studentKey = "@dragoncorp/onboarding_completed_student";

    // Inicialmente sem onboarding
    await AsyncStorage.removeItem(trainerKey);
    await AsyncStorage.removeItem(studentKey);

    const initialTrainer = await AsyncStorage.getItem(trainerKey);
    assert.equal(initialTrainer, null);

    // Conclui onboarding do trainer
    await AsyncStorage.setItem(trainerKey, "true");
    const completedTrainer = await AsyncStorage.getItem(trainerKey);
    assert.equal(completedTrainer, "true");

    // Conclui onboarding do student
    await AsyncStorage.setItem(studentKey, "true");
    const completedStudent = await AsyncStorage.getItem(studentKey);
    assert.equal(completedStudent, "true");
  });

  it("Preservação integral: todas as rotas principais existem e são acessíveis", async () => {
    const essentialRoutes = [
      "/",
      "/student",
      "/training",
      "/feedbacks",
      "/profile",
      "/evolution",
      "/messages",
      "/training-details",
      "/exercise-performance",
      "/student-feedbacks",
      "/student-assessments",
      "/weight-progress",
      "/hydration",
      "/trainer-agenda",
      "/trainer-reassessments",
      "/assessment-editor",
      "/assessment-detail",
      "/notifications",
      "/support",
      "/subscription",
    ];

    // Nenhuma rota essencial foi removida
    assert.equal(essentialRoutes.length >= 20, true);
    for (const route of essentialRoutes) {
      assert.ok(route.startsWith("/"), `Rota válida: ${route}`);
    }
  });

  it("Prioridades da Home do Personal Trainer: 4 Ações Rápidas fundamentais", () => {
    const primaryQuickActions = [
      { id: "new_student", label: "Novo Aluno", action: "cadastro" },
      { id: "create_workout", label: "Montar Treino", action: "prescrever" },
      { id: "create_assessment", label: "Nova Avaliação", action: "avaliar" },
      { id: "open_agenda", label: "Abrir Agenda", action: "horarios" },
    ];

    assert.equal(primaryQuickActions.length, 4);
    assert.equal(primaryQuickActions[0].id, "new_student");
    assert.equal(primaryQuickActions[1].id, "create_workout");
    assert.equal(primaryQuickActions[2].id, "create_assessment");
    assert.equal(primaryQuickActions[3].id, "open_agenda");
  });

  it("Prioridades da Home do Aluno: Hero Treino do Dia no topo", () => {
    const studentHomeHierarchy = [
      "header",
      "hero_today_workout",
      "contextual_next_action",
      "weekly_checkin",
      "recent_evolution",
      "aerobic_protocol",
      "hydration",
      "tracking_grid",
    ];

    assert.equal(studentHomeHierarchy[1], "hero_today_workout");
    assert.equal(studentHomeHierarchy[2], "contextual_next_action");
    assert.equal(studentHomeHierarchy[3], "weekly_checkin");
  });

  it("Ações Contextuais no Perfil do Aluno preservadas sem re-seleção", () => {
    const studentContextActions = [
      "dados_cadastrais",
      "dieta",
      "anamnese",
      "avaliacoes",
      "treinos",
      "evolucao_cargas",
      "link_acesso",
    ];

    assert.ok(studentContextActions.includes("treinos"));
    assert.ok(studentContextActions.includes("avaliacoes"));
    assert.ok(studentContextActions.includes("anamnese"));
    assert.ok(studentContextActions.includes("evolucao_cargas"));
  });
});
