// Transformaciones de class-transformer para los textos que llegan en un DTO.
export const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Un texto opcional vacío se guarda como null, no como ''.
export const vacioANull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : recortar({ value });
