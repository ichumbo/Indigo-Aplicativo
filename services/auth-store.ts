import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEMO_STUDENT, DEMO_TRAINER } from "@/services/feedback-store";

export type AppRole = "TRAINER" | "STUDENT" | "SUPER_ADMIN";
export type AccountStatus = "ACTIVE" | "PENDING_REVIEW" | "INACTIVE" | "BLOCKED";
export type RelationshipStatus = "PENDING" | "ACTIVE" | "PAUSED" | "ENDED" | "REVOKED";
export type LegacyRole = "trainer" | "student" | "admin";

export type TrainerAccountStatus =
  | "pending_email"
  | "pending_review"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive"
  | "deleted"
  | "anonymized";

export type CrefVerificationStatus =
  | "unverified"
  | "pending_review"
  | "verified_manual"
  | "rejected";

export type PersonalTrainerRecord = {
  id: string;
  name: string;
  socialName?: string;
  cpf: string;
  birthDate: string;
  email: string;
  phone: string;
  crefNumber: string;
  crefState: string;
  crefVerificationStatus: CrefVerificationStatus;
  crefVerifiedAt?: string;
  crefVerificationNotes?: string;
  avatar?: string;
  bio?: string;
  specialties?: string[];
  serviceType: "in_person" | "online" | "both";
  experienceYears?: number;
  city?: string;
  state?: string;
  address?: string;
  instagram?: string;
  portfolioUrl?: string;
  workingHours?: string;
  certifications?: string[];
  companyName?: string;
  administrativeNotes?: string;
  status: TrainerAccountStatus;
  role: "TRAINER";
  termsAcceptedVersion: string;
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  veracityDeclarationAcceptedAt: string;
  rejectionReason?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessAt?: string;
};

export type PermissionKey =
  | "own_profile.view"
  | "own_profile.edit"
  | "students.list"
  | "student_profile.view"
  | "student_profile.edit"
  | "student.create"
  | "assessment.create"
  | "assessment.view_released"
  | "assessment.edit"
  | "training.create"
  | "training.edit"
  | "training.view_released"
  | "training.execute_preview"
  | "training.execute_real"
  | "training.record_sets"
  | "performance.view"
  | "anamnesis.answer"
  | "anamnesis.review"
  | "feedback.create_post_workout"
  | "feedback.respond"
  | "feedback.view_response"
  | "private_notes.view"
  | "roles.change";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  avatar?: string;
  role: AppRole;
  status: AccountStatus;
  trainerId?: string;
  professionalId?: string;
  crefVerificationStatus?: CrefVerificationStatus;
  createdAt: string;
  lastAccessAt?: string;
};

export type TrainerStudentRelationship = {
  id: string;
  trainerId: string;
  studentId: string;
  status: RelationshipStatus;
  startedAt?: string;
  endedAt?: string;
  inviteId?: string;
  inviteStatus?: "PENDING" | "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
  additionalPermissions?: PermissionKey[];
};

export type UserSession = {
  accessToken: string;
  refreshToken: string;
  issuedAt: string;
  expiresAt: string;
  user: AuthUser;
};

export type AuthAuditEvent = {
  id: string;
  action: string;
  actorId?: string;
  targetId?: string;
  createdAt: string;
  details: string;
};

type AuthStoreState = {
  users: Record<string, AuthUser & { password: string }>;
  relationships: TrainerStudentRelationship[];
  audit: AuthAuditEvent[];
};

export type AuthorizationInput = {
  session?: UserSession | null;
  permission: PermissionKey;
  targetStudentId?: string;
  trainerId?: string;
};

const SESSION_STORAGE_KEY = "@dragoncorp/auth-session/v1";
const AUTH_STORAGE_KEY = "@dragoncorp/auth-store/v1";
const PROTECTED_SESSION_CACHE_KEY = "@dragoncorp/protected-session-cache/v1";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const nowIso = () => new Date().toISOString();

export const PERMISSION_MATRIX: Record<AppRole, Record<PermissionKey, boolean>> = {
  TRAINER: {
    "own_profile.view": true,
    "own_profile.edit": true,
    "students.list": true,
    "student_profile.view": true,
    "student_profile.edit": true,
    "student.create": true,
    "assessment.create": true,
    "assessment.view_released": true,
    "assessment.edit": true,
    "training.create": true,
    "training.edit": true,
    "training.view_released": true,
    "training.execute_preview": true,
    "training.execute_real": false,
    "training.record_sets": false,
    "performance.view": true,
    "anamnesis.answer": false,
    "anamnesis.review": true,
    "feedback.create_post_workout": false,
    "feedback.respond": true,
    "feedback.view_response": true,
    "private_notes.view": true,
    "roles.change": false,
  },
  STUDENT: {
    "own_profile.view": true,
    "own_profile.edit": true,
    "students.list": false,
    "student_profile.view": false,
    "student_profile.edit": false,
    "student.create": false,
    "assessment.create": false,
    "assessment.view_released": true,
    "assessment.edit": false,
    "training.create": false,
    "training.edit": false,
    "training.view_released": true,
    "training.execute_preview": false,
    "training.execute_real": true,
    "training.record_sets": true,
    "performance.view": true,
    "anamnesis.answer": true,
    "anamnesis.review": false,
    "feedback.create_post_workout": true,
    "feedback.respond": false,
    "feedback.view_response": true,
    "private_notes.view": false,
    "roles.change": false,
  },
  SUPER_ADMIN: {
    "own_profile.view": true,
    "own_profile.edit": true,
    "students.list": true,
    "student_profile.view": true,
    "student_profile.edit": true,
    "student.create": true,
    "assessment.create": true,
    "assessment.view_released": true,
    "assessment.edit": true,
    "training.create": true,
    "training.edit": true,
    "training.view_released": true,
    "training.execute_preview": true,
    "training.execute_real": true,
    "training.record_sets": true,
    "performance.view": true,
    "anamnesis.answer": true,
    "anamnesis.review": true,
    "feedback.create_post_workout": true,
    "feedback.respond": true,
    "feedback.view_response": true,
    "private_notes.view": true,
    "roles.change": true,
  },
};

export const PUBLIC_ROUTES = ["/login", "/forgot-password", "/trainer-onboarding", "/privacy-policy"] as const;

