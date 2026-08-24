import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { getTrainerBranding, TrainerBranding } from "@/services/trainer-branding-store";

export type PdfWorkoutSetDetail = {
  id: string;
  setNumber: number;
  reps: string;
  load: string;
  restSeconds: number;
  notes?: string;
};

export type PdfWorkoutExerciseItem = {
  id: string;
  name: string;
  category?: string;
  muscleGroup?: string;
  videoUrl?: string;
  cadence?: string;
  observation?: string;
  sectionId?: string;
  combinationId?: string;
  combinationLabel?: string;
  sets: PdfWorkoutSetDetail[];
};

export type PdfWorkoutGeneralInfo = {
  name: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  releaseToStudent?: boolean;
  notifyExpiration?: boolean;
  splitByWeekDay?: boolean;
  recommendedDays?: string[];
};

export type PdfWorkoutSectionHeader = {
  id: string;
  title: string;
  order: number;
};

export type GenerateWorkoutPdfOptions = {
  trainerId?: string;
  studentName: string;
  studentAvatar?: string;
  workoutInfo: PdfWorkoutGeneralInfo;
  exercises: PdfWorkoutExerciseItem[];
  sections?: PdfWorkoutSectionHeader[];
};

export async function generateWorkoutPdfHtml(options: GenerateWorkoutPdfOptions): Promise<string> {
  const { trainerId = "trainer", studentName, workoutInfo, exercises, sections = [] } = options;
  const branding: TrainerBranding = await getTrainerBranding(trainerId);

  const primaryColor = branding.primaryColor || "#D90000";
  const trainerName = branding.displayName || "Personal Indigo";
  const businessName = branding.businessName || "DragonCorp";
  const professionalId = branding.professionalId || "CREF 000000-G/SP";
  const trainerEmail = branding.email || "";
  const trainerPhone = branding.phone || "";
  const trainerAvatar = branding.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";
  const trainerTagline = branding.tagline || "Alta Performance & Consultoria";

  // Group exercises by section
  const sectionList = sections.length > 0
    ? sections
    : [{ id: "sec-default", title: "Exercícios da Sessão", order: 0 }];

  const exercisesBySection: Record<string, PdfWorkoutExerciseItem[]> = {};
  const unassigned: PdfWorkoutExerciseItem[] = [];

  exercises.forEach((ex) => {
    if (ex.sectionId && sectionList.some((s) => s.id === ex.sectionId)) {
      if (!exercisesBySection[ex.sectionId]) exercisesBySection[ex.sectionId] = [];
      exercisesBySection[ex.sectionId].push(ex);
    } else {
      unassigned.push(ex);
    }
  });

  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const estimatedDuration = exercises.length * 15 || 50;

  const sectionsHtml = sectionList
    .map((sec) => {
      const secExercises = exercisesBySection[sec.id] || [];
      if (secExercises.length === 0) return "";

      const exHtml = secExercises
        .map((ex, idx) => {
          const setsRows = (ex.sets || [])
            .map(
              (s, sIdx) => `
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #111; text-align: center; width: 45px; border-bottom: 1px solid #eee;">${sIdx + 1}ª</td>
                <td style="padding: 6px 10px; color: #333; text-align: center; border-bottom: 1px solid #eee; font-weight: 600;">${s.reps || "10 a 12"}</td>
                <td style="padding: 6px 10px; color: #111; text-align: center; border-bottom: 1px solid #eee; font-weight: 700;">${s.load || "20 kg"}</td>
                <td style="padding: 6px 10px; color: #555; text-align: center; border-bottom: 1px solid #eee;">${s.restSeconds || 60}s</td>
                <td style="padding: 6px 10px; color: #777; font-size: 11px; border-bottom: 1px solid #eee; font-style: italic;">${s.notes || "-"}</td>
              </tr>
            `
            )
            .join("");

          return `
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 14px; overflow: hidden; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="background: #fafafa; padding: 10px 14px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="background: ${primaryColor}; color: #ffffff; font-weight: 900; font-size: 12px; width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;">
                    ${idx + 1}
                  </span>
                  <span style="font-size: 14px; font-weight: 800; color: #111827;">${ex.name}</span>
                  ${
                    ex.combinationLabel
                      ? `<span style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">★ ${ex.combinationLabel}</span>`
                      : ""
                  }
                </div>
                <div style="font-size: 11px; color: #6B7280; font-weight: 600;">
                  ${ex.muscleGroup || ex.category || "Geral"} ${ex.cadence ? `• Cadência: <strong style="color: ${primaryColor};">${ex.cadence}</strong>` : ""}
                </div>
              </div>

              <div style="padding: 10px 14px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px;">
                  <thead>
                    <tr style="background: #f3f4f6; color: #4B5563; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                      <th style="padding: 6px 10px; text-align: center; border-radius: 4px 0 0 4px;">Série</th>
                      <th style="padding: 6px 10px; text-align: center;">Repetições</th>
                      <th style="padding: 6px 10px; text-align: center;">Carga</th>
                      <th style="padding: 6px 10px; text-align: center;">Intervalo</th>
                      <th style="padding: 6px 10px; text-align: left; border-radius: 0 4px 4px 0;">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${setsRows}
                  </tbody>
                </table>

                ${
                  ex.observation
                    ? `<div style="background: #F9FAFB; border-left: 3px solid ${primaryColor}; padding: 6px 10px; font-size: 11px; color: #4B5563; font-style: italic; border-radius: 0 4px 4px 0;">
                        <strong>Dica do Personal:</strong> ${ex.observation}
                      </div>`
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 2px solid ${primaryColor};">
            <div style="width: 6px; height: 16px; background: ${primaryColor}; border-radius: 2px;"></div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
              ${sec.title}
            </h3>
          </div>
          ${exHtml}
        </div>
      `;
    })
    .join("");

  const unassignedHtml =
    unassigned.length > 0
      ? `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 2px solid ${primaryColor};">
          <div style="width: 6px; height: 16px; background: ${primaryColor}; border-radius: 2px;"></div>
          <h3 style="margin: 0; font-size: 15px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
            Outros Exercícios
          </h3>
        </div>
        ${unassigned
          .map(
            (ex, idx) => `
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 14px; padding: 12px; page-break-inside: avoid;">
              <div style="font-weight: 800; font-size: 13px; color: #111;">${idx + 1}. ${ex.name}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">${ex.sets.length} séries • ${ex.sets[0]?.reps || "10-12"} reps • Carga: ${ex.sets[0]?.load || "20kg"}</div>
            </div>
          `
          )
          .join("")}
      </div>
    `
      : "";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${workoutInfo.name} - ${studentName}</title>
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

        <!-- BANNER DE IDENTIFICAÇÃO DO ALUNO & TREINO -->
        <section style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <span style="font-size: 10px; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Prescrição para</span>
              <h2 style="margin: 2px 0 0 0; font-size: 18px; font-weight: 900; color: #111827;">${studentName}</h2>
            </div>
            <div style="text-align: right;">
              <span style="background: ${primaryColor}; color: #ffffff; font-size: 11px; font-weight: 900; padding: 4px 10px; border-radius: 20px; display: inline-block;">
                ${workoutInfo.name}
              </span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB; font-size: 11px;">
            <div><span style="color: #6B7280;">Início:</span> <strong>${workoutInfo.startDate || "-"}</strong></div>
            <div><span style="color: #6B7280;">Validade:</span> <strong>${workoutInfo.endDate || "-"}</strong></div>
            <div><span style="color: #6B7280;">Volume:</span> <strong>${exercises.length} ex. / ${totalSets} séries</strong></div>
            <div><span style="color: #6B7280;">Duração Est.:</span> <strong>~${estimatedDuration} min</strong></div>
          </div>

          ${
            workoutInfo.notes
              ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E5E7EB; font-size: 11px; color: #374151; line-height: 1.4;">
                  <strong style="color: #111827;">Instruções Gerais:</strong> ${workoutInfo.notes}
                </div>`
              : ""
          }
        </section>

        <!-- SEÇÕES E GRADE DE EXERCÍCIOS -->
        <main>
          ${sectionsHtml}
          ${unassignedHtml}
        </main>

        <!-- FOOTER COM MARCA E SEGURANÇA -->
        <footer style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #9CA3AF;">
          <div>
            <strong>${businessName}</strong> • Prescrição oficial desenvolvida por Profissional de Educação Física.
          </div>
          <div>
            Página 1 de 1
          </div>
        </footer>
      </body>
    </html>
  `;
}

export async function shareWorkoutAsPdf(options: GenerateWorkoutPdfOptions): Promise<void> {
  try {
    const html = await generateWorkoutPdfHtml(options);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Treino de ${options.studentName} - PDF`,
      });
    } else {
      Alert.alert("PDF Gerado com Sucesso", `Arquivo salvo em: ${uri}`);
    }
  } catch (error) {
    Alert.alert(
      "Erro ao Gerar PDF",
      error instanceof Error ? error.message : "Não foi possível gerar o arquivo PDF do treino."
    );
  }
}
