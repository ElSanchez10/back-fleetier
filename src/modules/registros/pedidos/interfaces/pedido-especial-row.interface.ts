import type { RegistroRow } from '../../interfaces/registro-row.interface';

export interface PedidoEspecialRow extends RegistroRow {
  destino_id: number;
  destino: string;
  cantidad: number;
  // null para quien no ve los precios.
  precio: number | null;
  extraordinario: boolean;
  descripcion: string;
}
