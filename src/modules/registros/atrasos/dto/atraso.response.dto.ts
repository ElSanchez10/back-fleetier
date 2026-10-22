import { ApiProperty } from '@nestjs/swagger';
import { RegistroResponseDto } from '../../dto/registro.response.dto';
import { TIPOS_ATRASO, type TipoAtraso } from '../enums/tipo-atraso.enum';
import type { AtrasoRow } from '../interfaces/atraso-row.interface';

export class AtrasoResponseDto extends RegistroResponseDto {
  @ApiProperty({ enum: TIPOS_ATRASO })
  tipo: TipoAtraso;

  @ApiProperty({ example: 3, description: 'Órdenes atrasadas' })
  cantidad: number;

  static fromRow(this: void, fila: AtrasoRow): AtrasoResponseDto {
    const dto = AtrasoResponseDto.conBase(new AtrasoResponseDto(), fila);
    dto.tipo = fila.tipo;
    dto.cantidad = fila.cantidad;
    return dto;
  }
}
