import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from './transformaciones.js';

// Parámetros comunes de todo listado: se pide por tramos y se busca en el back.
//   limite  cuántas filas trae el tramo
//   desde   cuántas filas saltarse (las que el front ya tiene)
//   buscar  texto a buscar en el nombre
export class PaginaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 30;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  desde: number = 0;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;
}

// Respuesta de todo listado. `total` cuenta todas las filas que cumplen el
// filtro, no solo las del tramo: así el front sabe si quedan más por pedir.
export interface Pagina<T> {
  items: T[];
  total: number;
}
