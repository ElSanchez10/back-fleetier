// RUN chileno. Se guarda sin puntos, con guion y la K en mayúscula: "12345678-K".

// Deja el RUN como se guarda, lo haya escrito la persona con o sin puntos y guion.
export function normalizarRun(texto: string): string {
  const limpio = texto.replace(/[.\s-]/g, '').toUpperCase();
  return limpio.length > 1
    ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}`
    : limpio;
}

// Comprueba el formato y el dígito verificador (módulo 11): atrapa los errores
// de tipeo antes de que queden guardados.
export function runValido(run: string): boolean {
  const partes = /^(\d{7,8})-([\dK])$/.exec(run);
  if (!partes) {
    return false;
  }
  let suma = 0;
  let factor = 2;
  for (const digito of partes[1].split('').reverse()) {
    suma += Number(digito) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return partes[2] === esperado;
}
