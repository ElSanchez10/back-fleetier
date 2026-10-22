import { ApiProperty } from '@nestjs/swagger';
import { RegistroResponseDto } from '../../dto/registro.response.dto';
import type { PedidoEspecialRow } from '../interfaces/pedido-especial-row.interface';

export class PedidoEspecialResponseDto extends RegistroResponseDto {
  @ApiProperty({ example: 2 })
  destinoId: number;

  @ApiProperty({ example: 'Villarrica' })
  destino: string;

  @ApiProperty({ example: 4, description: 'Órdenes de pedido' })
  cantidad: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 15000,
    description: 'null para encargado y coordinador, que no ven precios',
  })
  precio: number | null;

  @ApiProperty()
  extraordinario: boolean;

  @ApiProperty({ example: '' })
  descripcion: string;

  static fromRow(
    this: void,
    fila: PedidoEspecialRow,
  ): PedidoEspecialResponseDto {
    const dto = PedidoEspecialResponseDto.conBase(
      new PedidoEspecialResponseDto(),
      fila,
    );
    dto.destinoId = fila.destino_id;
    dto.destino = fila.destino;
    dto.cantidad = fila.cantidad;
    dto.precio = fila.precio;
    dto.extraordinario = fila.extraordinario;
    dto.descripcion = fila.descripcion;
    return dto;
  }
}
