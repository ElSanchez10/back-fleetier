import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { exigirLocal, localVisible } from '@/common/utils/alcance.util';
import { ConductoresService } from '@/modules/conductores/conductores.service';
import type { FiltroRutasDto } from './dto/filtro-rutas.query.dto';
import type { NuevaRutaDto } from './dto/nueva-ruta.request.dto';
import type { RutaDto } from './dto/ruta.request.dto';
import type { Pagina } from '@/common/dto/pagina.response.dto';
import { DetalleRutaResponseDto } from './dto/detalle-ruta.response.dto';
import { ResumenRutasHoyResponseDto } from './dto/resumen-rutas.response.dto';
import { RutaResponseDto } from './dto/ruta.response.dto';
import { OperacionesService } from './operaciones.service';
import { ProblemasRepository } from './problemas/repositories/problemas.repository';
import { RutasRepository } from './repositories/rutas.repository';
import { filtrosDeRuta } from './utils/filtros-ruta.util';

// Rutas de reparto. Una cuenta con local solo ve y opera las de su local. Los
// cambios de estado los hace OperacionesService; aquí se decide quién puede.
@Injectable()
export class RutasService {
  constructor(
    private readonly datos: RutasRepository,
    private readonly problemas: ProblemasRepository,
    private readonly operaciones: OperacionesService,
    private readonly conductores: ConductoresService,
  ) {}

  async listar(
    q: FiltroRutasDto,
    usuario: UsuarioSesion,
  ): Promise<Pagina<RutaResponseDto>> {
    const { items, total } = await this.datos.listar(
      filtrosDeRuta(q, usuario),
      q,
    );
    return { items: items.map(RutaResponseDto.fromRow), total };
  }

  async todas(
    q: FiltroRutasDto,
    usuario: UsuarioSesion,
    maximo: number,
  ): Promise<RutaResponseDto[]> {
    const filas = await this.datos.todas(filtrosDeRuta(q, usuario), maximo);
    return filas.map(RutaResponseDto.fromRow);
  }

  async resumenDeHoy(
    usuario: UsuarioSesion,
  ): Promise<ResumenRutasHoyResponseDto> {
    return ResumenRutasHoyResponseDto.fromRow(
      await this.datos.resumenDeHoy(localVisible(usuario)),
    );
  }

  // Una ruta de otro local se trata igual que una que no existe. Con
  // `usuario` null se busca en todos los locales.
  async buscar(
    id: number,
    usuario: UsuarioSesion | null,
  ): Promise<RutaResponseDto> {
    const ruta = await this.datos.porId(id, usuario && localVisible(usuario));
    if (!ruta) {
      throw new NotFoundException({ codigo: 'ruta_no_existe' });
    }
    return RutaResponseDto.fromRow(ruta);
  }

  // La ruta con sus coolers y sus problemas.
  async detalle(
    id: number,
    usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    const ruta = await this.buscar(id, usuario);
    const [coolers, problemas] = await Promise.all([
      this.datos.coolersDeRuta(id),
      this.problemas.deRuta(id),
    ]);
    return DetalleRutaResponseDto.desde(ruta, coolers, problemas);
  }

  // Pre-cargada (en espera) o, con `iniciar`, ya en ejecución.
  async crear(
    dto: NuevaRutaDto,
    usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    await this.validar(dto, usuario);
    return this.detalle(await this.operaciones.crear(dto), usuario);
  }

  // Como en Laravel, encargado y coordinador la corrigen mientras no ha
  // partido; después, solo un admin. El conductor que ya tenía se deja aunque
  // la cuenta no lo vea (un admin pudo prestarlo de otra ciudad).
  async editar(
    id: number,
    dto: RutaDto,
    usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    const ruta = await this.buscar(id, usuario);
    if (ruta.estado !== 'en_espera' && usuario.rol !== 'admin') {
      throw new ForbiddenException({ codigo: 'ruta_ya_partio' });
    }
    await this.validar(dto, usuario, ruta.conductorId);
    await this.operaciones.editar(id, dto);
    return this.detalle(id, usuario);
  }

  async iniciar(
    id: number,
    usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    await this.buscar(id, usuario);
    await this.operaciones.iniciar(id);
    return this.detalle(id, usuario);
  }

  // Finalizada si volvieron todos sus coolers; si no, pendiente.
  async cerrar(
    id: number,
    usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    await this.buscar(id, usuario);
    await this.operaciones.cerrar(id);
    return this.detalle(id, usuario);
  }

  // La cuenta debe poder operar el local, y ver al conductor nuevo: una
  // cuenta con local, los de su ciudad; un admin, de cualquier ciudad.
  private async validar(
    dto: RutaDto,
    usuario: UsuarioSesion,
    conductorAnterior: number | null = null,
  ) {
    exigirLocal(usuario, dto.localId);
    if (dto.conductorId !== null && dto.conductorId !== conductorAnterior) {
      await this.conductores.buscar(dto.conductorId, usuario);
    }
  }
}
