import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { recortar } from '../comun/transformaciones.js';

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

export class CambiarClaveDto {
  @IsString()
  @MaxLength(200)
  claveActual: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  claveNueva: string;
}
