import { IsOptional } from 'class-validator';
import { PaginaQueryDto } from '@/common/dto/pagina.query.dto';
import { EsFecha } from '@/common/utils/validaciones.util';

// Filtros del historial de rutas de un cooler: días de Chile, ambos incluidos.
export class FiltroRutasCoolerDto extends PaginaQueryDto {
  @IsOptional()
  @EsFecha()
  fechaDesde?: string;

  @IsOptional()
  @EsFecha()
  fechaHasta?: string;
}
