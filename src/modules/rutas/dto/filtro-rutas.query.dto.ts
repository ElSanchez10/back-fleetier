import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginaQueryDto } from '@/common/dto/pagina.query.dto';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { EsFecha } from '@/common/utils/validaciones.util';
import { EstadoRuta, ESTADOS_RUTA } from '../enums/estado-ruta.enum';

export class FiltroRutasDto extends PaginaQueryDto {
  // Días de Chile, ambos incluidos.
  @IsOptional()
  @EsFecha()
  fechaDesde?: string;

  @IsOptional()
  @EsFecha()
  fechaHasta?: string;

  @IsOptional()
  @IsIn(ESTADOS_RUTA)
  estado?: EstadoRuta;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}
