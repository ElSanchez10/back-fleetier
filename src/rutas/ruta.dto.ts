import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
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
import { EsFecha } from '../comun/validaciones.js';

export const ESTADOS_RUTA = [
  'en_espera',
  'en_ejecucion',
  'pendiente',
  'finalizada',
] as const;
export type EstadoRuta = (typeof ESTADOS_RUTA)[number];

// Más coolers de los que caben en un camión: solo para acotar la petición.
const MAX_COOLERS = 300;

export class RutaDto {
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId: number;

  // Una ruta pre-cargada puede no tener conductor todavía.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  conductorId: number | null = null;

  // Hora de Chile, como la entrega un <input type="datetime-local">.
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  @IsISO8601({ strict: true })
  fecha: string;

  @IsInt()
  @Min(0)
  @Max(100_000)
  ordenes: number;

  // Todos los coolers que debe quedar llevando la ruta.
  @IsArray()
  @ArrayMaxSize(MAX_COOLERS)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(ID_MAXIMO, { each: true })
  coolers: number[];
}

export class NuevaRutaDto extends RutaDto {
  // false: queda pre-cargada (en espera); true: parte de inmediato.
  @IsBoolean()
  iniciar: boolean;
}

export class FiltroRutasDto extends PaginaDto {
  // Días de Chile, ambos incluidos.
  @IsOptional()
  @EsFecha()
  fechaDesde?: string;

  @IsOptional()
  @EsFecha()
  fechaHasta?: string;

  @IsOptional()
  @IsIn(ESTADOS_RUTA)
  estado?: EstadoRuta;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}

export class ProblemaDto {
  @IsInt()
  @Min(1)
  @Max(100_000)
  cantidad: number;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descripcion: string;
}

export class DevolucionDto {
  // Lo que leyó la pistola (o se escribió a mano).
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo: string;
}
