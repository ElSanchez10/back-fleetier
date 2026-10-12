import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import { PaginaDto } from '../comun/paginacion.js';
import { recortar } from '../comun/transformaciones.js';

export const ESTADOS_COOLER = [
  'disponible',
  'en_espera',
  'en_ruta',
  'pendiente',
  'no_disponible',
  'danado',
] as const;
export type EstadoCooler = (typeof ESTADOS_COOLER)[number];

export class CoolerDto {
  // El número con que se identifica el cooler; va escrito en él.
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nombre: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaAdquisicion: string;

  @IsBoolean()
  tieneTapa: boolean;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoCoolerId: number;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId: number;
}

// Al editar se pueden corregir además el código de barras y el estado.
export class EditarCoolerDto extends CoolerDto {
  // Solo lo que un lector de códigos de barras lee sin problemas.
  @Transform(recortar)
  @Matches(/^[A-Za-z0-9-]{1,40}$/)
  codigo: string;

  @IsIn(ESTADOS_COOLER)
  estado: EstadoCooler;
}

// Filtros del listado y de las etiquetas.
export class FiltroCoolersDto extends PaginaDto {
  @IsOptional()
  @IsIn(ESTADOS_COOLER)
  estado?: EstadoCooler;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}
