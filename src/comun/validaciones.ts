import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

// Un día escrito 'AAAA-MM-DD' y que exista en el calendario ("2026-02-30" no pasa).
export function EsFecha() {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/),
    IsISO8601({ strict: true }),
  );
}
