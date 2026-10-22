import { ApiProperty } from '@nestjs/swagger';
import type { CiudadRow } from '../interfaces/catalogos-row.interface';

export class CiudadResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Temuco' })
  nombre: string;

  static fromRow(this: void, fila: CiudadRow): CiudadResponseDto {
    const dto = new CiudadResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    return dto;
  }
}
