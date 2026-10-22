import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { recortar } from '@/common/utils/transformaciones.util';

// Al editar, la contraseña solo se envía si se quiere cambiar.
export class EditarCuentaDto {
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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  clave?: string;
}
