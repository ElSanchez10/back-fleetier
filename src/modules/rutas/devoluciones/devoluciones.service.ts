import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { OperacionesService } from '../operaciones.service';
import { RutasService } from '../rutas.service';
import {
  CoolerDevueltoDto,
  DevolucionResponseDto,
} from './dto/devolucion.response.dto';
import { DevolucionesRepository } from './repositories/devoluciones.repository';

// Un cooler que vuelve al local: se lee su código con la pistola, queda
// disponible y devuelto en la ruta que lo tenía (en ejecución o pendiente). Si
// era el último que le faltaba, la ruta queda finalizada. Uno que no estaba en
// ninguna ruta también queda disponible. Sirve igual al finalizar una ruta que
// para un cooler que vuelve días después, y para uno de otro local que llegó
// aquí (no cambia de local; el front avisa).
@Injectable()
export class DevolucionesService {
  constructor(
    private readonly datos: DevolucionesRepository,
    private readonly rutas: RutasService,
    private readonly operaciones: OperacionesService,
  ) {}

  async devolver(
    codigo: string,
    usuario: UsuarioSesion,
  ): Promise<DevolucionResponseDto> {
    const cooler = await this.datos.coolerPorCodigo(codigo);
    if (!cooler) {
      throw new NotFoundException({ codigo: 'cooler_no_existe' });
    }
    const rutaId = await this.operaciones.devolver(cooler.id);
    return {
      cooler: CoolerDevueltoDto.fromRow(cooler),
      // La ruta puede ser de otro local: aquí se muestra igual (número y driver).
      ruta: rutaId === null ? null : await this.rutas.buscar(rutaId, null),
      // No estaba en ninguna ruta y ya estaba disponible: no cambió nada.
      yaDisponible: rutaId === null && cooler.estado === 'disponible',
      otroLocal:
        usuario.localId !== null && usuario.localId !== cooler.local_id,
    };
  }
}
