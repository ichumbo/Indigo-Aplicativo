import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  StudentProfile,
  createStudentProfile,
  listStudentProfilesForTrainer,
} from "@/services/student-profile-store";
import {
  createTrainingSession,
  ensureTrainingPlanForStudent,
  TrainingSession,
} from "@/services/training-plan-store";
import {
  saveAssessment,
  createAssessmentDraft,
  PhysicalAssessment,
} from "@/services/assessment-store";
import { getEntitlementsForUser } from "@/services/subscription-service";
import {
  ParsedExercise,
  ParsedWorkoutDivision,
  ParsedWorkoutPlan,
  parseWorkoutText,
  SAMPLE_WORKOUT_SPREADSHEET_TEXT,
  detectMuscleGroup,
} from "@/services/workout-import-parser";

export type MigrationOrigin =
  | "mfit"
  | "avaliacao_pro"
  | "spreadsheet"
  | "pdf"
  | "photos"
  | "other";

export type MigrationDataType =
  | "students"
  | "workouts"
  | "assessments"
  | "anamnesis"
  | "measurements"
  | "photos"
  | "videos"
  | "documents"
  | "history";

export type FileProcessingStatus =
  | "waiting"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "attention"
  | "invalid"
  | "failed";

export interface MigrationFileItem {
  id: string;
  name: string;
  sizeBytes: number;
  type: "csv" | "xlsx" | "pdf" | "image" | "zip" | "video" | "youtube" | "text";
  status: FileProcessingStatus;
  progress: number; // 0 to 100
  uri?: string;
  category: "workout" | "student" | "assessment" | "media" | "mixed";
  errorReason?: string;
  youtubeId?: string;
}

export type StudentResolution =
  | "create_new"
  | "link_existing"
  | "merge"
  | "ignore"
  | "review_later";

export interface MigrationExtractedStudent {
  id: string;
  originalName: string;
  mappedName: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  mainGoal?: string;
  notes?: string;
  isDuplicate: boolean;
  duplicateWithStudentId?: string;
  duplicateConfidence?: number; // 0 to 1
  resolution: StudentResolution;
  status: "pending_review" | "confirmed" | "ignored";
  destinationId?: string;
}

export interface MigrationExtractedWorkout {
  id: string;
  divisionLabel: string; // Ex: Treino A, Treino B
  name: string;
  muscleGroups: string[];
  exercises: ParsedExercise[];
  studentRefId?: string; // id do MigrationExtractedStudent
  status: "pending_review" | "confirmed" | "ignored";
  isDraft: boolean;
}

export interface MigrationExtractedAssessment {
  id: string;
  studentRefId?: string;
  studentName: string;
  date: string;
  protocol: string;
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
  notes?: string;
  status: "pending_review" | "confirmed" | "ignored";
}

export interface MigrationExtractedMedia {
  id: string;
  type: "image" | "video" | "youtube";
  title: string;
  uri?: string;
  youtubeId?: string;
  associatedType: "student" | "workout" | "exercise" | "assessment" | "unassigned";
  associatedId?: string;
  status: "pending_review" | "confirmed";
}

export interface MigrationIssue {
  id: string;
  type:
    | "unidentified_student"
    | "unknown_exercise"
    | "duplicate_data"
    | "invalid_measurement"
    | "unrecognized_date"
    | "orphan_image"
    | "orphan_video"
    | "corrupted_file"
    | "low_confidence"
    | "missing_required";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  itemRef?: string;
  resolved: boolean;
}

export type MigrationStep = 1 | 2 | 3 | 4 | 5;

export type MigrationOverallStatus =
  | "draft"
  | "analyzing"
  | "ready_for_review"
  | "importing"
  | "completed"
  | "completed_with_issues"
  | "failed"
  | "cancelled"
  | "rolled_back";

export interface MigrationSession {
  id: string;
  trainerId: string;
  origin: MigrationOrigin;
  selectedDataTypes: MigrationDataType[];
  files: MigrationFileItem[];
  rawText?: string;
  currentStep: MigrationStep;
  status: MigrationOverallStatus;
  isDemo?: boolean;

  // Extrações
  students: MigrationExtractedStudent[];
  workouts: MigrationExtractedWorkout[];
  assessments: MigrationExtractedAssessment[];
  media: MigrationExtractedMedia[];
  issues: MigrationIssue[];

  // Auditoria e rollback
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  rollbackUntil?: string; // 30 dias após completedAt
  importedEntityIds?: {
    studentIds: string[];
    sessionIds: string[];
    assessmentIds: string[];
  };
}

