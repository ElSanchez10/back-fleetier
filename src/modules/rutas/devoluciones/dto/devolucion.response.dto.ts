import { ApiProperty } from '@nestjs/swagger';
import { COLORES, type Color } from '@/modules/catalogos/enums/color.enum';
import { RutaResponseDto } from '../../dto/ruta.response.dto';
import type { CoolerLeidoRow } from '../interfaces/cooler-leido-row.interface';

// El cooler que volvió (sin su estado, que ahora es disponible).
export class CoolerDevueltoDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: '7' })
  nombre: string;

  @ApiProperty({ example: '37681389' })
  codigo: string;

  @ApiProperty({ enum: COLORES })
  color: Color;

  @ApiProperty({ example: 1, description: 'Su local; no cambia al devolverlo' })
  localId: number;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  static fromRow(this: void, fila: CoolerLeidoRow): CoolerDevueltoDto {
    const dto = new CoolerDevueltoDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.codigo = fila.codigo;
    dto.color = fila.color;
    dto.localId = fila.local_id;
    dto.local = fila.local;
    return dto;
  }
}

export class DevolucionResponseDto {
  @ApiProperty({ type: CoolerDevueltoDto })
  cooler: CoolerDevueltoDto;

  @ApiProperty({
    type: RutaResponseDto,
    nullable: true,
    description: 'La ruta en que quedó devuelto; null si no estaba en ninguna',
  })
  ruta: RutaResponseDto | null;

  @ApiProperty({
    description:
      'No estaba en ninguna ruta y ya estaba disponible: no cambió nada',
  })
  yaDisponible: boolean;

  @ApiProperty({
    description: 'Es de otro local que el de la cuenta (el front avisa)',
  })
  otroLocal: boolean;
}
