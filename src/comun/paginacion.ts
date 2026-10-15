import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from './transformaciones.js';

export const SENTIDOS = ['asc', 'desc'] as const;
export type Sentido = (typeof SENTIDOS)[number];

// Parámetros comunes de todo listado: se pide por tramos y se busca en el back.
//   limite   cuántas filas trae el tramo
//   desde    cuántas filas saltarse (las que el front ya tiene)
//   buscar   texto a buscar en el nombre
//   orden    columna por la que ordenar, de las que admite el listado (ver ordenarPor en sql.ts)
//   sentido  'asc' o 'desc'
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

  @IsOptional()
  @IsString()
  @MaxLength(30)
  orden?: string;

  @IsOptional()
  @IsIn(SENTIDOS)
  sentido?: Sentido;
}

// Respuesta de todo listado. `total` cuenta todas las filas que cumplen el
// filtro, no solo las del tramo: así el front sabe si quedan más por pedir.
export interface Pagina<T> {
  items: T[];
  total: number;
}
