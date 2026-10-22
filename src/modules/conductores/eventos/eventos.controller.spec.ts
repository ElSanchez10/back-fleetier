import { controladorCon, usuario } from '@/common/testing/pruebas';
import type { EventoDto } from './dto/evento.request.dto';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

describe('EventosController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve([])),
    crear: vi.fn(() => Promise.resolve({ id: 1 })),
    editar: vi.fn(() => Promise.resolve({ id: 1 })),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: EventosController;
  const u = usuario('admin');

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      EventosController,
      EventosService,
      servicio,
    );
  });

  it('cada endpoint lleva el conductor, el evento y quien lo pide', async () => {
    const rango = { desde: '2026-10-01', hasta: '2026-10-31' };
    await controller.listar(10, rango, u);
    expect(servicio.listar).toHaveBeenCalledWith(10, rango, u);
    const dto = { titulo: 'Vacaciones' } as EventoDto;
    await controller.crear(10, dto, u);
    expect(servicio.crear).toHaveBeenCalledWith(10, dto, u);
    await controller.editar(10, 3, dto, u);
    expect(servicio.editar).toHaveBeenCalledWith(10, 3, dto, u);
    await controller.eliminar(10, 3, u);
    expect(servicio.eliminar).toHaveBeenCalledWith(10, 3, u);
  });
});
