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
  icon?: string;
};

export type GenerateWorkoutPdfOptions = {
  trainerId?: string;
  studentName: string;
  studentAvatar?: string;
  workoutInfo: PdfWorkoutGeneralInfo;
  exercises: PdfWorkoutExerciseItem[];
  sections?: PdfWorkoutSectionHeader[];
};

function getInitials(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "A";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatBrDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const clean = dateStr.trim();
  if (clean.length === 10 && clean.includes("-")) {
    const [y, m, d] = clean.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return dateStr;
}

export async function generateWorkoutPdfHtml(options: GenerateWorkoutPdfOptions): Promise<string> {
  const { trainerId = "trainer", studentName, studentAvatar, workoutInfo, exercises, sections = [] } = options;
  const branding: TrainerBranding = await getTrainerBranding(trainerId);

  const primaryColor = branding.primaryColor || "#D90000";
  const trainerName = branding.displayName || "Personal DragonCorp";
  const businessName = branding.businessName || "DragonCorp";
  const professionalId = branding.professionalId || "CREF 000000-G/SP";
  const trainerEmail = branding.email || "";
  const trainerPhone = branding.phone || "";
  const trainerAvatar = branding.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";
  const trainerTagline = branding.tagline || "Alta Performance & Consultoria";

  const studentInitials = getInitials(studentName);
  const studentAvatarUrl = studentAvatar || "";
  const formattedStartDate = formatBrDate(workoutInfo.startDate);
  const formattedEndDate = formatBrDate(workoutInfo.endDate);
  const formattedEmissionDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

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
  const estimatedDuration = exercises.length * 12 || 50;

  const sectionsHtml = sectionList
    .map((sec) => {
      const secExercises = exercisesBySection[sec.id] || [];
      if (secExercises.length === 0) return "";

      const exHtml = secExercises
        .map((ex, idx) => {
          const setsRows = (ex.sets || [])
            .map(
              (s, sIdx) => `
              <tr style="background-color: ${sIdx % 2 === 0 ? "#ffffff" : "#fbfbfb"};">
                <td style="padding: 10px 12px; font-weight: 800; color: #111827; text-align: center; width: 50px; border-bottom: 1px solid #f1f5f9;">
                  ${sIdx + 1}ª
                </td>
                <td style="padding: 10px 12px; color: #374151; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 700; font-size: 12.5px;">
                  ${s.reps || "10 a 12"}
                </td>
                <td style="padding: 10px 12px; color: #111827; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 900; font-size: 13px;">
                  ${s.load || "20 kg"}
                </td>
                <td style="padding: 10px 12px; color: #4b5563; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 700;">
                  ${s.restSeconds || 60}s
                </td>
                <td style="padding: 10px 14px; color: #6b7280; font-size: 11.5px; border-bottom: 1px solid #f1f5f9; font-style: italic;">
                  ${s.notes || "-"}
                </td>
              </tr>
            `
            )
            .join("");

          return `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 16px; overflow: hidden; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div style="background: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="background: ${primaryColor}; color: #ffffff; font-weight: 900; font-size: 12px; width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
                    ${idx + 1}
                  </span>
                  <span style="font-size: 14.5px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px;">
                    ${ex.name}
                  </span>
                  ${
                    ex.combinationLabel
                      ? `<span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">${ex.combinationLabel}</span>`
                      : ""
                  }
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #64748b; font-weight: 700;">
                  <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    ${ex.muscleGroup || ex.category || "Geral"}
                  </span>
                  ${ex.cadence ? `<span style="background: #fef2f2; color: ${primaryColor}; border: 1px solid #fee2e2; padding: 3px 8px; border-radius: 6px; font-weight: 800;">Cadência: ${ex.cadence}</span>` : ""}
                </div>
              </div>

              <div style="padding: 12px 16px 14px 16px;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; margin-bottom: 6px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                  <thead>
                    <tr style="background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px;">
                      <th style="padding: 9px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">Série</th>
                      <th style="padding: 9px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">Repetições</th>
                      <th style="padding: 9px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">Carga Alvo</th>
                      <th style="padding: 9px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">Intervalo</th>
                      <th style="padding: 9px 14px; text-align: left; border-bottom: 1px solid #e2e8f0;">Instruções da Série</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${setsRows}
                  </tbody>
                </table>

                ${
                  ex.observation
                    ? `<div style="background: #f8fafc; border-left: 3px solid ${primaryColor}; padding: 8px 12px; font-size: 11.5px; color: #334155; line-height: 1.5; border-radius: 0 6px 6px 0; margin-top: 8px;">
                        <strong style="color: #0f172a;">Observação do Personal:</strong> ${ex.observation}
                      </div>`
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 2px solid ${primaryColor};">
            <div style="width: 6px; height: 18px; background: ${primaryColor}; border-radius: 3px;"></div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              ${sec.title}
            </h3>
            <span style="background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px; margin-left: auto;">
              ${secExercises.length} exercício(s)
            </span>
          </div>
          ${exHtml}
        </div>
      `;
    })
    .join("");

  const unassignedHtml =
    unassigned.length > 0
      ? `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 2px solid ${primaryColor};">
          <div style="width: 6px; height: 18px; background: ${primaryColor}; border-radius: 3px;"></div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            Exercícios Complementares
          </h3>
        </div>
        ${unassigned
          .map(
            (ex, idx) => `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px; padding: 14px; page-break-inside: avoid;">
              <div style="font-weight: 900; font-size: 14px; color: #0f172a;">${idx + 1}. ${ex.name}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600;">${ex.sets.length} séries • ${ex.sets[0]?.reps || "10-12"} reps • Carga: ${ex.sets[0]?.load || "20kg"} • Intervalo: ${ex.sets[0]?.restSeconds || 60}s</div>
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
          <!-- HEADER DO PERSONAL & MARCA -->
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
              <div style="color: #94a3b8; font-size: 10px; margin-top: 4px; font-weight: 600;">Prescrição emitida em ${formattedEmissionDate}</div>
            </div>
          </header>

          <!-- BANNER DE IDENTIFICAÇÃO DO ALUNO & TREINO -->
          <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 22px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                ${
                  studentAvatarUrl
                    ? `<img src="${studentAvatarUrl}" alt="${studentName}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`
                    : `<div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, ${primaryColor}, #800000); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 900; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${studentInitials}</div>`
                }
                <div>
                  <span style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">ALUNO PRESCRITO</span>
                  <h2 style="margin: 2px 0 0 0; font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">${studentName}</h2>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="background: ${primaryColor}; color: #ffffff; font-size: 12px; font-weight: 900; padding: 5px 12px; border-radius: 20px; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                  ${workoutInfo.name}
                </span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Início</div>
                <div style="color: #0f172a; font-size: 12px; font-weight: 900; margin-top: 2px;">${formattedStartDate}</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Validade</div>
                <div style="color: #0f172a; font-size: 12px; font-weight: 900; margin-top: 2px;">${formattedEndDate}</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Volume</div>
                <div style="color: #0f172a; font-size: 12px; font-weight: 900; margin-top: 2px;">${exercises.length} ex. / ${totalSets} séries</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Duração</div>
                <div style="color: #0f172a; font-size: 12px; font-weight: 900; margin-top: 2px;">~${estimatedDuration} min</div>
              </div>
            </div>

            ${
              workoutInfo.notes
                ? `<div style="margin-top: 12px; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-left: 3px solid ${primaryColor}; border-radius: 6px; font-size: 11.5px; color: #334155; line-height: 1.5;">
                    <strong style="color: #0f172a;">Orientações Gerais do Treinador:</strong> ${workoutInfo.notes}
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
          <footer style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #94a3b8; page-break-inside: avoid;">
            <div>
              <strong style="color: #64748b;">${businessName}</strong> • Prescrição oficial desenvolvida por Profissional de Educação Física.
            </div>
            <div style="font-weight: 700;">
              DragonCorp Fitness Engine
            </div>
          </footer>
        </div>
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
