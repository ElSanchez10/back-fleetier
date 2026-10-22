import { ApiProperty } from '@nestjs/swagger';
import type { ProblemaRow } from '../interfaces/problema-row.interface';

export class ProblemaResponseDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 2, description: 'Pedidos afectados' })
  cantidad: number;

  @ApiProperty({ example: 'Cajas rotas' })
  descripcion: string;

  @ApiProperty({ example: '2026-10-22T12:14', description: 'Hora de Chile' })
  creadoEn: string;

  static fromRow(this: void, fila: ProblemaRow): ProblemaResponseDto {
    const dto = new ProblemaResponseDto();
    dto.id = fila.id;
    dto.cantidad = fila.cantidad;
    dto.descripcion = fila.descripcion;
    dto.creadoEn = fila.creado_en;
    return dto;
  }
}
