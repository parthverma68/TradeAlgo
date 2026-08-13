/**
 * Design tokens for the consumer-facing TradeAlgo UI (onboarding, home,
 * market detail, portfolio, profile).
 *
 * Deliberately separate from `src/theme.ts`, which holds the dark
 * institutional-terminal palette used by the analytics screens. Two products
 * live in this app; mixing their tokens is how palettes rot.
 */

export const ui = {
  /** Brand accent — buttons, active pills, highlights. */
  purple: '#6C4DF6',
  purpleDeep: '#5A3BE0',
  purpleTint: '#EDE9FE',
  purpleTintDeep: '#DED5FD',

  /** Candle + chart accents. */
  yellow: '#F3EC4E',
  candleUp: '#F3EC4E',
  candleDown: '#6C4DF6',
  wick: '#3A3A3E',

  /** Dark surfaces (market card, tab bar, sell button). */
  ink: '#0B0B0C',
  inkSoft: '#161618',
  inkRaised: '#2A2A2E',
  onInk: '#FFFFFF',
  onInkMuted: '#8E8E96',

  /** Light surfaces. */
  screenTop: '#EDE7FA',
  screenBottom: '#E7EBF6',
  card: '#FFFFFF',
  tile: '#F4F5FB',
  hairline: '#ECECF3',

  /** Text. */
  text: '#0D0D14',
  textMuted: '#8A8A9E',
  textFaint: '#B4B4C4',

  /** Semantics. */
  green: '#16C266',
  red: '#F0495C',
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const gap = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 } as const;

/** Elevation that reads the same on both platforms. */
export const shadow = {
  card: {
    shadowColor: '#3B3B6B',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  floating: {
    shadowColor: '#12121F',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const;

export const deltaColor = (n: number) => (n >= 0 ? ui.green : ui.red);

/** `+6.70%` / `-1.24%` — always signed, always two decimals. */
export const fmtPct = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(2)}%`;

/** `$7,154.45` with thousands separators, no locale dependency. */
export const fmtMoney = (n: number, currency = '$', decimals = 2) => {
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${currency}${grouped}${frac ? `.${frac}` : ''}`;
};

/** `75.61M`, `1.24B` — used for volume and market cap. */
export const fmtCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
};
