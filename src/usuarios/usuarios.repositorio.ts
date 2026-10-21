import { Injectable } from '@nestjs/common';
import type { Rol } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { contiene, ordenarPor, patron } from '../comun/sql.js';
import type { ListarUsuariosDto } from './usuario.dto.js';

// Acceso a los datos de las cuentas, para UsuariosService. Crear una cuenta y
// su contraseña lo hace AuthService.

export interface DatosUsuario {
  nombre: string;
  correo: string;
  rol: Rol;
  localId: number | null;
}

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

// Columnas por las que se puede ordenar el listado, como en la versión Laravel.
const ORDEN = {
  id: 'u.id',
  nombre: 'lower(u.nombre)',
  correo: 'lower(u.email)',
  local: 'lower(l.nombre)',
};

// $1 texto (nombre, correo, local o ciudad), $2 local ('sin': sin local).
const DONDE = `
  where (${contiene('u.nombre', '$1')} or ${contiene('u.email', '$1')}
         or ${contiene(`coalesce(l.nombre, '')`, '$1')}
         or ${contiene(`coalesce(c.nombre, '')`, '$1')})
    and case when $2::text is null then true
             when $2 = 'sin' then u.local_id is null
             else u.local_id::text = $2 end`;

@Injectable()
export class UsuariosRepositorio {
  constructor(private readonly bd: BdService) {}

  async listar(q: ListarUsuariosDto) {
    const filtros = [patron(q.buscar), q.local ?? null];
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar(
        `${SELECT_USUARIO} ${DONDE} ${ordenarPor(q, ORDEN, 'u.id', 'u.id')} limit $3 offset $4`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from usuario u
         left join local l on l.id = u.local_id
         left join ciudad c on c.id = l.ciudad_id
         ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  async uno(id: number) {
    const [usuario] = await this.bd.consultar(
      `${SELECT_USUARIO} where u.id = $1`,
      [id],
    );
    return usuario;
  }

  // false si no existe.
  async actualizar(id: number, u: DatosUsuario): Promise<boolean> {
    const cambiados = await this.bd.consultar(
      `update usuario set nombre = $2, email = $3, rol = $4, local_id = $5
       where id = $1 returning id`,
      [id, u.nombre, u.correo.toLowerCase(), u.rol, u.localId],
    );
    return cambiados.length > 0;
  }

  // Sus sesiones las borra la base en cascada. false si no existe.
  async eliminar(id: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      `delete from usuario where id = $1 returning id`,
      [id],
    );
    return borrados.length > 0;
  }
}
