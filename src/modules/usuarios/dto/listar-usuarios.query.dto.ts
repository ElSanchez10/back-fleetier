import { IsOptional, IsString, Matches } from 'class-validator';
import { PaginaQueryDto } from '@/common/dto/pagina.query.dto';

export class ListarUsuariosDto extends PaginaQueryDto {
  // El id de un local, o "sin" para las cuentas que no tienen ninguno.
  @IsOptional()
  @IsString()
  @Matches(/^(sin|\d{1,9})$/)
  local?: string;
}
