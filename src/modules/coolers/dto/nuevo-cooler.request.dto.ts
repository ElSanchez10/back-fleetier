import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { TipoCoolerDto } from '@/modules/catalogos/dto/tipo-cooler.request.dto';
import { DatosCoolerDto } from './datos-cooler.request.dto';

// Al registrar, como en la versión Laravel, se puede elegir un tipo existente
// o crear uno nuevo junto con el cooler: va `tipoCoolerId` o `tipoNuevo`.
export class NuevoCoolerDto extends DatosCoolerDto {
  @ValidateIf((o: NuevoCoolerDto) => o.tipoNuevo === undefined)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoCoolerId?: number;

  // Si viene, siempre se valida (aunque venga también `tipoCoolerId`).
  @ValidateIf(
    (o: NuevoCoolerDto) =>
      o.tipoNuevo !== undefined || o.tipoCoolerId === undefined,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => TipoCoolerDto)
  tipoNuevo?: TipoCoolerDto;
}
