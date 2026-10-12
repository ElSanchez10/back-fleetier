import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import { recortar } from '../comun/transformaciones.js';

export const COLORES = [
  'verde',
  'rojo',
  'turquesa',
  'azul',
  'morado',
  'gris',
  'negro',
] as const;
export type Color = (typeof COLORES)[number];

export const CAPACIDADES = ['pequeno', 'mediano', 'grande'] as const;
export type Capacidad = (typeof CAPACIDADES)[number];

export class CiudadDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;
}

export class LocalDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  direccion: string;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId: number;
}

export class DestinoDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  // En pesos, sin decimales.
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  precioBase: number;
}

export class TipoCoolerDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  marca: string;

  @IsIn(CAPACIDADES)
  capacidad: Capacidad;

  @IsIn(COLORES)
  color: Color;
}

export class TipoConductorDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;
}

export class TipoEventoDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @IsIn(COLORES)
  color: Color;
}
