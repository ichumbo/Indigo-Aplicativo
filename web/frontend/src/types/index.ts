export type AppRole = 'TRAINER' | 'STUDENT' | 'SUPER_ADMIN';

export type User = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: string;
  cpf?: string;
  phone?: string;
  avatar?: string;
  professionalId?: string;
  trainerCode?: string;
  crefVerificationStatus?: string;
  isEmailVerified?: boolean;
};

export type TrainerProfile = {
  id: string;
  user_id: string;
  cref_number?: string;
  cref_state?: string;
  cref_verification_status: string;
  bio?: string;
  specialties?: string[];
  service_type: string;
  experience_years?: number;
  city?: string;
  state?: string;
  address?: string;
  instagram?: string;
  working_hours?: string;
};

export type StudentProfile = {
  id: string;
  user_id?: string;
  full_name: string;
  avatar?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: string;
  main_goal: string;
  secondary_goals?: string[];
  profession?: string;
  address?: string;
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    emergencyName?: string;
    emergencyPhone?: string;
  };
  status: 'ativo' | 'aguardando_inicio' | 'pausado' | 'inativo' | 'encerrado';
  administrative_notes?: string;
  anamnesis?: Record<string, any>;
  follow_up_summary?: {
    startedAt?: string;
    lastActivityAt?: string;
    lastTrainingAt?: string;
    plannedTrainingFrequency?: number;
    completedTrainingFrequency?: number;
    currentWorkoutName?: string;
    adherencePercent?: number;
  };
  private_trainer_notes?: string[];
  training_plans?: TrainingPlan[];
  active_plans?: TrainingPlan[];
  assessments?: PhysicalAssessment[];
  executed_sets?: TrainingExecutedSet[];
};

export type TrainingExercisePlannedSet = {
  setNumber: number;
  reps: string;
  load: string;
  restSeconds: number;
  notes?: string;
};

export type TrainingExercisePrescription = {
  id: string;
  version_id?: string;
  exercise_catalog_id?: string;
  name: string;
  type: string;
  muscle_group: string;
  order: number;
  combination_id?: string;
  combination_label?: string;
  planned_sets: number;
  planned_set_details?: TrainingExercisePlannedSet[];
  planned_reps?: number;
  planned_load?: number;
  load_unit: string;
  duration_seconds?: number;
  rest_seconds?: number;
  tempo?: string;
  side?: string;
  observation?: string;
  video_url?: string;
  unilateral: boolean;
  warmup_set: boolean;
  valid_set: boolean;
};

export type TrainingSessionVersion = {
  id: string;
  session_id: string;
  version: number;
  status: string;
  name: string;
  identifier?: string;
  objective?: string;
  muscle_groups: string[];
  level: string;
  estimated_duration_minutes: number;
  instructions?: string;
  exercises: TrainingExercisePrescription[];
};

export type TrainingSession = {
  id: string;
  plan_id: string;
  student_id: string;
  trainer_id: string;
  status: string;
  active_version_id?: string;
  versions?: TrainingSessionVersion[];
  active_version?: TrainingSessionVersion;
};

export type TrainingPlan = {
  id: string;
  student_id: string;
  trainer_id: string;
  name: string;
  objective: string;
  status: string;
  version: number;
  start_at?: string;
  valid_until?: string;
  frequency_per_week: number;
  session_ids?: string[];
  weekly_schedule?: Array<{ day: string; sessionId: string; optional?: boolean }>;
  notes?: string;
  sessions?: TrainingSession[];
  student?: StudentProfile;
  created_at: string;
};

export type Exercise = {
  id: string;
  trainer_id?: string;
  name: string;
  category: string;
  muscle_groups: string[];
  tags?: string[];
  thumbnail_url?: string;
  video_url?: string;
  description?: string;
  instructions?: string;
  common_errors?: string[];
  is_system: boolean;
};

export type PhysicalAssessment = {
  id: string;
  student_id: string;
  trainer_id: string;
  assessment_date: string;
  type: string;
  status: string;
  general_info?: Record<string, any>;
  anamnesis?: Record<string, any>;
  body_composition?: {
    weightKg?: number;
    heightCm?: number;
    bmi?: number;
    bodyFatPercent?: number;
    fatMassKg?: number;
    leanMassKg?: number;
    muscleMassKg?: number;
    method?: string;
  };
  perimeters?: Record<string, number>;
  skinfolds?: Record<string, number>;
  cardio?: Record<string, any>;
  functional?: Record<string, any>;
  postural?: Record<string, any>;
  photos?: string[];
  conclusion?: string;
  student?: StudentProfile;
};

export type TrainingExecutedSet = {
  id: string;
  student_id: string;
  workout_id?: string;
  workout_name?: string;
  exercise_id: string;
  exercise_name: string;
  planned_set_index: number;
  planned_load?: number;
  executed_load?: number;
  load_unit: string;
  planned_reps?: number;
  executed_reps?: number;
  effort?: number;
  completed: boolean;
  valid_for_progression: boolean;
  pain?: { region: string; level: number };
  note?: string;
  executed_at?: string;
};

export type TrainingFeedback = {
  id: string;
  student_id: string;
  student_name: string;
  trainer_id: string;
  workout_name: string;
  started_at?: string;
  finished_at?: string;
  duration_minutes: number;
  rating: number;
  comment?: string;
  intensity: string;
  has_pain: boolean;
  pain_region?: string;
  pain_level?: number;
  status: string;
  created_at: string;
  responses?: Array<{
    id: string;
    author_name: string;
    author_role: string;
    message: string;
    created_at: string;
  }>;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  receiver_id: string;
  receiver_name: string;
  receiver_role: string;
  text: string;
  tag?: string;
  read: boolean;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  audience: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  feedback_id?: string;
  highlight_pain?: boolean;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: 'free' | 'pro';
  status: string;
  student_limit: number;
  current_period_start?: string;
  current_period_end?: string;
};
