import { controladorCon, usuario } from '@/common/testing/pruebas';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';
import type { EditarCuentaDto } from './dto/editar-cuenta.request.dto';

describe('CuentasController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve([])),
    clave: vi.fn(() => Promise.resolve({ clave: 'secreta' })),
    crear: vi.fn(() => Promise.resolve({ id: 1 })),
    editar: vi.fn(() => Promise.resolve({ id: 1 })),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: CuentasController;
  const u = usuario('asistente');

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      CuentasController,
      CuentasService,
      servicio,
    );
  });

  it('cada endpoint lleva el conductor, la cuenta y quien lo pide', async () => {
    await controller.listar(10, u);
    expect(servicio.listar).toHaveBeenCalledWith(10, u);
    expect(await controller.clave(10, 2, u)).toEqual({ clave: 'secreta' });
    expect(servicio.clave).toHaveBeenCalledWith(10, 2, u);
    const nueva = { cuenta: 'Uber', usuario: 'j', clave: 'x' };
    await controller.crear(10, nueva, u);
    expect(servicio.crear).toHaveBeenCalledWith(10, nueva, u);
    const editada = { cuenta: 'Uber', usuario: 'j' } as EditarCuentaDto;
    await controller.editar(10, 2, editada, u);
    expect(servicio.editar).toHaveBeenCalledWith(10, 2, editada, u);
    await controller.eliminar(10, 2, u);
    expect(servicio.eliminar).toHaveBeenCalledWith(10, 2, u);
  });
});
