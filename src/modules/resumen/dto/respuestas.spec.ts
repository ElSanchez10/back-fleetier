import { ActividadLocalResponseDto } from './actividad-local.response.dto';
import { ResumenResponseDto } from './resumen.response.dto';

describe('respuestas del resumen', () => {
  it('actividad por local', () => {
    expect(
      [{ local_id: 1, local: 'L', ciudad: 'C', rutas: 3, ordenes: 40 }].map(
        ActividadLocalResponseDto.fromRow,
      ),
    ).toEqual([{ localId: 1, local: 'L', ciudad: 'C', rutas: 3, ordenes: 40 }]);
  });

  it('indicadores con los coolers por estado', () => {
    expect(
      ResumenResponseDto.fromRows(
        {
          rutas_activas: 1,
          rutas_pendientes: 2,
          coolers_disponibles: 3,
          conductores_en_ruta: 4,
        },
        [{ estado: 'danado', cantidad: 0 }],
      ),
    ).toEqual({
      rutasActivas: 1,
      rutasPendientes: 2,
      coolersDisponibles: 3,
      conductoresEnRuta: 4,
      coolersPorEstado: [{ estado: 'danado', cantidad: 0 }],
    });
  });
});
