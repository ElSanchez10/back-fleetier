import type {
  DatabaseService,
  Consultar,
} from '@/common/database/database.service';
import type { EstadoCooler } from '@/modules/coolers/enums/estado-cooler.enum';
import type { NuevaRutaDto } from './dto/nueva-ruta.request.dto';
import type { RutaDto } from './dto/ruta.request.dto';
import type { EstadoRuta } from './enums/estado-ruta.enum';
import { OperacionesService } from './operaciones.service';
import type { RutaBloqueadaRow } from './interfaces/ruta-row.interface';
import type {
  DatosRuta,
  RutasRepository,
} from './repositories/rutas.repository';

// Los datos que recibe editar, como objeto simple.
type Edicion = { [K in keyof RutaDto]: RutaDto[K] };

// Las reglas de rutas y coolers con datos emulados: el repositorio guarda todo
// en memoria y la transacción se emula con una foto que se restaura si la
// operación falla. Lo que asegura la base (índices únicos, llaves) no se
// prueba aquí.

interface Ruta extends DatosRuta {
  id: number;
  estado: EstadoRuta;
}

// Lo que OperacionesService usa del repositorio: lo que corre en transacción.
type Operaciones = Pick<
  RutasRepository,
  | 'bloquearRuta'
  | 'insertarRuta'
  | 'actualizarRuta'
  | 'cambiarEstadoRuta'
  | 'bloquearCoolersDeRuta'
  | 'bloquearCooler'
  | 'cambiarEstadoCooler'
  | 'cambiarEstadoSinDevolver'
  | 'rutaDelCooler'
  | 'agregarCooler'
  | 'sacarCooler'
  | 'marcarDevuelto'
>;

class RepositorioEnMemoria implements Operaciones {
  rutas = new Map<number, Ruta>();
  coolers = new Map<number, EstadoCooler>();
  rutaCooler: { rutaId: number; coolerId: number; devuelto: boolean }[] = [];
  private siguienteRuta = 1;

  foto() {
    return structuredClone({
      rutas: this.rutas,
      coolers: this.coolers,
      rutaCooler: this.rutaCooler,
      siguienteRuta: this.siguienteRuta,
    });
  }

  restaurar(foto: ReturnType<RepositorioEnMemoria['foto']>) {
    Object.assign(this, foto);
  }

  bloquearRuta(_sql: Consultar, id: number) {
    const r = this.rutas.get(id);
    const fila: RutaBloqueadaRow | undefined = r && {
      id: r.id,
      local_id: r.localId,
      conductor_id: r.conductorId,
      estado: r.estado,
    };
    return Promise.resolve(fila);
  }

  insertarRuta(_sql: Consultar, datos: DatosRuta) {
    const id = this.siguienteRuta++;
    this.rutas.set(id, { ...datos, id, estado: 'en_espera' });
    return Promise.resolve(id);
  }

  actualizarRuta(_sql: Consultar, id: number, datos: DatosRuta) {
    Object.assign(this.rutas.get(id)!, datos);
    return Promise.resolve();
  }

  cambiarEstadoRuta(_sql: Consultar, id: number, estado: EstadoRuta) {
    this.rutas.get(id)!.estado = estado;
    return Promise.resolve();
  }

  bloquearCoolersDeRuta(_sql: Consultar, rutaId: number) {
    return Promise.resolve(
      this.rutaCooler
        .filter((rc) => rc.rutaId === rutaId)
        .map(({ coolerId, devuelto }) => ({ cooler_id: coolerId, devuelto })),
    );
  }

  bloquearCooler(_sql: Consultar, id: number) {
    return Promise.resolve(this.coolers.get(id));
  }

  cambiarEstadoCooler(_sql: Consultar, id: number, estado: EstadoCooler) {
    this.coolers.set(id, estado);
    return Promise.resolve();
  }

  cambiarEstadoSinDevolver(
    _sql: Consultar,
    rutaId: number,
    estado: EstadoCooler,
  ) {
    const faltan = this.rutaCooler.filter(
      (rc) => rc.rutaId === rutaId && !rc.devuelto,
    );
    for (const rc of faltan) {
      this.coolers.set(rc.coolerId, estado);
    }
    return Promise.resolve(faltan.length);
  }

