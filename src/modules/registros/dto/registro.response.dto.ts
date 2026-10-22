import { ApiProperty } from '@nestjs/swagger';
import type { RegistroRow } from '../interfaces/registro-row.interface';

// Lo común de pedidos especiales, atrasos y casos.
export abstract class RegistroResponseDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: '2026-10-22', description: 'Día (AAAA-MM-DD)' })
  fecha: string;

  @ApiProperty({ example: 1 })
  localId: number;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;

  // Copia en `dto` los campos comunes de la fila.
  protected static conBase<T extends RegistroResponseDto>(
    dto: T,
    fila: RegistroRow,
  ): T {
    dto.id = fila.id;
    dto.fecha = fila.fecha;
    dto.localId = fila.local_id;
    dto.local = fila.local;
    dto.ciudad = fila.ciudad;
    return dto;
  }
}
