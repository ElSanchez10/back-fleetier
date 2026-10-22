import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { recortar } from '@/common/utils/transformaciones.util';
import { RegistroDto } from '../../dto/registro.request.dto';

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
