import { NotFoundException } from '@nestjs/common';
import { codigoDe, usuario } from '../comun/pruebas.js';
import type { ConductoresService } from '../conductores/conductores.service.js';
import { DevolucionesService } from './devoluciones.service.js';
import type { OperacionesService } from './operaciones.service.js';
import { ProblemasService } from './problemas.service.js';
import type { EstadoRuta, FiltroRutasDto, RutaDto } from './ruta.dto.js';
import type {
  CoolerLeido,
  RutasConsultasRepositorio,
} from './rutas-consultas.repositorio.js';
import { filtrosDeRuta, RutasService } from './rutas.service.js';
import type { Ruta } from './rutas.sql.js';

// Quién puede qué en las rutas, sus problemas y las devoluciones, con un
// repositorio emulado. Los cambios de estado (OperacionesService) tienen sus
// propias pruebas.

const ruta = (estado: EstadoRuta, conductorId: number | null = 10) =>
  ({ id: 1, localId: 1, estado, conductorId }) as Ruta;

const COOLER: CoolerLeido = {
  id: 7,
  nombre: '7',
  codigo: '123',
  color: 'azul',
  estado: 'en_ruta',
  localId: 1,
  local: 'Lider Temuco',
};

function armar(guardada: Ruta = ruta('en_espera')) {
  const datos = {
    porId: vi.fn((id: number, localId: number | null) =>
      Promise.resolve(
        id === guardada.id && (localId === null || localId === guardada.localId)
          ? guardada
          : undefined,
      ),
    ),
    coolersDeRuta: vi.fn(() => Promise.resolve([])),
    problemasDeRuta: vi.fn(() => Promise.resolve([])),
    actualizarProblema: vi.fn(() => Promise.resolve(undefined)),
    eliminarProblema: vi.fn(() => Promise.resolve(false)),
    insertarProblema: vi.fn(() => Promise.resolve({ id: 1 })),
    coolerPorCodigo: vi.fn((codigo: string) =>
      Promise.resolve(codigo === '123' ? COOLER : undefined),
    ),
  };
  const operaciones = {
    crear: vi.fn(() => Promise.resolve(1)),
    editar: vi.fn(() => Promise.resolve()),
    iniciar: vi.fn(() => Promise.resolve()),
    cerrar: vi.fn(() => Promise.resolve('finalizada')),
    devolver: vi.fn(() => Promise.resolve(1 as number | null)),
  };
  // La cuenta del local 1 ve solo al conductor 10 (de su ciudad).
  const conductores = {
    buscar: vi.fn((id: number, u: { localId: number | null }) =>
      u.localId === null || id === 10
        ? Promise.resolve({ id })
        : Promise.reject(
            new NotFoundException({ codigo: 'conductor_no_existe' }),
          ),
    ),
  };
  const repo = datos as unknown as RutasConsultasRepositorio;
  const rutas = new RutasService(
    repo,
    operaciones as unknown as OperacionesService,
    conductores as unknown as ConductoresService,
  );
  return {
    datos,
    operaciones,
    conductores,
    rutas,
    problemas: new ProblemasService(repo, rutas),
    devoluciones: new DevolucionesService(
      repo,
      rutas,
      operaciones as unknown as OperacionesService,
    ),
  };
}

const dto = (cambios: Partial<RutaDto> = {}) =>
  ({
    localId: 1,
    conductorId: 10,
    fecha: '2026-10-21T10:00',
    ordenes: 1,
    coolers: [],
    ...cambios,
  }) as RutaDto;

