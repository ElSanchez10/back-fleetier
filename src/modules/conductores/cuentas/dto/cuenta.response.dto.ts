import { ApiProperty } from '@nestjs/swagger';
import type { CuentaRow } from '../interfaces/cuenta-row.interface';

// La contraseña no viaja en el listado: se pide aparte (ClaveCuentaResponseDto).
export class CuentaResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Uber' })
  cuenta: string;

  @ApiProperty({ example: 'juan.perez' })
  usuario: string;

  static fromRow(this: void, fila: CuentaRow): CuentaResponseDto {
    const dto = new CuentaResponseDto();
    dto.id = fila.id;
    dto.cuenta = fila.cuenta;
    dto.usuario = fila.usuario;
    return dto;
  }
}

export class ClaveCuentaResponseDto {
  @ApiProperty({ example: 'la-contraseña' })
  clave: string;
}
