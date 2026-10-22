import type { Rol } from '@/common/interfaces/usuario-sesion.interface';

// Una cuenta tal como sale de la base, con su local y la ciudad del local.
export interface UsuarioRow {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  debe_cambiar_clave: boolean;
  local_id: number | null;
  local: string | null;
  ciudad: string | null;
}