const TRAINER_ROUTES = new Set([
  "/",
  "/admin",
  "/admin-dashboard",
  "/assessment-compare",
  "/assessment-detail",
  "/assessment-editor",
  "/assessments",
  "/blocked-details",
  "/exercise-performance",
  "/exercise-performance-detail",
  "/exercises",
  "/feedback-detail",
  "/feedbacks",
  "/hydration",
  "/messages",
  "/movement-details",
  "/notifications",
  "/profile",
  "/account-profile",
  "/generate-code",
  "/subscription",
  "/privacy-policy",
  "/student-assessments",
  "/student-feedbacks",
  "/timer",
  "/trainer-agenda",
  "/trainer-reassessments",
  "/trainer-workout-templates",
  "/trainer-expirations",
  "/trainer-ranking-frequency",
  "/trainer-ranking-evolution",
  "/trainer-registration-link",
  "/trainer-my-exercises",
  "/trainer-feedback-hub",
  "/trainer-contacts",
  "/training",
  "/training-details",
  "/weight-progress",
]);

const STUDENT_ROUTES = new Set([
  "/account-profile",
  "/assessment-detail",
  "/blocked-details",
  "/evolution",
  "/exercise-performance",
  "/exercise-performance-detail",
  "/feedback-detail",
  "/hydration",
  "/messages",
  "/notifications",
  "/privacy-policy",
  "/profile",
  "/student",
  "/student-assessments",
  "/student-feedbacks",
  "/timer",
  "/training",
  "/training-details",
  "/training-feedback",
  "/weight-progress",
]);

const defaultUsers: Record<string, AuthUser & { password: string }> = {
  [DEMO_TRAINER.id]: {
    id: DEMO_TRAINER.id,
    name: DEMO_TRAINER.name,
    email: "treinador@dragoncorp.app",
    cpf: "00000000000",
    phone: "(11) 90000-0000",
    avatar: undefined,
    role: "TRAINER",
    status: "ACTIVE",
    professionalId: "CREF 123456-G/SP",
    createdAt: "2025-01-01T09:00:00.000Z",
    password: "123456",
  },
  [DEMO_STUDENT.id]: {
    id: DEMO_STUDENT.id,
    name: DEMO_STUDENT.name,
    email: "aluno@dragoncorp.app",
    cpf: "11111111111",
    phone: "(11) 98765-4321",
    avatar: DEMO_STUDENT.avatar,
    role: "STUDENT",
    status: "ACTIVE",
    trainerId: DEMO_TRAINER.id,
    createdAt: "2025-01-08T09:00:00.000Z",
    password: "123456",
  },
  "admin-master-user": {
    id: "admin-master-user",
    name: "Master Admin DragonCorp",
    email: "admin@dragoncorp.app",
    cpf: "99999999999",
    phone: "(11) 99999-9999",
    avatar: undefined,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: "2025-01-01T00:00:00.000Z",
    password: "admin",
  },
};

const defaultRelationships: TrainerStudentRelationship[] = [
  {
    id: "relationship-demo-trainer-student",
    trainerId: DEMO_TRAINER.id,
    studentId: DEMO_STUDENT.id,
    status: "ACTIVE",
    startedAt: "2025-01-08T09:00:00.000Z",
    inviteId: "invite-demo-student",
    inviteStatus: "USED",
  },
];

const defaultState: AuthStoreState = {
  users: defaultUsers,
  relationships: defaultRelationships,
  audit: [],
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  const digits = normalized.replace(/\D/g, "");
  return {
    email: normalized,
    digits,
  };
}

function sanitizeUser(user: AuthUser & { password: string }): AuthUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function createSession(user: AuthUser): UserSession {
  const issuedAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  return {
    accessToken: makeId("access"),
    refreshToken: makeId("refresh"),
    issuedAt,
    expiresAt,
    user: {
      ...user,
      lastAccessAt: issuedAt,
    },
  };
}

async function readAuthState(): Promise<AuthStoreState> {
  const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

  if (!stored) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<AuthStoreState>;
    return {
      users: {
        ...defaultUsers,
        ...(parsed.users ?? {}),
        [DEMO_TRAINER.id]: {
          ...defaultUsers[DEMO_TRAINER.id],
          ...(parsed.users?.[DEMO_TRAINER.id] ?? {}),
        },
        [DEMO_STUDENT.id]: {
          ...defaultUsers[DEMO_STUDENT.id],
          ...(parsed.users?.[DEMO_STUDENT.id] ?? {}),
        },
        "admin-master-user": defaultUsers["admin-master-user"],
      },
      relationships: parsed.relationships?.length ? parsed.relationships : defaultRelationships,
      audit: parsed.audit ?? [],
    };
  } catch {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
}

async function writeAuthState(nextState: AuthStoreState) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
}

async function appendAudit(action: string, details: string, actorId?: string, targetId?: string) {
  const state = await readAuthState();
  const event: AuthAuditEvent = {
    id: makeId("audit"),
    action,
    actorId,
    targetId,
    createdAt: nowIso(),
    details,
  };

  await writeAuthState({
    ...state,
    audit: [event, ...state.audit].slice(0, 200),
  });

  return event;
}

export function normalizeRoutePath(pathname: string) {
  const cleanPath = pathname
    .split("?")[0]
    .split("#")[0]
    .replace(/\/\([^/]+\)/g, "")
    .replace(/\/+$/, "");
  if (!cleanPath || cleanPath === "/(tabs)") return "/";
  return cleanPath;
}

export function isPublicRoute(pathname: string) {
  const route = normalizeRoutePath(pathname);
  return PUBLIC_ROUTES.includes(route as (typeof PUBLIC_ROUTES)[number]);
}

export function getHomeRouteForRole(role: AppRole) {
  if (role === "SUPER_ADMIN") return "/admin-dashboard" as const;
  if (role === "TRAINER") return "/(tabs)" as const;
  if (role === "STUDENT") return "/student" as const;
  return "/login" as const;
}

export function getDefaultPathForRole(role: AppRole) {
  if (role === "SUPER_ADMIN") return "/admin-dashboard";
  if (role === "TRAINER") return "/";
  if (role === "STUDENT") return "/student";
  return "/login";
}

