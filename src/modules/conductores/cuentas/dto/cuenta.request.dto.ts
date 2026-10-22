import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '@/common/utils/transformaciones.util';

export class CuentaDto {
  // Para qué es la cuenta: el nombre de la aplicación, por ejemplo.
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cuenta: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  usuario: string;

  // No se recorta: un espacio puede ser parte de la contraseña.
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  clave: string;
}
