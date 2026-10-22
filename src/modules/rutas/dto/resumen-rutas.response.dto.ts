import { ApiProperty } from '@nestjs/swagger';
import type { ResumenRutasHoyRow } from '../interfaces/ruta-row.interface';

// Cuántas rutas de hoy hay en cada estado.
export class ResumenRutasHoyResponseDto {
  @ApiProperty({ example: '2026-10-22', description: 'Hoy, en Chile' })
  fecha: string;

  @ApiProperty()
  enEspera: number;

  @ApiProperty()
  enEjecucion: number;

  @ApiProperty()
  pendientes: number;

  @ApiProperty()
  finalizadas: number;

  static fromRow(
    this: void,
    fila: ResumenRutasHoyRow,
  ): ResumenRutasHoyResponseDto {
    const dto = new ResumenRutasHoyResponseDto();
    dto.fecha = fila.fecha;
    dto.enEspera = fila.en_espera;
    dto.enEjecucion = fila.en_ejecucion;
    dto.pendientes = fila.pendientes;
    dto.finalizadas = fila.finalizadas;
    return dto;
  }
}
