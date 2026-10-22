import { IsInt, Max, Min } from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { DatosCoolerDto } from './datos-cooler.request.dto';

export class CoolerDto extends DatosCoolerDto {
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoCoolerId: number;
}
