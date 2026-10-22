import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { type Color } from '../enums/color.enum';
import { recortar } from '@/common/utils/transformaciones.util';
import { COLORES } from '../enums/color.enum';

export class TipoEventoDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @IsIn(COLORES)
  color: Color;
}
