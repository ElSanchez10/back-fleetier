import { controladorCon, usuario } from '@/common/testing/pruebas';
import { CATALOGO } from './catalogos.service';
import { LocalesController } from './locales.controller';

describe('LocalesController', () => {
  const servicio = {
    listarPara: vi.fn(() => Promise.resolve([{ id: 1 }])),
    crear: vi.fn(() => Promise.resolve({ id: 2 })),
    editar: vi.fn(() => Promise.resolve({ id: 3 })),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: LocalesController;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      LocalesController,
      CATALOGO.locales,
      servicio,
    );
  });

  it('lista según la cuenta (una con local recibe solo el suyo)', async () => {
    const encargado = usuario('encargado', 4);
    await controller.listar(encargado);
    expect(servicio.listarPara).toHaveBeenCalledWith(encargado);
  });

  it('crea, edita y elimina', async () => {
    const dto = { nombre: 'Lider', direccion: 'x', ciudadId: 1 };
    await controller.crear(dto);
    expect(servicio.crear).toHaveBeenCalledWith(dto);
    await controller.editar(3, dto);
    expect(servicio.editar).toHaveBeenCalledWith(3, dto);
    await controller.eliminar(3);
    expect(servicio.eliminar).toHaveBeenCalledWith(3);
  });
});
