import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginaQueryDto } from '@/common/dto/pagina.query.dto';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';

export class FiltroConductoresDto extends PaginaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoConductorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId?: number;

  // true: solo los que no tienen una ruta abierta (para asignarles una).
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  libres?: boolean;
}
