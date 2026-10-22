import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';

export class FiltroActividadLocalesDto {
  // 'AAAA-MM'
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  mes: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}
