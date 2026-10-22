import type { RegistroRow } from '../../interfaces/registro-row.interface';
import type { TipoAtraso } from '../enums/tipo-atraso.enum';

export interface AtrasoRow extends RegistroRow {
  tipo: TipoAtraso;
  cantidad: number;
}
