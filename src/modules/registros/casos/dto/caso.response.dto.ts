import { ApiProperty } from '@nestjs/swagger';
import { RegistroResponseDto } from '../../dto/registro.response.dto';
import type { CasoRow } from '../interfaces/caso-row.interface';

export class CasoResponseDto extends RegistroResponseDto {
  @ApiProperty({ example: 3 })
  conductorId: number;

  @ApiProperty({ example: 'Juan Pérez' })
  conductor: string;

  @ApiProperty({ example: 'Llegó dos horas tarde' })
  descripcion: string;

  static fromRow(this: void, fila: CasoRow): CasoResponseDto {
    const dto = CasoResponseDto.conBase(new CasoResponseDto(), fila);
    dto.conductorId = fila.conductor_id;
    dto.conductor = fila.conductor;
    dto.descripcion = fila.descripcion;
    return dto;
  }
}
