import { controladorCon } from '@/common/testing/pruebas';
import { CATALOGO } from './catalogos.service';
import { CiudadesController } from './ciudades.controller';

describe('CiudadesController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve([{ id: 1 }])),
    crear: vi.fn((dto: object) => Promise.resolve({ id: 2, ...dto })),
    editar: vi.fn((id: number, dto: object) => Promise.resolve({ id, ...dto })),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: CiudadesController;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      CiudadesController,
      CATALOGO.ciudades,
      servicio,
    );
  });

  it('lista con el servicio de su catálogo', async () => {
    expect(await controller.listar()).toEqual([{ id: 1 }]);
  });

  it('crea, edita y elimina pasando el id y los datos', async () => {
    const dto = { nombre: 'Osorno' };
    expect(await controller.crear(dto)).toEqual({ id: 2, ...dto });
    expect(await controller.editar(5, dto)).toEqual({ id: 5, ...dto });
    expect(servicio.editar).toHaveBeenCalledWith(5, dto);
    await controller.eliminar(5);
    expect(servicio.eliminar).toHaveBeenCalledWith(5);
  });
});
