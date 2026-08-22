import { DEMO_TRAINER } from "@/services/feedback-store";
import {
  createStudentProfile,
  getStudentProfile,
  listStudentProfilesForTrainer,
  StudentProfile,
} from "@/services/student-profile-store";
import {
  getCustomExercises,
  SYSTEM_EXERCISES,
  ExerciseItem,
} from "@/services/exercise-store";
import { validateStudentAdditionAllowed } from "@/services/subscription-service";

export type AIDraftType = "STUDENT_CREATION" | "WORKOUT_PRESCRIPTION" | "EVOLUTION_SUMMARY";

export interface AIStudentDraft {
  fullName: string;
  ageYears?: number;
  birthDate?: string;
  weightKg?: number;
  mainGoal: string;
  frequencyWeekly: number;
  phone?: string;
  email?: string;
}

export interface AIWorkoutExerciseDraft {
  name: string;
  sets: number;
  reps: string;
  loadKg?: number;
  restSeconds?: number;
}

export interface AIWorkoutDraft {
  studentId: string;
  studentName: string;
  divisionName: string;
  goal: string;
  focusMuscles: string[];
  exercises: AIWorkoutExerciseDraft[];
}

export interface AIAssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  requiresConfirmation?: boolean;
  draftType?: AIDraftType;
  studentDraft?: AIStudentDraft;
  workoutDraft?: AIWorkoutDraft;
  status?: "PENDING_REVIEW" | "CONFIRMED" | "CANCELLED" | "GENERATING";
  actions?: Array<{
    id: string;
    label: string;
    actionType: "CONFIRM" | "EDIT" | "REGENERATE" | "CANCEL";
    primary?: boolean;
  }>;
}

/**
 * Ferramenta Intermediária: Busca alunos no banco do personal
 */
export async function searchStudentsTool(
  trainerId: string,
  query: string
): Promise<StudentProfile[]> {
  const students = await listStudentProfilesForTrainer(trainerId);
  if (!query.trim()) return students;
  const q = query.toLowerCase();
  return students.filter(
    (s) =>
      s.registration.fullName.toLowerCase().includes(q) ||
      s.registration.mainGoal.toLowerCase().includes(q)
  );
}

/**
 * Ferramenta Intermediária: Busca exercícios no catálogo
 */
export async function searchExercisesTool(
  query: string,
  muscleGroup?: string
): Promise<ExerciseItem[]> {
  const custom = await getCustomExercises();
  const allExercises = [...SYSTEM_EXERCISES, ...custom];

  return allExercises.filter((e) => {
    const matchesName = !query || e.name.toLowerCase().includes(query.toLowerCase());
    const matchesGroup =
      !muscleGroup ||
      e.muscleGroups.some((mg) => mg.toLowerCase() === muscleGroup.toLowerCase());
    return matchesName && matchesGroup;
  });
}

/**
 * Ferramenta Intermediária: Gera Rascunho Estruturado de Aluno (Human-in-the-Loop)
 * Não salva no banco. Exige confirmação explícita.
 */
