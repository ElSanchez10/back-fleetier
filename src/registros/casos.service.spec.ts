import { NotFoundException } from '@nestjs/common';
import { codigoDe, usuario } from '../comun/pruebas.js';
import type { ConductoresService } from '../conductores/conductores.service.js';
import type { AtrasosRepositorio } from './atrasos.repositorio.js';
import { AtrasosService } from './atrasos.service.js';
import type { Caso, CasosRepositorio } from './casos.repositorio.js';
import { CasosService } from './casos.service.js';
import type { AtrasoDto, CasoDto } from './registro.dto.js';

// Atrasos y casos con repositorios emulados: el alcance por local y, en los
// casos, que la cuenta vea al conductor.

const CASO: Caso = {
  id: 4,
  fecha: '2026-10-21',
  localId: 1,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
  conductorId: 10,
  conductor: 'Juan',
  descripcion: 'x',
};

const porLocal =
  <T extends { id: number; localId: number }>(fila: T) =>
  (id: number, localId: number | null) =>
    Promise.resolve(
      id === fila.id && (localId === null || localId === fila.localId)
        ? fila
        : undefined,
    );

function armarCasos() {
  const datos = {
    porId: vi.fn(porLocal(CASO)),
    insertar: vi.fn(() => Promise.resolve(CASO.id)),
    actualizar: vi.fn(() => Promise.resolve()),
    eliminar: vi.fn(() => Promise.resolve(true)),
  };
  // Solo el conductor 10 es de la ciudad de la cuenta con local.
  const conductores = {
    buscar: vi.fn((id: number, u: { localId: number | null }) =>
      u.localId === null || id === 10
        ? Promise.resolve({ id })
        : Promise.reject(
            new NotFoundException({ codigo: 'conductor_no_existe' }),
          ),
    ),
  };
  const servicio = new CasosService(
    datos as unknown as CasosRepositorio,
    conductores as unknown as ConductoresService,
  );
  return { datos, conductores, servicio };
}

const caso = (cambios: Partial<CasoDto> = {}) =>
  ({
    localId: 1,
    conductorId: 10,
    fecha: '2026-10-21',
    descripcion: 'x',
    ...cambios,
  }) as CasoDto;

describe('CasosService', () => {
  it('se anota con un conductor que la cuenta ve', async () => {
    const { servicio } = armarCasos();
    expect(
      await codigoDe(servicio.crear(caso(), usuario('encargado', 1))),
    ).toBe('sin error');
    expect(
      await codigoDe(
        servicio.crear(caso({ conductorId: 20 }), usuario('encargado', 1)),
      ),
    ).toBe('conductor_no_existe');
  });

  it('solo en el local de la cuenta', async () => {
    const { servicio, datos } = armarCasos();
    expect(
      await codigoDe(
        servicio.crear(caso({ localId: 2 }), usuario('encargado', 1)),
      ),
    ).toBe('otro_local');
    expect(datos.insertar).not.toHaveBeenCalled();
  });

  it('al corregir, el conductor que ya tenía no se vuelve a revisar', async () => {
    const { servicio, conductores } = armarCasos();
    await servicio.editar(4, caso(), usuario('encargado', 1));
    expect(conductores.buscar).not.toHaveBeenCalled();
    await servicio.editar(4, caso({ conductorId: 11 }), usuario('admin'));
    expect(conductores.buscar).toHaveBeenCalledWith(11, expect.anything());
  });

  it('un caso de otro local no existe para la cuenta', async () => {
    const { servicio } = armarCasos();
    expect(await codigoDe(servicio.buscar(4, usuario('coordinador', 2)))).toBe(
      'caso_no_existe',
    );
  });
});

describe('AtrasosService', () => {
  const ATRASO = { id: 8, localId: 1 };
  const armar = () => {
    const datos = {
      porId: vi.fn(porLocal(ATRASO)),
      insertar: vi.fn(() => Promise.resolve(8)),
      actualizar: vi.fn(() => Promise.resolve()),
      eliminar: vi.fn(() => Promise.resolve(false)),
    };
    return {
      datos,
      servicio: new AtrasosService(datos as unknown as AtrasosRepositorio),
    };
  };
  const atraso = (localId: number) =>
    ({
      localId,
      tipo: 'despacho',
      fecha: '2026-10-21',
      cantidad: 3,
    }) as AtrasoDto;

  it('no se pasa un atraso a otro local', async () => {
    const { servicio, datos } = armar();
    expect(
      await codigoDe(servicio.editar(8, atraso(2), usuario('encargado', 1))),
    ).toBe('otro_local');
    expect(datos.actualizar).not.toHaveBeenCalled();
  });

  it('uno de otro local no existe para la cuenta, y eliminar uno inexistente avisa', async () => {
    const { servicio } = armar();
    expect(
      await codigoDe(servicio.editar(8, atraso(2), usuario('encargado', 2))),
    ).toBe('atraso_no_existe');
    expect(await codigoDe(servicio.eliminar(8))).toBe('atraso_no_existe');
  });
});
