/**
 * Gerador de Laudo de Anamnese Clínica em HTML / Printable PDF
 * Padrão Profissional com Identidade Visual da Consultoria DragonCorp
 */

export interface AnamnesisReportData {
  trainerName: string;
  trainerCref?: string;
  businessName: string;
  primaryColor: string;
  studentName: string;
  studentAge?: number;
  reviewedAt?: string;
  medicalConditions?: string[];
  injuriesOrPain?: string[];
  painDetails?: string;
  medications?: string;
  cardiacRisk?: string;
  surgeryHistory?: string;
  sleepQuality?: string;
  stressLevel?: string;
  waterIntakeLiters?: number;
  smokingOrAlcohol?: string;
  sportsHistory?: string;
  dietaryRestrictions?: string;
  trainerReviewNote?: string;
}

export function generateAnamnesisPdfHtml(data: AnamnesisReportData): string {
  const primaryColor = data.primaryColor || '#D90000';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo de Anamnese Clínica - ${data.studentName}</title>
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
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      border-left: 4px solid ${primaryColor};
      padding-left: 8px;
      margin: 18px 0 10px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .info-card {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
    }
    .info-card span {
      display: block;
      font-size: 10px;
      color: #64748B;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .info-card strong {
      color: #0F172A;
    }
    .alert-box {
      background: #FEF2F2;
      border: 1px solid #F87171;
      border-radius: 6px;
      padding: 10px 12px;
      color: #991B1B;
      font-size: 12px;
      margin-bottom: 12px;
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
      <p class="brand-subtitle">Laudo de Anamnese Clínica & Triagem de Saúde</p>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748B;">
      <div><strong>${data.trainerName}</strong></div>
      <div>${data.trainerCref ? `CREF: ${data.trainerCref}` : 'Personal Trainer'}</div>
      <div>Data de Revisão: ${data.reviewedAt || new Date().toLocaleDateString('pt-BR')}</div>
    </div>
  </div>

  <div class="student-card">
    <div>
      <span style="color: #64748B; text-transform: uppercase; font-size: 10px;">Aluno(a)</span>
      <strong style="font-size: 13px; display: block;">${data.studentName}</strong>
    </div>
    <div>
      <span style="color: #64748B; text-transform: uppercase; font-size: 10px;">Idade</span>
      <strong style="font-size: 13px; display: block;">${data.studentAge || '-'} anos</strong>
    </div>
    <div>
      <span style="color: #64748B; text-transform: uppercase; font-size: 10px;">Risco Cardíaco</span>
      <strong style="font-size: 13px; display: block; color: ${primaryColor};">${data.cardiacRisk || 'Baixo'}</strong>
    </div>
  </div>

  ${
    data.painDetails
      ? `
  <div class="alert-box">
    <strong>Atenção Ortopédica / Ponto de Dor:</strong>
    <div>${data.painDetails}</div>
  </div>`
      : ''
  }

  <h3 class="section-title">1. Estilo de Vida & Hábitos</h3>
  <div class="grid-2">
    <div class="info-card">
      <span>Qualidade do Sono</span>
      <strong>${data.sleepQuality || 'Boa'}</strong>
    </div>
    <div class="info-card">
      <span>Nível de Estresse</span>
      <strong>${data.stressLevel || 'Moderado'}</strong>
    </div>
    <div class="info-card">
      <span>Ingestão Hídrica Diária</span>
      <strong>${data.waterIntakeLiters || 2.5} Litros / dia</strong>
    </div>
    <div class="info-card">
      <span>Tabagismo / Etilismo</span>
      <strong>${data.smokingOrAlcohol || 'Não relata'}</strong>
    </div>
  </div>

  <h3 class="section-title">2. Histórico Médico & Fatores de Risco</h3>
  <div class="grid-2">
    <div class="info-card">
      <span>Medicamentos em Uso</span>
      <strong>${data.medications || 'Nenhum medicamento contínuo'}</strong>
    </div>
    <div class="info-card">
      <span>Cirurgias Prévias / Fraturas</span>
      <strong>${data.surgeryHistory || 'Nenhuma cirurgia relatada'}</strong>
    </div>
    <div class="info-card" style="grid-column: 1 / -1;">
      <span>Condições Clínicas / Alergias</span>
      <strong>${(data.medicalConditions || []).join(', ') || 'Sem restrições crônicas'}</strong>
    </div>
  </div>

  <h3 class="section-title">3. Histórico de Exercício & Nutrição</h3>
  <div class="grid-2">
    <div class="info-card">
      <span>Experiência com Treinamento</span>
      <strong>${data.sportsHistory || 'Musculação / Fitness'}</strong>
    </div>
    <div class="info-card">
      <span>Restrições Alimentares</span>
      <strong>${data.dietaryRestrictions || 'Nenhuma restrição'}</strong>
    </div>
  </div>

  ${
    data.trainerReviewNote
      ? `
  <h3 class="section-title">4. Parecer Técnico do Personal Trainer</h3>
  <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 12px; font-size: 12px; line-height: 1.5;">
    ${data.trainerReviewNote}
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

export function printAnamnesisReport(data: AnamnesisReportData) {
  const html = generateAnamnesisPdfHtml(data);
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
