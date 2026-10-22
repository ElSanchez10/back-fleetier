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

export class LocalDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  direccion: string;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId: number;
}
