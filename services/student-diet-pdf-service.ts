import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { getTrainerBranding, TrainerBranding } from "@/services/trainer-branding-store";

export type DietPdfOptions = {
  trainerId?: string;
  studentName: string;
  studentAvatar?: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterLiters: number;
  supplements: string[];
  notes?: string;
  meals: Array<{
    name: string;
    time: string;
    calories: number;
    items: string[];
    notes?: string;
  }>;
};

function getInitials(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "A";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function generateDietPdfHtml(options: DietPdfOptions): Promise<string> {
  const {
    trainerId = "trainer",
    studentName,
    studentAvatar,
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    waterLiters,
    supplements,
    notes,
    meals,
  } = options;

  const branding: TrainerBranding = await getTrainerBranding(trainerId);
  const primaryColor = branding.primaryColor || "#D90000";
  const trainerName = branding.displayName || "Personal DragonCorp";
  const businessName = branding.businessName || "DragonCorp";
  const professionalId = branding.professionalId || "CRN / CREF 000000";
  const trainerEmail = branding.email || "";
  const trainerPhone = branding.phone || "";
  const trainerAvatar = branding.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";
  const trainerTagline = branding.tagline || "Nutrição & Alta Performance";

  const studentInitials = getInitials(studentName);
  const studentAvatarUrl = studentAvatar || "";
  const formattedEmissionDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const mealsHtml = meals
    .map((meal, index) => {
      const itemsHtml = meal.items
        .map(
          (item) => `
          <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 12.5px; color: #334155; line-height: 1.5;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${primaryColor}; margin-top: 6px; flex-shrink: 0;"></span>
            <span>${item}</span>
          </div>
        `
        )
        .join("");

      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 16px; padding: 16px 18px; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="background: ${primaryColor}; color: #ffffff; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 6px;">
                #${index + 1}
              </span>
              <span style="font-size: 15px; font-weight: 900; color: #0f172a;">${meal.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #f1f5f9; color: #64748b; font-size: 11.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                ⏰ ${meal.time}
              </span>
              <span style="background: #fef2f2; color: ${primaryColor}; font-size: 11.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #fee2e2;">
                ~${meal.calories} kcal
              </span>
            </div>
          </div>

          <div style="padding-left: 2px;">
            ${itemsHtml}
          </div>

          ${
            meal.notes
              ? `<div style="background: #f8fafc; border-left: 3px solid ${primaryColor}; padding: 8px 12px; font-size: 11.5px; color: #64748b; font-style: italic; border-radius: 0 6px 6px 0; margin-top: 10px;">
                  <strong>Obs:</strong> ${meal.notes}
                </div>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Plano Alimentar - ${studentName}</title>
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
              <div style="color: #94a3b8; font-size: 10px; margin-top: 4px; font-weight: 600;">Plano emitido em ${formattedEmissionDate}</div>
            </div>
          </header>

          <!-- BANNER DO ALUNO & METAS MACROS -->
          <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 22px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                ${
                  studentAvatarUrl
                    ? `<img src="${studentAvatarUrl}" alt="${studentName}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`
                    : `<div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, ${primaryColor}, #800000); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 900; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${studentInitials}</div>`
                }
                <div>
                  <span style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">PLANO ALIMENTAR PARA</span>
                  <h2 style="margin: 2px 0 0 0; font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">${studentName}</h2>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="background: ${primaryColor}; color: #ffffff; font-size: 13px; font-weight: 900; padding: 5px 12px; border-radius: 20px; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                  ${dailyCalories} Kcal / dia
                </span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Proteínas</div>
                <div style="color: #0f172a; font-size: 13px; font-weight: 900; margin-top: 2px;">${proteinGrams}g</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Carboidratos</div>
                <div style="color: #0f172a; font-size: 13px; font-weight: 900; margin-top: 2px;">${carbsGrams}g</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Gorduras</div>
                <div style="color: #0f172a; font-size: 13px; font-weight: 900; margin-top: 2px;">${fatsGrams}g</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Água Diária</div>
                <div style="color: #0f172a; font-size: 13px; font-weight: 900; margin-top: 2px;">${waterLiters}L</div>
              </div>
            </div>
          </section>

        <!-- REFEIÇÕES -->
        <main style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 2px solid ${primaryColor};">
            <div style="width: 6px; height: 18px; background: ${primaryColor}; border-radius: 3px;"></div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Grade de Refeições Prescritas
            </h3>
          </div>
          ${mealsHtml}
        </main>

        <!-- SUPLEMENTAÇÃO -->
        ${
          supplements && supplements.length > 0
            ? `
            <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 24px; page-break-inside: avoid;">
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 8px;">
                Suplementação Prescrita
              </div>
              <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                ${supplements.map((s) => `• ${s}`).join("<br/>")}
              </div>
            </section>
          `
            : ""
        }

        <!-- INSTRUÇÕES -->
        ${
          notes
            ? `
            <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid ${primaryColor}; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #334155; line-height: 1.5; page-break-inside: avoid;">
              <strong style="color: #0f172a;">Recomendações Nutricionais:</strong> ${notes}
            </section>
          `
            : ""
        }

          <!-- FOOTER -->
          <footer style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #94a3b8; page-break-inside: avoid;">
            <div>
              <strong style="color: #64748b;">${businessName}</strong> • Prescrição Nutricional Oficial.
            </div>
            <div style="font-weight: 700;">
              DragonCorp Nutrition Engine
            </div>
          </footer>
        </div>
      </body>
    </html>
  `;
}

export async function shareDietAsPdf(options: DietPdfOptions): Promise<void> {
  try {
    const html = await generateDietPdfHtml(options);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Dieta de ${options.studentName} - PDF`,
      });
    } else {
      Alert.alert("PDF Gerado", `Arquivo salvo em: ${uri}`);
    }
  } catch (error) {
    Alert.alert(
      "Erro ao Gerar PDF",
      error instanceof Error ? error.message : "Não foi possível gerar o PDF da dieta."
    );
  }
}