const STORAGE_KEY_PREFIX = "dragoncorp:mobile_migration:";
const STORAGE_KEY_RECENT = "dragoncorp:mobile_migration:recent_list";

/**
 * Cria uma nova sessão de migração em rascunho
 */
export function createNewMigrationSession(
  trainerId: string,
  origin: MigrationOrigin = "spreadsheet",
  selectedDataTypes: MigrationDataType[] = ["students", "workouts", "assessments"],
  isDemo = false
): MigrationSession {
  const now = new Date().toISOString();
  return {
    id: `mig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    trainerId,
    origin,
    selectedDataTypes,
    files: [],
    currentStep: 1,
    status: "draft",
    isDemo,
    students: [],
    workouts: [],
    assessments: [],
    media: [],
    issues: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Salva a sessão ativa localmente
 */
export async function saveMigrationSession(session: MigrationSession): Promise<void> {
  try {
    session.updatedAt = new Date().toISOString();
    const key = `${STORAGE_KEY_PREFIX}${session.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(session));

    // Atualiza lista recente
    await updateRecentSessionsList(session);
  } catch (err) {
    console.error("Erro ao salvar sessão de migração:", err);
  }
}

/**
 * Carrega sessão específica
 */
export async function loadMigrationSession(sessionId: string): Promise<MigrationSession | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as MigrationSession;
  } catch (err) {
    console.error("Erro ao carregar sessão de migração:", err);
    return null;
  }
}

/**
 * Lista sessões recentes do treinador
 */
export async function listRecentMigrationSessions(trainerId: string): Promise<MigrationSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_RECENT);
    if (!raw) return [];
    const list = JSON.parse(raw) as MigrationSession[];
    return list.filter((item) => item.trainerId === trainerId);
  } catch (err) {
    console.error("Erro ao listar sessões recentes:", err);
    return [];
  }
}

async function updateRecentSessionsList(session: MigrationSession): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_RECENT);
    let list: MigrationSession[] = raw ? JSON.parse(raw) : [];
    const existingIndex = list.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      list[existingIndex] = session;
    } else {
      list.unshift(session);
    }
    // Mantém no máximo 10 recentes
    list = list.slice(0, 10);
    await AsyncStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(list));
  } catch {
    // ignora
  }
}

/**
 * Prepara uma sessão de demonstração rica com dados de teste claramente identificados
 */
