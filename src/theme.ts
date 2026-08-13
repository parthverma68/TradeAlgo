export const colors = {
  bg: '#0a0e14',
  panel: '#0f1620',
  panel2: '#131c28',
  border: '#1d2735',
  text: '#e6edf3',
  muted: '#8593a3',
  dim: '#586575',
  green: '#22d39a',
  red: '#ff5168',
  amber: '#ffb02e',
  blue: '#3b9bff',
  purple: '#a974ff',
} as const;

export const font = {
  sans: 'PlexSans',
  sansBold: 'PlexSansBold',
  mono: 'PlexMono',
  monoBold: 'PlexMonoBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;

export const signalColor = (s?: string) =>
  s === 'BULLISH' ? colors.green : s === 'BEARISH' ? colors.red : colors.amber;

export const deltaColor = (n: number) => (n >= 0 ? colors.green : colors.red);
