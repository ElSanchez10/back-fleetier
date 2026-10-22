import { ApiProperty } from '@nestjs/swagger';
import {
  CAPACIDADES,
  type Capacidad,
} from '@/modules/catalogos/enums/capacidad.enum';
import { COLORES, type Color } from '@/modules/catalogos/enums/color.enum';
import { ESTADOS_COOLER, type EstadoCooler } from '../enums/estado-cooler.enum';
import type { CoolerRow } from '../interfaces/cooler-row.interface';

export class CoolerResponseDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: '7', description: 'El número escrito en el cooler' })
  nombre: string;

  @ApiProperty({ example: '37681389', description: 'Código de barras' })
  codigo: string;

  @ApiProperty({ example: '2026-01-15' })
  fechaAdquisicion: string;

  @ApiProperty()
  tieneTapa: boolean;

  @ApiProperty({ enum: ESTADOS_COOLER })
  estado: EstadoCooler;

  @ApiProperty({ example: 1 })
  tipoCoolerId: number;

  @ApiProperty({ example: 'Coleman' })
  marca: string;

  @ApiProperty({ enum: CAPACIDADES })
  capacidad: Capacidad;

  @ApiProperty({ enum: COLORES })
  color: Color;

  @ApiProperty({ example: 1 })
  localId: number;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;

  static fromRow(this: void, fila: CoolerRow): CoolerResponseDto {
    const dto = new CoolerResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.codigo = fila.codigo;
    dto.fechaAdquisicion = fila.fecha_adquisicion;
    dto.tieneTapa = fila.tiene_tapa;
    dto.estado = fila.estado;
    dto.tipoCoolerId = fila.tipo_cooler_id;
    dto.marca = fila.marca;
    dto.capacidad = fila.capacidad;
    dto.color = fila.color;
    dto.localId = fila.local_id;
    dto.local = fila.local;
    dto.ciudad = fila.ciudad;
    return dto;
  }
}
