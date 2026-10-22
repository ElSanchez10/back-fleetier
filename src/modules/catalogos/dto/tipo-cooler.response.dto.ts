import { ApiProperty } from '@nestjs/swagger';
import { CAPACIDADES, type Capacidad } from '../enums/capacidad.enum';
import { COLORES, type Color } from '../enums/color.enum';
import type { TipoCoolerRow } from '../interfaces/catalogos-row.interface';

export class TipoCoolerResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Coleman' })
  marca: string;

  @ApiProperty({ enum: CAPACIDADES })
  capacidad: Capacidad;

  @ApiProperty({ enum: COLORES })
  color: Color;

  static fromRow(this: void, fila: TipoCoolerRow): TipoCoolerResponseDto {
    const dto = new TipoCoolerResponseDto();
    dto.id = fila.id;
    dto.marca = fila.marca;
    dto.capacidad = fila.capacidad;
    dto.color = fila.color;
    return dto;
  }
}
