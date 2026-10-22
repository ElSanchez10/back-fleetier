export const COLORES = [
  'verde',
  'rojo',
  'turquesa',
  'azul',
  'morado',
  'gris',
  'negro',
] as const;

export type Color = (typeof COLORES)[number];
