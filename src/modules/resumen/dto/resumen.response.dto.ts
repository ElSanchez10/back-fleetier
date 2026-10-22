import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_COOLER,
  type EstadoCooler,
} from '@/modules/coolers/enums/estado-cooler.enum';
import type {
  CoolersPorEstadoRow,
  IndicadoresRow,
} from '../interfaces/resumen-row.interface';

export class CoolersPorEstadoDto {
  @ApiProperty({ enum: ESTADOS_COOLER })
  estado: EstadoCooler;

  @ApiProperty({ example: 12 })
  cantidad: number;

  static fromRow(this: void, fila: CoolersPorEstadoRow): CoolersPorEstadoDto {
    const dto = new CoolersPorEstadoDto();
    dto.estado = fila.estado;
    dto.cantidad = fila.cantidad;
    return dto;
  }
}

// Cómo está la operación ahora, en lo que la cuenta ve.
export class ResumenResponseDto {
  @ApiProperty({ description: 'Rutas en ejecución' })
  rutasActivas: number;

  @ApiProperty({ description: 'Rutas que volvieron con coolers por devolver' })
  rutasPendientes: number;

  @ApiProperty()
  coolersDisponibles: number;

  @ApiProperty({ description: 'Drivers con una ruta en ejecución' })
  conductoresEnRuta: number;

  @ApiProperty({
    type: [CoolersPorEstadoDto],
    description: 'Todos los estados, también los que tienen 0',
  })
  coolersPorEstado: CoolersPorEstadoDto[];

  static fromRows(
    this: void,
    indicadores: IndicadoresRow,
    coolers: CoolersPorEstadoRow[],
  ): ResumenResponseDto {
    const dto = new ResumenResponseDto();
    dto.rutasActivas = indicadores.rutas_activas;
    dto.rutasPendientes = indicadores.rutas_pendientes;
    dto.coolersDisponibles = indicadores.coolers_disponibles;
    dto.conductoresEnRuta = indicadores.conductores_en_ruta;
    dto.coolersPorEstado = coolers.map(CoolersPorEstadoDto.fromRow);
    return dto;
  }
}
