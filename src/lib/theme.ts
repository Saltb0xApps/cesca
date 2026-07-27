/**
 * Single dark theme — this is a nighttime app.
 */

export const colors = {
  bg: '#0A0C10',
  surface: '#151923',
  surfaceAlt: '#1C2230',
  border: '#252D3E',
  text: '#F2F4F8',
  textDim: '#9AA3B5',
  textFaint: '#5E6678',
  accent: '#F0B35C',
  accentText: '#1A1206',
  record: '#E5484D',
  success: '#3DD68C',
  danger: '#E5484D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const type = {
  title: 28,
  heading: 20,
  body: 16,
  small: 13,
  tiny: 11,
} as const;
