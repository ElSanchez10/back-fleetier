import { Transform } from 'class-transformer';
import { IsIn, Matches } from 'class-validator';
import { recortar } from '@/common/utils/transformaciones.util';
import { ESTADOS_COOLER, EstadoCooler } from '../enums/estado-cooler.enum';
import { CoolerDto } from './cooler.request.dto';

// Al editar se pueden corregir además el código de barras y el estado.
export class EditarCoolerDto extends CoolerDto {
  // Solo lo que un lector de códigos de barras lee sin problemas.
  @Transform(recortar)
  @Matches(/^[A-Za-z0-9-]{1,40}$/)
  codigo: string;

  @IsIn(ESTADOS_COOLER)
  estado: EstadoCooler;
}
