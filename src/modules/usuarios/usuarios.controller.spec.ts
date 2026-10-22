import { controladorCon, usuario } from '@/common/testing/pruebas';
import type { ListarUsuariosDto } from './dto/listar-usuarios.query.dto';
import type { UsuarioDto } from './dto/usuario.request.dto';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

describe('UsuariosController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    crear: vi.fn(() => Promise.resolve({ claveInicial: 'x' })),
    editar: vi.fn(() => Promise.resolve({ id: 4 })),
    restablecer: vi.fn(() => Promise.resolve({ claveInicial: 'x' })),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: UsuariosController;
  const yo = usuario('admin');
  const dto = {
    nombre: 'Ana',
    correo: 'a@b.cl',
    rol: 'asistente',
  } as UsuarioDto;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      UsuariosController,
      UsuariosService,
      servicio,
    );
  });

  it('lista con el filtro pedido', async () => {
    const q = { limite: 30, desde: 0 } as ListarUsuariosDto;
    expect(await controller.listar(q)).toEqual({ items: [], total: 0 });
    expect(servicio.listar).toHaveBeenCalledWith(q);
  });

  it('editar y eliminar llevan a quien lo pide (nadie cambia su rol ni se elimina)', async () => {
    await controller.editar(4, dto, yo);
    expect(servicio.editar).toHaveBeenCalledWith(4, dto, yo);
    await controller.eliminar(4, yo);
    expect(servicio.eliminar).toHaveBeenCalledWith(4, yo);
  });

  it('crea y restablece la contraseña', async () => {
    await controller.crear(dto);
    expect(servicio.crear).toHaveBeenCalledWith(dto);
    await controller.restablecer(4);
    expect(servicio.restablecer).toHaveBeenCalledWith(4);
  });
});
