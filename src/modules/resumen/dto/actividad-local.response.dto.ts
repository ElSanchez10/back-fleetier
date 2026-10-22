import { ApiProperty } from '@nestjs/swagger';
import type { ActividadLocalRow } from '../interfaces/resumen-row.interface';

// Rutas y órdenes de un local en el mes pedido.
export class ActividadLocalResponseDto {
  @ApiProperty({ example: 1 })
  localId: number;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;

  @ApiProperty({ example: 42 })
  rutas: number;

  @ApiProperty({ example: 380, description: 'Órdenes de pedido de esas rutas' })
  ordenes: number;

  static fromRow(
    this: void,
    fila: ActividadLocalRow,
  ): ActividadLocalResponseDto {
    const dto = new ActividadLocalResponseDto();
    dto.localId = fila.local_id;
    dto.local = fila.local;
    dto.ciudad = fila.ciudad;
    dto.rutas = fila.rutas;
    dto.ordenes = fila.ordenes;
    return dto;
  }
}
