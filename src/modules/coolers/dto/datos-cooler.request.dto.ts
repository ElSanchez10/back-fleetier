import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { recortar } from '@/common/utils/transformaciones.util';
import { EsFecha } from '@/common/utils/validaciones.util';

export class DatosCoolerDto {
  // El número con que se identifica el cooler; va escrito en él.
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nombre: string;

  @EsFecha()
  fechaAdquisicion: string;

  @IsBoolean()
  tieneTapa: boolean;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId: number;
}
