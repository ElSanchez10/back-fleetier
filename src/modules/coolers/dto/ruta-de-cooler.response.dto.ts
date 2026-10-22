import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_RUTA,
  type EstadoRuta,
} from '@/modules/rutas/enums/estado-ruta.enum';
import type { RutaDeCoolerRow } from '../interfaces/cooler-row.interface';

// Una ruta en que estuvo el cooler (su historial).
export class RutaDeCoolerResponseDto {
  @ApiProperty({ example: 152 })
  id: number;

  @ApiProperty({ example: '2026-10-22T09:00', description: 'Hora de Chile' })
  fecha: string;

  @ApiProperty({ enum: ESTADOS_RUTA })
  estado: EstadoRuta;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  @ApiProperty({ type: Number, nullable: true })
  conductorId: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'Juan Pérez' })
  conductor: string | null;

  @ApiProperty({ description: 'Ya volvió de esa ruta' })
  devuelto: boolean;

  @ApiProperty({ type: String, nullable: true, example: '2026-10-22T18:30' })
  devueltoEn: string | null;

  static fromRow(this: void, fila: RutaDeCoolerRow): RutaDeCoolerResponseDto {
    const dto = new RutaDeCoolerResponseDto();
    dto.id = fila.id;
    dto.fecha = fila.fecha;
    dto.estado = fila.estado;
    dto.local = fila.local;
    dto.conductorId = fila.conductor_id;
    dto.conductor = fila.conductor;
    dto.devuelto = fila.devuelto;
    dto.devueltoEn = fila.devuelto_en;
    return dto;
  }
}