  rutaDelCooler(_sql: Consultar, coolerId: number) {
    const rc = this.rutaCooler.find(
      (x) => x.coolerId === coolerId && !x.devuelto,
    );
    const ruta = rc && this.rutas.get(rc.rutaId)!;
    return Promise.resolve(ruta && { id: ruta.id, estado: ruta.estado });
  }

  agregarCooler(_sql: Consultar, rutaId: number, coolerId: number) {
    this.rutaCooler.push({ rutaId, coolerId, devuelto: false });
    return Promise.resolve();
  }

  sacarCooler(_sql: Consultar, rutaId: number, coolerId: number) {
    this.rutaCooler = this.rutaCooler.filter(
      (rc) => rc.rutaId !== rutaId || rc.coolerId !== coolerId,
    );
    return Promise.resolve();
  }

  marcarDevuelto(_sql: Consultar, rutaId: number, coolerId: number) {
    this.rutaCooler.find(
      (rc) => rc.rutaId === rutaId && rc.coolerId === coolerId,
    )!.devuelto = true;
    return Promise.resolve();
  }
}

describe('OperacionesService', () => {
  let datos: RepositorioEnMemoria;
  let ops: OperacionesService;
  const sql = (() => Promise.resolve([])) as unknown as Consultar;
  const LOCAL_A = 1;
  const LOCAL_B = 2;
  const CONDUCTOR = 10;
  const OTRO_CONDUCTOR = 11;

  // Un cooler con el estado dado, sin ruta.
  let siguienteCooler = 100;
  const cooler = (estado: EstadoCooler = 'disponible') => {
    const id = siguienteCooler++;
    datos.coolers.set(id, estado);
    return id;
  };
  const ruta = (dto: Partial<NuevaRutaDto>) =>
    ops.crear({
      localId: LOCAL_A,
      conductorId: CONDUCTOR,
      fecha: '2026-10-21T10:00',
      ordenes: 1,
      coolers: [],
      iniciar: false,
      ...dto,
    });
  const estadoRuta = (id: number) => datos.rutas.get(id)?.estado;
  const estadoCooler = (id: number) => datos.coolers.get(id);
  const codigoDe = async (promesa: Promise<unknown>) => {
    try {
      await promesa;
      return 'sin error';
    } catch (error) {
      return (error as { getResponse: () => { codigo: string } }).getResponse()
        .codigo;
    }
  };

  beforeEach(() => {
    datos = new RepositorioEnMemoria();
    // La transacción: si la operación falla, nada de lo que hizo queda.
    const bd = {
      async transaccion<R>(trabajo: (s: Consultar) => Promise<R>): Promise<R> {
        const foto = datos.foto();
        try {
          return await trabajo(sql);
        } catch (error) {
          datos.restaurar(foto);
          throw error;
        }
      },
    };
    ops = new OperacionesService(
      bd as unknown as DatabaseService,
      datos as unknown as RutasRepository,
    );
  });

  it('al devolver el último cooler, la ruta en ejecución queda finalizada', async () => {
    const [c1, c2] = [cooler(), cooler()];
    const r = await ruta({ coolers: [c1, c2], iniciar: true });
    expect(estadoCooler(c1)).toBe('en_ruta');
    expect(await ops.devolver(c1)).toBe(r);
    expect(estadoRuta(r)).toBe('en_ejecucion');
    await ops.devolver(c2);
    expect(estadoRuta(r)).toBe('finalizada');
    expect(estadoCooler(c2)).toBe('disponible');
  });

  it('cerrar deja pendiente si falta un cooler, y se finaliza cuando vuelve', async () => {
    const c = cooler();
    const r = await ruta({ coolers: [c], iniciar: true });
    expect(await ops.cerrar(r)).toBe('pendiente');
    expect(estadoCooler(c)).toBe('pendiente');
    await ops.devolver(c);
    expect(estadoRuta(r)).toBe('finalizada');
  });

  it('cerrar deja finalizada si ya volvieron todos, y no se cierra dos veces', async () => {
    const r = await ruta({ coolers: [] });
    await ops.iniciar(r);
    expect(await ops.cerrar(r)).toBe('finalizada');
    expect(await codigoDe(ops.cerrar(r))).toBe('ruta_no_en_ejecucion');
  });

  it('un cooler sin ruta queda disponible al devolverlo', async () => {
    const c = cooler('pendiente');
    expect(await ops.devolver(c)).toBeNull();
    expect(estadoCooler(c)).toBe('disponible');
  });

  it('no devuelve un cooler dañado, ni uno de una ruta que no ha partido, ni uno que no existe', async () => {
    expect(await codigoDe(ops.devolver(cooler('danado')))).toBe(
      'cooler_no_disponible',
    );
    const enEspera = cooler();
    await ruta({ coolers: [enEspera] });
    expect(await codigoDe(ops.devolver(enEspera))).toBe(
      'cooler_en_ruta_en_espera',
    );
    expect(await codigoDe(ops.devolver(999))).toBe('cooler_no_existe');
  });

  it('leer para otra ruta un cooler que estaba en una ruta en espera lo mueve', async () => {
    const c = cooler();
    const vieja = await ruta({ coolers: [c] });
    const nueva = await ruta({ conductorId: OTRO_CONDUCTOR, coolers: [c] });
    expect(datos.rutaCooler).toEqual([
      { rutaId: nueva, coolerId: c, devuelto: false },
    ]);
    expect(estadoRuta(vieja)).toBe('en_espera');
  });

  it('leer para otra ruta un cooler en una ruta que partió lo cuenta devuelto allá', async () => {
    const c = cooler();
    const vieja = await ruta({ coolers: [c], iniciar: true });
    await ruta({ conductorId: OTRO_CONDUCTOR, coolers: [c] });
    expect(estadoRuta(vieja)).toBe('finalizada');
    expect(estadoCooler(c)).toBe('en_espera');
  });

  it('no sube a una ruta un cooler dañado, y deshace todo lo de esa operación', async () => {
    const bueno = cooler();
    const danado = cooler('no_disponible');
    expect(await codigoDe(ruta({ coolers: [bueno, danado] }))).toBe(
      'cooler_no_disponible',
    );
    expect(estadoCooler(bueno)).toBe('disponible');
    expect(datos.rutas.size).toBe(0);
  });

  it('el admin deja dañado un cooler en ruta: cuenta como devuelto', async () => {
    const c = cooler();
    const r = await ruta({ coolers: [c], iniciar: true });
    await ops.liberar(sql, c, 'danado');
    expect(estadoCooler(c)).toBe('danado');
    expect(estadoRuta(r)).toBe('finalizada');
  });

  it('editar: quita y agrega coolers, y el local solo cambia en espera', async () => {
    const [c1, c2] = [cooler(), cooler()];
    const r = await ruta({ coolers: [c1] });
    const dto: Edicion = {
      localId: LOCAL_A,
      conductorId: CONDUCTOR,
      fecha: '2026-10-21T11:00',
      ordenes: 3,
      coolers: [c2],
    };
    await ops.editar(r, dto);
    expect(estadoCooler(c1)).toBe('disponible');
    expect(estadoCooler(c2)).toBe('en_espera');
    expect(datos.rutas.get(r)?.ordenes).toBe(3);
    await ops.iniciar(r);
    expect(await codigoDe(ops.editar(r, { ...dto, localId: LOCAL_B }))).toBe(
      'ruta_local_fijo',
    );
  });

  it('editar no quita un cooler que ya volvió', async () => {
    const [c1, c2] = [cooler(), cooler()];
    const r = await ruta({ coolers: [c1, c2], iniciar: true });
    await ops.devolver(c1);
    const dto: Edicion = {
      localId: LOCAL_A,
      conductorId: CONDUCTOR,
      fecha: '2026-10-21T10:00',
      ordenes: 1,
      coolers: [c2],
    };
    expect(await codigoDe(ops.editar(r, dto))).toBe('cooler_ya_devuelto');
  });

  it('pide conductor para iniciar y conductor o cooler para registrar', async () => {
    expect(await codigoDe(ruta({ conductorId: null, coolers: [] }))).toBe(
      'ruta_vacia',
    );
    const r = await ruta({ conductorId: null, coolers: [cooler()] });
    expect(await codigoDe(ops.iniciar(r))).toBe('ruta_sin_conductor');
    expect(await codigoDe(ops.iniciar(999))).toBe('ruta_no_existe');
  });
});
