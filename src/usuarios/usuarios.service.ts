import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import type { UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import {
  type ListarUsuariosDto,
  ROLES_CON_LOCAL,
  type UsuarioDto,
} from './usuario.dto.js';
import {
  type DatosUsuario,
  UsuariosRepositorio,
} from './usuarios.repositorio.js';

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'usuario_no_existe' });
}

// Lo que se guarda de una cuenta. El local solo vale para los roles que operan
// uno (encargado y coordinador); en los demás se ignora.
export function datosDelUsuario(dto: UsuarioDto): DatosUsuario {
  return {
    nombre: dto.nombre,
    correo: dto.correo,
    rol: dto.rol,
    localId: ROLES_CON_LOCAL.includes(dto.rol) ? (dto.localId ?? null) : null,
  };
}

// Administración de cuentas (solo admin). Nadie cambia su propio rol ni se
// elimina a sí mismo: así siempre queda al menos un admin.
@Injectable()
export class UsuariosService {
  constructor(
    private readonly bd: BdService,
    private readonly datos: UsuariosRepositorio,
    private readonly auth: AuthService,
  ) {}

  listar(q: ListarUsuariosDto) {
    return this.datos.listar(q);
  }

  // La cuenta queda con la contraseña inicial, que se devuelve para
  // entregársela a la persona.
  async crear(dto: UsuarioDto) {
    const id = await this.auth.crearUsuario(
      this.bd.consultar.bind(this.bd),
      datosDelUsuario(dto),
    );
    return {
      usuario: await this.datos.uno(id),
      claveInicial: this.auth.claveDeInicio,
    };
  }

  async editar(id: number, dto: UsuarioDto, yo: UsuarioSesion) {
    if (id === yo.id && dto.rol !== yo.rol) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'no_puedes_cambiar_tu_rol',
      });
    }
    if (!(await this.datos.actualizar(id, datosDelUsuario(dto)))) {
      noExiste();
    }
    return this.datos.uno(id);
  }

  // Vuelve la cuenta a su primer ingreso: contraseña inicial y cambio obligatorio.
  async restablecer(id: number) {
    if (!(await this.auth.restablecerClave(id))) {
      noExiste();
    }
    return { claveInicial: this.auth.claveDeInicio };
  }

  async eliminar(id: number, yo: UsuarioSesion) {
    if (id === yo.id) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'no_puedes_eliminarte',
      });
    }
    if (!(await this.datos.eliminar(id))) {
      noExiste();
    }
  }
}
