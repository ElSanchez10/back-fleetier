import type { EventoDto } from '../dto/evento.request.dto';
import { type DatosEvento } from '../repositories/eventos.repository';

// Lo que se guarda de un evento: con `tipoNuevo`, el tipo se crea junto con
// el evento; si no, se usa el elegido.
export function datosDelEvento(dto: EventoDto): DatosEvento {
  const nuevo = dto.tipoNuevo;
  return {
    titulo: dto.titulo,
    descripcion: dto.descripcion ?? null,
    desde: dto.desde,
    hasta: dto.hasta,
    tipo: {
      id: nuevo ? null : (dto.tipoEventoId ?? null),
      nombre: nuevo?.nombre ?? null,
      color: nuevo?.color ?? null,
    },
  };
}
