import { type Rol } from '@/common/interfaces/usuario-sesion.interface';
import { type UsuarioDto } from '../dto/usuario.request.dto';
import { type DatosUsuario } from '../repositories/usuarios.repository';

// Roles que operan un local: los únicos que pueden tener uno asignado.
export const ROLES_CON_LOCAL: Rol[] = ['encargado', 'coordinador'];

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