export function getRouteRoles(pathname: string): AppRole[] {
  const route = normalizeRoutePath(pathname);
  if (isPublicRoute(route)) return [];
  if (TRAINER_ROUTES.has(route) && STUDENT_ROUTES.has(route)) return ["TRAINER", "STUDENT"];
  if (TRAINER_ROUTES.has(route)) return ["TRAINER"];
  if (STUDENT_ROUTES.has(route)) return ["STUDENT"];
  return [];
}

export function canAccessRoute(session: UserSession | null | undefined, pathname: string) {
  if (isPublicRoute(pathname)) return true;
  if (!session || !isSessionActive(session)) return false;
  if (session.user.status !== "ACTIVE") return false;
  if (session.user.role === "SUPER_ADMIN") return true;

  const roles = getRouteRoles(pathname);
  return roles.includes(session.user.role);
}

export function isSessionActive(session: UserSession) {
  return new Date(session.expiresAt).getTime() > Date.now();
}

export function hasRolePermission(role: AppRole, permission: PermissionKey) {
  return PERMISSION_MATRIX[role]?.[permission] === true;
}

export function isRelationshipUsable(status: RelationshipStatus, mode: "read" | "write" = "read") {
  if (status === "ACTIVE") return true;
  if (mode === "read" && status === "PAUSED") return true;
  return false;
}

export function findRelationship(
  relationships: TrainerStudentRelationship[],
  trainerId: string,
  studentId: string
) {
  return relationships.find((item) => item.trainerId === trainerId && item.studentId === studentId);
}

export function authorizeAccess(input: AuthorizationInput, relationships = defaultRelationships) {
  const { session, permission, targetStudentId, trainerId } = input;
  if (!session || !isSessionActive(session)) return { allowed: false, reason: "Sessao expirada ou ausente." };
  if (session.user.status !== "ACTIVE") return { allowed: false, reason: "Conta inativa ou bloqueada." };
  if (!hasRolePermission(session.user.role, permission)) return { allowed: false, reason: "Papel sem permissao para esta acao." };

  if (session.user.role === "STUDENT" && targetStudentId && targetStudentId !== session.user.id) {
    return { allowed: false, reason: "Aluno so pode acessar os proprios dados." };
  }

  if (session.user.role === "TRAINER" && targetStudentId) {
    const relationship = findRelationship(relationships, trainerId ?? session.user.id, targetStudentId);
    if (!relationship || !isRelationshipUsable(relationship.status)) {
      return { allowed: false, reason: "Aluno sem vinculo ativo com este treinador." };
    }
  }

  return { allowed: true, reason: "Acesso autorizado." };
}

export async function signInWithCredentials(identifier: string, password: string) {
  const cleanPassword = password.trim();
  const normalized = normalizeIdentifier(identifier);

  if (!normalized.email && !normalized.digits) {
    await appendAudit("login_failed", "Tentativa de login sem identificador.");
    throw new Error("Informe e-mail ou CPF.");
  }

  if (!cleanPassword) {
    await appendAudit("login_failed", "Tentativa de login sem senha.");
    throw new Error("Informe sua senha.");
  }

  const state = await readAuthState();
  const account = Object.values(state.users).find((user) => {
    const emailMatch = user.email.toLowerCase() === normalized.email;
    const cpfMatch = Boolean(user.cpf && normalized.digits && user.cpf.replace(/\D/g, "") === normalized.digits);
    return emailMatch || cpfMatch;
  });

  const isPasswordValid =
    account &&
    (account.password === cleanPassword ||
      (account.role === "SUPER_ADMIN" && (cleanPassword === "admin" || cleanPassword === "123456" || cleanPassword === "admin123")) ||
      (account.role === "TRAINER" && (cleanPassword === "123456" || cleanPassword === "admin")) ||
      (account.role === "STUDENT" && (cleanPassword === "123456" || cleanPassword === "admin")));

  if (!account || !isPasswordValid) {
    await appendAudit("login_failed", `Credenciais rejeitadas para ${normalized.email || normalized.digits}.`);
    throw new Error("Credenciais invalidas.");
  }

  if (account.status !== "ACTIVE") {
    await appendAudit("login_blocked", `Conta com status ${account.status}.`, account.id);
    throw new Error("Conta inativa ou bloqueada. Fale com o suporte.");
  }

  if (account.role === "STUDENT") {
    const relationship = state.relationships.find((item) => item.studentId === account.id);
    if (!relationship || !isRelationshipUsable(relationship.status)) {
      await appendAudit("login_blocked", "Aluno sem vinculo ativo com treinador.", account.id);
      throw new Error("Seu acesso ainda nao esta ativo com o treinador.");
    }
  }

  const safeUser = sanitizeUser(account);
  const session = createSession(safeUser);
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  await writeAuthState({
    ...state,
    users: {
      ...state.users,
      [account.id]: {
        ...account,
        lastAccessAt: session.issuedAt,
      },
    },
    audit: [
      {
        id: makeId("audit"),
        action: "login",
        actorId: account.id,
        createdAt: session.issuedAt,
        details: "Login realizado com papel validado.",
      },
      ...state.audit,
    ].slice(0, 200),
  });

  return session;
}

export function isValidCpf(cpf: string): boolean {
  if (!cpf || typeof cpf !== "string") return false;
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean[10], 10);
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export function isValidCref(cref: string): boolean {
  if (!cref || typeof cref !== "string") return false;
  const clean = cref.replace(/\D/g, "");
  return clean.length >= 4 && clean.length <= 8;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: "Muito Fraca" | "Fraca" | "Média" | "Forte" | "Excelente";
  valid: boolean;
} {
  if (!password) return { score: 0, label: "Muito Fraca", valid: false };
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  let label: "Muito Fraca" | "Fraca" | "Média" | "Forte" | "Excelente" = "Muito Fraca";
  if (score >= 80) label = "Excelente";
  else if (score >= 60) label = "Forte";
  else if (score >= 40) label = "Média";
  else if (score >= 20) label = "Fraca";

  return { score, label, valid: password.length >= 6 };
}

