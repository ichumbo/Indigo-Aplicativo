/**
 * Utilitários Oficiais de Composição Corporal e Protocolos Antropométricos
 * Paridade 100% com o aplicativo mobile DragonCorp
 */

export type CompositionSex = 'male' | 'female';

export type BodyCompositionProtocolId =
  | 'jackson-pollock-3'
  | 'jackson-pollock-7'
  | 'guedes-3'
  | 'faulkner-4'
  | 'petroski-4'
  | 'bioimpedance';

export interface SkinfoldValues {
  chest?: number;
  midaxillary?: number;
  triceps?: number;
  subscapular?: number;
  abdominal?: number;
  suprailiac?: number;
  thigh?: number;
  calf?: number;
}

export interface BodyPerimeters {
  neck?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hip?: number;
  rightArmRelaxed?: number;
  rightArmContracted?: number;
  leftArmRelaxed?: number;
  leftArmContracted?: number;
  rightForearm?: number;
  leftForearm?: number;
  rightThigh?: number;
  leftThigh?: number;
  rightCalf?: number;
  leftCalf?: number;
}

export interface BioimpedanceValues {
  bodyFatPercent?: number;
  fatMassKg?: number;
  leanMassKg?: number;
  muscleMassKg?: number;
  totalBodyWaterLiters?: number;
  visceralFat?: number;
  boneMassKg?: number;
  basalMetabolicRateKcal?: number;
  metabolicAge?: number;
}

export interface CompositionCalculationResult {
  protocolId: BodyCompositionProtocolId;
  bodyDensity?: number;
  bodyFatPercent: number;
  fatMassKg: number;
  leanMassKg: number;
  bmi: number;
  idealWeightKg: number;
  sumSkinfoldsMm?: number;
  classification: string;
}

export const PROTOCOLS_LIST = [
  {
    id: 'jackson-pollock-7' as BodyCompositionProtocolId,
    name: 'Jackson & Pollock (7 Dobras)',
    skinfolds: ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'],
    description: 'Padrão ouro para adultos de 18 a 61 anos. Maior precisão para atletas e praticantes regulares.',
  },
  {
    id: 'jackson-pollock-3' as BodyCompositionProtocolId,
    name: 'Jackson & Pollock (3 Dobras)',
    skinfolds: ['chest', 'abdominal', 'thigh'], // male: chest, abdominal, thigh; female: triceps, suprailiac, thigh
    description: 'Rápido e altamente confiável. Mede peitoral, abdômen e coxa (homens) ou tríceps, supra-ilíaca e coxa (mulheres).',
  },
  {
    id: 'petroski-4' as BodyCompositionProtocolId,
    name: 'Petroski (4 Dobras)',
    skinfolds: ['triceps', 'subscapular', 'suprailiac', 'calf'],
    description: 'Específico e calibrado para a população brasileira (18 a 66 anos).',
  },
  {
    id: 'guedes-3' as BodyCompositionProtocolId,
    name: 'Guedes (3 Dobras)',
    skinfolds: ['triceps', 'suprailiac', 'abdominal'],
    description: 'Desenvolvido para jovens e adultos brasileiros.',
  },
  {
    id: 'faulkner-4' as BodyCompositionProtocolId,
    name: 'Faulkner (4 Dobras)',
    skinfolds: ['triceps', 'subscapular', 'suprailiac', 'abdominal'],
    description: 'Muito utilizado no meio esportivo e preparação física.',
  },
  {
    id: 'bioimpedance' as BodyCompositionProtocolId,
    name: 'Bioimpedância Elétrica',
    skinfolds: [],
    description: 'Inserção direta dos parâmetros obtidos por balança ou analisador tetrapolar.',
  },
];

export function calculateBMI(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return 'Abaixo do Peso';
  if (bmi < 25.0) return 'Peso Normal / Eutrófico';
  if (bmi < 30.0) return 'Sobrepeso';
  if (bmi < 35.0) return 'Obesidade Grau I';
  if (bmi < 40.0) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
}

export function classifyBodyFat(fatPercent: number, sex: CompositionSex, age: number = 25): string {
  if (sex === 'male') {
    if (fatPercent < 6) return 'Essencial / Muito Baixo';
    if (fatPercent <= 11) return 'Excelente / Atleta';
    if (fatPercent <= 16) return 'Bom / Condicionado';
    if (fatPercent <= 20) return 'Média / Adequado';
    if (fatPercent <= 24) return 'Acima da Média';
    return 'Alto / Obesidade';
  } else {
    if (fatPercent < 12) return 'Essencial / Muito Baixo';
    if (fatPercent <= 17) return 'Excelente / Atleta';
    if (fatPercent <= 22) return 'Bom / Condicionado';
    if (fatPercent <= 26) return 'Média / Adequado';
    if (fatPercent <= 31) return 'Acima da Média';
    return 'Alto / Obesidade';
  }
}

