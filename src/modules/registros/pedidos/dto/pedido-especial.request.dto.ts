import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { recortar, vacioANull } from '@/common/utils/transformaciones.util';
import { MAX_CANTIDAD, RegistroDto } from '../../dto/registro.request.dto';

const MAX_PRECIO = 100_000_000;

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
