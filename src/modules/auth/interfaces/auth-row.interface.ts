import type { Rol } from '@/common/interfaces/usuario-sesion.interface';

// Filas de cuentas y sesiones tal como salen de la base.

// El dueño de una sesión vigente.
export interface UsuarioDeSesionRow {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  debe_cambiar_clave: boolean;
  local_id: number | null;
}

export interface CuentaConClaveRow {
  id: number;
  clave_hash: string;
}

export interface SesionAbiertaRow {
  navegador: string | null;
  ip: string | null;
  ultima_actividad: string;
  // Es la sesión desde donde se pregunta.
  actual: boolean;
}
