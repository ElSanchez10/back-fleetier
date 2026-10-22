import { EsFecha } from '@/common/utils/validaciones.util';

// El calendario pide los eventos que tocan un rango de días.
export class RangoDto {
  @EsFecha()
  desde: string;

  @EsFecha()
  hasta: string;
}
