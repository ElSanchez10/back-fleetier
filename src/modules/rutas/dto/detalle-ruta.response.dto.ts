import { ApiProperty } from '@nestjs/swagger';
import { COLORES, type Color } from '@/modules/catalogos/enums/color.enum';
import {
  ESTADOS_COOLER,
  type EstadoCooler,
} from '@/modules/coolers/enums/estado-cooler.enum';
import type { CoolerDeRutaRow } from '../interfaces/ruta-row.interface';
import type { ProblemaRow } from '../problemas/interfaces/problema-row.interface';
import { ProblemaResponseDto } from '../problemas/dto/problema.response.dto';
import { RutaResponseDto } from './ruta.response.dto';

export class CoolerDeRutaDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: '7' })
  nombre: string;

  @ApiProperty({ example: '37681389' })
  codigo: string;

  @ApiProperty({ enum: ESTADOS_COOLER })
  estado: EstadoCooler;

  @ApiProperty({ enum: COLORES })
  color: Color;

  @ApiProperty({ description: 'Ya volvió de esta ruta' })
  devuelto: boolean;

  @ApiProperty({ type: String, nullable: true, example: '2026-10-22T18:30' })
  devueltoEn: string | null;

  static fromRow(this: void, fila: CoolerDeRutaRow): CoolerDeRutaDto {
    const dto = new CoolerDeRutaDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.codigo = fila.codigo;
    dto.estado = fila.estado;
    dto.color = fila.color;
    dto.devuelto = fila.devuelto;
    dto.devueltoEn = fila.devuelto_en;
    return dto;
  }
}

// La ruta con sus coolers y sus problemas.
export class DetalleRutaResponseDto extends RutaResponseDto {
  @ApiProperty({ type: [CoolerDeRutaDto] })
  detalleCoolers: CoolerDeRutaDto[];

  @ApiProperty({ type: [ProblemaResponseDto] })
  detalleProblemas: ProblemaResponseDto[];

  static desde(
    this: void,
    ruta: RutaResponseDto,
    coolers: CoolerDeRutaRow[],
    problemas: ProblemaRow[],
  ): DetalleRutaResponseDto {
    const dto = Object.assign(new DetalleRutaResponseDto(), ruta);
    dto.detalleCoolers = coolers.map(CoolerDeRutaDto.fromRow);
    dto.detalleProblemas = problemas.map(ProblemaResponseDto.fromRow);
    return dto;
  }
}
