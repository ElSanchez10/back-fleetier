import { IsIn, IsInt, Max, Min } from 'class-validator';
import { MAX_CANTIDAD, RegistroDto } from '../../dto/registro.request.dto';
import { TIPOS_ATRASO, TipoAtraso } from '../enums/tipo-atraso.enum';

export class AtrasoDto extends RegistroDto {
  @IsIn(TIPOS_ATRASO)
  tipo: TipoAtraso;

  @IsInt()
  @Min(1)
  @Max(MAX_CANTIDAD)
  cantidad: number;
}