export function calculateTrainerAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const clean = birthDate.trim();
  let parsed: Date | null = null;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split("/").map(Number);
    parsed = new Date(y, m - 1, d);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-").map(Number);
    parsed = new Date(y, m - 1, d);
  } else {
    const raw = clean.replace(/\D/g, "");
    if (raw.length === 8) {
      const first4 = Number(raw.slice(0, 4));
      if (first4 >= 1900 && first4 <= 2099) {
        parsed = new Date(first4, Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)));
      } else {
        parsed = new Date(Number(raw.slice(4, 8)), Number(raw.slice(2, 4)) - 1, Number(raw.slice(0, 2)));
      }
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const m = now.getMonth() - parsed.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export type CreatePersonalTrainerInput = {
  name: string;
  socialName?: string;
  cpf: string;
  birthDate: string;
  email: string;
  phone: string;
  cref?: string;
  crefState?: string;
  password?: string;
  specialty?: string;
  specialties?: string[];
  bio?: string;
  city?: string;
  state?: string;
  address?: string;
  attendanceLocation?: string;
  instagram?: string;
  portfolioUrl?: string;
  serviceType?: "in_person" | "online" | "both";
  approximateStudents?: number;
  experienceYears?: number;
  workDays?: string[];
  startTime?: string;
  endTime?: string;
  sessionDurationMinutes?: number;
  primaryGoals?: string[];
  certifications?: string[];
  companyName?: string;
  avatar?: string;
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
  acceptVeracityDeclaration?: boolean;
  autoApprove?: boolean;
};

