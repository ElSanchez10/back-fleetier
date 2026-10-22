// Mensaje en español de cada `codigo` de error: los que lanza el back y los
// nombres de las restricciones de la base. El filtro global lo pone en
// `message` cuando la excepción no trae uno propio. El front elige su texto por
// `codigo`, así que estos mensajes son para quien use la API directamente.
export const MENSAJES: Record<string, string> = {
  credenciales_invalidas: 'El correo o la contraseña no son correctos.',
  demasiados_intentos:
    'Demasiados intentos fallidos. Espera unos minutos y vuelve a probar.',
  clave_actual_incorrecta: 'La contraseña actual no es correcta.',
  clave_incorrecta: 'La contraseña no es correcta.',
  ultimo_admin:
    'Eres el único administrador: crea otro antes de eliminar tu cuenta.',
  clave_nueva_repetida: 'Elige una contraseña distinta de la que tienes ahora.',
  sin_permiso: 'Tu cuenta no tiene permiso para hacer eso.',
  ciudad_nombre_uk: 'Ya existe una ciudad con ese nombre.',
  local_nombre_uk: 'Esa ciudad ya tiene un local con ese nombre.',
  local_ciudad_fk:
    'Hay locales en esa ciudad. Cámbialos de ciudad o elimínalos antes.',
  usuario_local_fk:
    'Hay usuarios asignados a ese local. Cámbialos de local antes de eliminarlo.',
  destino_pedido_especial_nombre_uk: 'Ya existe un destino con ese nombre.',
  pedido_especial_destino_fk:
    'Hay pedidos especiales a ese destino. No se puede eliminar.',
  pedido_especial_local_fk:
    'Hay pedidos especiales de ese local. No se puede eliminar.',
  atraso_local_fk: 'Hay atrasos anotados en ese local. No se puede eliminar.',
  caso_excepcional_local_fk:
    'Hay casos excepcionales en ese local. No se puede eliminar.',
  tipo_cooler_marca_capacidad_uk:
    'Ya existe un tipo de cooler con esa marca y capacidad.',
  tipo_conductor_nombre_uk: 'Ya existe una clasificación con ese nombre.',
  tipo_evento_nombre_uk: 'Ya existe un tipo de evento con ese nombre.',
  cooler_no_existe: 'El cooler no existe.',
  cooler_nombre_uk: 'Ese local ya tiene un cooler con ese número.',
  cooler_codigo_uk: 'Ya existe un cooler con ese código de barras.',
  cooler_tipo_cooler_fk:
    'Hay coolers de ese tipo. Cámbialos de tipo antes de eliminarlo.',
  cooler_local_fk:
    'Hay coolers en ese local. Cámbialos de local antes de eliminarlo.',
  conductor_no_existe: 'El driver no existe.',
  conductor_run_uk: 'Ya existe un driver con ese RUN.',
  conductor_ciudad_fk:
    'Hay drivers en esa ciudad. Cámbialos de ciudad antes de eliminarla.',
  conductor_tipo_conductor_fk:
    'Hay drivers con esa clasificación. Cámbialos antes de eliminarla.',
  evento_no_existe: 'El evento ya no existe.',
  evento_conductor_fechas:
    'La fecha de término no puede ser anterior a la de inicio.',
  evento_conductor_tipo_evento_fk:
    'Hay eventos de ese tipo en los calendarios. Cámbialos o elimínalos antes.',
  cuenta_no_existe: 'La cuenta ya no existe.',
  cifrado_no_configurado:
    'Las cuentas no están habilitadas en este servidor: falta configurar CLAVE_CUENTAS.',
  cooler_estado_de_ruta:
    'El cooler está en una ruta: su estado y su local cambian con la ruta. Devuélvelo o quítalo de la ruta antes.',
  ruta_no_existe: 'La ruta no existe.',
  ruta_vacia: 'Asigna un driver o al menos un cooler.',
  ruta_sin_conductor: 'Asigna un driver para iniciar la ruta.',
  ruta_ya_iniciada: 'La ruta ya había partido.',
  ruta_no_en_ejecucion: 'Solo se finaliza una ruta en ejecución.',
  ruta_cerrada: 'La ruta ya está cerrada: sus coolers no cambian.',
  usuario_local_requerido: 'Encargado y coordinador deben tener un local.',
  ruta_ya_partio: 'La ruta ya partió: solo un administrador corrige sus datos.',
  ruta_local_fijo: 'El local solo se cambia mientras la ruta no ha partido.',
  ruta_conductor_ocupado:
    'Ese driver ya tiene una ruta en espera o en ejecución.',
  ruta_ordenes: 'Las órdenes no pueden ser negativas.',
  cooler_no_disponible:
    'Ese cooler está dañado o no disponible: solo un admin lo cambia, desde su ficha.',
  cooler_en_ruta_en_espera:
    'Ese cooler está en una ruta que todavía no parte: no ha salido del local.',
  cooler_ya_en_ruta: 'Ese cooler ya está en esta ruta.',
  cooler_no_esta_en_ruta: 'Ese cooler no está en la ruta.',
  cooler_ya_devuelto:
    'Ese cooler ya volvió: queda en la ruta como parte de lo que pasó.',
  ruta_cooler_pk: 'Ese cooler ya estuvo en esta ruta.',
  problema_no_existe: 'El problema ya no existe.',
  pedido_no_existe: 'El pedido especial ya no existe.',
  pedido_extraordinario:
    'Un pedido extraordinario solo lo corrige un admin o un asistente.',
  destino_no_existe: 'Ese destino ya no existe. Recarga la página.',
  destino_nuevo_no_permitido: 'Solo un admin o un asistente agrega destinos.',
  atraso_no_existe: 'El atraso ya no existe.',
  caso_no_existe: 'El caso ya no existe.',
  otro_local: 'Eso pertenece a otro local.',
  catalogo_item_no_existe: 'Ese elemento ya no existe.',
  usuario_email_uk: 'Ya existe una cuenta con ese correo.',
  usuario_no_existe: 'La cuenta ya no existe.',
  no_puedes_eliminarte: 'No puedes eliminar tu propia cuenta.',
  no_puedes_cambiar_tu_rol: 'No puedes cambiar tu propio rol.',
  datos_invalidos: 'Los datos enviados no son válidos.',
  no_existe: 'No existe.',
  sin_sesion: 'Debes iniciar sesión.',
  debe_cambiar_clave: 'Debes cambiar la contraseña inicial antes de seguir.',
  error_interno: 'Ocurrió un error en el servidor.',
  ruta_cooler_ocupado: 'Ese cooler ya está en otra ruta que no ha terminado.',
  ruta_cooler_devuelto: 'Un cooler devuelto debe tener su fecha de devolución.',
  ruta_conductor_fk: 'Ese driver ya no existe. Recarga la página.',
  ruta_local_fk: 'Ese local ya no existe. Recarga la página.',
  ruta_cooler_cooler_fk: 'Ese cooler ya no existe. Recarga la página.',
  problema_ruta_ruta_fk: 'La ruta ya no existe.',
  caso_excepcional_conductor_fk: 'Ese driver ya no existe. Recarga la página.',
  cuenta_conductor_conductor_fk: 'El driver ya no existe.',
  evento_conductor_conductor_fk: 'El driver ya no existe.',
  conductor_run_formato: 'El RUN no tiene un formato válido.',
  conductor_telefono_formato: 'El teléfono debe tener nueve dígitos.',
  atraso_cantidad: 'La cantidad debe ser mayor que cero.',
  pedido_especial_cantidad: 'La cantidad debe ser mayor que cero.',
  problema_ruta_cantidad: 'La cantidad debe ser mayor que cero.',
  pedido_especial_precio: 'El precio no puede ser negativo.',
  destino_pedido_especial_precio_valido: 'El precio no puede ser negativo.',
  usuario_local_segun_rol: 'Solo encargado y coordinador tienen un local.',
};

// Si un código no está en el catálogo, un mensaje general según el estado HTTP.
export const MENSAJE_POR_ESTADO: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Debes iniciar sesión.',
  403: 'No tienes permiso para hacer eso.',
  404: 'No existe.',
  409: 'La operación choca con el estado actual de los datos.',
  429: 'Demasiados intentos. Espera unos minutos.',
  503: 'El servicio no está disponible.',
};
