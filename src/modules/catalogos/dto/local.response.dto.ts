import { ApiProperty } from '@nestjs/swagger';
import type { LocalRow } from '../interfaces/catalogos-row.interface';

export class LocalResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Lider Temuco' })
  nombre: string;

  @ApiProperty({ example: 'Av. Alemania 0671' })
  direccion: string;

  @ApiProperty({ example: 1 })
  ciudadId: number;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;

  static fromRow(this: void, fila: LocalRow): LocalResponseDto {
    const dto = new LocalResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.direccion = fila.direccion;
    dto.ciudadId = fila.ciudad_id;
    dto.ciudad = fila.ciudad;
    return dto;
  }
}
