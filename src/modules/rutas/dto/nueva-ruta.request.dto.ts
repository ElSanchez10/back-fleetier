import { IsBoolean } from 'class-validator';
import { RutaDto } from './ruta.request.dto';

export class NuevaRutaDto extends RutaDto {
  // false: queda pre-cargada (en espera); true: parte de inmediato.
  @IsBoolean()
  iniciar: boolean;
}
