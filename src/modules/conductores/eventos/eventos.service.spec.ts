import { NotFoundException } from '@nestjs/common';
import { codigoDe, usuario } from '@/common/testing/pruebas';
import type { ConductoresService } from '../conductores.service';
import type { EventoDto } from './dto/evento.request.dto';
import { EventosService } from './eventos.service';
import type { EventoRow } from './interfaces/evento-row.interface';
import type { EventosRepository } from './repositories/eventos.repository';

// Los eventos del calendario con un repositorio emulado: solo de conductores
// que la cuenta ve, y avisa si el evento no existe.

const EVENTO: EventoRow = {
  id: 3,
  titulo: 'Vacaciones',
  descripcion: null,
  desde: '2026-10-22',
  hasta: '2026-10-25',
  tipo_evento_id: 1,
  tipo_evento: 'Vacaciones',
  color: 'verde',
};

function armar() {
  const datos = {
    listar: vi.fn(() => Promise.resolve([EVENTO])),
    uno: vi.fn((id: number) =>
      Promise.resolve(id === EVENTO.id ? EVENTO : undefined),
    ),
    insertar: vi.fn(() => Promise.resolve(3)),
    actualizar: vi.fn(() => Promise.resolve(false)),
    eliminar: vi.fn(() => Promise.resolve(false)),
  };
  // La cuenta del local 1 ve al conductor 10; la del local 2, no.
  const conductores = {
    buscar: vi.fn((id: number, u: { localId: number | null }) =>
      u.localId === 2
        ? Promise.reject(
            new NotFoundException({ codigo: 'conductor_no_existe' }),
          )
        : Promise.resolve({ id }),
    ),
  };
  return {
    datos,
    servicio: new EventosService(
      datos as unknown as EventosRepository,
      conductores as unknown as ConductoresService,
    ),
  };
}

const DTO = {
  tipoEventoId: 1,
  titulo: 'Vacaciones',
  descripcion: '',
  desde: '2026-10-22',
  hasta: '2026-10-25',
} as EventoDto;

describe('EventosService', () => {
  it('lista con la forma de la respuesta', async () => {
    const { servicio } = armar();
    const [evento] = await servicio.listar(
      10,
      { desde: '2026-10-01', hasta: '2026-10-31' },
      usuario('encargado', 1),
    );
    expect(evento).toMatchObject({
      id: 3,
      tipoEventoId: 1,
      tipoEvento: 'Vacaciones',
    });
  });

  it('no se anota en un conductor que la cuenta no ve', async () => {
    const { servicio, datos } = armar();
    expect(
      await codigoDe(servicio.crear(10, DTO, usuario('encargado', 2))),
    ).toBe('conductor_no_existe');
    expect(datos.insertar).not.toHaveBeenCalled();
  });

  it('crea y devuelve lo creado', async () => {
    const { servicio } = armar();
    expect((await servicio.crear(10, DTO, usuario('admin'))).id).toBe(3);
  });

  it('editar o eliminar uno que no existe avisa', async () => {
    const { servicio } = armar();
    expect(await codigoDe(servicio.editar(10, 9, DTO, usuario('admin')))).toBe(
      'evento_no_existe',
    );
    expect(await codigoDe(servicio.eliminar(10, 9, usuario('admin')))).toBe(
      'evento_no_existe',
    );
  });
});
