import { ordenarPor, patron } from './sql.js';

describe('patron', () => {
  it('sin texto deja pasar todo', () => {
    expect(patron()).toBe('%');
    expect(patron('')).toBe('%');
  });

  it('busca el texto en cualquier parte', () => {
    expect(patron('cool')).toBe('%cool%');
  });

  it('toma literales los comodines que escriba el usuario', () => {
    expect(patron('100%_a\\')).toBe('%100\\%\\_a\\\\%');
  });
});

const COLUMNAS = { fecha: 'x.fecha', local: 'lower(l.nombre)' };

function pagina(orden?: string, sentido?: 'asc' | 'desc') {
  return { orden, sentido };
}

describe('ordenarPor', () => {
  it('sin orden usa el orden por defecto', () => {
    expect(ordenarPor(pagina(), COLUMNAS, 'x.fecha desc', 'x.id')).toBe(
      'order by x.fecha desc',
    );
  });

  it('ordena por la columna pedida y desempata por id', () => {
    expect(
      ordenarPor(pagina('local', 'desc'), COLUMNAS, 'x.fecha desc', 'x.id'),
    ).toBe('order by lower(l.nombre) desc, x.id desc');
    expect(ordenarPor(pagina('fecha'), COLUMNAS, 'x.fecha desc', 'x.id')).toBe(
      'order by x.fecha asc, x.id asc',
    );
  });

  it('ignora columnas que el listado no admite', () => {
    for (const orden of ['precio', 'constructor', '__proto__', 'x.id; drop']) {
      expect(ordenarPor(pagina(orden), COLUMNAS, 'x.fecha desc', 'x.id')).toBe(
        'order by x.fecha desc',
      );
    }
  });
});