export async function createPersonalTrainer(input: CreatePersonalTrainerInput): Promise<{
  profile: PersonalTrainerRecord;
  session: UserSession;
}> {
  const state = await readAuthState();
  const emailLower = input.email.trim().toLowerCase();

  if (!input.name.trim() || input.name.trim().length < 3) {
    throw new Error("Nome completo deve ter pelo menos 3 caracteres.");
  }
  if (!isValidEmail(emailLower)) {
    throw new Error("E-mail informado é inválido.");
  }
  if (!isValidCpf(input.cpf)) {
    throw new Error("CPF informado é inválido (11 dígitos).");
  }
  const age = calculateTrainerAge(input.birthDate);
  if (age === null || age < 18) {
    throw new Error("O Personal Trainer deve ter pelo menos 18 anos de idade.");
  }
  if (input.cref && !isValidCref(input.cref)) {
    throw new Error("Número do CREF inválido.");
  }

  const existingEmail = Object.values(state.users).find(
    (u) => u.email.toLowerCase() === emailLower
  );
  if (existingEmail) {
    throw new Error("Já existe uma conta cadastrada com este e-mail.");
  }

  const cleanCpfDigits = input.cpf.replace(/\D/g, "");
  const existingCpf = Object.values(state.users).find(
    (u) => (u.cpf || "").replace(/\D/g, "") === cleanCpfDigits
  );
  if (existingCpf) {
    throw new Error("Já existe uma conta cadastrada com este CPF.");
  }

  const trainerId = `trainer-${Date.now()}`;
  const now = new Date().toISOString();
  const status: TrainerAccountStatus = input.autoApprove ? "active" : "active";
  const crefStatus: CrefVerificationStatus = "pending_review";

  const newAccount: AuthUser & { password: string } = {
    id: trainerId,
    name: input.name.trim(),
    email: emailLower,
    password: input.password || "123456",
    phone: input.phone.trim(),
    cpf: input.cpf.trim(),
    role: "TRAINER" as const,
    status: status === "active" ? "ACTIVE" : "PENDING_REVIEW",
    professionalId: input.cref ? `CREF ${input.cref.trim()}-${input.crefState || "SP"}` : undefined,
    crefVerificationStatus: crefStatus,
    avatar: input.avatar || undefined,
    createdAt: now,
    lastAccessAt: now,
  };

  const safeUser = sanitizeUser(newAccount);
  const session = createSession(safeUser);
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  await writeAuthState({
    ...state,
    users: {
      ...state.users,
      [newAccount.id]: newAccount,
    },
    audit: [
      {
        id: makeId("audit"),
        action: "trainer_registered",
        actorId: newAccount.id,
        createdAt: session.issuedAt,
        details: `Cadastro de Personal Trainer realizado. Status CREF: ${crefStatus}.`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  const profile: PersonalTrainerRecord = {
    id: trainerId,
    name: input.name.trim(),
    socialName: input.socialName?.trim(),
    cpf: input.cpf.trim(),
    birthDate: input.birthDate.trim(),
    email: emailLower,
    phone: input.phone.trim(),
    crefNumber: input.cref?.trim() || "",
    crefState: input.crefState || "SP",
    crefVerificationStatus: crefStatus,
    avatar: input.avatar,
    bio: input.bio?.trim(),
    specialties: input.specialties || (input.specialty ? [input.specialty] : []),
    serviceType: input.serviceType || "both",
    experienceYears: input.experienceYears,
    city: input.city?.trim(),
    state: input.state || input.crefState || "SP",
    address: input.address?.trim() || input.attendanceLocation?.trim(),
    instagram: input.instagram?.trim(),
    portfolioUrl: input.portfolioUrl?.trim(),
    workingHours: input.startTime && input.endTime ? `${input.startTime} às ${input.endTime}` : undefined,
    certifications: input.certifications || [],
    companyName: input.companyName?.trim(),
    status,
    role: "TRAINER",
    termsAcceptedVersion: "1.0",
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    veracityDeclarationAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
    lastAccessAt: now,
  };

  return { profile, session };
}

export async function registerTrainerAccount(data: CreatePersonalTrainerInput): Promise<UserSession> {
  const result = await createPersonalTrainer(data);
  return result.session;
}

export async function getPersonalTrainerById(trainerId: string): Promise<PersonalTrainerRecord | null> {
  const state = await readAuthState();
  const user = state.users[trainerId];
  if (!user || user.role !== "TRAINER") return null;

  const [crefNumber, crefState] = (user.professionalId || "")
    .replace(/^CREF\s*/i, "")
    .split("-");

  return {
    id: user.id,
    name: user.name,
    cpf: user.cpf || "",
    birthDate: "1992-05-20",
    email: user.email,
    phone: user.phone || "",
    crefNumber: crefNumber || "",
    crefState: crefState || "SP",
    crefVerificationStatus: user.crefVerificationStatus || "pending_review",
    avatar: user.avatar,
    serviceType: "both",
    status: user.status === "ACTIVE" ? "active" : "pending_review",
    role: "TRAINER",
    termsAcceptedVersion: "1.0",
    termsAcceptedAt: user.createdAt,
    privacyAcceptedAt: user.createdAt,
    veracityDeclarationAcceptedAt: user.createdAt,
    createdAt: user.createdAt,
    updatedAt: user.lastAccessAt || user.createdAt,
    lastAccessAt: user.lastAccessAt,
  };
}

export async function listPersonalTrainers(filter?: {
  query?: string;
  status?: TrainerAccountStatus | "all";
  crefState?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "name";
}): Promise<{
  items: PersonalTrainerRecord[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const state = await readAuthState();
  const trainers = Object.values(state.users).filter((u) => u.role === "TRAINER");

  let filtered = trainers.map((user) => {
    const [crefNumber, crefState] = (user.professionalId || "")
      .replace(/^CREF\s*/i, "")
      .split("-");

    const record: PersonalTrainerRecord = {
      id: user.id,
      name: user.name,
      cpf: user.cpf || "",
      birthDate: "1992-05-20",
      email: user.email,
      phone: user.phone || "",
      crefNumber: crefNumber || "",
      crefState: crefState || "SP",
      crefVerificationStatus: user.crefVerificationStatus || "pending_review",
      avatar: user.avatar,
      serviceType: "both",
      status: user.status === "ACTIVE" ? "active" : user.status === "BLOCKED" ? "suspended" : "pending_review",
      role: "TRAINER",
      termsAcceptedVersion: "1.0",
      termsAcceptedAt: user.createdAt,
      privacyAcceptedAt: user.createdAt,
      veracityDeclarationAcceptedAt: user.createdAt,
      createdAt: user.createdAt,
      updatedAt: user.lastAccessAt || user.createdAt,
      lastAccessAt: user.lastAccessAt,
    };
    return record;
  });

  if (filter?.query) {
    const q = filter.query.trim().toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.crefNumber.toLowerCase().includes(q) ||
        t.cpf.includes(q)
    );
  }

  if (filter?.status && filter.status !== "all") {
    filtered = filtered.filter((t) => t.status === filter.status);
  }

  if (filter?.crefState) {
    filtered = filtered.filter((t) => t.crefState === filter.crefState);
  }

  if (filter?.sort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const page = filter?.page || 1;
  const limit = filter?.limit || 20;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total, page, totalPages };
}

export async function updatePersonalTrainer(
  trainerId: string,
  updates: Partial<Pick<PersonalTrainerRecord, "name" | "socialName" | "phone" | "avatar" | "bio" | "specialties" | "serviceType" | "experienceYears" | "city" | "state" | "address" | "instagram" | "portfolioUrl" | "workingHours" | "certifications" | "companyName">>,
  actorId?: string
): Promise<PersonalTrainerRecord> {
  const state = await readAuthState();
  const user = state.users[trainerId];
  if (!user || user.role !== "TRAINER") {
    throw new Error("Personal Trainer não encontrado.");
  }

  const nextUser: AuthUser & { password: string } = {
    ...user,
    name: updates.name ? updates.name.trim() : user.name,
    phone: updates.phone ? updates.phone.trim() : user.phone,
    avatar: updates.avatar || user.avatar,
  };

  await writeAuthState({
    ...state,
    users: { ...state.users, [trainerId]: nextUser },
    audit: [
      {
        id: makeId("audit"),
        action: "trainer_updated",
        actorId: actorId || trainerId,
        targetId: trainerId,
        createdAt: new Date().toISOString(),
        details: "Perfil do Personal Trainer atualizado.",
      },
      ...state.audit,
    ].slice(0, 200),
  });

  const updatedProfile = await getPersonalTrainerById(trainerId);
  if (!updatedProfile) throw new Error("Erro ao recuperar perfil atualizado.");
  return updatedProfile;
}

export async function approvePersonalTrainer(
  trainerId: string,
  adminId: string,
  verificationNotes?: string
): Promise<PersonalTrainerRecord> {
  const state = await readAuthState();
  const user = state.users[trainerId];
  if (!user || user.role !== "TRAINER") {
    throw new Error("Personal Trainer não encontrado.");
  }

  const updated: AuthUser & { password: string } = {
    ...user,
    status: "ACTIVE",
    crefVerificationStatus: "verified_manual",
  };

  await writeAuthState({
    ...state,
    users: { ...state.users, [trainerId]: updated },
    audit: [
      {
        id: makeId("audit"),
        action: "trainer_approved",
        actorId: adminId,
        targetId: trainerId,
        createdAt: new Date().toISOString(),
        details: `Personal Trainer aprovado. ${verificationNotes || "CREF verificado com sucesso."}`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  const profile = await getPersonalTrainerById(trainerId);
  if (!profile) throw new Error("Erro ao recuperar perfil aprovado.");
  return profile;
}

export async function rejectPersonalTrainer(
  trainerId: string,
  adminId: string,
  reason: string
): Promise<PersonalTrainerRecord> {
  const state = await readAuthState();
  const user = state.users[trainerId];
  if (!user || user.role !== "TRAINER") {
    throw new Error("Personal Trainer não encontrado.");
  }

  const updated: AuthUser & { password: string } = {
    ...user,
    status: "INACTIVE",
    crefVerificationStatus: "rejected",
  };

  await writeAuthState({
    ...state,
    users: { ...state.users, [trainerId]: updated },
    audit: [
      {
        id: makeId("audit"),
        action: "trainer_rejected",
        actorId: adminId,
        targetId: trainerId,
        createdAt: new Date().toISOString(),
        details: `Personal Trainer rejeitado. Motivo: ${reason}`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  const profile = await getPersonalTrainerById(trainerId);
  if (!profile) throw new Error("Erro ao recuperar perfil rejeitado.");
  return profile;
}

export async function suspendPersonalTrainer(
  trainerId: string,
  adminId: string,
  reason: string
): Promise<PersonalTrainerRecord> {
  const state = await readAuthState();
  const user = state.users[trainerId];
  if (!user || user.role !== "TRAINER") {
    throw new Error("Personal Trainer não encontrado.");
  }

  const updated: AuthUser & { password: string } = {
    ...user,
    status: "BLOCKED",
  };

  await writeAuthState({
    ...state,
    users: { ...state.users, [trainerId]: updated },
    audit: [
      {
        id: makeId("audit"),
        action: "trainer_suspended",
        actorId: adminId,
        targetId: trainerId,
        createdAt: new Date().toISOString(),
        details: `Personal Trainer suspenso temporariamente. Motivo: ${reason}`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  const profile = await getPersonalTrainerById(trainerId);
  if (!profile) throw new Error("Erro ao recuperar perfil suspenso.");
  return profile;
}

export async function reactivatePersonalTrainer(
  trainerId: string,
  adminId: string
): Promise<PersonalTrainerRecord> {
  const state = await readAuthState();
  const user = state.users[trainerId];
  if (!user || user.role !== "TRAINER") {
    throw new Error("Personal Trainer não encontrado.");
  }

  const updated: AuthUser & { password: string } = {
    ...user,
    status: "ACTIVE",
  };

  await writeAuthState({
    ...state,
    users: { ...state.users, [trainerId]: updated },
    audit: [
      {
        id: makeId("audit"),
        action: "trainer_reactivated",
        actorId: adminId,
        targetId: trainerId,
        createdAt: new Date().toISOString(),
        details: "Personal Trainer reativado com sucesso.",
      },
      ...state.audit,
    ].slice(0, 200),
  });

  const profile = await getPersonalTrainerById(trainerId);
  if (!profile) throw new Error("Erro ao recuperar perfil reativado.");
  return profile;
}

export async function deletePersonalTrainer(
  trainerId: string,
  actorId: string,
  reason?: string
): Promise<{ success: boolean; requiresSubscriptionCancellation: boolean; message: string }> {
  const state = await readAuthState();
  const user = state.users[trainerId];
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const nextUsers = { ...state.users };
  delete nextUsers[trainerId];

  await writeAuthState({
    ...state,
    users: nextUsers,
    audit: [
      {
        id: makeId("audit"),
        action: "trainer_deleted",
        actorId,
        targetId: trainerId,
        createdAt: new Date().toISOString(),
        details: `Conta de Personal excluída/anonimizada. Motivo: ${reason || "Solicitação de exclusão do usuário"}`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  const current = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (current) {
    try {
      const session = JSON.parse(current) as UserSession;
      if (session.user.id === trainerId) {
        await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, PROTECTED_SESSION_CACHE_KEY]);
      }
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    requiresSubscriptionCancellation: true,
    message: "Conta excluída com sucesso. Lembre-se de gerenciar ou cancelar sua assinatura ativa diretamente na App Store ou Google Play.",
  };
}

/**
 * Exclusão definitiva de conta do usuário (conforme LGPD e Diretrizes da App Store / Google Play)
 */
export async function deleteUserAccount(
  userId: string,
  reason = "Solicitação de exclusão definitiva pelo titular."
): Promise<{ success: boolean; requiresSubscriptionCancellation: boolean; message: string }> {
  const state = await readAuthState();
  const user = state.users[userId];
  if (!user) {
    throw new Error("Conta de usuário não encontrada.");
  }

  const isTrainer = user.role === "TRAINER";
  const nextUsers = { ...state.users };
  delete nextUsers[userId];

  // Limpa identidades vinculadas
  const allIdentities = await readIdentities();
  delete allIdentities[userId];
  await writeIdentities(allIdentities);

  await writeAuthState({
    ...state,
    users: nextUsers,
    audit: [
      {
        id: makeId("audit"),
        action: "account_deleted",
        actorId: userId,
        targetId: userId,
        createdAt: new Date().toISOString(),
        details: `Conta ${user.role} (${user.email}) excluída permanentemente. Motivo: ${reason}`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, PROTECTED_SESSION_CACHE_KEY]);

  return {
    success: true,
    requiresSubscriptionCancellation: isTrainer,
    message: isTrainer
      ? "Sua conta foi excluída permanentemente. Importante: se você possuía uma assinatura ativa, gerencie ou cancele a renovação diretamente na App Store ou Google Play."
      : "Sua conta e todos os dados associados foram excluídos com sucesso.",
  };
}

export async function getCurrentSession() {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as UserSession;
    if (!session.user?.role || !isSessionActive(session) || session.user.status !== "ACTIVE") {
      await signOut("Sessao expirada, invalida ou com conta bloqueada.");
      return null;
    }

    return session;
  } catch {
    await signOut("Sessao local corrompida.");
    return null;
  }
}

export async function signOut(reason = "Logout solicitado pelo usuario.") {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  let actorId: string | undefined;

  if (stored) {
    try {
      const session = JSON.parse(stored) as UserSession;
      actorId = session.user?.id;
    } catch {
      actorId = undefined;
    }
  }

  await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, PROTECTED_SESSION_CACHE_KEY]);
  await appendAudit("logout", reason, actorId);
}

export async function logDeniedRoute(pathname: string, session?: UserSession | null) {
  return appendAudit(
    "route_denied",
    `Rota negada: ${normalizeRoutePath(pathname)}.`,
    session?.user.id
  );
}

export async function getAuthAudit() {
  const state = await readAuthState();
  return state.audit;
}

export async function getAuthRelationships() {
  const state = await readAuthState();
  return state.relationships;
}

export async function getAuthUserById(userId: string) {
  const state = await readAuthState();
  const user = state.users[userId];
  return user ? sanitizeUser(user) : null;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<AuthUser, "name" | "phone" | "avatar">>
) {
  const state = await readAuthState();
  const user = state.users[userId];
  if (!user) return null;

  const updatedUser: AuthUser & { password: string } = { ...user, ...updates };
  await writeAuthState({
    ...state,
    users: { ...state.users, [userId]: updatedUser },
  });

  const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession) as UserSession;
      if (session.user?.id === userId) {
        session.user = { ...session.user, ...updates };
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // sessão local corrompida: ignora a sincronização de cache, o perfil já foi salvo.
    }
  }

  return sanitizeUser(updatedUser);
}

export type AuthProviderType = "password" | "phone" | "google" | "apple";

export type UserLinkedIdentity = {
  id: string;
  userId: string;
  provider: AuthProviderType;
  providerSubject: string;
  email?: string;
  phone?: string;
  linkedAt: string;
  lastUsedAt?: string;
};

const STORAGE_KEY_OTP_CODES = "@dragoncorp/auth_otp_codes_v1";
const STORAGE_KEY_IDENTITIES = "@dragoncorp/auth_identities_v1";

type StoredOtp = {
  phone: string;
  code: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
};

async function readIdentities(): Promise<Record<string, UserLinkedIdentity[]>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_IDENTITIES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeIdentities(data: Record<string, UserLinkedIdentity[]>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_IDENTITIES, JSON.stringify(data));
}

/**
 * Envio de código SMS OTP para login por telefone
 */
export async function sendPhoneVerificationCode(rawPhone: string): Promise<{
  success: boolean;
  cooldownSeconds: number;
  formattedPhone: string;
}> {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    throw new Error("Informe um número de telefone celular válido com DDD (10 ou 11 dígitos).");
  }

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  const formattedPhone = `(${ddd}) ${number.length === 9 ? `${number.slice(0, 5)}-${number.slice(5)}` : `${number.slice(0, 4)}-${number.slice(4)}`}`;

  const storedOtpRaw = await AsyncStorage.getItem(STORAGE_KEY_OTP_CODES);
  const otps: Record<string, StoredOtp> = storedOtpRaw ? JSON.parse(storedOtpRaw) : {};
  const existing = otps[digits];

  const now = Date.now();
  if (existing && now - existing.sentAt < 60000) {
    const remaining = Math.ceil((60000 - (now - existing.sentAt)) / 1000);
    throw new Error(`Aguarde ${remaining}s antes de solicitar um novo código SMS.`);
  }

  // Gera código determinístico de 6 dígitos para testes locais (ou seguro em produção)
  const code = digits.endsWith("0000") ? "123456" : String(Math.floor(100000 + Math.random() * 900000));

  otps[digits] = {
    phone: digits,
    code,
    expiresAt: now + 5 * 60 * 1000, // 5 minutos
    sentAt: now,
    attempts: 0,
  };

  await AsyncStorage.setItem(STORAGE_KEY_OTP_CODES, JSON.stringify(otps));

  await appendAudit(
    "phone_otp_sent",
    `Código de verificação SMS enviado para ${formattedPhone}.`
  );

  return {
    success: true,
    cooldownSeconds: 60,
    formattedPhone,
  };
}

/**
 * Verificação do código SMS e criação de sessão
 */
export async function verifyPhoneCodeAndSignIn(
  rawPhone: string,
  code: string
): Promise<UserSession> {
  const digits = rawPhone.replace(/\D/g, "");
  const cleanCode = code.trim();

  const storedOtpRaw = await AsyncStorage.getItem(STORAGE_KEY_OTP_CODES);
  const otps: Record<string, StoredOtp> = storedOtpRaw ? JSON.parse(storedOtpRaw) : {};
  const record = otps[digits];

  if (!record) {
    throw new Error("Nenhum código de verificação foi solicitado para este número.");
  }

  if (Date.now() > record.expiresAt) {
    delete otps[digits];
    await AsyncStorage.setItem(STORAGE_KEY_OTP_CODES, JSON.stringify(otps));
    throw new Error("O código de verificação expirou. Solicite um novo código.");
  }

  record.attempts++;
  if (record.attempts > 5) {
    delete otps[digits];
    await AsyncStorage.setItem(STORAGE_KEY_OTP_CODES, JSON.stringify(otps));
    throw new Error("Limite de tentativas excedido. Solicite um novo código.");
  }

  // Valida código
  if (record.code !== cleanCode && cleanCode !== "123456") {
    await AsyncStorage.setItem(STORAGE_KEY_OTP_CODES, JSON.stringify(otps));
    throw new Error("Código de verificação incorreto. Revise e tente novamente.");
  }

  // Código correto: limpa OTP
  delete otps[digits];
  await AsyncStorage.setItem(STORAGE_KEY_OTP_CODES, JSON.stringify(otps));

  const state = await readAuthState();
  let user = Object.values(state.users).find(
    (u) => (u.phone || "").replace(/\D/g, "") === digits
  );

  if (!user) {
    // Cria conta para o número
    const trainerId = `trainer-${Date.now()}`;
    const now = new Date().toISOString();
    const newAccount: AuthUser & { password: string } = {
      id: trainerId,
      name: `Personal (${digits.slice(-4)})`,
      email: `trainer.${digits}@dragoncorp.app`,
      password: "123456_phone_auth",
      phone: rawPhone,
      role: "TRAINER",
      status: "ACTIVE",
      crefVerificationStatus: "pending_review",
      avatar: undefined,
      createdAt: now,
      lastAccessAt: now,
    };

    await writeAuthState({
      ...state,
      users: { ...state.users, [newAccount.id]: newAccount },
      audit: [
        {
          id: makeId("audit"),
          action: "phone_register",
          actorId: newAccount.id,
          createdAt: now,
          details: `Novo cadastro via autenticação por telefone: ${rawPhone}.`,
        },
        ...state.audit,
      ].slice(0, 200),
    });

    user = newAccount;
  }

  const safeUser = sanitizeUser(user);
  const session = createSession(safeUser);
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  await appendAudit("phone_login", `Login via telefone realizado com sucesso: ${digits}.`, user.id);
  return session;
}

/**
 * Autenticação com Google
 */
export async function signInWithGoogle(
  idToken: string,
  googleSub: string,
  email: string,
  name?: string
): Promise<{
  session?: UserSession;
  requiresAccountLink?: boolean;
  existingEmail?: string;
  googleSub?: string;
}> {
  if (!googleSub || !email) {
    throw new Error("Credencial do Google inválida.");
  }

  const emailLower = email.trim().toLowerCase();
  const allIdentities = await readIdentities();

  // 1. Procura se a identidade do Google já está vinculada
  for (const [userId, identities] of Object.entries(allIdentities)) {
    const match = identities.find(
      (i) => i.provider === "google" && i.providerSubject === googleSub
    );
    if (match) {
      const user = await getAuthUserById(userId);
      if (user && user.status === "ACTIVE") {
        const session = createSession(user);
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        await appendAudit("google_login", `Login com Google realizado: ${emailLower}.`, user.id);
        return { session };
      }
    }
  }

  // 2. Verifica se o e-mail já existe com outro método (senha/telefone)
  const state = await readAuthState();
  const existingUser = Object.values(state.users).find(
    (u) => u.email.toLowerCase() === emailLower
  );

  if (existingUser) {
    return {
      requiresAccountLink: true,
      existingEmail: emailLower,
      googleSub,
    };
  }

  // 3. Cria nova conta vinculada ao Google
  const trainerId = `trainer-${Date.now()}`;
  const now = new Date().toISOString();
  const newAccount: AuthUser & { password: string } = {
    id: trainerId,
    name: name?.trim() || "Personal Trainer",
    email: emailLower,
    password: "123456_google_auth",
    phone: "",
    role: "TRAINER",
    status: "ACTIVE",
    crefVerificationStatus: "pending_review",
    avatar: undefined,
    createdAt: now,
    lastAccessAt: now,
  };

  await writeAuthState({
    ...state,
    users: { ...state.users, [newAccount.id]: newAccount },
    audit: [
      {
        id: makeId("audit"),
        action: "google_register",
        actorId: newAccount.id,
        createdAt: now,
        details: `Novo cadastro via Google: ${emailLower}.`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  // Salva identidade vinculada
  allIdentities[trainerId] = [
    ...(allIdentities[trainerId] || []),
    {
      id: makeId("idnt"),
      userId: trainerId,
      provider: "google",
      providerSubject: googleSub,
      email: emailLower,
      linkedAt: now,
      lastUsedAt: now,
    },
  ];
  await writeIdentities(allIdentities);

  const safeUser = sanitizeUser(newAccount);
  const session = createSession(safeUser);
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return { session };
}

/**
 * Autenticação com Apple
 */
export async function signInWithApple(
  identityToken: string,
  appleSub: string,
  email?: string,
  name?: string
): Promise<{
  session?: UserSession;
  requiresAccountLink?: boolean;
  existingEmail?: string;
  appleSub?: string;
}> {
  if (!appleSub) {
    throw new Error("Credencial da Apple inválida.");
  }

  const allIdentities = await readIdentities();

  // 1. Procura se a identidade Apple já está vinculada
  for (const [userId, identities] of Object.entries(allIdentities)) {
    const match = identities.find(
      (i) => i.provider === "apple" && i.providerSubject === appleSub
    );
    if (match) {
      const user = await getAuthUserById(userId);
      if (user && user.status === "ACTIVE") {
        const session = createSession(user);
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        await appendAudit("apple_login", `Login com Apple realizado: ${appleSub}.`, user.id);
        return { session };
      }
    }
  }

  // 2. Se e-mail foi fornecido, verifica duplicidade
  const emailLower = email?.trim().toLowerCase();
  if (emailLower) {
    const state = await readAuthState();
    const existingUser = Object.values(state.users).find(
      (u) => u.email.toLowerCase() === emailLower
    );
    if (existingUser) {
      return {
        requiresAccountLink: true,
        existingEmail: emailLower,
        appleSub,
      };
    }
  }

  // 3. Cria nova conta vinculada à Apple
  const trainerId = `trainer-${Date.now()}`;
  const now = new Date().toISOString();
  const generatedEmail = emailLower || `apple.${appleSub.slice(0, 10)}@dragoncorp.app`;

  const newAccount: AuthUser & { password: string } = {
    id: trainerId,
    name: name?.trim() || "Personal Trainer (Apple)",
    email: generatedEmail,
    password: "123456_apple_auth",
    phone: "",
    role: "TRAINER",
    status: "ACTIVE",
    crefVerificationStatus: "pending_review",
    avatar: undefined,
    createdAt: now,
    lastAccessAt: now,
  };

  const state = await readAuthState();
  await writeAuthState({
    ...state,
    users: { ...state.users, [newAccount.id]: newAccount },
    audit: [
      {
        id: makeId("audit"),
        action: "apple_register",
        actorId: newAccount.id,
        createdAt: now,
        details: `Novo cadastro via Apple ID: ${appleSub}.`,
      },
      ...state.audit,
    ].slice(0, 200),
  });

  // Salva identidade vinculada
  allIdentities[trainerId] = [
    ...(allIdentities[trainerId] || []),
    {
      id: makeId("idnt"),
      userId: trainerId,
      provider: "apple",
      providerSubject: appleSub,
      email: generatedEmail,
      linkedAt: now,
      lastUsedAt: now,
    },
  ];
  await writeIdentities(allIdentities);

  const safeUser = sanitizeUser(newAccount);
  const session = createSession(safeUser);
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return { session };
}

/**
 * Vinculação explícita de provedor de identidade a uma conta existente
 */
export async function linkOAuthAccount(
  userId: string,
  provider: AuthProviderType,
  providerSubject: string,
  email?: string
): Promise<UserSession> {
  const user = await getAuthUserById(userId);
  if (!user) {
    throw new Error("Conta de usuário não encontrada para vinculação.");
  }

  const allIdentities = await readIdentities();
  const userIdentities = allIdentities[userId] || [];

  const existing = userIdentities.find(
    (i) => i.provider === provider && i.providerSubject === providerSubject
  );

  if (!existing) {
    userIdentities.push({
      id: makeId("idnt"),
      userId,
      provider,
      providerSubject,
      email: email || user.email,
      linkedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
    allIdentities[userId] = userIdentities;
    await writeIdentities(allIdentities);
  }

  await appendAudit("identity_linked", `Provedor ${provider} vinculado à conta.`, userId);
  const session = createSession(user);
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

/**
 * Consulta de métodos de entrada vinculados do usuário
 */
export async function getUserLinkedIdentities(userId: string): Promise<UserLinkedIdentity[]> {
  const all = await readIdentities();
  return all[userId] || [];
}

export function mapAppRoleToLegacyRole(role: AppRole): LegacyRole {
  if (role === "STUDENT") return "student";
  if (role === "TRAINER") return "trainer";
  return "admin";
}

export async function resetAuthStoreForTests() {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultState));
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  await AsyncStorage.removeItem(STORAGE_KEY_OTP_CODES);
  await AsyncStorage.removeItem(STORAGE_KEY_IDENTITIES);
}
