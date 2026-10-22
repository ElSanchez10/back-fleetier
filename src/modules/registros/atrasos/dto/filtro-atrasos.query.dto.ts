import { IsIn, IsOptional } from 'class-validator';
import { FiltroRegistrosDto } from '../../dto/filtro-registros.query.dto';
import { TIPOS_ATRASO, TipoAtraso } from '../enums/tipo-atraso.enum';

export class FiltroAtrasosDto extends FiltroRegistrosDto {
  @IsOptional()
  @IsIn(TIPOS_ATRASO)
  tipo?: TipoAtraso;
}
