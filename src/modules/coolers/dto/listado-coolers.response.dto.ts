import { ApiProperty } from '@nestjs/swagger';
import type { ResumenCoolersRow } from '../interfaces/cooler-row.interface';
import { CoolerResponseDto } from './cooler.response.dto';

// De todo lo que la cuenta ve, sin los filtros.
export class ResumenCoolersDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  disponibles: number;

  @ApiProperty()
  enRuta: number;

  static fromRow(this: void, fila: ResumenCoolersRow): ResumenCoolersDto {
    const dto = new ResumenCoolersDto();
    dto.total = fila.total;
    dto.disponibles = fila.disponibles;
    dto.enRuta = fila.en_ruta;
    return dto;
  }
}

export class ListadoCoolersResponseDto {
  @ApiProperty({ type: [CoolerResponseDto] })
  items: CoolerResponseDto[];

  @ApiProperty({ description: 'Todas las filas que cumplen el filtro' })
  total: number;

  @ApiProperty({ type: ResumenCoolersDto })
  resumen: ResumenCoolersDto;
}
