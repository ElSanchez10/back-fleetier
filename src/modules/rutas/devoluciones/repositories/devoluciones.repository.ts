import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import type { CoolerLeidoRow } from '../interfaces/cooler-leido-row.interface';

// Lo que lee DevolucionesService. El cambio de estado lo hace
// OperacionesService.devolver.
@Injectable()
export class DevolucionesRepository {
  constructor(private readonly bd: DatabaseService) {}

  // El cooler que leyó la pistola, de cualquier local.
  async coolerPorCodigo(codigo: string): Promise<CoolerLeidoRow | undefined> {
    const [cooler] = await this.bd.consultar<CoolerLeidoRow>(
      `select k.id, k.nombre, k.codigo, t.color, k.estado, k.local_id,
              l.nombre as local
       from cooler k
       join tipo_cooler t on t.id = k.tipo_cooler_id
       join local l on l.id = k.local_id
       where k.codigo = $1`,
      [codigo],
    );
    return cooler;
  }
}
