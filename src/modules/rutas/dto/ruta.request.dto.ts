import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';

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
