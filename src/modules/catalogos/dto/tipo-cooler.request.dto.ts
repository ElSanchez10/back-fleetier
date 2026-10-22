import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { type Color } from '../enums/color.enum';
import { recortar } from '@/common/utils/transformaciones.util';
import { CAPACIDADES, Capacidad } from '../enums/capacidad.enum';
import { COLORES } from '../enums/color.enum';

export class TipoCoolerDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  marca: string;

  @IsIn(CAPACIDADES)
  capacidad: Capacidad;

  @IsIn(COLORES)
  color: Color;
}
