import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { FiltroRegistrosDto } from '../../dto/filtro-registros.query.dto';

const aBooleano = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class FiltroPedidosDto extends FiltroRegistrosDto {
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  extraordinario?: boolean;
}
