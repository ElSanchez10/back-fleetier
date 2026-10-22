import {
  controladorCon,
  filasDeExcel,
  usuario,
} from '@/common/testing/pruebas';
import type { FiltroRegistrosDto } from '../dto/filtro-registros.query.dto';
import { CasosController } from './casos.controller';
import { CasosService } from './casos.service';
import type { CasoDto } from './dto/caso.request.dto';

const CASO = {
  id: 1,
  fecha: '2026-10-15',
  localId: 1,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
  conductorId: 1,
  conductor: 'Juan Pérez',
  descripcion: 'Choque leve',
};

describe('CasosController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve({ items: [CASO], total: 1 })),
    todos: vi.fn(() => Promise.resolve([CASO])),
    crear: vi.fn(() => Promise.resolve(CASO)),
    editar: vi.fn(() => Promise.resolve(CASO)),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: CasosController;
  const q = {} as FiltroRegistrosDto;
  const u = usuario('coordinador', 1);

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(CasosController, CasosService, servicio);
  });

  it('la planilla trae las columnas de Laravel', async () => {
    const [titulos, fila] = await filasDeExcel(await controller.excel(q, u));
    expect(titulos).toEqual([
      'Identificador',
      'Fecha',
      'Local',
      'Ciudad',
      'Conductor',
      'Descripción',
    ]);
    expect(fila).toEqual(
      expect.arrayContaining([1, 'Juan Pérez', 'Choque leve']),
    );
  });

  it('cada endpoint pasa la cuenta al servicio', async () => {
    const dto = { localId: 1, conductorId: 1 } as CasoDto;
    await controller.listar(q, u);
    expect(servicio.listar).toHaveBeenCalledWith(q, u);
    await controller.crear(dto, u);
    expect(servicio.crear).toHaveBeenCalledWith(dto, u);
    await controller.editar(1, dto, u);
    expect(servicio.editar).toHaveBeenCalledWith(1, dto, u);
    await controller.eliminar(1);
    expect(servicio.eliminar).toHaveBeenCalledWith(1);
  });
});
