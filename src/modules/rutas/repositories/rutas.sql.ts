// Las fechas de las rutas se guardan con zona horaria y se muestran y filtran
// en hora de Chile, que es la de la operación.
export const ZONA = 'America/Santiago';

// La fecha con hora como la usa un <input type="datetime-local">.
export function horaLocal(columna: string): string {
  return `to_char(${columna} at time zone '${ZONA}', 'YYYY-MM-DD"T"HH24:MI')`;
}

// El día de Chile en que sale una ruta.
export const DIA_RUTA = `(r.fecha at time zone '${ZONA}')::date`;

// Lo que llega del front ("2026-10-15T08:30", hora de Chile) a timestamptz.
export function desdeHoraLocal(parametro: string): string {
  return `(${parametro}::timestamp at time zone '${ZONA}')`;
}

// Una ruta con lo que muestran el listado y el detalle (RutaRow).
export const SELECT_RUTA = `
  select r.id,
         ${horaLocal('r.fecha')} as fecha,
         r.ordenes,
         r.estado,
         r.local_id,
         l.nombre as local,
         l.ciudad_id,
         c.nombre as ciudad,
         r.conductor_id,
         d.nombre as conductor,
         d.telefono as conductor_telefono,
         d.tipo_conductor_id as conductor_tipo_id,
         (select count(*)::int from ruta_cooler rc where rc.ruta_id = r.id) as coolers,
         (select count(*)::int from ruta_cooler rc where rc.ruta_id = r.id and rc.devuelto) as devueltos,
         (select count(*)::int from problema_ruta p where p.ruta_id = r.id) as problemas
  from ruta r
  join local l on l.id = r.local_id
  join ciudad c on c.id = l.ciudad_id
  left join conductor d on d.id = r.conductor_id`;
