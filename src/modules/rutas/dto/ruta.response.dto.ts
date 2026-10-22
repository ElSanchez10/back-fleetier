import { ApiProperty } from '@nestjs/swagger';
import { ESTADOS_RUTA, type EstadoRuta } from '../enums/estado-ruta.enum';
import type { RutaRow } from '../interfaces/ruta-row.interface';

export class RutaResponseDto {
  @ApiProperty({ example: 152 })
  id: number;

  @ApiProperty({ example: '2026-10-22T09:00', description: 'Hora de Chile' })
  fecha: string;

  @ApiProperty({ example: 40, description: 'Órdenes de pedido' })
  ordenes: number;

  @ApiProperty({ enum: ESTADOS_RUTA })
  estado: EstadoRuta;

  @ApiProperty({ example: 1 })
  localId: number;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  @ApiProperty({ example: 1 })
  ciudadId: number;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;

  @ApiProperty({ type: Number, nullable: true, example: 3 })
  conductorId: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'Juan Pérez' })
  conductor: string | null;

  @ApiProperty({ type: String, nullable: true, example: '912345678' })
  conductorTelefono: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Para el ícono del driver: 1 es auto; los demás, camión',
  })
  conductorTipoId: number | null;

  @ApiProperty({ description: 'Coolers en la ruta' })
  coolers: number;

  @ApiProperty({ description: 'De esos, los que ya volvieron' })
  devueltos: number;

  @ApiProperty({ description: 'Problemas anotados' })
  problemas: number;

  static fromRow(this: void, fila: RutaRow): RutaResponseDto {
    const dto = new RutaResponseDto();
    dto.id = fila.id;
    dto.fecha = fila.fecha;
    dto.ordenes = fila.ordenes;
    dto.estado = fila.estado;
    dto.localId = fila.local_id;
    dto.local = fila.local;
    dto.ciudadId = fila.ciudad_id;
    dto.ciudad = fila.ciudad;
    dto.conductorId = fila.conductor_id;
    dto.conductor = fila.conductor;
    dto.conductorTelefono = fila.conductor_telefono;
    dto.conductorTipoId = fila.conductor_tipo_id;
    dto.coolers = fila.coolers;
    dto.devueltos = fila.devueltos;
    dto.problemas = fila.problemas;
    return dto;
  }
}
