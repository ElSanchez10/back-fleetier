import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DatabaseService,
  type Consultar,
} from '@/common/database/database.service';
import type { EstadoCooler } from '@/modules/coolers/enums/estado-cooler.enum';
import type { NuevaRutaDto } from './dto/nueva-ruta.request.dto';
import type { RutaDto } from './dto/ruta.request.dto';
import type { EstadoRuta } from './enums/estado-ruta.enum';
import { RutasRepository } from './repositories/rutas.repository';

import type { RutaBloqueadaRow } from './interfaces/ruta-row.interface';
// Los cambios de estado de las rutas y de sus coolers: aquí se decide, y
// RutasRepository lee y escribe. Cada operación corre en una transacción y
// el repositorio bloquea (`for update`) las filas que toca, así dos personas
// no pueden mover el mismo cooler o la misma ruta a la vez. La base asegura lo
// que no puede quedar mal aunque falle esto: un conductor en una sola ruta
// abierta y un cooler en una sola ruta sin devolver (índices únicos), y que una
// ruta que partió tenga conductor (check).
//
// Lo que manda es que los coolers vuelvan: un cooler que vuelve (por la
// pistola, porque se lee para otra ruta o porque un admin lo deja disponible,
// dañado o no disponible) queda devuelto en su ruta, y la ruta a la que ya le
// volvieron todos queda finalizada, aunque nadie la haya cerrado.

const ABIERTAS: EstadoRuta[] = ['en_espera', 'en_ejecucion'];
// Un cooler así no sale ni se devuelve: lo cambia un admin, desde su ficha.
const FUERA_DE_USO: EstadoCooler[] = ['danado', 'no_disponible'];

function conflicto(codigo: string): ConflictException {
  return new ConflictException({ codigo });
}

function noExiste(codigo: string): NotFoundException {
  return new NotFoundException({ codigo });
}

@Injectable()
export class OperacionesService {
  constructor(
    private readonly bd: DatabaseService,
    private readonly datos: RutasRepository,
  ) {}

  // Registra la ruta con sus coolers. Sin iniciar queda pre-cargada (en
  // espera): necesita al menos el conductor o un cooler. Devuelve su id.
  crear(dto: NuevaRutaDto): Promise<number> {
    return this.bd.transaccion(async (sql) => {
      if (dto.conductorId === null && dto.coolers.length === 0) {
        throw conflicto('ruta_vacia');
      }
      const id = await this.datos.insertarRuta(sql, dto);
      for (const coolerId of new Set(dto.coolers)) {
        await this.asignarCooler(sql, id, coolerId);
      }
      if (dto.iniciar) {
        await this.iniciarEn(sql, id);
      }
      return id;
    });
  }

  // Corrige los datos y deja los coolers como dice la lista: quita los que no
  // están y sube los nuevos. El local solo cambia mientras no ha partido.
  editar(id: number, dto: RutaDto): Promise<void> {
    return this.bd.transaccion(async (sql) => {
      const ruta = await this.bloquearRuta(sql, id);
      if (dto.localId !== ruta.local_id && ruta.estado !== 'en_espera') {
        throw conflicto('ruta_local_fijo');
      }
      const pedidos = new Set(dto.coolers);
      const actuales = await this.datos.bloquearCoolersDeRuta(sql, id);
      for (const { cooler_id } of actuales) {
        if (!pedidos.has(cooler_id)) {
          await this.quitarCooler(sql, id, cooler_id);
        }
      }
      await this.datos.actualizarRuta(sql, id, dto);
      const yaEstan = new Set(actuales.map((a) => a.cooler_id));
      for (const coolerId of pedidos) {
        if (!yaEstan.has(coolerId)) {
          await this.asignarCooler(sql, id, coolerId);
        }
      }
      if (dto.conductorId === null && pedidos.size === 0) {
        throw conflicto('ruta_vacia');
      }
    });
  }

  // La ruta parte: necesita conductor, y sus coolers pasan a estar en ruta.
  iniciar(id: number): Promise<void> {
    return this.bd.transaccion((sql) => this.iniciarEn(sql, id));
  }

  // Cierra una ruta en ejecución: finalizada si volvieron todos sus coolers;
  // si no, pendiente, y los que faltan quedan pendientes hasta que vuelvan.
  cerrar(id: number): Promise<EstadoRuta> {
    return this.bd.transaccion(async (sql) => {
      const ruta = await this.bloquearRuta(sql, id);
      if (ruta.estado !== 'en_ejecucion') {
        throw conflicto('ruta_no_en_ejecucion');
      }
      const faltan = await this.datos.cambiarEstadoSinDevolver(
        sql,
        id,
        'pendiente',
      );
      const estado: EstadoRuta = faltan > 0 ? 'pendiente' : 'finalizada';
      await this.datos.cambiarEstadoRuta(sql, id, estado);
      return estado;
    });
  }

