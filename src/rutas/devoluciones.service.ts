import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { OperacionesService } from './operaciones.service.js';
import { RutasConsultasRepositorio } from './rutas-consultas.repositorio.js';
import { RutasService } from './rutas.service.js';

// Un cooler que vuelve al local: se lee su código con la pistola, queda
// disponible y devuelto en la ruta que lo tenía (en ejecución o pendiente). Si
// era el último que le faltaba, la ruta queda finalizada. Uno que no estaba en
// ninguna ruta también queda disponible. Sirve igual al finalizar una ruta que
// para un cooler que vuelve días después, y para uno de otro local que llegó
// aquí (no cambia de local; el front avisa).
@Injectable()
export class DevolucionesService {
  constructor(
    private readonly datos: RutasConsultasRepositorio,
    private readonly rutas: RutasService,
    private readonly operaciones: OperacionesService,
  ) {}

  async devolver(codigo: string, usuario: UsuarioSesion) {
    const cooler = await this.datos.coolerPorCodigo(codigo);
    if (!cooler) {
      throw new NotFoundException({
        statusCode: 404,
        codigo: 'cooler_no_existe',
      });
    }
    const rutaId = await this.operaciones.devolver(cooler.id);
    const { estado, ...datos } = cooler;
    return {
      cooler: datos,
      // La ruta puede ser de otro local: aquí se muestra igual (número y driver).
      ruta: rutaId === null ? null : await this.rutas.buscar(rutaId, null),
      // No estaba en ninguna ruta y ya estaba disponible: no cambió nada.
      yaDisponible: rutaId === null && estado === 'disponible',
      otroLocal: usuario.localId !== null && usuario.localId !== cooler.localId,
    };
  }
}
