import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { horaLocal } from '../../repositories/rutas.sql';
import type { ProblemaDto } from '../dto/problema.request.dto';
import type { ProblemaRow } from '../interfaces/problema-row.interface';

// Acceso a los problemas de las rutas, para ProblemasService y el detalle de
// una ruta. Aquí no se decide nada: solo se lee y se escribe.

const COLUMNAS = `id, cantidad, descripcion, ${horaLocal('creado_en')} as creado_en`;

@Injectable()
export class ProblemasRepository {
  constructor(private readonly bd: DatabaseService) {}

  deRuta(rutaId: number): Promise<ProblemaRow[]> {
    return this.bd.consultar<ProblemaRow>(
      `select ${COLUMNAS} from problema_ruta where ruta_id = $1 order by id`,
      [rutaId],
    );
  }

  async insertar(rutaId: number, dto: ProblemaDto): Promise<ProblemaRow> {
    const [problema] = await this.bd.consultar<ProblemaRow>(
      `insert into problema_ruta (ruta_id, cantidad, descripcion) values ($1, $2, $3)
       returning ${COLUMNAS}`,
      [rutaId, dto.cantidad, dto.descripcion],
    );
    return problema;
  }

  // undefined si no existe en esa ruta.
  async actualizar(
    rutaId: number,
    problemaId: number,
    dto: ProblemaDto,
  ): Promise<ProblemaRow | undefined> {
    const [problema] = await this.bd.consultar<ProblemaRow>(
      `update problema_ruta set cantidad = $3, descripcion = $4
       where id = $1 and ruta_id = $2
       returning ${COLUMNAS}`,
      [problemaId, rutaId, dto.cantidad, dto.descripcion],
    );
    return problema;
  }

  async eliminar(rutaId: number, problemaId: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      'delete from problema_ruta where id = $1 and ruta_id = $2 returning id',
      [problemaId, rutaId],
    );
    return borrados.length > 0;
  }
}
