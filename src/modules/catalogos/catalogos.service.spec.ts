import { codigoDe, usuario } from '@/common/testing/pruebas';
import { CatalogoService, LocalesService } from './catalogos.service';
import { LocalResponseDto } from './dto/local.response.dto';
import type { CiudadRow, LocalRow } from './interfaces/catalogos-row.interface';
import type { CatalogoRepository } from './repositories/catalogo.repository';

// Los catálogos con un repositorio emulado.

const LOCAL: LocalRow = {
  id: 4,
  nombre: 'Lider Temuco',
  direccion: 'Av. Alemania 1',
  ciudad_id: 1,
  ciudad: 'Temuco',
};

function repositorio<R>(filas: R[]) {
  return {
    listar: vi.fn(() => Promise.resolve(filas)),
    uno: vi.fn((id: number) =>
      Promise.resolve(filas.find((f) => (f as { id: number }).id === id)),
    ),
    insertar: vi.fn(() => Promise.resolve(3)),
    actualizar: vi.fn(() => Promise.resolve(false)),
    eliminar: vi.fn(() => Promise.resolve(false)),
  };
}

const comoCiudad = (f: CiudadRow) => ({ id: f.id, nombre: f.nombre });

describe('CatalogoService', () => {
  it('lista y responde con la forma de la respuesta', async () => {
    const s = new CatalogoService(
      repositorio([
        { id: 1, nombre: 'Osorno' },
      ]) as unknown as CatalogoRepository<{ nombre: string }, CiudadRow>,
      comoCiudad,
    );
    expect(await s.listar()).toEqual([{ id: 1, nombre: 'Osorno' }]);
  });

  it('crear devuelve lo creado', async () => {
    const s = new CatalogoService(
      repositorio([
        { id: 3, nombre: 'Osorno' },
      ]) as unknown as CatalogoRepository<{ nombre: string }, CiudadRow>,
      comoCiudad,
    );
    expect(await s.crear({ nombre: 'Osorno' })).toEqual({
      id: 3,
      nombre: 'Osorno',
    });
  });

  it('editar o eliminar algo que no existe', async () => {
    const s = new CatalogoService(
      repositorio<CiudadRow>([]) as unknown as CatalogoRepository<
        { nombre: string },
        CiudadRow
      >,
      comoCiudad,
    );
    expect(await codigoDe(s.editar(9, { nombre: 'x' }))).toBe(
      'catalogo_item_no_existe',
    );
    expect(await codigoDe(s.eliminar(9))).toBe('catalogo_item_no_existe');
  });
});

describe('LocalesService', () => {
  const armar = () => {
    const datos = repositorio([LOCAL, { ...LOCAL, id: 5 }]);
    return {
      datos,
      locales: new LocalesService(datos as never, LocalResponseDto.fromRow),
    };
  };

  it('una cuenta con local solo recibe su local', async () => {
    const { locales, datos } = armar();
    expect(await locales.listarPara(usuario('encargado', 4))).toEqual([
      {
        id: 4,
        nombre: 'Lider Temuco',
        direccion: 'Av. Alemania 1',
        ciudadId: 1,
        ciudad: 'Temuco',
      },
    ]);
    expect(datos.listar).not.toHaveBeenCalled();
  });

  it('sin local, todos', async () => {
    const { locales } = armar();
    expect(await locales.listarPara(usuario('admin'))).toHaveLength(2);
  });
});
