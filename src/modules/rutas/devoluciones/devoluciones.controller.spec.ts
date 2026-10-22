import { controladorCon, usuario } from '@/common/testing/pruebas';
import { DevolucionesController } from './devoluciones.controller';
import { DevolucionesService } from './devoluciones.service';

describe('DevolucionesController', () => {
  it('devuelve el cooler leído, con la cuenta que lo lee', async () => {
    const servicio = { devolver: vi.fn(() => Promise.resolve({ ruta: null })) };
    const controller = await controladorCon(
      DevolucionesController,
      DevolucionesService,
      servicio,
    );
    const u = usuario('encargado', 1);
    expect(await controller.devolver({ codigo: '123' }, u)).toEqual({
      ruta: null,
    });
    expect(servicio.devolver).toHaveBeenCalledWith('123', u);
  });
});
