import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import { PaginaDto } from '../comun/paginacion.js';
import { recortar, vacioANull } from '../comun/transformaciones.js';
import { EsFecha, HastaHoy } from '../comun/validaciones.js';

export const TIPOS_ATRASO = ['despacho', 'picking'] as const;
export type TipoAtraso = (typeof TIPOS_ATRASO)[number];

const MAX_CANTIDAD = 100_000;
const MAX_PRECIO = 100_000_000;

const aBooleano = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

// Lo común de los tres registros: de qué local y de qué día.
class RegistroDto {
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId: number;

  @EsFecha()
  @HastaHoy()
  fecha: string;
}

export class PedidoEspecialDto extends RegistroDto {
  // Un destino de la lista, o uno nuevo escrito en `otroDestino`.
  @ValidateIf((dto: PedidoEspecialDto) => !dto.otroDestino)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  destinoId: number | null = null;

  // Destino que no está en la lista: se agrega a la lista con `precio` como
  // precio base. Solo admin y asistente.
  @Transform(vacioANull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  otroDestino: string | null = null;

  @IsInt()
  @Min(1)
  @Max(MAX_CANTIDAD)
  cantidad: number;

  // Solo lo fijan admin y asistente; sin precio se usa el base del destino.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRECIO)
  precio: number | null = null;

  // Solo lo marcan admin y asistente.
  @IsOptional()
  @IsBoolean()
  extraordinario: boolean | null = null;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion: string = '';
}

export class AtrasoDto extends RegistroDto {
  @IsIn(TIPOS_ATRASO)
  tipo: TipoAtraso;

  @IsInt()
  @Min(1)
  @Max(MAX_CANTIDAD)
  cantidad: number;
}

export class CasoDto extends RegistroDto {
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  conductorId: number;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descripcion: string;
}

export class FiltroRegistrosDto extends PaginaDto {
  // Días ambos incluidos.
  @IsOptional()
  @EsFecha()
  fechaDesde?: string;

  @IsOptional()
  @EsFecha()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}

export class FiltroPedidosDto extends FiltroRegistrosDto {
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  extraordinario?: boolean;
}

export class FiltroAtrasosDto extends FiltroRegistrosDto {
  @IsOptional()
  @IsIn(TIPOS_ATRASO)
  tipo?: TipoAtraso;
}