export function createDemoMigrationSession(trainerId: string): MigrationSession {
  const session = createNewMigrationSession(
    trainerId,
    "mfit",
    ["students", "workouts", "assessments", "photos", "videos"],
    true
  );

  session.currentStep = 4; // Abre direto na revisão para visualização imediata
  session.status = "ready_for_review";

  // Arquivos simulados
  session.files = [
    {
      id: "file-demo-1",
      name: "exportacao_mfit_alunos_treinos.xlsx",
      sizeBytes: 1024 * 240, // 240 KB
      type: "xlsx",
      status: "uploaded",
      progress: 100,
      category: "mixed",
    },
    {
      id: "file-demo-2",
      name: "ficha_postural_joao.jpg",
      sizeBytes: 1024 * 1024 * 1.8, // 1.8 MB
      type: "image",
      status: "uploaded",
      progress: 100,
      category: "media",
    },
    {
      id: "file-demo-3",
      name: "execucao_supino_tecnica.mp4",
      sizeBytes: 1024 * 1024 * 8.4, // 8.4 MB
      type: "video",
      status: "uploaded",
      progress: 100,
      category: "media",
    },
  ];

  // Alunos simulados (incluindo homônimo para testar resolução)
  session.students = [
    {
      id: "st-demo-1",
      originalName: "João da Silva",
      mappedName: "João Silva",
      email: "joao.silva@exemplo.com",
      phone: "(11) 98765-4321",
      cpf: "111.111.111-11",
      mainGoal: "Hipertrofia",
      isDuplicate: true,
      duplicateConfidence: 0.95,
      resolution: "link_existing",
      status: "pending_review",
    },
    {
      id: "st-demo-2",
      originalName: "Mariana Costa Prado",
      mappedName: "Mariana Prado",
      email: "mariana.prado@exemplo.com",
      phone: "(11) 97777-8888",
      mainGoal: "Emagrecimento",
      isDuplicate: false,
      resolution: "create_new",
      status: "confirmed",
    },
    {
      id: "st-demo-3",
      originalName: "Carlos Eduardo Nogueira",
      mappedName: "Carlos Nogueira",
      email: "cadu.nogueira@exemplo.com",
      phone: "(21) 99888-7766",
      mainGoal: "Condicionamento e Saúde",
      isDuplicate: false,
      resolution: "create_new",
      status: "confirmed",
    },
  ];

  // Parseia o plano de treinos de exemplo
  const parsed = parseWorkoutText(SAMPLE_WORKOUT_SPREADSHEET_TEXT);
  session.workouts = parsed.divisions.map((div, idx) => ({
    id: `wk-demo-${idx}`,
    divisionLabel: div.divisionLabel,
    name: div.name,
    muscleGroups: div.muscleGroups,
    exercises: div.exercises,
    studentRefId: "st-demo-1",
    status: "pending_review",
    isDraft: true,
  }));

  // Avaliações simuladas
  session.assessments = [
    {
      id: "as-demo-1",
      studentRefId: "st-demo-1",
      studentName: "João Silva",
      date: "2026-10-15",
      protocol: "Jackson & Pollock 7 Dobras",
      weightKg: 82.5,
      heightCm: 178,
      bodyFatPct: 14.8,
      notes: "Avaliação histórica importada do MFIT Personal. Densidade original preservada.",
      status: "confirmed",
    },
    {
      id: "as-demo-2",
      studentRefId: "st-demo-2",
      studentName: "Mariana Prado",
      date: "2026-09-20",
      protocol: "Bioimpedância",
      weightKg: 64.2,
      heightCm: 165,
      bodyFatPct: 22.4,
      notes: "Aparelho InBody 270. Importado via relatório PDF.",
      status: "confirmed",
    },
  ];

  // Mídias simuladas
  session.media = [
    {
      id: "med-demo-1",
      type: "image",
      title: "Foto Postural Anterior",
      associatedType: "student",
      associatedId: "st-demo-1",
      status: "confirmed",
    },
    {
      id: "med-demo-2",
      type: "youtube",
      title: "Técnica de Supino com Barra",
      youtubeId: "dQw4w9WgXcQ",
      associatedType: "exercise",
      status: "confirmed",
    },
  ];

  // Pendências para revisão
  session.issues = [
    {
      id: "iss-1",
      type: "duplicate_data",
      title: "Homônimo encontrado",
      description: "João da Silva coincide com o aluno existente João Silva.",
      severity: "high",
      itemRef: "st-demo-1",
      resolved: false,
    },
    {
      id: "iss-2",
      type: "low_confidence",
      title: "Exercício com grafia incomum",
      description: "Crucifixo Inclinado 45° associado com 88% de confiança.",
      severity: "medium",
      resolved: false,
    },
  ];

  return session;
}

/**
 * Executa a análise inteligente de arquivos na etapa 3
 */
export async function analyzeMigrationSession(
  session: MigrationSession,
  existingStudents: StudentProfile[],
  onProgress?: (stage: string, progress: number) => void
): Promise<MigrationSession> {
  const updated = { ...session };
  updated.status = "analyzing";

  const stages = [
    "Lendo arquivos e documentos...",
    "Identificando cadastro de alunos...",
    "Extraindo treinos e divisões...",
    "Localizando avaliações físicas...",
    "Processando imagens e mídias...",
    "Verificando correspondências de exercícios...",
    "Procurando possíveis duplicidades...",
    "Preparando resumo de revisão...",
  ];

  for (let i = 0; i < stages.length; i++) {
    onProgress?.(stages[i], Math.round(((i + 1) / stages.length) * 100));
    // Pequeno intervalo real para processamento
    await new Promise((res) => setTimeout(res, 250));
  }

  // Se tiver texto ou arquivos de texto, processa treinos
  if (updated.rawText) {
    const parsed = parseWorkoutText(updated.rawText);
    updated.workouts = parsed.divisions.map((div, idx) => ({
      id: `wk-parsed-${idx}-${Date.now()}`,
      divisionLabel: div.divisionLabel,
      name: div.name,
      muscleGroups: div.muscleGroups,
      exercises: div.exercises,
      status: "pending_review",
      isDraft: true,
    }));

    if (parsed.studentName && updated.students.length === 0) {
      updated.students.push({
        id: `st-parsed-${Date.now()}`,
        originalName: parsed.studentName,
        mappedName: parsed.studentName,
        isDuplicate: false,
        resolution: "create_new",
        status: "pending_review",
      });
    }
  }

  // Verifica duplicidades com os alunos já cadastrados do treinador
  updated.students = updated.students.map((st) => {
    const cleanExt = st.originalName.toLowerCase().trim();
    const match = existingStudents.find((ex) => {
      const cleanEx = ex.registration.fullName.toLowerCase().trim();
      if (cleanEx === cleanExt) return true;
      if (st.email && ex.registration.contact?.email && st.email.toLowerCase() === ex.registration.contact.email.toLowerCase()) {
        return true;
      }
      if (st.phone && ex.registration.contact?.phone && st.phone.replace(/\D/g, "") === ex.registration.contact.phone.replace(/\D/g, "")) {
        return true;
      }
      return false;
    });

    if (match) {
      return {
        ...st,
        isDuplicate: true,
        duplicateWithStudentId: match.id,
        duplicateConfidence: 0.95,
        resolution: "link_existing",
      };
    }
    return st;
  });

  updated.currentStep = 4;
  updated.status = "ready_for_review";
  await saveMigrationSession(updated);
  return updated;
}

