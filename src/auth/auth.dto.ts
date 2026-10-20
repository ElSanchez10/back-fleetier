import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
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

// Confirmación con la contraseña para cerrar las otras sesiones o eliminar la cuenta.
export class ConfirmarClaveDto {
  @IsString()
  @MaxLength(200)
  clave: string;
}
