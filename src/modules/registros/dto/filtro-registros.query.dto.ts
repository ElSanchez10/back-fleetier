import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginaQueryDto } from '@/common/dto/pagina.query.dto';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { EsFecha } from '@/common/utils/validaciones.util';

export class FiltroRegistrosDto extends PaginaQueryDto {
  // Días ambos incluidos.
  @IsOptional()
  @EsFecha()
  fechaDesde?: string;

  @IsOptional()
  @EsFecha()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}
