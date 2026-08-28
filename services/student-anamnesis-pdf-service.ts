import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { getTrainerBranding, TrainerBranding } from "@/services/trainer-branding-store";

export type AnamnesisPdfOptions = {
  trainerId?: string;
  studentName: string;
  studentAvatar?: string;
  medicalConditions: string[];
  injuriesOrPain: string[];
  medications: string;
  cardiacRisk: string;
  surgeryHistory: string;
  trainingExperienceYears: string;
  weeklyAvailabilityDays: number;
  sleepHoursPerNight: number;
  stressLevel: string;
  smokingOrAlcohol: string;
  dietaryRestrictions: string;
  medicalClearance: boolean;
  notes: string;
  reviewedAt: string;
};

function getInitials(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "A";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function generateAnamnesisPdfHtml(options: AnamnesisPdfOptions): Promise<string> {
  const {
    trainerId = "trainer",
    studentName,
    studentAvatar,
    medicalConditions,
    injuriesOrPain,
    medications,
    cardiacRisk,
    surgeryHistory,
    trainingExperienceYears,
    weeklyAvailabilityDays,
    sleepHoursPerNight,
    stressLevel,
    smokingOrAlcohol,
    dietaryRestrictions,
    medicalClearance,
    notes,
    reviewedAt,
  } = options;

  const branding: TrainerBranding = await getTrainerBranding(trainerId);
  const primaryColor = branding.primaryColor || "#D90000";
  const trainerName = branding.displayName || "Personal DragonCorp";
  const businessName = branding.businessName || "DragonCorp";
  const professionalId = branding.professionalId || "CREF 000000-G/SP";
  const trainerEmail = branding.email || "";
  const trainerPhone = branding.phone || "";
  const trainerAvatar = branding.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";
  const trainerTagline = branding.tagline || "Avaliação Física & Consultoria";

  const studentInitials = getInitials(studentName);
  const studentAvatarUrl = studentAvatar || "";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Laudo de Anamnese - ${studentName}</title>
        <style>
          @page {
            margin: 14mm 12mm 14mm 12mm;
            size: A4 portrait;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
          .pdf-wrapper {
            width: 100%;
            padding: 2px 4px;
          }
        </style>
      </head>
      <body>
        <div class="pdf-wrapper">
          <!-- HEADER -->
          <header style="border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${trainerAvatar}" alt="Foto Personal" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
              <div>
                <div style="font-size: 11px; font-weight: 900; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.6px;">${businessName}</div>
                <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.4px;">${trainerName}</h1>
                <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">${professionalId} • ${trainerTagline}</div>
              </div>
            </div>
            <div style="text-align: right; font-size: 11.5px; color: #475569; line-height: 1.5;">
              ${trainerPhone ? `<div><strong>WhatsApp:</strong> ${trainerPhone}</div>` : ""}
              ${trainerEmail ? `<div><strong>E-mail:</strong> ${trainerEmail}</div>` : ""}
              <div style="color: #94a3b8; font-size: 10px; margin-top: 4px; font-weight: 600;">Revisado em ${reviewedAt}</div>
            </div>
          </header>

          <!-- BANNER DE IDENTIFICAÇÃO -->
          <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 22px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                ${
                  studentAvatarUrl
                    ? `<img src="${studentAvatarUrl}" alt="${studentName}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`
                    : `<div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, ${primaryColor}, #800000); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 900; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${studentInitials}</div>`
                }
                <div>
                  <span style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">RELATÓRIO CLÍNICO DE ANAMNESE</span>
                  <h2 style="margin: 2px 0 0 0; font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">${studentName}</h2>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="background: ${medicalClearance ? "#16a34a" : "#ca8a04"}; color: #ffffff; font-size: 12px; font-weight: 900; padding: 5px 12px; border-radius: 20px; display: inline-block;">
                  ${medicalClearance ? "LIBERADO PARA TREINOS" : "TRIAGEM PENDENTE"}
                </span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Risco Cardíaco</div>
                <div style="color: #0f172a; font-size: 13px; font-weight: 900; margin-top: 2px;">${cardiacRisk}</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Frequência Semanal</div>
                <div style="color: #0f172a; font-size: 13px; font-weight: 900; margin-top: 2px;">${weeklyAvailabilityDays} dias / sem</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Sono / Noite</div>
                <div style="color: #0f172a; font-size: 13px; font-weight: 900; margin-top: 2px;">${sleepHoursPerNight} horas</div>
              </div>
            </div>
          </section>

        <!-- SAÚDE E CONDIÇÕES MÉDICAS -->
        <section style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; page-break-inside: avoid;">
          <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px;">
            <div style="width: 4px; height: 14px; background: ${primaryColor}; border-radius: 2px;"></div>
            Saúde & Histórico Clínico
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12.5px;">
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Patologias & Condições:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">
                ${medicalConditions.length > 0 ? medicalConditions.map((c) => `• ${c}`).join("<br/>") : "Nenhuma patologia relatada"}
              </div>
            </div>
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Lesões / Restrições Articulares:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">
                ${injuriesOrPain.length > 0 ? injuriesOrPain.map((i) => `• ${i}`).join("<br/>") : "Nenhuma lesão relatada"}
              </div>
            </div>
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Medicamentos Contínuos:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">${medications || "Nenhum"}</div>
            </div>
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Cirurgias Prévias:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">${surgeryHistory || "Nenhuma"}</div>
            </div>
          </div>
        </section>

        <!-- HÁBITOS & ESTILO DE VIDA -->
        <section style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; page-break-inside: avoid;">
          <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px;">
            <div style="width: 4px; height: 14px; background: ${primaryColor}; border-radius: 2px;"></div>
            Hábitos, Sono & Estilo de Vida
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12.5px;">
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Experiência Prévia:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">${trainingExperienceYears}</div>
            </div>
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Nível de Estresse:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">${stressLevel}</div>
            </div>
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Álcool / Tabaco:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">${smokingOrAlcohol}</div>
            </div>
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Restrições Alimentares:</strong>
              <div style="color: #1e293b; margin-top: 4px; font-weight: 600;">${dietaryRestrictions}</div>
            </div>
          </div>
        </section>

        <!-- PARECER DO PERSONAL -->
        ${
          notes
            ? `
            <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid ${primaryColor}; padding: 14px 18px; border-radius: 0 10px 10px 0; font-size: 12.5px; color: #334155; line-height: 1.6; page-break-inside: avoid;">
              <strong style="color: #0f172a; font-size: 13px;">Parecer & Diretrizes do Personal Trainer:</strong><br/>
              ${notes}
            </section>
          `
            : ""
        }

          <!-- FOOTER -->
          <footer style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #94a3b8; page-break-inside: avoid;">
            <div>
              <strong style="color: #64748b;">${businessName}</strong> • Ficha Clínica e de Anamnese Oficial.
            </div>
            <div style="font-weight: 700;">
              DragonCorp Assessment Engine
            </div>
          </footer>
        </div>
      </body>
    </html>
  `;
}

export async function shareAnamnesisAsPdf(options: AnamnesisPdfOptions): Promise<void> {
  try {
    const html = await generateAnamnesisPdfHtml(options);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Anamnese de ${options.studentName} - PDF`,
      });
    } else {
      Alert.alert("PDF Gerado", `Arquivo salvo em: ${uri}`);
    }
  } catch (error) {
    Alert.alert(
      "Erro ao Gerar PDF",
      error instanceof Error ? error.message : "Não foi possível gerar o PDF da anamnese."
    );
  }
}