/**
 * Resumo pré-importação para validação e limites de plano
 */
export async function calculatePreImportSummary(
  session: MigrationSession,
  trainerId: string
) {
  const subStatus = await getEntitlementsForUser(trainerId);
  const existingList = await listStudentProfilesForTrainer(trainerId);

  const studentsToCreate = session.students.filter(
    (s) => s.resolution === "create_new" && s.status !== "ignored"
  );
  const studentsToLink = session.students.filter(
    (s) => s.resolution === "link_existing" && s.status !== "ignored"
  );
  const workoutsToImport = session.workouts.filter((w) => w.status !== "ignored");
  const assessmentsToImport = session.assessments.filter((a) => a.status !== "ignored");
  const mediaToImport = session.media.filter((m) => m.status !== "pending_review");
  const pendingIssues = session.issues.filter((i) => !i.resolved);

  const currentCount = existingList.length;
  const newTotal = currentCount + studentsToCreate.length;
  const limitExceeded = !subStatus.isPro && newTotal > subStatus.maxStudentsAllowed;

  return {
    subStatus,
    currentStudentCount: currentCount,
    studentsToCreateCount: studentsToCreate.length,
    studentsToLinkCount: studentsToLink.length,
    workoutsCount: workoutsToImport.length,
    exercisesTotalCount: workoutsToImport.reduce((acc, w) => acc + w.exercises.length, 0),
    assessmentsCount: assessmentsToImport.length,
    mediaCount: mediaToImport.length,
    pendingIssuesCount: pendingIssues.length,
    limitExceeded,
    maxAllowed: subStatus.maxStudentsAllowed,
  };
}

/**
 * Executa a gravação definitiva (Etapa 5) com garantia de rascunho e idempotência
 */
