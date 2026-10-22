import {
  controladorCon,
  filasDeExcel,
  usuario,
} from '@/common/testing/pruebas';
import type { FiltroRutasDto } from './dto/filtro-rutas.query.dto';
import type { NuevaRutaDto } from './dto/nueva-ruta.request.dto';
import type { RutaDto } from './dto/ruta.request.dto';
import { RutasController } from './rutas.controller';
import { RutasService } from './rutas.service';

const RUTA = {
  id: 1,
  fecha: '2026-10-15T08:00',
  ordenes: 40,
  estado: 'pendiente' as const,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
  conductor: 'Juan Pérez',
};

describe('RutasController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    resumenDeHoy: vi.fn(() => Promise.resolve({ fecha: '2026-10-22' })),
    todas: vi.fn(() => Promise.resolve([RUTA])),
    detalle: vi.fn(() => Promise.resolve(RUTA)),
    crear: vi.fn(() => Promise.resolve(RUTA)),
    editar: vi.fn(() => Promise.resolve(RUTA)),
    iniciar: vi.fn(() => Promise.resolve(RUTA)),
    cerrar: vi.fn(() => Promise.resolve(RUTA)),
  };
  let controller: RutasController;
  const u = usuario('encargado', 1);
  const q = {} as FiltroRutasDto;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(RutasController, RutasService, servicio);
  });

  it('la planilla trae las columnas de Laravel, con el estado legible', async () => {
    const [titulos, fila] = await filasDeExcel(await controller.excel(q, u));
    expect(titulos).toEqual([
      'Identificador',
      'Fecha',
      'Cantidad Ordenes de Pedido',
      'Local',
      'Ciudad',
      'Estado Ruta',
      'Conductor',
    ]);
    expect(fila).toEqual(
      expect.arrayContaining([
        1,
        40,
        'Lider Temuco',
        'Temuco',
        'Pendiente',
        'Juan Pérez',
      ]),
    );
  });

  it('cada endpoint pasa el id, los datos y la cuenta', async () => {
    await controller.listar(q, u);
    expect(servicio.listar).toHaveBeenCalledWith(q, u);
    await controller.resumen(u);
    expect(servicio.resumenDeHoy).toHaveBeenCalledWith(u);
    await controller.uno(1, u);
    expect(servicio.detalle).toHaveBeenCalledWith(1, u);
    const nueva = { iniciar: false } as NuevaRutaDto;
    await controller.crear(nueva, u);
    expect(servicio.crear).toHaveBeenCalledWith(nueva, u);
    const dto = { ordenes: 3 } as RutaDto;
    await controller.editar(1, dto, u);
    expect(servicio.editar).toHaveBeenCalledWith(1, dto, u);
    await controller.iniciar(1, u);
    expect(servicio.iniciar).toHaveBeenCalledWith(1, u);
    await controller.cerrar(1, u);
    expect(servicio.cerrar).toHaveBeenCalledWith(1, u);
  });
});
