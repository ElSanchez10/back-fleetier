import { ApiProperty } from '@nestjs/swagger';
import { COLORES, type Color } from '@/modules/catalogos/enums/color.enum';
import type { EventoRow } from '../interfaces/evento-row.interface';

export class EventoResponseDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Vacaciones' })
  titulo: string;

  @ApiProperty({ type: String, nullable: true })
  descripcion: string | null;

  @ApiProperty({ example: '2026-10-22', description: 'Primer día (incluido)' })
  desde: string;

  @ApiProperty({ example: '2026-10-25', description: 'Último día (incluido)' })
  hasta: string;

  @ApiProperty({ example: 1 })
  tipoEventoId: number;

  @ApiProperty({ example: 'Vacaciones' })
  tipoEvento: string;

  @ApiProperty({ enum: COLORES, description: 'El color del tipo de evento' })
  color: Color;

  static fromRow(this: void, fila: EventoRow): EventoResponseDto {
    const dto = new EventoResponseDto();
    dto.id = fila.id;
    dto.titulo = fila.titulo;
    dto.descripcion = fila.descripcion;
    dto.desde = fila.desde;
    dto.hasta = fila.hasta;
    dto.tipoEventoId = fila.tipo_evento_id;
    dto.tipoEvento = fila.tipo_evento;
    dto.color = fila.color;
    return dto;
  }
}
