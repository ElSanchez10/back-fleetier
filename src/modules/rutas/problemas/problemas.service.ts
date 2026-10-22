import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { RutasService } from '../rutas.service';
import type { ProblemaDto } from './dto/problema.request.dto';
import { ProblemaResponseDto } from './dto/problema.response.dto';
import { ProblemasRepository } from './repositories/problemas.repository';

function noExiste(): never {
  throw new NotFoundException({ codigo: 'problema_no_existe' });
}

// Problemas de una ruta (pedidos que no se entregaron, etc.). Solo en rutas
// que la cuenta ve.
@Injectable()
export class ProblemasService {
  constructor(
    private readonly datos: ProblemasRepository,
    private readonly rutas: RutasService,
  ) {}

  async crear(
    rutaId: number,
    dto: ProblemaDto,
    usuario: UsuarioSesion,
  ): Promise<ProblemaResponseDto> {
    await this.rutas.buscar(rutaId, usuario);
    return ProblemaResponseDto.fromRow(await this.datos.insertar(rutaId, dto));
  }

  async editar(
    rutaId: number,
    problemaId: number,
    dto: ProblemaDto,
    usuario: UsuarioSesion,
  ): Promise<ProblemaResponseDto> {
    await this.rutas.buscar(rutaId, usuario);
    return ProblemaResponseDto.fromRow(
      (await this.datos.actualizar(rutaId, problemaId, dto)) ?? noExiste(),
    );
  }

  async eliminar(
    rutaId: number,
    problemaId: number,
    usuario: UsuarioSesion,
  ): Promise<void> {
    await this.rutas.buscar(rutaId, usuario);
    if (!(await this.datos.eliminar(rutaId, problemaId))) {
      noExiste();
    }
  }
}
