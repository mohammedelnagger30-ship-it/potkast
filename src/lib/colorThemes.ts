export type ColorThemeId =
  | 'emerald' | 'violet' | 'blue' | 'rose' | 'sky' | 'amber' | 'custom';

export interface CustomColors {
  primary: string;
  accent: string;
}

export interface ColorTheme {
  id: ColorThemeId;
  label: string;
  description: string;
  /** The two colours shown on the swatch. */
  swatch: [string, string];
  primary: Record<number, string>;
  accent: Record<number, string>;
}

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const CUSTOM_COLORS_KEY = 'nammy-custom-colors';

export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  primary: '#0F766E',
  accent: '#D4A017',
};

function palette(values: readonly string[]): Record<number, string> {
  return Object.fromEntries(SHADES.map((shade, i) => [shade, values[i]]));
}

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split('').map((c) => c + c).join('').toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = (normalizeHex(hex) || '#000000').slice(1);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function hexToChannels(hex: string): string {
  return hexToRgb(hex).join(' ');
}

function channelsToHex(channels: number[]): string {
  return `#${channels
    .map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function mix(a: number[], b: number[], amount: number): number[] {
  return a.map((value, i) => value + (b[i] - value) * amount);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG-aware text colour for a filled surface, returned as RGB channels. */
export function contrastOn(hex: string): string {
  const light = luminance(hex);
  const dark = luminance('#0C0A09');
  const withWhite = 1.05 / (light + 0.05);
  const withDark = (light + 0.05) / (dark + 0.05);
  return withWhite >= withDark ? '255 255 255' : '12 10 9';
}

/** Turn one chosen colour into a full 11-step palette. */
export function buildPalette(baseHex: string): Record<number, string> {
  const base = normalizeHex(baseHex) || DEFAULT_CUSTOM_COLORS.primary;
  const rgb = hexToRgb(base);
  const light = [0.94, 0.86, 0.74, 0.55, 0.28].map((amount) =>
    channelsToHex(mix(rgb, [255, 255, 255], amount)),
  );
  const dark = [0.12, 0.26, 0.4, 0.57, 0.72].map((amount) =>
    channelsToHex(mix(rgb, [0, 0, 0], amount)),
  );
  return palette([...light, base, ...dark]);
}

export function makeCustomTheme(colors: CustomColors): ColorTheme {
  const primary = normalizeHex(colors.primary) || DEFAULT_CUSTOM_COLORS.primary;
  const accent = normalizeHex(colors.accent) || DEFAULT_CUSTOM_COLORS.accent;
  return {
    id: 'custom',
    label: 'مخصص',
    description: 'لونك الخاص — بيتحفظ على جهازك ويتولّد منه كل الدرجات',
    swatch: [primary, accent],
    primary: buildPalette(primary),
    accent: buildPalette(accent),
  };
}

export function readCustomColors(): CustomColors {
  const fallback = { ...DEFAULT_CUSTOM_COLORS };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CustomColors>;
    return {
      primary: normalizeHex(parsed.primary) || fallback.primary,
      accent: normalizeHex(parsed.accent) || fallback.accent,
    };
  } catch {
    return fallback;
  }
}

export function saveCustomColors(colors: CustomColors): void {
  try {
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify({
      primary: normalizeHex(colors.primary) || DEFAULT_CUSTOM_COLORS.primary,
      accent: normalizeHex(colors.accent) || DEFAULT_CUSTOM_COLORS.accent,
    }));
  } catch {
    // Storage can be unavailable in private mode — the theme still works in memory.
  }
}

const amberAccent = palette([
  '#FEFCE8', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24',
  '#D4A017', '#B45309', '#92400E', '#78350F', '#451A03', '#451A03',
]);

const roseAccent = palette([
  '#FFF1F2', '#FFE4E6', '#FECDD3', '#FDA4AF', '#FB7185',
  '#F43F5E', '#E11D48', '#BE123C', '#9F1239', '#881337', '#4C0519',
]);

const emeraldAccent = palette([
  '#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399',
  '#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22',
]);

const violetAccent = palette([
  '#F5F3FF', '#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA',
  '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#2E1065',
]);

export const colorThemes: ColorTheme[] = [
  {
    id: 'emerald',
    label: 'زمردي',
    description: 'الأخضر الهادئ — التصميم الأصلي',
    swatch: ['#0F766E', '#D4A017'],
    primary: palette([
      '#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399',
      '#10B981', '#0F766E', '#047857', '#065F46', '#064E3B', '#022C22',
    ]),
    accent: amberAccent,
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    description: 'بنفسجي أنيق مع لمسة وردية',
    swatch: ['#7C3AED', '#F43F5E'],
    primary: palette([
      '#F5F3FF', '#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA',
      '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#2E1065',
    ]),
    accent: roseAccent,
  },
  {
    id: 'blue',
    label: 'أزرق',
    description: 'أزرق ثابت يليق بالعمل والتعلّم',
    swatch: ['#2563EB', '#D97706'],
    primary: palette([
      '#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA',
      '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554',
    ]),
    accent: amberAccent,
  },
  {
    id: 'rose',
    label: 'وردي',
    description: 'وردي دافئ مع لمسة بنفسجية',
    swatch: ['#E11D48', '#8B5CF6'],
    primary: palette([
      '#FFF1F2', '#FFE4E6', '#FECDD3', '#FDA4AF', '#FB7185',
      '#F43F5E', '#E11D48', '#BE123C', '#9F1239', '#881337', '#4C0519',
    ]),
    accent: violetAccent,
  },
  {
    id: 'sky',
    label: 'سمائي',
    description: 'أزرق سماوي منعش',
    swatch: ['#0284C7', '#D4A017'],
    primary: palette([
      '#F0F9FF', '#E0F2FE', '#BAE6FD', '#7DD3FC', '#38BDF8',
      '#0EA5E9', '#0284C7', '#0369A1', '#075985', '#0C4A6E', '#082F49',
    ]),
    accent: amberAccent,
  },
  {
    id: 'amber',
    label: 'ذهبي',
    description: 'ذهبي فاخر مع لمسة خضراء',
    swatch: ['#D97706', '#0F766E'],
    primary: palette([
      '#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24',
      '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#451A03',
    ]),
    accent: emeraldAccent,
  },
];

export function getColorTheme(
  id: string | null | undefined,
  custom: CustomColors = DEFAULT_CUSTOM_COLORS,
): ColorTheme {
  if (id === 'custom') return makeCustomTheme(custom);
  return colorThemes.find((t) => t.id === id) || colorThemes[0];
}
