import {
  AppNotification,
  TrainingFeedback,
  listFeedbacksForStudent,
  listNotificationsForUser,
} from "@/services/feedback-store";
import {
  PhysicalAssessment,
  listAssessmentsForStudent,
} from "@/services/assessment-store";
import {
  StudentProfile,
  calculateAdherence,
  daysUntil,
  getStudentProfile,
} from "@/services/student-profile-store";
import {
  TrainingDashboard,
  TrainingSession,
  getActiveVersion,
  getStudentSessionAccess,
  getTrainingDashboard,
} from "@/services/training-plan-store";

export type StudentHomeDashboard = {
  profile: StudentProfile;
  training: TrainingDashboard;
  todaySession?: TrainingSession;
  recentFeedback?: TrainingFeedback;
  recentTrainerResponse?: TrainingFeedback;
  nextAssessment?: PhysicalAssessment;
  notifications: AppNotification[];
  weeklyProgressPercent: number;
  trainingStreak: number;
  nextAssessmentDays: number | null;
  pendingFeedbackCount: number;
};

export async function getStudentHomeDashboard(studentId: string): Promise<StudentHomeDashboard> {
  const [profile, training, feedbacks, assessments, notifications] = await Promise.all([
    getStudentProfile(studentId, studentId, "student"),
    getTrainingDashboard(studentId, studentId, "student", "student"),
    listFeedbacksForStudent(studentId),
    listAssessmentsForStudent(studentId),
    listNotificationsForUser(studentId),
  ]);

  const todaySession =
    training.nextSuggestedSession ??
    training.sessions.find((session) => getStudentSessionAccess(session).canStart) ??
    training.sessions[0];

  const recentTrainerResponse = feedbacks.find((feedback) => feedback.responses.some((response) => response.authorRole === "trainer"));
  const pendingFeedbackCount = feedbacks.filter((feedback) => feedback.responses.length === 0).length;

  return {
    profile,
    training,
    todaySession,
    recentFeedback: feedbacks[0],
    recentTrainerResponse,
    nextAssessment: assessments[0],
    notifications,
    weeklyProgressPercent: calculateAdherence(profile.frequency),
    trainingStreak: estimateTrainingStreak(training),
    nextAssessmentDays: daysUntil(profile.followUp.nextAssessmentAt),
    pendingFeedbackCount,
  };
}

function estimateTrainingStreak(training: TrainingDashboard) {
  const completedExecutions = training.executions.filter((execution) => execution.status === "completed");
  if (completedExecutions.length === 0) return 0;

  const uniqueDays = new Set(
    completedExecutions.map((execution) => new Date(execution.startedAt).toDateString())
  );

  return Math.min(uniqueDays.size, 7);
}

export function getStudentTodaySessionTitle(session?: TrainingSession) {
  if (!session) return "Nenhum treino liberado";
  const version = getActiveVersion(session);
  return version.identifier ? `${version.identifier} - ${version.name}` : version.name;
}
