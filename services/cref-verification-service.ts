import AsyncStorage from "@react-native-async-storage/async-storage";
import { isValidCref } from "@/services/auth-store";

export type CrefStatus =
  | "not_provided"
  | "unverified"
  | "pending_review"
  | "verified_manual"
  | "verified_integration"
  | "rejected"
  | "expired"
  | "suspended"
  | "update_required";

export type CrefAuditEntry = {
  action: string;
  previousStatus?: CrefStatus;
  newStatus: CrefStatus;
  performedByUserId: string;
  performedByRole: "ADMIN" | "SYSTEM" | "TRAINER";
  consultationSource?: string;
  adminNotes?: string;
  timestamp: string;
};

export type CrefVerificationRecord = {
  trainerId: string;
  trainerName: string;
  crefNumber: string;
  crefState: string;
  status: CrefStatus;
  documentProofUri?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  consultationSource?: string;
  adminNotes?: string;
  expirationDate?: string;
  rejectionReason?: string;
  history: CrefAuditEntry[];
};

const CREF_STORAGE_PREFIX = "@dragoncorp/cref_verification_v1_";

export function isCrefStatusActiveAndVerified(status: CrefStatus): boolean {
  return status === "verified_manual" || status === "verified_integration";
}

export function getCrefStatusPresentation(status: CrefStatus): {
  label: string;
  color: string;
  badgeBg: string;
  description: string;
  showVerifiedBadge: boolean;
} {
  switch (status) {
    case "verified_manual":
      return {
        label: "CREF Verificado (Manual)",
        color: "#10B981",
        badgeBg: "rgba(16, 185, 129, 0.15)",
        description: "Registro profissional conferido e validado pela administração DragonCorp.",
        showVerifiedBadge: true,
      };
    case "verified_integration":
      return {
        label: "CREF Verificado Oficial",
        color: "#10B981",
        badgeBg: "rgba(16, 185, 129, 0.15)",
        description: "Registro profissional validado via integração oficial de conselho regional.",
        showVerifiedBadge: true,
      };
    case "pending_review":
      return {
        label: "CREF em Análise",
        color: "#F59E0B",
        badgeBg: "rgba(245, 158, 11, 0.15)",
        description: "Documento enviado e aguardando conferência do time de compliance.",
        showVerifiedBadge: false,
      };
    case "unverified":
      return {
        label: "Não Verificado",
        color: "#9CA3AF",
        badgeBg: "rgba(156, 163, 175, 0.15)",
        description: "CREF informado pelo usuário, pendente de envio de comprovante.",
        showVerifiedBadge: false,
      };
    case "rejected":
      return {
        label: "CREF Rejeitado",
        color: "#EF4444",
        badgeBg: "rgba(239, 68, 68, 0.15)",
        description: "Comprovante ilegível, inconsistente ou registro com pendências no conselho.",
        showVerifiedBadge: false,
      };
    case "expired":
      return {
        label: "CREF Vencido",
        color: "#EF4444",
        badgeBg: "rgba(239, 68, 68, 0.15)",
        description: "Validade da carteira profissional expirada. Necessário revalidação.",
        showVerifiedBadge: false,
      };
    case "suspended":
      return {
        label: "CREF Suspenso",
        color: "#EF4444",
        badgeBg: "rgba(239, 68, 68, 0.15)",
        description: "Registro suspenso administrativamente ou judicialmente.",
        showVerifiedBadge: false,
      };
    case "update_required":
      return {
        label: "Atualização Necessária",
        color: "#F59E0B",
        badgeBg: "rgba(245, 158, 11, 0.15)",
        description: "Solicitada nova cópia da carteira profissional ou certidão de regularidade.",
        showVerifiedBadge: false,
      };
    case "not_provided":
    default:
      return {
        label: "CREF Não Informado",
        color: "#6B7280",
        badgeBg: "rgba(107, 114, 128, 0.15)",
        description: "O treinador ainda não informou número de registro profissional.",
        showVerifiedBadge: false,
      };
  }
}

export async function submitCrefProof(
  trainerId: string,
  trainerName: string,
  crefNumber: string,
  crefState: string,
  documentProofUri: string
): Promise<CrefVerificationRecord> {
  if (!isValidCref(crefNumber)) {
    throw new Error("Número de CREF inválido. Formato esperado: 4 a 8 dígitos numéricos.");
  }

  const existing = await getCrefVerificationRecord(trainerId);
  const now = new Date().toISOString();

  const record: CrefVerificationRecord = {
    trainerId,
    trainerName,
    crefNumber: crefNumber.trim(),
    crefState: crefState.toUpperCase().trim(),
    status: "pending_review",
    documentProofUri,
    uploadedAt: now,
    history: existing?.history || [],
  };

  record.history.push({
    action: "PROOF_UPLOADED",
    previousStatus: existing?.status || "unverified",
    newStatus: "pending_review",
    performedByUserId: trainerId,
    performedByRole: "TRAINER",
    timestamp: now,
  });

  await AsyncStorage.setItem(`${CREF_STORAGE_PREFIX}${trainerId}`, JSON.stringify(record));
  return record;
}

export async function getCrefVerificationRecord(trainerId: string): Promise<CrefVerificationRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CREF_STORAGE_PREFIX}${trainerId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function adminUpdateCrefStatus(
  trainerId: string,
  adminUserId: string,
  newStatus: CrefStatus,
  options?: {
    consultationSource?: string;
    adminNotes?: string;
    rejectionReason?: string;
    expirationDate?: string;
  }
): Promise<CrefVerificationRecord> {
  const current = await getCrefVerificationRecord(trainerId);
  if (!current) {
    throw new Error("Registro de CREF não encontrado para este personal.");
  }

  // Previne autoaprovação pelo próprio personal
  if (trainerId === adminUserId) {
    throw new Error("Violação de Governança: O próprio personal trainer não pode aprovar seu registro profissional.");
  }

  const now = new Date().toISOString();
  const prevStatus = current.status;

  current.status = newStatus;
  current.verifiedAt = now;
  current.verifiedBy = adminUserId;
  current.consultationSource = options?.consultationSource;
  current.adminNotes = options?.adminNotes;
  current.rejectionReason = options?.rejectionReason;
  current.expirationDate = options?.expirationDate;

  current.history.push({
    action: `STATUS_CHANGED_TO_${newStatus.toUpperCase()}`,
    previousStatus: prevStatus,
    newStatus,
    performedByUserId: adminUserId,
    performedByRole: "ADMIN",
    consultationSource: options?.consultationSource,
    adminNotes: options?.adminNotes,
    timestamp: now,
  });

  await AsyncStorage.setItem(`${CREF_STORAGE_PREFIX}${trainerId}`, JSON.stringify(current));
  return current;
}
