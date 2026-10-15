import {
  Body,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles, UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { ProblemaDto } from './ruta.dto.js';
import { horaLocal, RutasService } from './rutas.service.js';

function noExiste(): never {
  throw new NotFoundException({
    statusCode: 404,
    codigo: 'problema_no_existe',
  });
}

// Problemas de una ruta (pedidos que no se entregaron, etc.). Se listan con la
// ruta; los anotan admin, encargado y coordinador, y los elimina solo admin.
@Controller('rutas/:id/problemas')
@Roles('admin', 'encargado', 'coordinador')
export class ProblemasController {
  constructor(
    private readonly bd: BdService,
    private readonly rutas: RutasService,
  ) {}

  @Post()
  async crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: ProblemaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.rutas.buscar(id, usuario);
    const [problema] = await this.bd.consultar(
      `insert into problema_ruta (ruta_id, cantidad, descripcion) values ($1, $2, $3)
       returning id, cantidad, descripcion, ${horaLocal('creado_en')} as "creadoEn"`,
      [id, dto.cantidad, dto.descripcion],
    );
    return problema;
  }

  @Put(':problemaId')
  async editar(
    @Param('id', IdPipe) id: number,
    @Param('problemaId', IdPipe) problemaId: number,
    @Body() dto: ProblemaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.rutas.buscar(id, usuario);
    const [problema] = await this.bd.consultar(
      `update problema_ruta set cantidad = $3, descripcion = $4
       where id = $1 and ruta_id = $2
       returning id, cantidad, descripcion, ${horaLocal('creado_en')} as "creadoEn"`,
      [problemaId, id, dto.cantidad, dto.descripcion],
    );
    return problema ?? noExiste();
  }

  @Delete(':problemaId')
  @Roles('admin')
  @HttpCode(204)
  async eliminar(
    @Param('id', IdPipe) id: number,
    @Param('problemaId', IdPipe) problemaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.rutas.buscar(id, usuario);
    const borrados = await this.bd.consultar(
      'delete from problema_ruta where id = $1 and ruta_id = $2 returning id',
      [problemaId, id],
    );
    if (borrados.length === 0) {
      noExiste();
    }
  }
}
