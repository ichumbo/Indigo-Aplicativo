import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEMO_STUDENT, DEMO_TRAINER } from "@/services/feedback-store";

export type AppRole = "TRAINER" | "STUDENT" | "SUPER_ADMIN";
export type AccountStatus = "ACTIVE" | "PENDING_REVIEW" | "INACTIVE" | "BLOCKED";
export type RelationshipStatus = "PENDING" | "ACTIVE" | "PAUSED" | "ENDED" | "REVOKED";
export type LegacyRole = "trainer" | "student" | "admin";

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

const SESSION_STORAGE_KEY = "@indigo/auth-session/v1";
const AUTH_STORAGE_KEY = "@indigo/auth-store/v1";
const PROTECTED_SESSION_CACHE_KEY = "@indigo/protected-session-cache/v1";
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
    "own_profile.edit": false,
    "students.list": false,
    "student_profile.view": false,
    "student_profile.edit": false,
    "student.create": false,
    "assessment.create": false,
    "assessment.view_released": false,
    "assessment.edit": false,
    "training.create": false,
    "training.edit": false,
    "training.view_released": false,
    "training.execute_preview": false,
    "training.execute_real": false,
    "training.record_sets": false,
    "performance.view": false,
    "anamnesis.answer": false,
    "anamnesis.review": false,
    "feedback.create_post_workout": false,
    "feedback.respond": false,
    "feedback.view_response": false,
    "private_notes.view": false,
    "roles.change": false,
  },
};

export const PUBLIC_ROUTES = ["/login", "/forgot-password"] as const;

const TRAINER_ROUTES = new Set([
  "/",
  "/admin",
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
  "/movement-details",
  "/notifications",
  "/profile",
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
  "/assessment-detail",
  "/blocked-details",
  "/evolution",
  "/exercise-performance",
  "/exercise-performance-detail",
  "/feedback-detail",
  "/hydration",
  "/messages",
  "/notifications",
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
    email: "treinador@indigo.app",
    cpf: "00000000000",
    phone: "(11) 90000-0000",
    avatar: "https://i.pravatar.cc/150?img=32",
    role: "TRAINER",
    status: "ACTIVE",
    professionalId: "CREF 123456-G/SP",
    createdAt: "2025-01-01T09:00:00.000Z",
    password: "123456",
  },
  [DEMO_STUDENT.id]: {
    id: DEMO_STUDENT.id,
    name: DEMO_STUDENT.name,
    email: "aluno@indigo.app",
    cpf: "11111111111",
    phone: "(11) 98765-4321",
    avatar: DEMO_STUDENT.avatar,
    role: "STUDENT",
    status: "ACTIVE",
    trainerId: DEMO_TRAINER.id,
    createdAt: "2025-01-08T09:00:00.000Z",
    password: "123456",
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
      users: { ...defaultUsers, ...(parsed.users ?? {}) },
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
  if (role === "TRAINER") return "/(tabs)" as const;
  if (role === "STUDENT") return "/student" as const;
  return "/login" as const;
}

export function getDefaultPathForRole(role: AppRole) {
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
    return user.email.toLowerCase() === normalized.email || (user.cpf && user.cpf.replace(/\D/g, "") === normalized.digits);
  });

  if (!account || account.password !== cleanPassword) {
    await appendAudit("login_failed", `Credenciais rejeitadas para ${normalized.email || normalized.digits}.`);
    throw new Error("Credenciais invalidas.");
  }

  if (account.role === "SUPER_ADMIN") {
    await appendAudit("login_blocked", "Perfil SUPER_ADMIN ainda nao esta habilitado no app.", account.id);
    throw new Error("Perfil ainda nao habilitado no aplicativo.");
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

export async function getCurrentSession() {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as UserSession;
    if (!session.user?.role || !isSessionActive(session) || session.user.status !== "ACTIVE") {
      await signOut("Sessao expirada, invalida ou com conta bloqueada.");
      return null;
    }

    if (session.user.role === "SUPER_ADMIN") {
      await signOut("Sessao SUPER_ADMIN nao habilitada.");
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

export function mapAppRoleToLegacyRole(role: AppRole): LegacyRole {
  if (role === "STUDENT") return "student";
  if (role === "TRAINER") return "trainer";
  return "admin";
}

export async function resetAuthStoreForTests() {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultState));
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}