  // Un cooler volvió al local (lo leyó la pistola): queda disponible, y
  // devuelto en la ruta que lo tenía. Uno que no estaba en ninguna ruta
  // también queda disponible. No se devuelve uno fuera de uso, ni uno de una
  // ruta que todavía no parte. Devuelve el id de la ruta, o null.
  devolver(coolerId: number): Promise<number | null> {
    return this.bd.transaccion(async (sql) => {
      const estado = await this.datos.bloquearCooler(sql, coolerId);
      if (!estado) {
        throw noExiste('cooler_no_existe');
      }
      if (FUERA_DE_USO.includes(estado)) {
        throw conflicto('cooler_no_disponible');
      }
      const ruta = await this.datos.rutaDelCooler(sql, coolerId);
      if (ruta?.estado === 'en_espera') {
        throw conflicto('cooler_en_ruta_en_espera');
      }
      return this.liberar(sql, coolerId, 'disponible');
    });
  }

  // Saca al cooler de la ruta que lo tiene sin devolver y lo deja en `estado`.
  // Si esa ruta no ha partido, simplemente se quita de ella. Si ya partió,
  // queda devuelto; y si era el último que le faltaba, la ruta queda
  // finalizada. Corre dentro de la transacción de quien la llama (también la
  // usa la ficha del cooler). Devuelve el id de la ruta, o null.
  async liberar(
    sql: Consultar,
    coolerId: number,
    estado: EstadoCooler,
  ): Promise<number | null> {
    const ruta = await this.datos.rutaDelCooler(sql, coolerId);
    if (ruta?.estado === 'en_espera') {
      await this.datos.sacarCooler(sql, ruta.id, coolerId);
    } else if (ruta) {
      await this.datos.marcarDevuelto(sql, ruta.id, coolerId);
      const coolers = await this.datos.bloquearCoolersDeRuta(sql, ruta.id);
      if (coolers.every((c) => c.devuelto)) {
        await this.datos.cambiarEstadoRuta(sql, ruta.id, 'finalizada');
      }
    }
    await this.datos.cambiarEstadoCooler(sql, coolerId, estado);
    return ruta?.id ?? null;
  }

  // Sube un cooler a una ruta abierta. Lo leído con la pistola manda: si el
  // cooler seguía en otra ruta, primero sale de ella (liberar: si esa ya
  // partió, cuenta como devuelto). Puede ser de otro local (el front avisa y
  // el cooler sigue siendo de su local); no se sube uno fuera de uso.
  private async asignarCooler(
    sql: Consultar,
    rutaId: number,
    coolerId: number,
  ) {
    const ruta = await this.bloquearRuta(sql, rutaId);
    if (!ABIERTAS.includes(ruta.estado)) {
      throw conflicto('ruta_cerrada');
    }
    const estado = await this.datos.bloquearCooler(sql, coolerId);
    if (!estado) {
      throw noExiste('cooler_no_existe');
    }
    if (FUERA_DE_USO.includes(estado)) {
      throw conflicto('cooler_no_disponible');
    }
    const coolers = await this.datos.bloquearCoolersDeRuta(sql, rutaId);
    if (coolers.some((c) => c.cooler_id === coolerId)) {
      throw conflicto('cooler_ya_en_ruta');
    }
    await this.liberar(sql, coolerId, 'disponible');
    await this.datos.agregarCooler(sql, rutaId, coolerId);
    await this.datos.cambiarEstadoCooler(
      sql,
      coolerId,
      ruta.estado === 'en_espera' ? 'en_espera' : 'en_ruta',
    );
  }

  // Baja un cooler de una ruta abierta: vuelve a quedar disponible. Uno que
  // ya se devolvió no se puede quitar: es parte de lo que pasó en la ruta.
  private async quitarCooler(sql: Consultar, rutaId: number, coolerId: number) {
    const ruta = await this.bloquearRuta(sql, rutaId);
    if (!ABIERTAS.includes(ruta.estado)) {
      throw conflicto('ruta_cerrada');
    }
    const coolers = await this.datos.bloquearCoolersDeRuta(sql, rutaId);
    const fila = coolers.find((c) => c.cooler_id === coolerId);
    if (!fila) {
      throw conflicto('cooler_no_esta_en_ruta');
    }
    if (fila.devuelto) {
      throw conflicto('cooler_ya_devuelto');
    }
    await this.datos.sacarCooler(sql, rutaId, coolerId);
    await this.datos.cambiarEstadoCooler(sql, coolerId, 'disponible');
  }

  private async iniciarEn(sql: Consultar, id: number) {
    const ruta = await this.bloquearRuta(sql, id);
    if (ruta.estado !== 'en_espera') {
      throw conflicto('ruta_ya_iniciada');
    }
    if (ruta.conductor_id === null) {
      throw conflicto('ruta_sin_conductor');
    }
    await this.datos.cambiarEstadoRuta(sql, id, 'en_ejecucion');
    await this.datos.cambiarEstadoSinDevolver(sql, id, 'en_ruta');
  }

  private async bloquearRuta(
    sql: Consultar,
    id: number,
  ): Promise<RutaBloqueadaRow> {
    const ruta = await this.datos.bloquearRuta(sql, id);
    if (!ruta) {
      throw noExiste('ruta_no_existe');
    }
    return ruta;
  }
}
