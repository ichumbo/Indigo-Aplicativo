/**
 * Gerador de Laudo de Avaliação Física em HTML / Printable PDF
 * Padrão Profissional com Identidade Visual da Consultoria
 */

export interface AssessmentReportData {
  trainerName: string;
  trainerCref?: string;
  businessName: string;
  primaryColor: string;
  studentName: string;
  studentGender: 'male' | 'female';
  studentAge: number;
  assessmentDate: string;
  type: string;
  protocolName: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiClassification: string;
  bodyFatPercent: number;
  fatMassKg: number;
  leanMassKg: number;
  idealWeightKg: number;
  classification: string;
  skinfolds?: Record<string, number>;
  perimeters?: Record<string, number>;
  conclusion?: string;
  photos?: {
    front?: string;
    back?: string;
    rightSide?: string;
    leftSide?: string;
  };
}

export function generateAssessmentReportHtml(data: AssessmentReportData): string {
  const primaryColor = data.primaryColor || '#D90000';
  const skinfoldsEntries = Object.entries(data.skinfolds || {}).filter(([_, v]) => typeof v === 'number' && v > 0);
  const perimetersEntries = Object.entries(data.perimeters || {}).filter(([_, v]) => typeof v === 'number' && v > 0);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo de Avaliação Física - ${data.studentName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: ${primaryColor};
      text-transform: uppercase;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748B;
      margin: 2px 0 0;
    }
    .student-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      font-size: 12px;
    }
    .student-card strong {
      display: block;
      color: #0F172A;
      font-size: 13px;
    }
    .student-card span {
      color: #64748B;
      font-size: 11px;
      text-transform: uppercase;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric-box {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .metric-box.highlight {
      border: 2px solid ${primaryColor};
      background: rgba(217, 0, 0, 0.04);
    }
    .metric-value {
      font-size: 22px;
      font-weight: 800;
      color: ${primaryColor};
      margin: 4px 0;
    }
    .metric-label {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
      text-transform: uppercase;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      border-left: 4px solid ${primaryColor};
      padding-left: 8px;
      margin: 20px 0 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #E2E8F0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #F1F5F9;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      font-size: 10px;
    }
    .conclusion-box {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 14px;
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
    }
    .signature-box {
      width: 45%;
      border-top: 1px solid #94A3B8;
      text-align: center;
      padding-top: 6px;
      font-size: 11px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">${data.businessName || 'DragonCorp'}</h1>
      <p class="brand-subtitle">Laudo de Avaliação Física & Composição Corporal</p>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748B;">
      <div><strong>${data.trainerName}</strong></div>
      <div>${data.trainerCref ? `CREF: ${data.trainerCref}` : 'Personal Trainer'}</div>
      <div>Data: ${data.assessmentDate}</div>
    </div>
  </div>

  <div class="student-card">
    <div>
      <span>Aluno(a)</span>
      <strong>${data.studentName}</strong>
    </div>
    <div>
      <span>Sexo / Idade</span>
      <strong>${data.studentGender === 'male' ? 'Masculino' : 'Feminino'} · ${data.studentAge || '-'} anos</strong>
    </div>
    <div>
      <span>Protocolo Aplicado</span>
      <strong>${data.protocolName}</strong>
    </div>
    <div>
      <span>Classificação</span>
      <strong style="color: ${primaryColor};">${data.classification}</strong>
    </div>
  </div>

  <h3 class="section-title">Resultados de Composição Corporal</h3>
  <div class="metrics-grid">
    <div class="metric-box">
      <div class="metric-label">Peso Atual</div>
      <div class="metric-value">${data.weightKg} kg</div>
      <div style="font-size: 10px; color: #64748B;">Altura: ${data.heightCm} cm</div>
    </div>
    <div class="metric-box highlight">
      <div class="metric-label">% Gordura Estimado</div>
      <div class="metric-value">${data.bodyFatPercent}%</div>
      <div style="font-size: 10px; color: #64748B;">${data.classification}</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Massa Magra</div>
      <div class="metric-value" style="color: #10B981;">${data.leanMassKg} kg</div>
      <div style="font-size: 10px; color: #64748B;">Músculos e Ossos</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Massa Gorda</div>
      <div class="metric-value" style="color: #EF4444;">${data.fatMassKg} kg</div>
      <div style="font-size: 10px; color: #64748B;">Peso Alvo: ~${data.idealWeightKg} kg</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    ${
      skinfoldsEntries.length > 0
        ? `
    <div>
      <h3 class="section-title">Dobras Cutâneas (mm)</h3>
      <table>
        <thead>
          <tr>
            <th>Região Anatômica</th>
            <th style="text-align: right;">Medida</th>
          </tr>
        </thead>
        <tbody>
          ${skinfoldsEntries
            .map(
              ([k, v]) => `
          <tr>
            <td style="text-transform: capitalize;">${k}</td>
            <td style="text-align: right; font-weight: 700;">${v} mm</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`
        : ''
    }

    ${
      perimetersEntries.length > 0
        ? `
    <div>
      <h3 class="section-title">Perímetros / Circunferências (cm)</h3>
      <table>
        <thead>
          <tr>
            <th>Região Anatômica</th>
            <th style="text-align: right;">Medida</th>
          </tr>
        </thead>
        <tbody>
          ${perimetersEntries
            .map(
              ([k, v]) => `
          <tr>
            <td style="text-transform: capitalize;">${k}</td>
            <td style="text-align: right; font-weight: 700;">${v} cm</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`
        : ''
    }
  </div>

  ${
    data.conclusion
      ? `
  <h3 class="section-title">Parecer e Orientações do Treinador</h3>
  <div class="conclusion-box">
    ${data.conclusion}
  </div>`
      : ''
  }

  <div class="signature-section">
    <div class="signature-box">
      <strong>${data.studentName}</strong>
      <div>Assinatura do Aluno(a)</div>
    </div>
    <div class="signature-box">
      <strong>${data.trainerName}</strong>
      <div>${data.trainerCref ? `CREF ${data.trainerCref}` : 'Profissional de Educação Física'}</div>
    </div>
  </div>
</body>
</html>
`;
}

export function printAssessmentReport(data: AssessmentReportData) {
  const html = generateAssessmentReportHtml(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
