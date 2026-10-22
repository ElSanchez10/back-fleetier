import type { Color } from '@/modules/catalogos/enums/color.enum';
import type { EstadoCooler } from '@/modules/coolers/enums/estado-cooler.enum';

// El cooler que leyó la pistola, tal como sale de la base.
export interface CoolerLeidoRow {
  id: number;
  nombre: string;
  codigo: string;
  color: Color;
  estado: EstadoCooler;
  local_id: number;
  local: string;
}
