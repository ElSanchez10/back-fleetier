import {
  controladorCon,
  filasDeExcel,
  usuario,
} from '@/common/testing/pruebas';
import type { FiltroPedidosDto } from './dto/filtro-pedidos.query.dto';
import type { PedidoEspecialDto } from './dto/pedido-especial.request.dto';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

const PEDIDO = {
  id: 9,
  fecha: '2026-10-15',
  localId: 1,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
  destinoId: 1,
  destino: 'Villarrica',
  cantidad: 21,
  precio: 15000,
  extraordinario: true,
  descripcion: 'x',
};

describe('PedidosController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve({ items: [PEDIDO], total: 1 })),
    todos: vi.fn(() => Promise.resolve([PEDIDO])),
    crear: vi.fn(() => Promise.resolve(PEDIDO)),
    editar: vi.fn(() => Promise.resolve(PEDIDO)),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  let controller: PedidosController;
  const q = {} as FiltroPedidosDto;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      PedidosController,
      PedidosService,
      servicio,
    );
  });

  it('la planilla trae el precio solo para quien lo ve', async () => {
    const [conPrecio] = await filasDeExcel(
      await controller.excel(q, usuario('asistente')),
    );
    expect(conPrecio).toContain('Precio');
    const [titulos, fila] = await filasDeExcel(
      await controller.excel(q, usuario('encargado', 1)),
    );
    expect(titulos).not.toContain('Precio');
    expect(titulos).toEqual([
      'Identificador',
      'Fecha',
      'Local',
      'Ciudad',
      'Destino',
      'Extraordinario (1:sí)',
      'Descripción',
      'Cantidad OP',
    ]);
    expect(fila).toEqual(
      expect.arrayContaining([9, 'Lider Temuco', 'Villarrica', 1, 'x', 21]),
    );
  });

  it('cada endpoint pasa la cuenta al servicio', async () => {
    const u = usuario('coordinador', 1);
    const dto = { localId: 1 } as PedidoEspecialDto;
    await controller.listar(q, u);
    expect(servicio.listar).toHaveBeenCalledWith(q, u);
    await controller.crear(dto, u);
    expect(servicio.crear).toHaveBeenCalledWith(dto, u);
    await controller.editar(9, dto, u);
    expect(servicio.editar).toHaveBeenCalledWith(9, dto, u);
    await controller.eliminar(9);
    expect(servicio.eliminar).toHaveBeenCalledWith(9);
  });
});
