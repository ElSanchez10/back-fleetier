import { ApiProperty } from '@nestjs/swagger';
import type { TipoConductorRow } from '../interfaces/catalogos-row.interface';

export class TipoConductorResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Planta' })
  nombre: string;

  static fromRow(this: void, fila: TipoConductorRow): TipoConductorResponseDto {
    const dto = new TipoConductorResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    return dto;
  }
}
