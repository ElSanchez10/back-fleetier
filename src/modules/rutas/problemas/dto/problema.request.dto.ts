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
