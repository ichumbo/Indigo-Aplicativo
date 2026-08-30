import { getCurrentSession, getPersonalTrainerById } from "@/services/auth-store";
import { getStudentProfile } from "@/services/student-profile-store";
import { listAssessmentsForStudent } from "@/services/assessment-store";
import { getStudentTrainingPlans } from "@/services/training-plan-store";
import { getUserSupportTickets } from "@/services/support-service";

export type ExportDataBundle = {
  exportMetadata: {
    exportId: string;
    generatedAt: string;
    expiresAt: string;
    formatVersion: string;
    dataController: string;
    legalBasis: string;
    requestedByUserId: string;
    requestedByUserEmail: string;
    requestedByUserRole: string;
  };
  userData: {
    profile: Record<string, unknown>;
    students?: Record<string, unknown>[];
    assessments?: Record<string, unknown>[];
    trainingPlans?: Record<string, unknown>[];
    supportTickets?: Record<string, unknown>[];
  };
};

export async function requestUserDataExport(userId: string): Promise<ExportDataBundle> {
  const currentSession = await getCurrentSession();
  if (!currentSession || currentSession.user.id !== userId) {
    throw new Error("Não autorizado: O usuário só pode solicitar a exportação de seus próprios dados pessoais.");
  }

  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const bundle: ExportDataBundle = {
    exportMetadata: {
      exportId: `export_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      generatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      formatVersion: "1.0.0",
      dataController: "DragonCorp Treinamento e Tecnologia Ltda.",
      legalBasis: "LGPD Art. 18, Inciso V (Portabilidade de Dados)",
      requestedByUserId: userId,
      requestedByUserEmail: currentSession.user.email,
      requestedByUserRole: currentSession.user.role,
    },
    userData: {
      profile: {
        id: currentSession.user.id,
        name: currentSession.user.name,
        email: currentSession.user.email,
        role: currentSession.user.role,
        status: currentSession.user.status,
      },
    },
  };

  if (currentSession.user.role === "TRAINER") {
    const trainerProfile = await getPersonalTrainerById(userId);
    if (trainerProfile) {
      bundle.userData.profile = {
        ...bundle.userData.profile,
        ...trainerProfile,
      };
    }
  } else if (currentSession.user.role === "STUDENT") {
    const studentProfile = await getStudentProfile(userId);
    if (studentProfile) {
      bundle.userData.profile = {
        ...bundle.userData.profile,
        ...studentProfile,
      };
    }

    // Avaliações do próprio aluno
    const assessments = await listAssessmentsForStudent(userId);
    bundle.userData.assessments = assessments;

    // Planos de treino do próprio aluno
    const plans = await getStudentTrainingPlans(userId);
    bundle.userData.trainingPlans = plans;
  }

  // Chamados de suporte do usuário
  const tickets = await getUserSupportTickets(userId);
  bundle.userData.supportTickets = tickets;

  return bundle;
}

export function formatExportAsJsonString(bundle: ExportDataBundle): string {
  return JSON.stringify(bundle, null, 2);
}
