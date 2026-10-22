import { ApiProperty } from '@nestjs/swagger';
import type { ResumenConductoresRow } from '../interfaces/conductor-row.interface';
import { ConductorResponseDto } from './conductor.response.dto';

// De todos los que la cuenta ve, sin los filtros.
export class ResumenConductoresDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ description: 'Sin ruta abierta' })
  disponibles: number;

  @ApiProperty({ description: 'Su ruta ya partió' })
  enRuta: number;

  static fromRow(
    this: void,
    fila: ResumenConductoresRow,
  ): ResumenConductoresDto {
    const dto = new ResumenConductoresDto();
    dto.total = fila.total;
    dto.disponibles = fila.disponibles;
    dto.enRuta = fila.en_ruta;
    return dto;
  }
}

export class ListadoConductoresResponseDto {
  @ApiProperty({ type: [ConductorResponseDto] })
  items: ConductorResponseDto[];

  @ApiProperty({ description: 'Todas las filas que cumplen el filtro' })
  total: number;

  @ApiProperty({ type: ResumenConductoresDto })
  resumen: ResumenConductoresDto;
}
