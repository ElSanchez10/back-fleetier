import { CiudadResponseDto } from './ciudad.response.dto';
import { DestinoResponseDto } from './destino.response.dto';
import { LocalResponseDto } from './local.response.dto';
import { TipoConductorResponseDto } from './tipo-conductor.response.dto';
import { TipoCoolerResponseDto } from './tipo-cooler.response.dto';
import { TipoEventoResponseDto } from './tipo-evento.response.dto';

// Cada fila de la base pasa a su respuesta (las columnas en snake_case, los
// campos en camelCase). Se usan como callback: filas.map(Dto.fromRow).

describe('respuestas de los catálogos', () => {
  it('ciudad y clasificación de drivers', () => {
    expect(
      [{ id: 1, nombre: 'Temuco' }].map(CiudadResponseDto.fromRow),
    ).toEqual([{ id: 1, nombre: 'Temuco' }]);
    expect(
      [{ id: 2, nombre: 'Planta' }].map(TipoConductorResponseDto.fromRow),
    ).toEqual([{ id: 2, nombre: 'Planta' }]);
  });

  it('local, con su ciudad', () => {
    expect(
      [{ id: 1, nombre: 'L', direccion: 'D', ciudad_id: 3, ciudad: 'C' }].map(
        LocalResponseDto.fromRow,
      ),
    ).toEqual([
      { id: 1, nombre: 'L', direccion: 'D', ciudadId: 3, ciudad: 'C' },
    ]);
  });

  it('destino, con su precio base', () => {
    expect(
      [{ id: 1, nombre: 'V', precio_base: 15000 }].map(
        DestinoResponseDto.fromRow,
      ),
    ).toEqual([{ id: 1, nombre: 'V', precioBase: 15000 }]);
  });

  it('tipos de cooler y de evento', () => {
    expect(
      [
        {
          id: 1,
          marca: 'Igloo',
          capacidad: 'grande' as const,
          color: 'azul' as const,
        },
      ].map(TipoCoolerResponseDto.fromRow),
    ).toEqual([{ id: 1, marca: 'Igloo', capacidad: 'grande', color: 'azul' }]);
    expect(
      [{ id: 1, nombre: 'Licencia', color: 'rojo' as const }].map(
        TipoEventoResponseDto.fromRow,
      ),
    ).toEqual([{ id: 1, nombre: 'Licencia', color: 'rojo' }]);
  });
});
