import type { Color } from '@/modules/catalogos/enums/color.enum';

// Un evento del calendario tal como sale de la base, con su tipo.
export interface EventoRow {
  id: number;
  titulo: string;
  descripcion: string | null;
  desde: string;
  hasta: string;
  tipo_evento_id: number;
  tipo_evento: string;
  color: Color;
}
