import { CoolerDevueltoDto } from '../devoluciones/dto/devolucion.response.dto';
import { ProblemaResponseDto } from '../problemas/dto/problema.response.dto';
import { DetalleRutaResponseDto } from './detalle-ruta.response.dto';
import { ResumenRutasHoyResponseDto } from './resumen-rutas.response.dto';
import { RutaResponseDto } from './ruta.response.dto';

const FILA = {
  id: 1,
  fecha: '2026-10-15T08:00',
  ordenes: 40,
  estado: 'en_ejecucion' as const,
  local_id: 1,
  local: 'L',
  ciudad_id: 2,
  ciudad: 'C',
  conductor_id: 3,
  conductor: 'Juan',
  conductor_telefono: '912345678',
  conductor_tipo_id: 1,
  coolers: 2,
  devueltos: 1,
  problemas: 0,
};
const RUTA = {
  id: 1,
  fecha: '2026-10-15T08:00',
  ordenes: 40,
  estado: 'en_ejecucion',
  localId: 1,
  local: 'L',
  ciudadId: 2,
  ciudad: 'C',
  conductorId: 3,
  conductor: 'Juan',
  conductorTelefono: '912345678',
  conductorTipoId: 1,
  coolers: 2,
  devueltos: 1,
  problemas: 0,
};

describe('respuestas de las rutas', () => {
  it('ruta', () => {
    expect([FILA].map(RutaResponseDto.fromRow)).toEqual([RUTA]);
  });

  it('detalle: la ruta con sus coolers y problemas', () => {
    const detalle = DetalleRutaResponseDto.desde(
      RutaResponseDto.fromRow(FILA),
      [
        {
          id: 7,
          nombre: '7',
          codigo: 'c',
          estado: 'en_ruta',
          color: 'azul',
          devuelto: true,
          devuelto_en: 'd',
        },
      ],
      [{ id: 5, cantidad: 2, descripcion: 'x', creado_en: 't' }],
    );
    expect(detalle).toEqual({
      ...RUTA,
      detalleCoolers: [
        {
          id: 7,
          nombre: '7',
          codigo: 'c',
          estado: 'en_ruta',
          color: 'azul',
          devuelto: true,
          devueltoEn: 'd',
        },
      ],
      detalleProblemas: [
        { id: 5, cantidad: 2, descripcion: 'x', creadoEn: 't' },
      ],
    });
  });

  it('resumen de hoy, problema y cooler devuelto', () => {
    expect(
      ResumenRutasHoyResponseDto.fromRow({
        fecha: '2026-10-22',
        en_espera: 1,
        en_ejecucion: 2,
        pendientes: 3,
        finalizadas: 4,
      }),
    ).toEqual({
      fecha: '2026-10-22',
      enEspera: 1,
      enEjecucion: 2,
      pendientes: 3,
      finalizadas: 4,
    });
    expect(
      [{ id: 5, cantidad: 2, descripcion: 'x', creado_en: 't' }].map(
        ProblemaResponseDto.fromRow,
      ),
    ).toEqual([{ id: 5, cantidad: 2, descripcion: 'x', creadoEn: 't' }]);
    expect(
      CoolerDevueltoDto.fromRow({
        id: 7,
        nombre: '7',
        codigo: 'c',
        color: 'azul',
        estado: 'en_ruta',
        local_id: 2,
        local: 'L',
      }),
    ).toEqual({
      id: 7,
      nombre: '7',
      codigo: 'c',
      color: 'azul',
      localId: 2,
      local: 'L',
    });
  });
});
