import { describe, expect, it } from 'vitest';
import { formatearRun, normalizarRun, runValido } from './run.js';

describe('normalizarRun', () => {
  it('quita puntos y espacios, y deja el guion y la K en mayúscula', () => {
    expect(normalizarRun(' 12.345.678-5 ')).toBe('12345678-5');
    expect(normalizarRun('6000000k')).toBe('6000000-K');
  });
});

describe('runValido', () => {
  it('acepta un RUN con su dígito verificador correcto', () => {
    expect(runValido('12345678-5')).toBe(true);
    expect(runValido('11111111-1')).toBe(true);
    expect(runValido('6000000-K')).toBe(true);
  });

  it('rechaza un dígito verificador equivocado o un formato extraño', () => {
    expect(runValido('12345678-9')).toBe(false);
    expect(runValido('12.345.678-5')).toBe(false);
    expect(runValido('123-4')).toBe(false);
  });
});

describe('formatearRun', () => {
  it('pone los puntos de miles', () => {
    expect(formatearRun('12345678-K')).toBe('12.345.678-K');
    expect(formatearRun('9876543-3')).toBe('9.876.543-3');
  });
});
