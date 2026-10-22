import { IsInt, Max, Min } from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { EsFecha, HastaHoy } from '@/common/utils/validaciones.util';

export const MAX_CANTIDAD = 100_000;

// Lo común de los tres registros: de qué local y de qué día.
export class RegistroDto {
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId: number;

  @EsFecha()
  @HastaHoy()
  fecha: string;
}
