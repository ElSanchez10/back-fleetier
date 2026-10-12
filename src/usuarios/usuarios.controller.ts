import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { Pagina } from '../comun/paginacion.js';
import { contiene, patron } from '../comun/sql.js';
import {
  ListarUsuariosDto,
  ROLES_CON_LOCAL,
  UsuarioDto,
} from './usuario.dto.js';

const SELECT_USUARIO = `
  select u.id,
         u.nombre,
         u.email as correo,
         u.rol,
         u.debe_cambiar_clave as "debeCambiarClave",
         u.local_id as "localId",
         l.nombre as local,
         c.nombre as ciudad
  from usuario u
  left join local l on l.id = u.local_id
  left join ciudad c on c.id = l.ciudad_id`;

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'usuario_no_existe' });
}

// El local solo vale para los roles que operan uno.
const localDe = (dto: UsuarioDto) =>
  ROLES_CON_LOCAL.includes(dto.rol) ? (dto.localId ?? null) : null;

// Administración de cuentas: solo para el rol admin (ninguna ruta se abre a
// otros roles).
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly bd: BdService,
    private readonly auth: AuthService,
  ) {}

  // Busca por nombre, correo, local o ciudad. Se puede acotar a un local o a
  // las cuentas sin local.
  @Get()
  async listar(@Query() q: ListarUsuariosDto): Promise<Pagina<unknown>> {
    const donde = `
      where (${contiene('u.nombre', '$1')} or ${contiene('u.email', '$1')}
             or ${contiene(`coalesce(l.nombre, '')`, '$1')}
             or ${contiene(`coalesce(c.nombre, '')`, '$1')})
        and case when $2::text is null then true
                 when $2 = 'sin' then u.local_id is null
                 else u.local_id::text = $2 end`;
    const filtros = [patron(q.buscar), q.local ?? null];
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar(
        `${SELECT_USUARIO} ${donde} order by lower(u.nombre), u.id limit $3 offset $4`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from usuario u
         left join local l on l.id = u.local_id
         left join ciudad c on c.id = l.ciudad_id
         ${donde}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  // La cuenta queda con la contraseña inicial, que se devuelve para entregársela a la persona.
  @Post()
  async crear(@Body() dto: UsuarioDto) {
    const id = await this.auth.crearUsuario(this.bd.consultar.bind(this.bd), {
      nombre: dto.nombre,
      correo: dto.correo,
      rol: dto.rol,
      localId: localDe(dto),
    });
    return {
      usuario: await this.uno(id),
      claveInicial: this.auth.claveDeInicio,
    };
  }

  // Nadie cambia su propio rol: así siempre queda al menos un admin.
  @Put(':id')
  async editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: UsuarioDto,
    @UsuarioActual() yo: UsuarioSesion,
  ) {
    if (id === yo.id && dto.rol !== yo.rol) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'no_puedes_cambiar_tu_rol',
      });
    }
    const cambiados = await this.bd.consultar(
      `update usuario set nombre = $2, email = $3, rol = $4, local_id = $5
       where id = $1 returning id`,
      [id, dto.nombre, dto.correo.toLowerCase(), dto.rol, localDe(dto)],
    );
    if (cambiados.length === 0) {
      noExiste();
    }
    return this.uno(id);
  }

  // Vuelve la cuenta a su primer ingreso: contraseña inicial y cambio obligatorio.
  @Post(':id/restablecer')
  @HttpCode(200)
  async restablecer(@Param('id', IdPipe) id: number) {
    if (!(await this.auth.restablecerClave(id))) {
      noExiste();
    }
    return { claveInicial: this.auth.claveDeInicio };
  }

  // Borra la cuenta y cierra sus sesiones (la base las borra en cascada).
  @Delete(':id')
  @HttpCode(204)
  async eliminar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() yo: UsuarioSesion,
  ) {
    if (id === yo.id) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'no_puedes_eliminarte',
      });
    }
    const borrados = await this.bd.consultar(
      `delete from usuario where id = $1 returning id`,
      [id],
    );
    if (borrados.length === 0) {
      noExiste();
    }
  }

  private async uno(id: number) {
    const [usuario] = await this.bd.consultar(
      `${SELECT_USUARIO} where u.id = $1`,
      [id],
    );
    return usuario;
  }
}
