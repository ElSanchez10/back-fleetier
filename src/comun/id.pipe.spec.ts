import { IdPipe } from './id.pipe.js';

describe('IdPipe', () => {
  const pipe = new IdPipe();

  it('convierte un id válido a número', () => {
    expect(pipe.transform('12')).toBe(12);
    expect(pipe.transform('2147483647')).toBe(2147483647);
  });

  it('rechaza lo que no puede ser un id', () => {
    for (const valor of ['0', '-1', '1.5', '12abc', '', '2147483648', 'abc']) {
      expect(() => pipe.transform(valor)).toThrow();
    }
  });
});
