import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores, ApiSesion } from '@/common/decorators/api.decorator';
import { ProblemaResponseDto } from './dto/problema.response.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import { ProblemaDto } from './dto/problema.request.dto';
import { ProblemasService } from './problemas.service';

// Problemas de una ruta (pedidos que no se entregaron, etc.). Se listan con la
// ruta; los anotan admin, encargado y coordinador, y los elimina solo admin.
@ApiTags('Rutas')
@ApiSesion()
@Controller('rutas/:id/problemas')
@Roles('admin', 'encargado', 'coordinador')
export class ProblemasController {
  constructor(private readonly problemas: ProblemasService) {}

  @Post()
  @ApiOperation({ summary: 'Anota un problema en la ruta' })
  @ApiCreatedResponse({ type: ProblemaResponseDto })
  @ApiErrores(400, 404)
  crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: ProblemaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ProblemaResponseDto> {
    return this.problemas.crear(id, dto, usuario);
  }

  @Put(':problemaId')
  @ApiOperation({ summary: 'Corrige un problema de la ruta' })
  @ApiOkResponse({ type: ProblemaResponseDto })
  @ApiErrores(400, 404)
  editar(
    @Param('id', IdPipe) id: number,
    @Param('problemaId', IdPipe) problemaId: number,
    @Body() dto: ProblemaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ProblemaResponseDto> {
    return this.problemas.editar(id, problemaId, dto, usuario);
  }

  @Delete(':problemaId')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un problema de la ruta (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404)
  eliminar(
    @Param('id', IdPipe) id: number,
    @Param('problemaId', IdPipe) problemaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<void> {
    return this.problemas.eliminar(id, problemaId, usuario);
  }
}
