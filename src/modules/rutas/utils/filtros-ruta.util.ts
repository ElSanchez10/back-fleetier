import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { localVisible } from '@/common/utils/alcance.util';
import type { FiltroRutasDto } from '../dto/filtro-rutas.query.dto';
import type { FiltrosRuta } from '../interfaces/filtros-ruta.interface';

// Lo que pide el listado. Un número (con o sin "#") busca además esa ruta por
// su número. Una cuenta con local solo ve las suyas.
export function filtrosDeRuta(
  q: FiltroRutasDto,
  usuario: UsuarioSesion,
): FiltrosRuta {
  const buscar = q.buscar ?? '';
  return {
    buscar: q.buscar,
    numero: /^#?\d{1,9}$/.test(buscar) ? Number(buscar.replace('#', '')) : null,
    fechaDesde: q.fechaDesde ?? null,
    fechaHasta: q.fechaHasta ?? null,
    estado: q.estado ?? null,
    localId: localVisible(usuario, q.localId),
  };
}
