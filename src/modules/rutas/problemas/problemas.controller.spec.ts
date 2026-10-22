import { controladorCon, usuario } from '@/common/testing/pruebas';
import { ProblemasController } from './problemas.controller';
import { ProblemasService } from './problemas.service';

describe('ProblemasController', () => {
  const servicio = {
    crear: vi.fn(() => Promise.resolve({ id: 5 })),
    editar: vi.fn(() => Promise.resolve({ id: 5 })),
    eliminar: vi.fn(() => Promise.resolve()),
  };

  it('cada endpoint lleva la ruta, el problema y la cuenta', async () => {
    const controller = await controladorCon(
      ProblemasController,
      ProblemasService,
      servicio,
    );
    const u = usuario('coordinador', 1);
    const dto = { cantidad: 2, descripcion: 'x' };
    await controller.crear(1, dto, u);
    expect(servicio.crear).toHaveBeenCalledWith(1, dto, u);
    await controller.editar(1, 5, dto, u);
    expect(servicio.editar).toHaveBeenCalledWith(1, 5, dto, u);
    await controller.eliminar(1, 5, u);
    expect(servicio.eliminar).toHaveBeenCalledWith(1, 5, u);
  });
});
