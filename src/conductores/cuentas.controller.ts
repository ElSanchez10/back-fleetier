import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles, UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { cifrar, descifrar } from './cifrado.js';
import { CuentaDto, EditarCuentaDto } from './conductor.dto.js';
import { ConductoresService } from './conductores.service.js';

const SELECT_CUENTA = `
  select id, cuenta, usuario
  from cuenta_conductor`;

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'cuenta_no_existe' });
}

// Cuentas del conductor en aplicaciones externas. Son credenciales ajenas:
// solo las ven admin y asistente, y la contraseña no viaja en el listado; se
// pide aparte, una a la vez, cuando alguien la quiere ver.
@Controller('conductores/:id/cuentas')
@Roles('admin', 'asistente')
export class CuentasController {
  constructor(
    private readonly bd: BdService,
    private readonly conductores: ConductoresService,
  ) {}

  @Get()
  async listar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    return this.bd.consultar(
      `${SELECT_CUENTA} where conductor_id = $1 order by lower(cuenta), id`,
      [id],
    );
  }

  @Get(':cuentaId/clave')
  async clave(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    const [cuenta] = await this.bd.consultar<{ claveCifrada: string }>(
      `select clave_cifrada as "claveCifrada"
       from cuenta_conductor where id = $1 and conductor_id = $2`,
      [cuentaId, id],
    );
    if (!cuenta) {
      noExiste();
    }
    return { clave: descifrar(cuenta.claveCifrada) };
  }

  @Post()
  async crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: CuentaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    const [cuenta] = await this.bd.consultar(
      `insert into cuenta_conductor (conductor_id, cuenta, usuario, clave_cifrada)
       values ($1, $2, $3, $4) returning id, cuenta, usuario`,
      [id, dto.cuenta, dto.usuario, cifrar(dto.clave)],
    );
    return cuenta;
  }

  @Put(':cuentaId')
  async editar(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @Body() dto: EditarCuentaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    // Sin contraseña nueva, coalesce deja la que estaba.
    const [cuenta] = await this.bd.consultar(
      `update cuenta_conductor
       set cuenta = $3, usuario = $4, clave_cifrada = coalesce($5, clave_cifrada)
       where id = $1 and conductor_id = $2 returning id, cuenta, usuario`,
      [
        cuentaId,
        id,
        dto.cuenta,
        dto.usuario,
        dto.clave === undefined ? null : cifrar(dto.clave),
      ],
    );
    return cuenta ?? noExiste();
  }

  @Delete(':cuentaId')
  @Roles('admin')
  @HttpCode(204)
  async eliminar(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    const borradas = await this.bd.consultar(
      'delete from cuenta_conductor where id = $1 and conductor_id = $2 returning id',
      [cuentaId, id],
    );
    if (borradas.length === 0) {
      noExiste();
    }
  }
}