describe('RutasService', () => {
  it('una ruta de otro local no existe para la cuenta', async () => {
    const { rutas } = armar();
    expect(await codigoDe(rutas.detalle(1, usuario('encargado', 2)))).toBe(
      'ruta_no_existe',
    );
    expect(await codigoDe(rutas.iniciar(1, usuario('encargado', 2)))).toBe(
      'ruta_no_existe',
    );
  });

  it('crear: en el local de la cuenta y con un conductor que ve', async () => {
    const { rutas, operaciones } = armar();
    expect(
      await codigoDe(
        rutas.crear(dto({ localId: 2 }) as never, usuario('encargado', 1)),
      ),
    ).toBe('otro_local');
    expect(
      await codigoDe(
        rutas.crear(dto({ conductorId: 20 }) as never, usuario('encargado', 1)),
      ),
    ).toBe('conductor_no_existe');
    expect(operaciones.crear).not.toHaveBeenCalled();
    expect(
      await codigoDe(
        rutas.crear(dto({ conductorId: 20 }) as never, usuario('admin')),
      ),
    ).toBe('sin error');
  });

  it('editar: encargado y coordinador solo mientras no ha partido; el admin siempre', async () => {
    for (const estado of [
      'en_ejecucion',
      'pendiente',
      'finalizada',
    ] as EstadoRuta[]) {
      const { rutas, operaciones } = armar(ruta(estado));
      expect(
        await codigoDe(rutas.editar(1, dto(), usuario('coordinador', 1))),
      ).toBe('ruta_ya_partio');
      expect(operaciones.editar).not.toHaveBeenCalled();
      expect(await codigoDe(rutas.editar(1, dto(), usuario('admin')))).toBe(
        'sin error',
      );
    }
    const { rutas } = armar(ruta('en_espera'));
    expect(
      await codigoDe(rutas.editar(1, dto(), usuario('encargado', 1))),
    ).toBe('sin error');
  });

  it('editar: el conductor que ya tenía no se revisa; uno nuevo sí', async () => {
    const { rutas, conductores } = armar(ruta('en_espera', 30));
    expect(
      await codigoDe(
        rutas.editar(1, dto({ conductorId: 30 }), usuario('encargado', 1)),
      ),
    ).toBe('sin error');
    expect(conductores.buscar).not.toHaveBeenCalled();
    expect(
      await codigoDe(
        rutas.editar(1, dto({ conductorId: 31 }), usuario('encargado', 1)),
      ),
    ).toBe('conductor_no_existe');
  });
});

describe('filtrosDeRuta', () => {
  const q = (cambios: Partial<FiltroRutasDto>) =>
    ({ ...cambios }) as FiltroRutasDto;

  it('un número, con o sin #, busca también esa ruta', () => {
    expect(filtrosDeRuta(q({ buscar: '152' }), usuario('admin')).numero).toBe(
      152,
    );
    expect(filtrosDeRuta(q({ buscar: '#152' }), usuario('admin')).numero).toBe(
      152,
    );
    expect(
      filtrosDeRuta(q({ buscar: 'Juan' }), usuario('admin')).numero,
    ).toBeNull();
  });

  it('una cuenta con local solo ve las suyas aunque pida otro', () => {
    expect(
      filtrosDeRuta(q({ localId: 5 }), usuario('encargado', 2)).localId,
    ).toBe(2);
    expect(filtrosDeRuta(q({ localId: 5 }), usuario('admin')).localId).toBe(5);
  });
});

describe('ProblemasService', () => {
  it('solo en rutas que la cuenta ve, y avisa si el problema no existe', async () => {
    const { problemas, datos } = armar();
    expect(
      await codigoDe(
        problemas.crear(
          1,
          { cantidad: 1, descripcion: 'x' },
          usuario('encargado', 2),
        ),
      ),
    ).toBe('ruta_no_existe');
    expect(datos.insertarProblema).not.toHaveBeenCalled();
    expect(
      await codigoDe(
        problemas.editar(
          1,
          9,
          { cantidad: 1, descripcion: 'x' },
          usuario('admin'),
        ),
      ),
    ).toBe('problema_no_existe');
    expect(await codigoDe(problemas.eliminar(1, 9, usuario('admin')))).toBe(
      'problema_no_existe',
    );
  });
});

describe('DevolucionesService', () => {
  it('devuelve el cooler y dice en qué ruta quedó', async () => {
    const { devoluciones } = armar(ruta('en_ejecucion'));
    const r = await devoluciones.devolver('123', usuario('encargado', 1));
    expect(r.ruta?.id).toBe(1);
    expect(r.cooler).not.toHaveProperty('estado');
    expect(r).toMatchObject({ yaDisponible: false, otroLocal: false });
  });

  it('un cooler de otro local se devuelve igual y se avisa', async () => {
    const { devoluciones } = armar(ruta('en_ejecucion'));
    expect(
      await devoluciones.devolver('123', usuario('coordinador', 2)),
    ).toMatchObject({ otroLocal: true });
  });

  it('sin ruta: ya estaba disponible, o quedó disponible', async () => {
    const { devoluciones, operaciones, datos } = armar();
    operaciones.devolver.mockResolvedValue(null);
    datos.coolerPorCodigo.mockResolvedValueOnce({
      ...COOLER,
      estado: 'disponible',
    });
    expect(await devoluciones.devolver('123', usuario('admin'))).toMatchObject({
      ruta: null,
      yaDisponible: true,
    });
    expect(await devoluciones.devolver('123', usuario('admin'))).toMatchObject({
      ruta: null,
      yaDisponible: false,
    });
  });

  it('un código que no existe', async () => {
    const { devoluciones, operaciones } = armar();
    expect(await codigoDe(devoluciones.devolver('000', usuario('admin')))).toBe(
      'cooler_no_existe',
    );
    expect(operaciones.devolver).not.toHaveBeenCalled();
  });
});
