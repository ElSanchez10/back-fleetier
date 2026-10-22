import { ApiProperty } from '@nestjs/swagger';
import { TODOS_LOS_ROLES } from '@/common/decorators/roles.decorator';
import type { Rol } from '@/common/interfaces/usuario-sesion.interface';
import type { UsuarioRow } from '../interfaces/usuario-row.interface';

export class UsuarioResponseDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Ana Pérez' })
  nombre: string;

  @ApiProperty({ example: 'ana@dsl.cl' })
  correo: string;

  @ApiProperty({ enum: TODOS_LOS_ROLES })
  rol: Rol;

  @ApiProperty({ description: 'true mientras tenga la contraseña inicial' })
  debeCambiarClave: boolean;

  @ApiProperty({ type: Number, nullable: true, example: 1 })
  localId: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'Lider Temuco' })
  local: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Temuco' })
  ciudad: string | null;

  static fromRow(this: void, fila: UsuarioRow): UsuarioResponseDto {
    const dto = new UsuarioResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.correo = fila.email;
    dto.rol = fila.rol;
    dto.debeCambiarClave = fila.debe_cambiar_clave;
    dto.localId = fila.local_id;
    dto.local = fila.local;
    dto.ciudad = fila.ciudad;
    return dto;
  }
}
