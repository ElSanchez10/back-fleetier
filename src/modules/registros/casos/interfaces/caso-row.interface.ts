import type { RegistroRow } from '../../interfaces/registro-row.interface';

export interface CasoRow extends RegistroRow {
  conductor_id: number;
  conductor: string;
  descripcion: string;
}
