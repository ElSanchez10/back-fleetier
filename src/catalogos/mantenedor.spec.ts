import { codigoDe, usuario } from '../comun/pruebas.js';
import type { LocalDto } from './catalogo.dto.js';
import type { CatalogoRepositorio } from './catalogo.repositorio.js';
import { Mantenedor, MantenedorLocales } from './mantenedor.js';

// Los catálogos con un repositorio emulado.

function repositorio() {
  return {
    listar: vi.fn((_donde?: string, _parametros?: unknown[]) =>
      Promise.resolve([]),
    ),
    uno: vi.fn((id: number) => Promise.resolve({ id })),
    insertar: vi.fn(() => Promise.resolve(3)),
    actualizar: vi.fn(() => Promise.resolve(false)),
    eliminar: vi.fn(() => Promise.resolve(false)),
  };
}

describe('Mantenedor', () => {
  it('crear devuelve lo creado', async () => {
    const datos = repositorio();
    const m = new Mantenedor(
      datos as unknown as CatalogoRepositorio<{ nombre: string }>,
    );
    expect(await m.crear({ nombre: 'Osorno' })).toEqual({ id: 3 });
  });

  it('editar o eliminar algo que no existe', async () => {
    const m = new Mantenedor(
      repositorio() as unknown as CatalogoRepositorio<{ nombre: string }>,
    );
    expect(await codigoDe(m.editar(9, { nombre: 'x' }))).toBe(
      'catalogo_item_no_existe',
    );
    expect(await codigoDe(m.eliminar(9))).toBe('catalogo_item_no_existe');
  });

  it('una cuenta con local solo recibe su local; sin local, todos', async () => {
    const datos = repositorio();
    const m = new MantenedorLocales(
      datos as unknown as CatalogoRepositorio<LocalDto>,
    );
    await m.listarPara(usuario('encargado', 4));
    expect(datos.listar).toHaveBeenLastCalledWith('where c.id = $1', [4]);
    await m.listarPara(usuario('admin'));
    expect(datos.listar).toHaveBeenLastCalledWith();
  });
});
