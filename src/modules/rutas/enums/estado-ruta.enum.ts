export const ESTADOS_RUTA = [
  'en_espera',
  'en_ejecucion',
  'pendiente',
  'finalizada',
] as const;

export type EstadoRuta = (typeof ESTADOS_RUTA)[number];

export const NOMBRE_ESTADO_RUTA: Record<EstadoRuta, string> = {
  en_espera: 'En espera',
  en_ejecucion: 'En ejecución',
  pendiente: 'Pendiente',
  finalizada: 'Finalizada',
};
