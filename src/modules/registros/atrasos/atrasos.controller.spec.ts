import {
  controladorCon,
  filasDeExcel,
  usuario,
} from '@/common/testing/pruebas';
import { AtrasosController } from './atrasos.controller';
import { AtrasosService } from './atrasos.service';
import type { AtrasoDto } from './dto/atraso.request.dto';
import type { FiltroAtrasosDto } from './dto/filtro-atrasos.query.dto';

const ATRASO = {
  id: 3,
  fecha: '2026-10-15',
  localId: 1,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
  tipo: 'despacho' as const,
  cantidad: 12,
};

describe('AtrasosController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve({ items: [ATRASO], total: 1 })),
    todos: vi.fn(() =>
      Promise.resolve([ATRASO, { ...ATRASO, tipo: 'picking' }]),
    ),
    crear: vi.fn(() => Promise.resolve(ATRASO)),
    editar: vi.fn(() => Promise.resolve(ATRASO)),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: AtrasosController;
  const q = {} as FiltroAtrasosDto;
  const u = usuario('encargado', 1);

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      AtrasosController,
      AtrasosService,
      servicio,
    );
  });

  it('la planilla trae las columnas de Laravel, con el tipo con mayúscula', async () => {
    const [titulos, despacho, picking] = await filasDeExcel(
      await controller.excel(q, u),
    );
    expect(titulos).toEqual([
      'Identificador',
      'Fecha',
      'Local',
      'Ciudad',
      'Cantidad',
      'Tipo',
    ]);
    expect(despacho.at(-1)).toBe('Despacho');
    expect(picking.at(-1)).toBe('Picking');
  });

  it('cada endpoint pasa la cuenta al servicio', async () => {
    const dto = { localId: 1 } as AtrasoDto;
    await controller.listar(q, u);
    expect(servicio.listar).toHaveBeenCalledWith(q, u);
    await controller.crear(dto, u);
    expect(servicio.crear).toHaveBeenCalledWith(dto, u);
    await controller.editar(3, dto, u);
    expect(servicio.editar).toHaveBeenCalledWith(3, dto, u);
    await controller.eliminar(3);
    expect(servicio.eliminar).toHaveBeenCalledWith(3);
  });
});
