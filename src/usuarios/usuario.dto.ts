import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { type Rol, TODOS_LOS_ROLES } from '../auth/sesion.js';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import { PaginaDto } from '../comun/paginacion.js';
import { recortar } from '../comun/transformaciones.js';

// Roles que operan un local: los únicos que pueden tener uno asignado.
export const ROLES_CON_LOCAL: Rol[] = ['encargado', 'coordinador'];

export class UsuarioDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @Transform(recortar)
  @IsEmail()
  @MaxLength(200)
  correo: string;

  @IsIn(TODOS_LOS_ROLES)
  rol: Rol;

  // Solo para encargado y coordinador; en los demás roles se ignora.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number | null;
}

export class ListarUsuariosDto extends PaginaDto {
  // El id de un local, o "sin" para las cuentas que no tienen ninguno.
  @IsOptional()
  @IsString()
  @Matches(/^(sin|\d{1,9})$/)
  local?: string;
}
