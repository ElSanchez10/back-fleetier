import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { recortar } from '@/common/utils/transformaciones.util';
import { EsFecha } from '@/common/utils/validaciones.util';
import { TipoEventoDto } from '@/modules/catalogos/dto/tipo-evento.request.dto';

// Como en la versión Laravel, en vez de un tipo existente (`tipoEventoId`)
// puede venir uno nuevo ("Otro": `tipoNuevo`), que se crea junto con el evento.
export class EventoDto {
  @ValidateIf((o: EventoDto) => o.tipoNuevo === undefined)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoEventoId?: number;

  // Si viene, siempre se valida (aunque venga también `tipoEventoId`).
  @ValidateIf(
    (o: EventoDto) => o.tipoNuevo !== undefined || o.tipoEventoId === undefined,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => TipoEventoDto)
  tipoNuevo?: TipoEventoDto;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  titulo: string;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion: string = '';

  // Ambos días incluidos; que `hasta` no sea anterior lo valida la base.
  @EsFecha()
  desde: string;

  @EsFecha()
  hasta: string;
}
