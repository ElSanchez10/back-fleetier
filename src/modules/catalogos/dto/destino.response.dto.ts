import { ApiProperty } from '@nestjs/swagger';
import type { DestinoRow } from '../interfaces/catalogos-row.interface';

export class DestinoResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Villarrica' })
  nombre: string;

  @ApiProperty({
    example: 15000,
    description: 'Precio que se propone al registrar un pedido',
  })
  precioBase: number;

  static fromRow(this: void, fila: DestinoRow): DestinoResponseDto {
    const dto = new DestinoResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.precioBase = fila.precio_base;
    return dto;
  }
}
