import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { getTrainerBranding, TrainerBranding } from "@/services/trainer-branding-store";

export type ConconiStageEntry = {
  stage: number;
  speedKmh: number;
  heartRateBpm: number;
  rpe?: number;
};

export type DayProtocolPrescription = {
  id: string;
  dayOfWeek: "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado" | "Domingo";
  activeDurationMinutes?: number;
  activeSpeedKmh?: number;
  intervalsCount?: number;
  pauseDurationMinutes?: number;
  pauseSpeedKmh?: number;
  continuousMinutes?: number;
  continuousSpeedKmh?: number;
  totalVolumeMinutes: number;
  description: string;
};

export type AerobicConconiProtocol = {
  id: string;
  trainerId: string;
  studentId: string;
  studentName: string;
  protocolDate: string;
  title: string;
  warmupText: string;
  conconiTestResult?: {
    environment: "esteira" | "bike" | "pista";
    stages: ConconiStageEntry[];
    deflectionHeartRate?: number;
    deflectionSpeedKmh?: number;
    maxHeartRate?: number;
    vo2MaxEstimate?: number;
    zones: {
      z1Recovery: string;
      z2Aerobic: string;
      z3Threshold: string;
      z4Vo2Max: string;
      z5Anaerobic: string;
    };
  };
  daysPrescription: DayProtocolPrescription[];
  generalNotes?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY_PREFIX = "@indigo/conconi_protocols_v1:";

export const DEFAULT_SAMPLE_CONCONI_PROTOCOL: AerobicConconiProtocol = {
  id: "conconi-proto-sample",
  trainerId: "trainer",
  studentId: "student-1",
  studentName: "Charles Nóbrega",
  protocolDate: new Date().toISOString().slice(0, 10),
  title: "Protocolo de treino aeróbico 24/08",
  warmupText: "5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)",
  conconiTestResult: {
    environment: "esteira",
    stages: [
      { stage: 1, speedKmh: 4.0, heartRateBpm: 108 },
      { stage: 2, speedKmh: 4.5, heartRateBpm: 118 },
      { stage: 3, speedKmh: 5.0, heartRateBpm: 128 },
      { stage: 4, speedKmh: 5.5, heartRateBpm: 138 },
      { stage: 5, speedKmh: 6.0, heartRateBpm: 148 },
      { stage: 6, speedKmh: 6.5, heartRateBpm: 156 },
      { stage: 7, speedKmh: 7.0, heartRateBpm: 162 },
      { stage: 8, speedKmh: 7.5, heartRateBpm: 167 },
      { stage: 9, speedKmh: 8.0, heartRateBpm: 170 },
    ],
    deflectionHeartRate: 156,
    deflectionSpeedKmh: 6.5,
    maxHeartRate: 172,
    vo2MaxEstimate: 42.5,
    zones: {
      z1Recovery: "105 a 125 bpm (< 5.0 km/h)",
      z2Aerobic: "126 a 145 bpm (5.0 a 6.0 km/h)",
      z3Threshold: "146 a 156 bpm (6.0 a 6.5 km/h)",
      z4Vo2Max: "157 a 166 bpm (6.6 a 7.5 km/h)",
      z5Anaerobic: "> 167 bpm (> 7.5 km/h)",
    },
  },
  daysPrescription: [
    {
      id: "dp-1",
      dayOfWeek: "Segunda",
      intervalsCount: 4,
      activeDurationMinutes: 3,
      activeSpeedKmh: 5.6,
      pauseDurationMinutes: 2,
      pauseSpeedKmh: 3.0,
      totalVolumeMinutes: 20,
      description: "4x 3 minutos ativos a 5.6 km/h e 2 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)",
    },
    {
      id: "dp-2",
      dayOfWeek: "Quarta",
      intervalsCount: 4,
      activeDurationMinutes: 2,
      activeSpeedKmh: 6.0,
      pauseDurationMinutes: 3,
      pauseSpeedKmh: 3.0,
      totalVolumeMinutes: 20,
      description: "4x 2 minutos ativos a 6.0 km/h e 3 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)",
    },
    {
      id: "dp-3",
      dayOfWeek: "Sexta",
      continuousMinutes: 20,
      continuousSpeedKmh: 5.0,
      totalVolumeMinutes: 20,
      description: "20 minutos aeróbio contínuo moderado a 5.0 km/h (serão 20 minutos contínuos nessa faixa de velocidade).",
    },
  ],
  generalNotes: "Mantenha hidratação constante durante todo o protocolo e relate qualquer desconforto respiratório ou articular.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function listConconiProtocols(
  trainerId = "trainer",
  studentId?: string
): Promise<AerobicConconiProtocol[]> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${trainerId}`);
    if (!raw) {
      return [DEFAULT_SAMPLE_CONCONI_PROTOCOL];
    }
    const list: AerobicConconiProtocol[] = JSON.parse(raw);
    if (studentId) {
      return list.filter((p) => p.studentId === studentId);
    }
    return list;
  } catch {
    return [DEFAULT_SAMPLE_CONCONI_PROTOCOL];
  }
}

export async function saveConconiProtocol(protocol: AerobicConconiProtocol): Promise<void> {
  const list = await listConconiProtocols(protocol.trainerId);
  const filtered = list.filter((p) => p.id !== protocol.id);
  const updatedList = [protocol, ...filtered];
  await AsyncStorage.setItem(
    `${STORAGE_KEY_PREFIX}${protocol.trainerId}`,
    JSON.stringify(updatedList)
  );
}

export async function deleteConconiProtocol(
  id: string,
  trainerId = "trainer"
): Promise<void> {
  const list = await listConconiProtocols(trainerId);
  const updatedList = list.filter((p) => p.id !== id);
  await AsyncStorage.setItem(
    `${STORAGE_KEY_PREFIX}${trainerId}`,
    JSON.stringify(updatedList)
  );
}

export async function generateConconiProtocolPdfHtml(
  protocol: AerobicConconiProtocol,
  trainerId = "trainer"
): Promise<string> {
  const branding: TrainerBranding = await getTrainerBranding(trainerId);

  const primaryColor = branding.primaryColor || "#D90000";
  const trainerName = branding.displayName || "Personal Indigo";
  const businessName = branding.businessName || "DragonCorp";
  const professionalId = branding.professionalId || "CREF 000000-G/SP";
  const trainerEmail = branding.email || "";
  const trainerPhone = branding.phone || "";
  const trainerAvatar = branding.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";
  const trainerTagline = branding.tagline || "Alta Performance & Consultoria";

  const daysHtml = protocol.daysPrescription
    .map((day) => {
      return `
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 16px; padding: 16px; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #FFF7ED; color: #EA580C; border: 1px solid #FFEDD5; font-size: 13px; font-weight: 900; padding: 4px 10px; border-radius: 6px;">
                ${day.dayOfWeek}
              </span>
              <span style="font-size: 13px; font-weight: 800; color: #111827;">Prescrição do Dia</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: #6B7280; background: #F3F4F6; padding: 3px 8px; border-radius: 4px;">
              ⏱️ ${day.totalVolumeMinutes} min total
            </span>
          </div>

          <div style="font-size: 14px; font-weight: 600; color: #1F2937; line-height: 1.5; padding-left: 2px;">
            ${day.description}
          </div>
        </div>
      `;
    })
    .join("");

  const testResultHtml = protocol.conconiTestResult
    ? `
      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 900; color: #111827; text-transform: uppercase;">
            📊 Laudo do Teste de Conconi (Limiar Anaeróbio)
          </h3>
          <span style="background: ${primaryColor}; color: #ffffff; font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 4px;">
            Ambiente: ${protocol.conconiTestResult.environment.toUpperCase()}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; font-size: 11px;">
          <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #E5E7EB;">
            <div style="color: #6B7280; font-size: 10px;">FC no Limiar</div>
            <strong style="color: ${primaryColor}; font-size: 14px;">${protocol.conconiTestResult.deflectionHeartRate || 156} bpm</strong>
          </div>
          <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #E5E7EB;">
            <div style="color: #6B7280; font-size: 10px;">Velocidade Limiar</div>
            <strong style="color: #111827; font-size: 14px;">${protocol.conconiTestResult.deflectionSpeedKmh || 6.5} km/h</strong>
          </div>
          <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #E5E7EB;">
            <div style="color: #6B7280; font-size: 10px;">FC Máxima</div>
            <strong style="color: #111827; font-size: 14px;">${protocol.conconiTestResult.maxHeartRate || 172} bpm</strong>
          </div>
          <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #E5E7EB;">
            <div style="color: #6B7280; font-size: 10px;">VO2 Máx Estimado</div>
            <strong style="color: #111827; font-size: 14px;">${protocol.conconiTestResult.vo2MaxEstimate || 42.5} ml/kg/min</strong>
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px;">
          <div style="font-size: 11px; font-weight: 800; color: #374151; margin-bottom: 6px;">Zonas de Treinamento Cardiorrespiratório Prescritas:</div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; font-size: 10px;">
            <div style="border-left: 3px solid #10B981; padding-left: 4px;"><strong>Z1 (Recup):</strong><br/>${protocol.conconiTestResult.zones.z1Recovery}</div>
            <div style="border-left: 3px solid #3B82F6; padding-left: 4px;"><strong>Z2 (Aeróbio):</strong><br/>${protocol.conconiTestResult.zones.z2Aerobic}</div>
            <div style="border-left: 3px solid #F59E0B; padding-left: 4px;"><strong>Z3 (Limiar):</strong><br/>${protocol.conconiTestResult.zones.z3Threshold}</div>
            <div style="border-left: 3px solid #EA580C; padding-left: 4px;"><strong>Z4 (VO2):</strong><br/>${protocol.conconiTestResult.zones.z4Vo2Max}</div>
            <div style="border-left: 3px solid #EF4444; padding-left: 4px;"><strong>Z5 (Anaer):</strong><br/>${protocol.conconiTestResult.zones.z5Anaerobic}</div>
          </div>
        </div>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${protocol.title} - ${protocol.studentName}</title>
        <style>
          @page {
            margin: 20mm 15mm 20mm 15mm;
            size: A4 portrait;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <!-- HEADER DO PERSONAL & MARCA -->
        <header style="border-bottom: 3px solid ${primaryColor}; padding-bottom: 14px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${trainerAvatar}" alt="Foto Personal" style="width: 58px; height: 58px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor};" />
            <div>
              <div style="font-size: 11px; font-weight: 900; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.5px;">${businessName}</div>
              <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 900; color: #111827; letter-spacing: -0.3px;">${trainerName}</h1>
              <div style="font-size: 11px; color: #6B7280; font-weight: 600;">${professionalId} • ${trainerTagline}</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #4B5563;">
            ${trainerPhone ? `<div><strong>Tel:</strong> ${trainerPhone}</div>` : ""}
            ${trainerEmail ? `<div><strong>E-mail:</strong> ${trainerEmail}</div>` : ""}
            <div style="color: #9CA3AF; font-size: 10px; margin-top: 4px;">Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </header>

        <!-- BANNER DE IDENTIFICAÇÃO DO ALUNO & PROTOCOLO -->
        <section style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <span style="font-size: 10px; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Prescrição para</span>
              <h2 style="margin: 2px 0 0 0; font-size: 18px; font-weight: 900; color: #111827;">${protocol.studentName}</h2>
            </div>
            <div style="text-align: right;">
              <span style="background: ${primaryColor}; color: #ffffff; font-size: 12px; font-weight: 900; padding: 4px 10px; border-radius: 20px; display: inline-block;">
                ${protocol.title}
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 16px; padding-top: 8px; border-top: 1px solid #E5E7EB; font-size: 11px;">
            <div><span style="color: #6B7280;">Data da Prescrição:</span> <strong>${protocol.protocolDate}</strong></div>
            <div><span style="color: #6B7280;">Sessões Semanais:</span> <strong>${protocol.daysPrescription.length} dias programados</strong></div>
          </div>
        </section>

        <!-- LAUDO DO TESTE DE CONCONI -->
        ${testResultHtml}

        <!-- AQUECIMENTO EM DESTAQUE -->
        <section style="background: #FEF2F2; border: 1px solid #FEE2E2; border-left: 4px solid #EF4444; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 900; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
            🔥 Aquecimento Obrigatório
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #DC2626;">
            ${protocol.warmupText}
          </div>
        </section>

        <!-- PRESCRIÇÃO SEMANAL DETALHADA -->
        <section>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 2px solid ${primaryColor};">
            <div style="width: 6px; height: 16px; background: ${primaryColor}; border-radius: 2px;"></div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
              Divisão do Treino Aeróbico por Dia da Semana
            </h3>
          </div>
          ${daysHtml}
        </section>

        <!-- INSTRUÇÕES GERAIS -->
        ${
          protocol.generalNotes
            ? `
            <section style="background: #F9FAFB; border-left: 3px solid ${primaryColor}; padding: 10px 14px; margin-top: 16px; border-radius: 0 8px 8px 0; font-size: 11px; color: #4B5563;">
              <strong style="color: #111827;">Orientações do Treinador:</strong> ${protocol.generalNotes}
            </section>
          `
            : ""
        }

        <!-- FOOTER COM MARCA E SEGURANÇA -->
        <footer style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #9CA3AF;">
          <div>
            <strong>${businessName}</strong> • Prescrição oficial de Treinamento Cardiorrespiratório & Teste de Conconi.
          </div>
          <div>
            Página 1 de 1
          </div>
        </footer>
      </body>
    </html>
  `;
}

export async function shareConconiProtocolAsPdf(
  protocol: AerobicConconiProtocol,
  trainerId = "trainer"
): Promise<void> {
  try {
    const html = await generateConconiProtocolPdfHtml(protocol, trainerId);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `${protocol.title} - ${protocol.studentName} - PDF`,
      });
    } else {
      Alert.alert("PDF Gerado", `Arquivo salvo em: ${uri}`);
    }
  } catch (error) {
    Alert.alert(
      "Erro ao Gerar PDF",
      error instanceof Error ? error.message : "Não foi possível gerar o PDF do protocolo aeróbio."
    );
  }
}
