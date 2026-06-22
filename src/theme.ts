export const theme = {
  colors: {
    bg: '#0B0B0F',
    surface: '#16161D',
    surfaceAlt: '#1F1F29',
    border: '#2A2A36',
    text: '#F5F5F7',
    textMuted: '#9A9AA8',
    accent: '#7C5CFF',
    accentSoft: '#2A2140',
    danger: '#FF5C7C',
    success: '#3DD68C',
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 22,
    pill: 999,
  },
  spacing: (n: number) => n * 4,
} as const;

export const folderColors = [
  '#7C5CFF',
  '#FF5C7C',
  '#3DD68C',
  '#FFB23D',
  '#3DB8FF',
  '#FF7C3D',
];