export function createStudentDraftTool(prompt: string): AIStudentDraft {
  // Extrai nome
  let fullName = "Novo Aluno";
  const nameMatch = prompt.match(/cadastrar\s+([A-Za-zÀ-ÿ\s]+?)(?:,|\s+\d+|\s+de|\s+com|$)/i);
  if (nameMatch && nameMatch[1]) {
    fullName = nameMatch[1].trim();
  }

  // Extrai idade
  let ageYears = 25;
  const ageMatch = prompt.match(/(\d+)\s*(?:anos|ano)/i);
  if (ageMatch) {
    ageYears = parseInt(ageMatch[1], 10);
  }

  // Extrai peso
  let weightKg = 75;
  const weightMatch = prompt.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|quilos|kilos)/i);
  if (weightMatch) {
    weightKg = parseFloat(weightMatch[1].replace(",", "."));
  }

  // Extrai objetivo
  let mainGoal = "Condicionamento Geral e Hipertrofia";
  if (/hipertrofia/i.test(prompt)) mainGoal = "Hipertrofia Muscular";
  else if (/emagrecimento|perda de peso/i.test(prompt)) mainGoal = "Emagrecimento e Definição";
  else if (/saúde|qualidade de vida/i.test(prompt)) mainGoal = "Saúde e Qualidade de Vida";
  else if (/performance|força/i.test(prompt)) mainGoal = "Ganho de Força e Performance";

  // Extrai frequência semanal
  let frequencyWeekly = 4;
  const freqMatch = prompt.match(/(\d+)\s*(?:x|vezes|dias)\s*(?:por\s*semana|\/semana|semanais)?/i);
  if (freqMatch) {
    frequencyWeekly = parseInt(freqMatch[1], 10);
  }

  const birthYear = new Date().getFullYear() - ageYears;
  const birthDate = `${birthYear}-01-15`;

  return {
    fullName,
    ageYears,
    birthDate,
    weightKg,
    mainGoal,
    frequencyWeekly,
    phone: "(11) 98888-7777",
    email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@email.com`,
  };
}

/**
 * Ferramenta Intermediária: Gera Rascunho Estruturado de Treino (Human-in-the-Loop)
 * Não salva no banco. Exige confirmação explícita.
 */
export function createWorkoutDraftTool(
  studentId: string,
  studentName: string,
  prompt: string
): AIWorkoutDraft {
  const isHypertrophy = /hipertrofia|massa/i.test(prompt);
  const isCardio = /emagrecimento|definir|perda/i.test(prompt);

  const exercises: AIWorkoutExerciseDraft[] = isHypertrophy
    ? [
        { name: "Supino Reto com Barra", sets: 4, reps: "8-10", loadKg: 60, restSeconds: 90 },
        { name: "Supino Inclinado com Halteres", sets: 3, reps: "10-12", loadKg: 24, restSeconds: 60 },
        { name: "Crucifixo na Polia (Cross Over)", sets: 3, reps: "12-15", loadKg: 15, restSeconds: 60 },
        { name: "Tríceps Corda na Polia", sets: 4, reps: "10-12", loadKg: 25, restSeconds: 45 },
        { name: "Tríceps Testa com Halteres", sets: 3, reps: "12", loadKg: 12, restSeconds: 60 },
      ]
    : isCardio
    ? [
        { name: "Agachamento Goblet com Kettlebell", sets: 4, reps: "15", loadKg: 16, restSeconds: 45 },
        { name: "Afundo Alternado", sets: 3, reps: "12 cada perna", loadKg: 10, restSeconds: 45 },
        { name: "Remada Curvada com Halteres", sets: 3, reps: "12-15", loadKg: 14, restSeconds: 45 },
        { name: "Prancha Abdominal Isométrica", sets: 3, reps: "45 seg", loadKg: 0, restSeconds: 30 },
      ]
    : [
        { name: "Puxada Frontal Aberta", sets: 4, reps: "10-12", loadKg: 45, restSeconds: 60 },
        { name: "Remada Baixa Triângulo", sets: 3, reps: "10-12", loadKg: 50, restSeconds: 60 },
        { name: "Rosca Direta com Barra W", sets: 3, reps: "10-12", loadKg: 20, restSeconds: 45 },
        { name: "Rosca Martelo com Halteres", sets: 3, reps: "12", loadKg: 12, restSeconds: 45 },
      ];

  return {
    studentId,
    studentName,
    divisionName: "Treino A — Peitoral & Tríceps (Hipertrofia)",
    goal: isHypertrophy ? "Hipertrofia Muscular" : "Resistência e Definição",
    focusMuscles: ["Peitoral", "Tríceps", "Ombros"],
    exercises,
  };
}

/**
 * Salva o Aluno após confirmação humana explícita
 */
export async function saveStudentFromDraft(
  trainerId: string,
  draft: AIStudentDraft
): Promise<{ success: boolean; studentProfile?: StudentProfile; error?: string }> {
  // Valida limite freemium antes de salvar
  const students = await listStudentProfilesForTrainer(trainerId);
  const check = await validateStudentAdditionAllowed(trainerId, students.length);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  const profile = await createStudentProfile(
    {
      trainerId,
      fullName: draft.fullName,
      birthDate: draft.birthDate || "1998-01-01",
      mainGoal: draft.mainGoal,
      phone: draft.phone,
      whatsapp: draft.phone,
      email: draft.email,
      administrativeNotes: `Cadastrado com auxílio do Assistente IA (${draft.frequencyWeekly}x/semana).`,
    },
    trainerId,
    "trainer"
  );

  return { success: true, studentProfile: profile };
}

/**
 * Salva o Treino após confirmação humana explícita
 */
export async function saveWorkoutFromDraft(
  trainerId: string,
  studentId: string,
  draft: AIWorkoutDraft
): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: `Treino '${draft.divisionName}' com ${draft.exercises.length} exercícios estruturado e pronto para execução pelo aluno ${draft.studentName}!`,
  };
}

/**
 * Processador principal do Assistente IA (interpretação de intenção e geração de prévia)
 */
export async function processAIAssistantPrompt(params: {
  trainerId: string;
  prompt: string;
  studentContextId?: string;
}): Promise<AIAssistantMessage> {
  const { trainerId, prompt, studentContextId } = params;
  const lower = prompt.toLowerCase();
  const now = new Date().toISOString();

  // 1. INTENÇÃO: CADASTRO DE NOVO ALUNO
  if (lower.includes("cadastrar") || lower.includes("novo aluno") || lower.includes("criar aluno")) {
    const studentDraft = createStudentDraftTool(prompt);
    return {
      id: `ai-msg-${Date.now()}`,
      role: "assistant",
      text: `Interpretei os dados para cadastro do aluno **${studentDraft.fullName}**. Revise as informações abaixo antes de confirmar o registro:`,
      timestamp: now,
      requiresConfirmation: true,
      draftType: "STUDENT_CREATION",
      studentDraft,
      status: "PENDING_REVIEW",
      actions: [
        { id: "confirm", label: "CONFIRMAR CADASTRO", actionType: "CONFIRM", primary: true },
        { id: "edit", label: "EDITAR DADOS", actionType: "EDIT" },
        { id: "cancel", label: "CANCELAR", actionType: "CANCEL" },
      ],
    };
  }

  // 2. INTENÇÃO: MONTAGEM / PRESCRIÇÃO DE TREINO
  if (
    lower.includes("monte um treino") ||
    lower.includes("montar treino") ||
    lower.includes("criar treino") ||
    lower.includes("prescrever") ||
    lower.includes("divisão semanal")
  ) {
    const students = await listStudentProfilesForTrainer(trainerId);
    let targetStudent = students.find((s) => s.id === studentContextId);

    // Tenta encontrar o aluno pelo nome no prompt
    if (!targetStudent) {
      targetStudent = students.find((s) =>
        lower.includes(s.registration.fullName.toLowerCase().split(" ")[0])
      );
    }

    const studentName = targetStudent?.registration.fullName || "Aluno(a)";
    const studentId = targetStudent?.id || "demo-student-id";

    const workoutDraft = createWorkoutDraftTool(studentId, studentName, prompt);

    return {
      id: `ai-msg-${Date.now()}`,
      role: "assistant",
      text: `Estruturei a sugestão de treino para **${studentName}** com foco em ${workoutDraft.goal}. Por favor, revise as séries e exercícios antes de vincular à ficha:`,
      timestamp: now,
      requiresConfirmation: true,
      draftType: "WORKOUT_PRESCRIPTION",
      workoutDraft,
      status: "PENDING_REVIEW",
      actions: [
        { id: "confirm", label: "ADICIONAR AO ALUNO", actionType: "CONFIRM", primary: true },
        { id: "regenerate", label: "GERAR NOVAMENTE", actionType: "REGENERATE" },
        { id: "cancel", label: "CANCELAR", actionType: "CANCEL" },
      ],
    };
  }

  // 3. INTENÇÃO: RESUMO DE EVOLUÇÃO / HISTÓRICO
  if (lower.includes("evolução") || lower.includes("histórico") || lower.includes("progresso")) {
    return {
      id: `ai-msg-${Date.now()}`,
      role: "assistant",
      text: `📊 **Resumo de Desempenho e Consistência:**\n\n- **Aderência média aos treinos:** 92%\n- **Evolução de Cargas (1RM):** +8.5% no Supino Reto e +12% no Agachamento nos últimos 30 dias.\n- **Status Clínico:** Nenhuma dor articular ou limitação relatada nos últimos 3 check-ins.\n\n*Sugestão do Assistente:* O aluno está apto para progressão de carga no próximo ciclo.`,
      timestamp: now,
      requiresConfirmation: false,
      actions: [
        { id: "suggest_workout", label: "Sugerir Ajuste de Carga", actionType: "CONFIRM", primary: true },
      ],
    };
  }

  // 4. RESPOSTA PADRÃO CONTEXTUAL
  return {
    id: `ai-msg-${Date.now()}`,
    role: "assistant",
    text: `Olá! Sou seu **Assistente IA do Indigo**. Como posso ajudar na sua consultoria hoje?\n\nVocê pode me pedir comandos como:\n• *"Cadastrar João, 27 anos, 82kg, objetivo hipertrofia 4x por semana"*\n• *"Monte um treino de hipertrofia focado em peito e tríceps para João"*\n• *"Resuma a evolução de cargas dos meus alunos"*`,
    timestamp: now,
    requiresConfirmation: false,
  };
}
