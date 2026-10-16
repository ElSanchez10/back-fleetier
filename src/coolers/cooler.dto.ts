import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TipoCoolerDto } from '../catalogos/catalogo.dto.js';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import { PaginaDto } from '../comun/paginacion.js';
import { recortar } from '../comun/transformaciones.js';
import { EsFecha } from '../comun/validaciones.js';

export const ESTADOS_COOLER = [
  'disponible',
  'en_espera',
  'en_ruta',
  'pendiente',
  'no_disponible',
  'danado',
] as const;
export type EstadoCooler = (typeof ESTADOS_COOLER)[number];

class DatosCoolerDto {
  // El número con que se identifica el cooler; va escrito en él.
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nombre: string;

  @EsFecha()
  fechaAdquisicion: string;

  @IsBoolean()
  tieneTapa: boolean;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId: number;
}

export class CoolerDto extends DatosCoolerDto {
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoCoolerId: number;
}

// Al registrar, como en la versión Laravel, se puede elegir un tipo existente
// o crear uno nuevo junto con el cooler: va `tipoCoolerId` o `tipoNuevo`.
export class NuevoCoolerDto extends DatosCoolerDto {
  @ValidateIf((o: NuevoCoolerDto) => o.tipoNuevo === undefined)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoCoolerId?: number;

  // Si viene, siempre se valida (aunque venga también `tipoCoolerId`).
  @ValidateIf(
    (o: NuevoCoolerDto) =>
      o.tipoNuevo !== undefined || o.tipoCoolerId === undefined,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => TipoCoolerDto)
  tipoNuevo?: TipoCoolerDto;
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

// Filtros del historial de rutas de un cooler: días de Chile, ambos incluidos.
export class FiltroRutasCoolerDto extends PaginaDto {
  @IsOptional()
  @EsFecha()
  fechaDesde?: string;

  @IsOptional()
  @EsFecha()
  fechaHasta?: string;
}
