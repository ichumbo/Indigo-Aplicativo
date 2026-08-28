import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import {
  PERIMETER_LABELS,
  PhysicalAssessment,
  formatAssessmentDate,
  formatAssessmentDateTime,
  getAssessmentStatusLabel,
  getAssessmentTypeLabel,
} from "@/services/assessment-store";
import { getTrainerBranding, TrainerBranding } from "@/services/trainer-branding-store";

function getInitials(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "A";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function generateAssessmentPdfHtml(
  assessment: PhysicalAssessment,
  trainerId = "trainer"
): Promise<string> {
  const branding: TrainerBranding = await getTrainerBranding(trainerId);
  const primaryColor = branding.primaryColor || "#D90000";
  const studioName = branding.businessName || "DRAGONCORP PERSONAL";
  const trainerAvatar = branding.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";

  const studentInitials = getInitials(assessment.studentName);
  const studentAvatarUrl = assessment.studentAvatar || assessment.photos?.[0]?.uri || "";

  const composition = assessment.composition;
  const snapshot = composition.protocolSnapshot;
  const bmiClassification = snapshot?.results.bmiClassification || "—";
  const bodyFatClassification = snapshot?.results.bodyFatClassification || "—";

  const trunkKeys = ["neck", "shoulders", "chest", "waist", "abdomen", "hip"] as const;
  const limbPairs = [
    { right: "rightArmRelaxed", left: "leftArmRelaxed", label: "Braço relaxado" },
    { right: "rightArmFlexed", left: "leftArmFlexed", label: "Braço contraído" },
    { right: "rightForearm", left: "leftForearm", label: "Antebraço" },
    { right: "rightThigh", left: "leftThigh", label: "Coxa" },
    { right: "rightCalf", left: "leftCalf", label: "Panturrilha" },
  ] as const;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Avaliação Física - ${assessment.studentName}</title>
      <style>
        @page { size: A4 portrait; margin: 14mm 12mm 14mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .pdf-wrapper {
          width: 100%;
          padding: 2px 4px;
        }
        .header-table { width: 100%; border-bottom: 2px solid ${primaryColor}; padding-bottom: 12px; margin-bottom: 14px; }
        .logo-text { font-size: 18px; font-weight: 900; color: ${primaryColor}; letter-spacing: 0.5px; text-transform: uppercase; }
        .subtitle { font-size: 10px; color: #666; }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          background: #f0f0f0;
          color: #333;
        }
        .badge-status { background: ${primaryColor}15; color: ${primaryColor}; }
        .student-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 14px;
        }
        .student-title { font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 3px; }
        .student-meta { font-size: 10px; color: #64748b; }
        .kpi-grid {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .kpi-cell {
          flex: 1;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .kpi-label { font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
        .kpi-value { font-size: 14px; font-weight: 900; color: ${primaryColor}; }
        .kpi-sub { font-size: 8px; color: #94a3b8; margin-top: 1px; }

        .section-title {
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
          border-left: 3.5px solid ${primaryColor};
          padding-left: 8px;
          margin: 14px 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        table.data-table th {
          background: #f1f5f9;
          font-weight: 800;
          color: #475569;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1.5px solid #e2e8f0;
        }
        table.data-table td {
          padding: 5px 8px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }
        table.data-table tr:nth-child(even) { background: #fafafa; }

        .grid-2 { display: flex; gap: 12px; }
        .grid-2 > div { flex: 1; }

        .card-box {
          background: #ffffff;
          border: 1px solid #e8e8e8;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 8px;
        }
        .callout-box {
          background: #fdfdfd;
          border-left: 3px solid ${primaryColor};
          border-radius: 4px;
          padding: 8px 10px;
          margin-bottom: 8px;
          font-size: 9.5px;
        }
        .callout-title { font-weight: 800; color: #111; margin-bottom: 2px; }
        .callout-text { color: #555; line-height: 1.35; }

        .footer {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 1px dashed #ccc;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #777;
        }
        .sig-row { display: flex; justify-content: space-around; margin-top: 30px; margin-bottom: 15px; }
        .sig-line { width: 200px; text-align: center; border-top: 1px solid #444; padding-top: 4px; font-size: 9px; }
      </style>
    </head>
    <body>
      <div class="pdf-wrapper">
        <table class="header-table">
          <tr>
            <td>
              <div class="logo-text">${studioName}</div>
              <div class="subtitle">Laudo e Relatório de Avaliação Física Integrada</div>
            </td>
            <td style="text-align: right;">
              <div class="badge badge-status">${getAssessmentStatusLabel(assessment.status)}</div>
              <div style="font-size: 9px; color: #777; margin-top: 4px;">Data: ${formatAssessmentDate(assessment.assessedAt)}</div>
            </td>
          </tr>
        </table>

        <div class="student-box">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${
                studentAvatarUrl
                  ? `<img src="${studentAvatarUrl}" alt="${assessment.studentName}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`
                  : `<div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, ${primaryColor}, #800000); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${studentInitials}</div>`
              }
              <div>
                <div class="student-title">${assessment.studentName}</div>
                <div class="student-meta">
                  Tipo: <strong>${getAssessmentTypeLabel(assessment.type)}</strong> •
                  Avaliador: <strong>${assessment.trainerName || "Profissional DragonCorp"}</strong> •
                  Próxima Reavaliação: <strong>${formatAssessmentDate(assessment.nextAssessmentAt)}</strong>
                </div>
                ${assessment.general.mainGoal ? `<div style="font-size: 10px; color: #333; margin-top: 3px;"><strong>Objetivo Principal:</strong> ${assessment.general.mainGoal}</div>` : ""}
              </div>
            </div>
          </div>

        <div class="kpi-grid">
          <div class="kpi-cell">
            <div class="kpi-label">Peso Corporal</div>
            <div class="kpi-value">${composition.weightKg ? `${composition.weightKg} kg` : "—"}</div>
            <div class="kpi-sub">Estatura: ${composition.heightCm ? `${composition.heightCm} cm` : "—"}</div>
          </div>
          <div class="kpi-cell">
            <div class="kpi-label">% Gordura</div>
            <div class="kpi-value">${composition.bodyFatPercent ? `${composition.bodyFatPercent}%` : "—"}</div>
            <div class="kpi-sub">${bodyFatClassification}</div>
          </div>
          <div class="kpi-cell">
            <div class="kpi-label">Massa Magra</div>
            <div class="kpi-value">${composition.leanMassKg ? `${composition.leanMassKg} kg` : "—"}</div>
            <div class="kpi-sub">Gorda: ${composition.fatMassKg ? `${composition.fatMassKg} kg` : "—"}</div>
          </div>
          <div class="kpi-cell">
            <div class="kpi-label">IMC</div>
            <div class="kpi-value">${composition.bmi ? `${composition.bmi.toFixed(1)}` : "—"}</div>
            <div class="kpi-sub">${bmiClassification}</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <div class="section-title">Composição Corporal</div>
          <table class="data-table">
            <tr><td>Protocolo</td><td><strong>${snapshot?.protocolName || "Não especificado"}</strong></td></tr>
            <tr><td>Peso Alvo Ideal</td><td>${snapshot?.results.targetWeightKg ? `${snapshot.results.targetWeightKg} kg` : "—"}</td></tr>
            <tr><td>Meta % Gordura</td><td>${composition.targetBodyFatPercent ? `${composition.targetBodyFatPercent}%` : "—"}</td></tr>
            <tr><td>Taxa Metabólica Basal</td><td>${composition.basalMetabolicRateKcal ? `${composition.basalMetabolicRateKcal} kcal` : "—"}</td></tr>
            <tr><td>Soma das Dobras</td><td>${snapshot?.intermediate.skinfoldSumMm ? `${snapshot.intermediate.skinfoldSumMm} mm` : "—"}</td></tr>
            <tr><td>Densidade Corporal</td><td>${snapshot?.intermediate.bodyDensity ? `${snapshot.intermediate.bodyDensity.toFixed(4)}` : "—"}</td></tr>
          </table>
        </div>

        <div>
          <div class="section-title">Perímetros do Tronco</div>
          <table class="data-table">
            ${trunkKeys
              .map(
                (k) => `<tr>
                  <td>${PERIMETER_LABELS[k]}</td>
                  <td style="text-align: right;"><strong>${assessment.perimeters[k]?.valueCm ? `${assessment.perimeters[k]?.valueCm} cm` : "—"}</strong></td>
                </tr>`
              )
              .join("")}
          </table>
        </div>
      </div>

      <div class="section-title">Membros Bilaterais & Assimetrias</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Membro</th>
            <th style="text-align: center;">Direito</th>
            <th style="text-align: center;">Esquerdo</th>
            <th style="text-align: right;">Diferença</th>
            <th style="text-align: right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${limbPairs
            .map(({ right, left, label }) => {
              const rVal = assessment.perimeters[right]?.valueCm;
              const lVal = assessment.perimeters[left]?.valueCm;
              const hasVals = rVal !== undefined && lVal !== undefined;
              const diff = hasVals ? Math.abs(rVal - lVal) : undefined;
              const statusText =
                diff === undefined
                  ? "—"
                  : diff === 0
                  ? "Simétrico"
                  : diff > 1.5
                  ? `<span style="color: #c00; font-weight: bold;">Alerta (${diff.toFixed(1)} cm)</span>`
                  : `<span style="color: #2b7; font-weight: bold;">Leve (${diff.toFixed(1)} cm)</span>`;

              return `
                <tr>
                  <td><strong>${label}</strong></td>
                  <td style="text-align: center;">${rVal !== undefined ? `${rVal} cm` : "—"}</td>
                  <td style="text-align: center;">${lVal !== undefined ? `${lVal} cm` : "—"}</td>
                  <td style="text-align: right;">${diff !== undefined ? `${diff.toFixed(1)} cm` : "—"}</td>
                  <td style="text-align: right;">${statusText}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>

      ${
        assessment.cardioTests.length > 0
          ? `
          <div class="section-title">Avaliação Cardiorrespiratória</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Resultado Principal</th>
                <th>VO₂máx Estimado</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${assessment.cardioTests
                .map(
                  (t) => `
                <tr>
                  <td><strong>${t.snapshot?.protocolName || t.protocolId}</strong></td>
                  <td>${t.snapshot?.primaryResult?.label || "Resultado"}: <strong>${t.snapshot?.primaryResult?.value || "—"} ${t.snapshot?.primaryResult?.unit || ""}</strong></td>
                  <td>${t.snapshot?.vo2MaxEstimate ? `<strong>${t.snapshot.vo2MaxEstimate} ml/kg/min</strong>` : "—"}</td>
                  <td>${t.snapshot?.conconi?.message || t.snapshot?.reference || "—"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `
          : ""
      }

      ${
        assessment.functionalTests.length > 0
          ? `
          <div class="section-title">Testes Neuromotores & Funcionais</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Teste</th>
                <th>Resultado</th>
                <th>Classificação</th>
                <th>Assimetria / Dor</th>
              </tr>
            </thead>
            <tbody>
              ${assessment.functionalTests
                .map(
                  (t) => `
                <tr>
                  <td><strong>${t.snapshot?.testName || t.testId}</strong></td>
                  <td>${t.snapshot?.primaryResult?.value !== undefined ? `${t.snapshot.primaryResult.value} ${t.snapshot.primaryResult.unit || ""}` : "—"}</td>
                  <td>${t.snapshot?.interpretation || "Registrado"}</td>
                  <td>${t.snapshot?.asymmetry?.absoluteDifference !== undefined ? `Dif: ${t.snapshot.asymmetry.absoluteDifference}` : t.pain?.present ? "Dor relatada" : "Sem restrição"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `
          : ""
      }

      <div class="section-title">Conclusão & Prescrição Técnica</div>
      ${assessment.conclusion.attentionPoints ? `<div class="callout-box"><div class="callout-title">Pontos de Atenção</div><div class="callout-text">${assessment.conclusion.attentionPoints}</div></div>` : ""}
      ${assessment.conclusion.definedGoals ? `<div class="callout-box"><div class="callout-title">Objetivos Definidos</div><div class="callout-text">${assessment.conclusion.definedGoals}</div></div>` : ""}
      ${assessment.conclusion.trainerRecommendations ? `<div class="callout-box"><div class="callout-title">Recomendações do Personal</div><div class="callout-text">${assessment.conclusion.trainerRecommendations}</div></div>` : ""}
      ${assessment.conclusion.notes ? `<div class="callout-box"><div class="callout-title">Observações Finais</div><div class="callout-text">${assessment.conclusion.notes}</div></div>` : ""}

      <div class="sig-row">
        <div class="sig-line">
          <strong>${assessment.trainerName}</strong><br>
          Profissional de Educação Física
        </div>
        <div class="sig-line">
          <strong>${assessment.studentName}</strong><br>
          Aluno(a)
        </div>
      </div>

        <div class="footer">
          <div>Relatório gerado em ${formatAssessmentDateTime(new Date().toISOString())}</div>
          <div>${studioName} • Sistema de Avaliação Física</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function exportAssessmentToPdf(assessment: PhysicalAssessment, trainerId = "trainer"): Promise<void> {
  try {
    const html = await generateAssessmentPdfHtml(assessment, trainerId);
    const { uri } = await Print.printToFileAsync({ html });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Relatório de Avaliação - ${assessment.studentName}`,
      });
    } else {
      Alert.alert("Sucesso", `PDF gerado com sucesso em: ${uri}`);
    }
  } catch (error) {
    Alert.alert("Erro", "Não foi possível gerar o PDF da avaliação.");
  }
}
