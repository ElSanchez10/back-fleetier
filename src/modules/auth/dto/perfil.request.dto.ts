import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '@/common/utils/transformaciones.util';

export class PerfilDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @Transform(recortar)
  @IsEmail()
  @MaxLength(200)
  correo: string;
}
