import { CoolerResponseDto } from './cooler.response.dto';
import { ResumenCoolersDto } from './listado-coolers.response.dto';
import { RutaDeCoolerResponseDto } from './ruta-de-cooler.response.dto';

describe('respuestas de los coolers', () => {
  it('cooler', () => {
    const [k] = [
      {
        id: 7,
        nombre: '7',
        codigo: 'c',
        fecha_adquisicion: '2026-01-01',
        tiene_tapa: false,
        estado: 'disponible' as const,
        tipo_cooler_id: 1,
        marca: 'M',
        capacidad: 'grande' as const,
        color: 'rojo' as const,
        local_id: 2,
        local: 'L',
        ciudad: 'C',
      },
    ].map(CoolerResponseDto.fromRow);
    expect(k).toEqual({
      id: 7,
      nombre: '7',
      codigo: 'c',
      fechaAdquisicion: '2026-01-01',
      tieneTapa: false,
      estado: 'disponible',
      tipoCoolerId: 1,
      marca: 'M',
      capacidad: 'grande',
      color: 'rojo',
      localId: 2,
      local: 'L',
      ciudad: 'C',
    });
  });

  it('resumen e historial de rutas', () => {
    expect(
      ResumenCoolersDto.fromRow({ total: 5, disponibles: 2, en_ruta: 3 }),
    ).toEqual({ total: 5, disponibles: 2, enRuta: 3 });
    expect(
      [
        {
          id: 1,
          fecha: 'f',
          estado: 'pendiente' as const,
          local: 'L',
          conductor_id: null,
          conductor: null,
          devuelto: true,
          devuelto_en: 'd',
        },
      ].map(RutaDeCoolerResponseDto.fromRow),
    ).toEqual([
      {
        id: 1,
        fecha: 'f',
        estado: 'pendiente',
        local: 'L',
        conductorId: null,
        conductor: null,
        devuelto: true,
        devueltoEn: 'd',
      },
    ]);
  });
});
