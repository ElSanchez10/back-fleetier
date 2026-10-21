import { usuario } from '../comun/pruebas.js';
import type { FiltroActividadLocalesDto } from './resumen.controller.js';
import type { ResumenRepositorio } from './resumen.repositorio.js';
import { ResumenService } from './resumen.service.js';

// La pantalla de inicio con un repositorio emulado: cada cuenta ve lo suyo.

function armar() {
  const datos = {
    indicadores: vi.fn(() => Promise.resolve({ rutasActivas: 1 })),
    coolersPorEstado: vi.fn(() =>
      Promise.resolve([{ estado: 'disponible', cantidad: 4 }]),
    ),
    actividadLocales: vi.fn(() => Promise.resolve([])),
  };
  return {
    datos,
    servicio: new ResumenService(datos as unknown as ResumenRepositorio),
  };
}

describe('ResumenService', () => {
  it('una cuenta con local ve los números de su local; sin local, de todos', async () => {
    const { servicio, datos } = armar();
    expect(await servicio.resumen(usuario('encargado', 2))).toEqual({
      rutasActivas: 1,
      coolersPorEstado: [{ estado: 'disponible', cantidad: 4 }],
    });
    expect(datos.indicadores).toHaveBeenLastCalledWith(2);
    await servicio.resumen(usuario('asistente'));
    expect(datos.indicadores).toHaveBeenLastCalledWith(null);
  });

  it('la actividad por local: una cuenta con local no puede pedir otro', async () => {
    const { servicio, datos } = armar();
    const q = { mes: '2026-10', localId: 5 } as FiltroActividadLocalesDto;
    await servicio.actividadLocales(q, usuario('coordinador', 2));
    expect(datos.actividadLocales).toHaveBeenLastCalledWith('2026-10', null, 2);
    await servicio.actividadLocales(q, usuario('admin'));
    expect(datos.actividadLocales).toHaveBeenLastCalledWith('2026-10', null, 5);
  });
});
