import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TODOS_LOS_ROLES } from '@/common/decorators/roles.decorator';
import { type Rol } from '@/common/interfaces/usuario-sesion.interface';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { recortar } from '@/common/utils/transformaciones.util';
import { ROLES_CON_LOCAL } from '../utils/usuarios.util';

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

  // Obligatorio para encargado y coordinador, como en Laravel; en los demás
  // roles se ignora.
  @ValidateIf((dto: UsuarioDto) => ROLES_CON_LOCAL.includes(dto.rol))
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number | null;
}