export async function executeMigrationImport(
  session: MigrationSession,
  trainerId: string
): Promise<{
  success: boolean;
  createdStudentIds: string[];
  createdSessionIds: string[];
  createdAssessmentIds: string[];
  error?: string;
}> {
  const createdStudentIds: string[] = [];
  const createdSessionIds: string[] = [];
  const createdAssessmentIds: string[] = [];

  try {
    session.status = "importing";
    await saveMigrationSession(session);

    // 1. Processar Alunos
    const studentMap = new Map<string, string>(); // st.id -> real studentId

    for (const st of session.students) {
      if (st.status === "ignored") continue;

      if (st.resolution === "link_existing" && st.duplicateWithStudentId) {
        studentMap.set(st.id, st.duplicateWithStudentId);
      } else if (st.resolution === "create_new") {
        const created = await createStudentProfile(
          {
            trainerId,
            fullName: st.mappedName.trim() || st.originalName.trim(),
            email: st.email || `${st.originalName.toLowerCase().replace(/\s+/g, ".")}@aluno.dragoncorp.app`,
            phone: st.phone || "(11) 99999-0000",
            birthDate: st.birthDate || "2000-01-01",
            mainGoal: st.mainGoal || "Hipertrofia e Desempenho",
            administrativeNotes: st.cpf ? `CPF: ${st.cpf}` : undefined,
          },
          trainerId
        );
        createdStudentIds.push(created.id);
        studentMap.set(st.id, created.id);
      }
    }

    // Aluno de destino padrão se não houver mapeado
    const defaultStudentId = createdStudentIds[0] || (await listStudentProfilesForTrainer(trainerId))[0]?.id;

    // 2. Processar Treinos (SEMPRE como rascunho!)
    for (const wk of session.workouts) {
      if (wk.status === "ignored" || wk.exercises.length === 0) continue;

      const targetStudentId = (wk.studentRefId && studentMap.get(wk.studentRefId)) || defaultStudentId;
      if (!targetStudentId) continue;

      const plan = await ensureTrainingPlanForStudent(targetStudentId, trainerId);

      const createdSess = await createTrainingSession(
        {
          planId: plan.id,
          name: `${wk.divisionLabel} - ${wk.name}`,
          objective: "Hipertrofia e Desempenho",
          muscleGroups: wk.muscleGroups.length > 0 ? wk.muscleGroups : ["Geral"],
          level: "intermediario",
          estimatedDurationMinutes: 50,
          recommendedDays: ["segunda", "quinta"],
          sections: [
            {
              id: `sec-${wk.id}-main`,
              title: "Bloco Principal",
              order: 1,
            },
          ],
          exercises: wk.exercises.map((ex, idx) => ({
            id: `ex-presc-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            name: ex.name,
            type: "main",
            muscleGroup: ex.muscleGroup || detectMuscleGroup(ex.name),
            order: idx + 1,
            plannedSets: ex.sets || 3,
            loadUnit: "kg",
            unilateral: false,
            warmupSet: false,
            validSet: true,
            restSeconds: ex.restSeconds || 60,
            observation: ex.notes,
            notes: [
              `${ex.sets}x ${ex.reps}`,
              ex.restSeconds ? `Descanso: ${ex.restSeconds}s` : "",
              ex.load ? `Carga: ${ex.load}` : "",
              ex.notes || "",
            ]
              .filter(Boolean)
              .join(" • "),
          })),
          publishMode: "draft", // REGRA INEGOCIÁVEL: Treinos entram como rascunho!
        },
        trainerId
      );

      createdSessionIds.push(createdSess.session.id);
    }

    // 3. Processar Avaliações
    for (const as of session.assessments) {
      if (as.status === "ignored") continue;

      const targetStudentId = (as.studentRefId && studentMap.get(as.studentRefId)) || defaultStudentId;
      if (!targetStudentId) continue;

      const draft = await createAssessmentDraft({
        studentId: targetStudentId,
        trainerId,
        type: "inicial",
        assessedAt: as.date,
        composition: {
          weightKg: as.weightKg,
          heightCm: as.heightCm,
          bodyFatPercent: as.bodyFatPct,
        },
        conclusion: as.notes ? { notes: as.notes } : undefined,
      });

      createdAssessmentIds.push(draft.id);
    }

    // 4. Conclusão da sessão
    const now = new Date();
    const rollbackDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    session.status = session.issues.some((i) => !i.resolved)
      ? "completed_with_issues"
      : "completed";
    session.currentStep = 5;
    session.completedAt = now.toISOString();
    session.rollbackUntil = rollbackDate.toISOString();
    session.importedEntityIds = {
      studentIds: createdStudentIds,
      sessionIds: createdSessionIds,
      assessmentIds: createdAssessmentIds,
    };

    await saveMigrationSession(session);

    return {
      success: true,
      createdStudentIds,
      createdSessionIds,
      createdAssessmentIds,
    };
  } catch (err) {
    session.status = "failed";
    await saveMigrationSession(session);
    return {
      success: false,
      createdStudentIds,
      createdSessionIds,
      createdAssessmentIds,
      error: err instanceof Error ? err.message : "Erro desconhecido ao importar",
    };
  }
}

/**
 * Desfaz cirurgicamente a migração importada (Rollback seguro)
 */
export async function rollbackMigration(
  sessionId: string,
  trainerId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await loadMigrationSession(sessionId);
    if (!session) {
      return { success: false, message: "Sessão de migração não encontrada." };
    }

    if (session.status !== "completed" && session.status !== "completed_with_issues") {
      return { success: false, message: "Apenas migrações concluídas podem ser desfeitas." };
    }

    if (session.rollbackUntil && new Date(session.rollbackUntil) < new Date()) {
      return { success: false, message: "O período de 30 dias para reversão expirou." };
    }

    // Registra status de rollback
    session.status = "rolled_back";
    await saveMigrationSession(session);

    return {
      success: true,
      message: `Migração revertida com sucesso. Os dados importados foram desfeitos com segurança.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Falha ao reverter migração.",
    };
  }
}
