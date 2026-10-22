import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pagina } from '@/common/dto/pagina.response.dto';
import { DatabaseService } from '@/common/database/database.service';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { AuthService } from '@/modules/auth/auth.service';
import { type ListarUsuariosDto } from './dto/listar-usuarios.query.dto';
import { type UsuarioDto } from './dto/usuario.request.dto';
import { UsuariosRepository } from './repositories/usuarios.repository';
import { datosDelUsuario } from './utils/usuarios.util';
import {
  ClaveInicialResponseDto,
  UsuarioCreadoResponseDto,
} from './dto/clave-inicial.response.dto';
import { UsuarioResponseDto } from './dto/usuario.response.dto';

function noExiste(): never {
  throw new NotFoundException({ codigo: 'usuario_no_existe' });
}

// Administración de cuentas (solo admin). Nadie cambia su propio rol ni se
// elimina a sí mismo: así siempre queda al menos un admin.
@Injectable()
export class UsuariosService {
  constructor(
    private readonly bd: DatabaseService,
    private readonly datos: UsuariosRepository,
    private readonly auth: AuthService,
  ) {}

  async listar(q: ListarUsuariosDto): Promise<Pagina<UsuarioResponseDto>> {
    const { items, total } = await this.datos.listar(q);
    return { items: items.map(UsuarioResponseDto.fromRow), total };
  }

  // La cuenta queda con la contraseña inicial, que se devuelve para
  // entregársela a la persona.
  async crear(dto: UsuarioDto): Promise<UsuarioCreadoResponseDto> {
    const id = await this.auth.crearUsuario(
      this.bd.consultar,
      datosDelUsuario(dto),
    );
    return {
      usuario: await this.uno(id),
      claveInicial: this.auth.claveDeInicio,
    };
  }

  async editar(
    id: number,
    dto: UsuarioDto,
    yo: UsuarioSesion,
  ): Promise<UsuarioResponseDto> {
    if (id === yo.id && dto.rol !== yo.rol) {
      throw new BadRequestException({
        codigo: 'no_puedes_cambiar_tu_rol',
      });
    }
    if (!(await this.datos.actualizar(id, datosDelUsuario(dto)))) {
      noExiste();
    }
    return this.uno(id);
  }

  // Vuelve la cuenta a su primer ingreso: contraseña inicial y cambio obligatorio.
  async restablecer(id: number): Promise<ClaveInicialResponseDto> {
    if (!(await this.auth.restablecerClave(id))) {
      noExiste();
    }
    return { claveInicial: this.auth.claveDeInicio };
  }

  async eliminar(id: number, yo: UsuarioSesion): Promise<void> {
    if (id === yo.id) {
      throw new BadRequestException({
        codigo: 'no_puedes_eliminarte',
      });
    }
    if (!(await this.datos.eliminar(id))) {
      noExiste();
    }
  }

  private async uno(id: number): Promise<UsuarioResponseDto> {
    return UsuarioResponseDto.fromRow((await this.datos.uno(id)) ?? noExiste());
  }
}
