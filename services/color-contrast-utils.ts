/**
 * Utilitários de Matemática de Cor, Contraste WCAG 2.1 AA e Geração de Tokens Semânticos
 * DragonCorp Brand Customization System
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface BrandTokens {
  brandPrimary: string;
  brandPrimaryPressed: string;
  brandPrimarySoft: string;
  brandPrimaryBorder: string;
  brandOnPrimary: '#FFFFFF' | '#000000';
  brandFocus: string;
  contrastOnDark: number;
  contrastOnLight: number;
  isAccessibleOnDark: boolean;
  isAccessibleOnLight: boolean;
  suggestedAccessibleHex: string;
}

/**
 * Valida se uma string é um código hexadecimal de cor válido (#RGB ou #RRGGBB)
 */
export function isValidHex(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  const clean = hex.trim();
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean);
}

/**
 * Normaliza qualquer hex válido para o formato canônico #RRGGBB em caixa alta
 */
export function normalizeHex(hex: string): string {
  if (!isValidHex(hex)) return '#D90000';
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${clean.toUpperCase()}`;
}

/**
 * Converte Hexadecimal para RGB
 */
export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex).replace(/^#/, '');
  const r = parseInt(norm.substring(0, 2), 16);
  const g = parseInt(norm.substring(2, 4), 16);
  const b = parseInt(norm.substring(4, 6), 16);
  return { r: isNaN(r) ? 217 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

/**
 * Converte RGB para Hexadecimal
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calcula a Luminância Relativa conforme especificação sRGB da WCAG 2.1
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calcula a Taxa de Contraste (Contrast Ratio) entre duas cores hexadecimais (1:1 a 21:1)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Determina automaticamente a melhor cor de texto (#FFFFFF ou #000000) sobre uma cor de fundo
 * Garante máxima legibilidade em botões e badges
 */
export function getBestTextColor(bgHex: string): '#FFFFFF' | '#000000' {
  const contrastWithWhite = getContrastRatio(bgHex, '#FFFFFF');
  const contrastWithBlack = getContrastRatio(bgHex, '#000000');
  return contrastWithWhite >= contrastWithBlack ? '#FFFFFF' : '#000000';
}

/**
 * Ajusta a luminosidade de uma cor mantendo o matiz
 */
export function adjustLightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  let newR = r;
  let newG = g;
  let newB = b;

  if (factor > 0) {
    newR = r + (255 - r) * factor;
    newG = g + (255 - g) * factor;
    newB = b + (255 - b) * factor;
  } else {
    newR = r * (1 + factor);
    newG = g * (1 + factor);
    newB = b * (1 + factor);
  }

  return rgbToHex(newR, newG, newB);
}

/**
 * Gera variação acessível para dark mode se a cor for muito escura
 */
export function getAccessibleVariantForDark(hex: string, targetBg = '#0F0F0F', minRatio = 3.2): string {
  let currentHex = normalizeHex(hex);
  let ratio = getContrastRatio(currentHex, targetBg);
  if (ratio >= minRatio) return currentHex;

  // Clareia progressivamente até alcançar o contraste mínimo aceitável
  for (let step = 10; step <= 80; step += 10) {
    const lighter = adjustLightness(currentHex, step);
    if (getContrastRatio(lighter, targetBg) >= minRatio) {
      return lighter;
    }
  }
  return '#FF4444'; // Fallback seguro
}

/**
 * Gera conjunto completo de tokens semânticos derivados da cor primária
 */
export function generateBrandTokens(primaryHex: string): BrandTokens {
  const brandPrimary = normalizeHex(primaryHex);
  const { r, g, b } = hexToRgb(brandPrimary);

  const brandOnPrimary = getBestTextColor(brandPrimary);
  const brandPrimaryPressed = adjustLightness(brandPrimary, -16);
  const brandPrimarySoft = `rgba(${r}, ${g}, ${b}, 0.14)`;
  const brandPrimaryBorder = `rgba(${r}, ${g}, ${b}, 0.35)`;
  const brandFocus = `rgba(${r}, ${g}, ${b}, 0.50)`;

  const contrastOnDark = Number(getContrastRatio(brandPrimary, '#0F0F0F').toFixed(2));
  const contrastOnLight = Number(getContrastRatio(brandPrimary, '#FFFFFF').toFixed(2));

  const isAccessibleOnDark = contrastOnDark >= 3.0; // Critério WCAG AA para elementos de UI e texto grande
  const isAccessibleOnLight = contrastOnLight >= 3.0;

  const suggestedAccessibleHex = !isAccessibleOnDark
    ? getAccessibleVariantForDark(brandPrimary, '#0F0F0F', 3.5)
    : brandPrimary;

  return {
    brandPrimary,
    brandPrimaryPressed,
    brandPrimarySoft,
    brandPrimaryBorder,
    brandOnPrimary,
    brandFocus,
    contrastOnDark,
    contrastOnLight,
    isAccessibleOnDark,
    isAccessibleOnLight,
    suggestedAccessibleHex,
  };
}
