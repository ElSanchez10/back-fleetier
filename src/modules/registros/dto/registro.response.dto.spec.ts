import { AtrasoResponseDto } from '../atrasos/dto/atraso.response.dto';
import { CasoResponseDto } from '../casos/dto/caso.response.dto';
import { PedidoEspecialResponseDto } from '../pedidos/dto/pedido-especial.response.dto';

// fromRow se usa como callback (filas.map(Dto.fromRow)): no puede depender de `this`.

const BASE = {
  id: 1,
  fecha: '2026-10-22',
  local_id: 2,
  local: 'L',
  ciudad: 'C',
};
const COMUN = {
  id: 1,
  fecha: '2026-10-22',
  localId: 2,
  local: 'L',
  ciudad: 'C',
};

describe('respuestas de registros', () => {
  it('pedido especial', () => {
    const [p] = [
      {
        ...BASE,
        destino_id: 3,
        destino: 'D',
        cantidad: 4,
        precio: null,
        extraordinario: false,
        descripcion: '',
      },
    ].map(PedidoEspecialResponseDto.fromRow);
    expect(p).toEqual({
      ...COMUN,
      destinoId: 3,
      destino: 'D',
      cantidad: 4,
      precio: null,
      extraordinario: false,
      descripcion: '',
    });
  });

  it('atraso', () => {
    const [a] = [{ ...BASE, tipo: 'picking' as const, cantidad: 3 }].map(
      AtrasoResponseDto.fromRow,
    );
    expect(a).toEqual({ ...COMUN, tipo: 'picking', cantidad: 3 });
  });

  it('caso', () => {
    const [c] = [
      { ...BASE, conductor_id: 9, conductor: 'Juan', descripcion: 'x' },
    ].map(CasoResponseDto.fromRow);
    expect(c).toEqual({
      ...COMUN,
      conductorId: 9,
      conductor: 'Juan',
      descripcion: 'x',
    });
  });
});
