import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches, ValidateBy } from 'class-validator';

// Un día escrito 'AAAA-MM-DD' y que exista en el calendario ("2026-02-30" no pasa).
export function EsFecha() {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/),
    IsISO8601({ strict: true }),
  );
}

// El día de hoy en Chile, 'AAAA-MM-DD' (el servidor corre en UTC).
export function hoyEnChile(): string {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'America/Santiago',
  });
}

// Un día que ya pasó o es hoy: lo que se anota ya ocurrió.
export function HastaHoy() {
  return ValidateBy({
    name: 'hastaHoy',
    validator: {
      validate: (valor: unknown) =>
        typeof valor === 'string' && valor <= hoyEnChile(),
      defaultMessage: () => '$property no puede ser un día futuro',
    },
  });
}
