import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginaQueryDto } from '@/common/dto/pagina.query.dto';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { ESTADOS_COOLER, EstadoCooler } from '../enums/estado-cooler.enum';

// Filtros del listado y de las etiquetas.
export class FiltroCoolersDto extends PaginaQueryDto {
  @IsOptional()
  @IsIn(ESTADOS_COOLER)
  estado?: EstadoCooler;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}
