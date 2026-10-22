import { IsString, MaxLength } from 'class-validator';

// Confirmación con la contraseña para cerrar las otras sesiones o eliminar la cuenta.
export class ConfirmarClaveDto {
  @IsString()
  @MaxLength(200)
  clave: string;
}
