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

export function isValidHex(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  const clean = hex.trim();
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean);
}

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

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex).replace(/^#/, '');
  const r = parseInt(norm.substring(0, 2), 16);
  const g = parseInt(norm.substring(2, 4), 16);
  const b = parseInt(norm.substring(4, 6), 16);
  return { r: isNaN(r) ? 217 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function getBestTextColor(bgHex: string): '#FFFFFF' | '#000000' {
  const contrastWithWhite = getContrastRatio(bgHex, '#FFFFFF');
  const contrastWithBlack = getContrastRatio(bgHex, '#000000');
  return contrastWithWhite >= contrastWithBlack ? '#FFFFFF' : '#000000';
}

export function generateBrandTokens(primaryHex: string): BrandTokens {
  const validHex = normalizeHex(primaryHex);
  const rgb = hexToRgb(validHex);

  const pressedRgb: RgbColor = {
    r: Math.round(rgb.r * 0.8),
    g: Math.round(rgb.g * 0.8),
    b: Math.round(rgb.b * 0.8),
  };
  const brandPrimaryPressed = rgbToHex(pressedRgb.r, pressedRgb.g, pressedRgb.b);
  const brandPrimarySoft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
  const brandPrimaryBorder = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  const brandFocus = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;

  const brandOnPrimary = getBestTextColor(validHex);
  const contrastOnDark = Math.round(getContrastRatio(validHex, '#0F0F0F') * 10) / 10;
  const contrastOnLight = Math.round(getContrastRatio(validHex, '#FFFFFF') * 10) / 10;

  return {
    brandPrimary: validHex,
    brandPrimaryPressed,
    brandPrimarySoft,
    brandPrimaryBorder,
    brandOnPrimary,
    brandFocus,
    contrastOnDark,
    contrastOnLight,
    isAccessibleOnDark: contrastOnDark >= 3.0,
    isAccessibleOnLight: contrastOnLight >= 3.0,
    suggestedAccessibleHex: validHex,
  };
}

export function applyBrandTheme(primaryHex: string) {
  const tokens = generateBrandTokens(primaryHex);
  const root = document.documentElement;

  root.style.setProperty('--primary', tokens.brandPrimary);
  root.style.setProperty('--accent-red', tokens.brandPrimary);
  root.style.setProperty('--accent-red-hover', tokens.brandPrimaryPressed);
  root.style.setProperty('--accent-red-subtle', tokens.brandPrimarySoft);
  root.style.setProperty('--accent-red-border', tokens.brandPrimaryBorder);
  root.style.setProperty('--text-on-primary', tokens.brandOnPrimary);
}
