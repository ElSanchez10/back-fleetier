import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '@/common/utils/transformaciones.util';

export class DevolucionDto {
  // Lo que leyó la pistola (o se escribió a mano).
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo: string;
}
