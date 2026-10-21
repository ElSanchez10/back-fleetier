import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { cifrar, descifrar } from './cifrado.js';
import type { CuentaDto, EditarCuentaDto } from './conductor.dto.js';
import { ConductoresService } from './conductores.service.js';
import { type Cuenta, CuentasRepositorio } from './cuentas.repositorio.js';

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'cuenta_no_existe' });
}

// Cuentas del conductor en aplicaciones externas. Son credenciales ajenas: se
// guardan cifradas, la contraseña no viaja en el listado y se pide aparte, una
// a la vez. Quién las ve lo decide el controlador (admin y asistente); aquí,
// que la cuenta vea al conductor.
@Injectable()
export class CuentasService {
  constructor(
    private readonly datos: CuentasRepositorio,
    private readonly conductores: ConductoresService,
  ) {}

  async listar(conductorId: number, usuario: UsuarioSesion): Promise<Cuenta[]> {
    await this.conductores.buscar(conductorId, usuario);
    return this.datos.listar(conductorId);
  }

  async clave(conductorId: number, cuentaId: number, usuario: UsuarioSesion) {
    await this.conductores.buscar(conductorId, usuario);
    const cifrada = await this.datos.claveCifrada(conductorId, cuentaId);
    return { clave: descifrar(cifrada ?? noExiste()) };
  }

  async crear(conductorId: number, dto: CuentaDto, usuario: UsuarioSesion) {
    await this.conductores.buscar(conductorId, usuario);
    return this.datos.insertar(
      conductorId,
      dto.cuenta,
      dto.usuario,
      cifrar(dto.clave),
    );
  }

  // Sin contraseña nueva, queda la que estaba.
  async editar(
    conductorId: number,
    cuentaId: number,
    dto: EditarCuentaDto,
    usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(conductorId, usuario);
    const cuenta = await this.datos.actualizar(
      conductorId,
      cuentaId,
      dto.cuenta,
      dto.usuario,
      dto.clave === undefined ? null : cifrar(dto.clave),
    );
    return cuenta ?? noExiste();
  }

  async eliminar(
    conductorId: number,
    cuentaId: number,
    usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(conductorId, usuario);
    if (!(await this.datos.eliminar(conductorId, cuentaId))) {
      noExiste();
    }
  }
}