export function calculateComposition(
  protocolId: BodyCompositionProtocolId,
  sex: CompositionSex,
  age: number,
  weightKg: number,
  heightCm: number,
  skinfolds: SkinfoldValues,
  bioimpedance?: BioimpedanceValues
): CompositionCalculationResult {
  const bmi = calculateBMI(weightKg, heightCm);
  let fatPercent = 15;
  let bodyDensity: number | undefined = undefined;
  let sumSkinfolds = 0;

  if (protocolId === 'bioimpedance') {
    fatPercent = bioimpedance?.bodyFatPercent || 15;
  } else if (protocolId === 'jackson-pollock-7') {
    const chest = skinfolds.chest || 0;
    const midax = skinfolds.midaxillary || 0;
    const tri = skinfolds.triceps || 0;
    const sub = skinfolds.subscapular || 0;
    const abd = skinfolds.abdominal || 0;
    const sup = skinfolds.suprailiac || 0;
    const thi = skinfolds.thigh || 0;
    sumSkinfolds = chest + midax + tri + sub + abd + sup + thi;

    if (sumSkinfolds > 0) {
      if (sex === 'male') {
        bodyDensity = 1.112 - 0.00043499 * sumSkinfolds + 0.00000055 * Math.pow(sumSkinfolds, 2) - 0.00028826 * age;
      } else {
        bodyDensity = 1.097 - 0.00046971 * sumSkinfolds + 0.00000056 * Math.pow(sumSkinfolds, 2) - 0.00012828 * age;
      }
      // Fórmula de Siri (1961)
      fatPercent = (4.95 / bodyDensity - 4.5) * 100;
    }
  } else if (protocolId === 'jackson-pollock-3') {
    if (sex === 'male') {
      const chest = skinfolds.chest || 0;
      const abd = skinfolds.abdominal || 0;
      const thi = skinfolds.thigh || 0;
      sumSkinfolds = chest + abd + thi;
      if (sumSkinfolds > 0) {
        bodyDensity = 1.10938 - 0.0008267 * sumSkinfolds + 0.0000016 * Math.pow(sumSkinfolds, 2) - 0.0002574 * age;
        fatPercent = (4.95 / bodyDensity - 4.5) * 100;
      }
    } else {
      const tri = skinfolds.triceps || 0;
      const sup = skinfolds.suprailiac || 0;
      const thi = skinfolds.thigh || 0;
      sumSkinfolds = tri + sup + thi;
      if (sumSkinfolds > 0) {
        bodyDensity = 1.0994921 - 0.0009929 * sumSkinfolds + 0.0000023 * Math.pow(sumSkinfolds, 2) - 0.0001392 * age;
        fatPercent = (4.95 / bodyDensity - 4.5) * 100;
      }
    }
  } else if (protocolId === 'faulkner-4') {
    const tri = skinfolds.triceps || 0;
    const sub = skinfolds.subscapular || 0;
    const sup = skinfolds.suprailiac || 0;
    const abd = skinfolds.abdominal || 0;
    sumSkinfolds = tri + sub + sup + abd;
    if (sumSkinfolds > 0) {
      fatPercent = sumSkinfolds * 0.153 + 5.783;
    }
  } else if (protocolId === 'petroski-4') {
    if (sex === 'male') {
      const sub = skinfolds.subscapular || 0;
      const tri = skinfolds.triceps || 0;
      const sup = skinfolds.suprailiac || 0;
      const calf = skinfolds.calf || 0;
      sumSkinfolds = sub + tri + sup + calf;
      if (sumSkinfolds > 0) {
        bodyDensity = 1.10726863 - 0.00081201 * sumSkinfolds + 0.00000212 * Math.pow(sumSkinfolds, 2) - 0.00041761 * age;
        fatPercent = (4.95 / bodyDensity - 4.5) * 100;
      }
    } else {
      const sub = skinfolds.subscapular || 0;
      const tri = skinfolds.triceps || 0;
      const sup = skinfolds.suprailiac || 0;
      const calf = skinfolds.calf || 0;
      sumSkinfolds = sub + tri + sup + calf;
      if (sumSkinfolds > 0) {
        bodyDensity = 1.09871585 - 0.0006509 * sumSkinfolds + 0.0000011 * Math.pow(sumSkinfolds, 2) - 0.0003445 * age;
        fatPercent = (4.95 / bodyDensity - 4.5) * 100;
      }
    }
  } else if (protocolId === 'guedes-3') {
    if (sex === 'male') {
      const tri = skinfolds.triceps || 0;
      const sup = skinfolds.suprailiac || 0;
      const abd = skinfolds.abdominal || 0;
      sumSkinfolds = tri + sup + abd;
      if (sumSkinfolds > 0) {
        bodyDensity = 1.17136 - 0.06706 * Math.log10(sumSkinfolds);
        fatPercent = (4.95 / bodyDensity - 4.5) * 100;
      }
    } else {
      const sub = skinfolds.subscapular || 0;
      const sup = skinfolds.suprailiac || 0;
      const thi = skinfolds.thigh || 0;
      sumSkinfolds = sub + sup + thi;
      if (sumSkinfolds > 0) {
        bodyDensity = 1.1665 - 0.07063 * Math.log10(sumSkinfolds);
        fatPercent = (4.95 / bodyDensity - 4.5) * 100;
      }
    }
  }

  // Clamping and math rounding
  fatPercent = Math.max(3, Math.min(60, Math.round(fatPercent * 10) / 10));
  const fatMassKg = Math.round(weightKg * (fatPercent / 100) * 10) / 10;
  const leanMassKg = Math.round((weightKg - fatMassKg) * 10) / 10;

  // Ideal weight based on 12% for men and 20% for women
  const targetFatFraction = sex === 'male' ? 0.12 : 0.20;
  const idealWeightKg = Math.round((leanMassKg / (1 - targetFatFraction)) * 10) / 10;

  const classification = classifyBodyFat(fatPercent, sex, age);

  return {
    protocolId,
    bodyDensity: bodyDensity ? Math.round(bodyDensity * 10000) / 10000 : undefined,
    bodyFatPercent: fatPercent,
    fatMassKg,
    leanMassKg,
    bmi,
    idealWeightKg,
    sumSkinfoldsMm: sumSkinfolds > 0 ? sumSkinfolds : undefined,
    classification,
  };
}
