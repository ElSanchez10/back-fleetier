import { CuentaResponseDto } from '../cuentas/dto/cuenta.response.dto';
import { EventoResponseDto } from '../eventos/dto/evento.response.dto';
import { ConductorResponseDto } from './conductor.response.dto';
import { ResumenConductoresDto } from './listado-conductores.response.dto';
import {
  ActividadEnLocalDto,
  RutaDeConductorResponseDto,
} from './ruta-de-conductor.response.dto';

// Cada fila de la base pasa a su respuesta, usada como callback.

describe('respuestas de los conductores', () => {
  it('conductor, con su última ruta', () => {
    const ultima = {
      id: 9,
      fecha: '2026-10-22T09:00',
      estado: 'en_ejecucion' as const,
      local: 'L',
      ciudad: 'C',
    };
    const [d] = [
      {
        id: 1,
        nombre: 'Juan',
        run: '12345678-5',
        fecha_nacimiento: '1990-05-05',
        telefono: '912345678',
        email: 'j@x.cl',
        ciudad_id: 2,
        ciudad: 'Temuco',
        tipo_conductor_id: 3,
        tipo_conductor: 'Planta',
        ocupado: true,
        ultima_ruta: ultima,
      },
    ].map(ConductorResponseDto.fromRow);
    expect(d).toEqual({
      id: 1,
      nombre: 'Juan',
      run: '12345678-5',
      fechaNacimiento: '1990-05-05',
      telefono: '912345678',
      email: 'j@x.cl',
      ciudadId: 2,
      ciudad: 'Temuco',
      tipoConductorId: 3,
      tipoConductor: 'Planta',
      ocupado: true,
      ultimaRuta: ultima,
    });
  });

  it('resumen, rutas y actividad', () => {
    expect(
      ResumenConductoresDto.fromRow({ total: 5, disponibles: 3, en_ruta: 1 }),
    ).toEqual({ total: 5, disponibles: 3, enRuta: 1 });
    expect(
      [
        {
          id: 1,
          fecha: 'f',
          ordenes: 4,
          estado: 'finalizada' as const,
          local: 'L',
        },
      ].map(RutaDeConductorResponseDto.fromRow),
    ).toEqual([
      { id: 1, fecha: 'f', ordenes: 4, estado: 'finalizada', local: 'L' },
    ]);
    expect(
      [{ local: 'L', ciudad: 'C', rutas: 2, ordenes: 30 }].map(
        ActividadEnLocalDto.fromRow,
      ),
    ).toEqual([{ local: 'L', ciudad: 'C', rutas: 2, ordenes: 30 }]);
  });

  it('cuenta y evento', () => {
    expect(
      [{ id: 1, cuenta: 'Uber', usuario: 'j' }].map(CuentaResponseDto.fromRow),
    ).toEqual([{ id: 1, cuenta: 'Uber', usuario: 'j' }]);
    expect(
      [
        {
          id: 3,
          titulo: 'T',
          descripcion: null,
          desde: 'a',
          hasta: 'b',
          tipo_evento_id: 1,
          tipo_evento: 'V',
          color: 'verde' as const,
        },
      ].map(EventoResponseDto.fromRow),
    ).toEqual([
      {
        id: 3,
        titulo: 'T',
        descripcion: null,
        desde: 'a',
        hasta: 'b',
        tipoEventoId: 1,
        tipoEvento: 'V',
        color: 'verde',
      },
    ]);
  });
});
