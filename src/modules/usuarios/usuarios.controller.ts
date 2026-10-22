import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrores,
  ApiPaginaResponse,
  ApiSesion,
} from '@/common/decorators/api.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { Pagina } from '@/common/dto/pagina.response.dto';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import {
  ClaveInicialResponseDto,
  UsuarioCreadoResponseDto,
} from './dto/clave-inicial.response.dto';
import { ListarUsuariosDto } from './dto/listar-usuarios.query.dto';
import { UsuarioDto } from './dto/usuario.request.dto';
import { UsuarioResponseDto } from './dto/usuario.response.dto';
import { UsuariosService } from './usuarios.service';

// Administración de cuentas (las reglas, en UsuariosService): solo para el rol
// admin (ninguna ruta se abre a otros roles).
@ApiTags('Usuarios')
@ApiSesion()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  // Busca por nombre, correo, local o ciudad. Se puede acotar a un local o a
  // las cuentas sin local.
  @Get()
  @ApiOperation({ summary: 'Lista las cuentas (solo admin)' })
  @ApiPaginaResponse(UsuarioResponseDto)
  @ApiErrores(400)
  listar(@Query() q: ListarUsuariosDto): Promise<Pagina<UsuarioResponseDto>> {
    return this.usuarios.listar(q);
  }

  @Post()
  @ApiOperation({
    summary: 'Crea una cuenta con la contraseña inicial y la devuelve',
  })
  @ApiCreatedResponse({ type: UsuarioCreadoResponseDto })
  @ApiErrores(400, 409)
  crear(@Body() dto: UsuarioDto): Promise<UsuarioCreadoResponseDto> {
    return this.usuarios.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita una cuenta; nadie cambia su propio rol' })
  @ApiOkResponse({ type: UsuarioResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: UsuarioDto,
    @UsuarioActual() yo: UsuarioSesion,
  ): Promise<UsuarioResponseDto> {
    return this.usuarios.editar(id, dto, yo);
  }

  @Post(':id/restablecer')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Vuelve la cuenta a la contraseña inicial y le exige cambiarla al entrar',
  })
  @ApiOkResponse({ type: ClaveInicialResponseDto })
  @ApiErrores(404)
  restablecer(
    @Param('id', IdPipe) id: number,
  ): Promise<ClaveInicialResponseDto> {
    return this.usuarios.restablecer(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una cuenta; nadie se elimina a sí mismo' })
  @ApiNoContentResponse()
  @ApiErrores(400, 404)
  eliminar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() yo: UsuarioSesion,
  ): Promise<void> {
    return this.usuarios.eliminar(id, yo);
  }
}
