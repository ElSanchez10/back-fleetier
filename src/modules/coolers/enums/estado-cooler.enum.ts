export const ESTADOS_COOLER = [
  'disponible',
  'en_espera',
  'en_ruta',
  'pendiente',
  'no_disponible',
  'danado',
] as const;

export type EstadoCooler = (typeof ESTADOS_COOLER)[number];
