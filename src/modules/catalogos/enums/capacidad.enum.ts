export const CAPACIDADES = ['pequeno', 'mediano', 'grande'] as const;

export type Capacidad = (typeof CAPACIDADES)[number];
