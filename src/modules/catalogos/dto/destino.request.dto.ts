import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from '@/common/utils/transformaciones.util';

export class DestinoDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  // En pesos, sin decimales.
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  precioBase: number;
}
