import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { recortar } from '@/common/utils/transformaciones.util';

export class IngresarDto {
  @Transform(recortar)
  @IsEmail()
  @MaxLength(200)
  correo: string;

  @IsString()
  @MaxLength(200)
  clave: string;

  // "Mantener la sesión iniciada"
  @IsOptional()
  @IsBoolean()
  recordar?: boolean;
}
