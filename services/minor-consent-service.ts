import AsyncStorage from "@react-native-async-storage/async-storage";
import { isValidCpf, isValidEmail } from "@/services/auth-store";

export type GuardianRelationship = "pai" | "mae" | "tutor_legal" | "responsavel_judicial";

export type MinorGuardianConsent = {
  studentId: string;
  studentName: string;
  studentBirthDate: string;
  studentAge: number;
  guardianName: string;
  guardianRelationship: GuardianRelationship;
  guardianCpf: string;
  guardianPhone: string;
  guardianEmail?: string;
  verifiedContact: boolean;
  consentDocumentVersion: string;
  consentedAt: string;
  allowPhysicalAssessments: boolean;
  allowProgressPhotos: boolean;
  allowDietaryTracking: boolean;
  isRevoked: boolean;
  revokedAt?: string;
  revocationReason?: string;
  recordedByTrainerId: string;
  auditTrail: {
    action: string;
    timestamp: string;
    actor: string;
    details: string;
  }[];
};

const GUARDIAN_CONSENT_STORAGE_PREFIX = "@dragoncorp/guardian_consent_v1_";

export function isStudentMinor(birthDate: string, referenceDate = new Date()): { isMinor: boolean; age: number | null } {
  if (!birthDate || typeof birthDate !== "string") return { isMinor: false, age: null };

  let birth: Date;
  if (birthDate.includes("/")) {
    const [d, m, y] = birthDate.split("/").map((v) => parseInt(v, 10));
    birth = new Date(y, m - 1, d);
  } else if (birthDate.includes("-")) {
    const [y, m, d] = birthDate.split("-").map((v) => parseInt(v, 10));
    birth = new Date(y, m - 1, d);
  } else if (/^\d{8}$/.test(birthDate)) {
    const y = parseInt(birthDate.slice(0, 4), 10);
    const m = parseInt(birthDate.slice(4, 6), 10);
    const d = parseInt(birthDate.slice(6, 8), 10);
    birth = new Date(y, m - 1, d);
  } else {
    return { isMinor: false, age: null };
  }

  if (isNaN(birth.getTime())) return { isMinor: false, age: null };

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }

  return {
    isMinor: age < 18 && age >= 0,
    age,
  };
}

export function validateGuardianData(data: {
  guardianName: string;
  guardianRelationship: GuardianRelationship;
  guardianCpf: string;
  guardianPhone: string;
  guardianEmail?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.guardianName || data.guardianName.trim().length < 3) {
    errors.push("Nome completo do responsável legal é obrigatório.");
  }

  if (!data.guardianCpf || !isValidCpf(data.guardianCpf)) {
    errors.push("CPF do responsável legal é inválido.");
  }

  const cleanPhone = (data.guardianPhone || "").replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    errors.push("Telefone com DDD do responsável legal é obrigatório.");
  }

  if (data.guardianEmail && !isValidEmail(data.guardianEmail)) {
    errors.push("E-mail do responsável legal possui formato inválido.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function saveGuardianConsent(
  consent: Omit<MinorGuardianConsent, "isRevoked" | "auditTrail">
): Promise<MinorGuardianConsent> {
  const validation = validateGuardianData({
    guardianName: consent.guardianName,
    guardianRelationship: consent.guardianRelationship,
    guardianCpf: consent.guardianCpf,
    guardianPhone: consent.guardianPhone,
    guardianEmail: consent.guardianEmail,
  });

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const record: MinorGuardianConsent = {
    ...consent,
    isRevoked: false,
    auditTrail: [
      {
        action: "CONSENT_REGISTERED",
        timestamp: new Date().toISOString(),
        actor: consent.recordedByTrainerId,
        details: `Consentimento do responsável ${consent.guardianName} (${consent.guardianRelationship}) registrado para o aluno menor de idade.`,
      },
    ],
  };

  await AsyncStorage.setItem(
    `${GUARDIAN_CONSENT_STORAGE_PREFIX}${consent.studentId}`,
    JSON.stringify(record)
  );

  return record;
}

export async function getGuardianConsent(studentId: string): Promise<MinorGuardianConsent | null> {
  try {
    const raw = await AsyncStorage.getItem(`${GUARDIAN_CONSENT_STORAGE_PREFIX}${studentId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function revokeGuardianConsent(
  studentId: string,
  revokedBy: string,
  reason: string
): Promise<MinorGuardianConsent> {
  const current = await getGuardianConsent(studentId);
  if (!current) {
    throw new Error("Consentimento não encontrado para este aluno.");
  }

  current.isRevoked = true;
  current.revokedAt = new Date().toISOString();
  current.revocationReason = reason;
  current.auditTrail.push({
    action: "CONSENT_REVOKED",
    timestamp: new Date().toISOString(),
    actor: revokedBy,
    details: `Consentimento revogado. Motivo: ${reason}`,
  });

  await AsyncStorage.setItem(
    `${GUARDIAN_CONSENT_STORAGE_PREFIX}${studentId}`,
    JSON.stringify(current)
  );

  return current;
}

export async function validateMinorActionAllowed(
  studentId: string,
  birthDate: string,
  action: "assessment" | "photo" | "diet"
): Promise<{ allowed: boolean; reason?: string }> {
  const { isMinor, age } = isStudentMinor(birthDate);

  // Alunos maiores de 18 anos não necessitam de consentimento de responsável
  if (!isMinor) {
    return { allowed: true };
  }

  // Alunos menores de idade precisam de consentimento ativo
  const consent = await getGuardianConsent(studentId);

  if (!consent) {
    return {
      allowed: false,
      reason: `Aluno tem ${age} anos (menor de 18). É obrigatório registrar e validar o consentimento expresso do responsável legal antes de prosseguir.`,
    };
  }

  if (consent.isRevoked) {
    return {
      allowed: false,
      reason: `O consentimento do responsável foi revogado em ${consent.revokedAt}. Motivo: ${consent.revocationReason || "Não especificado"}.`,
    };
  }

  if (action === "assessment" && !consent.allowPhysicalAssessments) {
    return {
      allowed: false,
      reason: "O responsável legal não autorizou a realização de avaliações físicas para este aluno menor.",
    };
  }

  if (action === "photo" && !consent.allowProgressPhotos) {
    return {
      allowed: false,
      reason: "O responsável legal não autorizou o registro e armazenamento de fotos corporais para este aluno menor.",
    };
  }

  return { allowed: true };
}
