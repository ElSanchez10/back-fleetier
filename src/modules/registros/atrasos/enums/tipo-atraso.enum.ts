export const TIPOS_ATRASO = ['despacho', 'picking'] as const;

export type TipoAtraso = (typeof TIPOS_ATRASO)[number];
