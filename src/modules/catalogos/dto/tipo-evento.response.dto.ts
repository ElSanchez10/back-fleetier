import { ApiProperty } from '@nestjs/swagger';
import { COLORES, type Color } from '../enums/color.enum';
import type { TipoEventoRow } from '../interfaces/catalogos-row.interface';

export class TipoEventoResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Vacaciones' })
  nombre: string;

  @ApiProperty({ enum: COLORES })
  color: Color;

  static fromRow(this: void, fila: TipoEventoRow): TipoEventoResponseDto {
    const dto = new TipoEventoResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.color = fila.color;
    return dto;
  }
}
