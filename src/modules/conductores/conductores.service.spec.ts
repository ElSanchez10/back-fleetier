import { codigoDe, configFalsa, usuario } from '@/common/testing/pruebas';
import { ConductoresService } from './conductores.service';
import { CuentasService } from './cuentas/cuentas.service';
import type { CuentasRepository } from './cuentas/repositories/cuentas.repository';
import { CifradoService } from './cuentas/cifrado.service';
import type { EventoDto } from './eventos/dto/evento.request.dto';
import { datosDelEvento } from './eventos/utils/eventos.util';
import type { ConductorRow } from './interfaces/conductor-row.interface';
import type { ConductoresRepository } from './repositories/conductores.repository';

// Conductores, sus cuentas y sus eventos con repositorios emulados.

// El conductor 10 es de la ciudad del local 1; el repositorio emula el filtro
// por ciudad: una cuenta del local 2 no lo ve.
const JUAN = { id: 10, nombre: 'Juan', ultima_ruta: null } as ConductorRow;
const RANGO = { desde: '2026-10-01', hasta: '2026-10-31' };

function armarConductores() {
  const datos = {
    porId: vi.fn((id: number, localId: number | null) =>
      Promise.resolve(
        id === 10 && (localId === null || localId === 1) ? JUAN : undefined,
      ),
    ),
    actividadPorLocal: vi.fn(() =>
      Promise.resolve([
        { local: 'Lider Temuco', ciudad: 'Temuco', rutas: 2, ordenes: 30 },
        { local: 'Jumbo Temuco', ciudad: 'Temuco', rutas: 1, ordenes: 12 },
      ]),
    ),
    rutas: vi.fn(() => Promise.resolve([])),
    actualizar: vi.fn(() => Promise.resolve()),
  };
  const servicio = new ConductoresService(
    datos as unknown as ConductoresRepository,
  );
  return { datos, servicio };
}

describe('ConductoresService', () => {
  it('una cuenta con local no ve conductores de otra ciudad', async () => {
    const { servicio } = armarConductores();
    expect(await codigoDe(servicio.buscar(10, usuario('encargado', 2)))).toBe(
      'conductor_no_existe',
    );
    expect((await servicio.buscar(10, usuario('encargado', 1))).nombre).toBe(
      'Juan',
    );
    expect((await servicio.buscar(10, usuario('admin'))).nombre).toBe('Juan');
  });

  it('no se edita ni se consulta la actividad de uno que la cuenta no ve', async () => {
    const { servicio, datos } = armarConductores();
    expect(
      await codigoDe(servicio.actividad(10, RANGO, usuario('coordinador', 2))),
    ).toBe('conductor_no_existe');
    expect(datos.actividadPorLocal).not.toHaveBeenCalled();
    expect(
      await codigoDe(servicio.rutas(10, RANGO, usuario('coordinador', 2))),
    ).toBe('conductor_no_existe');
    expect(datos.rutas).not.toHaveBeenCalled();
  });

  it('la actividad suma las órdenes de todos los locales', async () => {
    const { servicio } = armarConductores();
    const actividad = await servicio.actividad(10, RANGO, usuario('admin'));
    expect(actividad.ordenes).toBe(42);
    expect(actividad.locales).toHaveLength(2);
  });
});

describe('CuentasService', () => {
  function armar() {
    const guardadas = new Map<number, string>();
    const datos = {
      insertar: vi.fn(
        (
          _c: number,
          cuenta: string,
          usuarioCuenta: string,
          cifrada: string,
        ) => {
          guardadas.set(1, cifrada);
          return Promise.resolve({ id: 1, cuenta, usuario: usuarioCuenta });
        },
      ),
      claveCifrada: vi.fn((_c: number, cuentaId: number) =>
        Promise.resolve(guardadas.get(cuentaId)),
      ),
      actualizar: vi.fn(() =>
        Promise.resolve({ id: 1, cuenta: 'Uber', usuario: 'juan' }),
      ),
      listar: vi.fn(() => Promise.resolve([])),
      eliminar: vi.fn(() => Promise.resolve(false)),
    };
    const conductores = armarConductores().servicio;
    const cifrado = new CifradoService(
      configFalsa({ CLAVE_CUENTAS: 'secreto-de-prueba-para-vitest' }),
    );
    return {
      datos,
      cifrado,
      servicio: new CuentasService(
        datos as unknown as CuentasRepository,
        conductores,
        cifrado,
      ),
    };
  }

  it('guarda la contraseña cifrada y la devuelve legible cuando se pide', async () => {
    const { servicio, datos, cifrado } = armar();
    await servicio.crear(
      10,
      { cuenta: 'Uber', usuario: 'juan', clave: 'secreta' },
      usuario('admin'),
    );
    const cifrada = datos.insertar.mock.calls[0][3];
    expect(cifrada).not.toContain('secreta');
    expect(cifrado.descifrar(cifrada)).toBe('secreta');
    expect(await servicio.clave(10, 1, usuario('admin'))).toEqual({
      clave: 'secreta',
    });
    expect(await codigoDe(servicio.clave(10, 2, usuario('admin')))).toBe(
      'cuenta_no_existe',
    );
  });

  it('sin contraseña nueva, deja la que estaba', async () => {
    const { servicio, datos } = armar();
    await servicio.editar(
      10,
      1,
      { cuenta: 'Uber', usuario: 'juan' },
      usuario('asistente'),
    );
    expect(datos.actualizar).toHaveBeenCalledWith(10, 1, 'Uber', 'juan', null);
  });

  it('las cuentas de un conductor que la cuenta no ve no existen para ella', async () => {
    const { servicio, datos } = armar();
    expect(await codigoDe(servicio.listar(10, usuario('encargado', 2)))).toBe(
      'conductor_no_existe',
    );
    expect(datos.listar).not.toHaveBeenCalled();
    expect(await codigoDe(servicio.eliminar(10, 1, usuario('admin')))).toBe(
      'cuenta_no_existe',
    );
  });
});

describe('datosDelEvento', () => {
  const evento = (cambios: Partial<EventoDto>) => ({
    titulo: 'Vacaciones',
    descripcion: '',
    desde: '2026-10-01',
    hasta: '2026-10-05',
    ...cambios,
  });

  it('con un tipo existente, usa su id', () => {
    expect(datosDelEvento(evento({ tipoEventoId: 3 })).tipo).toEqual({
      id: 3,
      nombre: null,
      color: null,
    });
  });

  it('con un tipo nuevo, lo crea con su nombre y color (aunque venga también un id)', () => {
    const tipoNuevo = {
      nombre: 'Licencia',
      color: 'rojo',
    } as EventoDto['tipoNuevo'];
    expect(datosDelEvento(evento({ tipoEventoId: 3, tipoNuevo })).tipo).toEqual(
      {
        id: null,
        nombre: 'Licencia',
        color: 'rojo',
      },
    );
  });
});
