import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { exigirLocal, localVisible } from '../comun/alcance.js';
import { ConductoresService } from '../conductores/conductores.service.js';
import { OperacionesService } from './operaciones.service.js';
import type { FiltroRutasDto, NuevaRutaDto, RutaDto } from './ruta.dto.js';
import {
  type FiltrosRuta,
  RutasConsultasRepositorio,
} from './rutas-consultas.repositorio.js';
import type { Ruta } from './rutas.sql.js';

// Rutas de reparto. Una cuenta con local solo ve y opera las de su local. Los
// cambios de estado los hace OperacionesService; aquí se decide quién puede.
@Injectable()
export class RutasService {
  constructor(
    private readonly datos: RutasConsultasRepositorio,
    private readonly operaciones: OperacionesService,
    private readonly conductores: ConductoresService,
  ) {}

  listar(q: FiltroRutasDto, usuario: UsuarioSesion) {
    return this.datos.listar(filtrosDeRuta(q, usuario), q);
  }

  todas(q: FiltroRutasDto, usuario: UsuarioSesion, maximo: number) {
    return this.datos.todas(filtrosDeRuta(q, usuario), maximo);
  }

  resumenDeHoy(usuario: UsuarioSesion) {
    return this.datos.resumenDeHoy(localVisible(usuario));
  }

  // Una ruta de otro local se trata igual que una que no existe. Con
  // `usuario` null se busca en todos los locales.
  async buscar(id: number, usuario: UsuarioSesion | null): Promise<Ruta> {
    const ruta = await this.datos.porId(id, usuario && localVisible(usuario));
    if (!ruta) {
      throw new NotFoundException({
        statusCode: 404,
        codigo: 'ruta_no_existe',
      });
    }
    return ruta;
  }

  // La ruta con sus coolers y sus problemas.
  async detalle(id: number, usuario: UsuarioSesion) {
    const ruta = await this.buscar(id, usuario);
    const [coolers, problemas] = await Promise.all([
      this.datos.coolersDeRuta(id),
      this.datos.problemasDeRuta(id),
    ]);
    return { ...ruta, detalleCoolers: coolers, detalleProblemas: problemas };
  }

  // Pre-cargada (en espera) o, con `iniciar`, ya en ejecución.
  async crear(dto: NuevaRutaDto, usuario: UsuarioSesion) {
    await this.validar(dto, usuario);
    return this.detalle(await this.operaciones.crear(dto), usuario);
  }

  // Como en Laravel, encargado y coordinador la corrigen mientras no ha
  // partido; después, solo un admin. El conductor que ya tenía se deja aunque
  // la cuenta no lo vea (un admin pudo prestarlo de otra ciudad).
  async editar(id: number, dto: RutaDto, usuario: UsuarioSesion) {
    const ruta = await this.buscar(id, usuario);
    if (ruta.estado !== 'en_espera' && usuario.rol !== 'admin') {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'ruta_ya_partio',
      });
    }
    await this.validar(dto, usuario, ruta.conductorId);
    await this.operaciones.editar(id, dto);
    return this.detalle(id, usuario);
  }

  async iniciar(id: number, usuario: UsuarioSesion) {
    await this.buscar(id, usuario);
    await this.operaciones.iniciar(id);
    return this.detalle(id, usuario);
  }

  // Finalizada si volvieron todos sus coolers; si no, pendiente.
  async cerrar(id: number, usuario: UsuarioSesion) {
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

// Lo que pide el listado. Un número (con o sin "#") busca además esa ruta por
// su número. Una cuenta con local solo ve las suyas.
export function filtrosDeRuta(
  q: FiltroRutasDto,
  usuario: UsuarioSesion,
): FiltrosRuta {
  const buscar = q.buscar ?? '';
  return {
    buscar: q.buscar,
    numero: /^#?\d{1,9}$/.test(buscar) ? Number(buscar.replace('#', '')) : null,
    fechaDesde: q.fechaDesde ?? null,
    fechaHasta: q.fechaHasta ?? null,
    estado: q.estado ?? null,
    localId: localVisible(usuario, q.localId),
  };
}
