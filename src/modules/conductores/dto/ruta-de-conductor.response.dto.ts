import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_RUTA,
  type EstadoRuta,
} from '@/modules/rutas/enums/estado-ruta.enum';
import type {
  ActividadEnLocalRow,
  RutaDeConductorRow,
} from '../interfaces/conductor-row.interface';

// Una ruta del calendario del conductor.
export class RutaDeConductorResponseDto {
  @ApiProperty({ example: 152 })
  id: number;

  @ApiProperty({ example: '2026-10-22T09:00', description: 'Hora de Chile' })
  fecha: string;

  @ApiProperty({ example: 40 })
  ordenes: number;

  @ApiProperty({ enum: ESTADOS_RUTA })
  estado: EstadoRuta;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  static fromRow(
    this: void,
    fila: RutaDeConductorRow,
  ): RutaDeConductorResponseDto {
    const dto = new RutaDeConductorResponseDto();
    dto.id = fila.id;
    dto.fecha = fila.fecha;
    dto.ordenes = fila.ordenes;
    dto.estado = fila.estado;
    dto.local = fila.local;
    return dto;
  }
}

export class ActividadEnLocalDto {
  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;

  @ApiProperty({ example: 3 })
  rutas: number;

  @ApiProperty({ example: 120 })
  ordenes: number;

  static fromRow(this: void, fila: ActividadEnLocalRow): ActividadEnLocalDto {
    const dto = new ActividadEnLocalDto();
    dto.local = fila.local;
    dto.ciudad = fila.ciudad;
    dto.rutas = fila.rutas;
    dto.ordenes = fila.ordenes;
    return dto;
  }
}

// Órdenes y rutas del conductor por local en un rango de días.
export class ActividadConductorResponseDto {
  @ApiProperty({ type: [ActividadEnLocalDto] })
  locales: ActividadEnLocalDto[];

  @ApiProperty({ description: 'Total de órdenes en el rango' })
  ordenes: number;
}
