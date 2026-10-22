export type Rol = 'admin' | 'asistente' | 'encargado' | 'coordinador';

// Quien hizo la petición, según su sesión.
export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  // true mientras tenga la contraseña inicial: solo puede cambiarla o salir.
  debeCambiarClave: boolean;
  // Su local. Con un local, solo ve y modifica lo de ese local; null: ve todos.
  localId: number | null;
}
