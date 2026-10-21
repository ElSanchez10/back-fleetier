import { bdFalsa, codigoDe, usuario } from '../comun/pruebas.js';
import type {
  DatosPedido,
  PedidoEspecial,
  PedidosRepositorio,
} from './pedidos.repositorio.js';
import { PedidosService } from './pedidos.service.js';
import type { PedidoEspecialDto } from './registro.dto.js';

// Las reglas de los pedidos especiales con un repositorio emulado.

const PEDIDO: PedidoEspecial = {
  id: 5,
  fecha: '2026-10-21',
  localId: 1,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
  destinoId: 3,
  destino: 'Bodega',
  cantidad: 10,
  precio: 5000,
  extraordinario: false,
  descripcion: 'x',
};

const DTO = {
  localId: 1,
  destinoId: 3,
  fecha: '2026-10-21',
  cantidad: 10,
  precio: 7000,
  extraordinario: true,
  descripcion: 'x',
};
const pedidoDto = (cambios: Partial<PedidoEspecialDto> = {}) =>
  ({ ...DTO, ...cambios }) as PedidoEspecialDto;

function armar(guardado: PedidoEspecial = PEDIDO) {
  const datos = {
    porId: vi.fn((id: number, localId: number | null) =>
      Promise.resolve(
        id === guardado.id && (localId === null || localId === guardado.localId)
          ? guardado
          : undefined,
      ),
    ),
    insertar: vi.fn((_sql: unknown, _p: DatosPedido) =>
      Promise.resolve(guardado.id as number | undefined),
    ),
    actualizar: vi.fn((_sql: unknown, _id: number, _p: DatosPedido) =>
      Promise.resolve(true),
    ),
    insertarDestino: vi.fn(() => Promise.resolve(99)),
    eliminar: vi.fn(() => Promise.resolve(true)),
  };
  return {
    datos,
    servicio: new PedidosService(
      bdFalsa,
      datos as unknown as PedidosRepositorio,
    ),
  };
}

describe('PedidosService', () => {
  describe('crear', () => {
    it('admin y asistente fijan el precio y marcan extraordinario', async () => {
      const { servicio, datos } = armar();
      await servicio.crear(pedidoDto(), usuario('asistente'));
      expect(datos.insertar.mock.calls[0][1]).toMatchObject({
        precio: 7000,
        extraordinario: true,
      });
    });

    it('encargado y coordinador no: queda el precio base y no extraordinario', async () => {
      const { servicio, datos } = armar();
      await servicio.crear(pedidoDto(), usuario('coordinador', 1));
      expect(datos.insertar.mock.calls[0][1]).toMatchObject({
        precio: null,
        extraordinario: false,
      });
    });

    it('solo en el local de la cuenta', async () => {
      const { servicio } = armar();
      expect(
        await codigoDe(
          servicio.crear(pedidoDto({ localId: 2 }), usuario('encargado', 1)),
        ),
      ).toBe('otro_local');
    });

    it('un destino nuevo lo agregan solo admin y asistente, con el precio como base', async () => {
      const { servicio, datos } = armar();
      expect(
        await codigoDe(
          servicio.crear(
            pedidoDto({ otroDestino: 'Feria' }),
            usuario('encargado', 1),
          ),
        ),
      ).toBe('destino_nuevo_no_permitido');
      await servicio.crear(
        pedidoDto({ otroDestino: 'Feria' }),
        usuario('admin'),
      );
      expect(datos.insertarDestino).toHaveBeenCalledWith(
        expect.anything(),
        'Feria',
        7000,
      );
      expect(datos.insertar.mock.calls[0][1]).toMatchObject({ destinoId: 99 });
    });

    it('un destino que no existe', async () => {
      const { servicio, datos } = armar();
      datos.insertar.mockResolvedValueOnce(undefined);
      expect(
        await codigoDe(servicio.crear(pedidoDto(), usuario('admin'))),
      ).toBe('destino_no_existe');
      expect(
        await codigoDe(
          servicio.crear(pedidoDto({ destinoId: null }), usuario('admin')),
        ),
      ).toBe('destino_no_existe');
    });
  });

  describe('editar', () => {
    it('encargado y coordinador no corrigen un pedido extraordinario', async () => {
      const { servicio, datos } = armar({ ...PEDIDO, extraordinario: true });
      expect(
        await codigoDe(
          servicio.editar(5, pedidoDto(), usuario('encargado', 1)),
        ),
      ).toBe('pedido_extraordinario');
      expect(datos.actualizar).not.toHaveBeenCalled();
      await servicio.editar(5, pedidoDto(), usuario('admin'));
      expect(datos.actualizar).toHaveBeenCalled();
    });

    it('encargado y coordinador no cambian precio ni extraordinario (se mantienen)', async () => {
      const { servicio, datos } = armar();
      await servicio.editar(5, pedidoDto(), usuario('coordinador', 1));
      expect(datos.actualizar.mock.calls[0][2]).toMatchObject({
        precio: null,
        extraordinario: null,
      });
    });

    it('un pedido de otro local no existe para la cuenta', async () => {
      const { servicio } = armar();
      expect(
        await codigoDe(
          servicio.editar(5, pedidoDto(), usuario('encargado', 2)),
        ),
      ).toBe('pedido_no_existe');
    });
  });

  it('eliminar uno que no existe', async () => {
    const { servicio, datos } = armar();
    datos.eliminar.mockResolvedValueOnce(false);
    expect(await codigoDe(servicio.eliminar(5))).toBe('pedido_no_existe');
  });
});
